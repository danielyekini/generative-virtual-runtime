# A Crane, Then a Square: language proposal

Retrospective written after the implementation run was cut short, recorded 2026-10-29. Unlike the other proposals in this folder, it was written by a reviewing agent from the committed program and builder, not by the agent that built them. Unevaluated; see the [index](../README.md#what-these-proposals-are).

Evidence for this review:
- Re-ran `build-crane.ts` at commit `1550053`. The output was byte-identical to the committed program, and the builder's own checks passed.
- Rendered 28 frames through the real `CanvasRenderer` in headless Chromium (0s, 0.46s, 1.42s, … 34.9s).
- Sampled draw items with `AnimationRuntime`.
- Profiled `compileMotionScript` in Node.

The rendered frames were looked at as stills only; playback was not watched.

---

The program covers all 35 seconds and compiles cleanly. It is not finished: the crane in the middle never reads as a crane, the ochre mark is missing at the start and end, and the file is far beyond every practical size budget. The underlying problem is that the brief describes a 3D object made of two-sided panels, and MotionScript is a 2D language without depth, faces or dynamic paint order. The builder therefore contains a small 3D engine and bakes its projection into flat path keyframes, ten per second.

## 1. State of the program

| Measure | Value |
| --- | --- |
| Program | `a-crane-then-a-square.ms`: 1,934,977 bytes, 23,424 lines |
| Scene | 112 nodes, 123 tracks, 676 steps |
| Path keyframe values | 20,271 |
| Builder | `build-crane.ts`: 1,184 lines, 1m44s to run |
| Compile time, Node | 94s |
| Compile time, headless Chromium | 60s |
| Evaluation | 6.7 ms per frame |

The documented source budget is `maxSourceBytes` = 512 KiB; this program is 3.7 times that. The compiler does not enforce the budget today, which `limits.ts` says is configuration for later stages, so nothing flagged it. The step count is at 676 of the 1,000-step budget.

**What matches the brief.**
- **0–5s:** both diagonal folds, the visible turn-over, the horizontal and vertical half folds, and a blue-up crease network.
- **5–9s:** the collapse into a layered diamond.
- **20–24s:** a hover in which the table shadow broadens and then tightens.
- **24–29s:** the reverse back to the square base.
- **29–35s:**
  - The base opens blue-side up by 31s.
  - The sheet turns edge-on at 33s.
  - It ends as an ivory square that carries crease lines.
- **Sheet integrity:** coarse edge stretch stays at 0.39%.

**What does not match, from the rendered frames.**
- **The ochre mark is never drawn at the start or end.** Runtime sampling finds no `ochre` draw item at 0s, 10s, 21.7s or 34.9s; `ochrehi` is visible only from 2.5s to 8.4s and in short windows later. Its face test (`dot(normal, towardCamera) > 0.05`) does not apply the `ivoryPositive` correction the panels use, so it appears to be inverted relative to the sheet. The builder's "ochre home error 0.00px" check measures the model point, not the drawn node, so it passed.
- **Mesh edges show as creases before any fold.** Every triangle is stroked, so the triangulation shows as crease lines from 0s, including fans in the top-left and bottom-right corners that are not creases at all. The final "crease history" mixes real creases with mesh edges.
- **The square base is not ivory outside.** At 8.5s and 10s it shows a blue half and an ivory half.
- **The bird base does not read as a long diamond.** At 14.4s it still looks like the square base.
- **The crane is not recognisable.**
  - From about 18.7s to 24.8s the model is a narrow vertical sliver.
  - The neck, tail and head are not legible.
  - Wing crease lines float off the paper (21.7s).
  - The requested profile, head left and tail right, is not readable: the head and tail tips are 37 px apart at 21.3s.
- **The no-intersection rule isn't guaranteed.** The brief's "no section passes through another" rests on two static paint-order banks rather than a depth sort, and was not checked frame by frame.
- **Sound:** cues are comments in the header.

**Practical consequence.** The playground compiles a preset when it is selected, and the author view compiles a second, round-tripped copy. Selecting this preset stalls the page for about a minute or more per compile.

## 2. Hardest and most error-prone parts

**A 3D model outside the language.** `build-crane.ts` keeps a 9-vertex sheet for the opening folds and collapse. On top of that it keeps a separate 8-vertex flap mesh per layer, anchored barycentrically to the sheet. Bolted on top are:
- hinge rotations,
- an edge-length projection solver,
- a lift-off-table pass,
- a perspective camera.

All of it is sampled every 0.1s, projected to 2D, simplified with a 1.15 px tolerance, and written out as whole `path { … }` literals. The `.ms` holds the result, not the model, so it cannot be edited as MotionScript. The face and paint-order bugs above all come from this model and its baking, not from MotionScript syntax.

**Two faces per panel.** A panel's visible face depends on the sign of its projected normal. The language has no back face, so every triangle exists as an ivory node and a blue node, with `step … visible` switching them. Most of the 676 steps are those face swaps. A face that flips between two 0.1s samples changes abruptly, and a `dwellShow` debounce hides flips shorter than one sample.

**Paint order that must change.** `zIndex` is a static integer. When the model turns over, the front and back layers must swap, so every face node is duplicated again into a "hi" and a "lo" bank with different `zIndex`. That gives four nodes per triangle (two banks × two faces), plus a shadow copy for each bank. Counter hit the same wall: its pillar can never paint in front of a fighter.

**Strokes on a mesh.** Filled triangles leave hairline seams where they meet, so each triangle is stroked in its own edge colour. That makes the triangulation itself visible as crease-like lines, and a stroke can't be limited to some of a path's edges.

**Size and compile time.** The size comes from 20,271 path keys. Compile time is dominated by the compiler, not the size alone: `applyUnit` (`packages/compiler/src/compile.ts:450`) deep-copies the whole scene with `structuredClone` and runs a full `validateSceneIR` for every top-level unit. With about 900 top-level units (676 of them `step`s) against a 1.9 MB scene, that work is quadratic. In the profile, `structuredClone` is 70% of compile time, garbage collection 17% and validation about 11%.

**Checks that test the model, not the picture.** The builder verifies edge stretch and the ochre model position, which both pass. It never checks emitted draw items or rendered frames, which is why the missing mark and the unreadable crane went unnoticed. Clockwork and From MotionScript to Motion reached the same conclusion: checks need to run on the evaluated scene or a real render.

## 3. Suggested improvements

**GVR fixes, no language change**
1. **Incremental compile validation.** Snapshot and validate only what a unit changes: copy-on-write for the affected node or track, plus validating the new unit against an index of the existing scene. Apply the same treatment to `step` units. This would remove the minute-long stall, and it helps any long generated program and the streaming path.
2. **Report the source budget.** Warn when a program passes `maxSourceBytes`, even if the compiler keeps accepting it, so a 1.9 MB story doesn't pass silently. Story builders should treat the warning as a failure.
3. **Shared frame checks for builders.** Assertions on evaluated draw items (drawn, visible, on screen, near), plus a real-renderer contact sheet. This is the same tooling theme as Clockwork and From MotionScript to Motion.

**Experiments with the current language, before new syntax**
1. **Affine panels from existing transforms.** Under an orthographic camera, a rigid flat panel's projection is an affine image of its rest shape. A group with `rotation` holding a child with non-uniform `scale` and its own `rotation` can express any 2D affine map. Each triangle could then be one static polygon with six scalar tracks (two rotations, two scales, two position components) instead of a path literal per key. To test, decompose each sampled panel matrix and compare against the current path keys:
   - file size,
   - compile time,
   - worst vertex error.

   Risks:
   - angle wrap in the decomposition;
   - interpolating decomposed parameters is not exactly a hinge rotation, so keys stay dense during folds;
   - the current perspective camera is not affine and would need to become orthographic or accept a small error.
2. **Fill-only panels.** Drop the triangle strokes and draw creases only as the explicit crease paths. Measure whether seams are visible in the canvas renderer at playback size. If they are, that is evidence for the mesh primitive below.

**Language proposals (each needs the release process; the first two may need a design decision)**
1. **Two-sided paint.** For example `backFill`, chosen when a node's resolved 2D matrix has a negative determinant. Combined with affine panels, a panel mirrored by its hinge automatically shows its reverse. This would remove the ivory/blue duplicate of every panel and most of the 676 steps.
2. **Hinge rotation about an in-plane axis**, a bounded 3D transform. `hinge (ax, ay) (bx, by) angle` rotates a node about a line in its own plane, composes down the hierarchy (a flap on a flap), and projects orthographically. Interpolation happens in angle space, so a fold stays exact between sparse keys. The crane becomes a tree of panels with angle tracks, perhaps tens of tracks instead of 20,271 path keys. This adds a third dimension to the transform representation, so it needs a design decision.
3. **Dynamic paint order.** Either a stepped `zIndex` track, or a depth-sorted group that orders its children by an animated depth channel. This removes the hi/lo banks here and lets Counter's pillar move in front of a fighter. The cost is that render-tree order becomes time-dependent.
4. **A mesh or edge-selective stroke.** Either a filled polygon mesh with shared edges, drawn without seams, or a stroke limited to chosen edges, so a panel's outline and its creases are separate decisions.
5. **Contact shadows.** `effects.shadow` exists in the registry but is untested; it should be verified before more offset-shadow copies are generated.

**What this would allow.** With two-sided paint and hinges, a faithful crane is a panel tree of a few dozen panels, inside the 500-node budget and well under the source budget. That makes room for:
- the real petal folds,
- inside reverse folds for the neck and tail,
- a head,
- layer-correct contact shadows,
- an ochre mark that is simply a child of its corner panel, so it can't drift or vanish.

The program would describe the folding rather than the pixels.

## 4. Priority

1. **Fix the compile time now.** It is a compiler change with no language impact, and it makes this preset usable in the playground. It can be confirmed with this program as the benchmark.
2. **Fix the program next:**
   - the ochre face test,
   - fill-only panels or edge-selective strokes,
   - ivory outside on the square base,
   - a readable crane profile from about 19s to 24s, with head left and tail right.

   Add draw-item checks for each, so the builder tests the picture.
3. **Then the affine-panel experiment.** If it cuts size and compile time with acceptable error, two-sided paint is the smallest language change that removes most of what remains. Hinge transforms and dynamic paint order should wait for a design decision. Counter's paint-order findings are supporting evidence for dynamic paint order.
