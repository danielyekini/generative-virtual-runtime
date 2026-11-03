import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FixtureGenerator } from "../../../../tools/native-generation/fixture-adapter";
import { runGenerationPipeline } from "../../../../tools/native-generation/pipeline";
import {
  detailBodyText,
  GenerateController,
  noteGenerationProgress,
  type GenerateMessage,
} from "./generate-session";
import { loadQualityJudgmentPack } from "./generate-quality-pack";
import { loadStudioReference, STUDIO_GENERATE_MODEL } from "./generate-reference";

const root = resolve(import.meta.dirname, "../../../..");
const heldOut = resolve(root, "fixtures/generation/held-out");

describe("Studio Generate (P019 / P022 / P028)", () => {
  it("pins the same Ollama model as P007", () => {
    expect(STUDIO_GENERATE_MODEL).toBe("qwen2.5-coder:14b");
  });

  it("bundles the current authoring reference snapshot", () => {
    const reference = loadStudioReference();
    expect(reference.fingerprint).toHaveLength(64);
    expect(reference.markdown).toContain("MotionScript authoring reference");
    expect(reference.path).toContain(reference.fingerprint.slice(0, 8));
  });

  it("bundles the story-complexity quality judgment pack (P020)", () => {
    const pack = loadQualityJudgmentPack();
    expect(pack.split).toBe("quality-judgment");
    expect(pack.studioDefaultApproach).toBe("director");
    expect(pack.pinnedModel).toBe(STUDIO_GENERATE_MODEL);
    expect(pack.tasks.length).toBeGreaterThanOrEqual(5);
    expect(pack.tasks.every((task) => task.prompt.trim().length > 40 && task.title && task.baseline)).toBe(true);
    expect(pack.tasks.map((task) => task.id)).toContain("city-loop");
  });

  it("formats the full chat transcript and opens detail while pending (P022)", () => {
    const controller = new GenerateController({
      onChange: () => undefined,
      acceptProgram: () => undefined,
    });
    controller.state.messages.push(
      { id: "u1", role: "user", text: "hello city" },
      { id: "m1", role: "model", text: "partial…", pending: true, approach: "director" },
    );
    controller.openDetail("m1");
    expect(controller.state.detailId).toBe("m1");
    expect(controller.state.detailShare).toBeGreaterThan(0);
    expect(controller.formatTranscript()).toContain("## User");
    expect(controller.formatTranscript()).toContain("partial…");
    controller.setDetailShare(0.05);
    expect(controller.state.detailId).toBeNull();
  });

  it("keeps the director script when output starts streaming (P028)", () => {
    const message: GenerateMessage = {
      id: "m1",
      role: "model",
      text: "",
      pending: true,
      phase: "director",
      approach: "director",
    };
    noteGenerationProgress(message, { phase: "director", text: '{"beats":[1]}' });
    expect(detailBodyText(message, "output")).toBe("Output has not started.");
    expect(detailBodyText(message, "director")).toBe('{"beats":[1]}');
    noteGenerationProgress(message, { phase: "implement", text: 'scene "greeting" { version "0.2"; }' });
    expect(message.directorRaw).toBe('{"beats":[1]}');
    expect(detailBodyText(message, "director")).toBe('{"beats":[1]}');
    expect(detailBodyText(message, "output")).toBe('scene "greeting" { version "0.2"; }');
    expect(detailBodyText(message, "director")).not.toContain("pending");
  });

  it("does not reset the selected detail view when the same bubble is opened again", () => {
    const controller = new GenerateController({
      onChange: () => undefined,
      acceptProgram: () => undefined,
    });
    controller.state.messages.push({
      id: "m1",
      role: "model",
      text: "partial",
      pending: true,
      approach: "director",
    });
    controller.openDetail("m1");
    controller.setDetailView("director");
    controller.openDetail("m1");
    expect(controller.state.detailView).toBe("director");
    expect(controller.state.detailId).toBe("m1");
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
