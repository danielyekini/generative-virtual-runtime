# Engine direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every old run or product inbox.
Resolve live work-item URLs and own clock from config.json / GitHub.

## Starting point

E001 assembled-delta admission, E018 host streaming observation, E002
persistent-entity decision/prototype, E004 durable revision ops (Scene IR /
MotionScript 0.6.0 `entities.durableRevisions`), E005 drawable-reuse
decision/prototype, E023 versioned `entities.drawableBindings` (Scene IR /
MotionScript 0.7.0), E006 streaming authorship/stream linter, E009 animated
solid paint channels (Scene IR / MotionScript 0.8.0 `paint.animatedSolid`),
E024 declarative entity statements (MotionScript / Scene IR 0.9.0),
E007 native input decision/prototype (painted-geometry hit-testing,
`InputSession` routing, bounded `input`-owned actions, replay), E025
`input.bindings` (`interact` declarations, MotionScript / Scene IR 0.10.0,
Studio player wiring), E008 audible media clock decision/prototype
(scene-time master, pure audio schedule, reconciling `AudioSession`,
required-resource hold, deterministic `mixAudio` export), E026 `audio.cues`
(`audio` / `cue` declarations, MotionScript / Scene IR 0.11.0, `ADD_AUDIO_CUES`,
Studio Web Audio backend and bridge WAV export),
E010 bounded spatial graphics decision/prototype (planar 2.5D layers,
`projectSpatialFrame`, `docs/decisions/engine/spatial-graphics.md`),
and E003 immutable path/keyframe validation-fact reuse are merged
(`docs/decisions/engine/assembled-delta-validation.md`,
`docs/decisions/engine/streaming-observation-contract.md`,
`docs/decisions/engine/persistent-entities.md`,
`docs/decisions/engine/drawable-reuse-bindings.md`,
`docs/decisions/engine/streaming-authorship-and-declarative-entities.md`,
`docs/decisions/engine/animated-paint-channels.md`,
`docs/decisions/engine/immutable-validation-facts.md`,
`docs/decisions/engine/native-input.md`,
`docs/decisions/engine/audible-media-clock.md`,
`observeStreamingExecution` / `EntityRevisionStore` / `APPLY_ENTITY_PATCH` /
`REGISTER_GEOMETRY` / `BIND_GEOMETRY` / `projectScene` projection in
`@gvr/runtime`, `emitEntityPatchDelta` in `@gvr/compiler`).
Capacity-transactions evidence and PR #11 remain valid starting points; do not
repeat their proofs without an affected failure. Product may adapt P002/P005 to
the published observation snapshot; engine does not own Studio inspector UI.

## Next work

1. E028 ([#107](https://github.com/danielyekini/generative-virtual-runtime/issues/107)):
   version planar 2.5D spatial layers (`space.planar25d`, MotionScript / Scene IR
   0.12.0) per the E010 decision; Candidate until the orchestrator promotes it.
2. Then replenish Ready from remaining M4/M5 Candidates with satisfied
   dependencies: E011 physics (adopts E010 coordinate conventions) and E016
   seams/intersection splitting (on the E010 order contract) are unblocked.
   Audible human judgement of E026 output and visible media controls sit with P009.

No Lottie-wide certification gate; legacy regressions checked when relevant.
Pending language candidates are not a
queue; old Lottie gaps do not add adapter lowering or source-fidelity acceptance.
Proactive legacy-format work requires a fresh explicit user request.
Broader audio, interaction, paint/text/path/camera, spatial and physics work is
tracked in GitHub. Capacity improvements remain ongoing, evidence-driven work.

## Continual story improvement (prospective direction, 2 November 2026)

Alongside milestone delivery, Engine permanently improves capabilities, performance
and native authoring through the [native story cycle](../../workflows/native-story-cycle.md):
Generate Stories → Expand System → Reimplement Stories → Select next corpus.
Current expansion work continues. Future corpus implementations use native
MotionScript directly; improvements include affected-story reimplementation and
versioned library updates. Orchestrators choose bounded work, reimplementation
timing and increasingly ambitious returning stories. Include persistent/multi-turn
scenes as well as timed films. Product supplies prompts and expected responses;
agree director generation ownership before the next corpus.
