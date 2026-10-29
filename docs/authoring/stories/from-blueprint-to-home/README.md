# From Blueprint to Home

Duration 30s. Playground preset id `from-blueprint-to-home` (derived from the title).

- [Brief](brief.md): the director script, verbatim as supplied.
- [Language proposal](proposal.md): retrospective after implementation and verification. Unevaluated; see the [index](../README.md#what-these-proposals-are).
- [Verification and stills](evidence/README.md): measurements, 40 real-renderer frames, contact sheets and baseline check logs.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`from-blueprint-to-home.ms`](../../../../fixtures/motionscript/stories/from-blueprint-to-home.ms) | 6158 | 437022 | `0654c385882be6bf33469fc92167f2ef6634fd52ce7ec550eaec79659a268130` |
| Builder | [`build-from-blueprint-to-home.ts`](../../../../fixtures/motionscript/stories/build-from-blueprint-to-home.ts) | 277 | 20454 | `b7ff106df1361bcdfe64d89a75c11a0279d5025365e88ac129d2b0fe430a2f5e` |
| Preview helper | [`preview-from-blueprint-to-home.ts`](../../../../fixtures/motionscript/stories/preview-from-blueprint-to-home.ts) | 46 | 3303 | `81bb76ddd15534e07884f00b8fb459f48ced0e32f92606b46b6d97b6bc7c560d` |

Hashes recorded 2026-10-29 at commit `7eb3b9303992ed353afb197a422a50880f0e2981`. Regenerate with `npx tsx fixtures/motionscript/stories/build-from-blueprint-to-home.ts`. To capture production CanvasRenderer PNGs, set `GVR_PREVIEW_DIR=work/home-preview`; previews are not written otherwise. If the program changes, append the new hashes with the date and commit; do not replace these.

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no verification state there. The measured local checks and remaining approximations are recorded in the proposal; repository-wide typecheck and Vitest both retain failures reproduced on the base commit.
