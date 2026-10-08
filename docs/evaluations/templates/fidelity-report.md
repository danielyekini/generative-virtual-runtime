# Fidelity run <UTC-id>

Stop: success / budget-exhausted / blocker / design-escalation

## Implementation, scope and continuation

Initial/final commit or complete reproducible dirty snapshots; package/language/wire/dependency versions; frozen policy/settings hash; accepted source profile, quarantines, comparison run, budgets, causes, cumulative attempts and nextCause. Record repository checks and any NOT_RUN stages.

## Exact source/program identity and lineage

For every fixture/attempt record source path/bytes/SHA-256, generated program path/bytes/SHA-256, imported/compiled scene hashes, implementation pin and required capabilities. Record canonical revision/parent IDs and hashes if reserved; null/NOT_RECORDED for unregistered scratch or missing historical metadata, never invented lineage. Retain original generated paths; promotion uses the separate sample registry/storage rules.

## Measurements and evidence association

Associate each conversion, semantic round-trip, visual, reference, material-review and coverage result with its immutable run/path/SHA-256, exact source/program/scene hashes, implementation and policy hashes, route, scheduled/actual times and captured/expected counts. Pipeline hashes identify generation bytes, not later visual certification; verify the same bytes were used before associating evidence. Include rejected attempts, before/after measurements and limitations. Missing measurements are NOT_RUN, missing provenance NOT_RECORDED, incomplete quality UNVERIFIED.

## Independent fidelity statuses and handoff

Record fidelityPassed, conversionStatus, roundTripStatus, visualStatus and coverageStatus independently, plus regression/resource checks. New fidelity records omit authoringPassed. Historical records remain readable without inferring absent fields. Only actually per-sample verified programs may be registered as authoring inputs; name source/program hashes and provenance. Refinement runs and their results remain separate. A pass covers only this implementation/profile/window.
