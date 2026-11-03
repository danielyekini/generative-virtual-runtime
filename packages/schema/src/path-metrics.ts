import type { PathCommand, Vec2 } from "./types";

/**
 * Default curve subdivision for arc-length metrics.
 * Matches `geometry.trimPath` sampling so trim windows and path progress agree.
 */
export const PATH_METRIC_SEGMENTS = 8;

export interface PathMetrics {
  readonly commands: readonly PathCommand[];
  /** Flattened polyline samples across all contours (pen-up jumps excluded from length). */
  readonly points: readonly Vec2[];
  /** Cumulative drawn length at each sample. */
  readonly lengths: readonly number[];
  readonly totalLength: number;
  /** Contour spans into `points` / `lengths`. */
  readonly contours: readonly PathContourSpan[];
}

export interface PathContourSpan {
  readonly pointStart: number;
  readonly pointEnd: number;
  readonly length: number;
  readonly commands: readonly PathCommand[];
}

export interface PathSample {
  readonly point: Vec2;
  /** Unit tangent in the direction of increasing arc length. Degenerate → {1,0}. */
  readonly tangent: Vec2;
  /** `atan2(tangent.y, tangent.x)` radians. */
  readonly angle: number;
  readonly distance: number;
  readonly totalLength: number;
  readonly progress: number;
}

/**
 * Build arc-length metrics for absolute path commands.
 * Contours start at each `M`; pen-up jumps contribute no drawn length.
 */
export function buildPathMetrics(
  commands: readonly PathCommand[],
  stepsPerCurve: number = PATH_METRIC_SEGMENTS,
): PathMetrics {
  const contours = splitContours(commands).map(contour => {
    const points = samplePath(contour, stepsPerCurve);
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      lengths.push(lengths[i - 1]! + distance(points[i - 1]!, points[i]!));
    }
    return {
      commands: contour,
      points,
      lengths,
      length: lengths[lengths.length - 1] ?? 0,
    };
  });

  const points: Vec2[] = [];
  const lengths: number[] = [];
  const spans: PathContourSpan[] = [];
  let base = 0;
  for (const contour of contours) {
    const pointStart = points.length;
    for (let i = 0; i < contour.points.length; i++) {
      points.push(contour.points[i]!);
      lengths.push(base + (contour.lengths[i] ?? 0));
    }
    const pointEnd = points.length;
    spans.push({
      pointStart,
      pointEnd,
      length: contour.length,
      commands: contour.commands,
    });
    base += contour.length;
  }

  return {
    commands,
    points,
    lengths,
    totalLength: base,
    contours: spans,
  };
}

/** Sample by absolute drawn distance along the aggregate path. Clamped to [0, total]. */
export function sampleAtDistance(metrics: PathMetrics, distanceValue: number): PathSample {
  const total = metrics.totalLength;
  if (!(total > 0) || metrics.points.length === 0) {
    const point = metrics.points[0] ? { ...metrics.points[0] } : { x: 0, y: 0 };
    return {
      point,
      tangent: { x: 1, y: 0 },
      angle: 0,
      distance: 0,
      totalLength: total,
      progress: 0,
    };
  }
  const clamped = Math.min(total, Math.max(0, distanceValue));
  const point = pointAtLength(metrics.points, metrics.lengths, clamped)!;
  const tangent = tangentAtLength(metrics.points, metrics.lengths, clamped);
  return {
    point,
    tangent,
    angle: Math.atan2(tangent.y, tangent.x),
    distance: clamped,
    totalLength: total,
    progress: clamped / total,
  };
}

/** Sample by normalised progress in [0, 1]. Values outside clamp. */
export function sampleAtProgress(metrics: PathMetrics, progress: number): PathSample {
  const total = metrics.totalLength;
  if (!(total > 0)) return sampleAtDistance(metrics, 0);
  const p = Math.min(1, Math.max(0, progress));
  return sampleAtDistance(metrics, p * total);
}

/**
 * Orientation from the path tangent. Does **not** encode rolling contact —
 * a wheel that rolls without slipping needs distance/radius, not this angle alone.
 */
export function orientAngleAtProgress(metrics: PathMetrics, progress: number): number {
  return sampleAtProgress(metrics, progress).angle;
}

/**
 * Rolling angle (radians) from arc distance and wheel radius.
 * Distinct from `orientAngleAtProgress`: orientation follows the tangent;
 * rolling integrates distance.
 */
export function rollingAngle(distanceValue: number, radius: number): number {
  if (!(radius > 0)) return 0;
  return distanceValue / radius;
}

/** Marker samples at explicit progress values (arrowheads, ticks, contacts). */
export function markerSamples(
  metrics: PathMetrics,
  progresses: readonly number[],
): readonly PathSample[] {
  return progresses.map(progress => sampleAtProgress(metrics, progress));
}

/**
 * Emit dash on-segments as separate open polylines (M/L only).
 * Pattern lengths are in the same logical units as the path. Phase shifts the
 * pattern start along the path (positive phase advances into the pattern).
 * Contours are dashed independently so pen-up breaks stay gaps.
 */
export function dashCommands(
  commands: readonly PathCommand[],
  pattern: readonly number[],
  phase: number = 0,
  stepsPerCurve: number = PATH_METRIC_SEGMENTS,
): PathCommand[] {
  const positive = pattern.filter(value => value > 0);
  if (positive.length === 0) return [];
  const cycle = positive.reduce((sum, value) => sum + value, 0);
  if (!(cycle > 0)) return [];

  const result: PathCommand[] = [];
  for (const contour of splitContours(commands)) {
    const metrics = buildPathMetrics(contour, stepsPerCurve);
    if (!(metrics.totalLength > 0)) continue;
    const phaseMod = wrapPositive(phase, cycle);
    let cursor = 0;
    let patternIndex = 0;
    let remaining = positive[0]!;
    let eat = phaseMod;
    while (eat > 0) {
      const take = Math.min(eat, remaining);
      eat -= take;
      remaining -= take;
      if (remaining <= 1e-12) {
        patternIndex = (patternIndex + 1) % positive.length;
        remaining = positive[patternIndex]!;
      }
    }
    let on = patternIndex % 2 === 0;
    while (cursor < metrics.totalLength - 1e-9) {
      const span = Math.min(remaining, metrics.totalLength - cursor);
      if (on && span > 1e-9) {
        const from = sampleAtDistance(metrics, cursor).point;
        const to = sampleAtDistance(metrics, cursor + span).point;
        result.push({ cmd: "M", ...from });
        // Keep intermediate samples so curved dashes stay faithful.
        for (let i = 0; i < metrics.points.length; i++) {
          const at = metrics.lengths[i]!;
          if (at > cursor + 1e-6 && at < cursor + span - 1e-6) {
            result.push({ cmd: "L", ...metrics.points[i]! });
          }
        }
        result.push({ cmd: "L", ...to });
      }
      cursor += span;
      remaining -= span;
      if (remaining <= 1e-12) {
        patternIndex = (patternIndex + 1) % positive.length;
        remaining = positive[patternIndex]!;
        on = patternIndex % 2 === 0;
      }
    }
  }
  return result;
}

export function splitContours(commands: readonly PathCommand[]): PathCommand[][] {
  const contours: PathCommand[][] = [];
  for (const command of commands) {
    if (command.cmd === "M" || contours.length === 0) contours.push([]);
    contours[contours.length - 1]!.push(command);
  }
  return contours;
}

function pointAtLength(samples: readonly Vec2[], lengths: readonly number[], target: number): Vec2 | undefined {
  if (target <= 0) return samples[0] ? { ...samples[0] } : undefined;
  const total = lengths[lengths.length - 1] ?? 0;
  if (target >= total) {
    const last = samples[samples.length - 1];
    return last ? { ...last } : undefined;
  }
  for (let index = 0; index < samples.length - 1; index += 1) {
    const lo = lengths[index] ?? 0;
    const hi = lengths[index + 1] ?? 0;
    if (target < lo - 1e-9 || target > hi + 1e-9) continue;
    if (Math.abs(hi - lo) < 1e-9) return { ...samples[index]! };
    const t = (target - lo) / (hi - lo);
    const a = samples[index]!;
    const b = samples[index + 1]!;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return undefined;
}

function tangentAtLength(samples: readonly Vec2[], lengths: readonly number[], target: number): Vec2 {
  if (samples.length < 2) return { x: 1, y: 0 };
  const total = lengths[lengths.length - 1] ?? 0;
  const clamped = Math.min(total, Math.max(0, target));
  for (let index = 0; index < samples.length - 1; index += 1) {
    const lo = lengths[index] ?? 0;
    const hi = lengths[index + 1] ?? 0;
    if (clamped < lo - 1e-9 || clamped > hi + 1e-9) continue;
    const a = samples[index]!;
    const b = samples[index + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) continue;
    return { x: dx / len, y: dy / len };
  }
  // Past the last segment or degenerate: walk backward for a usable edge.
  for (let index = samples.length - 2; index >= 0; index -= 1) {
    const a = samples[index]!;
    const b = samples[index + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) continue;
    return { x: dx / len, y: dy / len };
  }
  return { x: 1, y: 0 };
}

function samplePath(commands: readonly PathCommand[], steps: number): Vec2[] {
  const points: Vec2[] = [];
  let cursor = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  for (const command of commands) {
    if (command.cmd === "M") {
      cursor = { x: command.x, y: command.y };
      start = cursor;
      points.push(cursor);
    } else if (command.cmd === "L") {
      cursor = { x: command.x, y: command.y };
      points.push(cursor);
    } else if (command.cmd === "Q") {
      const from = cursor;
      for (let step = 1; step <= steps; step += 1) {
        points.push(quadratic(from, { x: command.cx, y: command.cy }, { x: command.x, y: command.y }, step / steps));
      }
      cursor = { x: command.x, y: command.y };
    } else if (command.cmd === "C") {
      const from = cursor;
      for (let step = 1; step <= steps; step += 1) {
        points.push(
          cubic(
            from,
            { x: command.c1x, y: command.c1y },
            { x: command.c2x, y: command.c2y },
            { x: command.x, y: command.y },
            step / steps,
          ),
        );
      }
      cursor = { x: command.x, y: command.y };
    } else if (command.cmd === "Z") {
      points.push(start);
      cursor = start;
    }
  }
  return points;
}

function quadratic(p0: Vec2, c: Vec2, p1: Vec2, t: number): Vec2 {
  const m = 1 - t;
  return { x: m * m * p0.x + 2 * m * t * c.x + t * t * p1.x, y: m * m * p0.y + 2 * m * t * c.y + t * t * p1.y };
}

function cubic(p0: Vec2, c1: Vec2, c2: Vec2, p1: Vec2, t: number): Vec2 {
  const m = 1 - t;
  return {
    x: m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p1.x,
    y: m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p1.y,
  };
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function wrapPositive(value: number, cycle: number): number {
  if (!(cycle > 0)) return 0;
  const mod = value % cycle;
  return mod < 0 ? mod + cycle : mod;
}
