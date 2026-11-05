# Lottie fidelity loop

> Operating revision 2026-10-30: [current operations](../operations/README.md) and
> [migration map](../operations/migration-map.md) own new work routing and full-test/Git
> gates. This procedure is scoped to explicit imported-program refinement/source-fidelity
> claims. Its historical records and valid quality/storage rules remain; it does not
> require universal parity, native round trips or a separate reviewer.

Work in the generative-virtual-runtime repository. Establish trustworthy source conversion, semantic round trip and visual quality for the declared animation test set; expand useful missing capabilities within that profile. MotionScript is the authoring language and Scene IR is the executable representation. Importing another format does not require reproducing its entire language. Do not execute this workflow merely because you are editing this prompt.

## Read first and preserve authority

Before editing implementation, read:

1. Root and applicable package AGENTS.md files.
2. packages/schema/capabilities/releases.json.
3. Current MotionScript and Scene IR version files named by the release manifest.
4. docs/languages/compatibility-policy.md.
5. packages/schema/capabilities/registry.json.
6. docs/evaluations/README.md and implementation-pin.json.
7. The newest run's report, stop and record relevant evidence.

Read the relevant contracts again after a language change. Published specifications and the registry define promised support; an evaluation describes one implementation revision. Historical reports do not override current specifications. Resolve contradictions explicitly rather than silently choosing a convenient document.

Do not modify historical runs, original fixture bytes or unrelated user changes. Do not commit or push unless instructed. Preserve older language semantics through the documented reader/migration path. Keep package release versions independent of language versions, but update changed package release records according to repository policy.

Published version entries are immutable. Record unfinished contract changes in the appropriate pending files. An importer or renderer correction implementing a published contract does not itself require a language bump. A new syntax, schema or semantic contract does require a version decision and release entry. Below 1.0 use the repository's documented minor breaking boundary. Publish only when authorised by the task or release policy; otherwise test the candidate with explicit pending-version metadata, without claiming it is released. Never infer current versions or next capabilities from dates hard-coded in this prompt.

A coarse wire family may remain unchanged only when documented and all readers reject unsupported required capabilities. Record full release IDs, wire IDs and requiredCapabilities/requires. Registry entries identify scope, restrictions, introduction versions, compiler/runtime/renderer support, adapter mappings and conformance tests. Mark only verified variations exact; distinguish untested from unsupported.

## Fidelity scheduling

A. Correct visual discrepancies in already-supported features.
B. Expand geometry, paint, timing or rendering coverage required by the declared test set.
C. Verify native fidelity and regression safety, returning to A for mismatches or B for missing capabilities.

Phase C is mandatory after every implementation attempt. Fidelity failure returns to A even if overall rendering improved. Default priority is a reproducible mismatch in an already-supported capability before adding a new capability. Within that class prioritise material content loss, then blocked fixtures and affected coverage. An operator-named cause can override priority, but cannot bypass verification.

Authoring runs use the separate [workflow 1.1](../workflows/authoring-loop.md). A verified sample can enter local refinement immediately; whole-corpus fidelity success is not an entry requirement. Fidelity-generated programs may be registered only with actual per-sample source/direct/compiled verification and provenance under the [immutable program/storage rules](../authoring/sample-registry-spec.md). Refined outputs remain distinct. An authoring-discovered shared defect becomes a fidelity finding with explicit handoff, separate run identity and retained attempts; it does not silently change workflows or reset budgets.

## Declared profile

The profile is every Lottie construct in the corpus that can be represented with nodes, paints, tracks, operators, timing scopes, and render scopes.

In scope, and not a design stop: path morph, mattes, masks, animated paint, gradient strokes, repeaters, merge paths, skew, auto-orient, text animators, images, precomps, trim, rounded rectangles, spatial curves, cubic and hold easing.

Out of scope until a person decides: loops and function declarations. Those change the execution model. Stop and write a design escalation. Do not invent a silent approximation of them.

LOT-03 remains quarantined above the production 512 KiB source ceiling; a diagnostic parse is not a pass. Raising a source ceiling requires a separate recorded policy cycle. Preserve the accepted LOT-00…07/SVG-01…02 source inventory, with SVG excluded from Lottie certification unless separately declared and pinned. Do not narrow source scope or infer capabilities from this list; current support is determined by releases/registry/tests.

## Declare scope and budgets

At Baseline record the fixture set, format profiles, required capabilities, exclusions, existing quarantines, comparison settings, observation window, invocation time budget and authorised work mode. Do not broaden the corpus or quietly exclude a failing fixture to obtain success. The original Lottie profile remains the starting test set unless the operator changes it. Include SVG only if declared; use its own pinned browser reference and timing controls.

Consider path morph, gradients/strokes, images, precompositions, spatial curves, trim, masks, mattes and other useful capabilities when actually required by an accepted example. New execution models, general functions/loops, interactions, scripts, 3D support, unsupported effect families or major renderer redesign can require design escalation. No feature is automatically worth implementing merely because a source format supports it.

Bounds:

- At most three implementation attempts per root cause, carrying unresolved attempt history across invocations for the same implementation lineage. A new invocation is not an automatic reset.
- At most eight implementation cycles per fidelity invocation.
- Set a finite wall-time budget before implementation; use 60 minutes if the operator and repository do not specify one. Finish evidence/stop recording when the budget expires.
- Two consecutive attempts without meaningful improvement in the cause's relevant semantic or visual measurements stop that cause. Diagnostic counts alone are not progress for a visual mismatch.
- An unreliable reference quarantines the affected comparison with a reason; it cannot count as passed. Continue independent valid fixtures when possible.

Stop early when architecture decisions, insufficient reference evidence or requirements outside the profile prevent a justified implementation. Preserve a last verified state; never widen tolerances to obtain success.

## Stage 1 — Baseline and reproducibility

Create `docs/evaluations/<run-id>/` with a unique YYYY-MM-DDTHHMMSSZ identifier. Read `docs/evaluations/implementation-pin.json` and [the evaluation index](README.md). Pin the latest prior run dynamically from those authorities; retain `nextCause`, remaining attempts and linked findings unless the operator overrides them. Require the pin commit to equal HEAD or be an ancestor (`git merge-base --is-ancestor <pin> HEAD`); a missing/divergent pin blocks the run unless an operator selects another revision. Ancestry alone does not establish identical implementation.

Record HEAD, status, package/language/wire versions, registry hash, harness/dependency settings, source fixture paths/hashes and reference environment. For a dirty tree, save actual changed/untracked source bytes and hashes, a patch including deletions and a manifest against HEAD. Include all execution-relevant application, package, harness, configuration, lockfile and contract changes, not just packages. With no commit, save a complete reproducible source snapshot excluding credentials and disposable dependencies. Hashes alone are not a snapshot. Capture initial and final implementations separately so results identify the code actually tested.

Use the current full-window/native-route preparation commands from [the evaluation index](README.md):

```bash
npx tsx evaluation/harness/run-pipeline.ts
npx tsx evaluation/harness/check-round-trip.ts
npx tsx evaluation/harness/prepare-fidelity.ts --full
npx tsx evaluation/harness/drive-browser.ts
```

Discover prerequisites and paths from the repository. Corpus: `fixtures/corpus/` (+ `SHA256SUMS`). Gate settings: `evaluation/gate-settings.json`. Browser: `GVR_CHROME` / `CHROME_PATH` or `evaluation/harness/chrome.ts` — do not assume a macOS Chrome path. Missing corpus or reference/browser infrastructure is BLOCKED or NOT_RUN, never PASS. Scratch `evaluation/evidence/` is not a historical record.

## Diagnose through three routes

For each affected fixture compare:

1. Source rendered by the pinned reference player.
2. Imported Scene IR evaluated/rendered directly.
3. Imported IR emitted as MotionScript, compiled, evaluated and rendered.

Differences between 2 and 3 identify round-trip loss. Agreement between 2 and 3 with disagreement from 1 points toward source interpretation, runtime evaluation or rendering. Check sampled geometry, matrices, paint, visibility and timing before blaming rasterisation. Keep suspected versus confirmed causes separate.

Validate the comparison environment first: viewport, fit/letterboxing, backgrounds, alpha, DPR, timestamps, composition start frame, subframe setting, fonts, assets and effect settings. A harness mismatch is not a language capability gap. Never align away meaningful errors by warping or shifting frames after capture.

Record source locations and classify missing/approximate semantics, validation/budget failures, silent omissions, runtime/rendering faults, round-trip drift and reference faults. Empty motion tracks are legitimate for a static source, but suspicious when the source is animated. Create minimal reproductions separately from original sources.

For every cause, record phase, affected fixtures, hypothesis, owner boundary, expected result, measurements and attempt count in loop.json. Completed capability work does not prohibit reopening a newly observed correctness issue; link the new finding to the original work. Do not repeatedly retry an exhausted blocker without operator direction or materially new evidence.

## Implement one cause

Increment the attempt before editing. In phase A correct semantics in the narrowest responsible component; do not add new syntax to hide an implementation bug. In phase B first explain why the capability benefits the accepted corpus or authoring goal, then implement the smallest coherent shared representation.

Follow the required vertical slice: schema/property registry, compiler, runtime, renderer and emitter where affected, then adapter lowering. Preserve source operation ordering, local timing and deterministic seek. Do not indiscriminately route every change through every package.

Update registry, conformance tests, package changelog/version records and pending or authorised published language entries in the same change. Source-format exactness requires source/reference evidence for its declared scope. Test emitted and compiled equivalence separately. Older-program behaviour must remain documented and tested.

Do not rasterise an unsupported source into an image/video and call it native language support. Explicit asset fallback is a different profile and cannot satisfy native geometry/authoring gates. Source-budget changes belong in their own measured policy cycle. Existing quarantines remain explicit; source size rejection is not proof of malformed source.

## Verification and fidelity gate

Run the targeted conformance tests, registry validation, npm test and npm run typecheck using the repository's prescribed environment. Run affected fixtures and relevant regressions; run the full corpus gate before declaring a cause resolved. Track previous conversion successes and previous visual successes independently.

Compare route 2 and route 3 at key boundaries, segment midpoints, start/end and shuffled seek times. Apply pinned numeric and colour tolerances, initially 0.001 and 1/255 if confirmed by current policy. Include structural geometry, scope and matrix checks where scalar samples alone are insufficient.

Capture source/native frames for every scheduled frame in the declared finite window at the pinned frame rate, plus boundary/subframe samples where relevant. For infinite sources, declare a bounded window and tested cycles. Use matched timestamps and resource-ready captures; elapsed wall-clock screenshots are not reliable timeline evidence.

Read [visual-acceptance-policy.md](visual-acceptance-policy.md) and `evaluation/gate-settings.json`, currently a DEFINED policy. Freeze the actual settings before editing; policy definition is not output certification. Pixel Euclidean RGB threshold 24 is an inspection threshold; apply the full pinned aggregate/local-region/alpha rules, material review and reference controls. Missing review or coverage remains VISUAL_UNVERIFIED; missing/undefined policy blocks certification. Do not invent thresholds after seeing results. Check alpha directly or composite on declared backgrounds. Small whole-frame error can hide a completely missing small object.

Use sampled comparisons for rapid iteration; full-window capture is the final fidelity gate. Label coverage sampled or full-window, and give captured/expected frame counts and times. Literal cross-rasteriser pixel identity is not required. Material discrepancies cannot pass merely because their aggregate metric is low. Do not report missing captures as zero error.

Success for the accepted native test set requires:

- Production import accepts every non-quarantined in-scope fixture with no known unsupported, dropped or approximate semantics.
- Direct IR and MotionScript round trip agree under the declared semantic tolerances.
- Reference/native visual and motion agreement passes the fixed gate over the declared full frame window.
- Relevant tests/typecheck/registry checks pass; no previous accepted fixture regresses.
- Performance/resource budgets pass where specified.

Maintain independent conversionStatus, roundTripStatus, visualStatus and coverageStatus. Import exact means no known conversion loss, not verified frame fidelity. Reference playback success means the reference drew a scene, not that native output matched it.

If a regression occurs, revert only this attempt's changes or correct it within remaining attempts. Preserve unrelated changes. If reverting cannot be done safely, stop and document the unverified tree.

## Evidence and stop

Preserve before/after evidence per cycle under the unique run directory; never overwrite the only evidence of an earlier attempt. Finalise runs immutably. Write report.md, manifest.json, loop.json, machine-readable outcomes and stop.json. Report cause-level progress, original comparison baseline, final code identity, measurements, frame coverage, limitations and independent conversion/round-trip/visual/coverage outcomes.

Update the evaluation index and implementation-pin.json to the final tested commit/snapshot with next phase/cause and remaining attempt history. Never leave a next pin pointing at the initial snapshot after code changed.

Stop statuses:

- success: declared source-conversion, semantic round-trip and full-window visual gates passed, with regression/resource checks.
- budget-exhausted: invocation time/cycle bound reached; continuation allowed with retained cause history.
- blocker: exhausted cause, unavailable execution/reference infrastructure or unresolved correctness problem.
- design-escalation: a contract, architecture, scope or acceptance decision is required.

Record fidelityPassed and independent conversionStatus, roundTripStatus, visualStatus and coverageStatus. New fidelity records omit the obsolete authoringPassed field; historical records may retain it and remain readable. Authoring results live only in their separate run index. Identify the next action and evidence needed. A pass applies only to the declared test set, version and frame window; it is not universal PAL compatibility.
## Program evidence and report contract

Use the [fidelity report template](templates/fidelity-report.md). Record exact source/program SHA-256, genuine revision/parent lineage (null for unregistered scratch programs), implementation/policy pins and immutable evidence associations per route and observation window. Hashes identify bytes; they do not certify quality. Canonical faithful/authored/experimental storage and registry pointers follow the linked sample registry specification. Register only qualified inputs; never migrate or mark generated programs verified from import `exact` alone. Keep original source/snapshot/report bytes immutable.

Integration rationale (documentation installation): fidelity-only A/B/C scheduling and complete dirty snapshots were retained from the former combined prompt; authoring moved to workflow 1.1. Dynamic release/pin authorities and current full-window preparation replace stale dated instructions. No source scope, quarantine, acceptance value or attempt history is changed.
