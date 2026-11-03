import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSceneIR } from "@gvr/schema";
import { compileIncrementally, compileMotionScript, fragmentSource } from "./index";

/**
 * MotionScript 0.23.0 timing.timedKeys (E044, decision
 * docs/decisions/engine/time-composition.md). Timed keys and named beats are
 * MotionScript-only lowerings onto the existing Scene IR track offsets.
 */

const header = `scene "beats" {version "0.2"; viewport (400,300); background #ffffff; duration 6s;};`;
const nodes = `rectangle Box { size (10, 10); fill #000000; };`;

function compile(body: string, prelude = nodes) {
  return compileMotionScript(`${header}\n${prelude}\n${body}\ncomplete;`);
}

function messages(result: ReturnType<typeof compile>): string[] {
  return result.diagnostics.map((item) => `${item.code}: ${item.message}`);
}

describe("timed keys (MotionScript 0.23.0 timing.timedKeys)", () => {
  it("lowers at-keys to start, duration and exact offsets, equal to the percentage form", () => {
    const timed = compile(`keyframes Box.position.x {
  at 1s 0 ease easeIn;
  at 2.2s 50;
  at 4s 100;
};`);
    const percent = compile(`keyframes Box.position.x {
  start 1s;
  duration 3s;
  0% 0 ease easeIn;
  40% 50;
  100% 100;
};`);
    expect(messages(timed)).toEqual([]);
    expect(messages(percent)).toEqual([]);
    const track = timed.scene!.timeline.tracks[0]!;
    expect(track).toMatchObject({ startMs: 1000, durationMs: 3000 });
    expect(track.kind === "keyframe" && track.keyframes.map((key) => key.offset)).toEqual([0, (2200 - 1000) / 3000, 1]);
    // Only the percentage literal's own rounding differs (40% vs 0.4 exactly).
    expect(timed.scene!.timeline.tracks).toEqual(percent.scene!.timeline.tracks);
    // MotionScript-only: no capability token, the Scene IR shape is unchanged.
    expect(timed.scene!.requiredCapabilities).toEqual([]);
    expect(validateSceneIR(timed.scene!).ok).toBe(true);
  });

  it("keeps per-key eases, the header ease default, spatial tangents and timing scopes", () => {
    const result = compile(`timing Local { offset 1s; };
keyframes Box.position {
  ease easeOut;
  timing Local;
  at 0s (0, 0) spatial (10, 0) (0, 0);
  at 500ms (50, 50) ease hold;
  at 1s (100, 0);
};`);
    expect(messages(result)).toEqual([]);
    const track = result.scene!.timeline.tracks[0]!;
    expect(track).toMatchObject({ startMs: 0, durationMs: 1000, timingScopeId: "Local" });
    expect(track.kind === "keyframe" && track.keyframes).toEqual([
      { offset: 0, value: { x: 0, y: 0 }, easing: "easeOut", spatial: { out: { x: 10, y: 0 }, in: { x: 0, y: 0 } } },
      { offset: 0.5, value: { x: 50, y: 50 }, easing: { type: "hold" } },
      { offset: 1, value: { x: 100, y: 0 } },
    ]);
  });

  it("rejects mixed forms, explicit start/duration, too few keys and non-increasing times", () => {
    expect(messages(compile(`keyframes Box.opacity { at 0s 0; 100% 1; };`)).join("\n")).toMatch(/percentage keys or timed \(at\) keys, not both/);
    expect(messages(compile(`keyframes Box.opacity { start 1s; at 0s 0; at 1s 1; };`)).join("\n")).toMatch(/remove start and duration/);
    expect(messages(compile(`keyframes Box.opacity { duration 1s; at 0s 0; at 1s 1; };`)).join("\n")).toMatch(/remove start and duration/);
    expect(messages(compile(`keyframes Box.opacity { at 0s 0; };`)).join("\n")).toMatch(/at least two samples/);
    expect(messages(compile(`keyframes Box.opacity { at 1s 0; at 1s 1; };`)).join("\n")).toMatch(/strictly increase/);
    expect(messages(compile(`keyframes Box.opacity { at 2s 0; at 1s 1; };`)).join("\n")).toMatch(/strictly increase/);
  });

  it("reads a signed value after a beat as the key value, not an offset", () => {
    const result = compile(`beat b at 1s;
keyframes Box.position.x { at b -5; at b + 1s 5; };`);
    expect(messages(result)).toEqual([]);
    const track = result.scene!.timeline.tracks[0]!;
    expect(track).toMatchObject({ startMs: 1000, durationMs: 1000 });
    expect(track.kind === "keyframe" && track.keyframes.map((key) => key.value)).toEqual([-5, 5]);
  });
});

describe("named beats (MotionScript 0.23.0 timing.timedKeys)", () => {
  it("resolves absolute and relative beats in start, step at, seal, timing offset, cue at and key times", () => {
    const result = compile(`beat intro at 500ms;
beat cross at intro + 1.5s;
beat back at cross - 1s;
timing Scene2 { offset cross; };
audio Chime "chime.wav" 1s;
cue Ding effects Chime at cross + 250ms;
animate Box.opacity { from 0; to 1; start intro; duration 200ms; };
keyframes Box.position.x { at back 0; at cross 10; };
step Box.visible { at cross + 2s; value false; };
seal cross;`);
    expect(messages(result)).toEqual([]);
    const scene = result.scene!;
    expect(scene.timeline.tracks.map((track) => [track.startMs, track.durationMs])).toEqual([
      [500, 200],
      [1000, 1000],
    ]);
    expect(scene.timeline.steps[0]!.timeMs).toBe(4000);
    expect(scene.timingScopes?.[0]).toMatchObject({ id: "Scene2", offsetMs: 2000 });
    expect(scene.audioCues?.[0]).toMatchObject({ id: "Ding", startMs: 2250 });
    expect(result.sealedThroughMs).toBe(6000); // complete; seals the duration after seal cross (2s)
    const seals = result.deltas
      .flatMap((delta) => delta.operations)
      .flatMap((op) => (op.op === "SEAL_TIMELINE" ? [op.horizonMs] : []));
    expect(seals[0]).toBe(2000);
  });

  it("rejects forward references even when the referencing unit waits for its node", () => {
    const result = compileMotionScript(`${header}
animate Late.opacity { from 0; to 1; start later; duration 1s; };
beat later at 1s;
rectangle Late { size (10, 10); fill #000000; };
complete;`);
    expect(messages(result).join("\n")).toMatch(/Beat later is not declared before this unit/);
    expect(result.scene!.timeline.tracks).toEqual([]);
  });

  it("rejects duplicate names, unknown bases and negative results", () => {
    expect(messages(compile(`beat a at 1s; beat a at 2s;`)).join("\n")).toMatch(/Beat a is already declared/);
    expect(messages(compile(`beat a at b + 1s;`)).join("\n")).toMatch(/refers to b, which is not declared before it/);
    expect(messages(compile(`beat a at 1s; beat b at a - 2s;`)).join("\n")).toMatch(/Beat b must resolve to a time >= 0/);
    expect(messages(compile(`beat a at 1s; animate Box.opacity { from 0; to 1; start a - 2s; duration 1s; };`)).join("\n")).toMatch(
      /negative time/,
    );
    expect(messages(compile(`beat a at 1s; keyframes Box.opacity { at a - 2s 0; at a 1; };`)).join("\n")).toMatch(/>= 0/);
  });

  it("keeps duration a length: a beat there is a clear error", () => {
    expect(messages(compile(`beat a at 1s; animate Box.opacity { from 0; to 1; duration a; };`)).join("\n")).toMatch(
      /a beat is a point in time/,
    );
  });

  it("is not a reserved word, is rejected inside a batch and in MotionScript 0.1", () => {
    const named = compile(`rectangle beat { size (4, 4); fill #ff0000; };
beat at at 1s;
animate beat.opacity { from 0; to 1; start at; duration 1s; };`);
    expect(messages(named).length).toBeGreaterThan(0); // `at` is a keyword, not a beat name
    const ok = compile(`rectangle beat { size (4, 4); fill #ff0000; };
beat go at 1s;
animate beat.opacity { from 0; to 1; start go; duration 1s; };`);
    expect(messages(ok)).toEqual([]);
    expect(ok.scene!.nodes.some((node) => node.id === "beat")).toBe(true);
    expect(messages(compile(`batch { beat a at 1s; };`)).join("\n")).toMatch(/beat cannot appear inside a batch/);
    const v01 = compileMotionScript(`scene "old" {version "0.1"; viewport (100,100); background #ffffff; duration 2s;};
rectangle Box { size (10, 10); fill #000000; };
beat a at 1s;
keyframes Box.opacity { at 0s 0; at 1s 1; };
complete;`);
    const text = messages(v01).join("\n");
    expect(text).toMatch(/MotionScript 0.1 cannot declare beats/);
    expect(text).toMatch(/MotionScript 0.1 cannot use beats or timed keys/);
  });

  it("streams identically under every fragmentation", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../../../fixtures/motionscript/timed-keys.ms"), "utf8");
    const whole = compileMotionScript(source);
    expect(messages(whole)).toEqual([]);
    for (const kind of ["characters", "lines", "blocks", "packets", "random"] as const) {
      const streamed = compileIncrementally(fragmentSource(source, kind, 5));
      expect(streamed.diagnostics).toEqual([]);
      expect(streamed.scene).toEqual(whole.scene);
      expect(streamed.sealedThroughMs).toBe(whole.sealedThroughMs);
    }
  });
});
