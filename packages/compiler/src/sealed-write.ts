/**
 * Sealed-history write diagnostics (E047).
 *
 * The compiler reports writes behind the sealed horizon as `INVALID_TIMING`,
 * like every other timing error. The stream linter needs to tell them apart
 * without matching message text, so the compiler marks the diagnostics it
 * creates for this reason. The public diagnostic shape is unchanged.
 * `sceneTimeMs` records the seal horizon that rejected the write.
 */

import { diagnostic, type Diagnostic, type SourceSpan } from "@gvr/schema";

const sealedWrites = new WeakSet<Diagnostic>();

export function sealedHistoryWrite(message: string, horizonMs: number, sourceSpan?: SourceSpan): Diagnostic {
  const issue = diagnostic({
    code: "INVALID_TIMING",
    phase: "compile",
    category: "temporal",
    effect: "UNIT_REJECTED",
    recovery: "Reject this unit atomically. Send writers before the seal reaches them, or seal later.",
    message,
    sourceSpan,
    sceneTimeMs: horizonMs,
  });
  sealedWrites.add(issue);
  return issue;
}

/** True when the compiler rejected this unit because it writes sealed history. */
export function isSealedHistoryWrite(issue: Diagnostic): boolean {
  return sealedWrites.has(issue);
}
