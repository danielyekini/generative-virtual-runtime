# The Marble Machine — unevaluated retrospective

2026-10-29. This is evidence from one implementation, not an evaluated language proposal or an adopted capability; see the [story index](../README.md#what-these-proposals-are). Implementation and measurements are pinned to commit `058b4fd0ac0743f6819e88b18f9a1b0c50813620`. The chosen story/playground id is `the-marble-machine`, derived from the title.

## 1. State of the result

The plate is 35 seconds long. It uses the requested cream, turquoise, yellow, coral and violet palette, a shaded blue marble with a rotating white band, rounded wooden parts and exposed pivot pins. One marble follows the complete upper-left to lower-right route. It has no scale animation or squash. The program compiles and validates without diagnostics. The builder checks evaluated draw items, including camera transforms, rather than checking that its generated key arrays contain the intended values.

| Script beat | Implemented result and evidence | Difference or limit |
| --- | --- | --- |
| 0–5s | Wide hold until 1.5s; peg retracts during 1.5–2s; accelerated roll during 2–5s. See [opening](evidence/f0.00.png) and the 2s, 3.5s and 5s panels in the [contact sheet](evidence/contact-sheet.png). | Retraction and roll are authored tracks, not a collision-triggered release. |
| 5–10s | Left end lowers from 0° to −12° during 5–7s, holds to 7.5s, then settles at +12° by 8s. Rod hinge follows the beam. Marble exits during 8–10s. See [7s](evidence/f7.00.png). | Settling reverses the seesaw angle so the exit slopes right. The bumper and lower stop linkage are schematic: the stop link does not stay joined to the moving rod's lower end. This is an implementation simplification, not a demonstrated contract limitation. |
| 10–16s | Contact checkpoint at 10.5s is world (581,292); marble reaches (630,388) by 12s and holds there. Eight equally spaced dominoes start sequentially at 10.5 + i·4.5/7 seconds; each falls over 0.55s to 78°. Lever tips during 15–16s. See 10.5s through 16s in the contact sheet. | Eighth domino starts falling at 15s and finishes at 15.55s. Contact is choreographed; overlap and force transmission between dominoes and the trigger lever are not physically solved or certified. The falls have uniform start intervals; the requested accelerating clacks have no audible implementation. |
| 16–20s | Red gate rises from y=380 to y=335 during 16–17.5s. Cord remains drawn over two guide pins, with changing vertical segments. Marble clears the gate at (706,408) by 18s and follows the curved chute to 20s. See [17.5s](evidence/f17.50.png). | Gate and cord move after the lever reaches its final pose; cord length and mechanical advantage are not constrained. The gate outlet remains a diagrammatic opening in a translucent outlined pocket. |
| 20–26s | First wheel carries counterclockwise 225°→90° during 20–23s; transfer takes 23–24s. Second carries clockwise 315°→450° during 24–26s. Both have striped axle discs. Cups open at release; see [23s](evidence/f23.00.png). | Marble trajectory is sampled separately from each wheel's rotation. It is not a dynamically parented child of the cup. |
| 26–31s | Release during 26–27s, two connected cubic curves during 27–29s, projected bowl orbit from 29s. See [29s](evidence/f29.00.png) and 30s/31s panels. | Banked curves are a side-view projection. Bowl motion is a shrinking ellipse, not a 3D ball on a bowl surface. The entry is not tangent-continuous with that ellipse; no collision/depth simulation is claimed. |
| 31–35s | Orbit radius reaches zero at 32s; button lowers by 32s; flag becomes visible at 32s and rises through 32.5s. Wheels coast during 31–32s. Original wide framing returns at 33s and holds through 35s. See [final wide](evidence/f35.00.png). | Coasting is delayed until 31s rather than continuing immediately after each release. The marble rests at (1450,900), overlapping the projected recess centred at (1450,910). |

All sound directions are represented by seven screen-space cue captions. There is no audio playback in this contract. The final composition retains the tipped seesaw, eight fallen dominoes, raised gate, stopped wheels and marble beneath the raised chequered flag. Some inactive mechanisms intentionally leave the close-up frame; the complete mechanism is visible in the opening and closing wide views.

### Verification and measurements

The real production `CanvasRenderer` rendered 1280×720 PNGs in headless Chromium 151.0.7922.173, with `AnimationRuntime` evaluating the compiled scene in the browser. No SVG approximation was used. Every beat boundary and selected key moments were captured at **0, 1.5, 2, 3.5, 5, 6, 7, 7.5, 8, 9, 10, 10.5, 11, 12, 13.5, 15, 16, 17, 17.5, 18, 19, 20, 21.5, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 32.5, 33 and 35 seconds**. All 36 were inspected in the contact sheet; 7, 17.5, 23, 29 and 35 seconds were also opened at full size. Six full-size stills and the complete contact sheet are retained. [Manifest](evidence/manifest.json) records hashes for every original capture, including originals not retained separately.

| Measurement | Result | Budget / scope |
| --- | --- | --- |
| Source UTF-8 bytes | 48,476 | 524,288 (512 KiB), 9.25% |
| Nodes | 149 | 500 |
| Tracks | 26 | 1,000 |
| Steps | 14 | 1,000 |
| Duration | 35,000ms | 60,000ms |
| Compile time | 269.40ms | One observed run; not a benchmark |
| Builder time | 8,992.00ms | From builder start through generation, compilation, validation and assertions; excludes import/process startup and optional Chromium capture |

See [raw metrics](evidence/metrics.json) and [browser metadata](evidence/capture.json). Memory, render throughput, total Chromium capture duration and model token cost were not measured.

The builder sweeps marble framing at 50ms intervals, including transformed radius witnesses above y=650 while the caption plate begins at y=662. It checks explicit world checkpoints, domino start/final angles, pocket holds, gate movement, flag timing and final states. Evaluated marble/cup coincidence is checked every 125ms during wheel carrying, within 0.04 logical pixels; seesaw cup and rod hinge coincidence are checked every 100ms within 0.12 logical pixels. These are finite sampling checks, not proof of continuous physical contact. In particular, draw-item checks do not certify paint occlusion or every part's outline.

`npm run typecheck` **fails** with 12 diagnostics in pre-existing `build-clockwork.ts`, `build-counter.ts`, `build-crane.ts` and `build-into-the-moons-shadow.ts`. The command stops at its schema project, so later projects in its shell chain do not run. The exact same output reproduces on base commit `7f1e95b276d3ac9d459d45297d95dfae588a77fa`; there are no final diagnostics in the new builder or preview helper. See [current](evidence/typecheck.txt) and [base](evidence/base-typecheck.txt).

`npx vitest run` **fails**: 201 tests pass and one fails, across 25 passing files and one failing file. `packages/schema/src/validate.test.ts` expects `fixtures/ir/invalid/duration-limit.json` to be rejected, but it has no diagnostic under the current duration budget. The same test and counts fail on the base commit. See [current](evidence/vitest.txt) and [base](evidence/base-vitest.txt). No limits or fixtures were changed to conceal this failure.

Visual status: reviewed sampled story plate with the explicit differences above. Full-frame-rate review, audible output, physical causality and faithful three-dimensional banking are **unverified or absent**, not passing claims.

## 2. Hardest and most error-prone aspects

Ranked by observed repair risk; separate engineering times were not measured.

1. **Keeping connected objects together.** Two carrying intervals require 120 and 80 angular samples, plus matching rotation tracks. Seesaw cup and rod need another pair of sampled trajectories. Initial cup checks exposed an error in my test's local coordinates: a rectangle's matrix includes its top-left position. The workaround was to use rectangle-local witnesses (20,−13) for the cup and (230,5) for the rod hinge, then test the actual draw matrices. Root causes: my coordinate choice and separately authored dependencies; no compiler/runtime defect established. The unjoined lower stop linkage remains visible at 7s and 17.5s.
2. **Camera interpolation between named shots.** The first camera pass put the marble at approximately y=58–79 during the opening push, overlapping the heading. A 2s intermediate framing repaired it. Endpoint checks alone had missed this. Root cause: my choice to interpolate position and zoom independently; no camera bug established. Workaround: 50ms evaluated framing sweeps and real still review. Small Ideas and Circle independently raised the same testing problem.
3. **Checking drawn output in the correct space.** Comparing peg screen y at 1.5s and 2s falsely failed when the camera moved. World coordinates recovered from the evaluated static backboard matrix correctly show retraction. A later radius sweep also required distinguishing a witness point's position from a second padding allowance. Root cause: my assertion design. Workaround: explicit world checkpoints plus separate screen safety checks. This reinforces the shared preview/assertion tooling theme, not a need for new syntax.
4. **Closing the gap between choreography and mechanics.** The tilted seesaw must become right-descending to release rightwards. The planar bowl has no depth ordering or tangent constraint. The lower stop connection remains schematic despite a correctly attached upper rod hinge. Root cause: layout and implementation choices; unsupported 3D/audio also limit the literal brief. Workaround: visible pins, deterministic timing, a projected bowl spiral and explicit disclosure. A physics extension is not justified by this implementation.
5. **Preview and verification plumbing.** Chromium's local-file navigation failed in this environment. Supplying the bundled production renderer via DevTools succeeded. Initial authoring also used invalid font and polygon syntax and a duplicate 8s key; compilation rejected these, and the builder was corrected. Root cause: tooling/environment and my source construction. The final helper runs only under `GVR_PREVIEW_DIR`; there is no fixed temporary preview directory. Base-check failures were isolated in a detached worktree rather than attributed to this story.

## 3. Suggested improvements

All benefits below are hypotheses unless explicitly measured above. None changes the registry, published versions or pending drafts.

### GVR fixes and tooling with no language change

- **Repair the stale duration-limit test and existing builder type errors.** This removes no story animation code, but would restore a usable repository-wide regression signal for a more detailed version. Confirmed by identical base/current failures. This is immediate maintenance, not a proposal to increase budgets.
- **Share a real-renderer story capture and assertion utility.** Extract the 29-line preview helper, coordinate-space witnesses, caption-safe bounds and frame schedule. It would remove this story's local Chromium setup and repetitive matrix conversions; a richer mechanism could add contact and occlusion probes without duplicating that plumbing. Recurs in Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas and Circle. The extraction itself is untested.
- **Add an authoring geometry inspector for pivots, contact distances and path tangents.** It would replace manual lower-link and bowl-entry inspection, not silently certify them. A detailed plate could check every linkage joint and release seam. Hypothesis; the remaining visible lower-link gap is the concrete motivation. Keep it outside core execution semantics initially.

### Experiments using the current language

- **Compare hierarchical cup attachment with sampled trajectories.** A marble drawable nested in each carrying cup, switched with visibility steps at transfer boundaries, could replace the 120+80 wheel samples. It would duplicate marble geometry and require testing identity/visibility seams. A more detailed wheel could retain exact attachment with fewer independent writers. Not implemented or measured here; this is a current-language experiment, not a claimed optimisation. It addresses the recurring driver theme without first adding channel references.
- **Use spatial vec2 tracks and tangent-matched curves.** Compare supported spatial position curves with the sampled chute/ramp/spiral. This could remove sampled path coordinates and improve bowl entry continuity. Test radius offsets, arc-length speed and rolling angle together before adopting it. Relates to the path-progress theme and pending `transform.autoOrient`, which orients a node but does not provide a rolling-distance driver. This experiment was not run.
- **Finish the lower stop linkage with generated rigid bars and measured joint distances.** This would replace the disconnected schematic line. More detailed mechanical choreography remains possible with today's groups, tracks and builder geometry; the existing gap is not evidence that the language needs physics. Not run.

### Language proposals

- **Explore deterministic point/channel binding.** A cup world point and an unwrapped wheel angle could drive the marble and rod, replacing separate sampled follow tracks and duplicated angle schedules. A richer plate could express wheel transfers, cord endpoints and rolling distance with explicit dependencies. This recurs in Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue and Circle; it is not a released cross-node binding capability. Define coordinate spaces, dependency cycles, ownership, seek behaviour and interval-limited attachment before claiming it. Switching attachment is a design question, not a routine syntax addition. First compare the hierarchy experiment above.
- **Consider named beat times or second-based key offsets.** This would remove percentage conversion in `track()` and repeated 5/7/8, 16/17.5/18 and 31/32/33 schedules. A more detailed chain could share release times without hand-editing several tracks. Recurs in Packet, Vectors, Counter, MotionScript→Motion and Small Ideas. It does not solve motion coupling. No byte/token benefit was measured; design duplicate-time and streaming rules first.
- **Revisit pending masks/mattes for a detailed bowl.** `compositing.mask` and `.matte` are already pending; this is recurrence evidence alongside Moon and Circle, not a new capability claim. A clipped inner bowl and foreground rim could replace the always-front marble projection with partial occlusion. They would not remove the need to author a trajectory or create physical banking. No masked candidate was tested.
- **Keep timed sound cues as metadata before considering audio execution.** Structured cue markers could replace prose embedded in seven captions and allow a host/editor to attach clicks, clacks and rolling sounds. Every earlier story raises audio's absence; audio is not a released or listed pending capability here. Clock synchronisation, scrubbing and resource handling need design and tests. No audible benefit has been evaluated.

General loops, functions, simulation and dynamic parent switching introduce substantial semantic decisions. Loops/functions are a new execution model and require a design decision under `AGENTS.md`; they are deferred, not recommended as routine ways to shorten eight domino declarations.

## 4. Priority

**Fix now:** the stale duration fixture and existing type errors in a separate maintenance change; retain this story's evaluated-output checks and real-renderer evidence. If visual fidelity is refined further, repair the lower stop connection and tangent continuity using existing geometry before asking for semantics.

**Experiment next:** hierarchical cup attachment versus sampled keys; spatial curves and distance-derived rolling; a shared capture/geometry-inspection utility. Measure visual continuity, expanded nodes/tracks, source bytes and runtime with the same timeline before selecting a winner.

**Defer:** core binding/attachment semantics until those experiments and independent stories establish the smallest useful scope; masks and sound metadata through their own contracts; physics, general loops/functions and three-dimensional contact. This one plate does not establish a general need or a release-ready design.
