# P008: Prefer direct MotionScript generation; director as corpus handoff

Status/date/owner/work item: **superseded** 3 November 2026 by user steering —
see [2026-11-03-director-quality-gate.md](2026-11-03-director-quality-gate.md).
Original experiment: 2 November 2026, Product,
[P008 #49](https://github.com/danielyekini/generative-virtual-runtime/issues/49).

## Historical decision (no longer product default)

For the pinned local Ollama model **`qwen2.5-coder:14b`** and the frozen
held-out tasks, the P008 run preferred **direct** user-prompt → MotionScript
and treated director-script as optional corpus handoff.

Stop gates used in that run: equal or better offline/progressive pass rate; no
large latency regression without a quality gain. Director matched direct at 3/3
pass but added roughly 1.1–2.0× wall time with no repair/validity improvement
on that small held-out set. Those metrics remain secondary evidence only.

## Ownership (Product ↔ Engine)

Recorded for [native story cycle](../../workflows/native-story-cycle.md) / #88:

| Role | Owner |
| --- | --- |
| Realistic prompts/threads, expected responses/canvas, director-script validation of user intent | **Product** |
| Native MotionScript implementation of accepted scripts, friction/reimplementation evidence | **Engine** |
| Default generation path (superseded) | Was direct; **now director-first** per 2026-11-03 decision |
| Direct approach | Retained for A/B and latency experiments, not the quality gate |

Generation/review procedure before a corpus: Product authors or validates
director scripts against functionality lists; Engine implements from those
scripts without inventing support claims. Failure handling: Product revises
intent/script; Engine files bounded capability/defect work from friction notes.
Streaming director→implement remains an experimental hypothesis only.

## Evidence

Run `be1a2edc-d1cb-4563-8f92-010bd05a0e03` summary under
`docs/runs/product/be1a2edc-d1cb-4563-8f92-010bd05a0e03/summary.md`.

## Revisit

**Done (user steering 3 November 2026):** animation quality and director
distillation supersede this default. Keep the measured table as secondary-metric
evidence under `docs/runs/product/be1a2edc-d1cb-4563-8f92-010bd05a0e03/`.
