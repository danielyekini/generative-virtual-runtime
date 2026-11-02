# Native streaming authorship rules

Authority: [E006 decision](../decisions/engine/streaming-authorship-and-declarative-entities.md),
released MotionScript / Scene IR through **0.9.0**, `lintStreamingAuthorship` in
`@gvr/compiler`. Product [P006](https://github.com/danielyekini/generative-virtual-runtime/issues/47)
consumes this with the [model-facing reference contract](model-facing-reference.md).

This document states executable progressive rules from **released** syntax only.
Entity patches use declarative MotionScript 0.9.0 statements and/or host
`emitEntityPatchDelta` (`entities.durableRevisions` /
`entities.drawableBindings`).

## Executable units

| Unit | Role |
| --- | --- |
| Scene header | One `scene "…" { … };` opens the program (version, viewport, duration, `requires`). |
| Top-level declaration | Constant, camera, node/group, composition, instance, timing scope, operators, entity/geometry/bind/behaviour statements, track, step, batch, or seal ending at a depth-zero `;`. |
| Batch | Atomic multi-unit commit; children emit only if the batch succeeds. |
| Complete | `complete;` seals remaining duration and finishes authoring. |

Transport fragments are not units. A large nested `group { … };` is one unit —
children are not independently executable. UTF-8 size of one buffered unit must
stay within `maxBufferedUnitBytes` (default 1 MiB; see `@gvr/schema` limits).

## Dependency order

1. Declare every id a unit references before that unit commits (or keep the
   reference deferred until the referent arrives; a seal does not advance while
   deferred units remain — `SEAL_BLOCKED`).
2. Prefer dependency-complete batches for co-dependent creates.
3. After the **first** seal, base topology is frozen: no new constants, cameras,
   base nodes, compositions, instances, timing scopes or operators. Post-seal
   structure changes use revisioned entity patches (`APPLY_ENTITY_PATCH`), not
   new `ADD_NODES`.

## First useful seal

A first useful seal is the earliest `seal <horizon>;` where:

1. At least one drawable node is already accepted.
2. Every track/step that must be visible in `[0, horizon]` has already been
   accepted (crossing segments arrive with the earlier interval).
3. Horizon is positive and not blocked by unresolved references.

Playhead waits at the sealed frontier until content advances it. A complete
file with **zero** seals is offline-valid when `complete;` seals the duration,
but it is **not** progressively playable during generation.

## Later activation limits

- Tracks and visibility steps must not begin strictly before the sealed horizon
  (`INVALID_TIMING` / sealed-history rejection). Boundary-time writers at the
  seal are allowed.
- Entity-patch activations (`UPSERT` / `REMOVE` / `REPARENT` / `BIND_GEOMETRY` /
  behaviour activate) require `activationMs >= sealedThroughMs`.
- Cancellation drops pending uncommitted patches without rewriting sealed
  presentation.

## Naming, time and writer idioms

- Stable ids; do not reuse an id for a different semantic object.
- Time-local writers: send the cast and initial channel writers, seal, then
  append later intervals. Split tracks only at existing key boundaries so easing
  stays exact.
- Exclusive writers per channel; competing generative tracks reject.
- Named behaviours and geometry binds attach ownership on the **instance**
  entity, never by mutating a shared geometry asset.

## Errors (released)

| Situation | Typical code / effect |
| --- | --- |
| Unit larger than buffer budget | `RESOURCE_LIMIT` (buffered unit) |
| Seal while deferred refs remain | `SEAL_BLOCKED` — horizon unchanged |
| Writer/step into sealed history | `INVALID_TIMING` / `SEALED_HISTORY` |
| Stale or conflicting entity patch | Entity patch diagnostic; last accepted revision kept |
| Unknown / colliding geometry bind | `GEOMETRY_*` / `BIND_*` rejection |

## Progressive vs offline

| Class | Meaning |
| --- | --- |
| `offlineOk` | Whole program compiles / completes under released rules. |
| `progressiveOk` | `offlineOk` and stream lints report no progressive **error** findings (useful first seal, unit sizes, sealed-history writes, unresolved seal deps). |

Advisories (late first seal, setup-heavy prefix) do not alone clear `progressiveOk`
false when configured as errors; defaults treat oversized units, early empty
seals, sealed-history writes and seal-blocked horizons as errors.

## Validated examples

| Fixture | Claim |
| --- | --- |
| `fixtures/motionscript/streaming/progressive-ok.ms` | Predeclare + writers + first useful seal + later track; progressiveOk |
| `fixtures/motionscript/streaming/no-seal-offline.ms` | Offline complete, no progressive seals |
| `fixtures/motionscript/streaming/sealed-history-bad.ms` | Backdated track after seal |
| `fixtures/motionscript/streaming/early-seal-empty.ms` | Seal before any drawable |

Evidence: `packages/compiler/src/stream-lint.test.ts`.
