# Adding Two Vectors: language proposal

Retrospective written after the implementation, as supplied, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). Its tables were flattened when pasted and are kept as received. The reported `sampleKeyframes` and `noteEase` defects have not been re-verified here.

---

What made Adding Two Vectors hard
The picture is three arrows, a grid, and one equation over 30 seconds. The checked-in program is 746 lines and 19,873 bytes, emitted by a 685-line TypeScript generator. The mathematics of a = (3, 1) and b = (1, 2) was the easy part. The scene cannot say arrow, dash, underline, or head-to-tail, so those were expanded before compile.

746
Lines of MotionScript
41
Keyframe tracks
201
Keys, each padded to 0s and 30s
29
Text nodes for about ten sentences
The generator is the program
Five arrow groups repeat the same shaft, triangle, and label. About 67 of 73 move commands are dash segments, because a stroke has no dash pattern. The storyboard's optional ticks were dropped: MotionScript has no audio clock. None of that is a reason to add a general function language first.
Where a small mistake draws the wrong frame
Source: adding-two-vectors.ms, its builder, runtime sampleKeyframes, compiler noteEase, and schema trimCommands. Observed on this one story.

Aspect	Failure	What the implementation had to do
Keyframe past the last key
Wrong motion	sampleKeyframes keeps segment 0 when time is past every key but before 100%. A track that ends early interpolates the first segment, not the hold. Every track is padded to 0s and 30s, and nearby times need extra percent digits so two keys do not collapse.
hold does not declare itself
Wrong motion	ease hold is a string, and noteEase returns before registering a capability. The named cubic eases are detected. A program that uses hold and omits requires "easing.hold" compiles a track the contract does not claim.
Trim joins subpaths
Wrong geometry	trimCommands resamples the whole path into one polyline. A dashed shaft cannot draw on: the gaps become ink. Dashes therefore cannot be the same path as the arrow, and the ghost copy is a second shape.
Arrow is three nodes
Timing drift	The shaft is a path trimmed in 0–1, inset by HEAD − 7 so it tucks under a filled triangle. The head fades over the last 0.26s and the label over a different window. Those offsets are not the trim point, so the head appears at the tip instead of traveling with the stroke.
Text has no width
Misaligned marks	Content cannot change, and nothing reports an advance. The underline is a separate line at character index × 15.6533203125, the Chrome canvas advance for Menlo 26. One pixel of padding previously covered the closing parenthesis. The SVG preview uses Helvetica for sans, so the same source does not measure the same.
Two tracks, one gesture
Pop	A ring pulse is opacity plus scale. Scale is still at the peak when opacity hits 0, then snaps back over 0.04s while invisible. If that window overlaps the next visible state, the ring pops. The coupling is only in the generator.
Math space is host code
Stale coordinates	Screen y grows down. (3, 1) is written as (444, 448). Head-to-tail, the reversed route, and (4, 3) = a + b are asserted in TypeScript before emit. The scene cannot say that b's tail is a's head.
Changes, in the order they pay off
The first three are contract repairs. The rest are scene constructs. Pending work already covers transform.autoOrient, text.animators, geometry.repeater, and a proposal for animated solid fill. Repeater would collapse the eleven grid lines. Animated fill would let the route soften by color as well as by the 0.78 opacity used here. Neither replaces a marker or a measured underline.

Change	Kind	Mechanism	What a richer program can then do
Hold after the last key
Fix	When progress is past the last offset and below 1, return that key. Warn if the last key is not 100% and no fill is set.	Storyboard times can stop when the motion stops.
Register string hold
Fix	noteEase should treat the string hold like the hold object and add easing.hold.	requires matches the eases actually used.
Time keys
New	Allow 5.5s beside 18.3333%, resolved against the track start and duration.	A 30s board stays in seconds. Percent collision handling goes away.
Dash as stroke
New	A dash pattern on the stroke, not extra move/line pairs. Reject or skip trim across a multi-subpath path until trim is per subpath.	Ghost vectors and axis guides stay one stroke, and can still draw on.
End marker
New	A constant-size arrowhead at the stroke end, or at the current trim end, oriented by the tangent. Land with the pending transform.autoOrient.	One arrow definition. The head travels as the shaft draws. Five hand-built triangles disappear.
Measured text spans
New	A span can be underlined, and a monospace run exposes its advance. Same font metrics in canvas and SVG.	The component equation is one text node. The Menlo constant and the parenthesis bug go away. Pending text.animators can then reveal characters.
Y-up frame
New	A group frame maps author coordinates with y up and equal scale. Text and labels stay screen-upright. Negative scale is not enough, because it flips type.	The program says (3, 1) and (1, 2). A second example is new numbers, not a new pixel layout.
Symbol with parameters
New, narrow	One arrow body, placed with tail, vector, color, and label. Not a general function or loop. Those remain a design decision in the compatibility policy.	The reversed route is two more placements. A parallelogram or a third numeric example does not need another generator.
Point binding
New	A position channel may reference another node's sampled point, with the same deterministic seek as expressions.	b's tail follows a's head for the whole move. The relationship is in the scene, and the runtime can check it.
What this story could have been
With the marker, the dash, and measured text
The shaft draws and the arrowhead sits on the moving end. The original b is the same arrow with a dashed stroke, not a second chevron. The equation is three revealed lines, and the underline is a span on "3 + 1", then on "1 + 2". The Menlo advance constant is gone, and canvas and SVG agree.

With a y-up frame and a symbol
Placements read tail (0, 0), vector (3, 1) and tail (3, 1), vector (1, 2). The reversed order is the same symbol from (0, 0) along (1, 2), then from (1, 2) along (3, 1). A parallelogram, component brackets, and a second pair of numbers are more placements. They are not another 600 lines of pixel geometry.

Leave for a design decision
General loops and function declarations still need an execution-model decision. A parameterized symbol does the reuse this story actually needed. Audio wants a clocked event channel, separate from the draw list. Until that exists, storyboard ticks should stay out of the scene rather than being faked with extra nodes.
