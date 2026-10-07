import type { Vec2 } from "./types";

/** Matches lottie-web's defaultCurveSegments for spatial position keys. */
export const SPATIAL_CURVE_SEGMENTS = 150;

export interface SpatialSamplePoint {
  x: number;
  y: number;
  z: number;
}

/** Cubic from p0 to p3 with absolute controls c1 and c2 (XY). */
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

function cubicPoint3(
  u: number,
  p0: SpatialSamplePoint,
  c1: SpatialSamplePoint,
  c2: SpatialSamplePoint,
  p3: SpatialSamplePoint,
): SpatialSamplePoint {
  const t = Math.min(1, Math.max(0, u));
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
    z: a * p0.z + b * c1.z + c * c2.z + d * p3.z,
  };
}

/**
 * Sample a spatial position cubic by arc length.
 * `progress` is the eased segment progress in [0, 1]. After Effects / lottie-web
 * advance along chord length in the full tangent space (including Z), not the raw
 * bezier parameter. Only XY is returned for drawing.
 */
export function spatialCubicPoint(
  progress: number,
  p0: Vec2,
  c1: Vec2,
  c2: Vec2,
  p3: Vec2,
  segments: number = SPATIAL_CURVE_SEGMENTS,
  depth?: { p0z?: number; c1z?: number; c2z?: number; p3z?: number },
): Vec2 {
  const perc = Math.min(1, Math.max(0, progress));
  if (perc <= 0) return { ...p0 };
  if (perc >= 1) return { ...p3 };
  const p0z = depth?.p0z ?? 0;
  const c1z = depth?.c1z ?? 0;
  const c2z = depth?.c2z ?? 0;
  const p3z = depth?.p3z ?? 0;
  const useZ = p0z !== 0 || c1z !== 0 || c2z !== 0 || p3z !== 0;
  const count = Math.max(2, Math.floor(segments));
  const points: SpatialSamplePoint[] = new Array(count);
  const partialLengths: number[] = new Array(count);
  let totalLength = 0;
  let previous: SpatialSamplePoint | null = null;
  for (let index = 0; index < count; index += 1) {
    const point = useZ
      ? cubicPoint3(
          index / (count - 1),
          { x: p0.x, y: p0.y, z: p0z },
          { x: c1.x, y: c1.y, z: c1z },
          { x: c2.x, y: c2.y, z: c2z },
          { x: p3.x, y: p3.y, z: p3z },
        )
      : { ...cubicPoint(index / (count - 1), p0, c1, c2, p3), z: 0 };
    points[index] = point;
    if (previous === null) {
      partialLengths[index] = 0;
    } else {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const dz = point.z - previous.z;
      const segmentLength = useZ ? Math.hypot(dx, dy, dz) : Math.hypot(dx, dy);
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
