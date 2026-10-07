import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import type { SceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { AnimationRuntime } from "./runtime";
import { PresentationController, type GeneratedOffer, type SystemCatalogueEntry } from "./presentation";

const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/system");

function loadScene(name: string): SceneIR {
  return JSON.parse(readFileSync(resolve(fixtureDir, name), "utf8")) as SceneIR;
}

function catalogue(): SystemCatalogueEntry[] {
  return [
    { id: "pulse", scene: loadScene("pulse.json") },
    { id: "orbit", scene: loadScene("orbit.json") },
    { id: "tide", scene: loadScene("tide.json") },
  ];
}

function offer(scene: SceneIR, sealedThroughMs = scene.timeline.durationMs): GeneratedOffer {
  return { scene, sealedThroughMs, resourcesReady: true };
}

function controller() {
  return new PresentationController({
    scenes: catalogue(),
    startupBufferMs: 750,
    transitionMs: 200,
    dismissMs: 100,
  });
}

describe("system scenes", () => {
  it("matches the committed SceneIR, so playback does not reparse MotionScript", () => {
    for (const name of ["pulse", "orbit", "tide"]) {
      const compiled = compileMotionScript(readFileSync(resolve(fixtureDir, `${name}.ms`), "utf8"));
      expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
      expect(compiled.scene).toEqual(loadScene(`${name}.json`));
    }
  });

  it("returns to the same pose at the end of each cycle", () => {
    const orbit = new AnimationRuntime(loadScene("orbit.json"));
    const start = orbit.evaluate(0).drawItems.find((item) => item.nodeId === "wheel.planet");
    const end = orbit.evaluate(4000).drawItems.find((item) => item.nodeId === "wheel.planet");
    expect(end?.logicalMatrix[6]).toBeCloseTo(start?.logicalMatrix[6] ?? NaN, 4);
    expect(end?.logicalMatrix[7]).toBeCloseTo(start?.logicalMatrix[7] ?? NaN, 4);

    const tide = new AnimationRuntime(loadScene("tide.json"));
    for (const id of ["barA", "barB", "barC"]) {
      const opened = tide.evaluate(0).drawItems.find((item) => item.nodeId === id);
      const closed = tide.evaluate(4000).drawItems.find((item) => item.nodeId === id);
      expect(closed?.logicalMatrix[7], id).toBeCloseTo(opened?.logicalMatrix[7] ?? NaN, 4);
    }
  });
});

describe("presentation controller", () => {
  const generated = loadScene("generated.json");

  it("keeps the generated clock at zero until the crossfade ends", () => {
    const presentation = controller();
    const id = presentation.submit();
    expect(id).toBe("g-1");
    presentation.tick(1000);
    const waiting = presentation.view;
    expect(waiting.phase).toBe("system_interstitial");
    expect(waiting.systemTimeMs).toBeCloseTo(1000, 6);
    expect(waiting.generatedTimeMs).toBe(0);
    expect(waiting.generatedFrame).toBeNull();

    expect(presentation.receive(id!, offer(generated))).toBe(true);
    const crossing = presentation.view;
    expect(crossing.phase).toBe("transitioning");
    expect(crossing.generatedTimeMs).toBe(0);
    expect(crossing.systemTimeMs).toBeCloseTo(1000, 6);
    expect(crossing.systemFrame?.drawItems.some((item) => item.nodeId.startsWith("mark."))).toBe(true);
    expect(crossing.generatedFrame?.drawItems.some((item) => item.nodeId === "ball")).toBe(true);
    const systemIds = new Set(crossing.systemFrame?.drawItems.map((item) => item.nodeId));
    for (const item of crossing.generatedFrame?.drawItems ?? []) expect(systemIds.has(item.nodeId)).toBe(false);

    presentation.tick(200);
    const handed = presentation.view;
    expect(handed.phase).toBe("generated_scene");
    expect(handed.generatedTimeMs).toBe(0);
    expect(handed.systemFrame).toBeNull();
    expect(handed.systemOpacity).toBe(0);
    presentation.tick(80);
    expect(presentation.view.generatedTimeMs).toBeCloseTo(80, 6);
    expect(presentation.view.systemTimeMs).toBeCloseTo(1000, 6);
    expect(presentation.view.generatedSceneId).toBe("bouncing-ball");
    expect(presentation.view.systemSceneId).toBe("pulse");
  });

  it("starts the generated scene without waiting for a system cycle", () => {
    const presentation = controller();
    const id = presentation.submit()!;
    presentation.tick(40);
    expect(presentation.view.phase).toBe("dismissing_input");
    expect(presentation.receive(id, offer(generated))).toBe(true);
    presentation.tick(200);
    expect(presentation.view.phase).toBe("generated_scene");
    expect(presentation.view.generatedTimeMs).toBe(0);
    expect(presentation.view.systemTimeMs).toBeLessThan(3000);
  });

  it("cycles system scenes and ignores a stale generation", () => {
    const presentation = controller();
    const first = presentation.submit()!;
    expect(presentation.view.systemSceneId).toBe("pulse");
    const second = presentation.submit()!;
    expect(presentation.view.systemSceneId).toBe("orbit");
    expect(presentation.receive(first, offer(generated))).toBe(false);
    expect(presentation.view.phase).toBe("dismissing_input");
    presentation.tick(100);
    expect(presentation.receive(second, offer(generated))).toBe(true);
    expect(presentation.view.generatedSceneId).toBe("bouncing-ball");
    expect(presentation.view.systemSceneId).toBe("orbit");
    presentation.submit();
    expect(presentation.view.systemSceneId).toBe("tide");
  });

  it("restores the prompt on cancel during the transition", () => {
    const presentation = controller();
    const id = presentation.submit()!;
    presentation.tick(100);
    presentation.receive(id, offer(generated));
    presentation.tick(40);
    expect(presentation.view.phase).toBe("transitioning");
    presentation.cancel();
    expect(presentation.view.phase).toBe("initial_input");
    expect(presentation.view.systemFrame).toBeNull();
    expect(presentation.view.generatedFrame).toBeNull();
    presentation.tick(500);
    expect(presentation.view.systemTimeMs).toBe(0);
    expect(presentation.view.generatedTimeMs).toBe(0);
    expect(presentation.receive(id, offer(generated))).toBe(false);
  });

  it("restores the prompt when generation fails before readiness", () => {
    const presentation = controller();
    const id = presentation.submit()!;
    presentation.tick(150);
    presentation.fail(id, "Generation failed.");
    expect(presentation.view.phase).toBe("initial_input");
    expect(presentation.view.status).toBe("Generation failed.");
    expect(presentation.fail("g-other")).toBeUndefined();
    expect(presentation.receive(id, offer(generated))).toBe(false);
  });

  it("refuses a generated scene that is not ready to show", () => {
    const presentation = controller();
    const id = presentation.submit()!;
    presentation.tick(100);
    expect(presentation.receive(id, offer(generated, 100))).toBe(false);
    expect(presentation.view.phase).toBe("system_interstitial");
    expect(presentation.view.status).toContain("Sealed coverage");

    const hidden = structuredClone(generated);
    for (const node of hidden.nodes) node.opacity = 0;
    expect(presentation.receive(id, offer(hidden))).toBe(false);
    expect(presentation.view.status).toContain("nothing visible");

    expect(presentation.receive(id, { ...offer(generated), fatal: true })).toBe(false);
    expect(presentation.receive(id, { ...offer(generated), unresolved: true })).toBe(false);
    expect(presentation.receive(id, { ...offer(generated), resourcesReady: false })).toBe(false);
    expect(presentation.receive(id, { scene: {} as SceneIR, sealedThroughMs: 4000, resourcesReady: true })).toBe(false);
    expect(presentation.view.phase).toBe("system_interstitial");
    expect(presentation.view.generatedFrame).toBeNull();
  });
});
