# SVG gaps

This list is what the adapter does not lower yet. It is not a limit on Scene IR or MotionScript. Add the missing capability in those languages, then lower it. The registry is the support claim.

## Unsupported

- Scripts, event attributes, `foreignObject`, external active content
- `skewX` / `skewY` and non-decomposable matrices
- Patterns, filters, and gradient paints (SMIL and CSS here cover opacity and simple transforms)
- `tspan`, `textPath`, complex text layout
- `preserveAspectRatio` slice (until clipping)
- Full CSS cascade. Embedded `@keyframes` opacity plus an `animation` duration on an id is applied; other declarations are not

## Approximated

- Indefinite SMIL repeat is previewed for one cycle
- Elliptical arc `A/a` when converted to cubics (tolerance must be documented)
- Font metrics vs reference environment

## Dropped

- Metadata-only attributes with no rendering effect

## Static duration shim

Static SVG may use a configured default `timeline.durationMs` (recommended 1000 ms) so the current runtime can seek/play without implying authored animation.
