# The City Comes Around: language proposal

Retrospective written after the implementation by the agent that built it, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). It changes nothing in the registry, a published version file or `pending.md`.

Evidence for this retrospective:
- The builder's own checks. They run on `AnimationRuntime.evaluate` draw items, plus a box model of every actor for paint order. All pass at the recorded hashes.
- 29 stills rendered through the real `CanvasRenderer` in headless Chromium (Playwright's Chromium, and once with Chrome for Testing 153 through `GVR_CHROME`), at 0, 0.5, 1.2, 2.6, 4, 5, 6.2, 7.3, 8.2, 9.4, 10, 11.5, 13, 13.4, 14, 15, 15.6, 16.5, 17.5, 18.5, 19.5, 20, 21.5, 22.6, 23.5, 25, 27, 29.5 and 30s.
- A pixel diff of the 0s and 30s renders.
- A CPU profile of compile plus 60 evaluations, from an esbuild bundle in Node.

Playback was not watched. Everything below about motion comes from stills and sampled values.

---

## 1. State of the result

**Measurements**

| Measure | Value |
| --- | --- |
| Source | 232,949 bytes, 44% of `maxSourceBytes` (524,288) |
| Nodes | 482 of 500 |
| Tracks | 185 of 1,000: 176 expression tracks, 3 camera keyframe tracks, 6 caption keyframe tracks |
| Steps | 12 of 1,000 |
| Path commands + polygon vertices | 9,427 of 10,000 |
| Compile (`compileMotionScript`, Node) | 9.2–10.5s over six runs |
| Compile (headless Chromium) | 5.5–8.3s |
| Evaluate, Node | 84–99 ms per frame |
| Evaluate + render, Chromium | 56–67 ms per frame |
| Builder run | 34–38s without stills, 46–50s with them |
| Builder breakdown, one run | compile 10s; paint-order model check 0.6s; runtime checks 24s for 267 evaluated frames; per-frame timing 5s |
| Seam, rendered | 0s vs 30s: 1 of 921,600 pixels differs by more than 8 of 255 levels (maximum 10) |

**What matches the script**

The district is an 880-unit repeating unit: two blocks, eight shopfronts, a back row, a viaduct and foreground roofs. The camera starts on the café of unit 0 and ends on the café of unit 1. At 30s the camera matrix equals the 0s matrix moved by exactly one unit (checked to 1e-6). Every actor mark on screen at 0s has a mark at 30s with the same screen bounds, within 0.05 px, from some unit copy. Speed across the seam is checked for the car, walkers A and B, the cyclist, the watering can and car 2: the displacement over 0–0.1s matches 29.9–30s to under 0.5 px.

- **0:00–0:05**
  - The camera holds until 0.5s (matrix identical at 0 and 0.5s), then eases into a 37 units/s pan.
  - The mustard car is at world X < 70 at 0.3s and past the café (X > 160) by 2.4s.
  - Walkers A and B cross from the near sidewalk to the café side (Y > 70 to Y < 27) between 1.0s and 4.95s. The car is at least 25 units past them at 1.4s.
  - The cyclist rides the bike lane and gains more than 100 units by 2.6s.
  - The CAFÉ sign alternates every second between lit text and a coral frame (stills 0s, 7.3s).
  - The roof gardener's can tips more than 0.6 rad at 2.7s, with water, and is back at the opening angle by 5s.
  - By 5s the café's left edge has moved more than 150 px left.
- **0:05–0:10**
  - Façades B, C and D are framed in turn at 5.6s, 7.6s and 9.4s. They share 20-unit bays and differ in brick colour, window grouping, awnings and balconies:
    - B: ochre, paired windows, a striped coral awning, two balconies.
    - C: rose, triple windows, a mustard awning, window boxes.
    - D: sand, tall windows, a full-width balcony, no awning.
  - The van emerges from behind the café at 5.3s and decelerates into its stop by 7.0s.
  - Walker C is clear of the van at 7.05s, then passes behind the van body (screen-covered, painted under it, at 9.0s). C reappears beyond the bonnet.
  - Walker D's head is under the café awning at 6.7s.
  - The three blade signs have 3s, 5s and 6s cycles.
- **0:10–0:15**
  - Zoom eases from 2 to 0.8 by 14s.
  - The elevated view shows the planter rows, greenhouse, laundry, pergola, gardener B carrying a pot between beds (15s cycle), and gardener A's second watering cycle.
  - The train's front corner is at the frame's upper-left edge at 13.0s. It is outside the frame at 12.9s and inside at 13.2s.
- **0:15–0:20**
  - The train runs at a constant 182.4 units/s with fixed carriage spacing (checked at 13.5s and 18.5s).
  - It passes behind a water tank: the tank overlaps a carriage and paints above it.
  - The last carriage crosses the end of the exposed viaduct between 18.5s and 19.5s.
  - At 15.3–15.6s the camera moves with the train: the head moves less than 2 px on screen.
  - At least two cars are framed at 16.5s and 18.5s.
- **0:20–0:25**
  - The van turns into the cross street and is drawn under building E at 22.6s.
  - Café 1's awning is off frame to the right from 22.8s and re-enters at about 24.3s (still 25s).
  - Zoom is 2 at 25s.
- **0:25–0:30**
  - The camera reaches the final matrix at 29.5s and holds.
  - The camera's lateral position never decreases. This is checked on the model every 0.01s and on the runtime every 0.25s.

**What was simplified or differs, and why**

- **Sound.** MotionScript has no audio, so there is a screen-space caption per beat. Captions do not cross-fade: between beats the plate is briefly empty (24.9–25.1s, for example; still 25s). The last caption's text equals the first, so the seam matches.
- **Camera speed in beat 5.**
  - The brief asks for gradually reducing speed. Lateral speed instead rises from about 5 units/s at 20s to 70 units/s at 25s, then eases to 0 by 29.5s; zoom and descent slow toward 25s.
  - The cause is geometric. With a forward-only, exactly one-unit camera path, café 1 is inside the widest frame, so it can only "enter from the right" if the descent first pushes it out of frame. That needs the wide shot to sit further left, which leaves more lateral distance for 23–29.5s.
  - For the same reason, the wide shot's "continue laterally" (16–20s) is only 16 units.
- **The camera's match with the train** is a 0.3s plateau with 0.3s ramps. The camera briefly accelerates from about 8 to 182 units/s inside the "hold the widest view" beat.
- **Turning.**
  - Vehicles turn by flipping `scale.x` through zero over 0.32–0.4s, which mirrors an X-aligned sprite into a Y-aligned one. This is a squash, not a rotation.
  - A car heading −Y shows its front at the wrong end until the next building hides it.
  - Walkers turn instantly at waypoints. Their legs scissor, but bodies neither bob nor face their direction.
- **Hidden route legs.**
  - Vehicles are made invisible on the back-street leg.
  - The back street is in fact visible over the low front roofs. A vehicle there is behind the front row but would paint over the row's side faces: side faces sit below the street layer so that cross-street traffic can pass in front of them.
  - At the vanishing corners the next building already covers the vehicle. The back street therefore always looks empty.
- **Crossing positions.** Crossings 1 and 3 sit just past the corners (X 74 and 474), not in the intersection mouths. Vehicles turning in the mouths made every walker schedule conflict.
- **Height and spacing caps.**
  - The van is 24 high so its roof stays under building E (60) where it turns away.
  - Foreground roofs are capped at 48 so they never overlap walkers.
  - Rooftop props stay 24–30 units clear of a taller right-hand neighbour.
  - All three are paint-order constraints, not design choices.
- **The train's circuit.**
  - The train is one drawn train on `X(t) = A + (L/30)t + ((wt + 5w) % 30w)`: a train every 5,086 units on an endless line, of which one is drawn.
  - It wraps at 25s, off screen (checked at 24.95s and 25.05s).
- **Lighting and shadows.** Contact shadows are flat translucent footprints. Buildings have three fixed face tones and no cast shadows.
- **The edges of the wide shot.** The far district beyond the rail is four rows of plain hazy boxes. In the widest frames (stills 13–20s) the lower-left corner shows bare background beyond the foreground rows, and the upper right is dominated by those boxes. Filling either would exceed the geometry budget.

**What is wrong or unverified**

- **Playback is too slow.**
  - At 84–99 ms per evaluation in Node, and 56–67 ms per evaluate-plus-render in Chromium, playback in the playground would run at roughly 10–17 fps. This is a **hypothesis**: the playground itself was not measured.
  - Selecting the preset compiles for 5.5–8.3s in Chromium.
- **Motion quality is unverified.** Walking, pedalling, laundry (±8% scale) and shrub sway (±3.5%) were seen only in stills.
- **The paint-order checker is a model.**
  - It uses boxes for actors and the front-row building faces.
  - Awnings, lamps, rooftop props and the back row are not in it; they were checked only by eye in stills.
  - Contact within 1.5 projected units is ignored as a corner touch.
- **Sheared text depends on the font.** The CAFÉ sign is sheared with rotation · scale · rotation. It looked right in Chromium's sans font and was not tried elsewhere.

## 2. Hardest and most error-prone aspects

Ranked by time and risk.

**1. Static paint order in a depth-sorted scene.** *Root cause: language (`zIndex` is static; there is no depth sort), plus my layer design.*

Isometric depth changes as actors move. The layers had to be chosen so that every route agrees with depth wherever two things overlap:
- ground
- far district
- rail
- train
- back row
- front-row side faces
- street vehicles
- front faces and roofs
- rooftop props
- cyclists
- walkers
- awnings
- the van's front copy

Some orders are cyclic:
- The van must paint over a walker on the sidewalk.
- That walker paints over the café front.
- The café front paints over the van in the cross street.

So the van exists twice (2 × 19 nodes per unit), switched by `step … visible`. The switch time has a window only about 0.05s wide (21.94–21.99s) in which neither copy is wrong.

Evidence:
- The first actor-pair model run reported 24 conflicts at 8 moments.
- Clearing them took:
  - moving two crossings;
  - moving the near-sidewalk walking line twice (88 → 91 → 94);
  - reordering cyclists below walkers;
  - reversing the walking loop;
  - an offline search over phases for car 2 and walkers E/F.
- Adding building faces to the model found the van drawing over building D from the back street (visible in still 23.5s before the fix), plus two corner overlaps.
- It also exposed a separate route bug: car 2 climbed through building H (X 842 instead of 904).

Workarounds:
- the model checker in the builder;
- duplicated vans;
- hidden back-street legs;
- height caps.

**2. The node and geometry budgets.** *Root cause: language and implementation (instances are stored but not drawn; one fill per node).*

The first emission was 549,474 bytes with 13,905 geometry items. To fit:
- Static architecture became one merged `path` per paint layer and colour, across all unit copies: 79 static paths holding 1,443 polygons.
- Polygons outside every camera frame of the 30s were culled (1,812 polygons).
- Balustrades, sills, parapets and window grids were simplified to bands.

Each new colour costs a node. Adding the foreground rows took the scene to 501 nodes and the compiler rejected it, so the foreground reuses unrelated layers that happen to share colours. Each unit copy has 129 nodes of actors, café parts and signs (387 in all).

**3. Seam exactness.** *Root cause: tooling, and no repetition construct in the language.*

The draw-item checks passed while the rendered seam differed in 18,896 pixels. The causes:
- Lane dashes every 48 units do not divide 880.
- Back-row lit bands were keyed on absolute X.
- The far district was one non-repeating strip.
- One-decimal coordinate output rounds differently per unit copy (`-15.75` → `-15.8` but `424.25` → `424.3`), offsetting unit 1's sign by 0.2 px.

Only the pixel diff of real renders found these. Periodicity is a property I had to maintain by hand in every generator.

**4. Periodic motion without a cyclic track.** *Root cause: language.*

Every actor is an expression over `u = (t + phase) % period`, written as a sum of `clamp` ramps per route segment: 176 expression tracks. This is exact at the seam, which keyframes alone are not unless unrolled over 30s.

The costs:
- No eases except hand-written `c * (2 - c)` forms, which repeat the clamp.
- About 15 linear segments fit the 256-op limit.
- Each walker's stride envelope repeats its route timing in a second expression, because a track cannot read another channel.

**5. Isometric projection in the builder.** *Root cause: language (2D only; `transform.skew` is pending).*

- Every shape is pre-projected.
- Mirroring with `scale.x = −1` stands in for a 90° turn.
- Façade text uses two nested groups to build a shear as rotation · scale · rotation, from an SVD of `[[1, 0], [0.5, 1]]`. This worked in the renderer.

**6. Camera path authoring.** *Root cause: brief geometry and tooling.*

- Hermite segments emitted as `ease cubic(0.3333, y1, 0.6667, y2)` gave a velocity-continuous camera from 14 keys, which worked well.
- My first set of keys made the camera move backward by up to 21 units/s at 21s. The tracks were valid, so nothing flagged it; a runtime sample did. The builder now checks monotonic travel.

**7. Compile and evaluate cost.** *Root cause: GVR compiler and runtime.*

- **Evaluate.** In the profile, the callback inside `indexNodes` (`packages/schema/src/graph.ts:9`) is 7.8s of self time. `childrenOf` (line 23), `worldMatrix` (55), `rootOf` (77) and `nodeDepth` (105) each rebuild a full index per call. `frame.ts:25` and `:33` call them per node, so a frame is O(n²) in nodes.
- **Compile.** `structuredClone` is 3.2s, plus full validation per unit (`packages/compiler/src/compile.ts:450`, `:460`). This is the pattern the Crane review reported.

**8. A formatter that dropped integer zeros.** *Root cause: my implementation, plus no diagnostic.*

The shared `n()` pattern strips `/\.?0+$/`. With zero decimals it turned `5000` into `5`, so the van's visibility steps landed at 5 ms and 219 ms. The program compiled cleanly; a draw-item check caught it.

Also, the node-budget rejection was printed before about 40 `UNKNOWN_TARGET` errors for the tracks of rejected nodes. The root cause was easy to miss.

## 3. Suggested improvements

### GVR fixes and tooling, no language change

1. **Index the node graph once per evaluation.**
   - Build `byId`, children and depth once per frame, or once per scene since membership is static, in `graph.ts`, instead of per call.
   - This would remove the O(n²) term that dominates the ~90 ms frame here. It matters most for exactly the dense scenes stories are pushing toward.
   - No language change. Confirm with this program as the benchmark.
2. **Incremental compile validation.** The same fix the Crane review asks for. It would remove the 5.5–10s compile stall for this 233 KB program.
3. **Diagnostics.**
   - Report resource-limit failures first and suppress dependent `UNKNOWN_TARGET` cascades (recurs: Copperleaf, MotionScript→Motion).
   - Have the compiler report budget use (nodes, geometry, source bytes), so builders can treat 95% as a warning.
4. **Shared builder kit.**
   - Draw-item helpers: world positions, screen bounds, an index-based "painted under".
   - A safe number formatter.
   - The real-renderer preview this builder adds (`GVR_PREVIEW_DIR`, Playwright plus `evaluation/harness/chrome.ts`).
   - A seam check for loops: render the first and last frame and diff them.
   - Recurs: Blue, Clockwork, MotionScript→Motion, Crane.
5. **A paint-order lint.** Given actor boxes over time and static faces, report where layer order disagrees with depth. This builder's model check is a starting point.

### Experiments with the current language

1. **Expressions versus unrolled keyframes for cycles.** Emit the same routes as 30s keyframes with eases and compare bytes, compile time and evaluate time. Untested; the expressions here are a guess at the cheaper option.
2. **Shear by nested rotation and scale** for façade text and signs on side faces, and for sheared panels generally. This extends the Crane review's affine-panel experiment, and it worked here for one sign per unit.
3. **Timing scopes as phase offsets.** Share one route definition across walkers with `timing` offsets instead of per-walker phases. This only helps once a timing scope can wrap; see the language proposals.

### Language proposals

Each would need the release process: a version entry, registry rows and conformance tests. Items 2 and 3 change sampling or render order and need a design decision first.

1. **Drawn instances, or a repeater, of a composition with an offset** (pending `geometry.repeater`; instances are stored and not drawn today).
   - **Removes:** the three unit copies (387 nodes), the cross-unit merged paths, camera-frame culling, and the class of seam bugs above. Repetition would be structural rather than maintained by hand.
   - **Allows:** more units in the wide shot (no bare corner), a richer far district, and variation within a unit instead of copies.
   - Recurs: Packet, Vectors, Clockwork, Counter, MotionScript→Motion. Blue and Copperleaf urged caution; this program is a case where one film does depend on it.
2. **Cyclic time.** A `period` on a keyframe track, or a wrapping timing scope (`local = ((parent − offset) / stretch) mod period`).
   - **Removes:** the clamp-sum expressions, the duplicated stride envelopes and the hand-written eases.
   - **Allows:** eased walk cycles and keyed poses per cycle.
   - It changes the sampling rule, so it needs a Scene IR version. Whether a time wrap counts as a new execution model ("loops") is a design decision to settle first. New theme.
3. **Depth-sorted paint order.** For example, a group whose children paint in order of an animated depth channel, or a stepped `zIndex` track.
   - **Removes:** the duplicate van and its steps, hidden back-street legs, relocated crossings, height caps and clearance rules.
   - **Allows:** vehicles visible on the back street, tall foreground buildings, actors walking round corners in front of and behind the same building.
   - Recurs: Counter, Crane. Needs a design decision, because render order becomes time-dependent.
4. **Channel reads (drivers).** A walker's stride from its route speed, or the camera's lateral speed from the train. Recurs: the most frequent theme.
5. **Skew** (pending `transform.skew`). Removes one group per sheared sign and allows isometric text on any face.
6. **Animated fill** (pending `paint.animatedSolidFill`). The sign's two states are two overlay nodes plus two tracks, and blade signs fake light with an opacity overlay. Recurs: Moon, Packet, Vectors, Counter, MotionScript→Motion.
7. **Audio cues.** As in other stories, cue metadata would carry the brief's sound design. For a loop, cues need to repeat with the period.

## 4. Priority

- **Fix now:**
  - graph indexing in the runtime (item 1);
  - incremental compile validation;
  - the diagnostic cascade and budget report.

  They need no language change and would make this preset playable. This program can serve as the benchmark.
- **Experiment next:**
  - the shared builder kit with a seam diff and a paint-order lint;
  - an instance or repeater prototype measured on this program (nodes, bytes, seam);
  - expression versus keyframe cycles.
- **Defer until a design decision:**
  - cyclic time;
  - depth-sorted paint order;
  - drivers.

  Skew and animated fill are already pending and only tidy this program.
