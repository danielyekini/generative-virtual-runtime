/**
 * P023: Generate waiting-state MotionScript loading-screen presets.
 * Shown on the canvas only before the first renderable generated program.
 */
import pulseDot from "../../../../fixtures/generation/loading-screens/pulse-dot.ms?raw";
import orbitRing from "../../../../fixtures/generation/loading-screens/orbit-ring.ms?raw";
import sweepBar from "../../../../fixtures/generation/loading-screens/sweep-bar.ms?raw";
import manifestJson from "../../../../fixtures/generation/loading-screens/manifest.json";

export type LoadingScreenPreset = {
  id: string;
  file: string;
  caption: string;
  source: string;
};

const SOURCES: Record<string, string> = {
  "pulse-dot.ms": pulseDot,
  "orbit-ring.ms": orbitRing,
  "sweep-bar.ms": sweepBar,
};

export function listLoadingScreens(): LoadingScreenPreset[] {
  return manifestJson.presets.map((preset) => {
    const source = SOURCES[preset.file];
    if (!source) throw new Error(`Missing loading-screen source for ${preset.file}`);
    return { ...preset, source };
  });
}

/** Deterministic pick for tests; production uses Math.random. */
export function pickLoadingScreen(random: () => number = Math.random): LoadingScreenPreset {
  const presets = listLoadingScreens();
  if (presets.length === 0) throw new Error("No Generate loading-screen presets packaged");
  const index = Math.min(presets.length - 1, Math.max(0, Math.floor(random() * presets.length)));
  return presets[index]!;
}
