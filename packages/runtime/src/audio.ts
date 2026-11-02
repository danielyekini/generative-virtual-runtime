import type { AudioCueDefinition, SceneIR } from "@gvr/schema";
import type { PlaybackClock, PlaybackState } from "./playback";

/**
 * E008 audible media clock prototype. See docs/decisions/engine/audible-media-clock.md.
 *
 * Scene time is the master clock. Audio is a pure schedule over scene time:
 * which cue is audible at t, at which resource offset and gain. A host backend
 * (Web Audio, native mixer, test fake) executes start/stop/gain/rate commands;
 * `AudioSession.sync` reconciles the desired voice set against running voices
 * and re-seeks a voice whose position drifts beyond tolerance. Offline export
 * mixes the same schedule sample by sample, so live and exported audio share
 * one gain/offset function.
 *
 * Scenes declare resources and cues with Scene IR 0.11.0 `audio.cues`;
 * `createSceneAudioSession` lowers them into a session (E026).
 */

export type AudioBus = "narration" | "effects" | "music";
export const AUDIO_BUSES: readonly AudioBus[] = ["narration", "effects", "music"];

export type AudioResourceState = "pending" | "ready" | "failed";

export interface AudioResource {
  id: string;
  /** Decoded length of the resource in milliseconds. */
  durationMs: number;
}

export interface AudioCue {
  id: string;
  resourceId: string;
  bus: AudioBus;
  /** Scene time at which the cue begins. */
  startMs: number;
  /** Start position inside the resource (default 0). */
  offsetMs?: number;
  /** Length of one play (default: resource duration minus offset). */
  durationMs?: number;
  /** Total plays, integer 1..1000 (default 1). */
  loops?: number;
  /** Linear cue gain 0..4 (default 1). */
  gain?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  /** A required cue blocks playback while pending and is fatal when failed. Default: bus is narration. */
  required?: boolean;
}

export type AudioDiagnosticCode =
  | "AUDIO_INVALID_CUE"
  | "AUDIO_DUPLICATE_CUE"
  | "AUDIO_UNKNOWN_RESOURCE"
  | "AUDIO_DUPLICATE_RESOURCE"
  | "AUDIO_CUE_LIMIT"
  | "AUDIO_RESOURCE_PENDING"
  | "AUDIO_RESOURCE_FAILED"
  | "AUDIO_OPTIONAL_SKIPPED"
  | "AUDIO_RATE_SILENT";

export interface AudioDiagnostic {
  code: AudioDiagnosticCode;
  message: string;
  cueId?: string;
  resourceId?: string;
}

export interface AudioMixSettings {
  /** Linear gain per bus (default 1 each). */
  busGain?: Partial<Record<AudioBus, number>>;
  /** Gain applied to effects/music while a narration cue is audible (default 0.35). */
  duckGain?: number;
}

/** Immutable snapshot of everything the schedule depends on. */
export interface AudioSchedule {
  cues: readonly AudioCue[];
  resources: ReadonlyMap<string, AudioResource>;
  states: ReadonlyMap<string, AudioResourceState>;
  busGain: Readonly<Record<AudioBus, number>>;
  duckGain: number;
}

export interface AudioVoice {
  /** Stable per cue and loop iteration. */
  key: string;
  cueId: string;
  resourceId: string;
  bus: AudioBus;
  iteration: number;
  /** Position inside the resource at the queried scene time. */
  offsetMs: number;
  gain: number;
}

export interface AudioReadiness {
  ok: boolean;
  /** Required resources still loading inside the window. */
  waitingFor: string[];
  /** Required resources that failed inside the window. Fatal for the cue. */
  failed: string[];
}

// ---------------------------------------------------------------------------
// Pure schedule

function playLength(cue: AudioCue, resource: AudioResource): number {
  const offset = cue.offsetMs ?? 0;
  return cue.durationMs ?? Math.max(0, resource.durationMs - offset);
}

/** Total scene-time span of a cue including loops. */
export function cueSpanMs(cue: AudioCue, resource: AudioResource): number {
  return playLength(cue, resource) * (cue.loops ?? 1);
}

export function isRequired(cue: AudioCue): boolean {
  return cue.required ?? cue.bus === "narration";
}

function fadeFactor(cue: AudioCue, local: number, span: number): number {
  let factor = 1;
  const fadeIn = cue.fadeInMs ?? 0;
  const fadeOut = cue.fadeOutMs ?? 0;
  if (fadeIn > 0 && local < fadeIn) factor = Math.min(factor, local / fadeIn);
  if (fadeOut > 0 && span - local < fadeOut) factor = Math.min(factor, (span - local) / fadeOut);
  return Math.max(0, factor);
}

function audible(schedule: AudioSchedule, cue: AudioCue, t: number): boolean {
  const resource = schedule.resources.get(cue.resourceId);
  if (!resource || schedule.states.get(cue.resourceId) !== "ready") return false;
  const span = cueSpanMs(cue, resource);
  return span > 0 && t >= cue.startMs && t < cue.startMs + span;
}

/** True when any narration cue is audible at t (drives ducking). */
export function narrationActiveAt(schedule: AudioSchedule, t: number): boolean {
  return schedule.cues.some((cue) => cue.bus === "narration" && audible(schedule, cue, t));
}

/** Voice for one cue at scene time t, or undefined when silent. */
export function cueVoiceAt(schedule: AudioSchedule, cue: AudioCue, t: number, ducked?: boolean): AudioVoice | undefined {
  if (!audible(schedule, cue, t)) return undefined;
  const resource = schedule.resources.get(cue.resourceId)!;
  const length = playLength(cue, resource);
  const span = length * (cue.loops ?? 1);
  const local = t - cue.startMs;
  const iteration = Math.min((cue.loops ?? 1) - 1, Math.floor(local / length));
  const offsetMs = (cue.offsetMs ?? 0) + (local - iteration * length);
  const duck = cue.bus !== "narration" && (ducked ?? narrationActiveAt(schedule, t)) ? schedule.duckGain : 1;
  const gain = (cue.gain ?? 1) * schedule.busGain[cue.bus] * fadeFactor(cue, local, span) * duck;
  return { key: `${cue.id}#${iteration}`, cueId: cue.id, resourceId: cue.resourceId, bus: cue.bus, iteration, offsetMs, gain };
}

/** All audible voices at scene time t, in cue order. Pure function of the schedule and t. */
export function voicesAt(schedule: AudioSchedule, t: number): AudioVoice[] {
  const ducked = narrationActiveAt(schedule, t);
  const out: AudioVoice[] = [];
  for (const cue of schedule.cues) {
    const voice = cueVoiceAt(schedule, cue, t, ducked);
    if (voice) out.push(voice);
  }
  return out;
}

/**
 * Required-resource readiness for cues overlapping [fromMs, fromMs + lookaheadMs].
 * Optional cues never block; they are skipped while not ready.
 */
export function audioReadiness(schedule: AudioSchedule, fromMs: number, lookaheadMs: number): AudioReadiness {
  const waiting = new Set<string>();
  const failed = new Set<string>();
  const until = fromMs + Math.max(0, lookaheadMs);
  for (const cue of schedule.cues) {
    if (!isRequired(cue)) continue;
    const resource = schedule.resources.get(cue.resourceId);
    if (!resource) continue;
    const end = cue.startMs + cueSpanMs(cue, resource);
    const overlaps = cue.startMs <= until && end > fromMs;
    if (!overlaps) continue;
    const state = schedule.states.get(cue.resourceId) ?? "pending";
    if (state === "pending") waiting.add(cue.resourceId);
    else if (state === "failed") failed.add(cue.resourceId);
  }
  return { ok: waiting.size === 0 && failed.size === 0, waitingFor: [...waiting].sort(), failed: [...failed].sort() };
}

// ---------------------------------------------------------------------------
// Live session

export interface AudioStartCommand {
  type: "start";
  voiceId: string;
  key: string;
  cueId: string;
  resourceId: string;
  bus: AudioBus;
  offsetMs: number;
  gain: number;
  rate: number;
  reason: "enter" | "resync" | "drift" | "resume";
}

export type AudioCommand =
  | AudioStartCommand
  | { type: "stop"; voiceId: string; key: string; reason: "ended" | "silenced" | "resync" | "drift" | "dispose" }
  | { type: "gain"; voiceId: string; gain: number }
  | { type: "rate"; voiceId: string; rate: number }
  | { type: "release"; resourceId: string };

/** Host audio output. All methods are commands; the engine never reads audio time for frames. */
export interface AudioBackend {
  start(command: AudioStartCommand): void;
  stop(voiceId: string): void;
  setGain(voiceId: string, gain: number): void;
  setRate(voiceId: string, rate: number): void;
  /** Optional measured resource position of a running voice, for drift correction. */
  position?(voiceId: string): number | undefined;
  /** Release decoded data for a resource on dispose. */
  release?(resourceId: string): void;
}

export interface AudioSessionOptions extends AudioMixSettings {
  resources?: readonly (AudioResource & { state?: AudioResourceState })[];
  cues?: readonly AudioCue[];
  backend?: AudioBackend;
  /** Allowed position error before a running voice is re-seeked (default 40 ms). */
  toleranceMs?: number;
  /** Audible playback-rate range; outside it (and any rate <= 0) audio is silent. Default [0.5, 2]. */
  minRate?: number;
  maxRate?: number;
  /** Cue count bound including triggered one-shots (default 4096). */
  maxCues?: number;
}

export interface AudioSyncInput {
  sceneTimeMs: number;
  state: PlaybackState;
  rate: number;
  /**
   * Wall time since the previous sync. When given, a running voice is expected
   * to have advanced by wallDeltaMs x rate, so any scene-time jump (seek,
   * scene loop wrap) is detected. Without it, forward scene progress is
   * trusted and only backward motion counts as a discontinuity.
   */
  wallDeltaMs?: number;
  /** Host-declared discontinuity (seek, scrub): re-seek every running voice. */
  seeked?: boolean;
}

interface RunningVoice {
  voiceId: string;
  key: string;
  /** Where the backend voice should be inside its resource, advanced each sync. */
  expectedOffsetMs: number;
  gain: number;
  rate: number;
}

export interface AudioTriggerRecord {
  cueId: string;
  atMs: number;
}

function finiteNonNegative(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

/**
 * Live audio coordinator. Call `sync` after each clock tick/seek/state change
 * with the presented scene time; it returns (and applies) the backend commands
 * needed so running voices match `voicesAt(schedule, t)`.
 */
export class AudioSession {
  private readonly resources = new Map<string, AudioResource>();
  private readonly states = new Map<string, AudioResourceState>();
  private readonly cues: AudioCue[] = [];
  private readonly cueIds = new Set<string>();
  private readonly running = new Map<string, RunningVoice>();
  private readonly triggers: AudioTriggerRecord[] = [];
  private readonly reported = new Set<string>();
  private readonly busGain: Record<AudioBus, number>;
  private readonly duckGain: number;
  private readonly backend: AudioBackend | undefined;
  private readonly toleranceMs: number;
  private readonly minRate: number;
  private readonly maxRate: number;
  private readonly maxCues: number;
  private voiceCounter = 0;
  private lastSync: AudioSyncInput | null = null;
  private disposed = false;
  private holdingClock = false;
  readonly diagnostics: AudioDiagnostic[] = [];

  constructor(options: AudioSessionOptions = {}) {
    this.busGain = { narration: 1, effects: 1, music: 1, ...options.busGain };
    this.duckGain = options.duckGain ?? 0.35;
    this.backend = options.backend;
    this.toleranceMs = options.toleranceMs ?? 40;
    this.minRate = options.minRate ?? 0.5;
    this.maxRate = options.maxRate ?? 2;
    this.maxCues = options.maxCues ?? 4096;
    for (const resource of options.resources ?? []) this.defineResource(resource, resource.state ?? "pending");
    if (options.cues) this.addCues(options.cues);
  }

  /** True while `holdClock` has paused the clock for a pending required resource. */
  get holding(): boolean {
    return this.holdingClock;
  }

  get triggerLog(): readonly AudioTriggerRecord[] {
    return this.triggers;
  }

  hasCue(cueId: string): boolean {
    return this.cueIds.has(cueId);
  }

  get runningVoices(): readonly string[] {
    return [...this.running.keys()].sort();
  }

  schedule(): AudioSchedule {
    return {
      cues: [...this.cues],
      resources: new Map(this.resources),
      states: new Map(this.states),
      busGain: { ...this.busGain },
      duckGain: this.duckGain,
    };
  }

  defineResource(resource: AudioResource, state: AudioResourceState = "pending"): AudioDiagnostic[] {
    this.assertLive();
    if (this.resources.has(resource.id)) return [this.report({ code: "AUDIO_DUPLICATE_RESOURCE", resourceId: resource.id, message: `Audio resource ${resource.id} is already declared.` })];
    if (!(Number.isFinite(resource.durationMs) && resource.durationMs > 0)) {
      return [this.report({ code: "AUDIO_INVALID_CUE", resourceId: resource.id, message: `Audio resource ${resource.id} needs a positive durationMs.` })];
    }
    this.resources.set(resource.id, { id: resource.id, durationMs: resource.durationMs });
    this.states.set(resource.id, state);
    return [];
  }

  /** Readiness transition reported by the host loader. */
  setResourceState(resourceId: string, state: AudioResourceState): void {
    this.assertLive();
    if (!this.resources.has(resourceId)) return;
    this.states.set(resourceId, state);
  }

  /** Append sealed cues (streaming). Invalid cues are rejected individually with diagnostics. */
  addCues(cues: readonly AudioCue[]): AudioDiagnostic[] {
    this.assertLive();
    const out: AudioDiagnostic[] = [];
    for (const cue of cues) {
      const problem = this.checkCue(cue);
      if (problem) {
        out.push(this.report(problem));
        continue;
      }
      this.cues.push({ ...cue });
      this.cueIds.add(cue.id);
    }
    return out;
  }

  /**
   * Interaction-triggered one-shot (for example a click sound). It becomes part
   * of the schedule at `atMs`, is logged for replay and is included in export.
   */
  trigger(cue: Omit<AudioCue, "startMs">, atMs: number): AudioDiagnostic[] {
    this.assertLive();
    const diagnostics = this.addCues([{ ...cue, startMs: atMs }]);
    if (diagnostics.length === 0) this.triggers.push({ cueId: cue.id, atMs });
    return diagnostics;
  }

  readiness(fromMs: number, lookaheadMs: number): AudioReadiness {
    return audioReadiness(this.schedule(), fromMs, lookaheadMs);
  }

  /**
   * Hold a playing clock while a required resource within the lookahead is
   * pending or failed; resume it (without moving scene time) once ready.
   * A clock paused by the user is never resumed by this gate.
   */
  holdClock(clock: PlaybackClock, lookaheadMs: number): AudioReadiness {
    this.assertLive();
    const readiness = this.readiness(clock.timeMs, lookaheadMs);
    for (const id of readiness.waitingFor) this.reportOnce(`pending:${id}`, { code: "AUDIO_RESOURCE_PENDING", resourceId: id, message: `Required audio ${id} is loading; playback holds.` });
    for (const id of readiness.failed) this.reportOnce(`failed:${id}`, { code: "AUDIO_RESOURCE_FAILED", resourceId: id, message: `Required audio ${id} failed to load.` });
    if (!readiness.ok && clock.playbackState === "playing") {
      clock.pause();
      this.holdingClock = true;
    } else if (readiness.ok && this.holdingClock) {
      this.holdingClock = false;
      if (clock.playbackState === "paused") clock.play();
    }
    return readiness;
  }

  /** Release a hold without resuming (for example the user paused while held). */
  releaseHold(): void {
    this.holdingClock = false;
  }

  /** Reconcile running voices with the schedule at the presented scene time. */
  sync(input: AudioSyncInput): AudioCommand[] {
    this.assertLive();
    const commands: AudioCommand[] = [];
    const rateAudible = Number.isFinite(input.rate) && input.rate > 0 && input.rate >= this.minRate && input.rate <= this.maxRate;
    if (input.state === "playing" && !rateAudible) {
      this.reportOnce(`rate:${input.rate}`, { code: "AUDIO_RATE_SILENT", message: `Playback rate ${input.rate} is outside the audible range [${this.minRate}, ${this.maxRate}]; audio is silent.` });
    }
    const audibleNow = input.state === "playing" && rateAudible;
    const schedule = this.schedule();
    const desired = audibleNow ? voicesAt(schedule, input.sceneTimeMs) : [];
    if (audibleNow) this.reportSkipped(schedule, input.sceneTimeMs);
    const desiredByKey = new Map(desired.map((voice) => [voice.key, voice]));
    const resumed = this.lastSync !== null && this.lastSync.state !== "playing" && audibleNow;
    const last = this.lastSync;
    let advance = Number.NaN;
    if (!input.seeked && last) {
      if (input.wallDeltaMs !== undefined && Number.isFinite(input.wallDeltaMs)) advance = Math.max(0, input.wallDeltaMs) * last.rate;
      else if (input.sceneTimeMs >= last.sceneTimeMs) advance = input.sceneTimeMs - last.sceneTimeMs;
    }

    for (const [key, running] of [...this.running]) {
      const want = desiredByKey.get(key);
      if (!want) {
        commands.push({ type: "stop", voiceId: running.voiceId, key, reason: audibleNow ? "ended" : "silenced" });
        this.running.delete(key);
        continue;
      }
      running.expectedOffsetMs += advance;
      const measured = this.backend?.position?.(running.voiceId);
      let reason: "resync" | "drift" | null = null;
      if (!(Math.abs(running.expectedOffsetMs - want.offsetMs) <= this.toleranceMs)) reason = "resync";
      else if (measured !== undefined && Number.isFinite(measured) && Math.abs(measured - want.offsetMs) > this.toleranceMs) reason = "drift";
      if (reason) {
        commands.push({ type: "stop", voiceId: running.voiceId, key, reason });
        this.running.delete(key);
        commands.push(this.startCommand(want, input, reason));
        desiredByKey.delete(key);
        continue;
      }
      if (Math.abs(running.gain - want.gain) > 1e-4) {
        commands.push({ type: "gain", voiceId: running.voiceId, gain: want.gain });
        running.gain = want.gain;
      }
      if (running.rate !== input.rate) {
        commands.push({ type: "rate", voiceId: running.voiceId, rate: input.rate });
        running.rate = input.rate;
      }
      desiredByKey.delete(key);
    }
    for (const voice of desired) {
      if (!desiredByKey.has(voice.key)) continue;
      commands.push(this.startCommand(voice, input, resumed ? "resume" : "enter"));
    }
    this.lastSync = { ...input };
    this.apply(commands);
    return commands;
  }

  /** Silence every voice without disposing (cancel / interruption). */
  stopAll(): AudioCommand[] {
    this.assertLive();
    const commands: AudioCommand[] = [...this.running.values()].map((voice) => ({ type: "stop", voiceId: voice.voiceId, key: voice.key, reason: "silenced" }) as const);
    this.running.clear();
    this.lastSync = null;
    this.apply(commands);
    return commands;
  }

  /** Stop all voices and release every resource. A disposed session throws on use. */
  dispose(): AudioCommand[] {
    if (this.disposed) return [];
    const commands: AudioCommand[] = [...this.running.values()].map((voice) => ({ type: "stop", voiceId: voice.voiceId, key: voice.key, reason: "dispose" }) as const);
    for (const id of [...this.resources.keys()].sort()) commands.push({ type: "release", resourceId: id });
    this.running.clear();
    this.apply(commands);
    this.disposed = true;
    this.holdingClock = false;
    return commands;
  }

  private startCommand(voice: AudioVoice, input: AudioSyncInput, reason: AudioStartCommand["reason"]): AudioStartCommand {
    this.voiceCounter += 1;
    const voiceId = `${voice.key}@${this.voiceCounter}`;
    this.running.set(voice.key, { voiceId, key: voice.key, expectedOffsetMs: voice.offsetMs, gain: voice.gain, rate: input.rate });
    return { type: "start", voiceId, key: voice.key, cueId: voice.cueId, resourceId: voice.resourceId, bus: voice.bus, offsetMs: voice.offsetMs, gain: voice.gain, rate: input.rate, reason };
  }

  private apply(commands: readonly AudioCommand[]): void {
    const backend = this.backend;
    if (!backend) return;
    for (const command of commands) {
      if (command.type === "start") backend.start(command);
      else if (command.type === "stop") backend.stop(command.voiceId);
      else if (command.type === "gain") backend.setGain(command.voiceId, command.gain);
      else if (command.type === "rate") backend.setRate(command.voiceId, command.rate);
      else backend.release?.(command.resourceId);
    }
  }

  private reportSkipped(schedule: AudioSchedule, t: number): void {
    for (const cue of schedule.cues) {
      if (isRequired(cue)) continue;
      const resource = schedule.resources.get(cue.resourceId);
      if (!resource || t < cue.startMs || t >= cue.startMs + cueSpanMs(cue, resource)) continue;
      const state = schedule.states.get(cue.resourceId);
      if (state !== "ready") {
        this.reportOnce(`skip:${cue.id}`, { code: "AUDIO_OPTIONAL_SKIPPED", cueId: cue.id, resourceId: cue.resourceId, message: `Optional cue ${cue.id} skipped: resource ${cue.resourceId} is ${state ?? "pending"}.` });
      }
    }
  }

  private checkCue(cue: AudioCue): AudioDiagnostic | null {
    if (this.cueIds.has(cue.id)) return { code: "AUDIO_DUPLICATE_CUE", cueId: cue.id, message: `Audio cue ${cue.id} is already scheduled.` };
    if (this.cues.length >= this.maxCues) return { code: "AUDIO_CUE_LIMIT", cueId: cue.id, message: `Audio cue limit ${this.maxCues} reached.` };
    const resource = this.resources.get(cue.resourceId);
    if (!resource) return { code: "AUDIO_UNKNOWN_RESOURCE", cueId: cue.id, resourceId: cue.resourceId, message: `Audio cue ${cue.id} names undeclared resource ${cue.resourceId}.` };
    const loops = cue.loops ?? 1;
    const offset = cue.offsetMs ?? 0;
    const valid =
      typeof cue.id === "string" && cue.id.length > 0 &&
      (AUDIO_BUSES as readonly string[]).includes(cue.bus) &&
      Number.isFinite(cue.startMs) && cue.startMs >= 0 &&
      finiteNonNegative(cue.offsetMs) && offset < resource.durationMs &&
      (cue.durationMs === undefined || (Number.isFinite(cue.durationMs) && cue.durationMs > 0 && offset + cue.durationMs <= resource.durationMs + 1e-9)) &&
      Number.isInteger(loops) && loops >= 1 && loops <= 1000 &&
      (cue.gain === undefined || (Number.isFinite(cue.gain) && cue.gain >= 0 && cue.gain <= 4)) &&
      finiteNonNegative(cue.fadeInMs) && finiteNonNegative(cue.fadeOutMs);
    if (!valid) return { code: "AUDIO_INVALID_CUE", cueId: cue.id, resourceId: cue.resourceId, message: `Audio cue ${cue.id} has an invalid bus, time, offset, duration, loop count, gain or fade.` };
    return null;
  }

  private report(diagnostic: AudioDiagnostic): AudioDiagnostic {
    this.diagnostics.push(diagnostic);
    return diagnostic;
  }

  private reportOnce(key: string, diagnostic: AudioDiagnostic): void {
    if (this.reported.has(key)) return;
    this.reported.add(key);
    this.report(diagnostic);
  }

  private assertLive(): void {
    if (this.disposed) throw new Error("AudioSession is disposed.");
  }
}

// ---------------------------------------------------------------------------
// Scene-declared audio (Scene IR 0.11.0 audio.cues)

/** Host loader readiness by audio resource id. */
export type AudioStates = Readonly<Record<string, AudioResourceState>>;

export interface SceneAudioResource extends AudioResource {
  href: string;
  /** Readiness declared by the scene, if any. */
  readiness?: AudioResourceState;
}

export function sceneAudioResources(scene: SceneIR): SceneAudioResource[] {
  const out: SceneAudioResource[] = [];
  for (const resource of scene.resources) {
    if (resource.kind !== "audio") continue;
    const entry: SceneAudioResource = { id: resource.id, href: resource.href, durationMs: resource.durationMs };
    if (resource.readiness) entry.readiness = resource.readiness;
    out.push(entry);
  }
  return out;
}

/**
 * Initial session state for a scene resource: the host's loader state when
 * given, else "failed" when the scene says so, else "pending" until the host
 * decodes it. A scene's "ready" claim never starts playback without decoded data.
 */
function initialState(resource: SceneAudioResource, states: AudioStates | undefined): AudioResourceState {
  return states?.[resource.id] ?? (resource.readiness === "failed" ? "failed" : "pending");
}

function toCue(cue: AudioCueDefinition): AudioCue {
  return { ...cue };
}

export interface SceneAudioOptions extends Omit<AudioSessionOptions, "resources" | "cues"> {
  states?: AudioStates;
}

/** Lower a scene's audio resources and cues into a live session. */
export function createSceneAudioSession(scene: SceneIR, options: SceneAudioOptions = {}): AudioSession {
  const { states, ...rest } = options;
  return new AudioSession({
    ...rest,
    resources: sceneAudioResources(scene).map((resource) => ({ id: resource.id, durationMs: resource.durationMs, state: initialState(resource, states) })),
    cues: (scene.audioCues ?? []).map(toCue),
  });
}

/** Add cues that arrived after the session was created (streamed ADD_AUDIO_CUES). */
export function syncSceneAudioCues(session: AudioSession, scene: SceneIR): AudioDiagnostic[] {
  const fresh = (scene.audioCues ?? []).filter((cue) => !session.hasCue(cue.id)).map(toCue);
  return fresh.length > 0 ? session.addCues(fresh) : [];
}

/** Pure schedule for a scene (export, readiness). */
export function sceneAudioSchedule(scene: SceneIR, states?: AudioStates, mix: AudioMixSettings = {}): AudioSchedule {
  const resources = sceneAudioResources(scene);
  return {
    cues: (scene.audioCues ?? []).map(toCue),
    resources: new Map(resources.map((resource) => [resource.id, { id: resource.id, durationMs: resource.durationMs }])),
    states: new Map(resources.map((resource) => [resource.id, initialState(resource, states)])),
    busGain: { narration: 1, effects: 1, music: 1, ...mix.busGain },
    duckGain: mix.duckGain ?? 0.35,
  };
}

/** Required-audio readiness of a scene over [fromMs, fromMs + lookaheadMs]. */
export function sceneAudioReadiness(scene: SceneIR, fromMs: number, lookaheadMs: number, states?: AudioStates): AudioReadiness {
  return audioReadiness(sceneAudioSchedule(scene, states), fromMs, lookaheadMs);
}

// ---------------------------------------------------------------------------
// Offline export

export interface DecodedAudio {
  sampleRate: number;
  /** One Float32Array per channel; mono sources feed every output channel. */
  channels: readonly Float32Array[];
}

export interface MixOptions {
  startMs: number;
  endMs: number;
  sampleRate: number;
  channels: number;
}

/**
 * Deterministic offline mixdown of a schedule over [startMs, endMs).
 * Uses the same per-cue offset/gain/ducking functions as live playback;
 * sources are resampled linearly. Missing or unready resources are silent.
 */
export function mixAudio(schedule: AudioSchedule, sources: ReadonlyMap<string, DecodedAudio>, options: MixOptions): Float32Array[] {
  const frames = Math.max(0, Math.round(((options.endMs - options.startMs) * options.sampleRate) / 1000));
  const out = Array.from({ length: options.channels }, () => new Float32Array(frames));
  const msPerFrame = 1000 / options.sampleRate;
  const narration = schedule.cues.filter((cue) => cue.bus === "narration");
  for (const cue of schedule.cues) {
    const resource = schedule.resources.get(cue.resourceId);
    const source = sources.get(cue.resourceId);
    if (!resource || !source || schedule.states.get(cue.resourceId) !== "ready") continue;
    const span = cueSpanMs(cue, resource);
    const first = Math.max(0, Math.ceil(((cue.startMs - options.startMs) * options.sampleRate) / 1000));
    const last = Math.min(frames, Math.ceil(((cue.startMs + span - options.startMs) * options.sampleRate) / 1000));
    for (let frame = first; frame < last; frame += 1) {
      const t = options.startMs + frame * msPerFrame;
      const ducked = cue.bus !== "narration" && narration.some((other) => audible(schedule, other, t));
      const voice = cueVoiceAt(schedule, cue, t, ducked);
      if (!voice) continue;
      const position = (voice.offsetMs * source.sampleRate) / 1000;
      const index = Math.floor(position);
      const frac = position - index;
      for (let channel = 0; channel < options.channels; channel += 1) {
        const data = source.channels[Math.min(channel, source.channels.length - 1)];
        if (!data || index >= data.length) continue;
        const a = data[index]!;
        const b = index + 1 < data.length ? data[index + 1]! : a;
        out[channel]![frame]! += (a + (b - a) * frac) * voice.gain;
      }
    }
  }
  return out;
}

/** 16-bit PCM WAV encoding of interleaved output (samples clamped to [-1, 1]). */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number): Uint8Array {
  const channelCount = Math.max(1, channels.length);
  const frames = channels[0]?.length ?? 0;
  const dataBytes = frames * channelCount * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel]?.[frame] ?? 0));
      view.setInt16(offset, Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff), true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}
