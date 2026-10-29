/** Opt-in, bounded diagnostic measurements. Durations use a monotonic clock.
 * Distribution quantiles describe the most recent capacity observations; count,
 * sum and max describe the entire collector lifetime. No scheduling or logging.
 */
export class Telemetry {
  private readonly distributions = new Map<string, { count: number; sum: number; max: number; values: number[]; next: number }>();
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, { value: number; highWater: number }>();
  private firstFailure?: { kind: string; detail: unknown };
  private readonly events: { kind: string; detail: unknown }[] = [];
  constructor(readonly capacity = 256, private readonly clock: () => number = () => performance.now()) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 65536) throw new Error('Invalid telemetry capacity');
  }
  /** Starts a new observation window without replacing instrumented owners. */
  reset(): void {
    this.distributions.clear(); this.counters.clear(); this.gauges.clear();
    this.events.length = 0; this.firstFailure = undefined;
  }
  now(): number { return this.clock(); }
  measure<T>(name: string, work: () => T): T {
    const start = this.now();
    try { return work(); } finally { this.observe(name, this.now() - start); }
  }
  observe(name: string, value: number): void {
    if (!Number.isFinite(value)) return;
    let metric = this.distributions.get(name);
    if (!metric) {
      if (this.distributions.size >= 64) return;
      metric = {count: 0, sum: 0, max: -Infinity, values: [], next: 0};
      this.distributions.set(name, metric);
    }
    metric.count++; metric.sum += value; metric.max = Math.max(metric.max, value);
    metric.values[metric.next] = value; metric.next = (metric.next + 1) % this.capacity;
  }
  count(name: string, amount = 1): void {
    if (this.counters.has(name) || this.counters.size < 64) this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
  }
  gauge(name: string, value: number): void {
    if (!Number.isFinite(value)) return;
    if (this.gauges.has(name) || this.gauges.size < 64) this.gauges.set(name, { value, highWater: Math.max(value, this.gauges.get(name)?.highWater ?? value) });
  }
  event(kind: string, detail: unknown): void {
    if (!this.firstFailure && /reject|stale/.test(kind)) this.firstFailure = {kind, detail};
    if (this.events.length === this.capacity) this.events.shift();
    this.events.push({kind, detail});
  }
  snapshot() {
    return {
      capacity: this.capacity,
      distributions: Object.fromEntries([...this.distributions].map(([name, metric]) => {
        const sorted = [...metric.values].sort((a,b) => a-b);
        const quantile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1];
        return [name, {count: metric.count, retained: sorted.length, mean: metric.sum / metric.count, max: metric.max, p50: quantile(.5), p95: quantile(.95), p99: quantile(.99)}];
      })),
      counters: Object.fromEntries(this.counters), gauges: Object.fromEntries(this.gauges), events: [...this.events], firstFailure: this.firstFailure,
    };
  }
}

/** Measures host application work, including evaluation and synchronous rendering. */
export class FrameTelemetry {
  private previous?: number;
  constructor(private readonly telemetry: Telemetry, readonly budgetMs = 1000 / 60) {}
  frame<T>(timestampMs: number, work: () => T): T {
    if (this.previous !== undefined) {
      const interval = timestampMs - this.previous;
      this.telemetry.observe('frame.interval_ms', interval);
      if (interval > this.budgetMs * 1.5) this.telemetry.count('frame.missed_intervals');
      if (interval > 50) this.telemetry.count('frame.long_intervals');
    }
    this.previous = timestampMs;
    return this.telemetry.measure('frame.application_ms', work);
  }
}
