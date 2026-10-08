import { applySegmentEasing, lerpPathCommands, type Keyframe, type SegmentEasing } from "@gvr/schema";

type Point = [number, number];
type Curve = [Point, Point, Point, Point];
const mix = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function split(p: Curve, t: number): [Curve, Curve] {
  const a = mix(p[0], p[1], t), b = mix(p[1], p[2], t), c = mix(p[2], p[3], t);
  const d = mix(a, b, t), e = mix(b, c, t), f = mix(d, e, t);
  return [[p[0], a, d, f], [f, e, c, p[3]]];
}

function parameter(p: Curve, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (split(p, mid)[0][3][0] < x) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function sliceEasing(easing: SegmentEasing | undefined, lo: number, hi: number): SegmentEasing {
  if (!easing || easing === "linear") return "linear";
  if (typeof easing === "object" && easing.type === "hold") return easing;
  let curve: Curve;
  if (typeof easing === "object") curve = [[0, 0], [easing.x1, easing.y1], [easing.x2, easing.y2], [1, 1]];
  else {
    // Named easing is polynomial in time. easeInOut is split at its midpoint
    // by clipKeyframes, so each retained segment is a single quadratic.
    const value = (x: number) => applySegmentEasing(easing, x);
    const slope = (x: number) => easing === "easeIn" ? 2 * x : easing === "easeOut" ? 2 * (1 - x)
      : hi <= 0.5 ? 4 * x : 4 * (1 - x);
    const y0 = value(lo), y1 = value(hi), dy = y1 - y0, dx = hi - lo;
    if (Math.abs(dy) < 1e-14) return "linear";
    return { type: "cubic", x1: 1 / 3, y1: slope(lo) * dx / (3 * dy), x2: 2 / 3, y2: 1 - slope(hi) * dx / (3 * dy) };
  }
  const u0 = parameter(curve, lo), u1 = parameter(curve, hi);
  const left = split(curve, u1)[0];
  const sliced = u0 === 0 ? left : split(left, u0 / u1)[1];
  const first = sliced[0], last = sliced[3], dx = last[0] - first[0], dy = last[1] - first[1];
  if (Math.abs(dy) < 1e-14) return "linear";
  return { type: "cubic", x1: (sliced[1][0] - first[0]) / dx, y1: (sliced[1][1] - first[1]) / dy,
    x2: (sliced[2][0] - first[0]) / dx, y2: (sliced[2][1] - first[1]) / dy };
}

function sample(from: Keyframe, to: Keyframe, progress: number): Keyframe["value"] {
  const u = applySegmentEasing(from.easing, progress);
  if (Array.isArray(from.value) && Array.isArray(to.value)) return lerpPathCommands(from.value, to.value, u) ?? from.value;
  if (typeof from.value === "number" && typeof to.value === "number") return from.value + (to.value - from.value) * u;
  if (typeof from.value === "object" && !Array.isArray(from.value) && typeof to.value === "object" && !Array.isArray(to.value)) {
    const a = from.value as { x: number; y: number }, b = to.value as { x: number; y: number };
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  return from.value;
}

/** Restrict non-spatial source curves without restarting their easing at a cut. */
export function clipKeyframes(startMs: number, durationMs: number, keys: Keyframe[], sceneDurationMs: number) {
  const lo = Math.max(0, startMs), hi = Math.min(sceneDurationMs, startMs + durationMs);
  if (!(hi > lo)) return undefined;
  const result: Keyframe[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const from = keys[i]!, to = keys[i + 1]!;
    const t0 = startMs + from.offset * durationMs, t1 = startMs + to.offset * durationMs;
    const left = Math.max(lo, t0), right = Math.min(hi, t1);
    if (!(right > left)) continue;
    const cuts = [left, right];
    if (from.easing === "easeInOut" && t0 + (t1 - t0) / 2 > left && t0 + (t1 - t0) / 2 < right) cuts.splice(1, 0, t0 + (t1 - t0) / 2);
    // Split cubic y extrema so even a clipped overshoot with equal endpoint
    // values retains its excursion in the existing keyframe representation.
    if (typeof from.easing === "object" && from.easing.type === "cubic") {
      const { x1, y1, x2, y2 } = from.easing;
      const a = 3 * y1 - 3 * y2 + 1, b = 2 * (y2 - 2 * y1), c = y1;
      const discriminant = b * b - 4 * a * c;
      const roots = Math.abs(a) < 1e-14 ? (Math.abs(b) < 1e-14 ? [] : [-c / b])
        : discriminant < 0 ? [] : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
      for (const u of roots.filter(u => u > 0 && u < 1)) {
        const x = split([[0, 0], [x1, y1], [x2, y2], [1, 1]], u)[0][3][0];
        const time = t0 + x * (t1 - t0);
        if (time > left + 1e-9 && time < right - 1e-9) cuts.push(time);
      }
      cuts.sort((a, b) => a - b);
    }
    for (let j = 0; j < cuts.length - 1; j++) {
      const a = (cuts[j]! - t0) / (t1 - t0), b = (cuts[j + 1]! - t0) / (t1 - t0);
      result.push({ offset: (cuts[j]! - lo) / (hi - lo), value: sample(from, to, a), easing: sliceEasing(from.easing, a, b) });
    }
    if (right === hi) result.push({ offset: 1, value: right === t1 ? to.value : sample(from, to, (right - t0) / (t1 - t0)) });
  }
  return { startMs: lo, durationMs: hi - lo, keyframes: result };
}
