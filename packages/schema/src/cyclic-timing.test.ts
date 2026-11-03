import { describe, expect, it } from "vitest";
import {
  cycleIndex,
  cyclicEntryRootMs,
  cyclicLocalTimeMs,
  cyclicOwnershipConflicts,
  cyclicWriterAdmissible,
  resolveBeats,
  resolveCyclicStep,
  secondsKeysToTrack,
  validateCyclicScope,
  wrapMs,
  type CyclicTimingScope,
} from "./cyclic-timing";
import { localTimeMs } from "./timing";

const scope = (id: string, init: Partial<CyclicTimingScope> = {}): CyclicTimingScope => ({
  id,
  parentId: null,
  offsetMs: 0,
  stretch: 1,
  ...init,
});

describe("E014 cyclic timing scopes (prototype)", () => {
  it("leaves affine scopes identical to timing.localScopes", () => {
    const scopes = [scope("a", { offsetMs: 400, stretch: 2 }), scope("b", { parentId: "a", offsetMs: -100, stretch: -0.5 })];
    for (const t of [-500, 0, 250, 1234.5, 9000]) {
      expect(cyclicLocalTimeMs(scopes, "b", t)).toBe(localTimeMs(scopes, "b", t));
    }
  });

  it("wraps an unbounded cycle on both sides of its offset, so the offset is a phase", () => {
    const scopes = [scope("loop", { offsetMs: 28_000, periodMs: 30_000 })];
    expect(cyclicLocalTimeMs(scopes, "loop", 28_000)).toBe(0);
    expect(cyclicLocalTimeMs(scopes, "loop", 29_999)).toBe(1_999);
    // The scene seam at 30s is local 2s; scene 0s is the same instant as 30s.
    expect(cyclicLocalTimeMs(scopes, "loop", 30_000)).toBe(2_000);
    expect(cyclicLocalTimeMs(scopes, "loop", 0)).toBe(2_000);
    expect(cyclicLocalTimeMs(scopes, "loop", 1_500)).toBe(3_500);
    expect(cycleIndex(scopes[0]!, 0)).toBe(-1);
    expect(cycleIndex(scopes[0]!, 58_000)).toBe(1);
  });

  it("uses half-open cycles: the period boundary is the start of the next cycle", () => {
    expect(wrapMs(3_000, 3_000)).toBe(0);
    expect(wrapMs(-1, 3_000)).toBe(2_999);
    // Floating-point residue never returns the period itself.
    const near = wrapMs(-1e-13, 3_000);
    expect(near).toBeGreaterThanOrEqual(0);
    expect(near).toBeLessThan(3_000);
  });

  it("keeps finite repetition distinct from a loop: unentered before, pinned at the end after", () => {
    const sign = scope("sign", { offsetMs: 2_000, periodMs: 500, repeat: 3 });
    expect(cyclicLocalTimeMs([sign], "sign", 1_000)).toBe(-1_000);
    expect(cyclicLocalTimeMs([sign], "sign", 2_000)).toBe(0);
    expect(cyclicLocalTimeMs([sign], "sign", 2_750)).toBe(250);
    expect(cyclicLocalTimeMs([sign], "sign", 3_499)).toBe(499);
    expect(cyclicLocalTimeMs([sign], "sign", 3_500)).toBe(500);
    expect(cyclicLocalTimeMs([sign], "sign", 9_000)).toBe(500);
    expect(cycleIndex(sign, 1_000)).toBe(-1);
    expect(cycleIndex(sign, 3_000)).toBe(2);
    expect(cycleIndex(sign, 9_000)).toBe(3);
  });

  it("composes a stretched cycle under an affine beat scope", () => {
    const scopes = [
      scope("beat", { offsetMs: 10_000 }),
      scope("stride", { parentId: "beat", stretch: 0.5, periodMs: 800 }),
    ];
    // 10s + 1s of beat time at half speed is 2000ms of stride, 2000 mod 800 = 400.
    expect(cyclicLocalTimeMs(scopes, "stride", 11_000)).toBe(400);
    expect(cyclicLocalTimeMs(scopes, "stride", 9_800)).toBe(400);
  });

  it("rejects malformed cycles and orphan repeat counts", () => {
    expect(validateCyclicScope(scope("ok", { periodMs: 1, repeat: 2 }))).toHaveLength(0);
    expect(validateCyclicScope(scope("p", { periodMs: 0 }))[0]?.code).toBe("INVALID_TIMING");
    expect(validateCyclicScope(scope("p", { periodMs: Number.POSITIVE_INFINITY }))[0]?.code).toBe("INVALID_TIMING");
    expect(validateCyclicScope(scope("r", { periodMs: 10, repeat: 1.5 }))[0]?.path).toBe("timingScopes.r.repeat");
    expect(validateCyclicScope(scope("r", { periodMs: 10, repeat: 0 }))).toHaveLength(1);
    expect(validateCyclicScope(scope("r", { periodMs: 10, repeat: 10_001 }))).toHaveLength(1);
    expect(validateCyclicScope(scope("r", { repeat: 2 }))[0]?.message).toMatch(/requires a period/);
    expect(cyclicLocalTimeMs([scope("z", { periodMs: -1 })], "z", 5)).toBeUndefined();
    expect(cyclicLocalTimeMs([scope("x", { parentId: "y" }), scope("y", { parentId: "x" })], "x", 0)).toBeUndefined();
  });
});

describe("E014 streaming and ownership rules (prototype)", () => {
  it("admits a cyclic writer only before the seal reaches the scope's entry", () => {
    const scopes = [
      scope("finite", { offsetMs: 4_000, periodMs: 1_000, repeat: 2 }),
      scope("loop", { periodMs: 1_000 }),
      scope("affine", { offsetMs: 4_000 }),
      scope("nested", { parentId: "finite", offsetMs: 250 }),
    ];
    expect(cyclicEntryRootMs(scopes, "finite")).toBe(4_000);
    expect(cyclicEntryRootMs(scopes, "nested")).toBe(4_250);
    expect(cyclicEntryRootMs(scopes, "loop")).toBe(Number.NEGATIVE_INFINITY);
    expect(cyclicWriterAdmissible(scopes, "finite", 3_000)).toBe(true);
    expect(cyclicWriterAdmissible(scopes, "finite", 4_000)).toBe(true);
    expect(cyclicWriterAdmissible(scopes, "finite", 4_001)).toBe(false);
    expect(cyclicWriterAdmissible(scopes, "loop", undefined)).toBe(true);
    expect(cyclicWriterAdmissible(scopes, "loop", 0)).toBe(false);
    // Affine scopes keep the existing per-interval seal rule.
    expect(cyclicWriterAdmissible(scopes, "affine", 99_000)).toBe(true);
    expect(cyclicWriterAdmissible(scopes, "missing", 0)).toBe(false);
  });

  it("gives a cyclic chain exclusive ownership of the channels it writes", () => {
    const scopes = [
      scope("walk", { periodMs: 1_200 }),
      scope("leg", { parentId: "walk", offsetMs: 300 }),
      scope("other", { periodMs: 900 }),
      scope("beat", { offsetMs: 5_000 }),
    ];
    const conflicts = cyclicOwnershipConflicts(scopes, [
      { id: "stride", scalar: "node:a:transform.rotation", scopeId: "leg" },
      { id: "stride2", scalar: "node:a:transform.rotation", scopeId: "walk" },
      { id: "turn", scalar: "node:a:transform.rotation", scopeId: "beat" },
      { id: "bob", scalar: "node:a:transform.position.y", scopeId: "other" },
      { id: "root", scalar: "node:a:transform.position.y" },
      { id: "x1", scalar: "node:a:transform.position.x" },
      { id: "x2", scalar: "node:a:transform.position.x", scopeId: "beat" },
    ]);
    expect(conflicts).toEqual([
      { scalar: "node:a:transform.rotation", owner: "stride", other: "turn" },
      { scalar: "node:a:transform.position.y", owner: "bob", other: "root" },
    ]);
  });

  it("carries a cyclic step's final state into the next cycle, but not before a finite first cycle", () => {
    const steps = [
      { localMs: 1_000, value: "lit" },
      { localMs: 2_000, value: "dark" },
    ];
    expect(resolveCyclicStep(steps, 1_500, 0, false)).toBe("lit");
    expect(resolveCyclicStep(steps, 500, 3, false)).toBe("dark");
    expect(resolveCyclicStep(steps, 500, -2, false)).toBe("dark");
    expect(resolveCyclicStep(steps, 500, 0, true)).toBeUndefined();
    expect(resolveCyclicStep(steps, 500, 1, true)).toBe("dark");
    expect(resolveCyclicStep(steps, 1_000, 1, true)).toBe("lit");
    expect(resolveCyclicStep([], 0, 0, false)).toBeUndefined();
  });
});

describe("E014 beats and keys in seconds (prototype)", () => {
  it("resolves named beats in order and rejects forward references and duplicates", () => {
    const { beats, diagnostics } = resolveBeats([
      { name: "intro", atMs: 0 },
      { name: "cross", after: "intro", plusMs: 4_400 },
      { name: "turn", after: "cross", plusMs: 900 },
      { name: "early", after: "late", plusMs: 1 },
      { name: "late", atMs: 20_000 },
      { name: "cross", atMs: 1 },
      { name: "negative", after: "intro", plusMs: -1 },
    ]);
    expect(Object.fromEntries(beats)).toEqual({ intro: 0, cross: 4_400, turn: 5_300, late: 20_000 });
    expect(diagnostics.map((entry) => entry.code)).toEqual(["UNKNOWN_TARGET", "DUPLICATE_ID", "INVALID_TIMING"]);
  });

  it("turns timed keys into a track with exact offsets and no percentage rounding", () => {
    const result = secondsKeysToTrack([
      { atMs: 1_000, value: 0 },
      { atMs: 1_001, value: 5, easing: "easeOut" },
      { atMs: 31_000, value: 9 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startMs).toBe(1_000);
    expect(result.durationMs).toBe(30_000);
    expect(result.keyframes.map((key) => key.offset)).toEqual([0, 1 / 30_000, 1]);
    expect(result.keyframes[1]).toEqual({ offset: 1 / 30_000, value: 5, easing: "easeOut" });
    const bad = secondsKeysToTrack([
      { atMs: 0, value: 0 },
      { atMs: 0, value: 1 },
    ]);
    expect(bad.ok).toBe(false);
    expect(secondsKeysToTrack([{ atMs: 0, value: 0 }]).ok).toBe(false);
  });
});
