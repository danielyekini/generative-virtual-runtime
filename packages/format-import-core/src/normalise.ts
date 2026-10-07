import { KEYWORDS } from "@gvr/schema";

const reserved = new Set<string>(KEYWORDS);

/**
 * Source frames at `frameRate` frames per second, converted to milliseconds.
 * Frame 0 is 0ms. The helper does not change Scene IR time once it is stored.
 */
export function framesToMs(frame: number, frameRate: number): number {
  if (!(frameRate > 0) || !Number.isFinite(frame) || !Number.isFinite(frameRate)) return Number.NaN;
  return (frame / frameRate) * 1000;
}

export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/** A y-up distance from the top of a viewport, written as y-down. */
export function yUpToYDown(yUp: number, height: number): number {
  return height - yUp;
}

/** Keep identifier characters. An empty or reserved result uses the fallback. */
export function sanitiseName(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, "");
  const named = cleaned.length > 0 && !/^[0-9]/.test(cleaned) ? cleaned : fallback;
  if (reserved.has(named)) return `${named}Node`;
  return named;
}

/**
 * Canonical ids follow the compiler rule: a root id is its name, a child id is
 * parentId + "." + name. A collision gets a numeric suffix before the id is joined.
 */
export function allocateId(parentId: string | null, rawName: string, used: Set<string>): { id: string; name: string } {
  const base = sanitiseName(rawName, "node");
  let name = base;
  let suffix = 2;
  while (used.has(parentId ? `${parentId}.${name}` : name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  const id = parentId ? `${parentId}.${name}` : name;
  used.add(id);
  return { id, name };
}
