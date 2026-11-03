/**
 * Placement order for geometry.pathSpace (Scene IR 0.22.0).
 * An attachment depends on any other attachment that writes the path node or a
 * transform ancestor of the path or of the traveller. Cyclic sets are returned
 * separately so sampling can leave those poses authored.
 */
export function orderPathAttachments(
  attachments: readonly { nodeId: string; pathId: string }[],
  transformParent: (id: string) => string | null,
): { ready: string[]; cyclic: string[] } {
  const pathOf = new Map(attachments.map((entry) => [entry.nodeId, entry.pathId]));
  const deps = new Map<string, Set<string>>();
  for (const entry of attachments) {
    const needed = new Set<string>();
    if (pathOf.has(entry.pathId)) needed.add(entry.pathId);
    for (const id of transformChain(entry.pathId, transformParent)) {
      if (pathOf.has(id)) needed.add(id);
    }
    for (const id of transformChain(entry.nodeId, transformParent)) {
      if (pathOf.has(id)) needed.add(id);
    }
    needed.delete(entry.nodeId);
    deps.set(entry.nodeId, needed);
  }
  const pending = attachments.map((entry) => entry.nodeId);
  const ready: string[] = [];
  const done = new Set<string>();
  while (pending.length) {
    const index = pending.findIndex((id) => [...(deps.get(id) ?? [])].every((dep) => done.has(dep)));
    if (index < 0) return { ready, cyclic: pending };
    const id = pending.splice(index, 1)[0]!;
    ready.push(id);
    done.add(id);
  }
  return { ready, cyclic: [] };
}

function transformChain(start: string, transformParent: (id: string) => string | null): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = transformParent(start);
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = transformParent(current);
  }
  return chain;
}
