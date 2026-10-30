# Ordinary workstream run

## Startup (minimal context)

1. Read charter, own direction file and routing config. Query live GitHub state.
2. Ask the intake router whether own orchestrator has untriaged requests or the
   review clock is due. It returns only route flags, not private request bodies.
   If needed, switch to that orchestrator persona for intake/review, then return.
3. Claim the highest ordered Ready item for this lane whose dependencies and
   decision gates are satisfied. Read its latest relevant handover + contracts.
4. Resume one's recoverable interrupted task before claiming a duplicate. If
   Ready is empty, perform an orchestrator replenish pass; do not ask the user
   to supply an issue number or infer requirements from old reports.

Start implementation promptly. Default run budget: 60-90 minutes of focused
work, adjustable to task evidence. This is a stopping/replanning checkpoint,
not a false completion promise. Maintain one primary outcome per ordinary run.

## Claim and concurrency

Set In progress, agent/run ID, branch and claim expiry (default two hours,
renew at progress checkpoints). Re-read claim before mutation; GitHub issue
comments alone are not an atomic distributed lock. Prefer the actual runner's
single-writer/claim mechanism. If competing claims are detected, one yields
and selects independent work. Use isolated branches/worktrees. Never infer
an expired claim means its files or branch can be deleted.

## Design and verification

For consequential alternatives, use design.md before coding the commitment.
Choose tests/gates proportionate to the claim and scope. Trust prior immutable
evidence when its identity/dependency assumptions still apply. Rerun affected
checks and current required integration checks; no ritual historical baseline
reproduction unless evidence failed, was incomplete, or is invalidated here.
Use production renderer checks for visible semantics; don't rely on a builder's
private model. Human testing is requested only for an actual judgment/input
the agent cannot establish; provide a concrete scenario, expected outcome and
working link/build. Mark unresolved human acceptance honestly.

## Finish

Create a PR linked to its issue (Closes # only when the issue is truly complete).
Run applicable checks, examine final diff, then self-merge when acceptance is
satisfied and repository permissions/protections allow it. No mandatory reviewer
or Product Review loop. Never bypass protections or close unfinished parent
issues. If approval is externally required, report that exact blocker and
continue independent work. Deployment/package publishing remains separate.

Append concise handover to the issue and link committed evidence. Evidence
is captured from the measured revision; refresh only affected checks if code
changes. Project status: Done only for accepted/merged work, Human verification
when that gate remains, Blocked for an external dependency. Partial work returns
to Ready/continues In progress with an explicit next step as appropriate.

Record exactly one terminal run outcome (complete/partial/blocked/failed) in
the lane ledger. Administration/intake/review sessions do not advance that
clock. Check incoming-request route flags at natural implementation checkpoints and again before exit or another task.
Do not inspect other-lane orchestrator mail as an ordinary worker. Resulting
execution requests are normal visible issues assigned by orchestrators.

## Findings

Search before creating a bug/idea/request. Add new evidence to the existing item
when applicable. Local same-lane suggestions become Candidate issues; cross-lane
requests use inbox.md. Do not silently expand the active task. Store Studio
suggestions in GitHub, not an additional live Markdown backlog.

## Mandatory submission gate

Follow git.md: full repository tests, typechecks and required builds must pass
before submitting the run PR; fix inherited failures. Rerun the full gate after
final code/integration changes. No compulsory independent review. Verify merge
into main and delete only your own merged remote/local feature branches safely.

Clock storage: append a terminal run JSON comment to own configured clock issue
using the documented gvr-ops-record format. Review comments list exact inspected
run IDs; never overwrite counters in a shared issue body. The read-only context
helper deduplicates run IDs and leaves concurrent new outcomes unreviewed.

## Machine-readable issue records

Post claim comments with `<!-- gvr-claim -->` and a JSON fence containing run_id,
agent_id (if the runner supplies one), branch, status active/interrupted/released
and expires_at (UTC ISO time). Post terminal/resume handovers with
`<!-- gvr-handover -->`. Latest valid claim wins; release it after completion.
Expired/interrupted/no-claim In progress items are recovery candidates, not
permission to steal work: inspect branch, latest handover and concurrent owner
before adopting. The helper returns recovery before Ready work and includes
latest marked comment handover. Installer migrates latest legacy handover pointers
once so future sessions don't need historical searches.

All executable issues carry `<!-- gvr-dependencies: E001,E002 -->` (empty when
none). This live issue-body marker is the query-compatible execution dependency
list; native GitHub dependency/subissue links provide additional presentation
and must be reconciled with it before claim. If they disagree, fail closed and
resolve through own orchestrator; don't silently proceed. Closed dependencies
must be completed, not rejected/not-planned. Keep dependency issues on the Project
or resolve missing ones by live issue read before marking the child executable.
