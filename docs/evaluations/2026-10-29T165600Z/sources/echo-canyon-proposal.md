# ECHO Canyon: language proposal

Retrospective written after the implementation by the agent that built it, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). It changes nothing in the registry, a published version file, `pending.md`, `CONTRACT.md` or `limits.ts`.

Evidence for this retrospective:
- The builder's own checks. They run on `AnimationRuntime.evaluate` draw items and the render tree, not on the builder's model. All pass at the recorded hashes.
- 34 stills rendered through the real `CanvasRenderer` in headless Chromium (Playwright's Chromium) at 0.05, 0.4, 0.82, 1, 1.42, 1.62, 2.2, 3, 3.5, 3.6, 3.85, 4.2, 4.9, 6, 7, 7.2, 7.6, 8, 9.2, 10.5, 10.66, 11.6, 12, 12.5, 12.66, 13.8, 15, 15.16, 16, 17, 18, 18.5, 19 and 19.99s. They are committed as [contact sheets](stills/).
- The playground preset, loaded, compiled and played to 3.68s in headless Chromium with no page errors.
- A CPU profile of 400 evaluations in Node.
- A three-node reproduction of the paint-order defect in §2.1, and a scan of every committed story program that uses compositing.

Nobody has watched the playback. Statements about motion come from stills, from draw items sampled every 0.05s, and from sampled values. Frame numbers below are at 30 fps (frame = seconds × 30).

---

## 1. Result

### What matches the script

The builder checks each item below on evaluated draw items unless it says otherwise.

| Beat | Implementation | Check |
| --- | --- | --- |
| Setting | A V-shaped canyon, built from a pinhole-camera model (focal 900 px, vanishing point (640, 300)). Nine rock "fins" at depths 430–5600 step down toward a glowing opening. Floor wedges and strata run along rays through the vanishing point. Warm sandstone near the camera shades to dark violet far away, under a dark violet sky. | Stills |
| 0–1s, f0–30 | ECHO expands from the lower centre: scale 0.3 → 1.06 at 0.82s → 1.0 at 1s, opacity 0 → 1 by 0.35s, rising 26 world units. | Scale and opacity at 1s; centre within 4 px of x = 640, y > 560 |
| 1–1.5s, f30–45 | Anticipation. Letter offsets close to 80% by 1.36s and the word flexes to 0.86 along its travel direction. On release the letters overshoot to 107% and the word to 1.10, settling by 1.9s. | Letter span < 86% of rest at 1.42s and > rest at 1.64s |
| 1.5–3.5s, f45–105 | Accelerates toward the right wall: progress 0.12u + 0.88u², a straight 3D path with perspective division. | Second-half travel > 1.6× first half |
| Shadow | A radial-gradient ellipse on the floor, foreshortened and fading with the word's height. It separates from the text. | Gap grows by > 80 px between 1.2s and 3.2s |
| Pulse | Two thin arcs "( )" radiate from the word at 1.5s and again at 1.7s. They are path morphs, so the stroke stays 2.4 px wide. | Opacity at 1.8s |
| Contact 3.5s, f105 | The O's rounded outline lands on fin 2's edge vertex, within 1.5 px. The word flattens to 0.8 along its travel direction about the touching point, leaves a 42% imprint that holds from 3.75s to 4.25s, and is gone by 5.0s. | Contact distance; width shrinks; imprint between 30% and 50% at 4.0s; gone after |
| 4–8s | The first reflection emerges at the contact point and departs at 3.78s (f113) at scale 0.75 and opacity 0.75. It rebounds left and deeper, quickly and then easing (speed at 3.9s > 1.3× speed at 6.85s), meets the left wall at 7.0s (f210) and flattens to 0.85. Three ripple arcs follow. | Scale ±0.006 and opacity ±0.01 at departure; emergence and contact within 1.5 px; ripple; direction |
| Push | A dolly, not a zoom, from 4s to 16s (smoothstep, 170 world units). Fin scales at 16s: nearest 1.654, fin 2 1.288, fin 5 1.096, farthest 1.031. Both walls stay in frame. | Still to 4s; still increasing from 8 to 12s; stopped from 16 to 20s; parallax > 0.1; walls on screen every second |
| 8–12s | The second repetition emerges at the left contact from 7.1s, departs at 8.0s (f240) at 0.55 and 0.52, and meets the right wall at 10.5s (f315). The third departs at 10.66s (f320) at 0.38 and 0.34 and is visible through 12s. | As above |
| 12–16s | The third meets a protruding left-wall ledge at 12.5s (f375). The fourth departs at 12.66s at 0.25 and 0.20 and meets the right wall at 15.0s (f450). The fifth departs at 15.16s (f455) at 0.15 and 0.10. Deformation decreases at contact (0.80, 0.85, 0.89, 0.93, 0.965) and at departure (0.78 … 0.975). | Only the fifth word is visible at 16s |
| 16–20s | The final word recedes with ease-out progress and no bounce. Perspective alone takes it from 0.15 to 0.08 (0.080 measured at 18.45s); it fades to 0 at 18.5s (f555) within 30 px of the opening. Its ring rides with it and vanishes at 19.0s (f570). From 18.6s the canyon is empty. | Scale ±0.004; opacity; ring centred on the word within 2 px; no typography after 18.6s |
| Upright, readable, on screen | Tilt leans into horizontal travel and returns to 0 at each contact. Largest lean over the 20s: w0 6.4° (during the 3.6s flatten), w1 4.5°, w2 3.5°, w3 2.8°, w4 2.0°, w5 1.2°. | Every visible word inside the viewport and ≤ 8° from vertical, sampled every 0.05s |
| Smaller, cooler, fainter | Scale and opacity fall from word to word, and the fill moves from cream `#f6e6c2` to periwinkle `#b3c2ff`. | Static relation check |
| Paint order | Render-tree leaf order equals draw-item order at 0, 5 and 12s. | §2.1 |

### What is approximated, and how

- **The camera push.** GVR's camera is a 2D position and zoom. A uniform zoom would not separate near rock from far rock, so the push is a dolly baked into the fins. Each fin group scales about the vanishing point by `Z / (Z - push(t))`, written as an expression. This is exact perspective for a plane at constant depth, but the canyon walls are a stylised stack of nine planes rather than continuous surfaces. The GVR camera is unused.
- **Word motion in depth.** Position, scale and tilt are sampled at 60 Hz from the same model and simplified to keyframes (0.08 px position tolerance). 11,822 samples become 769 keyframe values on 43 tracks.
- **Stated scales.** I read the script's percentages as on-screen scale relative to the original word at the moment each repetition departs, including the push. The original reaches the wall at 0.92 because its contact point is deeper than its start.
- **"Flatten" and "compress along its travel direction".** These are scale-along-an-axis, built as rotate(θ) · scale.x · rotate(−θ) in three nested groups, once for departure and once for arrival. On a diagonal path this shears the letters. The worst lean is 6.4° at 3.6s.
- **Sound.** There is no audio. Each spoken "Echo" is a pair of thin arcs at the departure. "More reverberant" is a static 1.5–3.5 px blurred copy behind each repetition. "Reverberation decays by 19s" is the final ring fading out at 19.0s.
- **Contact ripples.** These are half-ellipse arcs opening toward the wall, drawn in the fin's layer so that they push with it. They are not projected onto the wall surface.
- **The ledge.** The ledge is a 34-unit protrusion in fin 5's edge noise, over the height of the contact.
- **Bold condensed lettering.** These are hand-drawn outlines: cap height 120, advance 60, stem 21. A `text` node offers no condensed face, cannot be split into letters, and has no outline geometry.
- **The floor shadow.** It is clamped to the floor strip and does not climb the walls.

### Still wrong or unverified

- **Legibility at the stated opacities.** The fourth and fifth repetitions, at 20% and 10% opacity, are hard to read in the 12.66–17s stills even after I darkened the far fins and brightened the cool fills. The script asks both for these opacities and for "readable". I kept the opacities.
- **A doubled word.** For about 0.3s around each emergence, the imprint and the new word overlap and read as a doubled word (3.85s, 4.2s, 7.6s). This is a consequence of "emerges from the contact point" combined with "remains as a faint imprint".
- **Blur in device pixels.** Blur radius is in device pixels and does not scale with the word, so the far words' ghost is relatively larger. **Hypothesis:** this reads as reverberation rather than as a defect.
- **Real-time playback.** Evaluation takes 11.6–12.9 ms per frame in Node. Real-time playback in the playground was not measured.
- **Easing match.** The shadow's opacity is word opacity × height fade. I sampled that product with my own reimplementation of the runtime's named easings, and did not verify it against the runtime's curves.

### Baseline measurements

| Measure | Value |
| --- | --- |
| Builder | 1,312 lines, 62,194 bytes |
| Program | 1,926 lines, 125,073 bytes (23.9% of `maxSourceBytes`) |
| Nodes | 173 of 500: 68 groups, 96 paths, 8 ellipses, 1 rectangle |
| Depth | 9 of 16 (word → 2 × rotate–scale–rotate → letter → face) |
| Tracks | 138 of 1,000: 18 expression (fin dolly), 43 sampled transform/opacity (769 keys), 34 authored opacity (118 keys), 11 flex (40 keys), 4 letter spacing (20 keys), 28 path morph (56 keys) |
| Keyframe values | 1,003 |
| Steps | 0 of 1,000 |
| Path commands + polygon vertices | 2,663 of 10,000 |
| Largest byte shares | fin geometry 37,114 B; glyph outlines 26,800 B (the four-letter word drawn 17 times); path-morph keys 12,404 B |
| Program generation | 39–61 ms |
| Compile (`compileMotionScript`, Node) | 1.40–1.68s over seven runs |
| Evaluate, Node | 11.6–12.9 ms per frame (600 frames at 30 fps); 67.7% self time in `schema/src/graph.ts` |
| Render, Chromium `CanvasRenderer` | 3.1–3.3 ms per still (average of 34, four runs) |
| Builder run | 15.4–16.4s without stills (about 7.5s evaluation loop, 6.5–7.3s checks, 1.5s compile); 23–27s with stills |
| Limits approached | None. Nested deformation pushed depth to 9 of 16; it would reach 12 with a third deformation axis. |

## 2. Hardest and most error-prone aspects, ranked by cost

### 2.1 Paint order changes when any group has compositing (runtime). Highest risk.

**Evidence.** The first real-renderer stills (0.05s to 1.62s) showed only the farthest fin. Its violet face covered the whole frame, and the words and nearer fins were missing, while every draw-item check passed. `renderTreeFromScene` (`packages/runtime/src/frame.ts`) builds the tree in node declaration order whenever any group has `compositing`. `CanvasRenderer.render` draws that tree instead of `drawItems`, so `zIndex` stops having any effect. The program had declared the fins near-to-far after the words, and the echoes' `blur` groups turned the tree on. Reduced to three nodes: two rectangles with `zIndex 2` and `zIndex 1` plus one blurred group give `drawItems behind,front` but `renderTree front,behind,soft.dot`. Without the blur group both orders agree.

**Root cause.** Runtime. `effects.blur` is marked supported in the compiler, runtime and renderer, and this is a discrepancy in supported semantics. A scan of the other committed programs that use compositing (Through the Blue, Square Wave) found no misordered items, because both declare nodes in paint order.

**Workaround.** The builder emits top-level units sorted by their `zIndex` and asserts that render-tree leaf order equals draw-item order.

**Cost.** One wasted render cycle and a diagnosis. A program checked only on draw items would ship broken.

### 2.2 A forward push with depth (language, camera model)

**Evidence.** The script asks for "a slow push into the canyon", "keeping both canyon walls visible", and then "let the shrinking typography create the remaining depth". The 2D camera zoom scales everything equally. The builder therefore carries a full 3D model and duplicates `push(t)` twice:
- in TypeScript, for sampling the words;
- in 18 expression strings, two per fin, because `scale.x` and `scale.y` each need a scalar track.

The words, shadows and final ring cross depths, so 11,822 samples became 769 keys on 43 tracks.

**Risk.** If the TypeScript formula and the expression strings disagree, the words slide off the walls. The contact checks guard this: the touching outline point is within 1.5 px of the fin's own vertex, and each next word emerges within 1.5 px.

**Root cause.** Language: no depth on layers and no camera axis along the view.

**Workaround.** Fronto-parallel fins with expression scale tracks, and projection in the builder.

### 2.3 Contact geometry and squash along a travel direction (language, and my implementation)

**Evidence.** "Compress along its travel direction" while the letters face the viewer needs a scale along an arbitrary axis. That took six nested groups per word: rotate, scale and unrotate, once for departure and once for arrival. The pivot is the touching point projected onto the travel axis.

The first contact solve used the word's bounding box. That box corner is about 12 local units outside the rounded O, a visible gap at scale 1. The builder now samples the glyph outlines (24 points per cubic) and takes the support point along the wall normal. The rock edge has to stay unbroken where the word touches, so the edge noise is tapered and a vertex is forced at the contact height. The checks use that vertex as the wall.

**Root cause.** Language (no skew and no axis scale; `transform.skew` is pending), and geometry that is not queryable at runtime (a driver theme).

### 2.4 Lettering (language)

**Evidence.** A `text` node has a builtin family, no condensed width, no per-letter transforms and no outlines. The four glyphs are hand-drawn paths. The word is drawn 17 times: twice for the original (back and face, as separate letters), then back, face and blur ghost for each of the five echoes. That is 26,800 bytes, 21% of the program.

**Root cause.** Language. `text.animators` is pending. Instances are not drawn, so nothing can be reused.

### 2.5 Derived channels (language)

**Evidence.** The shadow's position, size and opacity, and the final ring's position, are functions of the word. The builder samples each separately. Opacity is a product of two curves, so the builder reimplements keyframe easing (`sampleKeys`) to sample it. **Hypothesis:** those easing curves may not match the runtime's; this is unverified.

**Root cause.** Language: one channel cannot read another.

### 2.6 Smaller costs

- **Radial gradients are circular.** The opening glow first had a hard arc at the top: a 720 × 300 ellipse cut its 360-radius gradient at 42%. The fix is a round ellipse with `scale (1, 0.42)`.
- **Reserved keywords.** A reproduction for §2.1 used `top` as an id. The compiler answered "rectangle needs a name", "Expected '{'" and "Unknown property top", but never said that `top` is reserved.
- **Blur is static and in device pixels.** Reverberation cannot grow or decay. The registry already says "Animated blur radii are not a track channel".
- **No audio or cue markers.**
- **Per-frame cost.** 12 ms per frame for 173 nodes, about two-thirds of it in `graph.ts`. This is consistent with the per-frame cost theme.

## 3. Improvements

### Easier implementation

| Change | Removes from this program | Allows | Status |
| --- | --- | --- | --- |
| Build the render tree in the same sibling `zIndex` order as `drawItems`, with a conformance test covering a blur group | The sorted-emission workaround and the order check | Authors may declare in any order once any effect is used | Defect in a supported claim. New here. Route to the conformance and fidelity process. |
| Builder tooling: a shared helper that renders through `CanvasRenderer` and compares render-tree order with draw-item order | About 60 lines of preview code that every recent builder repeats | Catches §2.1-class defects that draw-item checks miss | Recurs in the tooling theme (Pixels, City, Small Ideas, Crane) |
| A shared "sample a model function and simplify it to keys" helper | About 40 lines plus a tolerance choice | Comparable keyframe budgets across stories | Tooling. Recurs as generated driver tracks (Blue, Circle, City). |
| Keyword diagnostics that name the reserved word | Guessing time | | Recurs (Moon, Packet, Clockwork, Copperleaf, Circle) |
| A vec2 expression, or a uniform `scale` expression | 9 of the 18 expression tracks | | New |
| Ellipse-shaped radial gradients (a radius vec2, or a gradient transform) | The scale workaround | Elliptical glows and vignettes | New. Not pending. |
| Cache the node index once per frame in the runtime | About two-thirds of the 12 ms evaluation | Real-time playback of larger plates | Recurs (Square Wave, City). No language change. |

### More expressive representation

| Capability | Removes from this program | Allows | Status |
| --- | --- | --- | --- |
| **Layer depth and a dolly camera.** A group `depth Z` that the camera projects about its centre, plus a camera track along the view axis. The runtime would apply `Z / (Z - cameraZ)`. | 18 expression tracks; the TypeScript duplicate of `push`; and, if a word's depth could also be keyed, most of the 43 sampled tracks (769 keys from 11,822 samples) | Real parallax pushes and pull-backs, and words thrown "into" a scene with keys at four or five contact points | New sampling rule for Scene IR, so it **needs a design decision**. Related to the camera theme and to Home's baked projection. |
| Scale along an axis, or skew (`transform.skew`) | 4 of the 6 deformation groups per word (24 groups in all), and depth 9 → 5 | Squash-and-stretch along any velocity | `transform.skew` is pending. Its use for projected text recurs (Home, City). |
| Drawable instances or symbols | 16 of the 17 copies of the word (about 25 KB) | One ECHO definition with per-instance fill, opacity and blur | Recurs (11 other stories). `composition.definitions` instances are validated but not drawn. |
| Text with a condensed face and per-glyph transforms | The hand-drawn outlines and four letter groups | Real fonts; letter-by-letter squeeze and stagger | `text.animators` is pending. Recurs in the text theme (Small Ideas also drew its own glyphs). |
| Channels that read another channel (drivers) | Separate sampled shadow and ring tracks; the reimplemented easing | Shadow = f(word), ring rides with the word | Recurs (the most frequent theme) |
| Animated blur radius | | Reverberation that grows and decays with each echo | Not pending. The registry restriction would have to change. |
| Audio cues | | The six "Echo" calls tied to their departure times | Recurs (every story). Others recommend metadata cues first. |
| Repetition: six structurally identical words generated from parameters | Most of the builder's per-word code | | Loops or functions are a new execution model and **need a design decision**. Instances cover much of it without one. |

## 4. Priority

**Fix first**
1. The render-tree ordering defect (§2.1), with a conformance test. It silently changes a released, supported semantic as soon as any group uses `blur`, `isolated` or `blend`.
2. Keyword diagnostics, and the shared render-order check plus real-renderer preview helper for builders. Both are cheap and catch the classes of error found here.

**Experiment**
1. A depth-and-dolly camera prototype, measured against this plate's 18-expression baseline and its 43 sampled tracks. Success would be the same contact accuracy (≤ 1.5 px) with no sampled word transforms.
2. Axis scale through pending `transform.skew`, measured by group count and depth.
3. A vec2 or uniform-scale expression.

**Defer**
- Animated blur and audio cues, until more than one story needs them in a form a design can settle.
- Loops and functions, which need a design decision. Instances come first.

