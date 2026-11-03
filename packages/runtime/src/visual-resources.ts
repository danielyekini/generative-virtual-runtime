import type { SceneIR } from "@gvr/schema";

/** Host loader state for an image resource (same vocabulary as audio). */
export type ImageResourceState = "pending" | "ready" | "failed";
export type ImageStates = Readonly<Record<string, ImageResourceState>>;

export interface SceneImageRequirement {
  resourceId: string;
  href: string;
  /** Image node ids that draw this resource, in node order. */
  nodeIds: string[];
}

export interface ImageReadiness {
  /** True when no referenced image is pending or failed. */
  ready: boolean;
  waitingFor: string[];
  failed: string[];
}

/**
 * Image resources that some image node draws. Declared but undrawn resources
 * are not required, so they never hold playback (E019).
 */
export function sceneImageRequirements(scene: SceneIR): SceneImageRequirement[] {
  const byId = new Map<string, SceneImageRequirement>();
  for (const node of scene.nodes) {
    if (node.kind !== "image") continue;
    const resource = scene.resources.find((entry) => entry.id === node.resourceId && entry.kind === "image");
    if (!resource || resource.kind !== "image") continue;
    const existing = byId.get(resource.id);
    if (existing) existing.nodeIds.push(node.id);
    else byId.set(resource.id, { resourceId: resource.id, href: resource.href, nodeIds: [node.id] });
  }
  return [...byId.values()];
}

/**
 * Readiness of every drawn image resource. The host loader's state wins.
 * Otherwise the program's declared `readiness` applies. With neither, an
 * image counts as ready, so older hosts keep their lazy draw-when-loaded
 * behaviour.
 */
export function sceneImageReadiness(scene: SceneIR, states?: ImageStates): ImageReadiness {
  const waitingFor: string[] = [];
  const failed: string[] = [];
  for (const requirement of sceneImageRequirements(scene)) {
    const declared = scene.resources.find((entry) => entry.id === requirement.resourceId)?.readiness;
    const state = states?.[requirement.resourceId] ?? declared ?? "ready";
    if (state === "failed") failed.push(requirement.resourceId);
    else if (state === "pending") waitingFor.push(requirement.resourceId);
  }
  return { ready: waitingFor.length === 0 && failed.length === 0, waitingFor, failed };
}
