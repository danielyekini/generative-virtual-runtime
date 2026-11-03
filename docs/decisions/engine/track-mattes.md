# Alpha track mattes (E036)

Decision: 3 November 2026. [Issue #156](https://github.com/danielyekini/generative-virtual-runtime/issues/156).
Versioned as MotionScript / Scene IR 0.19.0 `compositing.matte`.
Clip-first (`compositing.mask`, 0.16.0) stands; this does not replace it.

## Requirement

Stories still need a window cut from painted ink: a word, an image, a pair of circles, or a shape whose opacity fades. `compositing.mask` clips to a geometry outline and ignores paint, text, images and partial opacity. Authors were boolean-merging silhouettes or stacking same-colour covers. The canvas renderer still had only `save` / `restore` and `clip()`, so a full design-tool matte stack was the reason E012 deferred this.

Authoring gates (3 November 2026): one id, no path arithmetic; generation stays a short additive line; streaming stays fail-closed and stateless.

## Alternatives

1. **Keep withholding mattes.** Strongest current-system option after clip-first. Rejected: text, image and fading ink are still fake geometry, and clip cannot express them.
2. **Full matte stack (alpha, luma, invert, feather, nested precomps).** Matches After Effects / Lottie `tt`. Rejected for this slice: luma and invert need a second sampling model, and feather is a new property. Blur on the source already softens ink.
3. **Single-shape alpha only.** A painted shape's alpha, no groups. Rejected: a window made of two circles plus a word would force authors to merge outlines, which is the arithmetic this gate avoids.
4. **Alpha coverage of any outside node, including a group (chosen).** `matte <id>;` on a group. The runtime builds a coverage tree of that node. The renderer allocates two canvases for that scope, draws the scope, then `destination-in` with the source's painted alpha. Missing buffers withhold the scope. Luma, invert and a feather property stay out.

## Contract

- **Capability:** `compositing.matte`. Wire stays `"0.2"`. Gate with `requires` / `requiredCapabilities`.
- **Syntax:** group property `matte <nodeId>;`. `matte` is reserved. Implies an isolated scope when `isolated` is omitted.
- **Scene IR:** `GroupCompositing.matte?: { nodeId: string }`.
- **Sources:** any node outside the group. Self, ancestors, descendants and matte cycles are diagnostics. A hidden source (`visible false`) is sampled and does not paint in the main list. A visible source does both.
- **Resolved frame:** the scope carries `matte: RenderTreeNode`. Draw items stay flat.
- **Renderer:** per-scope offscreen pair, `destination-in`, blit with the scope blend. Nested mattes get their own buffers. No buffer means the scope is not drawn.
- **Hit testing:** painted-geometry coverage and node opacity greater than zero. Partial fill alpha does not open holes in hits.
- **Adapters:** Lottie `tt` stays withheld. SVG masks stay untested. No importer expansion.

## Critical pass

- *Streaming.* Ids resolve on the assembled scene. Late sources are valid once present. Missing ids fail closed.
- *Cancellation.* Buffers are created for the frame and dropped. Nothing is retained across cancel or seal.
- *Failure.* Bad ids, containment and cycles are diagnostics. A host that cannot allocate a canvas withholds instead of drawing unmasked.
- *Authoring.* `matte Window;` plus ordinary shapes. No boolean outline.
- *Generation.* Same shape as `clip`, with a source that may be a group.
- *Studio.* Fixture `fixtures/motionscript/alpha-matte.ms` is a Library preset. Window opacity animates so the reveal fades; a clip cannot do that.

## Not in this release

Luma mattes, inverted mattes, a feather property, and Lottie/SVG mask import. Revisit when a native story needs a luminance reveal or hit-accurate partial alpha that geometry coverage gets wrong.
