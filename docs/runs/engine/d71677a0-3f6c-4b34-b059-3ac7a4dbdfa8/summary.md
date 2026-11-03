# Engine run d71677a0: E012 compositing.mask (MotionScript / Scene IR 0.16.0)

## Outcome

Complete. Clip-first scoped compositing landed.

- **Language:** MotionScript / Scene IR **0.16.0**, capability `compositing.mask`, wire `"0.2"`.
- **Decision:** `docs/decisions/engine/scoped-clip-compositing.md` — path clip on group scopes; track mattes deferred as E036 (#156).
- **Syntax:** group property `clip <geometryNodeId>;` (reserved `clip`); implies isolated scope.
- **Runtime / renderer:** render-tree scopes carry resolved clip outlines; Canvas `clip()`; hit-testing rejects points outside ancestor clips.
- **Studio:** Library preset `fixtures/motionscript/clip-mask.ms`.
- **Verify:** `npm run verify` passed after rebase onto main.

## Not in this release

Track mattes, alpha/luma masks, feathering, inverted clips, Lottie/SVG mask import.
