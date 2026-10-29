/**
 * Builds fixtures/motionscript/stories/through-the-blue.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-through-the-blue.ts
 *
 * The jellyfish is a hierarchy: bell pulses and breathing are nested scales,
 * and each tentacle is a delayed chain. The rock is placed on that path so
 * the bell enters at 15s, the last tip at 17.5s, and a thin rim exits at 19s.
 * MotionScript has no audio; the score is recorded as comments.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { applySegmentEasing, mapWorldToLogical, transformPoint, type SegmentEasing } from "@gvr/schema";

const DURATION = 30;
const VIEW_W = 1280;
const VIEW_H = 720;
const CX = 640;
const CY = 360;

type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut";
type Key = { t: number; v: number; ease?: Ease };
type Vec = { x: number; y: number };
type Cam = { x: number; y: number; zoom: number };

const BREATH_F = 1.35;
const BREATH_X = 0.045;
const BREATH_Y = 0.04;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function num(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}

function deg(value: number): string {
  return `${num(value)}deg`;
}

function pct(seconds: number): string {
  if (seconds <= 0) return "0%";
  if (seconds >= DURATION) return "100%";
  const text = ((seconds / DURATION) * 100).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function roundTime(seconds: number): number {
  return Math.round(clamp(seconds, 0, DURATION) * 100) / 100;
}

function clean(keys: Key[]): Key[] {
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  const out: Key[] = [];
  for (const key of sorted) {
    const t = roundTime(key.t);
    const prev = out[out.length - 1];
    if (prev && prev.t === t) out[out.length - 1] = { ...key, t };
    else out.push({ ...key, t });
  }
  if (!out.length) return [{ t: 0, v: 0 }, { t: DURATION, v: 0 }];
  if (out[0]!.t > 0) out.unshift({ t: 0, v: out[0]!.v });
  const last = out[out.length - 1]!;
  if (last.t < DURATION) out.push({ t: DURATION, v: last.v });
  return out;
}

function sampleChannel(keys: readonly Key[], seconds: number): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return 0;
  if (seconds <= first.t) return first.v;
  if (seconds >= last.t) return last.v;
  let index = 0;
  while (index < keys.length - 1 && keys[index + 1]!.t < seconds) index += 1;
  const from = keys[index]!;
  const to = keys[index + 1] ?? last;
  const span = to.t - from.t;
  const u = span === 0 ? 0 : (seconds - from.t) / span;
  const eased = applySegmentEasing((from.ease ?? "linear") as SegmentEasing, u);
  return from.v + (to.v - from.v) * eased;
}

function track(target: string, keys: Key[], kind: "num" | "deg", note?: string): string {
  const cleaned = clean(keys);
  const body = cleaned
    .map((key, index) => {
      const ease = index < cleaned.length - 1 && key.ease && key.ease !== "linear" ? ` ease ${key.ease}` : "";
      const value = kind === "deg" ? deg(key.v) : num(key.v);
      return `  ${pct(key.t)} ${value}${ease};`;
    })
    .join("\n");
  const banner = note ? `// ${note}\n` : "";
  return `${banner}keyframes ${target} {\n  start 0s;\n  duration 30s;\n${body}\n};\n`;
}

function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(a: Vec, scale: number): Vec {
  return { x: a.x * scale, y: a.y * scale };
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(a: Vec): Vec {
  const length = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / length, y: a.y / length };
}

function rot(radians: number, x: number, y: number): Vec {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: x * c - y * s, y: x * s + y * c };
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function smooth(u: number): number {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
}

function centroid(points: readonly Vec[]): Vec {
  const sum = points.reduce((acc, point) => add(acc, point), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function insidePoly(point: Vec, poly: readonly Vec[]): boolean {
  let crossings = false;
  for (let index = 0, prev = poly.length - 1; index < poly.length; prev = index, index += 1) {
    const a = poly[index]!;
    const b = poly[prev]!;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      crossings = !crossings;
    }
  }
  return crossings;
}

function distToPoly(point: Vec, poly: readonly Vec[]): number {
  let best = Infinity;
  for (let index = 0; index < poly.length; index += 1) {
    const a = poly[index]!;
    const b = poly[(index + 1) % poly.length]!;
    const ab = sub(b, a);
    const length2 = dot(ab, ab) || 1;
    const u = clamp(dot(sub(point, a), ab) / length2, 0, 1);
    const closest = add(a, mul(ab, u));
    best = Math.min(best, Math.hypot(point.x - closest.x, point.y - closest.y));
  }
  return best;
}

function covered(point: Vec, poly: readonly Vec[], slack = 8): boolean {
  return insidePoly(point, poly) || distToPoly(point, poly) <= slack;
}

type PoseKey = { t: number; x: number; y: number; rot: number; ease?: Ease };

const POSE: PoseKey[] = [
  { t: 0, x: -60, y: 860, rot: 34 },
  { t: 1, x: 150, y: 770, rot: 30, ease: "easeIn" },
  { t: 2, x: 360, y: 680, rot: 24, ease: "easeOut" },
  { t: 3.3, x: 560, y: 575, rot: 16, ease: "easeOut" },
  { t: 5, x: 740, y: 500, rot: 12, ease: "easeIn" },
  { t: 6.5, x: 940, y: 400, rot: 3, ease: "easeOut" },
  { t: 8.5, x: 1120, y: 338, rot: 7, ease: "easeOut" },
  { t: 9, x: 1180, y: 328, rot: 8 },
  { t: 11, x: 1340, y: 300, rot: 10, ease: "easeIn" },
  { t: 12, x: 1430, y: 286, rot: 16, ease: "easeOut" },
  { t: 13.8, x: 1580, y: 248, rot: 22, ease: "easeInOut" },
  { t: 15, x: 1700, y: 220, rot: 24 },
  { t: 17, x: 1920, y: 176, rot: 18 },
  { t: 17.5, x: 1980, y: 164, rot: 16 },
  { t: 19, x: 2140, y: 132, rot: 14 },
  { t: 21, x: 2300, y: 150, rot: 4, ease: "easeIn" },
  { t: 22, x: 2400, y: 108, rot: -8, ease: "easeOut" },
  { t: 24.5, x: 2700, y: 28, rot: 4, ease: "easeOut" },
  { t: 26.5, x: 2860, y: -8, rot: 12, ease: "easeOut" },
  { t: 28, x: 2960, y: -28, rot: 16 },
  { t: 30, x: 3020, y: -40, rot: 18 },
];

const SCALE = clean([
  { t: 0, v: 1 },
  { t: 15, v: 1 },
  { t: 20, v: 1.12, ease: "easeIn" },
  { t: 22, v: 1.55, ease: "easeOut" },
  { t: 24.5, v: 2.25 },
  { t: 26.5, v: 2.85, ease: "easeOut" },
  { t: 28, v: 3.25 },
  { t: 30, v: 3.35 },
]);

const TURN = clean([
  { t: 0, v: 1 },
  { t: 11, v: 1 },
  { t: 12, v: 0.92, ease: "easeInOut" },
  { t: 15, v: 0.78 },
  { t: 19, v: 0.84, ease: "easeInOut" },
  { t: 21, v: 1.08 },
  { t: 22, v: 1.14, ease: "easeOut" },
  { t: 25, v: 1.02 },
  { t: 28, v: 0.88 },
  { t: 30, v: 0.88 },
]);

const PULSE_X = clean([
  { t: 0, v: 1.05 },
  { t: 1.45, v: 1.12, ease: "easeIn" },
  { t: 2, v: 0.74, ease: "easeOut" },
  { t: 3.4, v: 1.02 },
  { t: 5.6, v: 1.12, ease: "easeIn" },
  { t: 6.5, v: 0.72, ease: "easeOut" },
  { t: 8.3, v: 0.98 },
  { t: 9, v: 1 },
  { t: 11, v: 1.08 },
  { t: 12, v: 0.76, ease: "easeIn" },
  { t: 13.5, v: 1, ease: "easeOut" },
  { t: 20.4, v: 1.04 },
  { t: 21.45, v: 1.12, ease: "easeIn" },
  { t: 22, v: 0.68, ease: "easeOut" },
  { t: 24.5, v: 1.06 },
  { t: 26.05, v: 1.16, ease: "easeIn" },
  { t: 26.5, v: 0.94, ease: "easeOut" },
  { t: 28, v: 1.03 },
  { t: 30, v: 1.02 },
]);

const PULSE_Y = clean([
  { t: 0, v: 0.96 },
  { t: 1.45, v: 0.88, ease: "easeIn" },
  { t: 2, v: 1.22, ease: "easeOut" },
  { t: 3.4, v: 0.98 },
  { t: 5.6, v: 0.88, ease: "easeIn" },
  { t: 6.5, v: 1.24, ease: "easeOut" },
  { t: 8.3, v: 1.02 },
  { t: 9, v: 1 },
  { t: 11, v: 0.94 },
  { t: 12, v: 1.18, ease: "easeIn" },
  { t: 13.5, v: 1, ease: "easeOut" },
  { t: 20.4, v: 0.97 },
  { t: 21.45, v: 0.88, ease: "easeIn" },
  { t: 22, v: 1.28, ease: "easeOut" },
  { t: 24.5, v: 0.96 },
  { t: 26.05, v: 0.84, ease: "easeIn" },
  { t: 26.5, v: 1.06, ease: "easeOut" },
  { t: 28, v: 0.98 },
  { t: 30, v: 0.98 },
]);

const RIM = clean([
  { t: 0, v: 0.22 },
  { t: 10, v: 0.28 },
  { t: 11.1, v: 0.95, ease: "easeIn" },
  { t: 12.15, v: 0.9, ease: "easeOut" },
  { t: 13.4, v: 0.3 },
  { t: 27.2, v: 0.25 },
  { t: 28, v: 0.85, ease: "easeInOut" },
  { t: 29.2, v: 0.4 },
  { t: 30, v: 0.15 },
]);

function channel(pose: PoseKey[], pick: (row: PoseKey) => number): Key[] {
  return clean(pose.map((row) => ({ t: row.t, v: pick(row), ...(row.ease ? { ease: row.ease } : {}) })));
}

const POS_X = channel(POSE, (row) => row.x);
const POS_Y = channel(POSE, (row) => row.y);
const ROT = channel(POSE, (row) => row.rot);

function posAt(seconds: number): Vec {
  return { x: sampleChannel(POS_X, seconds), y: sampleChannel(POS_Y, seconds) };
}

function rotAt(seconds: number): number {
  return (sampleChannel(ROT, seconds) * Math.PI) / 180;
}

function scaleAt(seconds: number): number {
  return sampleChannel(SCALE, seconds);
}

function turnAt(seconds: number): number {
  return sampleChannel(TURN, seconds);
}

function breathAt(seconds: number): Vec {
  const wave = Math.sin(seconds * BREATH_F);
  return { x: 1 + BREATH_X * wave, y: 1 - BREATH_Y * wave };
}

function pulseAt(seconds: number): Vec {
  return { x: sampleChannel(PULSE_X, seconds), y: sampleChannel(PULSE_Y, seconds) };
}

function velocity(seconds: number): Vec {
  return normalize(sub(posAt(Math.min(DURATION, seconds + 0.08)), posAt(Math.max(0, seconds - 0.08))));
}

type Tentacle = {
  name: string;
  ax: number;
  ay: number;
  hang: number;
  l1: number;
  l2: number;
  l3: number;
  z: number;
  color: string;
  tip: string;
  w1: number;
  w2: number;
  w3: number;
  bow: number;
  root: Key[];
  tipPose: Key[];
  wave: { freq: number; phase: number; amp: number; bias: number };
  mid: { freq: number; phase: number; amp: number; bias: number };
  tipWave: { freq: number; phase: number; amp: number; bias: number };
};

function gather(rest: number): Key[] {
  const toward = rest * 0.2;
  const spread = rest * 1.22;
  const fin = rest + 8;
  return clean([
    { t: 0, v: rest },
    { t: 1.5, v: rest * 0.82, ease: "easeIn" },
    { t: 2.05, v: toward, ease: "easeOut" },
    { t: 2.85, v: spread, ease: "easeOut" },
    { t: 5, v: rest },
    { t: 6.05, v: rest * 0.78, ease: "easeIn" },
    { t: 6.55, v: toward, ease: "easeOut" },
    { t: 7.7, v: spread * 1.08, ease: "easeOut" },
    { t: 9.7, v: rest },
    { t: 11.5, v: rest, ease: "easeIn" },
    { t: 12.05, v: toward, ease: "easeOut" },
    { t: 13.2, v: spread },
    { t: 15, v: rest * 1.08 },
    { t: 21, v: rest * 1.12, ease: "easeIn" },
    { t: 22.1, v: toward * 0.7, ease: "easeOut" },
    { t: 23.5, v: spread * 1.18, ease: "easeOut" },
    { t: 24.5, v: rest + 12 },
    { t: 26.15, v: fin + 8, ease: "easeIn" },
    { t: 26.6, v: fin },
    { t: 28, v: fin + 5, ease: "easeOut" },
    { t: 30, v: fin + 3 },
  ]);
}

function delayed(source: Key[], delay: number): Key[] {
  const times = new Set<number>([0, DURATION]);
  for (const key of source) {
    times.add(roundTime(key.t));
    times.add(roundTime(key.t + delay));
  }
  return clean([...times].map((t) => ({ t, v: sampleChannel(source, Math.max(0, t - delay)) })));
}

function waveExpr(spec: Tentacle["wave"]): string {
  return `(${num(spec.bias)} + sin(local_t * ${num(spec.freq)} - ${num(spec.phase)}) * ${num(spec.amp)} * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))`;
}

function waveAt(seconds: number, spec: Tentacle["wave"]): number {
  const settle = 1 - 0.35 * clamp((seconds - 26) / 4, 0, 1);
  return spec.bias + Math.sin(seconds * spec.freq - spec.phase) * spec.amp * settle;
}

const TENTS: Tentacle[] = Array.from({ length: 8 }, (_, index) => {
  const u = index / 7;
  const hang = 30 - u * 60;
  const root = gather(hang);
  const lavender = index % 2 === 1;
  return {
    name: `tent${index}`,
    ax: -56 + u * 112,
    ay: 30 + Math.abs(u - 0.5) * 18,
    hang,
    l1: 52 + (index % 3) * 5,
    l2: 46 + ((index + 1) % 3) * 4,
    l3: 38 + (index % 4) * 5,
    z: [3, 6, 2, 7, 1, 8, 4, 5][index]!,
    color: lavender ? "#d7c8ffc8" : "#9aeff4c8",
    tip: lavender ? "#f4ecffd8" : "#e7fbffd4",
    w1: 6.2,
    w2: 4.3,
    w3: 2.5,
    bow: index % 2 === 0 ? 16 : -14,
    root,
    tipPose: delayed(root, 0.48),
    wave: { freq: 1.55, phase: index * 0.62, amp: 0.16, bias: (index % 2 === 0 ? 0.12 : -0.1) },
    mid: { freq: 1.7, phase: 0.45 + index * 0.62, amp: 0.22, bias: (index % 2 === 0 ? -0.16 : 0.14) },
    tipWave: { freq: 1.85, phase: 0.95 + index * 0.62, amp: 0.3, bias: (index % 2 === 0 ? 0.18 : -0.2) },
  };
});

function bellToWorld(seconds: number, x: number, y: number): Vec {
  const pulse = pulseAt(seconds);
  const breath = breathAt(seconds);
  const uni = scaleAt(seconds);
  const px = x * pulse.x * breath.x * turnAt(seconds) * uni;
  const py = y * pulse.y * breath.y * uni;
  const turned = rot(rotAt(seconds), px, py);
  return add(posAt(seconds), turned);
}

function tipWorld(seconds: number, tent: Tentacle): Vec {
  let point = rot(waveAt(seconds, tent.tipWave), 0, tent.l3);
  point = rot((sampleChannel(tent.tipPose, seconds) * Math.PI) / 180, point.x, point.y);
  point = { x: point.x, y: point.y + tent.l2 };
  point = rot(waveAt(seconds, tent.mid), point.x, point.y);
  point = { x: point.x, y: point.y + tent.l1 };
  point = rot(waveAt(seconds, tent.wave), point.x, point.y);
  point = rot((sampleChannel(tent.root, seconds) * Math.PI) / 180, point.x, point.y);
  point = { x: point.x + tent.ax, y: point.y + tent.ay };
  const uni = scaleAt(seconds);
  point = { x: point.x * turnAt(seconds) * uni, y: point.y * uni };
  return add(posAt(seconds), rot(rotAt(seconds), point.x, point.y));
}

const BELL_LOCAL: Array<[number, number]> = [
  [0, -74],
  [78, -12],
  [-78, -12],
  [48, 24],
  [-48, 24],
  [0, 50],
  [62, -42],
  [-62, -42],
];

function bellPoints(seconds: number): Vec[] {
  return BELL_LOCAL.map(([x, y]) => bellToWorld(seconds, x, y));
}

function tips(seconds: number): Vec[] {
  return TENTS.map((tent) => tipWorld(seconds, tent));
}

function extreme(seconds: number, points: Vec[], sign: 1 | -1): Vec {
  const vel = velocity(seconds);
  return points.reduce((best, point) => (dot(point, vel) * sign > dot(best, vel) * sign ? point : best));
}

function buildRock(): Vec[] {
  const vel = velocity(17);
  const down = (() => {
    const side = normalize({ x: -vel.y, y: vel.x });
    return side.y >= 0 ? side : mul(side, -1);
  })();
  const up = mul(down, -1);
  const lead = extreme(15, bellPoints(15), 1);
  const trail = extreme(17.5, tips(17.5), -1);
  const highest = (seconds: number) => bellPoints(seconds).reduce((best, point) => (point.y < best.y ? point : best));
  const top = highest(19);
  const exit = { x: top.x - 4, y: top.y + 8 };
  const crown = highest(17.4);
  const face = bellPoints(19)
    .filter((point) => point.y > top.y + 24)
    .reduce((best, point) => (point.x > best.x ? point : best));
  // Left wall crosses the crown at 0:15 and reaches the trailing tips at 0:17.5.
  const topLeft = add(lead, add(mul(up, 230), mul(vel, -40)));
  const roof = add(crown, mul(up, 110));
  const bottomLeft = add(trail, add(mul(down, 260), mul(vel, -24)));
  // The lip wraps just in front of the bell face, then tucks left before the final tentacles.
  const nose = add(face, mul(velocity(19), 16));
  const flank = add(extreme(18.5, tips(18.5), 1), add(mul(velocity(18.5), 22), mul(down, 16)));
  const foot = add(bottomLeft, add(mul(vel, 120), mul(down, 70)));
  const ordered = [topLeft, roof, exit, nose, flank, foot, bottomLeft];
  return insidePoly(posAt(18), ordered) ? ordered : [...ordered].reverse();
}

const ROCK = buildRock();
const ROCK_CENTER = centroid(ROCK);

const FRAME_X = clean([
  { t: 0, v: 110, ease: "easeInOut" },
  { t: 2, v: 300 },
  { t: 5, v: 490 },
  { t: 6.5, v: 570 },
  { t: 9, v: 640 },
  { t: 12, v: 730 },
  { t: 14, v: 790 },
  { t: 21, v: 700, ease: "easeInOut" },
  { t: 22, v: 680 },
  { t: 24.5, v: 660 },
  { t: 26.5, v: 760 },
  { t: 28, v: 840 },
  { t: 30, v: 840 },
]);

const FRAME_Y = clean([
  { t: 0, v: 600, ease: "easeInOut" },
  { t: 2, v: 490 },
  { t: 5, v: 400 },
  { t: 6.5, v: 350 },
  { t: 9, v: 330 },
  { t: 12, v: 300 },
  { t: 14, v: 290 },
  { t: 21, v: 270, ease: "easeInOut" },
  { t: 22, v: 240 },
  { t: 24.5, v: 230 },
  { t: 26.5, v: 210 },
  { t: 28, v: 220 },
  { t: 30, v: 220 },
]);

const FRAME_Z = clean([
  { t: 0, v: 0.76, ease: "easeInOut" },
  { t: 2, v: 0.8 },
  { t: 5, v: 0.92 },
  { t: 6.5, v: 1.04 },
  { t: 9, v: 1.14 },
  { t: 12, v: 1.16 },
  { t: 14, v: 1.12 },
  { t: 21, v: 1.02, ease: "easeInOut" },
  { t: 22, v: 1.08 },
  { t: 24.5, v: 0.84 },
  { t: 26.5, v: 0.74 },
  { t: 28, v: 0.7 },
  { t: 30, v: 0.7 },
]);

const ROCK_SX = clean([
  { t: 0, v: 860 },
  { t: 15, v: 860, ease: "easeInOut" },
  { t: 17.5, v: 730 },
  { t: 20, v: 660 },
  { t: 30, v: 660 },
]);

const ROCK_SY = clean([
  { t: 0, v: 360 },
  { t: 15, v: 350, ease: "easeInOut" },
  { t: 17.5, v: 390 },
  { t: 20, v: 410 },
  { t: 30, v: 410 },
]);

const ROCK_Z = clean([
  { t: 0, v: 1.06 },
  { t: 15, v: 1.08, ease: "easeInOut" },
  { t: 17.5, v: 0.9 },
  { t: 20, v: 0.96 },
  { t: 30, v: 0.96 },
]);

function aim(world: Vec, sx: number, sy: number, zoom: number): Cam {
  return { x: world.x - (sx - CX) / zoom, y: world.y - (sy - CY) / zoom, zoom };
}

function follow(seconds: number): Cam {
  return aim(posAt(seconds), sampleChannel(FRAME_X, seconds), sampleChannel(FRAME_Y, seconds), sampleChannel(FRAME_Z, seconds));
}

function rockCam(seconds: number): Cam {
  return aim(ROCK_CENTER, sampleChannel(ROCK_SX, seconds), sampleChannel(ROCK_SY, seconds), sampleChannel(ROCK_Z, seconds));
}

function mixCam(a: Cam, b: Cam, u: number): Cam {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), zoom: lerp(a.zoom, b.zoom, u) };
}

function cameraAt(seconds: number): Cam {
  if (seconds <= 1) return follow(0);
  if (seconds >= 28) return follow(28);
  const followed = follow(seconds);
  const rock = rockCam(seconds);
  if (seconds < 14) return followed;
  if (seconds < 16) return mixCam(followed, rock, smooth((seconds - 14) / 2));
  if (seconds < 19.5) return rock;
  if (seconds < 21.5) return mixCam(rock, followed, smooth((seconds - 19.5) / 2));
  return followed;
}

function viewAt(seconds: number): { left: number; right: number; top: number; bottom: number } {
  const cam = cameraAt(seconds);
  const halfW = CX / cam.zoom;
  const halfH = CY / cam.zoom;
  return { left: cam.x - halfW, right: cam.x + halfW, top: cam.y - halfH, bottom: cam.y + halfH };
}

function screenOf(seconds: number, world: Vec): Vec {
  const cam = cameraAt(seconds);
  return mapWorldToLogical(
    { width: VIEW_W, height: VIEW_H },
    { position: { x: cam.x, y: cam.y }, zoom: cam.zoom, rotation: 0 },
    world,
  );
}

function points(poly: readonly Vec[]): string {
  return poly.map((point) => `(${num(point.x)}, ${num(point.y)})`).join(", ");
}

/** A wedge on the rock face. It stays inside the mass so the formation reads as solid. */
function facet(indexes: number[], edge: number, depth: number): Vec[] {
  const edgePoints = indexes.map((index) => {
    const point = ROCK[index]!;
    return add(point, mul(sub(ROCK_CENTER, point), edge));
  });
  const average = mul(
    edgePoints.reduce((sum, point) => add(sum, point), { x: 0, y: 0 }),
    1 / edgePoints.length,
  );
  return [...edgePoints, add(average, mul(sub(ROCK_CENTER, average), depth))];
}

function strand(color: string, width: number, length: number, bow: number, overlap: number): string {
  return `path strand { stroke ${color} width ${num(width)} cap round; move (0, ${num(-overlap)}); quadratic (${num(bow)}, ${num(length * 0.55)}) (0, ${num(length)}); };`;
}

function blade(name: string, lean: number, width: number, height: number, fill: string): string {
  const tip = -height;
  return `    path ${name} {
      fill linear (0, 0) (${num(lean)}, ${num(tip)}) 0 ${fill} 1 #06383000;
      move (0, 0);
      quadratic (${num(-width * 0.7 + lean)}, ${num(tip * 0.42)}) (${num(lean - width * 0.1)}, ${num(tip)});
      quadratic (${num(lean + width * 0.35)}, ${num(tip * 0.62)}) (${num(width * 0.45)}, ${num(tip * 0.78)});
      quadratic (${num(width * 0.2)}, ${num(tip * 0.28)}) (0, 0);
      close;
    };`;
}

function clump(name: string, x: number, y: number, rot: number, scale: number, phase: number, fills: [string, string]): string {
  return `  group ${name} {
    position (${num(x)}, ${num(y)});
    rotation ${deg(rot)};
    scale (${num(scale)}, ${num(scale)});
    ${blade("leafA", -18, 34, 210, fills[0])}
    ${blade("leafB", 16, 28, 250, fills[1])}
    ${blade("leafC", 4, 22, 180, fills[0])}
  };`;
}

function sway(name: string, phase: number, amount: number): string {
  return `animate ${name}.rotation {\n  expression "${num(amount)} * sin(local_t * 0.42 + ${num(phase)})";\n  start 0s;\n  duration 30s;\n};\n`;
}

const opening = viewAt(0);
const climb = posAt(7.1);
const tall = posAt(8.7);
const finale = viewAt(29);

function emit(): string {
  const lines: string[] = [];
  lines.push(`// THROUGH THE BLUE
// 30 seconds. A translucent jellyfish crosses a moonlit reef.
// 0:00 first light, 0:05 through the plants, 0:10 crossing light,
// 0:15 behind the rocks, 0:20 into the foreground, 0:25 suspended glow.
// Sound is not a MotionScript channel. Cues from the score stay in comments:
// underwater ambience throughout, a rounded tone on each pulse,
// a shimmer in the light at 0:11 and again at 0:28, fading by 0:30.
scene "through-the-blue" {
  version "0.2";
  viewport (1280, 720);
  background #031820;
  duration 30s;
  requires "paint.linearGradient";
  requires "paint.radialGradient";
  requires "compositing.blend";
  requires "compositing.isolatedOpacity";
  requires "effects.blur";
};
camera main {
  position (${num(cameraAt(0).x)}, ${num(cameraAt(0).y)});
  zoom ${num(cameraAt(0).zoom)};
  rotation 0deg;
};
rectangle abyss {
  position (-1600, -900);
  size (6400, 2800);
  fill linear (0, 0) (0, 2800) 0 #0c6070 0.42 #084552 1 #021016;
  zIndex 0;
};
rectangle depth {
  position (-1600, 620);
  size (6400, 1200);
  opacity 0.55;
  fill linear (0, 0) (0, 1200) 0 #02182000 1 #010c10ee;
  zIndex 1;
};
group caustA {
  position (420, 260);
  blend screen;
  blur 28;
  opacity 0.42;
  zIndex 3;
  ellipse pool { size (760, 280); fill radial (0, 0) 260 0 #d8fbff66 1 #7ee8f000; };
};
group caustB {
  position (1680, 180);
  blend screen;
  blur 34;
  opacity 0.28;
  zIndex 3;
  ellipse pool { size (920, 340); fill radial (0, 0) 320 0 #efe7ff44 1 #9d8cff00; };
};
group farBed {
  zIndex 6;
  ${clump("kelpA", opening.left + 180, opening.bottom - 30, -6, 1.15, 0.4, ["#0d5c54ee", "#14685ccc"])}
  ${clump("kelpB", opening.left + 420, opening.bottom + 20, 8, 0.9, 1.3, ["#0c4e48dd", "#18806ecc"])}
  ${clump("kelpC", 1280, 760, -4, 1, 2.1, ["#0e564eee", "#1a7464bb"])}
  ${clump("kelpD", ROCK_CENTER.x - 180, ROCK_CENTER.y + 210, 6, 0.85, 0.8, ["#0b4642cc", "#157264aa"])}
};
group midBed {
  zIndex 10;
  ${clump("frondL", posAt(2).x - 150, posAt(2).y + 90, -8, 1.05, 0.2, ["#127066ee", "#1c8874cc"])}
  ${clump("frondR", posAt(2).x + 130, posAt(2).y + 120, 10, 0.95, 1.6, ["#0f5e56ee", "#188672bb"])}
  ${clump("gapL", climb.x - 70, climb.y + 150, -12, 1.2, 0.7, ["#14685cee", "#238f78cc"])}
  ${clump("gapTall", tall.x + 20, tall.y + 210, 4, 1.35, 1.1, ["#0e6258ee", "#1b7c6acc"])}
  line grassA { position (${num(opening.right - 260)}, ${num(opening.bottom - 10)}); from (0, 0); to (18, -230); stroke #1a8f78bb width 4 cap round; };
  line grassB { position (${num(opening.left + 80)}, ${num(opening.bottom - 20)}); from (0, 0); to (-12, -190); stroke #14685cbb width 3 cap round; };
};
group dust {
  zIndex 7;
  ${Array.from({ length: 10 }, (_, index) => {
    const x = opening.left + 180 + index * 90;
    const y = 280 + (index % 4) * 70;
    return `  circle mote${index} { position (${num(x)}, ${num(y)}); radius ${num(1.6 + (index % 3) * 0.45)}; fill #e7fdff; opacity ${num(0.28 + (index % 3) * 0.08)}; };`;
  }).join("\n")}
};
group farBubbles {
  zIndex 8;
  ${[0, 1, 2, 3, 4].map((index) => `  circle b${index} { position (${num(200 + index * 260)}, ${num(640 - index * 40)}); radius ${num(3.5 + index)}; fill #d7fbff55; stroke #f4fdffaa width 1.2; };`).join("\n")}
};
group shaftBack {
  position (480, 180);
  rotation 18deg;
  blend screen;
  blur 16;
  opacity 0.55;
  zIndex 12;
  rectangle beam {
    position (-46, -640);
    pivot (46, 640);
    size (92, 1280);
    fill linear (0, 0) (92, 0) 0 #bff7ff00 0.5 #e7fdff88 1 #bff7ff00;
  };
};
group jelly {
  position (${num(posAt(0).x)}, ${num(posAt(0).y)});
  rotation ${deg(sampleChannel(ROT, 0))};
  scale (${num(scaleAt(0))}, ${num(scaleAt(0))});
  zIndex 18;
  group turn {
    scale (${num(turnAt(0))}, 1);
    group bellBreath {
      zIndex 10;
      group bellPulse {
        group glow {
          blur 20;
          opacity 0.85;
          ellipse halo {
            position (0, -8);
            size (210, 156);
            fill radial (-8, -16) 86 0 #f7fbffcc 0.4 #b7a6ff55 1 #5ee7f000;
          };
        };
        ellipse dome {
          position (0, -6);
          size (176, 126);
          opacity 0.58;
          fill radial (-22, -24) 84 0 #f8fdffee 0.26 #b9fff2aa 0.58 #8b7cff66 1 #14687800;
        };
        ellipse inner {
          position (8, -2);
          size (112, 80);
          opacity 0.74;
          fill radial (0, -4) 48 0 #f4ecffee 0.5 #b9a2ff99 1 #67e8f000;
        };
        ellipse ring {
          position (0, 8);
          size (86, 58);
          stroke #eddffc width 3.4;
        };
        ellipse rim {
          position (-34, -14);
          size (58, 40);
          opacity ${num(sampleChannel(RIM, 0))};
          fill radial (0, 0) 30 0 #e7fdffee 1 #7ef9ff00;
        };
        circle glint {
          position (0, -74);
          radius 4;
          fill #f7fdff;
          opacity 0.9;
        };
      };
    };
    ${TENTS.map((tent) => `    group ${tent.name} {
      position (${num(tent.ax)}, ${num(tent.ay)});
      rotation ${deg(sampleChannel(tent.root, 0))};
      zIndex ${tent.z};
      group wave {
        ${strand(tent.color, tent.w1, tent.l1, tent.bow, 4)}
        group mid {
          position (0, ${num(tent.l1)});
          ${strand(tent.color, tent.w2, tent.l2, -tent.bow * 0.85, 4)}
          group tipPose {
            position (0, ${num(tent.l2)});
            group tipWave {
              ${strand(tent.tip, tent.w3, tent.l3, tent.bow * 0.6, 3)}
            };
          };
        };
      };
    };`).join("\n")}
  };
};
group shaftCross {
  position (${num(posAt(11).x)}, ${num(posAt(11).y - 80)});
  rotation 16deg;
  blend screen;
  blur 18;
  opacity 0.2;
  zIndex 22;
  rectangle beam {
    position (-70, -720);
    pivot (70, 720);
    size (140, 1440);
    fill linear (0, 0) (140, 0) 0 #c8fbff00 0.48 #f4feff99 1 #d8c8ff00;
  };
};
group shaftLast {
  position (${num(posAt(28).x - 160)}, ${num(posAt(28).y - 40)});
  rotation 20deg;
  blend screen;
  blur 14;
  opacity 0;
  zIndex 22;
  rectangle beam {
    position (-54, -560);
    pivot (54, 560);
    size (108, 1120);
    fill linear (0, 0) (108, 0) 0 #d5fbff00 0.5 #f7fdffaa 1 #c9b6ff00;
  };
};
group rock {
  zIndex 30;
  polygon mass {
    points (${points(ROCK)});
    fill #163e48;
  };
  polygon shade {
    points (${points(facet([4, 5, 6], 0.14, 0.42))});
    fill #0e2c34;
  };
  polygon lit {
    points (${points(facet([0, 1, 2], 0.12, 0.38))});
    fill #1e4c58;
  };
};
group maskFrond {
  position (${num(climb.x + 10)}, ${num(climb.y + 170)});
  rotation -14deg;
  zIndex 26;
  ${blade("leaf", -10, 46, 150, "#1a8a74ee")}
  ${blade("leafB", 22, 30, 120, "#146456dd")}
};
group foreBed {
  zIndex 44;
  ${clump("cornerL", opening.left + 40, opening.bottom + 10, -16, 1.35, 0.3, ["#178878ee", "#2aa890cc"])}
  ${clump("cornerR", opening.right - 120, opening.bottom + 30, 14, 1.25, 1.8, ["#126e64ee", "#1f9880cc"])}
};
circle heroBubble {
  position (${num(posAt(5.6).x - 30)}, ${num(posAt(5.6).y + 150)});
  radius 26;
  fill #ffffff14;
  stroke #f3fdffcc width 2.2;
  zIndex 46;
};
group nearMotes {
  zIndex 48;
  ${Array.from({ length: 8 }, (_, index) => {
    const x = posAt(22).x - 200 + index * 70;
    const y = posAt(22).y - 80 + (index % 3) * 50;
    return `  circle mote${index} { position (${num(x)}, ${num(y)}); radius ${num(2.2 + (index % 3) * 0.5)}; fill #f4feff; opacity 0.45; };`;
  }).join("\n")}
};
group nearBubbles {
  zIndex 50;
  circle bigA { position (${num(finale.left + 220)}, ${num(finale.bottom - 40)}); radius 18; fill #ffffff10; stroke #f7fdffbb width 2; };
  circle bigB { position (${num(finale.left + 340)}, ${num(finale.bottom - 90)}); radius 11; stroke #e7fbffaa width 1.6; };
};
group rise {
  opacity 0;
  zIndex 9;
  ${[0, 1, 2, 3, 4, 5].map((index) => `  circle b${index} { position (${num(finale.left + 160 + index * 36)}, ${num(finale.bottom - 20 - index * 14)}); radius ${num(2.4 + (index % 3))}; fill #e5fbffaa; };`).join("\n")}
};
ellipse vignette {
  space screen;
  position (640, 360);
  size (1680, 1080);
  opacity 0.42;
  zIndex 80;
  fill radial (0, 0) 430 0 #00000000 0.62 #00000000 1 #021016cc;
};
rectangle fade {
  space screen;
  position (0, 0);
  size (1280, 720);
  fill #04262e;
  opacity 0;
  zIndex 100;
};
`);

  const cameraTimes = new Set<number>([0, 1, 28, 30]);
  for (let t = 0; t <= DURATION; t += 0.25) cameraTimes.add(roundTime(t));
  const cameraKeys = [...cameraTimes].sort((a, b) => a - b).map((t) => ({ t, cam: cameraAt(t) }));
  lines.push(`// Camera. Hold the wide view for one second, track right, move closer,
// drift up through the light, widen on the rock, then pull back and stop at 0:28.
${track(
  "camera(main).position.x",
  cameraKeys.map((key) => ({ t: key.t, v: key.cam.x })),
  "num",
)}
${track(
  "camera(main).position.y",
  cameraKeys.map((key) => ({ t: key.t, v: key.cam.y })),
  "num",
)}
${track(
  "camera(main).zoom",
  cameraKeys.map((key) => ({ t: key.t, v: key.cam.zoom })),
  "num",
)}`);

  lines.push(`// Jellyfish travel. Contractions at 0:02, 0:06.5, 0:12, 0:22 and a small settle at 0:26.5.
// Glides ease out. Travel behind the rock stays steady.
// Pulse tones sit on those contractions; the shimmer sits on the rim track.
${track("jelly.position.x", POS_X, "num")}
${track("jelly.position.y", POS_Y, "num")}
${track("jelly.rotation", ROT, "deg")}
${track("jelly.scale.x", SCALE, "num", "Approach. Scale stands in for coming toward the lens while the camera pulls back.")}
${track("jelly.scale.y", SCALE, "num")}
${track("jelly.turn.scale.x", TURN, "num", "Foreshorten while the bell angles away, then broaden as the near side turns in.")}
`);

  lines.push(`animate jelly.turn.bellBreath.scale.x {
  expression "1 + ${BREATH_X} * sin(local_t * ${BREATH_F})";
  start 0s;
  duration 30s;
};
animate jelly.turn.bellBreath.scale.y {
  expression "1 - ${BREATH_Y} * sin(local_t * ${BREATH_F})";
  start 0s;
  duration 30s;
};
${track("jelly.turn.bellBreath.bellPulse.scale.x", PULSE_X, "num", "Bell opens, then contracts. The last two seconds stay nearly open so the breath reads.")}
${track("jelly.turn.bellBreath.bellPulse.scale.y", PULSE_Y, "num")}
${track("jelly.turn.bellBreath.bellPulse.rim.opacity", RIM, "num", "Near rim brightens in the shaft at 0:11 and again as the last shaft crosses at 0:28.")}
`);

  for (const tent of TENTS) {
    lines.push(`// ${tent.name}: hang ${num(tent.hang)}deg, tip pose lags the root by 0.48s.
${track(`jelly.turn.${tent.name}.rotation`, tent.root, "deg")}
${track(`jelly.turn.${tent.name}.wave.mid.tipPose.rotation`, tent.tipPose, "deg")}
animate jelly.turn.${tent.name}.wave.rotation {
  expression "${waveExpr(tent.wave)}";
  start 0s;
  duration 30s;
};
animate jelly.turn.${tent.name}.wave.mid.rotation {
  expression "${waveExpr(tent.mid)}";
  start 0s;
  duration 30s;
};
animate jelly.turn.${tent.name}.wave.mid.tipPose.tipWave.rotation {
  expression "${waveExpr(tent.tipWave)}";
  start 0s;
  duration 30s;
};
`);
  }

  lines.push(`// Plants sway in one current. Foreground beds slide left faster than the far reef.
${["farBed.kelpA", "farBed.kelpB", "farBed.kelpC", "farBed.kelpD", "midBed.frondL", "midBed.frondR", "midBed.gapL", "midBed.gapTall", "maskFrond", "foreBed.cornerL", "foreBed.cornerR"]
  .map((name, index) => sway(name, index * 0.7, index % 2 === 0 ? 0.05 : -0.045))
  .join("")}
${track("farBed.position.x", [{ t: 0, v: 0 }, { t: 5, v: 30 }, { t: 10, v: 140, ease: "easeInOut" }, { t: 30, v: 280 }], "num")}
${track("midBed.position.x", [{ t: 0, v: 0 }, { t: 5, v: 8 }, { t: 10, v: 36 }, { t: 30, v: 70 }], "num")}
${track("foreBed.position.x", [{ t: 0, v: 0 }, { t: 5, v: -16, ease: "easeInOut" }, { t: 10, v: -120 }, { t: 30, v: -200 }], "num")}
${track("maskFrond.position.x", [{ t: 0, v: climb.x + 10 }, { t: 5, v: climb.x }, { t: 10, v: climb.x - 70 }, { t: 30, v: climb.x - 120 }], "num")}
`);

  lines.push(`animate caustA.position.x { expression "420 + sin(local_t * 0.23) * 70"; start 0s; duration 30s; };
animate caustB.position.x { expression "1680 + sin(local_t * 0.17 + 1.2) * 90"; start 0s; duration 30s; };
${track("shaftBack.position.x", [{ t: 0, v: 360 }, { t: 2.4, v: 520, ease: "easeInOut" }, { t: 5, v: 700 }, { t: 30, v: 980 }], "num", "First shaft sweeps the opening and the dust brightens inside it.")}
${track("shaftBack.opacity", [{ t: 0, v: 0.25 }, { t: 1.6, v: 0.7, ease: "easeInOut" }, { t: 4.2, v: 0.55 }, { t: 8, v: 0.2 }, { t: 30, v: 0.12 }], "num")}
${track("dust.opacity", [{ t: 0, v: 0.35 }, { t: 2.2, v: 1, ease: "easeInOut" }, { t: 4.6, v: 0.85 }, { t: 7, v: 0.4 }, { t: 30, v: 0.3 }], "num")}
${track("shaftCross.position.x", [{ t: 0, v: posAt(10).x - 80 }, { t: 10, v: posAt(10).x - 40 }, { t: 12.4, v: posAt(12.4).x + 30, ease: "easeInOut" }, { t: 15, v: posAt(15).x + 80 }, { t: 30, v: posAt(15).x + 160 }], "num", "Second shaft crosses the bell. Particles behind the dome stay visible through it.")}
${track("shaftCross.opacity", [{ t: 0, v: 0 }, { t: 9.6, v: 0.15 }, { t: 11.2, v: 0.72, ease: "easeInOut" }, { t: 13.5, v: 0.4 }, { t: 16, v: 0.08 }, { t: 30, v: 0 }], "num")}
${track("shaftLast.position.x", [{ t: 0, v: posAt(28).x - 220 }, { t: 27.2, v: posAt(28).x - 180 }, { t: 28, v: posAt(28).x + 10, ease: "easeInOut" }, { t: 29.4, v: posAt(28).x + 200 }, { t: 30, v: posAt(28).x + 240 }], "num", "Last shaft slides across the open bell.")}
${track("shaftLast.opacity", [{ t: 0, v: 0 }, { t: 27.3, v: 0 }, { t: 28, v: 0.78, ease: "easeInOut" }, { t: 29, v: 0.2 }, { t: 30, v: 0 }], "num")}
`);

  const bubbleYs = [34, 46, 28, 40, 52];
  lines.push(bubbleYs.map((speed, index) => `animate farBubbles.b${index}.position.y {\n  expression "${num(640 - index * 40)} - (local_t * ${speed} % 920)";\n  start 0s;\n  duration 30s;\n};`).join(""));
  lines.push(`
${track("heroBubble.position.x", [{ t: 0, v: posAt(5).x - 80 }, { t: 5.4, v: posAt(5.6).x - 40 }, { t: 7.4, v: posAt(7.4).x + 20, ease: "easeInOut" }, { t: 9.6, v: posAt(9).x + 90 }, { t: 30, v: posAt(9).x + 200 }], "num", "One larger bubble crosses in front of the trailing tentacles.")}
${track("heroBubble.position.y", [{ t: 0, v: posAt(5).y + 180 }, { t: 5.4, v: posAt(5.6).y + 140 }, { t: 7.4, v: posAt(7.4).y + 70, ease: "easeOut" }, { t: 9.6, v: posAt(9).y + 10 }, { t: 30, v: posAt(9).y - 80 }], "num")}
${[18, 26, 22].map((speed, index) => `animate nearBubbles.${["bigA", "bigB"][index] ?? "bigA"}.position.y {\n  expression "${num(index === 0 ? finale.bottom - 40 : finale.bottom - 90)} - local_t * ${speed / 6}";\n  start 0s;\n  duration 30s;\n};`).slice(0, 2).join("")}
${track("rise.opacity", [{ t: 0, v: 0 }, { t: 26.2, v: 0 }, { t: 27.4, v: 0.85 }, { t: 30, v: 0.7 }], "num", "Final cluster of small bubbles, behind the jellyfish.")}
${[0, 1, 2, 3, 4, 5].map((index) => `animate rise.b${index}.position.y {\n  expression "${num(finale.bottom - 20 - index * 14)} - local_t * ${num(16 + index * 3)}";\n  start 0s;\n  duration 30s;\n};`).join("")}
`);

  lines.push(`animate nearMotes.position.x { expression "sin(local_t * 0.8) * 24"; start 0s; duration 30s; };
${Array.from({ length: 10 }, (_, index) => `animate dust.mote${index}.position.y {\n  expression "${num(280 + (index % 4) * 70)} + sin(local_t * ${num(0.35 + index * 0.04)} + ${num(index)}) * 16 - local_t * ${num(4 + (index % 3))}";\n  start 0s;\n  duration 30s;\n};`).join("")}
${Array.from({ length: 8 }, (_, index) => `animate nearMotes.mote${index}.position.x {\n  expression "${num(posAt(22).x - 200 + index * 70)} - local_t * ${num(10 + index * 2)}";\n  start 0s;\n  duration 30s;\n};`).join("")}
${track("fade.opacity", [{ t: 0, v: 0 }, { t: 29, v: 0, ease: "easeIn" }, { t: 30, v: 1 }], "num", "Fade to deep teal.")}
complete;
`);

  return lines.join("\n");
}

function coverage(seconds: number): { lead: boolean; bell: number; tips: number } {
  const lead = extreme(seconds, bellPoints(seconds), 1);
  return {
    lead: covered(lead, ROCK),
    bell: bellPoints(seconds).filter((point) => covered(point, ROCK)).length,
    tips: tips(seconds).filter((point) => covered(point, ROCK)).length,
  };
}

function verify(source: string): void {
  const compiled = compileMotionScript(source);
  if (!compiled.ok || !compiled.scene) {
    const messages = compiled.diagnostics.map((item) => item.message).join("\n");
    throw new Error(`compile failed\n${messages}`);
  }
  const scene = compiled.scene;
  console.log(`nodes ${scene.nodes.length}  tracks ${scene.timeline.tracks.length}  rock ${ROCK.length} pts  center ${num(ROCK_CENTER.x)}, ${num(ROCK_CENTER.y)}`);
  const runtime = new AnimationRuntime(scene);
  const times = [0, 1, 2, 5, 6.5, 9, 12, 15, 16.5, 17.5, 18.2, 19, 21, 22, 24.5, 26.5, 28, 30];
  let worst = 0;
  for (const seconds of times) {
    const frame = runtime.evaluate(seconds * 1000);
    const glint = frame.drawItems.find((item) => item.nodeId === "jelly.turn.bellBreath.bellPulse.glint");
    if (!glint) throw new Error("missing glint");
    const actual = transformPoint(glint.logicalMatrix, 0, 0);
    const predicted = screenOf(seconds, bellToWorld(seconds, 0, -74));
    const error = Math.hypot(actual.x - predicted.x, actual.y - predicted.y);
    worst = Math.max(worst, error);
    const cover = coverage(seconds);
    const origin = screenOf(seconds, posAt(seconds));
    console.log(
      `${seconds.toFixed(1).padStart(5)}s  jelly (${num(origin.x)}, ${num(origin.y)})  fk ${error.toFixed(2)}px  lead ${cover.lead ? "in" : "out"}  bell ${cover.bell}/8  tips ${cover.tips}/8`,
    );
    if (frame && runtime.degraded) {
      console.log(runtime.lastDiagnostics.map((item) => item.message).join("\n"));
    }
  }
  const tipItem = runtime.evaluate(17000).drawItems.find((item) => item.nodeId === "jelly.turn.tent0.wave.mid.tipPose.tipWave.strand");
  const tipEnd = tipItem?.geometry.kind === "path" ? tipItem.geometry.commands.find((command) => command.cmd === "Q") : undefined;
  if (!tipItem || !tipEnd || tipEnd.cmd !== "Q") throw new Error("missing tent0 tip");
  const actualTip = transformPoint(tipItem.logicalMatrix, tipEnd.x, tipEnd.y);
  const predictedTip = screenOf(17, tipWorld(17, TENTS[0]!));
  const tipError = Math.hypot(actualTip.x - predictedTip.x, actualTip.y - predictedTip.y);
  console.log(`tent0 tip fk ${tipError.toFixed(2)}px at 17s  worst glint ${worst.toFixed(2)}px`);
  if (worst > 3 || tipError > 3) throw new Error("forward kinematics drifted from the runtime");
  const at = (seconds: number) => coverage(seconds);
  const problems: string[] = [];
  const highestCovered = (seconds: number) => {
    const top = bellPoints(seconds).reduce((best, point) => (point.y < best.y ? point : best));
    return covered(top, ROCK);
  };
  if (at(14.6).lead) problems.push("leading edge already inside the rock at 14.6s");
  if (!at(15.15).lead) problems.push("leading edge has not entered at 15.15s");
  if (at(16.2).tips === 8) problems.push("all tips hidden too early at 16.2s");
  if (at(17.5).tips < 7) problems.push(`last tip has not arrived by 17.5s (${at(17.5).tips} inside)`);
  if (at(18.2).bell < 8 || at(18.2).tips < 7) problems.push(`not concealed at 18.2s bell ${at(18.2).bell} tips ${at(18.2).tips}`);
  if (highestCovered(19.05)) problems.push("upper rim still covered at 19.05s");
  if (at(19.05).bell < 5) problems.push(`too much of the bell is already clear at 19.05s (${at(19.05).bell} still inside)`);
  if (at(21.15).bell > 2) problems.push(`bell still behind the rock at 21.15s (${at(21.15).bell})`);
  if (at(21.15).tips < 1) problems.push("tentacles have all cleared by 21.15s");
  if (at(28).tips > 0 || at(30).tips > 0 || at(28).bell > 0) problems.push("the final jellyfish still meets the rock");
  const endRock = screenOf(30, ROCK_CENTER);
  const endJelly = screenOf(30, posAt(30));
  console.log(`finale jelly (${num(endJelly.x)}, ${num(endJelly.y)}) rock (${num(endRock.x)}, ${num(endRock.y)})`);
  if (problems.length) {
    for (const seconds of [18.2, 19, 21.1, 24.2, 26.5]) {
      const outside = [...bellPoints(seconds), ...tips(seconds)].filter((point) => !covered(point, ROCK));
      console.log(
        `outside ${seconds}s`,
        outside.map((point) => `${num(point.x)},${num(point.y)}`).join(" | ") || "none",
      );
    }
    console.log("poly", ROCK.map((point) => `${num(point.x)},${num(point.y)}`).join(" | "));
    throw new Error(problems.join("\n"));
  }
}

const source = emit();
const out = resolve(dirname(fileURLToPath(import.meta.url)), "through-the-blue.ms");
writeFileSync(out, source);
verify(source);
console.log(`wrote ${out} (${source.length} bytes)`);
