# Counter: language proposal

Retrospective written after the implementation, as supplied, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). Its table was flattened when pasted and is kept as received.

---

The fight was hard because MotionScript stores independent keyframe tracks, and almost every beat in Counter is a relationship between two bodies. The generator is a private animation system that solves those relationships in TypeScript and bakes the result. The compiled scene is valid. The language never checks whether a punch lands.

build-counter.ts is 1,233 lines. It writes counter.ms: 3,463 lines, about 69 KB, 65 keyframe tracks, 12 ease hold segments, and about 61 drawables. The authoring is 168 pose keys and 11 contact windows. Each fighter is then exploded into roughly 18 channels: position, body, torso, head, brow, jaw, fingers, and four limbs of three joints each. Resource caps were not the limit. Sixty-five tracks is far under the 1,000-track budget, and 69 KB is far under the 512 KB source cap. The cost was getting the baked motion to mean the choreography.

What the generator had to own
Contact. Expressions may read only PI, t, local_t, and progress, plus arithmetic. They cannot read another node. Every hit is a two-bone search in solveLimb: fist in front of the face, hammer on the floor, shoulder tap, caught fist, ankle grab, wrist kick, hook, rising kick, and the offered hands. The search is seeded from the previous solved frame so the elbow does not flip. After that, the arm is just angles. At 27.12 s the first impact pose left the kick 86 px short of Orange’s chest, because the hips were about 170 px apart and the leg is about 114 px long. The compiler accepted it.

The floor. There is no ground constraint. plant() sets hip y from the lowest foot. A key with an explicit y is airborne. Between two grounded keys the generator replants the blend, or the feet sink or float as the legs change length. The camera reused the same key type, with zoom stored in body and camera y stored in y. Omitting y on a camera key would have planted the camera on the floor.

Facing. World-right is scale.x = 1 and world-left is -1. Pose angles are in that facing space, so one guard preset works for both fighters. A linear scale track from 1 to −1 passes through 0 and flattens the body. expand() inserts a 1 ms key that keeps the old face and copies the new pose, and the scale track uses ease hold. A missed snap mirrors the next punch.

Spins. A limb at 0° points down. Positive rotation is clockwise. A somersault of −360° and a cartwheel of +360° must snap back to 0° over 1 ms with ease hold. A long linear segment from −360° to 0° plays the spin backwards. The generator first treated any value jump near 360 as a spin. A slide of about 368 px was held in place until that rule was limited to angle tracks.

A whole pose is not a key. K() carries unspecified channels forward, then the emitter writes one track per channel. Each track must include 0% and 100%, with strictly increasing offsets. Time is a percentage of the 30 s scene, so a 1 ms snap or a three-frame hold is a few thousandths of a percent and needs extra digits to stay strictly increasing. Preset order was its own bug: a later { ...GUARD } overwrote an explicit body angle, including the cartwheel’s 360°. Several keys were authored and then silently replaced.

Sampling can drop the action. Default easing is linear. Wind-up and impact easing exist only on the baked samples. Tracks are simplified to about 1.4 px and 1.1°. Contact windows are resampled every 40 ms so a held ankle stays in the hand. A sparse linear span between the catch and the release lets the hand leave the leg. Small dodges are the first thing that simplification removes.

Language limits underneath that
Limit	What it did to this scene
No cross-node values
Hits, grabs, and the offered hand cannot be written as motion. They are solved outside the program.
No constraints
Feet, grips, and “stop before the pillar” are baked positions. Changing a pose later breaks the contact.
Scale interpolates through 0
A face change flattens the fighter unless it is a 1 ms hold.
Angles are not cyclic
A full spin reverses unless it snaps back with ease hold.
One channel per track, time as a percentage
A pose is about 18 tracks. A three-frame hold is percentage arithmetic on a 30 s duration.
zIndex is a fixed integer
Paint order cannot change. A child cannot draw outside its parent, so the pillar stays behind both fighters for the whole scene.
Instances are not drawn
composition and instance parse, but an instance is a static transform plus an activation window. Sampling and the canvas renderer never draw one. The second fighter is a full copy of the rig. const is a number, not a pose.
Animatable channels are transform, opacity, visibility, path commands, and trim
Fill, stroke, size, and text cannot move. The flash, blackout, crack, shock ring, dust, and pebble are extra nodes with opacity tracks. There is no audio.
Validation checks structure: two keys, endpoints, duration, ids, and budgets. It does not check distance between a fist and a head. The misses showed up only in rendered frames. Round heads also make brow and jaw motion easy to miss, so “Cyan looks serious” is a small rotation on a circle.

Two tooling traps made the natural file location and the natural debug check wrong. ease hold values are different objects, and the emitter round-trip test compares them by identity, so this program cannot live next to the other .ms fixtures. The runtime’s logicalMatrix already includes the camera. The generator’s forward kinematics is in world space. The first check reported the skull 72 px off. That was the camera, not the rig. The foot group is not a drawable, so the ankle check had to target the foot bone.
