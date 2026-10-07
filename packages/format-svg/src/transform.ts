import type { Vec2 } from "@gvr/schema";

/** SVG matrix(a b c d e f): x' = a x + c y + e, y' = b x + d y + f. */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export interface Decomposed {
  position: Vec2;
  rotation: number;
  scale: Vec2;
}

/** Leftmost SVG transform is outermost: point' = first * next * point. */
export function multiply(left: Affine, right: Affine): Affine {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function parseTransformList(value: string | undefined): Affine | "skew" | "invalid" {
  if (!value || !value.trim()) return IDENTITY;
  if (/\bskewX\b|\bskewY\b/i.test(value)) return "skew";
  let combined = IDENTITY;
  const calls = value.matchAll(/([A-Za-z]+)\s*\(([^)]*)\)/g);
  let found = false;
  for (const call of calls) {
    found = true;
    const name = call[1]!.toLowerCase();
    const args = numbers(call[2] ?? "");
    const next = one(name, args);
    if (next === "skew" || next === "invalid") return next;
    combined = multiply(combined, next);
  }
  if (!found) return "invalid";
  return combined;
}

/**
 * Scene IR is T(position) * R * S with clockwise y-down rotation.
 * A shear that is not a negative scale is rejected.
 */
export function decompose(matrix: Affine): Decomposed | "skew" | "degenerate" {
  const sx = Math.hypot(matrix.a, matrix.b);
  if (sx < 1e-8) return "degenerate";
  const cos = matrix.a / sx;
  const sin = matrix.b / sx;
  const shear = matrix.c * cos + matrix.d * sin;
  if (Math.abs(shear) > 1e-3) return "skew";
  const sy = -matrix.c * sin + matrix.d * cos;
  if (Math.abs(sy) < 1e-8) return "degenerate";
  return {
    position: { x: matrix.e, y: matrix.f },
    rotation: Math.atan2(sin, cos),
    scale: { x: sx, y: sy },
  };
}

function one(name: string, args: number[]): Affine | "skew" | "invalid" {
  if (args.some((value) => !Number.isFinite(value))) return "invalid";
  if (name === "translate") {
    return { ...IDENTITY, e: args[0] ?? 0, f: args[1] ?? 0 };
  }
  if (name === "scale") {
    const sx = args[0] ?? 1;
    const sy = args[1] ?? sx;
    return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
  }
  if (name === "rotate") {
    const radians = ((args[0] ?? 0) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rotation: Affine = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
    const cx = args[1];
    const cy = args[2];
    if (cx === undefined || cy === undefined) return rotation;
    return multiply(multiply({ ...IDENTITY, e: cx, f: cy }, rotation), { ...IDENTITY, e: -cx, f: -cy });
  }
  if (name === "matrix" && args.length >= 6) {
    return { a: args[0]!, b: args[1]!, c: args[2]!, d: args[3]!, e: args[4]!, f: args[5]! };
  }
  if (name === "skewx" || name === "skewy") return "skew";
  return "invalid";
}

function numbers(text: string): number[] {
  return [...text.matchAll(/[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi)].map((match) => Number(match[0]));
}
