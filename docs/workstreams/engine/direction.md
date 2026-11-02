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
and E003 immutable path/keyframe validation-fact reuse are merged
(`docs/decisions/engine/assembled-delta-validation.md`,
`docs/decisions/engine/streaming-observation-contract.md`,
`docs/decisions/engine/persistent-entities.md`,
`docs/decisions/engine/drawable-reuse-bindings.md`,
`docs/decisions/engine/streaming-authorship-and-declarative-entities.md`,
`docs/decisions/engine/animated-paint-channels.md`,
`docs/decisions/engine/immutable-validation-facts.md`,
`observeStreamingExecution` / `EntityRevisionStore` / `APPLY_ENTITY_PATCH` /
`REGISTER_GEOMETRY` / `BIND_GEOMETRY` / `projectScene` projection in
`@gvr/runtime`, `emitEntityPatchDelta` in `@gvr/compiler`).
Capacity-transactions evidence and PR #11 remain valid starting points; do not
repeat their proofs without an affected failure. Product may adapt P002/P005 to
the published observation snapshot; engine does not own Studio inspector UI.

## Next work

1. Follow-up after E006: declarative MotionScript `entity` / `behaviour` /
   `geometry` / `bind` statement implementation (versioned), using the E006
   design against released 0.6–0.7 ops (tracked as E024). Streaming authorship
   contract, stream linter and P006 generation inputs are landed with E006.

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
