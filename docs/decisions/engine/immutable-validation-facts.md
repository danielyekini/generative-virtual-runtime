# Immutable path/keyframe validation-fact reuse (E003)

Decision: 2 November 2026. [Issue #22](https://github.com/danielyekini/generative-virtual-runtime/issues/22).
Compatible performance repair under MotionScript / Scene IR 0.7.0, wire `"0.2"`;
no new syntax, sampling rules or capability. Package bump only.

## Requirement

Crane (`a-crane-then-a-square`) still spent most of compile time in repeated
full `validateSceneIR` walks after E001 assembled-delta admission and capacity
shallow clones. Profile remaining cost; compare safe scoped reuse with full
payload walks; keep contextual reference/writer/timing/seal/limit checks; keep
cache memory bounded. Accept measured benefit or record justified no-change.

## Alternatives

1. **No cache** (status quo). Full path/keyframe walks every unit. Rejected:
   Crane validate phase ~2.6s of ~2.7s wall on this machine after warmup.
2. **Skip whole-scene validation after first admit.** Rejected: would drop
   writer/reference/seal checks that E001 requires on every assembled candidate.
3. **Identity WeakMap reuse of immutable path/keyframe payloads** (chosen).
   Nested arrays are shared by reference and contractually immutable. Cache
   successful `readPath` / `readKeyframes` results keyed by array identity.
   Graph, overlap, timing, seal frontier and aggregate limits always re-run.

## Measurement (this machine, after warmup)

| Mode | Wall compile | `compile.validate_ms` mean × count |
| --- | --- | --- |
| Full payload walks | ~2732 ms | ~2.90 × 913 ≈ 2.65 s |
| Identity reuse | ~251 ms | ~0.17 × 913 ≈ 0.15 s |

Fact counters on Crane: ~184k hits / ~21k misses. Memory stays WeakMap-tied to
live scene objects; abandoned candidates GC with their arrays.

## Contract

Implemented in `packages/schema/src/validate.ts`. Tests:
`packages/schema/src/immutable-validation-facts.test.ts` plus existing
streaming-admission / validate / transactions suites. No language version bump.

## Revisit

If product stories mutate accepted nested geometry/keyframes in place, stop and
redesign — do not weaken immutability. Persistent revision-keyed topology
indexes remain a later option if identity reuse stops covering the workload.
