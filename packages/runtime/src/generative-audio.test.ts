import { describe, expect, it } from "vitest";
import { AudioSession, mixAudio, voicesAt, type DecodedAudio } from "./audio";
import {
  createFixtureGenerativeAudioProvider,
  estimateProvisionalDurationMs,
  fixtureWavBytes,
  generativeCacheKey,
  materializeGenerativeResource,
  requiredGenerativeExportReady,
} from "./generative-audio";
import { PlaybackClock } from "./playback";

function decodeFixtureWav(bytes: Uint8Array): DecodedAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const frames = view.getUint32(40, true) / (channels * 2);
  const out = Array.from({ length: channels }, () => new Float32Array(frames));
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      out[channel]![frame] = view.getInt16(offset, true) / 0x8000;
      offset += 2;
    }
  }
  return { sampleRate, channels: out };
}

describe("E032 generative audio provider + duration revision", () => {
  it("estimates provisional duration and builds stable cache keys", () => {
    expect(estimateProvisionalDurationMs("effect", "Train tracks")).toBe(2000);
    expect(estimateProvisionalDurationMs("speech", "Hi", 1500)).toBe(1500);
    expect(estimateProvisionalDurationMs("speech", "x".repeat(140))).toBe(10_000);
    const a = generativeCacheKey(
      { modality: "speech", prompt: "Hello", voice: "default" },
      "fixture",
      "fixture-v1",
    );
    const b = generativeCacheKey(
      { modality: "speech", prompt: "Hello", voice: "default" },
      "fixture",
      "fixture-v1",
    );
    const c = generativeCacheKey(
      { modality: "speech", prompt: "Hello!", voice: "default" },
      "fixture",
      "fixture-v1",
    );
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("revises resource duration without moving scene time and extends omitted cue length", () => {
    const session = new AudioSession({
      resources: [{ id: "speech", durationMs: 1000, state: "pending" }],
      cues: [{ id: "n1", resourceId: "speech", bus: "narration", startMs: 0 }],
    });
    const clock = new PlaybackClock();
    clock.setHorizon(10_000, 10_000, true);
    clock.play();
    expect(session.holdClock(clock, 500).ok).toBe(false);
    expect(clock.timeMs).toBe(0);

    expect(session.reviseResourceDuration("speech", 3000)).toEqual([]);
    session.setResourceState("speech", "ready");
    expect(session.holdClock(clock, 500).ok).toBe(true);
    expect(clock.timeMs).toBe(0);
    expect(session.schedule().resources.get("speech")!.durationMs).toBe(3000);
    expect(voicesAt(session.schedule(), 2500).map((v) => v.key)).toEqual(["n1#0"]);
  });

  it("stops mid-play voices when duration shrinks and invalidates explicit windows", () => {
    const session = new AudioSession({
      resources: [{ id: "r", durationMs: 4000, state: "ready" }],
      cues: [{ id: "long", resourceId: "r", bus: "effects", startMs: 0, required: false }],
    });
    expect(voicesAt(session.schedule(), 2500)).toHaveLength(1);
    expect(session.reviseResourceDuration("r", 1000)).toEqual([]);
    expect(voicesAt(session.schedule(), 2500)).toEqual([]);

    const tight = new AudioSession({
      resources: [{ id: "r2", durationMs: 5000, state: "ready" }],
      cues: [{ id: "need", resourceId: "r2", bus: "narration", startMs: 0, durationMs: 4000 }],
    });
    const diags = tight.reviseResourceDuration("r2", 2000);
    expect(diags.map((d) => d.code)).toEqual(["AUDIO_INVALID_CUE"]);
    expect(tight.schedule().states.get("r2")).toBe("failed");
  });

  it("drops invalid optional cues on shrink and keeps required failure separate", () => {
    const session = new AudioSession({
      resources: [{ id: "fx", durationMs: 5000, state: "ready" }],
      cues: [{ id: "opt", resourceId: "fx", bus: "effects", startMs: 0, durationMs: 4000 }],
    });
    const diags = session.reviseResourceDuration("fx", 500);
    expect(diags.map((d) => d.code)).toEqual(["AUDIO_INVALID_CUE"]);
    expect(session.hasCue("opt")).toBe(false);
    expect(session.schedule().states.get("fx")).toBe("ready");
  });

  it("materialises via fixture provider, holds until ready, and gates export", async () => {
    const provider = createFixtureGenerativeAudioProvider({
      fixtures: {
        "This is an example of what I sound like": { durationMs: 2500, toneHz: 220 },
        "Train tracks": { durationMs: 1800 },
      },
    });
    const session = new AudioSession();
    const pending = materializeGenerativeResource(session, provider, {
      resourceId: "narr",
      modality: "speech",
      prompt: "This is an example of what I sound like",
    });
    session.addCues([{ id: "n1", resourceId: "narr", bus: "narration", startMs: 0 }]);
    expect(requiredGenerativeExportReady(session)).toBe(false);

    const { result, diagnostics } = await pending;
    expect(diagnostics).toEqual([]);
    expect(result?.durationMs).toBe(2500);
    expect(result?.bytes.byteLength).toBeGreaterThan(44);
    expect(session.schedule().states.get("narr")).toBe("ready");
    expect(requiredGenerativeExportReady(session)).toBe(true);

    const sources = new Map([["narr", decodeFixtureWav(result!.bytes)]]);
    const mixed = mixAudio(session.schedule(), sources, { startMs: 0, endMs: 2500, sampleRate: 24_000, channels: 1 });
    expect(mixed[0]!.some((sample) => sample !== 0)).toBe(true);
  });

  it("aborts in-flight synthesis and marks the resource failed", async () => {
    const controller = new AbortController();
    const slow = createFixtureGenerativeAudioProvider();
    const session = new AudioSession();
    const pending = materializeGenerativeResource(session, slow, {
      resourceId: "x",
      modality: "effect",
      prompt: "Birds tweeting",
      signal: controller.signal,
    });
    controller.abort();
    const { diagnostics } = await pending;
    expect(diagnostics.map((d) => d.code)).toEqual(["AUDIO_RESOURCE_FAILED"]);
    expect(session.schedule().states.get("x")).toBe("failed");
  });

  it("builds fixture WAV headers for the requested duration", () => {
    const bytes = fixtureWavBytes(1000, 24_000);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint32(40, true)).toBe(24_000 * 2);
  });
});
