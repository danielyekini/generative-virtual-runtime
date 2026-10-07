# @gvr/format-lottie

Before editing this package, read the root `AGENTS.md`, `packages/schema/capabilities/releases.json`, the current version files, `docs/languages/compatibility-policy.md`, and the Lottie rows in `packages/schema/capabilities/registry.json`.

Importer coverage is not language expressiveness. If Lottie can express a construct the languages cannot, add the Scene IR and MotionScript capability instead of leaving the import unsupported. A Lottie fix that does not change those languages does not bump their versions. A new exact, approximate, or unsupported claim still needs a scope and a conformance test in the registry.
