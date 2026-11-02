import { describe, expect, it, vi } from "vitest";
import { encodeWav, generativeCacheKey } from "@gvr/runtime";
import { apiKeyFromEnv, createElevenLabsGenerativeAudioProvider } from "./provider";
import { durationMsFromWavOrPcm } from "./wav";

function tinyWav(durationMs = 250): Uint8Array {
  const frames = Math.max(1, Math.round((durationMs * 24_000) / 1000));
  return encodeWav([new Float32Array(frames)], 24_000);
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

describe("@gvr/audio-elevenlabs", () => {
  it("synthesises speech via with-timestamps and maps portable voices", async () => {
    const wav = tinyWav(400);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("/v1/text-to-speech/voice-abc/with-timestamps");
      expect(url).toContain("output_format=wav_24000");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
      const body = JSON.parse(String(init?.body));
      expect(body.text).toBe("Hello world");
      expect(body.voice_settings).toEqual({ stability: 0.4, similarity_boost: 0.7, speed: 1.1 });
      return new Response(
        JSON.stringify({
          audio_base64: b64(wav),
          alignment: {
            characters: ["H", "i"],
            character_start_times_seconds: [0, 0.1],
            character_end_times_seconds: [0.1, 0.2],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const provider = createElevenLabsGenerativeAudioProvider({
      apiKey: "test-key",
      voiceTable: { narrator: "voice-abc" },
      fetch: fetchMock as typeof fetch,
    });
    const result = await provider.synthesize({
      resourceId: "n1",
      modality: "speech",
      prompt: "Hello world",
      voice: "narrator",
      style: { stability: 0.4, similarity: 0.7, speed: 1.1 },
    });
    expect(result.durationMs).toBe(400);
    expect(result.mimeType).toBe("audio/wav");
    expect(result.bytes.byteLength).toBe(wav.byteLength);
    expect(result.alignment).toEqual({
      characters: ["H", "i"],
      startMs: [0, 100],
      endMs: [100, 200],
    });
    expect(result.cacheKey).toBe(
      generativeCacheKey(
        { modality: "speech", prompt: "Hello world", voice: "narrator", style: { stability: 0.4, similarity: 0.7, speed: 1.1 } },
        "elevenlabs",
        "eleven_multilingual_v2",
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("synthesises effects via sound-generation with duration and loop", async () => {
    const wav = tinyWav(500);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("/v1/sound-generation");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        text: "Train tracks",
        model_id: "eleven_text_to_sound_v3",
        duration_seconds: 3,
        loop: true,
      });
      return new Response(Buffer.from(wav), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });
    });

    const provider = createElevenLabsGenerativeAudioProvider({
      apiKey: () => "test-key",
      fetch: fetchMock as typeof fetch,
    });
    const result = await provider.synthesize({
      resourceId: "e1",
      modality: "effect",
      prompt: "Train tracks",
      durationHintMs: 3000,
      loop: true,
    });
    expect(result.durationMs).toBe(500);
    expect(result.bytes.byteLength).toBe(wav.byteLength);
  });

  it("fails closed on missing key, unknown voice, HTTP errors and abort", async () => {
    await expect(
      createElevenLabsGenerativeAudioProvider({ apiKey: "" }).synthesize({
        resourceId: "n1",
        modality: "speech",
        prompt: "x",
        voice: "narrator",
      }),
    ).rejects.toThrow(/API key is missing/);

    await expect(
      createElevenLabsGenerativeAudioProvider({
        apiKey: "k",
        voiceTable: {},
        fetch: vi.fn() as unknown as typeof fetch,
      }).synthesize({ resourceId: "n1", modality: "speech", prompt: "x", voice: "missing" }),
    ).rejects.toThrow(/Unknown portable voice/);

    const failing = createElevenLabsGenerativeAudioProvider({
      apiKey: "k",
      defaultSpeechVoiceId: "v1",
      fetch: vi.fn(async () => new Response("nope", { status: 401 })) as unknown as typeof fetch,
    });
    await expect(failing.synthesize({ resourceId: "n1", modality: "speech", prompt: "x" })).rejects.toThrow(
      /speech failed \(401\)/,
    );

    const controller = new AbortController();
    controller.abort();
    await expect(
      createElevenLabsGenerativeAudioProvider({
        apiKey: "k",
        defaultSpeechVoiceId: "v1",
        fetch: vi.fn() as unknown as typeof fetch,
      }).synthesize({ resourceId: "n1", modality: "speech", prompt: "x", signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reads duration from wav/pcm and ignores empty env keys", () => {
    const wav = tinyWav(120);
    expect(durationMsFromWavOrPcm(wav, "wav_24000").durationMs).toBe(120);
    expect(durationMsFromWavOrPcm(new Uint8Array(4800), "pcm_24000").durationMs).toBe(100);
    expect(apiKeyFromEnv({ GVR_ELEVENLABS_API_KEY: "  secret  " })).toBe("secret");
    expect(apiKeyFromEnv({ GVR_ELEVENLABS_API_KEY: "" })).toBeUndefined();
  });
});
