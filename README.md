# Generative Visual Runtime

Stage 0 freezes the portable scene contract. [`packages/schema/CONTRACT.md`](packages/schema/CONTRACT.md) is the reading version of that contract. Current language versions are in [`packages/schema/capabilities/releases.json`](packages/schema/capabilities/releases.json). Tested support is in [`packages/schema/capabilities/registry.json`](packages/schema/capabilities/registry.json). Evaluation runs are indexed at [`docs/evaluations/README.md`](docs/evaluations/README.md). Fixtures live in `fixtures/ir` and `fixtures/meanings`.

```bash
npm test
npm run validate-ir -- fixtures/ir/valid/minimal.json
npm run validate-ir -- --manifest fixtures/ir/manifest.json
npm run dev:renderer
```

The studio is at `http://localhost:5173`. It opens on one workspace. The left side is the tool set: test scripts, canvas size and DPR, streaming, and import. The right side is the source editor and the inspector. **Stage** in the header plays the product mock: the prompt leaves, a system scene plays, a stand-in scene crossfades in, and the prompt returns at the bottom.

Test scripts group the MotionScript presets with the fixture scenes and frame pictures, rewritten as MotionScript. Compile plays the editor. Compiled, Round-trip, and Both share one clock.

Stream is a toggle on that same document. Run feeds a sealed test script, or the text currently in the editor. Playback runs up to the sealed horizon, waits, and resumes when the rest arrives.

The format sits on the source inspector: **MotionScript**, **Fixture**, **Lottie**, or **SVG**. Compile runs the editor text through that format's compiler. Import then picks a grouped simulation preset, a paste, or an open file. Play imports that text into Scene IR. The report matches `npm run import-fixture` or `npm run import-lottie`. A failed Play leaves the editor text. If a scene is already on the canvas, that scene stays and the status names the attempted fixture and the displayed scene separately. A failed Play with nothing on the canvas clears it. Split plays the imported Scene IR beside the MotionScript round-trip. Static SVG keeps both panes and disables the player. Folder conversion is not connected yet.

Lottie adapter docs live under `formats/lottie/`. Golden files are in `fixtures/import/lottie/`.

SVG adapter docs live under `formats/svg/`. Golden files are in `fixtures/import/svg/`. Static SVG uses a 1000 ms duration and no tracks. Scripts and event handlers produce no scene.

A dataset manifest hashes each source and its MotionScript, stamps adapter and emitter versions, and can filter by status. The filter does not relabel a degraded or partial import as exact. Building the same file list twice yields the same hashes.

Split import is the Split control, or `http://localhost:5173/#import/split`. Open a Lottie or SVG file, paste source, or pick a simulation preset. The left pane plays the imported Scene IR. The right pane emits MotionScript from that scene, compiles it, and plays that Scene IR. One clock drives both. A degraded report explains why the panes can differ.

The round-trip verifier checks that path in tests. It evaluates both scenes at fixed sample times. Geometry and matrices may differ by 0.001. Colour channels may differ by 1/255, because MotionScript stores 8-bit hex. Every exact Lottie fixture must pass. A deliberately wrong position or easing in the emitter is reported as a mismatch.

Stage is the header control, or `http://localhost:5173/#stage`. A prepared system scene starts as soon as the prompt leaves. A separate generated scene stays at time zero until a short crossfade ends, then plays from the start. Cancel puts the prompt back. When the scene finishes, the prompt returns at the bottom. The generated picture is a stand-in, so the handoff can be checked before a model is connected.

```bash
npm run dev:renderer
npm run dev:runtime
```

`PASS` means the document matches the V1 schema. `FAIL` prints a diagnostic code, location, and message. A failed unit does not change an accepted scene.
