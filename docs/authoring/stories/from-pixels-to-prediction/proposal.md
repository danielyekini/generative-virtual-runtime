# From Pixels to Prediction: language proposal

Retrospective written after the implementation by the agent that built it, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). It changes nothing in the registry, a published version file or `pending.md`.

Evidence for this retrospective:
- The builder's own checks, which sample `AnimationRuntime.evaluate` draw items (not the builder's model) at every beat and pass at the committed program.
- 39 PNG stills drawn by the real `CanvasRenderer` in headless Chromium (Playwright's bundled Chromium), at 0.1, 0.7, 1.25, 1.33, 2.0, 2.66, 3.05, 4.0, 5.0, 6.0, 7.2, 8.7, 9.0, 10.0, 10.9, 11.5, 12.2, 12.9, 13.6, 14.5, 15.0, 16.0, 17.0, 18.2, 19.4, 20.0, 21.0, 21.9, 22.6, 23.4, 24.2, 25.0, 25.5, 26.0, 26.5, 27.0, 27.5, 28.0 and 29.95s. Run the builder with `GVR_PREVIEW_DIR` to reproduce them; they are not committed.
- A compile-time measurement and two direct calls into `trimCommands` and `compileMotionScript`, described where they are used.

Stills were looked at one by one; playback was not watched, and the playground page was not opened.

---

## 1. State of the result

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 107,977 bytes, 3,161 lines | `maxSourceBytes` 524,288 (21%) |
| Nodes | 390 | 500 (78%) |
| Tracks | 280 | 1,000 |
| Steps | 0 | 1,000 |
| Geometry items (path commands + polygon points) | 1,695 | 10,000 |
| Percentage keyframe literals | 1,386 | — |
| Compile, Node (`compileMotionScript`) | 6.4–6.9s over seven runs | — |
| Compile, headless Chromium | 4.3–5.2s over three runs | — |
| Builder run, without stills | 8.5–9.1s internal, 9.5s wall | — |
| Builder run, with 39 stills | 21.4s wall | — |

**What matches the script**
- **0–5s.** Close-up at zoom 2.8 on a stroked handwritten 7 (f00.10). A cyan scan bar sweeps the 28 × 28 grid in one second and the pixels appear in seven row bands behind it (f00.70, f01.25). Three pixels enlarge 5.5× in turn, between 1.0 and 3.0s, showing 1.00 (stroke), 0.61 (edge) and 0.00 (background) (f01.33, f02.00, f02.66). They return to the grid as cyan-outlined pixels (f03.05). The camera pulls back 3–5s; the image shrinks to the left while the network fades in to its right (f04.00), and the three inspected pixels draw guides to their input nodes by 5.0s (f05.00).
- **5–9s.** Six explicit pixel-to-input mappings; value chips travel along them, and every input disc reaches the brightness of its pixel by 7.1s. The builder checks all 14 to ±0.02. The “784 inputs” label and the “One input per pixel” bracket are present (f07.20). Guides fade by 8.6s, and the fan of 14 connections into one hidden neuron lights (f08.70, f09.00).
- **9–15s.** Push in to zoom 2.1 with the input column at the left edge; the builder checks the three source inputs sit left of 160 px. Three connections are isolated in cyan, orange and cyan, with “⋯ 781 more”. Pulses travel along them while `1.00 × 0.62 =`, `1.00 × −0.41 =` and `0.61 × 0.35 =` appear (f10.00, f10.90). The contributions, the omitted sum and the bias b = −0.18 move into a Σ in the neuron (f11.50, f12.20). z = 0.65 appears, followed by both formulas and a ReLU graph with the value on the positive branch. The neuron brightens to 0.65 and a ring pulses (f12.90, f13.60, f14.50). The arithmetic is checked: 0.62 − 0.41 + 0.21 + 0.41 − 0.18 = 0.65.
- **15–20s.** Pullback and a 60-unit track right. Hidden layer 1 lights in a varied pattern behind a flash of its signed incoming connections (f16.00, f17.00). Layer 2 follows; layer 1 and the inputs drop to 45% (f18.20, f19.40). The two captions appear in sequence, and the outgoing connections to the outputs brighten by 19.9s.
- **20–25s.** Scores appear beside the digits over 1.7s, positive in cyan and negative in orange (f21.00, f21.90), then slide into a Softmax block and fade (f22.60). Bars settle by 24.0s. Softmax of the displayed scores is computed and checked: 92% for 7, 3% for 1, 2% for 9, and 3% for the other seven together (f23.40, f24.20). Output 7 is ringed in cyan and the others dim to 60% (f25.00).
- **25–30s.** Pullback in one second to the whole schematic, and “Prediction: 7” beside the 7 bar (f26.00). A single dot and a trimmed cyan trail run from the inspected stroke pixel through an input, the computed neuron, a layer-2 unit and output 7 to the end of its bar, between 26.0 and 28.0s. Pixels → Weighted sums + activations → Scores → Probabilities appear as it passes (f26.50–f28.00). The caption holds from 25.4s to the end (f29.95). The builder checks the dot is within 0.5 px of every waypoint and that the trail's trimmed tip meets the dot at 27.0s.

**Simplified or different, and why**
- **Sound** is drawn, not heard; MotionScript has no audio. The scanning pulse is the scan bar. The ticks are rings on each input. The clicks are rings on the source inputs, and the low pulse is a ring expanding from the neuron. The two restrained pulses are column outlines flashing at 16.4 and 18.5s. The rising tone is the Softmax outline brightening over 21.6–22.5s, and the confirmation tone is a ring on the prediction badge.
- **The handwritten stroke** fades to 30% under opaque grey pixel cells at 1.2s. In the final frame the 7 is visible as its pixel raster; the smooth stroke under it barely shows (f29.95).
- **Pixel greys** are quantised into four bins for drawing (four fills per row band). The values shown, and the input brightnesses, are the unquantised two-decimal values.
- **Representative units:** 14 of 784 inputs, and 8 units per hidden layer with ellipses; hidden layer widths are not stated. The connections are those between the representative units only.
- **Connection colour** shows weight sign only. Magnitude and weight × value are not drawn, because every brightness level would need its own path node.
- **Illustrative numbers:** only the selected neuron is computed on screen. The other hidden activations, the seeded weight signs and the scores are illustrative; the scores were chosen so their softmax rounds to the requested distribution.
- **Formulas** are Unicode text (`z = Σᵢ wᵢ xᵢ + b`, `a = max(0, z)`), not typeset; the subscript i renders legibly at zoom 2.1 (f14.50).
- **Layer-wide propagation** in 15–20s is a flash of the signed connection overlays, not pulses travelling along each connection. See the trim finding in section 2.
- **Isolation in the push-in** is a dark panel over the region to the right of the neuron. Layer-2 units above and below the panel stay visible (f14.50).
- **Digits other than 1, 7 and 9** have <1% bars and a “0, 2, 3, 4, 5, 6, 8 combined: 3%” note. Dimming the competitors also dims their bars and labels.
- **“Prediction: 7”** sits beside the 7 bar, on the 7 row, not next to the node circle; the trail joins them.

**Wrong or unverified**
- **Subdued activations** at 45% leave some units nearly invisible: hidden-1 unit 0 (activation 0.10) ends at opacity 0.045. The builder only asserts they are above 0.04.
- **Playback** was not watched; the motion between stills is unverified. For example, it was not checked whether the scan band fade-ins read as continuous.
- **The playground** was not opened. Selecting the preset will compile it; the 4.3–5.2s Chromium compile suggests a stall of that order (hypothesis).
- **Layout overlap.** The checks test points against the frame and the caption plate, not label-on-geometry overlap. Overlaps were found only by looking at stills, and two were fixed that way: hidden-layer labels clipped at the top of the push-in, and the `a = 0.65` label over the ReLU curve. Others may remain at untested times.

## 2. Hardest and most error-prone aspects

Ranked by time or risk.

**1. Brightness without animated colour.**
- *Evidence.* The style is “brightness represents activation”, with cyan for positive and orange for negative. Fill colour cannot be animated, so every unit is a grey base disc plus a cyan disc whose opacity is the activation, and outputs carry a separate orange disc for negative scores. That is 50 overlay discs. A further 30 tick rings stand in for sound. Scores and probabilities are separate text nodes swapped by opacity. With the circles (126) and text (82), the program is at 390 of 500 nodes, which capped how many representative units could be drawn.
- *Root cause.* Language: `paint.animatedSolidFill` is drafted in `pending.md` and not claimed, and it excludes stroke.
- *Workaround.* Opacity overlays. They work for a single hue per node, and break down if a unit has to change sign.

**2. Trim on a compound path bridges its subpaths.**
- *Evidence.* `trimCommands` (`packages/schema/src/trim.ts:7`) samples every subpath into one polyline and returns `M` followed only by `L`. Calling it on two parallel segments, `M0,0 L10,0 M0,100 L10,100`, with the full window 0, 1, 0 returns `M0,0 L10,0 L0,100 L10,100`. The jump between subpaths becomes a drawn line, and the trim window is measured over the jump length too.
- *Impact.* This ruled out three designs:
  - revealing the grid by trimming its line path;
  - a pulse travelling along every connection in a layer (one path per layer and sign);
  - a single dashed-looking guide bundle.
  The grid instead grows by a group `scale` with row-band fades. Pulses exist only on the three isolated single-segment connections. Layer-wide propagation became an opacity flash.
- *Root cause.* Runtime/schema; `geometry.trimPath` and `geometry.animatedTrim` are claimed `supported`.
- *Hypothesis, not tested here.* The Lottie adapter's `exact` claim for simultaneous-mode trim would be wrong for shapes with several subpaths, since lottie-web is not expected to draw connectors between them. That makes this a fidelity finding to verify through the fidelity loop, not an authoring nicety.

**3. Compile time.**
- *Evidence.* 6.4–6.9s in Node for a 108 KB program. Truncating the track list while keeping all declarations gives:

  | Tracks | Compile |
  | --- | --- |
  | 0 | 580 ms |
  | 70 | 2,037 ms |
  | 140 | 3,348 ms |
  | 280 | 6,515 ms |

  That is about 21 ms per track unit against a fixed 390-node scene.
- *Root cause.* Compiler. This matches the crane review's finding that each top-level unit clones and fully validates the scene; this program shows it at a fifth of the crane's size.
- *Workaround.* None. The builder takes about 9s, almost all of it compiling, which slowed every iteration.

**4. A one-character syntax slip rolled back the whole image.**
- *Evidence.* The first emit wrote `cubic (a), (b), (c)`; the grammar takes three vec2 operands without commas. The parse error sat inside `group img`, so the whole group rolled back: the stroke, 28 cell paths, the grid, the scan bar and the three inspection callouts. About 60 later tracks then failed as `UNKNOWN_TARGET`. The parse diagnostics are located: a direct `compileMotionScript` call reports line 2 with “Expected ';'.” and “Unexpected token in path.” But my builder, copying the existing builders' pattern, printed only code and message. The cascade buried the two real errors.
- *Root cause.* Diagnostics: there is no cascade suppression, and the message does not name `cubic`'s operand form. Tooling: builders do not print `sourceSpan`.
- *Workaround.* This builder now prints line and column.

**5. Values that must agree were kept in step by hand.**
- *Evidence.* The highlight dot is keyed by `position.x` and `position.y` at times proportional to arc length, so it stays on the tip of a trail whose `trim.end` is linear in time. That holds only because both use constant speed over straight segments. Value chips are keyed separately from their guide lines. Contributions fly to the neuron by separate x/y tracks. The arithmetic shown in five text nodes must equal z, and z must equal the neuron's glow opacity and the ReLU dot position.
- *Root cause.* Language: there is no binding between channels, and no point-on-path.
- *Workaround.* Every derived value is computed once in TypeScript and asserted on evaluated draw items. Several assertions failed during development: a guide finished 90 ms after its beat boundary, an input lit after the “values arrive” window, and a score appeared after the check time.

**6. Layout by hand.**
- *Evidence.* There are twelve camera stops and about 80 positioned text nodes with estimated widths. Three rounds of still review changed:
  - the push-in centre, from y 300 to 312;
  - the bar scale, from 110 to 150 world units, and the chart camera;
  - the final zoom, from 0.95 to 0.94, to fit the wider chart and the badge;
  - the stage arrow placement;
  - the ReLU label.
- *Root cause.* Tooling and language: text cannot be measured, and nothing fits the camera to content. My own checks also did not test overlap.
- *Workaround.* Real-renderer stills. The builder bundles the packages with esbuild, loads them into Playwright's Chromium and screenshots `CanvasRenderer` output.

**7. Percentage keyframes over the full programme.**
- *Evidence.* 1,386 percentage literals in 280 full-length tracks. This cost little, because the helper was reused from From MotionScript to Motion. It is the same recurring theme.

**8. Reserved words and small grammar facts.**
- *Evidence.* The builder rejects any node id in `KEYWORD_SET` before compiling; none occurred. `rotation` takes an unsigned angle in the grammar, so the vertical “Softmax” label uses `270deg` rather than `-90deg`. That was read from the grammar, and `-90deg` was not tried.

## 3. Suggested improvements

### GVR fixes and tooling, no language change

1. **Trim each subpath without bridging.** Add a conformance test with two subpaths, then fix `trimCommands` so subpaths keep their `M` commands and the window is measured over drawn length only. Re-verify the Lottie trim claim against lottie-web for multi-subpath shapes through the fidelity loop.
   - *Removes from this program:* the scale-and-fade grid workaround.
   - *Allows in a more detailed version:* pulses travelling along all 256 drawn connections using the existing six signed overlay paths, with no new nodes.
   - *Status:* not raised by an earlier story.
2. **Incremental compile validation.** As proposed in the crane review.
   - *Removes:* the 6.5s compile, about three quarters of the builder’s 8.9s run.
   - *Allows:* more tracks, for example per-unit pulses, without a stall in the playground.
   - *Status:* recurs with Crane.
3. **Diagnostic cascade suppression.** After a unit rolls back, collapse later `UNKNOWN_TARGET`s that point into it into one note naming the rolled-back unit. Also name operand forms in path-command errors, for example “cubic takes three points without commas”.
   - *Removes:* about 60 misleading lines from the first failure here.
   - *Status:* recurs with Copperleaf and From MotionScript to Motion.
4. **Shared story tooling.** Extract this builder's helpers into one module beside the builders, so each builder does not copy them:
   - `track`, `span` and `pulse`;
   - `onScreen` and `screenOf`;
   - a `sourceSpan`-aware diagnostic printer;
   - the esbuild + Playwright `CanvasRenderer` still writer.

   Add an overlap check that compares text bounds with geometry bounds, using `traceGeometry` or a canvas `measureText` in the same browser session.
   - *Removes:* an estimated 250 builder lines here (helpers, still writer and diagnostics printer, not counted exactly).
   - *Allows:* overlap failures to be caught by checks instead of by eye.
   - *Status:* recurs with Blue, Clockwork, From MotionScript to Motion and Crane.

### Experiments with the current language

1. **Beat-local `animate` tracks instead of full-length percentage tracks.** First confirm what a channel holds between two touching tracks, then re-emit one beat that way and compare size, compile time and sampled values with this program.
   - *Removes:* most of the 1,386 percentage literals, if the gap semantics hold.
   - *Status:* recurs with Packet, Vectors, Counter and From MotionScript to Motion.
2. **`timing` scopes per beat.** Express each beat's keys in local seconds under a timing scope with an offset. **Hypothesis:** this gives the readability of seconds without a language change. It is untested here.
3. **Measure the node cost of the glow overlays.** Count how many representative units fit under 500 nodes with overlays and with a hand-simulated single animated-fill disc.
   - *Allows:* gives `paint.animatedSolidFill` a measured benefit before its vertical slice.

### Language proposals

1. **`paint.animatedSolidFill`, already pending, extended to stroke and text fill.**
   - *Removes:* 50 overlay discs.
   - *Allows:* one node per unit whose colour moves through orange, grey and cyan as its value changes sign, and score text that recolours instead of swapping.
   - *Status:* recurs with Moon, Packet, Vectors, Counter and From MotionScript to Motion. Stroke is outside the pending draft's scope.
2. **Animated text content or numeric readouts,** related to the pending `text.animators`.
   - *Removes:* the score/probability crossfades and the fixed `z = 0.65` strings.
   - *Allows:* scores that count, and a z readout that accumulates as each contribution arrives.
   - *Status:* recurs with Packet, Vectors, Counter and From MotionScript to Motion.
3. **Point on path, or channels that read another channel.**
   - *Removes:* the hand-synchronised dot and trail, the chip-and-guide pairs, and the contribution flights.
   - *Allows:* pulses that follow any connection, and labels attached to moving geometry.
   - *Status:* the most frequent recurring theme. Relates to pending `transform.autoOrient`.
4. **Clip or mask, already pending as `compositing.mask`.**
   - *Removes:* the band-fade grid reveal and the isolation panel.
   - *Allows:* a reveal clipped exactly to the scan line, and dimming everything outside a spotlight on one neuron.
   - *Status:* recurs with Moon.
5. **Data-driven repetition of units and connections.** One declaration per layer, parameterised by activation, would replace about 300 lines of emitted circles and 250 of tracks. This is a loops-or-functions execution model. Under AGENTS.md it needs a design decision and is not proposed as routine work. Drawable parameterised instances are the nearer form of the same need, and recur with Packet, Vectors, Clockwork, Counter and From MotionScript to Motion.
6. **Not proposed: maths typesetting.** Unicode was legible at the zoom used. One formula does not justify a typesetting feature.

## 4. Priority

- **Fix now.**
  - Compound-path trim (GVR fix 1). It is a discrepancy in semantics already claimed as supported, which AGENTS.md ranks above new coverage. It may also affect the Lottie `exact` claim.
  - Incremental compile validation (GVR fix 2).
  - Diagnostic cascade suppression (GVR fix 3).
- **Experiment next.**
  - Shared story tooling with real-renderer stills and an overlap check (GVR fix 4).
  - Beat-local `animate` tracks and `timing` scopes (experiments 1–2).
  - The node-cost measurement for animated fill (experiment 3), as evidence for the pending `paint.animatedSolidFill` slice.
- **Defer.**
  - Text readouts, point-on-path or channel binding, and masks: these need the language proposal template, conformance tests and a version note.
  - Data-driven repetition: needs a design decision.
  - Maths typesetting: not needed.
