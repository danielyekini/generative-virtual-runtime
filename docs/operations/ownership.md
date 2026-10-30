# Workstream ownership and boundaries

| Owner | Default areas | Responsibility |
| --- | --- | --- |
| Engine | packages/schema, compiler, runtime, canvas-renderer, native emitter; core benchmarks/fixtures/contracts; relevant docs/languages and design | Language/execution truth, safety/capacity, streaming and native semantics |
| Product | app/playground and later customer/model hosts; UI assets; host adapters; generation prompts/evaluation; Studio/product docs | Human workflows, agent access surfaces, model orchestration and experience |
| Joint agreement | Scene/event/edit/telemetry contracts, resource/media clocks, package exports, cross-lane host APIs, root config | One named owner on the issue; bounded cross-lane request before changing shared assumptions |

Ownership is a soft coordination boundary, not a prohibition on a necessary
small fix. Announce justified cross-boundary edits on the affected issue/request;
avoid competing edits to the same contract/file. Product must not duplicate or
change engine semantics privately; engine must not redesign customer/Studio UX.
Both may add headless verification tools appropriate to their owned layer.
Existing importers remain maintained legacy; repair only relevant regressions
or user-requested use, not broad parity expansion.
