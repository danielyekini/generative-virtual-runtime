import {
  allocateId,
  diagnosticsFromFidelity,
  fidelityReport,
  type FidelityItem,
  type ImportContext,
  type ImportResult,
} from "@gvr/format-import-core";
import type { KeyframeTrack, NodeDefinition, PathCommand, SceneIR, SolidColor, Stroke, Transform, Vec2 } from "@gvr/schema";
import { applySvgMotion } from "./motion";
import { SVG_ADAPTER_VERSION, SVG_STATIC_DURATION_MS, type SvgDocument, type SvgNode } from "./model";
import { parseSvgPath } from "./path";
import { isDroppedTag, isVisualTag, length } from "./parse";
import { decompose, IDENTITY, parseTransformList, type Decomposed } from "./transform";

interface Style {
  fill: SolidColor | "none";
  stroke: SolidColor | "none";
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
  visible: boolean;
  fontSize: number;
  fontWeight: number;
  anchor: "start" | "middle" | "end";
}

interface Lower {
  notes: FidelityItem[];
  nodes: NodeDefinition[];
  used: Set<string>;
  stylesheetNoted: boolean;
  tracks: KeyframeTrack[];
  capabilities: string[];
  svgIds: Map<string, string>;
}

const DEFAULT_STYLE: Style = {
  fill: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
  stroke: "none",
  strokeWidth: 1,
  opacity: 1,
  fillOpacity: 1,
  strokeOpacity: 1,
  visible: true,
  fontSize: 16,
  fontWeight: 400,
  anchor: "start",
};

export function normaliseSvg(document: SvgDocument, context: ImportContext): ImportResult {
  const notes: FidelityItem[] = [];
  if (document.rejected) {
    notes.push({ feature: document.rejected.feature, level: "unsupported", message: document.rejected.message });
    return finish(context, notes, undefined);
  }
  if (document.preserve === "slice") {
    notes.push({
      feature: "preserveAspectRatio",
      level: "unsupported",
      message: "preserveAspectRatio slice needs clipping, which Scene IR does not represent.",
    });
    return finish(context, notes, undefined);
  }

  const lower: Lower = { notes, nodes: [], used: new Set(), stylesheetNoted: false, tracks: [], capabilities: [], svgIds: new Map() };
  const fit = fitGroup(document, lower);
  for (const child of document.children) lowerNode(lower, child, fit.parentId, DEFAULT_STYLE, 0);
  applySvgMotion(document, lower);
  const durationMs = Math.max(SVG_STATIC_DURATION_MS, ...lower.tracks.map((track) => track.startMs + track.durationMs));
  const animated = lower.tracks.length > 0;
  notes.push({
    feature: animated ? "svg-motion" : "static-duration",
    level: "exact",
    message: animated
      ? `SVG motion uses a ${durationMs}ms preview duration.`
      : `Static SVG uses a ${SVG_STATIC_DURATION_MS}ms duration so the runtime can seek it.`,
  });
  if (!animated && document.stylesheets.length > 0 && !lower.stylesheetNoted) {
    notes.push({ feature: "stylesheet", level: "unsupported", message: "SVG stylesheets are not applied." });
  }
  const capabilities = [...new Set(lower.capabilities)];

  const scene: SceneIR = {
    irVersion: capabilities.length > 0 ? "0.2" : "0.1",
    ...(capabilities.length > 0 ? { requiredCapabilities: capabilities } : {}),
    sceneId: "svg",
    viewport: { width: fit.width, height: fit.height, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 0 },
    resources: lower.nodes.some((node) => node.kind === "text")
      ? [{ id: "font_sans", kind: "font", family: "sans", source: "builtin" }]
      : [],
    nodes: lower.nodes,
    cameras: [{ id: "main", position: { x: fit.width / 2, y: fit.height / 2 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks: lower.tracks, steps: [] },
  };
  return finish(context, notes, scene);
}

function fitGroup(document: SvgDocument, lower: Lower): { parentId: string | null; width: number; height: number } {
  const box = document.viewBox;
  if (!box) return { parentId: null, width: document.width, height: document.height };
  if (document.preserve === "none") {
    const sx = document.width / box.width;
    const sy = document.height / box.height;
    const id = allocateId(null, "view", lower.used);
    lower.nodes.push(group(id, null, 0, { position: { x: -box.minX * sx, y: -box.minY * sy }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: sx, y: sy } }, 1, true));
    lower.notes.push({ feature: "viewBox", level: "exact", message: "preserveAspectRatio none scales the viewBox onto width and height." });
    return { parentId: id.id, width: document.width, height: document.height };
  }
  const shifted = box.minX !== 0 || box.minY !== 0;
  let parentId: string | null = null;
  if (shifted) {
    const id = allocateId(null, "view", lower.used);
    lower.nodes.push(group(id, null, 0, { position: { x: -box.minX, y: -box.minY }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }, 1, true));
    parentId = id.id;
  }
  lower.notes.push({
    feature: "viewBox",
    level: document.meetAlignDiffers ? "approximated" : "exact",
    message: document.meetAlignDiffers
      ? "Meet alignment other than xMidYMid uses the runtime's centered letterbox."
      : "viewBox is the Scene IR viewport, with minX/minY translated to the origin.",
  });
  return { parentId, width: box.width, height: box.height };
}

function lowerNode(lower: Lower, node: SvgNode, parentId: string | null, inherited: Style, siblingZ: number): void {
  const tag = node.attrs["data-tag"] ?? node.kind;
  if (tag === "animate" || tag === "animateTransform" || tag === "set") return;
  if (tag === "style") {
    if (!lower.stylesheetNoted) {
      lower.stylesheetNoted = true;
      lower.notes.push({ feature: "stylesheet", level: "unsupported", message: "SVG stylesheets are not applied." });
    }
    return;
  }
  if (isDroppedTag(tag)) {
    lower.notes.push({ feature: tag, level: "dropped", message: `<${tag}> has no painted result.` });
    return;
  }
  if (!isVisualTag(tag)) {
    lower.notes.push({ feature: tag, level: "unsupported", message: `<${tag}> is outside the SVG subset.` });
    return;
  }
  if (tag === "text" && node.children.some((child) => (child.attrs["data-tag"] ?? child.kind) === "tspan" || (child.attrs["data-tag"] ?? child.kind) === "textPath")) {
    lower.notes.push({ feature: "text", level: "unsupported", message: "tspan and textPath are not imported." });
    return;
  }

  const style = applyStyle(inherited, node.attrs);
  const transform = parseTransformList(node.attrs.transform);
  if (transform === "skew" || transform === "invalid") {
    lower.notes.push({
      feature: transform === "skew" ? "skew" : "transform",
      level: "unsupported",
      message: transform === "skew" ? "skewX and skewY are not representable in Scene IR." : "The transform list could not be parsed.",
      target: node.id,
    });
  }
  const decomposed = transform === "skew" || transform === "invalid" ? undefined : decompose(transform);
  if (decomposed === "skew" || decomposed === "degenerate") {
    lower.notes.push({
      feature: "skew",
      level: "unsupported",
      message: "The transform shears, and Scene IR has no skew.",
      target: node.id,
    });
  }
  const placed = decomposed && decomposed !== "skew" && decomposed !== "degenerate" ? decomposed : undefined;
  const needsWrap = placed !== undefined && !isPlain(placed);
  let host = parentId;
  if (needsWrap && placed) {
    const wrapped = allocateId(parentId, node.id || tag, lower.used);
    lower.nodes.push(group(wrapped, parentId, siblingZ, toTransform(placed), style.opacity, style.visible));
    host = wrapped.id;
  }

  if (node.kind === "g") {
    let groupId = host;
    if (!needsWrap) {
      const id = allocateId(parentId, node.id || "group", lower.used);
      lower.nodes.push(group(id, parentId, siblingZ, identity(), style.opacity, style.visible));
      groupId = id.id;
    }
    if (style.opacity !== 1) {
      const groupNode = lower.nodes.find((entry) => entry.id === groupId && entry.kind === "group");
      if (groupNode && groupNode.kind === "group") groupNode.compositing = { isolated: true };
      lower.capabilities.push("compositing.isolatedOpacity");
      lower.notes.push({
        feature: "group-opacity",
        level: "exact",
        message: "Group opacity is an isolated render scope.",
        target: groupId ?? undefined,
      });
    }
    if (node.id && groupId) lower.svgIds.set(node.id, groupId);
    const childStyle = { ...style, opacity: 1 };
    node.children.forEach((child, index) => lowerNode(lower, child, groupId, childStyle, index));
    return;
  }

  const shapeParent = needsWrap ? host : parentId;
  const shapeIndex = needsWrap ? 0 : siblingZ;
  const shapeId = allocateId(shapeParent, node.id || node.kind, lower.used);
  const geometry = geometryNode(node, shapeId, shapeParent, shapeIndex, style, placed, needsWrap);
  if (!geometry) {
    lower.notes.push({ feature: node.kind, level: "unsupported", message: `<${node.kind}> could not be converted.`, target: node.id });
    return;
  }
  lower.nodes.push(geometry);
  if (node.id) lower.svgIds.set(node.id, shapeId.id);
  if (node.kind === "text") {
    lower.notes.push({
      feature: "text",
      level: "approximated",
      message: "Text uses the built-in sans font. Glyph metrics are not matched to a browser.",
      target: shapeId.id,
    });
  }
  if (node.kind === "path" && parseSvgPath(node.attrs.d ?? "")?.approximated) {
    lower.notes.push({
      feature: "arc",
      level: "approximated",
      message: "Elliptical arcs are converted to cubic curves.",
      target: shapeId.id,
    });
  }
}

function geometryNode(
  node: SvgNode,
  id: { id: string; name: string },
  parentId: string | null,
  zIndex: number,
  style: Style,
  placed: Decomposed | undefined,
  wrapped: boolean,
): NodeDefinition | undefined {
  const local = wrapped || !placed ? identity() : toTransform(placed);
  const common = {
    id: id.id,
    name: id.name,
    parentId,
    zIndex,
    opacity: wrapped ? 1 : style.opacity,
    visible: style.visible,
    space: parentId ? undefined : ("world" as const),
    transform: local,
  };
  const fill = paintFill(style);
  const stroke = paintStroke(style);
  if (node.kind === "rect") {
    const width = length(node.attrs.width) ?? num(node.attrs.width);
    const height = length(node.attrs.height) ?? num(node.attrs.height);
    if (!(width > 0) || !(height > 0)) return undefined;
    const x = num(node.attrs.x) ?? 0;
    const y = num(node.attrs.y) ?? 0;
    const rx = num(node.attrs.rx) ?? 0;
    const ry = num(node.attrs.ry) ?? 0;
    if (rx > 0 || ry > 0) return undefined;
    return { ...common, transform: withPosition(local, x, y), kind: "rectangle", size: { x: width, y: height }, fill, stroke };
  }
  if (node.kind === "circle") {
    const radius = num(node.attrs.r);
    if (!(radius > 0)) return undefined;
    return { ...common, transform: withPosition(local, num(node.attrs.cx) ?? 0, num(node.attrs.cy) ?? 0), kind: "circle", radius, fill, stroke };
  }
  if (node.kind === "ellipse") {
    const rx = num(node.attrs.rx);
    const ry = num(node.attrs.ry);
    if (!(rx > 0) || !(ry > 0)) return undefined;
    return {
      ...common,
      transform: withPosition(local, num(node.attrs.cx) ?? 0, num(node.attrs.cy) ?? 0),
      kind: "ellipse",
      size: { x: rx * 2, y: ry * 2 },
      fill,
      stroke,
    };
  }
  if (node.kind === "line") {
    if (!stroke) return undefined;
    return {
      ...common,
      kind: "line",
      from: { x: num(node.attrs.x1) ?? 0, y: num(node.attrs.y1) ?? 0 },
      to: { x: num(node.attrs.x2) ?? 0, y: num(node.attrs.y2) ?? 0 },
      stroke,
    };
  }
  if (node.kind === "polygon" || node.kind === "polyline") {
    const points = pointsOf(node.attrs.points ?? "");
    if (points.length < 2) return undefined;
    if (node.kind === "polygon" && points.length >= 3) {
      return { ...common, kind: "polygon", points, fill, stroke };
    }
    const commands: PathCommand[] = points.map((point, index) =>
      index === 0 ? { cmd: "M", x: point.x, y: point.y } : { cmd: "L", x: point.x, y: point.y },
    );
    return { ...common, kind: "path", commands, fillRule: "nonzero", fill, stroke };
  }
  if (node.kind === "path") {
    const parsed = parseSvgPath(node.attrs.d ?? "");
    if (!parsed) return undefined;
    return { ...common, kind: "path", commands: parsed.commands, fillRule: node.attrs["fill-rule"] === "evenodd" ? "evenodd" : "nonzero", fill, stroke };
  }
  if (node.kind === "text") {
    const content = node.text.replace(/\s+/g, " ").trim();
    if (!content) return undefined;
    return {
      ...common,
      transform: withPosition(local, num(node.attrs.x) ?? 0, num(node.attrs.y) ?? 0),
      kind: "text",
      content,
      font: { family: "sans", size: style.fontSize, weight: style.fontWeight, style: "normal" },
      align: style.anchor === "middle" ? "center" : style.anchor === "end" ? "right" : "left",
      baseline: "alphabetic",
      fill: fill ?? { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      stroke,
    };
  }
  return undefined;
}

function paintFill(style: Style): SolidColor | undefined {
  if (style.fill === "none") return undefined;
  return { ...style.fill, a: style.fill.a * style.fillOpacity };
}

function paintStroke(style: Style): Stroke | undefined {
  if (style.stroke === "none" || !(style.strokeWidth > 0)) return undefined;
  return {
    color: { ...style.stroke, a: style.stroke.a * style.strokeOpacity },
    width: style.strokeWidth,
    cap: "butt",
    join: "miter",
    miterLimit: 4,
  };
}

function applyStyle(parent: Style, attrs: Record<string, string>): Style {
  const style = { ...parent };
  const declared = { ...attrs };
  const inline = attrs.style;
  if (inline) {
    for (const part of inline.split(";")) {
      const [key, value] = part.split(":");
      if (key && value) declared[key.trim()] = value.trim();
    }
  }
  if (declared.fill) style.fill = color(declared.fill) ?? style.fill;
  if (declared.stroke) style.stroke = color(declared.stroke) ?? style.stroke;
  if (declared["stroke-width"]) style.strokeWidth = num(declared["stroke-width"]) ?? style.strokeWidth;
  if (declared.opacity) style.opacity = num(declared.opacity) ?? style.opacity;
  if (declared["fill-opacity"]) style.fillOpacity = num(declared["fill-opacity"]) ?? style.fillOpacity;
  if (declared["stroke-opacity"]) style.strokeOpacity = num(declared["stroke-opacity"]) ?? style.strokeOpacity;
  if (declared.display === "none" || declared.visibility === "hidden") style.visible = false;
  if (declared["font-size"]) style.fontSize = num(declared["font-size"]) ?? style.fontSize;
  if (declared["font-weight"]) style.fontWeight = weight(declared["font-weight"]);
  if (declared["text-anchor"] === "start" || declared["text-anchor"] === "middle" || declared["text-anchor"] === "end") {
    style.anchor = declared["text-anchor"];
  }
  return style;
}

function color(value: string): SolidColor | "none" | undefined {
  const text = value.trim().toLowerCase();
  if (text === "none" || text === "transparent") return "none";
  const named: Record<string, SolidColor> = {
    black: rgb(0, 0, 0),
    white: rgb(255, 255, 255),
    red: rgb(255, 0, 0),
    green: rgb(0, 128, 0),
    blue: rgb(0, 0, 255),
  };
  if (named[text]) return named[text];
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) return hexColor(hex[1]!);
  const channels = text.match(/^rgba?\(([^)]+)\)$/);
  if (!channels) return undefined;
  const parts = channels[1]!.split(/[\s,\/]+/).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return undefined;
  return { type: "solid", r: parts[0]! / 255, g: parts[1]! / 255, b: parts[2]! / 255, a: parts[3] ?? 1 };
}

function hexColor(hex: string): SolidColor | undefined {
  const expanded = hex.length === 3 || hex.length === 4 ? [...hex].map((char) => char + char).join("") : hex;
  if (expanded.length !== 6 && expanded.length !== 8) return undefined;
  const n = Number.parseInt(expanded, 16);
  const r = expanded.length === 6 ? (n >> 16) & 255 : (n >> 24) & 255;
  const g = expanded.length === 6 ? (n >> 8) & 255 : (n >> 16) & 255;
  const b = expanded.length === 6 ? n & 255 : (n >> 8) & 255;
  const a = expanded.length === 6 ? 255 : n & 255;
  return { type: "solid", r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
}

function rgb(r: number, g: number, b: number): SolidColor {
  return { type: "solid", r: r / 255, g: g / 255, b: b / 255, a: 1 };
}

function weight(value: string): number {
  if (value === "bold") return 700;
  if (value === "normal") return 400;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 400;
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pointsOf(value: string): Vec2[] {
  const numbers = [...value.matchAll(/[-+]?(?:\d*\.\d+|\d+)/g)].map((match) => Number(match[0]));
  const points: Vec2[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index]!, y: numbers[index + 1]! });
  }
  return points;
}

function group(
  id: { id: string; name: string },
  parentId: string | null,
  zIndex: number,
  transform: Transform,
  opacity: number,
  visible: boolean,
): NodeDefinition {
  return {
    id: id.id,
    name: id.name,
    parentId,
    zIndex,
    transform,
    opacity,
    visible,
    space: parentId ? undefined : "world",
    kind: "group",
  };
}

function identity(): Transform {
  return { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } };
}

function toTransform(value: Decomposed): Transform {
  return { position: value.position, pivot: { x: 0, y: 0 }, rotation: value.rotation, scale: value.scale };
}

function withPosition(transform: Transform, x: number, y: number): Transform {
  return { ...transform, position: { x: transform.position.x + x, y: transform.position.y + y } };
}

function isPlain(value: Decomposed): boolean {
  return value.position.x === 0 && value.position.y === 0 && value.rotation === 0 && value.scale.x === 1 && value.scale.y === 1;
}

function finish(context: ImportContext, notes: FidelityItem[], scene: SceneIR | undefined): ImportResult {
  const fidelity = fidelityReport(notes, scene !== undefined);
  return {
    ok: scene !== undefined,
    scene,
    diagnostics: diagnosticsFromFidelity(notes, scene !== undefined),
    fidelity,
    sourceMetadata: {
      formatId: "svg",
      adapterVersion: SVG_ADAPTER_VERSION,
      sourceBytes: new TextEncoder().encode(context.sourceText).length,
      name: context.sourceName,
    },
  };
}
