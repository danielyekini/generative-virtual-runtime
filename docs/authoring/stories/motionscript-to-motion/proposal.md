# From MotionScript to Motion: language proposal

Retrospective written after the implementation, recorded 2026-10-29. Unevaluated; see the [index](../README.md#what-these-proposals-are). Correction on recording: the chat version said "900-line" generator; the committed builder is 802 lines.

---

MotionScript itself was rarely the hard part. The hard part was everything around it: an 800-line TypeScript generator emitted 44 KB of `.ms`, and checks had to be written by hand to see whether the result looked right. Below are the problems actually hit, ranked by how much time or risk they cost, each with a suggested fix.

## Hardest and most error-prone parts

**1. Keyframe times are percentages, not seconds.**
- `keyframeValue` only accepts `N%` of the track's duration. Every one of the 111 tracks had to be written over the full 0–30s window, with hold keys at both ends.
- Every beat time ("card 2 at 1.0s") had to be converted to a percentage. A `percent()` helper raises precision and nudges values so keys stay strictly increasing when two beats are 1 ms apart.
- Changing the total duration would mean regenerating every track. The generated file has 647 percentage literals.
- *Mitigation already in the language:* the contract lets tracks on one channel touch at their endpoints, so per-beat `animate` blocks are possible. They were not used because it was not verified what the value is in the gap between two touching tracks. The authored base? The earlier track's held value? The existing story builders avoid the question the same way.

**2. Values that depend on each other had to be copied and worked out by hand.**
- The runtime beat is one clock driving four things: the playhead, the curve marker, the guide ring and the circle. Nothing in MotionScript can express that, so there are four separate tracks with the same timings.
- Making the marker trace the ease-in-out curve took two tracks: linear x and eased y.
- Scrubbing back to the midpoint, and later resuming, only stays on the curve because the second half of easeInOut, run in reverse, equals `easeIn` from 1 to 0.5, and run forward equals `easeOut` from 0.5 to 1.
- A small timing change to the scrub would break that silently. The builder's checks caught several of these mistakes.

**3. Text can't change and can't be measured.**
- Content isn't animatable. The "t = 1s" packet and the renderer's state readout are fixed strings swapped by crossfading, and a live "x = 312" readout was impossible.
- There is no way to measure text. Widths were estimated at about 0.55 × font size to keep the code rows clear of the right-aligned ✓ tags and the captions inside their plate.
- There is no wrapping or multi-line text. "Animation tracks" is two hand-placed text nodes, and the renderer narration had to be split into two captions.
- `fontFamily "monospace"` only works because the canvas passes the name straight to the browser. That doesn't appear to be a declared builtin font.

**4. Camera framing by hand was where layout mistakes concentrated.**
- Each shot's centre and zoom came from solving "panel fits, stays below the header, clears the caption plate" on paper.
- The 15–21s and 21–26s shots needed two rounds of shrinking the preview canvas and re-solving, caught only by `onScreen` checks.
- Readability had to be designed per zoom level: at the 0.45× wide shot the 26 px panel titles become about 12 px, so a second set of large stage labels exists just for that shot.

**5. Only one writer per channel.**
- Each panel's sound-cue pulses and the final travelling highlight would both animate `glow.opacity`, and those tracks would overlap. So every stage has two identical rectangles, `glow` and `glow2`.
- Any time two effects touch one property, the generator has to merge them into one track or duplicate the node.

**6. One syntax error hid the rest of the diagnostics.**
- A polygon named `cap`, a reserved keyword, produced "polygon needs a name / Expected '{' / Unknown property cap", followed by 12 `UNKNOWN_TARGET` errors.
- The parse failure dropped the whole runtime panel, so every track aimed at it failed too. The real error was one line, but it was hard to find.

**7. No reuse inside the language.**
- `composition`/`instance` exist, but instances "are not drawn a second time" (they aren't expanded into drawn copies), so they couldn't be used for the 5 stage panels, 3 cards, 3 Scene IR cards or 6 state packets.
- All repetition lives in the TS generator, so the `.ms` file is compiled output rather than something you'd edit by hand.

**8. Moving things along routes.**
- The highlight travelling through all five stages and the packets between panels are hand-placed x/y keys.
- The timeline extending into the runtime panel is a trimmed path, and nothing ties it to the objects travelling along it.
- To light up each panel as the highlight passed, the time it reaches each panel had to be calculated by hand.

**9. Verifying the result was all ad hoc.**
- The checks are custom code that looks up node ids and transform matrices.
- The stills come from a hand-written SVG copy of the renderer (copied from the packet-journey builder), not the real canvas renderer.
- The `track`/`span`/`pulse`/`drawItem` helpers are copied between the story builders with small differences.

**10. Requirements that couldn't be met at all.** Sound effects and narration audio have no representation, so they became visual pulses and captions.

## Suggested improvements

Per `AGENTS.md`, any language change needs a version entry, a registry row and conformance tests. Loops and functions also need a design decision first.

**Tooling (no language bump, biggest payoff)**
1. **A shared story-building package**, e.g. `@gvr/story-kit`, with:
   - A timeline helper that takes beats in seconds and generates the tracks.
   - Merging of several effects into one channel, which fixes the `glow`/`glow2` problem without a language change.
   - Frame checks: `visible`, `onScreen(safeArea)`, `near`, `oneOf`.
   - Headless PNG output through the real canvas renderer, plus a contact sheet.

   This removes most of the copied code across the builders, and the stills would come from the real renderer instead of an SVG copy.
2. **Better diagnostics:**
   - Report "`cap` is a reserved keyword and can't be an identifier".
   - Suppress follow-on `UNKNOWN_TARGET` errors for nodes inside a declaration that failed to parse.
3. **A cheap layout check:** compute each frame's text bounding boxes and flag overlaps and off-screen text. Most of the layout fixes were exactly this.
4. **Document gap behaviour** between touching tracks in `CONTRACT.md`, with a conformance test. If the earlier track holds its final value until the next starts, per-beat `animate` blocks become safe and percentage tracks become optional.

**Language (each a versioned capability)**
1. **Absolute key times**, e.g. `at 2.3s 0.5 ease easeOut;`, alongside percentages. The single biggest ergonomic win; fixes problem 1.
2. **Named signals and channel bindings:** `signal clock { … keys … };`, then `ring.position.x = "lerp(5, 185, ease(clock))"`. Expressions today can only reference `t`, `local_t` and `progress`. Letting them reference a signal fixes problem 2: playhead, marker, ring and circle share one source, and scrubbing becomes keying a single clock.
3. **Animatable text content**: number formatting bound to a signal (`content "x = {ball.x:0}"`), or at least step-changed strings.
4. **Text layout:** `maxWidth` with wrapping, multi-line content, and a declared monospace builtin font.
5. **Motion along a path:** a `follow pathId` with an animatable distance, which pairs with the pending `transform.autoOrient`.
6. **Expanded instances**, so a composition can be stamped out several times with per-instance overrides. Depends on the same design decision as loops.
7. **Camera fitting:** `frame nodeId padding 40 safe (0, 60, 0, 70)` resolved at compile time, so shots are described by what they show rather than by numbers.
8. **Cue markers:** `cue "click" at 0.7s;` and `caption "…" from 15.2s to 20.8s;`, stored as timeline metadata for a host to map to audio or subtitles. Narration stops being fake nodes and becomes something a player can use.
9. **The pending colour animation proposal** (`paint.animatedSolidFill`). Here it would replace several crossfaded copies of the same shape.

**Headroom for more detailed programs**
- This plate used 199 of 500 nodes and 111 of 1000 tracks. A plate roughly twice as detailed would hit `maxNodes` first, unless expanded instances or a repeater count against the budget differently from hand-copied nodes.
- `geometry.roundedRect` is still "untested" in the registry, and the path renderer is untested, yet every story plate leans on both. Getting both to "supported" with browser checks would make detailed plates trustworthy, not just compilable.

**Suggested order:** the story-kit and diagnostics, then documenting the gap behaviour, then absolute key times, then signals and bindings. The first three are cheap. Signals and bindings are the change most likely to allow much more detailed programs, because they make derived motion correct by construction instead of by hand calculation.
