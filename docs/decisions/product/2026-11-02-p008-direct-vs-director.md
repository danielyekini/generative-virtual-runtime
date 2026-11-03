# P008: Prefer direct MotionScript generation; director as corpus handoff

Status/date/owner/work item: adopted Product experiment, 2 November 2026,
[P008 #49](https://github.com/danielyekini/generative-virtual-runtime/issues/49).

## Decision

For the pinned local Ollama model **`qwen2.5-coder:14b`** and the frozen
held-out tasks, keep **direct** user-prompt → MotionScript as the default
generation path. Treat a **director-script** pass as an optional Product
planning/handoff artifact for next-corpus work, not as the default online
generation pipeline.

Stop gates used here: equal or better offline/progressive pass rate; no large
latency regression without a quality gain. Director matched direct at 3/3 pass
but added roughly 1.1–2.0× wall time (extra model call) with no repair or
validity improvement on this set.

## Ownership (Product ↔ Engine)

Recorded for [native story cycle](../../workflows/native-story-cycle.md) / #88:

| Role | Owner |
| --- | --- |
| Realistic prompts/threads, expected responses/canvas, director-script validation of user intent | **Product** |
| Native MotionScript implementation of accepted scripts, friction/reimplementation evidence | **Engine** |
| Default single-turn generation in Studio/tools | **Direct** path (`tools/native-generation` `--approach direct`) |
| Optional `--approach director` | Available for experiments; not default |

Generation/review procedure before a corpus: Product authors or validates
director scripts against functionality lists; Engine implements from those
scripts without inventing support claims. Failure handling: Product revises
intent/script; Engine files bounded capability/defect work from friction notes.
Streaming director→implement remains an experimental hypothesis only.

## Evidence

Run `be1a2edc-d1cb-4563-8f92-010bd05a0e03` summary under
`docs/runs/product/be1a2edc-d1cb-4563-8f92-010bd05a0e03/summary.md`.

## Revisit

Re-open if multi-turn / longer stories show direct failing more often than
director, or if a cheaper planner model makes the extra pass free relative to
repair cost.
