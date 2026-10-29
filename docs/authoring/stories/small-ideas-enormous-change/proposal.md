# Small Ideas, Enormous Change: language proposal

Retrospective written by the implementing agent after the implementation, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). It changes nothing in the registry, a published version file, `pending.md`, `CONTRACT.md` or `limits.ts`.

Evidence for this retrospective, all taken from the program at commit `b48ff2f` (SHA-256 `9f7fc8f2…3379c`):
- The builder's own checks, which sample `AnimationRuntime.evaluate` draw items, not the builder's model. They include a 30 fps sweep over the whole 20 seconds. A negative test that routed `i` through `Small` and one that lowered `change` both made the builder fail, as intended.
- 45 stills drawn by the real `CanvasRenderer` in headless Chromium 153 at 1280×720, DPR 1, at 0.2, 0.5, 1.0, 1.45, 1.9, 2.35, 2.8, 3.0, 3.3, 3.75, 4.3, 4.8, 5.25, 5.5, 6.0, 6.2, 6.55, 7.0, 7.5, 8.0, 8.3, 8.7, 9.0, 9.6, 10.0, 10.65, 11.3, 12.1, 13.0, 13.15, 13.7, 14.0, 14.7, 15.0, 15.7, 16.0, 16.3, 16.5, 17.0, 17.2, 17.4, 17.6, 17.8, 18.0 and 20.0s. Earlier program revisions were rendered the same way; findings from them are marked as such.
- `compileMotionScript` timings in Node, and a compile → `emitMotionScript` → compile round trip.

The stills were looked at; playback was not watched.

---

## 1. State of the result

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 35,859 bytes, 1,081 lines | `maxSourceBytes` 524,288 (6.8%) |
| Nodes | 116: 46 paths, 52 groups, 14 guide lines, 4 guide rings | `maxNodes` 500 |
| Tracks | 101 | `maxTracks` 1,000 |
| Steps | 0 | `maxSteps` 1,000 |
| Path commands | 264 | `maxGeometryItems` 10,000 |
| Compile, Node | 193–291 ms over 7 runs (first run slowest, median 210 ms) | |
| Compile, headless Chromium | 201 ms, one run | |
| Evaluate, Node | 2.6 ms per frame over 601 frames | |
| Builder run | 3.1–3.3 s inside the script, 3.6–3.7 s wall, 3 runs | |
| Emitter round trip | Recompiles with 0 diagnostics; draw-item matrices and opacities identical at 201 sampled times | |

The builder time is mostly its own checks. They evaluate about 1,050 frames, which at 2.6 ms is about 2.7 s. That figure is an estimate, not a profile.

### What matches the script

Screen positions are from runtime draw items at 1280×720. Boxes are the control hull of each path, padded by half the scaled stroke.

- **0:00–0:03, Small.**
  - The canvas is empty at 0.2s.
  - From 0.3s to 1.0s "Small" is 57×18 px, centred on the frame (611–668, 351–369), and held for 0.7s.
  - It enlarges in place from 1.0s to 1.9s, then moves to the upper left from 1.9s to 2.8s (149–431, 118–210 at 2.85s).
  - Its x position only decreases between 1.9s and 2.8s (sampled at 30 fps), so the settle does not bounce. It stays within 0.5 px of that position until 6s.
- **0:03–0:06, ideas, can.**
  - The five letters arrive between 3.0s and 4.8s, staggered by 0.3s, in reading order: `i` from above, `d` from the upper right, `e` from below, `a` from the lower right, `s` from the right.
  - Each starts rotated (−48° to 42°) and ends on Small's baseline at 0° (checked at 4.85s; stills 3.3, 3.75, 4.3, 4.8).
  - "can" is absent at 4.95s and rises 64 units into place between 5.0s and 5.5s.
- **0:06–0:09, create.**
  - Each letter has a 0.383 s window between 6.0s and 8.3s. It is built from two strokes: c from two arcs, r from a stem and shoulder, e from a bowl and crossbar, a from a bowl and stem, t from a stem and crossbar.
  - The strokes fly in from below and to the right, rotated −55° to 70°.
  - Vermilion guides show only during each letter's window: baseline, x-height, and a bowl ring or stem axis. Checks confirm the next letter has not started at mid-window and the guides are gone at its end (stills 6.2, 6.55, 7.0, 7.5, 8.0).
  - The camera zooms from 1.25 to 1.45 between 6.0s and 7.6s with line 1 still in view.
- **0:09–0:13, enormous.**
  - Letters appear left to right, 50 ms apart, from 9.0s; the word is held until 10s.
  - It scales 1 → 2.4 about its own centre from 10.0s to 11.3s. At 11.3s the first `e` spans x −76…67 and the last `s` 1261…1365, so both outer letters cross the frame edges and stay partly visible.
  - Earlier words do not move on screen while it grows.
  - The pull-back (zoom 1.3 → 0.896, 11.3s–13s) recovers the whole word (146…1139) above the phrase.
- **0:13–0:17, change.**
  - Vermilion throughout. Its letters rise in from 13.0s to 13.3s.
  - Staircase from 13.7s to 14.2s, 18 units per letter, ascending.
  - Shallow arc from 14.7s to 15.2s: a 46-unit rise, with each letter rotated to the tangent.
  - Back to a baseline from 15.7s to 16.3s, 2 units tighter per letter, while a 16-unit stroke fades in under the 12-unit stroke.
  - The period drops 40 units onto the baseline after the final `e`, from 16.3s to 16.65s.
  - Each arrangement holds still for 0.4–0.5 s.
- **0:17–0:20, complete thought.**
  - "enormous" shrinks to 1.3× and slides right (17.0s–17.4s), then rises onto line 2 (17.4s–17.9s). "change." rises onto line 3 from 17.1s to 18.0s.
  - The camera moves to its final framing over 17.0s–18.0s.
  - The three lines share a left baseline origin, "enormous" sits on the create baseline at 1.3× its x-height, and every draw item is identical from 18.0s to 20.0s (sampled every 0.25 s). There is no fade.
- **Reading-order rule.** Sampled at 30 fps, no moving word's piece comes within 2 px of a resolved letter's box. Inside "create", no assembling stroke touches a finished letter.
- **In frame.** Every drawn word stays inside the frame and above y = 650 (a caption band, kept clear though this film has no captions) at every 30 fps sample, with two exemptions: "ideas" letters still arriving from off screen, and "enormous" between 10s and 13s.

### What was simplified or differs, and why

| Script | Program | Why |
| --- | --- | --- |
| A bold sans-serif family | A bold geometric monoline of 17 glyphs drawn as stroked paths: stroke 12 at size 100, butt caps, miter joins, single-storey `a` and `g` | `text` draws a whole string in the platform font. MotionScript can't address a glyph, read an outline or measure an advance, so it can't move letters independently or keep their positions consistent. Letter identity is exact: each letter is one node from start to end. The face is not a real typeface. |
| "Move the completed phrase together toward the upper-left" (8.3–9s) | A camera move from 8.4s to 9.0s; the words stay put on the canvas | It keeps "earlier words remain stationary on the same canvas" literally true and matches "camera motion carries the canvas". It is an interpretation. |
| "enormous" beneath "create" | Revealed centred in the held frame, offset to the right of "create" | Expanding from its centre only crosses both frame edges if the word is near the frame centre. An earlier revision aligned it left: at 11.3s the first `e` was wholly off screen (x −436…−257), so it vanished instead of extending. |
| "Heavier" | A second, 16-unit copy of each letter fades in beneath the 12-unit one | Stroke width and stroke colour are not animatable channels. |
| "Tightly spaced" | 2 units per letter, about 2 px at the final zoom | With 4 units and a 17-unit heavy stroke, the letters touched in the 20.0s still of an earlier revision. The final word is visibly heavier but only slightly tighter. |
| "Small final adjustment" of the camera | Zoom 0.896 → 1.1, centre (240, 256) → (491, 110) | The composition reflows from a stacked to a three-line layout, so the framing has to change more than slightly. |
| Sounds | Header comments with cue times | MotionScript has no audio. |

### What is wrong or unverified

- Playback was not watched. Temporal claims rest on the 30 fps sampled checks and 45 stills.
- The playground page was not opened. Only compile and the emitter round trip were run in Node.
- In the final still the heavy `n`–`g` and `g`–`e` gaps are about 4 units (4.4 px). Readability was judged by eye on one still.
- The overlap and in-frame checks use control-hull boxes, which are larger than the inked shape. They do not test pixels.
- Seams in "create" (see §2) were not visible in the 8.7s still at DPR 1. Other device pixel ratios were not tried.
- The rising tone, taps, clicks, swell and impact exist only as comments.

## 2. Hardest and most error-prone aspects

Ranked by the time or risk each cost.

**1. No letter-level typography.**
- *Evidence.* The builder spends about 230 of its 915 lines on an arc-to-cubic helper, 17 glyph definitions, advances, word layout and centre calculations before any animation. Every position in the film depends on those hand-set metrics.
- *Root cause: language and renderer.* `text.basic` draws one string through `fillText`, which leaves the outline and metrics to the platform. There is no per-glyph node, transform or measurement, and `text.animators` is unsupported in the registry.
- *Workaround.* Stroked-path glyphs. That also made "create builds from its own pieces" natural, because the pieces are the strokes.

**2. Hairline seams where separately drawn strokes meet.**
- *Evidence.* In the first render (20.0s still) light hairlines showed at the junctions of `S`, `c`, `o` and `e`, where two butt caps meet, or where a ring's start meets its end. The builder's checks could not see this; it only showed in a real raster.
- *Root cause.* Mainly renderer and language. Each draw item is anti-aliased on its own, so two coverage-blended edges at the same line leave a gap of partial coverage, and no construct strokes several nodes as one union. Partly my implementation choice of butt caps meeting end to end.
- *Workaround.*
  - Every letter except those in "create" is one path with several subpaths, which the canvas strokes as a union.
  - Rings use `close`.
  - In "create", where pieces must stay separate nodes, the joins overlap: the `c` arc runs 6° further, and the `e` crossbar reaches the bowl's outer edge.
- *Related.* The crane review reports the same seam problem with filled triangles.

**3. Camera and content moving at once.**
- *Evidence.* An earlier revision passed every check at named times. The 17.5s still showed "change." at the bottom edge, partly below the frame, because the camera zoomed in for the final framing before the word had risen.
- *Root cause: tooling, and in part language.* The tooling cause: my checks sampled moments, not intervals. The language cause: there is no camera fit, so every framing (C1–C5) is a hand-computed centre and zoom, and the C4 and C5 values come from bounds the builder works out itself.
- *Workaround.* A whole-programme 30 fps in-frame sweep, and "change" now starts rising at 17.1s instead of 17.4s.

**4. Scaling "from its centre" and overflowing "the frame".**
- *Evidence.*
  - The transform is world = position + pivot + R·S·(local − pivot). The pivot is where the node is fixed, and position is an offset from it. I parameterised every word by its world centre to keep that straight.
  - Getting the outer letters to *cross* the edges rather than leave the frame took a second revision (see §1).
- *Root cause.* The transform rule is not hard, but I learned it from `packages/runtime/src/runtime.test.ts`, not from the language guide. That is a documentation gap. The overflow mistake was my implementation choice.
- *Workaround.* Centre-based placement, and a check that the outer letters are partly inside the frame.

**5. No animated stroke width or stroke colour.**
- *Evidence.* "Heavier" needs 6 extra path nodes, 6 extra groups and 6 extra opacity tracks.
- *Root cause: language.* The animatable node channels are transform, opacity, `visible`, `commands` and `trim`.
- *Workaround.* The heavy copy fades in beneath the regular stroke, which stays at full opacity, so the core never loses alpha mid-fade.

**6. Whole-timeline keyframes in percentages.**
- *Evidence.* 101 tracks, each padded with holds to 0% and 100%, written through a `percent()` helper copied from earlier builders.
- *Root cause: language.* Keyframe times are percentages of a track's duration.
- *Cost.* Low, because the helper already existed.

**7. Check geometry.**
- *Evidence.* The arc check measured a rotated letter at its glyph origin, which moves when the letter rotates about its centre, so it failed although the arc was right.
- *Root cause: my implementation.*
- *Workaround.* Measure at the baseline point under the glyph centre.

Reserved keywords cost nothing here. All ids were chosen as a letter plus an index (`c0`, `e5`, `dot6`) or as stroke names (`stem`, `bowl`, `crossbar`).

## 3. Suggested improvements

### GVR fixes and tooling, no language change

1. **A shared real-renderer still tool.**
   - What I used: a 20-line browser entry bundled with esbuild that compiles, evaluates and draws through `CanvasRenderer`, plus a 15-line Playwright script that saves PNGs. It found the seams and the 17.5s framing error; the builder's checks found neither.
   - *Would remove* the SVG preview approximation in this builder (about 30 lines).
   - *Would allow* stills as a routine gate for every story.
   - *Recurs:* Blue, Clockwork, From MotionScript to Motion, Crane.
2. **A shared builder check library.**
   - What it would hold: the track, percentage and hold helpers (copied into a third builder here), screen boxes from draw items, and interval sweeps (in-frame, no-overlap, nothing moves after time T).
   - *Would remove* about 170 lines here.
   - *Would allow* checks over intervals by default, which would have caught finding 3 without a still.
   - *Recurs:* the shared-tooling theme.
3. **Document the transform rule** with a worked "scale about the centre" example in the authoring guide. This is a documentation fix.

### Experiments using the current language

1. **Outline glyphs from a real bold sans,** converted to filled paths at build time.
   - *Would remove* the hand-drawn face and the seam workarounds (one filled outline per glyph).
   - *Would allow* a genuine "bold sans-serif family" with real advances and kerning.
   - *Hypothesis:* "heavier" could become a `geometry.pathMorph` (0.3.0) from regular to bold outlines, if both share command topology. That is untested, and fonts rarely guarantee it.
   - *Costs:* source size is unmeasured, and the font's licence has to allow it.
2. **Animated trim for "create"** (`geometry.animatedTrim`, 0.5.0). Draw each stroke on instead of flying it in. *Hypothesis:* it reads as construction and avoids moving pieces near finished letters, but it loses "pieces join".
3. **Isolated group opacity** (`compositing.isolatedOpacity`, registry: untested) for crossfades between two states of a letter. Worth measuring before relying on it.

### Language proposals

1. **Glyph-addressable text.**
   - Per-glyph nodes or animators, with advances and outlines the runtime can resolve.
   - *Would remove* the 17-glyph face and the layout code.
   - *Would allow* a detailed version in a real typeface: kerning, true weight change, per-letter colour.
   - *Existing work:* `text.animators` is pending and unsupported. The text theme recurs in Packet, Vectors, Counter and From MotionScript to Motion.
   - This is large. Renderer determinism across platform fonts is the open design question.
2. **Animatable stroke width and stroke colour.**
   - *Would remove* the duplicate heavy layer.
   - *Would allow* a continuous weight change and vermilion that rises in intensity.
   - *Existing work:* `paint.animatedSolidFill` is drafted in `pending.md` and excludes stroke. Animated stroke colour recurs (Packet); stroke width is new.
3. **Union stroking across a group** (or merge paths).
   - Composite a group's strokes as one coverage mask.
   - *Would remove* the overlap workarounds and allow assembled pieces with no seams.
   - *Existing work:* `geometry.mergePaths` is unsupported in the registry. The crane review reports seams too.
4. **Camera fit to bounds.**
   - *Would remove* the hand-computed C4 and C5 framings.
   - *Would allow* "hold a framing wide enough for all completed text" to be stated directly.
   - *Recurs:* Moon, Packet, Clockwork, From MotionScript to Motion.
5. **Keyframe times in seconds.** Would remove the percentage conversion. It recurs, but it cost little here.
6. **Audio cues.** Not proposed: comments were enough for a silent plate, consistent with Copperleaf and Blue.

Functions or loops would shorten both the glyph set and the per-letter choreography. That is a new execution model, which needs a design decision; it is not proposed here.

## 4. Priority

- **Fix now:**
  - the shared still renderer and check library;
  - the transform-rule documentation.

  All three are tooling or documentation, need no version bump, and would have saved most of this run's debugging.
- **Experiment next:**
  - outline glyphs, with a morph to the bold weight;
  - trim draw-on for "create";
  - measuring isolated group opacity.

  These test how far the released 0.3.0–0.5.0 capabilities stretch before any new contract.
- **Defer to a proposal in the template:**
  - animatable stroke width and stroke colour, alongside `paint.animatedSolidFill`;
  - union stroking or merge paths;
  - camera fit;
  - glyph-addressable text, which needs a design decision on fonts.
