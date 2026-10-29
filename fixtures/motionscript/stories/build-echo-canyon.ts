/**
 * Builds fixtures/motionscript/stories/echo-canyon.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-echo-canyon.ts
 * Set GVR_PREVIEW_DIR to also render PNG stills through the real CanvasRenderer
 * in headless Chromium (needs Playwright and a Chromium it can launch).
 *
 * Twenty seconds of kinetic typography. ECHO is called from the lower centre,
 * strikes the right wall, and five repetitions ricochet deeper into a V-shaped
 * sandstone canyon, each smaller, cooler and more transparent, until the last
 * one fades toward the distant opening.
 * 0:00 reveal. 0:01 squeeze. 0:01.5–3.5 flight. 0:03.5 contact, imprint.
 * 0:04 first reflection (75%), push begins. 0:07 left wall.
 * 0:08 second (55%), 0:10.5 right wall, third (38%). 0:12.5 left ledge, fourth (25%).
 * 0:15 right wall, fifth (15%). 0:18.5 gone. 0:20 empty canyon.
 *
 * The canyon is a 3D model (pinhole camera, focal F, vanishing point VP) baked
 * into nine fronto-parallel rock "ribs". GVR's camera is 2D, so the forward
 * push is a dolly: each rib scales about VP by Z / (Z - push(t)), written as
 * an expression track. That is exact perspective for planes at constant depth.
 * Floor edges and strata run along rays through VP, which the dolly leaves
 * fixed. The words cross depth, so their position, scale and tilt are sampled
 * from the same model and simplified to keyframes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, KEYWORD_SET, transformPoint, validateSceneIR, type ResolvedDrawItem, type ResolvedFrame } from "@gvr/schema";

const STARTED = performance.now();
const DURATION = 20;
const W = 1280;
const H = 720;

// ---------------------------------------------------------------- palette

const SKY_TOP = "#0d0718";
const SKY_LOW = "#2a1740";
const GLOW = "#f2b884";
const BACK = "#1c0f2a";
// Rib colours from the nearest fin to the farthest, warm sandstone into violet haze.
const RIB_WALL = ["#c9814a", "#c07644", "#b56c42", "#9f5f40", "#855140", "#6a4344", "#523948", "#3f2f4a", "#30274a"];
const RIB_FLOOR = ["#8c5233", "#844c33", "#7a4734", "#6a4036", "#583a39", "#47323d", "#392b42", "#2e2545", "#262248"];
const RIB_STRATA = ["#9a5a33", "#925433", "#874e34", "#744534", "#613d36", "#4f343b", "#3f2c41", "#322645", "#282148"];
const RIB_RIM = ["#f4c48e", "#f0bd8a", "#e9b487", "#d9a585", "#c49484", "#a98486", "#8f768c", "#786c91", "#6a6596"];

// ---------------------------------------------------------------- canyon model

/** Focal length in pixels, vanishing point, push depth. */
const F = 900;
const VP = { x: 640, y: 300 };
const PUSH = 170;
/** Reference depth: a word of size 1 at this depth draws at scale 1. */
const ZREF = 760;
/** Wall half-width at height Y is W_EYE + SLOPE * Y. The floor is at FLOOR_Y. */
const W_EYE = 360;
const SLOPE = 0.75;
const FLOOR_Y = -300;
const W_FLOOR = W_EYE + SLOPE * FLOOR_Y;
const RIB_Z = [430, 560, 760, 1050, 1450, 1950, 2650, 3600, 5600];
const RIM_Y = [1100, 1050, 1000, 980, 950, 900, 860, 820, 760];

type Pt = { x: number; y: number };
type P3 = { X: number; Y: number; Z: number };

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function smooth(u: number): number {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
}

/** Camera dolly distance at scene time t (seconds). The expression tracks repeat this formula. */
function push(t: number): number {
  return PUSH * smooth((t - 4) / 12);
}

function pushExpression(z: number): string {
  const u = "clamp((t - 4) / 12, 0, 1)";
  return `${z} / (${z} - ${PUSH} * pow(${u}, 2) * (3 - 2 * ${u}))`;
}

/** Screen point of a world point with the camera pushed by c. */
function project(p: P3, c = 0): Pt {
  return { x: VP.x + (F * p.X) / (p.Z - c), y: VP.y - (F * p.Y) / (p.Z - c) };
}

/** World point of a base-frame (c = 0) screen point at depth Z. */
function unproject(p: Pt, Z: number): P3 {
  return { X: ((p.x - VP.x) * Z) / F, Y: ((VP.y - p.y) * Z) / F, Z };
}

function halfWidth(Y: number): number {
  return W_EYE + SLOPE * Y;
}

// Deterministic noise for rock edges.
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- glyphs

/** Bold condensed capitals, cap height 120, advance 60, stem 21. Centered on (0, 0). */
type Cmd = { cmd: "M" | "L"; x: number; y: number } | { cmd: "C"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number } | { cmd: "Z" };
const CAP = 120;
const ADV = 60;
const GAP = 9;
const PITCH = ADV + GAP;
const HW = (4 * ADV + 3 * GAP) / 2;
const HH = CAP / 2;
const LETTER_X = [-1.5, -0.5, 0.5, 1.5].map((k) => k * PITCH);

function poly(points: number[][]): Cmd[] {
  const out: Cmd[] = points.map(([x, y], index) => ({ cmd: index === 0 ? "M" : "L", x: x!, y: y! }));
  out.push({ cmd: "Z" });
  return out;
}

/** Cubic arc from a0 to a1 (degrees, y down) about (cx, cy). Optional ry for ellipses. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, ry = r): Cmd[] {
  const out: Cmd[] = [];
  const pieces = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
  const step = (a1 - a0) / pieces;
  for (let index = 0; index < pieces; index += 1) {
    const s = ((a0 + step * index) * Math.PI) / 180;
    const e = ((a0 + step * (index + 1)) * Math.PI) / 180;
    const k = (4 / 3) * Math.tan((e - s) / 4);
    const p0 = { x: Math.cos(s), y: Math.sin(s) };
    const p3 = { x: Math.cos(e), y: Math.sin(e) };
    out.push({
      cmd: "C",
      c1x: cx + r * (p0.x - k * p0.y),
      c1y: cy + ry * (p0.y + k * p0.x),
      c2x: cx + r * (p3.x + k * p3.y),
      c2y: cy + ry * (p3.y - k * p3.x),
      x: cx + r * p3.x,
      y: cy + ry * p3.y,
    });
  }
  return out;
}

const GLYPH: Record<string, Cmd[]> = {
  E: poly([[-30, -60], [30, -60], [30, -40], [-9, -40], [-9, -10], [22, -10], [22, 10], [-9, 10], [-9, 40], [30, 40], [30, 60], [-30, 60]]),
  H: poly([[-30, -60], [-9, -60], [-9, -10], [9, -10], [9, -60], [30, -60], [30, 60], [9, 60], [9, 10], [-9, 10], [-9, 60], [-30, 60]]),
  O: [
    { cmd: "M", x: 30, y: -30 },
    { cmd: "L", x: 30, y: 30 },
    ...arc(0, 30, 30, 0, 180),
    { cmd: "L", x: -30, y: -30 },
    ...arc(0, -30, 30, 180, 360),
    { cmd: "Z" },
    { cmd: "M", x: 9, y: -30 },
    { cmd: "L", x: 9, y: 30 },
    ...arc(0, 30, 9, 0, 180),
    { cmd: "L", x: -9, y: -30 },
    ...arc(0, -30, 9, 180, 360),
    { cmd: "Z" },
  ],
  C: [
    { cmd: "M", x: 30, y: -20 },
    { cmd: "L", x: 30, y: -30 },
    ...arc(0, -30, 30, 0, -180),
    { cmd: "L", x: -30, y: 30 },
    ...arc(0, 30, 30, 180, 0),
    { cmd: "L", x: 30, y: 20 },
    { cmd: "L", x: 9, y: 20 },
    { cmd: "L", x: 9, y: 30 },
    ...arc(0, 30, 9, 0, 180),
    { cmd: "L", x: -9, y: -30 },
    ...arc(0, -30, 9, 180, 360),
    { cmd: "L", x: 9, y: -20 },
    { cmd: "Z" },
  ],
};

function shift(commands: Cmd[], dx: number, dy: number): Cmd[] {
  return commands.map((c) =>
    c.cmd === "Z" ? c : c.cmd === "C" ? { ...c, c1x: c.c1x + dx, c1y: c.c1y + dy, c2x: c.c2x + dx, c2y: c.c2y + dy, x: c.x + dx, y: c.y + dy } : { ...c, x: c.x + dx, y: c.y + dy },
  );
}

const WORD_CMDS: Cmd[] = "ECHO".split("").flatMap((letter, index) => shift(GLYPH[letter]!, LETTER_X[index]!, 0));

/** Outline samples of the word (word-local), tagged with their letter. */
const OUTLINE: { p: { x: number; y: number }; letter: number }[] = "ECHO".split("").flatMap((letter, index) => {
  const out: { p: { x: number; y: number }; letter: number }[] = [];
  let cursor = { x: 0, y: 0 };
  for (const c of shift(GLYPH[letter]!, LETTER_X[index]!, 0)) {
    if (c.cmd === "Z") continue;
    if (c.cmd === "C") {
      for (let k = 1; k <= 24; k += 1) {
        const u = k / 24;
        const m = 1 - u;
        out.push({
          p: {
            x: m * m * m * cursor.x + 3 * m * m * u * c.c1x + 3 * m * u * u * c.c2x + u * u * u * c.x,
            y: m * m * m * cursor.y + 3 * m * m * u * c.c1y + 3 * m * u * u * c.c2y + u * u * u * c.y,
          },
          letter: index,
        });
      }
    } else out.push({ p: { x: c.x, y: c.y }, letter: index });
    cursor = { x: c.x, y: c.y };
  }
  return out;
});

/** The outline point farthest along a direction: where the word touches a wall with that normal. */
function support(direction: { x: number; y: number }): { p: { x: number; y: number }; letter: number } {
  let best = OUTLINE[0]!;
  for (const sample of OUTLINE) if (sample.p.x * direction.x + sample.p.y * direction.y > best.p.x * direction.x + best.p.y * direction.y) best = sample;
  return best;
}

function wallNormal(side: 1 | -1): { x: number; y: number } {
  const len = Math.hypot(1, SLOPE);
  return { x: side / len, y: SLOPE / len };
}

// ---------------------------------------------------------------- formatting

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function v2(p: Pt, digits = 2): string {
  return `(${n(p.x, digits)}, ${n(p.y, digits)})`;
}

function cmds(commands: Cmd[], digits = 2): string {
  return commands
    .map((c) => {
      if (c.cmd === "M") return `move (${n(c.x, digits)}, ${n(c.y, digits)});`;
      if (c.cmd === "L") return `line (${n(c.x, digits)}, ${n(c.y, digits)});`;
      if (c.cmd === "C") return `cubic (${n(c.c1x, digits)}, ${n(c.c1y, digits)}) (${n(c.c2x, digits)}, ${n(c.c2y, digits)}) (${n(c.x, digits)}, ${n(c.y, digits)});`;
      return "close;";
    })
    .join(" ");
}

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { t: number; v: number | Pt | string; ease?: Ease };

let KEYFRAME_VALUES = 0;
let TRACKS = 0;

/** A keyframe track spanning its first to last key, holding the last value after. */
function track(target: string, keys: Key[], format: (v: Key["v"]) => string = (v) => (typeof v === "number" ? n(v, 4) : typeof v === "string" ? v : v2(v, 3))): string {
  const ordered = [...keys].sort((a, b) => a.t - b.t);
  const start = ms(ordered[0]!.t);
  const end = ms(ordered[ordered.length - 1]!.t);
  const span = end - start;
  if (span <= 0) throw new Error(`${target}: empty track`);
  const lines = [`keyframes ${target} {`, `  start ${start}ms;`, `  duration ${span}ms;`, "  fill forwards;"];
  let previous = -1;
  ordered.forEach((key, index) => {
    const offset = ms(key.t) - start;
    if (offset <= previous) throw new Error(`${target}: keys at ${key.t}s are not increasing`);
    previous = offset;
    const pct = n((offset / span) * 100, 5);
    const ease = key.ease && index < ordered.length - 1 && key.ease !== "linear" ? ` ease ${key.ease}` : "";
    lines.push(`  ${pct}% ${format(key.v)}${ease};`);
  });
  lines.push("};");
  KEYFRAME_VALUES += ordered.length;
  TRACKS += 1;
  return lines.join("\n");
}

/** Greedy simplification of densely sampled linear keys within a tolerance. */
let RAW_SAMPLES = 0;
function simplify<T>(samples: { t: number; v: T }[], error: (a: T, b: T, u: number, actual: T) => number, tolerance: number): { t: number; v: T }[] {
  RAW_SAMPLES += samples.length;
  if (samples.length <= 2) return samples;
  const kept = [samples[0]!];
  let anchor = 0;
  let index = 2;
  while (index < samples.length) {
    const a = samples[anchor]!;
    const b = samples[index]!;
    let worst = 0;
    for (let mid = anchor + 1; mid < index; mid += 1) {
      const m = samples[mid]!;
      worst = Math.max(worst, error(a.v, b.v, (m.t - a.t) / (b.t - a.t), m.v));
    }
    if (worst > tolerance) {
      anchor = index - 1;
      kept.push(samples[anchor]!);
    }
    index += 1;
  }
  kept.push(samples[samples.length - 1]!);
  return kept;
}

const ptError = (a: Pt, b: Pt, u: number, m: Pt) => Math.hypot(a.x + (b.x - a.x) * u - m.x, a.y + (b.y - a.y) * u - m.y);
const numError = (a: number, b: number, u: number, m: number) => Math.abs(a + (b - a) * u - m);

/** Sample a function on a 1/60 s grid plus the given exact times. */
function sampleTimes(t0: number, t1: number, extra: number[] = []): number[] {
  const set = new Set<number>();
  for (let t = Math.ceil(t0 * 60) / 60; t <= t1 + 1e-9; t += 1 / 60) set.add(ms(t));
  set.add(ms(t0));
  set.add(ms(t1));
  for (const t of extra) if (t >= t0 && t <= t1) set.add(ms(t));
  return [...set].sort((a, b) => a - b).map((t) => t / 1000);
}

// ---------------------------------------------------------------- words

type Side = 1 | -1;
type Contact = { t: number; rib: number; side: Side; Y: number; ledge: number };

/** Each word departs from a point, travels with progress p(u), and makes contact (or recedes). */
type WordSpec = {
  id: string;
  scale: number; // displayed scale at departure
  alpha: number; // opacity in flight
  fill: string;
  tEmerge: number;
  tDep: number;
  tEnd: number; // contact time, or the fade-out time for the last word
  progress: (u: number) => number;
  arc: number; // world-units lift at mid flight
  tilt: number; // degrees, leaning into horizontal travel
  emergeSquash: number; // departure flex along travel direction, 1 = none
  contactSquash: number; // flatten at contact, 1 = none
  traceHold: number;
  traceFade: number;
  blur: number;
  contact?: Contact;
};

const CONTACTS: Contact[] = [
  { t: 3.5, rib: 2, side: 1, Y: -70, ledge: 0 },
  { t: 7.0, rib: 3, side: -1, Y: -50, ledge: 0 },
  { t: 10.5, rib: 4, side: 1, Y: -40, ledge: 0 },
  { t: 12.5, rib: 5, side: -1, Y: -34, ledge: 34 },
  { t: 15.0, rib: 6, side: 1, Y: -26, ledge: 0 },
];

const quickThenEase = (u: number) => 0.55 * (1 - Math.pow(1 - u, 2.2)) + 0.45 * u;
const steady = (u: number) => 0.5 * (1 - (1 - u) * (1 - u)) + 0.5 * u;

const WORDS: WordSpec[] = [
  { id: "w0", scale: 1, alpha: 1, fill: "#f6e6c2", tEmerge: 0, tDep: 1.5, tEnd: 3.5, progress: (u) => 0.12 * u + 0.88 * u * u, arc: 0, tilt: 6, emergeSquash: 0.86, contactSquash: 0.8, traceHold: 0.5, traceFade: 0.75, blur: 0, contact: CONTACTS[0] },
  { id: "w1", scale: 0.75, alpha: 0.75, fill: "#ecdcc6", tEmerge: 3.6, tDep: 3.78, tEnd: 7.0, progress: quickThenEase, arc: 46, tilt: 4.5, emergeSquash: 0.78, contactSquash: 0.85, traceHold: 0.5, traceFade: 0.9, blur: 3.5, contact: CONTACTS[1] },
  { id: "w2", scale: 0.55, alpha: 0.52, fill: "#d9d3d3", tEmerge: 7.1, tDep: 8.0, tEnd: 10.5, progress: steady, arc: 36, tilt: 3.5, emergeSquash: 0.82, contactSquash: 0.89, traceHold: 0.45, traceFade: 0.9, blur: 3, contact: CONTACTS[2] },
  { id: "w3", scale: 0.38, alpha: 0.34, fill: "#cfd2ee", tEmerge: 10.52, tDep: 10.66, tEnd: 12.5, progress: quickThenEase, arc: 26, tilt: 2.8, emergeSquash: 0.87, contactSquash: 0.93, traceHold: 0.4, traceFade: 0.85, blur: 2.5, contact: CONTACTS[3] },
  { id: "w4", scale: 0.25, alpha: 0.2, fill: "#bfc9fb", tEmerge: 12.52, tDep: 12.66, tEnd: 15.0, progress: steady, arc: 18, tilt: 2, emergeSquash: 0.92, contactSquash: 0.965, traceHold: 0.3, traceFade: 0.4, blur: 2, contact: CONTACTS[4] },
  { id: "w5", scale: 0.15, alpha: 0.1, fill: "#b3c2ff", tEmerge: 15.02, tDep: 15.16, tEnd: 18.5, progress: (u) => 1 - Math.pow(1 - u, 1.7), arc: 0, tilt: 1.2, emergeSquash: 0.975, contactSquash: 1, traceHold: 0, traceFade: 0, blur: 1.5 },
];
const FINAL_SCALE = 0.08;

type Solved = {
  spec: WordSpec;
  size: number; // world size multiplier: displayed = size * ZREF / (Z - c)
  from: P3;
  to: P3;
  /** Base-frame corner touching the wall at contact (local corner of the box). */
  corner?: Pt;
  cornerLocal?: Pt;
  cornerLetter: number;
  departCornerLocal?: Pt;
  depDir: Pt;
  arrDir: Pt;
};

function wallX(rib: number, side: Side, y: number, ledge = 0): number {
  const z = RIB_Z[rib]!;
  return VP.x + side * ((F * (W_EYE - ledge)) / z + SLOPE * (VP.y - y));
}

/** Base-frame centre of an upright word (base scale sb) whose outline touches the wall, centred at height centreY. */
function seat(contact: Contact, sb: number, centreY: number): { centre: Pt; corner: Pt; local: Pt; letter: number } {
  const touch = support(wallNormal(contact.side));
  const y = centreY + sb * touch.p.y;
  const corner = { x: wallX(contact.rib, contact.side, y, contact.ledge), y };
  return { centre: { x: corner.x - sb * touch.p.x, y: centreY }, corner, local: touch.p, letter: touch.letter };
}

function solveWords(): Solved[] {
  const solved: Solved[] = [];
  let previous: { corner: Pt; contact: Contact } | undefined;
  for (const spec of WORDS) {
    let from: P3;
    let size: number;
    let departCornerLocal: Pt | undefined;
    if (!previous) {
      // The call: lower centre, resting on the floor at depth 700.
      const z = 700;
      size = (spec.scale * z) / ZREF;
      const bottom = project({ X: 0, Y: FLOOR_Y, Z: z });
      from = unproject({ x: VP.x, y: bottom.y - HH * spec.scale - 6 }, z);
    } else {
      const z = RIB_Z[previous.contact.rib]!;
      size = (spec.scale * (z - push(spec.tDep))) / ZREF;
      const sb = (size * ZREF) / z;
      const touch = support(wallNormal(previous.contact.side));
      const centre = { x: previous.corner.x - sb * touch.p.x, y: previous.corner.y - sb * touch.p.y };
      from = unproject(centre, z);
      departCornerLocal = touch.p;
    }
    let to: P3;
    let corner: Pt | undefined;
    let cornerLocal: Pt | undefined;
    let cornerLetter = 0;
    if (spec.contact) {
      const contact = spec.contact;
      const z = RIB_Z[contact.rib]!;
      const sb = (size * ZREF) / z;
      const centreY = VP.y - (F * contact.Y) / z;
      const seated = seat(contact, sb, centreY);
      to = unproject(seated.centre, z);
      corner = seated.corner;
      cornerLocal = seated.local;
      cornerLetter = seated.letter;
      previous = { corner, contact };
    } else {
      // The last word recedes toward the opening until perspective alone makes it FINAL_SCALE.
      const c = PUSH;
      const zEnd = (size * ZREF) / FINAL_SCALE + c;
      to = { X: 0, Y: -12, Z: zEnd };
    }
    const at = (u: number) => worldAt({ spec, from, to } as Solved, u);
    const dir = (a: P3, b: P3, c: number) => {
      const p = project(a, c);
      const q = project(b, c);
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    };
    const depDir = dir(at(0), at(0.03), push(spec.tDep));
    const arrDir = dir(at(0.97), at(1), push(spec.tEnd));
    solved.push({ spec, size, from, to, corner, cornerLocal, cornerLetter, departCornerLocal, depDir, arrDir });
  }
  return solved;
}

function worldAt(word: Pick<Solved, "spec" | "from" | "to">, u: number): P3 {
  const p = word.spec.progress(clamp(u, 0, 1));
  return {
    X: word.from.X + (word.to.X - word.from.X) * p,
    Y: word.from.Y + (word.to.Y - word.from.Y) * p + word.spec.arc * Math.sin(Math.PI * p),
    Z: word.from.Z + (word.to.Z - word.from.Z) * p,
  };
}

/** World centre of a word at scene time t. */
function wordWorld(word: Solved, t: number): P3 {
  const { spec } = word;
  if (t <= spec.tDep) {
    if (spec.id !== "w0") return word.from;
    // Reveal: rise slightly as the word expands.
    const u = clamp(t / 1, 0, 1);
    return { ...word.from, Y: word.from.Y - 26 * (1 - smooth(u)) };
  }
  return worldAt(word, (t - spec.tDep) / (spec.tEnd - spec.tDep));
}

function revealScale(t: number): number {
  // 0–1 s: expand from 30% with a small overshoot; settle by 1 s.
  if (t >= 1) return 1;
  const u = clamp(t / 0.82, 0, 1);
  const grow = 0.3 + 0.76 * (1 - Math.pow(1 - u, 3));
  if (t <= 0.82) return grow;
  return 1.06 - 0.06 * smooth((t - 0.82) / 0.18);
}

function wordScale(word: Solved, t: number): number {
  const p = wordWorld(word, t);
  const base = (word.size * ZREF) / (p.Z - push(t));
  return word.spec.id === "w0" ? base * revealScale(t) : base;
}

function wordTilt(word: Solved, t: number): number {
  const { spec } = word;
  if (t <= spec.tDep || t >= spec.tEnd) return 0;
  const u = (t - spec.tDep) / (spec.tEnd - spec.tDep);
  const horizontal = Math.sign(word.to.X - word.from.X) || 0;
  return horizontal * spec.tilt * Math.sin(Math.PI * u);
}

function lifeEnd(spec: WordSpec): number {
  return spec.contact ? spec.tEnd + 0.25 + spec.traceHold + spec.traceFade : spec.tEnd;
}

// ---------------------------------------------------------------- canyon geometry

type Rib = { left: Cmd[]; right: Cmd[]; floor: Cmd[]; rim: Cmd[]; strata: Cmd[]; contactVertex: Map<string, number> };

/** Per rib, the contacts whose wall edge must stay straight (and any ledge). */
function ribContacts(solved: Solved[]): Map<number, { side: Side; Y: number; ledge: number; hy: number }[]> {
  const map = new Map<number, { side: Side; Y: number; ledge: number; hy: number }[]>();
  for (const word of solved) {
    const contact = word.spec.contact;
    if (!contact || !word.corner) continue;
    const z = RIB_Z[contact.rib]!;
    const cornerWorld = unproject(word.corner, z);
    const hyWorld = (HH * word.size * ZREF) / F;
    const list = map.get(contact.rib) ?? [];
    list.push({ side: contact.side, Y: cornerWorld.Y, ledge: contact.ledge, hy: hyWorld });
    map.set(contact.rib, list);
  }
  return map;
}

function buildRib(index: number, contacts: { side: Side; Y: number; ledge: number; hy: number }[]): Rib {
  const z = RIB_Z[index]!;
  const random = rng(97 + index * 31);
  const rimY = RIM_Y[index]!;
  const amp = 26;
  const contactVertex = new Map<string, number>();
  const edge = (side: Side): { pts: Pt[]; cornerIndex?: number } => {
    const own = contacts.filter((c) => c.side === side);
    const heights: number[] = [];
    for (let Y = FLOOR_Y; Y < rimY; Y += 38 + random() * 34) heights.push(Y);
    heights.push(rimY);
    for (const c of own) heights.push(c.Y);
    heights.sort((a, b) => a - b);
    const unique = heights.filter((Y, i) => i === 0 || Y - heights[i - 1]! > 4 || own.some((c) => c.Y === Y));
    const offsets = unique.map(() => (random() - 0.35) * amp);
    const pts: Pt[] = [];
    let cornerIndex: number | undefined;
    unique.forEach((Y, i) => {
      let jag = offsets[i]!;
      if (Y === FLOOR_Y) jag = 0;
      for (const c of own) {
        // Straight, unbroken wall where the word strikes; a ledge protrudes there.
        const d = Math.abs(Y - c.Y);
        const window = c.hy * 2.6;
        if (d < window) jag = Math.max(0, jag) * smooth(d / window);
        if (c.ledge > 0) {
          const lo = c.Y - 46;
          const hi = c.Y + c.hy * 2 + 26;
          if (Y >= lo && Y <= hi) jag = -c.ledge;
          else if (Y > hi && Y < hi + 30) jag = -c.ledge * (1 - (Y - hi) / 30) + jag * ((Y - hi) / 30);
          else if (Y < lo && Y > lo - 20) jag = -c.ledge * (1 - (lo - Y) / 20);
        }
        if (Y === c.Y) {
          jag = -c.ledge;
          cornerIndex = i;
        }
      }
      pts.push(project({ X: side * (halfWidth(Y) + jag), Y, Z: z }));
    });
    return { pts, cornerIndex };
  };
  const leftEdge = edge(-1);
  const rightEdge = edge(1);
  const far = 7000;
  const rimLine = (side: Side): Pt[] => {
    const out: Pt[] = [];
    const inner = halfWidth(rimY);
    for (let k = 0; k <= 9; k += 1) {
      const X = side * (inner + (k / 9) * 3800);
      const lift = k === 0 ? 0 : (random() - 0.4) * 46 + (k % 3 === 0 ? 30 : 0);
      out.push(project({ X, Y: rimY + lift, Z: z }));
    }
    return out;
  };
  const ray = (p: Pt, y: number): Pt => ({ x: VP.x + ((p.x - VP.x) * (y - VP.y)) / (p.y - VP.y), y });
  const wall = (side: Side, e: { pts: Pt[] }): Cmd[] => {
    const rim = rimLine(side).reverse();
    const floorCorner = e.pts[0]!;
    const deep = ray(floorCorner, 2600);
    const pts: Pt[] = [...rim, ...[...e.pts].reverse().slice(1), deep, { x: VP.x + side * far, y: 2600 }, { x: VP.x + side * far, y: rim[0]!.y }];
    return poly(pts.map((p) => [p.x, p.y]));
  };
  // Wall polygons: rim (outer → inner), inner edge top → floor, ray down, out, up.
  const left = wall(-1, leftEdge);
  const right = wall(1, rightEdge);
  const lc = leftEdge.pts[0]!;
  const rc = rightEdge.pts[0]!;
  const floor = poly([[lc.x, lc.y], [rc.x, rc.y], [ray(rc, 2600).x, 2600], [ray(lc, 2600).x, 2600]]);
  // Index of the contact vertex inside the wall path: rim has 10 points, then the edge top → bottom.
  for (const [side, e, name] of [[-1, leftEdge, "left"], [1, rightEdge, "right"]] as const) {
    if (e.cornerIndex === undefined) continue;
    const reversedIndex = e.pts.length - 1 - e.cornerIndex; // position in reversed edge list
    contactVertex.set(name, 10 + reversedIndex - 1);
    void side;
  }
  const rimStroke: Cmd[] = [];
  for (const e of [leftEdge, rightEdge]) {
    e.pts.forEach((p, i) => rimStroke.push({ cmd: i === 0 ? "M" : "L", x: p.x, y: p.y }));
  }
  // Strata follow rays through VP from this rib's edge to the next nearer rib.
  const strata: Cmd[] = [];
  const reach = index === 0 ? 3.2 : RIB_Z[index]! / RIB_Z[index - 1]! + 0.04;
  for (const e of [leftEdge, rightEdge]) {
    e.pts.forEach((p, i) => {
      if (i === 0 || i === e.pts.length - 1 || i % 2 === 1) return;
      const wobble = 1 + (random() - 0.5) * 0.02;
      const q = { x: VP.x + (p.x - VP.x) * reach, y: VP.y + (p.y - VP.y) * reach * wobble };
      strata.push({ cmd: "M", x: p.x, y: p.y }, { cmd: "L", x: q.x, y: q.y });
    });
  }
  return { left, right, floor, rim: rimStroke, strata, contactVertex };
}

// ---------------------------------------------------------------- program

type Built = { source: string; solved: Solved[]; ribs: Rib[] };

function pulsePath(cx: number, cy: number, r: number, ry: number): Cmd[] {
  return [
    { cmd: "M", x: cx + r * Math.cos((-50 * Math.PI) / 180), y: cy + ry * Math.sin((-50 * Math.PI) / 180) },
    ...arc(cx, cy, r, -50, 50, ry),
    { cmd: "M", x: cx + r * Math.cos((130 * Math.PI) / 180), y: cy + ry * Math.sin((130 * Math.PI) / 180) },
    ...arc(cx, cy, r, 130, 230, ry),
  ];
}

/** Half-ellipse ripple opening toward the wall at a contact corner. */
function ripplePath(c: Pt, side: Side, r: number): Cmd[] {
  const a0 = side === 1 ? 105 : -75;
  const a1 = side === 1 ? 255 : 75;
  const rx = r * 0.62;
  return [{ cmd: "M", x: c.x + rx * Math.cos((a0 * Math.PI) / 180), y: c.y + r * Math.sin((a0 * Math.PI) / 180) }, ...arc(c.x, c.y, rx, a0, a1, r)];
}

function ringPath(c: Pt, r: number, ry: number): Cmd[] {
  return [{ cmd: "M", x: c.x + r, y: c.y }, ...arc(c.x, c.y, r, 0, 360, ry), { cmd: "Z" }];
}

const pathFormat = (v: Key["v"]) => `path { ${cmds(v as unknown as Cmd[], 2)} }`;

function morph(target: string, t0: number, t1: number, a: Cmd[], b: Cmd[], ease: Ease = "easeOut"): string {
  return track(target, [{ t: t0, v: a as unknown as string, ease }, { t: t1, v: b as unknown as string }], pathFormat);
}

function program(): Built {
  const solved = solveWords();
  const contactsByRib = ribContacts(solved);
  const ribs = RIB_Z.map((_, index) => buildRib(index, contactsByRib.get(index) ?? []));
  // Declaration order is paint order: with any compositing group in the scene, the
  // runtime builds its render tree in declaration order and ignores zIndex.
  const layered: { z: number; text: string }[] = [];
  const units = { push: (...texts: string[]) => texts.forEach((text) => layered.push({ z: Number(/zIndex (-?\d+)/.exec(text)?.[1] ?? 0), text })) };
  const motion: string[] = [];

  // Sky and the distant opening.
  units.push(`rectangle sky { position (0, 0); size (${W}, ${H}); zIndex 0; fill linear (0, 0) (0, ${H}) 0 ${SKY_TOP} 0.4 ${SKY_LOW} 0.62 #3a2048 1 ${SKY_LOW}; };`);
  units.push(`group opening {
  zIndex 1;
  ellipse glow { position (${VP.x}, ${VP.y + 22}); scale (1, 0.42); size (720, 720); fill radial (0, 0) 360 0 #f6c48fcc 0.18 #e79f7a88 0.5 #8a4f6a33 1 #2a174000; };
  ellipse core { position (${VP.x}, ${VP.y + 30}); scale (1, 0.6); size (150, 150); fill radial (0, 0) 75 0 #fff1d2ee 0.5 #f6c48f77 1 #f2b88400; };
};`);

  // Ribs, far to near. Each layer scales about VP by Z / (Z - push(t)).
  const ribUnits: string[][] = RIB_Z.map(() => []);
  RIB_Z.forEach((z, index) => {
    const rib = ribs[index]!;
    const rimWidth = clamp((2.4 * ZREF) / z, 0.7, 3.2);
    const strataWidth = clamp((1.6 * ZREF) / z, 0.5, 2.6);
    ribUnits[index]!.push(
      `path fl { zIndex 0; fill ${RIB_FLOOR[index]}; ${cmds(rib.floor, 1)} };`,
      `path wl { zIndex 1; fill ${RIB_WALL[index]}; ${cmds(rib.left, 2)} };`,
      `path wr { zIndex 1; fill ${RIB_WALL[index]}; ${cmds(rib.right, 2)} };`,
      `path st { zIndex 2; stroke ${RIB_STRATA[index]} width ${n(strataWidth)} cap round; opacity 0.85; ${cmds(rib.strata, 1)} };`,
      `path rim { zIndex 3; stroke ${RIB_RIM[index]} width ${n(rimWidth)} cap round join round; opacity 0.55; ${cmds(rib.rim, 2)} };`,
    );
    motion.push(`animate r${index}.scale.x { expression "${pushExpression(z)}"; start 0s; duration ${DURATION}s; };`);
    motion.push(`animate r${index}.scale.y { expression "${pushExpression(z)}"; start 0s; duration ${DURATION}s; };`);
    TRACKS += 2;
  });

  // Words.
  solved.forEach((word, index) => {
    const { spec } = word;
    const isCall = spec.id === "w0";
    const t0 = spec.tEmerge;
    const t1 = lifeEnd(spec);
    const keyTimes = [spec.tDep, spec.tEnd, spec.tEnd + 0.25, 1, 1.5, 0.82];
    const times = sampleTimes(t0, t1, keyTimes);
    const posSamples = times.map((t) => ({ t, v: project(wordWorld(word, t), push(t)) }));
    const scaleSamples = times.map((t) => ({ t, v: wordScale(word, t) }));
    const tiltSamples = sampleTimes(spec.tDep, spec.tEnd).map((t) => ({ t, v: wordTilt(word, t) }));
    const pos = simplify(posSamples, ptError, 0.08);
    const scl = simplify(scaleSamples, numError, 0.0004);
    const tilt = simplify(tiltSamples, numError, 0.03);
    const p0 = pos[0]!.v;
    const s0 = scl[0]!.v;
    motion.push(track(`${spec.id}.position`, pos.map((k) => ({ t: k.t, v: k.v }))));
    motion.push(track(`${spec.id}.scale`, scl.map((k) => ({ t: k.t, v: { x: k.v, y: k.v } }))));
    motion.push(track(`${spec.id}.rotation`, tilt.map((k) => ({ t: k.t, v: `${n(k.v, 3)}deg` }))));

    // Opacity: emerge, flight, imprint, hold, fade.
    const fadeIn = isCall ? 0.35 : Math.min(0.38, spec.tDep - spec.tEmerge);
    const opacity: Key[] = [
      { t: t0, v: 0, ease: "easeOut" },
      { t: t0 + fadeIn, v: spec.alpha },
    ];
    if (spec.contact) {
      const imprint = spec.alpha * 0.42;
      opacity[1]!.ease = "hold";
      opacity.push({ t: spec.tEnd, v: spec.alpha, ease: "easeOut" });
      opacity.push({ t: spec.tEnd + 0.25, v: imprint, ease: "hold" });
      opacity.push({ t: spec.tEnd + 0.25 + spec.traceHold, v: imprint, ease: "easeIn" });
      opacity.push({ t: t1, v: 0 });
    } else {
      opacity[1]!.ease = "hold";
      opacity.push({ t: 16, v: spec.alpha, ease: "easeIn" });
      opacity.push({ t: spec.tEnd, v: 0 });
    }
    motion.push(track(`${spec.id}.opacity`, opacity));

    // Departure flex (or the call's anticipation squeeze) along the travel direction.
    const depAngle = (Math.atan2(word.depDir.y, word.depDir.x) * 180) / Math.PI;
    const depPivot = word.departCornerLocal ? word.departCornerLocal.x * word.depDir.x + word.departCornerLocal.y * word.depDir.y : 0;
    const depKeys: Key[] = isCall
      ? [
          { t: 1.0, v: 1, ease: "easeInOut" },
          { t: 1.38, v: spec.emergeSquash, ease: "hold" },
          { t: 1.5, v: spec.emergeSquash, ease: "easeOut" },
          { t: 1.62, v: 1.1, ease: "easeInOut" },
          { t: 1.86, v: 1 },
        ]
      : [
          { t: spec.tEmerge, v: spec.emergeSquash, ease: spec.id === "w2" ? "easeInOut" : "easeOut" },
          { t: spec.tDep, v: 1, ease: "easeOut" },
          { t: spec.tDep + 0.14, v: 1 + (1 - spec.emergeSquash) * 0.3, ease: "easeInOut" },
          { t: spec.tDep + 0.36, v: 1 },
        ];
    motion.push(track(`${spec.id}.d1.d2.scale.x`, depKeys));

    // Arrival flatten along the travel direction, pivoting on the touching corner.
    const arrAngle = (Math.atan2(word.arrDir.y, word.arrDir.x) * 180) / Math.PI;
    const arrPivot = word.cornerLocal ? word.cornerLocal.x * word.arrDir.x + word.cornerLocal.y * word.arrDir.y : 0;
    if (spec.contact) {
      const f = spec.contactSquash;
      motion.push(
        track(`${spec.id}.d1.d2.d3.a1.a2.scale.x`, [
          { t: spec.tEnd, v: 1, ease: "easeOut" },
          { t: spec.tEnd + 0.09, v: f, ease: "easeInOut" },
          { t: spec.tEnd + 0.24, v: f + (1 - f) * 0.25 },
        ]),
      );
    }

    // Letters.
    const face = `stroke ${BACK} width 2.6 join round; fill ${spec.fill}`;
    let letters: string;
    if (isCall) {
      const squeeze = 0.8;
      letters = "ECHO"
        .split("")
        .map((letter, k) => {
          const x = LETTER_X[k]!;
          motion.push(
            track(`${spec.id}.d1.d2.d3.a1.a2.a3.l${letter}.position.x`, [
              { t: 1.0, v: x, ease: "easeInOut" },
              { t: 1.36, v: x * squeeze, ease: "hold" },
              { t: 1.5, v: x * squeeze, ease: "easeOut" },
              { t: 1.64, v: x * 1.07, ease: "easeInOut" },
              { t: 1.9, v: x },
            ]),
          );
          return `group l${letter} { position (${n(x)}, 0);
          path back { position (5, 6); fill ${BACK}; opacity 0.6; fillRule evenodd; ${cmds(GLYPH[letter]!)} };
          path face { ${face}; fillRule evenodd; ${cmds(GLYPH[letter]!)} };
        };`;
        })
        .join("\n        ");
    } else {
      letters = `group ghost { blur ${spec.blur}; opacity 0.5; scale (1.02, 1.03);
          path glyphs { fill ${spec.fill}; fillRule evenodd; ${cmds(WORD_CMDS)} };
        };
        path back { position (5, 6); fill ${BACK}; opacity 0.55; fillRule evenodd; ${cmds(WORD_CMDS)} };
        path face { ${face}; fillRule evenodd; ${cmds(WORD_CMDS)} };`;
    }
    units.push(`group ${spec.id} {
  position ${v2(p0, 3)};
  scale (${n(s0, 4)}, ${n(s0, 4)});
  opacity 0;
  zIndex ${40 + (WORDS.length - index)};
  group d1 { rotation ${n(depAngle, 3)}deg;
    group d2 { pivot (${n(depPivot, 3)}, 0); scale (${n(depKeys[0]!.v as number, 4)}, 1);
      group d3 { rotation ${n(-depAngle, 3)}deg;
        group a1 { rotation ${n(arrAngle, 3)}deg;
          group a2 { pivot (${n(arrPivot, 3)}, 0);
            group a3 { rotation ${n(-arrAngle, 3)}deg;
        ${letters}
            };
          };
        };
      };
    };
  };
};`);

    // Floor shadow: projected straight down, foreshortened, fading with height.
    const shadowSamples = times.map((t) => {
      const p = wordWorld(word, t);
      const c = push(t);
      const reveal = isCall ? revealScale(t) : 1;
      const worldHalf = (HW * word.size * ZREF * reveal) / F;
      const a = worldHalf * 0.85;
      const b = a * 0.42;
      const X = clamp(p.X, -(W_FLOOR - a * 0.55), W_FLOOR - a * 0.55);
      const centre = project({ X, Y: FLOOR_Y, Z: p.Z }, c);
      const rx = (F * a) / (p.Z - c);
      const ry = (F * -FLOOR_Y * b) / ((p.Z - c) * (p.Z - c));
      const height = p.Y - (HH * word.size * ZREF) / F - FLOOR_Y;
      const fade = Math.exp(-Math.max(0, height) / 210);
      return { t, centre, rx, ry, fade };
    });
    const sp = simplify(shadowSamples.map((s) => ({ t: s.t, v: s.centre })), ptError, 0.1);
    const sx = simplify(shadowSamples.map((s) => ({ t: s.t, v: s.rx / 100 })), numError, 0.0008);
    const sy = simplify(shadowSamples.map((s) => ({ t: s.t, v: s.ry / 100 })), numError, 0.0008);
    const sf = simplify(shadowSamples.map((s) => ({ t: s.t, v: s.fade })), numError, 0.004);
    units.push(`group sh${index} { position ${v2(sp[0]!.v)}; scale (${n(sx[0]!.v, 4)}, ${n(sy[0]!.v, 4)}); opacity 0; zIndex 30;
  ellipse e { size (200, 200); fill radial (0, 0) 100 0 #12081ccc 0.55 #12081c66 1 #12081c00; };
};`);
    motion.push(track(`sh${index}.position`, sp));
    motion.push(track(`sh${index}.scale.x`, sx));
    motion.push(track(`sh${index}.scale.y`, sy));
    // Shadow opacity = word opacity × height fade, both piecewise; sample their product.
    const opacityAt = (t: number) => sampleKeys(opacity, t);
    const so = simplify(
      times.map((t) => ({ t, v: opacityAt(t) * 0.75 * shadowSamples.find((s) => s.t === t)!.fade })),
      numError,
      0.004,
    );
    motion.push(track(`sh${index}.opacity`, so));

    // Sound: a thin curved pulse radiates from each departure.
    const depZ = word.from.Z;
    const depCentre = project(word.from);
    const sbDep = (word.size * ZREF) / depZ;
    const r0 = HW * sbDep + 16 * sbDep;
    const pulseHost = isCall ? undefined : ribUnits[RIB_Z.indexOf(depZ)]!;
    const pulseTime = isCall ? 1.5 : spec.tEmerge + 0.05;
    const loud = isCall ? 0.9 : 0.9 * spec.alpha;
    const pulseUnits: string[] = [];
    [0, 1].forEach((ring) => {
      const at = pulseTime + ring * 0.2;
      const span = isCall ? 1.4 : 1.0 + spec.alpha * 0.6;
      const grow = isCall ? 2.5 : 1.8 + spec.alpha;
      const id = `pu${index}${ring === 0 ? "a" : "b"}`;
      const width = (isCall ? 2.4 : 1.6) * clamp(sbDep, 0.35, 1);
      pulseUnits.push(`path ${id} { zIndex 8; stroke ${spec.fill} width ${n(width)} cap round; opacity 0; ${cmds(pulsePath(depCentre.x, depCentre.y, r0, r0 * 0.78))} };`);
      const target = isCall ? id : `r${RIB_Z.indexOf(depZ)}.${id}`;
      motion.push(morph(`${target}.commands`, at, at + span, pulsePath(depCentre.x, depCentre.y, r0, r0 * 0.78), pulsePath(depCentre.x, depCentre.y, r0 * grow, r0 * grow * 0.78)));
      motion.push(track(`${target}.opacity`, [{ t: at, v: 0, ease: "easeOut" }, { t: at + 0.1, v: loud * (ring === 0 ? 1 : 0.55), ease: "easeIn" }, { t: at + span, v: 0 }]));
    });
    if (pulseHost) pulseHost.push(...pulseUnits);
    else units.push(...pulseUnits.map((u) => u.replace("zIndex 8", "zIndex 31")));

    // Contact ripple on the wall: shrinks with the text.
    if (spec.contact && word.corner) {
      const rib = spec.contact.rib;
      const sb = (word.size * ZREF) / RIB_Z[rib]!;
      const r = HH * sb * 1.2;
      [0, 1, 2].forEach((ring) => {
        const at = spec.tEnd + ring * 0.16;
        const id = `rp${index}${"abc"[ring]}`;
        const from = ripplePath(word.corner!, spec.contact!.side, r * 0.4);
        const to = ripplePath(word.corner!, spec.contact!.side, r * (2.2 + ring * 0.5));
        ribUnits[rib]!.push(`path ${id} { zIndex 6; stroke ${spec.fill} width ${n(clamp(2 * sb, 0.6, 2.2))} cap round; opacity 0; ${cmds(from)} };`);
        motion.push(morph(`r${rib}.${id}.commands`, at, at + 1.1, from, to));
        motion.push(track(`r${rib}.${id}.opacity`, [{ t: at, v: 0, ease: "easeOut" }, { t: at + 0.08, v: clamp(spec.alpha * 1.1, 0.25, 0.85) * (1 - ring * 0.25), ease: "easeIn" }, { t: at + 1.1, v: 0 }]));
      });
    }

    // The final ripple: the last word's echo expands gently and vanishes by 19 s.
    if (!spec.contact) {
      // The ring rides with the drifting word, then stays where the word vanished.
      const at = 16.3;
      const s = wordScale(word, at);
      const origin = { x: 0, y: 0 };
      const from = ringPath(origin, HW * s * 0.9, HH * s * 1.1);
      const to = ringPath(origin, HW * s * 3.4, HH * s * 4.2);
      const ride = simplify(sampleTimes(at, spec.tEnd).map((t) => ({ t, v: project(wordWorld(word, t), push(t)) })), ptError, 0.08);
      units.push(`group fr { position ${v2(ride[0]!.v)}; zIndex 39;
  path ring { stroke ${spec.fill} width 1.6; opacity 0; ${cmds(from)} };
};`);
      motion.push(track("fr.position", ride));
      motion.push(morph("fr.ring.commands", at, 19.0, from, to, "easeOut"));
      motion.push(track("fr.ring.opacity", [{ t: at, v: 0, ease: "easeOut" }, { t: at + 0.5, v: 0.45, ease: "easeIn" }, { t: 19.0, v: 0 }]));
    }
  });

  RIB_Z.forEach((_, index) => {
    units.push(`group r${index} {
  pivot (${VP.x}, ${VP.y});
  zIndex ${20 - index};
  ${ribUnits[index]!.join("\n  ")}
};`);
  });

  const source = `// ECHO CANYON
// 20 seconds. Kinetic typography in a V-shaped sandstone canyon, dark violet interior, cream text.
// 0:00 ECHO expands from the lower centre. 0:01 squeeze. 0:01.5 flight. 0:03.5 right wall.
// 0:04 first reflection at 75%; the push begins. 0:07 left wall.
// 0:08 second at 55%. 0:10.5 right wall; third at 38%. 0:12.5 left ledge; fourth at 25%.
// 0:15 right wall; fifth at 15% drifts toward the opening, gone by 0:18.5. 0:20 empty canyon.
// Generated by build-echo-canyon.ts. The rock fins scale about the vanishing point by
// Z / (Z - push(t)), a perspective dolly; word motion is sampled from the same model.
scene "echo-canyon" {
  version "0.2";
  viewport (${W}, ${H});
  background ${SKY_TOP};
  duration ${DURATION}s;
  requires "easing.hold";
  requires "geometry.pathMorph";
  requires "paint.linearGradient";
  requires "paint.radialGradient";
  requires "compositing.isolatedOpacity";
  requires "effects.blur";
};
${layered.sort((a, b) => a.z - b.z).map((u) => u.text).join("\n")}
${motion.join("\n")}
complete;
`;
  return { source, solved, ribs };
}

/** Linear-family sampling of authored keys, for deriving the shadow's opacity. */
function sampleKeys(keys: Key[], t: number): number {
  if (t <= keys[0]!.t) return keys[0]!.v as number;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const a = keys[index]!;
    const b = keys[index + 1]!;
    if (t < b.t) {
      const u = (t - a.t) / (b.t - a.t);
      const e = a.ease === "hold" ? 0 : a.ease === "easeIn" ? u * u * u : a.ease === "easeOut" ? 1 - Math.pow(1 - u, 3) : a.ease === "easeInOut" ? (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2) : u;
      return (a.v as number) + ((b.v as number) - (a.v as number)) * e;
    }
  }
  return keys[keys.length - 1]!.v as number;
}

// ---------------------------------------------------------------- checks on draw items

type Box = { x0: number; y0: number; x1: number; y1: number };

function itemsOf(frame: ResolvedFrame, prefix: string): ResolvedDrawItem[] {
  return frame.drawItems.filter((item) => item.nodeId === prefix || item.nodeId.startsWith(`${prefix}.`));
}

function faceOf(frame: ResolvedFrame, id: string): ResolvedDrawItem[] {
  return itemsOf(frame, id).filter((item) => item.nodeId.endsWith(".face"));
}

/** Screen box of a word's face glyphs from their actual geometry. */
function wordBox(frame: ResolvedFrame, id: string): Box | undefined {
  const faces = faceOf(frame, id);
  if (faces.length === 0) return undefined;
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const item of faces) {
    if (item.geometry.kind !== "path") continue;
    for (const c of item.geometry.commands) {
      if (c.cmd === "Z") continue;
      const p = transformPoint(item.logicalMatrix, c.x, c.y);
      box.x0 = Math.min(box.x0, p.x);
      box.x1 = Math.max(box.x1, p.x);
      box.y0 = Math.min(box.y0, p.y);
      box.y1 = Math.max(box.y1, p.y);
    }
  }
  return box;
}

function centreOf(box: Box): Pt {
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
}

/** Displayed scale: screen length of the local vertical axis of the first face. */
function displayedScale(frame: ResolvedFrame, id: string): number {
  const item = faceOf(frame, id)[0]!;
  const a = transformPoint(item.logicalMatrix, 0, -HH);
  const b = transformPoint(item.logicalMatrix, 0, HH);
  return Math.hypot(b.x - a.x, b.y - a.y) / CAP;
}

/** Degrees between the drawn vertical axis of a word and the screen vertical. */
function lean(frame: ResolvedFrame, id: string): number {
  const item = faceOf(frame, id)[0]!;
  const a = transformPoint(item.logicalMatrix, 0, -HH);
  const b = transformPoint(item.logicalMatrix, 0, HH);
  return (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
}

function opacityOf(frame: ResolvedFrame, id: string): number {
  const faces = faceOf(frame, id);
  return faces.length ? Math.max(...faces.map((f) => f.opacity)) : 0;
}

function assertStory(runtime: AnimationRuntime, built: Built): string[] {
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const at = (t: number) => runtime.evaluate(ms(t));
  const ids = WORDS.map((w) => w.id);
  // The canvas draws the render tree when a scope exists; it must agree with draw-item (zIndex) order.
  for (const t of [0, 5, 12]) {
    const f = at(t);
    const leaves: string[] = [];
    const walk = (node: NonNullable<ResolvedFrame["renderTree"]>) => {
      if (node.kind === "leaf") leaves.push(node.item.nodeId);
      else node.children.forEach(walk);
    };
    if (f.renderTree) walk(f.renderTree);
    const order = f.drawItems.map((i) => i.nodeId);
    expect(!f.renderTree || leaves.join("|") === order.join("|"), `Render tree paint order differs from zIndex order at ${t}s.`);
  }
  const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

  // Static paint and size relations: each echo smaller, cooler and more transparent.
  for (let index = 1; index < WORDS.length; index += 1) {
    const prev = WORDS[index - 1]!;
    const cur = WORDS[index]!;
    expect(cur.scale < prev.scale && cur.alpha < prev.alpha, `${cur.id} is not smaller and fainter than ${prev.id}.`);
    const hue = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16);
    expect(hue(cur.fill) > hue(prev.fill), `${cur.id} is not cooler than ${prev.id}.`);
  }

  // 0–1 s reveal from the lower centre.
  const r0 = at(0.05);
  expect(opacityOf(r0, "w0") < 0.3 && displayedScale(r0, "w0") < 0.5, "ECHO is not small and faint at the start of the reveal.");
  const r1 = at(1.0);
  const b1 = wordBox(r1, "w0")!;
  expect(near(opacityOf(r1, "w0"), 1, 0.01) && near(displayedScale(r1, "w0"), 1, 0.02), `ECHO is not at full size and opacity at 1 s (${displayedScale(r1, "w0").toFixed(3)}).`);
  expect(near(centreOf(b1).x, VP.x, 4) && centreOf(b1).y > 560, `ECHO is not at the lower centre at 1 s (${centreOf(b1).x.toFixed(0)}, ${centreOf(b1).y.toFixed(0)}).`);
  // Anticipation: letters compress together during 1–1.5 s.
  const spread = (t: number) => {
    const f = at(t);
    const e = itemsOf(f, "w0").find((i) => i.nodeId.endsWith("lE.face"))!;
    const o = itemsOf(f, "w0").find((i) => i.nodeId.endsWith("lO.face"))!;
    return transformPoint(o.logicalMatrix, 0, 0).x - transformPoint(e.logicalMatrix, 0, 0).x;
  };
  expect(spread(1.42) < spread(1.0) * 0.86, `Letters do not compress during the squeeze (${spread(1.42).toFixed(0)} vs ${spread(1.0).toFixed(0)}).`);
  expect(spread(1.64) > spread(1.0), "Letters do not spring apart on release.");
  // 1.5–3.5 accelerate toward the right wall.
  const cx = (t: number, id: string) => centreOf(wordBox(at(t), id)!);
  const d1 = cx(2.5, "w0").x - cx(1.5, "w0").x;
  const d2 = cx(3.48, "w0").x - cx(2.5, "w0").x;
  expect(d2 > d1 * 1.6 && d1 > 0, `ECHO does not accelerate toward the right wall (${d1.toFixed(0)} then ${d2.toFixed(0)} px).`);
  // The shadow separates from the text as it crosses.
  const gap = (t: number) => {
    const f = at(t);
    const s = itemsOf(f, "sh0")[0]!;
    return transformPoint(s.logicalMatrix, 0, 0).y - wordBox(f, "w0")!.y1;
  };
  expect(gap(3.2) > gap(1.2) + 80, `The shadow does not separate (${gap(1.2).toFixed(0)} → ${gap(3.2).toFixed(0)} px).`);
  // Pulse radiates at the call.
  expect(itemsOf(at(1.8), "pu0a")[0]!.opacity > 0.4, "No pulse radiates from the call.");

  // Contacts: the touching corner lies on the rib's drawn wall vertex, at the stated time.
  WORDS.forEach((spec, index) => {
    const contact = spec.contact;
    if (!contact) return;
    const word = built.solved[index]!;
    const f = at(contact.t);
    const ribItem = f.drawItems.find((i) => i.nodeId === `r${contact.rib}.${contact.side === 1 ? "wr" : "wl"}`)!;
    const vertexIndex = built.ribs[contact.rib]!.contactVertex.get(contact.side === 1 ? "right" : "left");
    if (vertexIndex === undefined || ribItem.geometry.kind !== "path") {
      problems.push(`${spec.id}: contact vertex missing.`);
      return;
    }
    const v = ribItem.geometry.commands[vertexIndex]!;
    if (v.cmd === "Z") return;
    const wall = transformPoint(ribItem.logicalMatrix, v.x, v.y);
    const face = faceOf(f, spec.id)[spec.id === "w0" ? word.cornerLetter : 0]!;
    const corner = spec.id === "w0" ? transformPoint(face.logicalMatrix, word.cornerLocal!.x - LETTER_X[word.cornerLetter]!, word.cornerLocal!.y) : transformPoint(face.logicalMatrix, word.cornerLocal!.x, word.cornerLocal!.y);
    const miss = Math.hypot(corner.x - wall.x, corner.y - wall.y);
    expect(miss < 1.5, `${spec.id} misses its wall contact at ${contact.t}s by ${miss.toFixed(2)} px.`);
    // Before contact it is still travelling; after, it is flattened and fading to an imprint.
    const before = cx(contact.t - 0.2, spec.id);
    const contactCentre = cx(contact.t, spec.id);
    expect(Math.hypot(before.x - contactCentre.x, before.y - contactCentre.y) > 4, `${spec.id} is not moving into contact.`);
    const width = (t: number) => {
      const b = wordBox(at(t), spec.id)!;
      return b.x1 - b.x0;
    };
    if (spec.contactSquash < 0.95) expect(width(contact.t + 0.1) < width(contact.t) * 0.97, `${spec.id} does not flatten at contact.`);
    expect(opacityOf(at(contact.t + 0.5), spec.id) < spec.alpha * 0.5 && opacityOf(at(contact.t + 0.5), spec.id) > spec.alpha * 0.3, `${spec.id} leaves no faint imprint after contact.`);
    expect(opacityOf(at(lifeEnd(spec) + 0.02), spec.id) < 0.002, `${spec.id} trace does not disappear.`);
    // A ripple on the wall.
    expect(itemsOf(at(contact.t + 0.2), `r${contact.rib}.rp${index}a`)[0]!.opacity > 0.15, `${spec.id} releases no ripple.`);
    // The next word emerges from the same contact point.
    const next = WORDS[index + 1]!;
    const nf = at(next.tDep);
    const nface = faceOf(nf, next.id)[0]!;
    const nWord = built.solved[index + 1]!;
    const nCorner = transformPoint(nface.logicalMatrix, nWord.departCornerLocal!.x, nWord.departCornerLocal!.y);
    const ribNow = nf.drawItems.find((i) => i.nodeId === `r${contact.rib}.${contact.side === 1 ? "wr" : "wl"}`)!;
    const wallNow = transformPoint(ribNow.logicalMatrix, v.x, v.y);
    const gapNext = Math.hypot(nCorner.x - wallNow.x, nCorner.y - wallNow.y);
    expect(gapNext < 1.5, `${next.id} does not emerge from ${spec.id}'s contact point (${gapNext.toFixed(2)} px).`);
  });

  // Each echo's stated scale and opacity at its departure.
  for (const spec of WORDS.slice(1)) {
    const f = at(spec.tDep);
    expect(near(displayedScale(f, spec.id), spec.scale, 0.006), `${spec.id} departs at ${displayedScale(f, spec.id).toFixed(3)}, not ${spec.scale}.`);
    expect(near(opacityOf(f, spec.id), spec.alpha, 0.01), `${spec.id} departs at opacity ${opacityOf(f, spec.id).toFixed(3)}, not ${spec.alpha}.`);
    // Rebounds travel away from the wall it emerged from.
    const a = cx(spec.tDep + 0.05, spec.id);
    const b = cx(spec.tDep + 0.6, spec.id);
    const prevSide = WORDS[WORDS.indexOf(spec) - 1]!.contact!.side;
    expect(Math.sign(b.x - a.x) === -prevSide, `${spec.id} does not rebound away from the wall.`);
  }
  // The first reflection rebounds quickly, then eases before contact.
  const v = (t: number, id: string) => Math.hypot(cx(t + 0.05, id).x - cx(t, id).x, cx(t + 0.05, id).y - cx(t, id).y);
  expect(v(3.9, "w1") > v(6.85, "w1") * 1.3, "The first reflection does not ease before contact.");
  // Third repetition continues through 12 s.
  expect(opacityOf(at(12), "w3") > 0.3, "The third repetition is not visible at 12 s.");

  // The final word: 15% → 8%, fading to zero by 18.5 s, no bounce, toward the opening.
  const fin = at(18.45);
  expect(near(displayedScale(fin, "w5"), FINAL_SCALE, 0.004), `The final ECHO ends at scale ${displayedScale(fin, "w5").toFixed(3)}, not ${FINAL_SCALE}.`);
  expect(opacityOf(at(18.5), "w5") < 0.001, "The final ECHO has not faded by 18.5 s.");
  const end = centreOf(wordBox(fin, "w5")!);
  expect(Math.abs(end.x - VP.x) < 30 && Math.abs(end.y - VP.y) < 40, `The final ECHO does not reach the opening (${end.x.toFixed(0)}, ${end.y.toFixed(0)}).`);
  // Only the final repetition remains by 16 s.
  for (const id of ids.slice(0, 5)) expect(opacityOf(at(16), id) < 0.002, `${id} still visible at 16 s.`);
  expect(opacityOf(at(16), "w5") > 0.09, "The final repetition is not visible at 16 s.");
  // The final ripple vanishes by 19 s; nothing typographic after 18.5 s except that ripple.
  expect(itemsOf(at(17.5), "fr")[0]!.opacity > 0.1 && Math.hypot(transformPoint(itemsOf(at(17.5), "fr")[0]!.logicalMatrix, 0, 0).x - centreOf(wordBox(at(17.5), "w5")!).x, transformPoint(itemsOf(at(17.5), "fr")[0]!.logicalMatrix, 0, 0).y - centreOf(wordBox(at(17.5), "w5")!).y) < 2, "The final ripple is not visible around the final word.");
  expect(itemsOf(at(19.0), "fr")[0]!.opacity < 0.001, "The final ripple has not vanished by 19 s.");
  for (const t of [18.6, 19.5, 19.99]) {
    const f = at(t);
    const visible = f.drawItems.filter((i) => i.opacity > 0.001 && (/^w\d/.test(i.nodeId) || /^sh\d/.test(i.nodeId) || i.nodeId.includes(".rp") || i.nodeId.includes("pu")));
    expect(visible.length === 0, `Typography or effects remain at ${t}s: ${visible.map((i) => i.nodeId).join(", ")}`);
  }

  // Camera: still to 4 s, push through 4–16 s, stopped after.
  const ribScale = (t: number, rib: number) => {
    const f = at(t);
    const item = f.drawItems.find((i) => i.nodeId === `r${rib}.wl`)!;
    const a = transformPoint(item.logicalMatrix, VP.x, VP.y);
    const b = transformPoint(item.logicalMatrix, VP.x + 100, VP.y);
    return (b.x - a.x) / 100;
  };
  expect(near(ribScale(0, 3), 1, 1e-6) && near(ribScale(4, 3), 1, 1e-6), "The camera is not still during 0–4 s.");
  expect(ribScale(6, 3) > 1.001 && ribScale(10, 3) > ribScale(8, 3) + 0.01 && ribScale(12, 3) > ribScale(10, 3), "The push does not continue through 8–12 s.");
  expect(near(ribScale(16, 3), ribScale(20, 3), 1e-6) && ribScale(15, 3) > ribScale(14, 3), "The push does not ease to a stop by 16 s.");
  expect(ribScale(16, 2) > ribScale(16, 8) + 0.1, "No parallax between near and far walls.");
  // Both walls stay in view: the far rib's two edges at eye level are on screen throughout.
  for (let t = 0; t <= DURATION; t += 1) {
    const f = at(t);
    for (const side of ["wl", "wr"]) {
      const item = f.drawItems.find((i) => i.nodeId === `r4.${side}`)!;
      const p = transformPoint(item.logicalMatrix, side === "wl" ? VP.x - (F * W_EYE) / RIB_Z[4]! : VP.x + (F * W_EYE) / RIB_Z[4]!, VP.y);
      expect(p.x > 20 && p.x < W - 20, `Canyon wall ${side} leaves the frame at ${t}s.`);
    }
  }

  // Every visible word: on screen, upright within a few degrees, readable size.
  for (let t = 0; t <= DURATION; t += 0.05) {
    const f = at(t);
    for (const id of ids) {
      if (opacityOf(f, id) < 0.01) continue;
      const box = wordBox(f, id)!;
      expect(box.x0 >= 0 && box.x1 <= W && box.y0 >= 0 && box.y1 <= H, `${id} leaves the frame at ${t.toFixed(2)}s.`);
      expect(Math.abs(lean(f, id)) <= 8, `${id} leans ${lean(f, id).toFixed(1)}° at ${t.toFixed(2)}s.`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------- preview

type Page = {
  setContent(html: string): Promise<void>;
  addScriptTag(options: { content: string }): Promise<unknown>;
  evaluate<A, R>(fn: (arg: A) => R, arg: A): Promise<R>;
  locator(selector: string): { screenshot(options: { path: string }): Promise<unknown> };
};
type Chromium = {
  launch(options: { executablePath?: string }): Promise<{
    newPage(options: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<Page>;
    close(): Promise<void>;
  }>;
};

const STILLS = [0.05, 0.4, 0.82, 1.0, 1.42, 1.62, 2.2, 3.0, 3.5, 3.6, 3.85, 4.2, 4.9, 6.0, 7.0, 7.2, 7.6, 8.0, 9.2, 10.5, 10.66, 11.6, 12.0, 12.5, 12.66, 13.8, 15.0, 15.16, 16.0, 17.0, 18.0, 18.5, 19.0, 19.99];

async function preview(directory: string, runtime: AnimationRuntime, here: string): Promise<void> {
  const esbuild = await import("esbuild");
  const playwright = "playwright";
  const { chromium } = (await import(playwright).catch(() => createRequire(import.meta.url)(playwright))) as { chromium: Chromium };
  const bundle = await esbuild.build({
    stdin: { contents: `import { CanvasRenderer } from "@gvr/canvas-renderer"; (globalThis as any).GVR = { CanvasRenderer };`, resolveDir: here, loader: "ts" },
    bundle: true,
    write: false,
    format: "iife",
  });
  const executablePath = process.env.GVR_CHROME ?? process.env.CHROME_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#888"><canvas id="c"></canvas></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    await page.evaluate(([width, height]: number[]) => {
      const canvas = document.getElementById("c") as HTMLCanvasElement;
      const renderer = new (globalThis as any).GVR.CanvasRenderer(canvas);
      renderer.resize(width, height, 1);
      (globalThis as any).renderer = renderer;
    }, [W, H]);
    let renderMs = 0;
    for (const time of STILLS) {
      const frame = runtime.evaluate(ms(time));
      renderMs += await page.evaluate((json: string) => {
        const started = performance.now();
        (globalThis as any).renderer.render(JSON.parse(json));
        return performance.now() - started;
      }, JSON.stringify(frame));
      await page.locator("#c").screenshot({ path: resolve(directory, `t${time.toFixed(2).padStart(5, "0")}.png`) });
    }
    console.log(`canvas render ${(renderMs / STILLS.length).toFixed(1)}ms per still in Chromium`);
  } finally {
    await browser.close();
  }
  console.log(`preview ${directory} (${STILLS.length} stills)`);
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  const ids = ["sky", "opening", "glow", "core", "ring", "fl", "wl", "wr", "st", "rim", "back", "face", "ghost", "glyphs", "e", "fr", "d1", "d2", "d3", "a1", "a2", "a3"];
  for (const id of ids) if (KEYWORD_SET.has(id)) throw new Error(`${id} is a reserved keyword`);
  const generateStart = performance.now();
  const built = program();
  const { source } = built;
  console.log(`generate ${(performance.now() - generateStart).toFixed(0)}ms  model samples ${RAW_SAMPLES} at 60 Hz before simplification`);
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "echo-canyon.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source);
  const lines = source.split("\n").length - 1;
  console.log(`wrote ${outPath} (${lines} lines, ${bytes} bytes, ${((bytes / DEFAULT_LIMITS.maxSourceBytes) * 100).toFixed(1)}% of maxSourceBytes)`);
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene || compiled.diagnostics.length > 0) {
    console.error(compiled.diagnostics.map((entry) => `${entry.code}: ${entry.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((entry) => entry.message).join("\n"));
    process.exit(1);
  }
  const scene = compiled.scene;
  const geometry = scene.nodes.reduce((sum, node) => sum + (node.kind === "path" ? node.commands.length : node.kind === "polygon" ? node.points.length : 0), 0);
  const keyframes = scene.timeline.tracks.reduce((sum, t) => sum + (t.kind === "keyframe" ? t.keyframes.length : 0), 0);
  const expressions = scene.timeline.tracks.filter((t) => t.kind === "expression").length;
  const depth = (() => {
    const parent = new Map(scene.nodes.map((node) => [node.id, node.parentId]));
    let worst = 0;
    for (const node of scene.nodes) {
      let d = 1;
      let p: string | null | undefined = node.parentId;
      while (p) {
        d += 1;
        p = parent.get(p);
      }
      worst = Math.max(worst, d);
    }
    return worst;
  })();
  console.log(
    `compile ${compileMs.toFixed(0)}ms  nodes ${scene.nodes.length}/${DEFAULT_LIMITS.maxNodes}  depth ${depth}/${DEFAULT_LIMITS.maxDepth}  tracks ${scene.timeline.tracks.length}/${DEFAULT_LIMITS.maxTracks} (${expressions} expression)  steps ${scene.timeline.steps.length}/${DEFAULT_LIMITS.maxSteps}  keyframe values ${keyframes}  geometry ${geometry}/${DEFAULT_LIMITS.maxGeometryItems}`,
  );
  if (TRACKS !== scene.timeline.tracks.length) throw new Error(`Track count mismatch: builder ${TRACKS}, scene ${scene.timeline.tracks.length}`);
  const runtime = new AnimationRuntime(scene);
  const evalStart = performance.now();
  let frames = 0;
  for (let time = 0; time < DURATION; time += 1 / 30) {
    runtime.evaluate(ms(time));
    frames += 1;
  }
  console.log(`evaluate ${((performance.now() - evalStart) / frames).toFixed(2)}ms per frame (${frames} frames at 30 fps)`);
  const checksStart = performance.now();
  const problems = assertStory(runtime, built);
  console.log(`checks ${((performance.now() - checksStart) / 1000).toFixed(2)}s`);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("story checks passed");
  const previewDir = process.env.GVR_PREVIEW_DIR;
  if (previewDir) {
    mkdirSync(previewDir, { recursive: true });
    await preview(previewDir, runtime, here);
  }
  console.log(`builder ${((performance.now() - STARTED) / 1000).toFixed(2)}s`);
  void KEYFRAME_VALUES;
}

await main();
