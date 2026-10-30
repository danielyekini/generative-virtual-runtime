# Agent prompt: install the separate authoring workflow

> Operating revision 2026-10-30: [current operations](../operations/README.md) and
> [migration map](../operations/migration-map.md) own new work routing and full-test/Git
> gates. This procedure is scoped to explicit imported-program refinement/source-fidelity
> claims. Its historical records and valid quality/storage rules remain; it does not
> require universal parity, native round trips or a separate reviewer.
> This older installation prompt is superseded process evidence; do not reinstall it.

Work in danielyekini/generative-visual-runtime. Install this documentation bundle and separate authoring from fidelity. This task is documentation and process integration, not implementation of new language capabilities. Preserve unrelated working-tree changes. Read root and applicable AGENTS.md first.

## Grounding

Read releases.json, current version files, compatibility-policy.md, registry.json, docs/evaluations/README.md, implementation-pin.json, visual-acceptance-policy.md, evaluation/gate-settings.json and the current fidelity prompt. Inspect current repository conventions with rg/rg --files. Do not use a remembered run ID/version as authority. These bundle files are proposed supporting documentation, not proof of current capabilities.

## Install destinations

Copy docs/ files to their corresponding repository-relative locations. Install this prompt as docs/authoring/install-agent-prompt.md. Create docs/authoring/README.md linking workflow, goals, guide, evolution policy, documentation policy, evaluation spec, sample registry spec and templates. Create evaluation/authoring/manifests/samples.json with schemaRevision 1.0 and empty samples; create a short evaluation/authoring/README.md explaining that corpus programs and frozen manifests will be added by authoring runs. Do not fabricate results or verified samples.

If equivalent resources exist, integrate rather than create competing authorities. Preserve the stable workflow substance and report any conflicts. Do not add speculative compiling syntax to the guide; inspect grammar and tests before adding examples.

## Update existing integration points

1. Root AGENTS.md: add authoring routing and required reading. Explicitly permit agents to update all supporting documents with evidence, including insights labelled hypotheses, without repeated approval. Exclude ordinary edits to docs/workflows/authoring-loop.md. Retain immutable published releases, historical runs, baseline bytes and frozen benchmark records. Workflow changes require explicit operator direction. Existing publishing/version rules still apply.
2. docs/evaluations/lottie-fidelity-loop-prompt.md: keep it the single fidelity prompt. Remove any authoring phase/completion condition and link the separate workflow. If no authoring phase exists, add a clear scope/handoff paragraph rather than inventing one to remove. Fidelity success concerns source conversion, semantic round trip and visual quality only. Authoring can begin per verified sample; whole-corpus success is not an entry requirement.
3. Update live fidelity docs/report generators that conflate authoring with fidelity. Discover references using rg for authoringPassed, Phase D, authoring and relevant paths. New fidelity records should omit authoringPassed; preserve ability to read historical records if code consumes them. Avoid unrelated code refactoring. Do not edit old runs, stop records or source snapshots.
4. Fidelity-generated faithful programs may be registered as authoring inputs only with actual per-sample verification/provenance. Refinement outputs remain separate. An authoring-discovered correctness defect becomes a fidelity finding; do not silently change workflows or reset budgets.
5. Keep independent run indexes, continuation records and attempts. docs/authoring/runs/<UTC-id>/ contains immutable authoring runs; docs/authoring/implementation-pin.json is created by the first actual authoring run, not fabricated during installation.
6. Align stale live fidelity instructions with current gate and continuation authorities: remove hard-coded 'today' run/version references and obsolete release assertions; require complete reproducible dirty snapshots, not hashes alone; use the current full-window/round-trip preparation commands described in evaluations/README.md. Preserve corpus scope, quarantines, attempt history and gate values. Do not relax acceptance or change language releases.

## Revision and authority

Authoring workflow 1.1 is the stable contract. Other installed docs are living revision 1.0 resources. Documentation revisions do not bump MotionScript or Scene IR. Supporting resource revisions must record evidence/rationale and must not retroactively change benchmark criteria or historical outcomes. An agent may document a new insight before testing it only if explicitly marked hypothesis.

## Verify and finish

Check all relative links/destination paths, JSON validity, agent routing and current-vs-proposed capability wording. Search live docs for remaining combined-flow claims. Tests are unnecessary for Markdown-only edits; if a report generator/schema changes, run its relevant checks and repository-required validation. Do not run an expensive fidelity campaign for documentation installation.

Return changed files, authority/editability rules, workflow handoff and any unresolved conflict. Do not commit or push unless authorised by the current task/session. The installation does not authorise new semantics, new releases, threshold changes or training-data eligibility claims.

## Additional mandatory installation changes: programs and workflow routing

Install the strict program-revision/storage rules in sample-registry-spec.md and link them from AGENTS.md, both workflows and authoring README. Ensure agents know samples/motionscript/<sample-id>/faithful/, authored/ and experimental/ are distinct. Inspect the actual program file extension and update the proposed .ms convention consistently before creating files. Do not relocate or certify existing generated programs blindly: inventory candidates, retain originals, record source/program hashes and verification state, then migrate only with reproducible links. Create directory READMEs and registry fields for separate latest-recorded and verified/preferred pointers. Program revisions are immutable even though registry pointers and supporting specifications are agent-editable.

Make authoring's fidelity re-verification subflow explicit. Authoring quality failure first rejects/repairs the candidate; confirmed shared system defects hand off to the fidelity loop. Preserve separate run identity/budgets. Add current accepted fidelity-corpus vs authoring-corpus routing and readiness stages. No whole-corpus pass prerequisite for local refinement; no broad adoption based on a single impressive import or arbitrary sample count.

Update live report templates/generators to record source/program hashes, revision lineage and exact evidence association. Documentation installation alone must not create fake program revisions, run results or readiness certification. Do not edit historical reports.
