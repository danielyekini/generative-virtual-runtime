# Path attachment space (E039)

Decision: 3 November 2026. [Issue #173](https://github.com/danielyekini/generative-virtual-runtime/issues/173).
Versioned in this change as MotionScript / Scene IR 0.22.0 `geometry.pathSpace`.
The 0.17.0 path-local rule stays the sampling rule for scenes that do not require the new capability. That version file is unchanged.

## Requirement

`geometry.pathProgress` writes a command-space point into `transform.position`. A traveller stays on the stroke only when it shares the path's transform parent and the path transform is identity. Moving, rotating or scaling the rail, or parking the traveller somewhere else in the tree, leaves the traveller behind. Authors were inserting an extra parent and keeping the path transform neutral. That is scene-graph arithmetic the runtime can do.

Authoring gates (3 November 2026): one `attach` statement; generation stays that statement; streaming stays sample-time.

## Alternatives

1. **Keep path-local placement (strongest current-system option).** Documented in Scene IR 0.17.0 and backed by the existing conformance tests. Rejected as the ongoing contract: the neutral-transform rule is the footgun this issue names. It remains the behavior of scenes that require only `geometry.pathProgress`.

2. **Opt-in `compose` flag, default false.** Stored scenes would not move, but every author and generator would have to remember a boolean to get "on the stroke". Rejected.

3. **Rewrite `geometry.pathProgress` sampling in place, with no new token.** Identity transforms would match, and non-neutral path transforms would start following the stroke. Rejected: 0.17.0 states that the path transform is not composed. That is defined behavior for stored Scene IR, not an unfinished feature. The runtime note for this package says older programs keep the reader they were written for.

4. **Compose only the path's local matrix and still require a shared parent.** Fixes a translated rail and still forces the shared-parent wrapper when the rail lives in a moving group. Rejected. The issue asks for the path node's drawn space, including a different parent.

5. **Write root-world coordinates into `transform.position`.** The draw pass would apply the parent again. Rejected.

6. **Compose into the traveller's parent space behind `geometry.pathSpace` (chosen).** `attach` syntax is unchanged. The compiler adds the capability next to `geometry.pathProgress`. Sampling uses the same `localMatrix` as drawing, without the camera. Scenes that lack the token stay path-local.

## Contract

- **Capability.** `geometry.pathSpace`, wire `"0.2"`, with `geometry.pathProgress` whenever attachments exist.
- **Syntax.** None. `attach <node> along <path> { progress; orient; rollRadius; }` still lowers to `pathAttachments`.
- **Placement.** `inverse(world(traveller parent)) × world(path) × commandPoint`, after morph then trim. `world` uses the sampled pose and `transformParentId ?? parentId`.
- **Order.** A path that is itself attached is placed before travellers that read its transform. Cycles are `CYCLE` and those poses stay authored. The validator reports the same cycle when the capability is required.
- **Rotation.** Transformed tangent when `orient` is set, plus command-space `distance / rollRadius`. Non-uniform scale changes the tangent. Scale does not change rolling.
- **Spaces.** Both nodes must be world or both screen. `SPACE_VIOLATION` drops the attachment at compile time and, for hand-built IR, at sample time.
- **Singular parent.** `RUNTIME_DEGRADED`, authored pose kept.
- **Pivot.** The written channel is still `transform.position`. A non-zero traveller pivot offsets the origin as it does for any node.
- **Identity.** Shared transform parent and an identity path matrix match 0.17 positions.
- **Adapters.** No Lottie or SVG lowering.

## Critical pass

- *Streaming.* Missing nodes skip, as in 0.17. Late transform tracks change the next sample and do not rewrite the sealed attachment.
- *Cancellation.* No retained matrix. The pose is recomputed from the assembled scene.
- *Failure.* Mixed space, singular parents, degenerate tangents and cycles leave an authored pose and a diagnostic. They do not throw.
- *Compatibility.* Stripping `geometry.pathSpace` from a translated rail restores the command-space point.
- *Authoring.* `fixtures/motionscript/path-space.ms` moves a parent and rotates the rail. The traveller is not a child of that parent.

## Child work

None. This decision is the 0.22.0 implementation. Width profiles and standalone `transform.autoOrient` stay pending, as in the E015 decision.

## Revisit

- If a story needs rolling to follow the scaled stroke rather than command arc length, that is a separate sampling rule.
- If a story needs the traveller's pivot solved so the local origin sits on the stroke, record that as its own ownership note. Do not change the 0.17 channel write inside this capability.
