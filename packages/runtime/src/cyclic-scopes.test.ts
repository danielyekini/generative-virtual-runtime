import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { transformPoint, type SceneIR, type SceneIRDelta } from "@gvr/schema";
import { AnimationRuntime } from "./runtime";
import { sampleScene } from "./sample";
import { StreamingRuntime } from "./streaming";

/**
 * timing.cyclicScopes (MotionScript 0.24.0 / Scene IR 0.23.0, E043). The E014
 * prototype evidence (packages/runtime/src/cyclic-timing.test.ts) is re-expressed
 * here as compiled MotionScript sampled by the production runtime: no host-side
 * time mapping.
 */

const box = `rectangle Box { size (10, 10); fill #000000; };`;

function compiled(body: string, durationS = 30, prelude = box): SceneIR {
  const result = compileMotionScript(
    `scene "cyclic" {version "0.2"; viewport (1280,720); background #ffffff; duration ${durationS}s;};\n${prelude}\n${body}\ncomplete;`,
  );
  expect(result.diagnostics.map((item) => `${item.code}: ${item.message}`)).toEqual([]);
  return result.scene!;
}

function pos(runtime: AnimationRuntime, timeMs: number, nodeId = "Box"): { x: number; y: number } | undefined {
  const item = runtime.evaluate(timeMs).drawItems.find((entry) => entry.nodeId === nodeId);
  return item ? transformPoint(item.logicalMatrix, 0, 0) : undefined;
}

// The City Comes Around: the van's X route as clamp ramps over `t % 30` (see
// cyclic-timing.test.ts for provenance).
const CITY_VAN_X =
  "-758 - 46 * clamp(((t % 30) - 0) * 0.2273, 0, 1) - 61 * clamp(((t % 30) - 4.4) * 1.1111, 0, 1) + 140 * clamp(((t % 30) - 5.3) * 0.5882, 0, 1) * (2 - clamp(((t % 30) - 5.3) * 0.5882, 0, 1)) + 255 * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) * clamp(((t % 30) - 19.6) * 0.4545, 0, 1) + 133 * clamp(((t % 30) - 21.8) * 0.8333, 0, 1) - 395 * clamp(((t % 30) - 23) * 0.25, 0, 1) - 26 * clamp(((t % 30) - 27) * 0.3333, 0, 1)";

describe("timing.cyclicScopes through compiled MotionScript", () => {
  it("plays City's van route as nine timed keys in a 30s period, matching the t % 30 expression", () => {
    const keyed = compiled(`timing van { period 30s; };
keyframes Box.position.x {
  timing van;
  at 0s -758;
  at 4.4s -804;
  at 5.3s -865 ease easeOut;
  at 7s -725;
  at 19.6s -725 ease easeIn;
  at 21.8s -470;
  at 23s -337;
  at 27s -732;
  at 30s -758;
};`, 60);
    expect(keyed.requiredCapabilities).toEqual(expect.arrayContaining(["timing.localScopes", "timing.cyclicScopes"]));
    expect(keyed.timingScopes).toEqual([{ id: "van", parentId: null, offsetMs: 0, stretch: 1, periodMs: 30_000 }]);
    const expression = compiled(`animate Box.position.x { start 0s; duration 30s; expression "${CITY_VAN_X}"; };`);
    const keys = new AnimationRuntime(keyed);
    const expr = new AnimationRuntime(expression);
    let worst = 0;
    for (let ms = 0; ms < 30_000; ms += 50) worst = Math.max(worst, Math.abs(pos(expr, ms)!.x - pos(keys, ms)!.x));
    // The story rounded its ramp coefficients to four digits; the easeIn ramp bounds the difference.
    expect(worst).toBeLessThanOrEqual(255 * (1 - (0.4545 * 2.2) ** 2) + 1e-6);
    // One program, no host mapping: the route repeats exactly in later cycles.
    for (const ms of [0, 6_100, 20_700, 29_950]) {
      expect(pos(keys, ms + 30_000)!.x).toBe(pos(keys, ms)!.x);
    }
  });

  it("carries Circle's fall across the 30s seam as one eased segment in a phased cycle", () => {
    const scene = compiled(`timing fall { offset 28s; period 30s; };
keyframes Box.position.y {
  timing fall;
  at 0s 0 ease easeIn;
  at 3.5s 490;
  at 30s 0;
};`);
    const runtime = new AnimationRuntime(scene);
    const y = (ms: number) => pos(runtime, ms)!.y;
    // The offset is a phase on both sides: root 0 is local 2s of the fall.
    expect(y(0)).toBeCloseTo(490 * (2 / 3.5) ** 2, 9);
    expect(y(28_000)).toBe(0);
    expect(y(29_999.999)).toBeCloseTo(y(0), 3);
    const h = 10;
    const before = (y(30_000 - 1) - y(30_000 - 1 - h)) / h;
    const after = (y(h) - y(0)) / h;
    expect(Math.abs(after - before) / before).toBeLessThan(0.02);
  });

  it("keeps a finite repeat unentered before its first cycle and pinned after its last", () => {
    const scene = compiled(`timing hop { offset 1s; period 1s; repeat 2; };
keyframes Box.position.x { timing hop; fill none; at 0s 0; at 1s 100; };`, 5);
    const runtime = new AnimationRuntime(scene);
    // Before entry the track is inactive: the authored base (0) applies, not a wrapped cycle.
    expect(pos(runtime, 500)!.x).toBe(0);
    expect(pos(runtime, 1_250)!.x).toBeCloseTo(25, 9);
    expect(pos(runtime, 2_250)!.x).toBeCloseTo(25, 9);
    // Afterwards local time is pinned at the period: fill none returns to base.
    expect(pos(runtime, 3_500)!.x).toBe(0);
  });

  it("blinks the Studio test frame four times, carrying step state between cycles", () => {
    const source = readFileSync(resolve(__dirname, "../../../fixtures/motionscript/frames/cyclic-scopes.ms"), "utf8");
    const result = compileMotionScript(source);
    expect(result.ok).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const lamp = (ms: number) => pos(runtime, ms, "Lamp") !== undefined;
    expect([500, 1_000, 1_249, 1_250, 1_500, 2_900, 3_000, 4_000].map(lamp)).toEqual([
      false, true, true, false, true, false, false, false,
    ]);
    // Lead is phased by 1s: it starts at the far end of the same swing Trail starts at the near end.
    expect(pos(runtime, 0, "Lead")!.x).toBeCloseTo(520, 9);
    expect(pos(runtime, 0, "Trail")!.x).toBeCloseTo(120, 9);
    expect(pos(runtime, 4_000, "Lead")!.x).toBe(pos(runtime, 0, "Lead")!.x);
  });

  it("carries the final step of an unbounded cycle into the next cycle before its first step", () => {
    const scene = compiled(`timing sign { period 4s; };
text Sign { content "Open"; fontSize 20; fill #000000; };
step Sign.content { at 1s; value "Closed"; timing sign; };
step Sign.content { at 3s; value "Open"; timing sign; };`, 12, box);
    const text = (ms: number) => {
      const node = sampleScene(scene, ms).nodes.find((item) => item.id === "Sign");
      return node?.kind === "text" ? node.content : undefined;
    };
    expect([0, 1_000, 2_000, 3_000, 4_500, 5_000, 7_000].map(text)).toEqual([
      "Open", "Closed", "Closed", "Open", "Open", "Closed", "Open",
    ]);
  });

  it("samples scenes without a period exactly as timing.localScopes", () => {
    const scene = compiled(`timing late { offset 1s; stretch 2; };
keyframes Box.position.x { timing late; fill forwards; at 0s 0; at 1s 100; };`, 5);
    expect(scene.requiredCapabilities).not.toContain("timing.cyclicScopes");
    const runtime = new AnimationRuntime(scene);
    expect(pos(runtime, 2_000)!.x).toBeCloseTo(50, 9);
    expect(pos(runtime, 4_000)!.x).toBe(100);
  });
});

describe("timing.cyclicScopes streaming admission", () => {
  const program = `scene "s" {version "0.2"; viewport (400,300); background #ffffff; duration 6s;};
${box}
timing loop { period 2s; };
timing once { offset 3s; period 1s; repeat 2; };
keyframes Box.position.x { timing loop; at 0s 0; at 2s 100; };
seal 1s;
complete;`;

  function sealedRuntime(): { streaming: StreamingRuntime; last: SceneIRDelta } {
    const result = compileMotionScript(program);
    expect(result.ok).toBe(true);
    const streaming = new StreamingRuntime();
    const open = result.deltas.filter((delta) => !delta.operations.some((op) => op.op === "COMPLETE_PROGRAM"));
    for (const delta of open) {
      streaming.enqueue(delta);
      for (const outcome of streaming.flushCommands()) expect(outcome.ok).toBe(true);
    }
    expect(streaming.sealedThroughMs).toBe(1_000);
    return { streaming, last: open[open.length - 1]! };
  }

  function late(last: SceneIRDelta, operations: SceneIRDelta["operations"]): SceneIRDelta {
    return { ...last, unitId: last.unitId + 1, expectedRevision: last.nextRevision, nextRevision: last.nextRevision + 1, operations };
  }

  it("rejects a writer joining an unbounded cycle after the first seal, even at a later local time", () => {
    const { streaming, last } = sealedRuntime();
    const track = {
      id: "lateY",
      kind: "keyframe" as const,
      target: { kind: "node" as const, nodeId: "Box", channel: "transform.position.y" as const },
      valueType: "number" as const,
      startMs: 1_500,
      durationMs: 500,
      fill: { before: "none" as const, after: "forwards" as const },
      keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 10 }],
      timingScopeId: "loop",
    };
    streaming.enqueue(late(last, [{ op: "ADD_TRACKS", tracks: [track] }]));
    expect(streaming.rejectedDiagnostics.some((item) => item.message.includes("cyclic scope loop"))).toBe(true);
  });

  it("admits a finite repetition's writer until the seal reaches its entry", () => {
    const { streaming, last } = sealedRuntime();
    const step = { id: "blink", target: { kind: "node" as const, nodeId: "Box", channel: "visible" as const }, timeMs: 0, value: false, timingScopeId: "once" };
    streaming.enqueue(late(last, [{ op: "ADD_STEPS", steps: [step] }]));
    expect(streaming.rejectedDiagnostics).toEqual([]);
    for (const outcome of streaming.flushCommands()) expect(outcome.ok).toBe(true);
    expect(streaming.scene?.timeline.steps.some((item) => item.timingScopeId === "once")).toBe(true);
  });
});
