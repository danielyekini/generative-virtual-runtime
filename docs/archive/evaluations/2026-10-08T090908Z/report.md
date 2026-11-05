# Fidelity evaluation 2026-10-08T090908Z

Stop: **budget-exhausted**. **fidelityPassed: false**. Conversion FAIL_KNOWN_LOSS; semantic round trip PASS for seven non-quarantined Lottie fixtures; visual FAIL. Coverage: INCOMPLETE_BUDGET.

Compared with 2026-10-08T012312Z. Initial HEAD 11d783e8783b04dfea1b1f3934e240500b4e959a; pin ancestry verified. Original ten source hashes remain unchanged. Accepted Lottie inventory remains LOT-00…07; LOT-03 retains the 512 KiB source-ceiling quarantine; SVG excluded. Policy 1.0 and settings hash `df9bc5e079d8f8b01bd10dc43f737d1f300a09b0c463f20af3c5883efa067b59` were frozen before implementation. Finite budget 60 minutes; elapsed through recording 56.25 minutes. One implementation cycle, with prior cause history retained. No commit or push was made.

## Stroke correction and retained attempts

Wave parser previously overwrote sibling strokes and lowering preferred gs over st. Source paint lists are retained on preceding geometry and painted in the reference reverse-list order. Existing native group/path nodes express separate passes; each retains morph/trim tracks and shared ancestor transforms. Eight visible source stroke passes now lower to eight instead of five. Geometry groups keep passes contiguous among sibling geometry. Conformance covers one path per group, solid+gradient and two-gradient pairs, shared morph/trim/transforms, preceding-geometry scope and deterministic native round trip. Cross-geometry interleaved-style paint order is not certified.

Cumulative multipleStrokeLoss attempts: **2 consumed, 1 retained** (one prior unverified/reverted attempt plus this measured correction). Wave is not certified: phase C still fails for independent residual paint. Both native routes captured 150/150 scheduled frames plus 5/5 extras over original [0, 5000ms), 30fps. Window mean hot fraction 0.053073708333 → 0.000383958333; q50 0.0516125 → 0. Native midpoint and last scheduled frame have zero hot pixels. Worst frame 2 remains 0.005275, above the 0.005 per-frame bound, and 42 reviewed comparisons fail aggregate/local rules on each route. Mean improvement cannot hide them.

## Separate gradient finding

Real browser instrumentation records source gradient creation under layer context matrices, while native creation includes the shape-group transform. At the midpoint, source gradients remain cached and native gradients are recreated under changed group rotations. Endpoint arguments and physical creation matrices are retained in `gradient-coordinate-diagnostic.json`. This confirms a coordinate/caching discrepancy; a controlled counterfactual has not isolated every residual pixel. Wave has no gradient opacity-stop tail, so that is not the observed source omission. No gradient representation, language release or tolerance was changed. Next cause is gradientCoordinateSpace with zero implementation attempts; the stroke history remains separately retained. Inspect source/native paint coordinates and existing lowering alternatives before a narrowly scoped contract decision.

## Checks and corpus

184 tests, package typechecks, strict harness typecheck and registry conformance pass. Direct/compiled whole resolved states agree under numeric 0.001 and colour 1/255 at every scheduled frame, IR key boundary, midpoint, start/end and shuffled seek for the seven imported non-quarantined fixtures. Original sources were SHA-256 checked. All non-Wave generated programs and both IR documents are byte-identical before/after this correction. Captures use Chromium 151.0.7922.173, lottie-web 5.13.0 canvas, subframes, DPR 1 and opaque #101014. Separate-target reference preparation/repeat checks are preserved, with exact decoded pixel identity to primary captures; PNG encodings alone are not a pixel comparison.

| Fixture | Conversion | Visual | Coverage |
| --- | --- | --- | --- |
| LOT-00 | PASS | PASS | FULL_WINDOW |
| LOT-01 | PASS | FAIL | FULL_WINDOW |
| LOT-02 | PARTIAL | VISUAL_UNVERIFIED | FULL_WINDOW |
| LOT-03 | QUARANTINED | BLOCKED | QUARANTINED_REFERENCE_ONLY |
| LOT-04 | PARTIAL | VISUAL_UNVERIFIED | INCOMPLETE |
| LOT-05 | PARTIAL | BLOCKED | INCOMPLETE |
| LOT-06 | PASS | FAIL | FULL_WINDOW |
| LOT-07 | KNOWN_LOSS_GRADIENT_COORDINATE_SPACE | FAIL | FULL_WINDOW |

Partial/non-exact and unreliable-reference fixtures remain in the declared corpus and fail/block independently. Capture execution is not quality certification. Material review for non-target failures is NOT_RUN; they cannot become verified from numeric summaries. Missing captures/controls are NOT_RUN/BLOCKED, not zero error. No new performance or transparent-output certification is claimed.

## LOT-00 faithful input handoff

LOT-00 passes full-window numeric/local/alpha gates and completed material review on source/direct/compiled routes: 240/240 + 3/3 extras per native route, original [0, 8000ms), 30fps. Both final route captures, program and IR bytes exactly match the reviewed baseline. Exact source SHA-256 `ae37d554cb66d8f1dd16540fca230b0ae21297f89c0e1125bdfaa57f39c53ee9`; program SHA-256 `1b5bee167b1257ec14786a912ca46c1d1d0fd7ace2aec779e9a6872ad7f3a5fd`, 8,880 bytes. Canonical root `r000001` was reserved in `evaluation/authoring/manifests/samples.json`, then exact scratch bytes copied to `samples/motionscript/LOT-00/faithful/r000001/program.ms`. Parent IDs/hashes are genuinely null; nextRevision is 2. Language releases are MotionScript/Scene IR 0.5.0, wire 0.2. Package/dependency/resource pins and exact hash-associated verification links are in its immutable manifest. Original `.motion` evidence remains at its original saved path.

The operator supplied current registry/workflow URLs during execution. Missing authoring contract documents were read from immutable remote commit 41b76e558bd38e422b6f0133e322c530da26d218; hashes are recorded in authoring-authorities.json. Preliminary content-addressed storage was retained only as a draft; the actual registry follows monotonic integer revisions and separate pointers. A local quality pass is recorded, while canonical/production publication eligibility awaits durable evidence references under the supplied storage contract. Training/rights remain UNREVIEWED. Local implementation refinement can begin independently; any changed program needs a separate authoring run and unchanged-original full-window verification. No refinement run, source savings, generation improvement or broad abstraction adoption is claimed.

## Evidence and reproducibility

Before/after captures, failures, source/program identity and route measurements are preserved separately. Initial HEAD archive, tested attempt-2 source archive and final complete source archive identify the bytes. Final source snapshot excludes credentials/dependencies/disposable build output and recursive historical/bulk evidence, while including packages/app/harness/config/lockfiles/fixtures/contracts and canonical program bytes. `source-program-ledger.json`, `final-route-results.json`, `outcomes.json`, `loop.json`, `lot00-qualification.json`, capture manifests and representative strips retain exact associations. Full captures and source archives remain local bulk evidence; durability limitations are explicit. Supporting documents imported from remote do not alter workflow 1.1 or published language releases.

The all-fixture full-window browser schedule was stopped to preserve/finalise evidence inside the 60-minute bound. Affected and previously exact native windows completed; remaining known partial fixtures retain actual counts and incomplete statuses. This is not a full-corpus coverage pass. No further implementation was started after reserving stop-record time.

