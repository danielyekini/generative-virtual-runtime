# GitHub Project and work-item authority

Use the configured repository-linked [Generative Virtual Runtime Project #3](https://github.com/users/danielyekini/projects/3) with Engine, Product,
Milestones, Requests and Human verification views. Its URL/IDs/field mappings
are recorded in config.json by installation. Issues/subissues are the work items;
issue bodies own requirements/acceptance/handover, project fields own status,
priority/lane/order. Avoid duplicate state in repo Markdown. Project items must
point to real repository issues rather than long-lived draft cards.

## Fields and fallback

Status: Candidate, Ready, In progress, Blocked, Human verification, Done, Deferred.
Workstream: Engine, Product, Joint. Kind: Milestone, Epic, Task, Bug, Experiment,
Decision, Idea, Request, Review. Priority: P0-P3. Add numeric Queue order,
Milestone key, and Agent/run text only if supported/useful. Link dependencies
and subissues using native APIs when available. Otherwise use issue task lists
and explicit blocking links, and record fallback capability in config. Do not
pretend a task list is a native subissue. Closed not-planned/rejected outcomes
must have reasons distinct from successful Done.

GitHub Projects APIs, repository issue APIs, PR merging and event dispatch can
have different permissions. Probe each; do not assume a GitHub connector exposes
Projects just because it can read issues. Prefer suitable MCP tools; otherwise
use authorised gh/REST/GraphQL. No token contents in logs. If project writes are
unavailable, ask for the smallest setup/action (or user-created board link), finish
all reviewable repo preparation and issue work that is authorised, and clearly
mark installation incomplete. Never silently substitute a local board as SSOT.

## Work-item lifecycle

Search stable key and related scope first; reuse/update rather than duplicate.
Candidate -> evaluate -> Ready only with bounded outcome, acceptance, dependencies
and decisions resolved. Claim -> In progress -> self-merge/verify -> Done, or
explicit Blocked/Human verification/Deferred outcome. A parent remains open until
its own gate passes, irrespective of child count. Use closing keywords only for
the completed scope. Ideas are evaluated in regular orchestrator intake/review,
not hidden in run prose. Closed items retain evidence and reasoning.

## Seeds

bootstrap/seed-issues.json is installation input, not an installed active queue.
Stable keys survive deduplication and are mapped to real issue URLs in config.
Once seeded, edit live issues and fields, not the seed file. Refresh direction
documents only when the goal/sequence changes. Orchestrator mail is excluded
from worker queues and ordinary context packets.

Overarching goals use repository milestones M1–M6 as well as parent goal issues.
Use native parent/subissue links for related execution work and OPS001 children;
read back hierarchy and milestone assignments. The explicit Project number/URL
in config takes precedence over title discovery; do not create a parallel board.
