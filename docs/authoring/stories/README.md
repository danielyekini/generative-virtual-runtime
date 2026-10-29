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

The Small Ideas, Enormous Change proposal was written into this folder by the implementing agent, with measurements and real-renderer stills; it was not pasted. The other proposals' text was pasted from chat. Some tables were flattened into tab-separated lines and are kept as received. Claims about defects (for example the `sampleKeyframes` and `noteEase` findings in Adding Two Vectors) are as reported by that implementation and have not been re-verified here.

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
| [Small Ideas, Enormous Change](small-ideas-enormous-change/) | 20s | Direction script | Yes |

## Recurring themes

**Hypothesis.** This is a reading of the proposals, not a measurement. "Raised" means the proposal identifies the problem; several stories raise a problem and then recommend against a language change for it, and that is noted.

| Theme | Raised by | Notes |
| --- | --- | --- |
| Expressions or tracks that read another channel (drivers, signals, point binding) | Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue | The most frequent theme. Blue identifies it and prefers sampling the runtime in the generator first. |
| Reserved keywords used as ids, with unhelpful diagnostics | Moon (`left`, `right`), Packet (`cap`), Clockwork (`path`, `overlay`, `center`), Copperleaf (`step`), MotionScript→Motion (`cap`) | Diagnostic fix, no language change. |
| Drawable instances or parameterised symbols | Packet, Vectors, Clockwork, Counter, MotionScript→Motion | Instances are stored and not drawn today. Blue and Copperleaf caution that one film is not enough evidence. |
| Animated colour (fill, and stroke) | Moon, Packet (stroke), Vectors, Counter, MotionScript→Motion, Small Ideas (stroke width and colour) | `paint.animatedSolidFill` is drafted in `pending.md`; it excludes stroke. Small Ideas fakes a weight change with a duplicate wider stroke. |
| Camera fit or aim | Moon, Packet, Clockwork, MotionScript→Motion, Small Ideas | Blue suggests first measuring a vec2 spatial camera track against dense keys. Small Ideas computes its framings from bounds in the builder. |
| Keyframe time in seconds, or named times | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas | Copperleaf recommends against for its own case: hold-per-step keeps its pixel grid. |
| Text that changes, wraps or can be measured | Packet, Vectors, Counter, MotionScript→Motion, Small Ideas (per-glyph nodes, outlines and advances) | `text.animators` is pending. Small Ideas draws its own 17-glyph stroked face because a `text` node cannot be split into letters. |
| Two writers on one channel (event over state, additive) | Packet, Blue, MotionScript→Motion | Blue asks only for a diagnostic hint that nested groups multiply. |
| Labels that stay a constant pixel size on a world point | Moon, Packet, Clockwork | |
| Dash pattern on a stroke | Packet, Vectors, Clockwork | |
| Masks, mattes or clipping | Moon | Blue says its frond does not need one. `compositing.mask` and `.matte` are pending. |
| Progress along a path, or end markers | Packet, Vectors, MotionScript→Motion | Relates to pending `transform.autoOrient`. |
| Node, duration, step and source budgets | Packet, Clockwork, Copperleaf, MotionScript→Motion, Crane | Duration resolved by `1f1e3de`. Copperleaf asks for a profile of the 500-node cap before any change. Crane is 3.7× the 512 KiB source budget, which the compiler does not enforce, and uses 676 of 1,000 steps. |
| Diagnostics that cascade after a rolled-back unit | Copperleaf, MotionScript→Motion | Diagnostic fix. |
| Audio or cue markers | Every story notes the absence | Moon and MotionScript→Motion suggest metadata cues; Vectors a clocked event channel later; Copperleaf and Blue recommend not adding audio. |
| Shared builder tooling (runtime sampling, real-viewport preview, shared helpers) | Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas | Tooling, no language change. Crane's builder checked the model, not the drawn mark, and missed that the mark was never drawn. Small Ideas' seams and a mid-move framing error showed only in real `CanvasRenderer` stills or an interval sweep, not in checks at named times. |
| Dynamic paint order | Counter, Crane | `zIndex` is static. Crane duplicates every face into two paint-order banks. |
| 3D-ish subjects: two-sided panels, hinge rotations | Crane | Two-sided paint by matrix determinant is the smallest step; hinge transforms need a design decision. |
| Compiler performance on long generated programs | Crane | Per-unit `structuredClone` plus full validation is quadratic; the 1.9 MB crane takes about 60–90s to compile. |
| Hairline seams where separately drawn shapes meet | Crane, Small Ideas | Each draw item is anti-aliased alone. Crane strokes every triangle; Small Ideas merges strokes into one path per letter and overlaps joins. Relates to unsupported `geometry.mergePaths`. |
| Cyclic angles and scale through zero | Counter, Clockwork (angles in expressions) | |

Every proposal that mentions general loops or functions defers them: [AGENTS.md](../../../AGENTS.md) requires a design decision for a new execution model.

## Adding a story

Create `docs/authoring/stories/<playground-id>/` with the three files above. Store the brief and proposal as supplied, record the program and builder hashes, add a row to the stories table, and add the story to any theme it raises.

## Change log

- 1.0: Initial index of nine story plates. Briefs and proposals for eight; the crane story's are missing.
- 1.1: Added the crane brief and a review-based proposal; added the paint-order, 3D-panel and compiler-performance themes.
- 1.2: Added Small Ideas, Enormous Change (brief, program record and proposal); added it to the animated-colour, camera, seconds, text and tooling themes; added the seams theme.
