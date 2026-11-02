# P014 Library implementation

Requirement: deliver the confirmed Library workflows from studio-ux.md without
losing the P001 Player or source drafts during page navigation. Issue #68;
P015 chose pointer scrubbing. This records implementation choices within that UX.

Use the separate `#library` route in the Player document. An independent HTML
entry would isolate the page but requires serialising transient Player/editor and
runtime state or discarding it. Keeping the temporary modal fails the confirmed
separate-page requirement. The route shows a full page and hides Player; returning
preserves the loaded program, evaluated frame and both source drafts. Opening a
different program intentionally changes the one loaded program. Playback pauses
while browsing. Reload restores saved programs, not transient edits.

Reuse the installed catalogue, filter and importer/compiler Run path. Render a
static frame at 35% duration through CanvasRenderer. Compile thumbnails lazily
near the viewport, one queued job per animation frame, with at most twelve cached
Scene IRs. Pointer movement draws one time sample, and leaving restores the poster.
Duration sorting resolves all durations incrementally; invalid entries sort last
and remain openable for Player diagnostics. No telemetry is supplied to previews,
so they cannot contaminate Player measurements. No native semantic claims change.

Personal programs remain in the existing v1 browser record, with an optional
format field so uploaded SVG/Lottie/fixture sources survive reload. Organisation
metadata uses a separate versioned key. Installed programs have no invented
creation dates: they tie alphabetically behind locally modified entries.
Storage failures are reported; a failed source save retains the editor and does
not navigate. Another tab's saved programs are read again before append.

Critical pass: malformed programmes and storage cannot break the whole catalogue;
text is inserted via DOM textContent; source is never evaluated as JavaScript.
Page switching preserves drafts, and editor actions cannot silently replace a
nonempty draft. Legacy Stream/Split routes remain available. No background preview
playback or audio, and no changes to engine/shared contracts. Revisit isolation
if Player and Library need independent windows or preview work must move off-thread.

Acceptance: full verify plus real Chromium smoke for rendering/scrub, filters,
favourites/tags/reload, editor/storage failure and existing Player workflows.
