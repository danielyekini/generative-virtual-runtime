import { describe, expect, it } from "vitest";
import {
  AudioSession,
  encodeWav,
  mixAudio,
  voicesAt,
  type AudioBackend,
  type AudioCommand,
  type AudioCue,
  type AudioStartCommand,
  type DecodedAudio,
} from "./audio";
import { PlaybackClock } from "./playback";

/** Narrated lesson: required narration, an optional click effect and a looping music bed. */
const RESOURCES = [
  { id: "narr", durationMs: 4000 },
  { id: "click", durationMs: 200 },
  { id: "bed", durationMs: 1000 },
];
const CUES: AudioCue[] = [
  { id: "bed", resourceId: "bed", bus: "music", startMs: 0, loops: 6, gain: 0.5 },
  { id: "line1", resourceId: "narr", bus: "narration", startMs: 500 },
  { id: "tap", resourceId: "click", bus: "effects", startMs: 1000 },
];

class FakeBackend implements AudioBackend {
  readonly log: string[] = [];
  readonly playing = new Map<string, AudioStartCommand>();
  readonly released: string[] = [];
  skewMs = 0;
  start(command: AudioStartCommand): void {
    this.playing.set(command.voiceId, command);
    this.log.push(`start ${command.key} @${command.offsetMs} ${command.reason}`);
  }
  stop(voiceId: string): void {
    this.playing.delete(voiceId);
    this.log.push(`stop ${voiceId}`);
  }
  setGain(voiceId: string, gain: number): void {
    this.log.push(`gain ${voiceId} ${gain.toFixed(3)}`);
  }
  setRate(voiceId: string, rate: number): void {
    this.log.push(`rate ${voiceId} ${rate}`);
  }
  position(_voiceId: string): number | undefined {
    return undefined;
  }
  release(resourceId: string): void {
    this.released.push(resourceId);
  }
}

function lesson(states: Record<string, "pending" | "ready" | "failed"> = {}, backend?: AudioBackend) {
  return new AudioSession({
    resources: RESOURCES.map((resource) => ({ ...resource, state: states[resource.id] ?? "ready" })),
    cues: CUES,
    backend,
  });
}

function clockAt(durationMs = 6000): PlaybackClock {
  const clock = new PlaybackClock();
  clock.setHorizon(durationMs, durationMs, true);
  return clock;
}

const starts = (commands: AudioCommand[]) => commands.filter((c): c is AudioStartCommand => c.type === "start");

describe("E008 audible media clock", () => {
  it("derives voices, loop offsets, fades and narration ducking purely from scene time", () => {
    const schedule = lesson().schedule();
    expect(voicesAt(schedule, 250).map((v) => [v.key, v.offsetMs, v.gain])).toEqual([["bed#0", 250, 0.5]]);
    const at1100 = voicesAt(schedule, 1100);
    expect(at1100.map((v) => v.key)).toEqual(["bed#1", "line1#0", "tap#0"]);
    expect(at1100.find((v) => v.cueId === "bed")!.gain).toBeCloseTo(0.5 * 0.35);
    expect(at1100.find((v) => v.cueId === "tap")!.gain).toBeCloseTo(0.35);
    expect(at1100.find((v) => v.cueId === "line1")!.offsetMs).toBe(600);
    expect(voicesAt(schedule, 2500).find((v) => v.cueId === "bed")).toMatchObject({ key: "bed#2", offsetMs: 500 });
    expect(voicesAt(schedule, 6000)).toEqual([]);

    const faded = new AudioSession({ resources: [{ id: "r", durationMs: 1000, state: "ready" }], cues: [{ id: "f", resourceId: "r", bus: "music", startMs: 0, fadeInMs: 200, fadeOutMs: 400 }] }).schedule();
    expect(voicesAt(faded, 100)[0]!.gain).toBeCloseTo(0.5);
    expect(voicesAt(faded, 500)[0]!.gain).toBeCloseTo(1);
    expect(voicesAt(faded, 900)[0]!.gain).toBeCloseTo(0.25);
  });

  it("holds the clock while required narration loads and resumes at the same scene time", () => {
    const session = lesson({ narr: "pending" });
    const clock = clockAt();
    clock.play();
    expect(session.holdClock(clock, 1000)).toEqual({ ok: false, waitingFor: ["narr"], failed: [] });
    expect(clock.playbackState).toBe("paused");
    expect(session.holding).toBe(true);
    clock.tick(500);
    expect(clock.timeMs).toBe(0);
    session.setResourceState("narr", "ready");
    expect(session.holdClock(clock, 1000).ok).toBe(true);
    expect(clock.playbackState).toBe("playing");
    expect(clock.timeMs).toBe(0);
    expect(session.diagnostics.map((d) => d.code)).toEqual(["AUDIO_RESOURCE_PENDING"]);

    // A user pause is never undone by the gate.
    clock.pause();
    session.holdClock(clock, 1000);
    expect(clock.playbackState).toBe("paused");
  });

  it("reports failed required narration as blocking and skips failed optional effects", () => {
    const session = lesson({ narr: "failed", click: "failed" });
    expect(session.readiness(0, 1000)).toEqual({ ok: false, waitingFor: [], failed: ["narr"] });
    expect(session.readiness(4600, 1000).ok).toBe(true);
    const commands = session.sync({ sceneTimeMs: 1050, state: "playing", rate: 1 });
    expect(starts(commands).map((c) => c.key)).toEqual(["bed#1"]);
    expect(session.diagnostics.map((d) => d.code)).toEqual(["AUDIO_OPTIONAL_SKIPPED"]);
  });

  it("follows pause, seek, resume, loop boundaries and cue ends with backend commands", () => {
    const backend = new FakeBackend();
    const session = lesson({}, backend);
    const clock = clockAt();
    clock.play();
    const sync = () => session.sync({ sceneTimeMs: clock.timeMs, state: clock.playbackState, rate: clock.playbackRate });

    expect(starts(sync()).map((c) => [c.key, c.offsetMs, c.reason])).toEqual([["bed#0", 0, "enter"]]);
    clock.tick(600);
    expect(starts(sync()).map((c) => [c.key, c.offsetMs])).toEqual([["line1#0", 100]]);
    clock.tick(450); // 1050: loop wrap of the bed and the click effect
    const wrap = sync();
    expect(wrap.filter((c) => c.type === "stop").map((c) => c.type === "stop" && c.reason)).toEqual(["ended"]);
    expect(starts(wrap).map((c) => c.key)).toEqual(["bed#1", "tap#0"]);
    clock.tick(200); // 1250: tap ended
    expect(sync().filter((c) => c.type === "stop").map((c) => c.type === "stop" && c.key)).toEqual(["tap#0"]);

    clock.pause();
    const paused = sync();
    expect(paused.every((c) => c.type === "stop" && c.reason === "silenced")).toBe(true);
    expect(backend.playing.size).toBe(0);

    clock.seek(3000);
    expect(sync()).toEqual([]);
    clock.play();
    expect(starts(sync()).map((c) => [c.key, c.offsetMs, c.reason])).toEqual([
      ["bed#3", 0, "resume"],
      ["line1#0", 2500, "resume"],
    ]);

    clock.seek(1600); // seek while playing: same keys, wrong positions -> resync
    const resync = sync();
    expect(starts(resync).map((c) => [c.key, c.offsetMs, c.reason])).toEqual([
      ["line1#0", 1100, "resync"],
      ["bed#1", 600, "enter"],
    ]);

    clock.tick(5000);
    expect(clock.playbackState).toBe("complete");
    sync();
    expect(backend.playing.size).toBe(0);
  });

  it("detects forward seeks and scene loop wraps from wall time, and honours host seek flags", () => {
    const session = new AudioSession({ resources: [{ id: "narr", durationMs: 4000, state: "ready" }], cues: [{ id: "n", resourceId: "narr", bus: "narration", startMs: 0 }] });
    session.sync({ sceneTimeMs: 0, state: "playing", rate: 1 });
    expect(session.sync({ sceneTimeMs: 16, state: "playing", rate: 1, wallDeltaMs: 16 })).toEqual([]);
    // Forward jump of 1 s in 16 ms of wall time: a seek.
    expect(starts(session.sync({ sceneTimeMs: 1032, state: "playing", rate: 1, wallDeltaMs: 16 }))).toMatchObject([{ offsetMs: 1032, reason: "resync" }]);
    // Rate 2 advances the voice twice as fast: continuous, no command.
    session.sync({ sceneTimeMs: 1032, state: "playing", rate: 2, wallDeltaMs: 0 });
    expect(session.sync({ sceneTimeMs: 1064, state: "playing", rate: 2, wallDeltaMs: 16 })).toEqual([]);
    expect(starts(session.sync({ sceneTimeMs: 1070, state: "playing", rate: 2, seeked: true }))).toMatchObject([{ offsetMs: 1070, reason: "resync" }]);
  });

  it("is silent for reverse and out-of-range rates and resumes when the rate returns", () => {
    const backend = new FakeBackend();
    const session = lesson({}, backend);
    session.sync({ sceneTimeMs: 600, state: "playing", rate: 1 });
    expect(backend.playing.size).toBe(2);
    const rated = session.sync({ sceneTimeMs: 610, state: "playing", rate: 1.5 });
    expect(rated.filter((c) => c.type === "rate")).toHaveLength(2);
    session.sync({ sceneTimeMs: 620, state: "playing", rate: -1 });
    expect(backend.playing.size).toBe(0);
    session.sync({ sceneTimeMs: 630, state: "playing", rate: 4 });
    expect(session.diagnostics.map((d) => d.code)).toEqual(["AUDIO_RATE_SILENT", "AUDIO_RATE_SILENT"]);
    expect(starts(session.sync({ sceneTimeMs: 640, state: "playing", rate: 1 })).map((c) => c.offsetMs)).toEqual([640, 140]);
  });

  it("re-seeks a voice whose measured position drifts beyond tolerance", () => {
    const backend = new FakeBackend();
    let skew = 0;
    backend.position = (voiceId: string) => {
      const command = backend.playing.get(voiceId);
      return command ? command.offsetMs + skew : undefined;
    };
    const session = new AudioSession({ resources: [{ id: "narr", durationMs: 4000, state: "ready" }], cues: [{ id: "n", resourceId: "narr", bus: "narration", startMs: 0 }], backend, toleranceMs: 40 });
    session.sync({ sceneTimeMs: 0, state: "playing", rate: 1 });
    // The fake reports start offset + skew; emulate a voice that has lagged 100 ms behind 500 ms of scene time.
    skew = 400;
    const commands = session.sync({ sceneTimeMs: 500, state: "playing", rate: 1 });
    expect(commands.map((c) => c.type)).toEqual(["stop", "start"]);
    expect(starts(commands)[0]).toMatchObject({ reason: "drift", offsetMs: 500 });
    skew = 10;
    expect(session.sync({ sceneTimeMs: 520, state: "playing", rate: 1 })).toEqual([]);
  });

  it("stays silent while waiting for streamed content and plays cues appended after a seal", () => {
    const session = new AudioSession({ resources: [{ id: "narr", durationMs: 4000, state: "ready" }] });
    const clock = new PlaybackClock();
    clock.setHorizon(1000, 5000, false);
    clock.play();
    clock.tick(1200);
    expect(clock.playbackState).toBe("waiting_for_content");
    expect(session.sync({ sceneTimeMs: clock.timeMs, state: clock.playbackState, rate: 1 })).toEqual([]);
    expect(session.addCues([{ id: "late", resourceId: "narr", bus: "narration", startMs: 900 }])).toEqual([]);
    clock.setHorizon(3000, 5000, false);
    expect(clock.playbackState).toBe("playing");
    expect(starts(session.sync({ sceneTimeMs: clock.timeMs, state: clock.playbackState, rate: 1 })).map((c) => [c.key, c.offsetMs, c.reason])).toEqual([["late#0", 100, "resume"]]);
  });

  it("logs interaction-triggered one-shots and validates cues", () => {
    const session = lesson();
    expect(session.trigger({ id: "press-1", resourceId: "click", bus: "effects" }, 2000)).toEqual([]);
    expect(session.triggerLog).toEqual([{ cueId: "press-1", atMs: 2000 }]);
    expect(starts(session.sync({ sceneTimeMs: 2050, state: "playing", rate: 1 })).map((c) => [c.key, c.offsetMs])).toContainEqual(["press-1#0", 50]);
    const codes = session
      .addCues([
        { id: "press-1", resourceId: "click", bus: "effects", startMs: 0 },
        { id: "x", resourceId: "missing", bus: "effects", startMs: 0 },
        { id: "y", resourceId: "click", bus: "effects", startMs: -1 },
        { id: "z", resourceId: "click", bus: "effects", startMs: 0, durationMs: 500 },
        { id: "w", resourceId: "click", bus: "effects", startMs: 0, loops: 1.5 },
      ])
      .map((d) => d.code);
    expect(codes).toEqual(["AUDIO_DUPLICATE_CUE", "AUDIO_UNKNOWN_RESOURCE", "AUDIO_INVALID_CUE", "AUDIO_INVALID_CUE", "AUDIO_INVALID_CUE"]);
    const bounded = new AudioSession({ resources: [{ id: "r", durationMs: 10, state: "ready" }], maxCues: 1 });
    bounded.addCues([{ id: "a", resourceId: "r", bus: "effects", startMs: 0 }]);
    expect(bounded.trigger({ id: "b", resourceId: "r", bus: "effects" }, 5).map((d) => d.code)).toEqual(["AUDIO_CUE_LIMIT"]);
    expect(bounded.triggerLog).toEqual([]);
  });

  it("cancels and disposes: voices stop, resources release, later use throws", () => {
    const backend = new FakeBackend();
    const session = lesson({}, backend);
    session.sync({ sceneTimeMs: 1050, state: "playing", rate: 1 });
    expect(backend.playing.size).toBe(3);
    expect(session.stopAll()).toHaveLength(3);
    expect(backend.playing.size).toBe(0);
    session.sync({ sceneTimeMs: 1060, state: "playing", rate: 1 });
    const disposed = session.dispose();
    expect(disposed.filter((c) => c.type === "stop")).toHaveLength(3);
    expect(backend.released).toEqual(["bed", "click", "narr"]);
    expect(backend.playing.size).toBe(0);
    expect(session.dispose()).toEqual([]);
    expect(() => session.sync({ sceneTimeMs: 0, state: "playing", rate: 1 })).toThrow(/disposed/);
  });

  it("exports a deterministic mixdown that matches live voice gains and offsets", () => {
    const sampleRate = 1000;
    const ramp = (ms: number): DecodedAudio => ({ sampleRate, channels: [Float32Array.from({ length: ms }, (_, i) => i / ms)] });
    const dc = (ms: number, value: number): DecodedAudio => ({ sampleRate, channels: [new Float32Array(ms).fill(value)] });
    const sources = new Map<string, DecodedAudio>([
      ["narr", ramp(4000)],
      ["click", dc(200, 0.5)],
      ["bed", dc(1000, 0.2)],
    ]);
    const session = lesson();
    session.trigger({ id: "press", resourceId: "click", bus: "effects" }, 5000);
    const schedule = session.schedule();
    const mix = mixAudio(schedule, sources, { startMs: 0, endMs: 6000, sampleRate, channels: 2 });
    expect(mix).toHaveLength(2);
    expect(mix[0]).toHaveLength(6000);
    for (const t of [100, 700, 1100, 2500, 4400, 5100]) {
      const expected = voicesAt(schedule, t).reduce((sum, voice) => {
        const source = sources.get(voice.resourceId)!.channels[0]!;
        return sum + source[Math.floor(voice.offsetMs)]! * voice.gain;
      }, 0);
      expect(mix[0]![t]).toBeCloseTo(expected, 5);
      expect(mix[1]![t]).toBeCloseTo(expected, 5);
    }
    expect(mix[0]![100]).toBeCloseTo(0.1);
    expect(mix[0]![1100]).toBeCloseTo(0.2 * 0.5 * 0.35 + 0.5 * 0.35 + 600 / 4000);
    const again = mixAudio(lesson().schedule(), sources, { startMs: 0, endMs: 6000, sampleRate, channels: 2 });
    expect(again[0]![5100]).toBeCloseTo(0.1); // without the trigger only the bed sounds
    expect(Array.from(mixAudio(schedule, sources, { startMs: 0, endMs: 6000, sampleRate, channels: 2 })[0]!)).toEqual(Array.from(mix[0]!));

    const wav = encodeWav(mix, sampleRate);
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(sampleRate);
    expect(view.getUint32(40, true)).toBe(6000 * 2 * 2);
    expect(view.getInt16(44 + 100 * 4, true)).toBe(Math.round(mix[0]![100]! * 0x7fff));
  });
});
