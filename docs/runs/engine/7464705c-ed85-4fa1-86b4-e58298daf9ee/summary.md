# Engine run 7464705c: E041 text.layoutMetrics (MotionScript / Scene IR 0.20.0)

## Outcome

Complete. Builtin text boxes are measured when a program requires `text.layoutMetrics`.

- **Language:** MotionScript / Scene IR **0.20.0**, capability `text.layoutMetrics`, wire `"0.2"`. No new syntax or reserved words. Opt in with `requires "text.layoutMetrics"`.
- **Decision:** `docs/decisions/engine/dynamic-text-and-metrics.md` (E041). Builtin `sans` advances and align/baseline boxes feed hit-testing and spatial text outlines. Scenes without the capability keep the legacy 0.6em box. A host `measureText` callback still overrides the hit box.
- **Readiness:** family `sans` is ready in-process. Other families use a 0.6em advance. Custom font URLs and load holds stay out.
- **Studio:** Library preset `fixtures/motionscript/text-layout.ms` (`text-layout`) shows narrow `III` beside wide `WWW` at the same font size.
- **Verify:** `npm run verify` passed (544 tests, typecheck, Studio build, IR manifest, operations tests, capability index, reference check `ms-0.20.0_sir-0.20.0`).

## Not in this release

`text.animators`, wrapping / multi-line text, billboard labels, and Lottie/SVG font-metric import.
