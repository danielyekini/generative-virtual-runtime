# Engine run 5dc11099: E044 timing.timedKeys (MotionScript 0.23.0)

Run `5dc11099-2700-4d10-ae84-ea15407d7d64`, 3 November 2026. [Issue #197](https://github.com/danielyekini/generative-virtual-runtime/issues/197).
Base: `c40f978`. Worktree `gvr-e044`, branch `claude/brave-babbage-cebomx`.

## Routing

- No untriaged requests: all seven open `kind:request` issues are `triage:accepted`.
- Review clock: two terminal runs since the last review (E039, E014), so no review was due.
- E043 and E044 were both Ready and independent. E044 was claimed first because it is a MotionScript-only change.
- `gh` is unauthenticated in this cloud session, so routing used the connected GitHub issue tools. Project fields were not written; intended status is stated in the issue.

## Result

- **Language:** MotionScript **0.23.0**, capability `timing.timedKeys`. Scene IR stays **0.22.0**, wire `"0.2"`, and no `requires` token is added.
- **Timed keys:** `keyframes` accepts `at <time> <value> [ease …] [spatial …];`. The compiler lowers them through `secondsKeysToTrack`: the track starts at the first key and lasts until the last, with exact-quotient offsets. These are rejected:
  - mixing percentage and timed keys in one track;
  - `start` / `duration` headers alongside timed keys;
  - fewer than two keys, or key times that do not strictly increase.
- **Beats:** `beat <name> at <time | beat ± time>;` declares a compile-time constant. Beats are bound in `pushUnit` before any deferral, so a deferred track cannot read a beat declared after it. These are rejected:
  - duplicate names;
  - unknown or forward bases;
  - negative results;
  - a beat inside a `batch`;
  - beats in MotionScript 0.1.
- **Where a beat may appear:** `start`, key and step `at`, `seal`, `timing offset` and `cue at`. `duration` stays a length and gives an explicit error if it names a beat.
- **Reserved words:** `beat` matches by spelling and is not reserved. A node named `beat` still compiles.
- **Files:**
  - registry row with compiler-only support;
  - version note `0.23.0.md`, plus `pending.md`, the compatibility policy, the grammar, `releases.json` and the combination;
  - authoring reference snapshot `ms-0.23.0_sir-0.22.0-6d6c4269`;
  - Studio example "Timed keys" (`fixtures/motionscript/timed-keys.ms`).
- **Registry test:** a row may now omit `introducedIn.sceneIr`, but only when its runtime and renderer layers are `not-applicable`. Before this, every row had to name a Scene IR release, which would have forced a Scene IR bump with no representation change. AGENTS.md forbids that bump.

## Verification

- `packages/compiler/src/timed-keys.test.ts`, 10 tests:
  - lowering equals the percentage form;
  - eases, spatial tangents and scopes are preserved;
  - all the rejections listed above;
  - beats resolve in every listed position;
  - streaming is identical under all five fragmentations.
- `packages/motionscript-emitter/src/timed-keys.test.ts` exercises the production compiler, `AnimationRuntime` and the emitter:
  - Per-beat `animate` blocks follow the E014 gap/hold rule. The later beat owns the boundary, a fill-forwards writer holds in a gap, and fill none shows the base.
  - The beat fixture, its re-emitted percentage form and a hand-written percentage program sample the same values every 50 ms over 0–6 s, within 1e-8. The emitter writes offsets to 8 significant digits.
- `npm run verify` exit 0:
  - 90 test files and 595 tests;
  - all typechecks and the Studio build;
  - IR manifest and 33 ops tests;
  - capability index fresh;
  - `reference:check ok (ms-0.23.0_sir-0.22.0)`.

## Findings

- The stream linter maps every `INVALID_TIMING` compile diagnostic to `SEALED_HISTORY_WRITE`. Negative beat results and frozen-base rejections therefore get that label too. The cost is low, and it predates this run.
