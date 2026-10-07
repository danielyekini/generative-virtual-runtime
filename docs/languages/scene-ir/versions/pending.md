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
