# MotionScript pending

Editable. Draft. Not the current release.

These ids are open language work. They are not a ban, and they are not waiting on a design review. Land each one as syntax, tests, and a registry row. An importer-only correction still does not bump MotionScript.

Not yet in a published MotionScript version:

- compositing.matte
- compositing.mask
- transform.skew
- transform.autoOrient
- geometry.repeater
- geometry.mergePaths
- text.animators

`geometry.animatedTrim` landed in MotionScript 0.5.0.

Promoting one of them is a new version file, a registry update, and conformance tests in the same change. This note stops being the place those ids live once that version is released.

## Spatial Z representation audit

The implementation accepts optional spatial tangent `z` and MotionScript `(x, y, z)` tangents, but the published 0.2.0 spatial-curve contract does not explicitly introduce either representation. Arc-length corrections to existing 2D curves are implementation fixes; accepting a third component is a new contract. A candidate minor release must document and gate this representation, including older-reader rejection and migration tests, before it is claimed as released. Current language pointers remain 0.5.0; no release is authorised in this run. Existing ungated acceptance is an unresolved compatibility issue.
