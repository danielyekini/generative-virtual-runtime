# Multi-line text wrapping versus stop (E055)

Decision: 4 November 2026.
[Issue #239](https://github.com/danielyekini/generative-virtual-runtime/issues/239).
Decision record. **Stop.** This change has no MotionScript / Scene IR version
bump, no registry capability and no wrap or line-list construct. `text.basic`
stays one line, and the validator keeps rejecting `\r` / `\n` in `content` and
content steps.

Parent: [dynamic-text-and-metrics.md](dynamic-text-and-metrics.md) (E013).
E040 shipped `text.dynamicContent` (0.18.0) and E041 shipped `text.layoutMetrics`
(0.20.0). Both left wrapping out of scope. Per-glyph `text.animators` is not
part of this slice.

## Requirement

Decide whether one text node should get a bounded wrap: `maxWidth`, line
breaking and multi-line content, using builtin `sans` advances and an optional
monospace builtin. The alternative is to stop, keeping one-line `text.basic`
and hand-split captions. The record must cover the layout box, hit-testing,
content steps and streaming, and the effect on authoring and generation.

## Evidence

Measured at base `9e84e96`. The scripts and outputs are in
[`docs/runs/engine/b6a87ab5-ed28-446a-ae56-c5e255c9c3a5/`](../../runs/engine/b6a87ab5-ed28-446a-ae56-c5e255c9c3a5/).

**Corpus footprint** (`stacked-text.ts`, 23 native story programs, 684 text
nodes). A "stacked group" is a set of text nodes with the same x, align and
size whose y values step by 1.0–1.9 × font size. There are 21 such groups,
holding 118 nodes. None of them is a prose paragraph that an automatic wrap
would produce:

| Story | Stacked lines | Why one node per line is the right shape |
| --- | --- | --- |
| Adding Two Vectors | `eqLine1..3` equation derivation | Each line has its own opacity keys: they appear at 52 %, 55 % and later. Lines align with leading spaces. |
| Clockwork | title block + gear legend | The lines use different fills (`#6e6256` title, `#241e18` rows). They are table rows with column spacing. |
| Square Wave | 10 numerator/denominator pairs | These are fractions, not text flow. |
| Into the Moon's Shadow | Sun/Moon names; umbra/penumbra legend | Separate labels, each placed beside its own swatch. |
| Packet Journey, Pixels, Motion | labels, formula pair, title/subtitle | Different sizes or weights and separate meanings. |
| Binary Tree | 50 call-stack entry nodes | Single letters inside stacked frame rectangles, repeated across per-state groups. |

The longest single caption measures 995 px (Motion), which is still one
deliberate line. Generated programs under `fixtures/generation/held-out` and the
product Ollama/fixture runs contain one text node in total. No story or
generated output contains a paragraph that is cut off or crammed for lack of a
wrap.

**Advance accuracy** (`advance-gap.ts`, 182 `sans` strings of 12 or more
characters, in headless Chromium). The renderer draws `sans` as the host's
`sans-serif` (here Inter). The ratio of the builtin advance table to the real
`measureText` width is: min 0.871, p10 0.967, median 1.005, p90 1.056, max
1.242. Thirty strings (16 %) differ by more than 5 %, and three differ by more
than 10 %. Other hosts (Arial, Helvetica, DejaVu) map `sans-serif` to other
faces, so the gap will vary by platform.

## Alternatives

1. **Status quo: one-line `text.basic`, one node per line** (chosen). Every
   stacked case above needs its own per-line timing, fill, size or column
   spacing. Per-line nodes already carry these through ordinary tracks, steps
   and `text.dynamicContent`. The only arithmetic left is the y step between
   lines (about 1.2–1.5 × font size). That is one constant, not
   calculator-level layout. Hit-testing and spatial outlines keep the exact
   per-line `measureTextLine` box from E041.

2. **Bounded automatic wrap (`maxWidth` + greedy breaking on the builtin
   advances).** Rejected. The layout box would need a line count, a line
   height and per-line align boxes. Hit-testing would need a multi-box union,
   and spatial outlines would change with it. The break positions would come
   from an advance table that is off by −13 % to +24 % from the glyphs the host
   actually draws. That leaves two bad choices:
   - Break on the table, which is deterministic. Rendered lines can then
     overflow `maxWidth`, or wrap visibly early, by a host-dependent amount.
     Hit boxes would no longer match the glyphs.
   - Break on host `measureText`. The rendered text is then right, but
     line count, box height, hit-testing, export and following layout change
     from one platform to another. That breaks E041's rule that builtin `sans`
     conformance does not need host measurement.

   An honest wrap needs a bundled builtin face (or shaping) whose advances the
   renderer actually draws. That is a font-resource decision (see Revisit in
   E013), not a text-layout one. Streaming also gets worse: a content step on
   a wrapped node can change the line count after seal. That moves the
   node's box and anything placed relative to it, and the authoring gate asks
   us to keep this kind of result explicit. No corpus story pays for this
   cost.

3. **Explicit line list on one node** (`\n` or a `lines` field with
   `lineHeight`, no width measurement). This is deterministic and needs no
   advance accuracy. Rejected for now. It saves only the y step, and in
   every measured group the lines differ in timing or style, which a shared
   node cannot express without per-line sub-styling. Per-line sub-styling
   would grow into a tspan-like construct, which `text.basic` excludes. This
   is the first option to reopen if the revisit trigger below fires.

4. **Monospace builtin advance table only.** Not justified on its own. The
   monospace lines in the corpus (Motion code, Vectors equations) are already
   one line per node and need no wrap. A monospace table helps only alongside
   option 2 or 3.

## Contract outcome

- No language change. `text.basic` keeps its one-line restriction in the
  registry. The validator diagnostic `V1 text is a single line.` stays the
  honest rejection for embedded newlines, in both `content` and content steps.
- Authoring guidance: write one text node per line and step y by about
  1.2–1.5 × `fontSize`. Use a group for shared transforms, and give each line
  its own opacity or content steps for staged reveals.
- Hosts that need paragraph flow (for example, a future teaching surface)
  can lay out lines in host code and emit one-line nodes. That output is not
  released MotionScript semantics.

## Authoring and generation assessment

1. **Simplicity / low error rate.** Hand-split lines need one constant line
   step. A wrap would hide break positions behind estimated advances, and an
   author could not predict them without host measurement.
2. **Generation friendliness.** Models already emit one-line text nodes, and the
   generated corpus has almost no text. Wrap would invite long strings with
   breaks that differ by platform.
3. **Streaming compatibility.** Per-line nodes keep content steps local: a late
   change cannot reflow sibling lines. A wrapped node could change its line
   count after seal.
4. **Expressiveness vs under-the-hood computation.** Moving break computation
   into the runtime only pays off once the runtime knows the drawn glyph
   widths, and today it does not.

## Revisit

Reopen as a new decision, not by overloading `text.basic`, when either of these
happens:

- A story or Product teaching surface needs **same-style paragraph text**
  revealed together (three or more lines with the same style and timing), or
  a generated program truncates or crams captions. Evaluate option 3 (explicit
  line list) first.
- A bundled builtin font or shaping decision makes renderer advances
  authoritative. Option 2 can then be measured against drawn glyphs.

E054 (standalone `transform.autoOrient`) is unaffected.
