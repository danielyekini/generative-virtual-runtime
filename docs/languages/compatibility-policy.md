# Compatibility policy

This file is the rule for versions, the capability registry, and evaluation runs. It does not grant support that `packages/schema/capabilities/registry.json` does not record.

The languages are not frozen at 0.1 or 0.2. The aim is a Scene IR and a MotionScript expressive enough to render modern animation sources. An `unsupported` or `untested` registry row is a gap to close, not a decision to leave the construct out. New nodes, paints, tracks, operators, and render scopes are added with the normal version, registry, and test update. Loops and function declarations are the exception: they change the execution model and need a design decision before implementation.

## Authority

| Artifact | What it decides |
| --- | --- |
| Grammar and schema (`packages/schema`) | Valid syntax and the executable representation |
| `packages/schema/capabilities/registry.json` | Implemented support, restrictions, adapter coverage, and the tests that back those claims |
| `docs/languages/*/versions/*.md` except `pending.md` | What a published version changed. Immutable after release |
| `packages/schema/capabilities/releases.json` | Current language versions and which compiler/runtime packages read them |
| `docs/evaluations/<run-id>/` | What one implementation revision reproduced |
| Design notes, including `packages/schema/CONTRACT.md` | Architectural intent. They lose when they disagree with the schema, the registry, or a test |

MotionScript and Scene IR are versioned independently. Release ids are numeric semantic versions (`0.2.0`). Wire strings inside documents stay the short forms the validators already accept (`0.1`, `0.2`). Package `version` fields are package releases and are not language releases.

## Wire string, language release, and capabilities

The wire string (`irVersion` / MotionScript `version`) is a coarse family id. It does not list every additive feature. Consumers distinguish schema additions with two other fields:

| Signal | Role |
| --- | --- |
| Language release id (`releases.json` → `0.2.0`, `0.3.0`, …) | Fuller schema version. Named in an immutable version file. Says which capabilities and sampling rules that release introduced. |
| `requiredCapabilities` on the scene / `requires` in MotionScript | Per-document feature gate. A consumer accepts the wire family, then rejects the document unless every listed capability is enabled in that package build. |
| Package `version` | Which code build is running. Independent of language release ids. |

Rules:

1. Completing an implementation already named in a **published** version file (catch-up for a stated capability) does not require a new language release. Bump package versions, registry support claims, and tests only. Wire and language `current` stay put.
2. Introducing a representation that a published version file does **not** name (new track value type, node field, operator, or sampling rule) requires a new version entry written from `pending.md`. Do not silently extend `0.2.0.md`.
3. While the wire family remains `"0.2"`, a new language release may keep `wireVersion: "0.2"` and rely on `requiredCapabilities` so older package builds reject unknown capability tokens, and newer builds that enable the capability accept the scene. If a change cannot be gated that way (for example a 0.1-era reader must hard-reject the document shape), the version file sets a new wire string (`"0.3"`).
4. Below `1.0`, a minor language bump is the breaking boundary. Prefer a minor (`0.3.0`) when the new contract is breaking for consumers that do not understand the capability; a patch (`0.2.1`) only when the published 0.2 contract already implied the feature and the change is a compatible completion or fix.

### Decision for `geometry.pathMorph`

Landed in MotionScript / Scene IR **0.3.0**. Wire stays `"0.2"`; scenes and programs gate with `requiredCapabilities` / `requires` containing `geometry.pathMorph`. That release is the contract; do not treat package-only bumps as sufficient for similar pending constructs.

### Decision for `paint.gradientStroke`

Landed in MotionScript / Scene IR **0.4.0**. Wire stays `"0.2"`; scenes and programs gate with `requiredCapabilities` / `requires` containing `paint.gradientStroke`. Fill gradients do not imply stroke gradients.

### Decision for `geometry.animatedTrim`

Landed in MotionScript / Scene IR **0.5.0**. Wire stays `"0.2"`; scenes and programs gate with `requiredCapabilities` / `requires` containing `geometry.animatedTrim`. Static trim remains `geometry.trimPath` (0.2.0); animated `trim.start` / `trim.end` / `trim.offset` tracks require the 0.5.0 capability.

## Ordering and the current pointer

Compare versions numerically: `0.10.0` is newer than `0.9.0`. Do not use filename or string sort.

`releases.json` names the current release of each language. That pointer must equal the greatest version whose status is `released`. A `draft` or a prerelease (`1.0.0-rc.1`) never becomes current by existing on disk.

While a language is below `1.0`, a minor bump is the breaking-change boundary. Patch releases are compatible fixes. Major releases are incompatible changes at or above `1.0`.

## Readers

A 0.1 consumer accepts wire `0.1` and rejects wire `0.2` before playback. A 0.2 consumer loads wire `0.1` through `migrateSceneTo02`: one identity root scope, empty compositions, instances, and operators, and `requiredCapabilities: []`. Migrated sampling matches the 0.1 scene. Older programs are not reinterpreted under additive or isolated-group rules. There is no lossless conversion from 0.2 back to 0.1.

## What may change together

1. A capability or semantic change updates the code, `registry.json`, the conformance tests, and the version entry in the same change.
2. Published version files are immutable. A correction is a later version that names the earlier one. `pending.md` is the only editable language note, and it is not current.
3. An importer fix does not bump MotionScript or Scene IR unless syntax or semantics change.
4. A support claim of `exact`, `approximate`, or `unsupported` names a scope and at least one existing conformance test. `exact` is that scope, not every variation of the feature. `untested` is not a support claim.
5. The registry separates language expressiveness from importer coverage. A feature may compile and draw while one adapter still cannot import it.

## Evaluation loop

Each run is a new directory `docs/evaluations/<run-id>/` with `report.md`, `manifest.json`, and `results.json`. The run pins source hashes, the implementation revision (`git` SHA when clean, otherwise a complete source snapshot), language and IR versions, the reference player, and the comparison settings. It does not edit an older run. The next Baseline reads `docs/evaluations/implementation-pin.json`.

| Stage | Required action |
| --- | --- |
| Baseline | Pin sources, revision, language versions, reference player, and comparison settings |
| Diagnose | Group unsupported constructs, approximations, and visual mismatches by root cause |
| Implement | One scoped capability or correction, with registry and version updates when the language changes |
| Verify | Conformance tests, the affected fixtures, then the corpus regression gate |
| Re-evaluate | A new immutable run compared with the baseline |
| Stop | Record success, a blocker, or a design escalation |

Success for a declared profile requires all of the following:

- No unsupported, dropped, or approximate semantics inside that profile.
- Import, emit, and compile agree.
- Resolved state and motion match at boundaries and at the sampled times.
- Visual agreement stays inside the documented tolerance. Full-frame coverage of a finite window is required where practical.
- No regressions and no budget violations.

“Every frame exact” means that fidelity was checked in a pinned environment against a documented tolerance. Pixel identity across different rasterisers is not the requirement.

Stop after three implementation attempts for one root cause, or when the run budget is spent. Escalate sooner when the reference player is unreliable, or when two attempts in a row do not improve the measurement. Also escalate when the missing piece is a new execution model, such as loops or function declarations. Do not escalate because a construct was outside an older profile: extend Scene IR and MotionScript, then lower it. Write a blocker with the evidence and the decision required. Do not widen a tolerance to make the loop pass.

The index of runs is `docs/evaluations/README.md`. The newest link is the latest measurement, not the specification.
