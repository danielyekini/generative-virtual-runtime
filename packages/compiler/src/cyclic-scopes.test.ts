import { describe, expect, it } from "vitest";
import { validateSceneIR } from "@gvr/schema";
import { compileMotionScript, lintStreamingAuthorship } from "./index";

/**
 * MotionScript 0.24.0 timing.cyclicScopes (E043, decision
 * docs/decisions/engine/time-composition.md): `period` / `repeat` on `timing`
 * and `timing` on steps.
 */

const header = `scene "cycles" {version "0.2"; viewport (400,300); background #ffffff; duration 6s;};`;
const nodes = `rectangle Box { size (10, 10); fill #000000; };`;

function compile(body: string, prelude = nodes) {
  return compileMotionScript(`${header}\n${prelude}\n${body}\ncomplete;`);
}

function messages(result: ReturnType<typeof compile>): string[] {
  return result.diagnostics.map((item) => `${item.code}: ${item.message}`);
}

describe("cyclic timing scopes (MotionScript 0.24.0 timing.cyclicScopes)", () => {
  it("lowers period and repeat onto Scene IR timing scopes and requires the capability", () => {
    const result = compile(`timing loop { offset 1s; period 2s; };
timing blink { period 250ms; repeat 3; };
keyframes Box.position.x { timing loop; at 0s 0; at 2s 100; };
step Box.visible { at 0ms; value false; timing blink; };
step Box.visible { at 125ms; value true; timing blink; };`);
    expect(messages(result)).toEqual([]);
    expect(result.scene!.timingScopes).toEqual([
      { id: "loop", parentId: null, offsetMs: 1_000, stretch: 1, periodMs: 2_000 },
      { id: "blink", parentId: null, offsetMs: 0, stretch: 1, periodMs: 250, repeat: 3 },
    ]);
    expect(result.scene!.requiredCapabilities).toEqual(["timing.localScopes", "timing.cyclicScopes"]);
    expect(result.scene!.timeline.steps.map((step) => step.timingScopeId)).toEqual(["blink", "blink"]);
    expect(validateSceneIR(result.scene).ok).toBe(true);
  });

  it("does not reserve period or repeat, and adds nothing to programs without a period", () => {
    const result = compile(
      `timing late { offset 1s; };
animate period.position.x { timing late; from 0; to 10; duration 1s; };`,
      `rectangle period { size (10, 10); fill #000000; };
rectangle repeat { size (10, 10); fill #000000; };`,
    );
    expect(messages(result)).toEqual([]);
    expect(result.scene!.requiredCapabilities).toEqual(["timing.localScopes"]);
    expect(result.scene!.timingScopes?.[0]).toEqual({ id: "late", parentId: null, offsetMs: 1_000, stretch: 1 });
  });

  it("rejects a repeat without a period and repeat counts outside 1..10000", () => {
    for (const body of [
      "timing t { repeat 2; };",
      "timing t { period 0s; };",
      "timing t { period 1s; repeat 0; };",
      "timing t { period 1s; repeat 2.5; };",
      "timing t { period 1s; repeat 10001; };",
    ]) {
      expect(messages(compile(body)).some((message) => message.startsWith("INVALID_TIMING"))).toBe(true);
    }
  });

  it("keeps cyclic tracks and steps inside one period", () => {
    expect(messages(compile(`timing loop { period 1s; };
keyframes Box.position.x { timing loop; at 0s 0; at 1.5s 10; };`))).toEqual([
      expect.stringContaining("must lie inside one period"),
    ]);
    expect(messages(compile(`timing loop { period 1s; };
step Box.visible { at 2s; value false; timing loop; };`))).toEqual([expect.stringContaining("inside one period")]);
  });

  it("rejects steps in an affine-only scope and writers that share a cyclic channel", () => {
    expect(messages(compile(`timing late { offset 1s; };
step Box.visible { at 0s; value false; timing late; };`))).toEqual([expect.stringContaining("has a period")]);
    const shared = compile(`timing loop { period 2s; };
keyframes Box.position.x { timing loop; at 0s 0; at 1s 10; };
animate Box.position.x { from 0; to 5; start 3s; duration 1s; };`);
    expect(shared.ok).toBe(false);
    expect(messages(shared).some((message) => message.startsWith("OVERLAPPING_WRITERS"))).toBe(true);
  });

  it("requires every writer of an unbounded cycle before the first seal, and the stream linter reports it", () => {
    const source = `${header}
${nodes}
timing loop { period 2s; };
keyframes Box.position.x { timing loop; at 0s 0; at 2s 100; };
seal 1s;
keyframes Box.position.y { timing loop; at 1.5s 0; at 2s 10; };
complete;`;
    const result = compileMotionScript(source);
    expect(messages(result)).toEqual([expect.stringContaining("joins cyclic scope loop after the seal")]);
    const lint = lintStreamingAuthorship(source);
    expect(lint.findings.some((finding) => finding.code === "SEALED_HISTORY_WRITE" && finding.message.includes("cyclic scope loop"))).toBe(true);
  });

  it("admits a finite repetition's writers until the seal reaches the repetition's entry", () => {
    const before = compile(`timing later { offset 3s; period 500ms; repeat 2; };
seal 2s;
step Box.visible { at 0ms; value false; timing later; };`);
    expect(messages(before)).toEqual([]);
    const after = compile(`timing later { offset 3s; period 500ms; repeat 2; };
seal 3.5s;
step Box.visible { at 400ms; value false; timing later; };`);
    expect(messages(after)).toEqual([expect.stringContaining("joins cyclic scope later after the seal")]);
  });
});
