# Engine run B7923F2A-EEE6-4570-A812-B7654F5D8AD1

- **Issue:** E002 #21 — persistent entities, revisions and independent behaviours
- **Outcome:** complete (decision + critical prototype)
- **Decision:** `docs/decisions/engine/persistent-entities.md`
- **Prototype:** `EntityRevisionStore` in `@gvr/runtime` (`packages/runtime/src/entities.ts`) with sealed left-limit topology, exclusive ownership, named behaviours, compact context and patch rejection tests
- **Children:** E004 #23 and E005 #24 refreshed Ready on the decided contract
- **Verification:** `npm run verify` (recorded on PR)
