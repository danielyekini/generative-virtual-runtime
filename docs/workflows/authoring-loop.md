# MotionScript authoring workflow 1.1

> Operating revision 2026-10-30: [current operations](../operations/README.md) and
> [migration map](../operations/migration-map.md) own new work routing and full-test/Git
> gates. This procedure is scoped to explicit imported-program refinement/source-fidelity
> claims. Its historical records and valid quality/storage rules remain; it does not
> require universal parity, native round trips or a separate reviewer.

Status: stable process contract. Ordinary authoring agents must not edit this file. A workflow change requires an explicit operator request and a separately recorded revision. Supporting documents may evolve autonomously under the documentation policy.

## Responsibility

Refine verified sample implementations and evaluate language evolution without reducing quality. This is independent of the fidelity loop. One verified sample may enter while other fidelity fixtures remain unresolved. Fidelity certification does not certify idiomatic authoring; authoring improvement does not certify import support.

## Required reading

Read [AGENTS.md](../../AGENTS.md), `packages/schema/capabilities/releases.json`, current published language versions, `docs/languages/compatibility-policy.md` and relevant registry entries. Then read the goals, evolution policy, guide, documentation policy, evaluation specification and [sample registry/storage specification](../authoring/sample-registry-spec.md) linked by [the authoring index](../authoring/README.md). Guidance never overrides released contracts.

## Stage 1: Select and pin

Create a unique UTC run directory under docs/authoring/runs/. Pin clean commit or complete reproducible source snapshot, dependency versions, language releases, relevant document revisions/hashes, corpus manifest, quality policy and measurement settings. Name the track: implementation-refinement or language-evolution. Read the authoring continuation record if present; do not inherit the fidelity nextCause automatically.

Choose inputs whose required behaviour is known and verified. Native programs need their own requirement and verification records. Imported programs require faithful source evidence. Exploratory inputs are permitted but cannot produce verified or training-eligible outputs until qualified. Preserve original bytes.

Set an explicit wall budget before editing; default 60 minutes, at most three candidates per approach. Retain attempt history across resumed runs. Stop an approach after two consecutive candidates show no meaningful improvement under the frozen criteria. A changed proposal must explain substantive differences, not reset a cause by renaming it.

## Stage 2: Establish baseline

Record current program, quality evidence, token/byte measures and applicable runtime/generation measures. Identify concrete duplication or complexity. Determine the best available existing-language technique before suggesting new features. Record unsupported measurement capabilities as NOT_RUN, not zero.

## Stage 3A: Refine implementations

Change one coherent approach at a time using released constructs. Preserve identity/provenance in the registry and original sample. Compile and evaluate, then verify required visuals and temporal behaviour. Measure improvements and regressions against the baseline. Stop with improved, no-worthwhile-change, blocked or budget-exhausted.

## Stage 3B: Evaluate language evolution

Collect recurrence across independent programs. Use the evolution rubric to compare rewrite, recipe, package, API, sugar and new semantics. Produce a proposal with strong existing-language alternatives, cost, compatibility and counterexamples. Prototype in isolation; do not present proposed syntax as released or mark samples production eligible. A new execution model needs a design decision under existing repository rules.

Use held-out examples to assess generalisation. If a proposal is adopted under the repository release process, update compiler/runtime/renderer/emitter/registry/conformance and version records as relevant, then regenerate and verify affected samples. Publishing permission is governed by the existing task and repository policy, not by this workflow.

## Stage 4: Verify and evaluate

Quality is a hard gate. For imported animations apply the pinned fidelity policy to refined output against the original reference, plus baseline/refined comparison. For native animations apply explicit task requirements and temporal tests. Do not rely solely on direct/compiled equality or the baseline if it has known loss.

Check deterministic seeking, boundaries and complete required observation window, relevant resource budgets and regressions. Run repository checks appropriate to changed code. Generation claims require controlled model experiments; a hand-authored rewrite can claim source savings but not better model success without evaluation.

## Stage 5: Publish evidence and update resources

Write an immutable run report, results and provenance records. Supporting documents may be improved immediately when evidence warrants: append rationale, evidence links, applicability and counterexamples. Draft semantic changes remain proposals/pending; published contracts remain immutable. Do not retrofit frozen criteria or historical outcomes.

Update the separate authoring index and continuation record. Identify candidate eligibility independently for quality, production and training. No automatic fine-tuning approval follows from visual success.

## Stop and handoff

Stop on budget, repeated non-improvement, unreliable reference, unavailable measurements needed for the claim, quality regression, or architectural/version decision requiring escalation. Preserve the last verified candidate and unverified experiments distinctly. Route discovered fidelity defects to a fidelity finding; do not switch this run into an unbounded import loop.

Successful authoring can mean a verified refinement, a replicated recipe, an adopted capability or a justified no-change conclusion. Language expansion is not required for success.

## Mandatory fidelity subflow after program changes

Every changed imported program must re-enter fidelity verification against its unchanged original PAL animation. This subflow belongs to authoring verification; it does not automatically start capability expansion. Freeze the original source, task, current quality policy, observation window and program revision. Run production compile, direct/emitted round-trip checks where applicable, full-window source-reference comparison, boundary/subframe checks, deterministic seeks, material review and relevant regressions. Record evidence for that exact revision. Unchanged verification evidence cannot certify changed bytes.

If the candidate fails but the verified faithful baseline still passes, treat it as an authoring regression: repair or reject the candidate within the authoring budget. If the baseline also fails under the pinned environment, or a shared compiler/runtime/renderer defect is confirmed, create a fidelity-system finding and run the [separate fidelity loop](../evaluations/lottie-fidelity-loop-prompt.md) against the accepted fidelity corpus. Invalidate affected sample eligibility. Do not fix an unrelated system feature indefinitely inside an authoring run. If the source reference is unreliable, mark BLOCKED and repair the evidence environment before either workflow can certify it.

A language/compiler/runtime change requires re-verification of all selected affected programs and a representative dependency/feature regression set; final adoption requires the declared authoring benchmark and relevant fidelity corpus to pass. Native-only samples need explicit original task/visual and temporal requirements rather than an invented PAL reference.

## Which workflow and when

1. Unsupported/approximated/dropped source semantics, invalid imported scenes or confirmed shared rendering/sampling discrepancies: fidelity loop on the current accepted fidelity test set.
2. One individually verified program with a concrete expression improvement: implementation refinement may begin immediately, even if the rest of the fidelity corpus fails.
3. Several verified programs show independent recurring structure: pattern discovery and proposal drafting may begin. Exploratory/unverified programs may inform hypotheses, but not verified improvement claims.
4. Broad language/package adoption: require the corpus-readiness gate in evaluation-spec.md, held-out evaluation and the mandatory fidelity subflow. A tiny importer corpus is insufficient evidence of general authoring improvement.

Corpus size alone never switches workflows. Missing correctness coverage routes work to fidelity; sufficient verified diversity permits authoring. Both can run independently on eligible subsets, but each run has one declared objective, separate budgets and explicit handoffs.

Installation routing note (workflow 1.1): the accepted fidelity source inventory is [fixtures/corpus/README.md](../../fixtures/corpus/README.md); the current Lottie gate retains LOT-03 quarantine and SVG exclusion. Authoring selections come independently from [evaluation/authoring/manifests/samples.json](../../evaluation/authoring/manifests/samples.json), initially empty, with frozen run corpus manifests. Keep `faithful/`, `authored/` and `experimental/` programs distinct under the linked storage specification. These installed paths clarify the bundle contract without changing its stages, budgets or quality invariant.
