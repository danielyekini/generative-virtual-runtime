import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { acceptScene, type SceneIR, type SceneIRDelta } from "@gvr/schema";
import {
  createSceneAudioSession,
  mixAudio,
  sceneAudioSchedule,
  syncSceneAudioCues,
  voicesAt,
  type AudioBackend,
  type AudioCommand,
  type AudioStartCommand,
} from "./audio";
import { assessReadiness } from "./presentation";
import { StreamingRuntime } from "./streaming";

const source = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};
circle Dot { position (200, 150); radius 20; fill #3366ff; };
audio Voice "voice.wav" 2s;
audio Click "click.wav" 100ms;
audio Bed "bed.wav" 1s;
cue Intro narration Voice at 0ms { offset 0ms; fadeIn 100ms; };
cue Music music Bed at 0ms { loops 4; gain 0.5; };
seal 1s;
cue Tap effects Click at 2.5s { gain 0.8; };
complete;`;

function compiled(): SceneIR {
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  return result.scene!;
}

const allReady = { Voice: "ready", Click: "ready", Bed: "ready" } as const;

class RecordingBackend implements AudioBackend {
  readonly log: string[] = [];
  readonly starts: AudioStartCommand[] = [];
  start(command: AudioStartCommand): void {
    this.starts.push(command);
    this.log.push(`start ${command.key} @${command.offsetMs.toFixed(0)} g${command.gain.toFixed(3)}`);
  }
  stop(voiceId: string): void {
    this.log.push(`stop ${voiceId}`);
  }
  setGain(voiceId: string, gain: number): void {
    this.log.push(`gain ${voiceId} ${gain.toFixed(3)}`);
  }
  setRate(voiceId: string, rate: number): void {
    this.log.push(`rate ${voiceId} ${rate}`);
  }
  release(resourceId: string): void {
    this.log.push(`release ${resourceId}`);
  }
}

describe("scene-declared audio (Scene IR 0.11.0 audio.cues)", () => {
  it("lowers declared cues into AudioSession with ducking, loops and export equal to live voices", () => {
    const scene = compiled();
    const backend = new RecordingBackend();
    const session = createSceneAudioSession(scene, { backend, states: allReady });
    session.sync({ sceneTimeMs: 0, state: "playing", rate: 1 });
    session.sync({ sceneTimeMs: 50, state: "playing", rate: 1, wallDeltaMs: 50 });
    expect(backend.starts.map((start) => start.key)).toEqual(["Intro#0", "Music#0"]);
    // Music is ducked under narration: 0.5 x 0.35.
    expect(backend.starts[1]!.gain).toBeCloseTo(0.175, 6);
    // Narration fades in linearly over 100 ms.
    expect(backend.log).toContain(`gain ${backend.starts[0]!.voiceId} 0.500`);
    // After narration ends (2 s) the music loop iteration 2 is un-ducked; the effect plays at 2.5 s.
    const commands: AudioCommand[] = session.sync({ sceneTimeMs: 2550, state: "playing", rate: 1, seeked: true });
    const started = commands.filter((command): command is AudioStartCommand => command.type === "start");
    expect(started.map((start) => [start.key, Math.round(start.offsetMs), Number(start.gain.toFixed(3))])).toEqual([
      ["Music#2", 550, 0.5],
      ["Tap#0", 50, 0.8],
    ]);

    // Offline export: constant DC sources mix to exactly the live voice gains.
    const schedule = sceneAudioSchedule(scene, allReady);
    const dc = (ms: number) => ({ sampleRate: 1000, channels: [new Float32Array(ms).fill(1)] });
    const sources = new Map([["Voice", dc(2000)], ["Click", dc(100)], ["Bed", dc(1000)]]);
    const mixed = mixAudio(schedule, sources, { startMs: 0, endMs: 4000, sampleRate: 1000, channels: 1 })[0]!;
    for (const t of [50, 500, 1999, 2000, 2550, 3999]) {
      const expected = voicesAt(schedule, t).reduce((sum, voice) => sum + voice.gain, 0);
      expect(mixed[t]).toBeCloseTo(expected, 5);
    }
  });

  it("delivers cues through streamed compiler deltas and adds late cues to a live session", () => {
    const result = compileMotionScript(source);
    const streaming = new StreamingRuntime();
    let session: ReturnType<typeof createSceneAudioSession> | null = null;
    for (const delta of result.deltas) {
      streaming.enqueue(delta);
      for (const outcome of streaming.flushCommands()) expect(outcome.ok).toBe(true);
      if (!session && streaming.scene?.audioCues?.length && streaming.sealedThroughMs > 0) {
        session = createSceneAudioSession(streaming.scene, { states: allReady });
      } else if (session && streaming.scene) {
        expect(syncSceneAudioCues(session, streaming.scene)).toEqual([]);
      }
    }
    expect(streaming.scene?.audioCues).toEqual(result.scene!.audioCues);
    expect(session!.schedule().cues.map((cue) => cue.id)).toEqual(["Intro", "Music", "Tap"]);
  });

  it("rejects streamed cues that start behind the seal frontier", () => {
    const result = compileMotionScript(source);
    const streaming = new StreamingRuntime();
    const deltas = result.deltas.filter((delta) => !delta.operations.some((op) => op.op === "ADD_AUDIO_CUES" && op.cues[0]?.id === "Tap"));
    const sealedIndex = deltas.findIndex((delta) => delta.operations.some((op) => op.op === "SEAL_TIMELINE"));
    for (const delta of deltas.slice(0, sealedIndex + 1)) {
      streaming.enqueue(delta);
      for (const outcome of streaming.flushCommands()) expect(outcome.ok).toBe(true);
    }
    const last = deltas[sealedIndex]!;
    const late: SceneIRDelta = {
      ...last,
      unitId: last.unitId + 1,
      expectedRevision: last.nextRevision,
      nextRevision: last.nextRevision + 1,
      operations: [{ op: "ADD_AUDIO_CUES", cues: [{ id: "Late", resourceId: "Click", bus: "effects", startMs: 500 }] }],
    };
    streaming.enqueue(late);
    expect(streaming.flushCommands()).toEqual([]);
    expect(streaming.rejectedDiagnostics.some((item) => item.message.includes("before the seal"))).toBe(true);
    expect(streaming.scene?.audioCues?.map((cue) => cue.id)).toEqual(["Intro", "Music"]);
  });

  it("feeds required audio readiness into assessReadiness and acceptScene", () => {
    const scene = compiled();
    const offer = { scene, sealedThroughMs: 4000 };
    expect(assessReadiness(offer, 1000)).toMatchObject({ ok: false, reason: "Required audio Voice is still loading." });
    expect(assessReadiness({ ...offer, audioStates: { Voice: "failed" } }, 1000)).toMatchObject({ ok: false, reason: "Required audio Voice failed to load." });
    // Optional music/effects never block startup.
    expect(assessReadiness({ ...offer, audioStates: { Voice: "ready", Bed: "failed", Click: "pending" } }, 1000).ok).toBe(true);

    const enabled = ["audio.cues"];
    const mark = (id: string, readiness: "pending" | "failed") => ({
      ...scene,
      resources: scene.resources.map((resource) => (resource.id === id ? { ...resource, readiness } : resource)),
    });
    expect(acceptScene(mark("Bed", "failed"), { consumer: "0.2", enabled }).ok).toBe(true);
    expect(acceptScene(mark("Voice", "pending"), { consumer: "0.2", enabled }).ok).toBe(false);
  });

  it("starts nothing until the host reports decoded resources and releases them on dispose", () => {
    const scene = compiled();
    const backend = new RecordingBackend();
    const session = createSceneAudioSession(scene, { backend });
    expect(session.readiness(0, 500)).toMatchObject({ ok: false, waitingFor: ["Voice"] });
    session.sync({ sceneTimeMs: 0, state: "playing", rate: 1 });
    expect(backend.starts).toEqual([]);
    session.setResourceState("Voice", "ready");
    session.sync({ sceneTimeMs: 10, state: "playing", rate: 1 });
    expect(backend.starts.map((start) => start.key)).toEqual(["Intro#0"]);
    session.dispose();
    expect(backend.log.filter((line) => line.startsWith("release"))).toEqual(["release Bed", "release Click", "release Voice"]);
  });
});
