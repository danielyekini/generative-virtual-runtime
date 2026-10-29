# One Ball, Four Worlds — unevaluated retrospective

This is an implementation retrospective, not an evaluated or adopted language proposal. See [the story index](../README.md#what-these-proposals-are). Observations below concern this program on the current implementation. Proposed improvements are hypotheses unless explicitly identified as measured. No language, capability registry, published version, pending capability, contract or resource limit was changed.

## 1. Result

The playground id is `one-ball-four-worlds`, derived from the supplied title. The program lasts 30 seconds. Frame references here use a 60 fps reference clock: `f = seconds × 60`; f1799 is 29.983333s and f1800 is the endpoint, not an additional video frame.

### What the implementation shows

| Time / reference frames | Implemented direction and evidence |
| --- | --- |
| 0–6s / f0–360 | Warm white paper, deterministic grain, graphite outlines, crosshatching and rounded sketched clouds. A trimmed stroke draws the descending ramp ahead of the red ball. A separate rotating fibre mark suggests rolling while the upper-left highlight stays fixed. Landing is at 3s/f180, squash at 3.12s, low rebound at 4s/f240, and a further low arc approaches the curl. The camera starts wide and eases into tracking. |
| 6–8s / f360–480 | A curled cream sheet crosses the screen. The world seam and ball centre coincide at 7s/f420, with the ground at the same world height on both sides. The camera continues at 640 world units/s. Paper surface fibres and an offset thin red edge shadow replace the graphite surface. Landing is at 8s/f480. |
| 8–13s / f480–780 | Overlapping ochre/turquoise hills, fold faces, fine texture and foreground paper leaves. The ball descends to the dip at 10s/f600, climbs to the ramp at 12s/f720 and launches. Its ground shadow separates from it in the air. Additional horizontal displacement accelerates the descent and eases on the climb. |
| 13–15s / f780–900 | Square perforations precede a moving grid. Stepped hills, mountains, trees and clouds replace the paper bank. The ball changes to a single crack-free stepped sprite with a pale pixel highlight. Its trajectory continues through the seam at 14s/f840; the airborne high point is near 14s. |
| 15–20s / f900–1200 | Landing at 15.5s/f930; the wider, shorter sprite is shown at 15.65s/f939 and recovers over the following second. The centre shifts downward during squash so the bottom stays on the surface. Three 14-unit drops at 16.5s/f990, 17.25s/f1035 and 18s/f1080 have separate small hops. The final stepped slope rises during 18.5–20s and launches at 20s/f1200. Violet edge traces announce the dark region. |
| 20–22s / f1200–1320 | Dark background, cyan track and violet outlines sweep left without a camera cut or scale change. The ball rounds and gains a radial light treatment and a short red trail; its centre passes the seam at 21s/f1260 without resetting. |
| 22–27s / f1320–1620 | Contact at 22.5s/f1350, broad valley descent through 24.5s/f1470, climb to 26s/f1560 and another launch. Cyan track glow uses four stroke passes. A nearby red light patch weakens as the ball rises. Skyline and grid receive slower independent translations. The camera follows slightly downward. |
| 27–30s / f1620–1800 | Widening starts at 27s; tracking decelerates from 27.5s and stops at 28.5s/f1710. The ball lands at 28s/f1680 and keeps travelling. Its trail fades; the ball reaches the right side at f1799 and continues moving through the endpoint. |

The builder checks the actual `AnimationRuntime.evaluate` draw items: independently specified world heights at named contacts, surface intersections from evaluated ground path commands, viewport bounds, fixed upper-left highlights, seam placement, squash, short trail and final forward movement. A sweep of all 1,801 reference times from 0 through 30 seconds checks rendered centre continuity and framing. These tests use rendered matrices and geometry, rather than accepting the trajectory generator's own predictions as evidence. They do not prove physical realism or full-frame visual identity.

All **49** named stills in [stills](stills/) were inspected in chronological contact sheets; full-size stills at 0, 14 and 19 seconds were also inspected during refinement. The captures use the real CanvasRenderer and AnimationRuntime in Chromium 151.0.7922.173, at 1280 × 720, DPR 1. The earlier smooth pixel mountains were corrected to stepped contours after looking at the first captures. These are material checks at boundaries and key moments, not certification of every rasterized frame.

### Approximations and remaining limits

- **The sweep is constructed geometry.** Four spatial banks meet at fixed world seams. This supplies a real two-second leftward sweep at constant camera speed, without an unsupported mask. The shared course agrees at each seam. Fine pixel stair treads approximate the smooth course, and surface checks allow less than five screen pixels of contact error. Smooth long contours are simplified with a 0.35-world-unit Ramer–Douglas–Peucker tolerance; no obstacle or beat is removed.
- **The scenery is restyled, rather than a complete material simulation.** Hills use the same analytic silhouette before quantization. Folded mountains, clouds and trees are generated in medium-specific banks, so the whole distant picture is not a point-for-point morph of one shared scene. Paper curls are flat polygons, paper texture is short vector marks, and pixel resolution is uneven by design: fine ball pixels, 8-unit scenery pixels and 24-unit ground treads. The 0.2s ball contour/paint change is an opacity overlap, which is visibly paler at 14s/f840. A topology-matched `geometry.pathMorph` alternative is available today but was not implemented or compared in this run.
- **The camera does the final widening.** The ball is 52 world units across before squash and the final zoom. Zoom ends at 0.46, so its final screen diameter is about 24 pixels. Maintaining constant screen size during that widening would contradict the widening camera. Initial follow starts gradually rather than with a cut.
- **Motion is choreographed, not a rigid-body simulation.** Horizontal travel remains forward through every seam; the two valleys add smooth acceleration. Launch and impact velocities are authored independently of a physical rolling solver. A low extra contact at 5s links the first rebound to the airborne curl crossing. Background parallax is layered translation, not depth-aware projection; its speed varies by layer and section.
- **Glow is an approximation.** Multiple cyan strokes, translucent radial paint, short offset trail discs and a red ground ellipse suggest emission and nearby light. There is no light transport or bloom interaction with arbitrary geometry. The shadow is an ellipse, rather than a true soft projected shadow.
- **Audio lives in a companion host.** [player.html](player.html) bundles the exact compiled scene, real renderer/runtime and a deterministic locally synthesized soundtrack. It covers scratching/rasp, muted bounce, peel/rustle, paper friction/flick, arpeggio, landing ticks, launch rise, hum, neon pings, sweep, airy takeoff and final sustained note. Play/pause and scrubbing use the audio context clock. The MotionScript preset remains silent because it has no audio channel. Sound timbre is synthesized rather than recorded foley. Audio content was checked for duration and nonzero signal at cue samples; it was not subjected to an auditory quality review. Local `file:` navigation was blocked by this environment's Chromium policy; companion playback was tested over localhost HTTP.

### Baseline measurements

The hash-associated implementation is recorded in [README](README.md). [Raw measurements](stills/measurements.json) retain the final builder observation. Times below are observations on this cloud worker, not portable benchmark promises; other local work caused visible timing variation.

| Measure | Final observation |
| --- | ---: |
| Builder lines / UTF-8 bytes | 398 / 34,942 |
| Generated program lines / UTF-8 bytes | 178 / 331,499 |
| Scene nodes / tracks / steps | 122 / 75 / 6 |
| Keyframe values | 8,935 |
| Static path commands and polygon points | 8,295 |
| Compile wall time | 3,099.187 ms |
| Evaluation per frame, five batches of 600 frames after 120 warmups | 7.148, 7.681, 4.893, 4.506, 4.629 ms |
| Median of the five evaluation batch means | 4.893 ms/frame |
| Builder internal time before previews | 34,605.032 ms |
| Builder internal time including browser, bundling and 49 PNG writes | 46,175.398 ms |
| Largest top-level source unit, including leading whitespace | 69,080 bytes |

The builder time excludes `tsx` process startup and includes its runtime assertions and evaluation sampling. Lines count newline-terminated lines, not the final empty split element. Long generated declarations explain the low program line count. Evaluation batches sample 0–29.95s at 50ms intervals; they measure evaluation, not CanvasRenderer cost. [Unit measurement](stills/unit-metrics.json) uses a brace-aware scan that ignores strings/comments; parser diagnostic spans are keyword spans and were unsuitable for measuring a whole unit.

Budgets remained at their defaults in `packages/schema/src/limits.ts`:

| Budget | Final usage | Implementation pressure |
| --- | --- | --- |
| Geometry 10,000 items | 8,295 / 82.95% | An intermediate compound-bank version was rejected at 10,136 items; finer stepped scenery later produced a 10,453-item rejection. Exact removal of duplicate/collinear pixel vertices and subpixel simplification retained the picture. |
| Source 524,288 bytes | 331,499 / 63.23% | An early dense-key draft reached 630,731 bytes. Sampling was reduced to 0.1s, then the resulting rendered motion was checked at 60 fps. No source-limit override was used. |
| Buffered unit 131,072 bytes | Largest unit 69,080 / 52.70% | Pixel scenery is the largest group; this is a source measurement, not a claim about all streaming modes. |
| Nodes 500 / tracks 1,000 / steps 1,000 | 122 / 75 / 6 | Compound paths and offscreen-world visibility steps avoid spending nodes on each grain, tile or hatch. |
| Duration 60,000ms | 30,000ms | No duration workaround required. |

### Repository and playground verification

- Builder: clean compile with **zero diagnostics**, valid Scene IR, and passing rendered-state assertions. Stills are written only when `GVR_PREVIEW_DIR` is set.
- Playground: production Vite build succeeds. Chromium selects `preset:one-ball-four-worlds`, compiles it and its emitted round-trip, seeks to the neon valley and advances playback without runtime degradation. The build retains the existing large-bundle advisory; no bundle policy was changed.
- `npm run typecheck`: fails with **12 pre-existing errors** in `build-clockwork.ts`, `build-counter.ts`, `build-crane.ts` and `build-into-the-moons-shadow.ts`. Builder-local type errors found during development were corrected. The final log contains no error in this story. The same 12 failures reproduce in a detached worktree at base `b7e8459b7f569862bb79325c309c33adc425de8d`.
- `npx vitest run`: **201 passed, 1 failed**, in 26 files. The failing schema fixture harness expects `fixtures/ir/invalid/duration-limit.json` to be invalid, but the current 60-second limit accepts it. The identical failure reproduces on the base commit. The fixture and limit were left unchanged.

[Check logs and browser evidence](checks/) preserve the observations and the base comparison. After merging concurrent catalog additions, the unchanged builder and playground build passed again and both repository failures were unchanged; separate merged logs are retained. The supplied brief preserves Markdown hard-break whitespace and the raw test logs retain generated whitespace, so a broad `git diff --check` reports those expected documentary lines. This is a story fixture, not a registered or canonical authoring sample; no sample-registry state or production/training eligibility is claimed.

## 2. Hardest and most error-prone aspects

Ranked by observed implementation/rework cost and visual risk, not by stopwatch estimates of individual coding tasks.

1. **Keeping the ball, camera, ground, shadow and style seams coupled.** The highest risk was a correct generated trajectory over an incorrectly drawn surface. The extra draw-geometry contact assertions and full viewport sweep address this. Landing squash originally lifted the bottom off the ground; moving the centre down by the compressed radius corrected it. Root cause: an implementation choice to emit independent scalar tracks, plus no direct authored channel dependencies. Workaround: one host trajectory, sampled tracks, evaluated-geometry assertions and still inspection. Named contacts remain separate independent test expectations.
2. **Pixel detail under geometry and source budgets.** The observed resource rejections above are evidence, not a hypothetical ceiling. A node per decorative mark also made dense checking slow. Root cause: generated representation choices and provisional resource budgets; no measured claim that the limits themselves are wrong. Workaround: same-paint compound paths, exact collinear removal, bounded contour simplification, fewer temporal samples and offscreen visibility steps. Final geometry still uses 83% of the budget.
3. **Making a two-second transformation with unsupported masks.** A global opacity fade would lose the travelling boundary. Root cause: language/engine mask support is absent. Workaround: fixed world clipping planes and a camera speed chosen so a 1280-unit viewport crosses a plane in two seconds. That couples composition, horizontal speed and transition duration and contributes to the strong final zoom. Distant banks are approximations of material replacement, rather than one shared scene changing material.
4. **Checking the rendered picture, not just scalar values.** The smooth diagonal mountains only looked wrong once the actual pixel scene was captured. Root cause: our first implementation choice and the absence of a reusable story preview/inspection harness. Workaround: real browser captures, chronological contact sheets, full-size inspection and then stepped contour generation. Surface and framing checks supplement the stills; neither alone is sufficient.
5. **Sound without a language audio channel.** Comments alone would drop the sound direction. Root cause: language/host capability gap. Workaround: generated browser companion with a clocked synthesized audio buffer and controls. This adds a separate output and host code, and it does not make the preset audible inside the existing playground. The host-only solution is deliberate and explicitly scoped.
6. **Diagnostics and builder bookkeeping.** `round` is a reserved keyword; using it as a ball node name caused repeated parsing diagnostics. Duplicate zero-time keys and outgoing easing on a final key also produced validation errors. A rejected landscape group cascaded into unknown-target errors on its tracks. Root cause: first our naming/key construction, then diagnostic recovery/tooling. Workaround: `orb`, sorted/deduplicated keys, dropping final outgoing easing, and treating any compile diagnostic as failure. Successful schema validation has a discriminated success result, rather than a diagnostics array; the builder now handles that correctly.

## 3. Improvements

### Easier implementation

| Candidate | What it removes here / what it would allow | Existing work and decision boundary |
| --- | --- | --- |
| Shared story builder/evidence tooling | Remove duplicated Chromium/CDP server code, source statistics, contact-sheet plumbing and ad hoc viewport probes. Supply named frame assertions, deterministic captures and reproducible timing reports. | Recurs in Blue, Circle, Mountain, Home and other stories. Tooling first; no language change needed. |
| Better reserved-name and rolled-back-unit diagnostics | Remove time spent interpreting `circle needs a name` and secondary unknown-target errors after a rejected bank. Show the reserved identifier and the owning failed unit with its primary resource diagnostic. | Recurs in Moon, Clockwork, MotionScript→Motion, Copperleaf, Mountain and Home. Compiler diagnostics, not new syntax. |
| Compiler/resource preflight and geometry compaction utilities | Report expanded geometry, top-level unit bytes and track/key costs before final compile; batch same-paint contours and identify redundant vertices without losing corners. Would avoid trial-and-error geometry-budget failures. | Budget and compiler tooling recur in Crane, Mountain and Home. The compaction used here is a builder technique. Do not simply raise limits without profiling. |
| Named times or seconds in keyframe entries | Remove percentage conversion and some key-array normalization; retain contact, apex and recovery names across tracks and assertions. | Recurrent in Packet, Vectors, Binary Tree, Order Book, Mountain and Home. Syntax/diagnostics proposal; not presently released. |
| Deterministic bindings for derived channels | Remove repeated samples for ball, shadow, trail, highlight, camera and local light. Allow a single position to drive contact-related geometry while retaining seekability. | Frequent driver/signal theme. Ownership, cycle rejection, evaluation order and streaming effects require an explicit semantic design. Parent groups already solve the ball's attached highlight and are preferable where sufficient. |
| Camera follow with fit and settle constraints | Replace `cx`, `cy` and `zoom` hand calculations and make final framing less coupled to the 640-unit/s wipe. Could preserve course visibility with a declared follow target, lead room and end settling time. | Camera-fit theme in many stories. Benchmark a current-language sampled-camera helper before proposing new camera semantics. |
| Profile runtime indexing and immutable geometry reuse | Potentially reduce per-frame work and make larger native stories practical. The measured final evaluation batches establish cost but do not identify its dominant cause. | Hypothesis only. Streetlight independently raises the same per-frame graph-indexing hypothesis. Runtime source repeatedly builds lookups while flattening items; no controlled profile or runtime patch was made here. Compiler clone/validation cost is likewise not proven to dominate this story's 1.3–3.1s capture-run compile range; a later merged check running alongside the repository checks took 9.207s. |

### More expressive representation

| Candidate | What it removes here / what it would allow | Existing work and decision boundary |
| --- | --- | --- |
| Real masks/mattes with animated bounds | Remove four spatially partitioned banks and the constraint that camera speed determines wipe duration. A shared parallax scene could change medium under a moving reveal, with a curled mask edge and exact silhouette retention. | `compositing.mask` and `compositing.matte` are pending, not available. Recurs in Moon, Circle and Mountain. Needs complete compiler/runtime/renderer semantics and conformance, not just parser acceptance. |
| Use released path morph before adding a style-transform construct | Replace the brief double-opacity ball contour transition with one opaque, topology-matched outline. A future experiment should compare the current overlap against the already released `geometry.pathMorph`, with fixed centre, diameter and highlight assertions. | Existing capability, not a new proposal. Circle supplies topology/rotation evidence. Untested alternative here; no claim that the engine cannot express it. |
| Animated paints and stroke widths | Remove some duplicate light passes and abrupt paint banks, and let pencil weight, paper edge shade and neon tube intensity change continuously. | Animated solid fill is drafted in pending notes; animated stroke colour/width are not part of that draft. Recurs in Vectors, Small Ideas, Circle and Home. Static radial paint already improves the neon ball today. |
| Deterministic material/texture or reusable procedural geometry | Replace expanded grain, crosshatching, pixelized contours and repeated leaves with concise authored parameters. Could add denser fibres, subtly irregular pencil pressure and coherent pixel quantization without sacrificing silhouettes. | Pending `geometry.repeater` is related but does not itself provide textures or quantization. Reusable drawable symbols recur elsewhere. Prototype host-side recipes and measure expansion first. General loops/functions or a procedural execution model require a design decision under AGENTS.md; they are not routine additions. |
| Seekable cue/audio host contract | Replace the standalone soundtrack host with declarative cue metadata that a playground adapter can schedule. Later audio support could add recorded foley, envelopes, crossfades and scrubbing semantics. | Audio absence recurs in every story. Metadata/host scheduling is a smaller first experiment than putting synthesis or arbitrary audio execution in MotionScript. No audio capability is currently claimed. |
| Emissive paint, bloom or track-relative lighting | Replace layered stroke halos, trail discs and the ground ellipse with a coherent neon material whose nearby light follows actual geometry. Could improve the valley and preserve apparent glow as the camera widens. | Effects blur exists today; a scoped blur treatment is a current-language alternative not benchmarked here. Lighting/bloom proposals require a bounded rendering scope, colour/compositing rules and portability decisions. Hypothesis, not a measured engine defect. |

## 4. Priority

**Fix first:** shared real-renderer authoring tools, resource preflight, and precise reserved-name/rolled-back-unit diagnostics. They remove observed failure/review work without expanding execution semantics. Keep the current compound-path recipe and independent contact checks as an example. Investigate runtime indexing with a controlled profile before changing it.

**Experiment next:** topology-matched ball morph with existing capabilities; then pending masks on one shared scene, measured against this banked baseline. Test a sampled follow-camera helper before core camera syntax. Add a seekable cue metadata/host adapter experiment that can reuse this companion's cue timing. Compare fixed-quality source bytes, expanded geometry, compile/evaluation cost and material fidelity.

**Defer:** a universal mixed-media operator, physical simulation, general loops/functions and unbounded procedural textures. One manually authored story does not establish the semantics or held-out benefit of those features. Do not use the temporary budget failures as justification for increasing resource caps, and do not claim the soundtrack workaround is native MotionScript audio.
