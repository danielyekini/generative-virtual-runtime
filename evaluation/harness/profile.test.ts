import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_IMPORT_LIMITS } from "@gvr/format-import-core";
import { CAPABILITIES, migrateSceneTo02, validateSceneIR } from "@gvr/schema";
import { AnimationRuntime } from "@gvr/runtime";
import { describe, expect, it } from "vitest";

const profile = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../baseline/m6-profile.json"), "utf8"),
) as {
  packageVersion: string;
  claimsAllFixturesPass: boolean;
  lot03: { status: string };
  importCeilings: { defaultMaxSourceBytes: number; candidateStatus: string };
  enabledCapabilities: string[];
  performance: { budgetClaim: boolean };
};

describe("capability profile", () => {
  it("matches the implemented capabilities and keeps LOT-03 quarantined", () => {
    expect(profile.packageVersion).toBe("0.1.0");
    expect(profile.claimsAllFixturesPass).toBe(false);
    expect(profile.lot03.status).toBe("quarantined");
    expect(profile.performance.budgetClaim).toBe(false);
    expect(profile.importCeilings.candidateStatus).toBe("proposed-not-default");
    expect(profile.importCeilings.defaultMaxSourceBytes).toBe(DEFAULT_IMPORT_LIMITS.maxSourceBytes);
    expect(DEFAULT_IMPORT_LIMITS.maxSourceBytes).toBe(512 * 1024);
    for (const name of profile.enabledCapabilities) expect(CAPABILITIES).toContain(name);
  });

  it("samples a migrated 0.1 scene inside a loose bound", () => {
    const scene = validateSceneIR({
      irVersion: "0.1",
      sceneId: "dot",
      viewport: { width: 10, height: 10, fit: "contain" },
      background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      resources: [],
      nodes: [
        {
          id: "box",
          name: "box",
          parentId: null,
          space: "world",
          zIndex: 0,
          transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
          opacity: 1,
          visible: true,
          kind: "rectangle",
          size: { x: 2, y: 2 },
        },
      ],
      cameras: [{ id: "main", position: { x: 5, y: 5 }, zoom: 1, rotation: 0 }],
      initialCameraId: "main",
      timeline: { durationMs: 1000, tracks: [], steps: [] },
    });
    expect(scene.ok).toBe(true);
    if (!scene.ok) return;
    const runtime = new AnimationRuntime(migrateSceneTo02(scene.value));
    const started = Date.now();
    for (let time = 0; time <= 1000; time += 16) runtime.evaluate(time);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
