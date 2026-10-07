export type PlaybackState = "stopped" | "playing" | "paused" | "waiting_for_content" | "complete";

/**
 * Playback clock bounded by the sealed horizon.
 * Reaching the horizon holds scene time and enters waiting_for_content.
 * A later seal resumes from that same time.
 */
export class PlaybackClock {
  private sceneTimeMs = 0;
  private state: PlaybackState = "stopped";
  private rate = 1;
  private horizonMs = 0;
  private durationMs = 0;
  private authoringComplete = false;

  get timeMs(): number {
    return this.sceneTimeMs;
  }

  get playbackState(): PlaybackState {
    return this.state;
  }

  get playbackRate(): number {
    return this.rate;
  }

  get sealedThroughMs(): number {
    return this.horizonMs;
  }

  play(): void {
    if (this.state === "complete") return;
    if (!this.authoringComplete && this.sceneTimeMs >= this.horizonMs) {
      this.sceneTimeMs = this.horizonMs;
      this.state = "waiting_for_content";
      return;
    }
    this.state = "playing";
  }

  pause(): void {
    if (this.state === "complete") return;
    this.state = "paused";
  }

  stop(): void {
    this.sceneTimeMs = 0;
    this.state = "stopped";
    this.horizonMs = 0;
    this.durationMs = 0;
    this.authoringComplete = false;
  }

  seek(sceneTimeMs: number): void {
    if (!Number.isFinite(sceneTimeMs)) return;
    const limit = this.authoringComplete ? this.durationMs : this.horizonMs;
    this.sceneTimeMs = Math.min(Math.max(0, sceneTimeMs), limit);
    if (this.authoringComplete && this.sceneTimeMs >= this.durationMs) this.state = "complete";
    else if (!this.authoringComplete && this.sceneTimeMs >= this.horizonMs && this.state === "playing") {
      this.state = "waiting_for_content";
    }
  }

  setRate(rate: number): void {
    if (Number.isFinite(rate)) this.rate = rate;
  }

  /** Publish the compiler horizon. A waiting clock resumes without moving scene time. */
  setHorizon(horizonMs: number, durationMs: number, authoringComplete: boolean): void {
    const wasWaiting = this.state === "waiting_for_content";
    this.horizonMs = horizonMs;
    this.durationMs = durationMs;
    this.authoringComplete = authoringComplete;
    if (authoringComplete && this.sceneTimeMs >= durationMs) {
      this.sceneTimeMs = durationMs;
      this.state = "complete";
      return;
    }
    if (wasWaiting && (authoringComplete || horizonMs > this.sceneTimeMs)) this.state = "playing";
  }

  tick(wallDeltaMs: number): number {
    if (this.state !== "playing" || !Number.isFinite(wallDeltaMs) || wallDeltaMs <= 0) return this.sceneTimeMs;
    const next = this.sceneTimeMs + wallDeltaMs * this.rate;
    if (!this.authoringComplete && next >= this.horizonMs) {
      this.sceneTimeMs = this.horizonMs;
      this.state = "waiting_for_content";
      return this.sceneTimeMs;
    }
    if (this.authoringComplete && next >= this.durationMs) {
      this.sceneTimeMs = this.durationMs;
      this.state = "complete";
      return this.sceneTimeMs;
    }
    this.sceneTimeMs = next;
    return this.sceneTimeMs;
  }
}
