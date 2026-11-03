import { describe, expect, it } from "vitest";
import { acceptScene } from "./accept";
import { stripInstanceTimingScopeId } from "./migrate";
import type { SceneIR } from "./types";
import { validateSceneIR } from "./validate";

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

function scene(patch: Partial<SceneIR> = {}): SceneIR {
  return {
    irVersion: "0.2",
    sceneId: "inst",
    viewport: { width: 100, height: 100, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 50, y: 50 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    nodes: [box],
    timeline: { durationMs: 1000, tracks: [], steps: [] },
    compositions: [{ id: "chip", nodes: [{ ...box, id: "body", name: "body" }] }],
    instances: [
      {
        id: "one",
        definitionId: "chip",
        parentId: null,
        transformParentId: null,
        transform: box.transform,
        opacity: 1,
        visible: true,
        activation: { startMs: 0, endMs: 1000 },
      },
    ],
    timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 1 }],
    requiredCapabilities: ["composition.definitions"],
    geometryOperators: [],
    ...patch,
  };
}

describe("rejects instance timingScopeId and strips it on accept", () => {
  it("rejects timingScopeId on validateSceneIR", () => {
    const withTiming = {
      ...scene(),
      instances: [
        {
          ...scene().instances![0]!,
          timingScopeId: "root",
        },
      ],
    } as unknown as SceneIR;
    const result = validateSceneIR(withTiming);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === "UNSUPPORTED_PROPERTY" && item.message.includes("timingScopeId"))).toBe(
        true,
      );
    }
  });

  it("strips timingScopeId and accepts the migrated scene", () => {
    const withTiming = {
      ...scene(),
      instances: [
        {
          ...scene().instances![0]!,
          timingScopeId: "root",
        },
      ],
    } as unknown as SceneIR;
    const stripped = stripInstanceTimingScopeId(withTiming);
    expect("timingScopeId" in (stripped.instances![0] as object)).toBe(false);
    expect(validateSceneIR(stripped).ok).toBe(true);
    const accepted = acceptScene(withTiming, { consumer: "0.2", enabled: ["composition.definitions"] });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect("timingScopeId" in (accepted.value.instances![0] as object)).toBe(false);
  });

  it("compiles an instance without timing", () => {
    expect(validateSceneIR(scene()).ok).toBe(true);
  });
});
