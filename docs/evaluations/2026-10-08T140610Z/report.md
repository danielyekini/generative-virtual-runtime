# Fidelity run 2026-10-08T140610Z

**Stop: budget-exhausted, with a recorded wall-time overrun. Corpus fidelity remains FAIL.**

## Implementation, scope and continuation

Initial/final HEAD `a850d655dc702ed15b03e931947022e15f5b760c`. The required previous pin is an ancestor and every prior final source-manifest entry matched at Baseline. Compared with immutable run `2026-10-08T103605Z`. Initial implementation was clean; final changes are uncommitted. Complete initial, attempt and final source archives plus per-file hashes and deletion-aware patches are retained under `source-snapshot/`. No commit, push, language release or canonical sample promotion occurred.

MotionScript and Scene IR remain 0.5.0, wire 0.2. Lottie package/adapter is 0.1.4. Chromium 151.0.7922.173, lottie-web 5.13.0, DPR1, canvas reference, subframes enabled, source-native fps/window [ip,op), opaque #101014. Fixed policy 1.0 and settings were frozen before edits. Registry initial/final hashes and full language/wire IDs are in manifest.json. LOT00–07 remain the accepted set; LOT03 retains the production 512 KiB quarantine; SVG01–02 are inventoried and checksum-verified but excluded from Lottie certification.

The 60-minute invocation started 2026-10-08T14:06:10.808327+00:00, deadline 2026-10-08T15:06:10.808327+00:00; stopped 2026-10-08T15:08:19.064275+00:00 (62.14 minutes). One of at most eight implementation cycles was used. The capture/finalization exceeded the deadline. This is a budget failure; improved fidelity does not make it a compliant 60-minute run. No further implementation was attempted.

## Correction and measurements

Phase A `timing.spatialCompositionClip`, **1 consumed / 2 remaining**. The old clipping branch used straight interpolation at cut positions and retained tangents for a shortened curve. Seven LOT01 tracks differed from their original uncut source sampling by 8.4755–240.6121 logical units. The importer now represents the original 150-point arc-length polyline with existing vec2 keyframes, restricting each chord’s temporal easing before cutting the observation window. It preserves holds, named easing and monotonic source cubics. Non-monotonic spatial clipping remains outside this correction’s verified scope; no raster fallback or new syntax was added.

Final maximum error against original uncut property sampling is **0.0008531521**, below 0.001. Actual lottie-web properties at the recorded controlled frames are compared separately; source composition-transparent cached states are excluded explicitly, without treating transform-parent opacity as inherited paint opacity. The corrected reference probe covers 593 states, max position error 0.0004800832, scale error 4.05e-8 and rotation error 4.44e-16. The misleading unfiltered late cached-state comparison is retained separately and does not identify a material defect.

Native direct/compiled round-trip passes every non-quarantined fixture, including 7,226 LOT01 evaluations over scheduled frames, all emitted key boundaries, segment midpoints, start/end and shuffled seeks. LOT01 expands from 232 to 1,921 keys; its emitted program is 260,644 bytes and compiles within the source ceiling. The exhaustive semantic check cost about 440 seconds: this is measured verification cost, not a real-time playback certification.

LOT01’s worst hot-pixel fraction improves **0.0051125 → 0.0034** and worst local ratio **1 → 0.3814433**; retained failing comparisons fall **97 → 80**. The original local gate still fails. Improved aggregate rendering does not certify the fixture or resolve the cause for fidelity purposes.

A matched original-raster counterfactual confirms global layer ordering as a further early-overlap cause: at frame3, source-order drawing reduces hot fraction 0.0034 → 0.00055 and local ratio 0.354749 → 0.054645. Other frames retain independent residuals. Reopen retained `visual.layerPaintOrder` for LOT01, **0 attempts / 3 remaining**; the earlier inconclusive LOT06 finding remains linked. Dense trim tessellation gives mixed results and is **DIAGNOSIS_NOT_CAUSAL**, not an implemented correction. Animated solid fill work stays queued at 0/3 attempts. All older cause histories remain unchanged.

Next phase is **A**, using published transform-parent support to separate source global paint order from transform hierarchy, preserving precomp timing/opacity and actual source matrices. Diagnose remaining contours independently and rerun both original native routes and corpus gates. No sampled counterfactual is a source-fidelity pass.

## Exact source/program identity and evidence

The final pipeline and program-identities records pin every original source path/byte count/SHA-256, generated .motion program, imported scene and compiled scene. Revision and parent are genuinely null for these unregistered scratch programs. Native capture inputs are frozen separately. Baseline before-captures, attempted implementation bytes, conformance/typecheck logs, semantic results, controlled probes and final captures are retained separately. `evidence-files.json` hashes the immutable evidence associations. Full images and source archives are local bulk artifacts, excluded from Git; small failure samples and machine outcomes remain reviewable.

The first baseline browser pass was intentionally stopped after complete LOT07, LOT00, LOT06 and LOT01 windows to reserve final verification time. Partial LOT02 frames are labelled incomplete; no baseline certification is invented. A redundant queued prepare command then failed on already-expanded route IDs. It did not replace the frozen full-window schedule; hash identity and source-job backup recovery are recorded.

Published authority decision: the registry’s existing optional tangent-Z implementation wording does not introduce that representation into immutable 0.2.0 release notes. This run makes no released Z-contract claim and preserves existing behavior. Pending Z reader/migration/release audit remains open; the importer correction introduces no new Z syntax or sampling contract.

## Independent outcomes

| Fixture | Conversion | Round trip | Visual | Native scheduled captures per route |
| --- | --- | --- | --- | --- |
| LOT-00 | exact | PASS | PASS | 240/240, 240/240 |
| LOT-01 | exact | PASS | FAIL | 121/121, 121/121 |
| LOT-02 | partial | PASS | FAIL | 226/226, 226/226 |
| LOT-03 | FAILED_QUARANTINED | QUARANTINED | QUARANTINED | 0/427 |
| LOT-04 | partial | PASS | FAIL | 675/675, 675/675 |
| LOT-05 | partial | PASS | BLOCKED_REFERENCE | 241/241, 241/241 |
| LOT-06 | partial | PASS | FAIL | 24/24, 24/24 |
| LOT-07 | exact | PASS | PASS | 150/150, 150/150 |

Coverage: FULL_NATIVE_CAPTURE_NON_QUARANTINED; LOT03_NATIVE_QUARANTINED; LOT05_REFERENCE_BLOCKED. Driver completion: True. Missing native measurements are NOT_RUN, never zero error. Exact import labels remain LOT00, LOT01 and LOT07; LOT06 still loses eight animated fills, and other partial-source losses remain explicit.

194 tests, complete package typechecks and registry conformance PASS. All ten original corpus checksums remain unchanged. Previously verified LOT00/LOT07 reference and native PNGs on both routes are byte-identical to the prior reviewed frame hashes; every source frame is independently recaptured and the first frame repeats identically after the full window. Their prior material review carries only through exact immutable image-byte associations. LOT01 full contact sheets and worst regions were reviewed; all 127 native route PNGs match each other, but source stacking/local differences remain. Other material review is NOT_RUN and cannot certify output.

`fidelityPassed=false`; conversion FAIL_KNOWN_LOSS; round trip PASS_NON_QUARANTINED; visual FAIL. Source-size and tested semantic/resource constraints pass for accepted non-quarantined inputs. No universal compatibility, real-time performance, transparent-alpha fidelity, whole-corpus material pass or authoring verification is claimed.

Final evidence record: 2026-10-08T15:11:29.012775+00:00, 65.30 minutes after Baseline; capture completed 2026-10-08T15:07:04.702748+00:00. The hard stop was missed. The overrun is explicit and does not reset the cause budget.
