#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FixtureGenerator } from "./fixture-adapter.js";
import { loadAuthoringReference } from "./load-reference.js";
import { OllamaGenerator, PINNED_OLLAMA_MODEL, ollamaModelAvailable } from "./ollama-adapter.js";
import { runGenerationPipeline } from "./pipeline.js";
import type { GenerationMetrics, MotionScriptGenerator } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const HELD_OUT = join(REPO_ROOT, "fixtures/generation/held-out");

type Manifest = {
  tasks: Array<{
    id: string;
    prompt: string;
    fixtureProgram: string;
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
    ].join("\n");
  }

  let generator: MotionScriptGenerator;
  if (provider === "fixture") {
    const program = readFileSync(join(HELD_OUT, task.fixtureProgram), "utf8");
    generator = new FixtureGenerator(program, { chunkChars: 40, delayMs: 0 });
  } else if (provider === "ollama") {
    const available = await ollamaModelAvailable();
    if (!available) {
      const blocked: GenerationMetrics = {
        providerId: "ollama",
        modelId: PINNED_OLLAMA_MODEL,
        taskId,
        promptChars: task.prompt.length,
        referenceFingerprint,
        referencePath,
        ttfbMs: null,
        totalMs: 0,
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
        cancelled: false,
        staleIgnored: false,
        status: "blocked",
        notes: [`Pinned model ${PINNED_OLLAMA_MODEL} not available via Ollama`],
      };
      writeResult(outDir, taskId, "", blocked);
      console.error(`generation:blocked ${PINNED_OLLAMA_MODEL} unavailable`);
      process.exit(2);
    }
    generator = new OllamaGenerator();
  } else {
    throw new Error(`Unsupported provider ${provider} (use ollama|fixture)`);
  }

  const result = await runGenerationPipeline({
    taskId,
    prompt: task.prompt,
    generator,
    system,
    cancelAfterMs,
    referenceFingerprint,
    referencePath,
  });

  writeResult(outDir, taskId, result.source, result.metrics);
  console.log(
    JSON.stringify(
      {
        taskId,
        provider: result.metrics.providerId,
        model: result.metrics.modelId,
        status: result.metrics.status,
        offlineOk: result.metrics.offlineOk,
        progressiveOk: result.metrics.progressiveOk,
        firstSealMs: result.metrics.firstSealMs,
        totalMs: Math.round(result.metrics.totalMs),
        outDir,
      },
      null,
      2,
    ),
  );
  process.exit(result.metrics.status === "pass" || result.metrics.status === "cancelled" ? 0 : 1);
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
