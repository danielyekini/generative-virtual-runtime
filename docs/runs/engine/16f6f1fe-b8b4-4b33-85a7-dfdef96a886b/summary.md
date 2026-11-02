# Engine run 16f6f1fe-b8b4-4b33-85a7-dfdef96a886b

- **Issue:** E023 #86 — versioned entities.drawableBindings
- **Outcome:** complete
- **Languages:** MotionScript / Scene IR **0.7.0** (`entities.drawableBindings`, wire `"0.2"`)
- **Schema:** `REGISTER_GEOMETRY` / `BIND_GEOMETRY` on `EntityPatch`; capability gated; registry + releases current → 0.7.0
- **Runtime:** StreamingRuntime gates binding ops; `projectScene` projects shared geometry under instance ids with seal left-limit
- **Compiler:** `emitEntityPatchDelta` emits binding ops (declarative MotionScript bind syntax remains E006)
- **Verification:** `npm run verify` PASS
