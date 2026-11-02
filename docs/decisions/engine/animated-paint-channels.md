# Animated solid paint and stroke channels (E009)

Status: adopted for implementation under
[E009 #28](https://github.com/danielyekini/generative-virtual-runtime/issues/28).
Language release: MotionScript / Scene IR **0.8.0**, capability
`paint.animatedSolid`.

## Requirement and scope

Animate authored solid fill (including text fill), solid stroke colour or alpha,
and uniform stroke width on a single node, without expanding to cross-faded
overlay copies. Verify interpolation, writer ownership, inheritance relative to
node opacity, compile/emit/parse equivalence, seek/sample behaviour, and older
reader rejection via `requires` / `requiredCapabilities`. No legacy-format
adapter expansion or source-fidelity gate.

## Alternatives compared

1. **Scalar channels (chosen).** Add gated number channels
   `fill.r|g|b|a`, `stroke.r|g|b|a`, and `stroke.width`. Reuses existing number
   keyframe/expression sampling, exclusive scalar writers, and entity ownership.
   Colour and alpha animate separately, matching the live acceptance wording.
   Authorship uses 0–1 components (and positive width), not a new colour literal
   track type.

2. **Whole-colour `PropertyType`.** A `color` track value would allow `#rrggbb`
   keyframes in one writer. Stronger for coupled RGB transitions, but forces a
   new value type through schema validation, compiler literals, expressions,
   emitter, and seek caches. Separating alpha (required by acceptance) still
   needs an extra channel or a split colour+alpha model. Deferred; revisit if
   authoring friction is proven.

3. **Overlay nodes (status quo).** Duplicate nodes with opacity cross-fades.
   Works today but multiplies nodes/tracks and fights the savings goal. Rejected
   as the primary path; overlays remain available for effects outside this
   contract.

## Chosen contract

- Capability id: `paint.animatedSolid` (MotionScript `requires`, Scene IR
  `requiredCapabilities`). Wire stays `"0.2"`.
- Channels write straight-alpha components in `[0, 1]`; `stroke.width` must be
  `> 0`. Samples merge over the node's authored solid fill/stroke base.
- Tracks on a node whose fill or stroke paint is missing or non-solid leave that
  paint unchanged (base preserved); compilers should not emit such tracks for
  ordinary authoring.
- Node `opacity` remains independent of `fill.a` / `stroke.a`.
- Gradients, dashed strokes, non-uniform width, and animated stroke cap/join are
  out of scope.
- Lottie/SVG animated-paint lowering is `not-applicable` / unchanged unsupported
  until a separate explicit request.

## Acceptance and verification

Native compiler compile of the channels with the capability token; runtime
mid-window and seek samples for fill colour, fill alpha, stroke colour/alpha and
stroke width; Scene IR validation of the new channel ids; emitter round-trip of
a program that uses them; older package builds without the capability reject the
document. A conformance note records that one painted node plus channels replaces
an overlay pair for a solid colour transition.

## Revisit

Introduce a whole-colour value type, gradient stop animation, or adapter
lowering only with a fresh scoped issue and version/registry update.
