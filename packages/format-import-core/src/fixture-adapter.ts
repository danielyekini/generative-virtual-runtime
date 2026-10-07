import type { KeyframeTrack, NodeDefinition, SceneIR, SolidColor, Vec2 } from "@gvr/schema";
import { diagnosticsFromFidelity, fidelityReport } from "./fidelity";
import { allocateId, framesToMs } from "./normalise";
import { spanAt } from "./registry";
import {
  IMPORT_VERSION,
  type AnimationFormatAdapter,
  type FidelityItem,
  type ImportContext,
  type ImportDiagnostic,
  type ImportResult,
} from "./types";

/**
 * A synthetic format used to exercise the import contract.
 * It is not Lottie. Coordinates are already y-down logical pixels.
 */
interface FixtureDocument {
  format: "fixture";
  name: string;
  fps?: number;
  durationFrames: number;
  background?: string;
  nodes: FixtureNode[];
}

interface FixtureNode {
  name?: string;
  kind?: string;
  radius?: number;
  size?: [number, number];
  position?: [number, number];
  fill?: string;
  blur?: number;
  motion?: {
    property?: string;
    frames?: { frame?: number; value?: number; ease?: string }[];
  };
}

const CAPABILITIES = [
  { feature: "circle", level: "exact" as const, notes: "Radius and solid fill." },
  { feature: "rectangle", level: "exact" as const, notes: "Size and solid fill." },
  { feature: "position", level: "exact" as const },
  { feature: "linear-keyframes", level: "exact" as const, notes: "Frame times become milliseconds." },
  { feature: "cubic-ease", level: "approximated" as const, notes: "Mapped to easeInOut and reported." },
  { feature: "blur", level: "dropped" as const, notes: "Omitted. The node is kept." },
  { feature: "mesh3d", level: "unsupported" as const, notes: "Rejects the file. No Scene IR is produced." },
];

export const fixtureAdapter: AnimationFormatAdapter<FixtureDocument> = {
  formatId: "fixture",
  extensions: [".fixture.json"],
  capabilities: CAPABILITIES,
  detect(source) {
    return { formatId: "fixture", confident: source.includes('"format"') && source.includes('"fixture"') };
  },
  parse(source, context) {
    let value: unknown;
    try {
      value = JSON.parse(source) as unknown;
    } catch (error) {
      return { ok: false, diagnostics: [malformed(source, error instanceof Error ? error.message : "Invalid JSON.")] };
    }
    if (!isRecord(value) || value.format !== "fixture" || typeof value.name !== "string" || !Array.isArray(value.nodes)) {
      return { ok: false, diagnostics: [malformed(source, "A fixture file needs format, name, and nodes.")] };
    }
    if (typeof value.durationFrames !== "number" || !(value.durationFrames > 0)) {
      return { ok: false, diagnostics: [malformed(source, "durationFrames must be a positive number.")] };
    }
    return { ok: true, value: value as unknown as FixtureDocument };
  },
  normalise(document, context) {
    return normaliseFixture(document, context);
  },
};

function normaliseFixture(document: FixtureDocument, context: ImportContext): ImportResult {
  const notes: FidelityItem[] = [];
  const source = context.sourceText;
  if (document.nodes.some((node) => node.kind === "mesh3d")) {
    notes.push({
      feature: "mesh3d",
      level: "unsupported",
      message: "3D meshes are outside the 2D scene contract, so this file is not imported.",
      sourceSpan: spanAt(source, Math.max(0, source.indexOf("mesh3d"))),
    });
    return finish(document, context, notes, undefined);
  }
  const fps = document.fps ?? 30;
  const durationMs = framesToMs(document.durationFrames, fps);
  const background = colorFromHex(document.background ?? "#101014") ?? colorFromHex("#101014")!;
  const used = new Set<string>();
  const nodes: NodeDefinition[] = [];
  const tracks: KeyframeTrack[] = [];
  for (const node of document.nodes) {
    if (node == null || typeof node !== "object") {
      notes.push({ feature: "node", level: "dropped", message: "A node was not an object, so it was omitted." });
      continue;
    }
    if (node.kind !== "circle" && node.kind !== "rectangle") {
      notes.push({
        feature: node.kind ?? "node",
        level: "dropped",
        message: `Node kind ${node.kind ?? "unknown"} is not in the fixture subset.`,
        target: node.name,
      });
      continue;
    }
    const allocated = allocateId(null, node.name ?? node.kind, used);
    const position = vec(node.position);
    const fill = colorFromHex(node.fill ?? "#ffffff");
    if (typeof node.blur === "number") {
      notes.push({
        feature: "blur",
        level: "dropped",
        message: `Blur on ${allocated.id} is omitted. The shape is kept.`,
        target: allocated.id,
      });
    }
    const base = {
      id: allocated.id,
      name: allocated.name,
      parentId: null,
      zIndex: 0,
      transform: { position, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      opacity: 1,
      visible: true,
      space: "world" as const,
      ...(fill ? { fill } : {}),
    };
    if (node.kind === "circle") {
      nodes.push({ ...base, kind: "circle", radius: node.radius ?? 16 });
      notes.push({ feature: "circle", level: "exact", message: `Imported circle ${allocated.id}.`, target: allocated.id });
    } else {
      const size = node.size ?? [32, 32];
      nodes.push({ ...base, kind: "rectangle", size: { x: size[0] ?? 32, y: size[1] ?? 32 } });
      notes.push({ feature: "rectangle", level: "exact", message: `Imported rectangle ${allocated.id}.`, target: allocated.id });
    }
    const motion = node.motion;
    if (motion?.property === "position.x" && motion.frames) {
      const built = positionTrack(allocated.id, motion.frames, fps, tracks.length + 1, notes);
      if (built) tracks.push(built);
    }
  }
  if (nodes.length === 0) {
    notes.push({ feature: "scene", level: "unsupported", message: "The file produced no supported shapes." });
    return finish(document, context, notes, undefined);
  }
  notes.push({
    feature: "frame-timing",
    level: "exact",
    message: `Converted ${document.durationFrames} frames at ${fps}fps to ${durationMs}ms.`,
  });
  const scene: SceneIR = {
    irVersion: "0.1",
    sceneId: allocateId(null, document.name, new Set()).id,
    viewport: { width: 1280, height: 720, fit: "contain" },
    background,
    resources: [],
    nodes,
    cameras: [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks, steps: [] },
  };
  return finish(document, context, notes, scene);
}

function positionTrack(
  nodeId: string,
  frames: { frame?: number; value?: number; ease?: string }[],
  fps: number,
  serial: number,
  notes: FidelityItem[],
): KeyframeTrack | undefined {
  const samples = frames
    .filter((frame) => typeof frame.frame === "number" && typeof frame.value === "number")
    .sort((left, right) => (left.frame ?? 0) - (right.frame ?? 0));
  if (samples.length < 2) {
    notes.push({ feature: "motion", level: "dropped", message: `${nodeId} needs two position frames, so the motion was omitted.`, target: nodeId });
    return undefined;
  }
  const times = samples.map((frame) => framesToMs(frame.frame ?? 0, fps));
  const start = times[0] ?? 0;
  const end = times[times.length - 1] ?? start;
  const duration = end - start;
  if (!(duration > 0)) {
    notes.push({ feature: "motion", level: "dropped", message: `${nodeId} motion has no duration.`, target: nodeId });
    return undefined;
  }
  let approximated = false;
  const keyframes = samples.map((frame, index) => {
    const offset = ((times[index] ?? start) - start) / duration;
    const ease = frame.ease === "cubic" ? "easeInOut" : "linear";
    if (frame.ease === "cubic") approximated = true;
    if (index === samples.length - 1) return { offset, value: frame.value ?? 0 };
    return { offset, value: frame.value ?? 0, easing: ease as "linear" | "easeInOut" };
  });
  if (approximated) {
    notes.push({
      feature: "cubic-ease",
      level: "approximated",
      message: `${nodeId} cubic ease is imported as easeInOut.`,
      target: nodeId,
    });
  } else {
    notes.push({ feature: "linear-keyframes", level: "exact", message: `Imported linear motion on ${nodeId}.`, target: nodeId });
  }
  return {
    id: `track${serial}`,
    kind: "keyframe",
    target: { kind: "node", nodeId, channel: "transform.position.x" },
    valueType: "number",
    startMs: start,
    durationMs: duration,
    fill: { before: "none", after: "forwards" },
    keyframes,
  };
}

function finish(document: FixtureDocument, context: ImportContext, notes: FidelityItem[], scene: SceneIR | undefined): ImportResult {
  const fidelity = fidelityReport(notes, scene !== undefined);
  return {
    ok: scene !== undefined,
    scene,
    diagnostics: diagnosticsFromFidelity(notes, scene !== undefined),
    fidelity,
    sourceMetadata: {
      formatId: "fixture",
      adapterVersion: IMPORT_VERSION,
      sourceBytes: new TextEncoder().encode(context.sourceText).length,
      name: document.name,
    },
  };
}

function malformed(source: string, message: string): ImportDiagnostic {
  return {
    code: "IMPORT_MALFORMED",
    severity: "fatal",
    fidelity: "unsupported",
    feature: "source",
    message,
    sourceSpan: spanAt(source, 0),
  };
}

function colorFromHex(hex: string): SolidColor | undefined {
  const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(hex);
  if (!match?.[1]) return undefined;
  const channel = (pair: string) => parseInt(pair, 16) / 255;
  const body = match[1];
  return {
    type: "solid",
    r: channel(body.slice(0, 2)),
    g: channel(body.slice(2, 4)),
    b: channel(body.slice(4, 6)),
    a: match[2] ? channel(match[2]) : 1,
  };
}

function vec(value: [number, number] | undefined): Vec2 {
  return { x: value?.[0] ?? 0, y: value?.[1] ?? 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
