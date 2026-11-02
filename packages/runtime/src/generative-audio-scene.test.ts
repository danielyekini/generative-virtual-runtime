import { describe, expect, it } from "vitest";
import { acceptScene } from "@gvr/schema";
import { compileMotionScript } from "@gvr/compiler";
import {
  createFixtureGenerativeAudioProvider,
  createSceneAudioSession,
  generativeRequestFromResource,
  materializeGenerativeResource,
  requiredGenerativeExportReady,
} from "./index";

const header = `scene "gen" {version "0.2"; viewport (400,300); background #ffffff; duration 3s;};`;
const nodes = `circle Dot { position (200, 150); radius 20; fill #3366ff; };`;

describe("generative audio scene integration (audio.generative)", () => {
  it("materialises compiled generative resources with the fixture provider and revises duration", async () => {
    const compiled = compileMotionScript(`${header}
${nodes}
audio Hello = speech "Fixture hello";
cue N1 narration Hello at 0ms;
audio.effects("Fixture chirp", duration 500ms) at 1s;
complete;`);
    expect(compiled.ok).toBe(true);
    const scene = compiled.scene!;
    const hello = scene.resources.find((resource) => resource.kind === "audio" && resource.id === "Hello");
    expect(hello && hello.kind === "audio" ? hello.source?.type : undefined).toBe("generative");

    const session = createSceneAudioSession(scene);
    expect(session.requiredResourcesReady()).toBe(false);
    expect(
      acceptScene(scene, { consumer: "0.2", enabled: ["audio.cues", "audio.generative"] }).ok,
    ).toBe(false);

    const provider = createFixtureGenerativeAudioProvider({
      fixtures: {
        "Fixture hello": { durationMs: 1800, toneHz: 220 },
        "Fixture chirp": { durationMs: 500, toneHz: 880 },
      },
    });

    for (const resource of scene.resources) {
      if (resource.kind !== "audio" || resource.source?.type !== "generative") continue;
      const request = generativeRequestFromResource(resource);
      expect(request).toBeDefined();
      const { diagnostics, result } = await materializeGenerativeResource(session, provider, request!);
      expect(diagnostics.some((item) => item.code === "AUDIO_RESOURCE_FAILED")).toBe(false);
      expect(result?.durationMs).toBeGreaterThan(0);
    }

    expect(requiredGenerativeExportReady(session)).toBe(true);
    const schedule = session.schedule();
    const readyScene = {
      ...scene,
      resources: scene.resources.map((resource) =>
        resource.kind === "audio"
          ? {
              ...resource,
              readiness: "ready" as const,
              durationMs: schedule.resources.get(resource.id)?.durationMs ?? resource.durationMs,
            }
          : resource,
      ),
    };
    expect(acceptScene(readyScene, { consumer: "0.2", enabled: ["audio.cues", "audio.generative"] }).ok).toBe(true);
  });
});
