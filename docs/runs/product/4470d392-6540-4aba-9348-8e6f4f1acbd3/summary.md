# P014 Library verification

Run: `4470d392-6540-4aba-9348-8e6f4f1acbd3`. Issue: [#68](https://github.com/danielyekini/generative-virtual-runtime/issues/68).
Measured implementation: `cb3ed396de7a89adbc1cc9925516cde7f89be12d` on base `f8bc631b22ce6cc180b0071af695ffe772a90219`.
These evidence files were added afterwards without source changes.

Delivered: separate `#library` page; 75 installed cards plus browser-saved My
programs; static 35% posters and pointer scrub previews; collections, editable
tags, favourites, search, recent strip and four sort choices; full New/Paste/Upload
editor; storage errors; opening in Player with autoplay off by default. Navigation
preserves the loaded Player, its unsaved source and Library authoring draft.
Imports retain their format through save/reload. Legacy tools remain reachable.

Verification (all exit 0):
- `npm run verify`: 39 Vitest files / 286 tests, complete package and Studio
  typechecks, production Studio build, IR manifest, 33 Python operations tests,
  current-capability reference freshness.
- `npm run smoke:studio`: 54/54 real Chromium checks; [compact results](smoke.json).
  Covers preview time/restoration and card fit, collections, tags, favourites and
  reload, save/Upload/Paste, quota failure and retry, SVG reload/Run, duration
  and recent sorting, empty/narrow layouts, Player drafts/playback/fullscreen,
  diagnostic source jumps, autoplay/hash restore and legacy streaming.
- `git diff --check`: clean.

Screenshots: [Library](library.png), [full editor](editor.png), [narrow viewport](narrow.png).
Reproduce locally: `npm ci && npm run dev -w @gvr/playground`, then open
`http://localhost:5173/#library`; hover across a thumbnail, Open, then Run.
No deployment or language/support changes. Installed entries have no invented
creation timestamps; added/modified sorting uses local saves and tag edits,
with alphabetical ties. My programs are local to this browser, not cloud storage.
