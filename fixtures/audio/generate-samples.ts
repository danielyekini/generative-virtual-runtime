/**
 * Deterministic synthetic audio for the audio.cues Studio sample (E026).
 * Writes 16 kHz mono 16-bit WAVs into app/playground/public/audio/.
 * Run: node --import tsx fixtures/audio/generate-samples.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeWav } from "../../packages/runtime/src/audio";

const RATE = 16000;
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../../app/playground/public/audio");

function render(ms: number, sample: (t: number) => number): Float32Array {
  const data = new Float32Array(Math.round((ms * RATE) / 1000));
  for (let i = 0; i < data.length; i += 1) data[i] = sample(i / RATE);
  return data;
}

const tau = 2 * Math.PI;

// Narration stand-in: voiced harmonics under a 4 Hz syllable envelope, gliding pitch.
const narration = render(2400, (t) => {
  const pitch = 180 + 40 * Math.sin(tau * 0.7 * t);
  const syllable = Math.max(0, Math.sin(tau * 4 * t)) ** 0.6;
  const voice = Math.sin(tau * pitch * t) + 0.5 * Math.sin(tau * 2 * pitch * t) + 0.25 * Math.sin(tau * 3 * pitch * t);
  const edge = Math.min(1, t / 0.02, (2.4 - t) / 0.02);
  return 0.3 * voice * syllable * edge;
});

// Click: decaying 1.5 kHz burst.
const click = render(80, (t) => 0.8 * Math.sin(tau * 1500 * t) * Math.exp(-t * 60));

// Music bed: one-second soft A-minor chord with short edges so loops join cleanly.
const bed = render(1000, (t) => {
  const chord = Math.sin(tau * 220 * t) + Math.sin(tau * 261.63 * t) + Math.sin(tau * 329.63 * t);
  const edge = Math.min(1, t / 0.01, (1 - t) / 0.01);
  return 0.12 * chord * edge;
});

mkdirSync(out, { recursive: true });
for (const [name, data] of [["narration", narration], ["click", click], ["bed", bed]] as const) {
  writeFileSync(resolve(out, `${name}.wav`), encodeWav([data], RATE));
}
console.log(`wrote narration/click/bed to ${out}`);
