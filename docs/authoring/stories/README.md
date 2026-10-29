# Story plates: briefs, programs and language proposals

Status: living index, revision 1.2, 2026-10-29.

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

The other proposals' text was pasted from chat. Some tables were flattened into tab-separated lines and are kept as received. Claims about defects (for example the `sampleKeyframes` and `noteEase` findings in Adding Two Vectors) are as reported by that implementation and have not been re-verified here.

Some proposals describe limits that have since changed. The default duration budget was raised from 30s to 60s in commit `1f1e3de`, which resolves the "35 seconds was illegal" findings in Packet Journey and Clockwork.

## Stories

| Story | Duration | Brief | Proposal |
| --- | --- | --- | --- |
| [From MotionScript to Motion](motionscript-to-motion/) | 30s | Direction script | Yes |
| [Into the Moon’s Shadow](into-the-moons-shadow/) | 40s | Direction script | Yes |
| [Packet Journey](packet-journey/) | 35s | Direction script | Yes |
| [Adding Two Vectors](adding-two-vectors/) | 30s | Direction script | Yes |
| [Copperleaf Run](copperleaf/) | 30s | Direction script | Yes |
| [Clockwork](clockwork/) | 35s | Prompt | Yes |
| [Through the Blue](through-the-blue/) | 30s | Direction script | Yes |
| [Counter](counter/) | 30s | Direction script | Yes |
| [A Crane, Then a Square](a-crane-then-a-square/) | 35s | Direction script | Review of the unfinished program |
| [The City Comes Around](the-city-comes-around/) | 30s, loop | Direction script | Yes |

## Recurring themes

**Hypothesis.** This is a reading of the proposals, not a measurement. "Raised" means the proposal identifies the problem; several stories raise a problem and then recommend against a language change for it, and that is noted.

| Theme | Raised by | Notes |
| --- | --- | --- |
| Expressions or tracks that read another channel (drivers, signals, point binding) | Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue, City | The most frequent theme. Blue identifies it and prefers sampling the runtime in the generator first. |
| Reserved keywords used as ids, with unhelpful diagnostics | Moon (`left`, `right`), Packet (`cap`), Clockwork (`path`, `overlay`, `center`), Copperleaf (`step`), MotionScript→Motion (`cap`) | Diagnostic fix, no language change. |
| Drawable instances or parameterised symbols | Packet, Vectors, Clockwork, Counter, MotionScript→Motion, City | Instances are stored and not drawn today. Blue and Copperleaf caution that one film is not enough evidence. City repeats an 880-unit district three times by hand (387 of 482 nodes); `geometry.repeater` is pending. |
| Animated colour (fill, and stroke) | Moon, Packet (stroke), Vectors, Counter, MotionScript→Motion, City | `paint.animatedSolidFill` is drafted in `pending.md`; it excludes stroke. |
| Camera fit or aim | Moon, Packet, Clockwork, MotionScript→Motion | Blue suggests first measuring a vec2 spatial camera track against dense keys. |
| Keyframe time in seconds, or named times | Packet, Vectors, Counter, MotionScript→Motion | Copperleaf recommends against for its own case: hold-per-step keeps its pixel grid. |
| Text that changes, wraps or can be measured | Packet, Vectors, Counter, MotionScript→Motion | `text.animators` is pending. |
| Two writers on one channel (event over state, additive) | Packet, Blue, MotionScript→Motion | Blue asks only for a diagnostic hint that nested groups multiply. |
| Labels that stay a constant pixel size on a world point | Moon, Packet, Clockwork | |
| Dash pattern on a stroke | Packet, Vectors, Clockwork | |
| Masks, mattes or clipping | Moon | Blue says its frond does not need one. `compositing.mask` and `.matte` are pending. |
| Progress along a path, or end markers | Packet, Vectors, MotionScript→Motion | Relates to pending `transform.autoOrient`. |
| Node, duration, step and source budgets | Packet, Clockwork, Copperleaf, MotionScript→Motion, Crane, City | Duration resolved by `1f1e3de`. Copperleaf asks for a profile of the 500-node cap before any change. Crane is 3.7× the 512 KiB source budget, which the compiler does not enforce, and uses 676 of 1,000 steps. City uses 482 of 500 nodes and 9,427 of 10,000 geometry items; each fill colour costs a node. |
| Diagnostics that cascade after a rolled-back unit | Copperleaf, MotionScript→Motion, City | Diagnostic fix. |
| Audio or cue markers | Every story notes the absence; City needs cues that repeat with a loop | Moon and MotionScript→Motion suggest metadata cues; Vectors a clocked event channel later; Copperleaf and Blue recommend not adding audio. |
| Shared builder tooling (runtime sampling, real-viewport preview, shared helpers) | Blue, Clockwork, MotionScript→Motion, Crane, City | Tooling, no language change. Crane's builder checked the model, not the drawn mark, and missed that the mark was never drawn. City's draw-item checks passed while the rendered loop seam differed in 18,896 pixels; only a real-renderer diff found it. |
| Dynamic paint order | Counter, Crane, City | `zIndex` is static. Crane duplicates every face into two paint-order banks. City's isometric layers needed a duplicated van, hidden route legs and height caps. |
| 3D-ish subjects: two-sided panels, hinge rotations | Crane | Two-sided paint by matrix determinant is the smallest step; hinge transforms need a design decision. |
| Compiler performance on long generated programs | Crane, City | Per-unit `structuredClone` plus full validation is quadratic; the 1.9 MB crane takes about 60–90s to compile. City (233 KB) takes 9–10.5s. |
| Runtime evaluation cost per frame | City | `graph.ts` rebuilds a node index per call, so a frame is O(n²) in nodes: about 90 ms per frame at 482 nodes. |
| Looping time: cyclic tracks or wrapping timing scopes | City | City writes 176 expression tracks as clamp sums of `(t + phase) % period`. Whether a time wrap is a new execution model needs a decision. |
| Shear or skew | City | City builds shear from nested rotation and scale (an SVD) for façade text; `transform.skew` is pending. Relates to Crane's affine panels. |
| Cyclic angles and scale through zero | Counter, Clockwork (angles in expressions), City (vehicles turn by `scale.x` through zero) | |

Every proposal that mentions general loops or functions defers them: [AGENTS.md](../../../AGENTS.md) requires a design decision for a new execution model.

## Adding a story

Create `docs/authoring/stories/<playground-id>/` with the three files above. Store the brief and proposal as supplied, record the program and builder hashes, add a row to the stories table, and add the story to any theme it raises.

## Change log

- 1.0: Initial index of nine story plates. Briefs and proposals for eight; the crane story's are missing.
- 1.1: Added the crane brief and a review-based proposal; added the paint-order, 3D-panel and compiler-performance themes.
- 1.2: Added The City Comes Around (brief, program, builder and proposal); added the runtime-cost, looping-time and shear themes, and added City to ten existing themes.
