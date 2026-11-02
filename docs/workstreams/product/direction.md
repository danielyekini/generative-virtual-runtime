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

## P001 (redesigned)

Deliver the Player and Library pages from studio-ux.md: an empty-player landing
page, a Library with collections, tags, search, sort, favourites, recents,
static thumbnails and hover preview (confirm the preview style first), and New,
Paste and Upload editing. Opening a program loads it into the Player and waits
for Run (autoplay is a setting). The Player has a VS Code-style bottom panel,
an optional Source panel with diagnostics that jump to the source, fullscreen
with contain-fit and exit, and Split paste-and-run for supported formats. The
Stream run mode lands in P002. P001 may be split into Player-shell and Library
items, but each must be usable end to end. Provide a smoke route/demo.
Paused prototype: PR #65 (reuse helpers only).

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
