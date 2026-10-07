import {
  DEFAULT_LIMITS,
  validateSceneIR,
  type ResolvedFrame,
  type SceneIR,
} from "@gvr/schema";
import { PlaybackClock } from "./playback";
import { AnimationRuntime } from "./runtime";

export type PresentationPhase =
  | "initial_input"
  | "dismissing_input"
  | "system_interstitial"
  | "transitioning"
  | "generated_scene";

export interface SystemCatalogueEntry {
  id: string;
  scene: SceneIR;
}

/** A generated programme offered to the presentation controller. */
export interface GeneratedOffer {
  scene: SceneIR;
  sealedThroughMs: number;
  unresolved?: boolean;
  fatal?: boolean;
  resourcesReady?: boolean;
}

export interface Readiness {
  ok: boolean;
  reason: string;
}

export interface PresentationView {
  phase: PresentationPhase;
  generationId: string | null;
  systemSceneId: string | null;
  generatedSceneId: string | null;
  systemTimeMs: number;
  generatedTimeMs: number;
  systemFrame: ResolvedFrame | null;
  generatedFrame: ResolvedFrame | null;
  systemOpacity: number;
  generatedOpacity: number;
  status: string;
}

export interface PresentationOptions {
  scenes: readonly SystemCatalogueEntry[];
  startupBufferMs?: number;
  transitionMs?: number;
  dismissMs?: number;
}

/**
 * Owns the system interstitial and the generated session separately.
 * System time loops by modulo. Generated time stays at zero until the
 * crossfade ends, then starts at zero. A readiness result is latched to
 * the active generation id.
 */
export class PresentationController {
  private readonly scenes: readonly SystemCatalogueEntry[];
  private readonly startupBufferMs: number;
  private readonly transitionMs: number;
  private readonly dismissMs: number;
  private phase: PresentationPhase = "initial_input";
  private generation = 0;
  private generationId: string | null = null;
  private catalogueIndex = -1;
  private systemSceneId: string | null = null;
  private systemScene: SceneIR | null = null;
  private systemRuntime: AnimationRuntime | null = null;
  private systemElapsedMs = 0;
  private systemPlaying = false;
  private frozenSystem: ResolvedFrame | null = null;
  private generatedScene: SceneIR | null = null;
  private generatedRuntime: AnimationRuntime | null = null;
  private generatedClock: PlaybackClock | null = null;
  private generatedPlaying = false;
  private dismissElapsedMs = 0;
  private transitionElapsedMs = 0;
  private note = "";

  constructor(options: PresentationOptions) {
    this.scenes = options.scenes;
    this.startupBufferMs = options.startupBufferMs ?? DEFAULT_LIMITS.startupBufferMs;
    this.transitionMs = options.transitionMs ?? DEFAULT_LIMITS.transitionCapMs;
    this.dismissMs = options.dismissMs ?? 280;
  }

  get view(): PresentationView {
    const systemTimeMs = this.systemTime();
    const generatedTimeMs = this.generatedClock?.timeMs ?? 0;
    let systemOpacity = 0;
    let generatedOpacity = 0;
    if (this.phase === "dismissing_input" || this.phase === "system_interstitial") {
      systemOpacity = 1;
    } else if (this.phase === "transitioning") {
      const span = this.transitionMs <= 0 ? 1 : Math.min(1, this.transitionElapsedMs / this.transitionMs);
      systemOpacity = 1 - span;
      generatedOpacity = 1;
    } else if (this.phase === "generated_scene") {
      generatedOpacity = 1;
    }
    return {
      phase: this.phase,
      generationId: this.generationId,
      systemSceneId: this.systemSceneId,
      generatedSceneId: this.generatedScene?.sceneId ?? null,
      systemTimeMs,
      generatedTimeMs,
      systemFrame: this.frozenSystem ?? (this.systemRuntime ? this.systemRuntime.evaluate(systemTimeMs) : null),
      generatedFrame: this.generatedRuntime ? this.generatedRuntime.evaluate(generatedTimeMs) : null,
      systemOpacity,
      generatedOpacity,
      status: this.note,
    };
  }

  /** Start a system scene immediately. The returned id latches later callbacks. */
  submit(): string | null {
    if (this.scenes.length === 0) {
      this.note = "No system scene is available.";
      return null;
    }
    this.releaseSessions();
    this.generation += 1;
    this.generationId = `g-${this.generation}`;
    this.phase = "dismissing_input";
    this.dismissElapsedMs = 0;
    this.transitionElapsedMs = 0;
    this.systemElapsedMs = 0;
    this.note = "Dismissing input.";
    const entry = this.scenes.length === 1 ? this.scenes[0]! : this.scenes[(this.catalogueIndex = (this.catalogueIndex + 1) % this.scenes.length)]!;
    this.systemSceneId = entry.id;
    this.systemScene = entry.scene;
    this.systemRuntime = new AnimationRuntime(entry.scene);
    this.systemPlaying = true;
    return this.generationId;
  }

  /** Ignore a callback whose generation is no longer active. */
  receive(generationId: string, offer: GeneratedOffer): boolean {
    if (generationId !== this.generationId) return false;
    if (this.phase !== "dismissing_input" && this.phase !== "system_interstitial") return false;
    const readiness = assessReadiness(offer, this.startupBufferMs);
    if (!readiness.ok) {
      this.note = readiness.reason;
      return false;
    }
    const durationMs = offer.scene.timeline.durationMs;
    const clock = new PlaybackClock();
    clock.setHorizon(Math.min(offer.sealedThroughMs, durationMs), durationMs, offer.sealedThroughMs >= durationMs - 1e-9);
    this.generatedScene = offer.scene;
    this.generatedRuntime = new AnimationRuntime(offer.scene);
    this.generatedClock = clock;
    this.generatedPlaying = false;
    this.frozenSystem = this.systemRuntime?.evaluate(this.systemTime()) ?? null;
    this.systemRuntime = null;
    this.systemPlaying = false;
    this.transitionElapsedMs = 0;
    this.phase = "transitioning";
    this.note = "Transition.";
    return true;
  }

  cancel(): void {
    if (this.phase === "initial_input") return;
    const id = this.generationId;
    this.releaseSessions();
    this.phase = "initial_input";
    this.generationId = null;
    this.note = id ? "Cancelled." : "";
  }

  fail(generationId: string, reason = "Generation failed."): void {
    if (generationId !== this.generationId) return;
    if (this.phase === "initial_input" || this.phase === "generated_scene") return;
    this.releaseSessions();
    this.phase = "initial_input";
    this.generationId = null;
    this.note = reason;
  }

  /** Playground return to the prompt. Does not change catalogue order. */
  restore(): void {
    this.releaseSessions();
    this.phase = "initial_input";
    this.generationId = null;
    this.note = "";
  }

  tick(wallDeltaMs: number): void {
    if (!Number.isFinite(wallDeltaMs) || wallDeltaMs <= 0) return;
    if (this.phase === "dismissing_input") {
      this.dismissElapsedMs += wallDeltaMs;
      if (this.dismissElapsedMs >= this.dismissMs) {
        this.phase = "system_interstitial";
        this.note = "Preparing the generated scene.";
      }
    }
    if (this.systemPlaying) this.systemElapsedMs += wallDeltaMs;
    if (this.phase === "transitioning") {
      this.transitionElapsedMs += wallDeltaMs;
      if (this.transitionElapsedMs >= this.transitionMs) this.finishTransition();
    } else if (this.generatedPlaying && this.generatedClock) {
      this.generatedClock.tick(wallDeltaMs);
      if (this.generatedClock.playbackState === "complete") this.note = "Generated scene complete.";
      else if (this.generatedClock.playbackState === "waiting_for_content") this.note = "Waiting for generated content.";
      else this.note = "Generated scene.";
    }
  }

  private finishTransition(): void {
    this.phase = "generated_scene";
    this.frozenSystem = null;
    this.systemPlaying = false;
    this.generatedClock?.play();
    this.generatedPlaying = this.generatedClock?.playbackState === "playing";
    this.note = "Generated scene.";
  }

  private systemTime(): number {
    const duration = this.systemScene?.timeline.durationMs ?? 0;
    if (!(duration > 0)) return 0;
    return this.systemElapsedMs % duration;
  }

  private releaseSessions(): void {
    this.systemRuntime = null;
    this.systemScene = null;
    this.systemSceneId = null;
    this.systemPlaying = false;
    this.systemElapsedMs = 0;
    this.frozenSystem = null;
    this.generatedRuntime = null;
    this.generatedScene = null;
    this.generatedClock?.stop();
    this.generatedClock = null;
    this.generatedPlaying = false;
    this.dismissElapsedMs = 0;
    this.transitionElapsedMs = 0;
  }
}

/** Technical display readiness. This does not judge prompt correspondence. */
export function assessReadiness(offer: GeneratedOffer, startupBufferMs: number): Readiness {
  if (offer.fatal) return { ok: false, reason: "A fatal diagnostic is blocking playback." };
  if (offer.unresolved) return { ok: false, reason: "An unresolved reference is blocking playback." };
  if (offer.resourcesReady === false) return { ok: false, reason: "A required resource is not ready." };
  const validated = validateSceneIR(offer.scene);
  if (!validated.ok) {
    return { ok: false, reason: validated.diagnostics[0]?.message ?? "The generated scene is not valid." };
  }
  const durationMs = validated.value.timeline.durationMs;
  const neededMs = Math.min(startupBufferMs, durationMs);
  if (!(offer.sealedThroughMs >= neededMs - 1e-9)) {
    return { ok: false, reason: `Sealed coverage is ${offer.sealedThroughMs}ms; playback needs ${neededMs}ms.` };
  }
  const opening = new AnimationRuntime(validated.value).evaluate(0);
  if (!opening.drawItems.some((item) => item.opacity > 0)) {
    return { ok: false, reason: "The opening frame has nothing visible to draw." };
  }
  return { ok: true, reason: "" };
}
