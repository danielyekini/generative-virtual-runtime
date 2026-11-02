/**
 * Generative audio provider boundary (E031/E032/E033).
 * See docs/decisions/engine/generative-audio-contract.md.
 *
 * Host-facing synthesize contract, deterministic fixture provider, and a helper
 * that materialises Scene IR generative resources into an AudioSession via
 * duration revision. No vendor SDK is imported here.
 */

import {
  estimateGenerativeAudioDurationMs,
  type AudioGenerativeModality,
  type AudioGenerativeSource,
  type AudioGenerativeStyle,
  type AudioResourceDefinition,
} from "@gvr/schema";
import type { AudioDiagnostic, AudioSession } from "./audio";
import { encodeWav } from "./audio";

/** Portable FNV-1a 32-bit hex (browser + Node; not a crypto commitment). */
function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type GenerativeAudioModality = AudioGenerativeModality;
export type GenerativeAudioStyle = AudioGenerativeStyle;

export interface GenerativeAudioRequest {
  resourceId: string;
  modality: GenerativeAudioModality;
  prompt: string;
  voice?: string;
  durationHintMs?: number;
  loop?: boolean;
  seed?: number;
  style?: GenerativeAudioStyle;
  /** Host abort (dispose / replace). Fixture and live adapters must honour it. */
  signal?: AbortSignal;
}

export interface GenerativeAudioAlignment {
  characters: string[];
  startMs: number[];
  endMs: number[];
}

export interface GenerativeAudioResult {
  bytes: Uint8Array;
  durationMs: number;
  mimeType?: string;
  alignment?: GenerativeAudioAlignment;
  cacheKey: string;
}

export interface GenerativeAudioProvider {
  readonly providerId: string;
  synthesize(request: GenerativeAudioRequest): Promise<GenerativeAudioResult>;
}

/** Portable cache identity (IR + host provider/model ids). */
export function generativeCacheKey(
  request: Omit<GenerativeAudioRequest, "signal" | "resourceId">,
  providerId: string,
  providerModelId: string,
): string {
  const payload = JSON.stringify({
    modality: request.modality,
    prompt: request.prompt,
    voice: request.voice ?? null,
    durationHintMs: request.durationHintMs ?? null,
    loop: request.loop ?? false,
    seed: request.seed ?? null,
    style: request.style ?? null,
    providerId,
    providerModelId,
  });
  return `gvr-gen-${fnv1aHex(payload)}-${fnv1aHex(payload.split("").reverse().join(""))}`;
}

/** Provisional length before synthesis (alias of schema estimate). */
export function estimateProvisionalDurationMs(
  modality: GenerativeAudioModality,
  prompt: string,
  durationHintMs?: number,
): number {
  return estimateGenerativeAudioDurationMs(modality, prompt, durationHintMs);
}

/** Build a synthesize request from a Scene IR generative audio resource. */
export function generativeRequestFromResource(
  resource: AudioResourceDefinition,
  signal?: AbortSignal,
): GenerativeAudioRequest | undefined {
  if (resource.kind !== "audio" || resource.source?.type !== "generative") return undefined;
  const source: AudioGenerativeSource = resource.source;
  return {
    resourceId: resource.id,
    modality: source.modality,
    prompt: source.prompt,
    voice: source.voice,
    durationHintMs: source.durationHintMs,
    loop: source.loop,
    seed: source.seed,
    style: source.style,
    signal,
  };
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const error = new Error("Generative audio synthesis aborted.");
    error.name = "AbortError";
    throw error;
  }
}

/** Tiny mono WAV at 24 kHz for fixture bytes (silence or a soft tone). */
export function fixtureWavBytes(durationMs: number, sampleRate = 24_000, toneHz = 0): Uint8Array {
  const frames = Math.max(1, Math.round((durationMs * sampleRate) / 1000));
  const channel = new Float32Array(frames);
  if (toneHz > 0) {
    for (let i = 0; i < frames; i += 1) {
      channel[i] = 0.2 * Math.sin((2 * Math.PI * toneHz * i) / sampleRate);
    }
  }
  return encodeWav([channel], sampleRate);
}

export interface FixtureGenerativeAudioEntry {
  durationMs: number;
  mimeType?: string;
  /** Optional tone Hz; 0 / omitted = silence. */
  toneHz?: number;
  alignment?: GenerativeAudioAlignment;
}

export interface FixtureGenerativeAudioOptions {
  /** Exact prompt → fixture. Unknown prompts get a deterministic estimate. */
  fixtures?: ReadonlyMap<string, FixtureGenerativeAudioEntry> | Readonly<Record<string, FixtureGenerativeAudioEntry>>;
  providerId?: string;
  providerModelId?: string;
}

function asFixtureMap(
  fixtures: FixtureGenerativeAudioOptions["fixtures"],
): Map<string, FixtureGenerativeAudioEntry> {
  if (!fixtures) return new Map();
  if (fixtures instanceof Map) return new Map(fixtures);
  return new Map(Object.entries(fixtures));
}

/**
 * Deterministic offline provider for CI and Studio offline paths. Never calls
 * the network. Honours `signal` abort.
 */
export function createFixtureGenerativeAudioProvider(
  options: FixtureGenerativeAudioOptions = {},
): GenerativeAudioProvider {
  const fixtures = asFixtureMap(options.fixtures);
  const providerId = options.providerId ?? "fixture";
  const providerModelId = options.providerModelId ?? "fixture-v1";
  return {
    providerId,
    async synthesize(request) {
      throwIfAborted(request.signal);
      const entry = fixtures.get(request.prompt);
      const durationMs =
        entry?.durationMs ??
        estimateGenerativeAudioDurationMs(request.modality, request.prompt, request.durationHintMs);
      const bytes = fixtureWavBytes(durationMs, 24_000, entry?.toneHz ?? (request.modality === "speech" ? 220 : 0));
      throwIfAborted(request.signal);
      return {
        bytes,
        durationMs,
        mimeType: entry?.mimeType ?? "audio/wav",
        alignment: entry?.alignment,
        cacheKey: generativeCacheKey(request, providerId, providerModelId),
      };
    },
  };
}

export interface MaterializeGenerativeOptions {
  /** Initial readiness while synthesizing (default pending). */
  pendingState?: "pending";
}

/**
 * Define a provisional resource, synthesize, revise duration, mark ready (or
 * failed). Hosts own decoded-byte storage; this only updates the session.
 */
export async function materializeGenerativeResource(
  session: AudioSession,
  provider: GenerativeAudioProvider,
  request: GenerativeAudioRequest,
  _options: MaterializeGenerativeOptions = {},
): Promise<{ result?: GenerativeAudioResult; diagnostics: AudioDiagnostic[] }> {
  const provisional = estimateGenerativeAudioDurationMs(request.modality, request.prompt, request.durationHintMs);
  const defined = session.defineResource({ id: request.resourceId, durationMs: provisional }, "pending");
  if (defined.length > 0 && !defined.some((d) => d.code === "AUDIO_DUPLICATE_RESOURCE")) {
    return { diagnostics: defined };
  }

  try {
    throwIfAborted(request.signal);
    const result = await provider.synthesize(request);
    throwIfAborted(request.signal);
    const revised = session.reviseResourceDuration(request.resourceId, result.durationMs);
    if (revised.some((d) => d.code === "AUDIO_INVALID_CUE")) {
      return { result, diagnostics: revised };
    }
    session.setResourceState(request.resourceId, "ready");
    return { result, diagnostics: revised };
  } catch (error) {
    session.setResourceState(request.resourceId, "failed");
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      diagnostics: [
        {
          code: "AUDIO_RESOURCE_FAILED",
          resourceId: request.resourceId,
          message: aborted
            ? `Generative audio ${request.resourceId} was aborted.`
            : `Generative audio ${request.resourceId} failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/** True when every resource used by a required cue is ready (export gate). */
export function requiredGenerativeExportReady(session: AudioSession): boolean {
  return session.requiredResourcesReady();
}
