/**
 * Maps wall time onto scene time. Evaluation never reads this clock.
 * A frame depends only on the scene and the scene time passed to evaluate.
 */
export class RuntimeClock {
  private sceneTimeMs = 0;
  private playing = false;
  private rate = 1;

  get timeMs(): number {
    return this.sceneTimeMs;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get playbackRate(): number {
    return this.rate;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seek(sceneTimeMs: number): void {
    if (Number.isFinite(sceneTimeMs)) this.sceneTimeMs = sceneTimeMs;
  }

  setRate(rate: number): void {
    if (Number.isFinite(rate)) this.rate = rate;
  }

  /** Advance by a positive wall-clock delta. Paused clocks stay put. */
  tick(wallDeltaMs: number): number {
    if (this.playing && Number.isFinite(wallDeltaMs) && wallDeltaMs > 0) {
      this.sceneTimeMs += wallDeltaMs * this.rate;
    }
    return this.sceneTimeMs;
  }
}
