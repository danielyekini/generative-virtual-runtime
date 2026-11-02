# Continual native story and engine improvement

Adopted user direction, 2 November 2026; effective in planning future iterations.
This adds a permanent improvement loop alongside milestone delivery. The present
system-expansion queue continues; it includes early-project features and proposals
from the last story corpus. This direction does not interrupt unrelated work or
commission immediate regeneration of the library.

Generate Stories → Expand System → Reimplement Stories → Select for next corpus.

## Ownership and iteration setup

Engine owns continual reduction of capability, performance and MotionScript
expression friction. Stories are evolving evidence workloads, not static finished
artefacts. Engine orchestrators choose bounded designs and priorities; a story gap
is evidence to assess, not permission for unbounded implementation.

Product owns realistic single prompts and turn-by-turn conversation threads,
including the expected production response and visible canvas state after each
turn. Use the [established functionality sources](../workstreams/product/functionality.md)
and [future functionality list](../workstreams/product/future-functionality.md).
Distinguish released support, incomplete support and desired future outcomes.

Director-script generation ownership is not settled by the user. Before the next
corpus starts, the orchestrators must record an owner, generation/review procedure
and handoff through Product's existing P008 planning experiment. Product validates
that scripts preserve user intent and expected responses; Engine receives scripts
with explicit requirements and known support gaps. This coordination does not
block current independent expansion work or imply an already working model pipeline.

At each iteration setup, record a compact manifest with iteration ID, prompt/thread
and script revisions, owners, capability/release pins, carried stories, scope,
ambition relative to the previous corpus, evidence budget and selection criteria.
Keep live execution/status in linked GitHub work; repository manifests retain
inputs, decisions and evidence rather than a parallel task queue.

## 1. Generate stories and expose friction

Start each iteration with new Product prompts/threads and director scripts, plus
rewritten scripts for selected returning stories. Cover existing and planned
capabilities and different use cases; identify which expectations need expansion.
Engine agents implement the scripts directly in native MotionScript. JS-to-MS
builders remain useful historical/diagnostic experiments, but do not substitute
for this native authoring exercise or hide a missing language abstraction.

Record each pain point with prompt/turn/script location, native source/release,
minimal reproducer, expected versus rendered/runtime result, workaround and cost,
and whether it concerns a defect, missing capability, performance or expression.
Group recurring causes, link existing issues before creating new ones, and let the
orchestrator select bounded design/implementation work. Preserve failed attempts.

## 2. Expand the system

Implement selected improvements alongside milestone functionality. Compare bounded
alternatives and verify the relevant workload and regressions. Follow the normal
release/registry/conformance process for new language or runtime semantics; a
future list or script never establishes current support.

## 3. Reimplement the stories

Each selected improvement names the affected story revisions and a reimplementation
follow-up or explicit scheduling decision. Reimplement as updates become tested and
ready, or batch at the end of expansion, at the Engine orchestrator's discretion.
The iteration records completion or an explicit unresolved/blocked outcome for each
selected story; merging a capability alone does not demonstrate improved authorship.

Use the newest released language and current best implementation practices, with
versioned new source/script revisions and exact provenance. Compare intent coverage,
visible correctness, source complexity/workarounds, compile/runtime cost and, where
relevant, streaming and edit behaviour against prior evidence. Verify evaluated
scenes and real rendering, not only builder/model assertions. Never replace old
program bytes or rewrite historical reports; promote library pointers only with
scoped evidence under existing storage rules.

Priority examples to reassess against current support are
[Crane](../authoring/stories/a-crane-then-a-square/proposal.md) (unreadable crane,
two-sided folding/depth, missing mark and authoring/cost problems) and
[City](../authoring/stories/the-city-comes-around/proposal.md) (scene coverage,
repetition/budget and occlusion compromises). These historical diagnoses guide
reimplementation acceptance, not claims that every old defect remains unfixed.

## 4. Select the next corpus

The Engine orchestrator records a bounded selection using quality, complexity,
remaining gaps, capability coverage and regression value. Retain some of the best
or most complex stories, add fresh scripts, and rewrite retained scripts with
higher complexity. Record what becomes more ambitious in each iteration; preserve
the earlier script and baseline so improvement remains measurable. Do not merely
rerun unchanged successes or require a whole-corpus campaign for every feature PR.

## Beyond fixed-duration films

Future corpuses must explore persistent scenes and turn-by-turn canvas manipulation:
add/change/remove objects, independent continuing animation loops, a five-minute
explanation and architectural planning through repeated micro-prompts. Specify
state preservation, edit targets, cancellation and expected observations per turn;
a finite test observation window does not require the program/session to end.
Timed stories remain useful cases, but must not define the entire product model.

Streaming director output into an integrated implementation model is a user
hypothesis to investigate with a bounded experiment, not an adopted architecture
or a claim of current end-to-end support. Record latency, partial instruction
boundaries, revisions and failure handling before choosing that approach.

## Effective next run

Continue current expansion work. Engine intake links affected story follow-ups to
newly selected improvements and plans the next corpus boundary. Product intake
maintains functionality lists, plans prompts/expected responses and resolves the
director handoff with Engine before corpus generation. Neither lane needs to wait
for a five-run review to receive this direction; no background agent wake is implied.
