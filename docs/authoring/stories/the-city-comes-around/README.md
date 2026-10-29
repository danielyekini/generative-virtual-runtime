# The City Comes Around

Duration 30s, one seamless loop. Playground preset id `the-city-comes-around`.

- [Brief](brief.md): the direction script, as supplied.
- [Language proposal](proposal.md): the retrospective written after the implementation. Unevaluated; see the [index](../README.md#what-these-proposals-are).

**State:** every beat is implemented and asserted on evaluated draw items. 0:00 and 0:30 render the same image in the real `CanvasRenderer`: 1 of 921,600 pixels differs by more than 8 levels. Evaluation takes about 90 ms per frame in Node and compiling takes about 10 s, so the preset will not play back at full frame rate. See the proposal.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`the-city-comes-around.ms`](../../../../fixtures/motionscript/stories/the-city-comes-around.ms) | 2398 | 232949 | `f43623cdc4a6ff95f66652446e0914c00c8f2be3d3d87497ef340b340aa80c72` |
| Builder | [`build-the-city-comes-around.ts`](../../../../fixtures/motionscript/stories/build-the-city-comes-around.ts) | 2193 | 100166 | `f4c7d855b490af6d06852f97390c616e76acc868a50276b41cd003700a1602c6` |

Hashes recorded 2026-10-29. They were taken on a working tree based on commit `6b951be`, and they are the bytes committed in the commit that adds this story (see the change log of the [index](../README.md#change-log)). Regenerate with `npx tsx fixtures/motionscript/stories/build-the-city-comes-around.ts`; the output is deterministic. Set `GVR_PREVIEW_DIR` to also write PNG stills through the real `CanvasRenderer` in headless Chromium. If the program changes, append the new hashes with the date and commit; do not replace these.

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 232,949 bytes | 524,288 (`maxSourceBytes`) |
| Nodes | 482 | 500 |
| Tracks | 185 (176 expression, 9 keyframe) | 1,000 |
| Steps | 12 | 1,000 |
| Path commands + polygon vertices | 9,427 | 10,000 |

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no verification state.
