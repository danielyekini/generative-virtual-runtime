# Agent rules

## Start here

Read [charter](docs/project/charter.md), [authority map](docs/operations/authority.md),
[own workstream direction](docs/project/roadmap.md) and
[routing config](docs/operations/config.json). Live GitHub issues/Project own work
status; repository documents own goals, contracts, decisions and immutable evidence.
The user explicitly adopted this structure on 30 October 2026; the
[migration map](docs/operations/migration-map.md) supersedes conflicting old routing.

Invoke one repository persona, without supplying issue IDs:

| Invocation | Canonical instructions |
| --- | --- |
| `$gvr-engine-run` | [.agents/skills/gvr-engine-run/SKILL.md](.agents/skills/gvr-engine-run/SKILL.md) |
| `$gvr-product-run` | [.agents/skills/gvr-product-run/SKILL.md](.agents/skills/gvr-product-run/SKILL.md) |
| `$gvr-engine-orchestrator` | [.agents/skills/gvr-engine-orchestrator/SKILL.md](.agents/skills/gvr-engine-orchestrator/SKILL.md) |
| `$gvr-product-orchestrator` | [.agents/skills/gvr-product-orchestrator/SKILL.md](.agents/skills/gvr-product-orchestrator/SKILL.md) |
| `$gvr-direction-change` | [.agents/skills/gvr-direction-change/SKILL.md](.agents/skills/gvr-direction-change/SKILL.md) |

If the runtime has not discovered repository skills, read the linked SKILL.md
explicitly and follow it; do not install personal/global copies. Commands and
runtime limitations: [operations entry](docs/operations/README.md).
Workers receive only own direction, selected issue/handover, route flags and
applicable contracts. Switch to own orchestrator for pending intake or the
independent five-terminal-run review. Never mix raw other-lane requests into
worker context. No background LLM wake is configured.

## Mandatory verification and Git lifecycle

Follow [git.md](docs/operations/git.md). Use an isolated issue branch from current
main. Run `npm run verify` (full tests, all existing typechecks, Studio build,
operations acceptance and reference freshness) before PR submission and after
final code/main integration. Repair inherited failures without weakening tests.
No mandatory independent review. Self-merge only after acceptance and actual
protection/check permissions; verify remote merge then delete only own merged
remote/local feature branch. Keep external blockers explicit; never bypass gates.

## Aim

Build reliable native progressive visual software toward the adopted charter.
Lottie/SVG are maintained import/comparison utilities. Scoped fidelity checks
apply when an issue changes their claims; they are not the universal mission or
an entry gate for native functionality. Compare consequential alternatives with
bounded designs and preserve released semantics/diagnostic truth.

## Technical contracts (read when affected)

Before changing language, schema, importer, compiler, runtime or evaluation support:

1. Read `packages/schema/capabilities/releases.json`.
2. Read the current MotionScript and Scene IR version files named there.
3. Read `docs/languages/compatibility-policy.md`.
4. Read touched rows in `packages/schema/capabilities/registry.json`.

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

## Evidence and program preservation

Historical runs under `docs/evaluations/` and `docs/authoring/runs/` are immutable.
New compact run summaries use `docs/runs/<lane>/<run-id>/summary.md`; live issue
comments own latest handovers. Pin clean commit or complete reproducible source
snapshot for measurements. Reuse prior evidence unless affected, failed or incomplete.
For a source-fidelity claim, use the pinned visual policy, original bytes, correct
reference, full required coverage and existing attempt history. Do not widen a
tolerance to pass. Import `exact` is not full visual certification.

For explicit imported-program refinement or source conversion only, consult the
[scoped legacy workflow](docs/workflows/authoring-loop.md),
[fidelity procedure](docs/evaluations/lottie-fidelity-loop-prompt.md),
[storage rules](docs/authoring/sample-registry-spec.md) and relevant quality policy.
They do not add universal review, round-trip or whole-corpus gates to native work.
Preserve distinct `faithful/`, `authored/`, `experimental/` programs and immutable
revisions. Keep recorded/verified/preferred registry pointers separate, with exact
source/program hashes and evidence. Never silently certify migrated inputs.

Supporting guidance may evolve with evidence/rationale. Published versions,
historical criteria/reports and source/program bytes remain immutable. New
semantic support follows the release process; deployment/publication is separate.
