import {
  cameraViewMatrix, IDENTITY, localMatrix, multiplyMat3,
  type Mat3,
  trimCommands,
  type Camera2DDefinition,
  type NodeDefinition,
  type ResolvedAppearance,
  type RenderTreeNode,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
  type SceneIR,
} from "@gvr/schema";
import type { SampledScene } from "./sample";

/** Flatten one sampled scene into the draw list the renderer already accepts. */
export function buildResolvedFrame(
  scene: SceneIR,
  sampled: SampledScene,
  sceneTimeMs: number,
  revision = 0,
): ResolvedFrame {
  const graph = resolveGraph(sampled.nodes, scene, sampled.camera);
  const drawItems = [];
  for (const node of graph.ordered) {
    if (node.kind === "group" || graph.hidden.get(node.id)) continue;
    const geometry = geometryOf(scene, node, sampled.trimOverrides);
    if (!geometry) continue;
    drawItems.push({
      nodeId: node.id,
      geometry,
      appearance: appearanceOf(node),
      logicalMatrix: graph.logical(node),
      opacity: graph.opacity(node),
    });
  }
  return {
    sceneTimeMs,
    revision,
    viewport: scene.viewport,
    background: scene.background,
    drawItems,
    renderTree: renderTreeFromScene(sampled.nodes, drawItems, graph.children),
  };
}

function renderTreeFromScene(nodes: readonly NodeDefinition[], items: ResolvedDrawItem[], children: Map<string | null, NodeDefinition[]>): RenderTreeNode {
  const flat = {
    kind: "scope" as const,
    id: "root",
    isolated: false,
    opacity: 1,
    children: items.map((item) => ({ kind: "leaf" as const, item })),
  };
  if (!nodes.some((node) => node.kind === "group" && node.compositing)) return flat;
  const byId = new Map(items.map((item) => [item.nodeId, item]));
  const place = (node: NodeDefinition): RenderTreeNode[] => {
    if (node.kind === "group" && node.compositing) {
      return [
        {
          kind: "scope",
          id: node.id,
          isolated: node.compositing.isolated,
          opacity: node.opacity,
          ...(node.compositing.blend ? { blend: node.compositing.blend } : {}),
          ...(node.compositing.effect ? { effect: node.compositing.effect } : {}),
          children: (children.get(node.id) ?? []).flatMap(place),
        },
      ];
    }
    if (node.kind === "group") return (children.get(node.id) ?? []).flatMap(place);
    const item = byId.get(node.id);
    return item ? [{ kind: "leaf", item }] : [];
  };
  return {
    kind: "scope",
    id: "root",
    isolated: false,
    opacity: 1,
    children: (children.get(null) ?? []).flatMap(place),
  };
}

/** All indexes and derived values belong to this sample, never to a scene revision.
 * Rebuilding once is linear and makes streaming additions/cancel/dispose safe.
 * See docs/design/capacity-transactions.md. */
function resolveGraph(nodes: readonly NodeDefinition[], scene: SceneIR, camera: Camera2DDefinition) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const children = new Map<string | null, NodeDefinition[]>();
  for (const node of nodes) {
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  // Stable sort preserves declaration ties, including within compositing scopes.
  for (const list of children.values()) list.sort((a,b) => a.zIndex - b.zIndex);
  const ordered: NodeDefinition[] = [];
  const hidden = new Map<string, boolean>();
  const screen = new Map<string, boolean>();
  const visit = (parent: string | null, ancestorHidden: boolean, isScreen: boolean) => {
    for (const node of children.get(parent) ?? []) {
      const h = ancestorHidden || !node.visible;
      const sc = parent === null ? node.space === "screen" : isScreen;
      ordered.push(node); hidden.set(node.id, h); screen.set(node.id, sc);
      visit(node.id, h, sc);
    }
  };
  visit(null, false, false);
  const worlds = new Map<string, Mat3>();
  const resolving = new Set<string>();
  const world = (node: NodeDefinition): Mat3 => {
    const cached = worlds.get(node.id);
    if (cached) return cached;
    if (resolving.has(node.id)) throw new Error(`cycle at ${node.id}`);
    resolving.add(node.id);
    const parentId = node.transformParentId !== undefined ? node.transformParentId : node.parentId;
    const parent = parentId ? byId.get(parentId) : undefined;
    const result = multiplyMat3(parent ? world(parent) : IDENTITY, localMatrix(node.transform));
    resolving.delete(node.id); worlds.set(node.id, result);
    return result;
  };
  const view = cameraViewMatrix(scene.viewport, camera);
  const opacity = (node: NodeDefinition): number => {
    // Preserve multiplication order and the published skip-exactly-one rule.
    let value = 1;
    let current: NodeDefinition | undefined = node;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (!(current.kind === "group" && current.compositing?.isolated && current.id !== node.id)) value *= current.opacity;
      let parent: NodeDefinition | undefined = current.parentId ? byId.get(current.parentId) : undefined;
      if (current.inheritOpacity === false && parent) parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      current = parent;
    }
    return value;
  };
  return {ordered, children, hidden, opacity,
    logical: (node: NodeDefinition) => screen.get(node.id) ? world(node) : multiplyMat3(view, world(node))};
}

function appearanceOf(node: NodeDefinition): ResolvedAppearance {
  const appearance: ResolvedAppearance = {};
  if ("fill" in node && node.fill) appearance.fill = node.fill;
  if ("stroke" in node && node.stroke) appearance.stroke = node.stroke;
  return appearance;
}

function geometryOf(
  scene: SceneIR,
  node: NodeDefinition,
  overrides?: SampledScene["trimOverrides"],
): ResolvedGeometry | undefined {
  switch (node.kind) {
    case "group":
      return undefined;
    case "rectangle":
      return {
        kind: "rectangle",
        size: node.size,
        ...(node.cornerRadius && node.cornerRadius > 0 ? { cornerRadius: node.cornerRadius } : {}),
      };
    case "image": {
      const resource = scene.resources.find((entry) => entry.id === node.resourceId && entry.kind === "image");
      return {
        kind: "image",
        resourceId: node.resourceId,
        href: resource && resource.kind === "image" ? resource.href : "",
        size: node.size,
      };
    }
    case "circle":
      return { kind: "circle", radius: node.radius };
    case "ellipse":
      return { kind: "ellipse", size: node.size };
    case "line":
      return { kind: "line", from: node.from, to: node.to };
    case "polygon":
      return { kind: "polygon", points: node.points };
    case "path":
      return { kind: "path", commands: trimmed(scene, node.id, node.commands, overrides), fillRule: node.fillRule };
    case "text":
      return {
        kind: "text",
        content: node.content,
        font: node.font,
        align: node.align,
        baseline: node.baseline,
      };
  }
}

function trimmed(
  scene: SceneIR,
  nodeId: string,
  commands: readonly { cmd: string }[],
  overrides?: SampledScene["trimOverrides"],
): ReturnType<typeof trimCommands> {
  const list = scene.geometryOperators?.find((entry) => entry.nodeId === nodeId);
  const override = overrides?.[nodeId];
  if (!list && !override) return [...commands] as ReturnType<typeof trimCommands>;
  let current = [...commands] as ReturnType<typeof trimCommands>;
  if (override) {
    current = trimCommands(current, override.start, override.end, override.offset);
    return current;
  }
  for (const op of list!.operators) {
    if (op.op === "trim") current = trimCommands(current, op.start, op.end, op.offset);
  }
  return current;
}

export type { Camera2DDefinition };
