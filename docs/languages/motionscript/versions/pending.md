# MotionScript pending

Editable. Draft. Not the current release.

These ids are open language work. They are not a ban, and they are not waiting on a design review. Land each one as syntax, tests, and a registry row. An importer-only correction still does not bump MotionScript.

Not yet in a published MotionScript version:

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

`geometry.pathMorph` is not a catch-up of published 0.2.0. Landing it publishes a new release id (expected `0.3.0`). Wire may stay `"0.2"` only if that version file says so and programs gate with `requires` / `requiredCapabilities` containing `geometry.pathMorph`; otherwise use wire `"0.3"`. See `docs/languages/compatibility-policy.md`.
