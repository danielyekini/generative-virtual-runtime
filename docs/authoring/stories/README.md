# Story plates: briefs, programs and language proposals

Status: living index, revision 1.7, 2026-10-29.

Each story plate in [`fixtures/motionscript/stories/`](../../../fixtures/motionscript/stories/) began as a direction script or prompt. It was implemented as a TypeScript builder that emits a `.ms` program, and the implementation was followed by a retrospective that suggested changes to MotionScript and GVR. This folder keeps those three things together, one folder per story.

| File | Contents |
| --- | --- |
| `README.md` | Program and builder paths, SHA-256, line counts, playground id |
| `brief.md` | The direction script or prompt the program was built from, as supplied |
| `proposal.md` | The language proposal written after the implementation, as supplied |

Programs are not copied here. Each story README points at the fixture the playground loads and records its hash, so this folder cannot drift from the program it describes. If a program is regenerated, add its new hash below the old one rather than replacing it.

## What these proposals are

They are **retrospectives from one implementation each**, not proposals in the [language proposal template](../templates/language-proposal.md). None has been evaluated, adopted or released, and none changes the registry, a published version file or `pending.md`. Under the [evolution policy](../../languages/evolution-policy.md) they are recurrence evidence: a theme raised independently by several stories is stronger evidence than one raised once. Turning a theme into a real proposal means writing it up in the template, with conformance tests and a version note, before anything is claimed.

The crane story's proposal is different: its implementation run was cut short, so it is a later review of the committed program, written by a different agent and based on re-running the builder, real-renderer stills and a compile profile.

The From Blueprint to Home proposal was written after implementation, runtime checks, 40 real CanvasRenderer stills and a base-commit comparison of failing checks. Its camera is a baked 2D projection, and its retrospective records that limit.

The Small Ideas, Enormous Change proposal was written into this folder by the implementing agent, with measurements and real-renderer stills; it was not pasted. The Through the Mountain retrospective was also written directly after implementation, with committed CanvasRenderer stills and base-commit check comparisons. The original remaining proposals' text was pasted from chat. Some tables were flattened into tab-separated lines and are kept as received. Claims about defects (for example the `sampleKeyframes` and `noteEase` findings in Adding Two Vectors) are as reported by that implementation and have not been re-verified here.

Some proposals describe limits that have since changed. The default duration budget was raised from 30s to 60s in commit `1f1e3de`, which resolves the "35 seconds was illegal" findings in Packet Journey and Clockwork.

## Stories

| Story | Duration | Brief | Proposal |
| --- | --- | --- | --- |
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

## Recurring themes

**Hypothesis.** This is a reading of the proposals, not a measurement. "Raised" means the proposal identifies the problem; several stories raise a problem and then recommend against a language change for it, and that is noted.

| Theme | Raised by | Notes |
| --- | --- | --- |
| Expressions or tracks that read another channel (drivers, signals, point binding) | Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue, Circle, Mountain, Home | The most frequent theme. Blue identifies it and prefers sampling the runtime in the generator first. Circle has three couplings: rolling, rays on a morphing outline, spokes inside a growing hub. |
| Reserved keywords used as ids, with unhelpful diagnostics | Moon (`left`, `right`), Packet (`cap`), Clockwork (`path`, `overlay`, `center`), Copperleaf (`step`), MotionScript→Motion (`cap`), Circle (a `step` target without `.visible`), Home | Diagnostic fix, no language change. Circle's case is not a keyword: the message does not say to append `.visible`. |
| Drawable instances or parameterised symbols | Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Binary Tree, Mountain, Home | Instances are stored and not drawn today. Blue and Copperleaf caution that one film is not enough evidence. Mountain reuses one train hierarchy across cuts and treats that as a counterexample to needing new instance semantics for shot reuse. |
| Animated colour (fill, and stroke) | Moon, Packet (stroke), Vectors, Counter, MotionScript→Motion, Small Ideas (stroke width and colour), Binary Tree, Mountain, Home | `paint.animatedSolidFill` is drafted in `pending.md`; it excludes stroke. Small Ideas fakes a weight change with a duplicate wider stroke. |
| Camera fit or aim | Moon, Packet, Clockwork, MotionScript→Motion, Small Ideas, Circle, Mountain, Home | Blue suggests first measuring a vec2 spatial camera track against dense keys. Small Ideas computes its framings from bounds in the builder. Circle's follow camera is 16 sampled keys and was found too loose only in a still. |
| Keyframe time in seconds, or named times | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas, Binary Tree, Order Book, Mountain, Home | Copperleaf recommends against for its own case: hold-per-step keeps its pixel grid. |
| Text that changes, wraps or can be measured | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas (per-glyph nodes, outlines and advances), Home | `text.animators` is pending. Small Ideas draws its own 17-glyph stroked face because a `text` node cannot be split into letters. |
| Two writers on one channel (event over state, additive) | Packet, Blue, MotionScript→Motion | Blue asks only for a diagnostic hint that nested groups multiply. |
| Affine floor labels and projected text | Home | Compression-only text is an approximation; try current-language outlines first. `transform.skew` is pending. |
| Labels that stay a constant pixel size on a world point | Moon, Packet, Clockwork | |
| Dash pattern on a stroke | Packet, Vectors, Clockwork, Home | |
| Masks, mattes or clipping | Moon, Circle, Mountain | Blue says its frond does not need one. Circle hides the sun behind the horizon with a background-coloured plate. `compositing.mask` and `.matte` are pending. Mountain uses foreground terrain and dark opening plates for progressive tunnel occlusion. |
| Progress along a path, or end markers | Packet, Vectors, MotionScript→Motion, Binary Tree | Relates to pending `transform.autoOrient`. |
| Node, duration, step and source budgets | Packet, Clockwork, Copperleaf, MotionScript→Motion, Crane, Binary Tree, Order Book, Mountain, Home | Duration resolved by `1f1e3de`. Copperleaf asks for a profile of the 500-node cap before any change. Crane is 3.7× the 512 KiB source budget, which the compiler does not enforce, and uses 676 of 1,000 steps. |
| Diagnostics that cascade after a rolled-back unit | Copperleaf, MotionScript→Motion, Mountain | Diagnostic fix. |
| Audio or cue markers | Every story notes the absence, including Binary Tree, Order Book and Home | Moon and MotionScript→Motion suggest metadata cues; Vectors a clocked event channel later; Copperleaf and Blue recommend not adding audio. |
| Shared builder tooling (runtime sampling, real-viewport preview, shared helpers) | Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas, Circle, Binary Tree, Order Book, Mountain, Home | Tooling, no language change. Crane's builder checked the model, not the drawn mark, and missed that the mark was never drawn. Small Ideas' seams and a mid-move framing error showed only in real `CanvasRenderer` stills or an interval sweep, not in checks at named times. Circle adds a loop-boundary check and a stroke-aware on-screen check. |
| Dynamic paint order | Counter, Crane, Home | `zIndex` is static. Crane duplicates every face into two paint-order banks. |
| 3D-ish subjects: two-sided panels, hinge rotations | Crane, Home | Two-sided paint by matrix determinant is the smallest step; hinge transforms need a design decision. |
| Compiler performance on long generated programs | Crane, Mountain, Home | Crane reports per-unit `structuredClone` plus full validation is quadratic; its 1.9 MB programme takes about 60–90s to compile. Mountain measures 3.314s for 162,242 bytes in one run and calls for profiling; it does not verify that root cause. |
| Hairline seams where separately drawn shapes meet | Crane, Small Ideas | Each draw item is anti-aliased alone. Crane strokes every triangle; Small Ideas merges strokes into one path per letter and overlaps joins. Relates to unsupported `geometry.mergePaths`. |
| Cyclic angles and scale through zero | Counter, Clockwork (angles in expressions) | |
| Animated stroke width | Small Ideas (listed under animated colour), Circle | Hands cannot thin into spokes; the tyre is a filled ring. Small Ideas fakes a weight change with a duplicate wider stroke. Not pending. |
| Seamless loops: segments that wrap past the end | Circle | A fall spans 28s → 1.5s; the boundary easing was derived by hand. Changes sampling rules, so it needs a design decision. |
| One contour through many forms (morph topology, rotation) | Circle | All 15 keys of one path share a command sequence; a half turn cannot be a morph, so it borrows a group rotation. Rotation-aware morph needs a design decision. |
| Coordinating algorithm state, return highlights and first-visit records | Binary Tree | Nine independent rendered-text checkpoints distinguish first visits from stack returns. Complete structure snapshots are an implementation choice; token reuse is an untested current-language alternative. |
| Shared transforms and attached annotations | Order Book, Binary Tree (TOP marker) | Prefer parent/local-space coupling; a larger camera or component rewrite remains a hypothesis. |
| Numeric text and duplicated states | Order Book, Binary Tree (structure snapshots) | Numeric formatting is distinct from pending per-character animators. Binary Tree first proposes reusing static letter tokens with existing tracks. |
| Verification baselines and provenance | Order Book, Binary Tree | Retain actual Canvas evidence and hash-associated program/builder records; reproduce repository failures on the base. |
| Generated repetition versus new execution models | Order Book, Binary Tree | Host builders already expand repetition. Test current constructs before adding syntax; loops/functions require an execution-model design decision. |

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
