from pathlib import Path
p=Path('packages/format-lottie/src/normalise.ts');s=p.read_text();s=s.replace('  lerpPathCommands,','  applySegmentEasing,\n  lerpPathCommands,');s=s.replace('const startEasing = easingCrossing(startMs, durationMs, keyframes, lo);','const startEasing = clippedEasing(startMs, durationMs, keyframes, lo, Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, lo)));');s=s.replace('...(key.easing ? { easing: key.easing } : {}),\n      ...(key.spatial ? { spatial: key.spatial } : {}),','...(key.easing ? { easing: clippedEasing(startMs, durationMs, keyframes, time, Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, time))) } : {}),\n      ...(key.spatial ? { spatial: key.spatial } : {}),');s=s.replace('const local = span === 0 ? 0 : (progress - from.offset) / span;','const local = applySegmentEasing(from.easing, span === 0 ? 0 : (progress - from.offset) / span);');start=s.index('function easingCrossing(');end=s.index('\nfunction spatialCrossing(',start)
s=s[:start]+'''function nextKeyTime(startMs: number, durationMs: number, keys: Keyframe[], timeMs: number): number {
  return keys.map(key => startMs + key.offset * durationMs).find(time => time > timeMs + 1e-9) ?? startMs + durationMs;
}

/** Preserve the original cubic's time/value curve when either end is clipped. */
function clippedEasing(startMs: number, durationMs: number, keys: Keyframe[], loMs: number, hiMs: number): SegmentEasing | undefined {
  const progress = (loMs - startMs) / durationMs;
  const index = keys.findIndex((key, i) => keys[i + 1] && progress >= key.offset - 1e-12 && progress < keys[i + 1]!.offset - 1e-12);
  if (index < 0) return undefined;
  const from = keys[index]!, to = keys[index + 1]!;
  const easing = from.easing;
  if (!easing || typeof easing === "string" || easing.type === "hold") return easing;
  const segmentStart = startMs + from.offset * durationMs;
  const segmentDuration = (to.offset - from.offset) * durationMs;
  const lo = Math.max(0, (loMs - segmentStart) / segmentDuration);
  const hi = Math.min(1, (hiMs - segmentStart) / segmentDuration);
  if (lo <= 1e-12 && hi >= 1 - 1e-12) return easing;
  type Point = { x: number; y: number };
  const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const split = (p: Point[], t: number): [Point[], Point[]] => {
    const a = mix(p[0]!, p[1]!, t), b = mix(p[1]!, p[2]!, t), c = mix(p[2]!, p[3]!, t);
    const d = mix(a, b, t), e = mix(b, c, t), f = mix(d, e, t);
    return [[p[0]!, a, d, f], [f, e, c, p[3]!]];
  };
  const curve: Point[] = [{ x: 0, y: 0 }, { x: easing.x1, y: easing.y1 }, { x: easing.x2, y: easing.y2 }, { x: 1, y: 1 }];
  const solve = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let a = 0, b = 1;
    for (let i = 0; i < 52; i++) { const t = (a + b) / 2; if (split(curve, t)[0][3]!.x < x) a = t; else b = t; }
    return (a + b) / 2;
  };
  const t0 = solve(lo), t1 = solve(hi);
  const left = split(curve, t1)[0];
  const clipped = split(left, t0 / t1)[1];
  const first = clipped[0]!, last = clipped[3]!;
  const dx = last.x - first.x, dy = last.y - first.y;
  if (Math.abs(dy) < 1e-12) return easing; // Degenerate/oscillating intervals are outside this verified slice.
  const normal = (p: Point) => ({ x: Math.max(0, Math.min(1, (p.x - first.x) / dx)), y: (p.y - first.y) / dy });
  const c1 = normal(clipped[1]!), c2 = normal(clipped[2]!);
  return { type: "cubic", x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y };
}
''' +s[end:];p.write_text(s)
