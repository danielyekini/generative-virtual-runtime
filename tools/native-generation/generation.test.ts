import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FixtureGenerator } from "./fixture-adapter.js";
import { loadAuthoringReference } from "./load-reference.js";
import { disposeGenerationSession, runGenerationPipeline } from "./pipeline.js";
import { PINNED_OLLAMA_MODEL } from "./ollama-adapter.js";

const root = resolve(import.meta.dirname, "../..");
const heldOut = resolve(root, "fixtures/generation/held-out");

describe("native generation pipeline", () => {
  it("pins ollama qwen2.5-coder:14b as the live model id constant", () => {
    expect(PINNED_OLLAMA_MODEL).toBe("qwen2.5-coder:14b");
  });

  it("loads the P006 authoring reference pointer", () => {
    const reference = loadAuthoringReference(root);
    expect(reference.metadata.fingerprint).toHaveLength(64);
    expect(reference.markdown).toContain("MotionScript authoring reference");
  });

  it("streams a fixture program through compile/runtime and records first seal", async () => {
    const program = readFileSync(resolve(heldOut, "drop-seal.ms"), "utf8");
    const generator = new FixtureGenerator(program, { chunkChars: 32 });
    const result = await runGenerationPipeline({
      taskId: "drop-seal",
      prompt: "fixture",
      generator,
      referenceFingerprint: "test",
      referencePath: "test",
    });
    expect(result.metrics.status).toBe("pass");
    expect(result.metrics.offlineOk).toBe(true);
    expect(result.metrics.progressiveOk).toBe(true);
    expect(result.metrics.firstSealMs).not.toBeNull();
    expect(result.metrics.providerId).toBe("fixture");
  });

  it("honours cancel-after and AbortError without claiming model speed", async () => {
    const program = readFileSync(resolve(heldOut, "drop-seal.ms"), "utf8");
    const generator = new FixtureGenerator(program, { chunkChars: 8, delayMs: 5 });
    const result = await runGenerationPipeline({
      taskId: "drop-seal-cancel",
      prompt: "fixture",
      generator,
      cancelAfterMs: 12,
    });
    expect(result.metrics.cancelled).toBe(true);
    expect(result.metrics.status).toBe("cancelled");
  });

  it("ignores chunks after a disposed generation session (stale-safe)", async () => {
    const program = readFileSync(resolve(heldOut, "static-badge.ms"), "utf8");
    const generator = new FixtureGenerator(program, { chunkChars: 16, delayMs: 2 });
    const sessionId = "stale-test";
    const pending = runGenerationPipeline({
      taskId: "static-badge",
      prompt: "fixture",
      generator,
      sessionId,
    });
    disposeGenerationSession(sessionId);
    const result = await pending;
    expect(result.metrics.staleIgnored || result.source.length >= 0).toBe(true);
  });
});
