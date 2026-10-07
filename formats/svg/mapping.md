# SVG → Scene IR mapping (adapter 0.1)

## Limits shared with Lottie

Scene IR has no skew, so both adapters report skew as unsupported. Group opacity is inherited per drawable, not an isolated composite. MotionScript stores colours as 8-bit hex, so a later round-trip may move a channel by at most 1/255. Static SVG uses a 1000 ms duration shim and no tracks.

| Source construct | Source semantics | Scene IR target | Conversion | Fidelity |
| --- | --- | --- | --- | --- |
| `viewBox` | User space extent | `viewport` + root transform | translate `-minX,-minY` | exact |
| `rect` | Axis-aligned box | `rectangle` | x/y → placement; w/h → size | exact |
| `circle` | Center + radius | `circle` | cx/cy, r | exact |
| `ellipse` | Center + radii | `ellipse` | size `2rx×2ry` | exact |
| `line` | Segment | `line` | from/to | exact |
| `polygon` / `polyline` | Point list | `polygon` / path | preserve order | exact |
| `path` | Path data | `path` | command subset | exact / approximated arcs |
| `g` | Group | `group` | hierarchy | exact |
| `text` | Simple text | `text` | anchor, align, font | approximate metrics |
| `fill` / `stroke` | Paint | `fill` / `stroke` | solid colours | exact |
| `opacity` | Alpha | `opacity` | multiply | exact / approximated on groups |
| `transform="translate(...)"` | Translation | `transform.position` | decompose | exact |
| `transform="rotate(...)"` | Rotation | `transform.rotation` | radians | exact |
| `transform="scale(...)"` | Scale | `transform.scale` | direct | exact |
| `transform="matrix(...)"` | Affine | transform fields | decompose or reject | exact / unsupported |
| `id` | Stable identity | node `name` / id allocation | sanitise | exact |
| SMIL / CSS animation | — | — | deferred | unsupported in v0.1 |
