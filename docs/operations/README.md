# Autonomous GVR operations

Read the [charter](../project/charter.md), your [engine](../workstreams/engine/direction.md)
or [product](../workstreams/product/direction.md) direction, and [config](config.json).
Then invoke one canonical [persona](../../AGENTS.md). Use its explicit SKILL.md path
if this runtime does not load repository skills automatically. Personal skill
installation is neither necessary nor authorised by this repository setup.

## Dispatch

Requires Python 3 and authenticated GitHub CLI with repository and Projects access.
From repository root, generate a session UUID automatically (`python3 -c "import uuid; print(uuid.uuid4())"`)
and keep it for the session; pass it using `--session-id` and a matching ignored
`--receipt work/ops/<id>-intake.json` to the following calls:

```sh
python3 tools/gvr-ops/gh_context.py --lane engine --mode route
python3 tools/gvr-ops/gh_context.py --lane engine --mode context
```

Substitute `product` for the other lane. Route flags contain no raw request bodies.
If intake/review is required, read the owning orchestrator skill first, then use
`--mode inbox --persona <lane>-orchestrator`. After actual intake, create its
session receipt as described in [inbox.md](inbox.md) and return to worker context.
Recheck live state before claiming or writing; the reader is not a task lock.

Issue comments record [claims/handovers/dependencies](run.md); clock comments
record deduplicated terminal outcomes and exact review coverage. Normal queues
exclude requests/reviews/clocks and require completed execution dependencies.
No authorised always-on runner is configured: intake occurs at the next active
session and at implementation checkpoints, independently of five-run reviews.

## Checks and installation

`npm run verify` is the mandatory complete submission/final integration gate.
[Command coverage](checks.md), [Git lifecycle](git.md),
[installation receipt](installation-receipt.md), [supersession map](migration-map.md),
and [decision](../decisions/2026-10-30-operating-structure.md) explain scope.
The [reference generator](../../tools/gvr-ops/current_capabilities.py) keeps the
capability index grounded in current authorities. It is not the future model
syntax reference.

The installer keeps `installed=false` until Project read/write, fields,
repository links, remote routing and acceptance are verified. Do not dispatch
features through an invented Project or a local status table. Finish the live
setup from the linked installation work item when the one-time credential is ready.
