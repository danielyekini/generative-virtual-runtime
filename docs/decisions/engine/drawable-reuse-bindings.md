# Drawable reuse, channel bindings and behaviour ownership (E005)

Decision: 2 November 2026. [Issue #24](https://github.com/danielyekini/generative-virtual-runtime/issues/24).
Design + critical prototype. No MotionScript / Scene IR version bump in this
change. Language ops and sampling projection ship under a follow-up
implementation issue with explicit versioning.

## Requirement

M2 needs repeated drawables (windows, chips, motifs) that share immutable
geometry while keeping per-instance transforms, exclusive channel ownership and
post-seal streaming activation under the E002/E004 entity contract. Predeclared
`composition.definitions` / `instances` are authoring sugar that still do not
participate in entity ownership or post-seal topology; expand-everything after
seal is expensive and fights capacity goals.

## Alternatives

1. **Expand-on-admit / private node copies** (strongest current-system option).
   Treat each instance as a full `NodeDefinition` / entity with duplicated
   geometry (today’s practical path once instances are projected). Ownership and
   behaviours attach cleanly to expanded ids. Rejected for M2 reuse: memory and
   patch size scale with instance count; post-seal activation still copies the
   whole drawable; shared motif edits require N patches.

2. **Hierarchy-only unique drawables (no reuse).** Every visual is its own
   entity/node. Simplest ownership story. Rejected: fails the repeated-motif
   workload and streaming budgets called out in E005 acceptance.

3. **Mutable shared geometry with multi-writer sampling.** One live geometry
   mutated by many instances. Rejected: aliases into accepted nested values;
   breaks E002 immutability and exclusive ownership.

4. **Shared immutable geometry + instance bindings** (chosen). Geometry assets
   are registered once and never mutated. Drawable entities bind to a geometry
   id with activation times that respect seals. Presentation clones the asset
   under the instance entity id. Channel ownership and named behaviours remain
   exclusive per `(entityId, channel)` on the instance — not on the asset.
   Typed dependency edge is `entity → geometry`; geometry assets are leaves, so
   cycles are id collisions or self-binds (rejected). Spaces are recorded on the
   asset (`world` | `local`) for later projection rules.

## Contract (implementation-bound prototype)

- **Geometry assets.** `REGISTER_GEOMETRY` publishes an immutable
  `GeometryAsset` (`id`, `space`, `node`). Re-registering the same id fails
  (`GEOMETRY_CONFLICT`). Geometry ids must not collide with entity ids
  (`BIND_CYCLE`).
- **Bindings.** `BIND_GEOMETRY` attaches a present drawable entity to a known
  geometry at `activationMs >= sealedThroughMs`. Unknown geometry /
  non-drawable / self-bind fail closed.
- **Ownership.** Unchanged E002 table: competing writers on one instance
  conflict; two instances sharing geometry may each own `transform.rotation`.
- **Sealed presentation.** Bind activations before the seal are rejected.
  Activation at/after the seal is invisible to the sealed left-limit sample.
- **Budgets.** `drawableBudget(t)` reports `geometryAssets`, `boundInstances`,
  `expandedGeometryPayloads`, `retainedGeometryPayloads` and `retainedUnits`
  so hosts can compare shared payloads against expansion.
- **Resolve.** `resolveDrawable(entityId, t)` returns a cloned node with the
  instance id, or the private entity node when unbound.

Out of scope here: Scene IR / MotionScript syntax for bind/register, runtime
`projectScene` sampling of bindings into draw lists, and composition.instances
parity. Those land in the follow-up implementation issue.

## Critical pass

Prototype tests in `packages/runtime/src/drawable-reuse.test.ts`:

- Two windows share one pane; independent rotation behaviours; reuse budget
  beats expansion (`retainedUnits < expanded + assets` when assets are shared).
- Held-out three-chip scene: third chip binds after seal; sealed prefix unchanged.
- Cycle / unknown geometry / id-collision / sealed-history rejection.

Full `npm run verify` remains the integration gate. Do not claim language
support until the follow-up ships a versioned capability.

## Child work

- **Follow-up implementation** ([E023](https://github.com/danielyekini/generative-virtual-runtime/issues/86)):
  versioned Scene IR / MotionScript 0.7.0 capability `entities.drawableBindings`
  wiring `REGISTER_GEOMETRY` / `BIND_GEOMETRY` through `APPLY_ENTITY_PATCH` and
  projecting bound drawables in `StreamingRuntime` / `projectScene`. Shipped with
  that release; `composition.instances` remain non-drawing records.

## Revisit

If product stories need writable shared geometry (one edit updates all
instances’ intrinsic shape after seal), stop and redesign — do not mute
immutability. If geometry assets must nest other assets, extend the dependency
graph with explicit cycle detection before claiming that shape.
