# Persistent entities, revisions and independent behaviours (E002)

Decision: 2 November 2026. [Issue #21](https://github.com/danielyekini/generative-virtual-runtime/issues/21).
Design + critical prototype only. No MotionScript / Scene IR version bump in this
change. Language ops and streaming activation ship under E004/E005 with explicit
versioning.

## Requirement

M2 needs stable semantic entities, atomic edits, named independent behaviours and
compact revision/time-aware context for a roof-remove / pillar-add / ongoing-rotation
slice under streaming seals. Append-only predeclared topology cannot express late
structure changes. Capacity rules forbid mutating accepted nested values in place.

## Alternatives

1. **Keep append-only sealed streaming + predeclared topology** (current contract:
   `StreamingRuntime.assemble`, compiler `frozen` after first seal,
   `docs/design/capacity-transactions.md`). Strongest status-quo option. Rejected
   for M2: `ADD_NODES` / base definitions are frozen after the first seal; removing
   a roof, inserting a pillar, or attaching a named independent rotation after seal
   is impossible without inventing topology ops or rewriting sealed history.

2. **Mutable in-place scene graph after seal.** Rejected: aliases into the queued
   assembled candidate; rewrites sealed presentation; breaks shallow-container
   transactions and cancellation discard semantics from E001/capacity work.

3. **Revisioned immutable entity patches with explicit ownership** (chosen).
   Stable entity IDs; patches replace list/map containers or whole entity records;
   topology and behaviour activation take effect only at `activationMs` that does
   not rewrite the sealed presentation prefix; channel ownership is exclusive;
   generative / behaviour / future input / physics are writer classes that must
   grant or revoke ownership rather than silently overlapping. Critical prototype:
   `@gvr/runtime` `EntityRevisionStore` (`packages/runtime/src/entities.ts`).

## Contract (implementation-bound)

- **Identity.** Entity IDs are stable across revisions. Presence is a revisioned
  fact (`present`), not silent ID reuse for a different semantic object.
- **Immutability.** Accepted entity maps, ownership tables and behaviour tables are
  never mutated. A candidate copies those containers; rejection discards the
  candidate; flush publishes it (same pattern as streaming assemble).
- **Sealed presentation.** While `sceneTimeMs <= sealedThroughMs`, evaluate the
  topology/ownership that was effective at the seal. Patches whose activation
  would change that sealed prefix are rejected (`SEALED_HISTORY`).
- **Activation after seals.** Topology upsert/remove/reparent and behaviour
  activation may occur at `activationMs >= sealedThroughMs`. Playback past the
  seal sees the new facts; the sealed prefix does not.
- **Ownership.** At most one owner per `(entityId, channel)` overlapping interval.
  Generative tracks keep today’s exclusive-writer rule. Named behaviours and later
  input/physics writers must obtain ownership; conflicts reject the patch.
- **Behaviours.** Named records attached to an entity/channel with an activation
  time. Cancellation/dispose drops pending uncommitted patches and deactivates
  behaviours without rewriting sealed history.
- **Compact context.** `context(entityId)` returns revision, seal, entity record,
  ownership grants and behaviours for that id only — not a full scene dump.
- **Patch rejection.** Stale revision, sealed-history rewrite, unknown entity,
  ownership conflict and malformed activation keep the last accepted revision.

Out of scope here: Scene IR / MotionScript syntax, drawable sampling of
composition instances, bindings/reuse (E005), and host inspector UI.

## Critical pass

Prototype tests cover roof remove + pillar upsert after seal, independent rotation
behaviour ownership, sealed-prefix invariance, stale/conflict rejection, compact
context, and cancel-before-commit. Full `npm run verify` remains the integration
gate. Do not claim language support until E004 ships versioned ops.

## Child work

- **E004** (#23): implement durable revision/edit ops and the roof/pillar/rotation
  vertical slice on this contract (versioned Scene IR / compiler / runtime wiring).
- **E005** (#24): drawable reuse, channel bindings and behaviour ownership against
  the same ownership table; streaming activation rules for shared geometry.

## Revisit

If a product story requires rewriting already-presented sealed topology, stop and
redesign presentation semantics — do not mute seal checks. If ownership for
input/physics needs priority rather than exclusive grants, record that as a new
bounded decision before widening writer classes.
