# Generate quality judgment checklist (P020)

Use Studio **Generate** with local Ollama (`qwen2.5-coder:14b`). Leave **Approach** on
**Director** for the first pass; optionally repeat a prompt with **Direct** for
comparison. Do **not** declare a product default from harness pass-rate or latency alone
([director quality gate](../../../docs/decisions/product/2026-11-03-director-quality-gate.md)).

## How to run

1. `npm run dev` (playground) with Ollama serving `qwen2.5-coder:14b`.
2. Open Studio → **Generate**.
3. Click a **story pack** chip to fill the composer (or paste from
   `fixtures/generation/quality-judgment/manifest.json`).
4. Send; watch the **canvas** animation, not only the transcript.

## Primary gate (required)

For each prompt, judge **animation quality** on the played scene:

- [ ] Intent of the story beat is recognisable
- [ ] Motion/choreography feels useful and expressive (not a static diagram)
- [ ] Timing/readability are acceptable for a customer-facing demo
- [ ] Director vs Direct (if compared): which better matches the intended distillation?

## Secondary notes (optional)

- Compile/repair failures, generation latency, streaming tape downtime
- Reserved-word / authoring mistakes that block playback

Record feedback on [P020 #157](https://github.com/danielyekini/generative-virtual-runtime/issues/157)
or the next product run handover. Keep Director as Studio default until Direct is
customer-proven equivalent for the director’s roles.
