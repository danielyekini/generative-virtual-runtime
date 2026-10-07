# Scene IR pending

Editable. Draft. Not the current release.

These ids are open representation work. They are not a ban, and they are not waiting on a design review. Land each one in the validator, the runtime, the tests, and the registry. An importer-only correction still does not bump Scene IR.

Not yet in a published Scene IR version:

- geometry.pathMorph
- paint.gradientStroke
- compositing.matte
- compositing.mask
- transform.skew
- transform.autoOrient
- geometry.repeater
- geometry.mergePaths
- text.animators

Promoting one of them is a new version file, a registry update, and conformance tests in the same change. This note stops being the place those ids live once that version is released.

`geometry.pathMorph` is not a catch-up of published 0.2.0. Landing it publishes a new release id (expected `0.3.0`). Wire may stay `"0.2"` only if that version file says so and scenes gate with `requiredCapabilities: ["geometry.pathMorph"]`; otherwise use wire `"0.3"`. See `docs/languages/compatibility-policy.md`.
