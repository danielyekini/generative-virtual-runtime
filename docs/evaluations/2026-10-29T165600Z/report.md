# Correctness and measurement foundation — 29 October 2026

The targeted paint-order and compound-trim defects are fixed, repository checks are green, and a reproducible browser benchmark now measures complete compilation, sampled frame work, actual compiler/runtime queues and load/cancel/dispose observations. Measurements also exposed and repaired a wire-family validation defect in streaming. Resource defaults were revised under the operator's later instruction, with rejection evidence retained.

This is a targeted foundation run, **not a full Lottie corpus certification or an optimisation claim**. MotionScript and Scene IR remain released 0.5.0, wire 0.2. Changed packages are candidate 0.1.1 builds; none was published. See [manifest and source identities](manifest.json), [machine-readable summary](results.json), [metric definitions](telemetry.md), [full benchmark JSON](benchmark/results.json), and [prioritised follow-ups](follow-ups.md).

## Source, baseline and authority

Initial checkout: `97c9c2b2d0a1078230a2c7e5b5be0aa765b9de1d`, clean. Work is isolated on `fix/correctness-measurement-foundation`. The final executed production implementation is `5a4ea16a76d35aa328e29983943c4a056358b15e`; the [patch against the initial checkout](implementation.patch) contains its reproducible source changes. Later test-assertion/report metadata additions do not change executed production code. All benchmark/capture code was committed before those final runs; the only untracked path was this evidence directory.

Read authorities: root/package AGENTS instructions; releases.json and released 0.5.0 contracts with inherited 0.2 semantics; compatibility policy; affected registry rows; graph/path contracts and conformance; evaluation index/pin and visual policy 1.0. The prior implementation pin is an ancestor of the starting checkout. Its unresolved corpus findings and attempt history are retained. The frozen gate-settings copy is byte-identical to the initial commit; no tolerance changed.

The [supplied audit](sources/audit-context.md) is context, not an instruction source. Its observations were independently reproduced. Local Vectors, Pixels, Square Wave, City and Crane proposals/programs were inspected. ECHO Canyon is absent from this checkout, and audit commit `8067591` is not a local object; its [pinned proposal](sources/echo-canyon-proposal.md) was fetched read-only via GitHub (blob `860c225a573bc61520ad496b4fbe590646f30f4b`). It confirms the sorted-declaration workaround and three-node compositing lead. We did not install its later program into the current checkout.

Environment: Node v24.19.0, npm 11.9.0, Chromium 151.0.7922.173, Linux x64, AMD EPYC 9V74 (3 logical CPUs exposed), lottie-web 5.13.0, Vitest 2.1.9. [Initial dependencies](dependencies.json) and [final dependencies](dependencies-final.json) retain exact installed top-level versions. Final benchmark environment/options are in [environment.json](benchmark/environment.json) and results.json.

| Check | Existing baseline | Final |
| --- | --- | --- |
| `npm test` | 201 passed, 1 failed; duration-limit fixture | **215 passed, 29 files** |
| `npm run typecheck` | 12 builder errors | **PASS**, including new benchmark TypeScript project |
| `npm run build -w @gvr/playground` | PASS, large-bundle warning | **PASS**, same warning category |
| Targeted Lottie suite after final offset assertion | — | **46 passed** |
| Three-story benchmark, both instrumentation modes | No trustworthy shared baseline | **PASS**, including actual runtime replay equality |
| Full historical fidelity corpus | Existing incomplete/failing evidence | **NOT RUN**; not relabelled |

Logs: [baseline tests](baseline-test.log), [baseline typecheck](baseline-typecheck.log), [baseline build](baseline-build.log), [final tests](tests-final.log), [final typecheck](typecheck-final.log), [final build](build-final.log), [final offset assertions](offset-unit-final.log). The baseline build was replayed once from an isolated source extraction at the initial commit, using the unchanged installed external dependencies and local package links to that extraction. The current build still warns about its approximately 4.4 MB JS bundle; it has no build error. No unrelated blocker prevents the targeted checks.

## Verified causes and repairs

**Compositing ordering.** `drawableOrder` already sorted siblings by ascending zIndex then declaration position, respecting each subtree's slot. `renderTreeFromScene` instead filtered the original node array. Any compositing group made CanvasRenderer take that unsorted tree route. The repair uses the existing `childrenOf` helper for roots, ordinary groups and compositing scopes. It does not change transform parents, opacity/effect application, hierarchy containment, animated channels or scheduling.

The new renderer regression covers ordinary/nested scopes, deliberately reversed zIndex, declaration ties and a high-z child inside its parent's slot. It observes real CanvasRenderer calls, not only resolved items. Substituting the original frame builder reproduces the failure ([before log](order-before.log)); the current suite passes.

The browser minimum changes the top square from the incorrectly painted blue sibling to the intended red sibling: [before](captures/paint-order-0-before.png), [after](captures/paint-order-0-after.png). Exactly 10,000 pixels change in the 100×100 overlap. Both images use production CanvasRenderer.

**Compound trim.** The original sampler put all M/L/Q/C/Z positions in one list, accumulated distance across moves, then emitted only one M. It both counted pen-up distance and painted it. The repair samples/lengths each contour independently, intersects the existing aggregate trim window with each drawn-length interval, and emits a fresh M for each retained contour. Fully retained closed contours preserve Z/join semantics. Existing single open-contour sampling remains unchanged; no new trim mode or native wrapping rule was introduced.

`M0,0 L10,0 M20,0 L30,0` now remains two contours. The quarter-to-three-quarter window yields `M5,0 L10,0 M20,0 L25,0`, using 20 units of ink rather than 30 units including the jump. Regressions cover full/partial windows, exact contour boundaries, empty/reversed windows, positive/negative wrapped start offsets, clipping, closed contours and degenerate paths. [Before failure](trim-before.log). The enlarged browser minimum removes 2,400 pixels of connecting ink: [before](captures/compound-trim-0-before.png), [after](captures/compound-trim-0-after.png).

Native trim continues to wrap its shifted **start**, clip the end at one and return an empty reversed/equal window. Registry restrictions now state that explicitly rather than implying all source-format modes.

**Lottie mapping.** lottie-web's installed TrimModifier explicitly converts offset degrees by `/360`; the adapter used `/100`. Static and animated offset conversion now uses turns, with conformance assertions for both. The zero-offset single-straight-path probe passes the unchanged numeric/local/alpha gate at 0, 500, 1000 and 1999 ms on direct and emitted/compiled native routes. Native direct/compiled PNGs are identical. Reference motion is nonblank and same-time repeats are identical.

The derived `trim_reference.json` makes layer start/stretch defaults explicit (`st:0`, `sr:1` etc.) so lottie-web is an operative reference; the old skeletal conformance fixture is unchanged. Its original blank-reference attempt is not used as a pass. Original/derived source identity is recorded with the captures.

A 90° offset still reveals a wrapped-tail discrepancy: [reference](captures/lottie-offset-1000-reference.png), [native](captures/lottie-offset-1000-direct.png). Whole-frame hot fraction is 0.46875%, but a local tile is 100% wrong and the local gate correctly fails. Those variations, reversed endpoints and individual multi-shape mode are outside exact coverage; detected cases produce approximated diagnostics. The registry is narrowed to verified single open straight paths, simultaneous mode, zero offset, ordered endpoints. We did not change native source semantics to imitate a convenient Lottie mode or widen any visual threshold.

**Check baseline.** The rejected-duration fixture used 30,001 ms even though DEFAULT_LIMITS and its existing contract test specify 60,000 ms. It now tests 60,001 ms. Builder repairs fix tuple inference, redundant x properties equal to the positional argument, steps array annotation, optional shot easing and the already-used left alignment type. Existing story program bytes were not regenerated or overwritten.

**Streaming reader.** The measured Pixels replay compiled successfully but stayed at revision 2: ADD_NODES validated every node as wire 0.1 and rejected wire-0.2 cornerRadius fields. Later deltas became stale. The [minimal failure](wire-family-before.log), [rejection diagnostics](stream-rejections.json), and [passing repair](wire-family-after.log) are retained. The runtime now supplies the active wire family, including a CREATE_SCENE header still in the queue, to node validation. Standalone validation defaults to wire 0.1. Rejection/revision checks remain active. Benchmark success now requires no runtime rejection and exact offline/streamed draw-item equality at start/mid/end, so compiler success cannot hide failed replay.

Telemetry retains the first failure independently of its bounded recent-event ring, preventing a stale-delta cascade from erasing the initiating rejection. This fix does not certify the runtime's remaining structural-validation subset as complete assembled-scene validation.

## Resource policy changes and evidence

The operator explicitly superseded the initial “do not raise limits” constraint: prototype settings may change when they obstruct representative workloads, provided correctness, measurements, bounded failure and cancellation are retained.

- Decoded source is now bounded at **4 MiB**, accommodating the existing **1,934,979-byte Crane**. The previous compiler did not enforce its advertised 512 KiB ceiling. Complete and incremental compile now enforce the finite bound; imports share the default. Split UTF-16 surrogate fragments count as correct UTF-8 bytes. Large invalid fragments reject without argument-stack overflow.
- The original **128 KiB declaration ceiling rejected Square Wave streaming**, despite successful complete-file compile. The [retained failed run](pre-limit-adjustment/results.json) records that cause. The declaration ceiling is now **1 MiB of buffered UTF-8 token lexemes**; total source still bounds incomplete lexical fragments. Final Square Wave observed a 238,500-byte buffered lexeme high-water mark and replays correctly.
- The runtime queue remains **256 deltas**, with explicit overflow rejection and bounded diagnostic retention. Cancellation/disposal releases compiler lexer/session/buffers and runtime queues/scene; replaced Studio streaming owners are disposed. Duration remains 60 seconds. No node, geometry, depth, track or expression limit was raised without an obstructing workload.

Historical 512 KiB profiles/quarantines are immutable, not silently promoted by the new default. The profile check now asserts the frozen historical value separately from the current live default.

## Reproducible measurements

```sh
npm ci
npm run typecheck
npm test
npm run build -w @gvr/playground
npm run benchmark -- --out work/verified-benchmark --samples 120 --warmup 30 --compile-samples 3 --cycles 10
npm run benchmark -- --out work/verified-captures --correctness
```

Chromium discovery uses the existing GVR_CHROME/CHROME_PATH convention. Viewport is 1280×720, DPR 1. Each on/off run has one unmeasured compiler warmup, 3 compile samples, 30 animation warmup frames, 120 deterministic across-story frame samples, and 10 load/play/cancel/dispose cycles. RAF intervals are actual browser timestamps; source feeding is a separate synchronous simulation using 4096-code-unit chunks. Collector windows for compile, measured frames, streaming and lifecycle are separate. The frame collector resets after warmup.

All times below are milliseconds. Compile values use only 3 samples; their high percentiles therefore have little statistical resolution. Frame distributions use 120 observations; intervals use 119.

| Story | Source bytes | Compile p50 | Evaluate p50 | Renderer-call p50 | Application p50 / p95 / p99 | Interval p50 / p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| adding-two-vectors | 19873 | 60.10 | 1.90 | 0.40 | 2.40 / 2.90 / 4.10 | 16.70 / 16.70 |
| from-pixels-to-prediction | 107977 | 3781.50 | 38.10 | 1.80 | 40.00 / 45.70 / 46.90 | 50.00 / 66.70 |
| square-wave-from-sine-waves | 417381 | 1769.60 | 15.20 | 1.40 | 16.70 / 23.50 / 35.80 | 16.70 / 33.40 |

Source size is not frame complexity: Pixels costs much more to evaluate than the larger-source Square Wave. Pixels' measured compilation spends about 8.56 s validating and 2.73 s cloning across its three compile calls (11.47 s total). Square Wave spends about 3.14 s cloning and 2.42 s validating across three calls. These are measured phase totals, not an allocation/GC CPU profile. The single Crane correctness compile takes **49.78 s**, with **40.14 s cloning** and **8.94 s validation**. Raising admission limits does not resolve these bottlenecks; no general performance rewrite was attempted.

Actual streaming runtime queue high-water marks are 31 / 28 / 57 deltas for Vectors / Pixels / Square Wave. Accepted compiler units are 72 / 306 / 162; accepted runtime deltas are 73 / 308 / 163. All six final runs (on/off × three stories) have no runtime rejection diagnostics and match offline draw items at start/mid/end. The [pre-wire-repair run](pre-wire-repair/note.md) explicitly documents why its former compiler-only `streaming.ok` was not a successful replay.

### Overhead and retention

The [collector microbenchmark](benchmark/overhead.json) measures seven alternating 100,000-call batches: median enabled 39.1 ms, control 0.3 ms, approximately **0.388 µs extra per empty measured call** in this environment. Retention is structurally bounded: at most 64 names per metric map, capacity samples per distribution, capacity recent events and one first-failure event; default capacity is 256. Event payloads use diagnostic excerpts rather than scenes.

Paired application mean differences (on relative to off) are approximately −11.3% / −4.4% / +8.6% for Vectors / Pixels / Square Wave. Negative values are noise/order/GC effects, **not speedups**. The positive Square Wave observation is an overhead/variance limitation; this run does not establish a confidence bound or isolate that entire difference as collector CPU time. Instrumentation stays opt-in; it introduces no animation timer or scheduling decision.

Chromium JS heap samples are explicitly measured, while the canvas backing estimate is 3,686,400 bytes. GPU memory, weak-path retained entry count, actual display completion and offscreen allocations are unsupported/not measured. There is no offscreen allocator to instrument. Renderer-call durations are synchronous submissions, not GPU/display completion.

Across 10 lifecycle cycles, owned parser/lexer/deferred/pending queue gauges, runtime node/queue gauges and image-map gauges end at zero. The enclosing benchmark intentionally retains immutable source/scene; heap measurements are not forced-GC heap snapshots. Heap histories are sawtoothed and sometimes finish above their starting sample. They neither prove a leak nor prove leak freedom. Full histories and measured-vs-estimated labels are retained in JSON.

## Renderer coverage and support consequences

The [capture index](captures/captures.json) and [capture environment](captures/environment.json) record all hashes and paths. Vectors, Pixels, Square Wave, City and Crane are pixel-identical before/after at 0, 15,000 and 29,999 ms on the production renderer. This is 15 sampled comparisons, not full-window story verification; Crane's 35-second end is outside those samples. The minimal changed pixels have the intended material effect, independently inspected. Lottie reference motion/repeat controls pass; the zero-offset samples pass, while offset wrapping remains a correctly reported local failure. No whole capability is promoted on the strength of these stories.

README current-language/evaluation references, trim scopes, spatial/parent support summaries and measurement commands now agree with release/registry authorities. `render.tree` adds the ordering regression but its broader renderer support remains untested. Published language files, historical reports and original programs are preserved. No language/wire bump is required for restoring established sibling ordering/contour breaks or an importer degree conversion; package candidates are patched to 0.1.1. The new source/declaration bounds are explicitly provisional policy, not a permanent throughput guarantee.

There was no merge, deployment or package publication. The remaining work is prioritised in [follow-ups.md](follow-ups.md), separating measured/code-confirmed limitations from hypotheses. Full corpus fidelity, useful pre-completion streaming, broader trim modes, true isolation and worker/caching performance work remain separate exit gates.
