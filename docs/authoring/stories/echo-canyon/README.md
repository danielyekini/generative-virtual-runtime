# ECHO Canyon

Duration 20s. Playground preset id `echo-canyon`.

- [Brief](brief.md): the director script, as supplied.
- [Language proposal](proposal.md): the retrospective written after the implementation. Unevaluated; see the [index](../README.md#what-these-proposals-are).
- [Stills](stills/): six contact sheets of the 34 frames rendered through the real `CanvasRenderer` in headless Chromium, labelled with their times.

**State:** every beat is implemented and asserted on evaluated draw items, and the preset compiles and plays in the playground. The camera push is a perspective dolly baked into nine rock fins; there is no audio. The runtime paints in declaration order, not `zIndex` order, once any compositing group exists, so the program declares nodes in paint order. See the proposal.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`echo-canyon.ms`](../../../../fixtures/motionscript/stories/echo-canyon.ms) | 1926 | 125073 | `c2299831f3c0a3e0915cb87a0eabd9d66f61311a94a385cec1caaa5bc3a02c32` |
| Builder | [`build-echo-canyon.ts`](../../../../fixtures/motionscript/stories/build-echo-canyon.ts) | 1312 | 62194 | `178e0623080450658869fd09f4fce23a5ba8ede6a6ea6fee6ef09220fb46b255` |

Hashes recorded 2026-10-29 at commit `a1b4e43`, which added the story on top of `97c9c2b`. Regenerate with `npx tsx fixtures/motionscript/stories/build-echo-canyon.ts`; the output is deterministic (seeded rock noise). Set `GVR_PREVIEW_DIR` to also write PNG stills through the real `CanvasRenderer` in headless Chromium. If the program changes, append the new hashes with the date and commit; do not replace these.

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 125,073 bytes | 524,288 (`maxSourceBytes`) |
| Nodes | 173 (68 groups, 96 paths, 8 ellipses, 1 rectangle) | 500 |
| Depth | 9 | 16 |
| Tracks | 138 (18 expression, 120 keyframe) | 1,000 |
| Keyframe values | 1,003 | |
| Steps | 0 | 1,000 |
| Path commands + polygon vertices | 2,663 | 10,000 |

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no verification state.
