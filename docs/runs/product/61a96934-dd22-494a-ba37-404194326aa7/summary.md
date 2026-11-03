# P026 Studio chrome polish

Run: `61a96934-dd22-494a-ba37-404194326aa7`. Issue: [#185](https://github.com/danielyekini/generative-virtual-runtime/issues/185).
Base: `c40f978` (main after P027).

- **Corner dual-resize.** A small square handle sits where the bottom dock's top
  edge meets the side panel's left edge. Dragging it changes the side-panel
  width and dock height together (same clamps as the single-axis edges:
  240 px–70% width, 96 px–70% height). It shows only while both the side panel
  and the dock are open, follows the edges after a resize, and is hidden in
  fullscreen. The single-axis edges still work independently.
- **Larger settings icon.** The status-bar ⚙ glyph (15 px text) is replaced by an
  18 px outline gear SVG; same button, label and upward menu.
- **Side-panel toggle.** `#toggle-source` is now `#toggle-side-panel`, labelled
  Open/Close side panel. In Source mode it opens/closes Source as before. In
  Generate it hides and re-shows the Generate panel without leaving Generate
  (previously it left Generate for Source). Generate's ✕ and the Generate
  button still leave Generate. The E shortcut does the same as the button.
- **Favicon.** `app/playground/public/favicon.svg` (GVR mark on the status-bar
  blue) is linked from the Player and legacy pages.

studio-ux.md records the Generate toggle behaviour, the corner handle and the
favicon.

Verification (exit 0):
- `npm run verify`: 88 Vitest files / 581 tests, all typechecks, Studio build,
  IR manifest, 33 operations tests, capability reference `ms-0.22.0_sir-0.22.0`.
- `npm run smoke:studio`: 143/143. New checks: toggle closes/reopens the Generate
  panel while staying in Generate, larger settings icon, favicon served, corner
  handle on the junction, a (−40, −30) px drag grows width by 40 and height by
  30, and the handle follows the edges.

Not done here: a human look at the handle's discoverability and the favicon.
No language, registry or deployment change.
