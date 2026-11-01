# Operating structure installation receipt

Updated 1 November 2026. Work item [OPS001 #13](https://github.com/danielyekini/generative-virtual-runtime/issues/13).
State: **GitHub structure configured; final authenticated routing and integration incomplete**.
Routing config remains `installed=false` until the full live gate passes. The
user-selected [Generative Virtual Runtime #3](https://github.com/users/danielyekini/projects/3)
has verified project/field IDs in config. The repository identity and description
have been updated and read back from GitHub.

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
  supplied audit themes resolve through that map. All 39 native parent-child links are verified, with 6 repository milestones and
  43 milestone assignments. There are 48 stable-key issues including the two clocks
  and OPS002/OPS003; acceptance fixtures are separate and closed.
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
| Installed operations acceptance | PASS locally: 25 tests; independent clocks, concurrent review, dedup, intake clearance/new updates, worker filters/dependencies, recovery/handovers, PR lifecycle, pagination, config/persona structure |
| Capability index | Generated from current releases/registry; freshness check PASS |
| Issue/label/comment API | Actual create/update/readback PASS |
| Project structure | 48 keyed members plus existing Test 1; fields, repository link, 39 native links and 6 milestones configured/read back on 30 October. Public identity/fields/hierarchy rechecked 1 November; fresh authenticated membership readback pending |
| Actual live dispatcher selecting E001/P001 | BLOCKED until Project IDs/fields/readback are available; config fails closed |
| Runtime persona discovery | Five canonical SKILL.md files and root invocation/path routing verified; this Work runtime has no repo-skill auto-discovery/agent CLI. Explicit SKILL.md path is the supported fallback; no personal/global installation |
| Duplicate installation | Bundled planner stable-key test PASS; one live issue set created. Actual second authenticated Project setup remains NOT_RUN |
| Live requests / independent fifth-run reviews | PASS using isolated fixtures #63/#64: request updates and new sessions retrigger intake, interrupted claims retain handover, duplicate terminal record counts once, Engine review covers exactly five records while concurrent sixth and Product record remain. Full dispatcher round trip pending; real clocks #57/#58 remain empty |
| PR creation/merge/cleanup / final-main gate | Pending live setup and final verification; no premature merged claim |

Initial full tests exposed two inherited `tsx` wrapper IPC failures (219 passed,
2 failed) in the managed environment. [OPS002 #59](https://github.com/danielyekini/generative-virtual-runtime/issues/59)
replaces one-shot wrappers with Node `--import tsx`, including CLI subprocess
tests. The same entrypoints, output and failure-code assertions remain; no test
was skipped, weakened or removed. No sandbox permissions were bypassed.

## Exact continuation

The CLI login from 30 October did not survive replacement of the transient runtime.
The GitHub connector still supports repository writes but exposes no Projects API.
Restore the same authorised repository/project/workflow CLI access, then read back
all memberships and views, run the live dispatcher/receipt/recovery scenarios and
repeat setup to verify idempotence. No token belongs in issues, documents or chat.

Prepared commands (authenticated `gh` on PATH):

```sh
python3 tools/gvr-ops/complete_setup.py
python3 tools/gvr-ops/complete_setup.py --apply
python3 tools/gvr-ops/configure_views.py --apply
```

Setup preserves existing membership, populated fields, option IDs and custom views.
The reader resolves Project indexing omissions through each issue's exact live
membership, rejects ambiguity and normalises GitHub's `In Progress` display case.
API credentials stay in memory; requests are restricted to `api.github.com`, with
redirects and off-origin pagination rejected before transmission.

Six named views exist: Delivery, Engine, Product, Milestones, Requests and Human
verification. The Engine browser view shows 20 indexed cards and two Ready tasks;
#21/#39 require the verified membership fallback for routing. Keep that limitation
explicit until GitHub's index catches up. No background LLM wake is configured.

After live acceptance, mark installed, record verified view IDs and acceptance
results, recheck main and run `npm run verify` on the final candidate. Self-merge
only when actual checks/protections allow; read back merge SHA, verify final main
and delete only this run's merged branch. OPS001/OPS002/OPS003 remain open until
integration. No feature implementation, publication or deployment is included.

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
with matching repository milestones for overarching goals. The remote repository now resolves to the intended identity by stable numeric ID
1409281098. Current official descriptions state the product directly, without a
rename announcement. Historical measured bytes remain immutable.
