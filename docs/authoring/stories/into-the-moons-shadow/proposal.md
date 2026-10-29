# Into the Moon’s Shadow: language proposal

Retrospective written after the implementation, as supplied, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). The capability table was flattened when pasted and is kept as received.

---

The hardest parts of Into the Moon’s Shadow were not the beat sheet. They were places where the language forced physics, compositing, and dual-view continuity to be reconstructed outside MotionScript.

Hardest / most error-prone parts
1. Dual-panel continuity without a shared driver
Both plates must obey one relative timeline. Today that means an external TypeScript model that samples moon Y, shadow edges, sky offset, camera, and label positions, then bakes dense keyframes. Expressions can use t / local_t, but they cannot read another channel. If the moon path or Earth radius changes, every derived track must be regenerated. That is the largest authoring risk in the piece.

2. Eclipse silhouette without masks
compositing.mask / compositing.matte are pending and unsupported. The sky “bite” is a same-color eraser disc on #12161c. It works only while the eraser stays over matching ink. A full-sky dim overlay would punch a visible moon disc through the vignette, so dimming had to be edge washes instead. Totality then needs a separate black disc + corona fade. This is fragile and blocks a more convincing partial eclipse (soft limb, Bailey’s beads, diamond ring).

3. Shadow over Earth vs paint order
zIndex cannot escape a parent. Putting the cone on Earth meant reordering siblings so Earth paints under the translucent fills. Without masks, the cone also paints into empty space around Earth. A scientific plate wants “shadow footprint clipped to the disc,” which the language cannot say.

4. Camera + label coupling
To keep the observer on a fixed screen line while zooming:

camY = focusY + (360 − AIM_Y) / zoom

World labels scale with zoom and become huge in the close-up, so body/shadow tags are faded out before the zoom and restored on pullback. Screen labels that follow world points need the same external sampling as the geometry. Camera aiming is correctable but easy to break silently.

5. Path morph rigidity
Umbra/penumbra/rays are morphing paths with a fixed command structure. Tip vs far-clip needs different topologies (triangle vs clipped quad), so the main diagram and inset are separate morph families. Boundary rays cannot be animated line from/to; they must be paths. The emitted .ms is ~114KB of sampled morph because there is no parametric cone.

6. Paint that cannot change
No animated solid fill (paint.animatedSolidFill is only a pending proposal). Sky brightness, Earth nightside, and corona have to be faked with opacity stacks and static radials. Uncovered solar surface staying uniformly bright was a paint-order fight, not a lighting model.

7. Small traps that cost real time
Keywords cannot be ids (left / right). Screen space only on roots. Opacity multiplies, so nested fades surprise. Trim on a long path is hard to aim at a moving umbral edge. Contact times are asserted in the builder because the runtime has no notion of “event when edge crosses point.”

Suggested MotionScript / GVR improvements
Ranked by how much they would have changed this film, and how much richer a next version could be.

Already pending — land these first
Capability	Why it matters here
compositing.mask / compositing.matte
Real lunar silhouette over the Sun; shadow footprint clipped to Earth; vignette without eraser hacks; soft mattes for penumbra falloff.
paint.animatedSolidFill
Animate sky brightness, Earth shading, and stage washes directly instead of stacking fades.
These alone would replace the most brittle visual tricks in the current plate.

Highest-leverage new language work
1. Channel references in expressions (or named drivers)
Allow something like:


expression "value(orbit.moon.position.y)"
expression "value(camera(main).zoom)"
or a first-class driver moonY { ... } that many tracks read.
Then one moon path can drive shadow morph seeds, sky offset, label Y, and contact opacity without a codegen pass. This is the continuity rule made enforceable inside GVR.

2. Billboard / non-scaling text (or world→screen attach)
space screen attached to a world point, or scaleWithCamera false. Labels stay readable through the Earth zoom without fade-out choreography.

3. Camera aim helper
Declare aim (worldPoint) at (screenPoint) or keep orbit.watcher at (640, 237). Removes the hand-rolled camY formula and the class of “observer slid off the alignment line” bugs.

4. Clip-to-path / clip-to-sibling
Even a simple hard clip (before soft masks) would let the umbra/penumbra paint only over Earth, and let the path of totality live as a stroke clipped to the disc.

5. Parametric or computed path sources
Not full scripting — a bounded “cone from two circles” or “region between four rays” operator that morphs by parameters (moonY, radii, far X) instead of command lists. Cuts file size and removes topology traps.

What would unlock a more impressive next film
With masks + referenced drivers + billboard labels + clip:

Soft penumbra falloff and umbra nested cleanly on the globe
True filtered partial with a sharp lunar limb, no ink-matching eraser
Diamond ring / Baily’s beads as masked crescents
Corona as an animated radial (or masked glow) only while coverage is total
Atmosphere limb darkening keyed to penumbral depth
A readable close-up with persistent “Path of totality” and body tags
Possibly a third small HUD driven by the same moonY driver
Optional later, still valuable but narrower:

Animated gradient stops for corona growth
Stroke endpoint animation so construction rays stay lines
Identifier escapes for reserved words
Paint-layer / overlay group that can sit above a chosen sibling without full tree reordering
Contact/event markers as authoring metadata (even if runtime ignores them) so tools can assert “C2 at 21s” without a custom verifier
What I would not rush
Full general programming (loops, functions, arbitrary scene queries) is the “stop for a design decision” class in AGENTS.md. The sweet spot for this film is bounded dataflow: drivers, channel reads, masks, clip, and camera aim — not a second language inside MotionScript.

Bottom line: the current piece proves the physics and continuity can be made correct, but only by pushing geometry, camera math, and dual-view sync into a TypeScript generator. The biggest GVR upgrades for authoring and visual ambition are masks/mattes, animated solid fill, expression/driver channel references, billboard labels, and camera aim/clip. Those turn “bake a 40s eclipse in a builder” into “author one driver and compose two views.”
