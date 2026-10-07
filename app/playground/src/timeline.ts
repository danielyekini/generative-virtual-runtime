import type { SceneIR } from "@gvr/schema";

export function formatClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

export function readFrameMs(source: string): number {
  try {
    const data = JSON.parse(source) as { fr?: unknown };
    if (typeof data.fr === "number" && data.fr > 0) return 1000 / data.fr;
  } catch {
    /* Source is not Lottie JSON. */
  }
  return 1000 / 30;
}

export function isStaticScene(scene: SceneIR | undefined): boolean {
  if (!scene) return false;
  return scene.timeline.tracks.length === 0 && scene.timeline.steps.length === 0;
}

export function collectKeyTimes(scene: SceneIR | undefined, durationMs: number): number[] {
  const times = new Set<number>([0, durationMs]);
  if (scene) {
    times.add(Math.min(durationMs, scene.timeline.durationMs));
    for (const track of scene.timeline.tracks) {
      times.add(track.startMs);
      times.add(track.startMs + track.durationMs);
      if (track.kind === "keyframe") {
        for (const keyframe of track.keyframes) times.add(track.startMs + keyframe.offset * track.durationMs);
      }
    }
    for (const step of scene.timeline.steps) times.add(step.timeMs);
  }
  return [...times].filter((time) => time >= -1e-6 && time <= durationMs + 1e-6).sort((a, b) => a - b);
}

export function stepKey(times: readonly number[], timeMs: number, direction: -1 | 1, durationMs: number): number {
  if (direction > 0) return times.find((time) => time > timeMs + 1e-3) ?? durationMs;
  return [...times].reverse().find((time) => time < timeMs - 1e-3) ?? 0;
}

export function clampTime(timeMs: number, durationMs: number): number {
  return Math.min(durationMs, Math.max(0, timeMs));
}
