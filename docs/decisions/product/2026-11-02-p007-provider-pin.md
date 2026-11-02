# P007 provider pin: local Ollama Qwen 2.5 Coder 14B

Status/date/owner/work item: adopted user steering, 2 November 2026, Product,
[P007 #48](https://github.com/danielyekini/generative-virtual-runtime/issues/48).

## Decision

Pin **Ollama** model **`qwen2.5-coder:14b`** (already installed locally) as the
integrated GVR generation model for the P007 experiment. Do **not** use OpenAI
or other cloud providers for this pin.

Access: host `OLLAMA_HOST` (default `http://127.0.0.1:11434`), native streaming
`/api/chat`. No API key in the repository. Override model only via
`GVR_LLM_MODEL` for controlled comparison; default remains the pin.

A **fixture** provider remains for CI and pipeline proof. Fixture throughput is
not a model-speed claim (same rule as PR #11 Worker arrival simulation).

## Context

User steering: the installed local Qwen 14B coder is the integrated GVR model for
now. P005 is not a gate; reuse existing compile/runtime paths plus the P006
authoring reference as system context.

## Unchanged

Charter paid-service exception for ElevenLabs audio is unrelated. Studio UX
gates for P003 remain. P006 snapshot remains the generation reference.
