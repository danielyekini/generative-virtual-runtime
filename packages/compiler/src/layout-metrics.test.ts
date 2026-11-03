import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "labels" {version "0.2"; viewport (400,300); background #0b1220; duration 1s;`;

function compile(body: string, requires = false) {
  const sceneHeader = requires ? `${header} requires "text.layoutMetrics";};` : `${header}};`;
  return compileMotionScript(`${sceneHeader}\n${body}\ncomplete;`);
}

describe("text layout metrics (MotionScript 0.20.0 text.layoutMetrics)", () => {
  it("accepts requires text.layoutMetrics and leaves other text programs unchanged", () => {
    const measured = compile(`text Title {
  content "GO";
  fontSize 48;
  align center;
  baseline middle;
  fill #f8fafc;
};`, true);
    expect(measured.diagnostics).toEqual([]);
    expect(measured.ok).toBe(true);
    expect(measured.scene!.requiredCapabilities).toContain("text.layoutMetrics");
    expect(validateSceneIR(measured.scene!).ok).toBe(true);
    const title = measured.scene!.nodes.find((node) => node.id === "Title");
    expect(title?.kind).toBe("text");

    const plain = compile(`text Title {
  content "GO";
  fontSize 48;
  align center;
  fill #f8fafc;
};`);
    expect(plain.diagnostics).toEqual([]);
    expect(plain.scene!.requiredCapabilities ?? []).not.toContain("text.layoutMetrics");
  });

  it("is rejected by acceptScene unless text.layoutMetrics is enabled", () => {
    const result = compile(`text Title { content "GO"; fontSize 32; fill #ffffff; };`, true);
    const scene = result.scene!;
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["text.layoutMetrics"] }).ok).toBe(true);
  });
});
