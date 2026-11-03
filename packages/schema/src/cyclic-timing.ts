import { diagnostic, type Diagnostic, type DiagnosticCode } from "./diagnostics";
import type { TimingScope } from "./types";

function issue(code: DiagnosticCode, path: string, message: string): Diagnostic {
  return diagnostic({ code, phase: "validate", category: "temporal", path, message });
}

/**
 * E014 prototype (decision docs/decisions/engine/time-composition.md).
 *
 * Host/schema helpers for cyclic timing scopes, named beats and keyframes
 * written in seconds. Nothing here is on the wire: Scene IR `TimingScope`
 * still has only offset/stretch, MotionScript has no `period`, `repeat`,
 * `beat` or `at` keyframe syntax, and the registry claims nothing new. The
 * language follow-up is a separate versioned issue.
 */

/** Upper bound on a finite repeat count. Larger counts are a loop, not a repetition. */
export const MAX_CYCLIC_REPEAT = 10_000;

/**
 * A timing scope that may also wrap its local time.
 *
 * - No `periodMs`: the scope is affine exactly as `timing.localScopes`.
 * - `periodMs` with no `repeat`: an unbounded cycle. Local time is the
 *   non-negative modulo of the affine time, before and after the offset alike,
 *   so the offset is a phase and a segment may cross the scene seam.
 * - `periodMs` with `repeat` N: a finite repetition. Before the affine time
 *   reaches 0 the scope is not entered (local time stays negative); for
 *   N periods it wraps; afterwards local time is pinned at `periodMs`, so
 *   tracks follow the ordinary end/fill rules of the last cycle.
 */
export interface CyclicTimingScope extends TimingScope {
  periodMs?: number;
  repeat?: number;
}

/** Non-negative modulo in [0, period). Guards the floating-point edge where the result rounds up to period. */
export function wrapMs(value: number, periodMs: number): number {
  const wrapped = value - periodMs * Math.floor(value / periodMs);
  return wrapped >= periodMs || wrapped < 0 ? 0 : wrapped;
}

export function validateCyclicScope(scope: CyclicTimingScope, path = `timingScopes.${scope.id}`): Diagnostic[] {
  const diags: Diagnostic[] = [];
  if (scope.periodMs === undefined) {
    if (scope.repeat !== undefined) {
      diags.push(issue("INVALID_TIMING", `${path}.repeat`, "repeat requires a period."));
    }
    return diags;
  }
  if (!Number.isFinite(scope.periodMs) || scope.periodMs <= 0) {
    diags.push(issue("INVALID_TIMING", `${path}.periodMs`, "A period must be finite and positive."));
  }
  if (
    scope.repeat !== undefined &&
    (!Number.isInteger(scope.repeat) || scope.repeat < 1 || scope.repeat > MAX_CYCLIC_REPEAT)
  ) {
    diags.push(
      issue("INVALID_TIMING", `${path}.repeat`, `repeat must be an integer in 1..${MAX_CYCLIC_REPEAT}.`),
    );
  }
  return diags;
}

/** One scope's step: affine map, then optional wrap. */
export function applyCyclicScope(scope: CyclicTimingScope, parentMs: number): number | undefined {
  if (!(scope.stretch !== 0) || !Number.isFinite(scope.stretch) || !Number.isFinite(scope.offsetMs)) return undefined;
  const affine = (parentMs - scope.offsetMs) / scope.stretch;
  const period = scope.periodMs;
  if (period === undefined) return affine;
  if (!Number.isFinite(period) || period <= 0) return undefined;
  if (scope.repeat === undefined) return wrapMs(affine, period);
  if (affine < 0) return affine;
  if (affine >= scope.repeat * period) return period;
  return wrapMs(affine, period);
}

/**
 * Cycle number of `scope` at its parent time `parentMs`: floor(affine / period).
 * For a finite repetition the result is clamped to [-1, repeat] where -1 means
 * "not yet entered" and `repeat` means "finished". Undefined for affine scopes.
 */
export function cycleIndex(scope: CyclicTimingScope, parentMs: number): number | undefined {
  const period = scope.periodMs;
  if (period === undefined || !(period > 0) || !(scope.stretch !== 0)) return undefined;
  const affine = (parentMs - scope.offsetMs) / scope.stretch;
  const index = Math.floor(affine / period);
  if (scope.repeat === undefined) return index;
  if (affine < 0) return -1;
  return Math.min(index, scope.repeat);
}

/** Root → leaf, as `localTimeMs`, but honouring cyclic scopes. Cycles or missing ids return undefined. */
export function cyclicLocalTimeMs(
  scopes: readonly CyclicTimingScope[],
  scopeId: string,
  rootMs: number,
): number | undefined {
  const chain = cyclicScopeChain(scopes, scopeId);
  if (!chain) return undefined;
  let time = rootMs;
  for (const scope of chain) {
    const next = applyCyclicScope(scope, time);
    if (next === undefined) return undefined;
    time = next;
  }
  return time;
}

export function cyclicScopeChain(
  scopes: readonly CyclicTimingScope[],
  scopeId: string,
): CyclicTimingScope[] | undefined {
  const byId = new Map(scopes.map((scope) => [scope.id, scope]));
  const leafToRoot: CyclicTimingScope[] = [];
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

/**
 * Earliest root time at which content of `scopeId` can be observed, for the
 * streaming seal rule. An unbounded cycle anywhere in the chain, or a cyclic
 * scope under negative stretch, is observable from -Infinity: every cycle
 * repeats content that may already be sealed. Otherwise it is the root time of
 * local 0 through the first cycle of each finite repetition.
 */
export function cyclicEntryRootMs(scopes: readonly CyclicTimingScope[], scopeId: string): number | undefined {
  const chain = cyclicScopeChain(scopes, scopeId);
  if (!chain) return undefined;
  if (chain.some((scope) => scope.periodMs !== undefined && (scope.repeat === undefined || scope.stretch < 0))) {
    return Number.NEGATIVE_INFINITY;
  }
  let time = 0;
  for (const scope of [...chain].reverse()) {
    if (!(scope.stretch !== 0) || !Number.isFinite(scope.stretch)) return undefined;
    time = time * scope.stretch + scope.offsetMs;
  }
  return time;
}

/**
 * Streaming rule for cyclic scopes. A writer (track or step) may join a scope
 * whose chain contains a cycle only while the sealed frontier has not reached
 * the scope's entry. After that, the new writer would change an earlier,
 * already-sealed cycle. Affine-only chains keep the existing per-interval rule
 * and are always admissible here.
 */
export function cyclicWriterAdmissible(
  scopes: readonly CyclicTimingScope[],
  scopeId: string,
  sealedFrontierMs: number | undefined,
): boolean {
  const chain = cyclicScopeChain(scopes, scopeId);
  if (!chain) return false;
  if (!chain.some((scope) => scope.periodMs !== undefined)) return true;
  if (sealedFrontierMs === undefined) return true;
  const entry = cyclicEntryRootMs(scopes, scopeId);
  if (entry === undefined) return false;
  return sealedFrontierMs <= entry;
}

/**
 * Exclusive ownership: a channel written inside a cyclic chain is owned by
 * that chain. Any other writer on the same scalar (root, affine scope or a
 * different cyclic chain) is a conflict, because the cyclic writer is
 * potentially active at every root time of the scope's span.
 */
export interface ScopedWriter {
  id: string;
  scalar: string;
  scopeId?: string;
}

export function cyclicOwnershipConflicts(
  scopes: readonly CyclicTimingScope[],
  writers: readonly ScopedWriter[],
): { scalar: string; owner: string; other: string }[] {
  const owningCycle = (scopeId: string | undefined): string | undefined => {
    if (!scopeId) return undefined;
    const chain = cyclicScopeChain(scopes, scopeId);
    if (!chain) return undefined;
    const cyclic = [...chain].reverse().find((scope) => scope.periodMs !== undefined);
    return cyclic?.id;
  };
  const byScalar = new Map<string, { writer: ScopedWriter; cycle: string | undefined }[]>();
  for (const writer of writers) {
    const list = byScalar.get(writer.scalar) ?? [];
    list.push({ writer, cycle: owningCycle(writer.scopeId) });
    byScalar.set(writer.scalar, list);
  }
  const conflicts: { scalar: string; owner: string; other: string }[] = [];
  for (const [scalar, list] of byScalar) {
    const owner = list.find((entry) => entry.cycle !== undefined);
    if (!owner) continue;
    for (const entry of list) {
      if (entry === owner || entry.cycle === owner.cycle) continue;
      conflicts.push({ scalar, owner: owner.writer.id, other: entry.writer.id });
    }
  }
  return conflicts;
}

/**
 * Steps inside a cyclic scope (for example a sign alternating two states).
 * At local time L in cycle k the value is the last step at or before L. Before
 * the first step of a cycle, the previous cycle's final step carries over,
 * except before the very first cycle of a finite repetition, where the step
 * contributes nothing (undefined: root steps or the authored base apply).
 */
export function resolveCyclicStep<T>(
  steps: readonly { localMs: number; value: T }[],
  localMs: number,
  cycle: number,
  finite: boolean,
): T | undefined {
  if (steps.length === 0) return undefined;
  const ordered = [...steps].sort((a, b) => a.localMs - b.localMs);
  let found: T | undefined;
  for (const step of ordered) {
    if (step.localMs <= localMs) found = step.value;
    else break;
  }
  if (found !== undefined) return found;
  if (finite && cycle <= 0) return undefined;
  return ordered[ordered.length - 1]?.value;
}

/** A named beat: an absolute time, or a time relative to an earlier beat. */
export type BeatDeclaration =
  | { name: string; atMs: number }
  | { name: string; after: string; plusMs: number };

/**
 * Resolve named beats in declaration order. References must name an earlier
 * beat (no forward references, so a streamed beat never changes after it is
 * read), names are unique, and every resolved time is finite and >= 0.
 */
export function resolveBeats(declarations: readonly BeatDeclaration[]): {
  beats: Map<string, number>;
  diagnostics: Diagnostic[];
} {
  const beats = new Map<string, number>();
  const diagnostics: Diagnostic[] = [];
  declarations.forEach((declaration, index) => {
    const path = `beats[${index}]`;
    if (beats.has(declaration.name)) {
      diagnostics.push(issue("DUPLICATE_ID", path, `Beat ${declaration.name} is already declared.`));
      return;
    }
    let time: number;
    if ("atMs" in declaration) {
      time = declaration.atMs;
    } else {
      const base = beats.get(declaration.after);
      if (base === undefined) {
        diagnostics.push(
          issue("UNKNOWN_TARGET",
            path,
            `Beat ${declaration.name} refers to ${declaration.after}, which is not declared before it.`,
          ),
        );
        return;
      }
      time = base + declaration.plusMs;
    }
    if (!Number.isFinite(time) || time < 0) {
      diagnostics.push(issue("INVALID_TIMING", path, `Beat ${declaration.name} must resolve to a time >= 0.`));
      return;
    }
    beats.set(declaration.name, time);
  });
  return { beats, diagnostics };
}

export interface SecondsKey<V> {
  atMs: number;
  value: V;
  easing?: unknown;
}

/**
 * Keyframes written at times (scene or scope-local milliseconds) rather than
 * percentages. The track starts at the first key and lasts until the last
 * key. Offsets are exact quotients, so the compiled track samples the same
 * values a hand-converted percentage track would, without per-key rounding.
 */
export function secondsKeysToTrack<V>(keys: readonly SecondsKey<V>[]):
  | { ok: true; startMs: number; durationMs: number; keyframes: { offset: number; value: V; easing?: unknown }[] }
  | { ok: false; diagnostics: Diagnostic[] } {
  if (keys.length < 2) {
    return { ok: false, diagnostics: [issue("INVALID_KEYFRAMES", "keys", "At least two timed keys are required.")] };
  }
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (!Number.isFinite(key.atMs)) {
      return {
        ok: false,
        diagnostics: [issue("INVALID_KEYFRAMES", `keys[${index}]`, "Key times must be finite.")],
      };
    }
    const previous = keys[index - 1];
    if (previous && !(key.atMs > previous.atMs)) {
      return {
        ok: false,
        diagnostics: [issue("INVALID_KEYFRAMES", `keys[${index}]`, "Key times must strictly increase.")],
      };
    }
  }
  const startMs = keys[0]!.atMs;
  const durationMs = keys[keys.length - 1]!.atMs - startMs;
  return {
    ok: true,
    startMs,
    durationMs,
    keyframes: keys.map((key, index) => ({
      offset: index === keys.length - 1 ? 1 : (key.atMs - startMs) / durationMs,
      value: key.value,
      ...(key.easing !== undefined ? { easing: key.easing } : {}),
    })),
  };
}
