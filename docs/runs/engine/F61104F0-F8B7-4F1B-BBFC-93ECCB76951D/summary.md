# Engine run F61104F0: E039 path attachment space (MotionScript / Scene IR 0.22.0)

## Outcome

Complete. `attach` follows the path as drawn. Stored scenes that do not require `geometry.pathSpace` keep the 0.17 path-local placement.

- **Language:** MotionScript / Scene IR **0.22.0**, capability `geometry.pathSpace`, wire `"0.2"`. No new syntax. The compiler adds the capability beside `geometry.pathProgress`.
- **Decision:** `docs/decisions/engine/path-attachment-space.md` (E039). The command point is mapped by `inverse(traveller parent world) × path world`, using the sampled local matrix and `transformParentId` when set. The camera is not included. `rollRadius` stays command-space arc length.
- **0.17 scenes:** omitting `geometry.pathSpace` still writes the command point straight into `transform.position`.
- **Studio:** Library preset `fixtures/motionscript/path-space.ms` (`path-space`). The arrow is not a child of the moving parent; the rail also rotates.
- **Verify:** `npm run verify` passed (554 tests, typecheck, Studio build, IR manifest, operations tests, capability index, reference check `ms-0.22.0_sir-0.22.0` fingerprint `6f2c34fe`).

## Not in this release

Standalone `transform.autoOrient`, stroke width profiles, pivot compensation, rolling that follows scaled arc length, and Lottie or SVG import.
