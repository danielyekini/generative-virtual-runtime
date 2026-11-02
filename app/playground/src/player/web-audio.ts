/**
 * Web Audio backend for the Studio player (E026). Executes AudioSession
 * commands; it never chooses frames. Scene time stays the master clock
 * (docs/decisions/engine/audible-media-clock.md).
 */
import type { AudioBackend, AudioResourceState, AudioStartCommand, DecodedAudio, SceneAudioResource } from "@gvr/runtime";

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** Context time and resource offset at the last start/rate change. */
  anchorTime: number;
  anchorOffsetMs: number;
  rate: number;
}

/** Bounded command log for agent probes and tests. */
const LOG_LIMIT = 200;

export class WebAudioBackend implements AudioBackend {
  readonly log: string[] = [];
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Map<string, Voice>();
  private loadGeneration = 0;

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  /** Lazily create the context; browsers start it suspended until a user gesture. */
  context(): AudioContext {
    this.ctx ??= this.createContext();
    return this.ctx;
  }

  /** Resume after a user gesture (play). Safe to call repeatedly. */
  resume(): void {
    const ctx = this.context();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  }

  get running(): boolean {
    return this.ctx?.state === "running";
  }

  /**
   * Fetch and decode scene resources, reporting readiness per resource.
   * A later call supersedes earlier loads (stale results are ignored).
   */
  load(resources: readonly SceneAudioResource[], report: (resourceId: string, state: AudioResourceState) => void, base = location.href): Promise<void> {
    const generation = ++this.loadGeneration;
    const ctx = this.context();
    return Promise.all(
      resources.map(async (resource) => {
        try {
          // Generative resources (audio.generative) materialise via a host provider;
          // leave them pending until href/bytes are available.
          if (!resource.href) {
            if (generation !== this.loadGeneration) return;
            this.record(`pending ${resource.id} (no href yet)`);
            report(resource.id, "pending");
            return;
          }
          const response = await fetch(new URL(resource.href, base));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
          if (generation !== this.loadGeneration) return;
          this.buffers.set(resource.id, decoded);
          this.record(`decoded ${resource.id} ${Math.round(decoded.duration * 1000)}ms`);
          report(resource.id, "ready");
        } catch (error) {
          if (generation !== this.loadGeneration) return;
          this.record(`failed ${resource.id} ${error instanceof Error ? error.message : String(error)}`);
          report(resource.id, "failed");
        }
      }),
    ).then(() => undefined);
  }

  start(command: AudioStartCommand): void {
    const buffer = this.buffers.get(command.resourceId);
    this.record(`start ${command.key} offset=${Math.round(command.offsetMs)} gain=${command.gain.toFixed(3)} rate=${command.rate} ${command.reason}`);
    if (!buffer) return;
    const ctx = this.context();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = command.rate;
    const gain = ctx.createGain();
    gain.gain.value = command.gain;
    source.connect(gain).connect(ctx.destination);
    source.start(0, Math.max(0, command.offsetMs) / 1000);
    this.voices.set(command.voiceId, { source, gain, anchorTime: ctx.currentTime, anchorOffsetMs: command.offsetMs, rate: command.rate });
  }

  stop(voiceId: string): void {
    this.record(`stop ${voiceId}`);
    const voice = this.voices.get(voiceId);
    if (!voice) return;
    this.voices.delete(voiceId);
    try {
      voice.source.stop();
    } catch {
      // Already ended.
    }
    voice.source.disconnect();
    voice.gain.disconnect();
  }

  setGain(voiceId: string, gain: number): void {
    const voice = this.voices.get(voiceId);
    if (voice) voice.gain.gain.value = gain;
  }

  setRate(voiceId: string, rate: number): void {
    this.record(`rate ${voiceId} ${rate}`);
    const voice = this.voices.get(voiceId);
    if (!voice) return;
    const position = this.position(voiceId);
    if (position !== undefined) {
      voice.anchorOffsetMs = position;
      voice.anchorTime = this.context().currentTime;
    }
    voice.rate = rate;
    voice.source.playbackRate.value = rate;
  }

  /** Measured resource position; undefined while the context is not running (no drift evidence). */
  position(voiceId: string): number | undefined {
    const voice = this.voices.get(voiceId);
    if (!voice || !this.running) return undefined;
    return voice.anchorOffsetMs + (this.context().currentTime - voice.anchorTime) * 1000 * voice.rate;
  }

  release(resourceId: string): void {
    this.record(`release ${resourceId}`);
    this.buffers.delete(resourceId);
  }

  /** Decoded sources for offline `mixAudio` export. */
  decoded(): Map<string, DecodedAudio> {
    const out = new Map<string, DecodedAudio>();
    for (const [id, buffer] of this.buffers) {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
      out.set(id, { sampleRate: buffer.sampleRate, channels });
    }
    return out;
  }

  get activeVoices(): number {
    return this.voices.size;
  }

  private record(line: string): void {
    this.log.push(line);
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
  }
}
