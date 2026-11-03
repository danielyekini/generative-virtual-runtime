import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import type { SceneIR } from "@gvr/schema";
import { AnimationRuntime } from "./runtime";
import { assessReadiness } from "./presentation";
import { sceneImageReadiness, sceneImageRequirements } from "./visual-resources";

const source = `scene "sprites" {version "0.2"; viewport (320,180); background #ffffff; duration 2s;};
image Hero { href "hero.png"; size (32, 32); position (40, 40); };
image Tile { href "tile.png"; size (16, 16); position (100, 40); };
rectangle Floor { size (320, 20); position (0, 160); fill #333333; };
complete;`;

function compiled(): SceneIR {
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  return result.scene!;
}

describe("resources.image lifecycle (E019)", () => {
  it("compiles each image to a declared ready resource and resolves its href per frame", () => {
    const scene = compiled();
    expect(scene.requiredCapabilities).toContain("resources.image");
    expect(scene.resources).toEqual([
      { id: "image1", kind: "image", href: "hero.png", readiness: "ready" },
      { id: "image2", kind: "image", href: "tile.png", readiness: "ready" },
    ]);
    const frame = new AnimationRuntime(scene).evaluate(0);
    const images = frame.drawItems.filter((item) => item.geometry.kind === "image").map((item) => item.geometry);
    expect(images).toEqual([
      { kind: "image", resourceId: "image1", href: "hero.png", size: { x: 32, y: 32 } },
      { kind: "image", resourceId: "image2", href: "tile.png", size: { x: 16, y: 16 } },
    ]);
  });

  it("requires only drawn image resources", () => {
    const scene = compiled();
    const extra: SceneIR = { ...scene, resources: [...scene.resources, { id: "unused", kind: "image", href: "unused.png", readiness: "failed" }] };
    expect(sceneImageRequirements(extra).map((entry) => entry.resourceId)).toEqual(["image1", "image2"]);
    expect(sceneImageReadiness(extra).ready).toBe(true);
  });

  it("prefers host loader states over declared readiness", () => {
    const scene = compiled();
    expect(sceneImageReadiness(scene)).toEqual({ ready: true, waitingFor: [], failed: [] });
    expect(sceneImageReadiness(scene, { image1: "pending", image2: "failed" })).toEqual({ ready: false, waitingFor: ["image1"], failed: ["image2"] });
    const declaredPending: SceneIR = { ...scene, resources: scene.resources.map((entry) => ({ ...entry, readiness: "pending" as const })) };
    expect(sceneImageReadiness(declaredPending).waitingFor).toEqual(["image1", "image2"]);
    expect(sceneImageReadiness(declaredPending, { image1: "ready", image2: "ready" }).ready).toBe(true);
  });

  it("holds presentation startup on pending images and blocks on failed images", () => {
    const scene = compiled();
    const offer = { scene, sealedThroughMs: 2000 };
    expect(assessReadiness(offer, 1000).ok).toBe(true);
    expect(assessReadiness({ ...offer, imageStates: { image1: "pending", image2: "ready" } }, 1000)).toEqual({
      ok: false,
      reason: "Required image image1 is still loading.",
    });
    expect(assessReadiness({ ...offer, imageStates: { image1: "ready", image2: "failed" } }, 1000)).toEqual({
      ok: false,
      reason: "Required image image2 failed to load.",
    });
    const declaredFailed: SceneIR = { ...scene, resources: scene.resources.map((entry) => ({ ...entry, readiness: "failed" as const })) };
    expect(assessReadiness({ scene: declaredFailed, sealedThroughMs: 2000 }, 1000).ok).toBe(false);
  });
});
