# Engine run a130fd66: engine review + E047 stream-linter sealed-write truth

Run `a130fd66-e725-442f-b345-a1630ab17c03`, 3 November 2026. Base: `245e150`.
Worktree `gvr-e047`, branch `claude/kind-knuth-bx2lfv`.

## Routing

- No untriaged requests: every open `kind:request` issue is `triage:accepted`.
- Review clock: five unreviewed runs (E039, E014, E044, E043, E019), so the review was due. This run switched to the engine orchestrator first.
- `gh_context.py` cannot run in cloud sessions, for the same reasons recorded by `00f04d24`. Routing used the connected GitHub issue tools. Project fields were not written; status is stated in the issue bodies.

## Review (orchestrator)

- Inspected: `F61104F0` (E039), `00f04d24` (E014), `5dc11099` (E044), `b2ff7b2a` (E043), `8812fbed` (E019). All five are complete, with no partial or failed outcome.
- Outcome mining:
  - E044 Finding: the stream linter turned every `INVALID_TIMING` into `SEALED_HISTORY_WRITE`. Filed **E047 #207** (Ready) and fixed it in this run.
  - E043 Finding: composition-instance `timingScopeId` is inert. Filed **E048 #208** as an evidence-gated Candidate.
  - A recurring tooling failure appears in every run: `gh_context.py`, the stale repository name in `config.json`, and remote branch deletion refused by the proxy (`cleanup_pending` in each record). Filed joint **#209** as a Candidate. It needs product orchestrator acknowledgement, because the tooling is shared.
  - E019 limits (no real-browser memory measurement; Studio acquires images lazily) are already covered by E045.
- Promoted **E045 #204** to Ready. Ready order: E047, then E045.
- Decision: continue, with no process change.

## E047 outcome

- New `packages/compiler/src/sealed-write.ts`: `sealedHistoryWrite()` builds the `INVALID_TIMING` diagnostic for a write behind the sealed horizon. It sets `sceneTimeMs` to that horizon and registers the object in a module `WeakSet`. `isSealedHistoryWrite()` reads the mark, so no message-text matching is needed.
- Marked sites:
  - track start before the seal;
  - step before the seal;
  - cue before the seal;
  - entity activation before the seal;
  - late cyclic writers (tracks and steps; E043).
- `lintStreamingAuthorship` reports `SEALED_HISTORY_WRITE` only for marked diagnostics. Every other `INVALID_TIMING` falls through to `COMPILE_ERROR`. Examples: negative beats, out-of-duration steps, `repeat` without `period`, a frozen base after the seal.
- The public diagnostic code is unchanged. No language version change.
- The generation reference was regenerated because `stream-lint.ts` is a hashed authority. The new snapshot is `ms-0.24.0_sir-0.23.0-93a226e2`, and its text is unchanged apart from the hash.

## Verification

- `packages/compiler/src/stream-lint-sealed-write.test.ts`, 6 tests:
  - a negative beat, an out-of-duration step, `repeat` without `period` and a frozen base are not labelled as sealed writes;
  - a late track, step, cue and cyclic writer are labelled, each with `sceneTimeMs` set to the horizon;
  - the code stays `INVALID_TIMING`.
- `npm run verify` exit 0: 97 test files and 640 tests, all typechecks, the Studio build, the IR manifest, 33 ops tests, the capability index, and `reference:check ok (ms-0.24.0_sir-0.23.0, 93a226e2)`.

## E045 outcome (second ticket, same run)

E047 merged as PR #210 (`4fa94ec`). The designated branch was then restarted from main for E045 ([#204](https://github.com/danielyekini/generative-virtual-runtime/issues/204)).

- **Language:** MotionScript **0.25.0** / Scene IR **0.24.0**, capabilities `resources.imageSampling` and `resources.spriteFrames`, wire `"0.2"`.
  - `sampling smooth|pixelated;` sets `ImageNode.sampling`, which overrides the host renderer default.
  - `frames (columns, rows);` lowers onto `ImageResource.frames`.
  - `frame <n>;` sets the static `ImageNode.frame`. The `frame` track channel supports animate, keyframes, timed keys and local and cyclic scopes.
  - Sampling floors the value, then clamps it to the row-major grid. The renderer derives cell rectangles from the decoded size.
  - None of the new words are reserved. The grammar now describes `image` nodes, which it never did before.
- **Studio:** the player calls `renderer.images.prepare(scene.resources)` on run and stream start. Each frame it checks `sceneImageReadiness` against the cache states before the clock ticks:
  - a pending image shows "holding for images";
  - a failed image blocks playback with a note;
  - `images.onChange` triggers a redraw while paused;
  - the probe reports `images`.

  The new test frame is "Sprite frames" (`fixtures/motionscript/frames/sprite-frames.ms`). Its atlas is `app/playground/public/images/walker-atlas.png`, generated as 4 × 2 cells of 8 × 8 texels.
- **Files:** two registry rows, plus the `resources.image` restriction pointing at them; `releases.json` and the combination; version notes `motionscript/0.25.0.md` and `scene-ir/0.24.0.md`; both `pending.md` files; the compatibility policy; an implementation note in the resource-lifecycle decision; the reference snapshot `ms-0.25.0_sir-0.24.0-c769a558`; and patch bumps for the six affected packages.

### E045 verification

- New tests, 20 in total:
  - compiler: 6 (lowering, capabilities, the frame track and grid rule, rejections, unreserved words, five fragmentations, a late frame writer reported as `SEALED_HISTORY_WRITE`);
  - schema: 4 (capability gates, domains, grid requirement);
  - runtime: 4 (even stepping with a hold, cyclic loop, static frame, clamping);
  - renderer: 3 (row-major source rect, animated frames with the node sampling override, plain image unchanged);
  - emitter: 1 round-trip test, comparing geometry every 50 ms over 0–4 s.
- **Real Chromium**, built Studio with the production `CanvasRenderer` (`vite preview`):
  - The poster `e045-sprite-frames-poster.png` shows smooth vs crisp texels and still frame 5.
  - After Run, `images.states` are all `ready`, and sampled cells at 0 / 150 / 450 / 850 ms are 0 / 1 / 4 / 0 (looped).
  - With the atlas response held, `holding: true`, `timeMs: 0` and the note "waiting for image …". Releasing it resumes playback.
  - With the request aborted, the states are `failed` and the note reads "playback blocked".
- `npm run verify` exit 0: 102 test files and 658 tests, all typechecks, the Studio build, the IR manifest, ops tests, the capability index, and `reference:check ok (ms-0.25.0_sir-0.24.0, c769a558)`.

### Findings

- Every parse-time node-property note (for example `sign bogus`) appears twice in compile diagnostics. This predates E045. The E045 test asserts on content only.
- The Studio poster draws images through the lazy path before Run. That is intentional, and readiness gates only playback.
