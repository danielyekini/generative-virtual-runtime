# Engine run 22b4b033-5547-4fff-9469-d1e1e0c48f8c

- Lane: engine
- Issues: E016 #35 (complete), E030 (created Candidate)
- Outcome: complete (E016 decision + seam prototype)
- Decision: `docs/decisions/engine/seam-depth-order.md`
- Prototype: `@gvr/runtime` `classifySurfacePair` / `resolveSeams` / `splitIntersectingPair` / `unionProjected`
  (`packages/runtime/src/seams.ts`, 8 unit tests)
- Chosen: plane-test occlusion stays authoritative; shared-edge seams; projected
  intersection splits; animated order is tie-break only
- Child: E030 for `space.planarSeams` (or equivalent) language wiring
- Verification: `npm run verify` (recorded at PR)
