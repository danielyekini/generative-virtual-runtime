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
