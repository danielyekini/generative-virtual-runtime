# Engine run b2ff7b2a: E043 timing.cyclicScopes (MotionScript 0.24.0 / Scene IR 0.23.0)

Run `b2ff7b2a-7bd7-470e-a669-1d2affbdae72`, 3 November 2026. [Issue #196](https://github.com/danielyekini/generative-virtual-runtime/issues/196).
Base: `05623b8`. Worktree `gvr-e043`, local branch `engine/196-cyclic-scopes`, pushed to `claude/vigilant-wozniak-y8g56g`.

## Routing

- No untriaged requests: all seven open `kind:request` issues are `triage:accepted`.
- Review clock: three terminal runs since the last review (E039, E014, E044), so no review was due.
- E043 was the only Ready engine item; its dependency E014 is Done.
- `gh` is unauthenticated in this cloud session, so routing used the connected GitHub issue tools. Project fields were not written; the intended status is stated in the issue.

## Result

- **Language:** MotionScript **0.24.0** and Scene IR **0.23.0**, capability `timing.cyclicScopes`, wire `"0.2"`. The compiler adds `timing.cyclicScopes` beside `timing.localScopes` when a `timing` declares a `period`.
- **Syntax:** `timing <id> { period <duration>; repeat <n>; }`, and an optional trailing `timing <scope>;` on `step`. `period` and `repeat` match by spelling and are not reserved words, so nodes with those names still compile.
- **Scene IR:** `TimingScope.periodMs` / `repeat` and `StepDefinition.timingScopeId`. Either one without the capability is `MISSING_REQUIRED`.
- **Sampling:** this promotes the E014 prototype (`cyclicLocalTimeMs`, `resolveCyclicStep`) into `sampleScene`.
  - An unbounded cycle wraps on both sides of its offset, so the offset is a phase.
  - Cycles are half-open.
  - A finite repeat is not entered before its first cycle and is pinned after its last.
  - Steps carry the previous cycle's final value into the next cycle.
  - **Release tightening:** everything below an unentered finite repeat is also unentered (−∞). Without this, a nested unbounded cycle wrapped negative time back into activity.
- **Validation:**
  - Cyclic tracks and steps must lie inside one period of their innermost cycle, measured through affine child scopes.
  - Overlap is checked per cycle, in that cycle's local frame.
  - Exclusive ownership (`cyclicOwnershipConflicts`) covers tracks and steps.
  - Scoped steps need a chain that contains a period.
- **Streaming:**
  - The compiler and delta admission use `cyclicWriterAdmissible`. Every writer of an unbounded cycle must arrive before the first seal. A finite repeat accepts writers until the seal reaches its entry.
  - The stream linter reports late cyclic writers as `SEALED_HISTORY_WRITE`, through its existing `INVALID_TIMING` mapping.
- **Emitter:** writes `period`, `repeat` and step `timing`.
- **Files:**
  - registry row;
  - `releases.json` and the language combination;
  - version notes `motionscript/0.24.0.md` and `scene-ir/0.23.0.md`;
  - both `pending.md` files, the compatibility policy, the grammar, the README and the decision notes;
  - generation reference snapshot `ms-0.24.0_sir-0.23.0-b67c19a9`;
  - Studio **test frame** "Cyclic scopes" (`fixtures/motionscript/frames/cyclic-scopes.ms`, under Test frames, not Stories).
- **Out of scope (recorded):** composition instances on cyclic scopes. Instance timing remains inert in the runtime.

## Verification

- `packages/runtime/src/cyclic-scopes.test.ts`, 8 tests. The E014 evidence is re-expressed as compiled MotionScript with no host mapping:
  - City's van as nine timed keys in `period 30s`, within the story's 0.051 rounding bound of the `t % 30` expression, and exact at +30s;
  - Circle's fall as one easeIn segment in a cycle phased to 28s, with velocity continuous across the seam;
  - the finite repeat lifecycle;
  - the test-frame blink and phase;
  - unbounded step carry;
  - affine scopes unchanged;
  - streamed admission: a late unbounded writer is rejected, and a finite writer before its entry is accepted.
- `packages/compiler/src/cyclic-scopes.test.ts`, 7 tests: lowering and capabilities, non-reserved words, domain errors, the one-period rule, affine-scope steps, shared channels, and the seal rules with the linter.
- `packages/schema/src/cyclic-scopes.test.ts`, 8 tests: validator domains, the capability gate, spans through child scopes, ownership, and nested not-entered behaviour.
- `packages/motionscript-emitter/src/cyclic-scopes.test.ts`: the test frame round-trips with identical scopes, steps and draw items.
- `npm run verify` exit 0:
  - 94 test files and 619 tests;
  - all typechecks and the Studio build;
  - IR manifest and ops tests;
  - capability index fresh;
  - `reference:check ok (ms-0.24.0_sir-0.23.0)`.

## Findings

- Composition instances carry a `timingScopeId` that the runtime does not apply. No issue was filed because no story needs it yet.
- Ready queue: with E043 and E044 Done, the engine Ready list is empty. The next run should replenish from the M2/M4/M5 Candidates.
