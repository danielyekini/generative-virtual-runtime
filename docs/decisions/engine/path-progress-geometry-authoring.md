# Path progress, attachments, dashes and geometric authoring (E015)

Decision: 3 November 2026. [Issue #34](https://github.com/danielyekini/generative-virtual-runtime/issues/34).
Decision + host/schema prototype. No MotionScript / Scene IR version bump and no
registry claim in this change. Language wiring is named follow-up work below.

## Requirement

Native stories (Vectors, Threads, Packet, Clockwork, Blueprint, Marble, City)
bake traveller positions, arrowheads, dashed guides and trim-end contacts as
duplicated keyframes or dozens of short paths. Authors and generators need
high-level path progress without calculator-level arc-length arithmetic, while
keeping morph → trim ordering honest and without pretending auto-orient solves
rolling contact. Evaluate point/tangent/distance, markers, auto-orient, dash
phase and width profiles **separately**.

Authoring gates (3 November 2026): prefer high-level intent; keep generation and
streaming honest.

## Alternatives

1. **Status quo — bake keys / explode dashes** (strongest current-system option).
   Generators call private `trimCommands` samples offline and emit position
   tracks; dashed guides are N move/line pairs. Works today and needs no
   language change. Rejected as the sole contract: morph/trim edits invalidate
   baked keys; source size explodes; contacts drift when source topology
   changes.

2. **Promote `transform.autoOrient` alone.** Pending registry row; Lottie `ks.ao`
   is unsupported. Rejected as the slice: orientation follows a position tangent
   and does **not** place attachments, dash ink, markers or rolling distance.
   Retained as one mode of path attachment, not the whole design.

3. **Single mega-capability (progress + dash + markers + width profile).** One
   release claiming every stroke story. Rejected: mixes paint, geometry operators
   and transform ownership; width profiles need normals/joins/cusps the canvas
   stroke path does not have; blocks shipping the common progress primitive.

4. **Shared arc-length metrics + host attachment/dash helpers** (chosen).
   Promote the trim sampler into public path metrics (point, tangent, distance,
   progress) after morph and trim. Host helpers attach travellers/markers,
   optionally orient from the tangent, optionally compute rolling from
   distance/radius, and expand dash patterns as geometry for prototypes. Uniform
   animated `stroke.width` already exists (`paint.animatedSolid`); variable width
   profiles stay deferred. No wire/grammar/registry claim until follow-ups.

## Contract (implementation-bound prototype)

- **Metrics (`@gvr/schema`).** `buildPathMetrics(commands)` builds an arc-length
  table with the same 8-sample curve density as `geometry.trimPath`.
  `sampleAtProgress` / `sampleAtDistance` return `{ point, tangent, angle,
  distance, totalLength, progress }`. Contours split on `M`; pen-up jumps add no
  length (matches trim).
- **Morph / trim order.** Callers sample the **resolved** command list — morph
  first, then trim operators — matching registry restrictions. Prototype tests
  assert trim-end attachment moves when morph or trim windows change without
  baked keys.
- **Markers.** `markerSamples(metrics, progresses)` — geometry only; no marker
  IR. Arrowheads are attachments at progress `1` (or trim end) with optional
  orient.
- **Auto-orient.** `orientAngleAtProgress` / `attachAlongPath({ orient: true })`
  set rotation from the path tangent. This is **not** a rotation track and is
  **not** rolling. Standalone `transform.autoOrient` from keyed velocity was
  **stopped** by E054 ([standalone-auto-orient.md](standalone-auto-orient.md)).
- **Rolling.** `rollingAngle(distance, radius)` and `attachAlongPath({
  rollRadius })` are explicit and independent of orient. Do not assume
  orientation solves rolling.
- **Dash phase.** `dashCommands(commands, pattern, phase)` emits on-segments as
  open polylines for host/prototype use. Pattern units match path logical units;
  phase shifts into the pattern. That helper stays geometry-only. The paint
  claim `paint.strokeDash` landed in MotionScript / Scene IR 0.21.0 and does
  not replace this helper or trim. Contours dash independently.
- **Width profile.** **Stopped** by E049
  ([variable-stroke-width-profiles.md](variable-stroke-width-profiles.md)).
  Uniform `stroke.width` animation remains `paint.animatedSolid`. No language
  width-profile capability without a new story + renderer design.
- **Contacts / source size.** Progress samples agree across differently authored
  polylines that share the same drawn shape; authors do not duplicate contact
  coordinates when source command counts differ.
- **Ownership / streaming.** Prototype is pure and host-level. Future language
  attachments that write transform channels must use exclusive ownership
  (E002/E007) and must not rewrite sealed generative tracks.

Out of scope here: MotionScript / Scene IR syntax, registry rows, Lottie dash or
auto-orient import, Canvas `setLineDash` claims, and variable-width strokes.

## Authoring assessment

1. **Simplicity.** Progress, markers and dash patterns are numbers and ids — no
   manual arc-length tables.
2. **Generation.** Models already emit paths and trim; attaching `progress 0.5`
   (future syntax) is additive. Dash patterns beat emitting dozens of subpaths.
3. **Streaming.** Metrics are derived from assembled resolved geometry; late
   morph/trim deltas recompute without sealed-prefix rewrites.
4. **Expressiveness.** Calculator work (arc length, tangent, dash phase, rolling)
   moves into schema/runtime; authors keep logical intent.

## Critical pass

Prototype tests:

- `packages/schema/src/path-metrics.test.ts` — point/tangent/distance; morph+trim
  tip tracking; orient ≠ rolling; contact across source sizes; dash phase
  compactness.
- `packages/runtime/src/path-progress.test.ts` — `attachAlongPath` after
  morph/trim; shared contact; dash helper.
- Existing `trim-regression.test.ts` — trim still preserves pen-up breaks after
  sharing the sampler.

Full `npm run verify` remains the integration gate. Do not claim language
support until a follow-up ships a versioned capability.

## Child work

- **E037** ([#169](https://github.com/danielyekini/generative-virtual-runtime/issues/169),
  landed in MotionScript / Scene IR 0.17.0 with `attach … along …`):
  version `geometry.pathProgress` — MotionScript/Scene IR syntax for
  sampling/attaching along a named path after morph/trim, optional orient mode,
  registry + conformance, Studio fixture. Rolling stays an explicit
  distance/radius option, not implied by orient.
- **E038** ([#170](https://github.com/danielyekini/generative-virtual-runtime/issues/170),
  landed in MotionScript / Scene IR 0.21.0):
  version `paint.strokeDash` — dash array + phase on stroke, renderer
  `setLineDash`, animated phase optional; do not substitute dashes for trim.
- **Width profile:** E049 ([#218](https://github.com/danielyekini/generative-virtual-runtime/issues/218))
  **stopped** — see [variable-stroke-width-profiles.md](variable-stroke-width-profiles.md).

## Supersession

E039 ([path-attachment-space.md](path-attachment-space.md)) versions composed
placement as `geometry.pathSpace` (MotionScript / Scene IR 0.22.0). Scenes that
do not require that capability keep the path-local rule in this decision.
The 0.17.0 version file is unchanged.

## Revisit

- If Studio needs path-follow without a language bump for demos, keep using the
  host helpers; do not silently treat them as released MotionScript.
- If dash-as-geometry remains cheaper than stroke dash for clipped reveals,
  keep both paths with clear scopes rather than collapsing them.
- If a story proves rolling must couple to orient in one writer, record a new
  ownership decision — do not overload auto-orient.
