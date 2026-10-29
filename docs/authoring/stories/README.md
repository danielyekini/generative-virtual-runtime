# Story plates: briefs, programs and language proposals

Status: living index, revision 2.2, 2026-10-29.

Each story plate in [`fixtures/motionscript/stories/`](../../../fixtures/motionscript/stories/) began as a direction script or prompt. It was implemented as a TypeScript builder that emits a `.ms` program, and the implementation was followed by a retrospective that suggested changes to MotionScript and GVR. This folder keeps those three things together, one folder per story.

| File | Contents |
| --- | --- |
| `README.md` | Program and builder paths, SHA-256, line counts, playground id |
| `brief.md` | The direction script or prompt the program was built from, as supplied |
| `proposal.md` | The language proposal written after the implementation, as supplied |

Programs are not copied here. Each story README points at the fixture the playground loads and records its hash, so this folder cannot drift from the program it describes. If a program is regenerated, add its new hash below the old one rather than replacing it.

## What these proposals are

They are **retrospectives from one implementation each**, not proposals in the [language proposal template](../templates/language-proposal.md). None has been evaluated, adopted or released, and none changes the registry, a published version file or `pending.md`. Under the [evolution policy](../../languages/evolution-policy.md) they are recurrence evidence: a theme raised independently by several stories is stronger evidence than one raised once. Turning a theme into a real proposal means writing it up in the template, with conformance tests and a version note, before anything is claimed.

The From Pixels to Prediction proposal was written by the implementing agent directly into this folder rather than pasted from chat, and cites real-renderer stills and measurements. So was the Building a Square Wave from Sine Waves proposal, which also cites a CPU profile; its stills were not committed. The crane story's proposal is different: its implementation run was cut short, so it is a later review of the committed program, written by a different agent and based on re-running the builder, real-renderer stills and a compile profile.

The ECHO Canyon proposal was also written directly into this folder after implementation, with real-renderer contact sheets committed alongside it, a CPU profile, and a three-node reproduction of the runtime defect it reports.

The From Blueprint to Home proposal was written after implementation, runtime checks, 40 real CanvasRenderer stills and a base-commit comparison of failing checks. Its camera is a baked 2D projection, and its retrospective records that limit.

The Small Ideas, Enormous Change proposal was written into this folder by the implementing agent, with measurements and real-renderer stills; it was not pasted. The Through the Mountain retrospective was also written directly after implementation, with committed CanvasRenderer stills and base-commit check comparisons. The original remaining proposals' text was pasted from chat. Some tables were flattened into tab-separated lines and are kept as received. Claims about defects (for example the `sampleKeyframes` and `noteEase` findings in Adding Two Vectors) are as reported by that implementation and have not been re-verified here.

Some proposals describe limits that have since changed. The default duration budget was raised from 30s to 60s in commit `1f1e3de`, which resolves the "35 seconds was illegal" findings in Packet Journey and Clockwork.

The Marble Machine proposal was written after implementation, evaluated-output assertions and 36 real-renderer stills; it records schematic mechanical contacts and projected banking as explicit limitations. Its repository check failures also reproduce on its base commit.

## Stories

| Story | Duration | Brief | Proposal |
| --- | --- | --- | --- |
| [From Pixels to Prediction](from-pixels-to-prediction/) | 30s | Director script | Yes |
| [Building a Square Wave from Sine Waves](square-wave-from-sine-waves/) | 30s | Direction script | Yes |
| [Inside an Order Book](inside-an-order-book/) | 35s | Direction script | Yes |
| [Two Ways Through a Binary Tree](two-ways-through-a-binary-tree/) | 30s | Direction script | Yes |
| [From Blueprint to Home](from-blueprint-to-home/) | 30s | Direction script | Yes |
| [From MotionScript to Motion](motionscript-to-motion/) | 30s | Direction script | Yes |
| [Into the Moon’s Shadow](into-the-moons-shadow/) | 40s | Direction script | Yes |
| [Packet Journey](packet-journey/) | 35s | Direction script | Yes |
| [Adding Two Vectors](adding-two-vectors/) | 30s | Direction script | Yes |
| [Copperleaf Run](copperleaf/) | 30s | Direction script | Yes |
| [Clockwork](clockwork/) | 35s | Prompt | Yes |
| [Through the Blue](through-the-blue/) | 30s | Direction script | Yes |
| [Counter](counter/) | 30s | Direction script | Yes |
| [A Crane, Then a Square](a-crane-then-a-square/) | 35s | Direction script | Review of the unfinished program |
| [A Circle in Motion](a-circle-in-motion/) | 30s, looping | Direction script | Yes |
| [Small Ideas, Enormous Change](small-ideas-enormous-change/) | 20s | Direction script | Yes |
| [Through the Mountain](through-the-mountain/) | 30s | Director script | Yes |
| [The City Comes Around](the-city-comes-around/) | 30s, loop | Direction script | Yes |
| [ECHO Canyon](echo-canyon/) | 20s | Director script | Yes |
| [The Marble Machine](the-marble-machine/) | 35s | Direction script | Yes |
| [The Last Streetlight](the-last-streetlight/) | 25s | Director script | Yes |
| [Threads into Motion](threads-into-motion/) | 30s | Direction script | Yes |
| [One Ball, Four Worlds](one-ball-four-worlds/) | 30s | Director script | Yes |

## Recurring themes

**Hypothesis.** This is a reading of the proposals, not a measurement. "Raised" means the proposal identifies the problem; several stories raise a problem and then recommend against a language change for it, and that is noted.

| Theme | Raised by | Notes |
| --- | --- | --- |
| Expressions or tracks that read another channel (drivers, signals, point binding) | Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue, Circle, Mountain, Home, Pixels, Square wave, City, ECHO, Marble, Threads, Four Worlds | The most frequent theme. Blue identifies it and prefers sampling the runtime in the generator first. Circle has three couplings: rolling, rays on a morphing outline, spokes inside a growing hub. City repeats each walker's route timing in its stride expression. ECHO samples a floor shadow and a ring from its words, and reimplements easing to sample a product of two opacity curves. |
| Reserved keywords used as ids, with unhelpful diagnostics | Moon (`left`, `right`), Packet (`cap`), Clockwork (`path`, `overlay`, `center`), Copperleaf (`step`), MotionScript→Motion (`cap`), Circle (a `step` target without `.visible`), Home, ECHO (`top`), Four Worlds | Diagnostic fix, no language change. Circle's case is not a keyword: the message does not say to append `.visible`. ECHO used `top` as an id and got "rectangle needs a name". |
| Drawable instances or parameterised symbols | Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Binary Tree, Mountain, Home, Pixels, Square wave, City, ECHO, Streetlight | Instances are stored and not drawn today. Pixels frames its need (one declaration per layer) as data-driven repetition, which needs a design decision. Blue and Copperleaf caution that one film is not enough evidence. Mountain reuses one train hierarchy across cuts and treats that as a counterexample to needing new instance semantics for shot reuse. City repeats an 880-unit district three times by hand (387 of 482 nodes); `geometry.repeater` is pending. ECHO draws the same four-letter word 17 times (26.8 KB, 21% of its program). |
| Animated colour (fill, and stroke) | Moon, Packet (stroke), Vectors, Counter, MotionScript→Motion, Small Ideas (stroke width and colour), Binary Tree, Mountain, Home, Pixels (fill, stroke and text fill), Square wave (text fill), City, Streetlight, Four Worlds | Pixels spends 50 of 390 nodes on opacity overlays that stand in for activation colour. `paint.animatedSolidFill` is drafted in `pending.md`; it excludes stroke. Small Ideas fakes a weight change with a duplicate wider stroke. |
| Camera fit or aim | Moon, Packet, Clockwork, MotionScript→Motion, Small Ideas, Circle, Mountain, Home, Pixels, ECHO (depth), Marble, Threads, Streetlight, Four Worlds | Blue suggests first measuring a vec2 spatial camera track against dense keys. Small Ideas computes its framings from bounds in the builder. Circle's follow camera is 16 sampled keys and was found too loose only in a still. |
| Keyframe time in seconds, or named times | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas, Binary Tree, Order Book, Mountain, Home, Pixels, Square wave, Marble, Threads, Streetlight, Four Worlds | Copperleaf recommends against for its own case: hold-per-step keeps its pixel grid. |
| Text that changes, wraps or can be measured | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas (per-glyph nodes, outlines and advances), Home, Pixels, Square wave, ECHO (condensed face, per-letter squeeze, outlines), Streetlight | `text.animators` is pending. Small Ideas draws its own 17-glyph stroked face because a `text` node cannot be split into letters. ECHO draws its own bold condensed outlines for the same reason and because no condensed face exists. |
| Two writers on one channel (event over state, additive) | Packet, Blue, MotionScript→Motion, Square wave | Blue asks only for a diagnostic hint that nested groups multiply. Square wave asks for a hint when a track silently replaces an authored transform value. |
| Affine floor labels and projected text | Home, City, ECHO (squash along a travel direction) | Compression-only text is an approximation; try current-language outlines first. `transform.skew` is pending. City shears façade text with nested rotation and scale (an SVD), two groups per sign. ECHO compresses each word along its travel direction with rotate–scale–rotate, six groups per word, which takes depth to 9. |
| Labels that stay a constant pixel size on a world point | Moon, Packet, Clockwork | |
| Dash pattern on a stroke | Packet, Vectors, Clockwork, Home, Square wave | |
| Masks, mattes or clipping | Moon, Circle, Mountain, Pixels, Square wave, Marble, Streetlight, Four Worlds | Pixels would use one for the grid reveal and the neuron spotlight. Blue says its frond does not need one. Circle hides the sun behind the horizon with a background-coloured plate. `compositing.mask` and `.matte` are pending. Mountain uses foreground terrain and dark opening plates for progressive tunnel occlusion. Square wave avoids a clip by plotting its inset curve only over the inset domain, at the cost of a second 34 KB morph track. |
| Progress along a path, or end markers | Packet, Vectors, MotionScript→Motion, Binary Tree, Pixels, Marble, Threads | Relates to pending `transform.autoOrient`. |
| Node, duration, step and source budgets | Packet, Clockwork, Copperleaf, MotionScript→Motion, Crane, Binary Tree, Order Book, Mountain, Home, Pixels, Square wave, City, Threads, Streetlight, Four Worlds | Pixels uses 390 of 500 nodes, 280 tracks and 108 KB. Duration resolved by `1f1e3de`. Copperleaf asks for a profile of the 500-node cap before any change. Crane is 3.7× the 512 KiB source budget, which the compiler does not enforce, and uses 676 of 1,000 steps. Square wave is at 79.6% of the source budget, 66% of it one path-morph track. City uses 482 of 500 nodes and 9,427 of 10,000 geometry items; each fill colour costs a node. |
| Diagnostics that cascade after a rolled-back unit | Copperleaf, MotionScript→Motion, Mountain, Pixels, City, Streetlight, Four Worlds | Diagnostic fix. In Pixels one comma in `cubic` rolled back a whole group and produced about 60 `UNKNOWN_TARGET` lines; the parse errors themselves are located. In City a node-budget rejection was followed by about 40 `UNKNOWN_TARGET` lines. |
| Audio or cue markers | Every story notes the absence, including Binary Tree, Order Book and Home; City needs cues that repeat with a loop; ECHO's subject is sound, and stands in thin arcs, ripples and a static blur; Marble, Threads, Streetlight and Four Worlds also discuss cue/host workarounds | Moon and MotionScript→Motion suggest metadata cues; Vectors a clocked event channel later; Copperleaf and Blue recommend not adding audio. |
| Shared builder tooling (runtime sampling, real-viewport preview, shared helpers) | Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas, Circle, Binary Tree, Order Book, Mountain, Home, Pixels, Square wave, City, ECHO, Marble, Threads, Streetlight, Four Worlds | Tooling, no language change. Pixels' builder writes PNG stills through `CanvasRenderer` in headless Chromium; its checks still missed label overlaps that the stills showed. Crane's builder checked the model, not the drawn mark, and missed that the mark was never drawn. Small Ideas' seams and a mid-move framing error showed only in real `CanvasRenderer` stills or an interval sweep, not in checks at named times. Circle adds a loop-boundary check and a stroke-aware on-screen check. City's draw-item checks passed while the rendered loop seam differed in 18,896 pixels; only a real-renderer diff found it. ECHO's draw-item checks passed while the real render showed only the farthest rock fin (see the paint-order theme); its builder now compares render-tree order with draw-item order. |
| Dynamic paint order | Counter, Crane, Home, City, ECHO, Threads | `zIndex` is static. Crane duplicates every face into two paint-order banks. City's isometric layers needed a duplicated van, hidden route legs and height caps. ECHO's words cross nine depth layers, and static order works only because the geometry keeps every word clear of nearer rock. |
| 3D-ish subjects: two-sided panels, hinge rotations | Crane, Home, ECHO (perspective depth), Threads | Two-sided paint by matrix determinant is the smallest step; hinge transforms need a design decision. |
| Compiler performance on long generated programs | Crane, Mountain, Home, Pixels, Square wave, City, Threads, Streetlight, Four Worlds | Pixels measures 6.4–6.9s for 108 KB, about 21 ms per track unit against a fixed 390-node scene. Crane reports per-unit `structuredClone` plus full validation is quadratic; its 1.9 MB programme takes about 60–90s to compile. Mountain measures 3.314s for 162,242 bytes in one run and calls for profiling; it does not verify that root cause. Square wave (417 KB) takes about 2.8s in Node and 1.6–1.9s in Chromium. City (233 KB) takes 9–10.5s. |
| Hairline seams where separately drawn shapes meet | Crane, Small Ideas | Each draw item is anti-aliased alone. Crane strokes every triangle; Small Ideas merges strokes into one path per letter and overlaps joins. Relates to unsupported `geometry.mergePaths`. |
| Plotted functions: curves defined by y = f(x) or weighted sums of terms | Square wave | Path morph of identically sampled sums is exact for linear blends but costs one full path literal per key. Pairs with the driver theme; a Σ over k would be a loop. |
| Per-frame evaluation cost | Square wave, City, ECHO | Runtime, no language change. `graph.ts` rebuilds the node index per draw item; 249 nodes cost 20–23 ms per frame in Node. City: about 90 ms per frame at 482 nodes, 7.8s of a 10s profile in `indexNodes`. ECHO: 11.6–12.9 ms per frame at 173 nodes, 67.7% self time in `graph.ts`. |
| Cyclic angles and scale through zero | Counter, Clockwork (angles in expressions), City (vehicles turn by `scale.x` through zero) | |
| Trim on a compound path bridges its subpaths | Pixels, Square wave | `trimCommands` joins subpaths into one polyline, so even `trim 0, 1, 0` draws the jumps. A discrepancy in supported semantics, and possibly in the Lottie `exact` trim claim (hypothesis); route to the fidelity loop. Square wave confirmed it directly (`M0 L10 M20 L30` trims to `M0 L10 L20 L30`) and reveals its dashed target with a wipe instead. |
| Animated stroke width | Small Ideas (listed under animated colour), Circle, Threads, Streetlight, Four Worlds | Hands cannot thin into spokes; the tyre is a filled ring. Small Ideas fakes a weight change with a duplicate wider stroke. Not pending. |
| Seamless loops: segments that wrap past the end | Circle, City | A fall spans 28s → 1.5s; the boundary easing was derived by hand. Changes sampling rules, so it needs a design decision. City writes 176 expression tracks as clamp sums of `(t + phase) % period` and asks for cyclic tracks or a wrapping timing scope. |
| One contour through many forms (morph topology, rotation) | Circle, Threads, Four Worlds | All 15 keys of one path share a command sequence; a half turn cannot be a morph, so it borrows a group rotation. Rotation-aware morph needs a design decision. |
| Coordinating algorithm state, return highlights and first-visit records | Binary Tree | Nine independent rendered-text checkpoints distinguish first visits from stack returns. Complete structure snapshots are an implementation choice; token reuse is an untested current-language alternative. |
| Shared transforms and attached annotations | Order Book, Binary Tree (TOP marker) | Prefer parent/local-space coupling; a larger camera or component rewrite remains a hypothesis. |
| Numeric text and duplicated states | Order Book, Binary Tree (structure snapshots) | Numeric formatting is distinct from pending per-character animators. Binary Tree first proposes reusing static letter tokens with existing tracks. |
| Verification baselines and provenance | Order Book, Binary Tree, Streetlight, Four Worlds | Retain actual Canvas evidence and hash-associated program/builder records; reproduce repository failures on the base. |
| Generated repetition versus new execution models | Order Book, Binary Tree, ECHO (six identical word structures), Streetlight, Four Worlds | Host builders already expand repetition. Test current constructs before adding syntax; loops/functions require an execution-model design decision. |
| Paint order changes when a compositing group exists | ECHO | Runtime defect in supported semantics. With any `blur`, `isolated` or `blend` group, `renderTreeFromScene` orders by declaration, not `zIndex`, and `CanvasRenderer` draws that tree. Reproduced with three nodes. Through the Blue and Square wave are unaffected because they declare nodes in paint order. Route to the conformance and fidelity process. |
| Layer depth and a dolly camera (parallax) | ECHO | The 2D camera cannot push into a scene. ECHO bakes a dolly into 18 expression tracks on nine depth fins and samples 769 keys of word motion from a 3D model. Home's baked projection is related. A new projection or sampling rule needs a design decision. |
| Gradient shape | ECHO | Radial gradients are circular in local space; an elliptical glow needs a scaled round ellipse. Not pending. |
| Per-frame graph indexing and inherited-transform cost | Streetlight, Four Worlds | Static city geometry batching coincided with lower evaluation times; runtime source inspection suggests repeated index construction. Causal profiling remains a hypothesis; no runtime changes or budget increases. |
| Mixed-media sweeps, pixel contours and material textures | Four Worlds | Four spatial banks replace masks; same-paint compaction and collinear removal stay within geometry budgets. A topology-matched ball morph is an untested existing-language alternative to its opacity overlap. |

Every proposal that mentions general loops or functions defers them: [AGENTS.md](../../../AGENTS.md) requires a design decision for a new execution model.

## Adding a story

Create `docs/authoring/stories/<playground-id>/` with the three files above. Store the brief and proposal as supplied, record the program and builder hashes, add a row to the stories table, and add the story to any theme it raises.

## Change log

- 1.0: Initial index of nine story plates. Briefs and proposals for eight; the crane story's are missing.
- 1.1: Added the crane brief and a review-based proposal; added the paint-order, 3D-panel and compiler-performance themes.
- 1.2: Added Small Ideas, Enormous Change (brief, program record and proposal); added it to the animated-colour, camera, seconds, text and tooling themes; added the seams theme.
- 1.3: Added A Circle in Motion; added it to the driver, diagnostic, camera, mask and tooling themes; added the stroke-width (also raised by Small Ideas), seamless-loop and morph-topology themes.
- 1.4: Added Two Ways Through a Binary Tree with measured budgets, base-failure checks and 37 real-renderer stills; added it to diagnostic, symbols, animated-colour, named-time, path-progress, budget, audio and tooling themes; added the algorithm-state coordination theme.
- 1.5: Reconcile the concurrent Inside an Order Book addition on `work` with the existing main-branch story catalog; retain both playground presets and all records, add Order Book to timing, budget, audio and tooling themes, and preserve its shared-transform, text, provenance and execution-model observations here. Its independently created index revisions 1.0–1.1 remain in merge history; this unified index continues the main-branch revision sequence.
- 1.6: Added Through the Mountain with the supplied brief, generated programme, real CanvasRenderer stills, base-check comparisons and an unevaluated retrospective; added it to the driver, instances (counterexample), colour, camera, seconds, masks, budget, diagnostic, tooling and compile-profiling themes. Retained concurrent Binary Tree and Order Book records and themes.
- 1.7: Added From Blueprint to Home with measured runtime checks, 40 CanvasRenderer frames and base-check comparisons; added it to projection/driver, diagnostic, instances, colour, camera, timing, text, dash, budget, tooling, paint-order, 3D and compile-cost themes; added affine floor labels. Reconciled concurrent `work` catalog changes while preserving Binary Tree, Order Book and Mountain records. The independent Home revision 1.4 remains in branch history.
- 1.8: Added From Pixels to Prediction (brief, program record and proposal; written as revision 1.2 on a branch concurrent with 1.2–1.7, which remains in merge history); added it to the driver, instances, colour, camera, seconds, text, mask, path-progress, budget, diagnostic, tooling and compile-cost themes; added the compound-path trim theme.
- 1.9: Added Building a Square Wave from Sine Waves; added it to the driver, instances, colour, seconds, text, two-writer, dash, mask, budget, tooling, compile-cost and compound-path-trim themes; added the plotted-function and per-frame-cost themes. Its independent revisions 1.2 and 1.8 remain in branch history.
- 2.0: Added The City Comes Around (brief, program, builder and proposal; written as revision 1.2 on a branch concurrent with 1.2–1.9, which remains in branch history); added it to the driver, instances, colour, projected-text, budget, diagnostic, audio, tooling, paint-order, compile-cost, per-frame-cost, cyclic-angle and seamless-loop themes.
- 2.1: Added ECHO Canyon (brief, program, builder, real-renderer contact sheets and proposal). Added it to the driver, diagnostic, instance, camera, text, projected-text, audio, tooling, paint-order, 3D, per-frame-cost and repetition themes. Added three themes: paint order under compositing, layer depth and dolly camera, and gradient shape.

- 2.2: Reconciled ECHO Canyon and all work-branch stories after main advanced during PR #9 conflict verification. Preserved all presets, story records, theme evidence and both independent histories.

### Concurrent work-branch history

- 2.1: Reconciled main and work story catalogs for PR #9. Preserved Pixels, Square Wave and City alongside Marble Machine, Threads into Motion, Last Streetlight and One Ball, Four Worlds, including all recurring-theme evidence and playground presets. The independent work-branch history is retained below.
- 1.8: Added The Marble Machine, its generated program record, evaluated-output checks and real CanvasRenderer evidence; added recurrence to driver, camera, named-time, mask, path-progress, audio and shared-tooling themes. Preserved concurrent story catalog additions. The retrospective records remaining schematic contacts and base-reproduced check failures.
- 1.9: Added Threads into Motion with 35 inspected CanvasRenderer captures, draw-item checks, baseline failure comparisons and an unevaluated retrospective; added recurrence for attachment, camera, timing, budgets, tooling, paint order, two-sided surfaces, compiler cost, width and morph topology. Preserved all concurrent story records and presets; the independent Threads revision 1.4 remains in merge history.
- 1.10: Added The Last Streetlight with 35 CanvasRenderer beat stills, a synchronized synthesized-sound movie, playground evidence, measured budgets and base-check comparisons; added it to camera, timing, typography, masks, paint, repetition, diagnostics, audio and verification themes. Added the per-frame graph-work hypothesis, keeping it separate from compile-cost evidence. Preserved the concurrent Marble Machine and Threads into Motion catalog and evidence.
- 1.11: Added One Ball, Four Worlds with a complete 30-second preset, 49 CanvasRenderer stills, 1,801 rendered-frame checks, measured resource workarounds, a separate synthesized-audio player, base-check comparisons and an unevaluated retrospective; added its driver, diagnostic, colour, camera, timing, mask, budget, tooling, performance, morph, provenance and execution-model evidence, plus the mixed-media theme. Preserved concurrent Marble Machine, Threads into Motion and Last Streetlight presets, story records and theme evidence; the independent Four Worlds revision 1.8 remains in merge history.
