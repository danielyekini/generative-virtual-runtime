# @gvr/motionscript-emitter

Before editing this package, read the root `AGENTS.md`, `packages/schema/capabilities/releases.json`, the current MotionScript version file, and `docs/languages/compatibility-policy.md`.

Emit must round-trip the current language. A new construct in the emitter is a language change only when the grammar or its meaning changes; otherwise keep the version and add the test.
