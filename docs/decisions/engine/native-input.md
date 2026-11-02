# Native input, hit-testing, focus and bounded state actions (E007)

Decision: 2 November 2026. [Issue #26](https://github.com/danielyekini/generative-virtual-runtime/issues/26).
Decision + narrow runtime demonstrator. No MotionScript / Scene IR version bump
and no registry claim: `@gvr/runtime` `InputSession` / `hitTest` are a host-level
prototype (`packages/runtime/src/input.ts`, tests in `input.test.ts`). Language
wiring is the follow-up implementation item named below.

## Requirement

M4 needs interactive miniature programs: a learner presses, drags, scrolls or
tabs to an object and a bounded state change follows, without the generated
program owning arbitrary code. Inputs must target what is actually painted,
coexist with generative tracks and behaviours under E002 exclusive channel
ownership, survive streaming topology changes, and be replayable for tests,
Studio inspection and teaching transcripts.

## Alternatives

1. **Host DOM overlay** (status quo: Studio places HTML elements over the canvas).
   Strongest existing-system option and accessible by default. Rejected as the
   engine contract: overlay boxes drift from rotated/curved/occluded painted
   geometry, duplicate the scene graph per host, and give no deterministic replay
   or channel ownership. Hosts may still mirror focusable targets into an
   accessibility tree (see revisit).
2. **Bounding-box hit-testing in Scene IR + free-form event scripts.** Cheap, but
   wrong for rotated, rounded, hollow and even-odd shapes, and scripts are a new
   execution model (compatibility policy requires a separate design decision).
3. **Painted-geometry hit-testing over the resolved frame + a bounded action set
   writing input-owned channels** (chosen). Hit-testing reads the same
   `ResolvedFrame` draw items the renderer paints, so what you see is what you
   hit. Actions are data (`set`, `toggle`, `step`, `dragTranslate`) and write only
   channels granted to the `input` writer class through `EntityRevisionStore`.
4. **GPU colour-picking buffer.** Exact per pixel but renderer-specific,
   asynchronous and unavailable headless; rejected for the contract, kept as a
   possible accelerator behind the same API.

## Contract (implementation-bound)

- **Hit space.** Logical viewport coordinates (the space `logicalMatrix` maps
  into; world items include the camera, screen-space items do not). Hosts undo
  their letterbox/device scaling before calling in.
- **Hit region = painted geometry.** Fill interior when a fill is present
  (rect with corner radius, circle, ellipse, polygon nonzero, path by its
  `fillRule`), stroke band of half the stroke width (+ optional viewport-unit
  slop) when stroked, lines by stroke only. Images hit their rectangle. Text hits
  its measured box (host `measureText`), else a conservative em-box estimate.
  Curves flatten at 16 segments: precision is bounded, not exact. Group effects
  (blur, shadow) never enlarge hit regions.
- **Visibility and occlusion.** Hidden nodes have no draw item and never hit.
  Items with resolved opacity ≤ `minOpacity` (default 0) do not hit. The topmost
  painted item (highest paint index) occludes everything beneath; a target marked
  `pointer: "none"` paints without taking or blocking input.
- **Dispatch.** A hit bubbles to the nearest registered target by structural
  id ancestry (`Panel.Button` → `Panel`). Unregistered painted items still occlude.
- **Capture.** `pointerdown` captures the pointer to its target. While captured,
  moves are delivered to that target and hover is pinned to it; `pointerup`
  releases and recomputes hover. One active capture in this prototype.
- **Gestures.** Click = down and up on the same target without exceeding the
  drag threshold (default 4 logical units). Beyond the threshold the gesture is a
  drag (`dragstart`, `drag` deltas, `dragend`) and produces no click. Wheel goes
  to the target under the pointer (not capture); with `ctrlKey` it is reported as
  `zoom` with factor `exp(-deltaY × 0.002)`. Wheel bindings step once per event by
  sign so device delta magnitude cannot amplify state changes.
- **Focus and keyboard.** Focusable targets form a tab order by `tabIndex`, then
  registration order, restricted to live targets; Tab/Shift+Tab wrap. Pressing a
  focusable target focuses it; pressing anything else clears focus. Keys go to
  the focused target; Enter/Space emit `activate` and run click bindings, so
  every pointer action has a keyboard equivalent.
- **Event ordering.** Events are processed strictly in arrival order, each with
  the frame resolved at its `sceneTimeMs` (mismatched frames fail closed). Within
  one event, signals are emitted in this order: lifetime releases
  (`capturelost`, `leave`, `blur` with reason `removed`), hover changes, focus
  changes, gesture signals, then `write` / `rejected` from bindings.
- **Object lifetime.** A target is live while it or a descendant has a draw item
  in the current frame. When it disappears (removal, hidden, streaming edit),
  capture, hover and focus release with reason `removed` before the next event
  is routed; no further drag writes reach it.
- **Channel ownership.** Actions write only `(entity, channel)` pairs with an
  active `writerClass: "input"` grant at the event time (E002 exclusive
  ownership). Otherwise the write is rejected with `INPUT_NOT_OWNER` and state is
  unchanged. Input-owned values are applied over the sampled scene only while the
  grant is active (`InputSession.applyTo`), so revocation restores the authored or
  generative value. Prototype channels: `transform.position.x/y`,
  `transform.rotation`, `transform.scale.x/y`, `opacity`.
- **Bounded actions.** `set`, `toggle` (two values), `step` (delta clamped to
  `[min, max]`), `dragTranslate` (both position axes must be owned before either
  moves; clamped to bounds). No loops, expressions, cross-scene scripts or timers.
  `dragTranslate` applies viewport deltas directly: correct for parents without
  rotation/scale and camera zoom 1; a scaled parent needs the follow-up's
  parent-space conversion.
- **Replay.** Output depends only on the event sequence, frames and options. The
  session keeps a bounded log (`maxLog`, default 4096, oldest dropped) and
  `replayInput` reproduces identical signals and state over equal frames.
  State snapshots are immutable copies; writes replace the value container.

## Critical pass

- *Streaming.* Hit-testing uses whatever frame the host presents; activation of
  removed/added entities after a seal is reflected via lifetime reconciliation.
  Input writes never touch accepted Scene IR or sealed history: they are an
  overlay gated by the revisioned ownership table.
- *Cancellation/dispose.* `dispose()` drops capture/hover/focus; disposed sessions
  throw. Store `cancelPending` discards uncommitted grants, so input cannot act on
  a grant that never committed.
- *Compatibility.* No wire, language or registry change; existing scenes render
  identically when no session is applied (`applyTo` returns the input sample when
  state is empty).
- *Failure cases covered by tests.* Occlusion and pass-through, rounded corners,
  rotation, even-odd holes, stroke-only shapes and slop, text metrics, zero
  opacity, capture beyond the target, drag clamping, wheel/zoom, Tab wrap,
  keyboard activation, unowned writes, grant revocation, removal mid-drag,
  mismatched frames, log bounds and replay equality.
- *Not covered.* Multi-touch/pinch (single capture only), clips and masks (owned
  by E012: clip regions must intersect hit regions when they land), IME/text
  entry, host accessibility mirroring, and paint channels as input targets.

## Child work

- **E025** ([#100](https://github.com/danielyekini/generative-virtual-runtime/issues/100)): version interaction targets and bindings in
  MotionScript / Scene IR (new capability token, registry rows, conformance
  tests), parent-space drag conversion, and Studio host wiring for pointer/key
  events. Paint channels and multi-pointer gestures are separate later scope.

## Revisit

If a story needs multi-pointer gestures, text entry, physics-driven drag or
priority (rather than exclusive) ownership between input and behaviours, record
a new bounded decision before widening writer classes. If clip/mask support
(E012) lands, extend hit regions in the same change. If host accessibility trees
diverge from engine focus order, the engine order wins and hosts mirror it.
