import {
  drawableOrder,
  indexNodes,
  logicalMatrix,

  type Camera2DDefinition,
  type NodeDefinition,
  type ResolvedAppearance,
  type RenderTreeNode,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
  type SceneIR,
} from "@gvr/schema";
import type { SampledScene } from "../../../packages/runtime/src/sample";
import { trimCommands } from "./trim";

/** Flatten one sampled scene into the draw list the renderer already accepts. */
export function buildResolvedFrame(
  scene: SceneIR,
  sampled: SampledScene,
  sceneTimeMs: number,
  revision = 0,
): ResolvedFrame {
  const drawItems = [];
  for (const node of drawableOrder(sampled.nodes)) {
    if (subtreeHidden(sampled.nodes, node.id)) continue;
    const geometry = geometryOf(scene, node, sampled.trimOverrides);
    if (!geometry) continue;
    drawItems.push({
      nodeId: node.id,
      geometry,
      appearance: appearanceOf(node),
      logicalMatrix: logicalMatrix(sampled.nodes, scene.viewport, sampled.camera, node.id),
      opacity: opacityProduct(sampled.nodes, node.id),
    });
  }
  return {
    sceneTimeMs,
    revision,
    viewport: scene.viewport,
    background: scene.background,
    drawItems,
    renderTree: renderTreeFromScene(sampled.nodes, drawItems),
  };
}

function renderTreeFromScene(nodes: readonly NodeDefinition[], items: ResolvedDrawItem[]): RenderTreeNode {
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
          children: nodes.filter((child) => child.parentId === node.id).flatMap(place),
        },
      ];
    }
    if (node.kind === "group") return nodes.filter((child) => child.parentId === node.id).flatMap(place);
    const item = byId.get(node.id);
    return item ? [{ kind: "leaf", item }] : [];
  };
  return {
    kind: "scope",
    id: "root",
    isolated: false,
    opacity: 1,
    children: nodes.filter((node) => node.parentId === null).flatMap(place),
  };
}

function subtreeHidden(nodes: readonly NodeDefinition[], id: string): boolean {
  const index = indexNodes(nodes);
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return true;
    seen.add(current.id);
    if (!current.visible) return true;
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }
  return false;
}

function opacityProduct(nodes: readonly NodeDefinition[], id: string): number {
  const index = indexNodes(nodes);
  let product = 1;
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const isolatedAncestor = current.kind === "group" && current.compositing?.isolated === true && current.id !== id;
    if (!isolatedAncestor) product *= current.opacity;
    let parent = current.parentId ? index.byId.get(current.parentId) : undefined;
    if (current.inheritOpacity === false && parent) {
      parent = parent.parentId ? index.byId.get(parent.parentId) : undefined;
    }
    current = parent;
  }
  return product;
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
