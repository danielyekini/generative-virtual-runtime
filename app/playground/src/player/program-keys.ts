/**
 * Library catalogue keys that changed collection (P031). Capability probes were
 * filed under Stories as `story:<id>`; they are Test frames now (`frame:<id>`).
 * Saved favourites, tags, recents and `#p/` links keep resolving through
 * canonicalProgramKey.
 */

/** MotionScript examples that are short capability probes, not Stories. */
export const PROBE_IDS: ReadonlySet<string> = new Set([
  "spatial-crane",
  "spatial-home",
  "spatial-echo",
  "spatial-seams",
  "clip-mask",
  "alpha-matte",
  "path-progress",
  "path-space",
  "dynamic-text",
  "text-layout",
  "stroke-dash",
  "physics-marble",
]);

/** Maps a pre-P031 key to its current key; other keys are returned unchanged. */
export function canonicalProgramKey(key: string): string {
  if (!key.startsWith("story:")) return key;
  const id = key.slice("story:".length);
  return PROBE_IDS.has(id) ? `frame:${id}` : key;
}
