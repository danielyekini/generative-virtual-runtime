# P007 native generation experiment — run 7A7EAB3E-DA33-46F6-9FCE-CE12EAF0C0E7

- **Issue:** [P007 #48](https://github.com/danielyekini/generative-virtual-runtime/issues/48)
- **Steering:** P005 not a gate; pin local Ollama **`qwen2.5-coder:14b`** (not OpenAI).
- **Harness:** `tools/native-generation/` (`npm run generation:run`)
- **Reference:** P006 `docs/reference/motionscript-authoring/current.json` as system context
- **Held-out:** `fixtures/generation/held-out/` (3 prompts)

## Results (ollama / qwen2.5-coder:14b)

| Task | Status | offlineOk | progressiveOk | repairs | totalMs |
| --- | --- | --- | --- | --- | --- |
| drop-seal | pass | true | true | 0 | ~8044 |
| static-badge | pass | true | false (expected offline-only) | 1 | ~38703 |
| path-trim | pass | true | true | 0 | ~23311 |

Artifacts: `ollama-qwen/*.ms` + `*.metrics.json`. Fixture pipeline proof under `fixture/` (not a model-speed claim). Cancel/stale covered by Vitest.

## Notes

Fence stripping + bounded compile-error repair are required for Qwen outputs.
Reserved-word node ids (`circle circle`, `path line`) were a common first-pass failure.
No simulated Worker arrival rates are claimed as model speed.
