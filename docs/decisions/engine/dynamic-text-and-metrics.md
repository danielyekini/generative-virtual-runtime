# Dynamic text, numeric formatting and metrics (E013)

Decision: 3 November 2026. [Issue #32](https://github.com/danielyekini/generative-virtual-runtime/issues/32).
Decision + host/schema prototype. No MotionScript / Scene IR version bump and no
registry support claim in this change. Language wiring is named follow-up work
below. No Lottie text-animator import campaign.

## Requirement

Native story programs (Order Book, Pixels, Vectors, Counter captions, Packet
labels) treat changing numbers and labels as **static `text.basic` variants**
swapped by opacity or discrete node sets. Authors guess glyph widths, cannot
format/round a live number into one node, and conflate that need with pending
`text.animators` (per-glyph transforms). Separate:

1. **Content / numeric changes** — one node whose string or formatted number
   updates over time.
2. **Layout / font metrics / readiness** — deterministic advance, align/baseline
   boxes, builtin font readiness.
3. **Per-glyph transforms / outlines** — remain `text.animators` and stay out of
   the content/format slice.

Authoring gates (3 November 2026): prefer high-level intent; keep generation and
streaming honest; do not force calculator-level width arithmetic onto authors.

## Evidence (source footprint)

Immutable fixtures / proposals (not re-certified here):

| Workload | Footprint today | Friction |
| --- | --- | --- |
| `inside-an-order-book.ms` | 60 `text` nodes, 80 `content` literals (~30 KB) | Quantity/price/tape strings are discrete static variants; proposal notes no interpolated countdown. |
| `from-pixels-to-prediction` proposal | ~82 text content literals; score/probability opacity swaps | Scores need counting and two-decimal chips without N nodes. |
| `adding-two-vectors.ms` | 11 text nodes / 29 content literals | Readouts and formula chips duplicated per value. |
| `counter.ms` / Counter proposal | Text listed among non-animatable channels | Captions stay fixed; dynamic HUD text was never the fight focus but the language still forbids content motion. |

Audit A10 ([production-capability-audit-2026-10-29](../../reference/production-capability-audit-2026-10-29.md))
already called for this split; pending `text.animators` alone does not implement
numeric formatting.

## Alternatives

1. **Status quo — static variants + opacity / visibility** (strongest
   current-system option). Works with `text.basic` today. Rejected as the sole
   contract: source size and node count explode; discrete quantity trails and
   score chips proliferate; edits to a value require hunting sibling nodes.

2. **Promote `text.animators` as the whole answer.** Pending registry row for
   per-character/range transforms. Rejected as the slice: Counter/Order Book/
   Pixels primarily need **string or number → one line**, not glyph offsets.
   Animators stay deferred for kinetic typography.

3. **Free-form string expression tracks.** A general string `PropertyType` with
   interpolated/concat expressions. Rejected for the first slice: strings do not
   interpolate meaningfully; expression grammar would widen far beyond readouts;
   formatting/rounding rules would still need a separate contract.

4. **Split content binding + format helpers + metrics** (chosen).
   - Discrete **content** updates (step-like or exclusively owned channel) on an
     existing text node.
   - **Numeric format** binding: a number channel (or sampled number) plus a
     deterministic format spec produces the displayed string (fraction digits,
     padding, sign, grouping, prefix/suffix).
   - **Layout metrics** helpers and eventual font readiness: measure advance and
     align/baseline boxes without host Canvas when using builtin `sans`.
   - Per-glyph / `text.animators` deferred.

## Contract (implementation-bound prototype)

Shipped in `@gvr/schema` as `text-metrics` (no language claim):

- **`formatNumber(value, spec)`** — finite numbers only; half-away-from-zero
  rounding; optional `fractionDigits`, `minIntegerDigits`, `sign`, `group`,
  `decimal`, `prefix`, `suffix`.
- **`resolveNumericContent`** — display string for a numeric readout binding.
- **`measureTextLine(content, font, align, baseline)`** — deterministic builtin
  `sans` advances (`BUILTIN_SANS_ADVANCES_EM`), ascent/descent matching the
  hit-tester em-box estimate, local AABB relative to the text anchor per
  `text.basic` CONTRACT rules.
- **`staticVariantCount`** — footprint helper comparing unique static values to
  one dynamic node.

Future language (follow-ups, not claimed here):

- Capability **`text.dynamicContent`**: gated content steps and/or exclusive
  content ownership; numeric format binding that writes derived content from a
  number channel; older readers reject via `requires` / `requiredCapabilities`.
  Discrete content does not invent continuous string interpolation.
- Capability **`text.layoutMetrics`**: declare/measure builtin font readiness;
  runtime/hit-test/camera helpers prefer measured boxes; optional host
  `measureText` override remains allowed but must not be required for conformance
  of builtin `sans` programs.
- **`text.animators`**: unchanged pending; per-glyph transforms/outlines only.

Ownership / streaming: content writers must follow exclusive channel ownership
(E002/E007). Sealed generative tracks are not rewritten; late content updates use
steps after seal or durable entity-owned writers as the versioned design specifies.
Format evaluation is pure given `(number, spec)` — seek-safe and export-safe.

## Authoring assessment

1. **Simplicity.** Authors write one text node + format intent (`fractionDigits 2`)
   instead of N content literals and opacity choreography.
2. **Generation.** Models already emit numbers and `text.basic`; binding a number
   track to format is additive and less brittle than inventing sibling ids.
3. **Streaming.** Derived content recomputes from the sampled number; discrete
   string content updates are explicit steps/ownership, not sealed-prefix rewrites.
4. **Expressiveness.** Rounding, padding and units move into the format helper;
   glyph animation stays a separate capability when stories need it.

## Critical pass

Prototype tests: `packages/schema/src/text-metrics.test.ts` — order-book prices,
counter padding, centered anchor box, equal digit advances, held-out score chips,
static-variant footprint. Full `npm run verify` remains the integration gate.
Do not claim language support until a follow-up ships a versioned capability.

Failure cases recorded: non-finite numbers throw; unknown families fall back to
`DEFAULT_ADVANCE_EM` (0.6) so layout is conservative, not falsely precise;
multi-line / wrapping / textPath stay out of scope with `text.basic`.

## Child work

- **E040** ([#175](https://github.com/danielyekini/generative-virtual-runtime/issues/175)): version `text.dynamicContent` —
  MotionScript / Scene IR syntax for discrete content updates and numeric format
  bindings, registry + conformance, Studio readout fixture. Reuse
  `formatNumber` / `resolveNumericContent`. No per-glyph animators. No Lottie
  text-animator campaign.
- **E041** ([#176](https://github.com/danielyekini/generative-virtual-runtime/issues/176)): version `text.layoutMetrics` —
  deterministic builtin metrics/readiness wiring into runtime hit-test / spatial
  text boxes / optional camera-safe labels hook; conformance for align/baseline
  boxes. Host `measureText` remains an override, not the sole truth for `sans`.
- **`text.animators`**: remains pending Candidate until a kinetic-typography
  story justifies it; not a child of this content/format slice.
- **Billboard / constant-screen-size labels (A25)**: separate later decision;
  needs camera space policy beyond metrics boxes.

## Revisit

- If Studio needs live readouts before a language bump, keep using the schema
  helpers in host code; do not silently treat them as released MotionScript.
- If a story proves continuous morphing between strings (not numbers) is required,
  open a new decision — do not overload numeric format.
- If custom fonts are required for education product surfaces, extend
  `text.layoutMetrics` with readiness/hold semantics analogous to audio resources;
  do not invent font URLs inside MotionScript without that decision.
