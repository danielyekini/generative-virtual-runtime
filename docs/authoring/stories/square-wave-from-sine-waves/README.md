# Building a Square Wave from Sine Waves

Duration 30s. Playground preset id `square-wave-from-sine-waves`. The story id was derived from the title.

- [Brief](brief.md): the direction script, as supplied.
- [Language proposal](proposal.md): the retrospective written after the implementation. Unevaluated; see the [index](../README.md#what-these-proposals-are).

**State:** every beat is implemented and checked on evaluated draw items; 27 real-renderer stills were reviewed. The program is 79.6% of the 512 KiB source budget, compiles in about 2.8s in Node, and evaluates at about 21–23 ms per frame. See the proposal.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`square-wave-from-sine-waves.ms`](../../../../fixtures/motionscript/stories/square-wave-from-sine-waves.ms) | 1081 | 417381 | `d7df7f4030ba0db58510f47ada3107939bfefbaf7c9cf75648e79ee102e52a84` |
| Builder | [`build-square-wave-from-sine-waves.ts`](../../../../fixtures/motionscript/stories/build-square-wave-from-sine-waves.ts) | 1069 | 50799 | `22c2c8c671df2b3e25563eeff18a6ee6616b5e8e8588d534fd75a680c4a2643a` |

Hashes recorded 2026-10-29 at commit `4a1801a`. Regenerate with `npx tsx fixtures/motionscript/stories/build-square-wave-from-sine-waves.ts`; set `GVR_PREVIEW_DIR` to also render PNG stills through `CanvasRenderer` in headless Chromium. Three consecutive runs produced the same program hash. If the program changes, append the new hashes with the date and commit; do not replace these.

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no verification state.
