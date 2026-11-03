# Director path retained; animation quality is the generation gate

Status/date/owner/work item: user steering, 3 November 2026, Product.
Supersedes [2026-11-02-p008-direct-vs-director.md](2026-11-02-p008-direct-vs-director.md)
for product defaults and acceptance. The earlier run’s latency/pass-rate table
remains valid evidence of those secondary metrics only.

## Decision

**Runtime animation quality** (human taste / expressive usefulness of the
played scene) is the primary acceptance gate for MotionScript generation.
Compile pass rate, repair count, generation latency, and streaming buffer
downtime (Player tape red gaps) are important optimisation metrics — they are
not substitutes for quality acceptance.

The **director** is an intentional distillation gate for user intent, system
instructions, response creativity/variability, and (later) retrieval /
multi-turn context and curriculum knowledge. It is not optional “corpus
paperwork” after a direct path “wins” on tiny held-out tasks.

**Complexity baseline:** rich story programs (for example *The city comes
around*, *From Blueprint to Home*, *A crane then a square*, *From pixels to
prediction*, *Copperleaf*, *The last Streetlight*, *Small Ideas, Enormous
Change*) set the expectation for what an implementation model must eventually
produce from a user prompt. Early runtime scene samples (Diagram, Caption,
Ball, Bunny, …) are canvas/runtime smoke — not the generation quality bar.

Held-out tasks used in P007/P008 remain useful for harness regression; they do
not authorise preferring direct generation for customer-facing quality.

## Optimisation order

1. Capture and distill user intent accurately (director + system context).
2. Maximise animation quality against story-complexity baselines (human judgment).
3. Then reduce failures, latency, and streaming downtime.

Experimentation and tweaking for seamless generation belong on that stack —
especially director ↔ implement coupling — not on declaring victory from
offlineOk alone.

## Studio and customer feedback

Product agents must treat the available customer (user) as the quality judge
for human-facing animation and Studio workflows. Do not close a generation
approach comparison for the customer without customer-visible Studio exercise
and feedback. Major capabilities (interactions, model integration, audiovisual
host paths, …) need a Studio testing surface before the lane moves on.

## Unchanged

P007 harness, Ollama `qwen2.5-coder:14b` pin, cancel/stale handling, and
fixture CI proof remain. P005 stays optional consolidation. Charter vision
unchanged.
