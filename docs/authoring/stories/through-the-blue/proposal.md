# Through the Blue: language proposal

Retrospective written after the implementation, as supplied, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). Its tables were flattened when pasted and are kept as received.

---

The film compiles, round-trips, and hits the sampled occlusion times. The hard part was shaping a rock around a duplicated motion model. That is an authoring problem, and it does not by itself justify a language change.

1. Assess the result
The program is fixtures/motionscript/stories/through-the-blue.ms (2,333 lines, 58,840 bytes), emitted by build-through-the-blue.ts (1,116 lines). The last successful run reported 178 nodes and 114 tracks. Studio reported that Scene IR A and Scene IR B draw the same frames. Forward kinematics matched the runtime within 0.07px for the bell glint and the tent0 tip.

What was implemented. A 30-second underwater shot with the six storyboard beats. The camera holds for one second, tracks right, moves closer, widens on the rock, pulls back, and stops at 28s. The jellyfish has a translucent dome, an inner ring, a cyan rim, and eight tentacles. Bell contractions are scale keys at 2s, 6.5s, 12s, 22s, and a smaller settle at 26.5s. Plants, two parallax beds, bubbles, and screen-blended light shafts are in the scene. From 29s to 30s a full-frame rectangle fades to #04262e. At the sampled instants the verifier checks, the leading edge enters at 15.15s, the bell and all eight tips are inside at 17.5s and 18.2s, the highest bell point is outside at 19.05s while at least five bell samples stay inside, and the finale does not meet the rock. Stills at 17.5s, 22s, 28s, and 30s match those beats: an empty rock, a cleared bell with trailing tentacles, a close jellyfish above a distant rock, and a deep-teal fade.

What was done differently.

Request	What the program does	Why	Class
Underwater score: ambience, pulse tones, shimmer
Header comments only
The grammar has no audio unit
System limit. The omission is appropriate
Foreground leaves slide faster than distant ones
Separate farBed, midBed, and foreBed position tracks
Existing hierarchy and tracks
Implemented. The speed difference was not measured on screen
A frond briefly masks the lower tentacles
maskFrond is painted at zIndex 26, above the jellyfish
compositing.mask and compositing.matte are unsupported. A shape painted in front can still cover pixels
Implementation. Coverage at 6.5–8s was not checked
Particles remain visible through the bell
Dust is zIndex 7, behind a radial-gradient dome whose center stop is #f8fdffee
Translucent paint already exists
Unverified. No pixel was sampled through the bell
Bell disappears, then tentacles, then a thin rim
One jellyfish group at zIndex 18 and a rock polygon at zIndex 30. The polygon is built from bell and tip samples
A child’s zIndex cannot paint between uncles (graph.ts). zIndex is a static integer
Implementation strategy. It meets the sampled tests and makes the rock an occlusion sleeve
Delayed rippling tentacles
Three quadratic segments per tentacle, a rotation track, a copy of that track delayed by 0.48s, and sine expressions
geometry.pathMorph is supported and was not used. timing.localScopes can shift a track and was not used
Implementation choice
Pull back while the jellyfish grows closer
Jellyfish scale rises to 3.35 while camera zoom falls to 0.7
Zoom scales the whole view. Scale on the subject is the existing way to separate subject size from background size
Implementation decision, and it is the right one
Organic rock formation
A 7-point polygon, #163e48, with two interior wedges
The polygon was solved from coverage tests
Implementation strategy
Observed problems.

At 0s a large bubble is already in frame. Its track starts at posAt(5).x - 80. The story puts that bubble in the 5–10s beat. This is choreography.
At 19s the still shows the cyan rim and also a pale tip at the rock’s right edge. The verifier reports 7/8 tips inside at 19s. The story asks for a thin rim while the jellyfish is otherwise concealed.
The rock reads as a faceted slab. An earlier inset pair, #0c2830 at 72% and #1c4c58 at 38%, sampled as a dark ring around a lighter center and looked like a hole. Wedges fixed the hole. The silhouette is still the seven coverage points in buildRock().
The first compile failed with OVERLAPPING_WRITERS: an expression and a keyframe track both wrote jelly.turn.bellBreath scale. A second failure was The last keyframe has no outgoing segment, so it cannot carry easing on the fade’s final key. Both are enforced in validate.ts. The generator was changed so breath and pulse live on nested groups, and the fade’s easeIn sits on the 29s key.
Unverified. Playback was checked as stills, not as a continuous play. The 1.5s of full concealment is sampled at 17.5s and 18.2s, not on every frame. Parallax, the masking frond, particles seen through the dome, and the fade at 29.5s were not measured. Contraction strength was looked at in the 6.5s and 22s stills only.

The early bubble, the extra tip at 19s, and the angular rock are implementation and testing limits. The absent score is a system limit. The tentacle construction and the dense camera are choices made while supported alternatives were left unused.

2. Implementation friction
Aspect	Concrete evidence	Root cause	Workaround used	Consequence
The rock is a coverage sleeve computed outside the runtime
buildRock() places vertices from bellPoints, tips, and velocity. tipWorld and waveAt reimplement the hierarchy. waveExpr must match waveAt character for character. The verifier throws if the glint or tip drifts more than 3px. After tentacles changed from lines to paths, verify threw missing tent0 tip because it required geometry.kind === "line" even though compile had succeeded
Authoring strategy. The runtime can already sample matrices. The generator mirrored it instead
A second kinematics model, then AnimationRuntime.evaluate as a check. Final glint and tip error were 0.07px
Several rock shapes were wrong before the asserts passed: a hull that swallowed the exit, a slab that left tips outside, a lip that hid the bell until about 21s. The drawing follows the tests
Two motions cannot share one scale channel
First compile: track11 overlaps track10 on node:jelly.turn.bellBreath:transform.scale.x. Expressions do not multiply with keyframes. The diagnostic names the channel and does not say that a child group is how you multiply
Awkward rule, with a clear diagnostic. Nested groups are the existing mechanism
bellBreath holds the sine; bellPulse holds the contraction keys
One failed compile. The hierarchy is four groups deep before the dome, which makes the later paint and occlusion reasoning harder
Easing belongs to the segment that leaves a key
Fade easeIn on the 30s key was rejected: The last keyframe has no outgoing segment, so it cannot carry easing
The rule is real and the diagnostic states it. It is easy to attach ease to the arrival time instead
Ease moved to the 29s key
One failed compile. No remaining defect
Follow camera baked to samples
cameraAt() is sampled every 0.25s from 0 to 30, including the holds. The zoom block has 121 keys. The same list is written for position.x and position.y: 363 keys. clockwork.ms, counter.ms, and copperleaf-run.ms also key camera x and y separately
No follow or aim constraint. A vec2 camera.position channel and spatial tangents do exist (CAMERA_CHANNELS.position, geometry.spatialCurve) and were not used
Piecewise-linear samples so the runtime matches cameraAt at those times
About 370 lines of camera data in a 2,333-line program. Framing between samples is linear even where cameraAt eases
Tentacle delay is a second key list
gather() builds about 21 keys. delayed() resamples that curve 0.48s later onto each tip. Eight tentacles therefore carry two rotation tracks plus three expressions
Expressions can read t, local_t, progress, and math. They cannot read another channel. A timing scope can shift a whole track (localTimeMs) and was not used
delayed() plus a hand-maintained waveAt twin of the expression string
More generated keys. The tip curve is a frozen copy. Changing the gather and forgetting delayed() would not be caught unless the tip FK check fails
Repeating the jellyfish parts
Eight tentacle groups and ten plant groups are unrolled in the .ms. composition.definitions stores instances and does not draw them. The grammar says an instance is not expanded. geometry.repeater is unsupported
Missing drawn symbol. For this film the TypeScript generator already loops, so the pain is output size rather than hand editing
TENTS.map and clump() in the generator
The .ms is large. That size is not evidence that a model would emit it more reliably with a new abstraction
transform.parent is supported and used in clockwork.ms. It was not required for the hide, because the bell and the tentacles had to pass behind the same opaque shape. Splitting them into different paint parents would not remove the need for the path to enter and leave that silhouette.

3. Evaluate improvements
Sample the runtime when placing the rock. This solves the mirrored kinematics and the rock shapes that passed a formula and failed the picture.

Today tipWorld is a private copy of the transform chain. A two-pass generator can emit the jellyfish, call AnimationRuntime.evaluate, read logicalMatrix, and only then emit the rock. The .ms stays legal MotionScript.

Before: a second rot / waveAt chain that must stay aligned with the emitted expressions.
After: the same .ms, with rock vertices taken from evaluated tip and bell points.
Improves correctness and generation reliability. It does not by itself improve visual quality. Token count changes only if the rock gets more vertices.
Cost: the generator compiles twice. No compatibility change.
Any scene that places one object on the evaluated path of another benefits, including the other story fixtures that already bake a camera.
Experiment: delete waveAt and tipWorld, rebuild from evaluated matrices, and require the current occlusion asserts plus glint error under 0.1px.
Hint when an expression overlaps keyframes on one channel. This solves the first compile failure only.

The validator already reports OVERLAPPING_WRITERS and the scalar. The missing sentence is that the two writers replace each other, and a child node is how those motions multiply.

Before: track11 overlaps track10 on node:jelly.turn.bellBreath:transform.scale.x.
After, the same diagnostic plus: An expression replaces keyframes on this channel. Put the second motion on a child node to multiply it.
Improves generation reliability. No playback or token effect.
Cost is one message and a test. Compatible.
Useful for any stacked breathing and posing. One failure is weak evidence, so this stays a small diagnostic experiment, not a language change.
Acceptance: a fixture with both writers on scale.x fails with the hint, and the nested bellBreath / bellPulse program still compiles.
Try one path-morph tentacle before adding tentacle syntax. This solves jointed tentacles. geometry.pathMorph is already supported for a fixed command sequence.

Before: three quadratic path strand nodes, each rotated.
After, hypothetical only in the sense that the program would use current syntax:

keyframes jelly.tent0.ribbon.commands {
  start 0s;
  duration 30s;
  0% path { move (0, 0); cubic (8, 20) (14, 48) (0, 70); };
  100% path { move (0, 0); cubic (-6, 24) (10, 52) (4, 76); };
};
Improves visual quality if the stills look more continuous. It may increase or decrease tokens depending on how many morph keys replace the rotation tracks. It does not prove that a model would author it more reliably.
Cost: every key must keep the same commands. Topology changes are rejected. The occlusion test must sample the curve, not only the end point, or a bow can leave the rock early.
Character limbs and plant bends in the other stories are the comparison set.
Experiment: replace tent0 only, seek 22s and 28s, and require the sampled tip to stay inside the rock at 17.5s and 18.2s.
Do not add a follow camera on this film alone. Dense keys are ugly, and three other story programs also emit camera(main).position.x and .position.y. That is a pattern worth counting later. The lowest-cost test is to fit the existing cameraAt beats as one vec2 track with spatial tangents and measure screen error against the 121-key version. A new follow constraint is justified only if that error stays large across several films.

Do not treat instances as a drawing tool. composition.definitions is released, and its contract says pixels come from scene nodes, not from a second draw of the instance. Recommending instance tent of tentacle would not draw eight tentacles. A drawn symbol would be a new semantic. Eight generated copies in one film do not justify it. The same caution applies to geometry.repeater, mattes, and audio.

A matte is not required for the frond. The story needs a leaf painted over the tentacles. maskFrond can do that if it is placed on them. A clip matte would be a different picture.

Audio would need a new playback model. The visual proxies, rim opacity for the shimmer and scale for the pulse, already exist. No visual-runtime change is warranted for the score.

4. Richer output
A drawn rock, then a path that passes behind it. Achievable now. Essential for the “formation” in the storyboard. Optional detail is a second smaller stone and a softer lit edge. effects.shadow is in the registry with untested support, so it is not a known solution. More polygon vertices, or a filled path, are enough. The acceptance test is the current occlusion table plus a still at 17.5s where the shape reads as stone rather than a sleeve.

A continuous tentacle curve. Achievable with geometry.pathMorph, as above. The delayed, separate tips are already there. A smoother ribbon is polish, not a missing story beat.

Particles seen through the dome. Achievable now by lowering the center stop’s alpha and confirming with a pixel read inside the bell at 12s and 28s. That is essential to the “translucent bell” line only if a sample shows the current dome is opaque. It is optional if the edge already shows the background. No matte is required for that test.

5. Prioritise
Fix now. No MotionScript or renderer change. The demonstrated mismatches are in this generator: the hero bubble is on screen at 0s, and one tip is already outside the rock at 19s. Both can be corrected with the existing verifier. The angular rock can be redrawn with the same point-in-polygon test.

Experiment next.

Build the rock from AnimationRuntime samples and delete the mirrored tipWorld / waveAt math. Accept if the current asserts pass and glint error stays under 0.1px.
Compare the 121-key camera with a vec2 spatial track at the beat times, and record screen error. Look at clockwork.ms, counter.ms, and copperleaf-run.ms before deciding that follow cameras are a language need.
