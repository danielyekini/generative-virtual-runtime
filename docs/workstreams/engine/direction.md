# Engine direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every old run or product inbox.
Resolve live work-item URLs and own clock from config.json / GitHub.

## Starting point

E001 assembled-delta admission and E018 host streaming observation are merged
(`docs/decisions/engine/assembled-delta-validation.md`,
`docs/decisions/engine/streaming-observation-contract.md`,
`observeStreamingExecution` in `@gvr/runtime`). Capacity-transactions evidence
and PR #11 remain valid starting points; do not repeat their proofs without an
affected failure. Product may adapt P002/P005 to the published observation
snapshot; engine does not own Studio inspector UI.

## Next work

1. E002: bounded persistent entity/revision/behaviour design and critical prototype.
   Include later topology, immutable transactions, ownership, events/simulation
   implications and compact context. Decide alternatives and create implementation
   children; do not spend multiple runs designing an unbounded universal language.
2. E003: profile/reuse immutable geometry/keyframe validation facts on Crane if
   it still obstructs the selected workload. Preserve contextual references,
   writer/timing/seal checks and bounded memory. This may proceed independently
   when E002 needs product input; don't gate all new functionality on further speed.
3. E004/E005: durable scene/edit/independent-behaviour vertical slice and bindings/
   drawable reuse with explicit versioning and streaming activation (after E002).
4. E006: native streaming authorship rules and compact reference contract when
   sequenced after the above Ready work.

No Lottie-wide certification gate; legacy regressions checked when relevant.
Broader audio, interaction, paint/text/path/camera, spatial and physics work is
tracked in GitHub. Capacity improvements remain ongoing, evidence-driven work.
