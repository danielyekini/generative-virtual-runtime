# 2D and scoped 3D physics integration (E011)

Decision: 2 November 2026. [Issue #30](https://github.com/danielyekini/generative-virtual-runtime/issues/30).
Decision + narrow runtime demonstrator. No MotionScript / Scene IR version bump
and no registry claim: `@gvr/runtime` `PhysicsSession` / `solveAuthoredConstraints`
are a host-level prototype (`packages/runtime/src/physics.ts`, tests in
`physics.test.ts`). Language wiring is the follow-up implementation item named
below.

## Requirement

M5 teaching stories need contact, bounce, joints and drag-driven motion that
authored keyframes alone cannot keep honest: a marble in a bowl, linked bars,
blocks that stack and topple under learner drag. Simulation must coexist with
generative tracks, behaviours and input under E002 exclusive channel ownership;
survive seek/pause via checkpoints or replay; cancel cleanly; expose seeds and
cost; and adopt E010 planar 2.5D coordinate conventions for any scoped 3D
attachment. No universal cross-platform bitwise determinism claim.

## Alternatives

1. **Authored constraints only** (position/angle limits, IK/grounding inspectors,
   no momentum). Strongest current-system option and enough for Counter-style
   rigs. Rejected as the sole contract: Marble-style free motion, stacking and
   bounce need impulse response and continuous time integration. Retained as a
   complementary non-dynamic path (`solveAuthoredConstraints`) for rigs that
   must not accumulate velocity.
2. **Embed a full 3D physics library in Scene IR** (Rapier/Cannon bodies as wire
   types). Rejected: E010 already rejected a 3D mesh backend for M5; volumetric
   rigid bodies would force a renderer-specific hit/draw path and put backend
   objects inside the portable IR.
3. **Host-owned ad-hoc simulation** (each Studio/host invents Matter.js wiring).
   Cheap locally, but seek/replay, ownership and export diverge per host.
   Rejected as the engine contract.
4. **Planar fixed-step 2D rigid-body session with physics-owned channel writes**
   (chosen). Simulation lives in the E010 world/layer XY plane (Z is spatial
   depth, not a physics degree of freedom for M5). Bodies, circle/AABB
   colliders and distance joints advance on a fixed step; the session writes
   only `(entity, channel)` pairs granted to `writerClass: "physics"`. Drag
   promotes a body to kinematic while input owns the gesture, then restores
   dynamic ownership. Checkpoints capture full sim state for seek; an event log
   replays forces/drags. A seed is recorded for any stochastic extension; the
   base profile is deterministic given the same inputs and step size. A WASM
   library (Rapier/Planck) may later back the same session API when continuous
   contact manifolds outgrow the prototype solver — that is a package swap, not
   a new public contract.

## Contract (implementation-bound)

- **Coordinates.** Physics positions are 2D in the same XY units as the 2D scene
  / E010 layer plane. Scoped 3D means a body may be *attached* to a planar
  surface id for presentation; the integrator itself stays planar. No volumetric
  inertia tensors in this profile.
- **Bodies.** `static` (immovable), `kinematic` (posed by host/input, no forces)
  and `dynamic` (integrated). Mass, restitution, friction, linear/angular
  velocity and pose `(x, y, angle)`.
- **Colliders.** Circle (`radius`) and AABB (`halfWidth`, `halfHeight`) in body
  local space. Contacts use sequential impulses; penetration is resolved with a
  bounded iteration count.
- **Joints.** Distance joints between two body anchors with optional compliance.
- **Authored constraints.** Pure position-based distance corrections without
  velocity accumulation (`solveAuthoredConstraints`) for non-dynamic rigs.
- **Fixed step.** `fixedDtMs` (default 1000/60). An accumulator advances zero or
  more steps per `advance(sceneTimeMs)`; leftover time is held. Oversize jumps
  clamp to `maxStepsPerAdvance` and report `PHYSICS_STEP_CLAMP`.
- **Ownership.** Writes go only through a `PhysicsOwnership` predicate (typically
  `EntityRevisionStore` grants with `writerClass: "physics"`). Rejected writes
  emit `PHYSICS_OWNERSHIP_REJECTED` and do not mutate host state.
- **Channels.** Language contract (E029 / `physics.planar2d`) writes
  `transform.position.x`, `transform.position.y`, `transform.rotation` (degrees)
  so ownership aligns with Scene IR tracks and input. Future work may add
  velocity/readback channels.
- **Drag / input handoff.** `beginDrag(bodyId)` → kinematic; `dragTo` sets pose;
  `endDrag` restores prior kind. Input keeps exclusive ownership of the drag
  gesture (E007); physics resumes writing only after release when ownership
  allows.
- **Seed.** `seed` is stored on the session and checkpointed. The base contact
  solver does not draw randomness; future stochastic materials must use this
  seed rather than `Math.random()`.
- **Checkpoint / seek.** `checkpoint()` returns an immutable snapshot (bodies,
  joints, accumulator, seed, event log length). `restore(snapshot)` replaces
  session state. Seeking earlier than the last checkpoint requires restore +
  replay of the event log; seeking does **not** inherit keyframe evaluate cost.
- **Event log.** External forces, wake/sleep and drag ops append to a replayable
  log for tests and Studio inspection.
- **Cost / limits.** `maxBodies`, `maxJoints`, `maxContactsPerStep`,
  `maxSolverIterations` fail closed with diagnostics. `lastCost` reports bodies,
  joints, steps taken, contacts and wall-ms for the last advance.
- **Cancel / dispose.** `reset()` clears bodies/joints/log but keeps the session;
  `dispose()` freezes further use (throws).
- **Determinism claim.** Same bodies, joints, events, seed and `fixedDtMs` produce
  the same poses in this TypeScript profile on a given engine build. No claim of
  bitwise identity across JS engines, WASM backends or future library swaps.

Out of scope here: Scene IR / MotionScript syntax, continuous collision detection,
soft bodies, fluids, motors, 3D rigid bodies, and Studio inspector UI.

## Critical pass

- *Streaming / seals.* Physics does not rewrite sealed generative tracks; it only
  writes physics-owned channels after the grant's `fromMs`.
- *Seek.* Restore + replay matches a fresh run from the same checkpoint and log.
- *Cancellation.* `reset` / `dispose` drop pending motion without mutating host
  channels after dispose.
- *Ownership conflict.* A channel owned by generative/behaviour/input rejects
  physics writes with a diagnostic; no silent overwrite.
- *Cost.* Over-limit worlds reject additions; step clamps are visible.
- *Compatibility.* Scenes without physics are unchanged (deep-equal frames).

## Child work

- **E029** ([#110](https://github.com/danielyekini/generative-virtual-runtime/issues/110)):
  version a bounded `physics.planar2d` capability (bodies/colliders/joints
  declarations, MotionScript/Scene IR bump, registry, conformance, runtime
  wiring of `PhysicsSession`, Studio sample). Authored-constraint-only programs
  may use the same capability with a `mode: "authored"` profile or stay generative.

## Revisit

- If a story needs volumetric contact, continuous manifolds beyond the prototype
  solver, or SIMD cost wins, swap in Rapier/Planck **behind** `PhysicsSession`
  and re-measure determinism/cost; do not put library types on the wire.
- If product requires soft bodies, fluids or motors, open a new decision; do not
  grow this profile silently.
- If exclusive ownership is too coarse for blended track+physics channels,
  record a priority/blend decision rather than muting conflicts.
