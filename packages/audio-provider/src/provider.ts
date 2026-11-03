/**
 * Host generative-audio provider package (public id `@gvr/audio-provider`).
 * Default backend is ElevenLabs (authorised first provider); REST mapping stays
 * an internal factory option. Portable fields:
 * docs/decisions/engine/generative-audio-contract.md.
 *
 * Secrets stay with the host. Pass `apiKey` (or a getter) from Studio / env —
 * never from MotionScript, Scene IR, or the repository. Optional local probe:
 * `GVR_ELEVENLABS_API_KEY` (+ optional `GVR_ELEVENLABS_VOICE_ID`).
 */

import {
  generativeCacheKey,
  type GenerativeAudioAlignment,
  type GenerativeAudioProvider,
  type GenerativeAudioRequest,
  type GenerativeAudioResult,
} from "@gvr/runtime";
import { durationMsFromWavOrPcm } from "./wav";

export type ElevenLabsOutputFormat = "wav_24000" | "pcm_24000";

export interface ElevenLabsGenerativeAudioOptions {
  /** API key string or host getter. Missing/empty fails closed. */
  apiKey: string | (() => string | undefined);
  /**
   * Portable `voice` string → ElevenLabs `voice_id`. Unknown voices fail;
   * they are never silently substituted.
   */
  voiceTable?: Readonly<Record<string, string>>;
  /** Used when the request omits `voice`. Required for speech. */
  defaultSpeechVoiceId?: string;
  baseUrl?: string;
  /** Injected for tests; defaults to global fetch. */
  fetch?: typeof fetch;
  outputFormat?: ElevenLabsOutputFormat;
  speechModelId?: string;
  effectModelId?: string;
  providerId?: string;
}

const DEFAULT_BASE = "https://api.elevenlabs.io";
const DEFAULT_SPEECH_MODEL = "eleven_multilingual_v2";
const DEFAULT_EFFECT_MODEL = "eleven_text_to_sound_v3";

function resolveApiKey(apiKey: ElevenLabsGenerativeAudioOptions["apiKey"]): string {
  const value = typeof apiKey === "function" ? apiKey() : apiKey;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("ElevenLabs API key is missing. Inject xi-api-key from the host secret store (e.g. GVR_ELEVENLABS_API_KEY).");
  }
  return value.trim();
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const error = new Error("ElevenLabs generative audio synthesis aborted.");
    error.name = "AbortError";
    throw error;
  }
}

function resolveVoiceId(request: GenerativeAudioRequest, options: ElevenLabsGenerativeAudioOptions): string {
  const table = options.voiceTable ?? {};
  if (request.voice !== undefined) {
    const mapped = table[request.voice];
    if (!mapped) {
      throw new Error(
        `Unknown portable voice "${request.voice}". Map it in the host voice table; ElevenLabs will not substitute a default.`,
      );
    }
    return mapped;
  }
  if (options.defaultSpeechVoiceId && options.defaultSpeechVoiceId.length > 0) {
    return options.defaultSpeechVoiceId;
  }
  throw new Error("Speech synthesis needs a portable voice (mapped in the host voice table) or defaultSpeechVoiceId.");
}

interface TimestampResponse {
  audio_base64?: string;
  alignment?: {
    characters?: string[];
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  };
}

function decodeBase64(text: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(text, "base64"));
  }
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function alignmentFromResponse(raw: TimestampResponse["alignment"]): GenerativeAudioAlignment | undefined {
  if (!raw?.characters || !raw.character_start_times_seconds || !raw.character_end_times_seconds) {
    return undefined;
  }
  return {
    characters: [...raw.characters],
    startMs: raw.character_start_times_seconds.map((seconds) => Math.round(seconds * 1000)),
    endMs: raw.character_end_times_seconds.map((seconds) => Math.round(seconds * 1000)),
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 400) || response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

/** Options for the public host factory (vendor-neutral entry). */
export type GenerativeAudioProviderOptions = ElevenLabsGenerativeAudioOptions & {
  /** Authorised backends. Default `"elevenlabs"`. */
  backend?: "elevenlabs";
};

/**
 * Create a host generative audio provider. Primary public entry — does not
 * hard-wire a vendor brand into the import path. Default backend is ElevenLabs.
 */
export function createGenerativeAudioProvider(
  options: GenerativeAudioProviderOptions,
): GenerativeAudioProvider {
  const backend = options.backend ?? "elevenlabs";
  if (backend !== "elevenlabs") {
    throw new Error(`Unsupported generative audio backend "${String(backend)}".`);
  }
  return createElevenLabsGenerativeAudioProvider(options);
}

/**
 * Explicit ElevenLabs backend factory (internal/backend option). Prefer
 * `createGenerativeAudioProvider` for ordinary hosts.
 */
export function createElevenLabsGenerativeAudioProvider(
  options: ElevenLabsGenerativeAudioOptions,
): GenerativeAudioProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;
  const outputFormat = options.outputFormat ?? "wav_24000";
  const speechModelId = options.speechModelId ?? DEFAULT_SPEECH_MODEL;
  const effectModelId = options.effectModelId ?? DEFAULT_EFFECT_MODEL;
  const providerId = options.providerId ?? "elevenlabs";

  return {
    providerId,
    async synthesize(request: GenerativeAudioRequest): Promise<GenerativeAudioResult> {
      throwIfAborted(request.signal);
      const apiKey = resolveApiKey(options.apiKey);
      throwIfAborted(request.signal);

      if (request.modality === "speech") {
        return synthesizeSpeech(request, {
          apiKey,
          baseUrl,
          doFetch,
          outputFormat,
          speechModelId,
          providerId,
          options,
        });
      }
      return synthesizeEffect(request, {
        apiKey,
        baseUrl,
        doFetch,
        outputFormat,
        effectModelId,
        providerId,
      });
    },
  };
}

interface CallContext {
  apiKey: string;
  baseUrl: string;
  doFetch: typeof fetch;
  outputFormat: ElevenLabsOutputFormat;
  providerId: string;
}

async function synthesizeSpeech(
  request: GenerativeAudioRequest,
  ctx: CallContext & { speechModelId: string; options: ElevenLabsGenerativeAudioOptions },
): Promise<GenerativeAudioResult> {
  const voiceId = resolveVoiceId(request, ctx.options);
  const url = `${ctx.baseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${ctx.outputFormat}`;
  const body: Record<string, unknown> = {
    text: request.prompt,
    model_id: ctx.speechModelId,
  };
  if (request.style || request.seed !== undefined) {
    const settings: Record<string, number> = {};
    if (request.style?.stability !== undefined) settings.stability = request.style.stability;
    if (request.style?.similarity !== undefined) settings.similarity_boost = request.style.similarity;
    if (request.style?.speed !== undefined) settings.speed = request.style.speed;
    if (Object.keys(settings).length > 0) body.voice_settings = settings;
  }
  if (request.seed !== undefined) body.seed = request.seed;

  const response = await ctx.doFetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ctx.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });
  throwIfAborted(request.signal);
  if (!response.ok) {
    throw new Error(`ElevenLabs speech failed (${response.status}): ${await readError(response)}`);
  }
  const json = (await response.json()) as TimestampResponse;
  if (typeof json.audio_base64 !== "string" || json.audio_base64.length === 0) {
    throw new Error("ElevenLabs speech response missing audio_base64.");
  }
  const bytes = decodeBase64(json.audio_base64);
  const { durationMs, mimeType } = durationMsFromWavOrPcm(bytes, ctx.outputFormat);
  return {
    bytes,
    durationMs,
    mimeType,
    alignment: alignmentFromResponse(json.alignment),
    cacheKey: generativeCacheKey(request, ctx.providerId, ctx.speechModelId),
  };
}

async function synthesizeEffect(
  request: GenerativeAudioRequest,
  ctx: CallContext & { effectModelId: string },
): Promise<GenerativeAudioResult> {
  const url = `${ctx.baseUrl}/v1/sound-generation?output_format=${ctx.outputFormat}`;
  const body: Record<string, unknown> = {
    text: request.prompt,
    model_id: ctx.effectModelId,
  };
  if (request.durationHintMs !== undefined && request.durationHintMs > 0) {
    body.duration_seconds = request.durationHintMs / 1000;
  }
  if (request.loop !== undefined) body.loop = request.loop;
  if (request.style?.stability !== undefined) body.prompt_influence = request.style.stability;

  const response = await ctx.doFetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ctx.apiKey,
      Accept: "audio/wav, application/octet-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });
  throwIfAborted(request.signal);
  if (!response.ok) {
    throw new Error(`ElevenLabs sound-generation failed (${response.status}): ${await readError(response)}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  const { durationMs, mimeType } = durationMsFromWavOrPcm(buffer, ctx.outputFormat);
  return {
    bytes: buffer,
    durationMs,
    mimeType,
    cacheKey: generativeCacheKey(request, ctx.providerId, ctx.effectModelId),
  };
}

/** Read API key from the optional local-probe env var (never required for CI). */
export function apiKeyFromEnv(env: Record<string, string | undefined> = process.env): string | undefined {
  const value = env.GVR_ELEVENLABS_API_KEY;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
