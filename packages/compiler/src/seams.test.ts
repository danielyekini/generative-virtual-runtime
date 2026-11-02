import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "fold" {version "0.2"; viewport (400,300); background #ffffff; duration 1s;};`;
const nodes = `rectangle base { size (100, 80); fill #3366ff; };
rectangle flap { position (100, 0); size (60, 80); fill #ff6633; };
circle Dot { position (200, 150); radius 20; fill #3366ff; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

const layerSource = `spatialLayer fold {
  camera { projection perspective; };
  surface base { };
  surface flap { parent base; hinge (100, 0) (100, 80) -0.6; };
  seams {
    split false;
    epsilon 0.01;
    maxFragments 12;
    edge base flap;
  };
};`;

describe("spatialLayer seams (MotionScript 0.15.0 space.planarSeams)", () => {
  it("lowers a seams block into Scene IR and adds both capabilities", () => {
    const result = compile(layerSource);
    expect(result.diagnostics).toEqual([]);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toEqual(expect.arrayContaining(["space.planar25d", "space.planarSeams"]));
    expect(scene.spatialLayers![0]!.seams).toEqual({ split: false, edgeEpsilon: 0.01, maxFragments: 12, edges: [{ a: "base", b: "flap" }] });
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["space.planar25d", "space.planarSeams"] }).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["space.planar25d"] }).ok).toBe(false);

    const empty = compile(`spatialLayer fold { camera { projection perspective; }; surface base { }; seams { }; };`);
    expect(empty.diagnostics).toEqual([]);
    expect(empty.scene!.spatialLayers![0]!.seams).toEqual({});
    expect(empty.scene!.requiredCapabilities).toContain("space.planarSeams");

    const without = compile(`spatialLayer fold { camera { projection perspective; }; surface base { }; };`);
    expect(without.scene!.requiredCapabilities).not.toContain("space.planarSeams");
    expect(without.scene!.spatialLayers![0]!.seams).toBeUndefined();
  });

  it("rejects seams without the capability and enforces validation bounds", () => {
    const scene = compile(layerSource).scene!;
    const missing = validateSceneIR({ ...scene, requiredCapabilities: ["space.planar25d"] });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("space.planarSeams"))).toBe(true);

    const layer = scene.spatialLayers![0]!;
    const withSeams = (seams: unknown) => validateSceneIR({ ...scene, spatialLayers: [{ ...layer, seams }] } as SceneIR).ok;
    expect(withSeams({})).toBe(true);
    expect(withSeams({ split: true, edgeEpsilon: 0.5, maxFragments: 0 })).toBe(true);
    expect(withSeams({ maxFragments: 1024 })).toBe(true);
    expect(withSeams("on")).toBe(false);
    expect(withSeams({ extra: 1 })).toBe(false);
    expect(withSeams({ split: "yes" })).toBe(false);
    expect(withSeams({ edgeEpsilon: 0 })).toBe(false);
    expect(withSeams({ edgeEpsilon: Number.NaN })).toBe(false);
    expect(withSeams({ maxFragments: 1025 })).toBe(false);
    expect(withSeams({ maxFragments: 2.5 })).toBe(false);
    expect(withSeams({ maxFragments: -1 })).toBe(false);
    expect(withSeams({ edges: "base flap" })).toBe(false);
    expect(withSeams({ edges: [{ a: "base", b: "Dot" }] })).toBe(false);
    expect(withSeams({ edges: [{ a: "base", b: "base" }] })).toBe(false);
    expect(withSeams({ edges: [{ a: "base", b: "flap", c: 1 }] })).toBe(false);
    expect(withSeams({ edges: [{ a: "base", b: "flap" }, { a: "flap", b: "base" }] })).toBe(false);
  });

  it("reports compile diagnostics for malformed seams blocks", () => {
    const layer = (seams: string) =>
      compile(`spatialLayer fold { camera { projection perspective; }; surface base { }; surface flap { }; ${seams} };`);
    expect(layer(`seams { edge base Missing; };`).diagnostics.map((item) => item.code)).toContain("UNKNOWN_TARGET");
    expect(layer(`seams { edge base Dot; };`).ok).toBe(false);
    expect(layer(`seams { edge base; };`).ok).toBe(false);
    expect(layer(`seams { split maybe; };`).ok).toBe(false);
    expect(layer(`seams { epsilon wide; };`).ok).toBe(false);
    expect(layer(`seams { epsilon 0; };`).ok).toBe(false);
    expect(layer(`seams { maxFragments 4096; };`).ok).toBe(false);
    expect(layer(`seams { bogus 1; };`).ok).toBe(false);
    expect(layer(`seams { }; seams { };`).ok).toBe(false);
    expect(layer(`seams split;`).ok).toBe(false);
  });

  it("keeps older identifiers spelled like seams body words compiling", () => {
    const result = compile(`circle seams { position (10, 10); radius 4; fill #000000; };
      circle edge { radius 2; fill #000000; }; circle split { radius 2; fill #000000; };
      circle epsilon { radius 2; fill #000000; }; circle maxFragments { radius 2; fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("space.planarSeams");
  });
});
