import type { TimingScope } from "./types";

/**
 * Convert root scene time into a scope's local time.
 * Each scope applies local = (parent - offsetMs) / stretch, from the root downward.
 * A cycle or a missing scope returns undefined so the caller can reject the sample.
 */
export function localTimeMs(scopes: readonly TimingScope[], scopeId: string, rootMs: number): number | undefined {
  const chain = scopeChain(scopes, scopeId);
  if (!chain) return undefined;
  let time = rootMs;
  for (const scope of chain) {
    if (!(scope.stretch !== 0) || !Number.isFinite(scope.stretch)) return undefined;
    time = (time - scope.offsetMs) / scope.stretch;
  }
  return time;
}

/** Inverse of localTimeMs. Applies each scope from the leaf back to the root. */
export function rootTimeMs(scopes: readonly TimingScope[], scopeId: string, localMs: number): number | undefined {
  const chain = scopeChain(scopes, scopeId);
  if (!chain) return undefined;
  let time = localMs;
  for (const scope of [...chain].reverse()) {
    if (!(scope.stretch !== 0) || !Number.isFinite(scope.stretch) || !Number.isFinite(scope.offsetMs)) return undefined;
    time = time * scope.stretch + scope.offsetMs;
  }
  return time;
}

export function scopeChain(scopes: readonly TimingScope[], scopeId: string): TimingScope[] | undefined {
  const byId = new Map(scopes.map((scope) => [scope.id, scope]));
  const leafToRoot: TimingScope[] = [];
  const seen = new Set<string>();
  let id: string | null = scopeId;
  while (id) {
    if (seen.has(id)) return undefined;
    const current = byId.get(id);
    if (!current) return undefined;
    seen.add(id);
    leafToRoot.push(current);
    id = current.parentId;
  }
  return leafToRoot.reverse();
}
