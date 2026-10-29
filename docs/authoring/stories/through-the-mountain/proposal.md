# Unevaluated retrospective — Through the Mountain

2026-10-29. This is evidence from one implementation, not an adopted language proposal; see the [story index](../README.md#what-these-proposals-are). The program and builder are pinned in the [record](README.md). No capabilities, releases or pending drafts were changed.

## 1. State of the result

The story lasts 30 seconds and uses playground id `through-the-mountain`, derived from its title. One train hierarchy survives all three compositions: a red locomotive and three cream carriages, with 114-unit pitch, a 110-unit locomotive shell and 100-unit carriage shells. Eight wheels rotate clockwise at 160/12 radians per second. These are evaluated draw-item assertions, including a wheel-matrix cross-product check, rather than checks of the generator's train model.

The following rendered observations were compared with the supplied brief:

| Time | Observed result and evidence |
| --- | --- |
| 0, 1, 3, 4, 5s | Empty countryside at the start, then the train enters from the left. Patchwork fields, farmhouse, hills and flat illustrated clouds are present. The complete train fits from 3.1s in the runtime sweep. Tracking ramps during 4–5s. [4s](stills/f4.0000.png), [5s](stills/f5.0000.png). |
| 5, 8, 10, 11s | The locomotive nose stays at screen x=690, railway y=510. Measured 6–7s leftward layer displacements are 272 units for posts, 67.2 for fields and 19.2 for hills. The flock rises and recedes; the farmhouse reaches the left edge. Mountain terrain first edges into view during 8–11s; the portal itself arrives later in that interval. [8s](stills/f8.0000.png), [11s](stills/f11.0000.png). |
| 11.5–16s | Camera-equivalent displacement stops by 11.5s with the portal lip at x=900. The nose reaches x=900 at 12.5625s; the locomotive rear and carriage rears follow at 13.25, 13.9625, 14.675 and 15.3875s. Foreground masonry and a dark foreground opening progressively conceal them. The 15.5s and 15.999s stills show empty track. [13s](stills/f13.0000.png), [14.675s](stills/f14.6750.png), [15.5s](stills/f15.5000.png). |
| 16, 18, 19.5, 20.999s | Interior cut preserves rightward implied travel with the nose at x=690 and ribs moving left at 160 units/s. Warm windows show simple silhouettes. The exit stays beyond the right edge until 18s, then moves left and widens. A nose overlay begins before the body washes. [18s](stills/f18.0000.png), [19.5s](stills/f19.5000.png), [20.999s](stills/f20.9990.png). |
| 21–26s | Cut to a stationary exterior exit at x=250. The nose begins at x=230, so it crosses the portal 0.125s after the cut. Each carriage follows with unchanged dimensions and spacing; the last shell rear clears at 23.95s, earlier than the 25s deadline. Tracking begins at 25s. Snowy pines, cool mountains, white exhaust and diagonally falling flakes are visible. [22s](stills/f22.0000.png), [24s](stills/f24.0000.png), [25s](stills/f25.0000.png). |
| 26, 27.5, 29, 30s | The view widens from zoom 1 to 0.82 during 26–29s and holds that zoom for the final second. The entire train remains visible above the caption band. Foreground branches pass faster than distant peaks; the portal leaves the left edge. Continued scenery displacement establishes ongoing travel while the camera tracks the train. [27.5s](stills/f27.5000.png), [30s](stills/f30.0000.png). |

### Simplifications and limits

- **Sound is absent.** Clatter, hum, birds, wind, whistles and reverberation remain brief instructions, not playable cues. MotionScript has no released audio channel in the inspected contract.
- Texture is sparse vector hatching and layered flat shapes, not a sampled paper or painted surface. Clouds are flattened ellipses; birds follow two linear rises rather than a detailed flapping arc. The puffs are five repeating ellipses with sampled movement and opacity, not simulated exhaust. Their resets can briefly interpolate backwards between keys; motion-blur quality was not evaluated.
- The exterior travel shots bake camera-relative translations into train and layer tracks. Only the final widening uses the actual camera zoom. This preserves measured relative train speed and independent layer rates but does not establish one physically consistent 3D landscape. The snow tracking composition puts the nose at x=950 before widening, whereas countryside tracking uses x=690; it resumes the side view without exactly matching its horizontal framing.
- The interior exit is a widening blue sign of approaching daylight. It remains ahead of the locomotive at the cut (near x=940 versus nose x=690); the film cuts to the exterior before literal nose/exit contact. There is no continuous spatial camera path through the mountain.
- Lighting is translucent rectangular paint over each vehicle, with an additional nose patch. It approximates a cool wash and carriage-by-carriage daylight change, without a continuous light frontier crossing every window. The passenger silhouettes also remain visible outdoors. Roofs and wheels do not receive the same wash as the body shells.
- The plate reserves y≥650 for editorial captions, reducing landscape area. Widening also moves the apparent railway height from y=510 to y=483; the track stays level within each frame.

These are material approximations, not a claim of exact director-script fidelity. No full 30fps capture, playback/audio evaluation, perceptual gate, other browser or other viewport was run. Wheel orientation and seek behaviour were checked numerically; stills alone cannot establish perceived smoothness.

### Verification and measurements

The builder emits the `.ms`, compiles with `compileMotionScript`, rejects any compile diagnostic, validates Scene IR, and asserts the result through `AnimationRuntime.evaluate`. It checks shell corners above the caption band, spacing and scale in 0.1s sweeps over the fully visible intervals, beat content, portal relationships, parallax, bird rise, rib travel, snow drift, wheel rolling and repeated seeks. Intentional offscreen entry and portal occlusion are checked separately; a covered drawable's presence is not treated as proof of visible pixels.

[Measured final run](stills/measurements.json):

| Resource | Measured | Budget |
| --- | ---: | ---: |
| Source UTF-8 bytes | 162,242 (30.95%) | 524,288 / 512 KiB |
| Nodes | 465 (93%) | 500 |
| Tracks | 118 (11.8%) | 1,000 |
| Steps | 17 (1.7%) | 1,000 |
| Duration | 30,000ms | 60,000ms |
| Compile time | 3,313.811ms | No latency threshold applied |
| Builder before previews | 18,448.087ms | No latency threshold applied |
| Builder including previews | 26,481.233ms | No latency threshold applied |

These are one-run wall-clock observations on this environment; no warmup/repetition study or memory profile was performed. Builder timings start after module loading. Cached draw-item sampling avoids evaluating the scene separately for every asserted corner.

Real **CanvasRenderer** PNGs were produced in headless **Chromium 151.0.7922.173**, 1280×720, DPR 1, at all these seconds, and inspected in contact sheets, with portal, interior and final compositions also examined at full size:

`0, 1, 3, 4, 5, 8, 10, 11, 11.5, 12.5625, 13, 13.9625, 14.675, 15.3875, 15.5, 15.999, 16, 18, 19.5, 20.999, 21, 22, 23, 24, 25, 26, 27.5, 29, 30`.

The builder creates previews only when `GVR_PREVIEW_DIR` is set. No SVG approximation or fixed `/tmp` output was used. Preview startup uses the repository browser resolver, a local Vite server, CDP and production runtime/renderer modules. The committed [stills](stills/) are reproducible evidence for this implementation, not reference renders from an external film.

- `npm run typecheck`: **FAIL**, 12 diagnostics in the pre-existing Clockwork, Counter, Crane and Moon builders. Re-running on base `7f1e95b` gives byte-identical diagnostic output, with no Through the Mountain diagnostic. [Current](checks/typecheck.txt), [base](checks/base-typecheck.txt).
- `npx vitest run`: **FAIL**, 201 passed / 1 failed across 26 files, both on this revision and base `7f1e95b`. `packages/schema/src/validate.test.ts` expects `fixtures/ir/invalid/duration-limit.json` to be rejected, but receives no diagnostic. [Current](checks/vitest.txt), [base](checks/base-vitest.txt). This task does not change limits or repair that base fixture.
- Builder runtime checks, compile/validation and `npm run build -w @gvr/playground`: **PASS**. The production bundle reports the existing large-chunk advisory; no bundle-size comparison with base was measured. [Builder](checks/builder.txt), [playground](checks/playground-build.txt).

After merging concurrent `work` additions at `9182a01`, typecheck again produced the same base diagnostics, Vitest again reported 201 passed / 1 failed, and the playground build passed. The merge retained both other story catalogs and advanced the unified index to revision 1.6. [Merged typecheck](checks/merged-typecheck.txt), [merged Vitest](checks/merged-vitest.txt), [merged playground build](checks/merged-playground-build.txt). A staged whitespace check flagged only incoming historical briefs, generated source and test-log whitespace; those concurrent artifacts were preserved.

## 2. Hardest and most error-prone aspects

Ranked by observed correctness risk and implementation rework, not measured task minutes:

1. **Occlusion and paint-order scope.** Draw-item checks first found that nesting foreground masonry under a shot group did not place it above a separate root train. The first real 13s still also showed the locomotive inside the dark opening even after its position had crossed the lip: ordering alone did not fill the hole. Root cause: my hierarchy and cover geometry choices, not a demonstrated runtime defect. Workaround: root-level foreground plates, matching mountain silhouette, and an opaque foreground dark opening. The final [13s](stills/f13.0000.png) and [15.5s](stills/f15.5000.png) show the repaired progression. This is why geometry/order assertions and rendered inspection are both necessary.
2. **Node expansion across cuts.** The initial separate-shot train implementation hit a compiler diagnostic at 729 nodes. Sharing one train reduced the failed intermediate scene to 533; combining 35 railway ties into one path in each shot brought it below 500. The detailed final scene is 465 nodes after clouds, hatching and branches. Root cause: my repeated geometry plus the current node budget, not evidence that the budget is wrong. Workaround: one train and compound static paths. A richer landscape has only 35 nodes left without further regrouping. Diagnostic cascades after rejected shot groups produced unknown-target errors, obscuring the first resource error.
3. **Motion coupling across tracking and cuts.** A 160-unit/s world speed must agree with 12-unit-radius wheels while the camera starts, stops and widens. Portal rear-clearance times require shell extents, not just vehicle origins. Root cause: separate authored channels with no read-another-track driver, combined with my baked camera model. Workaround: shared builder constants, sampled relative transforms, actual runtime position/angle checks and explicit cut keys. Long percentage keyframes make timing harder to inspect; the builder translates seconds to percentages rather than relying on hand arithmetic.
4. **Trustworthy verification plumbing.** An early preview page did not install its capture function because the custom endpoint was attached after Vite's internal handling. A strict seek comparison then failed because my sampling cache rounded the lookup key but evaluated the unrounded floating-point time. Root cause: my harness choices. Workarounds: a Vite `configureServer` middleware and consistent microsecond canonicalisation before evaluation. The repaired repeated-seek check passes. No runtime determinism bug is claimed. Compiling and checking the final scene before preview takes 18.448s in the recorded run; CPU attribution is unmeasured.
5. **Lighting without animated paint.** Four body shades, four cool washes and one nose patch add nine drawable overlays and nine opacity tracks. Root cause: the current lack of released animated solid-fill channels and my choice of a simple whole-shell wash. Workaround: static paint plus opacity. The [19.5s](stills/f19.5000.png) still shows nose-first cool light, but it is visibly a rectangular patch rather than a detailed frontier. This cost is measured; the visual gains from a different method are untested.

## 3. Suggested improvements

### GVR fixes and tooling, with no language change

| Suggestion | What it removes here | What it could allow in a detailed version | Evidence / recurrence |
| --- | --- | --- | --- |
| Extract a shared opt-in CanvasRenderer/Chromium preview helper, with page-ready failures and a capture manifest. | Per-story Vite/CDP/browser lifecycle code and the endpoint-order trap. | Routine boundary captures, viewport variants and readable renderer failures. | Observed in this implementation; recurs in Blue, Clockwork, Crane, MotionScript→Motion, Small Ideas and Circle. No core semantics change. |
| Reuse a runtime assertion helper for transformed extents, foreground relationships and canonical sample times. | Local frame cache, aliases, corner checks and the floating-time mistake. | Stroke-aware wheel/plume bounds and automated temporal occlusion probes. | Existing stories also require viewport-aware checks; pixel occlusion automation remains a hypothesis, not implemented here. |
| Retain the first resource diagnostic prominently and label dependent unknown-target cascades. | Manual hunting through the 729-node rejection and subsequent unknown targets. | Faster repair of richer generated shots. | Recurs in Copperleaf and MotionScript→Motion. Diagnostic/tooling work; do not relax budgets. |
| Repair the base typecheck errors and reconcile the duration-limit test fixture with the current duration contract in a separate change. | The inherited red verification status and need for baseline comparisons. | A clean regression signal for subsequent stories. | Both failures reproduced on base. Those repairs were outside this task's protected-file scope. |
| Profile compile and assertion costs separately over repeated runs. | Uncertainty about where the 18.448s builder time goes. | Evidence for choosing sparse keys, expressions or compiler optimisation. | Crane raises compiler performance too. This story does not establish Crane's claimed root cause or quadratic behaviour. |

### Experiments using the current language

1. **Replace sampled plume cycles with bounded expressions or segmented timing scopes.** This would remove most of the five puffs' 301-sample x/y/opacity tracks while retaining five ellipses. Test reset continuity, deterministic seeks and source-size/compile-time trade-offs before claiming a gain. A more detailed film could use more puffs without proportionate source growth. This is a hypothesis; there is no expression rewrite or measured saving in this run. Loops/functions are unnecessary for this experiment.
2. **Compare actual camera position tracks with the baked exterior translations.** Preserve parallax through compensating layer transforms and re-run all extents/relative-speed checks. This could remove duplicate camera-offset sampling from the train and portals and make the countryside/snow framing relationship explicit. A detailed version could approach the exit continuously. The comparison is untested; Camera fit/aim recurs in Moon, Packet, Clockwork, MotionScript→Motion, Small Ideas and Circle.
3. **Stage lighting with nested existing transform/opacity groups or narrower paint strips.** This might replace the visibly rectangular nose patch with a progressive frontier without changing fill channels. It would likely consume more nodes/tracks; quantify that trade-off under the same 500-node budget. A detailed version could illuminate panes in sequence. No fidelity or budget improvement is claimed.
4. **Consolidate static repeated marks further.** Sleepers already demonstrate the technique locally; compound paths for fence strokes and silhouettes could free nodes for richer snow texture. The replacement must preserve independent motion and colour. Parameterised drawable symbols recur in Packet and other stories, but this film's single shared train is a counterexample to needing a new instance model merely for shot reuse.

### Language proposals

| Candidate | What it would remove here | More detailed version / status |
| --- | --- | --- |
| Scoped masks or mattes with explicit coordinate space and paint order. | Bespoke mountain-shaped occluders and the duplicate dark foreground opening. | A train crossing a true portal aperture, including plume and reflection clipping. `compositing.mask` and `compositing.matte` are already pending; Moon and Circle raise related needs. They need conformance and renderer evidence before adoption. The current opaque-cover workaround is adequate for this simple side view. |
| Animated solid-fill channels. | Some or all of the nine lighting overlays, subject to colour/alpha equivalence. | Smooth warm-to-cool vehicle paints while windows retain their own light. `paint.animatedSolidFill` is drafted in pending notes; Moon, Packet, Vectors, Counter, MotionScript→Motion and Small Ideas recur. It would not by itself create spatially moving light or illuminate an entire hierarchy. A proposal must specify which paints/channels interpolate and test seeking. |
| Narrow deterministic channel drivers, if builder-side coupling proves insufficient across more stories. | Repeated wheel-speed constants and independently baked camera-follow values. | Wheel angle derived from travel distance, more wheels, attached light fronts. Recurs in Moon, Packet, Vectors, Clockwork, Counter, Blue, MotionScript→Motion and Circle; not a released/pending capability in the inspected drafts. Define dependency order, cycle rejection, spaces and seek semantics. The present hierarchy already solves carriage spacing, so do not introduce drivers for that solved relationship. |
| Keyframe timestamps in seconds, potentially with named beat constants. | Conversion to percentage keys over the entire 30s scene. | Local retiming of entrance/exit beats without recomputing percent labels. Recurs in Packet, Vectors, Counter, MotionScript→Motion and Small Ideas; not pending. This would improve readability, not add motion this builder cannot express. It needs a precise time-domain definition and equivalent emitted IR tests. |

**Audio:** a host-side cue sheet is the next experiment, not an inferred need to put synthesis into MotionScript. It could preserve the requested whistle/clatter/wind schedule for a playback host, but would remove no visual nodes here. Every indexed story notes missing sound. A clocked audio/event contract would need seeking, cancellation, resource and ownership semantics; none was tested.

**Loops and functions:** do not treat them as routine compression work. They introduce a new execution model and require the design decision mandated by `AGENTS.md`. This story provides evidence for builder helpers and one shared hierarchy, not evidence sufficient to choose that model.

## 4. Priority

**Now:** keep real-renderer capture and runtime checks paired; extract shared preview/assertion tooling; improve resource-error presentation; repair the independently reproduced base check failures. Keep current budgets and protected contracts unchanged.

**Next experiments:** compare sampled puffs with existing expressions and compare actual-camera tracking with baked transforms, using identical still times plus a dense motion window. Test narrow lighting strips only if they fit the fixed budget. Investigate pending animated fill and masks with other stories as recurrence evidence, not as adopted features.

**Defer:** general drivers, new instance/loop/function execution models, built-in audio and any budget increase until stronger cross-story, held-out evidence and explicit semantics justify them. Source compression alone is not sufficient: the complete train, progressive clearance and deterministic seeking must survive every change.
