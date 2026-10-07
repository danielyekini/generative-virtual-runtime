import type { Vec2 } from "./types";

/** Matches lottie-web's defaultCurveSegments for spatial position keys. */
export const SPATIAL_CURVE_SEGMENTS = 150;

/** Cubic from p0 to p3 with absolute controls c1 and c2. */
export function cubicPoint(u: number, p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2): Vec2 {
  const t = Math.min(1, Math.max(0, u));
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  };
}

/**
 * Sample a spatial position cubic by arc length.
 * `progress` is the eased segment progress in [0, 1]. After Effects / lottie-web
 * advance along chord length, not the raw bezier parameter.
 */
export function spatialCubicPoint(
  progress: number,
  p0: Vec2,
  c1: Vec2,
  c2: Vec2,
  p3: Vec2,
  segments: number = SPATIAL_CURVE_SEGMENTS,
): Vec2 {
  const perc = Math.min(1, Math.max(0, progress));
  if (perc <= 0) return { ...p0 };
  if (perc >= 1) return { ...p3 };
  const count = Math.max(2, Math.floor(segments));
  const points: Vec2[] = new Array(count);
  const partialLengths: number[] = new Array(count);
  let totalLength = 0;
  let previous: Vec2 | null = null;
  for (let index = 0; index < count; index += 1) {
    const point = cubicPoint(index / (count - 1), p0, c1, c2, p3);
    points[index] = point;
    if (previous === null) {
      partialLengths[index] = 0;
    } else {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const segmentLength = Math.hypot(dx, dy);
      partialLengths[index] = segmentLength;
      totalLength += segmentLength;
    }
    previous = point;
  }
  if (!(totalLength > 0)) return { ...p0 };
  const target = totalLength * perc;
  let accumulated = 0;
  for (let index = 0; index < count - 1; index += 1) {
    const nextLength = partialLengths[index + 1] ?? 0;
    if (target <= accumulated + nextLength || index === count - 2) {
      const span = nextLength > 0 ? (target - accumulated) / nextLength : 0;
      const from = points[index]!;
      const to = points[index + 1]!;
      const t = Math.min(1, Math.max(0, span));
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }
    accumulated += nextLength;
  }
  return { ...p3 };
}

export function pathsShareTopology(
  left: readonly { cmd: string }[],
  right: readonly { cmd: string }[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((command, index) => command.cmd === right[index]?.cmd);
}
