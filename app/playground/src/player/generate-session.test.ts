import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FixtureGenerator } from "../../../../tools/native-generation/fixture-adapter";
import { runGenerationPipeline } from "../../../../tools/native-generation/pipeline";
import { DIRECTOR_SYSTEM } from "../../../../tools/native-generation/director";
import type { MotionScriptGenerator, StreamGenerationOptions } from "../../../../tools/native-generation/types";
import {
  COPY_DEFAULT,
  detailBodyText,
  formatGenerateCopy,
  GenerateController,
  noteGenerationProgress,
  type GenerateMessage,
} from "./generate-session";
import { parseGvrTranscript } from "./gvr-transcript";
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

  describe("P027 Generate tooling", () => {
    const turn = (): GenerateMessage[] => [
      { id: "u1", role: "user", text: "a city at dusk" },
      {
        id: "m1",
        role: "model",
        text: "preview",
        approach: "director",
        directorRaw: '{"intent":"dusk"}',
        source: 'scene "city" {}',
        attempts: ["broken first try", 'scene "city" {}'],
        log: ["[0 ms] start", "[9 ms] repair attempt 1"],
        systems: { director: "DIRECTOR SYS", motionscript: "MS SYS" },
      },
    ];

    it("keeps the default copy as prompts + MotionScript", () => {
      const text = formatGenerateCopy(turn(), COPY_DEFAULT);
      expect(text).toBe('## User\na city at dusk\n\n## Model\nscene "city" {}');
    });

    it("adds only the selected optional parts", () => {
      const all = formatGenerateCopy(turn(), ["prompts", "motionscript", "director", "system", "retries", "logs"]);
      expect(all).toContain("### Director response\n{\"intent\":\"dusk\"}");
      expect(all).toContain("### Director system prompt\nDIRECTOR SYS");
      expect(all).toContain("### MotionScript system prompt\nMS SYS");
      expect(all).toContain("### Attempt 1 (initial)\nbroken first try");
      expect(all).toContain("### Attempt 2 (repair 1)");
      expect(all).toContain("### Log\n[0 ms] start");
      const directorOnly = formatGenerateCopy(turn(), ["director"]);
      expect(directorOnly).not.toContain("## User");
      expect(directorOnly).not.toContain('scene "city"');
      expect(directorOnly).toContain("### Director response");
    });

    it("repeats system prompts only when a later turn used different ones", () => {
      const messages = [...turn(), ...turn().map((m) => ({ ...m, id: `${m.id}b` }))];
      const text = formatGenerateCopy(messages, ["system"]);
      expect(text.match(/### MotionScript system prompt/g)).toHaveLength(1);
      messages[3]!.systems = { director: "DIRECTOR SYS", motionscript: "EDITED" };
      expect(formatGenerateCopy(messages, ["system"]).match(/### MotionScript system prompt/g)).toHaveLength(2);
    });

    it("records each implement attempt for retry details", () => {
      const message: GenerateMessage = { id: "m", role: "model", text: "", pending: true, phase: "implement" };
      noteGenerationProgress(message, { phase: "implement", text: "first", attempt: 0 });
      noteGenerationProgress(message, { phase: "implement", text: "second", attempt: 1 });
      expect(message.attempts).toEqual(["first", "second"]);
    });

    it("tracks copy parts in menu order", () => {
      const controller = new GenerateController({ onChange: () => undefined, acceptProgram: () => undefined });
      expect(controller.state.copyParts).toEqual(["prompts", "motionscript"]);
      controller.setCopyPart("logs", true);
      controller.setCopyPart("director", true);
      controller.setCopyPart("prompts", false);
      expect(controller.state.copyParts).toEqual(["motionscript", "director", "logs"]);
    });

    it("edits system prompts session-locally and resets to the bundled default", () => {
      const controller = new GenerateController({ onChange: () => undefined, acceptProgram: () => undefined });
      expect(controller.systemPrompt("director")).toBe(DIRECTOR_SYSTEM);
      expect(controller.systemPrompt("motionscript")).toBe(loadStudioReference().markdown);
      controller.setSystemPrompt("director", "Plan in three beats.");
      expect(controller.systemPromptEdited("director")).toBe(true);
      expect(controller.systemPrompt("director")).toBe("Plan in three beats.");
      controller.setSystemPrompt("director", DIRECTOR_SYSTEM);
      expect(controller.systemPromptEdited("director")).toBe(false);
      controller.setSystemPrompt("motionscript", "x");
      controller.resetSystemPrompt("motionscript");
      expect(controller.systemPromptEdited("motionscript")).toBe(false);
      // Session-local: a fresh controller starts from the defaults.
      expect(new GenerateController({ onChange: () => undefined, acceptProgram: () => undefined }).systemPromptEdited("director")).toBe(false);
    });

    it("keeps Send inactive until the model is confirmed ready", async () => {
      let up = false;
      const probed: string[] = [];
      const controller = new GenerateController({
        onChange: () => undefined,
        acceptProgram: () => undefined,
        modelAvailable: async (id) => {
          probed.push(id);
          return up;
        },
      });
      expect(controller.state.modelReadiness).toBe("checking");
      expect(controller.canSend()).toBe(false);
      await controller.send("ignored while checking");
      expect(controller.state.messages).toHaveLength(0);
      expect(await controller.checkModel()).toBe("unavailable");
      expect(controller.canSend()).toBe(false);
      await controller.send("ignored while unavailable");
      expect(controller.state.messages).toHaveLength(0);
      up = true;
      expect(await controller.checkModel()).toBe("ready");
      expect(controller.canSend()).toBe(true);
      expect(probed.every((id) => id === STUDIO_GENERATE_MODEL)).toBe(true);
    });

    it("sends the edited director system prompt to the planner", async () => {
      const program = readFileSync(resolve(heldOut, "drop-seal.ms"), "utf8");
      const director = JSON.stringify({
        intent: "drop",
        canvas: { width: 400, height: 300, durationMs: 1000 },
        requires: [],
        beats: [{ atMs: 0, action: "drop", notes: "" }],
        constraints: [],
      });
      const inner = new FixtureGenerator(program, { sequence: [director, program] });
      const systems: Array<string | undefined> = [];
      const generator: MotionScriptGenerator = {
        providerId: inner.providerId,
        modelId: inner.modelId,
        stream: (prompt: string, options?: StreamGenerationOptions) => {
          systems.push(options?.system);
          return inner.stream(prompt, options);
        },
      };
      await runGenerationPipeline({
        taskId: "p027-director-system",
        prompt: "drop",
        generator,
        approach: "director",
        system: "MS SYS",
        directorSystem: "EDITED DIRECTOR",
      });
      expect(systems[0]).toBe("EDITED DIRECTOR");
      expect(systems[1]).toBe("MS SYS");
    });
  });
});

describe("Transcript playback (P029)", () => {
  it("loads a transcript into Generate and steps the highlighted pair", () => {
    const parsed = parseGvrTranscript(readFileSync(resolve(import.meta.dirname, "../../fixtures/gvr-transcript-sample.json"), "utf8"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const controller = new GenerateController({ onChange: () => undefined, acceptProgram: () => undefined });
    const first = controller.loadTranscript(parsed.transcript);
    expect(first).toMatchObject({ userId: "u1", assistantId: "a1" });
    expect(controller.playbackActive()).toBe(true);
    expect(controller.state.renderingIds).toEqual(["u1", "a1"]);
    expect(controller.state.approach).toBe("director");
    expect(controller.advancePlayback()).toMatchObject({ userId: "u2", assistantId: "a2" });
    expect(controller.state.renderingIds).toEqual(["u2", "a2"]);
    expect(controller.advancePlayback()).toBeNull();
    expect(controller.state.renderingIds).toEqual([]);
    expect(controller.transcriptId()).toBe("sample-baseline");
  });

  it("captures a finished session once and keeps its id", () => {
    const saved: string[] = [];
    const controller = new GenerateController({
      onChange: () => undefined,
      acceptProgram: () => undefined,
      onTranscript: (doc) => saved.push(doc.id),
    });
    controller.state.messages.push(
      { id: "user-1", role: "user", text: "Draw a square" },
      { id: "model-1", role: "model", text: "square", source: 'scene "s" { version "0.1"; };', approach: "director" },
    );
    const doc = controller.captureTranscript();
    expect(doc?.title).toBe("Draw a square");
    expect(doc?.turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(doc?.turns[1]?.motionScript).toContain('scene "s"');
    expect(controller.captureTranscript()?.id).toBe(doc?.id);
    controller.cancel();
    expect(saved).toEqual([doc?.id]);
  });
});
