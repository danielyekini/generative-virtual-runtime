import type { PathCommand, Vec2 } from "./types";

/** Parametric curve on the closed unit interval. Evaluated at t ∈ [0, 1]. */
export type ParametricFn = (t: number) => Vec2;

export interface PlotOptions {
  /** Max chord midpoint error in path units. Default 0.5. */
  tolerance?: number;
  /** Max recursive depth per segment. Default 12. */
  maxDepth?: number;
  /**
   * Cap on plot calls (excluding the initial endpoints). Default 4096.
   * When hit, remaining spans stay as chords.
   */
  maxEvals?: number;
}

export interface PlotResult {
  /** Open polyline: M then L… Only Z when the first and last points coincide. */
  readonly commands: PathCommand[];
  /** Inclusive sample points in parameter order. */
  readonly points: readonly Vec2[];
  /** Inclusive parameter values matching `points`. */
  readonly parameters: readonly number[];
  /** Number of midpoint `fn` calls during subdivision. Endpoints are separate. */
  readonly evaluations: number;
  /** True when a budget stopped further subdivision. */
  readonly truncated: boolean;
}

/**
 * Uniform parameter samples connected by lines.
 * Cost is exactly `segments + 1` evaluations of `fn`.
 */
export function plotUniform(
  fn: ParametricFn,
  segments: number,
): PlotResult {
  const count = Math.max(1, Math.floor(segments));
  const points: Vec2[] = [];
  const parameters: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    parameters.push(t);
    points.push(fn(t));
  }
  return {
    commands: pointsToCommands(points),
    points,
    parameters,
    evaluations: count + 1,
    truncated: false,
  };
}

/**
 * Adaptive chord-error plot: subdivide a span when the true midpoint of `fn`
 * is farther from the chord midpoint than `tolerance`.
 *
 * Host-level helper only — not a MotionScript / Scene IR capability.
 */
export function plotAdaptive(
  fn: ParametricFn,
  options: PlotOptions = {},
): PlotResult {
  const tolerance = options.tolerance ?? 0.5;
  const maxDepth = options.maxDepth ?? 12;
  const maxEvals = options.maxEvals ?? 4096;

  const parameters: number[] = [];
  const points: Vec2[] = [];
  let evaluations = 0;
  let truncated = false;

  function visit(ta: number, tb: number, a: Vec2, b: Vec2, depth: number): void {
    if (depth >= maxDepth || evaluations >= maxEvals) {
      if (evaluations >= maxEvals && depth < maxDepth) truncated = true;
      if (parameters.length === 0) {
        parameters.push(ta);
        points.push(a);
      }
      parameters.push(tb);
      points.push(b);
      return;
    }
    const tm = (ta + tb) * 0.5;
    const mid = fn(tm);
    evaluations += 1;
    const chord = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    const err = Math.hypot(mid.x - chord.x, mid.y - chord.y);
    if (err <= tolerance) {
      if (parameters.length === 0) {
        parameters.push(ta);
        points.push(a);
      }
      parameters.push(tb);
      points.push(b);
      return;
    }
    visit(ta, tm, a, mid, depth + 1);
    visit(tm, tb, mid, b, depth + 1);
  }

  const p0 = fn(0);
  const p1 = fn(1);
  visit(0, 1, p0, p1, 0);
  return {
    commands: pointsToCommands(points),
    points,
    parameters,
    evaluations,
    truncated,
  };
}

/**
 * Max distance from dense reference samples of `fn` to the polyline chords.
 * Lower is better visual fidelity.
 */
export function maxChordErrorToCurve(
  fn: ParametricFn,
  polyline: readonly Vec2[],
  referenceSamples = 512,
): number {
  if (polyline.length < 2) return Number.POSITIVE_INFINITY;
  let max = 0;
  for (let i = 0; i <= referenceSamples; i++) {
    const t = i / referenceSamples;
    const p = fn(t);
    max = Math.max(max, distanceToPolyline(p, polyline));
  }
  return max;
}

/** Closest distance from a point to a polyline's segments. */
export function distanceToPolyline(point: Vec2, polyline: readonly Vec2[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < polyline.length; i++) {
    best = Math.min(best, distanceToSegment(point, polyline[i - 1]!, polyline[i]!));
  }
  return best;
}

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let u = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  u = Math.min(1, Math.max(0, u));
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

function pointsToCommands(points: readonly Vec2[]): PathCommand[] {
  if (points.length === 0) return [];
  const commands: PathCommand[] = [{ cmd: "M", x: points[0]!.x, y: points[0]!.y }];
  for (let i = 1; i < points.length; i++) {
    commands.push({ cmd: "L", x: points[i]!.x, y: points[i]!.y });
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (points.length > 2 && first.x === last.x && first.y === last.y) {
    commands[commands.length - 1] = { cmd: "Z" };
  }
  return commands;
}
