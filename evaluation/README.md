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
npx tsx evaluation/harness/drive-browser.ts
cd evaluation && npm install   # once, for harness deps (pngjs, vite, …)
node evaluation/harness/write-report.mjs
```

`drive-browser.ts` starts Vite on `127.0.0.1:5199` and a headless Chromium-based browser with remote debugging on port 9333. Browser resolution: set `GVR_CHROME` or `CHROME_PATH`, otherwise `evaluation/harness/chrome.ts` searches macOS Chrome and common Linux Chromium paths. Pin `lottie-web` 5.13.0 (playground dependency).

Scratch output lands under `evaluation/evidence/`. Historical reports live under `docs/evaluations/<run-id>/`.
