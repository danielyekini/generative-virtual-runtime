# Building a Square Wave from Sine Waves: language proposal

Retrospective written by the implementing agent after the implementation, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). It changes nothing in the registry, a published version file or `pending.md`.

Evidence for this retrospective, all at commit `4a1801a`:
- The builder's own checks, which sample `AnimationRuntime.evaluate` draw items. They compare the drawn blue curve against the exact partial sum at 601 x positions, and fail above 1 px.
- 27 stills rendered through the real `CanvasRenderer` in headless Chromium (Playwright's bundled Chromium, Linux fonts), at 0.25, 0.5, 1.25, 2, 3.6, 4, 5, 6, 8, 8.9, 9.8, 11, 12, 12.9, 15, 16, 16.5, 18.5, 21, 21.9, 22.4, 23.5, 25, 25.6, 27, 27.4 and 29.99s. They were looked at as stills; playback was not watched.
- A CPU profile of 300 `evaluate` calls in Node, and compile timings in Node and in Chromium.

Anything not measured is marked **hypothesis**.

---

## 1. State of the result

| Measure | Value | Budget |
| --- | --- | --- |
| Source | 417,381 bytes, 1,081 lines | 524,288 bytes (`maxSourceBytes`): 79.6% |
| Nodes | 249 | 500 |
| Tracks | 62 | 1,000 |
| Steps | 67 | 1,000 |
| Geometry items (static) | 1,531 | 10,000 |
| Compile, Node | 2.6–3.2s (six runs) | |
| Compile, headless Chromium | 1.56–1.91s (three runs) | |
| Evaluate, Node | 20–23 ms per frame | 16.7 ms at 60 fps |
| Builder run, no preview | 6.5–7.0s | |
| Builder run, with Chromium preview | 12–15s | |

The program is deterministic: three consecutive builder runs wrote the same SHA-256.

### What matches the script

- **Blue partial sum.** The curve is exact to the stated scope. It is one path node animated with `geometry.pathMorph`. Its 21 keys are the partial sums S1…S16, each sampled at the same 257 x positions as Hermite cubics with analytic slopes. Path morph lerps matching commands, so between keys the drawn curve is exactly S(n) + α · term(n+1), with α the eased progress. That is the script's "contribution from zero to full amplitude".
  - The builder checks the drawn curve against the analytic sum within 1 px at 7s (S1), 10.5s and 11s (S1 + α·term3), 12.3s (S2), 15.5s (S3), the midpoint of every 7–15 blend, 21.1s (S8), 26s and 29.5s (S16).
  - The final sum crosses y = 0 at x = −π, 0 and π within 0.6 px.
  - The flattened Hermite error, estimated before building, is about 0.2 px.
- **0–4s.**
  - Axes fade in over 0–0.5s.
  - The dashed target is revealed left to right over 0.5–2.0s; at 1.25s the wipe is exactly half way.
  - Holds 2–4s, with the title shown.
  - The orange (4/π) sin x is drawn below over 1–2s (still `t02.00`).
  - At 3.2–3.95s a copy of the orange wave shrinks into the position of the equation's first term (`t03.60`). The orange "sin x" fades in there.
- **4–8s.** S₁(x) = 4/π sin x is shown with a stacked fraction (`t05.00`). The blue curve traces over 4–6s; at 5s it reaches x ≈ 0. "1 term" appears at 6s.
- **8–12s.**
  - The third harmonic is drawn below over 8–9s with "4/(3π) · sin 3x" and "3× frequency · ⅓ amplitude".
  - Three signed orange arrows, at x = π/6, π/2 and 5π/6, grow over 9.0–9.7s on both graphs. On the main graph they run from S1 to S2 within 1 px (`t09.80`): two up, one down.
  - The blend runs over 10–12s. "2 terms" shows at 12s, and the arrows and component fade at 11.8–12.2s.
- **12–16s.** The fifth harmonic is shown over 12–13s and its term is appended at 12.6–13s. The blend runs 13–15s and the hold 15–16s. "3 terms" shows at 15s, and the equation contracts to 0.86 scale over 15.4–16s.
- **16–22s.**
  - Harmonics 7–15 are added one per second. For each, the component is shown below, the orange term is appended, and the blend runs over the full second. The counter reaches 8 at 21s.
  - At 21.25–21.75s the expanded sum crossfades to S_N(x) = 4/π Σ sin((2k+1)x)/(2k+1), N = 8 (`t21.90`).
  - The jump at x = 0 is boxed from 21.4s.
- **22–27s.**
  - Eight more terms, through harmonic 31, are added over 22–25s, 0.375s each. The counter and N both advance to 16.
  - The inset opens at 22–22.35s, below the main graph, joined to the box by two leader lines. It shows −0.6 ≤ x ≤ 0.6, magnified 4.9× in x.
  - The ripples crowd toward the jump (`t22.40` against `t25.60`).
  - At 25s a ring marks the S16 overshoot. It sits at x = 0.0982 and y = 1.1793, within 0.5 px, and is labelled "Gibbs phenomenon…".
  - A blue dot sits at (0, 0) on the inset curve, labelled "Midpoint at the jump".
- **27–30s.** The inset and annotations close over 27–27.4s, and the closing caption fades in over 27.3–27.9s. The 16-term sum, the dashed target, the general formula with N = 16, and "16 terms" hold to the end (`t29.99`).
- **Layout.** At every half second, every drawn item stays on screen. Everything except the closing caption stays above y = 640.

### What was simplified or differs, and why

- **Counter and equation change at different moments.** The equation's subscript and new term switch when a blend starts; the counter switches when it ends. The counter therefore always counts terms fully added, but the two disagree during each blend. For example, at 11s the equation reads S₂ and the counter "1 term" (`t11.00`), and at 18.5s they read S₆ and "5 terms" (`t18.50`). This was my choice. The script does not say which moment the counter should mark.
- **N keeps counting.** The script ends 16–22s with "N = 8". I kept N in step with the counter, so it reads 16 at the end, matching the final 16-term curve.
- **New terms change colour by crossfade.** A new term appears in orange and turns ink when its blend ends. Text colour cannot be animated, so each term exists twice, and the crossfade is visible as a brief mix.
- **The target is revealed by a wipe, not drawn.** A white rectangle above the target slides right over 0.5–2.0s. Trim cannot draw a dashed path on, because `trimCommands` joins its subpaths (see 2.4).
- **The equation is plain text.** It is built from text nodes and lines: stacked fractions, a 48 px "(" and ")", Unicode subscripts S₁…S₈, and a separate small "N" for S_N. There is no math typesetting.
- **The Gibbs label is two lines.** Text has one line and no wrap.
- **The shrinking orange copy loses stroke width.** The copy scales non-uniformly (0.06 × 0.12), so its stroke thins on the way (`t03.60`).
- **The lower half is empty from 22s.** The component graph is hidden there. Harmonics 17–31 have no component display (the script does not ask for one), and the final hold has empty space in the lower half (`t29.99`). The script's final composition does not mention the lower graph.
- **Sound is omitted.** The program has no audio and no cue markers.

### What is wrong or unverified

- **Frame cost.** Evaluation costs 20–23 ms per frame in Node, above a 60 fps budget. **Hypothesis:** the playground drops frames on this preset. Browser frame times were not measured. The cause is in section 2.3.
- **Equation fonts.** The layout uses estimated serif advances. It was checked only in Linux Chromium, where measured boxes do not overlap and the expanded S8 ends at x = 896 px. It is unverified with macOS or Windows "serif" fonts.
- **Playback.** Playback was not watched; motion between stills is inferred from the checks.

## 2. Hardest and most error-prone aspects, by cost

### 2.1 Expressing the sum exactly within the source budget (language)

- **Evidence.**
  - One track, `sum.commands`, is 276,604 bytes: 66% of the program and 53% of `maxSourceBytes`.
  - The inset needs a second morph track of 34,025 bytes, because nothing can draw the same curve twice under a different transform with a clip.
  - Holds need duplicate full-path keys: S1 at 0 and 10s, S2 at 12 and 13s, S3 at 15 and 16s, S8 at 21 and 22s, S16 at 25 and 30s. That is five duplicates, about 66 KB, in the main track alone.
  - 128 linear segments would have needed about four times the knots for the same error. That is why the builder fits Hermite cubics from analytic slopes; 256 cubics give an estimated error of about 0.2 px.
- **Root cause: language.**
  - A curve can only be a literal list of commands.
  - "Add α of this term" cannot be stated, so every intermediate state is precomputed as a whole path.
  - Expressions drive scalar channels only and cannot read other channels.
- **Workaround.** Exact keyframes, plus the fact that a linear morph of identically sampled sums is the weighted sum. This works only because the blend is linear in y and all keys share x positions. A blend that also moved the curve in x would not be exact.

### 2.2 Equation layout without text measurement (language, runtime)

- **Evidence.**
  - Three layout passes were needed.
  - The first pass left a 25 px gap before "+" and put "(" against "sin x" (`t09.80`, first render). The general formula had loose Σ spacing.
  - The second pass made "N =16" touch.
  - The builder now measures every equation text node with the browser's `measureText` in preview mode and reports any overlaps. It reports none at 21.1s and 29.99s.
- **Root cause.** Text has no measurable width in the language or runtime, and there is no fraction, subscript or rich text.
- **Workaround.** A per-glyph serif width table, centre-aligned fraction columns that tolerate width error, and the browser overlap report.

### 2.3 Per-frame cost (runtime)

- **Evidence.** In a CPU profile of 300 `evaluate` calls, 50% of self time is in anonymous closures in `packages/schema/src/graph.ts`.
  - `worldMatrix` and `rootOf` each rebuild `indexNodes` over all nodes, once per draw item.
  - `childrenOf` rebuilds the index and filters every node, once per parent in `traversalOrder`.
  - Together the cost is quadratic in node count.
  - Removing the trim tracks or the morph tracks changed per-frame time by less than 1 ms (20.4 → 19.7 / 19.6 ms).
  - `trimCommands` on the 257-command sum costs 0.6 ms.
- **Root cause.** Runtime, not language.
- **Workaround.** None in the program. Discrete state (counter, subscripts, N) is already on `visible` steps rather than extra tracks.

### 2.4 Trim joins subpaths (runtime)

- **Evidence.** `trimCommands([M 0, L 10, M 20, L 30], 0, 1, 0)` returns `M 0, L 10, L 20, L 30`, so the gap between dashes is drawn. Trimming the dashed target would draw a solid line.
- **Root cause.** Runtime: `samplePath` flattens every subpath into one point list.
- **Workaround.** A paper-coloured wipe rectangle with its own `position.x` track and a `visible` step at 2s. It only works on a flat background.

### 2.5 A track replaces an authored value absolutely (own error, language semantics)

- **Evidence.** The wipe's `position.x` track started at 0 while the rectangle was authored at x = 92. The track replaced the authored value, so the wipe began 92 px too far left and uncovered the right end of the target early. The builder's half-way check caught it ("cover at 550"), and the track now starts at 92.
- **Root cause.** My implementation error. The trap is that tracks set channels absolutely, and an authored `position` silently stops mattering. This is the same family as the "two writers on one channel" theme.
- **Workaround.** Values the track writes are absolute.

### 2.6 Changing text and colour cost nodes (language)

- **Evidence.**
  - "N terms" is 16 text nodes. The prefixes S₁…S₈ and S_N are 9 nodes, and N = 8…16 is another 9. These account for 52 of the 67 steps.
  - Each appended term is two groups (orange and ink) of four nodes each.
  - 123 of the 249 nodes are text.
- **Root cause.** Text content and fill colour are static.
- **Workaround.** `visible` steps and crossfades.

### 2.7 Tooling around the builder (tooling)

- **Evidence.**
  - `npm run typecheck` fails on the base commit `6b951be` with 12 errors in other story builders (clockwork, counter, crane, moon). My builder added two more, which are fixed.
  - `npx vitest run` fails one test on the base commit too: `validate.test.ts > fixture harness`. There, `fixtures/ir/invalid/duration-limit.json` is no longer rejected, which is consistent with the 60s duration budget from `1f1e3de`. **Hypothesis.**
  - Playwright resolves for `require` (global `NODE_PATH`) but not for ESM `import`, and has no types in the repo. The preview needed a `createRequire` fallback and a local type.
  - Bundling `@gvr/canvas-renderer` for the page took one `esbuild` call. No shared helper exists.
- **Root cause.** Tooling.

## 3. Suggested improvements

### GVR fixes and tooling, no language change

1. **Index the graph once per evaluated frame.** Build `indexNodes`, the children lists and the world matrices once, and memoise them by id.
   - **This program:** most of the 20–23 ms per frame (measured share 50%; the saving after a fix is a **hypothesis**).
   - **More detailed version:** the node budget becomes usable. 249 nodes already exceeds a 60 fps frame.
   - **Recurs:** none of the other proposals measured evaluation; Crane reports 6.7 ms per frame with 112 nodes.
2. **Trim per subpath.** Decide whether trim runs across subpaths in sequence (Lottie's "simultaneously/individually" modes are the precedent) or per subpath, and keep `M` breaks either way. This is a semantic fix in already-supported trim, so under AGENTS.md it comes before new coverage. It needs a registry scope check for the Lottie `tm` rows.
   - **This program:** the wipe rectangle and its step.
   - **More detailed version:** dashed curves, such as a dashed S_N, could be drawn on.
3. **Compile cost.** The program has 163 top-level declarations and steps against a 417 KB scene and compiles in 2.8s in Node. Copy-on-write snapshots, as Crane proposed for `applyUnit`, would shorten the stall when the preset is selected.
   - **This program:** about 2s of stall on selection (measured 1.6–1.9s in Chromium).
   - **Recurs:** Crane.
4. **Shared builder tooling.** Move this builder's Chromium preview, `measureText` overlap report, path-to-polyline sampler and curve-error check into a shared story helper.
   - **This program:** about 150 lines.
   - **Recurs:** Blue, Clockwork, MotionScript→Motion, Crane.
5. **A diagnostic hint when a track overrides an authored transform value.** This would have flagged 2.5 at compile time.
6. **Fix the baseline.** Fix the 12 typecheck errors and the stale `duration-limit` fixture, so that a new story's checks start green.

### Experiments with the current language

1. **Segmented tracks instead of duplicate hold keys.** `selectWriter` picks the latest-starting active track and holds a finished track with `fill forwards`. **Hypothesis:** one track per blend, each with two keys, removes the five duplicate keys, about 66 KB. The semantics and seek behaviour of overlapping writers need measuring first.
2. **Adaptive knots.** Keep the shared topology, but place knots densely near the jumps and sparsely on the plateaus. **Hypothesis:** half the segments at the same 0.2 px error, which would halve the main track.
3. **Plot only what is visible.** The inset could reuse a coarser main-curve sampling, if a clip existed. Without one, measure whether 40 inset segments are enough (estimated error 0.002 px at 80 segments, so likely yes).

### Language proposals

Each of these needs the language proposal template, conformance tests and a version note before anything is claimed.

1. **Expressions that read channels (drivers), plus a plotted-curve geometry.**
   - A `plot` node draws y = expression(x) over a domain with a sample count.
   - Expressions may read a node's scalar channels, so each term can carry a weight track that goes from 0 to 1.
   - The sum is written out as sixteen explicit terms, so no loop is needed.
   - **This program:** both morph tracks (310 KB) and the S_n precomputation. **Hypothesis:** the program would fall below 40 KB.
   - **More detailed version:** sweeping the inset window, animating the frequency of a single term, or a phase shift, none of which a linear morph can express.
   - **Recurs:** drivers are the most frequent theme (Moon, Packet, Vectors, Clockwork, Counter, MotionScript→Motion, Blue). A plotted function is new in this story.
   - **Design decision:** a `Σ` or `for` over k would be a loop, which is a new execution model.
2. **A discrete text-content track.** `step`-like keys that set `content`.
   - **This program:** the 34 counter, prefix and N nodes, which become 3.
   - **Recurs:** Packet, Vectors, Counter, MotionScript→Motion. `text.animators` is pending, but its scope is per-glyph animation, not content.
3. **Animated fill colour, including text fill.**
   - **This program:** the 14 term groups that exist only to change colour.
   - **Status:** `paint.animatedSolidFill` is drafted in `pending.md` for solid fills. It would need to say whether text fill is in scope.
   - **Recurs:** Moon, Packet, Vectors, Counter, MotionScript→Motion.
4. **Dash pattern on strokes.**
   - **This program:** the hand-cut dashes in the target and the inset (58,702 bytes of static paths are mostly dashes and component waves).
   - **More detailed version:** a dashed path could be trimmed on, once trim keeps subpaths.
   - **Recurs:** Packet, Vectors, Clockwork.
5. **Clip, or drawable instances, for an inset.**
   - **This program:** drawing the main curve again under an inset transform with a clip would remove the second morph track (34 KB) and keep the two views consistent by construction.
   - **Status:** `compositing.mask` and `compositing.matte` are pending.
   - **Recurs:** drawable instances are raised by Packet, Vectors, Clockwork, Counter and MotionScript→Motion.
6. **Text measurement or simple math layout.** At minimum, a node that reports its laid-out width, so neighbours can be placed after it. Fractions, sub- and superscripts and large operators are a larger step that needs a design decision.
   - **This program:** the width table and three layout passes.
   - **Recurs:** "text that can be measured" (Packet, Vectors, Counter, MotionScript→Motion).
7. **Key times in seconds.**
   - **This program:** the six-decimal percentage conversion.
   - **Recurs:** Packet, Vectors, Counter, MotionScript→Motion.

## 4. Priority

- **Fix now:**
  - graph indexing in `evaluate` (measured, runtime-only, affects every story);
  - trim keeping subpaths (a correctness defect in supported semantics);
  - the baseline typecheck and test failures.
- **Experiment next:**
  - segmented hold tracks and adaptive knots on this program, measuring bytes, error and seek behaviour;
  - a prototype of drivers plus a plotted curve, written up in the proposal template and measured against this program's 417 KB and 21 ms.
- **Defer:**
  - math typesetting;
  - any Σ or loop construct (needs a design decision);
  - audio cues;
  - dash patterns and clipping, until the pending compositing work lands.
