# Operating structure installation receipt

30 October 2026. Work item [OPS001 #13](https://github.com/danielyekini/generative-virtual-runtime/issues/13).
State: **prepared; live Project setup and integration incomplete**. Routing config
intentionally remains `installed=false`. Target board is the user-selected [Generative Virtual Runtime #3](https://github.com/users/danielyekini/projects/3), verified publicly. Its node/field IDs and writes still await authentication.

## Actual preparation

- Extracted pack v1, validated manifest/schema/links, ran all 11 bundled tests.
- Reconciled against main `8edfaab10dd4cc7d402238848645dce1efebd926` (PR #11 merged).
  No newer main changes at initial reconciliation. Reused its handover, decisions
  and known delta reproduction; no capacity/Circle experiment was repeated.
- Applied conflict-free overlay. Installed five canonical repo-local personas,
  compact startup navigation, charter/requirements/directions, decision and
  migration map. Preserved released contracts and historical evidence/programs.
- Created 44 seed issues exactly once after searching existing work (only unrelated
  Test 1 #12 existed). Keys/actual URLs are in config; no installed seed queue.
  Parent task links and explicit dependency markers are on live issues. All 48
  supplied audit themes resolve through that map. Native subissues await a real probe.
- Created independent static clock issues: [Engine #57](https://github.com/danielyekini/generative-virtual-runtime/issues/57)
  and [Product #58](https://github.com/danielyekini/generative-virtual-runtime/issues/58).
  Both start at zero; installation/intake did not fabricate terminal run records.
- Read back issue writes, E001's marked PR #11 handover, accepted X001 intake and
  P001 worker labels. Marked X001 accepted into E018; X002 accepted into P002/P005.
  Cross-lane requests remain orchestrator-only routing. E001/P001 are first intended
  worker selections; E018 is independent second engine work. Product's later tasks
  depend on the initial slice/shared contracts; do not manufacture a second Ready
  task by starting speculative late-stage delivery work.
- Added `npm run verify` and matching GitHub Actions workflow. Existing protections
  were not changed. Full-test, final integration, self-merge and own-branch cleanup
  requirements are on every persona. No deployment or package publishing occurred.

## Checks and their limits

| Check | Observed result |
| --- | --- |
| Pack validation + tests | PASS, 11/11 |
| Complete repository tests | PASS, 221/221 across 31 files after OPS002 repair |
| All existing typechecks / Studio production build | PASS; existing build bundle-size warning retained |
| Schema fixture manifest | PASS |
| Installed operations acceptance | PASS locally: 16 tests; independent clocks, concurrent review, dedup, intake clearance/new updates, worker filters/dependencies, recovery/handovers, PR lifecycle, pagination, config/persona structure |
| Capability index | Generated from current releases/registry; freshness check PASS |
| Issue/label/comment API | Actual create/update/readback PASS |
| Projects v2 read/write, fields, link, native hierarchy | BLOCKED: connector has no Projects tools; local CLI/API unauthenticated |
| Actual live dispatcher selecting E001/P001 | BLOCKED until Project IDs/fields/readback are available; config fails closed |
| Runtime persona discovery | Five canonical SKILL.md files and root invocation/path routing verified; this Work runtime has no repo-skill auto-discovery/agent CLI. Explicit SKILL.md path is the supported fallback; no personal/global installation |
| Duplicate installation | Bundled planner stable-key test PASS; one live issue set created. Actual second authenticated Project setup remains NOT_RUN |
| Live requests after run one / fifth-run reviews | Helper behavior PASS; no synthetic terminal runs posted to production ledgers. Live API scenario remains NOT_RUN |
| PR creation/merge/cleanup / final-main gate | Pending live setup and final verification; no premature merged claim |

Initial full tests exposed two inherited `tsx` wrapper IPC failures (219 passed,
2 failed) in the managed environment. [OPS002 #59](https://github.com/danielyekini/generative-virtual-runtime/issues/59)
replaces one-shot wrappers with Node `--import tsx`, including CLI subprocess
tests. The same entrypoints, output and failure-code assertions remain; no test
was skipped, weakened or removed. No sandbox permissions were bypassed.

## Exact continuation

Authenticate GitHub CLI once for repository, Projects and workflow writes. The
existing GitHub connector already has repository write/admin access but cannot
lend its credential to the CLI or expose Projects operations. No token should be
pasted into issues, documents or chat. The prepared setup helper accepts none.

With authenticated `gh` on PATH:

```sh
python3 tools/gvr-ops/complete_setup.py
python3 tools/gvr-ops/complete_setup.py --apply
```

The helper targets the configured Project #3 and actual issue keys, verifies identities,
links the repository, creates fields/items, gates dependencies, tries/readbacks
native subissues, and creates/reuses repository milestones for M1–M6. Existing
board items/options are retained, with an exact-value recovery snapshot before
field-option changes. It leaves `installed=false`;
schema/API behavior must be verified live before calling the installation complete.
Never reset existing populated board field values from installation intentions.

Finish views for Engine, Product, Milestones, Requests and Human verification.
Worker views exclude `audience:orchestrator`/reviews. Verify live API round trips,
request intake and route/context for both lanes, then set installed true and
record actual board/field/view IDs in config. Verify absence of background wake.
Recheck main; run the entire final gate; open the linked passing installation PR,
self-merge if protections permit, read back merged state/SHA, update main and
remove only this run's merged remote/local branch. Leave OPS001 open until its
full gate is met. Preserve OPS002's verification evidence and close only its
completed repair scope upon integration.

First invocations after completion: `$gvr-engine-run` -> [E001 #20](https://github.com/danielyekini/generative-virtual-runtime/issues/20),
`$gvr-product-run` -> [P001 #42](https://github.com/danielyekini/generative-virtual-runtime/issues/42).
Direct orchestrators: `$gvr-engine-orchestrator`, `$gvr-product-orchestrator`;
steering: `$gvr-direction-change`.

## Current steering and continuation

Use Generative Virtual Runtime and the `generative-virtual-runtime` repository
identity. Current description: “GVR is a virtual runtime environment for live,
on-the-fly generated software.” Current descriptions use that identity directly.
Captured logs, audited excerpts and historical machine paths retain original
measured bytes; this does not grant current support to future sound/interaction.

Use the existing Project #3, not a second delivery board. OPS002 and OPS003 are
installation children of OPS001; lane work remains nested under M1–M6 goal issues,
with matching repository milestones for overarching goals. The current GitHub
repository still needs its authenticated identity/description update. The setup
helper resolves stable repository ID 1409281098, applies the intended identity,
updates origin and then operates on the canonical server-returned name. It does
not assume an intended URL already exists.
