# Generative Visual Runtime

GVR is a portable animation stack: author in **MotionScript**, validate and sample **Scene IR**, then draw with a canvas renderer. Lottie and SVG importers lower into the same IR. A MotionScript emitter and round-trip verifier close the loop.

Current languages are **MotionScript 0.4.0** and **Scene IR 0.4.0** (wire `"0.2"`). A 0.2 consumer migrates wire `"0.1"` without changing 0.1 samples. Package versions are separate from language versions; see [`packages/schema/capabilities/releases.json`](packages/schema/capabilities/releases.json).

**Support authority** is [`packages/schema/capabilities/registry.json`](packages/schema/capabilities/registry.json). Design notes such as [`packages/schema/CONTRACT.md`](packages/schema/CONTRACT.md) do not override it. Evaluation runs under [`docs/evaluations/`](docs/evaluations/README.md) measure one revision; they are not the specification.

```bash
npm test
npm run typecheck
npm run validate-ir -- fixtures/ir/valid/minimal.json
npm run validate-ir -- --manifest fixtures/ir/manifest.json
npm run import-lottie -- fixtures/import/lottie/centred_rect.json
npm run import-svg -- fixtures/import/svg/static_primitives.svg
npm run dev:renderer
```

Studio: `http://localhost:5173`.

---

## What is implemented

Thirty-two capabilities are in the published languages. Nineteen have supported coverage on every applicable target (compiler, runtime, renderer). Thirteen more are in the schema and partially wired; their registry rows are `untested` until conformance pins them. Seven further ids are pending language work (unsupported everywhere).

### Scene and camera (0.1)

| Capability | Role |
| --- | --- |
| `scene.camera` | 2D camera: position, clockwise rotation, zoom; contain letterboxing only |
| `scene.contain` | Logical viewport scaled uniformly and letterboxed, never stretched |

Default logical size is 1280×720. Time is milliseconds; angles are radians, clockwise on a y-down plane.

### Geometry and paint

| Capability | Introduced | Status today |
| --- | --- | --- |
| `geometry.primitives` | 0.1 | Rectangle, circle, ellipse, line, polygon — supported end-to-end |
| `geometry.path` | 0.1 | Absolute move/line/quadratic/cubic/close — compile and sample supported; renderer untested |
| `geometry.roundedRect` | 0.2 | Corner radius on rectangles — schema present, untested |
| `geometry.operators` / `geometry.trimPath` | 0.2 | Trim and round operators on nodes — compile supported for operators; trim application untested |
| `geometry.spatialCurve` | 0.2 | Spatial in/out tangents on vec2 keys — Lottie exact; core targets untested |
| `paint.linearGradient` / `paint.radialGradient` | 0.2 | Gradient fills with colour stops — schema present, untested |
| `resources.image` | 0.2 | Image nodes over declared resources — schema present, untested |
| `text.basic` | 0.1 | One line, builtin font, alignment, baseline — supported |

### Animation and easing

| Capability | Introduced | Status today |
| --- | --- | --- |
| `animation.tracks` | 0.1 | Keyframe tracks with end fill — supported; Lottie exact for layer transforms |
| `animation.steps` | 0.1 | Visibility steps — supported |
| `animation.expressions` | 0.1 | Bounded expression tracks after start — supported (not imported from Lottie/SVG scripts) |
| `easing.named` | 0.1 | `linear`, `easeIn`, `easeOut`, `easeInOut` — supported |
| `easing.cubicBezier` | 0.2 | `ease cubic(…)`; y may leave `[0, 1]` — supported; Lottie exact |
| `easing.hold` | 0.2 | Hold until next key — supported; Lottie exact |
| `timing.localScopes` | 0.2 | Local time shift/stretch — supported; Lottie precomp scopes exact |
| `hierarchy.opacity` | 0.1 | Drawn opacity is the product of ancestors — supported |

### Composition, compositing, effects (0.2)

| Capability | Status today |
| --- | --- |
| `composition.definitions` | Definitions and instances; Lottie precomps exact (expanded into nodes) |
| `compositing.isolatedOpacity` | Isolated group opacity scopes — SVG exact; core targets untested |
| `compositing.blend` | `source-over`, `multiply`, `screen`, `overlay` on isolated groups — untested |
| `effects.blur` | Blur on a render scope — supported; Lottie static Gaussian blur exact |
| `effects.shadow` | Shadow on a render scope — schema present, untested |
| `render.tree` | Nested render scopes for compositing groups — runtime supported; renderer untested |
| `transform.parent` | Separate transform parent / opacity inheritance — untested |
| `scene.migration` | 0.2 readers load 0.1 scenes with identical samples — supported |

### Format adapters

**Lottie** (`@gvr/format-lottie`, docs under `formats/lottie/`, goldens in `fixtures/import/lottie/`):

- Exact (scoped): primitives, transform tracks, cubic/hold easing, spatial curves, timing scopes, composition/precomp expansion, static Gaussian blur, matching-topology path morph, static gradient strokes.
- Reported unsupported (not silently dropped): mattes, masks, skew.
- Many other constructs lower or diagnose but remain `untested` until a conformance fixture pins them.

**SVG** (`@gvr/format-svg`, docs under `formats/svg/`, goldens in `fixtures/import/svg/`):

- Exact (scoped): static primitives, SMIL opacity/`animateTransform`, CSS opacity `@keyframes`, isolated group opacity.
- Approximate: elliptical arcs → cubics; simple text string kept (metrics not claimed).
- Scripts and event handlers produce no scene (`animation.expressions` unsupported for SVG).

Round-trip (`@gvr/round-trip`): import → emit MotionScript → compile → sample both scenes. Geometry/matrices may differ by `0.001`; colour channels by `1/255` (8-bit hex in MotionScript). Every exact Lottie fixture must pass.

### Not yet in a published language

These ids are listed in `docs/languages/*/versions/pending.md` and are **unsupported** in compiler, runtime, and renderer until a version lands them:

`compositing.matte`, `compositing.mask`, `transform.skew`, `transform.autoOrient`, `geometry.repeater`, `geometry.mergePaths`, `text.animators`.

The project aim is to grow Scene IR and MotionScript until modern Lottie and SVG can render. Those pending rows are gaps to close, not a closed V1 ceiling. Loops and function declarations are the only class that needs a design decision before implementation.

---

## Packages

| Package | Role |
| --- | --- |
| `@gvr/schema` | Grammar, Scene IR types/validator, capability registry, releases |
| `@gvr/compiler` | MotionScript → Scene IR |
| `@gvr/runtime` | Sampling, migration, streaming seals |
| `@gvr/canvas-renderer` | Canvas draw of resolved frames |
| `@gvr/motionscript-emitter` | Scene IR → MotionScript |
| `@gvr/format-import-core` | Shared import report / dataset tooling |
| `@gvr/format-lottie` | Lottie → Scene IR |
| `@gvr/format-svg` | SVG → Scene IR |
| `@gvr/round-trip` | Import/emit/compile fidelity checks |
| `@gvr/playground` | Studio (`app/playground`) |

Fixtures: `fixtures/ir`, `fixtures/meanings`, `fixtures/motionscript`, `fixtures/import/{lottie,svg}`. Language notes: `docs/languages/`. Compatibility rules: [`docs/languages/compatibility-policy.md`](docs/languages/compatibility-policy.md).

---

## Studio

`npm run dev:renderer` opens one workspace at `http://localhost:5173`.

- **Left:** test scripts, canvas size and DPR, streaming, import.
- **Right:** source editor and inspector.
- **Format** on the inspector: MotionScript, Fixture, Lottie, or SVG. Compile runs the editor through that format. Import picks a simulation preset, paste, or file. Play lowers into Scene IR (same reports as `npm run import-fixture` / `import-lottie` / `import-svg`).
- **Compiled / Round-trip / Both** share one clock.
- **Stream** seals a horizon, waits, and resumes when more text arrives.
- **Split** (`#import/split`): imported Scene IR beside MotionScript round-trip.
- **Stage** (`#stage`): prompt → system scene → stand-in generated scene crossfade → prompt returns. The generated picture is a stand-in until a model is connected.

Static SVG keeps both panes and disables the player. Folder conversion is not connected yet. `PASS` means the document matches the schema; `FAIL` prints a diagnostic and does not replace an accepted scene.

---

## Evaluations

Indexed at [`docs/evaluations/README.md`](docs/evaluations/README.md). Newest run: [2026-10-07T183125Z](docs/evaluations/2026-10-07T183125Z/report.md) (MotionScript/Scene IR 0.2). Historical baseline: [2026-10-07-baseline](docs/evaluations/2026-10-07-baseline/report.md). Do not edit published runs; do not widen tolerances to pass a comparison.
