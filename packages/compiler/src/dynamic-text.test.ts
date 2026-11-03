import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "dynamic-text" {version "0.2"; viewport (400,300); background #0b1220; duration 3s;};`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${body}\ncomplete;`);
}

describe("dynamic text (MotionScript 0.18.0 text.dynamicContent)", () => {
  it("lowers numeric format bindings and gates text.dynamicContent", () => {
    const result = compile(`text Price {
  content "0.00";
  fontSize 24;
  fill #22c55e;
  number 42.5;
  fractionDigits 2;
  group ",";
  prefix "$";
};
animate Price.number { from 10; to 99.5; duration 3s; };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("text.dynamicContent");
    const price = scene.nodes.find((node) => node.id === "Price");
    expect(price?.kind).toBe("text");
    if (price?.kind === "text") {
      expect(price.numeric).toEqual({
        value: 42.5,
        format: { fractionDigits: 2, group: ",", prefix: "$" },
      });
    }
    expect(scene.timeline.tracks[0]).toMatchObject({
      target: { kind: "node", nodeId: "Price", channel: "text.number" },
    });
    expect(validateSceneIR(scene).ok).toBe(true);
  });

  it("is rejected by acceptScene unless text.dynamicContent is enabled", () => {
    const result = compile(`text Price {
  content "0";
  fontSize 18;
  fill #ffffff;
  number 7;
};`);
    const scene = result.scene!;
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["text.dynamicContent"] }).ok).toBe(true);
    const missing = validateSceneIR({ ...scene, requiredCapabilities: [] } as SceneIR);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.diagnostics.some((item) => item.message.includes("text.dynamicContent"))).toBe(true);
    }
  });

  it("lowers discrete content steps and rejects them on numeric nodes", () => {
    const steps = compile(`text Status {
  content "Ready";
  fontSize 18;
  fill #f8fafc;
};
step Status.content { at 1s; value "Set"; };
step Status.content { at 2s; value "Go"; };`);
    expect(steps.diagnostics).toEqual([]);
    expect(steps.scene!.requiredCapabilities).toContain("text.dynamicContent");
    expect(steps.scene!.timeline.steps).toEqual([
      {
        id: "step1",
        target: { kind: "node", nodeId: "Status", channel: "content" },
        timeMs: 1000,
        value: "Set",
      },
      {
        id: "step2",
        target: { kind: "node", nodeId: "Status", channel: "content" },
        timeMs: 2000,
        value: "Go",
      },
    ]);

    const conflict = compile(`text Price {
  content "0";
  fontSize 18;
  fill #ffffff;
  number 1;
};
step Price.content { at 1s; value "x"; };`);
    expect(conflict.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
  });

  it("rejects format fields without number and orphan number tracks", () => {
    const formatOnly = compile(`text Price {
  content "0";
  fontSize 18;
  fill #ffffff;
  fractionDigits 2;
};`);
    expect(formatOnly.diagnostics.map((d) => d.code)).toContain("MISSING_REQUIRED");

    const orphan = compile(`text Label {
  content "hi";
  fontSize 18;
  fill #ffffff;
};
animate Label.number { from 0; to 1; duration 1s; };`);
    expect(orphan.diagnostics.map((d) => d.code)).toContain("INVALID_TRACK_TARGET");
  });

  it("keeps visible steps working without claiming text.dynamicContent", () => {
    const result = compile(`rectangle Box {
  size (10, 10);
  fill #000000;
};
step Box.visible { at 1s; value false; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("text.dynamicContent");
    expect(result.scene!.timeline.steps[0]).toMatchObject({
      target: { channel: "visible" },
      value: false,
    });
  });
});
