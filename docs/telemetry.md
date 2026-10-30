# Correctness and measurement foundation

`Telemetry` and `FrameTelemetry` are shared, opt-in exports from `@gvr/schema`. Pass a collector to `compileMotionScript(source, collector)`, `createIncrementalProgram(collector)`, `new AnimationRuntime(scene, collector)`, `new StreamingRuntime(collector)` and `new CanvasRenderer(canvas, collector)`. Omit it for normal operation. `compileProgram` / `openSession` also accept a collector but have no source bytes to measure.

Studio: start `npm run dev:renderer`, open `http://localhost:5173/?telemetry=1#studio`, and obtain a JSON-compatible snapshot with `window.__gvrTelemetry()`. The active Studio workspace instruments compilation, evaluation, rendering and its existing incremental/runtime queues. Stage shares renderer/application measurements; its presentation controller's internal evaluation is not separately instrumented. Legacy standalone development pages are not wired automatically. Nothing logs per frame or adds an animation timer.

## Repeatable browser measurements

From repository root, after `npm ci` and installing Chromium (or setting `GVR_CHROME`):

```sh
npm run benchmark -- --out work/benchmark --samples 120 --warmup 30 --compile-samples 3 --cycles 10
npm run benchmark -- --out work/captures --correctness
```

Defaults benchmark Adding Two Vectors (small), From Pixels to Prediction (medium) and Square Wave (large source). `--stories` takes comma-separated story file stems. Size labels describe source bytes, not an assertion about frame cost. Correctness mode defaults to those three plus City and Crane. `--correctness --lottie-only` runs the minimal defects and Lottie reference probes. Port 5201 serves the local Vite harness; port 9341 is a disposable Chromium DevTools session. Ports must be available. The runner cleans up its own browser/profile/server, uses bounded CDP deadlines, records partial results and exits nonzero on failed compilation. Captures and results are written only to the selected directory. No production deployment or model/network call occurs.

Each enabled/disabled pair uses the same viewport (1280×720), DPR 1, source hash, compile sample count, one unmeasured compiler warmup, animation warmup count, sample count and lifecycle count. Pair order alternates by story. RAF timestamps measure browser intervals; scene times are deterministic, evenly spaced seeks across the full story, rather than a claim about real-time completion. Off mode still has benchmark wall-clock observations, so its cost is not a zero-instrumentation oracle. `overhead.json` separately compares seven alternating batches of 100,000 empty instrumented/control calls. Paired story results are noisy estimates, not an optimisation claim or statistical confidence interval.

Benchmark compile, sampled frame, streaming replay and lifecycle collectors are separate; frame observations reset after warmup. The JSON records Node/npm/browser/CPU/platform, dependency versions via the run manifest, commit/tree state, source SHA-256 and bytes, options, counts, distributions, queue observations, heap observations, unsupported fields and PNGs. Retain its tested source identity alongside it. Benchmark execution is not a visual fidelity certification.

## Metric names and units

| Metric | Definition |
| --- | --- |
| `compile.source_bytes` | Lifetime UTF-8 source bytes submitted, including rejected input; split surrogate pairs are accounted for by the incremental feeder. |
| `compile.total_ms` | Complete-file synchronous compile call, including byte accounting, lex/parse, lowering and finalisation. |
| `compile.lex_parse_ms` | Combined lexer/parser in complete-file mode; it is not a separate lexer measurement. |
| `compile.lex_ms`, `compile.parse_ms` | Incremental lexer push and leading-unit parser call durations. |
| `compile.lower_ms`, `compile.validate_ms` | Unit lowering and current-scene validation, including final validation. Prior-snapshot validation on a rejection is outside this phase counter. |
| `compile.snapshot_ms`, `compile.capture_ms`, `compile.rollback_ms` | Scene clone, delta-change capture/serialisation, and restoration durations. Nested batch measurements can overlap; phase sums are not a total. |
| `compile.units_seen`, `compile.accepted_units`, `compile.rejected_units` | Submitted top-level units and terminal application decisions; batch children are not separately accepted, unresolved final units count as rejected. A deferred unit has no terminal decision until resolved/finalised. Headers/complete markers are not units. |
| `compile.unresolved_units`, `compile.rejected_sources` | Deferred units remaining at finalisation; source-budget rejections. Missing/rejected headers have diagnostics but no accepted/rejected unit count. |
| `compile.pending_deltas`, `compile.deferred_units` | Existing compiler queue lengths, observed at emission/drain and defer/retry/finalisation. |
| `compile.buffered_tokens`, `compile.buffered_lexeme_bytes` | Parser token queue depth and UTF-8 bytes of token lexemes, excluding whitespace/comments and the lexer's incomplete fragment. |
| `compile.lexer_pending_bytes`, `compile.lexer_retained_tokens` | Pending lexical fragment bytes; emitted tokens still retained by the current lexer. The latter is a real retention issue, not parser queue depth. |
| `frame.evaluate_ms` | Synchronous sampling plus resolved-frame construction, excluding renderer work. |
| `frame.renderer_call_ms` | Synchronous CanvasRenderer call, including Canvas API submission. It does not measure GPU work, presentation, display latency or completion. |
| `frame.application_ms` | Host work inside `FrameTelemetry.frame(timestamp, work)`. Studio includes tick, draw and bridge publication; benchmark includes evaluation and rendering. |
| `frame.interval_ms` | Consecutive RAF timestamps supplied by the host. No synthetic zero for the first frame. |
| `frame.missed_intervals`, `frame.long_intervals` | Interval >1.5× the configured frame budget (default 60 Hz), and interval >50 ms. These count affected intervals, not exact dropped display frames. |
| `runtime.queue_deltas`, `runtime.retained_nodes` | Actual validated queued commands and loaded node counts, observed after enqueue/flush/disposal. |
| `runtime.accepted_deltas`, `runtime.rejected_deltas`, `runtime.stale_deltas` | Enqueued valid deltas, invalid/overflow rejections, and revision mismatches. Enqueue acceptance does not strengthen scene semantic validation. |
| `runtime.queue_wait_ms` | Monotonic time from valid enqueue to flush. Empty queues have no latency observation. |
| `runtime.horizon_wait_evaluations` | Evaluation requests beyond the unsealed horizon. Wall-clock starvation duration is not measured. |
| `renderer.image_cache_entries` | Actual image-map entries after insertion/disposal. Weak Path2D retention is not enumerable and not measured. |
| `compile.wall_ms`, `frame.wall_ms` | Independent benchmark compile/application-call timing, present for enabled and disabled runs. |

Counters are lifetime totals; gauges contain current observed value and lifetime high-water mark. Unobserved counters/gauges are absent, not proof of zero. An unavailable stage or resource is explicitly `unsupported`/`not-measured` in benchmark results. Existing compiler diagnostics remain authoritative. Bounded telemetry events identify rejected units/deltas and stale expected/required revisions. `firstFailure` retains the first rejection/stale event even if later cascades overwrite the event ring. `reset()` explicitly starts a new observation window. `StreamingRuntime.rejectedDiagnostics` exposes the latest 256 validation/overflow diagnostics even without telemetry. Invalid/stale work is never made valid by observation. Delta node validation uses the active wire family, including queued CREATE_SCENE headers; the default standalone validator remains wire 0.1 unless a context is supplied. Benchmark replay success additionally requires no runtime rejection and equality with offline draw items at start/mid/end.

## Retention, overhead and resources

A collector retains at most 64 distribution names, 64 counter names, 64 gauge names, and `capacity` events (default 256; accepted range 1–65,536). Each distribution is a ring of at most `capacity` samples, with lifetime count/sum/max. Mean/max describe the collector lifetime; p50/p95/p99 use nearest-rank quantiles of the latest retained observations. Names beyond each map bound are ignored. Library event payloads contain bounded diagnostic excerpts; callers should not put scenes/assets in events. Observers never reschedule work, advance clocks, accept deltas, or change animation channels. Timing itself and allocations still have cost; measure them for the target environment.

Chromium's optional `performance.memory` fields are measured JS heap bytes (browser-specific, influenced by GC), not total browser/RSS/GPU memory. Canvas backing storage is an estimate of width×height×4, not a heap reading. CanvasRenderer currently has no offscreen-surface allocator, so offscreen allocations are unsupported rather than reported as zero. True group isolation and GPU/display completion are not inferred from synchronous timings.

A lifecycle series loads a scene runtime, plays five frames and disposes the renderer, while separately loading/cancelling a simulated incremental prefix and disposing its compiler/runtime. The immutable source/scene stays intentionally referenced by the enclosing benchmark. No forced GC is used. Heap samples alone cannot prove a leak or prove absence of retention. Image maps and weak-path-map ownership are released by renderer disposal; compiler disposal drops lexer/session/buffers; runtime disposal clears queues/scene. Studio cancellation disposes the replaced streaming owners. The complete-file compiler remains synchronous and cannot be interrupted mid-call; incremental cancellation takes effect between pushes.

Source defaults are now 4 MiB, a provisional finite bound accommodating the 1.93 MB Crane story. Whole-file and incremental compilation enforce it, and imports share that default. Buffered parser declarations have a 1 MiB UTF-8 lexeme ceiling (excluding whitespace/comments); the 128 KiB prototype ceiling rejected the existing Square Wave streaming workload. Lexically incomplete fragments are still bounded by the 4 MiB total source ceiling. Runtime command queue depth remains 256 with explicit overflow rejection. Duration stays 60 seconds. No scene/node/geometry/expression ceiling was raised without an obstructing workload. Historical 512 KiB fidelity profiles, quarantines and published version files are unchanged; new policy does not retroactively pass them.

## Practical capacity and progressive playback

The [capacity decision](design/capacity-transactions.md) explains shallow compiler transactions, call-local validation indexes, sample-local frame graphs and the 2,000-node admission default. `compile.snapshot_ms` now measures container checkpoints rather than deep payload cloning. It still excludes validation.

```sh
npx tsx evaluation/bench/progressive/generate.mts
npm run benchmark -- --out work/progressive --progressive
npm run benchmark -- --out work/scaling --scaling
```

The progressive suite uses *A Circle in Motion*, 4 / 12 KiB/s simulated UTF-8 arrival and fixed/ragged byte fragmentation; it also runs forced starvation, truncation, rejection and cancellation. Its Worker arrival schedule is independent of RAF and bounded separately from compiler/runtime queues. Observed arrival, delivery lag, compile work, synchronous presentation, first visual/motion, seals and stall durations are reported separately. No model-generation claim follows from these rates. The original film is preserved; state/render comparisons include original key boundaries and intermediate samples.

For a visible local demo, run `npm run benchmark -- --out work/demo --progressive` for evidence, or start `npx vite --host 127.0.0.1 --port 5201` from the repository root and open `http://127.0.0.1:5201/evaluation/bench/progressive.html`. The root dev server resolves workspace packages directly. Controls select arrival rate, fragmentation and failure scenario; Cancel releases the active stream.
