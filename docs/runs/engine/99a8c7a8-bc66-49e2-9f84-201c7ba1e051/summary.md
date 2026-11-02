# E007: native input, hit-testing, focus and bounded state actions

Run `99a8c7a8-bc66-49e2-9f84-201c7ba1e051`, 2 November 2026. [Issue #26](https://github.com/danielyekini/generative-virtual-runtime/issues/26).
Measured implementation: `d204ca69442ca93daeaa8ded8f2fadaee484e9bc` (clean tree at verification); base `57fe5a5b3fc3cb07924a5931b421d9c7dc82be2b`.

## Result

[Decision](../../../decisions/engine/native-input.md): hit-test painted geometry
of the resolved frame in logical viewport space (fill/stroke/rounded/rotated/
even-odd/text), topmost item occludes, `pointer: "none"` passes through, hits
bubble to the nearest registered target. `InputSession` routes capture, hover,
click vs drag threshold, wheel/ctrl-zoom, Tab focus order and Enter/Space
activation with a fixed per-event signal order; removed targets release
capture/hover/focus first. Bounded actions (`set`, `toggle`, `step`,
`dragTranslate`) write only channels with an active `input` grant in
`EntityRevisionStore`; others reject `INPUT_NOT_OWNER`. `applyTo` overlays
owned values on the production sample; revocation restores authored values.
Bounded log + `replayInput` reproduce identical signals/state.

No MotionScript / Scene IR version or registry claim. Follow-up E025
([#100](https://github.com/danielyekini/generative-virtual-runtime/issues/100))
versions the bindings and wires the Studio host.

## Verification

`npm run verify`: **exit 0** on the measured commit: 320 Vitest tests / 45
files (9 new in `packages/runtime/src/input.test.ts` over a compiled MotionScript
scene through `sampleScene` + `buildResolvedFrame`), all configured TypeScript
projects, Studio build, operations acceptance and reference freshness.
Historical Lottie certification and benchmarks not rerun (unaffected).

## Tracking

Project field writes are unavailable to this session (no Project API); board
status is recorded in issue handovers for reconciliation.
