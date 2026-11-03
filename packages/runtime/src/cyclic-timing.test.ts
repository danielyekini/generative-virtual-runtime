import { describe, expect, it } from "vitest";
import {
  cyclicLocalTimeMs,
  parseExpression,
  secondsKeysToTrack,
  transformPoint,
  type CyclicTimingScope,
  type NodeDefinition,
  type SceneIR,
  type SegmentEasing,
  type TrackDefinition,
  type TrackFill,
} from "@gvr/schema";
import { AnimationRuntime } from "./runtime";

/**
 * E014 prototype evidence through the production sampler. Cyclic scopes are
 * not on the wire yet, so the prototype maps root time to cycle-local time
 * with `cyclicLocalTimeMs` and asks the real runtime for that local instant.
 */

const forwards: TrackFill = { before: "none", after: "forwards" };
const none: TrackFill = { before: "none", after: "none" };

function bare(tracks: TrackDefinition[], durationMs = 30_000): SceneIR {
  return {
    irVersion: "0.1",
    sceneId: "e014",
    viewport: { width: 1280, height: 720, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks, steps: [] },
    nodes: [box()],
  };
}

function box(): NodeDefinition {
  return {
    id: "box",
    name: "box",
    parentId: null,
    space: "world",
    kind: "rectangle",
    zIndex: 0,
    transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    size: { x: 10, y: 10 },
    fill: { type: "solid", r: 1, g: 0, b: 0, a: 1 },
  };
}

function at(runtime: AnimationRuntime, timeMs: number): { x: number; y: number } {
  const item = runtime.evaluate(timeMs).drawItems.find((entry) => entry.nodeId === "box");
  if (!item) throw new Error("missing box");
  return transformPoint(item.logicalMatrix, 0, 0);
}

function timedTrack(
  id: string,
  channel: "transform.position.x" | "transform.position.y",
  keys: { s: number; v: number; ease?: SegmentEasing }[],
  fill = forwards,
): TrackDefinition {
  const converted = secondsKeysToTrack(keys.map((key) => ({ atMs: key.s * 1000, value: key.v, easing: key.ease })));
  if (!converted.ok) throw new Error("bad keys");
  return {
    id,
    kind: "keyframe",
    target: { kind: "node", nodeId: "box", channel },
    valueType: "number",
    startMs: converted.startMs,
    durationMs: converted.durationMs,
    fill,
    keyframes: converted.keyframes.map((key) => ({
      offset: key.offset,
      value: key.value,
      ...(key.easing ? { easing: key.easing as SegmentEasing } : {}),
    })),
  };
}

// The City Comes Around (fixtures/motionscript/stories/the-city-comes-around.ms:1597):
// the van's X route as one 30s cycle written as clamp ramps over `t % 30`.
const CITY_VAN_X =
  "-758 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";

describe("E014 cyclic timing through the production sampler", () => {
  it("reproduces City's 442-character van expression with nine timed keys in a 30s cycle", () => {
    const parsed = parseExpression(CITY_VAN_X);
    if (!parsed.ok) throw new Error("expression did not parse");
    const expressionScene = bare([
      {
        id: "van-expr",
        kind: "expression",
        target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
        valueType: "number",
        startMs: 0,
        durationMs: 30_000,
        fill: forwards,
        source: CITY_VAN_X,
        ast: parsed.ast,
      },
    ]);
    // Same route as eased keys. easeOut is c(2 - c); easeIn is c².
    const keyed = bare([
      timedTrack("van-keys", "transform.position.x", [
        { s: 0, v: -758 },
        { s: 4.4, v: -804 },
        { s: 5.3, v: -865, ease: "easeOut" },
        { s: 7.0, v: -725 },
        { s: 19.6, v: -725, ease: "easeIn" },
        { s: 21.8, v: -470 },
        { s: 23, v: -337 },
        { s: 27, v: -732 },
        { s: 30, v: -758 },
      ]),
    ]);
    const loop: CyclicTimingScope[] = [{ id: "van", parentId: null, offsetMs: 0, stretch: 1, periodMs: 30_000 }];
    const expr = new AnimationRuntime(expressionScene);
    const keys = new AnimationRuntime(keyed);
    let worst = 0;
    for (let ms = 0; ms < 30_000; ms += 50) {
      const local = cyclicLocalTimeMs(loop, "van", ms)!;
      worst = Math.max(worst, Math.abs(at(expr, ms).x - at(keys, local).x));
    }
    // The story rounded 1/4.4, 1/2.2 and friends to four digits. The largest
    // consequence is the easeIn ramp: 255 * (1 - (0.4545 * 2.2)^2) = 0.0510.
    const roundingBound = 255 * (1 - (0.4545 * 2.2) ** 2);
    expect(worst).toBeLessThanOrEqual(roundingBound + 1e-6);
    expect(worst).toBeGreaterThan(0);
    // The cycle repeats exactly past the scene seam and in later cycles.
    for (const ms of [0, 6_100, 20_700, 29_950]) {
      const first = at(keys, cyclicLocalTimeMs(loop, "van", ms)!).x;
      expect(at(keys, cyclicLocalTimeMs(loop, "van", ms + 30_000)!).x).toBe(first);
      expect(at(keys, cyclicLocalTimeMs(loop, "van", ms + 90_000)!).x).toBe(first);
    }
  });

  it("lets a phased cycle carry Circle's fall across the 30s seam as one eased segment", () => {
    // A Circle in Motion split the fall (28s → 30s ≡ 0s → 1.5s) into two segments
    // and hand-derived the second cubic. With the cycle phased to start the fall at
    // local 0, it is one easeIn segment whose middle happens to be the scene seam.
    const scene = bare([
      timedTrack("fall", "transform.position.y", [
        { s: 0, v: 0, ease: "easeIn" },
        { s: 3.5, v: 490 },
        { s: 30, v: 0 },
      ]),
    ]);
    const runtime = new AnimationRuntime(scene);
    const loop: CyclicTimingScope[] = [{ id: "fall", parentId: null, offsetMs: 28_000, stretch: 1, periodMs: 30_000 }];
    const y = (root: number) => at(runtime, cyclicLocalTimeMs(loop, "fall", root)!).y;
    expect(y(0)).toBe(y(30_000));
    expect(y(28_000)).toBe(0);
    // Local 2s of a 3.5s easeIn from 0 to 490: 490 * (2 / 3.5)².
    expect(y(30_000)).toBeCloseTo(490 * (2 / 3.5) ** 2, 9);
    // Velocity is continuous across the seam: backward and forward differences agree.
    const h = 10;
    const before = (y(30_000) - y(30_000 - h)) / h;
    const after = (y(h) - y(0)) / h;
    expect(Math.abs(after - before) / before).toBeLessThan(0.01);
  });
});

describe("E014 gaps and holds between touching tracks (existing rule, now pinned)", () => {
  it("starts the later track at a shared boundary and holds only fill-forwards writers in a gap", () => {
    const scene = bare(
      [
        timedTrack("x-a", "transform.position.x", [{ s: 0, v: 0 }, { s: 1, v: 100 }]),
        timedTrack("x-b", "transform.position.x", [{ s: 1, v: 200 }, { s: 1.5, v: 250 }]),
        timedTrack("x-c", "transform.position.x", [{ s: 3, v: 400 }, { s: 4, v: 500 }]),
        timedTrack("y-a", "transform.position.y", [{ s: 0, v: 0 }, { s: 1, v: 100 }], none),
        timedTrack("y-b", "transform.position.y", [{ s: 3, v: 300 }, { s: 4, v: 400 }], none),
      ],
      5_000,
    );
    const runtime = new AnimationRuntime(scene);
    // Touching tracks: the later start owns the shared instant (half-open intervals).
    expect(at(runtime, 1_000).x).toBe(200);
    expect(at(runtime, 999.999).x).toBeCloseTo(100, 2);
    // Gap with fill forwards: the latest-ended writer's last key holds.
    expect(at(runtime, 2_000).x).toBe(250);
    // Gap with fill none: the authored base value, not the earlier track's end.
    expect(at(runtime, 2_000).y).toBe(0);
    // Before any writer starts there is no backwards fill: base value.
    expect(at(runtime, 4_500).y).toBe(0);
    expect(at(runtime, 4_500).x).toBe(500);
  });
});
