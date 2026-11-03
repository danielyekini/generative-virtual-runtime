# Image resource lifecycle, crisp sampling and texture recipes (E019)

Decision: 3 November 2026. [Issue #38](https://github.com/danielyekini/generative-virtual-runtime/issues/38).
This is a decision plus a host-level prototype. There is no MotionScript / Scene IR version bump. The
already published `resources.image` capability (0.2.0) gains conformance tests
and moves from `untested` to `supported` for its stated scope. Language
surfacing is the follow-up [E045 #204](https://github.com/danielyekini/generative-virtual-runtime/issues/204).

## Requirement

M2 scenes reuse images: sprites, icons, tiles and pixel art. Before
this run the renderer owned an unbounded `href → HTMLImageElement` map. It never
evicted entries across scene replacement, had no readiness signal for hosts, and
always used bilinear smoothing. The registry restriction said "pending or failed
readiness fails before playback", but nothing enforced that, and no test pinned
any image behaviour.

## Alternatives

1. **Renderer-owned lazy cache (status quo).** It needs no host work. But startup
   can show a frame with missing sprites, memory grows with every distinct href,
   and nothing reports failure. Rejected as the contract. Kept as the fallback
   path for hosts that never prepare, where draws still acquire lazily.
2. **Runtime-owned loader.** This puts I/O inside `@gvr/runtime`. It breaks the pure
   `evaluate(t)` / headless test model that audio (E008) also preserved.
   Rejected.
3. **Host loader states + renderer cache with scene-scoped retention**
   (chosen). This mirrors the audio contract. The program declares resources. The
   host loader reports `pending | ready | failed` per resource id. The runtime
   decides what is *required* purely from the scene. The renderer owns decoded
   memory and draws only decoded pixels.

## Contract (prototype, implementation-bound)

- **Required set.** `sceneImageRequirements(scene)` returns the image resources
  that some image node draws. A resource that is declared but never drawn is
  never required.
- **Readiness.** `sceneImageReadiness(scene, states?)` resolves each required
  resource. The host state is used first, then the program's declared `readiness`.
  With neither, the resource counts as `ready`, so lazy hosts keep working. `pending` holds startup. `failed` blocks it with a
  reason. Fonts stay `source: "builtin"` and are always ready. Web fonts are out
  of scope.
- **Presentation.** `GeneratedOffer.imageStates` feeds `assessReadiness`:
  "Required image X is still loading." / "… failed to load." These are checked
  next to the audio checks and before the sealed-coverage check.
- **Renderer cache.** `ImageResourceCache` (in `@gvr/canvas-renderer`):
  - `prepare(resources)` starts every declared image load. It evicts entries the
    new scene does not declare: it cancels in-flight loads and closes decoded
    images. A load that settles after eviction is discarded and closed.
  - `statesFor(resources)` reports states by resource id for `imageStates`.
  - `get(href)` returns pixels only when they are ready. A zero-pixel decode counts as `failed`.
  - `onChange` lets a paused host redraw when a load settles.
  - It reports `renderer.image_cache_entries` and `renderer.image_decoded_bytes`
    (width × height × 4) telemetry gauges.

  A renderer owns its cache unless the host passes a shared one. `dispose()` clears
  only an owned cache. The default browser loader uses `HTMLImageElement` +
  `decode()`. Without a DOM there is no loader, and acquisition reports `failed`
  instead of waiting forever.
- **Crisp sampling.** `imageSampling: "smooth" | "pixelated"` is a renderer
  option, set with `setImageSampling`. `pixelated` sets
  `imageSmoothingEnabled = false` for each image draw. Scaled pixel art then
  keeps hard texel edges at any device-pixel ratio. This is a host recipe, not a
  Scene IR property. E045 versions a per-node `sampling` so authors can choose.

## Texture and repetition recipes compared

| Recipe | Authoring | Runtime cost | Decision |
| --- | --- | --- | --- |
| Sprite atlas frames (source-rect grid + integer `frame` channel) | Name a grid and a frame index; no pixel arithmetic | One draw per sprite; one decoded atlas | **Next** (E045) |
| Grid tiling via drawable bindings (E005/E023) | Existing syntax; the compiler can derive positions | One draw item per tile | **Use today**, no new semantics |
| Image pattern paint (`CanvasPattern`, repeat + phase) | Concise for large textured fills | One fill; pattern-space and clip/matte rules needed | **Deferred** to evidence (E046 #205) |
| Procedural materials / shaders | High creativity, but unbounded | GPU / backend specific | Out of scope (E021 experiments) |

Language change gate (direction): sprite frames keep author arithmetic low
because the compiler derives the source rects. A frame index is easy for a
generator to vary. A frame channel streams like any sealed scalar. Pattern paint
adds a new coordinate space that authors must reason about, so it waits for
evidence.

## Evidence and limits

- Tests: `packages/runtime/src/visual-resources.test.ts` (compile → resource →
  per-frame href, required set, state precedence, presentation hold/block) and
  `packages/canvas-renderer/src/images.test.ts` (state transitions, zero-pixel
  failure, eviction/close/cancel, late-settle discard, decoded-bytes gauge,
  pending draws nothing, pixelated sampling, owned vs shared dispose).
- Decoded memory is an RGBA estimate, not a browser measurement. No real-browser
  memory profile or GPU-upload timing was run here. `imageSmoothingEnabled` is a
  standard 2D-context property. Browsers that still need vendor-prefixed
  variants are not targeted.
- Studio does not yet call `prepare` or feed `imageStates`. Its draws still
  acquire lazily, so behaviour is unchanged. E045 adds the Studio surface.
