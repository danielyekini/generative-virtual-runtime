# Hosted generation model: research then human direction

Status/date/owner/work item: user steering, 21 November 2026, Product,
[P035 #247](https://github.com/danielyekini/generative-virtual-runtime/issues/247).
Does **not** yet supersede the [P007 local pin](2026-11-02-p007-provider-pin.md)
or the [P024 keep-14B decision](2026-11-03-ollama-serving.md). Those remain in
force until a human reads the P035 research document and records a new
direction on #247.

## Requirement

Local Ollama `qwen2.5-coder:14b` on the product machine has crashed the PC
more than once. Continuing to treat local Qwen as the integrated path is a
mismatch. Product must research **hosted** alternatives and stop at
**Human verification** until the human decides.

## Criteria (authoritative for the research)

- **Cost:** free or as cheap as possible.
- **Model size:** prefer smaller models; do not chase the biggest/best open-
  or closed-source models at this stage.
- **Qwen continuity:** hosting/running Qwen in the cloud remains acceptable.
- **Alternatives:** a different model family is fine when a suitable hosted
  provider fits.
- **Speed:** prefer more compute and snappy response (TTFT / tokens). Explore
  instant or diffusion-style alternatives, or providers/models whose parameters
  allow instant / no-thinking fast output.
- **Charter:** do not silently add a new paid dependency; any paid path needs
  the human’s explicit direction (ElevenLabs remains the only authorised paid
  exception today).

## What this supersedes procedurally

- P024’s deferral of a remote host “until another machine exists” is **reopened**.
- P032 (#234) local unload and P033 (#235) held-out lighter tag stay
  **Candidate** behind P035; they are not the primary answer to PC crashes.
- Engine was notified via
  [#248](https://github.com/danielyekini/generative-virtual-runtime/issues/248)
  (watch only — no shared LLM-host contract until the human decides).

## Close gate

P035 may move to Done **only after**:

1. A research document is published covering the criteria, and
2. A human has read that document and commented a chosen direction (or
   reject/defer-with-trigger) on #247.

Implementation of the chosen host is a follow-up ticket, not this one.
