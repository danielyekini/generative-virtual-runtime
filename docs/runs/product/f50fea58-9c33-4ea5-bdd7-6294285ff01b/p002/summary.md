# P002 — current-program Stream mode

Source measured: clean code commit `da7154fde0b73ad88c92f4fa8c6f77b0fe953166`, integrated with main `e5618f4de3efa06bef919c5b47fb29c526ccbcd3` (E006). Evidence-only additions follow this revision. Issue: #43. Run: f50fea58-9c33-4ea5-bdd7-6294285ff01b.

- `npm run verify`: exit 0; 45 test files / 309 tests; complete typechecks; Studio production build; 30 IR fixtures; 33 operations tests; current-capability freshness.
- `npm run smoke:studio`: exit 0; **94/94** real Chromium checks (see summary.json). Existing Player/Library/Split/import workflows pass. New coverage: partial current-draft arrival with Unicode, exact arrived-only text, Worker pause/step, Advanced controls and scheduled stalls, completion, orange/white source states after seek, replay, desktop/narrow layout, leaving Stream and import cancellation, diagnostic rejection cues. No page exceptions.
- Screenshots: arriving/Advanced controls, resolved source, rejected source and narrow-screen playback.
- Adapter tests compare streamed/instant resolved frames at five scene times (only the revision identity differs), preserve exact text and UTF-8 counters, and exercise diagnostics and teardown.

Arrival is simulated, not model generation. One outstanding bounded Worker chunk; compilation and evaluation remain on the main thread. Colours reflect declaration spans and accepted seals, not invented per-line frames. The tape is still a sealed-range track; the filmstrip is separately scoped in P016 #71. No deployment or package publication.
