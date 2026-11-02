# Streaming authorship rules and declarative entity statements (E006)

Decision: 2 November 2026. [Issue #25](https://github.com/danielyekini/generative-virtual-runtime/issues/25).
Coordinates product [P006](https://github.com/danielyekini/generative-virtual-runtime/issues/47).

## Requirement

Native progressive authoring needs executable-unit, seal, dependency and writer
rules drawn from **released** MotionScript / Scene IR (through 0.7.0), plus a
compact reference contract that P006 can generate into a model-facing snapshot.
Declarative MotionScript statements for released 0.6–0.7 entity ops remain open
and must not be silently claimed in generation context.

## Alternatives

1. **Document-only recipes without machine lints** (status-quo prose in the
   authoring guide). Rejected: offline-valid programs still fail progressive
   play; P006 needs stable finding codes and validated examples.

2. **Ship declarative `entity` / `behaviour` / `geometry` / `bind` syntax in
   this change (MotionScript 0.8.0)** while also writing the streaming contract.
   Strong product desire, but a simultaneous grammar + registry + conformance
   bump competes with the streaming-rules deliverable and risks filling the
   model snapshot with unproven idioms. Deferred as follow-up implementation.

3. **Compact streaming contract + stream linter against released syntax; keep
   `emitEntityPatchDelta` as the released entity-authorship path; record the
   declarative statement design without claiming it** (chosen). Meets E006
   acceptance, unblocks P006, and preserves version/registry honesty.

## Chosen scope

### Streaming authorship (released)

Normative rules live in
[`docs/contracts/streaming-authorship.md`](../../contracts/streaming-authorship.md).
Machine checks: `lintStreamingAuthorship` in `@gvr/compiler`. Validated fixtures
under `fixtures/motionscript/streaming/`. Offline validity and progressive
playability are independent booleans.

### Model-facing generation contract

[`docs/contracts/model-facing-reference.md`](../../contracts/model-facing-reference.md)
names the released authorities, excludes, hash/profile fields and staleness
guard that P006 must implement. Unimplemented declarative entity syntax is
**out** of the generation snapshot until a published version claims it.

### Declarative statement design (not released)

Target surface maps 1:1 onto released Scene IR ops (0.6–0.7):

| Proposed MotionScript | Released op / capability |
| --- | --- |
| `geometry <id> { space …; <drawable…>; };` | `REGISTER_GEOMETRY` / `entities.drawableBindings` |
| `entity <id> { …optional private node… };` | `UPSERT_ENTITY` (+ optional `node`) / `entities.durableRevisions` |
| `bind <entityId> to <geometryId> at <time>;` | `BIND_GEOMETRY` |
| `remove entity <id> at <time>;` | `REMOVE_ENTITY` |
| `reparent <id> under <parent\|root> at <time>;` | `REPARENT` |
| `behaviour <id> on <entity>.<channel> { …; activate at <time>; };` | `ACTIVATE_BEHAVIOUR` + ownership grant |
| `cancel behaviour <id>;` | `CANCEL_BEHAVIOUR` |

Constraints carried from E002/E004/E005/E023:

- Activation/bind times must be `>= sealedThroughMs` (sealed left-limit).
- Exclusive `(entityId, channel)` ownership; geometry assets are immutable leaves.
- Geometry ids disjoint from entity ids; self-bind and unknown geometry fail closed.
- Programs gate with `requires "entities.durableRevisions"` and, for geometry
  register/bind, `requires "entities.drawableBindings"`.
- Until syntax ships, hosts/tests use `emitEntityPatchDelta` only.

Follow-up implementation issue owns grammar, registry, conformance and the
MotionScript / Scene IR version bump together. Revisit if a product story needs
writable shared geometry or nested geometry assets (already out of E005 scope).

## Critical pass

- Stream linter separates compile/runtime rejection from progressive advisories.
- Progressive fixtures prove a first useful seal with writers before the seal and
  later activation after the seal without rewriting sealed history.
- Model-facing contract forbids roadmap/decision dumps and unreleased syntax.
- Entity declarative design does not alter 0.6.0 / 0.7.0 published version files.

## Acceptance links

- Contract: `docs/contracts/streaming-authorship.md`
- Generation inputs: `docs/contracts/model-facing-reference.md`
- Linter: `packages/compiler/src/stream-lint.ts`
- Examples: `fixtures/motionscript/streaming/`
