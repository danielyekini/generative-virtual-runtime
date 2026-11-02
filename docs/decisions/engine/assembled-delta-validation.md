# Assembled delta admission (E001)

Decision: 2 November 2026. [Issue #20](https://github.com/danielyekini/generative-virtual-runtime/issues/20).
Compatible validation repair under MotionScript / Scene IR 0.5.0, wire 0.1/0.2;
no new syntax, sampling rules, topology editing or host event API.

Requirement: validate a dependency-complete delta against accepted state plus
already queued deltas, before any accepted revision/history/seal changes. The
PR #11 reproduction compiles but streaming rejects `Other.b` in both immediate
and deferred flush modes because its transform parent belongs to an earlier unit.

Alternatives: (1) continue isolated validation and relax missing-reference checks;
this fixes one false rejection but admits unresolved references, duplicate IDs,
writer conflicts and excess total resource use. (2) validate after mutating and
roll back; this needs a complete journal and risks accepted object aliases.
(3) assemble detached list containers and use the existing full scene validator.
Choose (3): retain all contextual checks without maintaining another validator.
E003 later landed identity WeakMap reuse of immutable path/keyframe walks
(`docs/decisions/engine/immutable-validation-facts.md`); assembled admission
still runs full contextual checks every candidate.

Full-scene validation now also checks root transform parents (the old root
`continue` skipped them). The full suite exposed the emitter relying on that
hole for forward-parent paint order. Emit transform-parent node definitions in
one existing atomic batch, preserving declaration order. Compiler batch children
lower inside the transaction, with full contextual validation at the outer
boundary rather than rejecting an incomplete child prefix. Lowering diagnostics,
sealed-history guards and nested rollback remain active. A missing final parent
still rejects the whole batch. This is the existing dependency-complete batch
contract, not automatic deferral of unrelated standalone node units.

Compiler headers snapshot their list containers at emission. Previously a header
could acquire operators/instances/resources added by later units through array
aliases, so replay of a completed compile differed from live draining. Payload
values remain immutable; copying list containers preserves the capacity design.

Admission uses envelope/payload shape checks, revision and bounded-queue guards,
a privately owned copy of the incoming payload, and a candidate assembled from
the last queued/accepted scene. Full-scene validation then checks references,
timing, writers, profiles and total limits. Lifecycle checks enforce ordered
headers, advancing seals, frozen base definitions and no writes behind a seal
or after completion. Scoped writers use root-time conversion. Failures keep
original codes/paths/targets and add initiating delta/span attribution.

Only one queued candidate is retained; the queue holds primitive result metadata,
not a full snapshot per delta. Flush publishes that candidate and returns each
admitted revision. Cancellation drops the candidate and queue. Payload copying
owns only incoming values; accepted geometry is shared between candidate list
containers and never mutated. Public scene access retains its existing reader
contract. Incremental validation caching/persistent editing needs another design.

Critical pass / gates: valid accepted/queued cross-unit parents, candidate-local
references, root-parent holes/cycles, header profile/resource updates, missing
references, duplicate IDs, writer conflicts, cumulative limits, malformed payloads,
stale revisions/overflow, failed mixed seal batches, sealed/scoped history,
post-complete rejection, caller payload mutation and cancellation. Compare offline
IR and production runtime frames across enqueue/flush schedules. Run full verify.
Revisit if full validation cost obstructs selected workloads; never relax a check
to recover throughput. Project write permission is an external tracking blocker,
not a reason to invent a successful board transition.
