import type { CompositionInstance, SceneIR, TimingScope } from "./types";

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

/**
 * Scene IR 0.25.0: strip the inert composition-instance `timingScopeId`.
 * Behaviour-preserving — the runtime never sampled it (E048 / E050).
 */
export function stripInstanceTimingScopeId(scene: SceneIR): SceneIR {
  if (!scene.instances?.length) return scene;
  let changed = false;
  const instances: CompositionInstance[] = scene.instances.map((entry) => {
    const record = entry as CompositionInstance & { timingScopeId?: unknown };
    if (!("timingScopeId" in record)) return entry;
    changed = true;
    const { timingScopeId: _removed, ...rest } = record;
    return rest;
  });
  return changed ? { ...scene, instances } : scene;
}
