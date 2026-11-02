import type { SceneIR } from "@gvr/schema";

const NODE_LIMIT = 300;

/** Compact Scene IR overview for the Scene tab; never a full JSON dump (stories reach megabytes). */
export function describeSceneSummary(scene: SceneIR): string {
  const kinds = new Map<string, number>();
  for (const node of scene.nodes) kinds.set(node.kind, (kinds.get(node.kind) ?? 0) + 1);
  const lines = [
    `scene ${scene.sceneId}`,
    `irVersion ${scene.irVersion}`,
    `viewport ${scene.viewport.width}×${scene.viewport.height} ${scene.viewport.fit}`,
    `duration ${scene.timeline.durationMs} ms`,
    `nodes ${scene.nodes.length} (${[...kinds].map(([kind, count]) => `${kind} ${count}`).join(", ")})`,
    `tracks ${scene.timeline.tracks.length} · steps ${scene.timeline.steps.length}`,
    `resources ${scene.resources.length} · cameras ${scene.cameras.length}`,
    "",
    ...scene.nodes.slice(0, NODE_LIMIT).map((node) => `${node.id}\t${node.kind}`),
  ];
  if (scene.nodes.length > NODE_LIMIT) lines.push(`… ${scene.nodes.length - NODE_LIMIT} more nodes`);
  return lines.join("\n");
}
