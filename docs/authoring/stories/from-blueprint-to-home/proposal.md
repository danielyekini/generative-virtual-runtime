# Unevaluated retrospective — From Blueprint to Home

Written 2026-10-29 after implementation and real-renderer inspection. This is one story's evidence, not an adopted language proposal; see the [index](../README.md#what-these-proposals-are). The program and builder are pinned by the [story record](README.md). No capability, release, contract or budget was changed.

## 1. State of the result

The 30-second playground preset is `from-blueprint-to-home`, derived from the title. It delivers the construction-to-cutaway sequence with a single fixed floor coordinate system. Its perspective is a generated orthographic approximation: the released camera is 2D, so the builder projects plan coordinates and heights into matching-topology path keys. It does not introduce a 3D runtime.

| Script beat | Observed result and evidence |
| --- | --- |
| 0–5s: blueprint | The footprint traces clockwise by 2s; partitions complete at 3.5s, leaving a central cross corridor and openings in the centre spine. Window marks, four segmented swing arcs, ticks, dimension lines and labels are present at [4.9s](evidence/f4.90.png). The entrance recess is retained. |
| 5–10s: structure | The shallow slab appears during 5–6s; exterior panels grow during 6–8s; partitions during 8–10s. [7s](evidence/f7.00.png), [8s](evidence/f8.00.png) and [10s](evidence/f10.00.png) show the progression. Separate sill and lintel panels leave unpainted openings. At 10s the checked sill-to-lintel projected gap exceeds 35 pixels and the central circulation gap exceeds 120 pixels. Resolved wall bases and plan segments agree within 0.1 pixel. |
| 10–15s: exterior | White window frames slide into position; the entrance leaf pivots closed by [12s](evidence/f12.00.png). Four trusses descend, two opaque roof planes settle, and ridge/chimney finish by [15s](evidence/f15.00.png). The roof covers the interior through paint order, without a background-coloured hiding plate. |
| 15–19s: finished house | Pale blue glass begins appearing at 15s and is visible at [16s](evidence/f16.00.png). The shallow frontward orbit stops at 17s; the entrance path and hatching remain visible. [18.5s](evidence/f18.50.png) shows the blue separation cue. The view stays on one side of the front-to-back axis. |
| 19–24s: open | [20s](evidence/f20.00.png), [21s](evidence/f21.00.png) and [22s](evidence/f22.00.png) show the rigid roof rising, shifting left, then becoming faint. Roof edge orientation is checked at eight intermediate samples. Front panels lower during 22–23s and right panels during 23–24s; rear walls and partitions remain standing. [23s](evidence/f23.00.png) shows the temporary dashed extents. |
| 24–28s: rooms | Living, kitchen, bedroom and bathroom appear in that order. Outlines draw before separate light fills fade in. The [24.6s](evidence/f24.60.png), [25.6s](evidence/f25.60.png), [26.6s](evidence/f26.60.png) and [27.6s](evidence/f27.60.png) frames show the four draws. At each room's completion, every checked furniture vertex lies inside the runtime-resolved convex floor boundary, with 5 square-pixels of cross-product allowance for the slight furniture height offset. The camera approximation tilts higher to keep rear rooms legible. |
| 28–30s: alignment | [28.3s](evidence/f28.30.png) has full-opacity blue plan lines aligned with wall bases; they soften to opacity 0.28 by 29s. The furnished composition and faint roof hold through [30s](evidence/f30.00.png). |

The resource and timing measurements are in [measurements.json](evidence/measurements.json):

| Measurement | Final result | Budget |
| --- | ---: | ---: |
| UTF-8 source | 437,022 bytes (83.36%) | 524,288 bytes / 512 KiB |
| Nodes | 198 | 500 |
| Tracks | 436 | 1,000 |
| Steps | 0 | 1,000 |
| Duration | 30,000 ms | 60,000 ms |
| Compile | 6,295 ms | No latency budget asserted |
| Builder through assertions | 9,977 ms | No latency budget asserted |
| Builder including real-renderer previews | 16,009 ms | No latency budget asserted |

These are one run on Node v24.19.0, not repeated benchmark statistics. The core time includes generation, compilation, IR validation and the runtime checks; the preview total additionally includes Chromium setup and capture, excluding CLI startup. Compilation accounts for about 63% of that run's core time; its internal cause was not profiled.

All **40** final PNGs were inspected in the four [contact sheets](evidence/README.md), with full-size checks also made during refinement. Final 18.5s, 28.3s and 30s were inspected full size. Rendering used the production **CanvasRenderer in headless Chromium 151**, at 1280 × 720 and DPR 1; no SVG approximation was used. The builder additionally sweeps visible path vertices every 0.25s, keeping them inside x=12…1268 and y=80…650, above the caption. Captures include every main beat boundary and the construction, removal and furnishing moments listed in the evidence record.

### Simplifications and limits

- Camera tilt, orbit and the door hinge are baked 2D projections, not perspective optics or runtime spatial transforms. Samples are interpolated linearly between the builder's eased projection poses. Smoothness and geometric approximation error between keys were not measured against a dense control. No continuous-motion perceptual review was performed.
- The initial plan is centred horizontally at x=640, but its centre is y=440 rather than the viewport's y=360. Reserving room above it for the lifted roof was an implementation choice. This gives the overhead opening more whitespace than the brief implies.
- Floor labels use projected positions and compressed vertical scale, with no full affine text projection. They remain horizontal on screen rather than precisely rotating with floor axes. Occlusion hides some labels once walls are up; furnished labels return at each room's finish. This is a visible approximation, not a claimed exact floor text transform.
- Furniture is deliberately schematic: rectangles, cushion divisions, pillow and cooker marks. Bath, basin and toilet are simplified plan symbols; they have no curved bowls, taps or raised solid bodies. Floor boundaries and clear circulation take precedence over appliance detail.
- The roof assembly fades to opacity 0.12, retaining faint face fills and visible truss intersections. It is not strictly outline-only. From 22s onward its projection is frozen while the rooms receive the final push and higher tilt, so the suspended roof keeps its established orientation. Both choices are presentation workarounds, not a contract requirement; an outline-only bank can be tested in the current language.
- Static painter order is tailored to this limited orbit. Rear/front windows, walls and furniture have explicit layers. No general depth sorting, back-face handling or arbitrary orbit correctness was demonstrated.
- The separation cue is offset just beyond the front eave so it is visible before roof removal. Dashed wall guides are separate short paths, not a stroke dash feature.
- Pencil strokes, clicks, sweeps, ambience and the resolving tone are absent: there is no audio implementation. No audio sync or export was tested.

The story builder passes compilation without diagnostics, IR validation, budgets and its draw-item assertions. Repository-wide checks remain **FAIL**: typecheck reports 12 existing errors in Clockwork, Counter, Crane and Moon builders; Vitest reports 201 passing tests and one failing schema fixture test. Both failures were reproduced on clean base commit `7f1e95b276d3ac9d459d45297d95dfae588a77fa`; typecheck output is byte-identical. The failing duration fixture expects a rejection that does not occur. [Logs and base comparison](evidence/README.md#required-repository-checks) are retained. These are not a claim that the entire repository passes.

## 2. Hardest and most error-prone aspects

Ranked by observed fidelity risk and implementation rework; task-level minutes were not instrumented.

1. **Coupling every projected part while staying within source budget.** The final source contains 191 `commands` tracks, 195 opacity tracks, 38 trim tracks and 12 label position/scale tracks. An early emitted candidate measured 855,501 bytes, before reducing projection samples and redundant plan geometry; that candidate was not an accepted implementation. Root cause: the current language has independent 2D paths; the projection system and initial oversampling were my implementation choices. Workaround: one plan coordinate system, a common pose-time list, removal of unchanged interior keys, and runtime checks on alignment and roof edge vectors. The final program is below the source budget but still spends 83% of it on a modest house. There is no measured compact alternative yet.
2. **Framing the roof and showing all rooms.** The quarter-second sweep caught a descending truss at y=67.62 and later a roof vertex at y=78.50 against an 80-pixel header boundary. Real stills also showed rear-room labels against partition faces. Root cause: my framing and low final elevation, not a demonstrated renderer defect. Workaround: smaller projected footprint, extra headroom, a frozen ghost-roof framing after 22s, and a higher final tilt. Compare [10s](evidence/f10.00.png), [22s](evidence/f22.00.png) and [30s](evidence/f30.00.png). The resulting initial vertical offset is disclosed above.
3. **Visibility is more than node existence.** Interior lines must disappear under an opaque roof, then furniture must remain legible behind standing partitions. Blue plan lines initially read poorly beneath opaque surfaces, and the separation cue was hidden by the eave. Root cause: explicit paint order plus my cue placement. Workaround: reserved annotation layers, real CanvasRenderer inspection, a separate exposed separation line and higher cutaway elevation. The [18.5s](evidence/f18.50.png) and [28.3s](evidence/f28.30.png) frames verify the repaired cues. Runtime opacity assertions alone would not have proved this.
4. **Timeline encoding and outgoing easing.** An early 2s footprint check found an empty runtime command list. My first trim key used outgoing `hold`, and two-decimal percentages placed the nominal 2s endpoint about 1ms late. Root cause: my track construction interacting with percentage time notation, not evidence of incorrect runtime easing. Workaround: linear initial trim, seven-decimal percentages, explicit holds after completion and checks at stated seconds. I also initially wrote `.path.commands` instead of the supported `.commands`; the compiler rejected it, correctly, but described the target as “not a V1 animation target.”
5. **Preview and baseline verification setup.** The builder needed a real browser page and a separate clean worktree comparison to distinguish pre-existing failures. Root cause: tooling integration cost. Workaround: a 46-line story-specific preview helper using the repository's Chromium resolver/CDP client, plus retained base/current check logs. No new package dependency was required.

Reserved ids were avoided throughout; successful compilation provides no evidence about the quality of reserved-keyword diagnostics. A shared name preflight would still be useful given Moon, Packet and Clockwork's earlier findings.

## 3. Suggested improvements

All benefits below are **hypotheses until tested**. These suggestions do not change the registry or pending list.

### GVR fixes and tooling with no language change

| Improvement | What it would remove here | What it would enable in a more detailed version | Relationship to earlier work |
| --- | --- | --- | --- |
| Shared CanvasRenderer capture/measurement/assertion harness | The bespoke 46-line browser helper, repeated capture lists and manual contact-sheet generation | Repeatable per-beat evidence, text measurements, occlusion probes and denser roof/furniture review | Recurs in Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas and Circle. No language change. |
| Precompile budget report and track/source breakdown | A late source-budget assertion and manual track counting | Early decisions about adding wall trim, curved furniture or a second roof bank before paying compilation cost | Recurs in Crane and budget proposals. Enforce the existing source budget; do not raise it based on this story. |
| Target-aware diagnostics and builder id preflight | Trial-and-error `.path.commands` use and ad hoc avoidance of grammar words | Safer generated node names and actionable diagnostics in larger generated plates | Keyword diagnostic theme recurs; “V1” wording should identify the supported target instead. No reserved-name failure occurred here. |
| Profile compile/validate separately and repair existing baseline checks | Ambiguity in the 6.295s compile cost and manual base-failure reconciliation | Evidence for whether larger detail is blocked by compilation, validation or source size | Crane reports compiler scaling, but this story has no profiler evidence establishing the same root cause. Baseline test/type fixes are separate work. |

### Experiments using the current language

| Experiment | What it would remove or replace here | More detailed version it could allow |
| --- | --- | --- |
| Adaptive common projection times, compared through `AnimationRuntime` against a dense control | The manually selected pose-time list and unmeasured inter-key approximation | More furniture and window detail under the same source budget, if a declared pixel-error bound passes. No compression benefit is measured yet. |
| Outline-only ghost roof bank, with the opaque bank fading away | Faint filled faces and truss intersections in the suspended roof | A clearer roof section with visible rafters. This adds nodes; it is not a reason to claim a missing fill-animation capability is mandatory. |
| Project floor-label outlines, or compare a rotation/scale approximation at the chosen views | Compression-only horizontal labels | Labels that read as lying on the floor. Small Ideas already uses custom glyph outlines, at substantial authoring cost. Test legibility and source cost before adopting it here. |
| Sweep a wider but still same-side orbit with explicit paint banks | The assumption that current static order is sufficient outside the measured views | More façade detail and a controlled extra angle. This may fail; arbitrary orbit support is not established. |

### Language proposals

| Candidate | What it could remove here | What it could allow later; status |
| --- | --- | --- |
| Stroke dash pattern with explicit units and phase | The 24 separate short paths used for two dashed guide rows | Longer dimension/separation guides without proliferating nodes. Dash units, transform behaviour and animated phase need conformance decisions. Recurs in Packet, Vectors and Clockwork; not currently pending. |
| Keyframe offsets in seconds, optionally named authoring times | Percentage conversion/precision handling and duplicated absolute beat arithmetic | Safer retiming of windows, furniture and camera together. Seconds alone need not introduce an execution model. Named-time resolution needs a defined contract. Recurs in Packet, Vectors, Counter, MotionScript→Motion and Small Ideas; not pending. |
| `transform.skew` as a gated affine transform addition | Part of the compression-only floor-label workaround, if an affine-label experiment succeeds | Floor-plane text and reusable furniture groups with full affine projection. Already pending; it is not full 3D and would not by itself remove the roof/height projection tracks. |
| Animated solid fill alpha/colour | Potentially the separate window-glass and furniture-fill states | Gradual glass tint and outline-to-fill transitions on one object. `paint.animatedSolidFill` is already drafted in pending; it excludes stroke. Current opacity-layer alternatives work, so this is convenience rather than an implementation blocker. Recurs across multiple stories. |
| Spatial transforms, hinges and depth-aware paint as a separate design investigation | The baked house projection, per-path coordinated geometry and manual layer assumptions | A genuinely camera-driven house with doors, openings and roof assemblies. Crane independently raises hinged 3D-like subjects and dynamic paint order. This is not a routine small capability addition: coordinate conventions, projection, occlusion, text orientation and old-reader rejection require a design decision and separate test corpus. |
| Non-playing cue metadata | The complete loss of the script's named sound timings in the executable artifact | An external sound editor could synchronise pencil/placement cues. No audio execution or media clock is proposed here. Audio/cue absence recurs in every story; cue metadata is not currently pending. |

General loops, functions, procedural instances and channel-reading drivers might compress generation, but their execution and dependency semantics have not been designed or tested here. They need a design decision under `AGENTS.md`, not routine addition because this builder uses TypeScript loops. The immediate projection experiment can stay in the generator.

## 4. Priority

**Fix now:** retain real-renderer checks, share the preview harness, report budgets before compilation, improve target diagnostics, and address the reproduced baseline type/test failures in their own scoped changes. These make authoring evidence more reliable without expanding the language.

**Experiment next:** adaptive projection sampling, an outline-only roof bank and affine floor labels. Compare source size, compile cost, runtime geometry and the same stills against this recorded implementation. Then scope dash and seconds-offset candidates using recurrence evidence from the index; do not call them adopted from this one story.

**Defer:** general 3D/depth sorting, channel drivers, loops/functions, procedural instances and audio playback. First decide their contracts and evaluate independent subjects. The measured house is achievable within the current contract; its remaining presentation limitations do not justify an untested execution-model expansion.
