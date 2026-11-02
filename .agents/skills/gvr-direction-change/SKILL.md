---
name: gvr-direction-change
description: Apply an explicit user change to GVR product or capability direction, updating the appropriate roadmap, workstream direction and GitHub work without losing evidence. Use when the user steers current goals or an active agent detects incompatible new instructions.
---

Read docs/project/charter.md, docs/operations/config.json and the affected lane
direction. Follow docs/operations/direction-change.md. Route to the owning
orchestrator, preserve the user's intent and evidence, and update authoritative
GitHub work and relevant direction/decisions. Notify the other orchestrator
through its inbox when affected. Do not require user issue IDs or edit immutable
historical contracts/results. Distinguish brainstorming from actual direction.

For any PR, follow docs/operations/git.md: full tests/typechecks/required builds
before submission, inherited failures repaired, final integration gate, authorised
self-merge and safe deletion of own merged branches.
