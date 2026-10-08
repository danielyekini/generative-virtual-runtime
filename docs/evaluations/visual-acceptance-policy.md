# Native Lottie visual acceptance policy 1.0

The operator delegated defining this gate on 2026-10-08. The machine-readable
authority is `evaluation/gate-settings.json`. This is a conservative engineering
acceptance policy, not a claim of calibrated universal perceptual equivalence.
Freeze a copy and its hash in each run before implementation. Future operator
changes require a new policy/run; never relax a running gate to fit its results.
Historical measurements keep their original VISUAL_UNVERIFIED status.

## Aggregate and local rules

Compare RGB with Euclidean distance. A pixel is hot when distance exceeds 24.
Every scheduled frame and additional boundary/subframe sample must have at most
0.5% hot pixels. The arithmetic mean across all equally weighted scheduled
frames in the full observation window must be at most 0.2%. Extra samples do not
alter that mean. No maximum-frame failure can be hidden by averaging.

Use 32 × 32 physical-pixel tiles on two grids, offset (0, 0) and (16, 16).
Include clipped edge tiles on both grids so all pixels are covered. Foreground
is the union of reference and native pixels whose RGB distance from #101014 is
greater than 24. For each tile, divide the hot count by max(64, foreground count).
The ratio must be at most 10%. Count every hot pixel, even unexpected background
content. The denominator floor limits sensitivity to isolated rasterisation
speckles; it does not exempt small objects from material review. The second grid
reduces boundary dilution. These rules reject concentrated loss even when a
large empty canvas makes whole-frame error small.

Material review is mandatory and independent of both numeric rules. Missing or
extra subjects/details, paint, geometry, mask/matte contributions, wrong stacking,
pose, visibility, timing or flicker fail. Review every automatic failure, start/end,
key boundaries, segment midpoints, worst frames and the full-window sequence or
contact sheets for both native routes. An incomplete review is VISUAL_UNVERIFIED.
Antialiasing differences alone may be acceptable only within the fixed numbers.

## Comparison and coverage

This profile is opaque output composited on #101014. Both PNGs must have alpha
255 everywhere after compositing. Transparent-output support is not certified
by this profile. It needs its own backgrounds and alpha measurements.

Capture each finite composition on [ip, op) at its own source frame rate, one
cycle, with matching timestamps, DPR 1, contain/xMidYMid meet, explicit subframe
mode and pinned lottie-web/browser versions. Add boundary and subframe samples.
Compare source reference, direct imported IR, and emitted/compiled IR. No frame
shifting, warping or wall-clock playback substitutes for a seek. Record actual
captured/expected counts and times. Missing captures cannot have zero error.
Additional samples must not introduce hidden clamping to a different time.

Reference controls must show expected motion without errors; repeated reference
captures at identical seeks must be identical within the same pinned environment.
Assets/fonts must be ready, and effect support must be recorded. Unreliable
reference evidence quarantines that comparison; it cannot pass. A different
browser revision requires newly pinned evidence, not reuse of historical pixels.

Resolved-state numeric tolerance stays 0.001; colour stays 1/255. Check complete
geometry, matrices, scope/order, visibility, paint and timing at boundaries,
midpoints, start/end and deterministic shuffled seeks. Raster equality between
the two native routes is useful additional evidence, not a replacement for this
semantic check.

## Final status

Full profile PASS requires no known unsupported/dropped/approximate conversion,
semantic round-trip agreement, full-window visual rules on both native routes,
complete material review, trustworthy reference controls, regression safety and
specified resource budgets. Capture execution PASS is only evidence that a route
drew. Sampled numeric success is not full-window success. Keep conversionStatus,
roundTripStatus, visualStatus and coverageStatus independent. Authoring uses its
[separate workflow](../workflows/authoring-loop.md) and run records; it is not a
fidelity completion condition. Historical combined statuses remain unchanged.
LOT-03's existing source-budget quarantine and SVG exclusion remain unchanged.

`evaluation/harness/visual-gate.ts` evaluates the numeric frame/window rules.
Review and reference prerequisites remain explicit inputs; no aggregate score
automatically certifies them. New agents must copy this policy into their run's
loop/manifest before attempting implementation.
