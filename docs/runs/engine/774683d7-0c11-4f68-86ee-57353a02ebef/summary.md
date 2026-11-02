# Engine run 774683d7-0c11-4f68-86ee-57353a02ebef

- **Issue:** E004 #23 — durable scene revisions and roof/pillar/rotation slice
- **Outcome:** complete
- **Languages:** MotionScript / Scene IR **0.6.0** (`entities.durableRevisions`, wire `"0.2"`)
- **Schema:** `APPLY_ENTITY_PATCH` + entity patch types; capability gated
- **Runtime:** `StreamingRuntime` wires `EntityRevisionStore`; post-seal topology via entity patches; seal-frontier left-limit sampling; accepted patch log for undo/replay
- **Compiler:** `emitEntityPatchDelta` builds Scene IR deltas (declarative MotionScript entity statements remain follow-up / E006)
- **Verification:** `npm run verify` PASS
