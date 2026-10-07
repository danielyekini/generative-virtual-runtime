# SVG source subset (adapter 0.1)

`@gvr/format-svg` imports this subset into Scene IR. It does not emit MotionScript or draw.

## Purpose

Import a bounded **static-first** SVG subset into Scene IR. V0.1 does not execute scripts, event attributes, `foreignObject`, or external active content.

## Document root

| Construct | Support |
| --- | --- |
| `svg` width/height | Exact when numeric/px |
| `viewBox` | Exact with supported `preserveAspectRatio` |
| `preserveAspectRatio` meet | Exact |
| `preserveAspectRatio` none | Exact if representable |
| `preserveAspectRatio` slice | Unsupported until clipping |
| Percent/physical units | Unsupported unless explicitly resolved |

## Structure and geometry

| Element | Support |
| --- | --- |
| `g` | Group, hierarchy preserved |
| `rect`, `circle`, `ellipse`, `line` | Exact within IR primitives |
| `polyline`, `polygon` | Exact or path lowering |
| `path` | Subset of commands (M/L/H/V/C/S/Q/T/Z); arcs per policy |
| `text` | Simple single-line only |

## Style (computed subset)

`fill`, `stroke`, `stroke-width`, `opacity`, `fill-opacity`, `stroke-opacity`, `visibility`, `display:none` — exact where mappable. Gradients/patterns deferred. Group opacity may be **approximated** until isolated compositing exists.

## Transforms

`translate`, `rotate`, `scale` — exact. `matrix` — exact only if decomposable without skew. `skewX`/`skewY` — **unsupported**.

## Animation

None required for V0.1. Static scenes use a configurable positive `durationMs` shim for the current runtime. SMIL/CSS animation is a future extension.

## Security

Reject or strip executable content: `<script>`, `on*` attributes, `javascript:` URLs, `foreignObject`.
