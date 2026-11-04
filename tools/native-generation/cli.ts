#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FixtureGenerator } from "./fixture-adapter.js";
import { loadAuthoringReference } from "./load-reference.js";
import { OllamaGenerator, PINNED_OLLAMA_MODEL, ollamaModelAvailable } from "./ollama-adapter.js";
import { runGenerationPipeline } from "./pipeline.js";
import type { GenerationApproach, GenerationMetrics, MotionScriptGenerator } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const HELD_OUT = join(REPO_ROOT, "fixtures/generation/held-out");

type Manifest = {
  tasks: Array<{
    id: string;
    prompt: string;
    fixtureProgram: string;
    fixtureDirector?: string;
    expected?: { progressiveOk?: boolean; offlineOk?: boolean };
  }>;
};

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const provider = argValue("--provider") ?? process.env.GVR_LLM_PROVIDER ?? "ollama";
  const taskId = argValue("--task") ?? "drop-seal";
  const approachArg = (argValue("--approach") ?? "direct") as GenerationApproach | "compare";
  const outDir = resolve(argValue("--out") ?? join(REPO_ROOT, "docs/runs/product/generation-latest"));
  const cancelAfterMs = argValue("--cancel-after-ms")
    ? Number(argValue("--cancel-after-ms"))
    : undefined;
  const includeReference = !hasFlag("--no-reference");

  const manifest = JSON.parse(readFileSync(join(HELD_OUT, "manifest.json"), "utf8")) as Manifest;
  const task = manifest.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task ${taskId}`);

  let referenceFingerprint: string | null = null;
  let referencePath: string | null = null;
  let system: string | undefined;
  if (includeReference) {
    const reference = loadAuthoringReference(REPO_ROOT);
    referenceFingerprint = reference.metadata.fingerprint;
    referencePath = reference.metadata.snapshot;
    system = [
      "You write MotionScript only for the GVR runtime.",
      "Follow this compact released-authority reference:",
      "",
      reference.markdown,
      "",
      "Output ONLY raw MotionScript ending with complete;",
      "Never use markdown fences or commentary.",
      "Never name nodes with reserved words (circle, path, line, text, stroke, fill, animate, seal, …); use ids like badge, rail, label.",
    ].join("\n");
  }

  const approaches: GenerationApproach[] =
    approachArg === "compare" ? ["direct", "director"] : [approachArg === "director" ? "director" : "direct"];

  let exitCode = 0;
  for (const approach of approaches) {
    const generator = await buildGenerator(provider, task, approach, {
      referenceFingerprint,
      referencePath,
      promptChars: task.prompt.length,
    });
    if (!generator) {
      exitCode = 2;
      continue;
    }

    const result = await runGenerationPipeline({
      taskId,
      prompt: task.prompt,
      generator,
      system,
      approach,
      cancelAfterMs,
      referenceFingerprint,
      referencePath,
    });

    const approachOut = approaches.length > 1 ? join(outDir, approach) : outDir;
    writeResult(approachOut, taskId, result.source, result.metrics);
    console.log(
      JSON.stringify(
        {
          taskId,
          approach,
          provider: result.metrics.providerId,
          model: result.metrics.modelId,
          status: result.metrics.status,
          offlineOk: result.metrics.offlineOk,
          progressiveOk: result.metrics.progressiveOk,
          directorOk: result.metrics.directorOk,
          firstSealMs: result.metrics.firstSealMs,
          directorMs: result.metrics.directorMs === null ? null : Math.round(result.metrics.directorMs),
          implementMs: result.metrics.implementMs === null ? null : Math.round(result.metrics.implementMs),
          totalMs: Math.round(result.metrics.totalMs),
          outDir: approachOut,
        },
        null,
        2,
      ),
    );
    if (result.metrics.status !== "pass" && result.metrics.status !== "cancelled") exitCode = Math.max(exitCode, 1);
  }
  process.exit(exitCode);
}

async function buildGenerator(
  provider: string,
  task: Manifest["tasks"][number],
  approach: GenerationApproach,
  blocked: { referenceFingerprint: string | null; referencePath: string | null; promptChars: number },
): Promise<MotionScriptGenerator | null> {
  if (provider === "fixture") {
    const program = readFileSync(join(HELD_OUT, task.fixtureProgram), "utf8");
    if (approach === "director") {
      const directorPath = task.fixtureDirector ?? `${task.id}.director.json`;
      const director = readFileSync(join(HELD_OUT, directorPath), "utf8");
      return new FixtureGenerator(program, { sequence: [director, program] });
    }
    return new FixtureGenerator(program, { chunkChars: 40, delayMs: 0 });
  }
  if (provider === "ollama") {
    const available = await ollamaModelAvailable();
    if (!available) {
      const blockedMetrics: GenerationMetrics = {
        providerId: "ollama",
        modelId: PINNED_OLLAMA_MODEL,
        taskId: task.id,
        approach,
        promptChars: blocked.promptChars,
        referenceFingerprint: blocked.referenceFingerprint,
        referencePath: blocked.referencePath,
        ttfbMs: null,
        totalMs: 0,
        directorMs: null,
        implementMs: null,
        firstSealMs: null,
        firstSealHorizonMs: null,
        firstSealBytes: null,
        sourceChars: 0,
        estimatedTokensUtf16Div4: 0,
        offlineOk: false,
        progressiveOk: false,
        compileErrorCount: 0,
        runtimeRejectCount: 0,
        repairAttempts: 0,
        directorOk: approach === "director" ? false : null,
        cancelled: false,
        staleIgnored: false,
        status: "blocked",
        notes: [`Pinned model ${PINNED_OLLAMA_MODEL} not available via Ollama`],
      };
      writeResult(
        resolve(argValue("--out") ?? join(REPO_ROOT, "docs/runs/product/generation-latest")),
        task.id,
        "",
        blockedMetrics,
      );
      console.error(`generation:blocked ${PINNED_OLLAMA_MODEL} unavailable`);
      return null;
    }
    return new OllamaGenerator();
  }
  throw new Error(`Unsupported provider ${provider} (use ollama|fixture)`);
}

function writeResult(outDir: string, taskId: string, source: string, metrics: GenerationMetrics): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${taskId}.ms`), source);
  writeFileSync(join(outDir, `${taskId}.metrics.json`), `${JSON.stringify(metrics, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
