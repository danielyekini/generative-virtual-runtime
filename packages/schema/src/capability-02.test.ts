import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptScene } from "./accept";
import { applySegmentEasing } from "./easing";
import { migrateSceneTo02 } from "./migrate";
import type { SceneIR } from "./types";
import { validateResolvedFrame, validateSceneIR } from "./validate";

const box = {
  id: "box",
  name: "box",
  parentId: null,
  space: "world" as const,
  kind: "rectangle" as const,
  zIndex: 0,
  transform: {
    position: { x: 0, y: 0 },
    pivot: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
  },
  opacity: 1,
  visible: true,
  size: { x: 4, y: 4 },
  fill: { type: "solid" as const, r: 1, g: 0, b: 0, a: 1 },
};

function scene02(patch: Partial<SceneIR> = {}): SceneIR {
  return {
    irVersion: "0.2",
    sceneId: "cap",
    viewport: { width: 100, height: 100, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 50, y: 50 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    nodes: [box],
    timeline: { durationMs: 1000, tracks: [], steps: [] },
    compositions: [],
    instances: [],
    timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 1 }],
    requiredCapabilities: [],
    geometryOperators: [],
    ...patch,
  };
}

describe("scene ir 0.2", () => {
  it("solves cubic y after x and keeps hold on the segment start", () => {
    expect(applySegmentEasing("linear", 0.5)).toBe(0.5);
    expect(applySegmentEasing({ type: "hold" }, 0.99)).toBe(0);
    expect(applySegmentEasing({ type: "hold" }, 1)).toBe(1);
    const over = applySegmentEasing({ type: "cubic", x1: 0, y1: 1.5, x2: 1, y2: 1.5 }, 0.5);
    expect(over).toBeGreaterThan(1);
    expect(applySegmentEasing({ type: "cubic", x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 0)).toBe(0);
    expect(applySegmentEasing({ type: "cubic", x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 1)).toBe(1);
  });

  it("rejects a timing cycle, a zero stretch, an unknown definition, and 0.2 fields on 0.1", () => {
    const cycle = validateSceneIR(
      scene02({
        timingScopes: [
          { id: "a", parentId: "b", offsetMs: 0, stretch: 1 },
          { id: "b", parentId: "a", offsetMs: 0, stretch: 1 },
        ],
      }),
    );
    expect(cycle.ok).toBe(false);
    if (!cycle.ok) expect(cycle.diagnostics.some((item) => item.code === "CYCLE")).toBe(true);

    const stretch = validateSceneIR(scene02({ timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 0 }] }));
    expect(stretch.ok).toBe(false);

    const missing = validateSceneIR(
      scene02({
        instances: [
          {
            id: "one",
            definitionId: "missing",
            parentId: null,
            transformParentId: null,
            transform: box.transform,
            opacity: 1,
            visible: true,
            activation: { startMs: 0, endMs: 1000 },
            timingScopeId: "root",
          },
        ],
      }),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.code === "UNKNOWN_TARGET")).toBe(true);

    const legacy = validateSceneIR({ ...scene02(), irVersion: "0.1", compositions: [] });
    expect(legacy.ok).toBe(false);
  });

  it("keeps a stored frame without a render tree and rejects playback that is not ready", () => {
    const stored = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../fixtures/frames/opacity.json"), "utf8"));
    expect(stored.renderTree).toBeUndefined();
    expect(validateResolvedFrame(stored).ok).toBe(true);

    const pending = scene02({
      resources: [{ id: "font1", kind: "font", family: "sans", source: "builtin", readiness: "pending" }],
    });
    expect(validateSceneIR(pending).ok).toBe(true);
    const blocked = acceptScene(pending, { consumer: "0.2", enabled: [] });
    expect(blocked.ok).toBe(false);

    const modern = scene02({ requiredCapabilities: ["easing.cubicBezier"] });
    expect(acceptScene(modern, { consumer: "0.1", enabled: ["easing.cubicBezier"] }).ok).toBe(false);
    expect(acceptScene(modern, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(modern, { consumer: "0.2", enabled: ["easing.cubicBezier"] }).ok).toBe(true);

    const legacy = scene02();
    legacy.irVersion = "0.1";
    delete legacy.compositions;
    delete legacy.instances;
    delete legacy.timingScopes;
    delete legacy.requiredCapabilities;
    delete legacy.geometryOperators;
    const loaded = acceptScene(legacy, { consumer: "0.2", enabled: [] });
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.irVersion).toBe("0.2");
      expect(migrateSceneTo02(legacy).timingScopes?.[0]).toEqual({ id: "root", parentId: null, offsetMs: 0, stretch: 1 });
    }
  });
});
