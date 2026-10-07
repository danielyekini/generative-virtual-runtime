# Lottie → Scene IR mapping (adapter 0.1)

Implementation-oriented lowering table for `@gvr/format-lottie` v0.1. Scene IR is the only import target; MotionScript is emitted later by the shared emitter.

## Composition

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `fr`, `ip`, `op` | Composition timing | `timeline.durationMs` | `((op - ip) / fr) * 1000` | exact |
| `w`, `h` | Composition size | `viewport.width`, `viewport.height` | direct | exact |
| `nm` | Composition name | `sceneId` / metadata | sanitise identifier | exact |
| (none) | Letterbox background | `background` | default `#101014` unless overridden by policy | exact |

## Layer transform (`ks`)

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `ks.a` | Anchor point | `transform.pivot` | Vec2 copy | exact |
| `ks.p` | Position / translation | `transform.position` | **position = p − a** (per keyframe when animated) | exact |
| `ks.s` | Scale percentage | `transform.scale` | `[sx/100, sy/100]` | exact |
| `ks.r` | Clockwise degrees | `transform.rotation` | `deg × π/180` radians | exact |
| `ks.o` | Opacity percentage | `opacity` | `o/100` | exact |
| `ks.sk`, `ks.sa` | Skew | — | not lowered | unsupported |
| `ao` | Auto-orient | — | not lowered | unsupported |

Parented layers: child `transform.*` remain **parent-local**; hierarchy via `parentId`, never pre-flattened to world space.

## Layer kinds

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `ty=4` shape | Vector layer | `group` node + shape children | one group per layer | exact |
| `ty=3` null | Transform-only | `group` node | no drawable geometry | exact |
| `ty=1` solid | Colour card | `rectangle` + `fill` under layer group | size `sw×sh`, color `sc` | exact |
| `ty=0/2/5` | Precomp / image / text | — | not lowered | unsupported |
| `hd=true` | Hidden flag | `visible=false` | base visibility | exact |
| `ip`, `op` | Layer span | `steps` on `visible` | show/hide at mapped ms | exact |
| Layer list order | Earlier `layers[]` entry draws on top | root/group `zIndex` | `max(own, descendants)` of `(maxOrder − arrayOrder) × 10` so parenting does not bury children under later roots | exact within Scene IR hierarchy |

## Shapes and paint

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `el` | Ellipse | `ellipse` node | `size` from `s`, placement via shape/group transforms | exact |
| `rc` | Rectangle (centre at `p`) | `rectangle` node | `size` from `s`; Scene IR top-left = `p − size/2`; `r≠0` → path or reject | exact / unsupported |
| `fl` / `st` siblings | Paint after geometry in `shapes` or group `it` | node `fill` / `stroke` | Apply to preceding unpainted geometry in that list | exact |
| `sh` | Bezier path | `path` node | vertices/tangents → move/cubic/close | exact within path subset |
| `gr` | Shape group | `group` node | preserve order; `tr` → group transform | exact |
| `fl` | Solid fill | `fill` SolidColor | RGBA from `c` + `o` | exact (static) |
| `st` | Stroke | `stroke` | width, color, opacity | exact (static) |
| `gf` | Gradient fill | `fill` linear/radial | static stops; requires `paint.linearGradient` / `paint.radialGradient` | exact (static) |
| `gs` | Gradient stroke | `stroke` with gradient colour | static stops + width/cap/join; requires `paint.gradientStroke`; sibling `st` dropped when `gs` present | exact (static) |
| Animated `c` / gradient stops | — | — | not lowered | unsupported |

## Animation tracks

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| Static scalar | Base value | node/camera base field | direct | exact |
| Animated scalar | Keyframes | `KeyframeTrack` | frame → ms; offsets normalised within track span | exact |
| Animated Vec2 | Keyframes | `KeyframeTrack` (`vec2`) or split `x`/`y` | same time base | exact |
| `h=1` | Hold keyframe | keyframe track | duplicate flat segment (same value at hold end) | exact |
| `i`/`o` bezier | Easing handles | keyframe `easing` | map to `linear` / `easeIn` / `easeOut` / `easeInOut` or report **approximated** | approximated |
| `ti`/`to` | Spatial tangents | — | not lowered | unsupported |

## Masks and effects

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `masksProperties` | Masking | — | reject feature | unsupported |
| Layer mattes | Compositing | — | reject feature | unsupported |
| Effects | Post-processing | — | reject feature | unsupported |
