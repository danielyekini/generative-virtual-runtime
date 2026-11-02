import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};`;
const nodes = `circle Dot { position (200, 150); radius 20; fill #3366ff; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

const enabled = ["audio.cues"];

describe("audio and cue declarations (MotionScript 0.11.0 audio.cues)", () => {
  it("lowers audio resources and every cue property into Scene IR", () => {
    const result = compile(`audio Voice "voice.wav" 2.5s;
      audio Click "click.wav" 120ms;
      audio Bed "bed.wav" 1s;
      cue Intro narration Voice at 0ms;
      cue Tap effects Click at 1.2s { gain 0.8; required true; };
      cue Music music Bed at 0ms { offset 100ms; duration 800ms; loops 3; fadeIn 200ms; fadeOut 300ms; required false; };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("audio.cues");
    expect(scene.resources.filter((resource) => resource.kind === "audio")).toEqual([
      { id: "Voice", kind: "audio", href: "voice.wav", durationMs: 2500 },
      { id: "Click", kind: "audio", href: "click.wav", durationMs: 120 },
      { id: "Bed", kind: "audio", href: "bed.wav", durationMs: 1000 },
    ]);
    expect(scene.audioCues).toEqual([
      { id: "Intro", resourceId: "Voice", bus: "narration", startMs: 0 },
      { id: "Tap", resourceId: "Click", bus: "effects", startMs: 1200, gain: 0.8, required: true },
      {
        id: "Music", resourceId: "Bed", bus: "music", startMs: 0,
        offsetMs: 100, durationMs: 800, loops: 3, fadeInMs: 200, fadeOutMs: 300, required: false,
      },
    ]);
    expect(validateSceneIR(scene).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled }).ok).toBe(true);
  });

  it("rejects audio constructs without the capability and invalid cues through validation", () => {
    const scene = compile(`audio Voice "voice.wav" 1s; cue Intro narration Voice at 0ms;`).scene!;
    const withoutCapability: SceneIR = { ...scene, requiredCapabilities: [] };
    const missing = validateSceneIR(withoutCapability);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("audio.cues"))).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);

    const bad = (patch: Record<string, unknown>) => validateSceneIR({ ...scene, audioCues: [{ ...scene.audioCues![0]!, ...patch }] } as SceneIR).ok;
    expect(bad({})).toBe(true);
    expect(bad({ resourceId: "Nope" })).toBe(false);
    expect(bad({ bus: "voice" })).toBe(false);
    expect(bad({ offsetMs: 1000 })).toBe(false);
    expect(bad({ offsetMs: 500, durationMs: 600 })).toBe(false);
    expect(bad({ loops: 0 })).toBe(false);
    expect(bad({ loops: 1.5 })).toBe(false);
    expect(bad({ gain: 5 })).toBe(false);
    expect(bad({ fadeInMs: -1 })).toBe(false);
    expect(bad({ startMs: 5000 })).toBe(false);
    expect(bad({ extra: 1 })).toBe(false);
    expect(validateSceneIR({ ...scene, audioCues: [scene.audioCues![0]!, scene.audioCues![0]!] }).ok).toBe(false);
    expect(validateSceneIR({ ...scene, resources: [{ id: "Voice", kind: "audio", href: "v.wav", durationMs: 0 }] } as SceneIR).ok).toBe(false);
  });

  it("reports compile diagnostics for duplicates, unknown resources, bad buses and frozen audio", () => {
    expect(compile(`audio Voice "a.wav" 1s; audio Voice "b.wav" 1s;`).diagnostics.map((item) => item.code)).toContain("DUPLICATE_ID");
    expect(compile(`cue Intro narration Missing at 0ms;`).diagnostics.map((item) => item.code)).toContain("UNKNOWN_TARGET");
    expect(compile(`audio Voice "a.wav" 1s; cue Intro speech Voice at 0ms;`).ok).toBe(false);
    expect(compile(`audio Voice "a.wav" 1s; cue Intro narration Voice at 0ms { pitch 2; };`).ok).toBe(false);
    const frozen = compileMotionScript(`${header}\n${nodes}\nseal 1s;\naudio Voice "a.wav" 1s;\ncomplete;`);
    expect(frozen.diagnostics.some((item) => item.message.includes("frozen"))).toBe(true);
  });

  it("keeps older identifiers spelled like cue sub-words compiling", () => {
    const result = compile(`circle narration { position (10, 10); radius 4; fill #000000; };
      rectangle music { size (4, 4); fill #000000; }; circle gain { radius 2; fill #000000; }; circle fadeIn { radius 2; fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("audio.cues");
  });

  it("streams cues after the first seal with ADD_AUDIO_CUES and rejects cues behind the seal", () => {
    const source = `${header}
${nodes}
audio Voice "voice.wav" 1s;
audio Click "click.wav" 100ms;
cue Intro narration Voice at 0ms;
seal 1s;
cue Tap effects Click at 2s;
cue Late effects Click at 500ms;
complete;`;
    const result = compileMotionScript(source);
    const ops = result.deltas.flatMap((delta) => delta.operations);
    const added = ops.filter((op) => op.op === "ADD_AUDIO_CUES");
    expect(added.map((op) => (op.op === "ADD_AUDIO_CUES" ? op.cues.map((cue) => cue.id) : []))).toEqual([["Intro"], ["Tap"]]);
    expect(result.diagnostics.some((item) => item.code === "INVALID_TIMING" && item.message.includes("Late"))).toBe(true);
    // No CREATE_SCENE after the seal: cue deltas never touch the frozen header.
    const sealIndex = ops.findIndex((op) => op.op === "SEAL_TIMELINE");
    expect(ops.slice(sealIndex).some((op) => op.op === "CREATE_SCENE")).toBe(false);
  });
});
