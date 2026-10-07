import { cubicControlsMonotonic, type Vec2 } from "@gvr/schema";
import type {
  AnimatedScalar,
  AnimatedVec2,
  LottieEasing,
  LottiePathKeyframe,
  LottieScalarKeyframe,
  LottieVec2Keyframe,
  PathPoint,
} from "./model";

export function readScalarProperty(raw: unknown, defaultValue: number): AnimatedScalar {
  const prop = readProperty(raw);
  if (!prop) return { kind: "static", value: defaultValue };
  if (prop.kind === "static") {
    return { kind: "static", value: scalarNumber(prop.value, defaultValue) };
  }
  const keyframes: LottieScalarKeyframe[] = [];
  for (const frame of prop.keyframes) {
    keyframes.push({
      frame: frame.frame,
      value: scalarNumber(frame.value, defaultValue),
      hold: frame.hold,
      easing: frame.easing,
    });
  }
  return { kind: "animated", keyframes };
}

/** Lottie 1D key values are often a one-element array (`s: [0]`). */
function scalarNumber(value: unknown, defaultValue: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && typeof value[0] === "number" && Number.isFinite(value[0])) return value[0];
  return defaultValue;
}

/**
 * Animated Lottie path (`sh.ks` with a=1). Keys store path data at `s[0]` (or rarely `s` object).
 * Returns undefined when fewer than two samples share vertex count and closed flag.
 */
export function readPathMorphKeyframes(raw: unknown): LottiePathKeyframe[] | undefined {
  if (!Array.isArray(raw) || raw.length < 2) return undefined;
  const keyframes: LottiePathKeyframe[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.t !== "number") continue;
    const path = unwrapPathData(item.s);
    if (!path) continue;
    const points = pathPointsFromRecord(path);
    if (!points) continue;
    keyframes.push({
      frame: item.t,
      commands: points.commands,
      closed: points.closed,
      hold: item.h === 1,
      easing: easingFromHandles(item.i, item.o),
    });
  }
  keyframes.sort((left, right) => left.frame - right.frame);
  if (keyframes.length < 2) return undefined;
  const first = keyframes[0]!;
  const same = keyframes.every(
    (frame) => frame.commands.length === first.commands.length && frame.closed === first.closed,
  );
  return same ? keyframes : undefined;
}

export function readVec2Property(raw: unknown, defaultValue: Vec2): AnimatedVec2 {
  const prop = readProperty(raw);
  if (!prop) return { kind: "static", value: defaultValue };
  if (prop.kind === "static") {
    const value = vec2FromUnknown(prop.value, defaultValue);
    return { kind: "static", value };
  }
  const keyframes: LottieVec2Keyframe[] = [];
  for (const frame of prop.keyframes) {
    keyframes.push({
      frame: frame.frame,
      value: vec2FromUnknown(frame.value, defaultValue),
      hold: frame.hold,
      easing: frame.easing,
      ...(frame.spatial ? { spatial: frame.spatial } : {}),
    });
  }
  return { kind: "animated", keyframes };
}

function readProperty(raw: unknown):
  | { kind: "static"; value: unknown }
  | { kind: "animated"; keyframes: { frame: number; value: unknown; hold: boolean; easing: LottieEasing; spatial?: { out: Vec2; in: Vec2 } }[] }
  | undefined {
  if (!isRecord(raw)) return undefined;
  const animated = raw.a === 1;
  const k = raw.k;
  if (!animated) {
    return { kind: "static", value: k };
  }
  if (!Array.isArray(k)) return undefined;
  const keyframes = [];
  for (const item of k) {
    if (!isRecord(item) || typeof item.t !== "number") continue;
    keyframes.push({
      frame: item.t,
      value: item.s,
      hold: item.h === 1,
      easing: easingFromHandles(item.i, item.o),
      spatial: spatialFrom(item.to, item.ti),
    });
  }
  keyframes.sort((left, right) => left.frame - right.frame);
  return { kind: "animated", keyframes };
}

function spatialFrom(outgoing: unknown, incoming: unknown): { out: Vec2 & { z?: number }; in: Vec2 & { z?: number } } | undefined {
  const out = tangent(outgoing);
  const inn = tangent(incoming);
  if (!out && !inn) return undefined;
  if (idle(out) && idle(inn)) return undefined;
  return { out: out ?? { x: 0, y: 0 }, in: inn ?? { x: 0, y: 0 } };
}

function tangent(value: unknown): (Vec2 & { z?: number }) | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const point: Vec2 & { z?: number } = { x: num(value[0], 0), y: num(value[1], 0) };
  if (value.length >= 3) {
    const z = num(value[2], 0);
    if (Math.abs(z) >= 1e-6) point.z = z;
  }
  return point;
}

function idle(value: (Vec2 & { z?: number }) | undefined): boolean {
  return !value || (Math.abs(value.x) < 1e-6 && Math.abs(value.y) < 1e-6 && Math.abs(value.z ?? 0) < 1e-6);
}

function easingFromHandles(input: unknown, output: unknown): LottieEasing {
  if (!isRecord(input) || !isRecord(output)) return "linear";
  const ix = num(Array.isArray(input.x) ? input.x[0] : input.x, 0.333);
  const iy = num(Array.isArray(input.y) ? input.y[0] : input.y, 0.333);
  const ox = num(Array.isArray(output.x) ? output.x[0] : output.x, 0.667);
  const oy = num(Array.isArray(output.y) ? output.y[0] : output.y, 0.667);
  // Linear only when both handles sit on y = x. AE often uses 0.167/0.833 on that
  // diagonal; proximity to those values alone must not collapse mild easings.
  if (Math.abs(ox - oy) < 0.01 && Math.abs(ix - iy) < 0.01) {
    return "linear";
  }
  if (Math.abs(ix) < 0.05 && Math.abs(iy) < 0.05) return "easeIn";
  if (Math.abs(ox - 1) < 0.05 && Math.abs(oy - 1) < 0.05) return "easeOut";
  if (Math.abs(ix - 0.42) < 0.08 && Math.abs(oy - 0.58) < 0.08) return "easeInOut";
  const cubic = { type: "cubic" as const, x1: ox, y1: oy, x2: ix, y2: iy };
  if (cubicControlsMonotonic(cubic)) return cubic;
  return "bezier-approx";
}

function vec2FromUnknown(value: unknown, fallback: Vec2): Vec2 {
  if (Array.isArray(value) && value.length >= 2) {
    return { x: num(value[0], fallback.x), y: num(value[1], fallback.y) };
  }
  return { ...fallback };
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unwrapPathData(raw: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(raw) && raw.length > 0 && isRecord(raw[0])) return raw[0];
  if (isRecord(raw) && Array.isArray(raw.v)) return raw;
  return undefined;
}

function pathPointsFromRecord(path: Record<string, unknown>): { commands: PathPoint[]; closed: boolean } | undefined {
  if (!Array.isArray(path.v)) return undefined;
  const vertices = path.v as unknown[];
  const ins = (path.i as unknown[]) ?? [];
  const outs = (path.o as unknown[]) ?? [];
  const points: PathPoint[] = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const vertex = vecFromArray(vertices[index]);
    if (!vertex) continue;
    points.push({
      vertex,
      inTangent: vecFromArray(ins[index]) ?? { x: 0, y: 0 },
      outTangent: vecFromArray(outs[index]) ?? { x: 0, y: 0 },
    });
  }
  if (points.length === 0) return undefined;
  return { commands: points, closed: path.c === true };
}

function vecFromArray(value: unknown): Vec2 | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x = value[0];
  const y = value[1];
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x, y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
