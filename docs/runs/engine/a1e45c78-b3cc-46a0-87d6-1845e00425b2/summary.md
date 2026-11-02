# Engine run a1e45c78: E008 audible media clock decision + prototype

Run `a1e45c78-b3cc-46a0-87d6-1845e00425b2`, 2 November 2026. [Issue #27](https://github.com/danielyekini/generative-virtual-runtime/issues/27).
Measured implementation: `d4f5d63ec8fd110859799ac2d9e4a77298d3c9d6` (clean tree at verification); base `1380b97eb253a5d2dbe759e0a0c410445cd78495`.

## Result

[Decision](../../../decisions/engine/audible-media-clock.md): scene time from
`PlaybackClock` stays master; audio is a pure schedule over scene time
(`voicesAt`: narration/effects/music buses, loop iterations as separate voice
keys, linear fades, narration ducking). `AudioSession.sync` reconciles desired
voices against a host `AudioBackend` with start/stop/gain/rate commands and
re-seeks on discontinuities (backward motion, host `seeked`, wall-time vs scene
progress) or measured drift beyond 40 ms. Silent outside `playing` and outside
rate [0.5, 2] (reverse included). Required (narration) resources pending in the
lookahead hold the clock and resume at the same scene time; failed required
resources report blocking readiness; optional unready cues are skipped with a
diagnostic. Streamed cues append after seals; interaction one-shots are
scheduled and logged. `stopAll` / `dispose` (release). `mixAudio` + `encodeWav`
export deterministically through the same gain/offset functions.

No MotionScript / Scene IR version or registry claim. Follow-up E026
([#103](https://github.com/danielyekini/generative-virtual-runtime/issues/103))
versions audio resources/cues and wires a Studio Web Audio backend with P009.

## Verification

`npm run verify`: **exit 0** on the measured commit: 343 Vitest tests / 48 files
(11 new in `packages/runtime/src/audio.test.ts`, driving the real
`PlaybackClock` through hold/pause/seek/resume/loop/complete/streaming wait and
comparing live voice gains/offsets to exported samples), all configured
TypeScript projects, Studio build, IR fixtures, 33 ops tests, capability index
fresh. Not run: real audio devices / Web Audio (no host backend yet; E026).
Historical Lottie certification and benchmarks not rerun (unaffected).

## Tracking

Project field writes are unavailable to this session (no Project API); board
status is recorded in issue bodies/handovers and mirrored by the Project board
sync workflow.
