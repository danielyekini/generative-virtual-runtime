import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FixtureGenerator } from "../../../../tools/native-generation/fixture-adapter";
import { runGenerationPipeline } from "../../../../tools/native-generation/pipeline";
import { loadStudioReference, STUDIO_GENERATE_MODEL } from "./generate-reference";

const root = resolve(import.meta.dirname, "../../../..");
const heldOut = resolve(root, "fixtures/generation/held-out");

describe("Studio Generate (P019)", () => {
  it("pins the same Ollama model as P007", () => {
    expect(STUDIO_GENERATE_MODEL).toBe("qwen2.5-coder:14b");
  });

  it("bundles the current authoring reference snapshot", () => {
    const reference = loadStudioReference();
    expect(reference.fingerprint).toHaveLength(64);
    expect(reference.markdown).toContain("MotionScript authoring reference");
    expect(reference.path).toContain(reference.fingerprint.slice(0, 8));
  });

  it("pipelines a fixture with progress callbacks for the transcript", async () => {
    const program = readFileSync(resolve(heldOut, "drop-seal.ms"), "utf8");
    const generator = new FixtureGenerator(program, { chunkChars: 24 });
    const phases: string[] = [];
    const result = await runGenerationPipeline({
      taskId: "studio-fixture",
      prompt: "fixture",
      generator,
      approach: "direct",
      referenceFingerprint: "test",
      referencePath: "test",
      onProgress: (event) => phases.push(event.phase),
    });
    expect(result.metrics.status).toBe("pass");
    expect(result.directorRaw).toBeNull();
    expect(phases.length).toBeGreaterThan(0);
    expect(phases.every((phase) => phase === "implement")).toBe(true);
  });
});
