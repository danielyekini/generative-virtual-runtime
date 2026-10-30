# Workstream orchestrator

Each lane has its own orchestrator, clock, direction and ready queue. It can
triage at any session without doing a periodic strategic review. Five terminal
ordinary runs since the last completed review triggers that lane's review;
installation starts at zero and does not count historical runs retroactively.
Early review triggers: milestone completion, repeated non-improvement, material
contract conflict, charter steering or evidence invalidating the plan.

## Intake-only pass

Read only one's incoming orchestrator requests and relevant charter/contracts.
Deduplicate, classify, and acknowledge each with one of: accept, need-evidence,
counterproposal, defer-with-trigger/date, reject-with-reason. Requests cannot
remain merely 'seen'. Create/update worker-visible tasks and dependencies with
the decision distilled; keep raw negotiations out of worker startup. A blocker
to current Ready work is handled before unrelated task dispatch, without waiting
for five runs. Routine accepted tools/adapter requests can be queued autonomously.

## Periodic review

Read only terminal run records after own review watermark, outcomes/evidence
summaries and relevant unresolved ideas/requests. Do not reproduce completed
experiments. Judge progress against charter/milestone gates, not token counts
or number of commits. Evaluate Candidate ideas in bounded batches (default top
ten relevant, not the full historical archive every review).

Decide continue, revise, split, stop, adopt or defer, with brief evidence. Revise
own direction and live queue; keep at least two executable Ready items where
possible. Sequence bounded design/research before implementation where needed.
Final say over lane delivery within charter; joint contracts require a recorded
cross-lane agreement. On conflict use one bounded exchange and written options;
default to the existing agreed contract while independent work proceeds. Ask
the user only for a genuinely material unresolved product choice outside
delegation, with concrete alternatives and recommendation.

Record reviewed run IDs and append a review record containing only the inspected run IDs.
New outcomes arriving during review remain unreviewed for next time. A session
may do review then ordinary work; only the ordinary outcome increments the clock.
No dependency on a global CTO session. The two orchestrators may exchange
requests and change their lane plans, but cannot independently rewrite the
other lane's direction or create contradictory public contract claims.

## Administration budget

Aim for a short intake and a review under ~20% of a session. This is a design
target, not an enforced performance claim. Keep one concise review issue/comment
plus direction diff; detailed decisions only when consequential. Never insert
new mandatory independent PR reviews under the name of orchestration.

## Mandatory submission gate

Follow git.md: full repository tests, typechecks and required builds must pass
before submitting the run PR; fix inherited failures. Rerun the full gate after
final code/integration changes. No compulsory independent review. Verify merge
into main and delete only your own merged remote/local feature branches safely.
