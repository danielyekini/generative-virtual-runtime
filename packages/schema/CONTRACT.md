# Scene contract 0.1

This document is the reading version of the V1 contract. The TypeScript types in `src/types.ts` are the same rules in a form the validator can check. MotionScript's grammar is `MOTION_SCRIPT_EBNF` in `src/grammar.ts`. Fixtures under `fixtures/ir` are instances of this contract. `fixtures/meanings` states the only reading of the representative ones.

Nothing in the IR is a Canvas call, a DOM node, or a JavaScript function.

## Units and viewport

- The default logical viewport is **1280 by 720**. A scene may choose another positive size. It does not reflow when the window changes.
- **x increases right. y increases down.**
- IR time is **milliseconds**. IR angles are **radians**.
- A positive angle is **clockwise** on that y-down plane.
- Opacity is a finite number in **[0, 1]**, inclusive.
- Camera zoom is a finite number **strictly greater than 0**. Zoom magnifies the view. It is not a world scale of `z` that would invert to `1/z`.
- Scene duration is finite and positive, and at most 60 seconds under the default budget.
- The only fit policy is **contain**. The logical viewport is scaled uniformly and letterboxed. It is never stretched.

The view matrix is

```text
V = T(viewportCentre) × S(zoom) × R(−rotation) × T(−camera.position)
```

`R` is the clockwise matrix above, so the camera uses the inverse rotation. With a 1280×720 viewport, camera position `(500, 300)`, zoom `2`, rotation `0`, and world point `(700, 300)`, the logical point is `(1040, 360)`.

A world-space node's resolved matrix is `V × Mworld`. A screen-space root skips `V`. Children cannot declare space; they inherit the root. V1 has no mixed-space subtree.

## Local matrix

Column vectors, column-major 3×3 matrices:

```text
Mlocal = T(position) × T(pivot) × R(rotation) × S(scale) × T(−pivot)
Mworld(child) = Mworld(parent) × Mlocal(child)
```

The root's parent matrix is the identity. Pivot is a point in local geometry, not a 0..1 anchor. That point stays at `position + pivot` in parent space for every rotation and scale. The renderer receives the flattened logical matrix and does not multiply parents or the camera again.

Sampled animation values do not overwrite these authored base values.

## What each primitive means

Shared defaults, applied by the compiler when MotionScript omits them. IR fixtures write them explicitly.

| Field | Default |
| --- | --- |
| position, pivot | `(0, 0)` |
| rotation | `0` |
| scale | `(1, 1)` |
| opacity | `1` |
| visible | `true` |
| zIndex | `0` |
| root space | `world` |
| track start | `0ms` |
| easing | `linear` |
| fill | none before the track, forwards after it |
| stroke | width `1`, cap `butt`, join `miter`, miter limit `4` |
| path fill rule | `nonzero` |
| text | left, alphabetic, weight `400`, style `normal` |

**Group.** No geometry and no children array. Membership is `parentId` only.

**Rectangle.** Local `(0, 0)` is the **top-left** corner (minimum x and minimum y). `size.x` is the full width and `size.y` is the full height, both positive. The corner opposite the origin is `(size.x, size.y)`. A rectangle at `(100, 50)` with size `(200, 80)` and pivot `(0, 0)` occupies parent space from `(100, 50)` to `(300, 130)`.

**Circle.** The centre is the local origin. `radius` is positive. The top of the circle is local `(0, −radius)` because y is down.

**Ellipse.** An ellipse is centred on the local origin. `size` is the **full** width and height, not radii. The ellipse extends `size/2` on every side of the origin. It does not begin at `(0, 0)`.

**Line.** `from` and `to` are local endpoints. A stroke is required. There is no fill.

**Polygon.** Local vertices, at least three. The edge from the last vertex back to the first is part of the fill and the stroke. The fill rule is nonzero.

**Path.** Commands are absolute local coordinates. There are no relative commands. The first command is `move`. `line`, `quadratic`, and `cubic` need a current point. `close` needs an open subpath and then leaves the current point at that subpath's start. Strokes are centered on the boundary in local units and are transformed with the node.

**Text.** One line. The node position is the anchor. `align` `left` / `center` / `right` places that anchor on the left edge, the horizontal centre, or the right edge of the advance width. `baseline` `alphabetic` puts the anchor on the alphabetic baseline; `top`, `middle`, and `bottom` use the em box. Font size is the em square in local units. Glyph advance depends on the font; the anchor rule does not.

## Hierarchy, order, opacity

Canonical ids: a root's id equals its name. A child's id is `parentId + "." + name`. Names are identifiers and contain no dots. `bunny.head` is the node named `head` whose parent is `bunny`.

Sibling order is ascending `zIndex`, then ascending index in `nodes`. A subtree occupies its parent's slot. A child's `zIndex` cannot climb out and interleave with uncles. The node is visited before its descendants, so children paint after their parent. `visible: false` removes the subtree. Opacity `0` still emits a draw item.

Resolved opacity is the product of the node and its ancestors. That is per-drawable alpha, not an isolated group composite. Overlapping children will show through each other differently than an offscreen group would.

## Property addresses

The longest registered node id wins, then the remainder must be a property:

| Address | Type | Writes |
| --- | --- | --- |
| `bunny.position` | Vec2 | track, both scalar channels |
| `bunny.position.x` | number | track |
| `bunny.rotation` | angle (radians) | track, numeric path, not shortest-arc |
| `bunny.opacity` | number in [0, 1] | track |
| `bunny.visible` | boolean | step only |
| `camera(main).zoom` | number > 0 | track |

`bunny.position` and `bunny.position.x` write the same scalar channel and must not overlap in time. A Vec2 value aimed at opacity is an invalid target type. `fill`, `blur`, text, and path geometry are not animation targets. `camera(main).zoom` is not a node address. Node ids and camera ids are different namespaces.

Keyframe offsets are fractions in `[0, 1]`, strictly increasing, and include both ends. Easing belongs to the segment that leaves that keyframe. The last keyframe has none. Omitted segment easing means linear.

```text
linear(u) = u
easeIn(u) = u²
easeOut(u) = 1 − (1 − u)²
easeInOut(u) = 2u² when u < 0.5, otherwise 1 − 2(1 − u)²
```

An expression is numeric. `t`, `local_t`, and durations inside the expression are **seconds**. `progress` is the raw track fraction before easing. `PI` is the circle constant. `%` is the toward-zero remainder. `lerp` does not clamp its third argument. `clamp` requires `lo <= hi` at the sample.

`1 / 0` and `sqrt(-1)` are legal programs and illegal samples. The sample becomes the authored base value for that timestamp only. The track stays enabled. The runtime records a diagnostic and marks the program degraded. The same timestamp always fails the same way.

Before a track starts, the value is the authored base. After it ends, `forwards` holds the terminal sample. Two tracks may touch at an endpoint. The later start owns that instant. Overlapping positive duration on one scalar channel is rejected, and the rejection does not keep either new track.

## Tokens

Whitespace is not significant. `//` comments run to the end of the line and are not recognized inside strings. `#RRGGBB` and `#RRGGBBAA` are colours; `#` is never a comment, and `#RGB` is not a colour. Identifiers contain no dots. A dot is its own token. Numbers are unsigned; `+` and `-` are operators. A number immediately followed by `ms`, `s`, `deg`, `rad`, or `%` is one token, and the lexer stores milliseconds, radians, or a fraction of 1. The suffix is not taken when it is only the start of a longer identifier, so `12sec` is a number and an identifier. Strings use `\"`, `\\`, `\n`, `\t`, `\r`, and `\u` plus four hex digits. Expression text is parsed only after the string is decoded. A semicolon inside a string does not end a statement.

Streaming must preserve the lexer modes `default`, `lineComment`, `string`, `stringEscape`, `unicodeEscape`, `number`, and `color`. Splitting on `;` or `};` is not a token rule.

## Diagnostics and budgets

A diagnostic has a stable `code`, a `phase`, a `category`, a `severity`, and an execution `effect`. Those are independent. Schema rejection uses effect `UNIT_REJECTED`: the candidate unit is discarded and the last accepted scene stays as it was. `SEAL_BLOCKED` does not advance `sealedThroughMs`. `RUNTIME_DEGRADED` substitutes the authored base for that sample only. `PROGRAM_FATAL` stops the generation and keeps the committed scene.

Default budgets, all overridable as configuration:

| Budget | Default |
| --- | --- |
| Duration | 60s |
| Nodes | 500 |
| Depth (root is 1) | 16 |
| Tracks / steps | 1000 each |
| Path commands + polygon vertices | 10,000 |
| Expression depth / operations | 32 / 256 |
| Source / one buffered unit | 512 KiB / 128 KiB |
| Deferred units | 100 |
| Startup buffer / transition cap | 750ms / 250ms |

## Scene IR 0.2

Version `"0.2"` adds timing scopes, cubic and hold easing, spatial tangents, composition definitions, instances, geometry operator lists, paints, image resources, transform parents, and render scopes. A 0.1 document omits those fields. A 0.2 consumer loads 0.1 by migration: one identity root scope, empty compositions, instances, and operators, and `requiredCapabilities: []`. Sampling of a migrated scene matches the 0.1 scene. A 0.1 consumer rejects 0.2 before playback.

Local time is `(parent - offsetMs) / stretch`. Stretch is finite and non-zero. Track start and duration are local. Seals stay in root time and are mapped into local time before they are compared with a scoped track. Cubic easing solves `x(u) = progress` with x controls in `[0, 1]`, then returns `y(u)`. Y may leave `[0, 1]`. Hold easing stays on the segment start until the next key. A vec2 key may carry spatial out and in tangents; the curve is sampled with the eased progress. Composition order breaks ties after start time and defaults to declaration index. Overlapping writers are still rejected. Instances are stored and validated and are not drawn a second time. Trim operators are applied when a path is resolved. A rounded rectangle keeps its corner radius. `transformParentId` selects the transform chain when it is present; omitted, the chain is `parentId`. `inheritOpacity: false` stops the opacity product before containment ancestors. The default render tree is a non-isolated root whose leaves are the draw items. A group with compositing becomes a nested scope. A stored frame without `renderTree` remains valid.

Playback calls `acceptScene`. Unknown versions, missing capabilities, and resources whose readiness is `pending` or `failed` fail before the first sample. Omitted readiness means ready.

## Runtime operations

`CREATE_SCENE`, `ADD_NODES`, `ADD_TRACKS`, `ADD_STEPS`, `SEAL_TIMELINE`, and `COMPLETE_PROGRAM`. A delta's `nextRevision` is `expectedRevision + 1`. One canonical SceneIR can be rebuilt from the accepted deltas. Caches are not part of it.
