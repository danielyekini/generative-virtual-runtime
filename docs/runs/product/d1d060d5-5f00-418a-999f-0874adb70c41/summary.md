# Product run d1d060d5 — P001 Player page redesign

- Issue: [P001 #42](https://github.com/danielyekini/generative-visual-runtime/issues/42). Spec: `docs/workstreams/product/studio-ux.md` (Player).
- Base: main `eaac130`. Evidence is from the committed branch head of this run.
- Gate: `npm run verify` passed (34 test files, 273 tests; all typechecks including the new `app/playground/tsconfig.json`; Studio build of `index.html` + `legacy.html`; IR manifest; ops tests; capability index).
- Smoke: `npm run smoke:studio`, 35/35 checks in headless Chromium at 1440×900 (`summary.json`, screenshots `0-landing` … `6-import-report`).

## Delivered

- Player at `/`: empty landing page with Open Library (header and canvas, plus Recent); header with program name, collection/format, run-state badge (symbol + text), Run, disabled Stream ("coming in P002") with ▾ link to the legacy stream tool, Source toggle, Fullscreen and ⚙ (Autoplay on open off by default, canvas size, DPR, temporary routes).
- Canvas fills the main area; Source side panel on the right, closed by default, resizable; quick edit, "edited since Run" marker and re-Run (Ctrl/⌘+Enter).
- Transport plus a tape built as a track container (`.tape > .track[data-track=time]`) with loaded range, key-time ticks and a playhead; click/drag seeks. P016 replaces the track contents.
- Collapsible, resizable bottom panel: Diagnostics (line, column, code, message, recovery; select to jump to the span), Scene (compact Scene IR summary and the resolved frame at the playhead, no megabyte JSON dump), Report (compile result or importer fidelity report).
- Fullscreen: canvas only at window size, renderer contain-fit on the logical viewport, Esc or a visible exit control; transport on hover.
- Run is instant-mode only and does no round-trip work. Lottie/SVG/fixture programs in the Imports collection run through their importers.
- Temporary program picker (search, collection chips, Open file…) until P014.
- Old three-column workbench moved unchanged to `/legacy.html` for Stream, Import/Split round-trip and Stage until P002/P004; dev redirect pages point there.

## Reused

`library.ts` filter and `locateDiagnostics`/`selectionFor` (now typed for compiler and importer diagnostics), its tests, the Studio typecheck config and the CDP smoke harness, all from commit 2d08de0. The rejected layout was not reused.

## Not claimed

No human acceptance of the visual design yet. Stream mode (P002), Split (P004), Performance (P003) and the Library page (P014) are not part of this run.
