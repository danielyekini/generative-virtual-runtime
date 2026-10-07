import { applyEasing } from "./math";
import type { CubicEasing, EasingName, SegmentEasing } from "./types";

/** Named curves stay clamped. Cubic y may overshoot. Hold stays on the segment start until the next key. */
export function applySegmentEasing(easing: SegmentEasing | undefined, u: number): number {
  const t = Math.min(1, Math.max(0, u));
  if (!easing || typeof easing === "string") return applyEasing(easing ?? "linear", t);
  if (easing.type === "hold") return t >= 1 ? 1 : 0;
  return cubicBezierY(easing, t);
}

/**
 * Solve x(u) = progress for a cubic from (0,0) to (1,1), then return y(u).
 * x1 and x2 must already be inside [0, 1] so x is monotonic.
 */
export function cubicBezierY(easing: CubicEasing, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const u = solveMonotonicX(easing.x1, easing.x2, t);
  return bezierComponent(u, easing.y1, easing.y2);
}

export function cubicControlsMonotonic(easing: CubicEasing): boolean {
  return [easing.x1, easing.y1, easing.x2, easing.y2].every((value) => Number.isFinite(value)) && easing.x1 >= 0 && easing.x1 <= 1 && easing.x2 >= 0 && easing.x2 <= 1;
}

export function isNamedEasing(value: unknown): value is EasingName {
  return value === "linear" || value === "easeIn" || value === "easeOut" || value === "easeInOut";
}

function solveMonotonicX(x1: number, x2: number, target: number): number {
  let u = target;
  for (let step = 0; step < 8; step += 1) {
    const x = bezierComponent(u, x1, x2) - target;
    const slope = bezierSlope(u, x1, x2);
    if (Math.abs(x) < 1e-7) return clampUnit(u);
    if (Math.abs(slope) < 1e-6) break;
    u = clampUnit(u - x / slope);
  }
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 24; step += 1) {
    const mid = (lo + hi) / 2;
    if (bezierComponent(mid, x1, x2) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function bezierComponent(u: number, c1: number, c2: number): number {
  const c = 3 * c1;
  const b = 3 * (c2 - c1) - c;
  const a = 1 - c - b;
  return ((a * u + b) * u + c) * u;
}

function bezierSlope(u: number, c1: number, c2: number): number {
  const c = 3 * c1;
  const b = 3 * (c2 - c1) - c;
  const a = 1 - c - b;
  return (3 * a * u + 2 * b) * u + c;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
