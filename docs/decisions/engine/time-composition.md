# Local and named time, cycles and track composition (E014)

Decision: 3 November 2026. [Issue #33](https://github.com/danielyekini/generative-virtual-runtime/issues/33).
This change adds a decision and a host/schema prototype. It does not bump the
MotionScript or Scene IR version and adds no registry claim. Language wiring is
split into the child work listed below.

## Requirement

Native stories write time by hand.

- **The City Comes Around** writes every actor as an expression over
  `(t % 30)`, built from sums of `clamp` ramps: 176 expression tracks. These
  expressions have no eases apart from hand-written `c * (2 - c)` forms. About
  15 segments fit the 256-op limit. A stride envelope has to repeat its route's
  timing in a second expression. The story names "Periodic motion without a
  cyclic track. Root cause: language."
- **A Circle in Motion** has a fall from 28s to 30s ≡ 0s to 1.5s that crosses
  the loop seam. Tracks end at 30s, so the fall became two segments, and the
  second needed a hand-derived cubic. The story asks for loop-aware timelines
  and a decision on what "before the first key" means.
- **MotionScript → Motion** and **From Pixels to Prediction** had to convert
  every beat to a percentage of a full 30s track: 647 and 1,386 percentage
  literals. Neither story used per-beat tracks, because "it was not verified
  what the value is in the gap between two touching tracks".
- **Clockwork** repeats the same settle, fade and spin in 90 keyframe tracks.

The issue asks for:

- seconds and named beats;
- gaps and holds;
- periodic scopes;
- angle and facing rules;
- the precedence of event writers over state writers.

It also asks to keep finite repetition separate from arbitrary loops, and to
state streaming behaviour and old semantics explicitly.

The authoring gates of 3 November 2026 apply: intent should be readable without
arithmetic, generators should write it safely, and streaming must stay honest.

## Alternatives

1. **Status quo: expressions over `t % P`, or keys unrolled over the whole
   scene.** This is the strongest current-system option. It works today and
   is exact at the seam. It is rejected as the contract for four reasons:
   - It moves easing, segment timing and phase into calculator arithmetic.
   - It hits the expression op limit at about 15 segments.
   - Generators must re-derive every ramp when a beat moves.
   - Unrolled keys are not exact at the seam unless the author solves the
     boundary derivatives, as Circle did.

   Expressions stay valid for genuinely continuous functions such as `sin`
   bobbing.
2. **A scene-level `loop` flag.** It would wrap root time at the scene's
   duration. Rejected as the slice:
   - It gives one period to the whole program, whereas City has 3s, 5s, 6s,
     15s and 30s actors.
   - It cannot phase one actor against another.
   - It confuses program content with how the host plays it back.

   Host playback looping stays a host option.
3. **General loops, functions or timers in MotionScript.** Rejected, because
   this is the "stop for a design decision" class in AGENTS.md. Arbitrary
   loops are unbounded, so generators and streams cannot predict their effect
   on sealed history. Nothing in the evidence needs control flow. It needs
   periodic time.
4. **Cyclic timing scopes, timed keys, named beats and an explicit ownership
   rule (chosen).** These extend the existing `timing.localScopes` mapping
   instead of adding a new execution model. A track keeps its own interval
   and eases, and the scope decides which instant it sees.

## Contract (implementation-bound prototype)

### Seconds and named beats

- **Timed keys.** The proposed syntax is `at 4.4s <value> [ease …];`. Keys are
  written at times instead of percentages. The track starts at the first key
  and lasts until the last one. The compiler lowers them to the existing
  offset representation with exact quotients
  (`secondsKeysToTrack`). This is a MotionScript change only, because Scene IR
  already stores `startMs`, `durationMs` and offsets. Percentage keys stay
  valid.
- **Named beats.** The proposed syntax is `beat cross at intro + 4.4s;`. A beat
  is a compile-time constant time. A reference must name an earlier beat:
  forward references, duplicates and negative or non-finite results are
  rejected (`resolveBeats`). Durations and key times may name a beat. A beat
  read by a streamed unit therefore never changes later. Beats do not create
  scopes. A beat-local track uses an ordinary affine `timing` scope whose
  offset is the beat. That was Pixels' untested hypothesis, and the prototype
  confirms that composition (see the stride test).

### Gaps and holds (existing rule, now specified and pinned)

The runtime already does the following, and conformance now pins it:

- Writers on one scalar use half-open intervals `[start, end)`. When several
  are active, the latest start wins, then the composition order, then the
  declaration index.
- At a shared boundary, the later track owns the instant.
- In a gap, the latest-ended `fill forwards` writer holds its last key.
  Otherwise the channel shows its **authored base** value. It does not show
  the earlier track's end.
- There is no backwards fill. Before the first writer starts, the base applies.

This answers the question MotionScript → Motion left open. Per-beat `animate`
blocks with `fill forwards` are a safe alternative to full-length percentage
tracks.

### Cyclic scopes: finite repetition is not a loop

A timing scope may add `period <duration>;`, and then optionally
`repeat <n>;`:

- **Unbounded cycle** (`period P`, no `repeat`). Local time is the non-negative
  modulo of the affine time, `wrap((parent − offset) / stretch, P)`. This holds
  on both sides of the offset, so **the offset is a phase**. A segment may run
  through the scene seam: Circle's fall becomes one easeIn segment in a cycle
  phased to 28s. Cycles are half-open, so the boundary is the start of the
  next cycle, and the result is never `P` itself.
- **Finite repetition** (`period P; repeat N;`, with `1 ≤ N ≤ 10 000`).
  - Before the affine time reaches 0, the scope is not entered. Local time
    stays negative, so tracks are inactive and the base or earlier writers
    apply.
  - For N periods it wraps.
  - Afterwards it is pinned at `P`, so the last cycle's `fill forwards` holds
    apply.
  - A repeat count without a period is invalid.
- **Composition.** Cyclic scopes nest under affine scopes in either direction,
  for example a stride cycle inside a beat scope, applied root to leaf
  (`cyclicLocalTimeMs`). With no `period`, a scope maps exactly as
  `timing.localScopes` does today.
- **Expressions.** `t` stays absolute scene time. `local_t` and `progress`
  follow the cyclic local time, so `sin(local_t …)` restarts each cycle.
- **Cost.** Each tracked scope costs one affine map and one modulo per sample.
  City's van route is one 442-character expression with nine `clamp` calls.
  As timed keys it is nine keys with named eases.

### Angles and facing

- `transform.rotation` stays **unwrapped degrees**, interpolated linearly.
  720° is two turns. This is the rule rolling, spins and Circle's 0 → 720 → 900°
  wheel rely on.
- A cyclic spin writes 0 → 360 per period, and its seam is exact because the
  matrices are equal.
- A "shortest arc" interpolation mode is **rejected**. It would silently
  reinterpret every existing roll and spin.
- To face the direction of travel along a path, use the released
  `geometry.pathProgress` `orient`.
- Facing the velocity of keyed position, as City's walkers and turning
  vehicles need, is deferred. One story is weak evidence, and it would need
  its own ownership rule, as `orient` has. Rotation remains a separate writer.

### Writers of events over state (one owner per channel per instant)

- **Continuous state writers** are tracks.
- **Discrete event writers** are steps on `visible` and `content`, plus input
  actions.
- **Simulations** are physics.
- **Derived writers** are path attachments.

Exclusive ownership (E002/E007/E011) stays the rule. Events and continuous
writers never blend on one channel. Input-owned and physics-owned channels
already reject tracks.

Cyclic scopes add one rule: **a channel written inside a cyclic chain is owned
by that chain** (`cyclicOwnershipConflicts`). Any root writer, affine-scoped
writer or writer in a different cycle on the same scalar is rejected, because
the cyclic writer can be active at every root instant the scope covers.

Steps may name a cyclic scope, as City's café sign does when it alternates two
states. At local time L the step's value is the last step at or before L.
Before a cycle's first step, the previous cycle's final step carries over.
Before the first cycle of a finite repetition, the step contributes nothing
(`resolveCyclicStep`).

### Streaming

The existing per-interval seal rules stay unchanged for affine scopes. A
writer may join a scope whose chain contains a cycle only while the sealed
frontier has not passed the scope's entry (`cyclicWriterAdmissible`):

- For a finite repetition, the entry is the root time of local 0 in the first
  cycle.
- For an unbounded cycle, or a cycle under negative stretch, the entry is −∞.
  Every writer for that cycle must therefore arrive before the first seal.

The reason is that a late writer in a cycle would change cycles that have
already been sealed. Generators should send a loop's complete cycle as one
dependency-complete unit, then seal.

### Old semantics

The following do not change:

- programs at 0.22.0 or earlier;
- scopes without `period`;
- percentage keys;
- `fill`;
- steps without a scope;
- expressions.

Nothing reinterprets an existing scope. Cyclic behaviour exists only where a
program declares a period and requires the new capability.

## Authoring assessment

1. **Simplicity.** Authors write an actor's route as seconds and eases, plus
   one `period` and phase. The modulo, clamp and percentage arithmetic go
   away.
2. **Generation.** Models already write `animate` and `keyframes`. Timed keys
   and beats remove the most error-prone conversion (seconds to percentages).
   Periods make loop seams exact without derivative algebra.
3. **Streaming.** Cycles are complete before their first sealed instant, beats
   are fixed when declared, and ownership is exclusive. No sealed prefix can be
   reinterpreted.
4. **Expressiveness.** This is bounded. It adds repetition of time, not
   control flow. Finite repetition and loops are distinct and both have a
   maximum.

## Critical pass

Prototype tests:

- `packages/schema/src/cyclic-timing.test.ts` covers:
  - affine scopes identical to `localTimeMs`;
  - offset as phase on both sides of the offset;
  - half-open wrap with floating-point guarding;
  - finite repetition: not entered before, pinned after;
  - nested beat and stride composition;
  - validation;
  - seal admissibility;
  - exclusive cyclic ownership;
  - cyclic step carry;
  - beats and timed keys.
- `packages/runtime/src/cyclic-timing.test.ts` runs through the production
  sampler and covers:
  - **City's van route.** The 442-character `t % 30` expression and nine timed
    keys under a 30s cycle differ by at most the story's own coefficient
    rounding, bounded at 0.051 units. The van repeats exactly at +30s and
    +90s.
  - **Circle's fall** as one eased segment through the seam. 0s equals 30s
    exactly, and velocity is continuous to within 1%.
  - **The gap and hold rule** above.

The full `npm run verify` remains the integration gate. None of this is
claimed as language support until the child issues ship versioned
capabilities.

## Child work

- **E043 ([#196](https://github.com/danielyekini/generative-virtual-runtime/issues/196)): version `timing.cyclicScopes`.** Covers `period` / `repeat` on
  `timing` and scoped steps, and changes Scene IR sampling, so it needs a
  MotionScript and Scene IR bump. It also needs:
  - validator ownership and seal rules;
  - registry and conformance;
  - a Studio test frame (a phased loop and a finite blink).
- **E044 ([#197](https://github.com/danielyekini/generative-virtual-runtime/issues/197)): version `timing.timedKeys` and named beats.** Covers `at <time>` keys
  and `beat` constants. This is MotionScript syntax only, lowered to existing
  offsets, so Scene IR is unchanged. It needs a registry row, conformance, and
  an update to the authoring reference used by generation.
- **Deferred, no issue:** velocity-facing for keyed motion, shortest-arc
  rotation (rejected above), and scene-level loop playback, which is a host
  option.

## Revisit

- If a story needs a cycle whose period changes over time (accelerating
  cycles), record a new decision. Do not stretch-animate a cyclic scope.
- If generators still emit `t % P` expressions after E043, look at the
  generation reference before adding syntax.
- If cyclic ownership blocks a real composition, such as a looped bob plus a
  one-off jump on the same channel, prefer a parent group for one writer. Only
  propose additive composition with evidence.
