# Two Ways Through a Binary Tree — unevaluated retrospective

2026-10-29. Written after implementation and real-renderer still review. This is recurrence evidence, not an evaluated or adopted language proposal; see the [index](../README.md#what-these-proposals-are). No capability, release, contract or budget change is claimed.

## 1. State of the result

Story id: `two-ways-through-a-binary-tree`, derived from the supplied title. Duration: 30 seconds. Implementation: `b6574fb13d4b3db492ac91d7e78e59ee065adcde`; base: `7f1e95b`. The initial checkout lacked the requested second builder and index; fast-forwarding the designated `work` branch to this base supplied both references.

The diagram grows A during 0–1s, B/C during 1–3s and D/E/F/G during 3–5s. Six trimmed paths extend before their child labels appear. The initial tree is centred horizontally, with root at (640,160); its 1.4 scale settles to 1 during 5–6s. Sibling positions are symmetric. Labels remain upright. The original tree moves left; the second tree dissolves into its final position during 5.65–6s. Panel text enters during 5.8–6s. See [growth and layout](stills/contact-0.png) and the full [5.5s transition frame](stills/f5.50.png).

After 6s the root centres are (325,160) and (955,160), second-level offsets are ±116px and third-level offsets are ±174px and ±58px. Tree discs have radius 25px. The horizontal queue starts at (215,448), with 58px slot pitch; the vertical stack occupies x=1166–1214, with 23px frame pitch, bottom label y=529. Its TOP marker follows the highest occupied frame. Visit-order letters are at y=598, above the comparison captions at y=675. The stack is below and to the right of the DFS tree rather than centred beneath it, an implementation layout choice to preserve separate, readable regions.

| Script beat | Runtime result and reviewed evidence |
| --- | --- |
| 5–8s establishment | Both trees, titles, A in both structures, empty visit strips; 6s and 7.9s in contact 0. |
| 8–12s root | Both A visits at 8.25s; BFS removes A, enqueues B at 9.15s then C at 10s; DFS retains A and pushes B at 10s. 8.5s and 10.5s in contacts 0–1. |
| 12–17s divergence | Both visit B at 12.25s. BFS reaches [C,D,E] at 13.75s and [D,E,F,G] at 16.1s. DFS reaches A→B→D at 13.75s, visits D at 14.75s, shows Leaf during 15–16.05s, and returns to B at 16.1s. Strips are ABC and ABD. [15.5s full frame](stills/f15.50.png), contact 1. |
| 17–23s exploration | BFS visits D at 17.35s, E at 18.65s and F at 20.25s. DFS visits E at 17.35s, pops E at 18.1s and B at 18.65s, pushes C at 19.15s, visits C at 19.6s, pushes F at 20.25s, visits F at 20.45s and returns to C at 21.7s. Contacts 1–2. |
| 23–27s completion | Both visit G at 23.35s; BFS queue is empty then. DFS pops G at 24.25s, C at 25s and A at 25.75s. Both structures remain empty afterwards. Contact 2. |
| 27–30s comparison | BFS level bands run 27–27.6s, 27.65–28.25s and 28.3–28.9s. DFS edges illuminate A–B, B–D, then A–B during 27.8–29s. Captions appear by 27.25s. Both correct orders hold through 30s. Contacts 2–3 and [full final frame](stills/f30.00.png). |

The final orders are **A → B → C → D → E → F → G** and **A → B → D → E → C → F → G**. Returns never append visits. Blue marks the current node, pale blue visited nodes, amber pending unvisited nodes and structure entries; stack ancestors remain represented even after first visit.

Differences and simplifications:

- Queue insertion/removal and stack push/pop use held state changes, with timed pauses, rather than continuous chip travel. This is my implementation choice, not a language limitation. Current position/opacity tracks could animate individual chips.
- Framing stays fixed at 1280×720. Scaling and repositioning the trees provide the wide composition; there is no literal camera widening. This is a staging choice within the current contract.
- The final DFS route is edge illumination without directional travel or arrowheads. The A–B edge reads as the return after B–D, but a continuous backtracking traveller is absent. Existing position tracks could provide one.
- Clicks, return ticks and completion tone are omitted. No audio or cue channel is present in the grammar/Scene IR used here. This is a contract gap, not substituted sound.
- The final empty structures have no remaining boxes to fade; their labels fade to 0.45 opacity over 27–27.5s, while completion messages and visit strips remain prominent.

Verification scope: all 37 stills were rendered by the production `CanvasRenderer` with `AnimationRuntime` in headless **Chromium 151.0.7922.173**, using a bundled local HTTP page and DevTools. No SVG approximation was used. Four contact sheets retain every reviewed still at half size; transition, leaf and final frames are also retained at full resolution. The contact sheets were assembled from PNG captures, not used as an alternate renderer.

Reviewed times in seconds: **0, 0.5, 1, 2, 3, 4, 5, 5.5, 6, 7.9, 8, 8.5, 10.5, 12, 13.9, 14.5, 15.5, 16.5, 17, 17.6, 18.8, 19.8, 20, 20.8, 22, 23, 23.6, 24.5, 25.2, 26, 27, 27.3, 28, 28.5, 29, 29.9, 30**. See [contact 0](stills/contact-0.png), [contact 1](stills/contact-1.png), [contact 2](stills/contact-2.png), [contact 3](stills/contact-3.png), and [machine-readable times](stills/frames.json).

Builder assertions inspect resolved draw items: all 24 structure states, nine independent script checkpoints for exact visible text/order, first-visit visibility before and after each visit, active-node exclusivity, positioned tree labels, leaf return, completion, and visited final nodes. A quarter-second sweep from 0 through 30s, followed by backwards seeks, checks visible text anchors and stroke-padded disc extents. Discs must stay on screen and above y=650. Text-width bounds are visually inspected, not measured by those anchor assertions. Full-motion playback perception, every rasterised frame, other browsers, smaller viewports and audio are **unverified**. This is a native story plate, not a registered quality-certified authoring sample.

| Measurement | Observed | Budget or scope |
| --- | --- | --- |
| UTF-8 source | 63,110 bytes | 524,288 bytes (`maxSourceBytes`, 512 KiB); explicitly checked by builder |
| Nodes | 405 | 500 |
| Tracks | 151 | 1,000 |
| Steps | 0 | 1,000; held keyframes do not count as steps |
| Compile | 2,670.99ms | One final local run; no warmup or statistical claim |
| Builder through assertions | 14,527.26ms | Includes generation, compilation, validation and runtime checks; excludes previews |
| Builder including previews | 17,626.9ms | Includes bundling, Chromium launch, 37 PNGs and cleanup; excludes the tsx launcher startup |

[Raw metrics](stills/metrics.json). These observations do not establish a general compiler/runtime performance curve. Token count, memory, generation efficiency and streaming latency were not measured.

`npm run typecheck` **fails**, with the same output on base `7f1e95b`: 12 TypeScript errors in `build-clockwork.ts`, `build-counter.ts`, `build-crane.ts` and `build-into-the-moons-shadow.ts`. No error names this story. `npx vitest run` **fails** on both working tree and base: 25 files / 201 tests pass, one test fails in `packages/schema/src/validate.test.ts`, “accepts the valid IR and rejects every required fault.” `fixtures/ir/invalid/duration-limit.json` is accepted and yields no fault codes after the duration budget was raised to 60s. The base checks were run in a detached worktree, not inferred from history. Retained logs: [typecheck](checks/typecheck.txt), [base typecheck](checks/base-typecheck.txt), [Vitest](checks/vitest.txt), [base Vitest](checks/base-vitest.txt). Neither existing failure was repaired in this story task. After merging the concurrently pushed Order Book story, both checks were repeated: [merged typecheck](checks/merged-typecheck.txt) has identical output to the base, and [merged Vitest](checks/merged-vitest.txt) still reports 201 passing tests and the same one failure. The merge-stage whitespace check also warned about Markdown hard-break spaces in the incoming supplied brief, raw test-log whitespace, and the incoming generated order-book program; those incoming bytes were preserved. No reserved-id compile diagnostic remains.

## 2. Hardest and most error-prone aspects

Ranked by observed correctness risk and repair effort; per-task time was not instrumented.

1. **Keeping first visits separate from returns.** DFS returns to B at 16.1s, A at 18.65s and C at 21.7s; only E, C and F extend the strip during that section. Root cause: my scheduling has several related representations (current node, structures and visit times), not a compiler defect. An initial D visit-strip timestamp preceded the structure update and was corrected. Workaround: explicit events plus independent checkpoints at 16.7, 19.85 and 22.5s reading rendered text and stack order. A model-only assertion would have missed displayed inconsistencies.
2. **Transition readability and support-label placement.** Initial 5.5s previews showed overlapping copies and panel labels. Root cause: my simultaneous crossfade/staging choice. A bounds check alone could not find an overlap between two on-screen objects. Workaround: retain the moving original as the left tree until 6s; delay the right copy and panel labels until 5.65s and 5.8s. Final 5.5s still has one moving tree, and 6s has the settled pair. The TOP marker now moves with stack height instead of remaining at a fixed y coordinate.
3. **Real-renderer preview reliability.** CLI screenshot capture stalled; a subsequent DevTools navigation to a `file:` page produced Chromium’s “Your organization doesn’t allow you to view this site” error. Root cause: tooling/environment, not MotionScript. Workaround: a loopback HTTP page, bounded readiness polling, DevTools evaluation and `canvas.toDataURL`. The successful path is in the builder behind `GVR_PREVIEW_DIR`, with a scratch profile under `work/` and cleanup. Shared preview tooling would remove this browser lifecycle code from the story.
4. **Authoring state without runtime mutation.** There are 24 queue/stack snapshot groups and three separately emitted tree hierarchies. The finished IR uses 405/500 nodes for seven logical vertices per tree. Root cause: chiefly my complete-snapshot implementation choice, plus repeated static paint layers; this is not evidence that seven-node trees inherently need this budget. Workaround: hold opacity between snapshots, retain A/B/C ancestor frames, and duplicate circles for state colours. Node reuse is an untested alternative here.
5. **Verification cost and false confidence.** An early checker repeatedly evaluated the same time for individual lookups; caching those frames removed that repeated work. Root cause: my tooling choice. Final builder time still includes a 121-sample layout sweep and checkpoint evaluations. Stills caught the transition issue that scalar bounds checks missed. Compilation succeeds with no diagnostics, but the two repository checks still fail on the base as described above; claiming all-green verification would be wrong.

## 3. Suggested improvements

### GVR fixes and tooling with no language change

| Suggestion | What it would remove here | What a more detailed version could gain | Existing evidence / status |
| --- | --- | --- | --- |
| Shared Chromium/CanvasRenderer story capture helper, with frame caching and readiness/error reporting | Inline bundling, HTTP server, DevTools lifecycle and repeated lookup infrastructure | Routine boundary and interval previews, captured text bounds, easier comparison of staging alternatives | Recurs in Blue, Clockwork, MotionScript→Motion, Crane, Small Ideas and Circle. This builder demonstrates one working route; extracting a shared helper is untested. |
| Bring the invalid-duration fixture into agreement with the released default, separately from this plate | No story source; removes one known verification blocker | A trustworthy green regression check for later authoring | Reproduced on base. Do not change `limits.ts` to make the fixture fail again. |
| Repair the four older builders’ TypeScript errors in their own scoped change | No story source; removes the base typecheck blocker | A usable shared typecheck gate for new plates | 12 diagnostics reproduced on base; fixes were not attempted. |
| Add a generator-side identifier check against the lexer’s reserved words | Would remove no current nodes or tracks; pre-empts bad generated names | Freer descriptive names with immediate useful diagnostics before a long compile | Recurs in Moon, Packet, Clockwork, Copperleaf and MotionScript→Motion. This program compiled without encountering such a collision; no new parser defect is asserted. |

### Experiments using the current language

| Experiment | What it would remove here | More detailed outcome | Status |
| --- | --- | --- | --- |
| Reuse letter tokens and slot groups across structure changes; animate position/opacity | The 24 complete queue/stack snapshot banks | Continuous enqueue/dequeue slides and push/pop travel, while preserving ancestor frames and deterministic seeking | **Hypothesis.** Compare node and track counts, transition stills and seek results before adopting; node savings could trade for more keys. No budget increase is justified yet. Relates to the recurring budget theme. |
| Separate the introductory tree’s simple white-disc geometry from traversal-state geometry | Its unused pending/visited/current circles | A smaller initial scene, freeing room for explanatory tokens | **Hypothesis.** Straight generator cleanup, not new instancing semantics. |
| Emit a small path traveller from the same scheduled edge endpoints | The static-only final backtracking illustration, replacing it with explicit direction | A→B→D→B→A travel during comparison; distinct visit and return cues | **Hypothesis.** Existing position tracks suffice. Related to Packet/Vectors/MotionScript→Motion path progress; no need for auto-orient on a circular marker. |
| Keep named beat times in host-side helpers and generate percent keys | Ad hoc numeric event coordination and full-duration percent arithmetic | Reliable retiming of the 2.5s divergence windows and denser leaf pauses | The host technique already works here; a reusable authoring API and a retiming experiment remain untested. Recurs in the seconds/named-time theme. |

### Language proposals

These require separate design and conformance work. None is necessary to express the correct two orders.

| Candidate | What it would remove here | What it could allow in a detailed version | Existing/pending relationship and caveats |
| --- | --- | --- | --- |
| Gated animated solid fill channels with explicit channel ownership | Three state-colour overlay circles on each of the 14 traversal nodes | Smooth pending→current→visited transitions while retaining one outlined disc | `paint.animatedSolidFill` is already drafted in pending; not enabled. Recurs in Moon, Packet, Vectors, Counter and MotionScript→Motion. Actual node/track savings are **untested**; palette scheduling must resolve return-vs-first-visit priority. Stroke animation is a separate contract. |
| Drawable, parameterised symbols | Repeated emitted tree/node templates | A reusable tree panel with labels, branch geometry and state parameters | Recurs in Packet, Vectors, Clockwork, Counter and MotionScript→Motion. This film used explicit groups and did not test existing composition/instance rendering. Do not infer drawable semantics from stored instances. Parameter scope, track ownership, expansion budgets and seeking need specification. Not a pending capability in the inspected drafts. |
| Time keys in seconds or named beat-relative times | Percent conversion in `track()` and opaque full-duration percentages in the generated program | Local edits to “visit B”, leaf dwell and final unwind without hand-coordinating percentages | Recurs in Packet, Vectors, Counter, MotionScript→Motion and Small Ideas. Host helpers are the first alternative; direct syntax is a **hypothesis**, not a demonstrated efficiency gain. Specify scope and deterministic resolution before adoption. |
| Optional metadata cues, separate from audio synthesis | Omitted machine-readable visit/return/completion cue times | A host could schedule soft clicks and tones against the animation clock | Audio/cues recur throughout the index. Not present in the inspected pending list. Cue seek/replay policy, host ownership and resource loading need a design decision; a cue marker alone would not implement audible playback. |

No general loops, recursive DFS functions or mutable queue execution are proposed as routine additions. Host TypeScript already expands this fixed seven-node example. New execution models require the design decision named in `AGENTS.md`, including termination, streaming, budgets, deterministic seeking and cancellation. This single plate offers no measured evidence to justify that complexity. Likewise, `text.animators` is pending but is not a claimed solution for changing a stack’s semantic contents; its contract would need inspection first.

## 4. Priority

**Fix now:** keep the successful real-renderer capture path reusable, retain independent rendered-state assertions, and repair the base check failures in separately scoped changes. Keep the current source/node budgets; this story is under them. No language release is needed for those actions.

**Experiment next:** reuse queue/stack tokens and animate their travel, remove unused intro colour layers, and add a directional return traveller. Compare against the exact current program hash and the same checkpoints and still times. Measure expanded nodes/tracks and actual builder/compile costs; do not assume shorter source means cheaper rendering.

**Defer:** promote animated fill only through its existing pending-capability process with conformance and visual evidence; investigate symbols, named times and metadata cues across independent stories. Defer recursive functions, loops and mutable traversal execution until an explicit execution-model decision. None of the untested alternatives is an adopted recommendation or a general generation-performance claim.
