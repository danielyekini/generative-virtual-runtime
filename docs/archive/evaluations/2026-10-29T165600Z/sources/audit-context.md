# MotionScript/GVR capability and production-readiness audit

29 October 2026. Repository: danielyekini/generative-visual-runtime. Reviewed main-branch sources retrieved during this audit; latest observed commit: `80675916bc50ca6ec4f897ae9e718d24906151d2`. Blob identities are retained in the audit evidence. Requests used main rather than a commit-pinned ref, so this is not a claim of an atomic checkout. No repository files were changed.

## Executive assessment

The corpus is valuable evidence of authoring friction, but it currently benchmarks offline builders more strongly than live model authoring. The most recurrent problems are missing native sound, repeated authoring/verification plumbing, duplicated relationships, repetition, camera/timing ergonomics and static paint/text. The most consequential product gap is useful progressive execution: 22 fully retrieved story programs contain no seals and complete only at the end. The current compiler also freezes base definitions after the first seal, creating a genuine architectural constraint on introducing new objects while presentation is already running.

Recommended implementation sequence: restore correctness and trustworthy checks; establish streaming and performance baselines; design persistent entities/revisions/behaviour ownership and event semantics together; deliver reuse, bindings, paint/text/path/camera capabilities against that contract; integrate seekable audio; develop a bounded spatial-graphics and physics track. Design 3D/physics early, but do not make full 3D simulation a prerequisite for repairing the existing 2D execution path.

## Scope and frequency method

- Read all 23 story proposals and story records; reviewed language goals/guides/pending releases, registry, importer gaps, compiler/runtime/renderer/Studio source, and 19 evaluation/workflow documents. The captured source corpus contains 95 initial documents and 131 engine/Studio/evaluation TypeScript/TSX files and 25 story builder/preview files, plus later evaluation inputs and 22 complete story programs. Root policy and related guidance were also consulted. A scan of builder comments found further corroboration of audio, paint and host-workaround limitations, with no additional independently ranked theme; builder comments are not counted again as separate story evidence.
- Main ranking counts independent story reports, once per normalised theme per report. A repeat in the catalog, changelog, brief, release note or historical run is not another independent authoring observation. Broader repository work is listed separately below. This prevents large copied histories from dominating the priorities.
- Counts include an explicit limitation, proposed remedy, evaluated alternative or explicit decision to defer that theme in the story itself. They are **mention frequencies, not votes to implement**. Mere references to another story are excluded when they supply no local evaluation. Closely related subthemes overlap, so counts cannot be summed into a percentage of all problems.
- The matrix is a conservative, manually coded synthesis. Broad families such as text and audio contain several subfeatures; rare subfeatures are retained separately. Evidence links expose every story assigned to each row, so the grouping can be revised without losing attribution.
- The catalog says every story mentions audio. Direct audio/cue discussion was found in 21/23 proposal texts: Clockwork and Moon do not explicitly propose or describe audio in those texts. This report uses 21, rather than repeating the catalog’s universal claim.
- Historical claims and measured numbers are attributed, not freshly certified. No full test suite, browser streaming replay, profiler or perceptual review was run. Current registry status overrides a story’s informal capability claim. Hypotheses are kept separate from source-confirmed mechanics.

## Frequency-ranked inventory

| Rank | ID | Theme | Reports / 23 | Limitation addressed | Suggested direction |
| ---: | --- | --- | ---: | --- | --- |
| 1 | A01 | Audio, narration and timed cue/media integration | 21 | Silent native presets; cues are lost in comments, captions or separate movies/players. Native transport cannot scrub or cancel companion sound. | Define resource-backed narration/effects cues and a host media clock; specify preload, pause, seek, reverse, loop, cancellation and export. Metadata alone is not audible playback. |
| 2 | A02 | Shared authoring, real-renderer capture and assertion tools | 18 | Builders copy browser setup, timing helpers, matrix conversions, previews and assertions. Draw-item checks miss real compositing, glyph overlap and loop seams. | Extract one story kit: production-renderer captures, viewport/glyph bounds, interval sweeps, shuffled seeks, loop diffs, contact and occlusion probes. |
| 3 | A03 | Deterministic channel drivers, point bindings and attachments | 18 | Related motion, shadows, annotations and effects repeat schedules or a private kinematics/easing implementation in TypeScript. Relationships break after edits. | Specify typed read dependencies, local/world/screen spaces, evaluation order, cycle rejection, track ownership and bounded dependency cost; prefer existing parent transforms when sufficient. |
| 4 | A05 | General loops, functions and procedural execution: design investigation | 18 | Host builders perform repetition and calculation that the model-facing language cannot express directly. A procedural language might shorten source but adds termination, state and streaming risks. | Choose explicitly between finite compile-time expansion, libraries, bounded repeaters and stateful execution. Do not conflate cyclic time with arbitrary loops. |
| 5 | A04 | Drawable reuse, parameterised symbols and bounded repetition | 17 | Repeated characters, panels, words and districts become expanded listings; stored composition instances do not stamp new drawables. | Separate shared definitions from per-instance identity/state; compare bounded compiler expansion with shared geometry. Measure expanded nodes and draw cost, not source bytes alone. |
| 6 | A06 | Camera fitting, following, aiming and readable framing | 16 | Dense baked camera keys and hand-solved zoom/positions; subjects or labels leave the useful viewport. | First benchmark bounds-aware camera helpers and existing spatial vec2 tracks; design live fit/follow/aim only where those fail. Include safe areas and screen-size labels. |
| 7 | A07 | Seconds-valued keys, named beats and retiming | 15 | Full-duration percentage keys obscure beat times, duplicate arithmetic and introduce boundary rounding hazards. | Add optional time-valued offsets and named/local beats with precise scope, duplicate-time, duration and emit/parse rules; retain exact existing visibility steps. |
| 8 | A09 | Resource preflight, budgets and source/expansion accounting | 15 | Late node/geometry rejection, large atomic units, silent source-limit overruns and little headroom for detail. | Report source and largest unit, expanded nodes/geometry/tracks, decoded resources and queue budgets before expensive work; enforce limits consistently and profile before raising them. |
| 9 | A08 | Animated fill/stroke/text paint | 14 | Colour changes require duplicate geometry and opacity banks; static paint consumes scene budgets and complicates edits. | Land a scoped solid-fill channel contract; explicitly decide text fill, stroke colour, alpha and interpolation. Do not imply spatial lighting or gradient animation. |
| 10 | A10 | Text content, numeric formatting, layout, metrics and glyph access | 12 | Static variants proliferate; hand-built glyphs, guessed widths and manual wrapping hinder typography and live readouts. | Split into discrete content/numeric bindings, deterministic font/metrics/layout, and per-glyph transforms/outlines. Define formatting and readiness separately from text.animators. |
| 11 | A11 | Reserved identifiers and target-aware diagnostics | 10 | Ordinary names fail as missing-name errors; target/channel errors give little guidance. | Name the reserved identifier and expected target/channel; provide safe-name preflight and current, target-specific wording. |
| 12 | A12 | Compiler throughput and incremental validation | 9 | Whole-scene clone and validation per accepted unit cause multi-second or minute-scale stalls; story selection blocks the UI. | Profile parse/lower/validate/clone separately, then use indexed delta validation and copy-on-write transactions while preserving atomic rollback. |
| 13 | A13 | Clipping, masks and mattes | 9 | Background-colour erasers, foreground plates, duplicate inset paths and spatial banks constrain occlusion/reveals. | Start with geometric clipping and explicit spaces; then scoped alpha/luminance mattes, bounds, nesting, effect order and resource limits. |
| 14 | A14 | Restore trustworthy repository checks | 9 | Repeated base/current comparisons consume effort because typechecks and an obsolete duration fixture are already red. | Repair existing builder type errors and update the invalid-duration fixture to match the released 60s default; retain current semantics. |
| 15 | A15 | Suppress diagnostics cascading from rejected units | 7 | One parse or budget rejection drops a group and triggers many secondary UNKNOWN_TARGET errors. | Retain rejection provenance; show the primary failed unit and group dependent errors beneath it without hiding independent faults. |
| 16 | A16 | Path progress, trim-end markers and orientation | 7 | Traveller positions, arrowheads, trail trim and endpoint attachments have independently baked schedules. | Expose sampled point/tangent/distance on evaluated paths and bounded attachments; distinguish orienting from rolling distance and changing attachment. |
| 17 | A17 | Dynamic paint order and depth-aware occlusion | 6 | Static sibling order causes duplicated front/back banks, hidden route legs, restricted camera paths and artificial crossings. | Specify stepped ordering or explicitly depth-sorted scopes; preserve deterministic ties and compositing boundaries. |
| 18 | A35 | Adaptive sampling and source/key simplification | 6 | Dense baked keys dominate source; different builders choose tolerances inconsistently. | Share a sample/simplify helper with fixed visual/semantic error checks; keep topology and contact windows intact. |
| 19 | A18 | Per-frame graph/index/transform performance | 5 | Repeated index construction and ancestor traversal scale poorly; authors merge geometry to reduce overhead. | Build topology indexes per revision and derived transforms/visibility/opacity per sample; profile allocation and caching invalidation. |
| 20 | A19 | Animated stroke width and variable width profiles | 5 | Weight changes need duplicate strokes or filled outlines; a travelling ribbon widening needs more than uniform width. | Add uniform width first; treat arc-length width profiles, cusps, joins and normals as a separate extension. |
| 21 | A20 | Stroke dashes and dash phase | 5 | Many individual dash segments/paths consume geometry and cannot reveal correctly through broken trim. | Define pattern units, transform behaviour, phase and animation; preserve subpaths in trim. |
| 22 | A21 | 3D projection, hinged/two-sided panels and depth | 5 | Builders bake projected geometry, face swaps, depth tricks and trajectories into large 2D key lists. | Separate 2.5D depth/dolly from planar hinges and a full 3D backend. Specify coordinates, projection, culling, sorting, text and bounds before implementation. |
| 23 | A22 | Layered/additive/multiplicative channel ownership | 4 | Two effects on one channel conflict; authors merge tracks, duplicate nodes or add nested groups. Authored base values can be unexpectedly replaced. | Document current absolute writer semantics now; separately design composition/fill/priority rules for event-over-state behaviours. |
| 24 | A23 | Verification, provenance and baseline attribution | 4 | A valid compile or model-level assertion can be mistaken for visual correctness; changed bytes inherit stale evidence. | Pin program/builder/runtime identities and browser/font settings; use independent rendered-state checks, not only the generating model. |
| 25 | A24 | Affine/skew text and arbitrary-axis deformation | 3 | Projected labels require approximations or rotation-scale-rotation chains with extra hierarchy. | Verify existing affine decomposition helpers; implement pending skew with transform-order and migration tests. |
| 26 | A25 | World-attached, constant-screen-size labels | 3 | World labels become unreadable or oversized during camera motion; separate screen copies duplicate state. | Define world-point attachment and camera-independent size/rotation policies with explicit coordinate spaces. |
| 27 | A26 | Cyclic angles, facing and scale-through-zero | 3 | Turns reverse unexpectedly, angle-difference checks wrap, and facing changes flatten actors during scale interpolation. | Provide/document unwrapped versus shortest-arc angle rules and discrete facing changes; test zero-scale inverse/hit-test policy. |
| 28 | A27 | Morph topology, rotation and geometric sampling | 3 | Matching-command morphs need careful correspondence; turns or silhouette changes can collapse or require extra transform banks. | Use released topology-compatible morph and nested transforms first; evaluate polar/rotation-aware morph only with a precise new interpolation contract. |
| 29 | A28 | Trim preserving separate subpaths | 3 | A compound path’s move breaks become connecting ink; grid/dash reveals require workarounds. | Retain M breaks and define trim length/mode per contour; verify native and imported semantics with isolated fixtures. |
| 30 | A36 | Track gaps, end holds and absolute-base semantics | 3 | Authors pad every track across the full scene because shorter/segmented-track hold behaviour is unclear. | Document and test before/after/gap/fill ownership; benchmark beat-local tracks and local timing scopes. |
| 31 | A29 | Seamless cyclic timelines and wrapping timing scopes | 2 | End-crossing segments and phased walkers require hand-derived easing or long modulo/clamp expressions. | Define periodic time, seam interpolation, boundary derivatives, partial cycles and cue repetition without conflating them with arbitrary procedural loops. |
| 32 | A30 | Seam-free meshes, shared edges and merge/union strokes | 2 | Separately antialiased pieces show hairline cracks or false creases. | Test fill-only outlines/overlap first; scope shared-edge mesh or coverage-union/merge semantics for demonstrated failures. |
| 33 | A31 | Computed/parametric geometry and function plotting | 2 | Cone boundaries and weighted function sums require full repeated path literals at many keys. | Prototype bounded plot/domain sampling and parameterised geometry with error and evaluation budgets; avoid hiding arbitrary scripting in geometry. |
| 34 | A32 | Rig, grounding, reach and mechanical contact constraints | 2 | Contacts and plant positions are solved or checked in builders; structural validation cannot establish that a punch lands or a bar stays joined. | Start with shared pose/IK/contact inspectors and bounded constraints; evaluate a separate 2D physics profile where authored trajectories cannot meet the use case. |
| 35 | A33 | Materials, reflections, distortion, emission and lighting | 2 | Manually sliced reflections, layered halos and projected shadows approximate material behaviour. | Prototype bounded masks/blur/current paints before a material backend; specify reflected surfaces/distortion and local emission separately. |
| 36 | A34 | Sprites/images, crisp pixel rendering and texture recipes | 2 | Pixel art consumes hundreds of rectangles; grain/hatching expands source and geometry. | Conformance-test resources.image, nearest-neighbour rendering and asset readiness; provide bounded host texture/geometry recipes and batching. |
| 37 | A47 | Timeline/state inspection for algorithmic explanations | 2 | Many independent visibility/text states must agree at exact semantic boundaries. | Build event-grouped inspection and independent queue/stack/tape assertions; use persistent tokens where possible. |
| 38 | A37 | Keyframe sampling after the last explicit key | 1 | An early-ending key list reportedly samples the wrong segment before progress reaches 1. | Add a minimal last-key/hold regression, repair if reproduced, then remove unnecessary padding. |
| 39 | A38 | Capability declaration for string hold easing | 1 | String hold may not record easing.hold in the compiler’s required capability set. | Make capability detection representation-independent and test round trips/older-consumer rejection. |
| 40 | A39 | Hold-easing equality in emitter/fixture verification | 1 | Object-identity equality reportedly rejects equivalent hold representations and affects fixture placement. | Compare semantic easing values; add an isolated emitter verification test before treating this as fixed. |
| 41 | A40 | Math-friendly author coordinate frames | 1 | Y-down pixels obscure mathematical coordinates; negative scaling also flips labels. | Prototype a y-up authoring frame with upright text policy, or a generator coordinate helper. |
| 42 | A41 | Arc, annulus and radial construction primitives | 1 | Clock rings and teeth expand into many path commands and marks. | Benchmark static path recipes and a bounded repeater before adding dedicated primitive semantics. |
| 43 | A42 | Zero-length subpath cap semantics | 1 | Precautionary visibility steps hide ambiguous cap behaviour. | Specify zero-length stroke caps across native renderer and SVG lowering, then add conformance. |
| 44 | A43 | Vector-valued and uniform-scale expressions | 1 | One depth effect needs separate x/y and scale component tracks. | Prototype typed vec2/uniform scalar broadcasts with clear channel ownership. |
| 45 | A44 | Elliptical radial-gradient transforms | 1 | Elliptical glow requires scaling a circular paint through geometry/groups. | Evaluate radius-vector or explicit paint-transform support; retain an existing-transform alternative. |
| 46 | A45 | Animated effect parameters, especially blur | 1 | Reverberation blur is static even while echoes shrink/fade. | Define bounded effect parameter channels and offscreen expansion/caching costs. |
| 47 | A46 | Contact shadows and shadow conformance | 1 | Duplicate offset shadows replace a capability whose support is untested. | Conformance-test effects.shadow and bounds before adding more shadow syntax. |
| 48 | A48 | Compositing render-tree paint order | 1 | Adding any compositing group changes declaration-versus-zIndex order, even for other objects. | Make render tree and flat draw list preserve the same sibling ordering; cover nested effects and isolated scopes. |

## Evidence and caveats for each ranked theme

### A01. Audio, narration and timed cue/media integration — 21/23

Contract gap; some reviews explicitly advise deferral. Direct audio/cue discussion in 21 proposals; the catalog’s claim that every proposal mentions it is broader than their actual text.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md).

### A02. Shared authoring, real-renderer capture and assertion tools — 18/23

Tooling; no language change required.

Sources: [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A03. Deterministic channel drivers, point bindings and attachments — 18/23

New sampling semantics; frequency includes explicit current-language alternatives and deferral, not unanimous support for unrestricted queries.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md).

### A05. General loops, functions and procedural execution: design investigation — 18/23

Mostly explicitly deferred or rejected as routine work; this row records discussion frequency, not implementation demand.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md).

### A04. Drawable reuse, parameterised symbols and bounded repetition — 17/23

New drawable semantics. Blue/Copper caution against generalising; Mountain demonstrates hierarchy reuse without new instances; Order’s instance experiment is unverified.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md).

### A06. Camera fitting, following, aiming and readable framing — 16/23

Mixed tooling and proposed constraints; Order/Blue explicitly suggest current-language alternatives.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md).

### A07. Seconds-valued keys, named beats and retiming — 15/23

Syntax/authoring contract; Copper argues its held pixel clock needs no new syntax and is not counted here.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A09. Resource preflight, budgets and source/expansion accounting — 15/23

Production hardening; duration default is already 60s, so old 35s rejection reports are resolved.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A08. Animated fill/stroke/text paint — 14/23

Draft paint.animatedSolidFill excludes stroke/gradients. Static per-instance paint alone is not counted as animated colour.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A10. Text content, numeric formatting, layout, metrics and glyph access — 12/23

Family of distinct capabilities; pending text.animators does not implement numeric formatting.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md).

### A11. Reserved identifiers and target-aware diagnostics — 10/23

Compatible diagnostic/tooling fix; Home/Tree/Order include prevention rather than a reproduced reserved-name failure.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md).

### A12. Compiler throughput and incremental validation — 9/23

Crane has causal profiling; several other stories merely request profiling. Not all share a proven dominant cause.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A13. Clipping, masks and mattes — 9/23

Pending/unsupported. Blue explicitly says its foreground frond needs only ordinary occlusion; included as an evaluated counterexample.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md).

### A14. Restore trustworthy repository checks — 9/23

Reports reproduce failures on their bases. This audit did not rerun the full suite.

Sources: [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md), [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md).

### A15. Suppress diagnostics cascading from rejected units — 7/23

Compatible compiler/UI diagnostic fix.

Sources: [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A16. Path progress, trim-end markers and orientation — 7/23

Related to pending transform.autoOrient; auto-orient alone does not solve attachment or speed.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md).

### A17. Dynamic paint order and depth-aware occlusion — 6/23

New render-order semantics; distinct from the existing compositing-order defect.

Sources: [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md).

### A35. Adaptive sampling and source/key simplification — 6/23

Existing-language optimisation experiment; no model-generation improvement follows automatically.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A18. Per-frame graph/index/transform performance — 5/23

Square/City/Echo report profiles; Street/Worlds report hypotheses. Reported savings remain unmeasured until implemented.

Sources: [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A19. Animated stroke width and variable width profiles — 5/23

Not supplied by the animated-fill draft.

Sources: [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md), [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A20. Stroke dashes and dash phase — 5/23

New stroke contract; do not substitute dashes for general trim.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md).

### A21. 3D projection, hinged/two-sided panels and depth — 5/23

Evidence for spatial graphics, not proof that every scene needs a full 3D/physics engine. Marble explicitly defers physical 3D contact.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md).

### A22. Layered/additive/multiplicative channel ownership — 4/23

Some requests are diagnostic improvements, not additive animation requests.

Sources: [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md), [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md).

### A23. Verification, provenance and baseline attribution — 4/23

Existing policies already require much of this; operationalise them rather than inventing a new certification system.

Sources: [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md), [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A24. Affine/skew text and arbitrary-axis deformation — 3/23

Skew does not supply full 3D.

Sources: [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md), [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md).

### A25. World-attached, constant-screen-size labels — 3/23

Can be tooling initially; runtime bindings need dependency rules.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md).

### A26. Cyclic angles, facing and scale-through-zero — 3/23

Some errors are builder conventions, not current runtime bugs.

Sources: [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md).

### A27. Morph topology, rotation and geometric sampling — 3/23

Mostly current-language experiments; changing topology remains unsupported.

Sources: [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A28. Trim preserving separate subpaths — 3/23

Reported correctness defect in supported behaviour; source review agrees. Not freshly executed in this audit.

Sources: [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md).

### A36. Track gaps, end holds and absolute-base semantics — 3/23

Separate this from the specific early-last-key bug below.

Sources: [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md), [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md).

### A29. Seamless cyclic timelines and wrapping timing scopes — 2/23

New sampling contract; high value for persistent independent behaviours.

Sources: [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md), [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md).

### A30. Seam-free meshes, shared edges and merge/union strokes — 2/23

geometry.mergePaths is pending; a boolean merge and union stroking are not identical.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md), [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md).

### A31. Computed/parametric geometry and function plotting — 2/23

New geometry/dataflow semantics; a sum loop remains a separate execution-model decision.

Sources: [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md), [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md).

### A32. Rig, grounding, reach and mechanical contact constraints — 2/23

Counter provides strong constraint evidence. Marble says its remaining linkage gap does not justify physics by itself.

Sources: [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md), [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md).

### A33. Materials, reflections, distortion, emission and lighting — 2/23

Ambitious visual directions, mostly unverified; not implied by paint animation.

Sources: [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A34. Sprites/images, crisp pixel rendering and texture recipes — 2/23

Image path is present but untested in registry. Four Worlds is procedural geometry evidence, not a requested bitmap sprite system.

Sources: [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md), [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md).

### A47. Timeline/state inspection for algorithmic explanations — 2/23

Tooling and content modelling; a live algorithm execution engine is a separate decision.

Sources: [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md), [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md).

### A37. Keyframe sampling after the last explicit key — 1/23

Reported defect, not re-executed here; do not mistake workaround removal for a new feature.

Sources: [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md).

### A38. Capability declaration for string hold easing — 1/23

Reported defect; source inspection finds the early string-return path.

Sources: [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md).

### A39. Hold-easing equality in emitter/fixture verification — 1/23

Reported tooling/test defect, not a language limitation.

Sources: [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md).

### A40. Math-friendly author coordinate frames — 1/23

One-story proposal; preserve runtime coordinate conventions for existing programs.

Sources: [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md).

### A41. Arc, annulus and radial construction primitives — 1/23

Narrow geometry convenience; not evidence for a gear solver.

Sources: [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md).

### A42. Zero-length subpath cap semantics — 1/23

One-story contract clarification.

Sources: [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md).

### A43. Vector-valued and uniform-scale expressions — 1/23

One-story proposed expression extension.

Sources: [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md).

### A44. Elliptical radial-gradient transforms — 1/23

One-story convenience; not pending.

Sources: [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md).

### A45. Animated effect parameters, especially blur — 1/23

Not pending; report defers it.

Sources: [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md).

### A46. Contact shadows and shadow conformance — 1/23

Existing schema/API, incomplete support claim.

Sources: [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md).

### A48. Compositing render-tree paint order — 1/23

Reported minimal reproduction plus matching current source; separate from proposed dynamic depth sorting.

Sources: [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md).

## Streaming findings: established mechanism versus unresolved failure

### What the source establishes

1. All 22 complete files inspected contain zero seal units and end in `complete;`. One additional story, Crane, is catalogued, but its 1.9 MB file returned empty content through the file API; it is excluded from this source-level statistic. Its retrospective is included in the thematic analysis.
2. The runtime starts with `sealedThroughMs = 0`, clamps evaluation to that frontier until completion, and excludes contributions starting exactly at an unsealed frontier. Static setup arriving while the clock remains at zero can therefore look like a partially assembled still. A parsed prefix is not the same thing as useful animated playback.
3. Complete top-level units are the parser’s commit boundaries. A large nested group is not executable child by child. `maxBufferedUnitBytes` is 131,072; the scan below estimates largest syntactic units including adjacent comments/whitespace. Exceeding it is a credible explanation for some failures, not a browser-reproduced diagnosis of every file.
   The Square Wave file contains an estimated 276,605-byte top-level unit, more than twice the configured 128 KiB buffered-unit ceiling. That makes a large-unit incompatibility concrete in the corpus; confirm its actual rejection boundary with the incremental compiler before assigning a browser incident to it.
4. After the first seal, `applyUnit` rejects new base nodes, constants, camera definitions, compositions, instances, timing scopes and operators. A small fixed cast can be predeclared, hidden and later animated. An open-ended educational conversation cannot rely on knowing every future object before first playback.
   The authoring design goals currently call streaming a delivery concern rather than the sole design objective, and the guide documents only small existing fixtures. They do not establish a large-story progressive-execution gate. Update authoring acceptance criteria to match the newly explicit product requirement, while preserving visual quality.
5. The Studio feeder is a simulation tied to UI ticks: 40 characters per setup tick and 24 per rest tick, with a deliberate 900 ms dwell at the first starvation point. It stops feeding during the initial play-to-frontier phase. At 60 ticks/s, idealised setup throughput is about 2,400 characters/s; 417 KB alone therefore takes about 174 seconds before compile/render overhead. That is not a model-throughput measurement. Long compilation on the same thread can reduce feeder throughput further.
6. The runtime delta surface is primarily create/add-track/add-step/seal/complete. It has revision fields, but it is not a general persistent-object editing API. Rejected delta diagnostics are accumulated privately and revision mismatches return silently in `enqueue`; consumer-facing rejection/status reporting needs review.

Sources: [packages/compiler/src/incremental.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/compiler/src/incremental.ts), [packages/compiler/src/compile.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/compiler/src/compile.ts), [packages/runtime/src/streaming.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/runtime/src/streaming.ts), [packages/runtime/src/playback.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/runtime/src/playback.ts), [app/playground/src/activities/workspace.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/app/playground/src/activities/workspace.ts), [packages/schema/src/limits.ts](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/schema/src/limits.ts).

### Required next experiments and contract decisions

- Rewrite one small, one medium and one large story into dependency-complete, time-local segments, keeping the visual requirements fixed. First test what is possible with the existing predeclared-cast contract. Adding seals blindly to the end of a monolithic setup will not solve startup latency.
- Build a source/stream linter: no early seal, late first seal, oversized unit, unresolved dependency, full-scene setup before useful content, and writes that would invalidate a sealed interval. Classify offline-valid and progressively playable independently.
- Benchmark true background feeding independently of requestAnimationFrame. Vary packet boundaries, throughput, jitter, truncation, errors, cancellation and resume. Compare offline versus streamed resolved state at the same revision/time, with actual rendered motion evidence.
- If later object creation is required, design explicit activation/revision boundaries that cannot change already presented history. Existing IDs and a seal timestamp alone are insufficient: a newly created node with a visible base could otherwise alter time zero.
- Record time to first accepted unit, first relevant visual, first meaningful motion, first seal, buffered duration, stalls and completion. A loading/system animation does not count as generated content.

### Source scan of complete retrieved programs

| Program | UTF-8 bytes | Top-level units | Largest unit bytes* | Seals | Complete at end |
| --- | ---: | ---: | ---: | ---: | --- |
| [a-circle-in-motion.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/a-circle-in-motion.ms) | 42,008 | 120 | 6,042 | 0 | Yes |
| [adding-two-vectors.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/adding-two-vectors.ms) | 19,873 | 74 | 3,286 | 0 | Yes |
| [clockwork.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/clockwork.ms) | 56,608 | 154 | 7,489 | 0 | Yes |
| [copperleaf-run.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/copperleaf-run.ms) | 187,137 | 209 | 21,863 | 0 | Yes |
| [counter.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/counter.ms) | 68,598 | 83 | 3,413 | 0 | Yes |
| [echo-canyon.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/echo-canyon.ms) | 125,073 | 166 | 5,812 | 0 | Yes |
| [from-blueprint-to-home.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/from-blueprint-to-home.ms) | 437,022 | 675 | 6,043 | 0 | Yes |
| [from-pixels-to-prediction.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/from-pixels-to-prediction.ms) | 107,977 | 308 | 16,456 | 0 | Yes |
| [inside-an-order-book.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/inside-an-order-book.ms) | 30,675 | 244 | 1,012 | 0 | Yes |
| [into-the-moons-shadow.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/into-the-moons-shadow.ms) | 114,075 | 66 | 10,314 | 0 | Yes |
| [motionscript-to-motion.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/motionscript-to-motion.ms) | 44,224 | 141 | 3,842 | 0 | Yes |
| [one-ball-four-worlds.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/one-ball-four-worlds.ms) | 331,499 | 115 | 69,080 | 0 | Yes |
| [packet-journey.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/packet-journey.ms) | 61,043 | 160 | 8,257 | 0 | Yes |
| [small-ideas-enormous-change.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/small-ideas-enormous-change.ms) | 35,859 | 110 | 4,731 | 0 | Yes |
| [square-wave-from-sine-waves.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/square-wave-from-sine-waves.ms) | 417,381 | 164 | 276,605 | 0 | Yes |
| [the-city-comes-around.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/the-city-comes-around.ms) | 232,949 | 353 | 8,502 | 0 | Yes |
| [the-last-streetlight.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/the-last-streetlight.ms) | 143,514 | 235 | 20,849 | 0 | Yes |
| [the-marble-machine.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/the-marble-machine.ms) | 48,476 | 96 | 15,960 | 0 | Yes |
| [threads-into-motion.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/threads-into-motion.ms) | 481,150 | 444 | 48,015 | 0 | Yes |
| [through-the-blue.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/through-the-blue.ms) | 58,840 | 138 | 6,291 | 0 | Yes |
| [through-the-mountain.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/through-the-mountain.ms) | 162,242 | 146 | 14,754 | 0 | Yes |
| [two-ways-through-a-binary-tree.ms](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/fixtures/motionscript/stories/two-ways-through-a-binary-tree.ms) | 63,110 | 168 | 28,688 | 0 | Yes |

*Structural scanner respects quoted strings and comments; sizes include trivia since the prior delimiter. This is a diagnostic estimate, not a replacement for the MotionScript lexer or a declaration that a particular mode must reject the file.*

## Persistent objects, edits and interactions: the shared architectural foundation

These are primarily product requirements from the user request and explicit future directions in the repository, not high-frequency validated story proposals. Their lack of story recurrence reflects the corpus’s finite-film scope. Frequency must not demote them below cosmetic changes.

The repository already has stable node IDs, hierarchy, tracks, resource identities, deterministic sampling and delta revisions. Static geometry is defined once; it is not generally re-encoded at every keyframe. The severe repetition is in baked morph/projection keys, repeated variants, non-drawable instance reuse, derived motion and state snapshots. The missing layer is a durable semantic scene model with independently addressable behaviours and safe revisions across turns.

For “remove the roof, add a pillar, keep the building rotating,” require: a building/roof/room identity graph; a named rotation behaviour; an atomic edit against an expected revision; explicit activation time; ownership rules that leave unrelated behaviours running; creation/deletion/reparent policy; and a compact context snapshot describing actual state and active behaviours. Hiding is not necessarily deletion, and editing an authored base must not silently rewrite the past.

Design the following together:

| Foundation | Required decisions | Consumer-facing outcome |
| --- | --- | --- |
| Persistent semantic entities | Stable IDs, labels/roles, local geometry, shared definitions, instances, lifetime and tombstones | A follow-up names the roof rather than rewriting an entire film |
| Transactional scene patches | Expected revision, validation, rollback, activation time, undo/redo, cancellation and replay | Local edits preserve unrelated activity and remain recoverable |
| Behaviours and channel ownership | Start/stop/pause/replace named actions; priorities/layers; finite and periodic scopes | A building can keep rotating while a roof is removed |
| Context/query service | Current revision/time, visible and occluded objects, transforms, semantic roles, active behaviours, resources and capabilities | The model receives concise scene context rather than the full source every turn |
| Input and hit testing | Screen/world/local mapping, geometric hits, clips, paint/depth order, pointer capture, hover/focus and target lifetime | Hover, click, drag, scroll, zoom and keyboard actions target the intended object |
| Event/state contract | Bounded engine-native actions, event ordering, state transitions, event logs and reproducible replay | Interactions can affect state without arbitrary generated JavaScript |
| Accessible host integration | Keyboard focus, semantic labels, alternatives to pointer gestures, reduced-motion/audio controls | The product remains usable beyond a canvas-only visual interaction |

Existing design guidance already calls persistent editing, context retrieval and event-driven applications future directions: [docs/languages/design-goals.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/languages/design-goals.md). This audit found no complete native scene interaction/state-machine implementation in the inspected grammar/runtime. Studio UI event handlers are not MotionScript scene interaction support.

## 3D and physics: separate capability tracks

There is strong evidence for spatial representation: Crane, Home and Echo carry private projection/depth systems; Threads needs surfaces/crossings; Marble uses a schematic bowl. This justifies a scoped graphics design now. It does not demonstrate that a full 3D physics engine is the smallest solution to all five.

Recommended split: (1) affine/skew/depth-aware 2D; (2) bounded 2.5D layers, dolly and planar hinges; (3) optional true 3D renderer with cameras, meshes, materials and depth; (4) an optional simulation profile. Keep a portable semantic boundary rather than putting backend-specific objects inside core Scene IR.

For 2D physics, define bodies/colliders, mass/materials, joints, forces and collision events; fixed time steps, deterministic seeds where applicable, checkpoints and replay; reconciliation with authored tracks and dragging; CPU/memory ceilings and cancellation. For 3D physics, retain the same lifecycle while making its representation and backend explicit. Do not promise cross-platform bitwise determinism without evidence. Seeking a simulation requires replay/checkpoints or baking; it cannot silently inherit the pure keyframe evaluator’s cost model.

The exact general physics requirement is new product scope. Counter supports IK/grounding/contact constraints; Marble explicitly recommends repairing its linkage with current geometry before using it as proof that physics is needed. Treat those as useful counterexamples, not vetoes on the user’s broader product direction.

## Broader repository backlog and support-status gaps

These are additional sources of work outside the story-frequency denominator. A registry entry can be schema-present and still lack production conformance.

| Capability | Compiler | Runtime | Renderer | Implication |
| --- | --- | --- | --- | --- |
| geometry.path | supported | supported | untested | Complete conformance/evidence before production claims |
| geometry.operators | supported | untested | untested | Complete conformance/evidence before production claims |
| geometry.roundedRect | untested | untested | untested | Complete conformance/evidence before production claims |
| paint.linearGradient | untested | not-applicable | untested | Complete conformance/evidence before production claims |
| paint.radialGradient | untested | not-applicable | untested | Complete conformance/evidence before production claims |
| resources.image | untested | untested | untested | Complete conformance/evidence before production claims |
| compositing.isolatedOpacity | untested | untested | untested | Complete conformance/evidence before production claims |
| compositing.blend | untested | untested | untested | Complete conformance/evidence before production claims |
| effects.shadow | untested | untested | untested | Complete conformance/evidence before production claims |
| render.tree | not-applicable | supported | untested | Complete conformance/evidence before production claims |
| compositing.matte | unsupported | unsupported | unsupported | New capability contract required |
| compositing.mask | unsupported | unsupported | unsupported | New capability contract required |
| transform.skew | unsupported | unsupported | unsupported | New capability contract required |
| transform.autoOrient | unsupported | unsupported | unsupported | New capability contract required |
| geometry.repeater | unsupported | unsupported | unsupported | New capability contract required |
| geometry.mergePaths | unsupported | unsupported | unsupported | New capability contract required |
| text.animators | unsupported | unsupported | unsupported | New capability contract required |

Registry source: [packages/schema/capabilities/registry.json](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/packages/schema/capabilities/registry.json). In particular, story programs using paths, gradients, images or isolated effects do not automatically close these registry coverage gaps.

Other recorded future work:

- **Spatial-Z compatibility audit:** optional third tangent components are accepted without an explicitly released/gated representation. Resolve before claiming 3D support. Both pending files repeat the same issue; count it once.
- **Animated solid fill:** existing draft only; stroke, text coverage and gradients need explicit decisions, rather than assuming the token covers all paint.
- **Lottie fidelity residuals:** incomplete latest captures and unreliable effect references; remaining contour discrepancies and animated-fill loss; changing morph topology, animated gradient stops, masks/mattes, skew, repeaters/merge paths and broader effect stacks. Some older gap documents are stale (for example animated trim is released). Read current registry/code and new evidence before reopening solved work.
- **SVG profile:** full style cascade, richer text/tspan/textPath, patterns/filters/gradient import, slice/clipping and indefinite-repeat semantics remain bounded or unsupported. Keep scripts/event attributes/foreignObject restrictions as a source security boundary; native interactions do not require executing imported scripts.
- **Fonts/images/resource lifecycle:** declared identities are present, but robust readiness/failure, decoding/cache/disposal, dimensions/decoded-memory limits, origin policy and export readiness need production verification. This is a shared dependency for sound, sprites and deterministic text.
- **Presentation/model integration:** the README still describes a stand-in Stage rather than a connected authoring model. Confirm implementation against a real provider and measure generation/repair, cancellation and stale-generation handling; no live model experiment was performed here.
- **Authoring evidence:** held-out prompt tests, generation success/repair, actual tokenizer counts and time-to-useful-output remain separate from hand-built file-size reductions. The authoring policies already require this distinction.
- **Documentation drift:** root README describes language 0.4.0 and an older evaluation; releases.json is 0.5.0. The evaluations index retains mixed continuation text. Keep one capability/release authority and refresh summaries.

Sources: [docs/languages/motionscript/versions/pending.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/languages/motionscript/versions/pending.md), [docs/languages/scene-ir/versions/pending.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/languages/scene-ir/versions/pending.md), [formats/lottie/unsupported.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/formats/lottie/unsupported.md), [formats/svg/unsupported.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/formats/svg/unsupported.md), [docs/evaluations/README.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/evaluations/README.md), [docs/evaluations/2026-10-09T115503Z/report.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/evaluations/2026-10-09T115503Z/report.md), [docs/authoring/evaluation-spec.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/evaluation-spec.md), [README.md](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/README.md).

## Performance evidence and measurement plan

Reported observations below come from different machines/runs; they are not a comparative benchmark or independently rerun measurements.

| Story | Reported measurement | Evidence strength |
| --- | --- | --- |
| [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md) | 60s Chromium / 94s Node compile; profile about 70% clone, 17% GC, 11% validation; 1.9 MB | Causal profile in retrospective; source confirms per-unit full clone/validation |
| [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md) | Approximately 6.4–6.9s compile for 108 KB | Measured cost; not an independent causal profile |
| [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md) | Roughly 90 ms evaluation/frame at 482 nodes; 7.8s of a 10s profile in indexNodes; about 9–10.5s compile | Profiled evaluation bottleneck; environment-specific |
| [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md) | 20–23 ms evaluation/frame at 249 nodes; around half profile in graph indexing; 1.6–1.9s Chromium compile | Profiled evaluation cost; no implemented saving yet |
| [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md) | 11.6–12.9 ms/frame at 173 nodes; graph.ts 67.7% self time | Profiled evaluation cost; no implemented saving yet |

Instrument parse/lex, unit lowering, validation, clone/rollback and queue work; sample/dependency/transform/geometry work; raster/compositing/offscreen allocations; resource readiness; transport and model generation; media scheduling; and interaction-to-presentation latency. Track p50/p95/p99 distributions, peaks and long runs, not isolated fastest frames. Include target hardware/browser/DPR, viewport, cold/warm state, program hash and active capability profile.

Track live/retained memory, garbage collection, caches, GPU/offscreen resources where observable, cancellation disposal, source/token growth and context payload size. Topology caches should invalidate on scene revisions; sampled transforms and mutable channels must not reuse stale values. Raising the 500-node cap before addressing measured quadratic work would disguise rather than resolve the constraint.

## Recommended delivery order and exit gates

| Stage | Deliverable | Exit evidence |
| --- | --- | --- |
| 0. Correctness and measurement | Clean check baseline; compositing order and trim/hold reproductions; capability/README reconciliation; source/resource telemetry | Minimal regressions pass, relevant visual checks pass, benchmark harness reproducible |
| 1. Useful streaming | Three complexity tiers rewritten/benchmarked; independent feeder; stream lints; cancellation/starvation/recovery; current-contract limits documented | Meaningful generated motion before completion; bounded stalls under declared throughput; offline/stream equivalence; oversized units fail clearly |
| 2. Durable scene contract | Entity/instance model, activation/revision patches, named behaviours, dependency ownership and input/event design | Roof/pillar/ongoing-rotation scenario and replay prototype; bounded query snapshot; no changes to sealed history |
| 3. Authoring capability slice | Drawable reuse, drivers/attachments, named/local times, paint/text updates, clipping and camera helpers | Fixed-quality reduction in source/repair effort; held-out tasks; expanded runtime and streaming budgets still pass |
| 4. Interactive/media slice | Hit testing, pointer/focus/keyboard handling, bounded state actions; narration/effect resources on one presentation clock | Drag/edit during ongoing behaviour; seek/pause/cancel/loop audio tests; accessible host controls |
| 5. Spatial/simulation slice | Selected 2.5D/3D representation and 2D physics profile, then scoped 3D physics | Crane/house/depth and collision/joint examples; replay/seek strategy; mixed authored/simulated channel ownership; resource limits |
| Continuous production work | Rendering/runtime throughput, memory, resource failures, browser/device coverage, recovery and generation evaluation | Published measured capability profiles; no unsupported universal claims |

Architecture for stages 2, 4 and 5 should begin early because interaction, simulation and persistent behaviours constrain the language contract. Implementation can remain bounded. Every structural proposal must include effects on executable unit size, first useful prefix, dependency availability, seal rules, cancellation, replay and memory—not just a shorter .ms example.

## Decisions to settle before language expansion

1. Is a program a finite film, a durable scene, or a scene revision? Support explicit profiles instead of making old films implicitly mutable.
2. Does a symbol expand at compile time or render through shared resources? How are instance IDs, parameters, overrides and budgets represented?
3. Can new nodes/resources appear after playback begins, and from what activation time? How are sealed-history guarantees preserved?
4. Who owns a channel when a timeline, interaction, driver and physics system all want to write it? How are conflicts diagnosed?
5. Is conversational context the authored source, current resolved scene, semantic scene summary, or a combination? Define revision/time provenance and query budgets.
6. Which clocks exist for authored time, presentation, audio and simulation? Define pause, seek, loop, live-input replay and interruption across them.
7. Which spatial features are 2D affine, 2.5D or full 3D? Keep their capability and backend contracts explicit.
8. Which guarantees are production release gates: supported registry targets, stream usefulness, target-device performance, memory, accessibility and recovery?

## Evidence appendix

Story aliases used above:

| Alias | Story | Proposal |
| --- | --- | --- |
| Crane | A Crane, Then a Square | [Crane](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-crane-then-a-square/proposal.md) |
| Circle | A Circle in Motion | [Circle](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/a-circle-in-motion/proposal.md) |
| Clock | Clockwork | [Clock](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/clockwork/proposal.md) |
| Packet | Packet Journey | [Packet](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/packet-journey/proposal.md) |
| Moon | Into the Moon’s Shadow | [Moon](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/into-the-moons-shadow/proposal.md) |
| Motion | From MotionScript to Motion | [Motion](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/motionscript-to-motion/proposal.md) |
| Copper | Copperleaf Run | [Copper](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/copperleaf/proposal.md) |
| Counter | Counter | [Counter](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/counter/proposal.md) |
| Echo | ECHO Canyon | [Echo](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/echo-canyon/proposal.md) |
| Home | From Blueprint to Home | [Home](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-blueprint-to-home/proposal.md) |
| Marble | The Marble Machine | [Marble](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-marble-machine/proposal.md) |
| Worlds | One Ball, Four Worlds | [Worlds](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/one-ball-four-worlds/proposal.md) |
| Pixels | From Pixels to Prediction | [Pixels](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/from-pixels-to-prediction/proposal.md) |
| Order | Inside an Order Book | [Order](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/inside-an-order-book/proposal.md) |
| Vectors | Adding Two Vectors | [Vectors](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/adding-two-vectors/proposal.md) |
| Square | Building a Square Wave from Sine Waves | [Square](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/square-wave-from-sine-waves/proposal.md) |
| Small | Small Ideas, Enormous Change | [Small](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/small-ideas-enormous-change/proposal.md) |
| Tree | Two Ways Through a Binary Tree | [Tree](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/two-ways-through-a-binary-tree/proposal.md) |
| Threads | Threads into Motion | [Threads](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/threads-into-motion/proposal.md) |
| Street | The Last Streetlight | [Street](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-last-streetlight/proposal.md) |
| City | The City Comes Around | [City](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/the-city-comes-around/proposal.md) |
| Mountain | Through the Mountain | [Mountain](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-mountain/proposal.md) |
| Blue | Through the Blue | [Blue](https://github.com/danielyekini/generative-visual-runtime/blob/80675916bc50ca6ec4f897ae9e718d24906151d2/docs/authoring/stories/through-the-blue/proposal.md) |

Frequency rows are backed by the explicit source lists above. The source scan uses actual retrieved program bytes; hashes and blob IDs are recorded below for auditability.

| Program | Git blob SHA | SHA-256 of retrieved UTF-8 |
| --- | --- | --- |
| a-circle-in-motion.ms | `ef1fb8945ffa32e2c75156e286cac723cc4a7266` | `ef60f52a5f32a386b64797ec01bdce9a4784a2ee0807d3bf959eaa972d72a537` |
| adding-two-vectors.ms | `16e453e79b6100845925942b84257685ff5a5e8d` | `2601487342974c9ef7ff071326f77e8add87d6a806618ea99b597b6894bf8c6d` |
| clockwork.ms | `481f0a78447695c2a1d8e0711d1f79bff6889125` | `55e82fd8db44b3d3a14a04788d80813105f30e9f9891b3b06ea77cb68892df31` |
| copperleaf-run.ms | `8dea34e597ad4aed8807acfbd8fa783ff04245d0` | `d8e97cf532072c786bb427d5fa06cfe52e6408f322fd373dae729047a41d2a8f` |
| counter.ms | `0755e80cd52644b4aa134077f9a73922a3fc43a8` | `3b81addee33e0382a04df5d943ee81b7998e1841ab65f7be03c106b7d658fdff` |
| echo-canyon.ms | `b19a69f60afe118e7d5fc7083d610a7e713d9cd0` | `c2299831f3c0a3e0915cb87a0eabd9d66f61311a94a385cec1caaa5bc3a02c32` |
| from-blueprint-to-home.ms | `bfd23e3ce74cf051490c17cd2b9efd31c83a71f7` | `0654c385882be6bf33469fc92167f2ef6634fd52ce7ec550eaec79659a268130` |
| from-pixels-to-prediction.ms | `df559a89a8b049b296405e450d3730246dd6e762` | `a7ae6b6d2b6c888a8f133f74d0e6d3eef46af909b044931178b19fb747b5c3dc` |
| inside-an-order-book.ms | `e23b7f6780cf09e8a55f4696c2952d711670b05d` | `ff54ec0c0dd060050103c3e5e9f9962e8e36764c9894d326b1db1621249563cb` |
| into-the-moons-shadow.ms | `52599beb5905230543aaf2cda2535277a6df20d5` | `c545a1714099b8307798a3f5536cd0f5f6142787c7064590758c084b50cbd476` |
| motionscript-to-motion.ms | `3445c1c78cffab5a6c808be8c90953b513a0d49f` | `5512024f9a88b30a422da3ca65bac70ef89551aa453c1dcb917f91dbcf10a333` |
| one-ball-four-worlds.ms | `214bb1929ee2885cb323c189357e9607910b60cf` | `aebdfdb14622f860578823c75141b9dccab87146a4a63cb0a22e915b5b90f642` |
| packet-journey.ms | `b856e3c9442856d0d5a25fd049b9943239816cd8` | `f6ba9d3f07e97d997710c0262a2453794e0d97123b3d104c28e448327a669c10` |
| small-ideas-enormous-change.ms | `9b7c93a5aaf00b4d36bd01d9e60dac66431907d2` | `9f7fc8f219c92c520e7ac3733332b1d7f9fbd2bdbbfcebf65075a2f1dbb3379c` |
| square-wave-from-sine-waves.ms | `d2932281c1cbcee0ec58ba09d8c80935f45e4266` | `d7df7f4030ba0db58510f47ada3107939bfefbaf7c9cf75648e79ee102e52a84` |
| the-city-comes-around.ms | `158b5f6ab034ae1aaa4a034b50e2704a05748d61` | `f43623cdc4a6ff95f66652446e0914c00c8f2be3d3d87497ef340b340aa80c72` |
| the-last-streetlight.ms | `e2811037a1e8af589cebf3457b42fb68c078b352` | `78d0ea063ab34ed76dc15ec87a3ab21ba10e561d3410fbaed9983d9e925d42c9` |
| the-marble-machine.ms | `90db26101860705079f06a020a73479b9249bf20` | `322d7fc7c35bc714f59c6c360ed824e162a4227b16fb028e2a0b5a5700407b28` |
| threads-into-motion.ms | `9d75d413fba11dbf11cde63f368415d52ab1b2a0` | `0865759daad061228c4027fab3f3310b58597806a05491a80c6292245309e702` |
| through-the-blue.ms | `1b638bc2437b93ad74ad036c8b28be0107095058` | `d0ace3c36663a1600f0b2774278e6a369d3d1e32996bfac66b39fa50a60d727a` |
| through-the-mountain.ms | `73ee617d301901ee76ef1de313f33995150aea04` | `018a6f8ccc1c468b326031cd3bf8cc7a786a9b74a82a24820ce8a9227996ae86` |
| two-ways-through-a-binary-tree.ms | `b115485bb5ff6ba4d7bdf7c6ed4054831bd00f60` | `16e2f80c90c390b66c9b40bd48f1d0dd35b3282530da7fcb8c7de0332514ede5` |

This report synthesises repository proposals and source inspection. Recommendations labelled as this audit’s design direction are not adopted MotionScript/GVR features. No modifications, releases, tickets, issues or pull requests were created.
