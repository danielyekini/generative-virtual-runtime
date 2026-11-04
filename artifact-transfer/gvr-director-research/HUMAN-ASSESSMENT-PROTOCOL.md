# Human rendered-quality assessment protocol

Status: formal research procedure requested by the user; documentation only. This is not a deployed collection service or a claim of new reviews.

## Record

Session/turn, scene ID, program SHA-256, director/prompt hashes, repository revision, viewport/DPR/device, playback time or input path, supporting capture where available, assessor and date. Unknown values stay unknown. Preserve raw assessment alongside structured interpretation. Never retrofit numerical scores to prose feedback without the assessor's confirmation.

For each observation record: what worked; what failed; expected experience; visible evidence; affected scope; severity as assessed or unassigned; candidate responsible layer and confidence. Distinguish the user's report from an agent hypothesis. Useful dimensions: captured intent, spatial/visual coherence, choreography, focused composition, text/audio balance, direct manipulation, responsiveness/full-stage appearance, accessibility and perceived waiting time.

## Loop

1. Deliver verified candidate and make it easy to inspect/replay.
2. Collect human response after each visual turn or at an agreed review point; never invent feedback when the user proceeds without reviewing.
3. Preserve exact program, prompt snapshots and assessment before revisions.
4. Reproduce the defect where possible. Attribute separately to direction, implementation, runtime/host or uncertain cause.
5. Propose a generalizable change. Keep user-specific preferences separate from universal defaults.
6. Run matched before/after examples across the target domain and counterexamples. Assess accessible and reduced-motion paths too.
7. Human renders/interaction assessments are the primary criterion for perceived experience quality; automated correctness and safety remain nonnegotiable checks. Do not average away unusable geometry or misleading controls because intent was captured.
8. Record adopted/deferred/rejected decision, measured costs, regression cases and rollback trigger. Request a fresh human assessment of the actual changed output.

Keep baseline experiment prompts frozen. Feedback informs a new identified variant, not an unrecorded mid-run prompt mutation. The user should still only need to send prompts and close the conversation; optional quality feedback is captured by the coordinator without exposing stage logistics.
