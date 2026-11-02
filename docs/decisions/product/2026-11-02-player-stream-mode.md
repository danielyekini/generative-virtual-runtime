# Player Stream mode (P002)

Accepted scope: [P002 #43](https://github.com/danielyekini/generative-virtual-runtime/issues/43), including the user's approved rates/Advanced proposal. Native MotionScript only; existing importers keep instant Run. No language, runtime or release semantics change.

## Alternatives and choice

1. Keep the old workbench/RAF feed. Smallest code reuse, but it preserves the second source selector and makes transport rate depend on rendering load.
2. Adapt the PR #11 progressive benchmark's independent Worker producer and bounded acknowledgement protocol to the Player's single draft. Chosen: one unacknowledged chunk (at most 16,385 UTF-16 code units, including a surrogate-pair boundary) bounds the backlog. Main-thread compilation still costs real wall time; simulation is never labelled model generation speed. Retain benchmark evidence; this change does not recertify it.

The Worker schedules seeded chunking, jitter and stalls. Arrival configuration is captured at Stream start. Pause cancels the pending timer; step sends one chunk and remains paused. A new Stream, instant Run, program/format change or page teardown terminates the old producer and disposes the old engine owners. Callbacks check session identity. Library navigation pauses playback while arrival may continue; navigation preserves the loaded draft.

## E018 presentation mapping

Product owns the adapter; Engine's observation fields and inclusive declaration spans remain authoritative. Source never displays unarrived suffixes. Preserve a per-run unit history because the engine's recent-unit ring is bounded. Accepted units remain orange until their next accepted seal horizon is reached by actual runtime evaluation, then white; seeking back recomputes this presentation. Rejections use compiler/runtime diagnostic spans and a red marker. Non-colour cues accompany every state; mixed states on one line are separate spans. No assertion of per-line animation frames or per-unit pixel contribution is made. The tape shows sealed range vs playhead and actual waiting time. Frame sampling/tracks remain P016.

## Bounded failure review

Worker backlog is acknowledged and finite; chunks preserve surrogate pairs. Cancellation must release engine queues and prevent stale updates. Worker errors surface a failed run. Missing/rejected/truncated units retain arrived text and last accepted history. A completed stream can seek/replay. An instant Run that fails after a stream retains a usable copy of the previous accepted scene. Imports cannot enter the native stream compiler. Source edits during arrival remain separate from the running snapshot and show the existing dirty indicator.

Verification: pure adapter parity against instant evaluation (ignoring only revision identity), partial-source preservation, actual diagnostic spans and teardown; browser smoke covers Worker delivery, pause/step, Advanced controls, completion, seek states, restart, imports and existing Studio workflows. Full `npm run verify` is required before submission. Revisit this transport adapter for real provider streaming or when profiling shows main-thread compilation bottlenecks; do not claim Worker compilation.
