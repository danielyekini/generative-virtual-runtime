# MotionScript compatibility evaluation

This directory is the harness. It does not change the packages under `packages/`.

The index of runs is [docs/evaluations/README.md](../docs/evaluations/README.md). `evaluation/evidence/` is scratch for the next harness run; copy a finished run to a new `docs/evaluations/<run-id>/` directory instead of editing older runs.

## Corpus and gate

- Canonical sources: [`fixtures/corpus/`](../fixtures/corpus/) (committed). Verify with `shasum -a 256 -c fixtures/corpus/SHA256SUMS`.
- Gate settings: [`gate-settings.json`](gate-settings.json). Copy into each run’s `loop.json`; do not invent looser tolerances after seeing diffs.

## Reproduce

From the repository root:

```bash
shasum -a 256 -c fixtures/corpus/SHA256SUMS
npx tsx evaluation/harness/run-pipeline.ts
npx tsx evaluation/harness/check-round-trip.ts
npx tsx evaluation/harness/prepare-fidelity.ts --full
npx tsx evaluation/harness/drive-browser.ts
```

`drive-browser.ts` starts Vite on `127.0.0.1:5199` and a headless Chromium-based browser with remote debugging on port 9333. Browser resolution: set `GVR_CHROME` or `CHROME_PATH`, otherwise `evaluation/harness/chrome.ts` searches macOS Chrome and common Linux Chromium paths. Pin `lottie-web` 5.13.0 (playground dependency).

Scratch output lands under `evaluation/evidence/`. Historical reports live under `docs/evaluations/<run-id>/`.

Install harness dependencies once with `npm install --prefix evaluation` before browser capture. Follow [current evaluation prerequisites](../docs/evaluations/README.md) and [the single fidelity prompt](../docs/evaluations/lottie-fidelity-loop-prompt.md). Default sampled jobs cannot certify full windows.

The pipeline records source/program/scene hashes and null lineage for unregistered scratch programs; these are byte identities, not verification. New reports use the [live fidelity template](../docs/evaluations/templates/fidelity-report.md) and associate exact revision hashes with immutable evidence. `write-report.mjs` is a legacy baseline Word generator with fixed judgements; use it only for historical reproduction. Historical fields remain readable and missing provenance stays NOT_RECORDED. Separate [authoring runs](../docs/authoring/README.md) use the [program revision/storage rules](../docs/authoring/sample-registry-spec.md).
