/**
 * Builds fixtures/motionscript/stories/a-circle-in-motion.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-a-circle-in-motion.ts
 * Set GVR_PREVIEW_DIR to also write SVG stills of the key moments.
 *
 * Thirty seconds, looping. One closed path, `body.turn.ring`, carries the whole
 * film: a falling drop, the oblique ripple, the clock rim, the bicycle tyre,
 * the sun and the drop again. Its outline is an even-odd pair of contours, so
 * the drop is the pair with the inner contour collapsed, and the ripple, rim
 * and tyre are the pair with the inner contour opened. The two halves of the
 * pond line are the clock hands and then the first two spokes. MotionScript
 * has no audio, so the sound cues are a quiet screen-space caption.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import {
  applyEasing,
  DEFAULT_LIMITS,
  transformPoint,
  validateSceneIR,
  type PathCommand,
  type ResolvedDrawItem,
  type SolidColor,
} from "@gvr/schema";

const builderStart = performance.now();
const DURATION = 30_000;

const BG = "#f4efe6";
const INK = "#111111";
const CUE = "#9a9184";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold" | string;
type Value = number | [number, number] | string;
type Key = [number, Value, Ease?];

/** Clock radius (centre of the rim stroke) and tyre radii. */
const R = 150;
const RIM = { outer: 152, inner: 148 };
const TYRE = { outer: 157, inner: 143 };
const INNER_RIM = 136;
const HUB_BASE = 10;
const POND_HALF = 420;
const KAPPA = 0.5523;

/** Drop: radius of the round end, tip 2r from the centre at rest. */
const DROP_R = 20;
const DROP_TOP_TIP = -290;
/** The fall runs 28s → 30s ≡ 0s → 1.5s; tip y = top + G2·τ², τ = 3.5 at impact. */
const FALL_TOTAL = 3.5;
const G2 = -DROP_TOP_TIP / (FALL_TOTAL * FALL_TOTAL);
const STRETCH = 0.18;
/** Second fall segment, τ 2 → 3.5, as an exact quadratic in time. */
const FALL_EASE_2 = "cubic(0.3333, 0.2424, 0.6667, 0.5758)";

/** Rolling: two turns of the tyre's outer edge. */
const SPIN_TURNS = 2;
const TRAVEL = TYRE.outer * 2 * Math.PI * SPIN_TURNS;
const HANDS_SPIN = 375;

/** Sun. */
const HORIZON_Y = 60;
const SUN_TOP_Y = -230;
const DIP_Y = 28;

/** Bicycle, relative to the front (tracked) hub. */
const REAR: Pt = { x: -400, y: 0 };
const HEAD_LOW: Pt = { x: -55, y: -150 };
const HEAD_TOP: Pt = { x: -70, y: -195 };
const CRANK: Pt = { x: -205, y: 30 };
const SEAT: Pt = { x: -255, y: -180 };
const POST: Pt = { x: -262, y: -210 };

const CLOCK = { hour: 305, minute: 60, hourLength: 80, minuteLength: 118 };

/** Camera stops: time, centre, zoom, ease into the next stop. */
const OPENING = { x: 0, y: -110, zoom: 1 };

const CAPTIONS: [string, number, number, string][] = [
  ["cue1", 1.45, 4.6, "sound · one soft water plink"],
  ["cue2", 5.2, 9.8, "sound · water resonance becomes a quiet tick"],
  ["cue3", 10.2, 14.8, "sound · ticks quicken into a light freewheel"],
  ["cue4", 15.2, 19.8, "sound · the freewheel softens into a low tone"],
  ["cue5", 20.2, 24.8, "sound · a soft tonal swell"],
  ["cue6", 25.2, 29.4, "sound · the tone fades into water ambience"],
];

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function fmt(value: Value): string {
  if (typeof value === "string") return value;
  return typeof value === "number" ? n(value, 4) : `(${n(value[0], 4)}, ${n(value[1], 4)})`;
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

/** One keyframe track over the whole programme, padded with holds to 0s and 30s. */
function track(target: string, keys: Key[]): string {
  const ordered = keys.map(([t, v, ease]) => ({ t: ms(t), v, ease })).sort((a, b) => a.t - b.t);
  if (ordered[0]!.t > 0) ordered.unshift({ t: 0, v: ordered[0]!.v, ease: "hold" });
  if (ordered[ordered.length - 1]!.t < DURATION) ordered.push({ t: DURATION, v: ordered[ordered.length - 1]!.v, ease: undefined });
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    const key = ordered[index]!;
    const pct = percent(Math.max(0, Math.min(DURATION, key.t)), previous);
    previous = pct.value;
    const ease = key.ease && index < ordered.length - 1 ? ` ease ${key.ease}` : "";
    lines.push(`  ${pct.text} ${fmt(key.v)}${ease};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function step(target: string, at: number, value: boolean): string {
  return `step ${target}.visible { at ${ms(at)}ms; value ${value}; };`;
}

// ---------------------------------------------------------------------------
// Contours. A contour is a start point and four cubic segments, closed.
// Anchors are A0 right, A1 bottom, A2 left, A3 top in the node's own frame.
// Every key of one path track keeps this order so the morph never folds.

type Seg = { c1: Pt; c2: Pt; p: Pt };
type Contour = { start: Pt; segs: Seg[] };

function circleContour(cx: number, cy: number, a: number, b = a): Contour {
  const k = KAPPA;
  return {
    start: { x: cx + a, y: cy },
    segs: [
      { c1: { x: cx + a, y: cy + k * b }, c2: { x: cx + k * a, y: cy + b }, p: { x: cx, y: cy + b } },
      { c1: { x: cx - k * a, y: cy + b }, c2: { x: cx - a, y: cy + k * b }, p: { x: cx - a, y: cy } },
      { c1: { x: cx - a, y: cy - k * b }, c2: { x: cx - k * a, y: cy - b }, p: { x: cx, y: cy - b } },
      { c1: { x: cx + k * a, y: cy - b }, c2: { x: cx + a, y: cy - k * b }, p: { x: cx + a, y: cy } },
    ],
  };
}

function lerpPt(a: Pt, b: Pt, u: number): Pt {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function lerpContour(a: Contour, b: Contour, u: number): Contour {
  return {
    start: lerpPt(a.start, b.start, u),
    segs: a.segs.map((seg, index) => {
      const other = b.segs[index]!;
      return { c1: lerpPt(seg.c1, other.c1, u), c2: lerpPt(seg.c2, other.c2, u), p: lerpPt(seg.p, other.p, u) };
    }),
  };
}

function mapContour(contour: Contour, f: (p: Pt) => Pt): Contour {
  return { start: f(contour.start), segs: contour.segs.map((seg) => ({ c1: f(seg.c1), c2: f(seg.c2), p: f(seg.p) })) };
}

/**
 * A point-down drop centred on (cx, cy). `sharp` blends a circle (0) into the
 * full drop (1); `stretch` lengthens the lower half and narrows the body.
 */
function dropContour(cx: number, cy: number, r: number, sharp = 1, stretch = 0): Contour {
  const circle = circleContour(0, 0, r);
  const tip = { x: 0, y: 2 * r };
  const full: Contour = {
    start: circle.start,
    segs: [
      { c1: { x: r, y: 0.72 * r }, c2: { x: 0.3 * r, y: 1.45 * r }, p: tip },
      { c1: { x: -0.3 * r, y: 1.45 * r }, c2: { x: -r, y: 0.72 * r }, p: { x: -r, y: 0 } },
      circle.segs[2]!,
      circle.segs[3]!,
    ],
  };
  const shaped = lerpContour(circle, full, sharp);
  return mapContour(shaped, (p) => ({
    x: cx + p.x * (1 - 0.4 * stretch),
    y: cy + (p.y > 0 ? p.y * (1 + stretch) : p.y),
  }));
}

/** Rotate a contour half a turn about its centre and restart it at the right anchor. */
function pointUp(contour: Contour, cx: number, cy: number): Contour {
  const flipped = mapContour(contour, (p) => ({ x: 2 * cx - p.x, y: 2 * cy - p.y }));
  const segs = [...flipped.segs.slice(2), ...flipped.segs.slice(0, 2)];
  return { start: flipped.segs[1]!.p, segs };
}

function pointContour(at: Pt): Contour {
  return circleContour(at.x, at.y, 0);
}

function contourText(contour: Contour): string {
  const p = (pt: Pt) => `(${n(pt.x)}, ${n(pt.y)})`;
  return `move ${p(contour.start)}; ${contour.segs.map((seg) => `cubic ${p(seg.c1)} ${p(seg.c2)} ${p(seg.p)};`).join(" ")} close;`;
}

function ringValue(outer: Contour, inner: Contour): string {
  return `path { ${contourText(outer)} ${contourText(inner)} }`;
}

/** Point on a contour at segment index and parameter. */
function contourPoint(contour: Contour, segment: number, u: number): Pt {
  const from = segment === 0 ? contour.start : contour.segs[segment - 1]!.p;
  const seg = contour.segs[segment]!;
  const m = 1 - u;
  return {
    x: m * m * m * from.x + 3 * m * m * u * seg.c1.x + 3 * m * u * u * seg.c2.x + u * u * u * seg.p.x,
    y: m * m * m * from.y + 3 * m * m * u * seg.c1.y + 3 * m * u * u * seg.c2.y + u * u * u * seg.p.y,
  };
}

/** Clock angle in degrees, clockwise from twelve. */
function dir(angle: number): Pt {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}

function at(angle: number, radius: number): Pt {
  const d = dir(angle);
  return { x: d.x * radius, y: d.y * radius };
}

function seg2(from: Pt, to: Pt): string {
  return `path { move (${n(from.x)}, ${n(from.y)}); line (${n(to.x)}, ${n(to.y)}); }`;
}

function quad(from: Pt, ctrl: Pt, to: Pt): string {
  return `path { move (${n(from.x)}, ${n(from.y)}); quadratic (${n(ctrl.x)}, ${n(ctrl.y)}) (${n(to.x)}, ${n(to.y)}); }`;
}

function pathBody(value: string): string {
  return value.replace(/^path \{ /, "").replace(/ \}$/, "");
}

// ---------------------------------------------------------------------------
// The fall. Tip, centre and stretch are all affine in the distance fallen, so a
// path key at each end of a segment, eased by the time-to-distance curve, is
// exact at every frame between them.

function fallTip(tau: number): number {
  return DROP_TOP_TIP + G2 * tau * tau;
}

function fallStretch(tau: number): number {
  return STRETCH * ((fallTip(tau) - DROP_TOP_TIP) / -DROP_TOP_TIP);
}

/** The falling drop as drawn on screen, in pond coordinates (pond centre at origin). */
function fallingDrop(tau: number): { contour: Contour; centre: Pt } {
  const s = fallStretch(tau);
  const cy = fallTip(tau) - 2 * DROP_R * (1 + s);
  return { contour: dropContour(0, cy, DROP_R, 1, s), centre: { x: 0, y: cy } };
}

// ---------------------------------------------------------------------------

/** Body (form centre) world position over the film. */
const END_CENTRE_Y = fallingDrop(2).centre.y;
const REST_CENTRE_Y = fallingDrop(0).centre.y;

const BODY_X: Key[] = [
  [0, 0, "hold"],
  [15, 0, "easeInOut"],
  [18.2, TRAVEL, "hold"],
];
const BODY_Y: Key[] = [
  [0, 0, "hold"],
  [18.0, 0, "easeInOut"],
  [18.9, DIP_Y, "easeIn"],
  [19.9, -15, "linear"],
  [22.4, -190, "easeOut"],
  [23.4, SUN_TOP_Y, "hold"],
  [25.0, SUN_TOP_Y, "easeInOut"],
  [26.6, REST_CENTRE_Y, "hold"],
  [28.0, REST_CENTRE_Y, "easeIn"],
  [30.0, END_CENTRE_Y],
];

function sampleKeys(keys: Key[], time: number): number {
  const list = keys.map(([t, v, e]) => ({ t, v: v as number, e }));
  if (time <= list[0]!.t) return list[0]!.v;
  for (let index = 0; index < list.length - 1; index += 1) {
    const a = list[index]!;
    const b = list[index + 1]!;
    if (time > b.t) continue;
    const u = (time - a.t) / (b.t - a.t);
    const e = a.e ?? "linear";
    const eased = e === "hold" ? 0 : e === "linear" || e === "easeIn" || e === "easeOut" || e === "easeInOut" ? applyEasing(e, u) : u;
    return a.v + (b.v - a.v) * eased;
  }
  return list[list.length - 1]!.v;
}

/** Camera x tracks the wheel with a short lag, from the bicycle framing to the wheel. */
function cameraX(): Key[] {
  const keys: Key[] = [
    [0, OPENING.x, "hold"],
    [5, OPENING.x, "easeInOut"],
    [9.5, 0, "hold"],
    [10, 0, "easeInOut"],
    [13.8, -185, "hold"],
  ];
  for (let t = 15; t <= 18.75; t += 0.25) {
    const u = Math.min(1, (t - 15) / 3.75);
    const lagged = sampleKeys(BODY_X, t - 0.15);
    keys.push([t, lagged - 185 * (1 - applyEasing("easeInOut", u)), t === 18.75 ? "hold" : "linear"]);
  }
  keys.push([25, TRAVEL, "easeInOut"], [28, TRAVEL + OPENING.x, "hold"]);
  return keys;
}

const CAMERA_Y: Key[] = [
  [0, OPENING.y, "hold"],
  [5, OPENING.y, "easeInOut"],
  [9.5, 0, "hold"],
  [10, 0, "easeInOut"],
  [13.8, -40, "hold"],
  [15.5, -40, "easeInOut"],
  [18.75, -80, "hold"],
  [25, -80, "easeInOut"],
  [28, OPENING.y, "hold"],
];

const CAMERA_ZOOM: Key[] = [
  [0, OPENING.zoom, "hold"],
  [5, OPENING.zoom, "easeInOut"],
  [9.5, 1.3, "hold"],
  [10, 1.3, "easeInOut"],
  [13.8, 0.92, "hold"],
  [15.5, 0.92, "easeInOut"],
  [18.75, 0.9, "hold"],
  [25, 0.9, "easeInOut"],
  [28, OPENING.zoom, "hold"],
];

// ---------------------------------------------------------------------------

/** Ring keys in the ring's own frame (body origin, turn rotation applied on top). */
function ringKeys(): Key[] {
  const ORIGIN = { x: 0, y: 0 };
  const start = fallingDrop(2);
  const impact = fallingDrop(FALL_TOTAL);
  const oval = { x: 0, y: -7 };
  const circle = (r: { outer: number; inner: number }) => ringValue(circleContour(0, 0, r.outer), circleContour(0, 0, r.inner));
  const sunCircle = circleContour(0, 0, TYRE.outer);
  const rounded = pointUp(dropContour(0, 0, TYRE.outer, 0.22, 0), 0, 0);
  const restUp = pointUp(dropContour(0, 0, DROP_R, 1, 0), 0, 0);
  /** At 30s the body sits on the falling centre and is turned half a turn. */
  const endLocal = pointUp(dropContour(0, 0, DROP_R, 1, fallStretch(2)), 0, 0);
  return [
    [0, ringValue(start.contour, pointContour(start.centre)), FALL_EASE_2],
    [1.5, ringValue(impact.contour, pointContour(impact.centre)), "easeOut"],
    [1.75, ringValue(circleContour(oval.x, oval.y, 34, 9), pointContour(oval)), "easeOut"],
    [2.15, ringValue(circleContour(0, 0, 60, 17), pointContour(ORIGIN)), "easeOut"],
    [4.6, ringValue(circleContour(0, 0, 150, 40), circleContour(0, 0, 147, 37.6)), "easeInOut"],
    [7.5, circle(RIM), "hold"],
    [11.5, circle(RIM), "easeInOut"],
    [12.4, circle(TYRE), "hold"],
    [18.0, circle(TYRE), "easeInOut"],
    [18.6, ringValue(sunCircle, pointContour(ORIGIN)), "hold"],
    [24.0, ringValue(sunCircle, pointContour(ORIGIN)), "easeInOut"],
    [25.0, ringValue(rounded, pointContour(ORIGIN)), "easeInOut"],
    [26.6, ringValue(restUp, pointContour(ORIGIN)), "hold"],
    [28.0, ringValue(restUp, pointContour(ORIGIN)), "easeIn"],
    [30.0, ringValue(endLocal, pointContour(ORIGIN))],
  ];
}

/** Ring outer contour at the ray key times, for anchoring rays on the outline. */
function sunOutline(time: 24 | 25 | 26.6): Contour {
  if (time === 24) return circleContour(0, 0, TYRE.outer);
  if (time === 25) return pointUp(dropContour(0, 0, TYRE.outer, 0.22, 0), 0, 0);
  return pointUp(dropContour(0, 0, DROP_R, 1, 0), 0, 0);
}

function rebound(w: number, h: number): string {
  return `path { move (${n(-w)}, 0); cubic (${n(-w)}, ${n(-h * 0.55)}) (${n(-w * 0.5)}, ${n(-h)}) (0, ${n(-h)}); cubic (${n(w * 0.5)}, ${n(-h)}) (${n(w)}, ${n(-h * 0.55)}) (${n(w)}, 0); close; }`;
}

/** A hand: tip, a bend control, and the centre. Pond halves start here. */
function handKeys(side: -1 | 1, finalAngle: number, finalLength: number): Key[] {
  const startAngle = side < 0 ? 270 : 90;
  const pond = (x: number) => quad({ x, y: 0 }, { x: x / 2, y: 0 }, { x: 0, y: 0 });
  const mid = (startAngle + finalAngle) / 2;
  const midLength = (R + finalLength) / 2;
  const tipMid = at(mid, midLength);
  /** The bend lags the tip: the control sits behind the direction of turn. */
  const lag = at(startAngle + (finalAngle - startAngle) * 0.15, midLength * 0.5);
  const finalTip = at(finalAngle, finalLength);
  const spokeTip = at(finalAngle, RIM.inner - 1);
  const inner = at(finalAngle, 4);
  return [
    [0, pond(side * POND_HALF), "hold"],
    [5.0, pond(side * POND_HALF), "easeInOut"],
    [7.5, pond(side * R), "easeIn"],
    [8.3, quad(tipMid, lag, { x: 0, y: 0 }), "easeOut"],
    [9.0, quad(finalTip, lerpPt(finalTip, { x: 0, y: 0 }, 0.5), { x: 0, y: 0 }), "hold"],
    [11.0, quad(finalTip, lerpPt(finalTip, { x: 0, y: 0 }, 0.5), { x: 0, y: 0 }), "easeInOut"],
    [11.9, quad(spokeTip, lerpPt(spokeTip, { x: 0, y: 0 }, 0.5), { x: 0, y: 0 }), "hold"],
    [16.6, quad(spokeTip, lerpPt(spokeTip, { x: 0, y: 0 }, 0.5), { x: 0, y: 0 }), "easeIn"],
    [17.5, quad(inner, lerpPt(inner, { x: 0, y: 0 }, 0.5), { x: 0, y: 0 }), "hold"],
  ];
}

/** Hub radius over the film, as scale of a 10-unit circle. */
const HUB_SCALE: Key[] = [
  [0, 0, "hold"],
  [8.6, 0, "easeOut"],
  [9.0, 0.6, "hold"],
  [11.4, 0.6, "easeInOut"],
  [12.4, 1.4, "hold"],
  [16.6, 1.4, "easeIn"],
  [18.0, (TYRE.inner + 3) / HUB_BASE, "hold"],
];

function tickKeys(index: number): Key[] {
  const angle = index * 30;
  const major = index % 3 === 0;
  const outer = at(angle, RIM.inner);
  const grow = 7.6 + index * 0.1;
  const spoke = 11.2 + index * 0.06;
  const hubAt = (t: number) => HUB_BASE * sampleKeys(HUB_SCALE, t);
  const shrinkEnd = 17.5;
  const inside = Math.min(6, hubAt(shrinkEnd) * 0.5);
  return [
    [0, seg2(outer, outer), "hold"],
    [grow, seg2(outer, outer), "easeOut"],
    [grow + 0.6, seg2(outer, at(angle, major ? 118 : 126)), "hold"],
    [spoke, seg2(outer, at(angle, major ? 118 : 126)), "easeInOut"],
    [spoke + 0.6, seg2(outer, at(angle, 0)), "hold"],
    [16.6, seg2(outer, at(angle, 0)), "easeIn"],
    [shrinkEnd, seg2(at(angle, inside), at(angle, 0)), "hold"],
  ];
}

/** Rays sit on fixed points of the outline so they ride its morph exactly. */
const RAY_ANCHORS: [number, number][] = [
  [3, 0], [3, 0.36], [3, 0.68], [0, 0], [0, 0.36], [0, 0.68],
  [1, 0], [1, 0.36], [1, 0.68], [2, 0], [2, 0.36], [2, 0.68],
];

function rayKeys(index: number): Key[] {
  const [segment, u] = RAY_ANCHORS[index]!;
  const point = (time: 24 | 25 | 26.6) => contourPoint(sunOutline(time), segment, u);
  const base = point(24);
  const outward = { x: base.x / TYRE.outer, y: base.y / TYRE.outer };
  const ray = (anchor: Pt, gap: number, length: number, lift: number) => {
    const from = { x: anchor.x + outward.x * gap, y: anchor.y + outward.y * gap };
    const to = { x: anchor.x + outward.x * (gap + length), y: anchor.y + outward.y * (gap + length) - lift };
    const ctrl = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - lift * 1.4 };
    return quad(from, ctrl, to);
  };
  const begin = 21.0 + index * 0.06;
  return [
    [0, ray(base, 12, 0, 0), "hold"],
    [begin, ray(base, 12, 0, 0), "easeOut"],
    [begin + 0.9, ray(base, 12, 30, 0), "hold"],
    [23.0, ray(base, 12, 30, 0), "easeInOut"],
    [24.0, ray(base, 12, 30, 4), "easeInOut"],
    [25.0, ray(point(25), 12, 30, 9), "easeInOut"],
    [26.6, ray(point(26.6), 0, 0, 0), "hold"],
  ];
}

// Bicycle strokes all start at the front hub, so they grow out of it and retract into it.
function arcPath(centre: Pt, radius: number, fromAngle: number, sweep: number, parts: number): string[] {
  const out: string[] = [];
  const step = sweep / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  for (let index = 0; index < parts; index += 1) {
    const a0 = fromAngle + step * index;
    const a1 = a0 + step;
    const p0 = { x: centre.x + radius * Math.cos(a0), y: centre.y + radius * Math.sin(a0) };
    const p1 = { x: centre.x + radius * Math.cos(a1), y: centre.y + radius * Math.sin(a1) };
    const c1 = { x: p0.x - k * radius * Math.sin(a0), y: p0.y + k * radius * Math.cos(a0) };
    const c2 = { x: p1.x + k * radius * Math.sin(a1), y: p1.y - k * radius * Math.cos(a1) };
    out.push(`cubic (${n(c1.x)}, ${n(c1.y)}) (${n(c2.x)}, ${n(c2.y)}) (${n(p1.x)}, ${n(p1.y)});`);
  }
  return out;
}

const REAR_RADIUS = RIM.outer - 2;
const STAY = (() => {
  const dx = SEAT.x - REAR.x;
  const dy = SEAT.y - REAR.y;
  const length = Math.hypot(dx, dy);
  return { x: REAR.x + (dx / length) * REAR_RADIUS, y: REAR.y + (dy / length) * REAR_RADIUS, angle: Math.atan2(dy, dx) };
})();

function line(points: Pt[]): string {
  return points.map((p, index) => `${index === 0 ? "move" : "line"} (${n(p.x)}, ${n(p.y)});`).join(" ");
}

const BIKE: { id: string; d: string; grow: [number, number]; retract: [number, number] }[] = [
  {
    id: "bars",
    d: `${line([{ x: 0, y: 0 }, HEAD_LOW, HEAD_TOP, { x: -50, y: -222 }])} quadratic (-5, -226) (-18, -196);`,
    grow: [12.5, 13.3],
    retract: [15.5, 16.3],
  },
  { id: "chain", d: line([{ x: 0, y: 0 }, HEAD_LOW, CRANK, REAR]), grow: [12.6, 13.5], retract: [15.6, 16.6] },
  {
    id: "seatTube",
    d: line([{ x: 0, y: 0 }, HEAD_LOW, CRANK, SEAT, POST, { x: -292, y: -212 }, { x: -234, y: -215 }]),
    grow: [12.8, 13.7],
    retract: [15.6, 16.5],
  },
  {
    id: "loop",
    d: `${line([{ x: 0, y: 0 }, HEAD_LOW, HEAD_TOP, SEAT, STAY])} ${arcPath(REAR, REAR_RADIUS, STAY.angle, -2 * Math.PI, 8).join(" ")}`,
    grow: [12.7, 14.0],
    retract: [15.6, 17.3],
  },
];

function text(name: string, x: number, y: number, content: string, size: number, fill: string, extra = ""): string {
  return `text ${name} { position (${n(x)}, ${n(y)}); content "${content}"; fontFamily "sans"; fontSize ${size}; fontWeight 400; fontStyle italic; align center; baseline middle; fill ${fill}; ${extra}};`;
}

function program(): string {
  const motion: string[] = [];

  motion.push(track("body.position.x", BODY_X));
  motion.push(track("body.position.y", BODY_Y));
  motion.push(
    track("body.turn.rotation", [
      [0, "0deg", "hold"],
      [15, "0deg", "easeInOut"],
      [18.2, `${360 * SPIN_TURNS}deg`, "hold"],
      [27.0, `${360 * SPIN_TURNS}deg`, "easeInOut"],
      [28.0, `${360 * SPIN_TURNS + 180}deg`, "hold"],
    ]),
  );
  motion.push(track("body.turn.ring.commands", ringKeys()));

  // [0–5s] Rebound: a column that rises from the centre and settles. Never detached.
  motion.push(step("body.turn.splash", 1.9, true));
  motion.push(step("body.turn.splash", 3.35, false));
  motion.push(track("body.turn.splash.commands", [[0, rebound(0, 0), "hold"], [1.9, rebound(0, 0), "easeOut"], [2.45, rebound(7, 34), "easeInOut"], [3.3, rebound(0, 0), "hold"]]));

  // [5–10s] Pond halves become the hands; ticks grow in from the rim.
  motion.push(track("body.turn.hands.pondL.commands", handKeys(-1, CLOCK.hour, CLOCK.hourLength)));
  motion.push(track("body.turn.hands.pondR.commands", handKeys(1, CLOCK.minute, CLOCK.minuteLength)));
  motion.push(step("body.turn.hands", 18.7, false));
  motion.push(track("body.turn.hands.rotation", [[0, "0deg", "hold"], [10.0, "0deg", "easeInOut"], [11.4, `${HANDS_SPIN}deg`, "hold"]]));
  for (let index = 0; index < 12; index += 1) {
    motion.push(step(`body.turn.ticks.t${index}`, 7.6 + index * 0.1, true));
    motion.push(step(`body.turn.ticks.t${index}`, 18.7, false));
    motion.push(track(`body.turn.ticks.t${index}.commands`, tickKeys(index)));
  }
  motion.push(step("body.turn.hub", 8.6, true));
  motion.push(step("body.turn.hub", 18.7, false));
  motion.push(track("body.turn.hub.scale", HUB_SCALE.map(([t, v, e]) => [t, [v as number, v as number], e] as Key)));

  // [10–15s] Tyre and the finer inner rim; the bicycle grows out of the hub.
  motion.push(step("body.turn.innerRim", 11.6, true));
  motion.push(step("body.turn.innerRim", 18.7, false));
  motion.push(
    track("body.turn.innerRim.commands", [
      [0, `path { ${contourText(circleContour(0, 0, RIM.inner))} }`, "hold"],
      [11.6, `path { ${contourText(circleContour(0, 0, RIM.inner))} }`, "easeInOut"],
      [12.4, `path { ${contourText(circleContour(0, 0, INNER_RIM))} }`, "hold"],
    ]),
  );
  for (const part of BIKE) {
    motion.push(
      track(`body.bike.${part.id}.trim.end`, [
        [0, 0, "hold"],
        [part.grow[0], 0, "easeInOut"],
        [part.grow[1], 1, "hold"],
        [part.retract[0], 1, "easeInOut"],
        [part.retract[1], 0, "hold"],
      ]),
    );
  }

  // [15–20s] Horizon draws across; the ground plate hides what is below it.
  motion.push(step("horizon", 17.0, true));
  motion.push(step("ground", 17.0, true));
  motion.push(step("ground", 25.0, false));
  motion.push(track("horizon.trim.end", [[0, 0, "hold"], [17.0, 0, "easeInOut"], [18.6, 1, "hold"]]));
  motion.push(track("ground.scale.x", [[0, 0, "hold"], [17.0, 0, "easeInOut"], [18.6, 1, "hold"]]));
  const wide = seg2({ x: TRAVEL - 1200, y: HORIZON_Y }, { x: TRAVEL + 1200, y: HORIZON_Y });
  const pond = seg2({ x: TRAVEL - POND_HALF, y: 0 }, { x: TRAVEL + POND_HALF, y: 0 });
  motion.push(track("horizon.commands", [[0, wide, "hold"], [25.0, wide, "easeInOut"], [28.0, pond, "hold"]]));

  // [20–25s] Rays, then [25–30s] they retract into the changing outline.
  for (let index = 0; index < 12; index += 1) {
    motion.push(step(`body.rays.r${index}`, 21.0 + index * 0.06, true));
    motion.push(step(`body.rays.r${index}`, 26.6, false));
    motion.push(track(`body.rays.r${index}.commands`, rayKeys(index)));
  }

  for (const [id, show, hide] of CAPTIONS) {
    motion.push(track(`cues.${id}.opacity`, [[0, 0, "hold"], [show, 0, "easeOut"], [show + 0.35, 1, "hold"], [hide - 0.35, 1, "easeIn"], [hide, 0, "hold"]]));
  }

  motion.push(track("camera(main).position.x", cameraX()));
  motion.push(track("camera(main).position.y", CAMERA_Y));
  motion.push(track("camera(main).zoom", CAMERA_ZOOM));

  const ticks = Array.from({ length: 12 }, (_, index) => {
    const outer = at(index * 30, RIM.inner);
    return `path t${index} { ${pathBody(seg2(outer, outer))} stroke ${INK} width 2.5 cap butt; visible false; };`;
  }).join("\n      ");
  const rays = Array.from({ length: 12 }, (_, index) => `path r${index} { move (0, 0); quadratic (0, 0) (0, 0); stroke ${INK} width 3 cap round; visible false; };`).join("\n    ");
  const bike = BIKE.map((part) => `path ${part.id} { ${part.d} stroke ${INK} width 4 cap round join round; };`).join("\n    ");
  const start = fallingDrop(2);
  const cues = CAPTIONS.map(([id, , , words]) => text(id, 640, 688, words, 15, CUE, "opacity 0; ")).join("\n  ");

  return `// A CIRCLE IN MOTION
// 30 seconds, looping. Black on warm white. One closed outline carries the film:
// drop → oblique ripple → clock rim → bicycle tyre → sun → drop.
// 0:00 the drop falls, strikes the pond and spreads into a ripple.
// 0:05 the ripple faces the viewer; the pond halves bend into hands at ten past ten.
// 0:10 hands and ticks become spokes; the rim thickens into a tyre; a bicycle grows from the hub.
// 0:15 the bicycle rolls right and withdraws into the wheel; the hub swallows the spokes; a sun dips and rises.
// 0:20 the sun rises clear and grows short rays. 0:25 the rays withdraw and the sun narrows into the drop.
// Sound is a screen caption; MotionScript has no audio.
// The ring is an even-odd pair of contours: the inner one collapsed is a solid drop or sun, opened it is an outline.
scene "a-circle-in-motion" {
  version "0.2";
  viewport (1280, 720);
  background ${BG};
  duration 30s;
  requires "easing.hold";
  requires "easing.cubicBezier";
  requires "geometry.pathMorph";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (${OPENING.x}, ${OPENING.y});
  zoom ${OPENING.zoom};
  rotation 0deg;
};
group body {
  zIndex 2;
  group turn {
    path ring { ${pathBody(ringValue(start.contour, pointContour(start.centre)))} fillRule evenodd; fill ${INK}; zIndex 1; };
    path splash { ${pathBody(rebound(0, 0))} fill ${INK}; zIndex 1; visible false; };
    group ticks {
      zIndex 2;
      ${ticks}
    };
    path innerRim { ${contourText(circleContour(0, 0, RIM.inner))} stroke ${INK} width 1.6; zIndex 2; visible false; };
    group hands {
      zIndex 3;
      path pondL { ${pathBody(quad({ x: -POND_HALF, y: 0 }, { x: -POND_HALF / 2, y: 0 }, { x: 0, y: 0 }))} stroke ${INK} width 3 cap round; };
      path pondR { ${pathBody(quad({ x: POND_HALF, y: 0 }, { x: POND_HALF / 2, y: 0 }, { x: 0, y: 0 }))} stroke ${INK} width 3 cap round; };
    };
    circle hub { radius ${HUB_BASE}; fill ${INK}; scale (0, 0); zIndex 4; visible false; };
  };
  group bike {
    zIndex 3;
    ${bike}
  };
  group rays {
    zIndex 3;
    ${rays}
  };
};
rectangle ground { position (${TRAVEL - 1200}, ${HORIZON_Y}); size (2400, 600); fill ${BG}; scale (0, 1); zIndex 5; visible false; };
path horizon { ${pathBody(wide)} stroke ${INK} width 3 cap round; zIndex 6; visible false; };
group cues {
  space screen;
  zIndex 20;
  ${cues}
};
${BIKE.map((part) => `operators body.bike.${part.id} { trim 0, 0, 0; };`).join("\n")}
operators horizon { trim 0, 0, 0; };
${motion.join("\n")}
complete;
`;
}

// ---------------------------------------------------------------------------
// Checks on evaluated draw items.

function flatten(commands: readonly PathCommand[], steps = 12): Pt[][] {
  const out: Pt[][] = [];
  let current: Pt[] = [];
  let cursor = { x: 0, y: 0 };
  let first = { x: 0, y: 0 };
  for (const command of commands) {
    if (command.cmd === "M") {
      if (current.length > 0) out.push(current);
      cursor = { x: command.x, y: command.y };
      first = cursor;
      current = [cursor];
    } else if (command.cmd === "L") {
      cursor = { x: command.x, y: command.y };
      current.push(cursor);
    } else if (command.cmd === "Q") {
      const from = cursor;
      for (let s = 1; s <= steps; s += 1) {
        const u = s / steps;
        const m = 1 - u;
        current.push({ x: m * m * from.x + 2 * m * u * command.cx + u * u * command.x, y: m * m * from.y + 2 * m * u * command.cy + u * u * command.y });
      }
      cursor = { x: command.x, y: command.y };
    } else if (command.cmd === "C") {
      const from = cursor;
      for (let s = 1; s <= steps; s += 1) {
        const u = s / steps;
        const m = 1 - u;
        current.push({
          x: m * m * m * from.x + 3 * m * m * u * command.c1x + 3 * m * u * u * command.c2x + u * u * u * command.x,
          y: m * m * m * from.y + 3 * m * m * u * command.c1y + 3 * m * u * u * command.c2y + u * u * u * command.y,
        });
      }
      cursor = { x: command.x, y: command.y };
    } else if (command.cmd === "Z") {
      current.push(first);
      cursor = first;
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}

type Box = { x0: number; y0: number; x1: number; y1: number; w: number; h: number; cx: number; cy: number };

function box(points: Pt[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function find(items: readonly ResolvedDrawItem[], id: string): ResolvedDrawItem | undefined {
  return items.find((entry) => entry.nodeId === id);
}

/** Screen-space subpaths of a drawn path, or the box of a drawn circle. */
function screenParts(items: readonly ResolvedDrawItem[], id: string): Pt[][] {
  const item = find(items, id);
  if (!item || item.opacity <= 0.004) return [];
  const g = item.geometry;
  if (g.kind === "path") return flatten(g.commands).map((part) => part.map((p) => transformPoint(item.logicalMatrix, p.x, p.y)));
  if (g.kind === "circle") {
    const ring: Pt[] = [];
    for (let s = 0; s < 32; s += 1) {
      const a = (s / 32) * Math.PI * 2;
      ring.push(transformPoint(item.logicalMatrix, Math.cos(a) * g.radius, Math.sin(a) * g.radius));
    }
    return [ring];
  }
  if (g.kind === "rectangle") {
    return [[transformPoint(item.logicalMatrix, 0, 0), transformPoint(item.logicalMatrix, g.size.x, g.size.y)]];
  }
  return [[transformPoint(item.logicalMatrix, 0, 0)]];
}

function drawn(items: readonly ResolvedDrawItem[], id: string): boolean {
  const parts = screenParts(items, id);
  if (parts.length === 0) return false;
  const b = box(parts.flat());
  return b.w > 0.5 || b.h > 0.5;
}

/** Inside the frame and above the caption band. */
function onScreen(b: Box, pad = 12): boolean {
  return b.x0 >= pad && b.x1 <= 1280 - pad && b.y0 >= pad && b.y1 <= 660;
}

function polyLength(points: Pt[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y);
  return total;
}

/** Clock angle on screen (clockwise from up) from a centre to a point. */
function screenAngle(centre: Pt, point: Pt): number {
  const deg = (Math.atan2(point.x - centre.x, centre.y - point.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function angleGap(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined) return "none";
  return cssColor(color as SolidColor);
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.004) return "";
  const m = item.logicalMatrix;
  const transform = `transform="matrix(${m[0]} ${m[1]} ${m[3]} ${m[4]} ${m[6]} ${m[7]})"`;
  const fill = item.appearance.fill?.type === "solid" ? cssPaint(item.appearance.fill) : "none";
  const stroke = item.appearance.stroke;
  const strokePaint = stroke ? cssPaint(stroke.color.type === "solid" ? stroke.color : undefined) : "none";
  const paint = `fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? stroke.width : 0}" opacity="${item.opacity.toFixed(3)}"`;
  const g = item.geometry;
  if (g.kind === "circle") return `<circle cx="0" cy="0" r="${g.radius}" ${transform} ${paint}/>`;
  if (g.kind === "rectangle") return `<rect width="${g.size.x}" height="${g.size.y}" ${transform} ${paint}/>`;
  if (g.kind === "path") {
    const d = g.commands
      .map((c) => (c.cmd === "M" ? `M ${c.x} ${c.y}` : c.cmd === "L" ? `L ${c.x} ${c.y}` : c.cmd === "Q" ? `Q ${c.cx} ${c.cy} ${c.x} ${c.y}` : c.cmd === "C" ? `C ${c.c1x} ${c.c1y} ${c.c2x} ${c.c2y} ${c.x} ${c.y}` : "Z"))
      .join(" ");
    return `<path d="${d}" fill-rule="${g.fillRule ?? "nonzero"}" ${transform} ${paint} stroke-linecap="${stroke?.cap ?? "butt"}" stroke-linejoin="round"/>`;
  }
  if (g.kind === "text") {
    return `<text ${transform} fill="${fill}" opacity="${item.opacity.toFixed(3)}" font-family="sans-serif" font-style="italic" font-size="${g.font.size}" text-anchor="middle" dominant-baseline="middle">${g.content}</text>`;
  }
  return "";
}

function main(): void {
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "a-circle-in-motion.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source);
  console.log(`wrote ${outPath} (${bytes} bytes, ${((bytes / DEFAULT_LIMITS.maxSourceBytes) * 100).toFixed(1)}% of maxSourceBytes)`);
  if (bytes > DEFAULT_LIMITS.maxSourceBytes) {
    console.error(`Source is ${bytes} bytes, over maxSourceBytes ${DEFAULT_LIMITS.maxSourceBytes}.`);
    process.exit(1);
  }
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene || compiled.diagnostics.length > 0) {
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
    `nodes ${scene.nodes.length}/${DEFAULT_LIMITS.maxNodes}  tracks ${scene.timeline.tracks.length}/${DEFAULT_LIMITS.maxTracks}  steps ${steps}/${DEFAULT_LIMITS.maxSteps}  compile ${compileMs.toFixed(0)} ms`,
  );
  const runtime = new AnimationRuntime(scene);
  const frame = (seconds: number) => runtime.evaluate(Math.min(DURATION - 1, ms(seconds))).drawItems;
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;
  const outer = (items: readonly ResolvedDrawItem[]) => box(screenParts(items, "body.turn.ring")[0] ?? [{ x: NaN, y: NaN }]);
  const inner = (items: readonly ResolvedDrawItem[]) => box(screenParts(items, "body.turn.ring")[1] ?? [{ x: NaN, y: NaN }]);
  const pondY = (items: readonly ResolvedDrawItem[]) => box(screenParts(items, "body.turn.hands.pondL").flat()).cy;

  // Everything black stays in frame and above the cue band. The horizon and plate run off frame by design.
  const sampled: number[] = [];
  for (let t = 0; t < 30; t += 0.25) sampled.push(t);
  for (const t of sampled) {
    const items = frame(t);
    for (const item of items) {
      if (item.nodeId === "horizon" || item.nodeId === "ground" || item.nodeId.startsWith("cues.")) continue;
      if (!drawn(items, item.nodeId)) continue;
      const b = box(screenParts(items, item.nodeId).flat());
      if (!onScreen(b, 4)) problems.push(`${item.nodeId} leaves the frame or enters the cue band at ${t}s (${b.x0.toFixed(0)},${b.y0.toFixed(0)})–(${b.x1.toFixed(0)},${b.y1.toFixed(0)}).`);
    }
    const cues = CAPTIONS.filter(([id]) => (find(items, `cues.${id}`)?.opacity ?? 0) > 0.05);
    expect(cues.length <= 1, `Two sound cues overlap at ${t}s.`);
  }

  // [0–5s] Drop into ripple.
  const f0 = frame(0);
  const drop0 = outer(f0);
  expect(near(drop0.cx, 640, 1) && drop0.y0 < 300, "The drop does not start in the upper centre.");
  expect(drop0.h > 1.45 * drop0.w, "The opening drop is not a teardrop.");
  const pond0 = pondY(f0);
  const tipAt = (t: number) => outer(frame(t)).y1;
  const fallA = tipAt(0.5) - tipAt(0);
  const fallB = tipAt(1.0) - tipAt(0.5);
  expect(fallB > fallA * 1.2, `The fall does not accelerate (${fallA.toFixed(1)} then ${fallB.toFixed(1)} px).`);
  expect(near(tipAt(1.5), pond0, 0.75), `The tip does not touch the pond at 1.5s (${tipAt(1.5).toFixed(2)} vs ${pond0.toFixed(2)}).`);
  expect(tipAt(1.45) < pond0 - 1, "The drop reaches the pond before 1.5s.");
  expect(outer(frame(1.0)).h / outer(frame(1.0)).w > drop0.h / drop0.w, "The drop does not stretch as it accelerates.");
  const oval = outer(frame(1.75));
  expect(oval.w > 3 * oval.h && near(oval.y1, pond0, 3), "The body does not compress into a shallow oval on the pond.");
  const splash = box(screenParts(frame(2.45), "body.turn.splash").flat());
  expect(splash.h > 25 && near(splash.y1, pond0, 1.5), "The central rebound does not rise from the pond.");
  expect(!drawn(frame(3.4), "body.turn.splash"), "The rebound does not settle.");
  const r3 = outer(frame(3.0));
  const r45 = outer(frame(4.5));
  expect(r45.w > r3.w && r45.w - r3.w < r3.w - outer(frame(2.2)).w, "The ripple does not expand while slowing.");
  const hole = inner(frame(4.6));
  const rip = outer(frame(4.6));
  expect(hole.w > rip.w * 0.95 && rip.h < rip.w * 0.3, "The ripple is not a clear oblique outline by 4.6s.");
  expect(outer(frame(5.0)).h / outer(frame(5.0)).w > rip.h / rip.w + 0.005, "The ripple has not begun tilting toward the viewer by 5s.");

  // [5–10s] Ripple into clock.
  const c75 = frame(7.5);
  const face = outer(c75);
  expect(near(face.w, face.h, 1), `The ripple is not face-on by 7.5s (${face.w.toFixed(1)} × ${face.h.toFixed(1)}).`);
  const left75 = box(screenParts(c75, "body.turn.hands.pondL").flat());
  const right75 = box(screenParts(c75, "body.turn.hands.pondR").flat());
  const zoom75 = face.w / (2 * RIM.outer);
  expect(near(left75.x0, face.cx - R * zoom75, 2) && near(right75.x1, face.cx + R * zoom75, 2), "The pond does not retract to its intersections with the circle.");
  const clockAt = frame(9.5);
  const centre = { x: outer(clockAt).cx, y: outer(clockAt).cy };
  const tip = (items: readonly ResolvedDrawItem[], id: string) => {
    const pts = screenParts(items, id)[0]!;
    return pts[0]!;
  };
  expect(angleGap(screenAngle(centre, tip(clockAt, "body.turn.hands.pondL")), CLOCK.hour) < 3, "The hour hand is not at ten past ten.");
  expect(angleGap(screenAngle(centre, tip(clockAt, "body.turn.hands.pondR")), CLOCK.minute) < 3, "The minute hand is not at ten past ten.");
  const rimInner = inner(clockAt).w / 2;
  for (let index = 0; index < 12; index += 1) {
    const pts = screenParts(clockAt, `body.turn.ticks.t${index}`)[0];
    const length = pts ? polyLength(pts) : 0;
    expect(length > 15 && length < 40, `Tick ${index} is not a short tick at 9.5s (${length.toFixed(1)} px).`);
    if (pts) expect(near(Math.hypot(pts[0]!.x - centre.x, pts[0]!.y - centre.y), rimInner, 1.5), `Tick ${index} does not start at the rim.`);
  }
  expect(drawn(clockAt, "body.turn.hub"), "The hands are not joined at a centre cap.");

  // [10–15s] Clock into bicycle wheel.
  const spun = frame(10.7);
  expect(angleGap(screenAngle(centre, tip(spun, "body.turn.hands.pondR")), CLOCK.minute) > 20, "The hands do not accelerate clockwise after 10s.");
  const w125 = frame(12.5);
  const wheel = outer(w125);
  const hubC = { x: wheel.cx, y: wheel.cy };
  const tyreIn = inner(w125).w / 2;
  for (const id of ["body.turn.hands.pondL", "body.turn.hands.pondR", ...Array.from({ length: 12 }, (_, i) => `body.turn.ticks.t${i}`)]) {
    const pts = screenParts(w125, id)[0]!;
    const radii = pts.map((p) => Math.hypot(p.x - hubC.x, p.y - hubC.y));
    expect(Math.min(...radii) < 16 && Math.max(...radii) >= tyreIn - 0.5, `${id} is not a spoke from hub to rim at 12.5s.`);
  }
  expect(wheel.w - 2 * tyreIn > 20, "The rim has not thickened into a tyre by 12.5s.");
  expect(drawn(w125, "body.turn.innerRim") && box(screenParts(w125, "body.turn.innerRim").flat()).w < 2 * tyreIn - 6, "There is no finer inner rim inside the tyre.");
  const bike = frame(14.5);
  const loop = screenParts(bike, "body.bike.loop")[0]!;
  expect(near(loop[0]!.x, outer(bike).cx, 1) && near(loop[0]!.y, outer(bike).cy, 1), "The frame does not grow from the tracked hub.");
  const rear = box(loop.slice(-60));
  expect(rear.cx < outer(bike).x0, "The second wheel is not on the left.");
  expect(near(rear.w, rear.h, 3) && rear.w > 0.9 * outer(bike).w - 20, "The second wheel outline does not close into a wheel.");
  for (const part of BIKE) expect(drawn(bike, `body.bike.${part.id}`), `Bicycle stroke ${part.id} is missing at 14.5s.`);
  for (const t of [12.4, 14.1]) {
    const b = box([...screenParts(frame(t), "body.bike.loop").flat(), ...screenParts(frame(t), "body.turn.ring").flat()]);
    expect(onScreen(b), `The bicycle is not in frame at ${t}s.`);
  }

  // [15–20s] Wheel into rising sun.
  const roll = frame(16.5);
  const rollSpoke = screenParts(roll, "body.turn.hands.pondR")[0]!;
  const rollC = { x: outer(roll).cx, y: outer(roll).cy };
  const rotated = angleGap(screenAngle(rollC, rollSpoke[0]!), screenAngle(hubC, screenParts(w125, "body.turn.hands.pondR")[0]![0]!));
  expect(rotated > 20 && polyLength(rollSpoke) > 100, "The wheel is not a clear rolling wheel at 16.5s.");
  const travelled = runtime.evaluate(ms(16.5)).drawItems;
  expect(find(travelled, "body.turn.ring") !== undefined, "The wheel vanished while rolling.");
  expect(!drawn(frame(17.4), "body.bike.loop") && !drawn(frame(17.4), "body.bike.chain"), "The frame has not withdrawn by 17.4s.");
  const sun19 = frame(19.0);
  expect(!drawn(sun19, "body.turn.hub") && inner(sun19).w < 0.5, "The sun is not a solid disc by 19s.");
  const horizon19 = box(screenParts(sun19, "horizon").flat());
  const disc19 = outer(sun19);
  expect(disc19.y1 > horizon19.cy + 20 && disc19.y0 < horizon19.cy, "The disc is not partly behind the horizon at 19s.");
  const plate = box(screenParts(sun19, "ground").flat());
  expect(plate.x0 <= disc19.x0 && plate.x1 >= disc19.x1 && near(plate.y0, horizon19.cy, 1), "The ground plate does not hide the disc below the horizon.");
  expect(horizon19.x0 < 0 && horizon19.x1 > 1280 && horizon19.cy > 430, "The horizon does not cross the lower frame.");
  expect(outer(frame(19.6)).cy < outer(frame(19.0)).cy - 2, "The sun does not begin rising immediately.");

  // [20–25s] Sunrise held.
  for (const t of [20, 21, 22, 23]) expect(outer(frame(t + 1)).cy < outer(frame(t)).cy, `The sun does not rise from ${t}s.`);
  const sun235 = frame(23.5);
  expect(outer(sun235).y1 < box(screenParts(sun235, "horizon").flat()).cy - 20, "The sun is not clear of the horizon by 23.5s.");
  for (const t of [20, 22.5, 24.5]) expect(near(outer(frame(t)).cx, 640, 1), `The sun is not centred horizontally at ${t}s.`);
  for (let index = 0; index < 12; index += 1) {
    const ray = screenParts(sun235, `body.rays.r${index}`)[0];
    expect(!!ray && polyLength(ray) > 22, `Ray ${index} is not extended at 23.5s.`);
  }
  const sun24 = outer(frame(24.0));
  const sun249 = outer(frame(24.9));
  expect(sun249.h > sun24.h * 1.04 && near(sun249.y1, sun24.y1, 2), "The sun's upper edge does not draw into a point near 24s.");
  expect(near(box(screenParts(frame(25.0), "horizon").flat()).cy, box(screenParts(frame(22), "horizon").flat()).cy, 0.5), "The horizon moves before 25s.");

  // [25–30s] Sun into drop.
  for (let index = 0; index < 12; index += 1) expect(!drawn(frame(26.7), `body.rays.r${index}`), `Ray ${index} is not absorbed by 26.7s.`);
  const formed = outer(frame(28.0));
  const rest = dropContour(0, 0, DROP_R, 1, 0);
  const restBox = box(flatten([{ cmd: "M", x: rest.start.x, y: rest.start.y }, ...rest.segs.map((s) => ({ cmd: "C" as const, c1x: s.c1.x, c1y: s.c1.y, c2x: s.c2.x, c2y: s.c2.y, x: s.p.x, y: s.p.y }))])[0]!);
  expect(near(formed.w, restBox.w, 0.6) && near(formed.h, restBox.h, 0.6), `The drop at 28s is not the opening size (${formed.w.toFixed(1)} × ${formed.h.toFixed(1)}).`);
  const formedPts = screenParts(frame(28.0), "body.turn.ring")[0]!;
  const lowest = formedPts.reduce((a, b) => (b.y > a.y ? b : a));
  expect(lowest.y - formed.cy > formed.h * 0.4, "The drop's point does not face down by 28s.");
  const pointingUp = screenParts(frame(26.8), "body.turn.ring")[0]!;
  const highest = pointingUp.reduce((a, b) => (b.y < a.y ? b : a));
  expect(outer(frame(26.8)).cy - highest.y > outer(frame(26.8)).h * 0.4, "The sun's point does not form at its upper edge.");
  expect(tipAt(29.5) > tipAt(29.0) && tipAt(29.0) > tipAt(28.5), "The drop does not fall in the final two seconds.");
  expect(near(box(screenParts(frame(28.5), "horizon").flat()).cy, pond0, 0.5), "The horizon does not settle into the opening pond position.");

  // Loop boundary: 29.999s draws what 0s draws.
  const end = frame(29.999);
  const endDrop = outer(end);
  const speedEnd = (tipAt(29.999) - tipAt(29.9)) / 0.099;
  const speedStart = (tipAt(0.1) - tipAt(0)) / 0.1;
  expect(near(endDrop.cx, drop0.cx, 0.2) && near(endDrop.y1, drop0.y1, 0.2) && near(endDrop.w, drop0.w, 0.2) && near(endDrop.h, drop0.h, 0.2), "The drop at the loop boundary does not match the opening drop.");
  expect(Math.abs(speedEnd - speedStart) / speedStart < 0.08, `The downward speed does not match at the loop (${speedEnd.toFixed(1)} vs ${speedStart.toFixed(1)} px/s).`);
  const endPond = box(screenParts(end, "horizon").flat());
  const startPond = box(screenParts(f0, "body.turn.hands.pondL").concat(screenParts(f0, "body.turn.hands.pondR")).flat());
  expect(near(endPond.x0, startPond.x0, 0.5) && near(endPond.x1, startPond.x1, 0.5) && near(endPond.cy, startPond.cy, 0.5), "The pond at 30s does not match the pond at 0s.");
  const blackAt = (items: readonly ResolvedDrawItem[]) => items.filter((item) => !item.nodeId.startsWith("cues.") && item.nodeId !== "ground" && drawn(items, item.nodeId)).length;
  expect(blackAt(end) === 2 && blackAt(f0) === 3, `Unexpected marks at the loop boundary (${blackAt(end)} at 30s, ${blackAt(f0)} at 0s).`);

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`checks passed  builder ${(performance.now() - builderStart).toFixed(0)} ms`);
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
export const PREVIEW_TIMES = [0, 0.75, 1.5, 1.75, 2.45, 3.4, 4.6, 5, 6.3, 7.5, 8.3, 9, 10, 10.7, 11.6, 12.5, 13.3, 14.5, 15, 16, 16.5, 17.2, 18, 18.6, 19, 20, 21.5, 23, 24, 24.6, 25, 25.8, 26.6, 27.5, 28, 29, 29.999];

main();
