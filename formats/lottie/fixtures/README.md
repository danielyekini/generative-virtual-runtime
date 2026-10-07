# Lottie golden fixtures (adapter 0.1)

Fixtures live under `fixtures/import/lottie/`. Each case proves one semantic rule from `formats/lottie/mapping.md`.

## Naming

- `<case>.json` — source Lottie JSON (Bodymovin-compatible subset).
- `<case>.expected-ir.json` — expected Scene IR after import (hand-authored from spec semantics, not copied blindly from a first implementation run).
- `<case>.expected-diagnostics.json` — expected fidelity/diagnostic entries (codes and features, not necessarily full message text).
- `<case>.expected.motion` — optional canonical MotionScript when round-trip is exact for that case.

## Catalogue

| Fixture | Proves | Expected fidelity |
| --- | --- | --- |
| `static_shape` | Ellipse + solid fill, static transform | exact |
| `solid_layer` | `ty=1` solid → rectangle + fill | exact |
| `parented_transform` | Parent/child `ind`/`parent`, local transforms | exact |
| `nested_shape_group` | `gr` + shape order + inner `tr` | exact |
| `animated_position` | `ks.p` keyframes, frame→ms, **p−a** | exact |
| `animated_scale` | `ks.s` percentage → scale | exact |
| `rotation_anchor` | `ks.r` degrees + pivot from `ks.a` | exact |
| `animated_opacity` | `ks.o` → node opacity track | exact |
| `hold_keyframe` | `h=1` hold on opacity or position | exact |
| `easing_bezier` | Monotonic cubic easing | exact |
| `unsupported_skew` | Non-zero `ks.sk` | partial or unsupported diagnostic |
| `unsupported_mask` | `masksProperties` present | partial + unsupported |
| `malformed` | Truncated JSON | failed, no scene |
| `sibling_fill` | `fl` sibling of `el` under `shapes` | exact |
| `parent_listed_later` | Null parent after children in JSON | exact |
| `centred_rect` | `rc.p` centre → Scene IR top-left | exact |

## Expected IR notes

- Scene time `0` corresponds to composition frame `ip`.
- Duration matches `((op - ip) / fr) * 1000` ms.
- Layer visibility steps align to layer `ip`/`op` relative to composition `ip`.

## Diagnostics shape

`expected-diagnostics.json` lists objects with:

- `feature` — logical feature id (e.g. `mask`, `skew`).
- `level` — `exact` | `approximated` | `dropped` | `unsupported`.
- `code` — import diagnostic code when stable.

Tests compare subset of fields; message text may vary slightly.

## Native reference

The studio import tools (`/#import/split`) can open a Lottie file or step through these fixtures. The left pane plays the imported Scene IR. The right pane emits MotionScript from that scene, compiles it, and plays the result on the same clock. Bezier-easing fixtures are degraded; the report names the approximation. Malformed JSON produces no scene on either pane.

Exact fixtures must also pass `verifyRoundTrip`: imported Scene IR, emitted MotionScript, compiled Scene IR, then evaluated frames. Geometry and matrices may differ by 0.001. Colour channels may differ by 1/255.
