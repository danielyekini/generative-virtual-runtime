# P008 director vs direct — run be1a2edc-d1cb-4563-8f92-010bd05a0e03

- **Issue:** [P008 #49](https://github.com/danielyekini/generative-virtual-runtime/issues/49)
- **Model pin:** local Ollama `qwen2.5-coder:14b` (same as P007)
- **Harness:** `tools/native-generation/` (`--approach direct|director|compare`)
- **Held-out:** `fixtures/generation/held-out/` (3 prompts)

## Results

| Task | Approach | Status | offlineOk | progressiveOk | repairs | directorMs | implementMs | totalMs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| drop-seal | direct | pass | true | true | 0 | — | ~28829 | ~28829 |
| drop-seal | director | pass | true | true | 0 | ~20791 | ~25614 | ~46410 |
| static-badge | direct | pass | true | false | 1 | — | ~43334 | ~43334 |
| static-badge | director | pass | true | false | 1 | ~12682 | ~34302 | ~46985 |
| path-trim | direct | pass | true | true | 0 | — | ~18657 | ~18657 |
| path-trim | director | pass | true | true | 0 | ~17918 | ~19278 | ~37196 |

Artifacts under `compare/<task>/<approach>/`. Fixture `--provider fixture` remains CI-only (not a model-speed claim).

## Verdict

Direct wins the stop-gate comparison on this pin/tasks: same validity, lower
latency. Decision:
[docs/decisions/product/2026-11-02-p008-direct-vs-director.md](../../decisions/product/2026-11-02-p008-direct-vs-director.md).

Next-corpus prep stub: `next-corpus-prep.md` in this run directory.
