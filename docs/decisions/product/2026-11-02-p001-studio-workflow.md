# P001: Studio library → editor → execute → fullscreen workflow

Status: accepted, 2 November 2026. Work item:
[P001](https://github.com/danielyekini/generative-visual-runtime/issues/42).
Owner: Product. Code: `app/playground/src/library.ts`,
`app/playground/src/activities/workspace.ts`, `app/playground/index.html`,
`app/playground/src/studio.css`, smoke check `app/playground/smoke/studio-smoke.ts`.

## Requirement and scope

A user (or agent) must find an installed native program, upload or paste their
own, see exactly one active program, run it only through an explicit Execute,
present it fullscreen and leave fullscreen, and get compile errors that point at
the source without losing the text. Existing compile, round-trip, import,
streaming and comparison tools stay reachable. Not in scope: streaming
inspector (P002), performance inspector (P003), agent host API (P005), any new
engine semantics, or a code-editor dependency.

## Alternatives compared

**A. Program-centred workbench (chosen).** Replace the "Test scripts" dropdown
at the top of the existing left rail with a Library section (search box,
collection filter chips, scrollable list, Upload / New). An "active program"
bar above the canvas names the program, its origin and its state
(not executed / running / edited since execution / failed) and holds Execute
and Fullscreen. Utilities (canvas, stream, import) remain below in the rail.

**B. Separate library home screen.** A `#library` route with a card grid opens
a program into the existing workspace; the workspace keeps its current rail.

Critique with scenarios:

- *Human tester iterating on a story*: B costs a route change for every switch
  and hides search while editing; A keeps search, editor and canvas visible.
- *Agent driving the DOM/bridge*: both work; A needs no new route and keeps
  the `__gvr` bridge on one activity. The legacy `#test-scripts` select is kept
  (visually hidden) so existing browser checks under `docs/authoring/` still run.
- *Upload then error*: in both, failed execution must keep the editor text and
  jump to the span; A shows the failure in the active bar next to the program
  name, so the error cannot be confused with a previously shown scene.
- *Import/stream utilities*: B would leave two navigation layers (route + rail);
  A states in the active bar when the canvas belongs to an import or stream
  utility instead of the active native program.
- *Large stories (1.9 MB Crane)*: list rendering is O(entries); compile cost is
  unchanged and still only happens on Execute.

B's advantage is a roomier gallery with thumbnails; that needs rendered
previews and is deferred. Revisit when the library exceeds ~100 programs, when
thumbnails/previews are available cheaply, or when the customer surface (P011)
needs a separate browsing experience.

## Decisions

- **Opening ≠ executing.** Selecting a library entry loads its source into the
  editor and makes it active; the canvas shows a "not executed" state until
  Execute (button or Ctrl/⌘+Enter). The hidden legacy select keeps its older
  load-and-compile behaviour for automation compatibility.
- **One active program.** The active bar is the single source of truth: name,
  origin (installed / yours), and state. Edits mark it "edited since
  execution"; the canvas keeps showing the last execution, labelled as such.
  Switching programs keeps an in-memory draft per program, so switching back
  does not lose unexecuted edits.
- **User programs.** Upload (`.ms`/text) and New create entries in
  "My programs", stored best-effort in `localStorage` (absence or quota failure
  is reported, never fatal). Large sources that do not fit stay session-only.
- **Diagnostics.** Failed execution lists each diagnostic with line/column,
  code, message and recovery; activating one selects that span in the editor.
  Source text is never replaced on failure.
- **Fullscreen.** Presents the stage element (canvas + transport) via the
  Fullscreen API, falling back to a fixed full-viewport presentation class.
  Exit with the visible button or Esc. The renderer keeps contain-fit on the
  logical viewport; fixed window-size presets are ignored while presenting,
  so fullscreen never stretches or changes authored coordinates.

## Verification

Unit tests for filtering, persistence decoding and diagnostic location
(`app/playground/src/library.test.ts`), the full `npm run verify` gate, and the
browser smoke `npm run smoke:studio`, which drives search → open → execute →
fullscreen → exit → upload-with-error → diagnostic jump in headless Chromium.
