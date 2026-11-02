# Model-facing MotionScript reference contract (E006 → P006)

Engine owns the streaming authorship rules and released-authority list.
[P006](https://github.com/danielyekini/generative-virtual-runtime/issues/47)
builds the generated, tested, versioned snapshot consumed by models.

## Purpose

Provide a compact syntax / capability / idiom / error / streaming reference for
generation. It is not a roadmap, decision log or evaluation archive.

## Required inputs (released only)

| Input | Why |
| --- | --- |
| `packages/schema/capabilities/releases.json` | Current MotionScript / Scene IR version pointers |
| Current version files named there | What each release introduced |
| `packages/schema/capabilities/registry.json` | Support claims (`exact` / `approximate` / `unsupported`) |
| `packages/schema/src/grammar.ts` | Normative syntax |
| `docs/contracts/streaming-authorship.md` | Progressive unit / seal / writer rules |
| `docs/contracts/streaming-observation.md` | Host observation vocabulary (units ≠ lines/frames) |
| `lintStreamingAuthorship` finding codes + `fixtures/motionscript/streaming/` | Validated streaming examples and repair signals |
| Scoped conformance / compiler tests linked from those fixtures | Compiling evidence |

Optional depth (developer navigation, not required in the compact snapshot):
`docs/languages/authoring-guide.md`, `docs/design/capacity-transactions.md`,
engine decisions under `docs/decisions/engine/` — link out, do not dump.

## Hard excludes

- Roadmaps, backlog queues, pending.md candidate lists as if released
- Historical evaluation debates and fidelity corpora
- Legacy Lottie/SVG adapter expansion guidance
- Invented loop / function / package syntax

Entity edits in the snapshot may use released MotionScript 0.9.0 declarative
`entity` / `geometry` / `bind` / `behaviour` statements (gated by
`entities.durableRevisions` / `entities.drawableBindings`) or host
`emitEntityPatchDelta` / `APPLY_ENTITY_PATCH`.

Interactive programs may use released MotionScript 0.10.0 `interact`
declarations (gated by `input.bindings`): bounded `set` / `toggle` / `step` /
`dragTranslate` actions on input-owned channels that no track may also write.

Audible programs may use released MotionScript 0.11.0 `audio` / `cue`
declarations (gated by `audio.cues`): resources with a decoded length, and
narration/effects/music cues on scene time. Narration is required (playback
waits for it); effects and music are optional. Speech synthesis is a host
service, not syntax.

## Snapshot metadata (P006 must record)

- Source authority paths + content hashes (or git tree identity)
- MotionScript + Scene IR release ids and wire family
- Required capability profile for the snapshot
- Prompt / token size of the generated artifact
- Generation timestamp and generator version
- Staleness guard: fail or refresh when any listed authority hash/version changes

## Tests P006 owns

- Snapshot builds from the input list without excluded material
- Staleness guard trips on a deliberate authority edit
- Streaming examples embedded in the snapshot still match linter expectations
- No claim of unsupported registry rows as available syntax

## Handoff

E006 lands the contracts, linter and fixtures. P006 generates the artifact and
guards. Until P006 ships, agents use the contracts and fixtures directly rather
than an interim generated dump.
