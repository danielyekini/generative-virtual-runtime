# Abstraction and language evolution policy

Status: living supporting policy, revision 1.0, 2026-10-08. Agents may improve this rubric with evidence. Released compatibility rules remain authoritative.

## Decision ladder

| Option | Appropriate evidence |
| --- | --- |
| Existing-language rewrite | Released constructs express the need with acceptable cost and clarity |
| Recipe/example | A learnable composition technique solves recurring authoring mistakes |
| Package | Reusable domain behaviour can be built with existing semantics |
| Standard API | Stable runtime/host functionality is required across domains |
| Syntax sugar | Existing semantics are adequate but their common expression is cumbersome |
| Core semantic construct | A recurring semantic need cannot be expressed correctly or composition imposes demonstrated substantial cost |

A package is a candidate, not an assumed available facility. Check current language/module support before proposing or using one. Importer-only lowering can be verbose without proving core semantics are insufficient. Compare abstraction at importer, emitter, source language and runtime layers.

## Required argument

Use the proposal template. Include several independent examples, strongest existing-language implementations, repeated pattern, intended scope and non-goals, exact semantics, streaming effects, runtime expansion, generation/editability effects, alternatives and counterexamples. Three independent examples are a useful initial minimum, not proof; a fundamental semantic gap may justify a proposal with fewer if the limitation is rigorously demonstrated. Record evidence strength explicitly.

Show gains on development examples and held-out samples. Keep quality and resource limits fixed. Prefer a Pareto improvement; justify any trade-off explicitly. No fixed token-savings percentage establishes sufficient value by itself. Consider conceptual burden, ambiguous interactions, diagnostics, backwards compatibility and implementation maintenance.

## Representation and dependency rules

Specify parameter types/defaults, binding/scope, evaluation time, ownership of tracks/properties, coordinate spaces, deterministic random behaviour, dependency versions, cancellation/seek behaviour and source diagnostics where applicable. Account for external resources and reproducible package resolution. Dynamic features must not silently undermine deterministic animation.

## Release rules

Use AGENTS.md and compatibility-policy.md. Guidance edits require documentation revisions, not language bumps. An importer fix does not change language releases; changed implementation packages follow package version policy. New syntax/semantics can require MotionScript changes; new validated fields or sampling rules can require Scene IR changes. Do not bump both automatically. Update pending drafts, registry, conformance and release records according to actual affected contracts. Published version files and historical evaluations are immutable.

## Change log

- 1.0: Initial evidence-driven decision rubric and compatibility boundaries.
