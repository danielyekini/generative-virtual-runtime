# MotionScript compatibility evaluation

This directory is the harness. It does not change the packages under `packages/`.

The historical capture is [docs/evaluations/2026-10-07-baseline](../docs/evaluations/2026-10-07-baseline/report.md). That run is immutable. The index of runs is [docs/evaluations/README.md](../docs/evaluations/README.md). `evaluation/evidence/` is scratch for the next harness run; copy a finished run to a new `docs/evaluations/<run-id>/` directory instead of editing the baseline.

## Reproduce

From the repository root:

```bash
npx tsx evaluation/harness/run-pipeline.ts
npx tsx evaluation/harness/continue-diagnostic.ts
npx tsx evaluation/harness/drive-browser.ts
cd evaluation && npm install
node evaluation/harness/write-report.mjs
```

`drive-browser.ts` starts Vite on `127.0.0.1:5199` and headless Google Chrome with remote debugging on port 9333. It expects Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and `lottie-web` 5.13.0, which the playground already depends on.

The baseline report, captures, scenes, and logs are under `docs/evaluations/2026-10-07-baseline/`. Paths inside that report are relative to the run directory. The harness still writes a fresh scratch tree at `evaluation/evidence/` when you reproduce a run.

Inputs for the baseline were copied from the Downloads paths in `docs/evaluations/2026-10-07-baseline/evidence/manifest.json` into that run's `evidence/sources/` without modification.
