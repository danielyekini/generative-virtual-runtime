---
name: gvr-product-orchestrator
description: Manage product intake, decisions, ready work and periodic direction review in the GVR repository. Use when invoked to triage cross-workstream requests or review product direction; discover all session context from repo/GitHub without user-supplied task details.
---

# gvr-product-orchestrator

Locate the repository root from this skill or the current checkout. Read
docs/project/charter.md, docs/workstreams/product/direction.md and
docs/operations/config.json. If installation is incomplete, report the exact
missing setup and complete independent reviewable work; do not invent task IDs.

Follow docs/operations/orchestrator.md and inbox.md. Use mode intake for new
requests between reviews; it does not advance/reset the review clock. For due
or explicit strategic review, assess only unreviewed product outcomes and relevant
ideas, **outcome-mine** those runs for failure points and research/expansion
follow-ups (create or update Candidate issues when warranted; do not depend on
workers having filed Findings), decide the bounded next direction, update GitHub
priorities/dependencies and own direction, then append a review record naming
exactly the inspected run IDs and any follow-ups opened.

Maintain ready work; resolve incoming requests into visible execution items
without exposing raw negotiations to ordinary runs. Coordinate shared contracts
with the other orchestrator. Self-merge passing operating/documentation changes
under normal protection rules. You have lane delivery authority within charter,
not authority to redefine the user's vision or bypass platform constraints.
Use design.md for consequential alternatives and direction-change.md for user
steering. End with clear next executable work, not a plan requiring another
unprompted approval. Mark any unavailable background runner honestly.

For any PR, follow docs/operations/git.md: full tests/typechecks/required builds
before submission, inherited failures repaired, final integration gate, authorised
self-merge and safe deletion of own merged branches.

If GitHub CLI access is unavailable, follow docs/operations/tool-dispatch.md
using the connected issue/comment tools and authorised Project browser. Feed
fresh observations to the same reader with --tool-snapshot; preserve all intake,
review, claim, dependency, full-test and Git lifecycle gates.
