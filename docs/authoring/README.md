# MotionScript authoring

Supporting resources revision 1.0; [workflow 1.1](../workflows/authoring-loop.md) is the stable process contract.

- [Design goals](../languages/design-goals.md)
- [Authoring guide](../languages/authoring-guide.md)
- [Evolution policy](../languages/evolution-policy.md)
- [Documentation policy](documentation-policy.md)
- [Evaluation and readiness specification](evaluation-spec.md)
- [Sample registry and immutable program storage](sample-registry-spec.md)
- [Refinement report template](templates/refinement-report.md)
- [Language proposal template](templates/language-proposal.md)
- [Installation request](install-agent-prompt.md)
- [Authoring corpus and registry](../../evaluation/authoring/README.md)
- [Program storage and candidate inventory](../../samples/motionscript/README.md)
- [Separate fidelity workflow](../evaluations/lottie-fidelity-loop-prompt.md)

## Routing and handoff

Refine an individually verified input without waiting for the entire fidelity corpus to pass. Every changed imported program is re-verified against its original source. Reject/repair an authoring regression within its own budget; confirmed shared correctness defects become fidelity findings with separate run identity and retained fidelity attempt history. Broader adoption requires frozen diverse development/held-out coverage under the readiness specification, not a sample-count shortcut.

The accepted fidelity sources are listed in [fixtures/corpus](../../fixtures/corpus/README.md); Lottie quarantine and SVG profile exclusions remain governed by the fidelity policy. Authoring starts with an empty registry. Installation certifies no inputs, revisions, results or training eligibility.

## Runs and continuation

No authoring runs have been installed. Add immutable `docs/authoring/runs/<UTC-id>/` reports here only after actual runs. Maintain an independent `docs/authoring/implementation-pin.json` and attempts/continuation history beginning with the first actual authoring run; do not copy the fidelity pin or fabricate an initial run. Freeze selected corpus manifests per run.

Agents may update supporting resources with rationale/evidence and explicitly labelled hypotheses without repeated approval. Ordinary runs must preserve workflow 1.1, published releases, original sources, immutable program revisions, historical runs and frozen benchmark records. Existing release/publishing permissions still apply.
