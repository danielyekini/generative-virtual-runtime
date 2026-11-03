# Engine run 7413cf17-80be-4968-946b-0723dbbe2e72

- **Outcome:** complete
- **Issues:** E017 (#36)
- **PR:** #162 → `d2eb78e`
- **Scope:** Native diagnostics and latent-correctness leads against MotionScript / Scene IR 0.16.0
- **Fixed:** reserved-word naming; cascade `UNKNOWN_TARGET` suppression after rollback; rejected-unit `sourceSpan` attribution; last-key hold sampling; representation-independent `easing.hold` detection; semantic easing equality in emitter fixtures
- **Not bumped:** language versions (valid 0–1 key lists unchanged)
- **Verify:** `npm run verify` local + CI
