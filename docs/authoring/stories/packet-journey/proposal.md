# Packet Journey: language proposal

Retrospective written after the implementation, as supplied, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). The 35-second duration finding was resolved when the default budget was raised to 60s in commit `1f1e3de`.

---

The storyboard was not hard to draw. It was hard to keep as one program. Packet Journey is a TypeScript generator that emits about 61KB of flat keyframes, because MotionScript could not say “this packet,” “when it arrives,” or “this color.” The bugs were almost all from copying those facts by hand.

What kept going wrong
One event had to be written in a dozen places. Packet 4 arrives at 11.5s. That number also controls the slot fill, the slot numeral, the fragment, the dashed outline, the cyan rim, the history line, the screen-space buffer inset, and the link glows. The inset for the still-empty third slot lit up during the wide shot because a later fill window was sorted in front of its hide. Nothing in the scene ties those tracks together.

Two behaviors cannot share a channel. The packet rim flashes once when its number appears, then turns cyan when it sits in its slot. Those are two opacity ideas on cyan.opacity. Overlapping tracks are rejected, so they had to be merged into one keyframe list. The same merge ate the opening message: a helper that builds “windows” of opacity started every track at 0, so the message bar was invisible until the first window was given an explicit start value.

Hold does not mean “stay, then move.” Hold keeps the value at the start of the segment until the next key. A camera that rests on the sender and then eases wide needs two keys on the same pose, the second one carrying easeInOut. One hold key followed by a new position is a cut.

Nothing can follow anything else. Link glow is a guess. If both ends of a hop landed within 10px of a wire, that whole wire pulsed. A packet on the upper route could light a neighboring wire, and a short drop into a slot lit nothing useful. The five slot leads were removed because, drawn as permanent lines, they became a fan across the receiver. The buffer inset is a second buffer with its own clocks, not a view of the first. Expressions can see t, local_t, and progress. They cannot see another node.

Paint and text are frozen. Amber becoming cyan is two rectangles and a crossfade. “4”, then “4 → 2”, then “4 → 2 → 1 → 5 → 3” is five text nodes. “Waiting for all packets” and “All packets received” are two more. Dashed slots are a path of separate dashes, because a stroke has no dash pattern. The fragments never actually meet: glyph widths are not available, so the join is a crossfade onto a second copy of HELLO, NETWORK!.

Addresses and origins are easy to aim wrong. A rectangle’s origin is its top-left, while the packet was authored as a center, so every “is it in the slot?” test used a hand-measured local point. Putting the wires inside topology renamed wires.gup0 to topology.wires.gup0. A track aimed at the short name does not compile. cap is a keyword, so a caption could not be named cap. Instances can be declared, and they are not drawn, so a packet could not be a stamp. Six packets are six copies.

The budget is part of the scene. Thirty-five seconds was illegal. The default program length was 30s, so the contract had to move to 60s before the first frame. This schematic is 244 nodes and 120 tracks. That is comfortable only because the packets are simple. A version with icons inside each packet, a glow that rides the wire, and measured letters would spend the 500-node and 1000-track budgets on duplication.

What would make the next one easier, and better
The highest leverage is not a new shape. It is being able to say a fact once.

Drawable instances, with their own tracks. A packet, a router, a slot, and an acknowledgement should be one definition, placed many times. Today a composition can be stored and an instance is not drawn again. If an instance could carry a timing scope and a local journey, detail would be added once: a header bit, a sequence number, a trail. The node budget would count the art, not the copies. Loops and general functions are a new execution model and need a design decision. Drawable instances plus a timing scope do most of this job without that.

Named times. arrival4 = 11.5s, and tracks that say at arrival4 and at arrival4 + 0.2s. Slot, history, inset, rim, and camera would share one cue. This is the change that removes the class of bug this scene actually shipped with.

One progress along a path, used twice. geometry.animatedTrim can already reveal a stroke along a path. What is missing is the packet position sampled from that same progress. One parameter would move packet 3 along the lower wire and light only the portion under it. The retransmission would be the same path with a later progress, not a second list of coordinates. “Do not overtake on a link” becomes two progresses on one path, which a generator can check without projecting points back onto a polyline.

Color channels, including stroke. An animated solid fill is already drafted as paint.animatedSolidFill, and that draft leaves stroke color out. This scene needed the stroke: violet at birth, amber while packet 3 is in flight, cyan in the slot. stroke.r, stroke.g, stroke.b, and stroke.a on a solid stroke would delete the stacked rims. Fill channels still matter for the timer and the slot interior.

Text that can change, and glyphs that can move. text.animators is already open work. Two smaller pieces would change this story specifically. A discrete content change, the way step already changes a boolean, replaces the history stack and the status lines. Per-glyph position, plus the advance width of each glyph, is what makes the ending real: HEL, LO,, NET, WOR, and K! slide into one measured line, and the stroke fades only after they land. A crossfade cannot do that, however carefully it is timed.

A short track that can sit on a longer one. The flash is an event. The seated glow is a state. Additive or multiplied writers on one channel, with the event track ending in fill none, match the way the shot was conceived. Merging them by hand is where the opening message disappeared.

A camera that frames a set of points. The shots in this scene were computed by hand, then checked by printing screen positions. A shot of the form “fit the receiver, the five slots, and the inlet, with 48px of padding, from 11.5s to 16.7s” would hold the out-of-order arrival without another pass of arithmetic. A label that keeps a constant pixel size while staying glued to a world point would do what the storyboard asked for, crisp type during a move, without a second drawn buffer.

Smaller contract holes that this scene kept stepping in. A dash pattern on a stroke. A rectangle anchor at its center, or a documented half-size helper, so a tile’s position is the point it occupies. A duration profile for authored programs of a few minutes, so the next story does not require a contract edit the way this 35s one did. Hold-then-move as a single key with a rest duration, so a camera shot cannot be assembled into a cut by accident.

With those, a more detailed Packet Journey is a different program rather than a larger listing: one packet symbol, three route paths, journeys as progress, the wire lighting under the packet, and the five fragments measured into the final line while the camera frames the receiver. The schematic can then afford the detail, a sequence header, a trail, a break that is a real gap in the stroke, because that detail is written once.
