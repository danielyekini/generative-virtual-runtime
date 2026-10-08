# Canonical MotionScript program storage

Follow the [sample registry and immutable revision rules](../../docs/authoring/sample-registry-spec.md). Canonical extension is `.ms`, matching repository fixtures. Keep each sample's `faithful/rNNNNNN/`, `authored/rNNNNNN/` and `experimental/<experiment-id>/` distinct. Every recorded program directory carries a manifest with source/program hashes, true parent lineage, implementation/dependency pins and exact verification links. The lineage counter is shared across faithful/authored revisions; latest recorded is not preferred or verified.

No sample revisions or certifications are installed. [Candidate inventory](candidate-inventory.json) records existing files/hashes without relocating them or treating old results as current-policy verification. Migration must preserve originals and link reproducible evidence before reserving a new canonical revision. See [authoring corpus](../../evaluation/authoring/README.md).

After installation, LOT-00 `faithful/r000001/program.ms` was recorded through the registry with exact original-source and program hashes plus actual quality evidence. Local quality PASS and pending durable publication eligibility remain separate; see [qualification](../../docs/evaluations/2026-10-08T090908Z/lot00-qualification.md). Original scratch `.motion` bytes remain unchanged.
