/**
 * Studio program library: installed native programs plus the user's uploaded
 * or pasted programs. Pure logic only, so it can be tested without a DOM.
 */
import type { Diagnostic } from "@gvr/schema";

export type ProgramOrigin = "installed" | "mine";

export interface ProgramEntry {
  /** Stable key, for example `preset:bunny` or `mine:1730000000000-ab12`. */
  key: string;
  label: string;
  caption: string;
  /** Library collection shown as a filter chip. */
  collection: string;
  origin: ProgramOrigin;
  source: string;
}

export interface LibraryQuery {
  text: string;
  /** `all` or one collection name. */
  collection: string;
}

/** Case- and accent-insensitive token match across label, caption, key and collection. */
export function filterLibrary(entries: readonly ProgramEntry[], query: LibraryQuery): ProgramEntry[] {
  const tokens = fold(query.text).split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (query.collection !== "all" && entry.collection !== query.collection) return false;
    if (tokens.length === 0) return true;
    const haystack = fold(`${entry.label} ${entry.caption} ${entry.key} ${entry.collection}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

export function collectionsOf(entries: readonly ProgramEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.collection, (counts.get(entry.collection) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

function fold(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Derive a readable program name from an uploaded file name. */
export function programNameFromFile(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.(ms|motionscript|txt)$/i, "");
  return base.trim() || "Untitled program";
}

/** Read the scene id (`scene "id" {`) from MotionScript text, when present. */
export function sceneIdOf(source: string): string | undefined {
  return /scene\s+"([^"]+)"/.exec(source)?.[1];
}

export const MINE_COLLECTION = "My programs";
export const STORAGE_KEY = "gvr.studio.library.v1";

export interface StoredProgram {
  key: string;
  label: string;
  source: string;
}

export function encodeMine(entries: readonly ProgramEntry[]): string {
  const stored: StoredProgram[] = entries
    .filter((entry) => entry.origin === "mine")
    .map((entry) => ({ key: entry.key, label: entry.label, source: entry.source }));
  return JSON.stringify({ version: 1, programs: stored });
}

export function decodeMine(raw: string | null | undefined): ProgramEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; programs?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.programs)) return [];
    return parsed.programs.flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const { key, label, source } = item as Partial<StoredProgram>;
      if (typeof key !== "string" || !key.startsWith("mine:") || typeof label !== "string" || typeof source !== "string") return [];
      return [mineEntry(key, label, source)];
    });
  } catch {
    return [];
  }
}

export function mineEntry(key: string, label: string, source: string): ProgramEntry {
  const scene = sceneIdOf(source);
  return {
    key,
    label,
    caption: scene ? `Your program · scene "${scene}"` : "Your program",
    collection: MINE_COLLECTION,
    origin: "mine",
    source,
  };
}

export interface LocatedDiagnostic {
  code: string;
  message: string;
  recovery: string;
  severity: string;
  /** 1-based, when the diagnostic carries a source span. */
  line?: number;
  column?: number;
  /** Offsets into the source the program was executed from. */
  start?: number;
  end?: number;
  /** One-line rendering for lists and automation. */
  text: string;
}

/** Turn compiler diagnostics into actionable, source-located rows. */
export function locateDiagnostics(diagnostics: readonly Diagnostic[], source: string): LocatedDiagnostic[] {
  return diagnostics.map((item) => {
    const span = item.sourceSpan;
    const start = span ? clampOffset(span.start.offset, source) : undefined;
    const end = span ? Math.max(start ?? 0, clampOffset(span.end.offset, source)) : undefined;
    const where = span ? `line ${span.start.line}, column ${span.start.column}` : "";
    return {
      code: item.code,
      message: item.message,
      recovery: item.recovery,
      severity: item.severity,
      line: span?.start.line,
      column: span?.start.column,
      start,
      end,
      text: [where, item.code, item.message].filter(Boolean).join(" · "),
    };
  });
}

function clampOffset(offset: number, source: string): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.min(source.length, Math.floor(offset)));
}

/** Text range to select in the editor for a diagnostic, widened to at least one character. */
export function selectionFor(item: LocatedDiagnostic, source: string): { start: number; end: number } | undefined {
  if (item.start === undefined) return undefined;
  const start = item.start;
  let end = item.end ?? start;
  if (end <= start) end = Math.min(source.length, start + 1);
  if (end <= start) {
    const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    return { start: lineStart, end: start };
  }
  return { start, end };
}
