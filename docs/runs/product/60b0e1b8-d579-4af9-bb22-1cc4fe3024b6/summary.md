# P020 story-complexity Generate quality pack — run 60b0e1b8-d579-4af9-bb22-1cc4fe3024b6

- **Issue:** [P020 #157](https://github.com/danielyekini/generative-virtual-runtime/issues/157)
- **Also:** product orchestrator review (five runs) → Ready replenishment; accepted [#144](https://github.com/danielyekini/generative-virtual-runtime/issues/144)
- **Branch / worktree:** `product/157-generate-quality-pack` at `gvr-product-p020`
- **Outcome:** Ship story-complexity judgment prompts + Studio Generate starter chips + human checklist. No approach-default change; no speech/mic UI.

## Delivered

- `fixtures/generation/quality-judgment/manifest.json` — seven baselines (City, Blueprint→Home, Crane, Pixels, Copperleaf, Streetlight, Small Ideas)
- `fixtures/generation/quality-judgment/CHECKLIST.md` — primary animation-quality gate + secondary metrics
- Generate chrome: `#generate-quality-pack` chips fill the composer (Director remains default)
- Tests: generate-session pack assert; smoke: chips fill composer
- studio-ux Generate section documents the pack

## Gates

- `npm run verify`
- `npm run smoke:studio`

## Human ask

Run Studio Generate with local Ollama, click pack chips, judge canvas animation quality before preferring Direct.
