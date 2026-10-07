import type { SceneIR, TimingScope } from "./types";

const ROOT_SCOPE: TimingScope = { id: "root", parentId: null, offsetMs: 0, stretch: 1 };

/**
 * Copy a 0.1 scene into 0.2 defaults.
 * Opacity, order, fill, and overlap rules stay as they were.
 * Groups are not isolated. Tracks are not reinterpreted as additive.
 */
export function migrateSceneTo02(scene: SceneIR): SceneIR {
  if (scene.irVersion === "0.2") return scene;
  return {
    ...scene,
    irVersion: "0.2",
    resources: scene.resources.map((resource) => ({ ...resource, readiness: resource.readiness ?? "ready" })),
    compositions: scene.compositions ?? [],
    instances: scene.instances ?? [],
    timingScopes: scene.timingScopes ?? [ROOT_SCOPE],
    requiredCapabilities: scene.requiredCapabilities ?? [],
    geometryOperators: scene.geometryOperators ?? [],
    timeline: {
      durationMs: scene.timeline.durationMs,
      tracks: scene.timeline.tracks.map((track) => ({ ...track })),
      steps: scene.timeline.steps.map((step) => ({ ...step })),
    },
  };
}
