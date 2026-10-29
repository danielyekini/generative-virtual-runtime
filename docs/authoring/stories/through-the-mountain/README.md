# Through the Mountain

Duration 30s. Playground preset id `through-the-mountain`, derived from the title.

- [Brief](brief.md): the director script, verbatim as supplied.
- [Language proposal](proposal.md): the implementation retrospective. Unevaluated; see the [index](../README.md#what-these-proposals-are).

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`through-the-mountain.ms`](../../../../fixtures/motionscript/stories/through-the-mountain.ms) | 359 | 162242 | `018a6f8ccc1c468b326031cd3bf8cc7a786a9b74a82a24820ce8a9227996ae86` |
| Builder | [`build-through-the-mountain.ts`](../../../../fixtures/motionscript/stories/build-through-the-mountain.ts) | 332 | 25131 | `07ad552c91b86543f9c9ba8d69a91bb4dcd1afa78a80815b3b34f91c0112783b` |

Hashes recorded 2026-10-29 at commit `c8d71f4529a7157d81c8ba0c32b365ea1758c108`. Regenerate with `npx tsx fixtures/motionscript/stories/build-through-the-mountain.ts`. If the program changes, append new hashes with the date and commit; do not replace these.

Set `GVR_PREVIEW_DIR` to opt into real CanvasRenderer PNG stills in headless Chromium. For example:

```sh
GVR_PREVIEW_DIR=work/mountain-preview npx tsx fixtures/motionscript/stories/build-through-the-mountain.ts
```

## Evidence

[Measurements and sample times](stills/measurements.json), [29 inspected PNG stills](stills/), and [check logs, including base-commit comparisons](checks/) accompany this revision. The PNGs were rendered with Chromium 151.0.7922.173 at 1280 × 720 and device pixel ratio 1. The proposal states the visual limitations and coverage; this is not a full-frame fidelity certification.

The builder's measured internal run time excludes TypeScript process startup; the preview-inclusive measurement includes browser startup and PNG writes. Times are individual observations, not benchmark averages.

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no canonical verification state.
