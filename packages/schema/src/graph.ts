import { cameraViewMatrix, IDENTITY, localMatrix, multiplyMat3 } from "./math";
import type { Camera2DDefinition, Mat3, NodeDefinition, Viewport } from "./types";

export interface NodeIndex {
  byId: Map<string, NodeDefinition>;
  declarationIndex: Map<string, number>;
}

export function indexNodes(nodes: readonly NodeDefinition[]): NodeIndex {
  const byId = new Map<string, NodeDefinition>();
  const declarationIndex = new Map<string, number>();
  nodes.forEach((node, index) => {
    byId.set(node.id, node);
    declarationIndex.set(node.id, index);
  });
  return { byId, declarationIndex };
}

export function childrenOf(
  nodes: readonly NodeDefinition[],
  parentId: string | null,
): NodeDefinition[] {
  const index = indexNodes(nodes);
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return (index.declarationIndex.get(a.id) ?? 0) - (index.declarationIndex.get(b.id) ?? 0);
    });
}

/**
 * Parent, then that parent's subtree, before the next sibling.
 * A child's zIndex cannot escape its parent and interleave with uncles.
 * Groups are included. Drawables are this list with groups removed.
 */
export function traversalOrder(nodes: readonly NodeDefinition[]): NodeDefinition[] {
  const ordered: NodeDefinition[] = [];
  const visit = (parentId: string | null) => {
    for (const child of childrenOf(nodes, parentId)) {
      ordered.push(child);
      visit(child.id);
    }
  };
  visit(null);
  return ordered;
}

export function drawableOrder(nodes: readonly NodeDefinition[]): NodeDefinition[] {
  return traversalOrder(nodes).filter((node) => node.kind !== "group");
}

/** Mworld(child) = Mworld(parent) × Mlocal(child). The root parent matrix is identity. */
export function worldMatrix(nodes: readonly NodeDefinition[], id: string): Mat3 {
  const index = indexNodes(nodes);
  const chain: NodeDefinition[] = [];
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) {
      throw new Error(`cycle at ${current.id}`);
    }
    seen.add(current.id);
    chain.push(current);
    const next = current.transformParentId !== undefined ? current.transformParentId : current.parentId;
    current = next ? index.byId.get(next) : undefined;
  }
  chain.reverse();
  let world: Mat3 = IDENTITY;
  for (const node of chain) {
    world = multiplyMat3(world, localMatrix(node.transform));
  }
  return world;
}

export function rootOf(nodes: readonly NodeDefinition[], id: string): NodeDefinition | undefined {
  const index = indexNodes(nodes);
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) return undefined;
    seen.add(current.id);
    current = index.byId.get(current.parentId);
  }
  return current;
}

/**
 * World nodes: V × Mworld. Screen nodes: Mworld only.
 * The result is the logical matrix a resolved draw item stores.
 */
export function logicalMatrix(
  nodes: readonly NodeDefinition[],
  viewport: Pick<Viewport, "width" | "height">,
  camera: Pick<Camera2DDefinition, "position" | "zoom" | "rotation">,
  id: string,
): Mat3 {
  const world = worldMatrix(nodes, id);
  const root = rootOf(nodes, id);
  if (root?.space === "screen") return world;
  return multiplyMat3(cameraViewMatrix(viewport, camera), world);
}

export function nodeDepth(nodes: readonly NodeDefinition[], id: string, index: NodeIndex = indexNodes(nodes)): number {
  let depth = 0;
  let current = index.byId.get(id);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return depth;
    seen.add(current.id);
    depth += 1;
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }
  return depth;
}
