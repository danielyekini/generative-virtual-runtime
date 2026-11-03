import type { PathCommand } from "./types";
import { PATH_METRIC_SEGMENTS, buildPathMetrics, sampleAtDistance, splitContours } from "./path-metrics";

/**
 * Trim a path by normalised arc length.
 * start and end lie in [0, 1]. Offset shifts the window and wraps.
 */
export function trimCommands(commands: readonly PathCommand[], start: number, end: number, offset: number): PathCommand[] {
  // Sample each contour independently: a move never contributes ink length.
  const contours = splitContours(commands);
  const sampled = contours.map(contour => {
    const metrics = buildPathMetrics(contour, PATH_METRIC_SEGMENTS);
    return { commands: contour, metrics, total: metrics.totalLength };
  });
  const total = sampled.reduce((sum, contour) => sum + contour.total, 0);
  const window = trimWindow(start, end, offset);
  if (window.end <= window.start) return [];
  if (!(total > 0)) return [...commands];
  if (window.start === 0 && window.end === 1 && (contours.length > 1 || commands.some(command => command.cmd === "Z"))) {
    return [...commands];
  }
  const result: PathCommand[] = [];
  let base = 0;
  for (const contour of sampled) {
    const from = Math.max(0, window.start * total - base);
    const to = Math.min(contour.total, window.end * total - base);
    base += contour.total;
    if (to <= from + 1e-9) continue;
    // A fully retained closed contour keeps its close command and join semantics.
    if (from === 0 && to === contour.total && contour.commands.some(command => command.cmd === "Z")) {
      for (const command of contour.commands) result.push(command);
      continue;
    }
    const first = sampleAtDistance(contour.metrics, from).point;
    result.push({ cmd: "M", ...first });
    for (let i = 0; i < contour.metrics.points.length; i++) {
      const at = contour.metrics.lengths[i]!;
      if (at > from + 1e-6 && at < to - 1e-6) result.push({ cmd: "L", ...contour.metrics.points[i]! });
    }
    result.push({ cmd: "L", ...sampleAtDistance(contour.metrics, to).point });
  }
  return result;
}

function trimWindow(start: number, end: number, offset: number): { start: number; end: number } {
  const span = Math.min(1, Math.max(0, end)) - Math.min(1, Math.max(0, start));
  const shifted = wrap(start + offset);
  return { start: shifted, end: Math.min(1, shifted + Math.max(0, span)) };
}

function wrap(value: number): number {
  const mod = value % 1;
  return mod < 0 ? mod + 1 : mod;
}
