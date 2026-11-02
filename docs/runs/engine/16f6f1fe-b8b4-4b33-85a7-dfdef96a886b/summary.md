# Engine run 16f6f1fe-b8b4-4b33-85a7-dfdef96a886b

## Issues

1. **E023 #86** — versioned `entities.drawableBindings` → complete (PR #90 / `888f7dd`)
2. **E003 #22** — immutable path/keyframe validation-fact reuse → complete (this PR)

## E023

- **Languages:** MotionScript / Scene IR **0.7.0** (`entities.drawableBindings`, wire `"0.2"`)
- Schema `REGISTER_GEOMETRY` / `BIND_GEOMETRY`; StreamingRuntime projection; compiler emit
- Verification: `npm run verify` PASS

## E003

- **Decision:** `docs/decisions/engine/immutable-validation-facts.md`
- WeakMap reuse of successful `readPath` / `readKeyframes` walks; contextual checks retained
- Crane after warmup: wall ~2732 ms → ~251 ms; validate mean ~2.90 ms → ~0.17 ms (913 calls)
- Package `@gvr/schema` 0.1.5 (no language bump)
- Verification: `npm run verify` PASS
