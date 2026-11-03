# Engine run 7d32a0ce: E038 paint.strokeDash (MotionScript / Scene IR 0.21.0)

## Outcome

Complete. A stroke may carry a dash array and phase when a program requires `paint.strokeDash`.

- **Language:** MotionScript / Scene IR **0.21.0**, capability `paint.strokeDash`, wire `"0.2"`. `dash` and `phase` match by spelling and are not reserved words. Opt in with `requires "paint.strokeDash"`.
- **Decision:** `docs/decisions/engine/path-progress-geometry-authoring.md` (E038). `stroke … dash (a, b) phase n` lowers to `Stroke.dash` and `Stroke.phase`. `Node.stroke.phase` animates the offset and needs a dash on that node. The renderer calls `setLineDash` and sets `lineDashOffset`. Spatial projection scales the dash and phase with stroke width.
- **Solid strokes:** programs that omit `dash` stay on the 0.20 reader and do not require this capability.
- **Studio:** Library preset `fixtures/motionscript/stroke-dash.ms` (`stroke-dash`) shows an 18/10 dash whose phase runs one pattern length over 2 seconds.
- **Verify:** `npm run verify` passed (550 tests, typecheck, Studio build, IR manifest, operations tests, capability index, reference check `ms-0.21.0_sir-0.21.0` fingerprint `b3a6c38e`).

## Not in this release

Variable width profiles, using dashes as a substitute for trim, treating the geometry `dashCommands` helper as the paint claim, and Lottie or SVG dash import.
