/**
 * Builds fixtures/motionscript/stories/small-ideas-enormous-change.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-small-ideas-enormous-change.ts
 * Set GVR_PREVIEW_DIR to also write SVG stills of the key moments.
 *
 * Twenty seconds. "Small ideas can create enormous change." resolves one word
 * at a time on a warm white canvas, then settles into three left-aligned lines.
 * MotionScript has no font outlines, so the letterforms are a bold geometric
 * monoline drawn as stroked paths. That keeps every letter a node with known
 * metrics, lets "create" assemble from its own strokes, and keeps each letter's
 * identity through every rearrangement. Sound cues are header comments only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const STARTED = performance.now();
const DURATION = 20_000;

const BG = "#f6f1e7";
const INK = "#141210";
const VERMILION = "#e0401c";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Value = number | [number, number];
type Key = [number, Value, Ease?];

/** Glyph units: font size 100, baseline at y = 0, y down. */
const STROKE = 12;
const HEAVY = 16;
const XH = 52;
const SPACE = 24;
/** Final-line tracking for "change.": letters move this much closer each. */
const TIGHT = 2;

const VIEW = { w: 1280, h: 720 };
/** Everything readable stays above this screen y, the band a caption would use. */
const CAPTION_TOP = 650;

// ─── Glyphs ────────────────────────────────────────────────────────────────

type Cmd = { k: "M" | "L"; p: Pt } | { k: "C"; c1: Pt; c2: Pt; p: Pt } | { k: "Z" };
type Glyph = { adv: number; pieces: [string, Cmd[]][] };

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Elliptical arc from a0 to a1 degrees (y down), as cubic segments of at most 90°. */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, move = true): Cmd[] {
  const out: Cmd[] = [];
  const at = (a: number): Pt => ({ x: cx + rx * Math.cos(rad(a)), y: cy + ry * Math.sin(rad(a)) });
  if (move) out.push({ k: "M", p: at(a0) });
  const count = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
  const step = (a1 - a0) / count;
  const k = (4 / 3) * Math.tan(rad(step) / 4);
  for (let index = 0; index < count; index += 1) {
    const s = a0 + step * index;
    const e = s + step;
    const p0 = at(s);
    const p3 = at(e);
    const c1 = { x: p0.x - k * rx * Math.sin(rad(s)), y: p0.y + k * ry * Math.cos(rad(s)) };
    const c2 = { x: p3.x + k * rx * Math.sin(rad(e)), y: p3.y - k * ry * Math.cos(rad(e)) };
    out.push({ k: "C", c1, c2, p: p3 });
  }
  return out;
}

const M = (x: number, y: number): Cmd => ({ k: "M", p: { x, y } });
const L = (x: number, y: number): Cmd => ({ k: "L", p: { x, y } });
const stem = (x: number, top: number, bottom = 0): Cmd[] => [M(x, top), L(x, bottom)];
/** Closed ring: a join, not two butt caps, where the stroke meets itself. */
const ring = (cx: number, cy: number, r: number): Cmd[] => [...arc(cx, cy, r, r, 0, 360), { k: "Z" }];

/** Bowl: centre (31, -26), centreline radius 20, so the stroke spans the x-height exactly. */
const BOWL = { cx: 31, cy: -26, r: 20 };

const GLYPHS: Record<string, Glyph> = {
  S: {
    adv: 58,
    pieces: [
      ["upper", arc(29, -51, 22, 15, -28, -276)],
      ["lower", arc(29, -21, 22, 15, -90, 152)],
    ],
  },
  m: {
    adv: 80,
    pieces: [
      ["stem", stem(11, -52)],
      ["arch1", [...arc(25.5, -31.5, 14.5, 14.5, 180, 360), L(40, 0)]],
      ["arch2", [...arc(54.5, -31.5, 14.5, 14.5, 180, 360), L(69, 0)]],
    ],
  },
  a: {
    adv: 62,
    pieces: [
      ["bowl", ring(BOWL.cx, BOWL.cy, BOWL.r)],
      ["stem", stem(51, -52)],
    ],
  },
  l: { adv: 22, pieces: [["stem", stem(11, -74)]] },
  i: {
    adv: 22,
    pieces: [
      ["stem", stem(11, -52)],
      ["dot", stem(11, -74, -62)],
    ],
  },
  d: {
    adv: 62,
    pieces: [
      ["bowl", ring(BOWL.cx, BOWL.cy, BOWL.r)],
      ["stem", stem(51, -74)],
    ],
  },
  e: {
    adv: 62,
    pieces: [
      ["bowl", arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 0, -315)],
      ["crossbar", [M(11, -26), L(57, -26)]],
    ],
  },
  s: {
    adv: 50,
    pieces: [
      ["upper", arc(25, -36, 17, 10, -28, -276)],
      ["lower", arc(25, -16, 17, 10, -90, 152)],
    ],
  },
  c: {
    adv: 57,
    pieces: [
      ["upper", arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, -42, -186)],
      ["lower", arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 180, 42)],
    ],
  },
  n: {
    adv: 62,
    pieces: [
      ["stem", stem(11, -52)],
      ["shoulder", [...arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 180, 360), L(51, 0)]],
    ],
  },
  h: {
    adv: 62,
    pieces: [
      ["stem", stem(11, -74)],
      ["shoulder", [...arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 180, 360), L(51, 0)]],
    ],
  },
  r: {
    adv: 41,
    pieces: [
      ["stem", stem(11, -52)],
      ["shoulder", [...arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 180, 270), L(37, -46)]],
    ],
  },
  t: {
    adv: 42,
    pieces: [
      ["stem", stem(17, -68)],
      ["crossbar", [M(4, -46), L(36, -46)]],
    ],
  },
  o: { adv: 62, pieces: [["bowl", ring(BOWL.cx, BOWL.cy, BOWL.r)]] },
  u: {
    adv: 62,
    pieces: [
      ["leg", [M(11, -52), L(11, -26), ...arc(BOWL.cx, BOWL.cy, BOWL.r, BOWL.r, 180, 0, false)]],
      ["stem", stem(51, -52)],
    ],
  },
  g: {
    adv: 62,
    pieces: [
      ["bowl", ring(BOWL.cx, BOWL.cy, BOWL.r)],
      ["tail", [M(51, -52), L(51, 4), ...arc(33, 4, 18, 18, 0, 150, false)]],
    ],
  },
  ".": { adv: 22, pieces: [["dot", stem(11, -12)]] },
};

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function vec(p: Pt): string {
  return `(${n(p.x)}, ${n(p.y)})`;
}

function commands(cmds: Cmd[]): string {
  return cmds
    .map((cmd) => (cmd.k === "Z" ? "close;" : cmd.k === "C" ? `cubic ${vec(cmd.c1)} ${vec(cmd.c2)} ${vec(cmd.p)};` : `${cmd.k === "M" ? "move" : "line"} ${vec(cmd.p)};`))
    .join(" ");
}

function pointsOf(cmds: Cmd[]): Pt[] {
  return cmds.flatMap((cmd) => (cmd.k === "C" ? [cmd.c1, cmd.c2, cmd.p] : cmd.k === "Z" ? [] : [cmd.p]));
}

function boxOf(points: Pt[]): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: Math.min(...points.map((p) => p.x)),
    y0: Math.min(...points.map((p) => p.y)),
    x1: Math.max(...points.map((p) => p.x)),
    y1: Math.max(...points.map((p) => p.y)),
  };
}

function centreOf(points: Pt[]): Pt {
  const b = boxOf(points);
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
}

// ─── Words and layout ──────────────────────────────────────────────────────

type Letter = { id: string; ch: string; x: number; glyph: Glyph; centre: Pt };
type Word = { id: string; text: string; letters: Letter[]; width: number; centre: Pt; colour: string };

function word(id: string, text: string, colour = INK, tracking = 0): Word {
  let x = 0;
  const letters: Letter[] = [];
  for (const [index, ch] of [...text].entries()) {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`No glyph for ${ch}`);
    const centre = centreOf(glyph.pieces.flatMap(([, cmds]) => pointsOf(cmds)));
    const safe = ch === "." ? "dot" : ch;
    letters.push({ id: `${safe}${index}`, ch, x, glyph, centre });
    x += glyph.adv - tracking;
  }
  const width = x + tracking;
  const hasAscender = /[Sdhlt]/.test(text);
  return { id, text, letters, width, centre: { x: width / 2, y: hasAscender ? -37 : -26 }, colour };
}

const SMALL = word("small", "Small");
const IDEAS = word("ideas", "ideas");
const CAN = word("can", "can");
const CREATE = word("create", "create");
const ENORMOUS = word("enormous", "enormous");
const CHANGE = word("change", "change.", VERMILION);
const WORDS = [SMALL, IDEAS, CAN, CREATE, ENORMOUS, CHANGE];
const PERIOD = CHANGE.letters.length - 1;

/** Final editorial layout, world units. Baselines: line 1 at 0, line 2 at 140, line 3 at 265. */
const LINE = [0, 140, 265];
const ENORMOUS_FINAL_SCALE = 1.3;
/** Grown enough that both outer letters cross the frame edges at C3 without leaving it entirely. */
const ENORMOUS_GROWN = 2.4;
const FINAL_ORIGIN = {
  small: { x: 0, y: LINE[0]! },
  ideas: { x: SMALL.width + SPACE, y: LINE[0]! },
  can: { x: SMALL.width + SPACE + IDEAS.width + SPACE, y: LINE[0]! },
  create: { x: 0, y: LINE[1]! },
  enormous: { x: CREATE.width + SPACE * ENORMOUS_FINAL_SCALE, y: LINE[1]! },
  change: { x: 0, y: LINE[2]! },
};
/** Working positions before the final settle. */
const ENORMOUS_LINE = 290;
const CHANGE_LINE = 530;
const STAIR = 18;
const ARC_RISE = 46;

/** World centre for a word whose local origin sits at `origin` with uniform scale `s`. */
function centreAt(w: Word, origin: Pt, s = 1): Pt {
  return { x: origin.x + s * w.centre.x, y: origin.y + s * w.centre.y };
}

// ─── Camera ────────────────────────────────────────────────────────────────

type Shot = { t: number; c: Pt; z: number; ease: Ease };
const C1 = { c: { x: 400, y: 120 }, z: 1.25 };
const C2 = { c: { x: 330, y: 85 }, z: 1.45 };
const C3 = { c: { x: 380, y: 150 }, z: 1.3 };
/** "enormous" is revealed centred in the held frame, so it grows symmetrically past both edges. */
const ENORMOUS_X = C3.c.x - ENORMOUS.width / 2;
const grownHalf = (ENORMOUS.width * ENORMOUS_GROWN) / 2;
const enormousCentreX = ENORMOUS_X + ENORMOUS.width / 2;
const C4 = (() => {
  const x0 = enormousCentreX - grownHalf;
  const x1 = enormousCentreX + grownHalf;
  const y0 = -74;
  const y1 = CHANGE_LINE + 28;
  const z = Math.min((VIEW.w - 80) / (x1 - x0), (CAPTION_TOP - 24 - 60) / (y1 - y0));
  return { c: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 14 }, z: Number(z.toFixed(3)) };
})();
const finalWidth = FINAL_ORIGIN.enormous.x + ENORMOUS.width * ENORMOUS_FINAL_SCALE;
const C5 = { c: { x: finalWidth / 2, y: (LINE[0]! - 74 + LINE[2]! + 28) / 2 }, z: 1.1 };
const SHOTS: Shot[] = [
  { t: 0, ...C1, ease: "hold" },
  { t: 6, ...C1, ease: "easeInOut" },
  { t: 7.6, ...C2, ease: "hold" },
  { t: 8.4, ...C2, ease: "easeInOut" },
  { t: 9, ...C3, ease: "hold" },
  { t: 11.3, ...C3, ease: "easeInOut" },
  { t: 13, ...C4, ease: "hold" },
  { t: 17, ...C4, ease: "easeInOut" },
  { t: 18, ...C5, ease: "hold" },
];

// ─── Track emission ────────────────────────────────────────────────────────

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function fmt(value: Value, unit = ""): string {
  return typeof value === "number" ? `${n(value, 4)}${unit}` : `(${n(value[0], 3)}, ${n(value[1], 3)})`;
}

function percent(time: number, previous: number): { text: string; value: number } {
  if (time <= 0) return { text: "0%", value: 0 };
  if (time >= DURATION) return { text: "100%", value: 1 };
  let digits = 4;
  let value = Number(((time / DURATION) * 100).toFixed(digits)) / 100;
  while (value <= previous && digits < 7) {
    digits += 1;
    value = Number(((time / DURATION) * 100).toFixed(digits)) / 100;
  }
  if (value <= previous) value = previous + 1e-6;
  return { text: `${n(value * 100, digits)}%`, value };
}

/** One keyframe track over the whole programme, padded with holds to 0s and 20s. */
function track(target: string, keys: Key[], unit = ""): string {
  const ordered = keys.map(([t, v, ease]) => ({ t: ms(t), v, ease })).sort((a, b) => a.t - b.t);
  if (ordered[0]!.t > 0) ordered.unshift({ t: 0, v: ordered[0]!.v, ease: "hold" });
  ordered[0]!.t = 0;
  if (ordered[ordered.length - 1]!.t < DURATION) ordered.push({ t: DURATION, v: ordered[ordered.length - 1]!.v, ease: undefined });
  ordered[ordered.length - 1]!.t = DURATION;
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 20s;"];
  let previous = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    const key = ordered[index]!;
    const pct = percent(Math.max(0, Math.min(DURATION, key.t)), previous);
    previous = pct.value;
    const ease = key.ease && index < ordered.length - 1 ? ` ease ${key.ease}` : "";
    lines.push(`  ${pct.text} ${fmt(key.v, unit)}${ease};`);
  }
  lines.push("};");
  return lines.join("\n");
}

const tracks: string[] = [];
const emit = (target: string, keys: Key[], unit = "") => tracks.push(track(target, keys, unit));
const sub = (a: Pt, b: Pt): [number, number] => [a.x - b.x, a.y - b.y];

// ─── Choreography ──────────────────────────────────────────────────────────

/** Arrival windows per letter of "ideas": start offset, start rotation, window. */
const IDEAS_IN: { from: Pt; rot: number; t0: number; t1: number }[] = [
  { from: { x: 30, y: -230 }, rot: -48, t0: 3.0, t1: 3.6 },
  { from: { x: 330, y: -210 }, rot: 34, t0: 3.3, t1: 3.9 },
  { from: { x: 40, y: 250 }, rot: -30, t0: 3.6, t1: 4.2 },
  { from: { x: 330, y: 220 }, rot: 42, t0: 3.9, t1: 4.5 },
  { from: { x: 440, y: -30 }, rot: -38, t0: 4.2, t1: 4.8 },
];
const CAN_IN = { t0: 5.0, t1: 5.5, rise: 64 };
/** "create": one window per letter, 6.0s → 8.3s. */
const BUILD_T0 = 6;
const BUILD_T1 = 8.3;
const BUILD_SLOT = (BUILD_T1 - BUILD_T0) / CREATE.letters.length;
/** Where each piece starts, relative to its home: below and to the right, clear of resolved text. */
const PIECE_FROM: [number, number, number][] = [
  [70, 70, 70],
  [26, 96, -55],
  [96, 30, 40],
];
const ENORMOUS_IN = { t0: 9.0, gap: 0.05 };
const GROW = { t0: 10.0, t1: 11.3 };
const CHANGE_T = { show: 13.0, shown: 13.3, stair: 13.7, stairDone: 14.2, arc: 14.7, arcDone: 15.2, tight: 15.7, tightDone: 16.3, period: 16.3, periodDone: 16.65 };
const SETTLE = { t0: 17.0, shrunk: 17.4, rise: 17.1, t1: 18.0 };

function letterTracks(w: Word): void {
  // Letter positions are local to the word; displacements are added to each letter's x.
  if (w === IDEAS) {
    w.letters.forEach((letter, index) => {
      const inbound = IDEAS_IN[index]!;
      const home: [number, number] = [letter.x, 0];
      const from: [number, number] = [letter.x + inbound.from.x, inbound.from.y];
      emit(`${w.id}.${letter.id}.position`, [[0, from, "hold"], [inbound.t0, from, "easeOut"], [inbound.t1, home, "hold"]]);
      emit(`${w.id}.${letter.id}.rotation`, [[0, inbound.rot, "hold"], [inbound.t0, inbound.rot, "easeOut"], [inbound.t1, 0, "hold"]], "deg");
      emit(`${w.id}.${letter.id}.opacity`, [[0, 0, "hold"], [inbound.t0, 0, "easeOut"], [inbound.t0 + 0.12, 1, "hold"]]);
    });
  }
  if (w === CREATE) {
    w.letters.forEach((letter, index) => {
      const t0 = BUILD_T0 + BUILD_SLOT * index;
      const t1 = t0 + BUILD_SLOT;
      letter.glyph.pieces.forEach(([piece], p) => {
        const [dx, dy, rot] = PIECE_FROM[p]!;
        const a = t0 + p * 0.06;
        const b = t1 - 0.04;
        const id = `${w.id}.${letter.id}.${piece}`;
        emit(`${id}.position`, [[0, [dx, dy], "hold"], [a, [dx, dy], "easeOut"], [b, [0, 0], "hold"]]);
        emit(`${id}.rotation`, [[0, rot, "hold"], [a, rot, "easeOut"], [b, 0, "hold"]], "deg");
        emit(`${id}.opacity`, [[0, 0, "hold"], [a, 0, "easeOut"], [a + 0.08, 1, "hold"]]);
      });
      emit(`${w.id}.${letter.id}.guide.opacity`, [[0, 0, "hold"], [t0, 0, "linear"], [t0 + 0.04, 1, "hold"], [t1 - 0.04, 1, "easeIn"], [t1, 0, "hold"]]);
    });
  }
  if (w === ENORMOUS) {
    w.letters.forEach((letter, index) => {
      const at = ENORMOUS_IN.t0 + index * ENORMOUS_IN.gap;
      emit(`${w.id}.${letter.id}.opacity`, [[0, 0, "hold"], [at, 0, "linear"], [at + 0.03, 1, "hold"]]);
    });
  }
  if (w === CHANGE) {
    const T = CHANGE_T;
    const count = PERIOD;
    const tight = (index: number) => letterX(index, true);
    CHANGE.letters.forEach((letter, index) => {
      const id = `${w.id}.${letter.id}`;
      if (index === PERIOD) {
        const home: [number, number] = [tight(index), 0];
        emit(`${id}.position`, [[0, [home[0], -40], "hold"], [T.period, [home[0], -40], "easeOut"], [T.periodDone, home, "hold"]]);
        emit(`${id}.opacity`, [[0, 0, "hold"], [T.period, 0, "linear"], [T.period + 0.1, 1, "hold"]]);
        return;
      }
      const u = index / (count - 1);
      const flat: [number, number] = [letter.x, 0];
      const stair: [number, number] = [letter.x, -STAIR * index];
      const arcY = -ARC_RISE * 4 * u * (1 - u);
      const slope = -ARC_RISE * 4 * (1 - 2 * u);
      const tangent = (Math.atan2(slope, CHANGE.width - 22) * 180) / Math.PI;
      const arced: [number, number] = [letter.x, arcY];
      const final: [number, number] = [tight(index), 0];
      emit(`${id}.position`, [
        [0, [letter.x, 40], "hold"],
        [T.show, [letter.x, 40], "easeOut"],
        [T.shown, flat, "hold"],
        [T.stair, flat, "easeInOut"],
        [T.stairDone, stair, "hold"],
        [T.arc, stair, "easeInOut"],
        [T.arcDone, arced, "hold"],
        [T.tight, arced, "easeInOut"],
        [T.tightDone, final, "hold"],
      ]);
      emit(`${id}.rotation`, [[0, 0, "hold"], [T.arc, 0, "easeInOut"], [T.arcDone, tangent, "hold"], [T.tight, tangent, "easeInOut"], [T.tightDone, 0, "hold"]], "deg");
      emit(`${id}.opacity`, [[0, 0, "hold"], [T.show + index * 0.03, 0, "easeOut"], [T.show + index * 0.03 + 0.12, 1, "hold"]]);
      emit(`${id}.heavy.opacity`, [[0, 0, "hold"], [T.tight + 0.2, 0, "easeInOut"], [T.tightDone, 1, "hold"]]);
    });
  }
}

function letterX(index: number, tight: boolean): number {
  const letter = CHANGE.letters[index]!;
  return tight ? letter.x - TIGHT * index : letter.x;
}

function wordTracks(): void {
  // Small: tiny at the screen centre at 0.3s, hold 0.7s, enlarge in place, then move to its line.
  const smallHome = centreAt(SMALL, FINAL_ORIGIN.small);
  const tinyAt = C1.c;
  const smallPos = (c: Pt): [number, number] => sub(c, SMALL.centre);
  emit("small.position", [[0, smallPos(tinyAt), "hold"], [1.0, smallPos(tinyAt), "hold"], [1.9, smallPos(tinyAt), "easeInOut"], [2.8, smallPos(smallHome), "hold"]]);
  emit("small.scale", [[0, [0.2, 0.2], "hold"], [1.0, [0.2, 0.2], "easeInOut"], [1.9, [1, 1], "hold"]]);
  emit("small.opacity", [[0, 0, "hold"], [0.3, 1, "hold"]]);

  // can slides upward into its reading position.
  const canHome = sub(centreAt(CAN, FINAL_ORIGIN.can), CAN.centre);
  emit("can.position", [[0, [canHome[0], canHome[1] + CAN_IN.rise], "hold"], [CAN_IN.t0, [canHome[0], canHome[1] + CAN_IN.rise], "easeOut"], [CAN_IN.t1, canHome, "hold"]]);
  emit("can.opacity", [[0, 0, "hold"], [CAN_IN.t0, 0, "easeOut"], [CAN_IN.t0 + 0.2, 1, "hold"]]);

  // enormous: revealed beneath create, grown from its centre, then shrunk onto line 2.
  const eWork = centreAt(ENORMOUS, { x: ENORMOUS_X, y: ENORMOUS_LINE });
  const eFinal = centreAt(ENORMOUS, FINAL_ORIGIN.enormous, ENORMOUS_FINAL_SCALE);
  const eShrunk = { x: eFinal.x, y: eWork.y };
  const ePos = (c: Pt): [number, number] => sub(c, ENORMOUS.centre);
  emit("enormous.position", [[0, ePos(eWork), "hold"], [SETTLE.t0, ePos(eWork), "easeInOut"], [SETTLE.shrunk, ePos(eShrunk), "easeInOut"], [SETTLE.t1 - 0.1, ePos(eFinal), "hold"]]);
  const g = ENORMOUS_GROWN;
  const f = ENORMOUS_FINAL_SCALE;
  emit("enormous.scale", [[0, [1, 1], "hold"], [GROW.t0, [1, 1], "easeInOut"], [GROW.t1, [g, g], "hold"], [SETTLE.t0, [g, g], "easeInOut"], [SETTLE.shrunk, [f, f], "hold"]]);

  // change rises from its working line onto line 3 behind enormous.
  const cWork = sub(centreAt(CHANGE, { x: 0, y: CHANGE_LINE }), CHANGE.centre);
  const cFinal = sub(centreAt(CHANGE, FINAL_ORIGIN.change), CHANGE.centre);
  emit("change.position", [[0, cWork, "hold"], [SETTLE.rise, cWork, "easeInOut"], [SETTLE.t1, cFinal, "hold"]]);

  // Camera.
  emit("camera(main).position", SHOTS.map((s) => [s.t, [s.c.x, s.c.y], s.ease] as Key));
  emit("camera(main).zoom", SHOTS.map((s) => [s.t, s.z, s.ease] as Key));
}

// ─── Program ───────────────────────────────────────────────────────────────

function pathNode(id: string, cmds: Cmd[], colour: string, width: number, extra = ""): string {
  const pivot = centreOf(pointsOf(cmds));
  return `path ${id} { pivot ${vec(pivot)}; ${extra}${commands(cmds)} stroke ${colour} width ${width} cap butt join miter; };`;
}

function guides(letter: Letter): string {
  const x0 = -4;
  const x1 = letter.glyph.adv + 4;
  const lines = [
    `line base { from (${x0}, 0); to (${x1}, 0); stroke ${VERMILION} width 1.5; };`,
    `line xh { from (${x0}, ${-XH}); to (${x1}, ${-XH}); stroke ${VERMILION} width 1.5; };`,
  ];
  if (/[ceao]/.test(letter.ch)) lines.push(`circle ring { position (${BOWL.cx}, ${BOWL.cy}); radius ${BOWL.r}; stroke ${VERMILION} width 1.5; };`);
  else lines.push(`line axis { from (${11}, 6); to (${11}, -60); stroke ${VERMILION} width 1.5; };`);
  return `group guide { opacity 0; zIndex 1; ${lines.join(" ")} };`;
}

function letterNode(w: Word, letter: Letter, index: number): string {
  // Only "create" assembles from separate strokes. Every other letter is one path, so the
  // canvas strokes its pieces as one union and no anti-aliased seam shows where they meet.
  const whole = letter.glyph.pieces.flatMap(([, cmds]) => cmds);
  const body =
    w === CREATE
      ? letter.glyph.pieces.map(([piece, cmds]) => pathNode(piece, cmds, w.colour, STROKE, "opacity 0; ")).join("\n      ")
      : pathNode("body", whole, w.colour, STROKE);
  const heavy = w === CHANGE && index !== PERIOD ? `\n      group heavy { opacity 0; zIndex -1; ${pathNode("body", whole, w.colour, HEAVY)} };` : "";
  const guide = w === CREATE ? `\n      ${guides(letter)}` : "";
  const initialOpacity = w === IDEAS || w === ENORMOUS || w === CHANGE ? "opacity 0; " : "";
  return `    group ${letter.id} {
      position (${n(letter.x)}, 0); pivot ${vec(letter.centre)}; ${initialOpacity}zIndex 2;
      ${body}${heavy}${guide}
    };`;
}

function wordNode(w: Word, origin: Pt, extra = ""): string {
  const pos = sub(centreAt(w, origin), w.centre);
  return `group ${w.id} {
  position (${n(pos[0])}, ${n(pos[1])}); pivot ${vec(w.centre)}; zIndex 10; ${extra}
${w.letters.map((letter, index) => letterNode(w, letter, index)).join("\n")}
};`;
}

function program(): string {
  for (const w of WORDS) letterTracks(w);
  wordTracks();
  return `// SMALL IDEAS, ENORMOUS CHANGE
// 20 seconds. "Small ideas can create enormous change." resolves one word at a time.
// Letterforms are a bold geometric monoline drawn as stroked paths (12 units at size 100;
// 17 for the heavier "change."). Generated by build-small-ideas-enormous-change.ts; do not edit by hand.
// 0:00.3 Small appears tiny at centre, holds 0.7s, enlarges, moves to the upper left.
// 0:03 i d e a s arrive rotated from five directions; 0:05 can slides up.
// 0:06 create assembles stroke by stroke over vermilion guides; the camera eases closer.
// 0:09 enormous is revealed, grows past the frame at 0:10, the camera pulls back at 0:11.3.
// 0:13 change: baseline, staircase, arc, then tight and heavy; the period settles at 0:16.3.
// 0:17 three left-aligned lines; all movement ends by 0:18.
// Sound cues (MotionScript has no audio): 0.30 click; 1.00 rising tone; 3.60 3.90 4.20 4.50 4.80 taps;
// 5.50 light tap; 6.36 6.74 7.12 7.51 7.89 8.27 construction clicks; 9.00–13.00 low swell;
// 14.20 15.20 16.30 accents; 18.00 soft impact, then silence.
scene "small-ideas-enormous-change" {
  version "0.2";
  viewport (${VIEW.w}, ${VIEW.h});
  background ${BG};
  duration 20s;
  requires "easing.hold";
};
camera main {
  position ${vec(C1.c)};
  zoom ${C1.z};
  rotation 0deg;
};
${wordNode(SMALL, FINAL_ORIGIN.small, "opacity 0;")}
${wordNode(IDEAS, FINAL_ORIGIN.ideas)}
${wordNode(CAN, FINAL_ORIGIN.can, "opacity 0;")}
${wordNode(CREATE, FINAL_ORIGIN.create)}
${wordNode(ENORMOUS, { x: ENORMOUS_X, y: ENORMOUS_LINE })}
${wordNode(CHANGE, { x: 0, y: CHANGE_LINE })}
${tracks.join("\n")}
complete;
`;
}

// ─── Checks on evaluated draw items ────────────────────────────────────────

type Box = { x0: number; y0: number; x1: number; y1: number };

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined) return "none";
  return cssColor(color as SolidColor);
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.004) return "";
  const matrix = item.logicalMatrix;
  const transform = `transform="matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})"`;
  const stroke = item.appearance.stroke;
  const strokePaint = stroke ? cssPaint(stroke.color.type === "solid" ? stroke.color : undefined) : "none";
  const opacity = `opacity="${item.opacity.toFixed(3)}"`;
  const geometry = item.geometry;
  if (geometry.kind === "line") {
    return `<line x1="${geometry.from.x}" y1="${geometry.from.y}" x2="${geometry.to.x}" y2="${geometry.to.y}" ${transform} ${opacity} stroke="${strokePaint}" stroke-width="${stroke?.width ?? 1}"/>`;
  }
  if (geometry.kind === "circle") return `<circle cx="0" cy="0" r="${geometry.radius}" ${transform} ${opacity} fill="none" stroke="${strokePaint}" stroke-width="${stroke?.width ?? 0}"/>`;
  if (geometry.kind === "path") {
    const d = geometry.commands
      .map((command) => {
        if (command.cmd === "M") return `M ${command.x} ${command.y}`;
        if (command.cmd === "L") return `L ${command.x} ${command.y}`;
        if (command.cmd === "Q") return `Q ${command.cx} ${command.cy} ${command.x} ${command.y}`;
        if (command.cmd === "C") return `C ${command.c1x} ${command.c1y} ${command.c2x} ${command.c2y} ${command.x} ${command.y}`;
        return "Z";
      })
      .join(" ");
    return `<path d="${d}" ${transform} ${opacity} fill="none" stroke="${strokePaint}" stroke-width="${stroke?.width ?? 0}" stroke-linejoin="miter"/>`;
  }
  return "";
}

/** Screen box of one drawn item: control hull of its geometry, padded by half the scaled stroke. */
function screenBox(item: ResolvedDrawItem): Box {
  const m = item.logicalMatrix;
  const g = item.geometry;
  const local: Pt[] = [];
  if (g.kind === "path") {
    for (const c of g.commands) {
      if (c.cmd === "C") local.push({ x: c.c1x, y: c.c1y }, { x: c.c2x, y: c.c2y }, { x: c.x, y: c.y });
      else if (c.cmd === "Q") local.push({ x: c.cx, y: c.cy }, { x: c.x, y: c.y });
      else if (c.cmd !== "Z") local.push({ x: c.x, y: c.y });
    }
  } else if (g.kind === "line") local.push(g.from, g.to);
  else if (g.kind === "circle") local.push({ x: -g.radius, y: -g.radius }, { x: g.radius, y: g.radius });
  const pts = local.map((p) => transformPoint(m, p.x, p.y));
  const pad = ((item.appearance.stroke?.width ?? 0) / 2) * Math.hypot(m[0], m[1]);
  const b = boxOf(pts);
  return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad };
}

function union(boxes: Box[]): Box {
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

function overlaps(a: Box, b: Box, gap = 0): boolean {
  return a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;
}

function main(): void {
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "small-ideas-enormous-change.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source, "utf8");
  console.log(`wrote ${outPath} (${bytes} bytes, ${((bytes / DEFAULT_LIMITS.maxSourceBytes) * 100).toFixed(1)}% of maxSourceBytes ${DEFAULT_LIMITS.maxSourceBytes})`);
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene) {
    console.error(compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    process.exit(1);
  }
  if (compiled.diagnostics.length > 0) {
    console.error(compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((item) => item.message).join("\n"));
    process.exit(1);
  }
  const scene = compiled.scene;
  const steps = scene.timeline.steps.length;
  console.log(
    `nodes ${scene.nodes.length}/${DEFAULT_LIMITS.maxNodes}  tracks ${scene.timeline.tracks.length}/${DEFAULT_LIMITS.maxTracks}  steps ${steps}/${DEFAULT_LIMITS.maxSteps}  compile ${compileMs.toFixed(0)}ms`,
  );

  const runtime = new AnimationRuntime(scene);
  const frame = (seconds: number) => runtime.evaluate(ms(seconds)).drawItems;
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;
  const visibleOf = (items: readonly ResolvedDrawItem[], prefix: string) => items.filter((item) => item.nodeId.startsWith(`${prefix}.`) && item.opacity > 0.02 && !item.nodeId.includes(".guide."));
  const boxOfNode = (items: readonly ResolvedDrawItem[], prefix: string): Box | undefined => {
    const drawn = visibleOf(items, prefix).filter((item) => !item.nodeId.includes(".heavy."));
    return drawn.length > 0 ? union(drawn.map(screenBox)) : undefined;
  };
  const must = (items: readonly ResolvedDrawItem[], prefix: string, label: string): Box => {
    const box = boxOfNode(items, prefix);
    if (!box) {
      problems.push(`${label}: ${prefix} is not drawn.`);
      return { x0: NaN, y0: NaN, x1: NaN, y1: NaN };
    }
    return box;
  };
  const inFrame = (b: Box, pad = 4) => b.x0 >= pad && b.x1 <= VIEW.w - pad && b.y0 >= pad && b.y1 <= CAPTION_TOP;
  const letterPrefix = (w: Word, index: number) => `${w.id}.${w.letters[index]!.id}`;
  const baselineY = (items: readonly ResolvedDrawItem[], w: Word, index: number) => {
    const piece = items.find((item) => item.nodeId.startsWith(`${letterPrefix(w, index)}.`) && item.geometry.kind === "path");
    if (!piece) throw new Error(`Missing ${letterPrefix(w, index)}`);
    // Baseline under the glyph's centre, so a letter rotated about its centre still measures its own baseline.
    return transformPoint(piece.logicalMatrix, w.letters[index]!.centre.x, 0);
  };
  const capHeight = (items: readonly ResolvedDrawItem[], w: Word, index: number) => {
    const piece = items.find((item) => item.nodeId.startsWith(`${letterPrefix(w, index)}.`) && item.geometry.kind === "path")!;
    const a = transformPoint(piece.logicalMatrix, 0, 0);
    const b = transformPoint(piece.logicalMatrix, 0, -XH);
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  // [0:00–0:03] Small.
  expect(frame(0.2).filter((item) => item.opacity > 0.02).length === 0, "The canvas is not empty before 0.3s.");
  for (const t of [0.35, 0.65, 0.95]) {
    const box = must(frame(t), "small", `Small at ${t}s`);
    expect(near((box.x0 + box.x1) / 2, VIEW.w / 2, 6) && near((box.y0 + box.y1) / 2, VIEW.h / 2, 6), `Small is not centred at ${t}s.`);
    expect(box.y1 - box.y0 < 30, `Small is not tiny at ${t}s (${(box.y1 - box.y0).toFixed(0)}px tall).`);
  }
  const settled = must(frame(2.85), "small", "Small settled");
  expect(settled.x0 < 320 && settled.y0 < 260, "Small did not move to the upper left.");
  expect(capHeight(frame(2.85), SMALL, 1) > 55, "Small is not at reading size.");
  for (let t = 2.8; t <= 6; t += 0.1) {
    const box = must(frame(t), "small", "Small hold");
    expect(near(box.x0, settled.x0, 0.5) && near(box.y0, settled.y0, 0.5), `Small moves at ${t.toFixed(1)}s.`);
  }
  // Settle without bouncing: Small's x only decreases between 1.9s and 2.8s.
  let lastX = Infinity;
  for (let t = 1.9; t <= 2.8; t += 1 / 30) {
    const x = must(frame(t), "small", "Small settle").x0;
    expect(x <= lastX + 0.01, `Small overshoots at ${t.toFixed(2)}s.`);
    lastX = x;
  }

  // [0:03–0:06] ideas assembles; can slides up.
  const scattered = frame(3.05);
  const idea0 = scattered.find((item) => item.nodeId === `${letterPrefix(IDEAS, 0)}.body`)!;
  expect(Math.abs(Math.atan2(idea0.logicalMatrix[1], idea0.logicalMatrix[0])) > 0.4, "i does not arrive rotated.");
  const assembled = frame(4.85);
  const lefts = IDEAS.letters.map((_, index) => must(assembled, letterPrefix(IDEAS, index), "ideas").x0);
  expect(lefts.every((x, index) => index === 0 || x > lefts[index - 1]!), "ideas letters are not in reading order.");
  const smallBase = baselineY(assembled, SMALL, 0).y;
  for (let index = 0; index < IDEAS.letters.length; index += 1) {
    expect(near(baselineY(assembled, IDEAS, index).y, smallBase, 0.5), `ideas letter ${index} is off the baseline.`);
    const piece = assembled.find((item) => item.nodeId.startsWith(`${letterPrefix(IDEAS, index)}.`))!;
    expect(near(Math.atan2(piece.logicalMatrix[1], piece.logicalMatrix[0]), 0, 1e-3), `ideas letter ${index} is still rotated.`);
  }
  expect(IDEAS_IN.every((entry, index) => index === 0 || entry.t0 >= IDEAS_IN[index - 1]!.t0), "ideas letters arrive out of order.");
  expect(!boxOfNode(frame(4.95), "can"), "can appears before 5.0s.");
  const canMid = must(frame(5.25), "can", "can moving");
  const canHome = must(frame(5.55), "can", "can home");
  expect(canMid.y0 > canHome.y0 + 4, "can does not slide upward.");
  expect(near(baselineY(frame(5.55), CAN, 0).y, smallBase, 0.5), "can is off the line.");
  const phrase = union([must(frame(5.9), "small", "phrase"), must(frame(5.9), "ideas", "phrase"), must(frame(5.9), "can", "phrase")]);
  expect(inFrame(phrase), "Small ideas can does not fit the frame.");

  // [0:06–0:09] create assembles letter by letter.
  for (let index = 0; index < CREATE.letters.length; index += 1) {
    const t0 = BUILD_T0 + BUILD_SLOT * index;
    const t1 = t0 + BUILD_SLOT;
    const mid = frame(t0 + BUILD_SLOT * 0.45);
    const guideOn = mid.find((item) => item.nodeId === `${letterPrefix(CREATE, index)}.guide.base`)!;
    expect(guideOn.opacity > 0.9, `Guide for create letter ${index} is not shown while it assembles.`);
    if (index + 1 < CREATE.letters.length) expect(!boxOfNode(mid, letterPrefix(CREATE, index + 1)), `create letter ${index + 1} starts before letter ${index} is done.`);
    const done = frame(t1 + 0.01);
    const guideOff = done.find((item) => item.nodeId === `${letterPrefix(CREATE, index)}.guide.base`)!;
    expect(guideOff.opacity < 0.02, `Guide for create letter ${index} remains after it finishes.`);
    for (const item of done.filter((entry) => entry.nodeId.startsWith(`${letterPrefix(CREATE, index)}.`) && !entry.nodeId.includes(".guide."))) {
      expect(item.opacity > 0.98, `${item.nodeId} is not complete at ${t1.toFixed(2)}s.`);
      expect(near(Math.atan2(item.logicalMatrix[1], item.logicalMatrix[0]), 0, 1e-3), `${item.nodeId} is still rotated at ${t1.toFixed(2)}s.`);
    }
    expect(near(baselineY(done, CREATE, index).y, baselineY(done, CREATE, 0).y, 0.5), `create letter ${index} is off its baseline.`);
  }
  const built = frame(8.35);
  expect(capHeight(built, CREATE, 0) > capHeight(frame(5.9), SMALL, 1) + 4, "The camera does not ease closer for create.");
  expect(inFrame(union([must(built, "small", "8.35"), must(built, "can", "8.35"), must(built, "create", "8.35")])), "The phrase leaves the frame while create is built.");
  expect(must(built, "create", "8.35").y0 > must(built, "small", "8.35").y1, "create is not beneath the phrase.");
  const moved = frame(9);
  expect(must(moved, "small", "9").x0 < must(built, "small", "8.35").x0 && must(moved, "small", "9").y0 < must(built, "small", "8.35").y0, "The phrase does not move toward the upper left.");

  // [0:09–0:13] enormous.
  const revealed = frame(9.6);
  const eBox = must(revealed, "enormous", "enormous revealed");
  expect(inFrame(eBox), "enormous is not fully revealed in frame.");
  expect(eBox.y0 > must(revealed, "create", "9.6").y1, "enormous is not beneath create.");
  for (let index = 0; index < ENORMOUS.letters.length; index += 1) expect(!!boxOfNode(frame(9.45), letterPrefix(ENORMOUS, index)), `enormous letter ${index} is not revealed by 9.45s.`);
  const grown = frame(GROW.t1);
  const first = must(grown, letterPrefix(ENORMOUS, 0), "enormous grown");
  const last = must(grown, letterPrefix(ENORMOUS, ENORMOUS.letters.length - 1), "enormous grown");
  expect(first.x0 < 0 && last.x1 > VIEW.w, `enormous does not exceed the frame (${first.x0.toFixed(0)} … ${last.x1.toFixed(0)}).`);
  expect(first.x1 > 0 && last.x0 < VIEW.w, "An outer letter of enormous leaves the frame entirely instead of extending past it.");
  const grownBox = must(grown, "enormous", "grown");
  expect(grownBox.y1 < CAPTION_TOP, "Grown enormous drops into the caption area.");
  const grownCentre = (grownBox.y0 + grownBox.y1) / 2;
  expect(near(grownCentre, (eBox.y0 + eBox.y1) / 2, 3), "enormous does not grow from its centre.");
  for (const id of ["small", "ideas", "can", "create"]) {
    expect(near(must(grown, id, "hold").x0, must(revealed, id, "hold").x0, 0.5), `${id} moves while enormous grows.`);
  }
  const back = frame(13);
  expect(inFrame(must(back, "enormous", "13")), "The pull-back does not recover the whole of enormous.");
  for (const id of ["small", "ideas", "can", "create"]) expect(inFrame(must(back, id, "13")), `${id} is not in view after the pull-back.`);
  expect(capHeight(back, ENORMOUS, 0) > 0.9 * ENORMOUS_GROWN * capHeight(back, CREATE, 0), "The scale relationship is not visible after the pull-back.");

  // [0:13–0:17] change: baseline, staircase, arc, tight.
  const base = (t: number) => CHANGE.letters.slice(0, PERIOD).map((_, index) => baselineY(frame(t), CHANGE, index));
  const flat = base(13.65);
  expect(flat.every((p) => near(p.y, flat[0]!.y, 0.5)), "change does not start on a horizontal baseline.");
  const stair = base(14.6);
  expect(stair.every((p, index) => index === 0 || p.y < stair[index - 1]!.y - 5), "change does not form an ascending staircase.");
  const arced = base(15.6);
  const mid = arced[2]!.y;
  expect(mid < arced[0]!.y - 20 && mid < arced[PERIOD - 1]!.y - 20, "change does not form an upward arc.");
  for (const set of [flat, stair, arced]) expect(set.every((p, index) => index === 0 || p.x > set[index - 1]!.x), "change loses left-to-right order.");
  const tight = base(16.95);
  expect(tight.every((p) => near(p.y, tight[0]!.y, 0.5)), "change does not return to a horizontal baseline.");
  expect(tight[PERIOD - 1]!.x - tight[0]!.x < flat[PERIOD - 1]!.x - flat[0]!.x - TIGHT * (PERIOD - 1) * 0.75, "change is not more tightly spaced.");
  const heavy = frame(16.95).filter((item) => item.nodeId.includes(".heavy.") && item.opacity > 0.98);
  expect(heavy.length >= PERIOD, "change is not heavier at the end of the beat.");
  const period = must(frame(16.95), letterPrefix(CHANGE, PERIOD), "period");
  const lastE = must(frame(16.95), letterPrefix(CHANGE, PERIOD - 1), "final e");
  expect(period.x0 > lastE.x1 && near(baselineY(frame(16.95), CHANGE, PERIOD).y, baselineY(frame(16.95), CHANGE, PERIOD - 1).y, 0.5), "The period does not settle after the final e.");
  expect(!boxOfNode(frame(16.2), letterPrefix(CHANGE, PERIOD)), "The period appears before the word is tight.");
  for (const t of [13.65, 14.6, 15.6, 16.95]) {
    const items = frame(t);
    const all = union(WORDS.map((w) => must(items, w.id, `${t}`)));
    expect(inFrame(all), `The completed text does not fit the frame at ${t}s.`);
    for (const item of items.filter((entry) => entry.nodeId.startsWith("change.") && entry.opacity > 0.02)) {
      const colour = item.appearance.stroke?.color;
      expect(colour?.type === "solid" && colour.r > 0.8 && colour.g < 0.4, `${item.nodeId} is not vermilion.`);
    }
  }

  // [0:17–0:20] the complete thought.
  const end = frame(18);
  const left = (id: string) => must(end, id, "final").x0;
  const line = (w: Word) => baselineY(end, w, 0);
  expect(near(line(SMALL).x, line(CREATE).x, 1) && near(line(CREATE).x, line(CHANGE).x, 1), "The three lines are not left-aligned.");
  expect(line(SMALL).y < line(CREATE).y && line(CREATE).y < line(CHANGE).y, "The lines are out of order.");
  expect(near(line(CREATE).y, line(ENORMOUS).y, 0.5), "enormous is not on the create line.");
  expect(near(line(IDEAS).y, line(SMALL).y, 0.5) && near(line(CAN).y, line(SMALL).y, 0.5), "Line 1 is broken.");
  expect(left("enormous") > must(end, "create", "final").x1, "enormous does not follow create.");
  expect(capHeight(end, ENORMOUS, 0) > 1.2 * capHeight(end, CREATE, 0), "enormous is not visibly larger than its neighbours.");
  for (const w of WORDS) expect(inFrame(must(end, w.id, "final"), 40), `${w.id} is not comfortably inside the final frame.`);
  const lines = [union(["small", "ideas", "can"].map((id) => must(end, id, "final"))), union(["create", "enormous"].map((id) => must(end, id, "final"))), must(end, "change", "final")];
  expect(lines[0]!.y1 < lines[1]!.y0 && lines[1]!.y1 < lines[2]!.y0, "The final lines overlap.");
  const still = JSON.stringify(end.map((item) => [item.nodeId, item.logicalMatrix.map((v) => v.toFixed(3)), item.opacity.toFixed(3)]));
  for (let t = 18; t <= 20; t += 0.25) {
    const now = JSON.stringify(frame(t).map((item) => [item.nodeId, item.logicalMatrix.map((v) => v.toFixed(3)), item.opacity.toFixed(3)]));
    expect(now === still, `Something moves after 18s (${t.toFixed(2)}s).`);
  }

  // Reading-order rule: a moving word never touches resolved text, sampled at 30 fps.
  const windows: { from: number; to: number; moving: string; resolved: (t: number) => string[] }[] = [
    { from: 3, to: 4.8, moving: "ideas", resolved: () => ["small"] },
    { from: 5, to: 5.5, moving: "can", resolved: () => ["small", "ideas"] },
    { from: 6, to: 8.3, moving: "create", resolved: () => ["small", "ideas", "can"] },
    { from: 10, to: 11.3, moving: "enormous", resolved: () => ["small", "ideas", "can", "create"] },
    { from: 13, to: 17, moving: "change", resolved: () => ["small", "ideas", "can", "create", "enormous"] },
    { from: 17, to: 18, moving: "enormous", resolved: () => ["small", "ideas", "can", "create"] },
    { from: 17, to: 18, moving: "change", resolved: () => ["small", "ideas", "can", "create", "enormous"] },
  ];
  for (const window of windows) {
    for (let t = window.from; t <= window.to + 1e-9; t += 1 / 30) {
      const items = frame(t);
      const movingItems = visibleOf(items, window.moving);
      for (const other of window.resolved(t)) {
        const target = boxOfNode(items, other);
        if (!target) continue;
        // Letter-level boxes, so a word's own gaps are respected.
        const letters = WORDS.find((w) => w.id === other)!.letters.map((_, index) => boxOfNode(items, `${other}.${WORDS.find((w) => w.id === other)!.letters[index]!.id}`)).filter((b): b is Box => !!b);
        for (const item of movingItems) {
          const box = screenBox(item);
          if (letters.some((b) => overlaps(box, b, 2))) {
            problems.push(`${item.nodeId} touches ${other} at ${t.toFixed(2)}s.`);
            break;
          }
        }
      }
      // Within create, a piece must not touch an already finished letter.
      if (window.moving === "create") {
        const index = Math.min(CREATE.letters.length - 1, Math.floor((t - BUILD_T0) / BUILD_SLOT));
        const pieces = visibleOf(items, letterPrefix(CREATE, index));
        for (let done = 0; done < index; done += 1) {
          const box = boxOfNode(items, letterPrefix(CREATE, done));
          if (box && pieces.some((piece) => overlaps(screenBox(piece), box, 1))) problems.push(`create letter ${index} touches letter ${done} at ${t.toFixed(2)}s.`);
        }
      }
    }
  }

  // Whole programme at 30 fps: every drawn word stays inside the frame and above the caption band,
  // except "ideas" letters entering from off screen and "enormous" while it exceeds the frame.
  for (let t = 0; t <= 20 + 1e-9; t += 1 / 30) {
    const items = frame(t);
    for (const w of WORDS) {
      if (w === IDEAS && t < IDEAS_IN[IDEAS_IN.length - 1]!.t1) continue;
      if (w === ENORMOUS && t > GROW.t0 && t < 13) continue;
      const box = boxOfNode(items, w.id);
      if (box && !inFrame(box, 0)) problems.push(`${w.id} leaves the frame or enters the caption band at ${t.toFixed(2)}s.`);
    }
  }

  if (problems.length > 0) {
    console.error([...new Set(problems)].join("\n"));
    process.exit(1);
  }
  console.log(`checks passed  builder ${(performance.now() - STARTED).toFixed(0)}ms`);
  const previewDir = process.env.GVR_PREVIEW_DIR;
  if (!previewDir) return;
  mkdirSync(previewDir, { recursive: true });
  for (const time of PREVIEW_TIMES) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${BG}"/>${frame(time).map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(previewDir, `f${time.toFixed(2)}.svg`), svg);
  }
  console.log(`preview ${previewDir}`);
}

/** Beat boundaries and key moments. */
const PREVIEW_TIMES = [0.2, 0.5, 1.0, 1.45, 1.9, 2.35, 3, 3.3, 3.75, 4.3, 4.8, 5.25, 5.5, 6, 6.2, 6.55, 7.0, 7.5, 8.0, 8.3, 8.7, 9, 9.2, 9.6, 10, 10.65, 11.3, 12.1, 13, 13.15, 13.7, 14.0, 14.7, 15.0, 15.7, 16.0, 16.3, 16.5, 17, 17.25, 17.5, 17.75, 18, 20];

main();
