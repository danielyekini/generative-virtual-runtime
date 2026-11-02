import { createIncrementalProgram } from "@gvr/compiler";
import { PlaybackClock, StreamingRuntime, observeStreamingExecution } from "@gvr/runtime";
import type { SourceSpan } from "@gvr/schema";
import { locateDiagnostics } from "../library";

export type SourceState = "arrived" | "queued" | "resolved" | "rejected";
interface UnitState { span: SourceSpan; state: SourceState; horizon: number; }

/** Product adapter over E018; declaration spans are highlighted, never equated
 * with frames. A unit resolves only after application and an actual evaluation
 * at its next accepted seal horizon. Definitions share that seal boundary. History survives the engine's bounded recent-unit ring for this run.
 */
export class StreamSession {
  readonly program = createIncrementalProgram();
  readonly runtime = new StreamingRuntime();
  readonly clock = new PlaybackClock();
  readonly units = new Map<number, UnitState>();
  cursor = 0;
  done = false;
  paused = false;
  stallUntil = 0;
  waitingMs = 0;
  private version = 0;
  private segmentVersion = -1;
  private cachedSegments: { text: string; state: SourceState; message?: string }[] = [];
  constructor(readonly source: string) { this.clock.play(); }
  get observation() { return observeStreamingExecution({ program: this.program, runtime: this.runtime, clock: this.clock, recentLimit: 256 }); }
  get diagnostics() { return locateDiagnostics([...this.program.diagnostics, ...this.runtime.rejectedDiagnostics], this.source); }
  push(text: string): void {
    if (this.done || this.program.disposed) return;
    this.cursor += text.length;
    this.version++;
    this.program.push(text);
    this.publish();
  }
  finish(): void { this.program.finish(); this.publish(); this.done = true; this.version++; }
  private publish(): void {
    for (const delta of this.program.drainDeltas()) {
      this.runtime.enqueue(delta);
      const accepted = this.runtime.queuedDeltas.some((d) => d.unitId === delta.unitId);
      this.units.set(delta.unitId, { span: delta.sourceSpan, state: accepted ? "queued" : "rejected", horizon: Infinity });
      if (accepted) for (const op of delta.operations) if (op.op === "SEAL_TIMELINE") {
        for (const unit of this.units.values()) if (unit.horizon === Infinity && unit.state !== "rejected") unit.horizon = op.horizonMs;
      }
    }
    this.runtime.flushCommands();
    if (this.runtime.authoringComplete) for (const unit of this.units.values()) {
      if (unit.horizon === Infinity && unit.state !== "rejected") unit.horizon = this.runtime.sealedThroughMs;
    }
    this.clock.setHorizon(this.runtime.sealedThroughMs, this.runtime.scene?.timeline.durationMs ?? 0, this.runtime.authoringComplete);
  }
  evaluate() {
    if (!this.runtime.scene) return null;
    const frame = this.runtime.evaluate(this.clock.timeMs);
    if (frame) for (const unit of this.units.values()) {
      if (unit.state !== "rejected") {
        const state = this.clock.timeMs >= unit.horizon ? "resolved" : "queued";
        if (state !== unit.state) { unit.state = state; this.version++; }
      }
    }
    return frame;
  }
  /** Partition only arrived text at exact unit/diagnostic boundaries. Multiple
   * states on one line remain separate; parse errors need no fictional unit. */
  segments(): { text: string; state: SourceState; message?: string }[] {
    if (this.segmentVersion === this.version) return this.cachedSegments;
    this.segmentVersion = this.version;
    const ranges = [...this.units.values()].map((u) => ({ start: u.span.start.offset, end: u.span.end.offset + 1, state: u.state, message: undefined as string | undefined }));
    for (const d of this.diagnostics) if ((d.severity === "error" || d.severity === "fatal") && d.start !== undefined) {
      ranges.push({ start: d.start, end: Math.max(d.start + 1, d.end === undefined ? d.start + 1 : d.end + 1), state: "rejected", message: `${d.code}: ${d.message}` });
    }
    // Sweep interval boundaries; avoid source-length × unit-count work each frame.
    const events = ranges.flatMap((r, index) => [
      { at: Math.max(0, Math.min(this.cursor, r.start)), index, start: true },
      { at: Math.max(0, Math.min(this.cursor, r.end)), index, start: false },
    ]).sort((a, b) => a.at - b.at || Number(a.start) - Number(b.start));
    const active = new Set<number>();
    const segments: typeof this.cachedSegments = [];
    let cursor = 0;
    const emit = (end: number) => {
      if (end <= cursor) return;
      const hits = [...active].map(i => ranges[i]!);
      const hit = hits.find(r => r.state === "rejected") ?? hits.at(-1);
      segments.push({ text: this.source.slice(cursor, end), state: hit?.state ?? "arrived", message: hit?.message });
      cursor = end;
    };
    for (const event of events) {
      emit(event.at);
      if (event.start) active.add(event.index); else active.delete(event.index);
    }
    emit(this.cursor);
    this.cachedSegments = segments;
    return segments;
  }

  dispose(): void { this.program.dispose(); this.runtime.dispose(); this.clock.stop(); }
}
