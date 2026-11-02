import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};`;
const nodes = `circle Dot { position (200, 150); radius 20; fill #3366ff; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

const enabled = ["audio.cues", "audio.generative"];

describe("generative audio declarations (MotionScript 0.14.0 audio.generative)", () => {
  it("lowers generative audio and sugar into Scene IR with audio.generative", () => {
    const result = compile(`audio Hello = speech "This is an example of what I sound like";
      audio Tracks = effect "Train tracks" { duration 3s; loop; voice "rails"; seed 1; stability 0.4; };
      cue N1 narration Hello at 0ms;
      cue E1 effects Tracks at 1200ms;
      audio.narration("Sugar speech");
      audio.effects("Birds tweeting", duration 2s) at 500ms;`);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toEqual(expect.arrayContaining(["audio.cues", "audio.generative"]));
    const audio = scene.resources.filter((resource) => resource.kind === "audio");
    expect(audio).toHaveLength(4);
    expect(audio[0]).toMatchObject({
      id: "Hello",
      kind: "audio",
      readiness: "pending",
      source: { type: "generative", modality: "speech", prompt: "This is an example of what I sound like" },
    });
    expect(audio[0]!.durationMs).toBeGreaterThan(0);
    expect(audio[1]).toMatchObject({
      id: "Tracks",
      source: {
        type: "generative",
        modality: "effect",
        prompt: "Train tracks",
        durationHintMs: 3000,
        loop: true,
        voice: "rails",
        seed: 1,
        style: { stability: 0.4 },
      },
      durationMs: 3000,
    });
    expect(audio[2]).toMatchObject({
      id: "GenNarration1",
      source: { type: "generative", modality: "speech", prompt: "Sugar speech" },
    });
    expect(audio[3]).toMatchObject({
      id: "GenEffects2",
      source: { type: "generative", modality: "effect", prompt: "Birds tweeting", durationHintMs: 2000 },
      durationMs: 2000,
    });
    expect(scene.audioCues).toEqual(
      expect.arrayContaining([
        { id: "N1", resourceId: "Hello", bus: "narration", startMs: 0 },
        { id: "E1", resourceId: "Tracks", bus: "effects", startMs: 1200 },
        { id: "GenNarrationCue1", resourceId: "GenNarration1", bus: "narration", startMs: 0 },
        { id: "GenEffectsCue2", resourceId: "GenEffects2", bus: "effects", startMs: 500 },
      ]),
    );
    expect(validateSceneIR(scene).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled }).ok).toBe(false); // pending required narration
    const ready: SceneIR = {
      ...scene,
      resources: scene.resources.map((resource) =>
        resource.kind === "audio" ? { ...resource, readiness: "ready" as const } : resource,
      ),
    };
    expect(acceptScene(ready, { consumer: "0.2", enabled }).ok).toBe(true);
  });

  it("rejects generative audio without the capability and invalid sources through validation", () => {
    const scene = compile(`audio Hello = speech "hi"; cue N1 narration Hello at 0ms;`).scene!;
    const withoutGenerative: SceneIR = {
      ...scene,
      requiredCapabilities: ["audio.cues"],
    };
    const missing = validateSceneIR(withoutGenerative);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.diagnostics.some((item) => item.message.includes("audio.generative"))).toBe(true);
    }
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["audio.cues"] }).ok).toBe(false);

    const badSource = validateSceneIR({
      ...scene,
      resources: [
        {
          id: "Hello",
          kind: "audio",
          readiness: "pending",
          source: { type: "generative", modality: "music" as "speech", prompt: "x" },
        },
      ],
    } as SceneIR);
    expect(badSource.ok).toBe(false);

    const emptyPrompt = validateSceneIR({
      ...scene,
      resources: [
        {
          id: "Hello",
          kind: "audio",
          readiness: "pending",
          source: { type: "generative", modality: "speech", prompt: "" },
        },
      ],
    } as SceneIR);
    expect(emptyPrompt.ok).toBe(false);
  });

  it("freezes generative audio after the first seal and keeps older identifiers compiling", () => {
    const frozen = compileMotionScript(`${header}\n${nodes}\nseal 1s;\naudio Hello = speech "late";\ncomplete;`);
    expect(frozen.diagnostics.some((item) => item.message.includes("frozen"))).toBe(true);
    const sugarFrozen = compileMotionScript(`${header}\n${nodes}\nseal 1s;\naudio.narration("late");\ncomplete;`);
    expect(sugarFrozen.diagnostics.some((item) => item.message.includes("frozen"))).toBe(true);

    const result = compile(`circle speech { position (10, 10); radius 4; fill #000000; };
      circle effect { radius 2; fill #000000; }; circle voice { radius 2; fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("audio.generative");
  });
});
