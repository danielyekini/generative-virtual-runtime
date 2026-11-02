import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "panel" {version "0.2"; viewport (400,300); background #ffffff; duration 2s;};`;
const nodes = `group Panel { position (40, 40); rectangle Button { size (100, 40); fill #3366ff; }; };
circle Knob { position (200, 150); radius 12; fill #ff8800; };
rectangle Glass { size (30, 40); fill #ffffff; opacity 0.3; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

describe("interact declarations (MotionScript 0.10.0 input.bindings)", () => {
  it("lowers targets and every bounded action into Scene IR interactions", () => {
    const result = compile(`interact Knob {
      focusable true; tabIndex 2;
      on drag dragTranslate (20, 20) (380, 280);
      on wheel step scale.x 0.25 0.5 2;
      on key "ArrowRight" step position.x 10 20 380;
    };
    interact Panel { focusable true; on click toggle Glass.opacity 0.3 0.9; on activate set Panel.Button.rotation 0; };
    interact Glass { pointer none; };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("input.bindings");
    expect(scene.interactions).toEqual([
      {
        nodeId: "Knob",
        focusable: true,
        tabIndex: 2,
        bindings: [
          { on: "drag", action: { kind: "dragTranslate", min: { x: 20, y: 20 }, max: { x: 380, y: 280 } } },
          { on: "wheel", action: { kind: "step", channel: "transform.scale.x", delta: 0.25, min: 0.5, max: 2 } },
          { on: "key", key: "ArrowRight", action: { kind: "step", channel: "transform.position.x", delta: 10, min: 20, max: 380 } },
        ],
      },
      {
        nodeId: "Panel",
        focusable: true,
        bindings: [
          { on: "click", nodeId: "Glass", action: { kind: "toggle", channel: "opacity", values: [0.3, 0.9] } },
          { on: "activate", nodeId: "Panel.Button", action: { kind: "set", channel: "transform.rotation", value: 0 } },
        ],
      },
      { nodeId: "Glass", pointer: "none" },
    ]);
    expect(validateSceneIR(scene).ok).toBe(true);
    // The streamed header carries the same list.
    const creates = result.deltas.flatMap((delta) => delta.operations).filter((op) => op.op === "CREATE_SCENE");
    const last = creates[creates.length - 1];
    expect(last && last.op === "CREATE_SCENE" ? last.scene.interactions : undefined).toEqual(scene.interactions);
  });

  it("keeps older words usable as identifiers and declares interactions only under the capability", () => {
    const result = compileMotionScript(`${header}
      circle click { radius 4; fill #000000; };
      circle drag { position (20, 20); radius 4; fill #000000; };
      interact click { on click set drag.opacity 0.5; };
      complete;`);
    expect(result.ok).toBe(true);
    expect(result.scene!.interactions?.[0]?.bindings?.[0]).toEqual({
      on: "click",
      nodeId: "drag",
      action: { kind: "set", channel: "opacity", value: 0.5 },
    });
    const plain = compile("");
    expect(plain.scene!.interactions).toBeUndefined();
    expect(plain.scene!.requiredCapabilities ?? []).not.toContain("input.bindings");
    expect(acceptScene(result.scene!, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(result.scene!, { consumer: "0.2", enabled: ["input.bindings"] }).ok).toBe(true);
  });

  it("defers a forward target until the node exists and reports unresolved targets", () => {
    const forward = compileMotionScript(`${header}
      interact Late { on click set opacity 0.5; };
      circle Late { radius 4; fill #000000; };
      complete;`);
    expect(forward.ok).toBe(true);
    expect(forward.scene!.interactions?.[0]?.nodeId).toBe("Late");
    const missing = compile(`interact Nope { on click set opacity 0.5; };`);
    expect(missing.diagnostics.map((d) => d.code)).toContain("UNKNOWN_TARGET");
    expect(missing.scene!.interactions).toBeUndefined();
  });

  it("rejects malformed declarations with source diagnostics", () => {
    const cases = [
      `interact Knob { on hover set opacity 1; };`,
      `interact Knob { on click spin opacity 1; };`,
      `interact Knob { on click set fill.r 1; };`,
      `interact Knob { on click toggle opacity 1; };`,
      `interact Knob { on key step position.x 1 0 9; };`,
      `interact Knob { tabIndex 1.5; };`,
      `interact Knob { pointer sometimes; };`,
      `interact Knob { colour red; };`,
    ];
    for (const body of cases) {
      const result = compile(body);
      expect(result.diagnostics.length, body).toBeGreaterThan(0);
      expect(result.scene?.interactions, body).toBeUndefined();
    }
  });

  it("enforces exclusive input ownership, bounds and duplicate targets through validation", () => {
    const conflict = compile(`interact Knob { on click set opacity 0.5; };
      animate Knob.opacity { from 0; to 1; duration 1s; };`);
    expect(conflict.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    const drag = compile(`interact Knob { on drag dragTranslate (0, 0) (10, 10); };
      animate Knob.position { from (0, 0); to (10, 10); duration 1s; };`);
    expect(drag.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    const opacity = compile(`interact Knob { on click set opacity 2; };`);
    expect(opacity.diagnostics.map((d) => d.code)).toContain("INVALID_OPACITY");
    const range = compile(`interact Knob { on wheel step scale.x 1 3 2; };`);
    expect(range.diagnostics.map((d) => d.code)).toContain("INVALID_TRACK_VALUE");
    const twice = compile(`interact Knob { focusable true; }; interact Knob { focusable false; };`);
    expect(twice.diagnostics.map((d) => d.code)).toContain("DUPLICATE_ID");
    const wrongTrigger = compile(`interact Knob { on click dragTranslate (0, 0) (1, 1); };`);
    expect(wrongTrigger.diagnostics.map((d) => d.code)).toContain("INVALID_ENUM");
    // A non-conflicting channel on the same node remains animatable.
    const ok = compile(`interact Knob { on click set opacity 0.5; };
      animate Knob.rotation { from 0; to 1; duration 1s; };`);
    expect(ok.ok).toBe(true);
  });

  it("freezes interaction declarations after the first seal", () => {
    const result = compile(`seal 1s; interact Knob { focusable true; };`);
    expect(result.diagnostics.map((d) => d.message)).toContain("Base definitions are frozen after the first seal.");
    expect(result.scene!.interactions).toBeUndefined();
  });
});

function codes(input: unknown): string[] {
  const result = validateSceneIR(input);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

describe("Scene IR interactions validation", () => {
  const base = compile(`interact Knob { focusable true; on click set opacity 0.5; };`).scene!;

  it("requires the input.bindings capability token and rejects unknown shapes", () => {
    expect(codes({ ...base, requiredCapabilities: [] })).toContain("MISSING_REQUIRED");
    const extra = { ...base, interactions: [{ nodeId: "Knob", hover: true }] };
    expect(validateSceneIR(extra).ok).toBe(false);
    const badAction = { ...base, interactions: [{ nodeId: "Knob", bindings: [{ on: "click", action: { kind: "script", code: "x" } }] }] };
    expect(codes(badAction)).toContain("INVALID_ENUM");
    const keyless = { ...base, interactions: [{ nodeId: "Knob", bindings: [{ on: "key", action: { kind: "set", channel: "opacity", value: 1 } }] }] };
    expect(validateSceneIR(keyless).ok).toBe(false);
    const nonFinite = { ...base, interactions: [{ nodeId: "Knob", bindings: [{ on: "click", action: { kind: "set", channel: "opacity", value: Number.NaN } }] }] };
    expect(validateSceneIR(nonFinite).ok).toBe(false);
  });

  it("rejects interactions on a 0.1 document", () => {
    const v01 = compileMotionScript(`scene "old" {version "0.1"; viewport (100,100); background #ffffff; duration 1s;};
      circle A { radius 4; fill #000000; };
      interact A { focusable true; };
      complete;`);
    expect(v01.diagnostics.map((d) => d.code)).toContain("UNSUPPORTED_IR_VERSION");
  });
});
