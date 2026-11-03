# P027 Generate panel tooling

Run: `3772eb1b-1d1f-48fb-95a0-44c727f31e53`. Issue: [#184](https://github.com/danielyekini/generative-virtual-runtime/issues/184).
Base: `deff11e` (main after P025).

The Generate side panel's "Copy chat" button is replaced by a ⋯ menu with two
entries. **Copy ›** opens a granularity submenu: human prompts, MotionScript
programs (both on by default, same payload as the old button), director
responses, system prompts, retry/repair attempts and generation logs. Each turn
now keeps its implement output per attempt, a timed pipeline log (phase changes,
metrics line, pipeline notes) and the system prompts it was generated with, so
the copy reflects what that turn actually used. **System prompts…** opens an
editor in place of the transcript for the Director and MotionScript prompts.
Edits are session-local (reset on reload), marked "edited · session only", and
Reset restores the bundled default. The pipeline accepts a `directorSystem`
override for this; its default is unchanged.

Opening a program from the Library while in Generate leaves Generate and shows
it in Source. The model selector is greyed and Send is inactive until the
selected model answers the readiness probe; Studio re-probes every 5 s while
the model is unavailable. A typed prompt is kept while Send is blocked.

Verification (exit 0):
- `npm run verify`: 86 Vitest files / 567 tests, typechecks, Studio build, IR
  manifest, 33 operations tests, capability reference `ms-0.22.0_sir-0.22.0`.
- `npm run smoke:studio`: 136/136, including the blocked→ready model gate (with
  a stubbed tags response), menu placement, default copy parts, copied payload,
  system-prompt edit/switch/reset, and the Library exit to Source.

Not done here: a human pass against live Ollama, and no persistence for edited
prompts (studio-ux defers that to a later ticket). No language, registry or
deployment change.
