/**
 * Load the P006 authoring reference for Studio Generate (P019).
 * Bundles the current pointer + matching snapshot at build time.
 */
import current from "../../../../docs/reference/motionscript-authoring/current.json";

const snapshots = import.meta.glob<string>(
  "../../../../docs/reference/motionscript-authoring/snapshots/*.md",
  { query: "?raw", import: "default", eager: true },
);

export type StudioReference = {
  fingerprint: string;
  path: string;
  markdown: string;
  modelId: string;
};

/** Pinned live Studio model (P007 / P019). */
export const STUDIO_GENERATE_MODEL = "qwen2.5-coder:14b";

export function loadStudioReference(): StudioReference {
  const file = current.snapshot.split("/").pop() ?? "";
  const match = Object.entries(snapshots).find(([path]) => path.endsWith(`/${file}`) || path.endsWith(file));
  if (!match) {
    throw new Error(`Studio Generate missing authoring snapshot ${current.snapshot}`);
  }
  return {
    fingerprint: current.fingerprint,
    path: current.snapshot,
    markdown: match[1],
    modelId: STUDIO_GENERATE_MODEL,
  };
}
