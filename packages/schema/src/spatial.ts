import type { Vec2 } from "./types";

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

export function pathsShareTopology(
  left: readonly { cmd: string }[],
  right: readonly { cmd: string }[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((command, index) => command.cmd === right[index]?.cmd);
}
