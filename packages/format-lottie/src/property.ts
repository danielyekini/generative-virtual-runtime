import { cubicControlsMonotonic, type Vec2 } from "@gvr/schema";
import type { AnimatedScalar, AnimatedVec2, LottieEasing, LottieScalarKeyframe, LottieVec2Keyframe } from "./model";

export function readScalarProperty(raw: unknown, defaultValue: number): AnimatedScalar {
  const prop = readProperty(raw);
  if (!prop) return { kind: "static", value: defaultValue };
  if (prop.kind === "static") {
    const value = typeof prop.value === "number" ? prop.value : defaultValue;
    return { kind: "static", value };
  }
  const keyframes: LottieScalarKeyframe[] = [];
  for (const frame of prop.keyframes) {
    const value = typeof frame.value === "number" ? frame.value : defaultValue;
    keyframes.push({
      frame: frame.frame,
      value,
      hold: frame.hold,
      easing: frame.easing,
    });
  }
  return { kind: "animated", keyframes };
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

function spatialFrom(outgoing: unknown, incoming: unknown): { out: Vec2; in: Vec2 } | undefined {
  const out = tangent(outgoing);
  const inn = tangent(incoming);
  if (!out && !inn) return undefined;
  if (idle(out) && idle(inn)) return undefined;
  return { out: out ?? { x: 0, y: 0 }, in: inn ?? { x: 0, y: 0 } };
}

function tangent(value: unknown): Vec2 | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  return { x: num(value[0], 0), y: num(value[1], 0) };
}

function idle(value: Vec2 | undefined): boolean {
  return !value || (Math.abs(value.x) < 1e-6 && Math.abs(value.y) < 1e-6);
}

function easingFromHandles(input: unknown, output: unknown): LottieEasing {
  if (!isRecord(input) || !isRecord(output)) return "linear";
  const ix = num(Array.isArray(input.x) ? input.x[0] : input.x, 0.333);
  const iy = num(Array.isArray(input.y) ? input.y[0] : input.y, 0.333);
  const ox = num(Array.isArray(output.x) ? output.x[0] : output.x, 0.667);
  const oy = num(Array.isArray(output.y) ? output.y[0] : output.y, 0.667);
  if (Math.abs(ix - 0.333) < 0.05 && Math.abs(iy - 0.333) < 0.05 && Math.abs(ox - 0.667) < 0.05 && Math.abs(oy - 0.667) < 0.05) {
    return "linear";
  }
  if (Math.abs(ix - 0.833) < 0.05 && Math.abs(iy - 0.833) < 0.05 && Math.abs(ox - 0.167) < 0.05 && Math.abs(oy - 0.167) < 0.05) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
