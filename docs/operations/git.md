# Branching, Git and full-test standards

User requirement added 30 October 2026. These rules apply to every run that
submits an implementation or operating/docs PR. Self-merge is authorised because
the owning run verifies its own work, including the full repository test suite.

## Branch lifecycle

- Fetch main and start from current main in an **isolated git worktree** (or an
  equivalent dedicated checkout). Do **not** implement on a shared working tree
  that another agent may also mutate. User steering 3 November 2026: concurrent
  agents lose work when they share one checkout; every run that edits the repo
  must use its own worktree/branch pair before coding
  ([decision](../decisions/2026-11-03-isolated-worktrees.md)).
- One coherent issue outcome per branch/PR. Use engine/<issue>-<short-slug>,
  product/<issue>-<short-slug>, or ops/<issue>-<short-slug>. Include run ID when
  needed to avoid collisions. Never develop directly on main.
- Create the worktree from current `origin/main` (or resume the claimed issue
  branch in its existing worktree). Move the agent root into that worktree
  before edits. Leave other agents' worktrees untouched.
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
not read back. The `Project board sync` workflow mirrors those issue updates;
dispatch it in `sync` mode and cite its job log as the board readback
(tracking.md).

## Merge and cleanup

Create the PR only after the full local gate passes. Link the work item and
acceptance evidence. No mandatory separate PR reviewer. Self-merge after final
checks and actual repository protections/permissions allow it; never bypass them.
When protections require unavailable review/action, report the exact blocker.

### Mandatory post-merge worktree cleanup (user steering, 3 November 2026)

Leaving merged worktrees on disk repeatedly fills the machine (multi‑GB
checkouts of `docs/evaluations` and `node_modules`). **A run is not complete
until its own worktree is removed.** Do this in the same session as the merge
— do not defer cleanup to a later agent.

After the PR is **actually merged into `main` remotely**:

1. Record the merge SHA / PR URL on the issue handover.
2. From the **primary** repository checkout (not inside the doomed worktree):
   - `git fetch origin main`
   - Confirm the feature branch tip is on main (or the squash commit landed).
3. Delete **only this run’s** remote feature branch:
   `git push origin --delete <branch>` (skip if the host already deleted it).
4. Remove **only this run’s** worktree and local branch:
   - `git worktree remove <path>` (use `--force` only if the tree is clean of
     needed work and removal otherwise fails on leftover ignored files)
   - `git branch -D <branch>` if the local branch remains
   - `git worktree prune` if a stale registration remains
5. Confirm with `git worktree list` that the path is gone.
6. State cleanup done (or the exact blocker) in the terminal handover. **Never
   claim Done while your merged worktree still exists.**

Respect squash merges: verify via the merged PR / `origin/main`, not
`git branch --merged` alone. Never delete another agent’s branch, unmerged
work, `main`, or an active shared worktree. If disk is already full, free only
**your** merged/abandoned trees (and regenerable caches); do not wipe other
agents’ in-flight worktrees. Update issue/project/handover with final state;
retain PR and evidence links.
