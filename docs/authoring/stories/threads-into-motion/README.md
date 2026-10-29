# Threads into Motion

Duration 30s. Playground preset id `threads-into-motion`, derived from the title.

- [Brief](brief.md): the director script, verbatim as supplied.
- [Language proposal](proposal.md): the unevaluated implementation retrospective; see the [index](../README.md#what-these-proposals-are).
- [Verification](verification.json): measurements, check outcomes and original capture hashes.
- [Canvas stills](stills/contact-1.jpg): four numbered contact sheets cover all 35 inspected times. Full-size selected views are also retained in `stills/`.

## Program

| Role | Path | Lines | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Program | [`threads-into-motion.ms`](../../../../fixtures/motionscript/stories/threads-into-motion.ms) | 2264 | 481150 | `0865759daad061228c4027fab3f3310b58597806a05491a80c6292245309e702` |
| Builder | [`build-threads-into-motion.ts`](../../../../fixtures/motionscript/stories/build-threads-into-motion.ts) | 269 | 24216 | `28cac84c8ddf2f7ee2cf6baca1011174e77e04789a3ed7b9b1143a4ec8358f4d` |

Hashes recorded 2026-10-29 at commit `5901cf775654aaffd682acd15793f4ae2397cbef`. Regenerate with `npx tsx fixtures/motionscript/stories/build-threads-into-motion.ts`. Set `GVR_PREVIEW_DIR=work/threads-into-motion` to capture real CanvasRenderer PNGs in headless Chromium. If the program changes, append dated hashes and their commit rather than replacing these.

The program is a story plate, not a registered authoring sample. It has no revision in the [sample registry](../../../../evaluation/authoring/manifests/samples.json) and no formal verification state. The proposal records remaining brief-fidelity gaps and the repository checks that also fail on the base commit.
