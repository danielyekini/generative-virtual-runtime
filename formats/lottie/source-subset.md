# Lottie source subset (adapter 0.1)

This document freezes the **source-side** contract for `@gvr/format-lottie` v0.1. It is derived from the MotionScript Lottie Format Adapter Specification v0.1. It does not describe milestones, gates, or repository layout beyond format semantics.

## Version boundary

- **Adapter:** `0.1.0` (see package `IMPORT_VERSION` / adapter metadata).
- **Target IR:** Scene IR `0.1` (Generative Visual Runtime V1).
- **Authoritative external reference:** [Lottie Animation Community specification](https://lottie.github.io/lottie-spec/latest/) for field meaning; this adapter versions its **supported subset** independently and rejects unknown **behaviour-affecting** fields rather than guessing.

## Top-level animation object

| Field | Required | Semantics |
| --- | --- | --- |
| `fr` | yes | Frame rate (frames per second). Must be finite and `> 0`. |
| `ip` | yes | Composition in-point, in frames. |
| `op` | yes | Composition out-point, in frames. Must satisfy `op > ip`. |
| `w`, `h` | yes | Composition width and height in logical pixels. |
| `nm` | no | Composition name; used for metadata only. |
| `layers` | yes | Ordered layer list (see ordering below). |

Composition duration in scene time:

```text
durationMs = ((op - ip) / fr) * 1000
```

A source keyframe at composition frame `f` maps to scene time:

```text
timeMs = ((f - ip) / fr) * 1000
```

## Coordinates and transforms

- Visual coordinates are **y-down**, **x-right**, origin at composition top-left (Lottie default).
- Rotation in layer `ks.r` is **clockwise degrees**.
- Scale `ks.s` is **percentage**; `100` means `1.0` in Scene IR.
- Opacity `ks.o` is **percentage**; `100` means opacity `1.0` in Scene IR.

### Anchor / position (V0.1, no skew)

For the no-skew subset, Scene IR uses:

- `transform.pivot` = Lottie anchor `ks.a` (Vec2, same units).
- `transform.position` = Lottie position `ks.p` minus anchor: **position = p − a**.

This matches Scene IR local matrix `M = T(position) × T(pivot) × R × S × T(−pivot)` yielding the same effect as Lottie `T(p) × R × S × T(−a)`.

**Not supported in V0.1:** `ks.sk`, `ks.sa`, `ao` (auto-orient). Any material use yields **unsupported** fidelity, not silent omission.

## Layer types (V0.1)

| `ty` | Kind | Supported |
| --- | --- | --- |
| `4` | Shape | yes |
| `3` | Null | yes (group, no geometry) |
| `1` | Solid | yes (rectangle + fill) |
| `0` | Precomp | **unsupported** (deferred) |
| `2` | Image | **unsupported** (deferred) |
| `5` | Text | **unsupported** (deferred) |

### Layer fields

| Field | Semantics |
| --- | --- |
| `ind` | Stable layer index; used for IDs and `parent` resolution. |
| `parent` | Optional parent layer `ind`. Child transform stays **parent-local**. |
| `ip`, `op` | Layer in/out in **composition frames**; lowered to visibility steps. |
| `hd` | Hidden when true (`visible = false` on the layer node). |
| `ks` | Transform properties (`a`, `p`, `s`, `r`, `o`, …). |
| `shapes` | Shape layer content (shape items). |
| `sw`, `sh`, `sc` | Solid width, height, RGB color `[0..1]×3`. |
| `masksProperties` / mattes | **unsupported** in V0.1 (explicit diagnostic). |

### Paint order

Lottie lists layers with **first entry on top**. Scene IR uses ascending `zIndex` (lower draws first). The adapter assigns `zIndex` so imported paint order matches Lottie.

## Shape layer content (subset)

Supported shape **items** inside `shapes` / group `it`:

| `ty` | Meaning |
| --- | --- |
| `gr` | Group; nested `it`; group transform via trailing `tr` item. |
| `el` | Ellipse (`p` center, `s` full size). |
| `rc` | Rectangle (`p` is **centre**, `s` full size; corner radius `r` **unsupported** unless zero). Scene IR stores top-left = `p − size/2`. |
| `sh` | Bezier path (`ks.k` path data). |
| `fl` | Solid fill (`c` color, `o` opacity %). May be a sibling of geometry under `shapes` or group `it`. |
| `st` | Solid stroke (`c`, `o`, `w` width). Same sibling paint rule as `fl`. |

Layer `parent` references are resolved by layer index regardless of array order: parent layers are lowered before children.

**Deferred / unsupported:** repeaters, trim paths, gradients, blend modes, effects, animated paint/path colours, shape operators not listed above.

## Property animation

Lottie properties use:

- Static: `"k": <value>` (or legacy static form).
- Animated: `"a": 1`, `"k": [ keyframes… ]`.

Keyframe object (subset):

| Field | Meaning |
| --- | --- |
| `t` | Frame time (composition frames). |
| `s` | Start value (scalar, vector, or path). |
| `h` | Hold (`1` = hold until next keyframe). |
| `i`, `o` | Bezier easing handles (may be **approximated** to Scene IR easing names). |

**Unsupported in V0.1:** spatial tangents `ti` / `to` on position (curved motion paths), unless explicitly lowered later.

Static-only scenes are valid: timeline may contain only base values and visibility steps.

## Timing consistency

- Reject `fr <= 0`, non-finite `ip`/`op`, or `op <= ip`.
- Layer/keyframe times outside the composition interval are clamped or rejected per adapter policy; v0.1 **rejects** materially inconsistent timing rather than silently shifting it (see tests).

## IDs

- Layer nodes: `layer_<ind>` plus optional sanitized `nm` suffix when needed for uniqueness.
- Shape children: deterministic names from source order and item type.
