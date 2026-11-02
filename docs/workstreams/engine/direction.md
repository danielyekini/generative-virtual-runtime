# Engine direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every old run or product inbox.
Resolve live work-item URLs and own clock from config.json / GitHub.

## Starting point

E001 assembled-delta admission, E018 host streaming observation, E002
persistent-entity decision/prototype, E004 durable revision ops (Scene IR /
MotionScript 0.6.0 `entities.durableRevisions`) and E005 drawable-reuse
decision/prototype are merged
(`docs/decisions/engine/assembled-delta-validation.md`,
`docs/decisions/engine/streaming-observation-contract.md`,
`docs/decisions/engine/persistent-entities.md`,
`docs/decisions/engine/drawable-reuse-bindings.md`,
`observeStreamingExecution` / `EntityRevisionStore` / `APPLY_ENTITY_PATCH` /
binding prototype in `@gvr/runtime`, `emitEntityPatchDelta` in `@gvr/compiler`).
Capacity-transactions evidence and PR #11 remain valid starting points; do not
repeat their proofs without an affected failure. Product may adapt P002/P005 to
the published observation snapshot; engine does not own Studio inspector UI.

## Next work

1. Follow-up to E005: versioned `entities.drawableBindings` (provisional) wiring
   register/bind through Scene IR / compiler / runtime projection when Ready.
2. E003: profile/reuse immutable geometry/keyframe validation facts on Crane if
   it still obstructs the selected workload. Preserve contextual references,
   writer/timing/seal checks and bounded memory. May proceed independently when
   validation cost blocks the chosen workload.
3. E006: native streaming authorship rules and compact reference contract when
   sequenced after the above Ready work (including declarative MotionScript
   entity/behaviour statements).

No Lottie-wide certification gate; legacy regressions checked when relevant.
Broader audio, interaction, paint/text/path/camera, spatial and physics work is
tracked in GitHub. Capacity improvements remain ongoing, evidence-driven work.
