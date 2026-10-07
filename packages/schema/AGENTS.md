# @gvr/schema

Before editing this package, read the root `AGENTS.md`, `packages/schema/capabilities/releases.json`, the current MotionScript and Scene IR version files, and `docs/languages/compatibility-policy.md`.

This package owns the grammar, the Scene IR validator, and `capabilities/registry.json`. New capabilities are expected. A change to syntax, sampling, or a support claim updates the registry, the conformance tests, and the version note in the same change. Published version files stay immutable. Do not refuse a node, paint, track, or operator because 0.1 or 0.2 omitted it.
