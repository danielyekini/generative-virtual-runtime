# Scene IR pending

Editable. Draft. Not the current release.

These ids are open representation work. They are not a ban, and they are not waiting on a design review. Land each one in the validator, the runtime, the tests, and the registry. An importer-only correction still does not bump Scene IR.

Not yet in a published Scene IR version:

- compositing.matte
- compositing.mask
- transform.skew
- transform.autoOrient
- geometry.repeater
- geometry.mergePaths
- text.animators

`geometry.animatedTrim` landed in Scene IR 0.5.0.

Promoting one of them is a new version file, a registry update, and conformance tests in the same change. This note stops being the place those ids live once that version is released.

## Spatial Z representation audit

The implementation accepts optional spatial tangent `z` and MotionScript `(x, y, z)` tangents, but the published 0.2.0 spatial-curve contract does not explicitly introduce either representation. Arc-length corrections to existing 2D curves are implementation fixes; accepting a third component is a new contract. A candidate minor release must document and gate this representation, including older-reader rejection and migration tests, before it is claimed as released. Current language pointers remain 0.5.0; no release is authorised in this run. Existing ungated acceptance is an unresolved compatibility issue.

## Animated solid fill colour proposal (not implemented or released)

The 2026-10-08T103605Z fidelity run identifies omitted `fl.c` animations on LOT-06 upper-arm layers 3 and 4. Current node channels cannot animate fill colour. A candidate minor contract could add gated scalar `fill.r`, `fill.g`, `fill.b`, `fill.a` channels on solid-filled nodes (`paint.animatedSolidFill`), with straight-alpha [0,1] samples and existing keyframe easing/timing. Defaults and older programs must retain static paint semantics; gradients and stroke colour are outside this initial scope. The vertical slice needs schema/property registry and rejection gates, compiler, runtime sampling, emitter equivalence, adapter lowering, conformance and full-window source/direct/compiled evidence. No capability token is enabled and no release pointer changes in this run. Preserve unsupported diagnostics until that candidate is verified.
