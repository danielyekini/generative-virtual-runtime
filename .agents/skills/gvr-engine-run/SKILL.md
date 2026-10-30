---
name: gvr-engine-run
description: Execute the next authorised engine work item autonomously in the GVR repository. Use when invoked to continue engine implementation or resume its work; discover all session context from repo/GitHub without user-supplied task details.
---

# gvr-engine-run

Locate the repository root from this skill or the current checkout. Read
docs/project/charter.md, docs/workstreams/engine/direction.md and
docs/operations/config.json. If installation is incomplete, report the exact
missing setup and complete independent reviewable work; do not invent task IDs.

Follow docs/operations/run.md. Query only route flags for engine intake/review;
if needed, switch to $gvr-engine-orchestrator first, then return. Claim/resume
one ready engine issue with satisfied dependencies. Read that issue's relevant
handover and applicable technical contracts, not the entire archive.

Implement and verify the outcome; create and self-merge the linked passing PR
when permissions/protections allow. Record the compact handover and one terminal
run event in the engine clock. Find next work autonomously; don't require user
technical context. Don't inspect raw orchestrator mail as an ordinary worker.
Use ownership.md, design.md and integration.md when the corresponding operation
requires them. An explicit user steering change routes to gvr-direction-change.

For any PR, follow docs/operations/git.md: full tests/typechecks/required builds
before submission, inherited failures repaired, final integration gate, authorised
self-merge and safe deletion of own merged branches.

Read-only routing helper (from repo root):
`python tools/gvr-ops/gh_context.py --lane engine --mode route`
Then use `--mode context` only after any required intake/review. Claim/resume
and live updates use authorised tools; the reader does not claim work.

Generate a session UUID automatically at startup (or use runner GVR_RUN_ID).
Pass it and a transient work/ops intake receipt to route/context calls; follow
inbox.md to return from completed intake without an accepted-blocker loop.
