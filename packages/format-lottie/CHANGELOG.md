# @gvr/format-lottie

## 0.1.3

Preserve source cubic values and renormalised Bezier subsegments when scalar or matching-topology morph tracks cross composition boundaries. This fixes the early Wave shape residual caused by linear boundary sampling and unsplit easing. Degenerate equal-easing-endpoint intervals remain explicitly approximate. Clipped spatial paths retain their existing geometry and now report an approximation until exact spatial subcurves are implemented. No MotionScript, Scene IR, wire or sampling-contract change. Controlled gradient experiments in evaluation 2026-10-08T123430Z did not corroborate the earlier creation-coordinate attribution.

## 0.1.2

Retain sibling solid and gradient strokes as ordered native passes on preceding geometry, with shared group transforms and duplicated morph/trim tracks. Match lottie-web reverse style-list painting order. No language or wire contract changes; MotionScript and Scene IR remain 0.5.0. Transformed gradient coordinate-space mismatch is separately confirmed and unresolved. Align the adapter runtime version with this package release.

## 0.1.1

Preserve representable source cubic easing handles instead of proximity-based named substitutions. Only exact diagonal handles collapse to linear. Existing out-of-range controls retain approximation diagnostics. MotionScript and Scene IR remain 0.5.0; this corrects importer implementation of the published cubic contract.

Retain shape-group position, scale, rotation and opacity animation via existing transform tracks; preserve first-key bases and report animated anchors as unsupported. No language contract change.
