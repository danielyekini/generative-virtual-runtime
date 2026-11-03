# Run 8812fbed — E019 image resource lifecycle

- Lane: engine. Issue: E019 [#38](https://github.com/danielyekini/generative-virtual-runtime/issues/38).
- Replenish: the Ready queue was empty after E043 and there were no untriaged requests. This run promoted and claimed E019, the open M2 Task with no dependencies.
- Outcome: decision `docs/decisions/engine/resource-lifecycle.md` and a prototype:
  - `@gvr/runtime`: `sceneImageRequirements`, `sceneImageReadiness`, and `GeneratedOffer.imageStates` in `assessReadiness`.
  - `@gvr/canvas-renderer`: `ImageResourceCache` (prepare/evict/close/cancel, states by id, onChange, decoded-bytes gauge) and the `imageSampling` recipe (`pixelated` disables smoothing).
- Registry: `resources.image` compiler/runtime/renderer moved from `untested` to `supported` for the stated scope, with three conformance tests. No language version change.
- Defect fixed: the renderer image map never evicted across scenes and treated no-DOM hosts as forever-pending.
- Follow-ups: E045 #204 (sampling + sprite frames language, Studio surface) and E046 #205 (pattern paint, Candidate).
- Limits: decoded memory is an RGBA estimate. No real-browser memory or GPU timing measurement was run. Studio still acquires images lazily.
- Verification: `npm run verify` (see the PR).
