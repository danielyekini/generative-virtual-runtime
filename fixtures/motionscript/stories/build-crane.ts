/**
 * Builds fixtures/motionscript/stories/a-crane-then-a-square.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-crane.ts
 *
 * Thirty-five seconds. One square sheet, ivory on the face that starts up and
 * muted blue on the reverse. Folds are hinge rotations, so each panel keeps its
 * edge lengths; the collapse is projected back onto those lengths. Unfolding
 * plays the same hinges backward. MotionScript has no audio — the score is comments.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";

const DURATION = 35;
const VIEW_W = 1280;
const VIEW_H = 720;
const CX = 640;
const CY = 378;

type V3 = [number, number, number];
type V2 = [number, number];

const IVORY = "linear (160, 40) (1040, 700) 0 #f6f0e2 0.48 #efe3d0 1 #e4d5c0";
const BLUE = "linear (160, 40) (1040, 700) 0 #9aafba 0.5 #7c96a4 1 #688496";
const IVORY_EDGE = "#d5c9b6";
const BLUE_EDGE = "#5d7584";
const CREASE = "#8a7d6c";
const OCHRE = "#c4923a";
const SHADOW = "#2a261f";

const H = Math.SQRT1_2;

const REST: Record<string, V3> = {
  TL: [-1, 1, 0],
  T: [0, 1, 0],
  TR: [1, 1, 0],
  L: [-1, 0, 0],
  C: [0, 0, 0],
  R: [1, 0, 0],
  BL: [-1, -1, 0],
  B: [0, -1, 0],
  BR: [1, -1, 0],
};
const NAMES = Object.keys(REST);

const COARSE: [string, string, string][] = [
  ["TL", "T", "C"],
  ["T", "TR", "C"],
  ["TR", "R", "C"],
  ["R", "BR", "C"],
  ["BR", "B", "C"],
  ["B", "BL", "C"],
  ["BL", "L", "C"],
  ["L", "TL", "C"],
];

function edgesOf(tris: readonly (readonly string[])[]): [string, string, number][] {
  const seen = new Set<string>();
  const edges: [string, string, number][] = [];
  for (const tri of tris) {
    for (let i = 0; i < tri.length; i++) {
      const a = tri[i]!;
      const b = tri[(i + 1) % tri.length]!;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b, dist(REST[a]!, REST[b]!)]);
    }
  }
  return edges;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const COARSE_EDGES = edgesOf(COARSE);
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp = (a: V3, b: V3, u: number): V3 => add(mul(a, 1 - u), mul(b, u));
const clonePose = (pose: Record<string, V3>) => {
  const out: Record<string, V3> = {};
  for (const name of Object.keys(pose)) out[name] = [...pose[name]!] as V3;
  return out;
};

function rotAround(p: V3, origin: V3, axis: V3, angle: number): V3 {
  if (Math.abs(angle) < 1e-8) return [...p] as V3;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const v = sub(p, origin);
  const k = norm(axis);
  const cr = cross(k, v);
  return add(origin, add(add(mul(v, c), mul(cr, s)), mul(k, dot(k, v) * (1 - c))));
}

function smoother(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}
function span(t: number, a: number, b: number): number {
  if (b <= a) return t >= b ? 1 : 0;
  return smoother((t - a) / (b - a));
}
function hold(t: number, a0: number, a1: number, b0: number, b1: number): number {
  if (t <= a0 || t >= b1) return 0;
  if (t < a1) return span(t, a0, a1);
  if (t < b0) return 1;
  return 1 - span(t, b0, b1);
}
function lobe(t: number, a: number, mid: number, b: number): number {
  if (t <= a || t >= b) return 0;
  if (t < mid) return span(t, a, mid);
  return 1 - span(t, mid, b);
}

function hinge(flat: Record<string, V3>, axisA: V3, axisB: V3, movers: readonly string[], angle: number): Record<string, V3> {
  const pose = clonePose(flat);
  const axis = sub(axisB, axisA);
  for (const name of movers) pose[name] = rotAround(flat[name]!, axisA, axis, angle);
  return pose;
}

function liftSign(flat: Record<string, V3>, axisA: V3, axisB: V3, mover: string): number {
  const spun = rotAround(flat[mover]!, axisA, sub(axisB, axisA), 0.4);
  return spun[2] >= flat[mover]![2] ? 1 : -1;
}

function liftOffTable(pose: Record<string, V3>, names: readonly string[], clearance = 0): void {
  let minZ = Infinity;
  for (const name of names) minZ = Math.min(minZ, pose[name]![2]);
  const lift = clearance - minZ;
  if (lift > 0) for (const name of names) pose[name]![2] += lift;
}

function projectEdges(pose: Record<string, V3>, edges: readonly [string, string, number][], passes: number): void {
  for (let pass = 0; pass < passes; pass++) {
    for (const [a, b, rest] of edges) {
      const delta = sub(pose[b]!, pose[a]!);
      const d = len(delta) || 1e-8;
      const corr = mul(delta, (0.5 * (d - rest)) / d);
      pose[a] = add(pose[a]!, corr);
      pose[b] = sub(pose[b]!, corr);
    }
  }
}

function maxEdgeError(pose: Record<string, V3>, edges: readonly [string, string, number][]): number {
  let worst = 0;
  for (const [a, b, rest] of edges) worst = Math.max(worst, Math.abs(dist(pose[a]!, pose[b]!) - rest) / rest);
  return worst;
}

function applyFlip(pose: Record<string, V3>, angle: number): void {
  const origin: V3 = [0, 0, 0];
  const axis: V3 = [1, 0, 0];
  for (const name of NAMES) pose[name] = rotAround(pose[name]!, origin, axis, angle);
  liftOffTable(pose, NAMES, 0);
}

function flippedFlat(): Record<string, V3> {
  const pose = clonePose(REST);
  applyFlip(pose, Math.PI);
  return pose;
}

function flipAngle(t: number): number {
  if (t < 2.02) return 0;
  if (t < 2.84) return span(t, 2.02, 2.84) * Math.PI;
  if (t < 32) return Math.PI;
  if (t < 34) return (1 - span(t, 32, 34)) * Math.PI;
  return 0;
}

function turnAngle(t: number): number {
  if (t < 12) return 0;
  if (t < 12.68) return span(t, 12, 12.68) * Math.PI;
  if (t < 15.05) return Math.PI;
  if (t < 16.05) return Math.PI + (0.42 - Math.PI) * span(t, 15.05, 16.05);
  if (t < 26.45) return 0.42;
  if (t < 27.15) return 0.42 + (Math.PI - 0.42) * span(t, 26.45, 27.15);
  if (t < 27.85) return Math.PI;
  if (t < 28.45) return (1 - span(t, 27.85, 28.45)) * Math.PI;
  return 0;
}

const FLAT_FLIP = flippedFlat();
const HORIZ_MOVERS = NAMES.filter((name) => FLAT_FLIP[name]![1] > 0.04);
const VERT_MOVERS = NAMES.filter((name) => FLAT_FLIP[name]![0] > 0.04);
const HORIZ_SIGN = liftSign(FLAT_FLIP, FLAT_FLIP.L!, FLAT_FLIP.R!, HORIZ_MOVERS[0]!);
const VERT_AXIS_A = FLAT_FLIP.T!;
const VERT_AXIS_B = FLAT_FLIP.B!;
const VERT_SIGN = liftSign(FLAT_FLIP, VERT_AXIS_A, VERT_AXIS_B, VERT_MOVERS[0]!);
const DIAG1_SIGN = liftSign(REST, REST.BL!, REST.TR!, "BR");
const DIAG2_SIGN = liftSign(REST, REST.TL!, REST.BR!, "BL");

function creasePose(t: number): Record<string, V3> {
  const diag1 = lobe(t, 0.06, 0.46, 0.9);
  if (diag1 > 0) return hinge(REST, REST.BL!, REST.TR!, ["BR", "R", "B"], diag1 * Math.PI * DIAG1_SIGN);
  const diag2 = lobe(t, 1.02, 1.42, 1.86);
  if (diag2 > 0) return hinge(REST, REST.TL!, REST.BR!, ["BL", "L", "B"], diag2 * Math.PI * DIAG2_SIGN);
  const flip = flipAngle(t);
  if (t < 3) {
    const pose = clonePose(REST);
    applyFlip(pose, flip);
    return pose;
  }
  const horiz = lobe(t, 3.02, 3.42, 3.86);
  if (horiz > 0) return hinge(FLAT_FLIP, FLAT_FLIP.L!, FLAT_FLIP.R!, HORIZ_MOVERS, horiz * Math.PI * HORIZ_SIGN);
  const vert = lobe(t, 4.02, 4.42, 4.86);
  if (vert > 0) return hinge(FLAT_FLIP, VERT_AXIS_A, VERT_AXIS_B, VERT_MOVERS, vert * Math.PI * VERT_SIGN);
  const pose = clonePose(REST);
  applyFlip(pose, flip);
  return pose;
}

const DIAMOND: Record<string, V3> = {
  C: [0, H, 0],
  TL: [0, -H, 0],
  TR: [0, -H, 0],
  BL: [0, -H, 0],
  BR: [0, -H, 0],
  T: [H, 0, 0],
  R: [H, 0, 0],
  B: [-H, 0, 0],
  L: [-H, 0, 0],
};

function collapseLift(name: string): number {
  if (name === "L" || name === "R") return 1.05;
  if (name === "TL" || name === "TR") return 0.82;
  if (name === "BL" || name === "BR") return 0.48;
  if (name === "T") return 0.42;
  if (name === "B") return 0.28;
  return 0.16;
}

function integrateCollapse(): Record<string, V3>[] {
  const frames: Record<string, V3>[] = [];
  let pose = clonePose(FLAT_FLIP);
  const steps = 72;
  frames.push(clonePose(pose));
  let worst = 0;
  for (let step = 1; step <= steps; step++) {
    const u = step / steps;
    const e = smoother(u);
    const goal: Record<string, V3> = {};
    for (const name of NAMES) {
      const from = FLAT_FLIP[name]!;
      const to = DIAMOND[name]!;
      goal[name] = [from[0] * (1 - e) + to[0] * e, from[1] * (1 - e) + to[1] * e, Math.sin(Math.PI * e) * collapseLift(name)];
    }
    for (const name of NAMES) pose[name] = add(mul(pose[name]!, 0.42), mul(goal[name]!, 0.58));
    projectEdges(pose, COARSE_EDGES, 48);
    liftOffTable(pose, NAMES, 0);
    worst = Math.max(worst, maxEdgeError(pose, COARSE_EDGES));
    frames.push(clonePose(pose));
  }
  if (worst > 0.02) throw new Error(`collapse stretched ${(worst * 100).toFixed(2)}%`);
  if (maxEdgeError(frames[frames.length - 1]!, COARSE_EDGES) > 1e-3) {
    throw new Error("collapsed base does not land on the diamond");
  }
  return frames;
}

const COLLAPSE = integrateCollapse();

function collapsePose(u: number): Record<string, V3> {
  const x = Math.min(1, Math.max(0, u)) * (COLLAPSE.length - 1);
  const i = Math.min(COLLAPSE.length - 2, Math.floor(x));
  const f = x - i;
  const a = COLLAPSE[i]!;
  const b = COLLAPSE[i + 1] ?? a;
  const pose: Record<string, V3> = {};
  for (const name of NAMES) pose[name] = lerp(a[name]!, b[name]!, f);
  return pose;
}

function sheetAt(t: number): Record<string, V3> {
  if (t < 4.92) return creasePose(t);
  if (t < 29) {
    const u = t < 5 ? 0 : t < 8 ? smoother((t - 5) / 3) : 1;
    return collapsePose(u);
  }
  if (t < 32) return collapsePose(1 - span(t, 29, 32));
  return creasePose(t);
}

type MeshName = "Top" | "Wr" | "Wl" | "Hr" | "Hl" | "Qr" | "Ql" | "Tip";
const MESH: MeshName[] = ["Top", "Wr", "Wl", "Hr", "Hl", "Qr", "Ql", "Tip"];

const SHOULDER = 0.46;
const NECK = 0.52;
const TOP_D: V3 = [0, H, 0];
const WR_D: V3 = [H, 0, 0];
const WL_D: V3 = [-H, 0, 0];
const TIP_D: V3 = [0, -H, 0];
const HR_D = lerp(WR_D, TIP_D, SHOULDER);
const HL_D = lerp(WL_D, TIP_D, SHOULDER);
const QR_D = lerp(HR_D, TIP_D, NECK);
const QL_D = lerp(HL_D, TIP_D, NECK);

const FLAP_REST: Record<MeshName, V3> = {
  Top: TOP_D,
  Wr: WR_D,
  Wl: WL_D,
  Hr: HR_D,
  Hl: HL_D,
  Qr: QR_D,
  Ql: QL_D,
  Tip: TIP_D,
};

const FLAP_TRIS: [MeshName, MeshName, MeshName][] = [
  ["Top", "Wr", "Hr"],
  ["Top", "Hr", "Hl"],
  ["Top", "Hl", "Wl"],
  ["Hr", "Qr", "Hl"],
  ["Hl", "Qr", "Ql"],
  ["Qr", "Tip", "Ql"],
];

function barycentric(point: V2, a: V2, b: V2, c: V2): V3 {
  const v0: V2 = [b[0] - a[0], b[1] - a[1]];
  const v1: V2 = [c[0] - a[0], c[1] - a[1]];
  const v2: V2 = [point[0] - a[0], point[1] - a[1]];
  const dot2 = (p: V2, q: V2) => p[0] * q[0] + p[1] * q[1];
  const d00 = dot2(v0, v0);
  const d01 = dot2(v0, v1);
  const d11 = dot2(v1, v1);
  const d20 = dot2(v2, v0);
  const d21 = dot2(v2, v1);
  const denom = d00 * d11 - d01 * d01 || 1;
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  return [1 - v - w, v, w];
}

function originalOf(diamond: V3, side: "R" | "L", layer: "front" | "back"): V3 {
  const b = side === "R"
    ? barycentric([diamond[0], diamond[1]], [TOP_D[0], TOP_D[1]], [WR_D[0], WR_D[1]], [TIP_D[0], TIP_D[1]])
    : barycentric([diamond[0], diamond[1]], [TOP_D[0], TOP_D[1]], [WL_D[0], WL_D[1]], [TIP_D[0], TIP_D[1]]);
  if (side === "R" && layer === "front") return add(add(mul(REST.C!, b[0]), mul(REST.T!, b[1])), mul(REST.TL!, b[2]));
  if (side === "L" && layer === "front") return add(add(mul(REST.C!, b[0]), mul(REST.L!, b[1])), mul(REST.TL!, b[2]));
  if (side === "R") return add(add(mul(REST.C!, b[0]), mul(REST.R!, b[1])), mul(REST.BR!, b[2]));
  return add(add(mul(REST.C!, b[0]), mul(REST.B!, b[1])), mul(REST.BL!, b[2]));
}

function parentOf(original: V3, layer: "front" | "back", side: "R" | "L"): { names: [string, string, string]; weights: V3 } {
  const names: [string, string, string] =
    layer === "front"
      ? side === "R"
        ? ["C", "T", "TL"]
        : ["C", "L", "TL"]
      : side === "R"
        ? ["C", "R", "BR"]
        : ["C", "B", "BL"];
  const [n0, n1, n2] = names;
  const weights = barycentric(
    [original[0], original[1]],
    [REST[n0]![0], REST[n0]![1]],
    [REST[n1]![0], REST[n1]![1]],
    [REST[n2]![0], REST[n2]![1]],
  );
  return { names, weights };
}

type Anchor = { names: [string, string, string]; weights: V3; side: "R" | "L" };

function anchorsFor(layer: "front" | "back"): Record<MeshName, Anchor> {
  const out = {} as Record<MeshName, Anchor>;
  for (const name of MESH) {
    const diamond = FLAP_REST[name];
    const side: "R" | "L" = diamond[0] >= -1e-4 || name === "Top" || name === "Tip" ? (name === "Wl" || name === "Hl" || name === "Ql" ? "L" : name === "Tip" || name === "Top" ? "R" : "R") : "L";
    const resolved: "R" | "L" = name === "Wl" || name === "Hl" || name === "Ql" ? "L" : "R";
    const original = originalOf(diamond, resolved, layer);
    const parent = parentOf(original, layer, resolved);
    out[name] = { ...parent, side: resolved };
  }
  return out;
}

const FRONT_ANCHOR = anchorsFor("front");
const BACK_ANCHOR = anchorsFor("back");

function anchored(sheet: Record<string, V3>, anchor: Anchor, z: number): V3 {
  const [a, b, c] = anchor.names;
  const w = anchor.weights;
  const point = add(add(mul(sheet[a]!, w[0]), mul(sheet[b]!, w[1])), mul(sheet[c]!, w[2]));
  point[2] += z;
  return point;
}

const FRONT_Z = 0.034;
const INNER_A_Z = 0.02;
const INNER_B_Z = 0.011;
const BACK_Z = 0.003;

type Angles = { wing: number; tip: number; head: number; narrow: number; flap: number; lateral: number; cover: number };

function coverAngle(t: number): number {
  if (t < 8 || t >= 29) return 0;
  if (t < 8.7) return smoother(span(t, 8, 8.7)) * Math.PI;
  if (t < 28.2) return Math.PI;
  return (1 - smoother(span(t, 28.2, 29))) * Math.PI;
}

function motionLive(t: number, angles: Angles): boolean {
  if (t < 8 || t >= 29) return false;
  return Math.abs(angles.wing) + Math.abs(angles.tip) + Math.abs(angles.head) + Math.abs(angles.narrow) + Math.abs(angles.flap) + Math.abs(angles.lateral) + Math.abs(angles.cover) > 1e-3;
}

function frontAngles(t: number): Angles {
  const prep = lobe(t, 9.02, 9.62, 10.15);
  const upper = lobe(t, 9.62, 10.22, 10.82);
  const reopen = t >= 10.15 && t < 11.05 ? 1 - span(t, 10.15, 11.05) : t < 10.15 ? 1 : 0;
  const open = span(t, 11.05, 11.5);
  const shut = span(t, 11.5, 12);
  let wing = prep * reopen * 1.15 + upper * reopen * -0.15;
  let tip = upper * reopen * 0.7;
  if (t >= 11.05 && t < 12) {
    wing = shut * 1.85;
    tip = open * (1 - shut) * -1.25 + shut * -0.28;
  }
  const petalHold = t >= 12 && t < 28.25 ? 1 : t >= 28.25 && t < 29 ? 1 - span(t, 28.25, 29) : 0;
  if (t >= 12) {
    wing = petalHold * 1.85;
    tip = petalHold * -0.28;
  }
  const narrow = hold(t, 15.05, 16.7, 25.7, 26.45);
  const neck = hold(t, 17.02, 17.72, 25.05, 25.7);
  const head = hold(t, 18.42, 19.02, 24.45, 25.05);
  const spread = hold(t, 19.05, 20, 24.02, 24.48);
  let flap = 0;
  if (t >= 20.32 && t < 23.05) {
    const u = (t - 20.32) / (23.05 - 20.32);
    flap = Math.max(0, Math.sin(u * 4 * Math.PI));
  }
  const posedWing = wing * (1 - spread) + spread * 0.2;
  return { wing: posedWing, tip: tip + neck * 1.7, head: -head, narrow, flap, lateral: neck * -1.05, cover: coverAngle(t) };
}

function backAngles(t: number): Angles {
  const prep = lobe(t, 12.7, 13.22, 13.7);
  const upper = lobe(t, 13.22, 13.72, 14.18);
  const reopen = t >= 13.7 && t < 14.18 ? 1 - span(t, 13.7, 14.18) : t < 13.7 ? 1 : 0;
  let wing = prep * reopen * 1.15;
  let tip = upper * reopen * 0.65;
  const open = span(t, 14.18, 14.55);
  const shut = span(t, 14.55, 15);
  if (t >= 14.18 && t < 15) {
    wing = shut * 1.72;
    tip = open * (1 - shut) * -1.15 + shut * -0.22;
  }
  const petalHold = t >= 15 && t < 26.5 ? 1 : t >= 26.5 && t < 27.55 ? 1 - span(t, 26.5, 27.55) : 0;
  if (t >= 15) {
    wing = petalHold * 1.72;
    tip = petalHold * -0.22;
  }
  const narrow = hold(t, 15.05, 16.7, 25.7, 26.45);
  const tail = hold(t, 17.72, 18.42, 25.05, 25.7);
  const spread = hold(t, 19.05, 20, 24.02, 24.48);
  let flap = 0;
  if (t >= 20.32 && t < 23.05) {
    const u = (t - 20.32) / (23.05 - 20.32);
    flap = Math.max(0, Math.sin(u * 4 * Math.PI));
  }
  const posedWing = wing * (1 - spread) + spread * 0.2;
  return { wing: -posedWing, tip: tip + tail * 1.7, head: 0, narrow, flap, lateral: tail * 1.05, cover: 0 };
}

const WING_AXIS_SIGN = liftSign(
  { Wr: FLAP_REST.Wr, Top: FLAP_REST.Top, Hr: FLAP_REST.Hr },
  FLAP_REST.Top,
  FLAP_REST.Hr,
  "Wr",
);
const TIP_AXIS_SIGN = liftSign(
  { Tip: FLAP_REST.Tip, Hl: FLAP_REST.Hl, Hr: FLAP_REST.Hr },
  FLAP_REST.Hl,
  FLAP_REST.Hr,
  "Tip",
);

function articulate(restZ: number, angles: Angles, mirror: number): Record<MeshName, V3> {
  const pose = {} as Record<MeshName, V3>;
  for (const name of MESH) pose[name] = [FLAP_REST[name][0] * mirror, FLAP_REST[name][1], FLAP_REST[name][2] + restZ];
  if (Math.abs(angles.cover) > 1e-4) {
    for (const name of MESH) pose[name] = rotAround(pose[name], [0, 0, restZ], [0, 1, 0], angles.cover);
  }
  const coverSign = Math.cos(angles.cover) >= 0 ? 1 : -1;
  const wing = (angles.wing + angles.flap * 1.7) * WING_AXIS_SIGN * mirror * coverSign;
  pose.Wr = rotAround(pose.Wr, pose.Top, sub(pose.Hr, pose.Top), wing);
  pose.Wl = rotAround(pose.Wl, pose.Top, sub(pose.Hl, pose.Top), wing);
  const pinch = angles.narrow * 0.55;
  if (pinch > 0) {
    const mid = mul(add(pose.Hr, pose.Hl), 0.5);
    const axis = sub(pose.Tip, mid);
    pose.Qr = rotAround(pose.Qr, mid, axis, pinch * mirror);
    pose.Ql = rotAround(pose.Ql, mid, axis, -pinch * mirror);
    const goal = clonePose(pose);
    const edges: [string, string, number][] = [];
    const seen = new Set<string>();
    for (const tri of FLAP_TRIS) {
      for (let i = 0; i < 3; i++) {
        const a = tri[i]!;
        const b = tri[(i + 1) % 3]!;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([a, b, dist(FLAP_REST[a], FLAP_REST[b])]);
      }
    }
    for (let pass = 0; pass < 18; pass++) {
      for (const [a, b, rest] of edges) {
        const delta = sub(goal[b]!, goal[a]!);
        const d = len(delta) || 1e-8;
        const corr = mul(delta, (0.5 * (d - rest)) / d);
        goal[a] = add(goal[a]!, corr);
        goal[b] = sub(goal[b]!, corr);
      }
      goal.Top = [...pose.Top] as V3;
    }
    for (const name of MESH) pose[name] = goal[name]!;
  }
  const tipAngle = angles.tip * TIP_AXIS_SIGN * coverSign;
  const movers: MeshName[] = ["Ql", "Qr", "Tip"];
  for (const name of movers) pose[name] = rotAround(pose[name], pose.Hl, sub(pose.Hr, pose.Hl), tipAngle);
  if (Math.abs(angles.lateral) > 1e-4) {
    const mid = mul(add(pose.Hr, pose.Hl), 0.5);
    for (const name of movers) pose[name] = rotAround(pose[name], mid, [0, 0, 1], angles.lateral * mirror);
  }
  const head = angles.head * TIP_AXIS_SIGN * coverSign;
  pose.Tip = rotAround(pose.Tip, pose.Ql, sub(pose.Qr, pose.Ql), head);
  const flex = angles.flap * 0.16;
  if (flex > 0) {
    const mid = pose.Top;
    for (const name of MESH) pose[name] = rotAround(pose[name], mid, [1, 0, 0], -flex * TIP_AXIS_SIGN * coverSign);
  }
  return pose;
}

function orientModel(point: V3, t: number): V3 {
  const yaw = turnAngle(t);
  let p = rotAround(point, [0, 0, 0], [0, 1, 0], yaw);
  const hover = hoverAt(t);
  p = add(p, [0, hover * 0.08, hover]);
  if (t >= 32 && t < 34) {
    const u = span(t, 32, 34);
    p = add(p, [0, 0, Math.sin(Math.PI * (1 - u)) * 0.045]);
  }
  return p;
}

function hoverAt(t: number): number {
  if (t < 20 || t >= 24) return 0;
  if (t < 20.4) return span(t, 20, 20.4) * 0.24;
  if (t < 23.05) return 0.24 + Math.sin(((t - 20.4) / 2.65) * Math.PI) * 0.05;
  return 0.24 * (1 - span(t, 23.05, 24));
}

type View = { pitch: number; yaw: number; zoom: number };

function viewAt(t: number): View {
  const pitch =
    (t < 5 ? 0 : t < 6.4 ? span(t, 5, 6.4) * 0.58 : t < 19.2 ? 0.58 : t < 20.3 ? 0.58 + span(t, 19.2, 20.3) * 0.16 : t < 24 ? 0.74 : t < 26.4 ? 0.74 + (0.56 - 0.74) * span(t, 24, 26.4) : t < 29 ? 0.56 : t < 32.2 ? 0.56 * (1 - span(t, 29, 32.2)) : 0);
  const yaw =
    (t < 15 ? 0 : t < 18.2 ? span(t, 15, 18.2) * 0.34 : t < 20 ? 0.34 + (0.22 - 0.34) * span(t, 18.2, 20) : t < 20.5 ? 0.22 + span(t, 20, 20.5) * 0.38 : t < 24 ? 0.6 : t < 26.5 ? 0.6 + (0.12 - 0.6) * span(t, 24, 26.5) : t < 29 ? 0.12 * (1 - span(t, 26.5, 29)) : 0);
  const zoom =
    (t < 5 ? 0.9 : t < 6.6 ? 0.9 + span(t, 5, 6.6) * 0.16 : t < 9 ? 1.06 : t < 11 ? 1.06 + span(t, 9, 11) * 0.08 : t < 19 ? 1.14 : t < 20.4 ? 1.14 + span(t, 19, 20.4) * 0.28 : t < 24 ? 1.42 : t < 29 ? 1.42 + (1.08 - 1.42) * span(t, 24, 29) : t < 32.4 ? 1.08 + (0.9 - 1.08) * span(t, 29, 32.4) : 0.9);
  return { pitch, yaw, zoom };
}

function project(point: V3, view: View): { x: number; y: number; depth: number } {
  const cyaw = Math.cos(view.yaw);
  const syaw = Math.sin(view.yaw);
  const x1 = point[0] * cyaw + point[2] * syaw;
  const z1 = -point[0] * syaw + point[2] * cyaw;
  const y1 = point[1];
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const dist = 7.2;
  const f = dist / (dist - z2);
  const scale = 176 * view.zoom;
  return { x: CX + x1 * f * scale, y: CY - y2 * f * scale, depth: -z2 };
}

function towardCamera(view: View): V3 {
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const cyaw = Math.cos(view.yaw);
  const syaw = Math.sin(view.yaw);
  return [-cp * syaw, sp, cp * cyaw];
}

type TriSpec = {
  id: string;
  corners: [V3, V3, V3] | null;
  points: (t: number) => [V3, V3, V3];
  role: "front" | "back" | "inner";
  ivoryPositive: boolean;
};

function triangleNormal(a: V3, b: V3, c: V3): V3 {
  return norm(cross(sub(b, a), sub(c, a)));
}

function buildSpecs(): TriSpec[] {
  const specs: TriSpec[] = [];
  const pushMesh = (layer: "front" | "back", z: number, anglesAt: (t: number) => Angles, mirror: number) => {
    const anchor = layer === "front" ? FRONT_ANCHOR : BACK_ANCHOR;
    FLAP_TRIS.forEach((tri, index) => {
      const sample = (t: number): [V3, V3, V3] => {
        const sheet = sheetAt(t);
        const useArt = layer === "front" ? frontAngles(t) : backAngles(t);
        const active = motionLive(t, useArt);
        const posed = active ? articulate(z, anglesAt(t), mirror) : null;
        const corner = (name: MeshName): V3 => {
          const point = posed ? posed[name] : anchored(sheet, anchor[name], z);
          return orientModel(point, t);
        };
        return [corner(tri[0]), corner(tri[1]), corner(tri[2])];
      };
      const at0 = sample(0);
      const n0 = triangleNormal(at0[0], at0[1], at0[2]);
      specs.push({
        id: `${layer}${index}`,
        corners: null,
        points: sample,
        role: layer,
        ivoryPositive: n0[2] >= 0,
      });
    });
  };
  pushMesh("front", FRONT_Z, frontAngles, 1);
  pushMesh("back", BACK_Z, backAngles, 1);
  const inners: { id: string; names: [string, string, string]; z: number }[] = [
    { id: "in0", names: ["T", "TR", "C"], z: INNER_A_Z },
    { id: "in1", names: ["TR", "R", "C"], z: INNER_B_Z },
    { id: "in2", names: ["BL", "L", "C"], z: INNER_A_Z },
    { id: "in3", names: ["B", "BL", "C"], z: INNER_B_Z },
  ];
  for (const inner of inners) {
    const sample = (t: number): [V3, V3, V3] => {
      const sheet = sheetAt(t);
      return inner.names.map((name) => orientModel(add(sheet[name]!, [0, 0, inner.z]), t)) as [V3, V3, V3];
    };
    const at0 = sample(0);
    specs.push({
      id: inner.id,
      corners: null,
      points: sample,
      role: "inner",
      ivoryPositive: triangleNormal(at0[0], at0[1], at0[2])[2] >= 0,
    });
  }
  return specs;
}

const SPECS = buildSpecs();

function markPoints(t: number): [V3, V3, V3] {
  const angles = frontAngles(t);
  const active = motionLive(t, angles);
  const posed = active ? articulate(FRONT_Z, angles, 1) : null;
  const sheet = sheetAt(t);
  const corner = (name: MeshName): V3 => orientModel(posed ? posed[name] : anchored(sheet, FRONT_ANCHOR[name], FRONT_Z), t);
  const tip = corner("Tip");
  const ql = corner("Ql");
  const qr = corner("Qr");
  const mix = (tipW: number, qlW: number, qrW: number): V3 => add(add(mul(tip, tipW), mul(ql, qlW)), mul(qr, qrW));
  return [mix(0.72, 0.2, 0.08), mix(0.58, 0.06, 0.36), mix(0.6, 0.34, 0.06)];
}

function creaseOn(t: number, born: number): number {
  if (t < born) return 0;
  const fade = span(t, born, born + 0.18);
  const settle = t < 32 ? 1 : 1 - span(t, 32, 34) * 0.35;
  return fade * (t >= 34 ? 0.62 : 0.78 * settle);
}

type Crease = { id: string; born: number; at: (t: number) => [V3, V3] };

function creases(): Crease[] {
  const sheetLine = (id: string, born: number, a: string, b: string): Crease => ({
    id,
    born,
    at: (t) => {
      const sheet = sheetAt(t);
      const lift = t >= 32 && t < 34 ? Math.sin(Math.PI * (1 - span(t, 32, 34))) * 0.03 : 0.008;
      return [orientModel(add(sheet[a]!, [0, 0, FRONT_Z + lift]), t), orientModel(add(sheet[b]!, [0, 0, FRONT_Z + lift]), t)];
    },
  });
  const flapLine = (id: string, born: number, layer: "front" | "back", a: MeshName, b: MeshName): Crease => ({
    id,
    born,
    at: (t) => {
      const angles = layer === "front" ? frontAngles(t) : backAngles(t);
      const z = layer === "front" ? FRONT_Z : BACK_Z;
      const active = motionLive(t, angles);
      const posed = active ? articulate(z, angles, 1) : null;
      const sheet = sheetAt(t);
      const anchor = layer === "front" ? FRONT_ANCHOR : BACK_ANCHOR;
      const point = (name: MeshName) => orientModel(posed ? posed[name] : anchored(sheet, anchor[name], z + 0.004), t);
      return [point(a), point(b)];
    },
  });
  return [
    sheetLine("cDiagA", 0.9, "BL", "TR"),
    sheetLine("cDiagB", 1.86, "TL", "BR"),
    sheetLine("cHoriz", 3.86, "L", "R"),
    sheetLine("cVert", 4.86, "T", "B"),
    flapLine("cPetalF", 11.15, "front", "Hl", "Hr"),
    flapLine("cPetalB", 14.2, "back", "Hl", "Hr"),
    flapLine("cNeck", 17.15, "front", "Ql", "Qr"),
    flapLine("cTail", 17.85, "back", "Ql", "Qr"),
    flapLine("cHead", 18.5, "front", "Ql", "Qr"),
    flapLine("cWingR", 19.15, "front", "Top", "Hr"),
    flapLine("cWingL", 19.15, "front", "Top", "Hl"),
  ];
}

const CREASES = creases();

function modelUp(t: number): V3 {
  const flipped = rotAround([0, 0, 1], [0, 0, 0], [1, 0, 0], flipAngle(t));
  return rotAround(flipped, [0, 0, 0], [0, 1, 0], turnAngle(t));
}

function bankIsHighFront(t: number, _view: View): boolean {
  return Math.cos(turnAngle(t)) >= 0;
}

type Pt = { x: number; y: number };
type Sample = { t: number; pts: Pt[]; show: boolean };

function facing(normal: V3, view: View, ivoryPositive: boolean): number {
  const toward = dot(normal, towardCamera(view));
  const ivory = ivoryPositive ? toward : -toward;
  if (ivory > 0.07) return 1;
  if (ivory < -0.07) return -1;
  return 0;
}

function decimate(samples: Sample[]): Sample[] {
  if (samples.length < 3) return samples;
  const keep = [samples[0]!];
  for (let i = 1; i < samples.length - 1; i++) {
    const prev = keep[keep.length - 1]!;
    const cur = samples[i]!;
    const next = samples[i + 1]!;
    if (cur.show !== prev.show) {
      keep.push(cur);
      continue;
    }
    const spanT = next.t - prev.t || 1;
    const u = (cur.t - prev.t) / spanT;
    let deviate = 0;
    for (let p = 0; p < cur.pts.length; p++) {
      const a = prev.pts[p]!;
      const b = next.pts[p]!;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      deviate = Math.max(deviate, Math.hypot(cur.pts[p]!.x - x, cur.pts[p]!.y - y));
    }
    if (deviate > 1.15 || next.t - prev.t > 0.55) keep.push(cur);
  }
  keep.push(samples[samples.length - 1]!);
  const unique: Sample[] = [];
  for (const sample of keep) {
    const prev = unique[unique.length - 1];
    if (prev && Math.abs(prev.t - sample.t) < 1e-3) unique[unique.length - 1] = sample;
    else unique.push(sample);
  }
  if (unique[0]!.t > 0) unique.unshift({ ...unique[0]!, t: 0 });
  if (unique[unique.length - 1]!.t < DURATION) unique.push({ ...unique[unique.length - 1]!, t: DURATION });
  return unique;
}

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}
function pct(t: number): string {
  if (t <= 0) return "0%";
  if (t >= DURATION) return "100%";
  const text = ((t / DURATION) * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function pathCommands(pts: Pt[], close: boolean): string {
  const body = pts.map((point, index) => `${index === 0 ? "move" : "line"} (${num(point.x)}, ${num(point.y)});`).join(" ");
  return `${body}${close ? " close;" : ""}`;
}
function pathOf(pts: Pt[], close: boolean): string {
  return `path { ${pathCommands(pts, close)} }`;
}

function track(id: string, samples: Sample[], close: boolean): string {
  const keys = decimate(samples);
  const lines = keys.map((sample) => `  ${pct(sample.t)} ${pathOf(sample.pts, close)};`);
  return `keyframes ${id}.commands {\n  start 0s;\n  duration ${DURATION}s;\n${lines.join("\n")}\n};`;
}

function stepsFor(id: string, samples: Sample[], initial: boolean): { visible: boolean; steps: string } {
  let visible = initial;
  const steps: string[] = [];
  let cursor = initial;
  for (const sample of samples) {
    if (sample.show === cursor) continue;
    cursor = sample.show;
    const ms = Math.round(sample.t * 1000);
    steps.push(`step ${id}.visible { at ${ms}ms; value ${sample.show ? "true" : "false"}; };`);
  }
  return { visible, steps };
}

function opacityTrack(id: string, keys: { t: number; v: number }[]): string {
  const lines = keys.map((key) => `  ${pct(key.t)} ${num(key.v)};`);
  return `keyframes ${id}.opacity {\n  start 0s;\n  duration ${DURATION}s;\n${lines.join("\n")}\n};`;
}

function vecTrack(id: string, channel: string, keys: { t: number; x: number; y: number }[]): string {
  const lines = keys.map((key) => `  ${pct(key.t)} (${num(key.x)}, ${num(key.y)});`);
  return `keyframes ${id}.${channel} {\n  start 0s;\n  duration ${DURATION}s;\n${lines.join("\n")}\n};`;
}

function numTrack(id: string, channel: string, keys: { t: number; v: number }[]): string {
  const lines = keys.map((key) => `  ${pct(key.t)} ${num(key.v)};`);
  return `keyframes ${id}.${channel} {\n  start 0s;\n  duration ${DURATION}s;\n${lines.join("\n")}\n};`;
}

function roleZ(role: TriSpec["role"], highFront: boolean): number {
  if (highFront) {
    if (role === "back") return 12;
    if (role === "inner") return 24;
    return 36;
  }
  if (role === "front") return 12;
  if (role === "inner") return 24;
  return 36;
}

function emit(): string {
  const times: number[] = [];
  for (let i = 0; i <= DURATION * 10; i++) times.push(i / 10);
  const viewOf = times.map((t) => viewAt(t));
  const highFront = times.map((t, i) => bankIsHighFront(t, viewOf[i]!));
  const nodes: string[] = [];
  const tracks: string[] = [];
  const steps: string[] = [];

  nodes.push(`rectangle table {
  position (0, 0);
  size (1280, 720);
  fill linear (120, 20) (1160, 700) 0 #e7e0d6 0.42 #d7d0c6 1 #c8c1b6;
  zIndex 0;
};`);
  nodes.push(`ellipse lamp {
  position (40, 10);
  size (980, 640);
  opacity 0.42;
  fill radial (280, 180) 460 0 #f8f3ea99 1 #f8f3ea00;
  zIndex 1;
};`);
  nodes.push(`ellipse ground {
  position (640, 430);
  size (1, 1);
  opacity 0.2;
  fill #2a261f;
  zIndex 2;
};`);

  const groundKeys: { t: number; x: number; y: number }[] = [];
  const groundSize: { t: number; x: number; y: number }[] = [];
  const groundOpacity: { t: number; v: number }[] = [];
  for (const t of times) {
    const view = viewAt(t);
    const sheet = sheetAt(t);
    let sx = 0;
    let sy = 0;
    let n = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const name of NAMES) {
      const p = orientModel(sheet[name]!, t);
      const foot = project([p[0], p[1], 0], view);
      sx += foot.x;
      sy += foot.y;
      n += 1;
      minX = Math.min(minX, foot.x);
      maxX = Math.max(maxX, foot.x);
      minY = Math.min(minY, foot.y);
      maxY = Math.max(maxY, foot.y);
    }
    const hover = hoverAt(t);
    const stacked = t >= 8 && t < 29 ? 0.72 : 1;
    groundKeys.push({ t, x: sx / n, y: sy / n + 18 + hover * 10 });
    groundSize.push({
      t,
      x: Math.max(120, (maxX - minX) * (1.05 + hover * 1.4) * stacked),
      y: Math.max(36, (maxY - minY) * 0.22 * (1 + hover * 1.8) + 28),
    });
    const tight = t >= 8 && t < 20 ? 0.34 : 0.22;
    groundOpacity.push({ t, v: Math.max(0.08, tight * (1 - hover * 1.6)) });
  }
  tracks.push(vecTrack("ground", "position", decimateVec(groundKeys)));
  tracks.push(vecTrack("ground", "scale", decimateVec(groundSize)));
  tracks.push(numTrack("ground", "opacity", decimateNum(groundOpacity)));

  SPECS.forEach((spec, specIndex) => {
    for (const bank of ["hi", "lo"] as const) {
      for (const face of ["ivory", "blue"] as const) {
        const id = `${spec.id}${bank}${face === "ivory" ? "F" : "B"}`;
        const samples: Sample[] = times.map((t, i) => {
          const tri = spec.points(t);
          const normal = triangleNormal(tri[0], tri[1], tri[2]);
          const faceCode = facing(normal, viewOf[i]!, spec.ivoryPositive);
          const wantFace = face === "ivory" ? faceCode === 1 : faceCode === -1;
          const high = highFront[i]!;
          const bankOn = bank === "hi" ? high : !high;
          const pts = tri.map((point) => {
            const projected = project(point, viewOf[i]!);
            return { x: projected.x, y: projected.y };
          });
          return { t, pts, show: wantFace && bankOn };
        });
        const dwell = dwellShow(samples);
        const declared = stepsFor(id, dwell, dwell[0]?.show ?? false);
        const z = roleZ(spec.role, bank === "hi") + specIndex + (face === "ivory" ? 1 : 0);
        const fill = face === "ivory" ? IVORY : BLUE;
        const edge = face === "ivory" ? IVORY_EDGE : BLUE_EDGE;
        nodes.push(`path ${id} {
  zIndex ${z};
  opacity 1;
  visible ${declared.visible};
  fill ${fill};
  stroke ${edge} width 1.15 cap round join round;
  ${pathCommands(dwell[0]!.pts, true)}
};`);
        tracks.push(track(id, dwell, true));
        steps.push(declared.steps.join("\n"));
        if (face === "ivory") {
          const shade = `${spec.id}${bank}S`;
          const shadeSamples: Sample[] = dwell.map((sample, index) => {
            const source = times[Math.min(times.length - 1, Math.round(sample.t * 10))] ?? sample.t;
            void index;
            const tri = spec.points(sample.t);
            const lift = Math.max(...tri.map((point) => point[2]));
            const shift = 11 + lift * 34;
            return {
              t: sample.t,
              show: sample.show || dwellShow(samples).some((item) => Math.abs(item.t - sample.t) < 1e-6 && item.show),
              pts: sample.pts.map((point) => ({ x: point.x + shift, y: point.y + shift * 0.72 })),
            };
          });
          const shadeShow = dwell.map((sample) => ({ ...sample, show: samples[Math.round(sample.t * 10)] ? facing(triangleNormal(...spec.points(sample.t)), viewAt(sample.t), spec.ivoryPositive) !== 0 && ((bank === "hi") === bankIsHighFront(sample.t, viewAt(sample.t))) : sample.show }));
          const shadeDecl = stepsFor(shade, shadeShow, shadeShow[0]?.show ?? false);
          nodes.push(`path ${shade} {
  zIndex ${Math.max(3, z - 2)};
  opacity ${spec.role === "front" ? 0.22 : 0.14};
  visible ${shadeDecl.visible};
  fill ${SHADOW};
  ${pathCommands(shadeShow[0]!.pts, true)}
};`);
          tracks.push(track(shade, shadeShow, true));
          steps.push(shadeDecl.steps.join("\n"));
          void shadeSamples;
        }
      }
    }
  });

  for (const crease of CREASES) {
    const id = crease.id;
    const samples: Sample[] = times.map((t) => {
      const [a, b] = crease.at(t);
      const view = viewAt(t);
      const pa = project(a, view);
      const pb = project(b, view);
      return { t, pts: [{ x: pa.x, y: pa.y }, { x: pb.x, y: pb.y }], show: creaseOn(t, crease.born) > 0.04 };
    });
    const keys = decimate(samples);
    nodes.push(`path ${id} {
  zIndex 48;
  opacity ${num(creaseOn(0, crease.born))};
  stroke ${CREASE} width 1.35 cap round join round;
  ${pathCommands(keys[0]!.pts, false)}
};`);
    tracks.push(track(id, keys, false));
    const opacityKeys = decimateNum(times.map((t) => ({ t, v: creaseOn(t, crease.born) })));
    tracks.push(opacityTrack(id, opacityKeys));
  }

  for (const bank of ["hi", "lo"] as const) {
    const id = `ochre${bank}`;
    const samples: Sample[] = times.map((t) => {
      const pts3 = markPoints(t);
      const view = viewAt(t);
      const normal = triangleNormal(pts3[0], pts3[1], pts3[2]);
      const ivory = dot(normal, towardCamera(view)) > 0.05;
      const high = bankIsHighFront(t, view);
      const pts = pts3.map((point) => {
        const projected = project(point, view);
        return { x: projected.x, y: projected.y };
      });
      return { t, pts, show: ivory && (bank === "hi" ? high : !high) };
    });
    const dwell = dwellShow(samples);
    const declared = stepsFor(id, dwell, dwell[0]?.show ?? false);
    nodes.push(`path ${id} {
  zIndex ${bank === "hi" ? 47 : 20};
  visible ${declared.visible};
  fill ${OCHRE};
  stroke ${OCHRE} width 0.6 cap round join round;
  ${pathCommands(dwell[0]!.pts, true)}
};`);
    tracks.push(track(id, dwell, true));
    steps.push(declared.steps.join("\n"));
  }

  const body = [
    `// A CRANE, THEN A SQUARE`,
    `// 35 seconds. One continuous sheet, ivory face up at the open and the close.`,
    `// The ochre corner mark is the original top-left corner; it rides that panel`,
    `// through the folds and is home again when the sheet is restored.`,
    `// Sound is not a MotionScript channel. Cues stay in comments:`,
    `// 0:00 light rustle, crease, rustle, crease.`,
    `// 0:02 the sheet turns — a soft flap, then the horizontal and vertical creases.`,
    `// 0:05 layered rustle as the square base collapses; shadows tighten on the tips.`,
    `// 0:09 crisp creases, the petal opens (blue interior), then shuts. Turn, and the other side.`,
    `// 0:15 small clicks as the neck, tail, and head seat between the layers.`,
    `// 0:20 paper flutter, two wing beats; the table shadow widens, then tightens.`,
    `// 0:24 unfolding rustles. 0:29 one broad rustle, then silence on the creased square.`,
    `scene "a-crane-then-a-square" {`,
    `  version "0.2";`,
    `  viewport (${VIEW_W}, ${VIEW_H});`,
    `  background #c9c2b7;`,
    `  duration ${DURATION}s;`,
    `  requires "geometry.pathMorph";`,
    `  requires "paint.linearGradient";`,
    `  requires "paint.radialGradient";`,
    `};`,
    `camera main {`,
    `  position (640, 360);`,
    `  zoom 1;`,
    `  rotation 0deg;`,
    `};`,
    nodes.join("\n"),
    tracks.filter(Boolean).join("\n"),
    steps.filter((line) => line.trim().length > 0).join("\n"),
    `complete;`,
    ``,
  ];
  return body.join("\n");
}

function decimateVec(keys: { t: number; x: number; y: number }[]): { t: number; x: number; y: number }[] {
  const samples: Sample[] = keys.map((key) => ({ t: key.t, pts: [{ x: key.x, y: key.y }], show: true }));
  return decimate(samples).map((sample) => ({ t: sample.t, x: sample.pts[0]!.x, y: sample.pts[0]!.y }));
}
function decimateNum(keys: { t: number; v: number }[]): { t: number; v: number }[] {
  const out = [keys[0]!];
  for (let i = 1; i < keys.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = keys[i]!;
    const next = keys[i + 1]!;
    const u = (cur.t - prev.t) / (next.t - prev.t || 1);
    const guess = prev.v + (next.v - prev.v) * u;
    if (Math.abs(guess - cur.v) > 0.012 || next.t - prev.t > 0.6) out.push(cur);
  }
  out.push(keys[keys.length - 1]!);
  if (out[0]!.t > 0) out.unshift({ ...out[0]!, t: 0 });
  if (out[out.length - 1]!.t < DURATION) out.push({ ...out[out.length - 1]!, t: DURATION });
  return out;
}

function dwellShow(samples: Sample[]): Sample[] {
  let latched = samples[0]?.show ?? false;
  return samples.map((sample, index) => {
    const triArea = polygonArea(sample.pts);
    if (triArea < 8) return { ...sample, show: false };
    if (index === 0) return { ...sample, show: sample.show };
    if (sample.show !== latched && index + 1 < samples.length && samples[index + 1]!.show !== sample.show && polygonArea(samples[index + 1]!.pts) > 8) {
      return { ...sample, show: latched };
    }
    latched = sample.show;
    return sample;
  });
}

function polygonArea(pts: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

function verify(source: string): void {
  const compiled = compileMotionScript(source);
  if (!compiled.scene || compiled.diagnostics.length) {
    const message = compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).slice(0, 16).join("\n");
    throw new Error(message || "compile failed");
  }
  const runtime = new AnimationRuntime(compiled.scene);
  const marks: string[] = [];
  for (const t of [0, 0.46, 2.4, 3.4, 5, 8, 11.3, 12, 15, 18.6, 21.2, 26, 29, 33, 35]) {
    runtime.evaluate(t * 1000);
    if (runtime.degraded) marks.push(`${t}s degraded`);
  }
  const start = project(orientModel(anchored(sheetAt(0), FRONT_ANCHOR.Tip, FRONT_Z), 0), viewAt(0));
  const end = project(orientModel(anchored(sheetAt(35), FRONT_ANCHOR.Tip, FRONT_Z), 35), viewAt(35));
  const home = Math.hypot(start.x - end.x, start.y - end.y);
  console.log(`compile nodes ${compiled.scene.nodes.length} tracks ${compiled.scene.timeline.tracks.length} steps ${compiled.scene.timeline.steps.length}`);
  console.log(`ochre home error ${home.toFixed(2)}px`);
  if (home > 2.5) marks.push(`ochre did not return (${home.toFixed(2)}px)`);
  let worst = 0;
  for (const t of [0, 0.46, 1.4, 3.4, 4.4, 6.5, 8, 16, 19, 30, 35]) {
    worst = Math.max(worst, maxEdgeError(sheetAt(t), COARSE_EDGES));
  }
  console.log(`coarse edge error ${(worst * 100).toFixed(2)}%`);
  if (worst > 0.025) marks.push(`coarse stretch ${(worst * 100).toFixed(2)}%`);
  if (marks.length) throw new Error(marks.join("\n"));
  void runtime;
}

function report(): void {
  for (const t of [0, 0.46, 2.5, 3.4, 8, 9, 11.3, 12, 15, 18.8, 21.3, 29, 35]) {
    const view = viewAt(t);
    let ivory = 0;
    let blue = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const spec of SPECS) {
      const tri = spec.points(t);
      const code = facing(triangleNormal(tri[0], tri[1], tri[2]), view, spec.ivoryPositive);
      if (code > 0) ivory += 1;
      else if (code < 0) blue += 1;
      for (const point of tri) {
        const p = project(point, view);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
    const angles = frontAngles(t);
    const pose = articulate(FRONT_Z, angles, 1);
    const tip = project(orientModel(pose.Tip, t), view);
    const back = articulate(BACK_Z, backAngles(t), 1);
    const tail = project(orientModel(back.Tip, t), view);
    console.log(
      `${t.toFixed(1).padStart(5)}s  ivory ${ivory} blue ${blue}  box ${num(maxX - minX)}x${num(maxY - minY)} @ ${num((minX + maxX) / 2)},${num((minY + maxY) / 2)}  wing ${num(angles.wing)} tip ${num(angles.tip)} cover ${num(angles.cover)} tipZ ${num(pose.Tip[2])} wrZ ${num(pose.Wr[2])} headX ${num(tip.x)} tailX ${num(tail.x)} bank ${bankIsHighFront(t, view) ? "front" : "back"}`,
    );
  }
}

report();
const source = emit();
const out = resolve(dirname(fileURLToPath(import.meta.url)), "a-crane-then-a-square.ms");
writeFileSync(out, source);
verify(source);
console.log(`wrote ${out} (${source.length} bytes)`);
