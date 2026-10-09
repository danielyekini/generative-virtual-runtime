# @gvr/format-lottie

## 0.1.5

Keep each layer in its composition paint list, with reverse source order independent of transform parenting. Use the published `transformParentId` field for parent-local motion; inherit opacity and visibility only from composition containment. Scope parent lookup to each expansion so reused precomp assets retain their own chains. Canonical declaration order also preserves paint order in isolated render scopes. MotionScript and Scene IR remain 0.5.0, wire 0.2; no new syntax, schema, sampling rule or published release changes. Whole-fixture visual certification remains a separate gate.

## 0.1.4

Preserve clipped spatial motion with existing vec2 keyframes and restricted temporal easing over the original arc-length polyline. Covered temporal curves are monotonic with cubic Y controls in [0,1]; holds and named easing retain their existing meanings. No language or wire change. Non-monotonic spatial clipping remains outside this correction.

## 0.1.3

Clipped spatial geometry now explicitly reports its existing approximation; additional two-boundary scalar/morph conformance verifies both native routes.

Inventory animated solid fill colours recursively, including precomp shape trees, before lowering. Missing animated paints now report partial conversion rather than an exact label. The animated paint capability remains unimplemented.

Paint source shape groups in reverse list order, including nested groups, while preserving already ordered stroke passes. This restores covered face/shoe detail in LOT-06; independent arm geometry remains under investigation.

Preserve source easing when clipping non-spatial scalar, vector and path-morph tracks to the composition window. Sample cut boundaries with the original easing and restrict cubic handles with de Casteljau subdivision; retain hold jumps and overshoot excursions. Existing spatial clipping is outside this correction. No language or wire change: MotionScript and Scene IR remain 0.5.0.

## 0.1.2

Retain sibling solid and gradient strokes as ordered native passes on preceding geometry, with shared group transforms and duplicated morph/trim tracks. Match lottie-web reverse style-list painting order. No language or wire contract changes; MotionScript and Scene IR remain 0.5.0. Transformed gradient coordinate-space mismatch is separately confirmed and unresolved. Align the adapter runtime version with this package release.

## 0.1.1

Preserve representable source cubic easing handles instead of proximity-based named substitutions. Only exact diagonal handles collapse to linear. Existing out-of-range controls retain approximation diagnostics. MotionScript and Scene IR remain 0.5.0; this corrects importer implementation of the published cubic contract.

Retain shape-group position, scale, rotation and opacity animation via existing transform tracks; preserve first-key bases and report animated anchors as unsupported. No language contract change.
