# Standalone transform.autoOrient versus stop (E054)

Decision: 4 November 2026.
[Issue #238](https://github.com/danielyekini/generative-virtual-runtime/issues/238).
Decision record. **Stop.** This change has no MotionScript / Scene IR version
bump and no new capability. `transform.autoOrient` stays an `unsupported`
registry row and leaves the pending-language lists, as E049 did for width
profiles. This is not a Lottie `ks.ao` import campaign.

Parents: [path-progress-geometry-authoring.md](path-progress-geometry-authoring.md)
(E015) and [time-composition.md](time-composition.md) (E014). E014 deferred
velocity-facing of keyed position as weak single-story evidence.

## Requirement

Decide whether a standalone auto-orient is justified as a versioned capability.
That means rotation derived from the tangent of a node's own keyed position,
distinct from path-attachment `orient`. The alternative is to stop, keeping
`geometry.pathProgress` `orient` plus explicit unwrapped rotation tracks. The
record must cover ownership, streaming and seal behaviour, seek, and the effect
on authoring and generation.

## Current facts

| Facing need | Released mechanism |
| --- | --- |
| Travel along a route | `attach <node> along <path> { progress …; orient true; }` (0.17.0). The heading is the tangent of the resolved path, sampled after morph and trim, and is an exclusive derived writer. `geometry.pathSpace` (0.22.0) lets the path live in another parent. |
| Spin, tilt, banking | `transform.rotation` keys/expressions in unwrapped degrees (E014). |
| Left/right sprite facing | A `scale.x` sign flip, as City's cars and van use. |

## Evidence

Measured at base `5cde92e` with
[`velocity-facing.ts`](../../runs/engine/b6a87ab5-ed28-446a-ae56-c5e255c9c3a5/velocity-facing.ts)
(output: [velocity-facing.txt](../../runs/engine/b6a87ab5-ed28-446a-ae56-c5e255c9c3a5/velocity-facing.txt)).
The script compiles all 23 native story programs and samples each one at 241
instants. A node counts as "facing" when its rotation matches its velocity
heading within 10° at p90 (best constant offset) over more than two 5° heading
buckets.

- **263 nodes move in two dimensions on keyed position.** Of these, 40 have a
  rotation track and 35 have a `scale.x` track.
- **Two nodes face their velocity:**
  - Through the Blue `jelly`: a hand-keyed drift tilt (first keys 34° → 30°) over six
    heading buckets.
  - Echo Canyon `w4`: a word whose motion and rotation are both *sampled by
    its generator script* from one perspective model.

  Neither shows authors fighting the language. The other rotated movers are
  spins (Clockwork hands, Small Ideas glyphs) or independent tilts.
- **City's walkers and vehicles**, the evidence E014 cited, do not need tangent
  rotation. They keep a static isometric rotation (52.0181° / −37.9819°) and
  face travel with a `scale.x` flip. A tangent-following rotation would tip
  isometric sprites onto the street plane, which is wrong for that art style.
- No story uses a path attachment yet: the stories predate 0.17.0. Routes that
  turn (Packet, Marble, Threads shuttle) are currently translation-only.

## Alternatives

1. **Status quo: attach `orient` for routes, explicit rotation otherwise**
   (chosen). Facing that follows a curve is already one declaration when the
   route is a path, and it is an exact tangent, not a finite difference. It
   follows morph and trim edits and needs no new ownership rule. Velocity
   that is not a route (drifts, tilts, flips) stays an explicit writer the
   author controls.

2. **Standalone `autoOrient` channel derived from keyed position velocity.**
   Rejected. It would need:
   - **Derivative semantics** for every position writer: analytic for eased
     keys, numeric for expressions, undefined for composed or physics writers.
   - **A zero-velocity rule.** Holds and endpoints have no heading. Holding the
     last non-zero heading makes seek search backwards through history, and a
     cyclic scope must define heading across its seam.
   - **Ownership.** It writes `transform.rotation`, so it either excludes
     every rotation track or invents an additive offset mode (tilt plus
     facing). Both are new rules for the two-writer case.
   - **Streaming.** The heading at a seal depends on the left-hand derivative,
     so a late position unit that changes the key before the seal would retro-
     actively change a sealed frame's rotation, unless the rule is pinned
     the way `orient` already is.

   The corpus pays for none of this: two facing nodes, one generator-sampled.

3. **Compiler sugar: `orient` on keyed motion lowered to sampled rotation
   keys.** Rejected. It bakes a finite-difference approximation into keys,
   which goes stale when position keys stream in later. It also duplicates
   what an attach route gives exactly.

4. **Flip-facing (`face travel` → `scale.x` sign).** This is the shape City
   actually uses, but it is one story's art convention, and two scale keys per
   turn cost little. Not commissioned. It is noted as the variant to evaluate
   first if facing evidence grows.

## Contract outcome

- No language change. The `transform.autoOrient` row stays `unsupported`
  across compiler, runtime and renderer. Its restriction now points to this
  decision and to `attach … { orient true; }`.
- The new conformance test `packages/compiler/src/auto-orient-stop.test.ts`
  pins three rejections:
  - an `autoOrient` node property (`INVALID_TYPE`);
  - an `autoOrient` animation target (`UNSUPPORTED_PROPERTY`);
  - a Scene IR track on a `transform.autoOrient` channel.
- MotionScript and Scene IR `pending.md` drop `transform.autoOrient` from the
  not-yet-published list. It is no longer a pending language candidate.
- Authoring guidance: when something should face where it is going along a
  curve, author the route as a path and `attach` with `orient true`. Use
  `rollRadius` for rolling. Otherwise key rotation, or flip `scale.x` for
  sprites.

## Authoring and generation assessment

1. **Simplicity / low error rate.** One `attach` declaration replaces
   hand-computed headings. A velocity rule would add hidden hold and seam
   behaviour that authors would have to predict.
2. **Generation friendliness.** Models emit paths and `attach` already. A second
   facing mechanism invites conflicts between rotation writers.
3. **Streaming compatibility.** Attach `orient` derives from assembled path
   geometry under its existing freeze rules. Velocity facing would make sealed
   rotations depend on later position units.
4. **Expressiveness vs under-the-hood computation.** The tangent calculation
   is already in the runtime for routes. Pushing finite differences of
   arbitrary writers into the runtime buys little expressiveness.

## Revisit

Reopen as a new decision when either of these happens:

- Two or more stories that are not generator-sampled hand-key rotation to
  follow curved keyed motion that cannot reasonably become a path route.
- Generated programs show mis-faced travellers that a path route would not fix.

Evaluate flip-facing (alternative 4) and an `orient` mode for keyed position
with a pinned zero-velocity hold. Lottie `ks.ao` still requires a fresh
explicit user request.
