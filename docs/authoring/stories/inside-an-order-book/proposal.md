# Unevaluated retrospective — Inside an Order Book

2026-10-29. See the [story index](../README.md) for the status of these records. This is an implementation retrospective, not an adopted language design, corpus evaluation, or claim of exact visual fidelity. Recommendations below are hypotheses unless explicitly described as observed.

## 1. State of the result

The playground preset is `inside-an-order-book`, derived from the supplied title. The generated program lasts 35,000 ms. It uses the current wire version `0.2` with released `easing.hold`, `geometry.roundedRect` and `text.basic`; no contract, registry, version, pending-capability or budget files changed.

### What matches

| Time | Evaluated result and inspected evidence |
| --- | --- |
| 0–5 s | B1, B2, S1 and S2 arrive during 0–1, 1–2, 2–3 and 3–4 s. The book holds during 4–5 s. Bid 99.00/100 and ask 101.00/70 are best; the spread is 2.00. [4 s](evidence/stills/f04.0.png). |
| 5–9 s | B3 arrives during 5–6 s; 99.00 becomes 160 units at 6 s. The detail strip opens during 6–7 s, B1 precedes B3, and the tape remains empty. [6.5 s](evidence/stills/f06.5.png), [7 s](evidence/stills/f07.0.png), [8 s](evidence/stills/f08.0.png). |
| 9–15 s | Execution windows are 9–11 and 11–13 s. At 11 s, B1 has gone, S3 has 30 remaining and the first tape line reads 100 at 99.00. At 13 s, the second line reads 30 at 99.00, S3 is filled and B3 retains 30 of 60. The 99.00 row holds 30 during 13–15 s. [11 s](evidence/stills/f11.0.png), [13 s](evidence/stills/f13.0.png), [14 s](evidence/stills/f14.0.png). |
| 15–22 s | M1 enters at 15 s; execution windows are 16–18 and 18–20 s. S1 leaves at 18 s, M1 shows 30 remaining, and S2 is highlighted at its own row before moving up. At 20 s M1 is filled, S2 retains 90, and all four tape entries are present. The best ask changes to 102.00 and spread to 3.00 at 18 s, immediately after S1 is exhausted. [18 s](evidence/stills/f18.0.png), [18.5 s](evidence/stills/f18.5.png), [20 s](evidence/stills/f20.0.png). |
| 22–27 s | Cancellation request/outline at 22 s, strike during 23–24 s, removal at 24 s, then a three-second hold. Both B3 and the 99.00 row disappear. B2 at 98.00/80 becomes best and the spread is 4.00. The tape stays at four entries. [23 s](evidence/stills/f23.0.png), [24 s](evidence/stills/f24.0.png), [25.5 s](evidence/stills/f25.5.png). |
| 27–31 s | B4 arrives during 27–29 s, rests at 100.00/50 above B2, and narrows the spread to 2.00 without changing the tape. The book holds during 29–31 s. [28 s](evidence/stills/f28.0.png), [29 s](evidence/stills/f29.0.png), [30 s](evidence/stills/f30.0.png). |
| 31–35 s | Rest/Match/Cancel captions appear at 31/32/33 s. From 34–35 s everything holds. Final resting book: B4 50 at 100.00, B2 80 at 98.00, S2 90 at 102.00. Tape: 100 at 99.00; 30 at 99.00; 70 at 101.00; 30 at 102.00. [31 s](evidence/stills/f31.0.png), [32 s](evidence/stills/f32.0.png), [33 s](evidence/stills/f33.0.png), [35 s](evidence/stills/f35.0.png). |

All prices have two fractional digits; resting quantities explicitly say units, and the tape's heading/subtitles establish units. Colors are navy background, teal bids, coral asks, amber executions and white explanatory text. Persistent order names appear on the resting rows, detail cards, incoming order labels and tape counterparties as appropriate.

### Simplifications and remaining limitations

- **Audio is absent.** The current grammar/Scene IR provide no audio-event representation. Placement clicks, two pairs of execution ticks and the muted cancellation click were omitted. Amber execution pulses and a coral cancellation strike preserve the visual distinction. This is an actual contract gap, not an implemented sound system.
- **Camera direction is simplified by choice.** The camera stays centred at (640, 360), with a small push to zoom 1.025 during 6–8 s and 1.015 during 16–21 s. Colored highlights shift emphasis rather than a literal pan toward each ladder. The full tape remains readable. An off-centre pan is available in the language but was not attempted in the final implementation.
- **Quantity changes are discrete at execution completion.** Static text variants switch at 11, 13, 18 and 20 s; there is no interpolated number countdown. The 99.00 aggregate correctly passes through 60 after B1 leaves and before B3 is partially consumed. There is no price/time matching engine: this is an authored demonstration of these exact orders.
- **Incoming S3/M1 and cancellation are labels rather than travelling cards.** S3 appears immediately at 9 s; M1 has the 15–16 s arrival interval before executions. Limit orders use moving cards. The cancellation request sits in the incoming area above the bid ladder rather than immediately beside B3; the outline/strike identify its target.
- **Removal and insertion are mostly visibility changes.** The cancelled remainder is struck for one second and then hidden, rather than shrinking continuously. B3's detail moves after B1 leaves, and S2 moves up during 18–18.8 s. B2 keeps its original second row during 24–29 s so B4 can occupy the first row without another reflow. The final comparison table is represented by the two ladders, rather than a second literal four-column table.
- **Minor remaining visual compromise:** travelling arrival cards cross the heading band (e.g. [0.5 s](evidence/stills/f00.5.png), [5.5 s](evidence/stills/f05.5.png), [28 s](evidence/stills/f28.0.png)). Headings paint above them and remain readable, but the motion is visually busy there. This is an implementation/layout choice, not a missing language feature.
- **Verification is sampled.** No reference animation or pixel tolerance was supplied. Forty-five real CanvasRenderer stills were visually inspected via contact sheets; five were additionally inspected at full size. A 100 ms runtime sweep checks positions/rectangle bounds, while browser glyph widths are checked at the 45 capture times. This does not establish every-frame visual fidelity, every possible overlap, continuous playback smoothness, audio, or cross-browser/font equivalence.

### Measurements and checks

The [capture manifest](evidence/capture.json) records Chromium 151.0.7922.173 on Debian 13, a 1280×720 CanvasRenderer surface, device scale 1 and all capture times. [Review record](evidence/review.json); [frame hashes](evidence/stills-sha256.json).

| Resource | Observed | Default budget |
| --- | ---: | ---: |
| UTF-8 program bytes | 30,675 | 524,288 (512 KiB) |
| Scene nodes, including groups | 123 | 500 |
| Tracks | 21 | 1,000 |
| Visibility steps | 138 | 1,000 |
| Duration | 35,000 ms | 60,000 ms |

The [capture run](evidence/measurements.json) measured compilation at 459.28 ms, builder work before preview at 2,536.95 ms, and builder work including 45 Chromium captures at 7,963.53 ms. The separate [no-preview run](evidence/builder-no-preview.json) measured compilation at 498.95 ms, builder work at 2,251.34 ms and complete `npx tsx` process wall time at 2.684 s. These are individual local measurements, not a benchmark distribution. The no-preview run returned zero and left the preview files unchanged.

The builder performs 14,289 assertions on `AnimationRuntime.evaluate` draw items: expected text/visibility, independent final tape values, row positions, B1-before-B3 separation, moving S2 highlight attachment, cancellation tape count, frame bounds and shuffled seeks. Compile and validation return no diagnostics. Assertions do not use an order-book simulation to predict the same simulation's outputs.

| Check | Result | Base comparison |
| --- | --- | --- |
| Builder, with and without `GVR_PREVIEW_DIR` | Pass | New builder |
| Real CanvasRenderer capture and glyph bounds | 45 PNGs; pass at sampled times | New capture |
| `npm run build -w @gvr/playground` | Pass; Vite warns about a chunk larger than 500 kB | Base build not measured; no regression claim about bundle size |
| `npm run typecheck` | Fail: 12 diagnostics in existing clockwork, counter, crane and eclipse builders; no diagnostic in this builder | Same 12 diagnostics on base `1f1e3de25376759fde055dd12098d77b5dabc55d`; [current](evidence/typecheck.txt), [base](evidence/base-typecheck.txt) |
| `npx vitest run` | 201 pass, 1 fail across 26 files: `fixture harness > accepts the valid IR and rejects every required fault` | Same 201/1 on that base; `fixtures/ir/invalid/duration-limit.json` is accepted although the manifest expects rejection. [Current](evidence/vitest.txt), [base](evidence/base-vitest.txt) |

Base checks used a detached worktree at the recorded commit with the same installed dependencies. The failing duration fixture uses 30,001 ms while the base default duration budget is 60,000 ms; that inconsistency predates this story and was not changed. The repository-wide typecheck exits in its first project, so later projects were not independently established as passing by that command.

## 2. Hardest and most error-prone aspects

Ranked by observed repair effort/risk, not invented time-sheet totals:

1. **Synchronising text, quantities, IDs and tape at exact boundaries.** Initially full-duration percentage opacity keyframes made the 4 s visibility assertion fail because a rounded percentage mapped just after the intended millisecond. Moving semantic changes to existing integer-millisecond visibility steps removed this failure. Separate text nodes still encode 100/160/60/30, spread 2/3/4/2, incoming remainders and final labels. **Root cause:** implementation choice to use percentages for discrete changes, plus static text requiring variants. **Workaround:** 138 visibility steps, independent draw-item expectations at 11/13/18/20/24/29 s and shuffled seek checks. No runtime timing defect is established by that first failure.
2. **Readable motion versus merely valid positions.** The first contact sheets revealed B3 overlapping B1 during the 6–7 s expansion and S2 losing its label during 18–18.8 s reflow. Anchor/screen assertions alone had passed. **Root cause:** my initial paths and separately positioned S2 label. **Workaround:** B3 enters from x=600 and settles at x=280 while B1 occupies x=40–230; S2's ID and best-price marker are row children, and its pulse shares the row's position track. Five queue-separation and five pulse-attachment samples now guard those repairs. The final [6.5 s](evidence/stills/f06.5.png) and [18.5 s](evidence/stills/f18.5.png) frames show the result.
3. **Getting trustworthy preview evidence.** `build-packet-journey.ts` supplied useful builder/evaluation structure, but its SVG preview and fixed temporary directory did not satisfy this task. The first Chromium attempt navigated to a Vite 404 page and could not import modules. **Root cause:** tooling setup—there was no preview HTML entry, and Vite's normal index fallback ran before the added response. **Workaround:** a custom-app Vite server, an explicit local HTML response, checked navigation, CDP evaluation, and imports of the production runtime/renderer. The helper runs only with `GVR_PREVIEW_DIR`, captures canvas PNGs directly and cleans up Chrome/profile/server. This was not a renderer defect.
4. **Repository/reference drift.** The requested `build-motionscript-to-motion.ts`, stories index and existing story README/proposal format were absent on the base branch. The full checks also failed independently of this story. **Root cause:** repository/tooling context. **Workaround:** use the available packet builder and authoring guidance, establish an explicit record format and legacy inventory, and retain base/current check logs. No claims about absent earlier proposals are inferred.
5. **Exact requested sound cannot be represented.** Placement and execution are distinguishable visually but not audibly. **Root cause:** language/IR scope. **Workaround:** documented omission with amber/coral visual cues. No audio adapter, side-channel script or new capability was smuggled into the program.

## 3. Suggested improvements

All unimplemented benefits below are hypotheses. “Removes” names the concrete program/builder burden the suggested change targets; no byte savings were measured for unbuilt alternatives.

### GVR fixes and tooling with no language change

| Suggestion | What it would remove here | What a more detailed version could do | Status / relation |
| --- | --- | --- | --- |
| Reconcile the duration-limit fixture with the current default; repair existing builder type errors | The unrelated red full-suite/typecheck baseline and its comparison explanation; no story source reduction | Use a clean repository-wide gate to detect story regressions | Observed failures, not language proposals; no pending capability needed |
| Extract the opt-in Canvas/CDP capture helper with navigation checks, glyph bounds and contact sheets | The preview-server/browser lifecycle block in this builder; replace manual contact-sheet assembly in scratch | Inspect more midpoints, automate overlap reports and keep font/browser metadata consistent across stories | The packet reference's SVG/fixed-path preview is an observed tooling pattern; no earlier proposal exists here to cite |
| Add a timeline inspection report grouping visibility/text variants by semantic event | Manual cross-checking of 138 independent step declarations and tape/row/label relationships | Show which quantities and captions change together and identify unpaired visibility windows | Tooling hypothesis; not an order matching engine, no pending capability |
| Improve empty-text and reserved-ID diagnostics with explicit reason/safe-name suggestion | The failed empty placeholder experiment and avoidable identifier repair risk; the final placeholder was simply removed | Diagnose generated labels before an expensive capture | Empty text was observed rejected; the final program compiles without reserved identifiers. No reserved-ID failure occurred in this implementation |

### Experiments using the current language

| Experiment | What it would remove here | What a more detailed version could do | Status / relation |
| --- | --- | --- | --- |
| Use existing timing scopes for event-local animation tracks | Repeated percentages of the full 35 s in motion tracks and some absolute-time arithmetic; exact steps should remain millisecond-based until scoped-step semantics are verified | Retiming a two-second execution pulse independently of the full story | Supported timing constructs exist; this rewrite and its savings are **untested**. It needs shuffled-seek/boundary comparisons |
| Use existing composition/instance support for a repeated row or tape-entry motif | Repeated rectangle/font/placement declarations in the generated program | A deeper book and longer tape with consistent typography | Hypothesis: exact identity, text variation and instance animation ergonomics need a small prototype. `geometry.repeater` is pending but copies geometry; it is not a general row-with-different-text solution |
| Keep all IDs, quantity variants and highlights local to moving groups | Remaining separately positioned row-ID labels and duplicated coordinates | Safe reflow after cancellation, clearer best-price tracking and fewer attachment errors | Partly observed in repaired S2; extend and compare before generalising. Hierarchy/world-versus-screen patterns also occur in Packet Journey's implementation |
| Rework card routes and use targeted camera position/zoom tracks with a screen-space tape | Arrival-card/heading overlap and the choice to keep the camera centred | A literal bid-detail push, ask-side pan and smoother cancellation reflow without losing the tape | Existing camera and screen-space capabilities suffice; final alternative is **untested**. No language addition is justified solely by this layout |

### Language proposals

| Candidate | What it would remove here | What a more detailed version could do | Design boundary / prior status |
| --- | --- | --- | --- |
| A gated, deterministic text-value update or formatted numeric-text binding | Duplicate static quantity, remainder and spread text nodes plus their visibility steps | Integer quantity counters and fixed-two-decimal prices driven by authored scalar tracks, without manufacturing one node per value | Needs semantics for formatting, rounding, bounds, seek behaviour, font measurement and compatibility. Pending `text.animators` concerns per-character/range animation; it does **not** already provide numeric formatting. No earlier story proposal was present to establish recurrence |
| An absolute-time keyframe form alongside percentage keys | The builder's `t / 35 * 100` conversion and long percentage literals in continuous motion/pulse tracks | Edit long sequences in milliseconds while keeping exact beat boundaries | A syntax/compiler proposal, not a new execution model. Must define interaction with duration/timing scopes, emit/parse round trips and existing percentage semantics. Current `step ... at ...ms` already solves visibility boundaries; use that now. Not listed in pending |
| A gated audio-cue/event representation with explicit seek policy | The documented missing clicks/ticks; it removes no existing drawing code | Separate placement, execution and cancellation cues synchronised with the four trades | Requires an IR resource/event model and host policy: preload/failure, autoplay, scrub/replay, reverse playback and offline rendering. Not in the present grammar or pending list. An event list need not imply imperative execution; semantics still require design |

Functions, loops, mutable order-book state and general event-driven execution are **not** routine extensions proposed by this example. The builder already uses TypeScript functions/loops to emit a finite declarative timeline. Promoting those into MotionScript would require the explicit execution-model design decision named in `AGENTS.md` and the compatibility policy, plus evidence from a broader corpus. This one small book does not establish that need.

Pending masks, mattes, merge paths, skew, auto-orient and animated solid fill were not required here. A geometry repeater would not replace price-time semantics, and text animators would not by themselves eliminate static numeric variants. None of those capabilities was changed or claimed.

## 4. Priority

**Fix now:** repair the existing check baselines in a separate task, and make real Canvas capture/bounds/contact sheets reusable tooling. These have direct observed failures or repeated local setup cost and require no language change. Retain exact millisecond visibility steps in this story.

**Experiment next:** test event-local timing and parented row components, then try improved arrival routes and a screen-space tape with a more directed camera. Compare the same captured times, midpoints, shuffled seeks, bytes and expanded budgets. Prototype deterministic numeric text separately; its proposed reduction in duplicate nodes is a hypothesis until measured.

**Defer:** audio until its resource/seek/host design is agreed; new numeric-text or absolute-key syntax until a small conformance/round-trip experiment supports it; and general loops/functions/stateful matching until an explicit design decision and broader evidence justify the execution model. This retrospective does not adopt or release any of those changes.
