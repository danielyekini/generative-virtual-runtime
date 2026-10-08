import { describe, expect, it } from "vitest";
import { applySegmentEasing, type Keyframe, type SegmentEasing } from "@gvr/schema";
import { clipKeyframes } from "./clip-keyframes";

function value(keys: Keyframe[], u: number): number {
  if (u >= 1) return keys.at(-1)!.value as number;
  const index = keys.findIndex((key, i) => i < keys.length - 1 && u < keys[i + 1]!.offset);
  const a = keys[index]!, b = keys[index + 1]!;
  return (a.value as number) + ((b.value as number) - (a.value as number)) * applySegmentEasing(a.easing, (u - a.offset) / (b.offset - a.offset));
}

describe("composition-window easing clipping", () => {
  it("preserves source cubic values at both cuts and throughout the retained window", () => {
    const easing: SegmentEasing = { type: "cubic", x1: .333, y1: 0, x2: .667, y2: 1 };
    const clipped = clipKeyframes(-400, 1600, [{ offset: 0, value: -20, easing }, { offset: 1, value: 180 }], 1000)!;
    expect(clipped.startMs).toBe(0);
    expect(clipped.durationMs).toBe(1000);
    for (let time = 0; time <= 1000; time += 5) expect(value(clipped.keyframes, time / 1000)).toBeCloseTo(-20 + 200 * applySegmentEasing(easing, (time + 400) / 1600), 4);
  });

  it("retains overshoot excursions and named piecewise easing", () => {
    for (const easing of [{ type: "cubic", x1: .2, y1: 2, x2: .8, y2: -1 }, "easeIn", "easeOut", "easeInOut"] as SegmentEasing[]) {
      const clipped = clipKeyframes(-250, 1500, [{ offset: 0, value: 0, easing }, { offset: 1, value: 1 }], 1000)!;
      for (let time = 0; time <= 1000; time += 5) expect(value(clipped.keyframes, time / 1000)).toBeCloseTo(applySegmentEasing(easing, (time + 250) / 1500), 5);
    }
  });

  it("keeps hold jumps at retained key boundaries and at the window end", () => {
    const clipped = clipKeyframes(-500, 2000, [{ offset: 0, value: 10, easing: { type: "hold" } }, { offset: .5, value: 20, easing: { type: "hold" } }, { offset: 1, value: 30 }], 1000)!;
    expect(value(clipped.keyframes, .499)).toBe(10);
    expect(value(clipped.keyframes, .5)).toBe(20);
    expect(value(clipped.keyframes, 1)).toBe(20);
  });

  it("clips path control points and vectors with the source cubic progress", () => {
    const easing: SegmentEasing = { type: "cubic", x1: .333, y1: 0, x2: .667, y2: 1 };
    const progress = applySegmentEasing(easing, .25);
    const path = clipKeyframes(-250, 1000, [{ offset: 0, value: [{ cmd: "M", x: 0, y: 20 }, { cmd: "C", c1x: 0, c1y: 0, c2x: 0, c2y: 0, x: 0, y: 0 }], easing }, { offset: 1, value: [{ cmd: "M", x: 100, y: 40 }, { cmd: "C", c1x: 200, c1y: 100, c2x: 300, c2y: 100, x: 100, y: 40 }] }], 500)!;
    expect((path.keyframes[0]!.value as any)[0].x).toBeCloseTo(100 * progress, 6);
    expect((path.keyframes[0]!.value as any)[1].c2x).toBeCloseTo(300 * progress, 6);
    const vector = clipKeyframes(-250, 1000, [{ offset: 0, value: { x: 0, y: 20 }, easing }, { offset: 1, value: { x: 100, y: 40 } }], 500)!;
    expect((vector.keyframes[0]!.value as any).y).toBeCloseTo(20 + 20 * progress, 6);
  });
});
