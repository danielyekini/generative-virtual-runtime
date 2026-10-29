# A Circle in Motion: language proposal

Unevaluated retrospective, recorded 2026-10-29 by the agent that built the program. It is recurrence evidence, not a proposal in the [language proposal template](../../templates/language-proposal.md); see the [index](../README.md#what-these-proposals-are).

Evidence for this retrospective:
- Ran `build-a-circle-in-motion.ts` at commit `0d5b41d`. It compiles, validates and passes all of its draw-item checks.
- Made 57 renders through the real `CanvasRenderer` in headless Chromium (esbuild bundle of the workspace packages, loaded with Playwright, 1280 × 720, DPR 1). The times were 0, 0.75, 1.5, 1.75, 2.45, 3.4, 4.6, 5, 6.3, 7.5, 8.3, 9, 10, 10.7, 11.6, 12.5, 13.3, 14.5, 15, 15.5, 16, 16.5, 17, 17.2, 17.5, 18, 18.6, 19, 20, 21.5, 23, 23.4, 24, 24.6, 25, 25.4, 25.8, 26, 26.6, 27, 27.5, 28, 29, 29.999 and 30s; some times were rendered twice, before and after the camera fix below.
- Sampled `AnimationRuntime.evaluate` draw items for the numbers below.

The stills were looked at one by one; playback was not watched.

---

## 1. State of the result

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 42,008 bytes, 738 lines | `maxSourceBytes` 524,288 (8.0%) |
| Nodes | 49 | 500 |
| Tracks | 50 | 1,000 |
| Steps | 58 | 1,000 |
| Static geometry items | 105 path commands | 10,000 |
| Path-key commands | 656 across 240 path key values | not budgeted |
| Deepest node | `body.turn.hands.pondL`, depth 4 | 16 |
| Compile, Node | 170–250 ms (five runs: 249, 175, 178, 174, 170) | |
| Compile, headless Chromium | 134–274 ms over four page loads | |
| Evaluate | 0.75 ms per frame (1,800 frames at 60 fps) | |
| Builder run | 0.42–0.51 s internal, 0.93–1.00 s wall with `tsx` start-up | |

**The structure.** One path node, `body.turn.ring`, carries the main form for all thirty seconds. It is an even-odd pair of four-cubic contours:
- With the inner contour collapsed to a point, it is a solid drop or sun.
- With the inner contour opened, it is the ripple, the clock rim and the tyre.

All 15 of its keys share one command sequence (`M C C C C Z M C C C C Z`). The two halves of the pond line, `pondL` and `pondR`, become the clock hands and then the first two spokes. Each of the twelve ticks is one path that grows into a spoke. Nothing is swapped mid-film except at the loop boundary (see below).

**What matches the script, measured on draw items.**
- **0:00–0:05**
  - The drop starts at the upper centre (tip at y = 274.7, x = 640).
  - It accelerates: the tip falls 53 px in 0–0.5s and 65 px in 0.5–1.0s.
  - It stretches as it falls, and its tip meets the pond at exactly 1.5s (470.00 against 470.00).
  - It compresses into a 68 × 18 oval at 1.75s.
  - An attached rebound column 34 px tall rises at 2.45s and is gone by 3.4s.
  - The ripple expands with easeOut: 223 px wide at 3s, 300 px at 4.6s. Its interior clears into a closed outline (inner contour 98% of the outer).
  - It starts tilting before 5s: height 80 px at 4.6s, 88.5 px at 5s.
- **0:05–0:10**
  - The ellipse becomes a face-on circle by 7.5s (359.2 × 359.2 px).
  - The pond retracts to its two intersections with the circle.
  - The halves bend (quadratic, lagging control point; still 8.3s) into hands at 305° and 60°, ten past ten, by 9s.
  - Twelve ticks grow inward from the rim, from 7.6s to 9.0s.
  - A centre cap joins the hands. Hold from 9s to 10s.
- **0:10–0:15**
  - The hands accelerate clockwise through 375° (10.0–11.4s) and extend to the rim.
  - The ticks lengthen to the hub. All 14 spokes are complete by 12.46s, which is checked at 12.5s.
  - The rim thickens into a 14-unit tyre, and a 1.6-px inner rim separates from its inner edge (11.6–12.4s).
  - Four strokes grow out of the front hub: fork and bars, down tube and chainstay, seat tube and saddle, and top tube and seat stay. The seat-stay stroke continues around a rear wheel that closes at 14.0s.
  - The wheel stays on the right. Bicycle hold from 14.0s to 15.0s.
- **0:15–0:20**
  - The bicycle rolls right without slip, two turns of the tyre over 1,973 world units.
  - The camera tracks the wheel: its screen centre stays between x = 810 and 906 from 15.0s to 16.5s, then settles at 640 by 18.75s.
  - The frame strokes retract into the hub between 15.5s and 17.3s. The rear wheel opens at its junction with the seat stay and withdraws around itself, then along the frame.
  - The spokes shorten while the hub grows into a disc (16.6–18.0s). The tyre's inner contour collapses under the disc by 18.6s, leaving a solid sun.
  - The horizon draws across from 17.0s to 18.6s.
  - The disc dips 28 units by 18.9s, then rises from 18.9s.
- **0:20–0:25**
  - The sun's centre rises from y = 457 (19.0s) to 225 (23.4s), with a linear segment from 19.9s to 22.4s. Its bottom clears the horizon (y = 486) at about 21.1s.
  - It is centred horizontally (checked at 20, 22.5 and 24.5s).
  - Twelve rays extend from 21.0s to 22.6s and curve upward from 23s.
  - The upper edge draws into a rounded point from 24.0s; the sun is 4% taller with the same bottom by 24.9s.
- **0:25–0:30**
  - The rays retract into the moving outline by 26.6s, and the sun narrows into the drop by 26.6s.
  - The horizon shifts down into the pond from 25s to 28s.
  - A half turn (27.0–28.0s) points the tip down.
  - From 28s the drop falls along the same parabola that the opening continues.
- **Loop boundary**
  - At 0s and 30s the drop matches: tip y 274.690 against 274.693, and 39.06 × 62.35 px on both sides.
  - Speed: one-sided 50 ms differences give 93.5 px/s before the boundary and 95.9 px/s after it, against an analytic 94.7 px/s.
  - The pond spans the same pixels. A Chromium render of 0s against 30s differs by at most 44/255 on 4 antialiased pixels, and on none by more than 64.

**What was simplified or differs, and why.**
- **Sound is six screen-space captions** in a muted italic at y = 688 ("sound · one soft water plink", and so on), each inside its beat. None is shown at 0s or 30s, so the loop stays clean. MotionScript has no audio.
- **The pond becomes the horizon only at the loop boundary.** The pond halves turn into hands inside the rotating wheel group, so a separate world node, `horizon`, plays the pond at 30s. The swap is invisible in the render (diff above), but it is a swap, not one continuous contour.
- **The disc does not really go behind the horizon.** It is covered by `ground`, a background-coloured rectangle whose width grows with the horizon's trim. This works only because the background is flat; masks are not released.
- **The rear wheel opens where the seat stay meets it** (upper right, about 51° above the horizontal), not at its top. The script also asks that the gap withdraw "along the frame". That forced the wheel and the frame to be one stroke, and a single trim window can only open that stroke at one end.
- **Spokes have two weights.** The two hand-spokes keep the hands' 3 px, and the tick-spokes are 2.5 px. Stroke width cannot be animated, so a hand cannot thin into a spoke. The pond is also 3 px, a little heavier than "thin" because it has to match the hands.
- **The tyre thickens by geometry, not stroke.** The ring's two contours move apart (152/148 → 157/143).
- **The rays lift uniformly toward the top of the screen.** On the lower half they therefore hook back toward the disc (stills 24.6s, 25s). This is one reading of "curve subtly upward".
- **"Rise steadily for three seconds" is 2.5s linear** (19.9–22.4s), inside an ease-in from the dip and an ease-out into the hold at 23.4s.
- **The hand spin uses easeInOut.** It accelerates and then slows to land as spokes; the script names only the acceleration.

**What is wrong or unverified.**
- **Playback was not watched.** Two motions are untested for strobing at 60 fps: the 375° hand spin peaks near 540°/s, and the two-turn roll near 450°/s with fourteen spokes.
- **The 8.3s bend reads as a shallow downward V** rather than clearly "inward". This is a matter of judgement, not measurement.
- **The horizon starts drawing at the left edge of the frame at 17.0s** (still 17.2s) while the wheel is still right of centre. It reads as a stray short stroke for about 0.3s.
- **The builder's on-screen check uses anchor points with a 4 px pad,** not stroke extents. It passed a camera that had pushed the wheel to within about 15 px of the right edge (below).

## 2. Hardest and most error-prone aspects

Ranked by time and risk.

**1. Keeping one morph topology for the whole film.**
- *Evidence:*
  - The ring has 15 keys, and every key must keep anchor order A0 right, A1 bottom, A2 left, A3 top.
  - The sun-to-drop phase needs the point at the top. The rest drop rotated half a turn starts its contour at a different anchor, so the builder re-indexes the contour (`pointUp()`: rotate 180°, then shift two segments) so that the morph doesn't fold.
  - A half turn cannot be a morph either. Path morph is linear in control points, so interpolating a 180° rotation collapses the shape to a line at the midpoint. The turn is a group rotation instead.
  - That couples it to the wheel: `body.turn.rotation` runs 0 → 720° (roll) → 900° (half turn). The roll must be whole turns so the teardrop forms upright, and the final local shape must be the inverse rotation of the opening drop.
- *Root cause:* language. Path morph is per-control-point lerp with a fixed command sequence, and there is no stroke-width channel, so the outline is a filled ring. Choosing to put every form on one node was my implementation choice.
- *Workaround:* a contour helper with a fixed anchor order and an explicit re-index. Draw-item checks confirm point-up at 26.8s, point-down at 28s and the opening size at 28s.

**2. Continuity across the loop boundary.**
- *Evidence:*
  - The fall spans 28s → 30s ≡ 0s → 1.5s, but tracks end at 30s.
  - The builder writes the fall as two segments. The first is easeIn, which is exactly t² from rest. The second is `cubic(0.3333, 0.2424, 0.6667, 0.5758)`, which I derived by hand as the cubic form of the parabola from τ = 2 to τ = 3.5.
  - Stretch and centre had to be made affine in distance fallen, so one path key at each end of a segment is exact between them.
  - The pond-to-horizon swap needs separate checks at 29.999s and 30s.
- *Root cause:* language and runtime. A programme has no notion of looping, and a segment cannot cross the end. Also my choice to put the fall in path coordinates at the start and in body position at the end.
- *Workaround:* the hand-derived easing; checks that compare 0s with 30s for position, size, speed and pond extent; and the pixel diff.

**3. Camera follow, found only in stills.**
- *Evidence:* the first version lagged the wheel by 0.35s. At 16.5s the wheel's right edge was at about x = 1,253 of 1,280 (still 16.5 of the first contact sheet). The builder's check passed. With a 0.15s lag the wheel stays between x = 810 and 906 (right edge at most 1,010).
- *Root cause:* tooling, plus the language having no follow constraint. Camera x is 16 sampled keys (15–18.75s) built from a lagged copy of the body track.
- *Workaround:* a smaller lag, found by looking at the render.

**4. Values that must stay in step with each other.**
- *Evidence:* three couplings are held together only because the builder gives the coupled tracks identical key times and easings:
  - Rolling: `body.position.x` and `body.turn.rotation`.
  - Rays riding the morphing outline: each ray is anchored at a fixed Bézier parameter on the ring, which is exact only because ray and ring keys coincide at 24, 25 and 26.6s.
  - Spokes shrinking inside the growing hub: the builder re-implements the runtime's easing (`sampleKeys`) to find the hub radius at 17.5s.
- *Root cause:* language. No channel can read another. This is the most frequent theme in the index.
- *Workaround:* shared key lists in the builder.

**5. Occlusion without masks.**
- *Evidence:* the sun dipping behind the horizon is the `ground` rectangle, filled with the background colour. Its `scale.x` track copies the horizon's `trim.end` keys. They agree only because the horizon is straight, so the trim fraction equals the width fraction.
- *Root cause:* language. `compositing.mask` and `compositing.matte` are pending.
- *Workaround:* the plate is shown from 17s to 25s only.

**6. Visibility bookkeeping and an unhelpful step diagnostic.**
- *Evidence:*
  - The first compile produced 58 copies of `INVALID_TRACK_TARGET: A step can write only a node's visible property`. I had written `step body.turn.hub { … }`; the target must be `body.turn.hub.visible`. The grammar's `target` accepts any address, and the message does not name the fix.
  - 24 of the 58 steps hide rays before they grow, as a guard against zero-length round caps drawing dots. I then measured in Chromium that a zero-length round-capped line or quadratic draws nothing (alpha 0). The SVG preview path may differ: SVG specifies that round caps on zero-length subpaths are painted. That is **hypothesis**; it was not tested here.
- *Root cause:* a compiler diagnostic, and renderer behaviour that the contract does not specify.
- *Workaround:* the `.visible` suffix; the steps were kept.

**7. Static stroke width.**
- *Evidence:* the hands cannot thin into spokes (3 px against 2.5 px). The pond cannot start finer than the hands it becomes. The tyre has to be a filled ring.
- *Root cause:* language. There is no `stroke.width` channel in `NODE_CHANNELS`.
- *Workaround:* compromise widths.

**8. Smaller items.**
- **Trimmed paths are flattened.** Trim returns a polyline of 8 samples per cubic. The rear wheel was built from eight 45° arcs to keep the computed sagitta near 0.17 px; that was not measured visually.
- **My own check errors** cost two builder runs: a teardrop ratio and a tick spoke window that ended at 12.78s. The script asks for 12.5s; the window was moved to 12.46s.
- **`validateSceneIR` returns `{ ok: true }` with no `diagnostics` field,** which the copied builder pattern indexed.

## 3. Suggested improvements

### GVR fixes and tooling, no language change

1. **Step diagnostic.** When a step target has no channel, suggest `<target>.visible`.
   - *Removes:* the 58-error first compile.
   - *Recurs:* with the reserved-keyword and cascading-diagnostic themes.
2. **Shared story tooling.** Three pieces:
   - The helpers every builder copies: `track` / `percent`, flatten, screen extents, an on-screen check that includes stroke width.
   - A real-renderer contact sheet. For this story it was about 40 lines: esbuild aliases for the four workspace packages, plus Playwright.
   - A loop-boundary check that compares `evaluate(0)` with `evaluate(duration)` as draw items and pixels.

   *Removes:* roughly 200 lines of copied helpers here, and the camera miss in aspect 3 (a stroke-aware margin check with a contact sheet would have shown it on the first run). *Recurs:* Blue, Clockwork, MotionScript→Motion and Crane.
3. **Specify zero-length subpath caps** in the renderer contract, so Canvas and the SVG adapter agree. Removes precautionary steps like the 24 here.

### Experiments using the current language

1. **A vec2 camera track with spatial tangents** in place of 16 sampled x keys. Measure the framing error against the wheel. Blue suggested the same experiment.
2. **Local timing scopes for staggered sets.** Ticks and rays repeat one key shape shifted by 0.1s or 0.06s per item, so a scope with an offset might share a schedule. They differ in geometry, so the expected saving is the key times only. **Hypothesis.**
3. **Two concentric strokes against the even-odd ring** for the outline phases. Compare morph-key bytes and visual weight. If they match, the ring would need only one contour, at the cost of a fill/stroke hand-off for drop and sun.

### Language proposals

Each needs the template, conformance tests, a registry row and a version note.

1. **Channel binding / drivers.** Examples: `rotation = position.x / 157` for rolling; a point bound to a contour parameter for the rays; a radius bound to another node's scale for the spokes.
   - *Removes:* the shared-key convention in aspect 4 and the builder's runtime mirror.
   - *Allows:* a more detailed version with uneven pedalling speed and rays that track an outline with different key times.
   - *Recurs:* the most frequent theme (seven stories before this one). A general expression reference may need a design decision on evaluation order.
2. **Animated stroke width** (`stroke.width` on path, line, circle and ellipse nodes).
   - *Removes:* the two spoke weights, the heavy pond and the filled-ring workaround for the tyre.
   - *Allows:* hands that thin into spokes; a pond that thins into a hairline; a tyre that swells as a stroke.
   - *Status:* not pending and not raised by an earlier story; `paint.animatedSolidFill` in `pending.md` covers fill colour only. One story is weak evidence.
3. **Masks or mattes** (`compositing.mask` / `compositing.matte`, pending).
   - *Removes:* the background-coloured plate and its coupled scale track.
   - *Allows:* a textured or gradient sky behind a sun that really sets behind the horizon.
   - *Recurs:* Moon.
4. **Loop-aware timelines:** a looping programme where a segment may wrap from the last key to the first.
   - *Removes:* the hand-derived second-segment cubic, the split of the fall between body position and path coordinates, and the 29.999s/30s special cases.
   - *Allows:* any seamless cycle without solving boundary derivatives by hand.
   - *Status:* this changes sampling rules, so it would be a Scene IR change, and it needs a design decision on what "before the first key" means. It is not routine.
5. **Rotation-aware or polar path morph:** interpolate a contour's rotation about a point rather than lerping control points. This would let one node turn its point from up to down without borrowing the wheel's group rotation, and so remove the coupling in aspect 1. This changes morph semantics and needs a design decision. Before proposing it, try a nested group whose pivot is animated.

## 4. Priority

- **Fix now:** the step diagnostic, and the shared tooling (stroke-aware on-screen checks, contact sheet, loop-boundary check). They are cheap, change no language, and would have caught the one layout defect found here only by eye.
- **Experiment next:**
  - The spatial camera track.
  - Timing scopes for staggered ticks and rays.
  - A recorded comparison of the even-odd ring against two strokes.
  - A specification of zero-length cap behaviour, with an SVG adapter test.
- **Defer:**
  - Animated stroke width, until another story needs it.
  - Masks and mattes, already pending; this story adds one more instance.
  - Drivers, already the top theme; this story adds three couplings as evidence.
  - Loop-aware timelines and rotation-aware morph, which both need design decisions.
