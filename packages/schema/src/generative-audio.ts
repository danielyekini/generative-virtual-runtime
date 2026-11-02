import type { AudioGenerativeModality } from "./types";

/**
 * Provisional length before synthesis completes (Scene IR 0.14.0). Prefer an
 * explicit hint; otherwise estimate speech from prompt length (~14 chars/s)
 * and effects at 2s. Matches the E032 runtime heuristic.
 */
export function estimateGenerativeAudioDurationMs(
  modality: AudioGenerativeModality,
  prompt: string,
  durationHintMs?: number,
): number {
  if (durationHintMs !== undefined && Number.isFinite(durationHintMs) && durationHintMs > 0) {
    return durationHintMs;
  }
  if (modality === "effect") return 2000;
  const chars = Math.max(1, prompt.trim().length);
  return Math.min(60_000, Math.max(500, Math.round((chars / 14) * 1000)));
}
