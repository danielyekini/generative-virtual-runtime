# Fidelity evaluation corpus

Canonical LOT-00…LOT-07 and SVG-01…SVG-02 sources for the Lottie/SVG fidelity harness.

The repository is private. These bytes are committed so local and cloud agents can run `evaluation/harness/run-pipeline.ts` without macOS Downloads paths.

| ID | Path | Original name |
| --- | --- | --- |
| LOT-00 | `lottie/LOT-00.json` | panning_landscape_motionscript_v1_compatible.json |
| LOT-01 | `lottie/LOT-01.json` | Celebrations Begin.json |
| LOT-02 | `lottie/LOT-02.json` | Hover Button.json |
| LOT-03 | `lottie/LOT-03.json` | lottie_ex1.json |
| LOT-04 | `lottie/LOT-04.json` | lottie_ex2.json |
| LOT-05 | `lottie/LOT-05.json` | lottie_simple_ex1.json |
| LOT-06 | `lottie/LOT-06.json` | Punches.json |
| LOT-07 | `lottie/LOT-07.json` | Wave Animation.json |
| SVG-01 | `svg/SVG-01.svg` | Celebrations Begin.svg |
| SVG-02 | `svg/SVG-02.svg` | Jumping Jack.svg |

Do **not** edit corpus bytes. Pin SHA-256 from `SHA256SUMS` (and each run’s `manifest.json` / `loop.json`). Verify with:

```bash
shasum -a 256 -c fixtures/corpus/SHA256SUMS
```

The harness copies into scratch `evaluation/evidence/sources/` at run time; that scratch tree stays gitignored.
