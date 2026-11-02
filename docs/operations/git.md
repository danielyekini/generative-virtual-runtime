# Branching, Git and full-test standards

User requirement added 30 October 2026. These rules apply to every run that
submits an implementation or operating/docs PR. Self-merge is authorised because
the owning run verifies its own work, including the full repository test suite.

## Branch lifecycle

- Fetch main and start from current main in an isolated checkout/worktree.
- One coherent issue outcome per branch/PR. Use engine/<issue>-<short-slug>,
  product/<issue>-<short-slug>, or ops/<issue>-<short-slug>. Include run ID when
  needed to avoid collisions. Never develop directly on main.
- Make focused commits with meaningful intent and issue references. Don't mix
  secrets, caches, dependencies or unrelated generated outputs into commits.
- Check status/diff, preserve others' work and use explicit file staging. Never
  force-push shared branches or rewrite main. Reconcile concurrent main changes
  safely. Renames/deletions must preserve historical evidence references.

## Before submitting the run's PR

Run the **full repository test suite**, not just targeted tests. Also run complete
typechecks and required builds/lints/integration commands defined by the repo;
installer records the command inventory and its coverage so 'full tests' isn't
an arbitrary subset. At least npm test, npm run typecheck and the current Studio
build are known starting commands; inspect current scripts for additions.
Use focused tests while iterating, but run the full gate on the final candidate
before opening the PR. Include exit results and implementation identity.

Fix pre-existing failing tests/checks encountered in that run. They are not an
acceptable permanent red baseline. Use smallest correct repairs and link any
additional issue; soft lane boundaries permit a needed maintenance fix. Never
delete/skip/weaken tests or change semantics just to turn them green. An external
credential/environment blocker is explicitly Blocked, not a passing gate; retain
the branch/handover and don't submit a ready-to-merge PR claiming completion.

After integration with newer main or any final code change, rerun the full gate
before merge. Observe remote checks where configured. Full tests do not mean
replaying all historical benchmark/corpus evidence every run: rerun those
experiments only if their claim is affected, failed or incomplete. Existing
published contracts and measured outcomes remain honest.

## Ticket upkeep (every run, user requirement 2 November 2026)

The issue and its Project item are the live record; keep them current without
being asked. On claim: set Status In progress (fallback below) and post the
`gvr-claim` comment. At each checkpoint and on exit: update the issue body's
acceptance/"Latest handover" when scope or findings changed, post a
`gvr-handover` comment, and set the final Status (Done only when merged and
accepted; Ready/In progress with next step for partial; Blocked/Human
verification with the exact blocker). Close completed issues with a reason;
create or update follow-up issues for any split or discovered work rather than
leaving it in prose. Orchestrators have full board authority within the
charter: create, rewrite, split, re-prioritise, re-order, close (with reason)
and add/remove Project items and fields for their lane, and set joint items
by agreement.

If the runtime cannot write Project fields (for example Claude Code cloud
sessions, which have no Project/GraphQL access), do every issue-level update,
state the intended Status in the issue body ("Board status: …") and the
handover, and say so in the final report; never claim a board change that was
not read back. OPS004 tracks restoring automatic board sync.

## Merge and cleanup

Create the PR only after the full local gate passes. Link the work item and
acceptance evidence. No mandatory separate PR reviewer. Self-merge after final
checks and actual repository protections/permissions allow it; never bypass them.
When protections require unavailable review/action, report the exact blocker.

Confirm PR is merged into main remotely and record merge SHA. Delete **that
agent's own merged remote feature branch**, then remove its local branch/worktree
once checked clean and no longer needed. Respect the chosen merge method: squash
merges may require explicit local deletion after remote merged-state verification;
git branch --merged alone is not sufficient. Never delete another agent's branch,
unmerged work, main or an active shared worktree. If deletion permission fails,
record a precise cleanup action without misreporting it as complete. Update main
and issue/project/handover with final state; retain PR and evidence links.
