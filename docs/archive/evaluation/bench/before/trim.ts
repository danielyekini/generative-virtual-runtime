import type { PathCommand, Vec2 } from "../../../packages/schema/src/types";

/**
 * Trim a path by normalised arc length.
 * start and end lie in [0, 1]. Offset shifts the window and wraps.
 */
export function trimCommands(commands: readonly PathCommand[], start: number, end: number, offset: number): PathCommand[] {
  const samples = samplePath(commands, 8);
  if (samples.length < 2) return [...commands];
  const lengths = [0];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = lengths[index - 1] ?? 0;
    lengths.push(previous + distance(samples[index - 1]!, samples[index]!));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  if (!(total > 0)) return [...commands];
  const window = trimWindow(start, end, offset);
  const from = window.start * total;
  const to = window.end * total;
  if (to <= from + 1e-9) return [];
  const kept: Vec2[] = [];
  const startPoint = pointAtLength(samples, lengths, from);
  const endPoint = pointAtLength(samples, lengths, to);
  if (!startPoint || !endPoint) return [];
  kept.push(startPoint);
  for (let index = 0; index < samples.length; index += 1) {
    const at = lengths[index] ?? 0;
    if (at > from + 1e-6 && at < to - 1e-6) kept.push(samples[index]!);
  }
  kept.push(endPoint);
  const [first, ...rest] = kept;
  if (!first || rest.length === 0) return [];
  return [{ cmd: "M", x: first.x, y: first.y }, ...rest.map((point) => ({ cmd: "L" as const, x: point.x, y: point.y }))];
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

function trimWindow(start: number, end: number, offset: number): { start: number; end: number } {
  const span = Math.min(1, Math.max(0, end)) - Math.min(1, Math.max(0, start));
  const shifted = wrap(start + offset);
  return { start: shifted, end: Math.min(1, shifted + Math.max(0, span)) };
}

function wrap(value: number): number {
  const mod = value % 1;
  return mod < 0 ? mod + 1 : mod;
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
