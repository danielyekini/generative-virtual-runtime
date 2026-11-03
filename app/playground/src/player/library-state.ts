/** Browser-only organisation metadata; never a language or installed-source change. */
import { canonicalProgramKey } from "./program-keys";

export const META_KEY = "gvr.studio.library-meta.v1";
export interface ProgramMeta { favourite?: boolean; tags?: string[]; openedAt?: number; modifiedAt?: number; }
export type LibraryMeta = Record<string, ProgramMeta>;
export function decodeMeta(raw: string | null): LibraryMeta {
  const result: LibraryMeta = Object.create(null);
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!data || typeof data !== "object" || Array.isArray(data)) return result;
    for (const [stored, value] of Object.entries(data)) {
      if (!value || typeof value !== "object") continue;
      const key = canonicalProgramKey(stored);
      // A renamed key's metadata never overwrites metadata saved under the current key.
      if (key !== stored && Object.hasOwn(data, key)) continue;
      const m = value as ProgramMeta;
      result[key] = {
        favourite: m.favourite === true,
        tags: Array.isArray(m.tags) ? parseTags(m.tags.filter((tag) => typeof tag === "string").join(",")) : [],
        openedAt: typeof m.openedAt === "number" && Number.isFinite(m.openedAt) ? m.openedAt : 0,
        modifiedAt: typeof m.modifiedAt === "number" && Number.isFinite(m.modifiedAt) ? m.modifiedAt : 0,
      };
    }
  } catch { /* Defaults for corrupt or unavailable storage. */ }
  return result;
}
export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(",").map((tag) => tag.trim()).filter(Boolean))];
}
