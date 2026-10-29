# One Ball, Four Worlds

Duration 30s. Playground preset id `one-ball-four-worlds`, derived from the title.

- [Brief](brief.md): the director script, verbatim as supplied, dated 2026-10-29.
- [Language proposal](proposal.md): the implementation retrospective. Unevaluated; see the [index](../README.md#what-these-proposals-are).
- [Player with sound](player.html): self-contained real CanvasRenderer/AnimationRuntime companion with locally synthesized audio, play/pause and scrubbing. Serve this directory over HTTP if local-file navigation is restricted. The existing MotionScript playground preset is silent.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`one-ball-four-worlds.ms`](../../../../fixtures/motionscript/stories/one-ball-four-worlds.ms) | 178 | 331499 | `aebdfdb14622f860578823c75141b9dccab87146a4a63cb0a22e915b5b90f642` |
| Builder | [`build-one-ball-four-worlds.ts`](../../../../fixtures/motionscript/stories/build-one-ball-four-worlds.ts) | 398 | 34942 | `54cac2a8704144f8ad4d131ea1216c68dc6ec90bda2e93587bbaf8813e675f61` |

Hashes recorded 2026-10-29 at commit `c40420b03b353ceb625980e6008bbdd195c2eb96`. That commit contains both hashed files. Regenerate with `npx tsx fixtures/motionscript/stories/build-one-ball-four-worlds.ts`. Never edit the `.ms` by hand. If the program changes, append new hashes with the date and commit; do not replace these.

Set `GVR_PREVIEW_DIR` to opt into real CanvasRenderer PNG stills in headless Chromium and a bundled sound companion. For example:

```sh
GVR_PREVIEW_DIR=work/worlds-preview npx tsx fixtures/motionscript/stories/build-one-ball-four-worlds.ts
```

Without that environment variable the builder emits the program, compiles, validates, checks rendered state, measures evaluation and prints measurements; it writes no preview assets. The builder exits non-zero on any compiler diagnostic, invalid IR or failed assertion. Chromium is discovered through the repository harness (`GVR_CHROME` / `CHROME_PATH` are supported).

## Evidence

[Measurements and sample times](stills/measurements.json), [unit measurements](stills/unit-metrics.json), [49 inspected PNG stills](stills/), [their hashes](stills/SHA256SUMS.json), and [check logs including base-commit comparisons](checks/) accompany this revision. The PNGs were rendered with Chromium 151.0.7922.173 at 1280 × 720 and DPR 1. The proposal records approximations and the scope of verification; this is not a full-frame fidelity certification.

The inspected times, in seconds, are:

```text
0, 1, 2.5, 3, 3.12, 4, 5, 6, 6.5, 7, 7.5, 8,
9, 10, 11, 12, 13, 13.5, 14, 14.5, 15, 15.5, 15.65, 16,
16.5, 16.7, 17.25, 17.45, 18, 18.2, 18.5, 19, 20, 20.5, 21, 21.5,
22, 22.5, 23, 24, 24.5, 25, 26, 27, 28, 28.5, 29, 29.983333, 30
```

All 1,801 60 fps reference times from 0 through 30s also receive rendered-centre continuity and viewport checks. Named contacts compare the actual evaluated ground path against the rendered ball, including squash. This is independent of the builder's trajectory model.

[Browser smoke evidence](checks/browser-smoke.json) records successful playground compilation, emitted round-trip, seeking and playback, plus companion playback, scrubbing and nonzero audio signal at 15 sound-cue samples. The [retained smoke harness](checks/browser-smoke.ts) runs from the repository root after generating `work/worlds-preview`; it uses localhost HTTP and the existing Chrome harness. Audio timbre was not reviewed by listening.

The builder's measured internal run time excludes TypeScript process startup. Preview-inclusive time includes companion bundling, browser startup and PNG writes. Timings are worker observations with visible variability, not benchmark averages. Counts and hashes refer to the implementation commit above.

The program is a story plate, not a registered authoring sample. It has no revision in the sample registry and no canonical verification or training eligibility state. Base failures were reproduced at `b7e8459b7f569862bb79325c309c33adc425de8d` in an isolated detached worktree; existing files responsible for them were not changed.

## Concurrent catalog merge

The shared `work` branch advanced while this plate was being implemented. Its Marble Machine, Threads into Motion and Last Streetlight additions were merged without changing either hashed Four Worlds source file. The combined index is revision 1.11. The merged builder, playground build, typecheck and Vitest checks were repeated: builder and production build pass; typecheck retains the same 12 base-reproduced errors and Vitest retains the same one base-reproduced fixture failure. [Merged logs](checks/) are retained separately from the hash-associated baseline. The brief retains supplied Markdown hard-break spaces, and raw Vitest logs retain their generated whitespace; those produce expected `git diff --check` warnings.

PR #9 main-branch conflict resolution additionally preserves the Pixels, Square Wave and City presets and records from `main`. The combined story index is revision 2.1. Catalog-union assertions, production build and browser playback pass; the same 12 TypeScript errors and one fixture test failure remain. Separate `checks/pr9-main-merge-*` logs retain this verification. The story builder and generated program hashes remain unchanged.

While PR #9 was being verified, main advanced again with ECHO Canyon. That story and its theme evidence are preserved in index revision 2.2. The repeated production build and catalog-union checks pass; the final typecheck and Vitest results remain the same known failures. The final repeat logs are retained as `checks/pr9-echo-merge-*`.
