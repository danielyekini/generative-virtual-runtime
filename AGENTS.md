# Agent rules

Read this file before changing language, schema, importer, compiler, runtime, or evaluation support.

Also read, in this order:

1. `packages/schema/capabilities/releases.json`
2. The current MotionScript and Scene IR version files named there (`docs/languages/*/versions/`)
3. `docs/languages/compatibility-policy.md`
4. `packages/schema/capabilities/registry.json` for any capability you touch

## Aim

Build reliable fidelity within a declared, useful source profile, then expand selectively. Correct discrepancies in already-supported semantics before adding coverage. There is no fixed language ceiling, but source-format features are added when they benefit the accepted corpus or an explicit authoring goal.

Capability additions update the language contract, registry, tests and version note before adapter lowering. A new execution model, such as loops or function declarations, requires a design decision. Routine capability work uses the existing release process; missing original sources or an uncalibrated visual gate remain evidence blockers.

## Authority

The grammar and schema decide syntax. The registry decides what support is claimed today. Published version files record what a release changed. Evaluation runs record what one revision reproduced. Design notes, including `packages/schema/CONTRACT.md`, do not override the registry and do not forbid a later capability.

## When versions and packages change

- A semantic change updates code, registry, conformance tests, and the version note in the same change.
- Published version files are immutable. Correct them in a later version that names the earlier one. Edit only `pending.md` until that release.
- Bump MotionScript only when its syntax or semantics change. Bump Scene IR only when the validated representation or sampling rules change. An importer fix alone bumps neither.
- Below 1.0, a minor bump is the breaking boundary. Patches are compatible. Do not silently reinterpret older programs.
- `exact`, `approximate`, and `unsupported` each need a stated scope and a passing conformance test. `exact` is that scope only.
- Drafts and prereleases do not become the current release. The current pointer must stay equal to the greatest released version, compared numerically (`0.10.0` is newer than `0.9.0`).
- Package `version` fields are not language versions. The wire strings remain the coarse family ids (`0.1`, `0.2`, …) until a version file says otherwise. Additive features inside a wire family are distinguished by the fuller language release id and by `requiredCapabilities` / `requires`. See `docs/languages/compatibility-policy.md`.
- Completing a capability already named in a published version file is a package + registry update. A construct only in `pending.md` (for example `geometry.pathMorph`) needs a new version entry before it is claimed.

## Evaluations

Historical runs under `docs/evaluations/` are immutable. A new run gets a new directory and is linked from `docs/evaluations/README.md`. Do not overwrite `2026-10-07-baseline` or treat it as the current specification.

Every new run pins the implementation to `git rev-parse HEAD` when the tree is clean, or to a complete source snapshot when it is not. Follow `docs/evaluations/lottie-fidelity-loop-prompt.md` Stage 1. The pin file `docs/evaluations/implementation-pin.json` names the commit or snapshot the next Baseline must start from.

Fidelity corpus bytes live in `fixtures/corpus/` (private-repo policy; verify `SHA256SUMS`). Gate numbers live in `evaluation/gate-settings.json`. Browser binary via `GVR_CHROME` / `CHROME_PATH` or `evaluation/harness/chrome.ts`. Do not depend on macOS Downloads paths.

Read `docs/evaluations/visual-acceptance-policy.md` and freeze the current gate settings in the run before implementation. The operator has delegated defining policy 1.0; this does not certify existing output. Numeric frame/window/local rules, material review, reference controls, alpha, both native routes and complete frame coverage are all required. Future policy revisions never retroactively change historical run outcomes.

Do not widen a tolerance to make a comparison pass. An import status of `exact` is not a visual pass until the browser capture against lottie-web is recorded for that fixture.

## Authoring routing and supporting documents

Use [the single fidelity prompt](docs/evaluations/lottie-fidelity-loop-prompt.md) for source conversion, semantic round-trip and shared visual correctness defects. Use [authoring workflow 1.1](docs/workflows/authoring-loop.md) for implementation refinement and evidence-based language proposals. An individually verified input may enter authoring while other fidelity fixtures remain unresolved; broad adoption needs the readiness gate, not an arbitrary sample count.

Before authoring read [the authoring index](docs/authoring/README.md), [design goals](docs/languages/design-goals.md), [guide](docs/languages/authoring-guide.md), [evolution policy](docs/languages/evolution-policy.md), [documentation policy](docs/authoring/documentation-policy.md), [evaluation/readiness specification](docs/authoring/evaluation-spec.md) and [sample registry/storage rules](docs/authoring/sample-registry-spec.md), in addition to the released authorities above. Re-verify every changed imported program against its original source. Candidate quality failure rejects/repairs the candidate; a confirmed shared system defect becomes a fidelity finding. Keep run IDs, indexes, continuations and attempt budgets independent; never silently reset fidelity history.

Agents are explicitly permitted to update all supporting documents with evidence/rationale, including insights marked **hypothesis**, without repeated approval. Ordinary edits to `docs/workflows/authoring-loop.md` are excluded: workflow changes require explicit operator direction and a recorded revision. Preserve immutable published releases, historical fidelity/authoring runs, baseline/source bytes, frozen benchmark records and every program revision. Existing release and publishing rules still apply; documentation revisions do not bump MotionScript or Scene IR.

Canonical `samples/motionscript/<sample-id>/faithful/`, `authored/` and `experimental/` storage is distinct. Canonical programs use `.ms`; existing generated `.motion` evidence stays at its original path. Reserve monotonic revisions through the registry; never overwrite program bytes. Keep `latestRecordedRevision`, `latestVerifiedFaithfulRevision` and `preferredVerifiedAuthoredRevision` separate, with append-only pointer rationale and exact hash-associated evidence. Inventory candidates before any migration; preserve originals, hashes and verification state. Installation is not provenance, quality or training certification.
