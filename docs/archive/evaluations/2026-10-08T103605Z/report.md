# Fidelity run 2026-10-08T103605Z

Stop: **budget-exhausted**, with a recorded wall-time overrun. Corpus fidelity **FAIL**.

## Implementation, scope and continuation

Initial/final HEAD `a72beab23bbd74c114cf931d0fc42eb385e8e4bf`; local corrections are uncommitted. The remote work branch was brought up to date with main before this run. Reproduce the final implementation using `source-snapshot/tree/final-source.tar.gz` and verify every entry in `source-snapshot/final-files.json`. Attempt snapshots retain exact rejected/intermediate bytes. No commit, push, release, canonical sample promotion or historical record rewrite occurred.

MotionScript and Scene IR remain 0.5.0, wire 0.2; format-lottie package/adapter is 0.1.3. Chromium 151.0.7922.173 and lottie-web 5.13.0, source-native fps/viewport, DPR1, opaque #101014. Gate settings SHA-256 `df9bc5e079d8f8b01bd10dc43f737d1f300a09b0c463f20af3c5883efa067b59` is unchanged. LOT00–07 accepted; LOT03 remains quarantined by the 512KiB source ceiling; SVG sources excluded from this certification. Source corpus checksums remain unchanged. Compared with immutable run 2026-10-08T090908Z.

The run began 10:36:05Z with a 60-minute deadline of 11:36:05Z. Three cycles of eight were used. Implementation and regression checks ended before the deadline, but the browser capture continued beyond it; completion was observed at 12:11:50Z and evidence bookkeeping followed. This is a budget failure, not a compliant 60-minute completion. `loop.json` and `stop.json` retain actual timestamps and elapsed time.

## Corrections and diagnosis

1. `timing.compositionClipEasing` (1 attempt, 2 remaining): preserve original cubic easing and exact boundary values when non-spatial number/vector/path tracks are clipped to the composition window. Segment restriction and overshoot splits avoid changing the source interpolation. Existing end-offset deduplication preserves strictly increasing emitted offsets. Wave coordinate residual fell from 0.31995003 to approximately 7.2e-11 logical units. Baseline Wave worst hot-pixel fraction was 0.005275 with 42 failing frames per route; final all 150 scheduled + 5 extra frames per route have zero hot pixels and pass numerical/local/alpha/reference/material gates. Spatial clipping is outside this correction’s verified scope.

2. `visual.shapeGroupPaintOrder` (1 attempt, 2 remaining): reverse source shape-group traversal to restore face, hair and shoe details while retaining per-geometry style-pass order. Controlled LOT06 frame-0 comparison improved from 0.01939043 to 0.01233796 hot-pixel fraction. Final worst is 0.01396219 and window mean 0.01260208, still FAIL because fills remain absent. A separate layer hierarchy structural mismatch was diagnosed but its counterfactual did not establish a useful correction; no layer-flattening change was made.

3. `conversion.silentAnimatedFill` (1 attempt, 2 remaining): inventory now reports eight animated fill-color losses in LOT06, making conversion partial instead of silently exact. This is an audit correction, not fill-animation support. Pending language notes outline solid RGBA channels, gates and release work; no proposed capability is enabled or released.

The previously proposed gradient-coordinate cause was refuted by controlled context/endpoint experiments: changing the creation CTM did not alter decoded pixels; forced layer endpoints worsened the residual. Prior ordered-stroke history remains 2 attempts / 1 remaining. No cause budget was reset. Next: **phase B `paint.animatedSolidFill`, 0 attempts / 3 remaining**, with language/schema/registry/compatibility/compiler/emitter/runtime/adapter tests and original-window verification before any exact claim.

## Exact source/program identity and evidence

`evidence/final/audit-results.json` records original source paths, bytes and hashes, generated `.motion` paths/hashes and imported/compiled scene hashes. `capture-inputs-before-audit.json` freezes inputs before the diagnostic change; `capture-input-identity.json` proves all source/program/IR hashes stayed identical after the audit. Thus the final inventory status can be associated with the existing full capture and round-trip inputs without pretending another browser run occurred. Rendering used attempt-2 implementation; audit used inventory-correction implementation; final source manifest retains the complete result.

Original generated files remain in the saved stages. These are unregistered scratch programs: revision and parent IDs are null, not invented. No program enters authoring from this run. Prior LOT00 r000001 and its publication status are untouched. Policy, schedules, environment, exact frame timestamps and route labels are retained alongside capture results. `evidence-files.json` hashes evidence and capture bytes; large frames/archives are local, not durable published evidence.

Baseline and attempt-1 evidence are preserved separately. Attempt-1 corpus capture was cancelled after the complete Wave window; its partial results/logs cannot certify other fixtures. The copied stale aggregate result was removed. Final `evidence/final/render-results.json` is the complete driver output and keeps raw NOT_RUN material labels; reviewed outcomes are recorded separately in `material-review.json` and `results.json`.

## Independent outcomes

| Source | Conversion | Semantic round-trip | Final visual | Captures per native route | Window mean hot fraction |
| --- | --- | --- | --- | --- | --- |
| LOT-00 | exact | PASS | PASS | 240/240 scheduled + 3/3 extra | 0.00012606698495370365 |
| LOT-01 | exact | PASS | FAIL | 121/121 scheduled + 6/6 extra | 0.002259710743801654 |
| LOT-02 | partial | PASS | FAIL | 226/226 scheduled + 5/5 extra | 0.29639115718548564 |
| LOT-03 | failed | QUARANTINED | BLOCKED | 0/427 scheduled + 0/6 extra | None |
| LOT-04 | partial | PASS | FAIL | 675/675 scheduled + 6/6 extra | 0.08141035703870346 |
| LOT-05 | partial | PASS | BLOCKED | 241/241 scheduled + 6/6 extra | 0.2549125372106392 |
| LOT-06 | partial | PASS | FAIL | 24/24 scheduled + 3/3 extra | 0.012602076903292183 |
| LOT-07 | exact | PASS | PASS | 150/150 scheduled + 5/5 extra | 0 |

LOT03 has reference-only diagnostic frames; its zero native comparisons are absent measurements, not zero error. LOT05 capture execution completed but the repeated source reference differs; its raw mean is diagnostic only and comparison is BLOCKED. Full native captures exist for all seven non-quarantined fixtures. Trustworthy full-corpus comparison remains blocked by quarantine/reference readiness and incomplete material review of already failing fixtures.

LOT00 full 243 pairs and LOT06 full 27 pairs were reviewed in final sheets plus representative worst strips. Wave’s all-155-pair final reference/native images are decoded-pixel identical to its previously reviewed attempt-1 set; both final native routes are identical. No material failure observed for LOT00/Wave. LOT06 missing arm fills are visible. Other material review is NOT_RUN, never PASS.

191 tests across 25 files PASS; full package typechecks PASS; three registry tests PASS; strict harness typecheck PASS. Semantic whole-resolved-state round-trip passes all seven non-quarantined fixtures, including shuffled seeks. Check logs, source snapshots and diagnostic scripts are retained. No full-profile success or resource/budget success is claimed.

`fidelityPassed=false`, conversion FAIL_KNOWN_LOSS, round-trip PASS_NON_QUARANTINED, visual FAIL. The implementation pin and evaluation index now name this run.
