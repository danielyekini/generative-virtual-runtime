# Engine run 0c5c5285: E036 compositing.matte (MotionScript / Scene IR 0.19.0)

## Outcome

Complete. Bounded alpha track mattes landed.

- **Language:** MotionScript / Scene IR **0.19.0**, capability `compositing.matte`, wire `"0.2"`.
- **Decision:** `docs/decisions/engine/track-mattes.md` — `matte <nodeId>` keeps a group's pixels where another node's painted alpha is, including a group of shapes, text and images. Luma, invert and a feather property stay out. `compositing.mask` is unchanged.
- **Syntax:** group property `matte <nodeId>;` (reserved `matte`); implies an isolated scope. The source sits outside the group. Cycles and containment are rejected.
- **Runtime / renderer:** the scope carries a coverage tree. The canvas renderer uses a content buffer and a coverage buffer with `destination-in`, and withholds the scope when a buffer cannot be allocated. Hits use painted-geometry coverage, not partial fill alpha.
- **Studio:** Library preset `fixtures/motionscript/alpha-matte.ms` (`story:alpha-matte`). Ran in Studio: two circles and the word GO reveal the card; the gap stays background; diagnostics empty.
- **Verify:** `npm run verify` passed (537 tests, typecheck, Studio build, IR manifest, operations tests, capability index, reference check).

## Not in this release

Luma and inverted mattes, a feather property, and Lottie/SVG mask import.
