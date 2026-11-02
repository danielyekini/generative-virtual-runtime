# Engine run 99a8c7a8: E007 native input decision + E025 `input.bindings`

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

---

## E025: `input.bindings` (MotionScript / Scene IR 0.10.0)

[Issue #100](https://github.com/danielyekini/generative-virtual-runtime/issues/100).
Measured implementation: `0fa38e22c76caddfebe321838f842d360892eb04` (clean tree);
base `2d2b64a908a352f655ed813d22b9e7c99a98ef36` (E007 merge).

`interact` declarations (only new reserved word) lower to scene / `CREATE_SCENE`
`interactions`; actions `set` / `toggle` / `step` / `dragTranslate` on
position.x/y, rotation, scale.x/y, opacity. Declared channels are exclusively
input-owned: tracks on the same scalar fail `OVERLAPPING_WRITERS`. Validator
requires `input.bindings`; frozen after first seal; forward targets defer.
`createSceneInputSession` seeds values from authored bases and converts drag
deltas into parent space; `AnimationRuntime.evaluate(t, overlay)`;
`logicalPointFromCss`. Studio player routes pointer/wheel/key events and uses
`wrapFocus: false` so Tab leaves the canvas at either end.
[MotionScript 0.10.0](../../../languages/motionscript/versions/0.10.0.md),
[Scene IR 0.10.0](../../../languages/scene-ir/versions/0.10.0.md), registry row
`input.bindings`.

Verification: `npm run verify` **exit 0** on the measured commit: 332 tests / 47
files (8 compiler/schema conformance in `interact.test.ts`, 3 runtime in
`input-bindings.test.ts`, 1 added focus-wrap test), all typechecks, Studio build,
21 IR fixtures, 33 ops tests, capability index fresh. Built Studio in headless
Chromium (Playwright, `vite preview`): uploaded program ran with no
diagnostics; canvas click toggled `Lamp` opacity 0.2→1; drag of +40,+20 CSS-
mapped logical units moved a dot under a 2× parent by exactly +40,+20 logical;
Tab then Enter on the canvas toggled back to 0.2; a second Tab released focus
to the next page control. Not run: physical touch devices, screen readers.
