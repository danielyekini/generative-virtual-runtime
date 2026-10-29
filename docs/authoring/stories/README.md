# MotionScript story plates

Supporting record revision **1.1**, 2026-10-29.

These records preserve supplied briefs, generated programs, builder provenance, measurements and **unevaluated retrospectives**. A proposal records observed friction and hypotheses; inclusion here does not evaluate, adopt, publish or enable a language capability. Use the released grammar/schema, capability registry and compatibility policy as authorities. This story catalog is distinct from immutable fidelity evaluations, the authoring-run registry and canonical sample revisions.

The starting commit `1f1e3de25376759fde055dd12098d77b5dabc55d` had eight playground story plates but no `docs/authoring/stories/` index or story records. The legacy entries below inventory those programs; they do not imply retrospective verification. There were no earlier story proposals available from which to copy themes or a README format. New records use the layout documented below.

## Stories

| Playground id | Title | Program | Story record / status |
| --- | --- | --- | --- |
| `a-crane-then-a-square` | A Crane, Then a Square | [Program](../../../fixtures/motionscript/stories/a-crane-then-a-square.ms) | Legacy plate; no record on starting branch |
| `into-the-moons-shadow` | Into the Moon’s Shadow | [Program](../../../fixtures/motionscript/stories/into-the-moons-shadow.ms) | Legacy plate; no record on starting branch |
| `adding-two-vectors` | Adding Two Vectors | [Program](../../../fixtures/motionscript/stories/adding-two-vectors.ms) | Legacy plate; no record on starting branch |
| `clockwork` | Clockwork | [Program](../../../fixtures/motionscript/stories/clockwork.ms) | Legacy plate; no record on starting branch |
| `counter` | Counter | [Program](../../../fixtures/motionscript/stories/counter.ms) | Legacy plate; no record on starting branch |
| `copperleaf` | Copperleaf Run | [Program](../../../fixtures/motionscript/stories/copperleaf-run.ms) | Legacy plate; no record on starting branch |
| `packet-journey` | Packet Journey | [Program](../../../fixtures/motionscript/stories/packet-journey.ms) | Legacy plate; no record on starting branch |
| `through-the-blue` | Through the Blue | [Program](../../../fixtures/motionscript/stories/through-the-blue.ms) | Legacy plate; no record on starting branch |
| `inside-an-order-book` | Inside an Order Book | [Program](../../../fixtures/motionscript/stories/inside-an-order-book.ms) | [35 s record](inside-an-order-book/README.md); [unevaluated retrospective](inside-an-order-book/proposal.md) |

## Record layout

Each `<story-id>/` contains:

- `brief.md`: supplied director script verbatim beneath a dated “brief as supplied” header.
- `README.md`: duration, playground id, links, and a program/builder table with physical line counts, UTF-8 bytes, SHA-256 and the exact implementation commit at which the hashes were taken.
- `proposal.md`: an unevaluated retrospective written after verification, covering result, ranked difficulties/root causes/workarounds, tooling/current-language experiments/language proposals, and priority.
- `evidence/`, when retained: real-renderer stills, capture times/browser, hashes, measured budgets/timings, review scope and check results including base comparisons for failures.

Builders emit the `.ms` program, compile, validate and fail on diagnostics. Assertions inspect runtime draw items rather than trusting the generator's own model. Previews are opt-in with `GVR_PREVIEW_DIR`; a fixed temporary output path or SVG approximation is not sufficient evidence for a new record.

## Recurring themes and new observations

A theme can recur in an existing implementation without an earlier written proposal. The table distinguishes that evidence from a new single-story observation. Pending capabilities are drafts, not available authoring features.

| Theme | Stories / evidence | Current implication |
| --- | --- | --- |
| Generated repetition versus core execution models | [Inside an Order Book §2–3](inside-an-order-book/proposal.md), [Packet Journey builder](../../../fixtures/motionscript/stories/build-packet-journey.ts) (`track`, `text`, packet/slot generation) | Host-side builders already remove some authoring repetition; test current compositions/timing before proposing more syntax. Loops/functions in MotionScript require an explicit execution-model design decision. No earlier proposal recurrence claimed. |
| Shared transforms, attached labels and world/screen space | [Inside an Order Book §2–3](inside-an-order-book/proposal.md), [Packet Journey builder](../../../fixtures/motionscript/stories/build-packet-journey.ts) (world labels and screen-space buffer monitor) | Parent moving annotations where possible; keep captions legible through camera moves. The order-book repair is observed; broader component/camera rewrites remain hypotheses. |
| Real-renderer previews and assertions beyond endpoint positions | [Inside an Order Book §1–3](inside-an-order-book/proposal.md); packet reference contains SVG/fixed-directory previews | Runtime checks plus actual Canvas frames caught overlap and label loss. Extract opt-in capture tooling; earlier SVG previews are not retroactively certified. |
| Exact discrete event timing alongside continuous motion | [Inside an Order Book §2–3](inside-an-order-book/proposal.md) | Existing millisecond visibility steps solved observed percentage-boundary rounding; absolute-time continuous keyframe syntax is only a proposal. Single recorded retrospective so far. |
| Numeric labels, formatting and duplicated text states | [Inside an Order Book §1–3](inside-an-order-book/proposal.md) | Deterministic numeric-text updates could remove static variants. This is not the pending per-character `text.animators` capability. Single recorded retrospective so far. |
| Audio cues and deterministic seeking | [Inside an Order Book §1–4](inside-an-order-book/proposal.md) | Current story is silent. An audio representation needs resource/seek/host semantics; not presently listed in pending capabilities. Single recorded retrospective so far. |
| Verification baselines and provenance | [Inside an Order Book §1–2](inside-an-order-book/proposal.md) | Keep program/builder hashes and reviewed frame hashes; distinguish story checks from repository failures reproduced on the base commit. Single recorded retrospective so far. |

## Change log

- **1.1 — 2026-10-29:** Add `inside-an-order-book`, its supplied brief, generated program/builder provenance, 45 real CanvasRenderer stills, budget/timing measurements, base/current failure evidence and unevaluated retrospective. Add the story to each relevant theme above. No language/registry/version/budget changes.
- **1.0 — 2026-10-29:** Establish this previously absent index, record layout and the eight legacy playground entries from the starting commit. This initial catalog scaffold and its 1.1 addition are recorded together; no earlier published index revision is implied.
