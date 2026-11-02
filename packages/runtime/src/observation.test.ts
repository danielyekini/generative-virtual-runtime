import { describe, expect, it } from "vitest";
import { createIncrementalProgram, fragmentSource } from "@gvr/compiler";
import { observeStreamingExecution } from "./observation";
import { PlaybackClock } from "./playback";
import { StreamingRuntime } from "./streaming";

const program = `scene "observe" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 2s;
};
rectangle box { position (0, 0); size (10, 10); fill #ff0000; };
animate box.position.x { from 0; to 40; duration 1s; };
seal 1s;
complete;
`;

describe("streaming execution observation", () => {
  it("reports received bytes, unit spans, queued then applied revisions, seal and wait", () => {
    const source = createIncrementalProgram();
    const runtime = new StreamingRuntime();
    const clock = new PlaybackClock();
    const chunks = fragmentSource(program, "packets");

    for (const chunk of chunks.slice(0, 3)) source.push(chunk);
    expect(source.receivedBytes).toBeGreaterThan(0);
    expect(observeStreamingExecution({ program: source }).receivedBytes).toBe(source.receivedBytes);

    for (const chunk of chunks.slice(3)) source.push(chunk);
    const pending = source.peekPendingDeltas();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((delta) => delta.sourceSpan?.start && delta.sourceSpan?.end)).toBe(true);

    const beforeFlush = observeStreamingExecution({ program: source, runtime, clock });
    expect(beforeFlush.pendingCompileDeltas).toBe(pending.length);
    expect(beforeFlush.parsedUnits).toBeGreaterThan(0);

    for (const delta of source.drainDeltas()) runtime.enqueue(delta);
    const queued = observeStreamingExecution({ program: source, runtime, clock });
    expect(queued.pendingCompileDeltas).toBe(0);
    expect(queued.queuedRuntimeDeltas).toBeGreaterThan(0);
    expect(queued.recentUnits.some((unit) => unit.outcome === "queued" && unit.sourceSpan)).toBe(true);

    runtime.flushCommands();
    clock.setHorizon(runtime.sealedThroughMs, runtime.scene!.timeline.durationMs, runtime.authoringComplete);
    clock.play();
    clock.tick(2500);
    const waiting = observeStreamingExecution({ program: source, runtime, clock });
    expect(waiting.appliedRevision).toBe(runtime.revision);
    expect(waiting.sealedThroughMs).toBe(2000);
    expect(waiting.authoringComplete).toBe(true);
    expect(waiting.waitingForContent).toBe(false);
    expect(waiting.recentUnits.some((unit) => unit.outcome === "applied" && unit.sourceSpan)).toBe(true);
    expect(waiting.playbackState).toBe("complete");
  });

  it("exposes wait-for-content, rejection spans and cancel without inventing line/frame maps", () => {
    const prefix = program.slice(0, program.indexOf("complete;"));
    const source = createIncrementalProgram();
    const runtime = new StreamingRuntime();
    const clock = new PlaybackClock();
    source.push(prefix);
    for (const delta of source.drainDeltas()) runtime.enqueue(delta);
    runtime.flushCommands();
    clock.setHorizon(runtime.sealedThroughMs, runtime.scene!.timeline.durationMs, false);
    clock.play();
    clock.tick(2000);
    const waiting = observeStreamingExecution({ program: source, runtime, clock });
    expect(waiting.waitingForContent).toBe(true);
    expect(waiting.playheadMs).toBe(1000);
    expect(waiting.sealedThroughMs).toBe(1000);
    expect(waiting.authoringComplete).toBe(false);

    const bad = source.peekPendingDeltas()[0] ?? runtime.appliedUnits[0];
    expect(bad).toBeTruthy();
    runtime.enqueue({
      generationId: "stale",
      unitId: 99,
      expectedRevision: 999,
      nextRevision: 1000,
      operations: [{ op: "COMPLETE_PROGRAM" }],
      sourceSpan: bad!.sourceSpan,
    });
    // malformed nextRevision to force validation rejection with span attribution
    runtime.enqueue({
      generationId: "bad",
      unitId: 100,
      expectedRevision: runtime.revision,
      nextRevision: runtime.revision + 1,
      operations: [],
      sourceSpan: bad!.sourceSpan,
    });
    const rejected = observeStreamingExecution({ program: source, runtime, clock });
    expect(rejected.rejectedDiagnostics.length).toBeGreaterThan(0);
    expect(rejected.recentUnits.some((unit) => unit.outcome === "rejected" && unit.sourceSpan)).toBe(true);

    source.dispose();
    runtime.dispose();
    const cancelled = observeStreamingExecution({ program: source, runtime, clock });
    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.queuedRuntimeDeltas).toBe(0);
    expect(cancelled.recentUnits.every((unit) => unit.outcome !== "queued")).toBe(true);
  });
});
