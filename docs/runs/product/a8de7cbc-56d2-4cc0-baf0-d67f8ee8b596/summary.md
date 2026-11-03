# P028 Generate streaming detail

Run: `a8de7cbc-56d2-4cc0-baf0-d67f8ee8b596`. Issue: [#182](https://github.com/danielyekini/generative-virtual-runtime/issues/182).
Measured implementation: `b06370bd73e4f57651f5ea1c338d80644b70c8aa` on base `64e28099efce4928948a3160bc9c8a819e65e8c8`.

Streaming redraws replaced every transcript bubble and rewrote the detail View
menu on each token, so presses that crossed a frame were lost and the open menu
could close or stick. The Output view showed whichever phase was writing, and
the director script was stored only when the pipeline finished, so Director
stayed “pending” while MotionScript was already on screen. User bubbles were
disabled buttons, which the shared disabled style drew at 45% opacity.

The transcript now updates the same bubble nodes. Detail opens on pointer
press. Director text is kept when implementation starts, and the body shows
only the selected stream. The View menu stays Output | Director and is left
alone while it is focused. The expanded detail is a bounded column, so its
body scrolls and keeps the reader’s place when they move up. User messages are
full-opacity text, not disabled controls.

Verification (exit 0):
- `npm run verify`: 85 Vitest files / 552 tests, package and Studio typechecks,
  production Studio build, IR manifest, 33 Python operations tests, capability
  reference check.
- `npm run smoke:studio`: 123/123 Chromium checks, including bubble identity
  across a streaming update, full-opacity user text, Output vs Director body,
  a stable Director option, and expanded-detail scroll.

No language, registry, or deployment change.
