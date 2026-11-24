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

Each local skill file is a launcher. If the runtime does not discover skills
automatically, open the launcher from the table. Fetch its linked Notion page
using the session's authorised Notion reader. Extract the single Markdown code
block, preserving its content and restoring one final newline. Compare its Git
blob ID with the expected ID in the launcher (use `git hash-object --stdin`
on those bytes). Follow the verified instructions.

If the Notion reader is unavailable, access is denied, or the revision check
fails, report the skill name and blocker and stop before claiming or changing
work. Use the configured connection for credentials. The
[Operating handbook and skills](https://app.notion.com/p/41f0c600341a81c29928f8467248f25d)
contains the canonical skill pages. When publishing a skill revision, update the
repository's expected blob ID as part of the cutover.

Workers receive only own direction, selected issue/handover, route flags and
applicable contracts. Switch to own orchestrator for pending intake or the
independent five-terminal-run review. Never mix raw other-lane requests into
worker context. No background LLM wake is configured.

## Mandatory verification and Git lifecycle

Follow [git.md](docs/operations/git.md). Use an **isolated git worktree** plus
issue branch from current main — never edit a checkout another agent may also
be using ([decision](https://app.notion.com/p/4220c600341a8154a2fbfb510c301c9b)). Run
`npm run verify` (full tests, all existing typechecks, Studio build, operations
acceptance and reference freshness) before PR submission and after final
code/main integration. Repair inherited failures without weakening tests.
No mandatory independent review. Self-merge only after acceptance and actual
protection/check permissions; verify remote merge then **immediately** delete
only own merged remote/local feature branch **and remove own worktree**
(`git worktree remove` + prune) — a merged leftover worktree is a failed exit
and fills the disk. Keep external blockers explicit; never bypass gates.

## Aim

Build reliable native progressive visual software toward the adopted charter.
Compare consequential alternatives with
bounded designs and preserve released semantics/diagnostic truth.

MotionScript / Scene IR changes also weigh **authoring friendliness** (low mental
arithmetic, low error rate), **generation creativity**, and **streaming safety**
— see charter principles and
[Authoring friendliness and provider-brand abstraction](https://app.notion.com/p/4220c600341a81cc94afce04ba6d19f8).
Vendor backends stay behind provider-abstracted host packages; major
capabilities need Studio testing surfaces before dependent work advances.
**Orchestrators may revise any of these operating principles/processes** when
evidence warrants (record supersession; user-focused tests allowed); they may
not redefine vision or bypass platform constraints
(`docs/operations/authority.md`, `docs/operations/orchestrator.md`).

Acceptance follows the selected work item. Preserve existing regression coverage.

## Technical contracts (read when affected)

Before changing language, schema, compiler, runtime or evaluation support:

1. Read `packages/schema/capabilities/releases.json`.
2. Read the current MotionScript and Scene IR version files named there.
3. Read `docs/languages/compatibility-policy.md`.
4. Read touched rows in `packages/schema/capabilities/registry.json`.

## Authority

The grammar and schema decide syntax. The registry decides what support is claimed today. Published version files record what a release changed. Evaluation runs record what one revision reproduced. Design notes, including `packages/schema/CONTRACT.md`, do not override the registry and do not forbid a later capability.

## When versions and packages change

- A semantic change updates code, registry, conformance tests, and the version note in the same change.
- Published version files are immutable. Correct them in a later version that names the earlier one. Edit only `pending.md` until that release.
- Bump MotionScript only when its syntax or semantics change. Bump Scene IR only when the validated representation or sampling rules change.
- Below 1.0, a minor bump is the breaking boundary. Patches are compatible. Do not silently reinterpret older programs.
- `exact`, `approximate`, and `unsupported` each need a stated scope and a passing conformance test. `exact` is that scope only.
- Drafts and prereleases do not become the current release. The current pointer must stay equal to the greatest released version, compared numerically (`0.10.0` is newer than `0.9.0`).
- Package `version` fields are not language versions. The wire strings remain the coarse family ids (`0.1`, `0.2`, …) until a version file says otherwise. Additive features inside a wire family are distinguished by the fuller language release id and by `requiredCapabilities` / `requires`. See `docs/languages/compatibility-policy.md`.
- Completing a capability already named in a published version file is a package + registry update. A construct only in `pending.md` (for example `geometry.pathMorph`) needs a new version entry before it is claimed.

## Evidence and program preservation

[Archived evaluation and authoring evidence](https://app.notion.com/p/41f0c600341a8103a6dfdae8044930ba) is immutable.
New compact run summaries use `docs/runs/<lane>/<run-id>/summary.md`; live issue
comments own latest handovers. Pin clean commit or complete reproducible source
snapshot for measurements. Reuse prior evidence unless affected, failed or incomplete.
Preserve immutable program revisions, original inputs and exact evidence hashes.
Follow the [sample registry rules](https://app.notion.com/p/4200c600341a81698421d5cafad36518)
and keep recorded and verified revisions distinct.

Supporting guidance may evolve with evidence/rationale. Published versions,
historical criteria/reports and source/program bytes remain immutable. New
semantic support follows the release process; deployment/publication is separate.
