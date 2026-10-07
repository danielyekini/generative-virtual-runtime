# Agent rules

Read this file before changing language, schema, importer, compiler, runtime, or evaluation support.

Also read, in this order:

1. `packages/schema/capabilities/releases.json`
2. The current MotionScript and Scene IR version files named there (`docs/languages/*/versions/`)
3. `docs/languages/compatibility-policy.md`
4. `packages/schema/capabilities/registry.json` for any capability you touch

## Aim

Scene IR and MotionScript grow until GVR can render modern animation languages, including current Lottie and SVG. There is no V1 ceiling and no closed feature list. Path morph, mattes, masks, animated paint, repeaters, merge paths, skew, auto-orient, and text animators are ordinary capability additions.

Add the language capability, the registry row, the tests, and the version note, then lower the importer. Do not stop because a construct was unsupported in 0.1 or 0.2, and do not ask for design approval before that work.

Stop and report only when the construct needs a new execution model. Loops and function declarations are that class. A new node, paint, track, operator, or render scope is not.

## Authority

The grammar and schema decide syntax. The registry decides what support is claimed today. Published version files record what a release changed. Evaluation runs record what one revision reproduced. Design notes, including `packages/schema/CONTRACT.md`, do not override the registry and do not forbid a later capability.

## When versions and packages change

- A semantic change updates code, registry, conformance tests, and the version note in the same change.
- Published version files are immutable. Correct them in a later version that names the earlier one. Edit only `pending.md` until that release.
- Bump MotionScript only when its syntax or semantics change. Bump Scene IR only when the validated representation or sampling rules change. An importer fix alone bumps neither.
- Below 1.0, a minor bump is the breaking boundary. Patches are compatible. Do not silently reinterpret older programs.
- `exact`, `approximate`, and `unsupported` each need a stated scope and a passing conformance test. `exact` is that scope only.
- Drafts and prereleases do not become the current release. The current pointer must stay equal to the greatest released version, compared numerically (`0.10.0` is newer than `0.9.0`).
- Package `version` fields are not language versions. The wire strings remain `0.1` and `0.2` until a version file says otherwise.

## Evaluations

Historical runs under `docs/evaluations/` are immutable. A new run gets a new directory and is linked from `docs/evaluations/README.md`. Do not overwrite `2026-10-07-baseline` or treat it as the current specification.

Do not widen a tolerance to make a comparison pass.
