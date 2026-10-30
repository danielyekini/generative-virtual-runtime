# Cross-workstream request protocol

Requests are GitHub issues carrying kind:request, audience:orchestrator and
request-to:engine or request-to:product, with a source lane and stable request
key. Workers' board queries exclude audience:orchestrator; orchestrators have
a Requests view. This is a routing/context boundary, NOT access-control privacy:
any repository reader may technically open the issue. Never put secrets there.

Request body: desired outcome/use case, existing contract/evidence, blocker
impact, minimum deliverable, proposed acceptance, source work item, dependencies,
urgency and a fallback. Target orchestrator records a disposition and either
creates a normal worker-visible task, asks the source orchestrator for evidence,
or defers/rejects explicitly. Negotiation remains on the request; publish only
decided execution requirements to normal issues.

## Avoid stale intake

Every run entry and exit queries only a count/route flag for open untriaged
requests to its lane. A positive result switches into the orchestrator's intake
persona immediately; the ordinary worker does not receive the raw inbox. This
does not reset the five-run clock. No session waits for a scheduled review.

During installation enable supported issue-event notification/agent wake hooks
if the environment has an authorised agent runner. Otherwise expose the pending
Requests view and process on the very next session. A repository file cannot
execute an LLM when no session/runner is active: do not claim a 24/7 response SLA.
If background wake is unavailable, record it in config as false, not as failure
of ordinary-run dispatch. The system still triages before selecting new work.

Accepted requests should have a linked task and clear priority/trigger. A blocked
source task links the target dependency; don't continually re-request it. Target
orchestrators recheck unresolved urgent/blocked requests at each intake. Default
acknowledgement target is the next active target-lane session; wall-clock SLAs
require a separately working runner, not a calendar fiction.

## Live request discovery

Query repository issues by request/audience/target labels, not Project membership
alone, so newly created mail cannot be missed before board attachment. Every
request is also attached to the Project when possible. Dispositions with active
blockers or scheduled reassessment retain a `<!-- gvr-request -->` JSON fence
with blocks_active and/or next_check_at. Route pending, P0, active-blocking or
reassessment-due requests to intake; inbox mode lists all open own-lane requests.
A normal accepted request with a queued task need not retrigger every session.

## Session intake clearance (avoid dispatch loops)

At session entry generate a fresh run/session UUID automatically; the user does
not provide it. After disposition/reassessment, owning orchestrator invokes
`gh_context.py --mode intake-receipt --persona <lane>-orchestrator --lane <lane>
--session-id <generated-id> --receipt work/ops/<session-id>-intake.json`.
Use the same session ID/receipt for subsequent route/context calls. Receipt creation
refuses still-pending requests. It clears only the currently observed request
number/updated_at pairs for this session. New/updated requests route again;
a fresh session reassesses urgent/active blockers. Keep truthful blocks_active/P0
metadata; do not close a valid request to make dispatch proceed. This permits
accepted work to run after intake rather than looping forever. Receipts are
transient ignored work files, not another tracking SSOT. Caller must actually
perform intake; the helper does not manufacture a disposition.
