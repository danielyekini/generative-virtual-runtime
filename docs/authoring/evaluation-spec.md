# Authoring evaluation specification

Status: living methodology, revision 1.0, 2026-10-08. Frozen run copies and benchmark revisions are immutable.

## Corpus design

Include verified imported animations and native MotionScript tasks. Cover geometry, paint, timing, hierarchy and combinations, with varied complexity and independent provenance. Native tasks prevent the language from becoming an exporter dialect. Avoid near-duplicate imports dominating results. Tag families; split related originals and variants together to prevent leakage between development and held-out sets.

Start with available individually verified samples; grow a broad corpus before adopting general abstractions. Large corpus analysis can identify patterns without rendering every speculative rewrite. Final claims require representative and held-out verification. Do not fabricate a target corpus size or minimum success rate without baseline evidence.

## Frozen run contract

Pin sample IDs/hashes, language/dependency/tool versions, document/policy revisions, observation windows, environment, budgets, objective and improvement criteria before experiments. Measure existing-language baseline and candidate with identical settings. Record all attempted candidates and failures, not just winners.

## Measurements

Report UTF-8 bytes, tokenizer/model ID and token count; distinguish delivered program, dependencies and expanded IR. Where available report compile/render costs and memory with warmup, repetitions and variability. Streaming measures require implemented incremental execution, a pinned chunk schedule and a concrete first-meaningful-visual definition; otherwise NOT_RUN.

Model-generation experiments pin model/version/settings, prompts, tools, context and repetition count. Record compilation success, quality pass, latency, tokens, repair attempts and sample uncertainty. Separate human/agent-refined source improvements from demonstrated generation improvements. Do not train on held-out benchmark examples before evaluation.

## Quality and claims

Compare original source reference, faithful implementation and refined candidate as applicable. Reuse current fidelity harness/policy for imports. Native tasks need explicit expected geometry, appearance and time-dependent behaviour. Apply full required windows, boundaries, seeks, material review and resource limits. Identical native routes are necessary evidence where applicable but do not prove source fidelity.

Use independent statuses: quality PASS/FAIL/BLOCKED/UNVERIFIED; refinement IMPROVED/NO_WORTHWHILE_CHANGE/REGRESSED/NOT_EVALUATED; proposal DRAFT/EVALUATED/ADOPTED/REJECTED/DEFERRED; training eligibility ELIGIBLE/INELIGIBLE/UNREVIEWED. Missing measurements are NOT_RUN. Eligibility requires provenance/rights and intended training requirements, not quality alone.

## Change log

- 1.0: Initial diverse-corpus, held-out and controlled-measurement framework.

## Corpus readiness gate

There is no universal program count that makes a corpus large enough. Before broad authoring/language adoption, publish a frozen readiness manifest with: verified sample IDs; independent family/provenance counts; feature and combination coverage; complexity distribution; dominant-family share; development/held-out assignments; unresolved exclusions; and the proposed abstraction's applicability.

Readiness stages:

- Per-program refinement: one verified input suffices. Claims remain local.
- Pattern investigation: initial evidence should normally include at least three independent verified families exhibiting the pattern. Fewer can justify a precise semantic-gap investigation, not a broad performance claim.
- General adoption: multiple independent development and held-out families must exercise each claimed use case and important interaction; related variants stay together. Include counterexamples where the abstraction should not be used. Predeclare required coverage and enough repetitions to assess generation variability. An agent must justify corpus adequacy for that proposal in its report, not merely assert that a numerical threshold was reached.

If coverage is inadequate, expand the authoring corpus with native tasks or verified imports. Use the fidelity loop only where those imports expose missing support or fidelity defects. Do not attempt to certify every external PAL feature merely to increase sample count. Evaluation-method updates create new frozen corpus/protocol revisions; they cannot remove failing examples from a running comparison.
