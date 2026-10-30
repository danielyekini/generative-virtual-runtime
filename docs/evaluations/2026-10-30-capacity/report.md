# Practical capacity and progressive playback — 30 October 2026

Compiler and frame evaluation improvements are implemented, the live node admission limit is 2,000, and *A Circle in Motion* plays useful motion while source continues arriving. The original story bytes are preserved. All 221 tests, typecheck and the playground build pass.

The three outcomes are independent: **faster offline compilation PASS; complete/incremental replay PASS; useful pre-completion motion PASS under the declared simulations**. No actual model-generation speed, persistent-object editing, broad language expansion or full historical Lottie certification is claimed.

## Starting point and implementation

Initial checkout was clean `80675916bc50ca6ec4f897ae9e718d24906151d2`, the supplied audit's revision. Read-only remote inspection located the missing foundation branch and merged main. This work branched from `775892ba3316077a59ea24d30eab16313b3b99b3` on `perf/practical-capacity-progressive-playback`; both the initial story checkout and foundation executed implementation `5a4ea16` are ancestors. The preceding handover is [foundation report](../2026-10-29T165600Z/report.md), [follow-ups](../2026-10-29T165600Z/follow-ups.md), final evidence/handover commit `d6d6375`, and its frozen source snapshot/measurement results. ECHO Canyon and other newer stories remain present; original fixtures have no diff from the chosen base.

**Exact measured implementation and harness: `94d6dd6a9c379b920d349b424a1f14379fca2586`, clean at every final browser measurement and Node differential.** Later evidence, verifier and documentation additions do not change production execution code. [Manifest](manifest.json) and [file hashes](SHA256SUMS.json) identify evidence. A source snapshot is unnecessary for this clean commit pin; the Git history retains the complete reproducible tree. Candidate schema/compiler/runtime packages are 0.1.2; MotionScript / Scene IR stay 0.5.0, wire 0.2. Published releases and historical evidence are untouched.

The uploaded audit is byte-identical to [the prior run's context copy](../2026-10-29T165600Z/sources/audit-context.md), SHA-256 `bb7aff112ad4a993ccb8084ea6509da5b86258445588ff183a0e3792cdc7b000`. It was treated as supporting evidence, not instructions; its three-tier streaming and broader feature recommendations did not replace this task's one-story scope. Applicable root/package AGENTS instructions, release pointers/contracts, compatibility policy, registry, graph/path/seal semantics, authoring guidance/storage rules and prior run evidence were read. The [decision record](../../design/capacity-transactions.md) documents requirements, alternatives, trade-offs, compatibility and revisit conditions for every structural/constraint change.

Foundation ordering/compound-trim repairs, green-check fixes, opt-in telemetry, finite source/unit bounds and active-wire streaming validation are present. Baseline checks ran once: **215/215 tests, typecheck and build PASS** ([logs](baseline/)). There was no existing check failure to conceal. No completed root-cause investigation was restarted. The existing bundle-size warning remains.

## Verified implementation causes

- **Compiler snapshots:** append-only lowering previously deep-cloned all accumulated node geometry and keyframes before every unit. Checkpoints now copy list containers and share accepted nested values. Constants, seal/frozen state and track/step/font counters roll back atomically, including failed nested batches. No lowering operation edits an accepted nested object in place. Tests freeze prior geometry and exercise rejected writers, batches and seals.
- **Validation throughput:** full validation remains on each candidate and finalisation. Previously each node-depth check rebuilt the same full node index; it now shares one lookup within that validation/list. Every node, parent/depth, geometry, reference, capability, writer and timing check still runs. No validation result/cache survives a revision. Indexed affected-structure validation and cross-call validation caches were considered and deferred because these smaller changes already remove the measured unnecessary work without weakening coverage.
- **Frame evaluation:** one sample-local ID lookup and sorted child buckets replace repeated per-drawable graph indexing. One containment traversal resolves visibility/screen ancestry/order; transform matrices are memoized for this sample and camera view is computed once. Opacity walks share the lookup, preserving the original multiplication order, isolated-ancestor exclusion and one-ancestor skip. Tree and flat routes share ordering. No sampled graph/value is retained across calls, so additions, revisions, cancellation, disposal and shuffled seeks cannot reuse stale entries.
- **Sealed history:** visibility steps before the seal now reject with source provenance, matching the existing track guard. A step exactly at the frontier remains allowed. This repairs a missing guard for the established seal meaning; it is not a new language construct.

The final choice is bounded: deep-clone payload cost and repeated indexes are removed, while complete-file calls remain synchronous and whole-scene validation remains a confirmed residual. An intermediate snapshot-only run was not used as a comparative result because it overlapped diagnostic work; final comparisons below ran sequentially with other performance jobs stopped. No noisy small difference is attributed to an optimisation.

## Browser comparison

Environment: v24.19.0, npm 11.9.0, Chromium 151.0.7922.173 built on Debian GNU/Linux 13 (trixie); Linux x64, AMD EPYC 9V74 80-Core Processor, 3 logical CPUs exposed. Same machine/source hashes, 1280×720, DPR1. Each on/off mode: one unmeasured compile warmup, **3 measured compiles**, **20 warmup frames + 60 measured deterministic across-story samples**, **3 lifecycle cycles**. The first three stories retain the same alternating mode order at baseline and final. Existing telemetry is opt-in, capacity 256; separate compile/frame/replay/lifecycle windows are retained. All phase values below use enabled instrumentation; off-mode wall/application results are retained as controls. Three compile samples provide little percentile resolution; frame percentiles describe 60 observations. Renderer call time measures synchronous Canvas submission, not GPU/display completion.

| Workload | Compile p50 before → after (ms) | Evaluation p50 before → after (ms) | Evaluation p95 before → after (ms) | Renderer p50 before → after (ms) |
| --- | ---: | ---: | ---: | ---: |
| Vectors (control) | 79.70 → 24.10 | 2.20 → 0.50 | 3.10 → 0.70 | 0.50 → 0.50 |
| Pixels | 3,612.50 → 299.90 | 39.30 → 1.70 | 44.10 → 2.50 | 1.90 → 1.60 |
| Square Wave | 1,798.90 → 272.10 | 14.70 → 1.40 | 19.00 → 1.70 | 1.30 → 1.10 |

Full distributions, means/maxima, RAF intervals, on/off results, sources, queues and memory observations: [baseline](baseline/results.json), [final](benchmark/results.json). Compile and frame gains are separate. Renderer work was not optimised; small differences are noise rather than a renderer speedup claim. Source size is not frame complexity: Pixels has 390 nodes/280 tracks; Square Wave has 249 nodes/62 tracks plus 67 steps despite much larger source.

Additional final-only browser medians:

| Workload | Compile p50 (ms) | Evaluation p50 / p95 (ms) | Renderer p50 (ms) |
| --- | ---: | ---: | ---: |
| Crane | 5,335.80 | 0.90 / 1.60 | 0.40 |
| Circle (original) | 28.90 | 0.30 / 0.50 | 0.20 |

## Repeated Node differential and causal phase evidence

The baseline compiler **and its original schema** are extracted read-only from Git with isolated module resolution, avoiding accidental use of the optimised validator in the old path. One unmeasured warmup precedes three instrumented compile calls per mode/story, executed sequentially. Node and browser results are not mixed. Baseline-first order can retain JIT/GC bias; the large measured clone/validation removal, repeated samples and unchanged payload checks support the cause without assigning significance to small timing changes.

| Story | Before compile samples (ms) | After compile samples (ms) | Before → after median (ms) |
| --- | ---: | ---: | ---: |
| Vectors (control) | 108.06 / 86.77 / 83.86 | 23.98 / 27.24 / 29.58 | 86.77 → 27.24 |
| Pixels | 4,875.04 / 4,543.57 / 5,179.68 | 433.39 / 411.46 / 354.65 | 4,875.04 → 411.46 |
| Square Wave | 1,903.45 / 1,857.66 / 1,985.13 | 283.04 / 296.44 / 279.32 | 1,903.45 → 283.04 |
| Crane | 52,059.36 / 53,461.07 / 52,924.69 | 6,115.05 / 5,719.27 / 6,601.85 | 52,924.69 → 6,115.05 |
| Circle (original) | 147.37 / 147.01 / 152.96 | 42.99 / 39.56 / 34.97 | 147.37 → 39.56 |

Average **phase totals per compile**, computed from lifetime means × counts, not recent retained-window percentiles:

| Story | Snapshot before → after (ms) | Validation before → after (ms) |
| --- | ---: | ---: |
| Vectors (control) | 32.03 → 0.09 | 51.74 → 20.21 |
| Pixels | 1,030.39 → 0.55 | 3,776.96 → 360.58 |
| Square Wave | 952.59 → 0.22 | 886.88 → 241.97 |
| Crane | 41,758.72 → 2.81 | 10,721.76 → 5,900.75 |
| Circle (original) | 85.35 → 0.12 | 53.32 → 30.58 |

All five compiled Scene IR payloads match the original path exactly; all **75** old/new resolved-frame samples match exactly, including actual end-time samples; separate frame-graph regressions cover shuffled seeks. Full details: [Node differential](differential/results.json). Crane's remaining approximately 5.9 seconds of validation per Node compile confirms the next compiler bottleneck: rescanning accumulated geometry/keyframe structures across units. Full validation coverage was retained deliberately.

## Useful progressive playback

Selected representative **medium choreography/geometry story**, *A Circle in Motion*: 49 nodes, compound path morphs, nested rotations, camera changes and 58 visibility steps across drop → ripple → clock → bicycle → sun → drop. It is inexpensive to evaluate; this is not presented as a node/track-heavy stress case. Pixels and Square Wave cover those other costs.

Original: **42,008 bytes**, 50 full-duration tracks, no seals. [Experimental variant](../../../samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/program.ms): **61,505 UTF-8 bytes**, 168 time-local tracks, same objects/geometry/choreography. Base declarations/operators occupy **7,206 bytes**. The first 2-second executable seal is at **17,982 bytes (29.2%)**. Later seals advance to 5/10/15/20/25/30 seconds. Partitioning only at original key boundaries preserves easing; crossing segments and initial hold writers arrive before their seal. No new objects are introduced after the first seal. The 46.4% source growth is an explicit bandwidth/startup trade-off, not a compression claim.

The old Studio feeder was inspected: fixed characters per UI tick, deliberate feed pause/dwell at the horizon. It remains a UI simulation. The new demo/benchmark uses an independent Worker, absolute UTF-8 byte deadlines, streaming decoding, and a producer acknowledgement queue bounded to 256 fragments / 64 KiB. Producer queue overflow visibly fails rather than silently lowering configured production rate. Compiler/runtime queues retain existing finite bounds and telemetry. No transport/model call or real generation-speed claim is made.

Declared schedules: **4,096 and 12,288 bytes/s**, fixed 512-byte fragments or repeating **17/2,048/127/509-byte** fragments, one run per combination. These are illustrative transport assumptions, not statistical latency estimates. All animation plays at real-time rate. Observed throughput includes Worker startup and scheduling/delivery overhead; compile and presentation work are measured separately. “Presentation” here is synchronous evaluate/render submission, not display latency.

| Rate / fragmentation | First visual ms / received bytes | First meaningful motion ms / received bytes | Arrival complete ms / observed bytes/s | Compile / presentation totals ms | Playback complete ms | Stalls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 4096 / fixed | 4,407.70 / 17982 | 4,491.10 / 17982 | 15,031.80 / 4,091.66 | 167.90 / 1,249.60 | 34,423.80 | 0 |
| 4096 / ragged | 4,401.70 / 17982 | 4,499.30 / 18109 | 15,025.00 / 4,093.51 | 135.70 / 1,136.50 | 34,414.70 | 0 |
| 12288 / fixed | 1,481.60 / 17982 | 1,581.60 / 19006 | 5,015.30 / 12,263.47 | 136.20 / 1,108.70 | 31,497.20 | 0 |
| 12288 / ragged | 1,483.20 / 18109 | 1,566.70 / 18635 | 5,016.30 / 12,261.03 | 117.90 / 1,115.50 | 31,499.00 | 0 |

“First visual” is the first renderer submission of the relevant drop/pond after the first useful seal, not a loading animation. “First meaningful motion” is the first submitted scene sample at least 100 ms into the falling/morphing drop; retained captures show its displaced pose. This is a conservative observed submission threshold, with up to one RAF of quantisation, not an exact perceptual onset or GPU/display measurement. Every normal run has motion while `sourceComplete:false`. The original unsealed source requires full arrival to advance authored time; successful completion-only replay is not counted as progressive usefulness.

[Complete streaming results](progressive/progressive.json) retain first seal and all subsequent horizon/buffered coverage, delivery lag, source arrival/completion, producer/compiler/runtime high-water marks and diagnostics. Main callback queues reached one fragment; actual producer in-flight high-water is separate (1–2 fragments, at most 2,048 bytes in these normal runs). Existing compiler buffered-token/lexeme high-water marks and runtime delta queue metrics are retained, not inferred from browser message callbacks. All normal sessions dispose their compiler/runtime scene ownership.

Failure scenarios at 12 KiB/s with 512-byte fragments:

| Scenario | Observed outcome |
| --- | --- |
| starvation | 4.5 s imposed arrival pause; 2,666.50 ms measured playback stall, then resume and full completion. |
| truncation | Input ends at 18022 bytes inside a declaration. Primary truncation plus missing-completion diagnostics; accepted 2 s seal retained and final status visibly TRUNCATED. Harness ends after reaching that frontier (its short measured stall is not a prolonged-hold duration). |
| rejection | A new base node injected exactly after the first seal is rejected with INVALID_TIMING and a source span. Accepted motion continues to the end; completed=true but overall ok=false preserves the error, rather than silently treating the input as valid. |
| cancellation | Stops the Worker and presentation at 615.70 ms scene time. Compiler/runtime scene ownership is absent after disposal; late callbacks are ignored. |

Verification is layered. [450 original-key/adjacent/intermediate samples](progressive/verification.json) have maximum absolute state error approximately **3.64e-12** against the original, exact completed-incremental frames and **zero changed channels at 16 CanvasRenderer samples**. [105 additional prefix checks](progressive/prefix-check.json) sample every sealed interval **before authoring completion**, including frontier holds, using one-byte, 127-byte and ragged UTF-8 fragmentation; maximum error is approximately **3.41e-12**, with no rejection. Captured material samples retain the drop, continuous rim, bicycle/spokes, sun/rays, captions and final return. This preserves the baseline film; it does not newly certify every original brief detail or optional sound.

Open/download [the self-contained demo HTML](demo/progressive-demo.html) locally, or use the source-backed Vite page described below. It has rate/fragment/scenario controls and visible starvation, rejection, truncation and cancellation states. The bundled page was browser-smoke-tested through useful pre-completion motion and an actual Cancel button click; [result](demo/demo-smoke.json), [screenshot](demo/demo-smoke.png). Renderer PNGs and terminal status screenshots are in [progressive/](progressive/).

## Capacity and constraints

The 500-node value was documented as a prototype admission setting; the exact historical numeric rationale is **unknown**. Its bounded validation/retained-state/render-work purpose still applies. The live default is now **2,000 total scene nodes, including composition definitions**, matching the existing adapters' 2,000-node profile. This is neither a per-frame scheduler budget nor a 60 Hz guarantee. Admission at 2,000 and rejection at 2,001 have direct tests. Other limits remain: 1,000 tracks, 10,000 geometry items, hierarchy depth 16, expression budgets, 4 MiB decoded source, 1 MiB buffered unit and 256 runtime deltas. Their exact historic prototype count rationales are unknown; finite-work purposes remain relevant. Frozen historical profiles/releases are unchanged.

Bounded browser scaling uses 20 warmup/60 measured samples, one dimension at a time. Every input passes full validation under explicit finite experimental overrides (up to 4,000 nodes / 2,000 tracks); default admission is recorded separately. Track cases hold 500 nodes fixed; morph cases use one path and two compatible morph keys. No production content is simplified.

| Axis / size | Default admitted | Evaluate p50 / p95 (ms) | Renderer p50 / p95 (ms) |
| --- | --- | ---: | ---: |
| nodes / 250 | yes | 0.40 / 0.60 | 1.00 / 2.70 |
| nodes / 500 | yes | 0.40 / 0.70 | 1.60 / 3.60 |
| nodes / 1000 | yes | 0.80 / 1.30 | 2.50 / 3.50 |
| nodes / 2000 | yes | 1.50 / 2.20 | 4.70 / 6.80 |
| nodes / 4000 | no; finite override experiment | 2.80 / 9.40 | 11.10 / 17.60 |
| tracks / 250 | yes | 1.10 / 1.50 | 1.30 / 2.00 |
| tracks / 500 | yes | 1.60 / 2.70 | 1.50 / 2.20 |
| tracks / 1000 | yes | 2.30 / 3.50 | 1.30 / 2.20 |
| tracks / 2000 | no; finite override experiment | 3.70 / 5.30 | 1.40 / 2.00 |
| morphCommands / 100 | yes | 0.10 / 0.30 | 0.10 / 0.30 |
| morphCommands / 1000 | yes | 0.20 / 0.30 | 0.20 / 0.30 |
| morphCommands / 5000 | yes | 0.40 / 0.70 | 0.30 / 0.50 |
| morphCommands / 10000 | yes | 0.70 / 1.90 | 0.40 / 1.00 |

At 4,000 primitive nodes, renderer submission reaches ~11 ms median / ~18 ms p95 and evaluation tails grow: **renderer work/tail latency is the next measured node-scaling constraint**, not a reason to make 4,000 the default. Track selection/sampling grows with track count; valid 2,000-track override cases do not justify raising the live 1,000-track bound without a production requirement. Morph sampling through 10,000 commands is measured, but this is not a throughput guarantee for arbitrary command topology, trim/paint or huge keyframe histories. Full [scaling data](scaling/scaling.json) retains diagnostics/admission distinctions. Early invalid synthetic inputs were rejected and corrected before the final validated experiment; no performance conclusion uses them.

## Verification and limits

| Check | Result |
| --- | --- |
| Baseline repository checks, once | 215 tests, typecheck, playground build PASS |
| Final tests | **221 tests / 31 files PASS**; transaction, seal, frame graph and admission regressions added |
| Final typecheck | PASS, including benchmark/differential TypeScript |
| Final playground build | PASS; existing large-bundle warning remains |
| Browser benchmark | Five stories × both instrumentation modes; all ten complete/incremental replays pass with no runtime rejection |
| Node differential | Five exact Scene IR payloads; 75 exact old/new frames; repeated compile distributions retained |
| Progressive source | 450 completed-state samples, 105 pre-completion prefix checks and 16 identical renderer samples PASS |
| Progressive scenarios | Four normal rate/pattern runs plus starvation/truncation/rejection/cancellation recorded |
| Representative renderer checks | Five original stories × three samples, all zero changed pixels; targeted ordering/trim regressions remain operative |
| Historical Lottie certification | NOT RUN; existing nonzero-offset trim/local-gate and other corpus limitations remain |

Logs: [tests](capacity-final-tests.log), [typecheck](capacity-final-typecheck.log), [build](capacity-final-build.log). [Renderer captures](captures/captures.json) retain source hashes and 0/15,000/29,999 ms comparisons; Crane's end is additionally covered numerically at its actual duration in the 75-sample differential, not falsely claimed as a browser end capture. Minimal Lottie probes remain illustrative: `ok` there means operative compile/capture, **not** full fidelity; the known offset local-gate discrepancy is not relabelled a pass. No tolerance was widened. Frozen [gate settings](gate-settings.json) are byte-identical to base/current settings.

Telemetry/heap lifecycle results remain bounded observations: parser/queues/loaded-node/image ownership end at zero, but no forced-GC retained-path study, GPU/display timing or offscreen memory measurement was added. Sample-local graphs introduce no cross-frame retention. No leak-freedom or target-device certification follows from unforced heap snapshots.

## Reproduce

From repository root at the measured implementation (or the PR head, whose subsequent changes are evidence/docs only):

```sh
npm ci
npm test
npm run typecheck
npm run build -w @gvr/playground
npm run benchmark -- --out work/capacity/benchmark --samples 60 --warmup 20 --compile-samples 3 --cycles 3 --stories adding-two-vectors,from-pixels-to-prediction,square-wave-from-sine-waves,a-crane-then-a-square,a-circle-in-motion
npm run benchmark -- --out work/capacity/scaling --scaling
npx tsx evaluation/bench/progressive/generate.mts
npm run benchmark -- --out work/capacity/progressive --progressive
npx tsx evaluation/bench/differential.mts --baseline 775892b --samples 3 --out work/capacity/differential
npm run benchmark -- --out work/capacity/captures --correctness --stories adding-two-vectors,from-pixels-to-prediction,square-wave-from-sine-waves,a-crane-then-a-square,a-circle-in-motion
npx tsx docs/evaluations/2026-10-30-capacity/scripts/prefix-check.mts work/capacity/prefix-check.json
```

Run performance jobs sequentially. Chromium discovery uses GVR_CHROME/CHROME_PATH; ports 5201/9341 must be free. The browser runner uses bounded CDP deadlines and cleans up its server/browser/profile. Baseline Node comparisons deliberately take several minutes because the original Crane compile runs four times. Re-running the generator must reproduce the retained program SHA; do not overwrite a historical canonical revision.

Visible source-backed demo: `npx vite --host 127.0.0.1 --port 5201`, then open `http://127.0.0.1:5201/evaluation/bench/progressive.html`. Portable HTML rebuild (existing locked esbuild dependency):

```sh
npx esbuild evaluation/bench/progressive/demo.ts --bundle --format=esm --platform=browser --loader:.ms=text --outfile=work/progressive-demo.js
```

Inline that bundle in `evaluation/bench/progressive.html` in place of its module `src` (escape literal closing-script sequences). The committed self-contained HTML already includes the exact measured source. Its smoke verifier expects a copy at `work/progressive-demo.html`; see [verifier](scripts/demo-smoke.mts).

## Remaining blockers and handover

**Confirmed limitations:** complete-file compile remains synchronous/cannot cancel inside a call; full validation still dominates Crane; base topology is frozen after the first seal; original unsealed films are completion-only; isolated delta validation is not complete assembled-scene validation. A retained [minimal reproduction](known-transform-parent-replay.json) also confirms that a non-root node’s transformParentId referring to a node from a previously accepted unit can be rejected by isolated ADD_NODES validation. The relevant runtime validation mechanism is unchanged from the foundation; the selected Circle units do not trigger it. This is distinct from the repaired active-wire-family defect. True group isolation/reference trim residuals, actual transport integration and historical corpus fidelity retain their prior scope/status.

**Hypotheses / unmeasured:** persistent revision-keyed indexes may save another O(N) sample pass, but measured results do not require their invalidation complexity yet. Target devices, complex resources/effects, long-lived heaps and real model/network throughput may expose different limits. No memory leak or universal frame budget is inferred. Audio, interaction, physics, 3D and persistent editing require explicit resource/dependency/channel-ownership/clock contracts; future in-place edits must replace immutable accepted values or extend the transaction mechanism rather than bypass seals.

**Next task:** first make assembled-scene delta acceptance atomic and context-aware, including the retained cross-unit transform-parent reproduction; preserve expected revisions, wire families, seals, rejection provenance, cancellation and finite queues. Then profile immutable geometry/keyframe validation on Crane and design reusable validation facts/affected-structure checks without removing coverage. Current improvements are already delivered; these are remaining work, not prerequisites hidden behind an audit.

**Handover:** production/harness `94d6dd6a9c379b920d349b424a1f14379fca2586`; baseline `775892ba3316077a59ea24d30eab16313b3b99b3`; [machine summary](results.json); [raw browser](benchmark/results.json), [Node](differential/results.json), [progressive](progressive/progressive.json), [prefix correctness](progressive/prefix-check.json), [renderer](progressive/verification.json), [capacity](scaling/scaling.json); [story source](../../../samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/program.ms); [decision](../../design/capacity-transactions.md); [runnable portable demo](demo/progressive-demo.html). No merge, deployment or package publication was performed.
