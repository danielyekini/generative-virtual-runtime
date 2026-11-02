# Product direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every engine run or engine inbox.

## Studio UX authority (user steering, 2 November 2026)

[studio-ux.md](studio-ux.md) is the user-confirmed Studio specification:
a **full redesign** with separate Library and Player pages, not features added
to the old three-column workbench. If a workflow's experience is undefined
there, stop and ask the user with options, mockups or a UI-generator prompt
instead of building a guess. Preserve working compile, playback, streaming and
import/compare functions while moving them into the new layout.

## Queue (2 November 2026)

1. P001 #42 Player page redesign — Ready.
2. P015 #67 Library hover-preview style — waiting on user decision.
3. P014 #68 Library page — after P001 and P015.
4. P004 #45 Player Split paste-and-run — after P001.
5. P002 #43 Stream run mode — after P001 and engine E018; propose presets and
   Advanced controls to the user first.
6. P003 #44 Performance tab — after P001; UX proposal to the user first.

Paused prototype: PR #65 history commit 2d08de0 (reuse helpers only).

## Next

P002: Stream as a Run mode of the loaded program (studio-ux.md "Streaming"),
using rate presets plus advanced arrival controls. Line states are confirmed as
grey (arrived), orange (queued), white (resolved) and red (rejected), mapped to
actual events and never to fictional per-line frames, with non-colour cues.
Tape timeline shows loaded vs playhead; counters name their units. This
replaces the blank stream-source pane. Request X001 from engine rather than defining
new engine states privately. Reuse PR #11 Worker/evidence, don't call it real LLM speed.

P003/P005: contextual performance inspector and agent-facing commands/services
sharing execution paths with human Studio. P004: unobtrusive format selection/
comparison; no automatic native round-trip overhead. P006/P007: compact versioned
native reference and real model authoring experiment, then director-script pipeline.
P008-P013 cover speech/media/customer/teaching/desktop/landing decisions later.
Do not conflate a standalone generated movie/audio companion with native support.
