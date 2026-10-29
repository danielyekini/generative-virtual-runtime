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

The From Pixels to Prediction proposal was written by the implementing agent directly into this folder rather than pasted from chat, and cites real-renderer stills and measurements. The crane story's proposal is different: its implementation run was cut short, so it is a later review of the committed program, written by a different agent and based on re-running the builder, real-renderer stills and a compile profile.

The other proposals' text was pasted from chat. Some tables were flattened into tab-separated lines and are kept as received. Claims about defects (for example the `sampleKeyframes` and `noteEase` findings in Adding Two Vectors) are as reported by that implementation and have not been re-verified here.

Some proposals describe limits that have since changed. The default duration budget was raised from 30s to 60s in commit `1f1e3de`, which resolves the "35 seconds was illegal" findings in Packet Journey and Clockwork.

## Stories

| Story | Duration | Brief | Proposal |
| --- | --- | --- | --- |
| [From Pixels to Prediction](from-pixels-to-prediction/) | 30s | Director script | Yes |
| [From MotionScript to Motion](motionscript-to-motion/) | 30s | Direction script | Yes |
| [Into the Moon’s Shadow](into-the-moons-shadow/) | 40s | Direction script | Yes |
| [Packet Journey](packet-journey/) | 35s | Direction script | Yes |
| [Adding Two Vectors](adding-two-vectors/) | 30s | Direction script | Yes |
| [Copperleaf Run](copperleaf/) | 30s | Direction script | Yes |
| [Clockwork](clockwork/) | 35s | Prompt | Yes |
| [Through the Blue](through-the-blue/) | 30s | Direction script | Yes |
| [Counter](counter/) | 30s | Direction script | Yes |
| [A Crane, Then a Square](a-crane-then-a-square/) | 35s | Direction script | Review of the unfinished program |

## Recurring themes

**Hypothesis.** This is a reading of the ten proposals, not a measurement. "Raised" means the proposal identifies the problem; several stories raise a problem and then recommend against a language change for it, and that is noted.

| Theme | Raised by | Notes |
| --- | --- | --- |
| Expressions or tracks that read another channel (drivers, signals, point binding) | Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue, Pixels | The most frequent theme. Blue identifies it and prefers sampling the runtime in the generator first. |
| Reserved keywords used as ids, with unhelpful diagnostics | Moon (`left`, `right`), Packet (`cap`), Clockwork (`path`, `overlay`, `center`), Copperleaf (`step`), MotionScript→Motion (`cap`) | Diagnostic fix, no language change. |
| Drawable instances or parameterised symbols | Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Pixels | Instances are stored and not drawn today. Pixels frames its need (one declaration per layer) as data-driven repetition, which needs a design decision. Blue and Copperleaf caution that one film is not enough evidence. |
| Animated colour (fill, and stroke) | Moon, Packet (stroke), Vectors, Counter, MotionScript→Motion, Pixels (fill, stroke and text fill) | `paint.animatedSolidFill` is drafted in `pending.md`; it excludes stroke. Pixels spends 50 of 390 nodes on opacity overlays that stand in for activation colour. |
| Camera fit or aim | Moon, Packet, Clockwork, MotionScript→Motion, Pixels | Blue suggests first measuring a vec2 spatial camera track against dense keys. |
| Keyframe time in seconds, or named times | Packet, Vectors, Counter, MotionScript→Motion, Pixels | Copperleaf recommends against for its own case: hold-per-step keeps its pixel grid. |
| Text that changes, wraps or can be measured | Packet, Vectors, Counter, MotionScript→Motion, Pixels | `text.animators` is pending. |
| Two writers on one channel (event over state, additive) | Packet, Blue, MotionScript→Motion | Blue asks only for a diagnostic hint that nested groups multiply. |
| Labels that stay a constant pixel size on a world point | Moon, Packet, Clockwork | |
| Dash pattern on a stroke | Packet, Vectors, Clockwork | |
| Masks, mattes or clipping | Moon, Pixels | Blue says its frond does not need one. Pixels would use one for the grid reveal and the neuron spotlight. `compositing.mask` and `.matte` are pending. |
| Progress along a path, or end markers | Packet, Vectors, MotionScript→Motion, Pixels | Relates to pending `transform.autoOrient`. |
| Node, duration, step and source budgets | Packet, Clockwork, Copperleaf, MotionScript→Motion, Crane, Pixels | Pixels uses 390 of 500 nodes, 280 tracks and 108 KB. Duration resolved by `1f1e3de`. Copperleaf asks for a profile of the 500-node cap before any change. Crane is 3.7× the 512 KiB source budget, which the compiler does not enforce, and uses 676 of 1,000 steps. |
| Diagnostics that cascade after a rolled-back unit | Copperleaf, MotionScript→Motion, Pixels | Diagnostic fix. In Pixels one comma in `cubic` rolled back a whole group and produced about 60 `UNKNOWN_TARGET` lines; the parse errors themselves are located. |
| Audio or cue markers | Every story notes the absence | Moon and MotionScript→Motion suggest metadata cues; Vectors a clocked event channel later; Copperleaf and Blue recommend not adding audio. |
| Shared builder tooling (runtime sampling, real-viewport preview, shared helpers) | Blue, Clockwork, MotionScript→Motion, Crane, Pixels | Tooling, no language change. Pixels' builder writes PNG stills through `CanvasRenderer` in headless Chromium; its checks still missed label overlaps that the stills showed. Crane's builder checked the model, not the drawn mark, and missed that the mark was never drawn. |
| Dynamic paint order | Counter, Crane | `zIndex` is static. Crane duplicates every face into two paint-order banks. |
| 3D-ish subjects: two-sided panels, hinge rotations | Crane | Two-sided paint by matrix determinant is the smallest step; hinge transforms need a design decision. |
| Compiler performance on long generated programs | Crane, Pixels | Per-unit `structuredClone` plus full validation is quadratic; the 1.9 MB crane takes about 60–90s to compile. Pixels: 108 KB takes 6.4–6.9s, about 21 ms per track unit against a 390-node scene. |
| Cyclic angles and scale through zero | Counter, Clockwork (angles in expressions) | |
| Trim on a compound path bridges its subpaths | Pixels | `trimCommands` joins subpaths into one polyline, so even `trim 0, 1, 0` draws the jumps. A discrepancy in supported semantics, and possibly in the Lottie `exact` trim claim (hypothesis); route to the fidelity loop. |

Every proposal that mentions general loops or functions defers them: [AGENTS.md](../../../AGENTS.md) requires a design decision for a new execution model.

## Adding a story

Create `docs/authoring/stories/<playground-id>/` with the three files above. Store the brief and proposal as supplied, record the program and builder hashes, add a row to the stories table, and add the story to any theme it raises.

## Change log

- 1.0: Initial index of nine story plates. Briefs and proposals for eight; the crane story's are missing.
- 1.1: Added the crane brief and a review-based proposal; added the paint-order, 3D-panel and compiler-performance themes.
- 1.2: Added From Pixels to Prediction (brief, program record and proposal); added it to twelve existing themes and a new compound-path trim theme.
