import { compileMotionScript, createIncrementalProgram, lintStreamingAuthorship } from "@gvr/compiler";
import { PlaybackClock, StreamingRuntime } from "@gvr/runtime";
import { stripModelFences } from "./text.js";
import type { GenerationMetrics, MotionScriptGenerator } from "./types.js";

export type PipelineOptions = {
  taskId: string;
  prompt: string;
  generator: MotionScriptGenerator;
  system?: string;
  signal?: AbortSignal;
  cancelAfterMs?: number;
  sessionId?: string;
  referenceFingerprint?: string | null;
  referencePath?: string | null;
  maxRepairs?: number;
};

export type PipelineResult = {
  source: string;
  metrics: GenerationMetrics;
  disposed: boolean;
};

const activeSessions = new Map<string, { disposed: boolean }>();

export function disposeGenerationSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) session.disposed = true;
}

function replayThroughRuntime(source: string): {
  firstSealHorizonMs: number | null;
  firstSealBytes: number | null;
  runtimeRejectCount: number;
} {
  const program = createIncrementalProgram();
  const runtime = new StreamingRuntime();
  const clock = new PlaybackClock();
  clock.play();
  let firstSealHorizonMs: number | null = null;
  let firstSealBytes: number | null = null;
  const chunk = 48;
  for (let i = 0; i < source.length; i += chunk) {
    program.push(source.slice(i, i + chunk));
    for (const delta of program.drainDeltas()) runtime.enqueue(delta);
    runtime.flushCommands();
    clock.setHorizon(runtime.sealedThroughMs, runtime.scene?.timeline.durationMs ?? 0, runtime.authoringComplete);
    if (firstSealHorizonMs === null && runtime.sealedThroughMs > 0) {
      firstSealHorizonMs = runtime.sealedThroughMs;
      firstSealBytes = new TextEncoder().encode(source.slice(0, i + chunk)).byteLength;
    }
  }
  program.finish();
  for (const delta of program.drainDeltas()) runtime.enqueue(delta);
  runtime.flushCommands();
  if (runtime.scene) {
    try {
      runtime.evaluate(Math.min(clock.timeMs, runtime.sealedThroughMs || 0));
    } catch {
      // keep reject diagnostics
    }
  }
  const runtimeRejectCount = runtime.rejectedDiagnostics.length;
  if (firstSealHorizonMs === null && runtime.sealedThroughMs > 0) {
    firstSealHorizonMs = runtime.sealedThroughMs;
    firstSealBytes = new TextEncoder().encode(source).byteLength;
  }
  program.dispose();
  runtime.dispose();
  clock.stop();
  return { firstSealHorizonMs, firstSealBytes, runtimeRejectCount };
}

export async function runGenerationPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const sessionId = options.sessionId ?? `session-${Date.now()}`;
  const sessionState = { disposed: false };
  activeSessions.set(sessionId, sessionState);
  const notes: string[] = [];
  const started = performance.now();
  const maxRepairs = options.maxRepairs ?? 2;

  let prompt = options.prompt;
  let source = "";
  let ttfbMs: number | null = null;
  let firstSealMs: number | null = null;
  let firstSealHorizonMs: number | null = null;
  let firstSealBytes: number | null = null;
  let cancelled = false;
  let staleIgnored = false;
  let repairAttempts = 0;
  let offlineOk = false;
  let progressiveOk = false;
  let compileErrorCount = 0;
  let runtimeRejectCount = 0;

  const localController = new AbortController();
  const parent = options.signal;
  const onParentAbort = () => localController.abort();
  parent?.addEventListener("abort", onParentAbort, { once: true });
  let cancelTimer: ReturnType<typeof setTimeout> | undefined;
  if (options.cancelAfterMs !== undefined) {
    cancelTimer = setTimeout(() => localController.abort(), options.cancelAfterMs);
  }

  try {
    for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
      if (attempt > 0) repairAttempts += 1;
      let raw = "";

      try {
        await options.generator.stream(prompt, {
          signal: localController.signal,
          system: options.system,
          onChunk: (chunk) => {
            if (sessionState.disposed) {
              staleIgnored = true;
              return;
            }
            if (chunk.text) {
              if (ttfbMs === null) ttfbMs = performance.now() - started;
              raw += chunk.text;
            }
          },
        });
      } catch (error) {
        cancelled = (error as { name?: string }).name === "AbortError" || localController.signal.aborted;
        if (!cancelled) throw error;
        notes.push("generation aborted");
      }

      source = stripModelFences(raw);
      const cleaned = compileMotionScript(source);
      const lint = source.trim()
        ? lintStreamingAuthorship(source)
        : { offlineOk: false, progressiveOk: false, findings: [], compileDiagnostics: cleaned.diagnostics };
      compileErrorCount = cleaned.diagnostics.filter((d) => d.severity === "error" || d.severity === "fatal").length;
      offlineOk = Boolean(lint.offlineOk) && compileErrorCount === 0;
      progressiveOk = Boolean(lint.progressiveOk) && compileErrorCount === 0;

      if (!cancelled && source.trim() && compileErrorCount === 0) {
        const replay = replayThroughRuntime(source);
        runtimeRejectCount = replay.runtimeRejectCount;
        firstSealHorizonMs = replay.firstSealHorizonMs;
        firstSealBytes = replay.firstSealBytes;
        if (firstSealHorizonMs !== null) firstSealMs = performance.now() - started;
      } else {
        runtimeRejectCount = 0;
      }

      if (cancelled) break;
      if (compileErrorCount === 0) break;
      if (attempt >= maxRepairs) break;

      const errorLines = cleaned.diagnostics
        .filter((d) => d.severity === "error" || d.severity === "fatal")
        .slice(0, 8)
        .map((d) => `- ${d.code}: ${d.message}`)
        .join("\n");
      prompt = [
        options.prompt,
        "",
        "Your previous MotionScript failed to compile. Return a corrected complete program only (no markdown fences).",
        "Rules: never name nodes with reserved words (path, line, circle, text, stroke, fill, animate, seal).",
        "path syntax: path rail { move (x,y); line (x,y); stroke #rrggbb width 4; };",
        "trim: operators rail { trim 0, 0, 0; }; then animate rail.trim.end { from 0; to 1; duration 1500ms; };",
        "circle: circle badge { radius 32; fill #ffffff; position (x,y); };",
        "text: text label { content \"OK\"; fontSize 16; align center; baseline middle; fill #fff; position (x,y); };",
        "Previous program:",
        source,
        "",
        "Compile errors:",
        errorLines,
      ].join("\n");
      notes.push(`repair ${attempt + 1}: ${compileErrorCount} compile error(s)`);
    }
  } finally {
    if (cancelTimer) clearTimeout(cancelTimer);
    parent?.removeEventListener("abort", onParentAbort);
    sessionState.disposed = true;
  }

  const totalMs = performance.now() - started;
  let status: GenerationMetrics["status"] = "fail";
  if (cancelled) status = "cancelled";
  else if (offlineOk) status = "pass";

  return {
    source,
    metrics: {
      providerId: options.generator.providerId,
      modelId: options.generator.modelId,
      taskId: options.taskId,
      promptChars: options.prompt.length,
      referenceFingerprint: options.referenceFingerprint ?? null,
      referencePath: options.referencePath ?? null,
      ttfbMs,
      totalMs,
      firstSealMs,
      firstSealHorizonMs,
      firstSealBytes,
      sourceChars: source.length,
      estimatedTokensUtf16Div4: Math.ceil(source.length / 4),
      offlineOk,
      progressiveOk,
      compileErrorCount,
      runtimeRejectCount,
      repairAttempts,
      cancelled,
      staleIgnored,
      status,
      notes,
    },
    disposed: true,
  };
}
