import { compileMotionScript } from "@gvr/compiler";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime } from "@gvr/runtime";
import type {
  PathCommand,
  ResolvedAppearance,
  ResolvedDrawItem,
  ResolvedFrame,
  ResolvedGeometry,
  Paint,
  SceneIR,
  SolidColor,
  Stroke,
  Vec2,
} from "@gvr/schema";

/**
 * Semantic round-trip tolerances.
 *
 * The check compares evaluated draw state, not Scene IR text.
 * Text, ids, geometry kind, and draw order must match exactly.
 *
 * `number` (1e-3) covers matrix cells, opacity, geometry, and stroke width after
 * degree/radian and percentage formatting. It is wider than the emitter's own 1e-4
 * structural check.
 *
 * `color` (1/255) covers MotionScript's 8-bit `#rrggbb` / `#rrggbbaa` form. A channel
 * stored as a fraction such as 0.1 comes back as the nearest byte.
 */
export const ROUND_TRIP_TOLERANCE = {
  number: 1e-3,
  color: 1 / 255,
} as const;

export interface RoundTripMismatch {
  timeMs: number;
  nodeId: string;
  property: string;
  left: string;
  right: string;
  delta?: number;
}

export interface RoundTripReport {
  ok: boolean;
  script: string;
  compileOk: boolean;
  sampleTimes: number[];
  tolerance: { number: number; color: number };
  mismatches: RoundTripMismatch[];
}

export interface RoundTripOptions {
  sampleTimes?: readonly number[];
  tolerance?: { number: number; color: number };
  /** Replaces the canonical emitter. Tests use this to inject a bad mapping. */
  emit?: (scene: SceneIR) => string;
}

/**
 * Fixed sample clock for a scene: the start, the end, quarter marks, each keyframe
 * and track boundary, and each visibility step. Times are clamped to the duration.
 */
export function canonicalSampleTimes(scene: SceneIR): number[] {
  const duration = scene.timeline.durationMs;
  const times = new Set<number>([0, duration]);
  for (const fraction of [0.25, 0.5, 0.75]) times.add(duration * fraction);
  for (const track of scene.timeline.tracks) {
    times.add(clampTime(track.startMs, duration));
    times.add(clampTime(track.startMs + track.durationMs, duration));
    if (track.kind === "keyframe") {
      for (const keyframe of track.keyframes) {
        times.add(clampTime(track.startMs + keyframe.offset * track.durationMs, duration));
      }
    }
  }
  for (const step of scene.timeline.steps) times.add(clampTime(step.timeMs, duration));
  return [...times].filter((time) => Number.isFinite(time)).sort((a, b) => a - b);
}

/** Scene IR A → MotionScript → Scene IR B, then compare evaluated frames. */
export function verifyRoundTrip(scene: SceneIR, options: RoundTripOptions = {}): RoundTripReport {
  const tolerance = options.tolerance ?? { ...ROUND_TRIP_TOLERANCE };
  const sampleTimes = [...(options.sampleTimes ?? canonicalSampleTimes(scene))];
  const script = (options.emit ?? emitMotionScript)(scene);
  const compiled = compileMotionScript(script);
  if (!compiled.ok || !compiled.scene) {
    return {
      ok: false,
      script,
      compileOk: false,
      sampleTimes,
      tolerance,
      mismatches: compiled.diagnostics.map((item) => ({
        timeMs: 0,
        nodeId: "",
        property: "compile",
        left: "Scene IR A",
        right: `${item.code}: ${item.message}`,
      })),
    };
  }

  const left = new AnimationRuntime(scene);
  const right = new AnimationRuntime(compiled.scene);
  const mismatches: RoundTripMismatch[] = [];
  for (const timeMs of sampleTimes) {
    compareFrames(left.evaluate(timeMs), right.evaluate(timeMs), tolerance, mismatches);
  }
  return {
    ok: mismatches.length === 0,
    script,
    compileOk: true,
    sampleTimes,
    tolerance,
    mismatches,
  };
}

export function formatRoundTripReport(report: RoundTripReport): string {
  const lines = [
    `STATUS\t${report.ok ? "pass" : "fail"}`,
    `COMPILE\t${report.compileOk ? "ok" : "fail"}`,
    `TOLERANCE\tnumber\t${report.tolerance.number}\tcolor\t${report.tolerance.color}`,
    `SAMPLES\t${report.sampleTimes.join("\t")}`,
  ];
  for (const mismatch of report.mismatches) {
    const delta = mismatch.delta === undefined ? "" : `\tΔ${mismatch.delta}`;
    lines.push(`${mismatch.timeMs}\t${mismatch.nodeId}\t${mismatch.property}\t${mismatch.left}\t${mismatch.right}${delta}`);
  }
  return `${lines.join("\n")}\n`;
}

function clampTime(timeMs: number, durationMs: number): number {
  if (!Number.isFinite(timeMs)) return 0;
  return Math.min(durationMs, Math.max(0, timeMs));
}

function compareFrames(
  left: ResolvedFrame,
  right: ResolvedFrame,
  tolerance: { number: number; color: number },
  mismatches: RoundTripMismatch[],
): void {
  const timeMs = left.sceneTimeMs;
  compareNumber(mismatches, timeMs, "", "viewport.width", left.viewport.width, right.viewport.width, tolerance.number);
  compareNumber(mismatches, timeMs, "", "viewport.height", left.viewport.height, right.viewport.height, tolerance.number);
  compareColor(mismatches, timeMs, "", "background", left.background, right.background, tolerance.color);

  const leftOrder = left.drawItems.map((item) => item.nodeId).join(",");
  const rightOrder = right.drawItems.map((item) => item.nodeId).join(",");
  if (leftOrder !== rightOrder) {
    mismatches.push({
      timeMs,
      nodeId: "",
      property: "drawOrder",
      left: leftOrder,
      right: rightOrder,
    });
  }

  const rightById = new Map(right.drawItems.map((item) => [item.nodeId, item]));
  const leftIds = new Set(left.drawItems.map((item) => item.nodeId));
  for (const item of left.drawItems) {
    const other = rightById.get(item.nodeId);
    if (!other) {
      mismatches.push({ timeMs, nodeId: item.nodeId, property: "presence", left: "drawn", right: "absent" });
      continue;
    }
    compareItem(mismatches, timeMs, item, other, tolerance);
  }
  for (const item of right.drawItems) {
    if (!leftIds.has(item.nodeId)) {
      mismatches.push({ timeMs, nodeId: item.nodeId, property: "presence", left: "absent", right: "drawn" });
    }
  }
}

function compareItem(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  left: ResolvedDrawItem,
  right: ResolvedDrawItem,
  tolerance: { number: number; color: number },
): void {
  compareNumber(mismatches, timeMs, left.nodeId, "opacity", left.opacity, right.opacity, tolerance.number);
  for (let index = 0; index < left.logicalMatrix.length; index += 1) {
    compareNumber(
      mismatches,
      timeMs,
      left.nodeId,
      `matrix[${index}]`,
      left.logicalMatrix[index] ?? 0,
      right.logicalMatrix[index] ?? 0,
      tolerance.number,
    );
  }
  compareGeometry(mismatches, timeMs, left.nodeId, left.geometry, right.geometry, tolerance.number);
  compareAppearance(mismatches, timeMs, left.nodeId, left.appearance, right.appearance, tolerance);
}

function compareGeometry(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  left: ResolvedGeometry,
  right: ResolvedGeometry,
  tolerance: number,
): void {
  if (left.kind !== right.kind) {
    mismatches.push({ timeMs, nodeId, property: "geometry.kind", left: left.kind, right: right.kind });
    return;
  }
  if (left.kind === "circle" && right.kind === "circle") {
    compareNumber(mismatches, timeMs, nodeId, "radius", left.radius, right.radius, tolerance);
  } else if (left.kind === "rectangle" && right.kind === "rectangle") {
    compareVec(mismatches, timeMs, nodeId, "size", left.size, right.size, tolerance);
    compareNumber(mismatches, timeMs, nodeId, "cornerRadius", left.cornerRadius ?? 0, right.cornerRadius ?? 0, tolerance);
  } else if (left.kind === "ellipse" && right.kind === "ellipse") {
    compareVec(mismatches, timeMs, nodeId, "size", left.size, right.size, tolerance);
  } else if (left.kind === "image" && right.kind === "image") {
    compareVec(mismatches, timeMs, nodeId, "size", left.size, right.size, tolerance);
    if (left.href !== right.href) mismatches.push({ timeMs, nodeId, property: "image.href", left: left.href, right: right.href });
  } else if (left.kind === "line" && right.kind === "line") {
    compareVec(mismatches, timeMs, nodeId, "from", left.from, right.from, tolerance);
    compareVec(mismatches, timeMs, nodeId, "to", left.to, right.to, tolerance);
  } else if (left.kind === "polygon" && right.kind === "polygon") {
    comparePointList(mismatches, timeMs, nodeId, "points", left.points, right.points, tolerance);
  } else if (left.kind === "path" && right.kind === "path") {
    if (left.fillRule !== right.fillRule) {
      mismatches.push({ timeMs, nodeId, property: "fillRule", left: left.fillRule, right: right.fillRule });
    }
    compareCommands(mismatches, timeMs, nodeId, left.commands, right.commands, tolerance);
  } else if (left.kind === "text" && right.kind === "text") {
    if (left.content !== right.content) {
      mismatches.push({ timeMs, nodeId, property: "content", left: left.content, right: right.content });
    }
    if (left.align !== right.align) mismatches.push({ timeMs, nodeId, property: "align", left: left.align, right: right.align });
    if (left.baseline !== right.baseline) {
      mismatches.push({ timeMs, nodeId, property: "baseline", left: left.baseline, right: right.baseline });
    }
    if (left.font.family !== right.font.family) {
      mismatches.push({ timeMs, nodeId, property: "font.family", left: left.font.family, right: right.font.family });
    }
    if (left.font.style !== right.font.style) {
      mismatches.push({ timeMs, nodeId, property: "font.style", left: left.font.style, right: right.font.style });
    }
    compareNumber(mismatches, timeMs, nodeId, "font.size", left.font.size, right.font.size, tolerance);
    compareNumber(mismatches, timeMs, nodeId, "font.weight", left.font.weight, right.font.weight, tolerance);
  }
}

function compareCommands(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  left: readonly PathCommand[],
  right: readonly PathCommand[],
  tolerance: number,
): void {
  if (left.length !== right.length) {
    mismatches.push({
      timeMs,
      nodeId,
      property: "path.length",
      left: String(left.length),
      right: String(right.length),
    });
    return;
  }
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    if (a.cmd !== b.cmd) {
      mismatches.push({ timeMs, nodeId, property: `path[${index}].cmd`, left: a.cmd, right: b.cmd });
      continue;
    }
    for (const key of commandKeys(a)) {
      compareNumber(mismatches, timeMs, nodeId, `path[${index}].${key}`, numberField(a, key), numberField(b, key), tolerance);
    }
  }
}

function commandKeys(command: PathCommand): string[] {
  if (command.cmd === "Z") return [];
  if (command.cmd === "M" || command.cmd === "L") return ["x", "y"];
  if (command.cmd === "Q") return ["cx", "cy", "x", "y"];
  return ["c1x", "c1y", "c2x", "c2y", "x", "y"];
}

function numberField(command: PathCommand, key: string): number {
  const value = (command as unknown as Record<string, number | string>)[key];
  return typeof value === "number" ? value : 0;
}

function compareAppearance(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  left: ResolvedAppearance,
  right: ResolvedAppearance,
  tolerance: { number: number; color: number },
): void {
  compareOptionalColor(mismatches, timeMs, nodeId, "fill", left.fill, right.fill, tolerance.color);
  compareOptionalStroke(mismatches, timeMs, nodeId, left.stroke, right.stroke, tolerance);
}

function compareOptionalStroke(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  left: Stroke | undefined,
  right: Stroke | undefined,
  tolerance: { number: number; color: number },
): void {
  if (!left && !right) return;
  if (!left || !right) {
    mismatches.push({ timeMs, nodeId, property: "stroke", left: left ? "present" : "absent", right: right ? "present" : "absent" });
    return;
  }
  comparePaint(mismatches, timeMs, nodeId, "stroke.color", left.color, right.color, tolerance.color);
  compareNumber(mismatches, timeMs, nodeId, "stroke.width", left.width, right.width, tolerance.number);
  if (left.cap !== right.cap) mismatches.push({ timeMs, nodeId, property: "stroke.cap", left: left.cap, right: right.cap });
  if (left.join !== right.join) mismatches.push({ timeMs, nodeId, property: "stroke.join", left: left.join, right: right.join });
  compareNumber(mismatches, timeMs, nodeId, "stroke.miterLimit", left.miterLimit, right.miterLimit, tolerance.number);
}

function compareOptionalColor(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: Paint | undefined,
  right: Paint | undefined,
  tolerance: number,
): void {
  if (!left && !right) return;
  if (!left || !right) {
    mismatches.push({ timeMs, nodeId, property, left: left ? "present" : "absent", right: right ? "present" : "absent" });
    return;
  }
  comparePaint(mismatches, timeMs, nodeId, property, left, right, tolerance);
}

function comparePaint(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: Paint,
  right: Paint,
  tolerance: number,
): void {
  if (left.type !== right.type) {
    mismatches.push({ timeMs, nodeId, property, left: left.type, right: right.type });
    return;
  }
  if (left.type === "solid" && right.type === "solid") {
    compareColor(mismatches, timeMs, nodeId, property, left, right, tolerance);
    return;
  }
  if (left.type === "linear" && right.type === "linear") {
    compareNumber(mismatches, timeMs, nodeId, `${property}.x1`, left.x1, right.x1, tolerance);
    compareNumber(mismatches, timeMs, nodeId, `${property}.y1`, left.y1, right.y1, tolerance);
    compareNumber(mismatches, timeMs, nodeId, `${property}.x2`, left.x2, right.x2, tolerance);
    compareNumber(mismatches, timeMs, nodeId, `${property}.y2`, left.y2, right.y2, tolerance);
  }
  if (left.type === "radial" && right.type === "radial") {
    compareNumber(mismatches, timeMs, nodeId, `${property}.r`, left.r, right.r, tolerance);
  }
  if (left.type !== "solid" && right.type !== "solid" && left.stops.length !== right.stops.length) {
    mismatches.push({ timeMs, nodeId, property: `${property}.stops`, left: String(left.stops.length), right: String(right.stops.length) });
    return;
  }
  if (left.type !== "solid" && right.type !== "solid") {
    left.stops.forEach((stop, index) => {
      const other = right.stops[index];
      if (!other) return;
      compareNumber(mismatches, timeMs, nodeId, `${property}.stops[${index}].offset`, stop.offset, other.offset, tolerance);
      compareColor(mismatches, timeMs, nodeId, `${property}.stops[${index}]`, stop.color, other.color, tolerance);
    });
  }
}

function compareColor(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: SolidColor,
  right: SolidColor,
  tolerance: number,
): void {
  compareNumber(mismatches, timeMs, nodeId, `${property}.r`, left.r, right.r, tolerance);
  compareNumber(mismatches, timeMs, nodeId, `${property}.g`, left.g, right.g, tolerance);
  compareNumber(mismatches, timeMs, nodeId, `${property}.b`, left.b, right.b, tolerance);
  compareNumber(mismatches, timeMs, nodeId, `${property}.a`, left.a, right.a, tolerance);
}

function compareVec(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: Vec2,
  right: Vec2,
  tolerance: number,
): void {
  compareNumber(mismatches, timeMs, nodeId, `${property}.x`, left.x, right.x, tolerance);
  compareNumber(mismatches, timeMs, nodeId, `${property}.y`, left.y, right.y, tolerance);
}

function comparePointList(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: readonly Vec2[],
  right: readonly Vec2[],
  tolerance: number,
): void {
  if (left.length !== right.length) {
    mismatches.push({ timeMs, nodeId, property: `${property}.length`, left: String(left.length), right: String(right.length) });
    return;
  }
  for (let index = 0; index < left.length; index += 1) {
    compareVec(mismatches, timeMs, nodeId, `${property}[${index}]`, left[index]!, right[index]!, tolerance);
  }
}

function compareNumber(
  mismatches: RoundTripMismatch[],
  timeMs: number,
  nodeId: string,
  property: string,
  left: number,
  right: number,
  tolerance: number,
): void {
  const delta = Math.abs(left - right);
  if (delta <= tolerance) return;
  mismatches.push({
    timeMs,
    nodeId,
    property,
    left: formatNumber(left),
    right: formatNumber(right),
    delta,
  });
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return String(Math.round(value * 1e6) / 1e6);
}
