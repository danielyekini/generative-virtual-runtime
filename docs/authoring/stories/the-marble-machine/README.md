# The Marble Machine

Duration 35s. Playground preset id `the-marble-machine`, derived from the supplied title.

- [Brief](brief.md): the director script, as supplied.
- [Language proposal](proposal.md): the retrospective written after implementation and verification. Unevaluated; see the [index](../README.md#what-these-proposals-are).

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`the-marble-machine.ms`](../../../../fixtures/motionscript/stories/the-marble-machine.ms) | 142 | 48476 | `322d7fc7c35bc714f59c6c360ed824e162a4227b16fb028e2a0b5a5700407b28` |
| Builder | [`build-the-marble-machine.ts`](../../../../fixtures/motionscript/stories/build-the-marble-machine.ts) | 245 | 18861 | `f841cb20c70b802a77d3b39386e964b9a7492baa82a47102933ca1d494771458` |
| Preview helper | [`the-marble-machine-preview.ts`](../../../../fixtures/motionscript/stories/the-marble-machine-preview.ts) | 29 | 3421 | `df31a48899f8b7037a41c0df77b7adfc3ef92d699005fa3d1b78b61cfcdcee54` |

Hashes recorded 2026-10-29 at commit `058b4fd0ac0743f6819e88b18f9a1b0c50813620`. Regenerate with `npx tsx fixtures/motionscript/stories/build-the-marble-machine.ts`. Set `GVR_PREVIEW_DIR` to an output directory to render PNG stills through the real CanvasRenderer in headless Chromium. The helper and builder require Node 22+ (verified here with Node 24.19.0). If the program changes, append new hashes with the date and commit; do not replace these.

## Evidence

[Contact sheet](evidence/contact-sheet.png): all 36 reviewed stills, including every beat boundary. Full-size retained frames: [0s](evidence/f0.00.png), [7s](evidence/f7.00.png), [17.5s](evidence/f17.50.png), [23s](evidence/f23.00.png), [29s](evidence/f29.00.png), [35s](evidence/f35.00.png). The five non-opening frames were also inspected individually at full size. See [capture manifest](evidence/manifest.json), [metrics](evidence/metrics.json), [browser metadata](evidence/capture.json) and the proposal for measured scope and explicit fidelity gaps.

Builder checks pass. Repository typecheck and Vitest fail on both this implementation and base `7f1e95b`; exact output is retained in `evidence/` and explained in the proposal. No capability, published version, pending draft, contract or resource limit was changed.

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no canonical verification state.
