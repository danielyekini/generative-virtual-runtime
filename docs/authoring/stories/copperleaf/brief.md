# Copperleaf Run: brief

Direction script as supplied, recorded 2026-10-29.

---

Title: Copperleaf Run
Duration: 30 seconds
Style and tone: Original 16-bit pixel art with a bright, brisk adventure feel. Crisp silhouettes, limited palettes, and discrete sprite poses; no motion blur or frame blending.

Setting and initial layout: A scrolling woodland ruin. Ground platforms lead right across two gaps toward a checkpoint and a stone tunnel. Distant mountains, middle-distance trees, and foreground grasses establish depth.

Characters or subjects: Pip, a small courier with a teal hood, orange scarf, and square backpack. A copper beetle patrols a raised platform ahead. Gold coins mark the jump paths. Movement remains left to right.

[0:00–0:05] — Running start
- Camera: Side view. Hold briefly as Pip enters from the left, then follow with Pip near the left third.
- Action and poses: Pip accelerates across the ground using six distinct running poses. The scarf alternates between three trailing shapes. Pip collects three evenly spaced coins at 0:02, 0:03, and 0:04. Ahead, the ground ends beneath a short elevated platform.
- Timing: Reach full running speed by 0:01. Each collected coin disappears immediately, leaving a four-frame sparkle.
- Sound and effects: Light footfalls, three ascending coin notes, quiet woodland ambience.
- Transition: Continue scrolling as Pip approaches the first takeoff point.

[0:05–0:10] — First gap
- Camera: Track horizontally with a fixed vertical position, keeping the landing platform visible.
- Action and poses: At 0:05–0:05.3, Pip lowers into a two-pose anticipation. Push off at 0:05.3, extend into the rising pose, then tuck the knees near the apex at 0:06.2. Collect two coins along the arc. Switch to a feet-down falling pose and land at 0:07.2. Show a compressed landing pose, a half-rise, then resume running by 0:07.6. The copper beetle becomes visible on the next broad platform.
- Timing: Slow vertical motion near the apex; make foot contact immediate and readable. Keep the landing recovery brief.
- Sound and effects: Jump chirp, two coin notes, and a soft landing thud with three square dust particles.
- Transition: Pip runs toward the broad platform while the beetle patrols left toward the approach.

[0:10–0:15] — Over the patrol
- Camera: Maintain the side track, revealing the beetle’s full patrol space and the route beyond it.
- Action and poses: Pip crosses onto the broad platform at 0:10.5. The beetle continues left using a four-pose walk cycle. At 0:11.4, Pip crouches and jumps over it. The beetle passes beneath Pip at the apex around 0:12.3; leave a visible gap between feet and shell. Pip lands beyond it at 0:13.2, compresses, recovers, and runs on. At its left patrol marker, the beetle pauses and visibly turns right, following behind.
- Timing: Use one uninterrupted jump arc. Hold the beetle’s turn pose for two frames before reversing its walk cycle.
- Sound and effects: Mechanical beetle ticks, jump chirp, landing tap. No contact flash.
- Transition: The beetle trails at the left edge as a wider gap and coin trail enter from the right.

[0:15–0:20] — Stepping-stone leap
- Camera: Continue right, easing upward by a small fixed number of pixels to frame a narrow intermediate platform.
- Action and poses: Pip launches at 0:15.4, collects one coin, and lands on the intermediate platform at 0:16.7. Show the complete compressed landing pose before the next crouch. Push off again at 0:17.2, collect two coins, then land on the far ledge at 0:18.8. Pip recovers and runs toward an unraised checkpoint flag. The beetle stops at the gap behind.
- Timing: Give the intermediate landing half a second to register. The second jump travels farther horizontally.
- Sound and effects: Two jump chirps, three coin notes, and distinct landing taps.
- Transition: Ease the camera back to its original vertical framing as the checkpoint approaches.

[0:20–0:25] — Checkpoint claimed
- Camera: Slow the horizontal track as Pip reaches the flag at center-right.
- Action and poses: Pip touches the checkpoint post at 0:21. The flag rises in four stepped positions, changing from muted purple to bright orange. Pip brakes with two short steps, holds a hand-up celebration pose from 0:22–0:22.6, then leans forward and resumes running. The raised flag continues a three-pose flutter behind.
- Timing: Synchronize activation with contact. Let the flag reach the top before Pip’s celebration hold.
- Sound and effects: Short checkpoint arpeggio and a ring of eight pixel sparks that disperse without fading into blur.
- Transition: Resume full tracking speed as Pip approaches a broad stone arch.

[0:25–0:30] — Into the next section
- Camera: Follow continuously through the arch. A foreground stone pillar crosses the frame at 0:27–0:28, briefly masking the scenery change.
- Action and poses: Pip maintains the running cycle and ground height through the passage. Behind the pillar, woodland scenery gives way to blue cavern walls, glowing mushrooms, and timber platforms. Pip emerges at 0:28 beside a new coin trail. Collect the first coin at 0:29 and continue toward a visible low step.
- Timing: Keep running speed, sprite scale, and animation phase continuous across the transition. End during a forward stride.
- Sound and effects: Woodland ambience gradually becomes cave drips; the music retains its beat. Add one coin note at 0:29.
- Transition: No cut or fade. Continue scrolling into the cavern section beyond 0:30.

Pixel and parallax direction: Render at a fixed low resolution and enlarge with nearest-neighbor scaling. Snap sprites, camera offsets, and scenery layers to whole render pixels. Move distant mountains at roughly one-quarter camera speed, trees at half speed, and foreground grasses slightly faster than the platforms, using integer-pixel steps. Keep sprite outlines and tile edges sharp throughout.

Final visible composition: Pip runs into the cavern with the next platforms already visible, preserving momentum for a seamless continuation.
