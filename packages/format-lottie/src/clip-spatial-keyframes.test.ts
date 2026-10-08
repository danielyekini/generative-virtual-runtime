import { describe, expect, it } from "vitest";
import { applySegmentEasing, spatialCubicPoint, type Keyframe, type SegmentEasing, type Vec2 } from "@gvr/schema";
import { clipSpatialKeyframes } from "./clip-spatial-keyframes";

function sample(keys: Keyframe[], progress: number): Vec2 {
  if (progress >= 1) return keys.at(-1)!.value as Vec2;
  const i = keys.findIndex((key, i) => i < keys.length - 1 && progress < keys[i + 1]!.offset);
  const a = keys[i]!, b = keys[i + 1]!, u = applySegmentEasing(a.easing, (progress - a.offset) / (b.offset - a.offset));
  const p = a.value as Vec2, q = b.value as Vec2;
  return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u };
}

describe("spatial composition-window clipping", () => {
  it("preserves uncut arc-length motion through both cuts and shuffled seeks", () => {
    for (const easing of ["linear", "easeIn", "easeOut", "easeInOut", { type: "cubic", x1: .167, y1: 0, x2: .833, y2: 1 }] as SegmentEasing[]) {
      const keys: Keyframe[] = [{ offset: 0, value: { x: 0, y: 0 }, easing,
        spatial: { out: { x: 100, y: 200, z: 40 }, in: { x: -100, y: -50, z: 100 } } }, { offset: 1, value: { x: 500, y: 300 } }];
      const clipped = clipSpatialKeyframes(-200, 1600, keys, 1000)!;
      expect(clipped.startMs).toBe(0);
      expect(clipped.durationMs).toBe(1000);
      expect(clipped.keyframes.every(key => !key.spatial)).toBe(true);
      const times = Array.from({ length: 2001 }, (_, i) => i / 2);
      for (const time of [...times, ...times.filter((_, i) => i % 7 === 0).reverse()]) {
        const original = spatialCubicPoint(applySegmentEasing(easing, (time + 200) / 1600),
          { x: 0, y: 0 }, { x: 100, y: 200 }, { x: 400, y: 250 }, { x: 500, y: 300 }, 150, { c1z: 40, c2z: 100 });
        const actual = sample(clipped.keyframes, time / 1000);
        expect(Math.hypot(actual.x - original.x, actual.y - original.y)).toBeLessThan(.001);
      }
    }
  });

  it("retains hold jumps and constant spatial segments", () => {
    const keys: Keyframe[] = [{ offset: 0, value: { x: 10, y: 20 }, easing: { type: "hold" }, spatial: { out: { x: 100, y: 0 }, in: { x: -100, y: 0 } } },
      { offset: .5, value: { x: 40, y: 50 }, spatial: { out: { x: 0, y: 0 }, in: { x: 0, y: 0 } } }, { offset: 1, value: { x: 40, y: 50 } }];
    const clipped = clipSpatialKeyframes(-500, 2000, keys, 1000)!;
    expect(sample(clipped.keyframes, .499)).toEqual({ x: 10, y: 20 });
    expect(sample(clipped.keyframes, .5)).toEqual({ x: 40, y: 50 });
    expect(sample(clipped.keyframes, 1)).toEqual({ x: 40, y: 50 });
  });

  it("does not invert overshooting temporal curves as monotonic progress", () => {
    const keys: Keyframe[] = [{ offset: 0, value: { x: 0, y: 0 }, easing: { type: "cubic", x1: .2, y1: 2, x2: .8, y2: -1 },
      spatial: { out: { x: 100, y: 0 }, in: { x: -100, y: 0 } } }, { offset: 1, value: { x: 500, y: 0 } }];
    expect(clipSpatialKeyframes(-200, 1600, keys, 1000)).toBeUndefined();
  });
});
