/**
 * Builds fixtures/motionscript/stories/counter.ms — STICK FIGHT "COUNTER".
 * Run: npx tsx fixtures/motionscript/stories/build-counter.ts
 *
 * Angles are degrees in facing-local space. face +1 looks world-right, face -1
 * looks world-left. Positive rotation is clockwise on screen. A limb at 0°
 * points down; -90° points along the character's facing direction.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import {
  applySegmentEasing,
  mapWorldToLogical,
  transformPoint,
  validateSceneIR,
  type ResolvedDrawItem,
  type SolidColor,
} from "@gvr/schema";

const DURATION = 30_000;
const GROUND = 640;
const UPPER = 52;
const FORE = 48;
const FIST_Y = 8;
const THIGH = 58;
const SHIN = 56;
const FOOT = 26;
const SPINE = 88;
const HEAD_R = 22;
const HEAD_Y = -(SPINE + HEAD_R - 8);
const SHOULDER_Y = -72;
const LEAD_X = 15;
const REAR_X = -17;
const HIP_LEAD = 11;
const HIP_REAR = -11;

type Triple = [number, number, number];
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Expr = "neutral" | "grin" | "serious";

type Channels = {
  t: number;
  x: number;
  y: number;
  air: boolean;
  face: 1 | -1;
  ease: Ease;
  expr: Expr;
  body: number;
  torso: number;
  head: number;
  brow: number;
  jaw: number;
  fingers: number;
  aL: Triple;
  aR: Triple;
  lL: Triple;
  lR: Triple;
};

type Key = Partial<Omit<Channels, "t" | "y" | "air">> & {
  t: number;
  x?: number;
  y?: number;
  note?: string;
};

type Frame = Channels;

const tri = (a: number, b: number, c: number): Triple => [a, b, c];

const RELAX: Omit<Channels, "t" | "x" | "y" | "air" | "face" | "ease" | "expr"> = {
  body: 0,
  torso: 2,
  head: 0,
  brow: 0,
  jaw: 0,
  fingers: -6,
  aL: tri(12, 18, 0),
  aR: tri(-10, 16, 0),
  lL: tri(7, -10, -84),
  lR: tri(-5, -8, -80),
};

const GUARD: typeof RELAX = {
  body: 4,
  torso: 12,
  head: -6,
  brow: -3,
  jaw: 0,
  fingers: -16,
  aL: tri(-68, -96, 16),
  aR: tri(-34, -112, 18),
  lL: tri(18, -28, -74),
  lR: tri(-14, -12, -68),
};

const FISTS: typeof RELAX = {
  ...GUARD,
  torso: 8,
  head: -2,
  aL: tri(-96, -84, 8),
  aR: tri(-88, -90, 10),
  fingers: -28,
};

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function K(seconds: number, x: number, over: Omit<Key, "t" | "x"> = {}): Key {
  const key: Key = { t: ms(seconds), x, ...over };
  if (over.aL) key.aL = [...over.aL];
  if (over.aR) key.aR = [...over.aR];
  if (over.lL) key.lL = [...over.lL];
  if (over.lR) key.lR = [...over.lR];
  return key;
}

function cloneFrame(frame: Frame): Frame {
  return {
    ...frame,
    aL: [...frame.aL],
    aR: [...frame.aR],
    lL: [...frame.lL],
    lR: [...frame.lR],
  };
}

type Xf = { x: number; y: number; rot: number; sx: number; sy: number; px: number; py: number };

function xf(x: number, y: number, deg: number, sx = 1, sy = 1): Xf {
  return { x, y, rot: (deg * Math.PI) / 180, sx, sy, px: 0, py: 0 };
}

function mapLocal(tr: Xf, x: number, y: number): { x: number; y: number } {
  const lx = (x - tr.px) * tr.sx;
  const ly = (y - tr.py) * tr.sy;
  const c = Math.cos(tr.rot);
  const s = Math.sin(tr.rot);
  return { x: tr.x + tr.px + lx * c - ly * s, y: tr.y + tr.py + lx * s + ly * c };
}

function chain(nodes: Xf[], x: number, y: number): { x: number; y: number } {
  let point = { x, y };
  for (const node of nodes) point = mapLocal(node, point.x, point.y);
  return point;
}

function skeleton(frame: Frame): {
  root: Xf;
  torso: Xf;
  armL: Xf;
  foreL: Xf;
  handL: Xf;
  armR: Xf;
  foreR: Xf;
  handR: Xf;
  legL: Xf;
  shinL: Xf;
  footL: Xf;
  legR: Xf;
  shinR: Xf;
  footR: Xf;
  head: Xf;
} {
  const root = xf(frame.x, frame.y, frame.body, frame.face, 1);
  const torso = xf(0, 0, frame.torso);
  const armL = xf(LEAD_X, SHOULDER_Y, frame.aL[0]);
  const foreL = xf(0, UPPER, frame.aL[1]);
  const handL = xf(0, FORE, frame.aL[2]);
  const armR = xf(REAR_X, SHOULDER_Y, frame.aR[0]);
  const foreR = xf(0, UPPER, frame.aR[1]);
  const handR = xf(0, FORE, frame.aR[2]);
  const legL = xf(HIP_LEAD, 0, frame.lL[0]);
  const shinL = xf(0, THIGH, frame.lL[1]);
  const footL = xf(0, SHIN, frame.lL[2]);
  const legR = xf(HIP_REAR, 0, frame.lR[0]);
  const shinR = xf(0, THIGH, frame.lR[1]);
  const footR = xf(0, SHIN, frame.lR[2]);
  const head = xf(0, HEAD_Y, frame.head);
  return { root, torso, armL, foreL, handL, armR, foreR, handR, legL, shinL, footL, legR, shinR, footR, head };
}

type Joint = "head" | "chest" | "fistLead" | "fistRear" | "ankleLead" | "ankleRear" | "toeLead" | "toeRear" | "shoulderLead";

function joint(frame: Frame, name: Joint): { x: number; y: number } {
  const s = skeleton(frame);
  const base = [s.torso, s.root];
  switch (name) {
    case "head":
      return chain([s.head, ...base], 0, 0);
    case "chest":
      return chain(base, 0, -46);
    case "shoulderLead":
      return chain([s.armL, ...base], 0, 0);
    case "fistLead":
      return chain([xf(0, FIST_Y, 0), s.handL, s.foreL, s.armL, ...base], 0, 0);
    case "fistRear":
      return chain([xf(0, FIST_Y, 0), s.handR, s.foreR, s.armR, ...base], 0, 0);
    case "ankleLead":
      return chain([s.footL, s.shinL, s.legL, ...base], 0, 0);
    case "ankleRear":
      return chain([s.footR, s.shinR, s.legR, ...base], 0, 0);
    case "toeLead":
      return chain([s.footL, s.shinL, s.legL, ...base], 0, FOOT);
    case "toeRear":
      return chain([s.footR, s.shinR, s.legR, ...base], 0, FOOT);
    default:
      return { x: frame.x, y: frame.y };
  }
}

function lowestFootOffset(frame: Frame): number {
  const probe = { ...frame, y: 0 };
  const points = [joint(probe, "toeLead"), joint(probe, "toeRear"), joint(probe, "ankleLead"), joint(probe, "ankleRear")];
  return Math.max(...points.map((point) => point.y));
}

function plant(frame: Frame): number {
  return GROUND - lowestFootOffset(frame);
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lerp3(a: Triple, b: Triple, u: number): Triple {
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}

function expand(keys: Key[], face: 1 | -1): Frame[] {
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  let cursor: Frame = {
    ...RELAX,
    t: 0,
    x: sorted[0]?.x ?? 0,
    y: 0,
    air: false,
    face,
    ease: "linear",
    expr: "neutral",
    aL: [...RELAX.aL],
    aR: [...RELAX.aR],
    lL: [...RELAX.lL],
    lR: [...RELAX.lR],
  };
  const built: Frame[] = [];
  for (const key of sorted) {
    if (built.some((item) => item.t === key.t)) throw new Error(`duplicate key at ${key.t}`);
    cursor = {
      ...cursor,
      ...key,
      t: key.t,
      x: key.x ?? cursor.x,
      y: key.y ?? cursor.y,
      air: key.y !== undefined,
      face: key.face ?? cursor.face,
      ease: key.ease ?? "linear",
      expr: key.expr ?? cursor.expr,
      aL: key.aL ? [...key.aL] : [...cursor.aL],
      aR: key.aR ? [...key.aR] : [...cursor.aR],
      lL: key.lL ? [...key.lL] : [...cursor.lL],
      lR: key.lR ? [...key.lR] : [...cursor.lR],
    };
    const frame = cloneFrame(cursor);
    if (!frame.air) frame.y = plant(frame);
    built.push(frame);
  }
  const snapped: Frame[] = [];
  for (const key of built) {
    const prev = snapped[snapped.length - 1];
    if (prev && prev.face !== key.face && key.t - prev.t > 2) {
      snapped.push(cloneFrame({ ...key, t: key.t - 1, face: prev.face, air: key.air }));
    }
    snapped.push(key);
  }
  return snapped;
}

function sampleAt(keys: Frame[], t: number): Frame {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) throw new Error("empty pose list");
  if (t <= first.t) return cloneFrame(first);
  if (t >= last.t) return cloneFrame(last);
  let index = 0;
  while (index < keys.length - 2 && keys[index + 1]!.t <= t) index += 1;
  const from = keys[index]!;
  const to = keys[index + 1]!;
  if (from.t === t) return cloneFrame(from);
  const span = to.t - from.t;
  const raw = span <= 0 ? 0 : (t - from.t) / span;
  const eased = applySegmentEasing(from.ease === "hold" ? { type: "hold" } : from.ease, raw);
  const frame: Frame = {
    ...from,
    t,
    x: lerp(from.x, to.x, eased),
    y: 0,
    air: from.air || to.air,
    face: from.face,
    ease: "linear",
    expr: eased < 0.55 ? from.expr : to.expr,
    body: lerp(from.body, to.body, eased),
    torso: lerp(from.torso, to.torso, eased),
    head: lerp(from.head, to.head, eased),
    brow: lerp(from.brow, to.brow, eased),
    jaw: lerp(from.jaw, to.jaw, eased),
    fingers: lerp(from.fingers, to.fingers, eased),
    aL: lerp3(from.aL, to.aL, eased),
    aR: lerp3(from.aR, to.aR, eased),
    lL: lerp3(from.lL, to.lL, eased),
    lR: lerp3(from.lR, to.lR, eased),
  };
  if (!from.air && !to.air) frame.y = plant(frame);
  else frame.y = lerp(from.y, to.y, eased);
  frame.air = from.air || to.air;
  return frame;
}

type Limb = "aL" | "aR" | "lL" | "lR";

type Contact = {
  t0: number;
  t1: number;
  who: "cyan" | "orange";
  limb: Limb;
  end: Joint;
  target:
    | { kind: "joint"; fighter: "cyan" | "orange"; joint: Joint; dx?: number; dy?: number }
    | { kind: "world"; at: (self: Frame, other: Frame) => { x: number; y: number } };
};

function solveLimb(frame: Frame, who: "cyan" | "orange", other: Frame, contact: Contact, seed: Triple): Triple {
  const self = who === "cyan" ? frame : other;
  const foe = who === "cyan" ? other : frame;
  const target =
    contact.target.kind === "world"
      ? contact.target.at(self, foe)
      : joint(contact.target.fighter === "cyan" ? frame : other, contact.target.joint);
  const aimed = {
    x: target.x + (contact.target.kind === "joint" ? contact.target.dx ?? 0 : 0),
    y: target.y + (contact.target.kind === "joint" ? contact.target.dy ?? 0 : 0),
  };
  const host = who === "cyan" ? frame : other;
  const score = (upper: number, lower: number): number => {
    const next = cloneFrame(host);
    const triple: Triple = [upper, lower, seed[2]];
    next[contact.limb] = triple;
    const point = joint(next, contact.end);
    const dx = point.x - aimed.x;
    const dy = point.y - aimed.y;
    const bend = lower - seed[1];
    const shoulder = (upper - seed[0]) * 0.2;
    return dx * dx + dy * dy + bend * bend * 0.2 + shoulder * shoulder;
  };
  let bestA = seed[0];
  let bestB = seed[1];
  let best = score(bestA, bestB);
  for (let upper = -200; upper <= 200; upper += 12) {
    for (let lower = -170; lower <= 170; lower += 12) {
      const value = score(upper, lower);
      if (value < best) {
        best = value;
        bestA = upper;
        bestB = lower;
      }
    }
  }
  for (const step of [6, 2, 0.6]) {
    let guard = 0;
    let changed = true;
    while (changed && guard < 36) {
      changed = false;
      guard += 1;
      for (const [da, db] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
        [step, step],
        [step, -step],
        [-step, step],
        [-step, -step],
      ] as const) {
        const value = score(bestA + da, bestB + db);
        if (value < best - 0.05) {
          best = value;
          bestA += da;
          bestB += db;
          changed = true;
        }
      }
    }
  }
  return [bestA, bestB, seed[2]];
}

function sampleTimes(authored: number[], contacts: Contact[]): number[] {
  const marks = new Set<number>([0, DURATION, ...authored]);
  const sorted = [...marks].sort((a, b) => a - b);
  const times = new Set<number>(sorted);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index]!;
    const to = sorted[index + 1]!;
    const span = to - from;
    const step = span < 700 ? 40 : 90;
    for (let t = from + step; t < to - 1; t += step) times.add(t);
  }
  for (const contact of contacts) {
    for (let t = contact.t0; t <= contact.t1; t += 40) times.add(Math.max(0, Math.min(DURATION, t)));
  }
  return [...times].sort((a, b) => a - b);
}

function rdp(points: { t: number; v: number }[], epsilon: number): { t: number; v: number }[] {
  if (points.length <= 2) return points;
  const keep = points.map((_, index) => index === 0 || index === points.length - 1);
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) break;
    const [start, end] = next;
    let maxDistance = 0;
    let maxIndex = -1;
    const left = points[start]!;
    const right = points[end]!;
    for (let index = start + 1; index < end; index += 1) {
      const point = points[index]!;
      const u = right.t === left.t ? 0 : (point.t - left.t) / (right.t - left.t);
      const distance = Math.abs(point.v - (left.v + (right.v - left.v) * u));
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }
    if (maxDistance > epsilon && maxIndex >= 0) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function num(value: number, digits = 3): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function percent(t: number, previous: number): { text: string; value: number } {
  if (t <= 0) return { text: "0%", value: 0 };
  if (t >= DURATION) return { text: "100%", value: 1 };
  let digits = 5;
  let value = Number(((t / DURATION) * 100).toFixed(digits)) / 100;
  while (value <= previous && digits < 8) {
    digits += 1;
    value = Number(((t / DURATION) * 100).toFixed(digits)) / 100;
  }
  if (value <= previous) value = previous + 1e-7;
  const text = `${num(value * 100, digits)}%`;
  return { text, value };
}

function emitTrack(target: string, samples: { t: number; v: number }[], epsilon: number, angle: boolean): string {
  const reduced = rdp(samples, epsilon);
  if (reduced.length < 2) return "";
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  for (let index = 0; index < reduced.length; index += 1) {
    const sample = reduced[index]!;
    const next = reduced[index + 1];
    const pct = percent(sample.t, previous);
    previous = pct.value;
    const hold = angle && next !== undefined && Math.abs(Math.abs(next.v - sample.v) - 360) < 25;
    const value = angle ? `${num(sample.v, 3)}deg` : num(sample.v, 3);
    lines.push(`  ${pct.text} ${value}${hold ? " ease hold" : ""};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined || color.a === undefined) {
    return "#ffffff";
  }
  return cssColor(color as SolidColor);
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.004) return "";
  const matrix = item.logicalMatrix;
  const transform = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const fill = item.appearance.fill?.type === "solid" ? cssPaint(item.appearance.fill) : "none";
  const stroke = item.appearance.stroke;
  const strokePaint = stroke ? cssPaint(stroke.color.type === "solid" ? stroke.color : undefined) : "none";
  const width = stroke?.width ?? 1;
  const common = `transform="${transform}" opacity="${item.opacity.toFixed(3)}" fill="${fill}"`;
  const geometry = item.geometry;
  if (geometry.kind === "line") {
    return `<line x1="${geometry.from.x}" y1="${geometry.from.y}" x2="${geometry.to.x}" y2="${geometry.to.y}" ${common} stroke="${strokePaint}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  if (geometry.kind === "circle") return `<circle cx="0" cy="0" r="${geometry.radius}" ${common} stroke="${strokePaint}"/>`;
  if (geometry.kind === "ellipse") {
    return `<ellipse cx="0" cy="0" rx="${geometry.size.x / 2}" ry="${geometry.size.y / 2}" ${common} stroke="${strokePaint}" stroke-width="${width}"/>`;
  }
  if (geometry.kind === "rectangle") return `<rect x="0" y="0" width="${geometry.size.x}" height="${geometry.size.y}" ${common}/>`;
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
    return `<path d="${d}" ${common} stroke="${strokePaint}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return "";
}

const cyanKeys: Key[] = [
  K(0, 300, { ...RELAX, note: "wide" }),
  K(1.55, 300, { head: -4 }),
  K(1.85, 318, { aL: tri(-78, -42, -12), fingers: 24, torso: 4, ease: "easeOut" }),
  K(2.12, 324, { aL: tri(-104, -8, -6), fingers: -30 }),
  K(2.38, 324, { fingers: 22, ease: "hold" }),
  K(2.7, 324, { fingers: -8, ease: "hold" }),
  K(3.12, 336, { ...GUARD, body: -6, ease: "easeIn" }),
  K(3.4, 300, { body: -34, head: -12, torso: 4, aL: tri(-40, -70, 10), aR: tri(-20, -80, 8), lL: tri(14, -18, -70), ease: "hold" }),
  K(3.58, 308, { body: -30, ease: "easeOut" }),
  K(3.92, 348, { ...GUARD, body: -4 }),
  K(4.12, 352, { lL: tri(24, -48, -60), lR: tri(16, -36, -60), torso: 16, body: -2, ease: "easeIn" }),
  K(4.38, 360, { y: 430, lL: tri(-48, 108, -16), lR: tri(-36, 116, -10), aL: tri(-20, -40, 0), aR: tri(8, -30, 0), torso: 6, body: -4 }),
  K(4.66, 368, { ...GUARD, body: -2 }),
  K(5.02, 318, { ...GUARD, body: 3, torso: 6, head: 2, ease: "easeOut" }),
  K(5.22, 336, { body: 2, head: 8, ease: "hold" }),
  K(5.72, 412, { head: 26, brow: 8, torso: 18, body: 2 }),
  K(6.45, 430, { ...GUARD, head: -12, brow: 0, torso: 10 }),
  K(7.15, 500, { ...GUARD, torso: 8, ease: "easeIn" }),
  K(7.42, 590, { aL: tri(-96, -18, 4), fingers: -8, torso: 6, body: 2, ease: "hold" }),
  K(7.72, 590, { ease: "easeOut" }),
  K(8.08, 552, { body: -16, head: -8, aL: tri(-50, -80, 12), torso: 6 }),
  K(8.28, 568, { body: -8 }),
  K(8.58, 630, { aR: tri(-112, -6, 4), torso: 16, body: 10, aL: tri(-40, -90, 10), ease: "easeOut" }),
  K(8.78, 636, { ease: "hold" }),
  K(9.15, 600, { aL: tri(42, -148, 28), torso: -22, body: -14, head: -8, aR: tri(-20, -70, 8), ease: "easeIn" }),
  K(9.55, 612, { aL: tri(18, -132, 22), torso: -16 }),
  K(9.88, 640, { aL: tri(-58, -52, 14), torso: 8, body: 4, ease: "hold" }),
  K(10.28, 648, { ease: "easeIn" }),
  K(10.62, 920, { body: -18, torso: -6, head: 4, lL: tri(34, -18, -28), lR: tri(26, -14, -22), aL: tri(-8, -18, 0), aR: tri(8, -14, 0), ease: "easeOut" }),
  K(11.02, 1092, { body: -6, torso: 4, head: 2, lL: tri(16, -14, -48), lR: tri(10, -10, -44) }),
  K(11.2, 1064, { face: -1, ...GUARD, body: 2 }),
  K(12.35, 1008, { ...GUARD, torso: 16, body: 4, ease: "easeIn" }),
  K(12.72, 972, { torso: 36, head: 20, body: 10, lL: tri(46, -82, -36), lR: tri(40, -74, -32), aL: tri(-20, -44, 4), aR: tri(-14, -36, 4) }),
  K(13.05, 1104, { lR: tri(96, -8, 6), lL: tri(20, -40, -50), torso: 18, body: 4, aL: tri(-30, -50, 0), ease: "easeIn" }),
  K(13.38, 990, { y: 470, body: -80, lL: tri(-20, 80, 0), lR: tri(-10, 90, 0), aL: tri(-30, -70, 0), aR: tri(-16, -60, 0), torso: 8 }),
  K(13.72, 880, { y: 350, body: -165, lL: tri(-30, 110, 0), lR: tri(-24, 100, 0), aL: tri(-10, -80, 0), aR: tri(4, -70, 0) }),
  K(14.08, 790, { y: 300, body: -240, lL: tri(-16, 90, 0), lR: tri(-12, 84, 0) }),
  K(14.46, 710, { y: 430, body: -315, lL: tri(10, 40, -20), lR: tri(6, 36, -16) }),
  K(14.82, 676, { body: -360, y: 560, lL: tri(30, -46, -40), lR: tri(24, -40, -36), torso: 20, aL: tri(-36, -70, 8), aR: tri(-20, -60, 6), ease: "hold" }),
  K(14.821, 676, { body: 0, lL: tri(30, -46, -40), lR: tri(24, -40, -36), torso: 20, aL: tri(-36, -70, 8), aR: tri(-20, -60, 6) }),
  K(15.28, 664, { face: 1, ...GUARD, body: 0 }),
  K(16.05, 590, { ...GUARD }),
  K(16.7, 548, { ...GUARD, torso: 10, ease: "easeIn" }),
  K(16.98, 566, { aL: tri(-108, -4, 6), torso: 14, body: 8, ease: "easeOut" }),
  K(17.22, 572, { ...GUARD, aL: tri(-70, -80, 12) }),
  K(17.62, 586, { aR: tri(-114, -4, 4), torso: 18, body: 12, aL: tri(-36, -84, 8), ease: "easeOut" }),
  K(17.9, 590, { ...GUARD }),
  K(18.28, 608, { body: -28, torso: 8, lL: tri(-102, -8, -12), lR: tri(8, -14, -70), aL: tri(-24, -50, 0), aR: tri(-16, -40, 0), ease: "easeIn" }),
  K(18.62, 636, { body: -10, lL: tri(-96, -14, -8), torso: 6 }),
  K(19.15, 660, { body: 58, y: 545, lL: tri(-70, -20, 0), aL: tri(16, 10, 0), aR: tri(20, 8, 0), torso: 10 }),
  K(19.55, 688, { body: 132, y: 500, lL: tri(-40, 20, 0), lR: tri(-120, -10, 0), aL: tri(8, 6, 0), aR: tri(12, 4, 0) }),
  K(19.95, 730, { body: 230, y: 470, lR: tri(-90, -16, 0), aL: tri(4, 2, 0), aR: tri(6, 2, 0) }),
  K(20.32, 778, { ...GUARD, body: 360, ease: "hold" }),
  K(20.321, 778, { ...GUARD, body: 0 }),
  K(20.85, 760, { ...GUARD }),
  K(21.35, 690, { ...GUARD, body: -8, torso: 14, lL: tri(22, -34, -68), lR: tri(-18, -16, -64), ease: "easeIn" }),
  K(22.15, 640, { body: -12, torso: 16, head: -4, aL: tri(-58, -88, 14), aR: tri(-30, -100, 16) }),
  K(22.85, 590, { body: -24, head: -10, aL: tri(-30, -60, 8), aR: tri(-18, -50, 6), ease: "easeOut" }),
  K(23.15, 548, { body: -28 }),
  K(23.72, 610, { aL: tri(-132, -48, 6), aR: tri(-124, -58, 8), torso: 6, body: -6, head: 2 }),
  K(24.05, 520, { body: -18, y: 500, aR: tri(24, 18, 0), aL: tri(-80, -40, 10), lL: tri(20, -24, -40), lR: tri(16, -20, -36) }),
  K(24.45, 430, { y: 575, body: 8, torso: 22, head: 10, brow: 16, jaw: 12, expr: "serious", aR: tri(18, 28, 4), lL: tri(34, -58, -36), lR: tri(28, -48, -30) }),
  K(25.05, 418, { expr: "serious", brow: 18, jaw: 14, head: 6, torso: 16, body: 4, aL: tri(-48, -80, 12), aR: tri(8, 12, 0) }),
  K(25.55, 470, { expr: "serious", lL: tri(28, -36, -60), lR: tri(-22, -18, -60), aL: tri(-64, -70, 10), torso: 14, ease: "easeIn" }),
  K(26.05, 540, { lL: tri(-24, -20, -70), lR: tri(26, -32, -64), body: 8 }),
  K(26.45, 600, { lL: tri(30, -40, -60), lR: tri(-28, -16, -66), torso: 18 }),
  K(26.85, 600, { body: 36, torso: 8, y: 600, aL: tri(30, 18, 0), aR: tri(-12, -20, 0), lL: tri(-8, -12, -20), lR: tri(14, -18, -40), ease: "easeIn" }),
  K(27.12, 640, { body: -38, y: 545, lL: tri(-96, -6, 0), aL: tri(55, 12, 0), aR: tri(-18, -8, 0), torso: -6, head: -4, ease: "hold" }),
  K(27.26, 644, { body: -38, y: 545, lL: tri(-96, -6, 0), aL: tri(55, 12, 0), ease: "easeOut" }),
  K(27.7, 690, { ...GUARD, body: 2, expr: "neutral", brow: 0, jaw: 0 }),
  K(28.15, 760, { ...RELAX, torso: 4, aL: tri(-20, -10, 0) }),
  K(28.55, 820, { aL: tri(-70, -16, 6), torso: 8, body: 2, fingers: 6 }),
  K(29.05, 836, { aL: tri(-78, -20, 8), head: -6 }),
  K(29.35, 836, { head: -52, brow: 8, aL: tri(-74, -24, 8), torso: -8 }),
  K(30, 836, { head: -30 }),
];

const orangeKeys: Key[] = [
  K(0, 980, { ...RELAX, face: -1 }),
  K(0.85, 980, { head: 18, torso: 2, ease: "easeInOut" }),
  K(1.15, 980, { head: -16 }),
  K(1.45, 980, { ...FISTS, head: 6 }),
  K(1.7, 980, { ...FISTS, head: 0, ease: "hold" }),
  K(2.7, 980, { ...FISTS, torso: 14, body: 6, ease: "easeIn" }),
  K(3.16, 620, { ...FISTS, aL: tri(24, -136, 26), torso: 18, body: 10, lR: tri(-28, -8, -60) }),
  K(3.4, 455, { aL: tri(-108, -6, 4), torso: 20, body: 14, head: 2, lL: tri(8, -16, -70), ease: "hold" }),
  K(3.58, 468, { ease: "easeOut" }),
  K(3.9, 500, { aL: tri(-40, -80, 10), lL: tri(-16, -36, -40), torso: 14, body: 8, ease: "easeIn" }),
  K(4.36, 486, { lL: tri(-112, -6, -8), torso: 10, body: 16, aL: tri(-28, -60, 8), ease: "easeOut" }),
  K(4.7, 508, { ...GUARD, lL: tri(16, -24, -70) }),
  K(4.95, 520, { aL: tri(168, -36, 0), torso: -8, body: -6, head: -10, ease: "easeIn" }),
  K(5.16, 528, { aL: tri(-62, 18, 8), torso: 28, body: 18, head: 8, ease: "hold" }),
  K(5.4, 534, { ease: "easeOut" }),
  K(5.9, 560, { ...GUARD, head: -4 }),
  K(6.5, 590, { ...GUARD }),
  K(7.15, 700, { ...GUARD, torso: 6 }),
  K(7.45, 742, { ...GUARD, head: 4, torso: 4, ease: "hold" }),
  K(7.78, 742, { head: -14, torso: 10, ease: "easeIn" }),
  K(8.12, 728, { aL: tri(-104, -8, 6), torso: 16, body: 8, ease: "easeOut" }),
  K(8.4, 724, { torso: 22, head: 8, aL: tri(-50, -70, 10) }),
  K(8.64, 736, { torso: 36, head: 16, body: 6, aL: tri(-30, -50, 8) }),
  K(8.9, 748, { ...GUARD, torso: 14 }),
  K(9.4, 760, { ...GUARD, torso: 10, body: 4 }),
  K(9.9, 778, { aL: tri(-74, -36, 12), torso: 6, body: 2, ease: "hold" }),
  K(10.3, 790, { ease: "easeIn" }),
  K(10.6, 740, { body: -12, torso: 16, aL: tri(-18, -28, 0), lL: tri(10, -16, -68), ease: "easeOut" }),
  K(11.05, 800, { ...GUARD, body: 2 }),
  K(11.42, 930, { face: 1, ...GUARD, torso: 12, body: 6 }),
  K(12.15, 990, { face: 1, torso: 16, body: 12, lL: tri(-128, 64, -8), lR: tri(22, -16, -60), aL: tri(-36, -40, 0), aR: tri(-48, -30, 0), y: 500, ease: "easeIn" }),
  K(12.72, 1064, { face: 1, y: 530, lL: tri(-88, -6, -4), torso: 18, body: 14, aL: tri(-16, -20, 0) }),
  K(13.15, 1088, { face: 1, ...GUARD, lL: tri(10, -20, -70), torso: 8, body: 4 }),
  K(13.55, 1064, { face: 1, torso: 4, body: -8, head: -18, aL: tri(-150, -16, 0), aR: tri(-20, -30, 0), ease: "easeIn" }),
  K(14.05, 1048, { face: 1, aL: tri(-168, -8, 0), head: -24, torso: -6 }),
  K(14.55, 1036, { ...GUARD, face: 1, aL: tri(-120, -20, 0), head: -8 }),
  K(15.05, 1024, { face: 1, ...GUARD, body: 4 }),
  K(15.32, 1010, { face: -1, ...GUARD }),
  K(16.15, 860, { ...GUARD }),
  K(16.75, 760, { ...GUARD, torso: 10 }),
  K(17.0, 748, { aL: tri(-130, -24, 4), torso: 8, body: -6, ease: "easeOut" }),
  K(17.28, 744, { ...GUARD }),
  K(17.64, 736, { torso: 42, head: 28, body: 10, lL: tri(28, -50, -40), lR: tri(20, -36, -36), y: 590 }),
  K(17.95, 742, { ...GUARD }),
  K(18.35, 770, { aL: tri(-88, -20, 8), torso: 8, body: 4, ease: "easeOut" }),
  K(18.7, 784, { aL: tri(-96, -16, 10), torso: 6, ease: "hold" }),
  K(19.5, 800, { aL: tri(-70, -24, 8) }),
  K(19.9, 836, { aL: tri(-20, -16, 0), body: 14, torso: 12, lL: tri(8, -10, -60) }),
  K(20.35, 900, { body: 18, torso: 8, lL: tri(22, -18, -50), ease: "easeOut" }),
  K(20.9, 930, { ...GUARD, body: 2 }),
  K(21.4, 960, { torso: 24, body: 8, lL: tri(32, -46, -50), lR: tri(-22, -28, -48), aL: tri(-20, -70, 12), ease: "easeIn" }),
  K(22.2, 990, { aR: tri(48, -150, 24), torso: 18, body: 6, head: -4, aL: tri(-40, -80, 10), expr: "grin", jaw: -18, brow: -8 }),
  K(22.7, 940, { aR: tri(36, -140, 20), torso: 20, body: 10, expr: "grin", ease: "easeOut" }),
  K(23.05, 900, { expr: "grin", jaw: -24, head: -8, aR: tri(20, -120, 16), torso: 12, body: 2 }),
  K(23.55, 820, { expr: "grin", aL: tri(-40, -100, 12), torso: 10, ease: "easeIn" }),
  K(23.9, 690, { aL: tri(-124, -10, 4), torso: 16, body: 12, expr: "grin", jaw: -20, ease: "easeOut" }),
  K(24.2, 748, { ...GUARD, expr: "neutral", jaw: 0, brow: 0 }),
  K(25.15, 800, { ...GUARD }),
  K(25.6, 760, { torso: 14, body: 8, lL: tri(-20, -18, -64), lR: tri(24, -30, -60), ease: "easeIn" }),
  K(26.15, 700, { lL: tri(24, -34, -62), lR: tri(-26, -14, -66), aL: tri(-48, -90, 12) }),
  K(26.55, 660, { aL: tri(16, -124, 18), torso: 16, body: 8 }),
  K(26.95, 800, { aL: tri(-100, -8, 6), torso: 14, body: 8, ease: "easeIn" }),
  K(27.12, 810, { torso: 64, head: 36, body: 10, aL: tri(18, 28, 0), aR: tri(-22, -12, 0), lL: tri(6, -10, -20), ease: "hold" }),
  K(27.26, 830, { torso: 58, y: 500, ease: "easeIn" }),
  K(27.55, 920, { y: 470, torso: 16, body: -8, lL: tri(-30, 8, -12), lR: tri(-16, 12, -10) }),
  K(27.95, 1048, { torso: -16, head: 6, body: -4, lL: tri(-84, 22, -18), lR: tri(-68, 34, -14), aL: tri(-14, -18, 0), aR: tri(-8, -14, 0) }),
  K(28.4, 1056, { torso: -12, head: 2, lL: tri(-76, 16, -14), lR: tri(-62, 26, -10) }),
  K(28.7, 1088, { aL: tri(-96, -28, 10), torso: -10, head: 0 }),
  K(29.1, 1090, { aL: tri(-110, -16, 6), head: -4 }),
  K(29.38, 1090, { head: -50, brow: 6, aL: tri(-102, -20, 8) }),
  K(30, 1090, { head: -28 }),
];

const contacts: Contact[] = [
  { t0: ms(3.32), t1: ms(3.58), who: "orange", limb: "aL", end: "fistLead", target: { kind: "joint", fighter: "cyan", joint: "head", dx: 48, dy: 28 } },
  { t0: ms(5.08), t1: ms(5.42), who: "orange", limb: "aL", end: "fistLead", target: { kind: "world", at: (self) => ({ x: self.x + self.face * 86, y: GROUND - 4 }) } },
  { t0: ms(7.32), t1: ms(7.74), who: "cyan", limb: "aL", end: "fistLead", target: { kind: "joint", fighter: "orange", joint: "shoulderLead", dx: 0, dy: -8 } },
  { t0: ms(9.78), t1: ms(10.32), who: "orange", limb: "aL", end: "fistLead", target: { kind: "joint", fighter: "cyan", joint: "fistLead" } },
  { t0: ms(18.4), t1: ms(19.45), who: "orange", limb: "aL", end: "fistLead", target: { kind: "joint", fighter: "cyan", joint: "ankleLead" } },
  { t0: ms(19.5), t1: ms(20.05), who: "cyan", limb: "lR", end: "toeRear", target: { kind: "joint", fighter: "cyan", joint: "ankleLead", dx: 8, dy: 6 } },
  { t0: ms(23.78), t1: ms(24.12), who: "orange", limb: "aL", end: "fistLead", target: { kind: "joint", fighter: "cyan", joint: "head", dx: 26, dy: 18 } },
  { t0: ms(27.0), t1: ms(27.26), who: "cyan", limb: "lL", end: "ankleLead", target: { kind: "joint", fighter: "orange", joint: "chest", dx: -8, dy: 6 } },
  { t0: ms(28.5), t1: ms(29.2), who: "cyan", limb: "aL", end: "fistLead", target: { kind: "world", at: (self, other) => ({ x: (self.x + other.x) / 2, y: GROUND - 86 }) } },
  { t0: ms(28.6), t1: ms(29.2), who: "orange", limb: "aL", end: "fistLead", target: { kind: "world", at: (self, other) => ({ x: (self.x + other.x) / 2, y: GROUND - 86 }) } },
];

const cameraKeys: Key[] = [
  K(0, 640, { y: 430, body: 0.94 }),
  K(2.6, 640, { y: 430, body: 0.94, ease: "hold" }),
  K(3.3, 430, { y: 455, body: 1.12, ease: "easeIn" }),
  K(5.2, 470, { y: 470, body: 1.16 }),
  K(7.4, 660, { y: 460, body: 1.14 }),
  K(10.2, 860, { y: 470, body: 1.02, ease: "easeIn" }),
  K(11.4, 960, { y: 410, body: 0.68 }),
  K(12.7, 980, { y: 390, body: 0.58, ease: "easeOut" }),
  K(14.2, 940, { y: 360, body: 0.54 }),
  K(15.3, 840, { y: 430, body: 0.82 }),
  K(16.4, 680, { y: 460, body: 1.12 }),
  K(21.2, 780, { y: 465, body: 1.14 }),
  K(23.6, 700, { y: 460, body: 1.18 }),
  K(26.4, 640, { y: 445, body: 1.08 }),
  K(27.05, 730, { y: 470, body: 1.02 }),
  K(27.14, 714, { y: 456, body: 1.06 }),
  K(27.2, 746, { y: 484, body: 1.04 }),
  K(27.28, 728, { y: 462, body: 1.0 }),
  K(27.7, 920, { y: 430, body: 0.74 }),
  K(28.8, 1000, { y: 390, body: 0.66 }),
  K(30, 1020, { y: 370, body: 0.62 }),
];

function limb(color: string, width: number): string {
  return `stroke ${color} width ${width} cap round join round`;
}

function fighterSource(name: string, color: string, zIndex: number, face: number): string {
  const line = (width: number) => limb(color, width);
  return `group ${name} {
  position (${name === "cyan" ? 300 : 980}, 520);
  scale (${face}, 1);
  zIndex ${zIndex};
  group torso {
    group legRear {
      position (${HIP_REAR}, 0);
      line bone { from (0, 0); to (0, ${THIGH}); ${line(9)}; };
      group shin {
        position (0, ${THIGH});
        line bone { from (0, 0); to (0, ${SHIN}); ${line(8)}; };
        group foot {
          position (0, ${SHIN});
          line bone { from (0, 0); to (0, ${FOOT}); ${line(7)}; };
        };
      };
    };
    group legLead {
      position (${HIP_LEAD}, 0);
      line bone { from (0, 0); to (0, ${THIGH}); ${line(12)}; };
      group shin {
        position (0, ${THIGH});
        line bone { from (0, 0); to (0, ${SHIN}); ${line(11)}; };
        group foot {
          position (0, ${SHIN});
          line bone { from (0, 0); to (0, ${FOOT}); ${line(8)}; };
        };
      };
    };
    circle pelvis { radius 9; fill ${color}; };
    line spine { from (0, 8); to (0, ${-SPINE}); ${line(16)}; };
    group armRear {
      position (${REAR_X}, ${SHOULDER_Y});
      line bone { from (0, 0); to (0, ${UPPER}); ${line(9)}; };
      group fore {
        position (0, ${UPPER});
        line bone { from (0, 0); to (0, ${FORE}); ${line(8)}; };
        group hand {
          position (0, ${FORE});
          circle fist { position (0, ${FIST_Y}); radius 7.5; fill ${color}; };
        };
      };
    };
    group armLead {
      position (${LEAD_X}, ${SHOULDER_Y});
      line bone { from (0, 0); to (0, ${UPPER}); ${line(13)}; };
      group fore {
        position (0, ${UPPER});
        line bone { from (0, 0); to (0, ${FORE}); ${line(12)}; };
        group hand {
          position (0, ${FORE});
          circle fist { position (0, ${FIST_Y}); radius 8.5; fill ${color}; };
          group fingers {
            position (0, 12);
            line one { from (0, 0); to (8, -11); ${line(4)}; };
            line two { from (0, 0); to (12, -3); ${line(4)}; };
          };
        };
      };
    };
    group head {
      position (0, ${HEAD_Y});
      circle skull { radius ${HEAD_R}; fill ${color}; };
      circle eye { position (9, -1); radius 3.5; fill #071018; };
      line nose { from (12, 2); to (21, 5); stroke #071018 width 3 cap round; };
      group brow {
        line mark { from (-1, -10); to (14, -7); stroke #071018 width 3.2 cap round; };
      };
      group jaw {
        line mouth { from (-8, 7); to (8, 7); stroke #071018 width 3 cap round; };
      };
    };
  };
};`;
}

function exprValue(expr: Expr, kind: "brow" | "jaw"): number {
  if (expr === "grin") return kind === "brow" ? -12 : -24;
  if (expr === "serious") return kind === "brow" ? 18 : 14;
  return 0;
}

function buildFrames(): { times: number[]; cyan: Frame[]; orange: Frame[] } {
  const cyanAuthored = expand(cyanKeys, 1);
  const orangeAuthored = expand(orangeKeys, -1);
  const times = sampleTimes(
    [...cyanAuthored, ...orangeAuthored].map((frame) => frame.t),
    contacts,
  );
  const cyan = times.map((t) => sampleAt(cyanAuthored, t));
  const orange = times.map((t) => sampleAt(orangeAuthored, t));
  const memory = new Map<string, Triple>();
  for (let index = 0; index < times.length; index += 1) {
    const t = times[index]!;
    for (const contact of contacts) {
      const id = `${contact.who}:${contact.limb}`;
      if (t < contact.t0 || t > contact.t1) {
        memory.delete(id);
        continue;
      }
      const host = contact.who === "cyan" ? cyan[index]! : orange[index]!;
      const seed = memory.get(id) ?? host[contact.limb];
      const solved = solveLimb(cyan[index]!, contact.who, orange[index]!, contact, seed);
      host[contact.limb] = solved;
      memory.set(id, solved);
      if (!host.air) host.y = plant(host);
    }
  }
  return { times, cyan, orange };
}

function channelTracks(name: string, frames: Frame[], times: number[]): string {
  const series: [string, (frame: Frame) => number, boolean, number][] = [
    [`${name}.position.x`, (frame) => frame.x, false, 1.4],
    [`${name}.position.y`, (frame) => frame.y, false, 1.4],
    [`${name}.rotation`, (frame) => frame.body, true, 1.1],
    [`${name}.torso.rotation`, (frame) => frame.torso, true, 1.1],
    [`${name}.torso.head.rotation`, (frame) => frame.head, true, 1.1],
    [`${name}.torso.head.brow.rotation`, (frame) => (frame.expr === "neutral" ? frame.brow : exprValue(frame.expr, "brow")), true, 1.1],
    [`${name}.torso.head.jaw.rotation`, (frame) => (frame.expr === "neutral" ? frame.jaw : exprValue(frame.expr, "jaw")), true, 1.1],
    [`${name}.torso.armLead.rotation`, (frame) => frame.aL[0], true, 1.15],
    [`${name}.torso.armLead.fore.rotation`, (frame) => frame.aL[1], true, 1.15],
    [`${name}.torso.armLead.fore.hand.rotation`, (frame) => frame.aL[2], true, 1.2],
    [`${name}.torso.armLead.fore.hand.fingers.rotation`, (frame) => frame.fingers, true, 1.4],
    [`${name}.torso.armRear.rotation`, (frame) => frame.aR[0], true, 1.15],
    [`${name}.torso.armRear.fore.rotation`, (frame) => frame.aR[1], true, 1.15],
    [`${name}.torso.armRear.fore.hand.rotation`, (frame) => frame.aR[2], true, 1.2],
    [`${name}.torso.legLead.rotation`, (frame) => frame.lL[0], true, 1.15],
    [`${name}.torso.legLead.shin.rotation`, (frame) => frame.lL[1], true, 1.15],
    [`${name}.torso.legLead.shin.foot.rotation`, (frame) => frame.lL[2], true, 1.2],
    [`${name}.torso.legRear.rotation`, (frame) => frame.lR[0], true, 1.15],
    [`${name}.torso.legRear.shin.rotation`, (frame) => frame.lR[1], true, 1.15],
    [`${name}.torso.legRear.shin.foot.rotation`, (frame) => frame.lR[2], true, 1.2],
  ];
  return series
    .map(([target, read, angle, epsilon]) =>
      emitTrack(
        target,
        frames.map((frame, index) => ({ t: times[index]!, v: read(frame) })),
        epsilon,
        angle,
      ),
    )
    .filter(Boolean)
    .join("\n");
}

function scaleTrack(name: string, frames: Frame[], times: number[]): string {
  const keys: { t: number; face: number }[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const face = frames[index]!.face;
    const t = times[index]!;
    const previous = keys[keys.length - 1];
    if (!previous || previous.face !== face) keys.push({ t, face });
  }
  const lines = [`keyframes ${name}.scale {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  const emitted: { t: number; face: number }[] = [];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (index > 0 && key.t - keys[index - 1]!.t > 2) emitted.push({ t: key.t - 1, face: keys[index - 1]!.face });
    emitted.push(key);
  }
  if (emitted[emitted.length - 1]?.t !== DURATION) emitted.push({ t: DURATION, face: emitted[emitted.length - 1]?.face ?? 1 });
  for (let index = 0; index < emitted.length; index += 1) {
    const key = emitted[index]!;
    const pct = percent(key.t, previous);
    previous = pct.value;
    const hold = index < emitted.length - 1 ? " ease hold" : "";
    lines.push(`  ${pct.text} (${key.face}, 1)${hold};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function cameraExpanded(): Frame[] {
  return expand(
    cameraKeys.map((key) => ({ ...key, y: key.y, body: key.body })),
    1,
  );
}

function cameraAt(t: number): Frame {
  return sampleAt(cameraExpanded(), t);
}

function cameraSamples(): Frame[] {
  const expanded = cameraExpanded();
  const times = sampleTimes(expanded.map((frame) => frame.t), []);
  return times.map((t) => sampleAt(expanded, t));
}

function cameraTracks(): string {
  const samples = cameraSamples();
  // Camera reuses body as zoom and y as camera y. plant() would fight an explicit y.
  // expand() only plants when y is omitted. These keys always set y.
  return [
    emitTrack(
      "camera(main).position.x",
      samples.map((frame) => ({ t: frame.t, v: frame.x })),
      1.2,
      false,
    ),
    emitTrack(
      "camera(main).position.y",
      samples.map((frame) => ({ t: frame.t, v: frame.y })),
      1.2,
      false,
    ),
    emitTrack(
      "camera(main).zoom",
      samples.map((frame) => ({ t: frame.t, v: frame.body })),
      0.012,
      false,
    ),
  ].join("\n");
}

function shadowTracks(name: string, frames: Frame[], times: number[]): string {
  const lift = frames.map((frame) => {
    const lowest = Math.max(joint(frame, "toeLead").y, joint(frame, "toeRear").y, joint(frame, "ankleLead").y, joint(frame, "ankleRear").y);
    return Math.max(0, GROUND - lowest);
  });
  return [
    emitTrack(
      `${name}.position.x`,
      frames.map((frame, index) => ({ t: times[index]!, v: frame.x })),
      1.6,
      false,
    ),
    emitTrack(
      `${name}.opacity`,
      lift.map((height, index) => ({ t: times[index]!, v: Math.max(0.08, 0.4 - height / 380) })),
      0.03,
      false,
    ),
    emitTrack(
      `${name}.scale.x`,
      lift.map((height, index) => ({ t: times[index]!, v: Math.max(0.35, 1 - height / 280) })),
      0.03,
      false,
    ),
    emitTrack(
      `${name}.scale.y`,
      lift.map((height, index) => ({ t: times[index]!, v: Math.max(0.35, 1 - height / 280) })),
      0.03,
      false,
    ),
  ].join("\n");
}

function effectTracks(impact: { x: number; y: number }): string {
  return `
ellipse crater {
  position (${num(impact.x, 1)}, ${GROUND - 2});
  size (58, 16);
  fill #1c1917;
  stroke #78716c width 2;
  opacity 0;
  zIndex 3;
};
ellipse shock {
  position (${num(impact.x, 1)}, ${GROUND - 2});
  size (70, 22);
  stroke #f8fafc width 4;
  opacity 0;
  zIndex 4;
};
ellipse dustA { position (760, ${GROUND - 6}); size (28, 10); fill #94a3b8; opacity 0; zIndex 3; };
ellipse dustB { position (900, ${GROUND - 6}); size (34, 12); fill #94a3b8; opacity 0; zIndex 3; };
ellipse dustC { position (430, ${GROUND - 4}); size (36, 12); fill #94a3b8; opacity 0; zIndex 3; };
circle pebble {
  position (1164, 248);
  radius 4;
  fill #d6d3d1;
  opacity 0;
  zIndex 16;
};
rectangle flash {
  space screen;
  position (0, 0);
  size (1280, 720);
  fill #ffffff;
  opacity 0;
  zIndex 30;
};
rectangle blackout {
  space screen;
  position (0, 0);
  size (1280, 720);
  fill #000000;
  opacity 0;
  zIndex 40;
};
keyframes crater.opacity { start 0s; duration 30s; 0% 0; 17% 0; 17.4% 1; 100% 1; };
keyframes shock.opacity { start 0s; duration 30s; 0% 0; 17% 0; 17.3% 0.85; 19.2% 0; 100% 0; };
keyframes shock.scale { start 0s; duration 30s; 0% (0.2, 0.2); 17% (0.2, 0.2); 19.2% (2.8, 2.8); 100% (2.8, 2.8); };
keyframes dustA.opacity { start 0s; duration 30s; 0% 0; 35% 0; 35.6% 0.45; 37.5% 0; 100% 0; };
keyframes dustB.opacity { start 0s; duration 30s; 0% 0; 35.8% 0; 36.4% 0.4; 38.2% 0; 100% 0; };
keyframes dustC.opacity { start 0s; duration 30s; 0% 0; 81% 0; 81.8% 0.5; 84.5% 0; 100% 0; };
keyframes pebble.opacity { start 0s; duration 30s; 0% 0; 97.6% 0; 97.9% 1; 99.2% 1; 100% 0; };
keyframes pebble.position.y { start 0s; duration 30s; 0% 248; 97.6% 248; 99.2% 520; 100% 560; };
keyframes flash.opacity { start 0s; duration 30s; 0% 0; 90.4% 0; 90.55% 0.9; 90.9% 0; 100% 0; };
keyframes blackout.opacity { start 0s; duration 30s; 0% 0; 97.8% 0; 98.6% 0.2; 99.15% 1; 100% 1; };
keyframes pillar.crack.opacity { start 0s; duration 30s; 0% 0; 42.2% 0; 42.8% 1; 100% 1; };
keyframes pillar.rotation { start 0s; duration 30s; 0% 0deg; 42.6% 0.6deg; 97.2% 0.6deg; 97.55% 1.6deg; 97.8% -0.8deg; 98.1% 0.9deg; 98.5% 0.2deg; 100% 0.2deg; };
`.trim();
}

function stageSource(): string {
  return `
rectangle floor {
  position (-500, ${GROUND});
  size (2400, 220);
  fill #10131c;
  zIndex 0;
};
line ground {
  from (-500, ${GROUND});
  to (1900, ${GROUND});
  stroke #3c4458 width 4;
  zIndex 1;
};
ellipse shadowCyan {
  position (300, ${GROUND - 8});
  size (86, 18);
  fill #05060a;
  opacity 0.4;
  zIndex 2;
};
ellipse shadowOrange {
  position (980, ${GROUND - 8});
  size (96, 20);
  fill #05060a;
  opacity 0.4;
  zIndex 2;
};
group pillar {
  position (1124, 210);
  pivot (24, 430);
  zIndex 6;
  rectangle shaft {
    size (48, 430);
    fill #3a4154;
  };
  rectangle edge {
    size (7, 430);
    fill #5c657a;
  };
  path crack {
    opacity 0;
    move (30, 36);
    line (16, 92);
    line (34, 148);
    line (18, 214);
    line (32, 268);
    stroke #e7e5e4 width 3 cap round join round;
  };
};
`.trim();
}

function program(impact: { x: number; y: number }, motion: string): string {
  return `// STICK FIGHT — COUNTER
// 30 seconds. Cyan (left, quick) and Orange (right, relentless).
// 0:00 challenge, 0:03 three answers, 0:07 reversal, 0:11 pillar flip,
// 0:16 close combat, 0:21 feint, 0:25 final kick, 0:28 offer and cut.
scene "counter" {
  version "0.2";
  viewport (1280, 720);
  background #08090e;
  duration 30s;
};
camera main {
  position (640, 430);
  zoom 0.94;
  rotation 0deg;
};
${stageSource()}
${fighterSource("cyan", "#22d3ee", 12, 1)}
${fighterSource("orange", "#fb923c", 10, -1)}
${effectTracks(impact)}
${motion}
complete;
`;
}

function runtimePoint(items: readonly ResolvedDrawItem[], id: string, x: number, y: number): { x: number; y: number } | undefined {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) return undefined;
  return transformPoint(item.logicalMatrix, x, y);
}

function sheet(runtime: AnimationRuntime, times: number[]): string {
  const columns = 6;
  const scale = 0.24;
  const cellW = 1280 * scale;
  const cellH = 720 * scale;
  const rows = Math.ceil(times.length / columns);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(columns * cellW)}" height="${Math.ceil(rows * cellH)}" viewBox="0 0 ${columns * cellW} ${rows * cellH}">`,
  ];
  times.forEach((time, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const frame = runtime.evaluate(time);
    const body = frame.drawItems.map(drawItem).join("");
    parts.push(
      `<g transform="translate(${column * cellW} ${row * cellH}) scale(${scale})"><rect width="1280" height="720" fill="#08090e"/>${body}<text x="24" y="48" fill="#f8fafc" font-size="42" font-family="sans-serif">${(time / 1000).toFixed(2)}s</text></g>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
}

function main(): void {
  const baked = buildFrames();
  const impactFrame = baked.cyan[baked.times.findIndex((time) => time >= ms(5.16))] ? baked.orange[baked.times.findIndex((time) => time >= ms(5.16))] : undefined;
  const impactIndex = baked.times.findIndex((time) => time >= ms(5.16));
  const impact = impactIndex >= 0 ? joint(baked.orange[impactIndex]!, "fistLead") : { x: 470, y: GROUND };
  const motion = [
    channelTracks("cyan", baked.cyan, baked.times),
    scaleTrack("cyan", baked.cyan, baked.times),
    channelTracks("orange", baked.orange, baked.times),
    scaleTrack("orange", baked.orange, baked.times),
    shadowTracks("shadowCyan", baked.cyan, baked.times),
    shadowTracks("shadowOrange", baked.orange, baked.times),
    cameraTracks(),
  ].join("\n");
  const source = program(impact, motion);
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "counter.ms");
  writeFileSync(outPath, source);
  console.log(`wrote ${outPath} (${source.length} bytes)`);
  const compiled = compileMotionScript(source);
  if (!compiled.ok || !compiled.scene) {
    console.error(compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((item) => item.message).join("\n"));
    process.exit(1);
  }
  const runtime = new AnimationRuntime(compiled.scene);
  const checks: [string, Joint, number, number][] = [
    ["cyan.torso.head.skull", "head", 0, 0],
    ["cyan.torso.armLead.fore.hand.fist", "fistLead", 0, 0],
    ["cyan.torso.legLead.shin.foot.bone", "ankleLead", 0, 0],
    ["orange.torso.armLead.fore.hand.fist", "fistLead", 0, 0],
  ];
  for (const time of [0, ms(3.4), ms(5.16), ms(9.9), ms(14.1), ms(27.12)]) {
    const index = baked.times.findIndex((value) => value >= time);
    const frame = runtime.evaluate(baked.times[index] ?? time);
    for (const [id, name, x, y] of checks) {
      const who = id.startsWith("cyan") ? baked.cyan[index] : baked.orange[index];
      if (!who) continue;
      const cam = cameraAt(baked.times[index] ?? time);
      const expected = mapWorldToLogical(
        { width: 1280, height: 720 },
        { position: { x: cam.x, y: cam.y }, zoom: cam.body, rotation: 0 },
        joint(who, name),
      );
      const actual = runtimePoint(frame.drawItems, id, x, y);
      if (!actual) {
        console.error(`missing ${id} at ${time}`);
        process.exit(1);
      }
      const error = Math.hypot(actual.x - expected.x, actual.y - expected.y);
      if (error > 8) {
        console.error(`FK ${id} @ ${time}ms off by ${error.toFixed(2)} expected ${expected.x.toFixed(1)},${expected.y.toFixed(1)} got ${actual.x.toFixed(1)},${actual.y.toFixed(1)}`);
        process.exit(1);
      }
    }
  }
  const reportTimes = [ms(3.4), ms(5.16), ms(7.45), ms(9.95), ms(18.7), ms(23.9), ms(27.12), ms(28.9)];
  for (const time of reportTimes) {
    const frame = runtime.evaluate(time);
    const fist = runtimePoint(frame.drawItems, "orange.torso.armLead.fore.hand.fist", 0, 0);
    const head = runtimePoint(frame.drawItems, "cyan.torso.head.skull", 0, 0);
    const ankle = runtimePoint(frame.drawItems, "cyan.torso.legLead.shin.foot.bone", 0, 0);
    const grab = runtimePoint(frame.drawItems, "orange.torso.armLead.fore.hand.fist", 0, 0);
    const kick = runtimePoint(frame.drawItems, "cyan.torso.legLead.shin.foot.bone", 0, 0);
    const chest = runtimePoint(frame.drawItems, "orange.torso.spine", 0, -46);
    const parts = [`t=${(time / 1000).toFixed(2)}`];
    if (fist && head) parts.push(`fist-head ${Math.hypot(fist.x - head.x, fist.y - head.y).toFixed(0)}`);
    if (grab && ankle) parts.push(`grab-ankle ${Math.hypot(grab.x - ankle.x, grab.y - ankle.y).toFixed(0)}`);
    if (kick && chest) parts.push(`kick-chest ${Math.hypot(kick.x - chest.x, kick.y - chest.y).toFixed(0)}`);
    console.log(parts.join("  "));
  }
  const previewDir = resolve("/tmp/counter-preview");
  mkdirSync(previewDir, { recursive: true });
  const moments = [0.4, 1.5, 2.15, 2.5, 3.4, 4.38, 5.16, 6.4, 7.45, 8.15, 8.6, 9.9, 10.7, 12.7, 14.1, 15.3, 17.0, 18.5, 19.7, 20.4, 22.3, 23.1, 23.9, 24.5, 26.9, 27.12, 27.9, 28.8, 29.4, 29.85];
  const svg = sheet(runtime, moments.map((time) => ms(time)));
  const svgPath = resolve(previewDir, "sheet.svg");
  writeFileSync(svgPath, svg);
  const singles = [0.4, 1.5, 2.15, 3.4, 4.38, 5.16, 7.45, 8.6, 9.9, 10.7, 12.72, 14.1, 17, 18.6, 19.7, 22.3, 23.9, 24.5, 27.12, 27.95, 29.4];
  for (const time of singles) {
    const frame = runtime.evaluate(ms(time));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#08090e"/>${frame.drawItems.map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(previewDir, `f${time.toFixed(2)}.svg`), svg);
  }
  console.log(`preview ${svgPath}`);
  try {
    execFileSync("qlmanage", ["-t", "-s", "1800", "-o", previewDir, svgPath], { stdio: "ignore" });
  } catch {
    console.log("qlmanage preview skipped");
  }
}

main();
