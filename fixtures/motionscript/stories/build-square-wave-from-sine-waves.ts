/**
 * Builds fixtures/motionscript/stories/square-wave-from-sine-waves.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-square-wave-from-sine-waves.ts
 * Set GVR_PREVIEW_DIR to also render PNG stills through the real CanvasRenderer
 * in headless Chromium (needs Playwright and a Chromium it can launch).
 *
 * Thirty seconds. Odd sine harmonics are added one at a time to a blue partial
 * sum until sixteen terms approximate a dashed square wave.
 * 0:00 axes, dashed target, title, one orange sine below.
 * 0:04 S1 is traced. 0:08 the third harmonic is added. 0:12 the fifth.
 * 0:16 harmonics 7 to 15, one per second. 0:21 the general formula.
 * 0:22 harmonics 17 to 31 with a magnified inset at x = 0. 0:27 hold.
 *
 * The blue curve is one path whose keyframes are the exact partial sums S1…S16,
 * each sampled at the same 257 x positions as Hermite cubics. Path morph lerps
 * matching commands, so between S(n) and S(n+1) the drawn curve is exactly
 * S(n) + α · term(n+1), with α the segment's eased progress.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { KEYWORD_SET, transformPoint, validateSceneIR, type ResolvedDrawItem, type ResolvedFrame } from "@gvr/schema";

const STARTED = performance.now();
const DURATION = 30;
const W = 1280;
const H = 720;

const PAPER = "#ffffff";
const AXIS = "#1d232b";
const INK = "#1b1f24";
const MUTED = "#5f6b7a";
const TARGET = "#b9c0c9";
const BLUE = "#1f6fd1";
const ORANGE = "#f28c28";
const ORANGE_INK = "#d26a12";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { t: number; v: string; ease?: Ease };

/** Main graph: x in [-2π, 2π], y in about [-1.2, 1.2]. */
const X0 = 640;
const PX = 1060 / (4 * Math.PI);
const Y0 = 270;
const PY = 92;
const XMIN = -2 * Math.PI;
const XMAX = 2 * Math.PI;
const SEGMENTS = 256;

/** Component graph below, same x scale, smaller y scale. */
const CY = 524;
const PYC = 54;

/** Magnified inset around x = 0, shown from 22s to 27s. */
const INSET = { x0: 640, y0: 522, px: 250 / 0.6, py: 84, half: 0.6, segments: 60 };
const INSET_BOX = { x: 380, y: 412, w: 520, h: 220 };

/** Everything except the closing caption stays above this line. */
const CAPTION_TOP = 640;

/** Equation group origin and the right edge of its "S(x) =" prefix. */
const EQ: Pt = { x: 140, y: 86 };
const P = 118;
const EQ_SCALE = 0.86;

const sx = (x: number): number => X0 + x * PX;
const sy = (y: number): number => Y0 - y * PY;
const cy = (y: number): number => CY - y * PYC;

/** Odd harmonic of term index j (0-based): 1, 3, 5, … */
const harmonic = (j: number): number => 2 * j + 1;
const amp = (k: number): number => 4 / (Math.PI * k);
const term = (k: number, x: number): number => amp(k) * Math.sin(k * x);
const termSlope = (k: number, x: number): number => amp(k) * k * Math.cos(k * x);
const partial = (n: number, x: number): number => {
  let sum = 0;
  for (let j = 0; j < n; j += 1) sum += term(harmonic(j), x);
  return sum;
};
const partialSlope = (n: number, x: number): number => {
  let sum = 0;
  for (let j = 0; j < n; j += 1) sum += termSlope(harmonic(j), x);
  return sum;
};

/** Plan for the blue sum: [time, terms, ease of the segment that starts here]. */
const SUM_KEYS: [number, number, Ease][] = [
  [0, 1, "hold"],
  [10, 1, "easeInOut"],
  [12, 2, "hold"],
  [13, 2, "easeInOut"],
  [15, 3, "hold"],
  [16, 3, "easeInOut"],
  [17, 4, "easeInOut"],
  [18, 5, "easeInOut"],
  [19, 6, "easeInOut"],
  [20, 7, "easeInOut"],
  [21, 8, "hold"],
  [22, 8, "easeInOut"],
  ...Array.from({ length: 8 }, (_, index): [number, number, Ease] => [22 + (index + 1) * 0.375, 9 + index, index === 7 ? "hold" : "easeInOut"]),
  [30, 16, "hold"],
];

/** When each term is appended (blend start) and complete (blend end). */
const BLENDS: { k: number; start: number; end: number }[] = [
  { k: 3, start: 10, end: 12 },
  { k: 5, start: 13, end: 15 },
  ...[7, 9, 11, 13, 15].map((k, index) => ({ k, start: 16 + index, end: 17 + index })),
  ...[17, 19, 21, 23, 25, 27, 29, 31].map((k, index) => ({ k, start: 22 + index * 0.375, end: 22.375 + index * 0.375 })),
];

/** Times at which the counter shows n terms. */
function countAt(n: number): number {
  if (n === 1) return 6;
  return BLENDS[n - 2]!.end;
}

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text === "" ? "0" : text;
}

function v2(point: Pt, digits = 2): string {
  return `(${n(point.x, digits)}, ${n(point.y, digits)})`;
}

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

/** Exact percentage text for a time, with enough digits to round-trip to the millisecond. */
function percent(seconds: number): string {
  const value = (ms(seconds) / (DURATION * 1000)) * 100;
  return `${n(value, 6)}%`;
}

function track(target: string, keys: Key[]): string {
  const ordered = [...keys].sort((a, b) => a.t - b.t);
  if (ordered[0]!.t !== 0 || ordered[ordered.length - 1]!.t !== DURATION) {
    throw new Error(`${target} must run from 0s to ${DURATION}s`);
  }
  const lines = [`keyframes ${target} {`, "  start 0s;", `  duration ${DURATION}s;`];
  let previous = -1;
  ordered.forEach((key, index) => {
    if (ms(key.t) <= previous) throw new Error(`${target} repeats a key at ${key.t}s`);
    previous = ms(key.t);
    const ease = key.ease && index < ordered.length - 1 ? ` ease ${key.ease}` : "";
    lines.push(`  ${percent(key.t)} ${key.v}${ease};`);
  });
  lines.push("};");
  return lines.join("\n");
}

/** Opacity (or any scalar) that moves between levels inside windows and holds elsewhere. */
function levels(target: string, windows: [number, number, number, number][], ease: Ease = "easeInOut"): string {
  const keys: Key[] = [{ t: 0, v: n(windows[0]?.[2] ?? 0, 3), ease: "hold" }];
  for (const [t0, t1, from, to] of windows) {
    if (t0 > 0) keys.push({ t: t0, v: n(from, 3), ease });
    else keys[0] = { t: 0, v: n(from, 3), ease };
    keys.push({ t: t1, v: n(to, 3), ease: "hold" });
  }
  if (keys[keys.length - 1]!.t < DURATION) keys.push({ t: DURATION, v: keys[keys.length - 1]!.v });
  return track(target, keys);
}

function show(target: string, t0: number, t1: number, hide0?: number, hide1?: number): string {
  const windows: [number, number, number, number][] = [[t0, t1, 0, 1]];
  if (hide0 !== undefined && hide1 !== undefined) windows.push([hide0, hide1, 1, 0]);
  return levels(target, windows);
}

function visibility(target: string, on: number, off?: number): string {
  const steps = [`step ${target}.visible { at ${ms(on)}ms; value true; };`];
  if (off !== undefined && off < DURATION) steps.push(`step ${target}.visible { at ${ms(off)}ms; value false; };`);
  return steps.join("\n");
}

/** A function sampled as Hermite cubics: exact values and slopes at every knot. */
function hermite(
  f: (x: number) => number,
  df: (x: number) => number,
  a: number,
  b: number,
  segments: number,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
  scaleY: number,
): string {
  const h = (b - a) / segments;
  const hx = mapX(a + h) - mapX(a);
  const parts = [`move ${v2({ x: mapX(a), y: mapY(f(a)) }, 1)};`];
  for (let index = 0; index < segments; index += 1) {
    const x0 = a + index * h;
    const x1 = index === segments - 1 ? b : x0 + h;
    const p0 = { x: mapX(x0), y: mapY(f(x0)) };
    const p3 = { x: mapX(x1), y: mapY(f(x1)) };
    const c1 = { x: p0.x + hx / 3, y: p0.y - (h / 3) * df(x0) * scaleY };
    const c2 = { x: p3.x - hx / 3, y: p3.y + (h / 3) * df(x1) * scaleY };
    parts.push(`cubic ${v2(c1, 1)} ${v2(c2, 1)} ${v2(p3, 1)};`);
  }
  return parts.join(" ");
}

const sumPath = (terms: number): string =>
  hermite((x) => partial(terms, x), (x) => partialSlope(terms, x), XMIN, XMAX, SEGMENTS, sx, sy, PY);

const insetX = (x: number): number => INSET.x0 + x * INSET.px;
const insetY = (y: number): number => INSET.y0 - y * INSET.py;
const insetPath = (terms: number): string =>
  hermite((x) => partial(terms, x), (x) => partialSlope(terms, x), -INSET.half, INSET.half, INSET.segments, insetX, insetY, INSET.py);

const componentPath = (k: number): string =>
  hermite((x) => term(k, x), (x) => termSlope(k, x), XMIN, XMAX, Math.max(32, 12 * k), sx, cy, PYC);

function dashes(from: Pt, to: Pt, dash = 9, gap = 6): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  const parts: string[] = [];
  for (let cursor = 0; cursor < length - 0.5; cursor += dash + gap) {
    const end = Math.min(length, cursor + dash);
    parts.push(`move ${v2({ x: from.x + ux * cursor, y: from.y + uy * cursor }, 1)}; line ${v2({ x: from.x + ux * end, y: from.y + uy * end }, 1)};`);
  }
  return parts.join(" ");
}

/** Square-wave target as dashed pieces: +1 on (0, π), -1 on (-π, 0), period 2π. */
function targetPieces(mapX: (x: number) => number, mapY: (y: number) => number, a: number, b: number): string {
  const pieces: string[] = [];
  const jumps: number[] = [];
  for (let m = Math.ceil(a / Math.PI - 1e-9); m * Math.PI <= b + 1e-9; m += 1) jumps.push(m * Math.PI);
  const edges = [a, ...jumps.filter((x) => x > a + 1e-9 && x < b - 1e-9), b];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const x0 = edges[index]!;
    const x1 = edges[index + 1]!;
    const level = Math.sin((x0 + x1) / 2) > 0 ? 1 : -1;
    pieces.push(dashes({ x: mapX(x0), y: mapY(level) }, { x: mapX(x1), y: mapY(level) }));
  }
  for (const x of jumps) pieces.push(dashes({ x: mapX(x), y: mapY(1) }, { x: mapX(x), y: mapY(-1) }));
  return pieces.join("\n  ");
}

type TextSpec = {
  at: Pt;
  content: string;
  size: number;
  fill?: string;
  family?: string;
  weight?: number;
  align?: "left" | "center" | "right";
  extra?: string;
};

function text(id: string, spec: TextSpec): string {
  const family = spec.family ?? "sans";
  return `text ${id} { position ${v2(spec.at)}; content "${spec.content}"; fontFamily "${family}"; fontSize ${spec.size}; fontWeight ${spec.weight ?? 500}; align ${spec.align ?? "center"}; baseline middle; fill ${spec.fill ?? INK}; ${spec.extra ?? ""}};`;
}

function math(id: string, at: Pt, content: string, size: number, fill: string, align: "left" | "center" | "right" = "center", extra = ""): string {
  return text(id, { at, content, size, fill, family: "serif", weight: 400, align, extra });
}

/** Rough serif advance in em for layout. Checked against the browser in preview mode. */
function serifWidth(content: string, size: number): number {
  let em = 0;
  for (const ch of content) {
    if (/[0-9]/.test(ch)) em += 0.5;
    else if ("()".includes(ch)) em += 0.333;
    else if (ch === " ") em += 0.25;
    else if (ch === "i") em += 0.278;
    else if (ch === "s") em += 0.389;
    else if (ch === "+" || ch === "=") em += 0.564;
    else if (ch === "N") em += 0.722;
    else em += 0.5;
  }
  return em * size;
}

const subscript = (value: number): string => String(value).replace(/[0-9]/g, (digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]!);

/** Layout of the expanded equation. Columns are local to the eq group. */
type Column = { k: number; plus: number; center: number; width: number };
const PAREN_OPEN = P + 40;
const TERM_ONE = P + 62;
const COLUMNS: Column[] = (() => {
  const columns: Column[] = [];
  let cursor = TERM_ONE + serifWidth("sin x", 26) + 2;
  for (const k of [3, 5, 7, 9, 11, 13, 15]) {
    const width = serifWidth(`sin ${k}x`, 22) + 8;
    const plus = cursor + 12;
    const center = cursor + 24 + width / 2;
    columns.push({ k, plus, center, width });
    cursor = center + width / 2;
  }
  return columns;
})();
const closeAfter = (count: number): number => {
  if (count <= 1) return TERM_ONE + serifWidth("sin x", 26) + 4;
  const column = COLUMNS[count - 2]!;
  return column.center + column.width / 2 + 2;
};

function fraction(id: string, center: number, top: string, bottom: string, width: number, color: string): string {
  return `group ${id} {
    ${math("num", { x: center, y: -15 }, top, 22, color)}
    line bar { from (${n(center - width / 2)}, 0); to (${n(center + width / 2)}, 0); stroke ${color} width 1.5; };
    ${math("den", { x: center, y: 17 }, bottom, 22, color)}
  };`;
}

function termGroup(id: string, column: Column, color: string): string {
  return `group ${id} {
    opacity 0;
    ${math("plus", { x: column.plus, y: 0 }, "+", 26, color)}
    ${fraction("frac", column.center, `sin ${column.k}x`, String(column.k), column.width - 6, color)}
  };`;
}

const SIGMA = P + 60;
const GENERAL_FRAC = P + 144;
const GENERAL_TAIL = GENERAL_FRAC + 66;
const N_VALUE = GENERAL_TAIL + serifWidth(", N =", 26) + 5;

function equationSource(): string {
  const prefixes = Array.from({ length: 8 }, (_, index) =>
    math(`pre${index + 1}`, { x: P, y: 0 }, `S${subscript(index + 1)}(x) =`, 26, INK, "right", "visible false; "),
  );
  const generalPrefix = `group preN {
    visible false;
    ${math("tail", { x: P, y: 0 }, "(x) =", 26, INK, "right")}
    ${math("sub", { x: P - serifWidth("(x) =", 26) - 1, y: 8 }, "N", 16, INK, "right")}
    ${math("main", { x: P - serifWidth("(x) =", 26) - serifWidth("N", 16) - 2, y: 0 }, "S", 26, INK, "right")}
  };`;
  const terms = COLUMNS.flatMap((column) => [termGroup(`t${column.k}o`, column, ORANGE_INK), termGroup(`t${column.k}i`, column, INK)]);
  const values = Array.from({ length: 9 }, (_, index) => math(`nv${index + 8}`, { x: N_VALUE, y: 0 }, String(index + 8), 26, INK, "left", "visible false; "));
  return `group eq {
  position ${v2(EQ)};
  zIndex 10;
  opacity 0;
  ${prefixes.join("\n  ")}
  ${generalPrefix}
  ${fraction("four", P + 22, "4", "π", 22, INK)}
  group t1 {
    ${math("o", { x: PAREN_OPEN, y: 0 }, "sin x", 26, ORANGE_INK, "left", "opacity 0; ")}
    ${math("i", { x: PAREN_OPEN, y: 0 }, "sin x", 26, INK, "left", "opacity 0; ")}
  };
  group expanded {
    ${math("open", { x: PAREN_OPEN, y: 1 }, "(", 48, INK, "left", "opacity 0; ")}
    ${math("shut", { x: 0, y: 1 }, ")", 48, INK, "left", "opacity 0; ")}
    ${terms.join("\n    ")}
  };
  group general {
    opacity 0;
    ${math("sigma", { x: SIGMA, y: 1 }, "Σ", 40, INK)}
    ${math("upper", { x: SIGMA, y: -29 }, "N−1", 14, INK)}
    ${math("lower", { x: SIGMA, y: 31 }, "k=0", 14, INK)}
    ${fraction("frac", GENERAL_FRAC, "sin((2k+1)x)", "2k+1", 124, INK)}
    ${math("comma", { x: GENERAL_TAIL, y: 0 }, ", N =", 26, INK, "left")}
    ${values.join("\n    ")}
  };
};`;
}

function equationMotion(): string[] {
  const out: string[] = [];
  out.push(show("eq.opacity", 3.6, 4.0));
  out.push(visibility("eq.pre1", 0, 10));
  out.push(visibility("eq.pre2", 10, 13));
  out.push(visibility("eq.pre3", 13, 16));
  for (let index = 4; index <= 8; index += 1) out.push(visibility(`eq.pre${index}`, 12 + index, index === 8 ? 21.25 : 13 + index));
  out.push(visibility("eq.preN", 21.25));
  out.push(show("eq.t1.o.opacity", 3.75, 4.05, 5.6, 6.0));
  out.push(levels("eq.t1.i.opacity", [[5.6, 6.0, 0, 1], [21.25, 21.75, 1, 0]]));
  out.push(
    track("eq.t1.position.x", [
      { t: 0, v: "0", ease: "hold" },
      { t: 9.6, v: "0", ease: "easeInOut" },
      { t: 10.0, v: n(TERM_ONE - PAREN_OPEN), ease: "hold" },
      { t: DURATION, v: n(TERM_ONE - PAREN_OPEN) },
    ]),
  );
  out.push(levels("eq.expanded.open.opacity", [[9.6, 10.0, 0, 1], [21.25, 21.75, 1, 0]]));
  out.push(levels("eq.expanded.shut.opacity", [[9.6, 10.0, 0, 1], [21.25, 21.75, 1, 0]]));
  const shutKeys: Key[] = [{ t: 0, v: n(closeAfter(2)), ease: "hold" }];
  BLENDS.filter((blend) => blend.k <= 15 && blend.k > 3).forEach((blend, index) => {
    shutKeys.push({ t: blend.start - 0.4, v: n(closeAfter(index + 2)), ease: "easeInOut" });
    shutKeys.push({ t: blend.start, v: n(closeAfter(index + 3)), ease: "hold" });
  });
  shutKeys.push({ t: DURATION, v: shutKeys[shutKeys.length - 1]!.v });
  out.push(track("eq.expanded.shut.position.x", shutKeys));
  for (const blend of BLENDS.filter((item) => item.k <= 15)) {
    const lead = blend.k <= 5 ? 0.4 : 0.25;
    out.push(levels(`eq.expanded.t${blend.k}o.opacity`, [[blend.start - lead, blend.start, 0, 1], [blend.end - 0.25, blend.end, 1, 0]]));
    out.push(levels(`eq.expanded.t${blend.k}i.opacity`, [[blend.end - 0.25, blend.end, 0, 1], [21.25, 21.75, 1, 0]]));
  }
  out.push(show("eq.general.opacity", 21.25, 21.75));
  for (let value = 8; value <= 16; value += 1) {
    out.push(visibility(`eq.general.nv${value}`, value === 8 ? 0 : countAt(value), value === 16 ? undefined : countAt(value + 1)));
  }
  out.push(
    track("eq.scale", [
      { t: 0, v: "(1, 1)", ease: "hold" },
      { t: 15.4, v: "(1, 1)", ease: "easeInOut" },
      { t: 16.0, v: `(${EQ_SCALE}, ${EQ_SCALE})`, ease: "hold" },
      { t: DURATION, v: `(${EQ_SCALE}, ${EQ_SCALE})` },
    ]),
  );
  return out;
}

function axesSource(): string {
  const ticks = [-2, -1, 0, 1, 2].map((m) => {
    const x = sx(m * Math.PI);
    const label = m === 0 ? "0" : `${m < 0 ? "−" : ""}${Math.abs(m) === 1 ? "" : Math.abs(m)}π`;
    return `line tx${m + 2} { from (${n(x)}, ${n(Y0 - 5)}); to (${n(x)}, ${n(Y0 + 5)}); stroke ${AXIS} width 1.6; };
  ${text(`lx${m + 2}`, { at: { x, y: 402 }, content: label, size: 17, fill: MUTED, family: "serif", weight: 400 })}`;
  });
  const yTicks = [-1, 0, 1].map((value, index) => {
    const y = sy(value);
    return `line ty${index} { from (90, ${n(y)}); to (102, ${n(y)}); stroke ${AXIS} width 1.6; };
  ${text(`ly${index}`, { at: { x: 82, y }, content: value < 0 ? "−1" : String(value), size: 17, fill: MUTED, family: "serif", weight: 400, align: "right" })}`;
  });
  return `group axes {
  zIndex 3;
  opacity 0;
  line xaxis { from (96, ${Y0}); to (1190, ${Y0}); stroke ${AXIS} width 1.6; };
  line yaxis { from (96, ${n(sy(1.32))}); to (96, ${n(sy(-1.32))}); stroke ${AXIS} width 1.6; };
  ${ticks.join("\n  ")}
  ${yTicks.join("\n  ")}
  ${text("xname", { at: { x: 1204, y: Y0 }, content: "x", size: 18, fill: MUTED, family: "serif", weight: 400, align: "left", extra: "fontStyle italic; " })}
};
group lower {
  zIndex 3;
  opacity 0;
  line xaxis { from (96, ${CY}); to (1190, ${CY}); stroke ${AXIS} width 1.3; };
  line yaxis { from (96, ${n(cy(1.4))}); to (96, ${n(cy(-1.4))}); stroke ${AXIS} width 1.3; };
  line tyTop { from (91, ${n(cy(1))}); to (101, ${n(cy(1))}); stroke ${AXIS} width 1.3; };
  line tyBottom { from (91, ${n(cy(-1))}); to (101, ${n(cy(-1))}); stroke ${AXIS} width 1.3; };
  ${text("lyTop", { at: { x: 84, y: cy(1) }, content: "1", size: 14, fill: MUTED, family: "serif", weight: 400, align: "right" })}
  ${text("lyBottom", { at: { x: 84, y: cy(-1) }, content: "−1", size: 14, fill: MUTED, family: "serif", weight: 400, align: "right" })}
};`;
}

function fractionText(k: number): string {
  if (k === 3) return "⅓";
  if (k === 5) return "⅕";
  return `1/${k}`;
}

function componentSource(k: number): string {
  const formula = k === 1 ? "(4/π) sin x" : `4/(${k}π) · sin ${k}x`;
  const note = k === 1 ? "the fundamental" : `${k}× frequency · ${fractionText(k)} amplitude`;
  return `group c${k} {
  zIndex 6;
  opacity 0;
  path wave { stroke ${ORANGE} width 2.6 cap round join round; ${componentPath(k)} };
  ${text("formula", { at: { x: 104, y: 616 }, content: formula, size: 18, fill: ORANGE_INK, family: "serif", weight: 400, align: "left" })}
  ${text("note", { at: { x: 1186, y: 616 }, content: note, size: 18, fill: ORANGE_INK, weight: 600, align: "right" })}
};
operators c${k}.wave { trim 0, 0, 0; };`;
}

const ARROW_X = [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6];

function arrow(id: string, tail: Pt, length: number): string {
  const sign = Math.sign(length);
  const head = 9 * sign;
  return `group ${id} {
    position ${v2(tail)};
    scale (1, 0.001);
    line shaft { from (0, 0); to (0, ${n(length - head)}); stroke ${ORANGE_INK} width 2.4 cap round; };
    polygon head { points ((0, ${n(length)}), (-5.5, ${n(length - head * 1.4)}), (5.5, ${n(length - head * 1.4)})); fill ${ORANGE_INK}; };
  };`;
}

function arrowsSource(): string {
  const main = ARROW_X.map((x, index) => arrow(`m${index}`, { x: sx(x), y: sy(partial(1, x)) }, -term(3, x) * PY));
  const lower = ARROW_X.map((x, index) => arrow(`l${index}`, { x: sx(x), y: CY }, -term(3, x) * PYC));
  const dots = ARROW_X.map((x, index) => `circle d${index} { position ${v2({ x: sx(x), y: sy(partial(1, x)) })}; radius 3.5; fill ${BLUE}; };`);
  return `group arrows {
  zIndex 9;
  opacity 0;
  ${dots.join("\n  ")}
  ${main.join("\n  ")}
  ${lower.join("\n  ")}
};`;
}

function insetSource(): string {
  const peakX = gibbsPeak();
  const peak = { x: insetX(peakX), y: insetY(partial(16, peakX)) };
  return `group inset {
  zIndex 20;
  opacity 0;
  rectangle plate { position (${INSET_BOX.x}, ${INSET_BOX.y}); size (${INSET_BOX.w}, ${INSET_BOX.h}); fill ${PAPER}; stroke ${AXIS} width 1.5; };
  line axis0 { from (${INSET_BOX.x + 8}, ${INSET.y0}); to (${INSET_BOX.x + INSET_BOX.w - 8}, ${INSET.y0}); stroke ${MUTED} width 1.1; };
  path target { stroke ${TARGET} width 2 cap butt; ${targetPieces(insetX, insetY, -INSET.half, INSET.half)} };
  path curve { stroke ${BLUE} width 3 cap round join round; ${insetPath(8)} };
  ${text("range", { at: { x: INSET_BOX.x + 12, y: INSET_BOX.y + 16 }, content: "−0.6 ≤ x ≤ 0.6, magnified", size: 13, fill: MUTED, align: "left" })}
};
group gibbs {
  zIndex 22;
  opacity 0;
  line leader { from (912, 420); to ${v2({ x: peak.x + 7.5, y: peak.y - 1 })}; stroke ${INK} width 1.3; };
  circle ring { position ${v2(peak)}; radius 7; stroke ${INK} width 1.6; };
  ${text("line1", { at: { x: 918, y: 420 }, content: "Gibbs phenomenon: overshoot persists", size: 16, fill: INK, weight: 600, align: "left" })}
  ${text("line2", { at: { x: 918, y: 442 }, content: "as the region narrows.", size: 16, fill: INK, weight: 600, align: "left" })}
};
group midpoint {
  zIndex 23;
  opacity 0;
  circle dot { position (${INSET.x0}, ${INSET.y0}); radius 5.5; fill ${BLUE}; stroke ${PAPER} width 2; };
  ${text("label", { at: { x: INSET.x0 - 14, y: INSET.y0 + 22 }, content: "Midpoint at the jump", size: 16, fill: BLUE, weight: 600, align: "right" })}
};
group focus {
  zIndex 4;
  opacity 0;
  rectangle box { position (${n(sx(-INSET.half))}, ${n(sy(1.28))}); size (${n(2 * INSET.half * PX)}, ${n(2.56 * PY)}); stroke ${AXIS} width 1.4; };
  line joinA { from (${n(sx(-INSET.half))}, ${n(sy(-1.28))}); to (${INSET_BOX.x}, ${INSET_BOX.y}); stroke ${MUTED} width 1; };
  line joinB { from (${n(sx(INSET.half))}, ${n(sy(-1.28))}); to (${INSET_BOX.x + INSET_BOX.w}, ${INSET_BOX.y}); stroke ${MUTED} width 1; };
};`;
}

function gibbsPeak(): number {
  let best = 0;
  let at = 0;
  for (let x = 0.0005; x < 0.4; x += 0.0001) {
    const value = partial(16, x);
    if (value > best) {
      best = value;
      at = x;
    }
  }
  return at;
}

function counterSource(): string {
  const labels = Array.from({ length: 16 }, (_, index) =>
    text(`n${index + 1}`, { at: { x: 1062, y: 148 }, content: `${index + 1} term${index === 0 ? "" : "s"}`, size: 22, fill: BLUE, weight: 700, align: "left", extra: "visible false; " }),
  );
  return `group counter {
  zIndex 10;
  opacity 0;
  line swatch { from (1030, 148); to (1052, 148); stroke ${BLUE} width 3.5 cap round; };
  ${labels.join("\n  ")}
};`;
}

function program(): string {
  const motion: string[] = [];
  const sumKeys = SUM_KEYS.map(([t, terms, ease]) => ({ t, v: `path { ${sumPath(terms)} }`, ease }));
  motion.push(track("sum.commands", sumKeys));
  motion.push(levels("sum.trim.end", [[4, 6, 0, 1]]));
  motion.push(visibility("sum", 4));
  const insetKeys = SUM_KEYS.filter(([t]) => t === 0 || t >= 22).map(([t, terms, ease]) => ({ t, v: `path { ${insetPath(terms)} }`, ease: t === 0 ? ("hold" as Ease) : ease }));
  insetKeys.splice(1, 0, { t: 22, v: `path { ${insetPath(8)} }`, ease: "easeInOut" });
  const insetUnique = insetKeys.filter((key, index) => insetKeys.findIndex((other) => other.t === key.t) === index);
  motion.push(track("inset.curve.commands", insetUnique));

  motion.push(show("axes.opacity", 0, 0.5));
  motion.push(levels("lower.opacity", [[0, 0.5, 0, 1], [21.6, 22.0, 1, 0]]));
  motion.push(
    track("cover.position.x", [
      { t: 0, v: "92", ease: "hold" },
      { t: 0.5, v: "92", ease: "linear" },
      { t: 2.0, v: "1192", ease: "hold" },
      { t: DURATION, v: "1192" },
    ]),
  );
  motion.push(`step cover.visible { at 2000ms; value false; };`);
  motion.push(show("title.opacity", 0.2, 0.9, 3.0, 3.4));

  motion.push(levels("c1.opacity", [[1.0, 1.1, 0, 1], [3.2, 3.25, 1, 0]]));
  motion.push(levels("c1.wave.trim.end", [[1.0, 2.0, 0, 1]]));
  motion.push(levels("flyer.opacity", [[3.2, 3.25, 0, 1], [3.6, 3.95, 1, 0]]));
  const flyTo = { x: EQ.x + PAREN_OPEN + 24 - X0, y: EQ.y - CY };
  motion.push(
    track("flyer.position", [
      { t: 0, v: "(0, 0)", ease: "hold" },
      { t: 3.2, v: "(0, 0)", ease: "easeInOut" },
      { t: 3.95, v: v2(flyTo), ease: "hold" },
      { t: DURATION, v: v2(flyTo) },
    ]),
  );
  motion.push(
    track("flyer.scale", [
      { t: 0, v: "(1, 1)", ease: "hold" },
      { t: 3.2, v: "(1, 1)", ease: "easeInOut" },
      { t: 3.95, v: "(0.06, 0.12)", ease: "hold" },
      { t: DURATION, v: "(0.06, 0.12)" },
    ]),
  );

  motion.push(...equationMotion());
  motion.push(show("counter.opacity", 5.8, 6.1));
  for (let count = 1; count <= 16; count += 1) motion.push(visibility(`counter.n${count}`, countAt(count), count === 16 ? undefined : countAt(count + 1)));

  // Components: 3 and 5 take a second to draw; 7–15 appear with their blend.
  const components: [number, number, number, number, number][] = [
    [3, 8.0, 9.0, 11.8, 12.2],
    [5, 12.0, 13.0, 15.8, 16.0],
    ...[7, 9, 11, 13, 15].map((k, index): [number, number, number, number, number] => [k, 16 + index, 16.35 + index, 16.8 + index, 17 + index]),
  ];
  for (const [k, t0, t1, out0, out1] of components) {
    motion.push(levels(`c${k}.opacity`, [[t0, t0 + 0.12, 0, 1], [out0, out1, 1, 0]]));
    motion.push(levels(`c${k}.wave.trim.end`, [[t0, t1, 0, 1]]));
  }

  motion.push(levels("arrows.opacity", [[9.0, 9.2, 0, 1], [11.8, 12.2, 1, 0]]));
  for (const id of ["m0", "m1", "m2", "l0", "l1", "l2"]) {
    motion.push(
      track(`arrows.${id}.scale`, [
        { t: 0, v: "(1, 0.001)", ease: "hold" },
        { t: 9.0, v: "(1, 0.001)", ease: "easeOut" },
        { t: 9.7, v: "(1, 1)", ease: "hold" },
        { t: DURATION, v: "(1, 1)" },
      ]),
    );
  }

  motion.push(levels("focus.opacity", [[21.4, 21.9, 0, 1], [27.0, 27.4, 1, 0]]));
  motion.push(levels("inset.opacity", [[22.0, 22.35, 0, 1], [27.0, 27.4, 1, 0]]));
  motion.push(levels("gibbs.opacity", [[25.0, 25.4, 0, 1], [27.0, 27.4, 1, 0]]));
  motion.push(levels("midpoint.opacity", [[25.2, 25.6, 0, 1], [27.0, 27.4, 1, 0]]));
  motion.push(show("closing.opacity", 27.3, 27.9));

  return `// BUILDING A SQUARE WAVE FROM SINE WAVES
// 30 seconds. White page, dark axes, blue partial sum, orange incoming sine, grey dashed target.
// 0:00 axes, target and title; one orange sine below. 0:04 trace S1 = (4/π) sin x.
// 0:08 the third harmonic, signed arrows, blend to S2. 0:12 the fifth harmonic.
// 0:16 harmonics 7–15, one per second; 0:21 the general formula with N = 8.
// 0:22 harmonics 17–31 in three seconds; inset at x = 0 shows the Gibbs overshoot
// and the midpoint at the jump. 0:27 hold sixteen terms. No audio: cues are omitted.
// Generated by build-square-wave-from-sine-waves.ts. Do not edit by hand.
scene "square-wave-from-sine-waves" {
  version "0.2";
  viewport (${W}, ${H});
  background ${PAPER};
  duration ${DURATION}s;
  requires "easing.hold";
  requires "geometry.operators";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "geometry.pathMorph";
  requires "text.basic";
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
path goal { zIndex 1; stroke ${TARGET} width 2.2 cap butt; ${targetPieces(sx, sy, XMIN, XMAX)} };
rectangle cover { position (92, 150); size (1104, 244); fill ${PAPER}; zIndex 2; };
${axesSource()}
${text("title", { at: { x: 640, y: 76 }, content: "Build a square wave with sine waves.", size: 32, weight: 600, extra: "zIndex 10; opacity 0; " })}
path sum { zIndex 7; visible false; stroke ${BLUE} width 3 cap round join round; ${sumPath(1)} };
operators sum { trim 0, 0, 0; };
${componentSource(1)}
${[3, 5, 7, 9, 11, 13, 15].map(componentSource).join("\n")}
group flyer {
  zIndex 9;
  opacity 0;
  pivot (${X0}, ${CY});
  path wave { stroke ${ORANGE} width 2.6 cap round join round; ${componentPath(1)} };
};
${arrowsSource()}
${equationSource()}
${counterSource()}
${insetSource()}
${text("closing", { at: { x: 640, y: 676 }, content: "Odd harmonics. Decreasing amplitudes. An increasingly square wave.", size: 22, weight: 600, extra: "zIndex 10; opacity 0; " })}
${motion.join("\n")}
complete;
`;
}

// ---------------------------------------------------------------- checks

type Frame = readonly ResolvedDrawItem[];

function item(frame: Frame, id: string): ResolvedDrawItem | undefined {
  return frame.find((entry) => entry.nodeId === id);
}

function opacityOf(frame: Frame, id: string): number {
  return item(frame, id)?.opacity ?? 0;
}

function screen(frame: Frame, id: string, x = 0, y = 0): Pt {
  const found = item(frame, id);
  if (!found) throw new Error(`${id} is not drawn`);
  return transformPoint(found.logicalMatrix, x, y);
}

/** Screen-space polyline of a drawn path, flattening cubics. */
function polyline(found: ResolvedDrawItem): Pt[] {
  if (found.geometry.kind !== "path") return [];
  const points: Pt[] = [];
  let cursor: Pt = { x: 0, y: 0 };
  const push = (p: Pt) => points.push(transformPoint(found.logicalMatrix, p.x, p.y));
  for (const command of found.geometry.commands) {
    if (command.cmd === "M" || command.cmd === "L") {
      cursor = { x: command.x, y: command.y };
      push(cursor);
    } else if (command.cmd === "C") {
      for (let step = 1; step <= 8; step += 1) {
        const t = step / 8;
        const u = 1 - t;
        push({
          x: u * u * u * cursor.x + 3 * u * u * t * command.c1x + 3 * u * t * t * command.c2x + t * t * t * command.x,
          y: u * u * u * cursor.y + 3 * u * u * t * command.c1y + 3 * u * t * t * command.c2y + t * t * t * command.y,
        });
      }
      cursor = { x: command.x, y: command.y };
    }
  }
  return points;
}

/** Drawn y at screen x, by linear interpolation along a monotone-x polyline. */
function drawnY(points: Pt[], x: number): number | undefined {
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    if ((a.x <= x && x <= b.x) || (b.x <= x && x <= a.x)) {
      if (Math.abs(b.x - a.x) < 1e-9) return a.y;
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  return undefined;
}

/** Largest vertical gap in px between the drawn curve and an exact function, over x samples. */
function curveError(points: Pt[], f: (x: number) => number, mapX: (x: number) => number, mapY: (y: number) => number, a: number, b: number): number {
  let worst = 0;
  for (let index = 0; index <= 600; index += 1) {
    const x = a + ((b - a) * index) / 600;
    const y = drawnY(points, mapX(x));
    if (y === undefined) return Infinity;
    worst = Math.max(worst, Math.abs(y - mapY(f(x))));
  }
  return worst;
}

const easeInOut = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

/** Rough screen box of a drawn item, enough for on-screen and caption checks. */
function bounds(found: ResolvedDrawItem): { min: Pt; max: Pt } {
  const g = found.geometry;
  let local: Pt[] = [];
  if (g.kind === "path") return boxOf(polyline(found));
  if (g.kind === "line") local = [g.from, g.to];
  else if (g.kind === "circle") local = [{ x: -g.radius, y: -g.radius }, { x: g.radius, y: g.radius }];
  else if (g.kind === "rectangle") local = [{ x: 0, y: 0 }, g.size];
  else if (g.kind === "polygon") local = [...g.points];
  else if (g.kind === "text") {
    const width = g.content.length * g.font.size * 0.55;
    const x0 = g.align === "center" ? -width / 2 : g.align === "right" ? -width : 0;
    local = [{ x: x0, y: -g.font.size * 0.6 }, { x: x0 + width, y: g.font.size * 0.6 }];
  }
  return boxOf(local.map((p) => transformPoint(found.logicalMatrix, p.x, p.y)));
}

function boxOf(points: Pt[]): { min: Pt; max: Pt } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } };
}

function assertStory(runtime: AnimationRuntime): string[] {
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const at = (seconds: number): Frame => runtime.evaluate(ms(seconds)).drawItems;
  const visible = (frame: Frame, id: string, min = 0.95) => opacityOf(frame, id) >= min;
  const hidden = (frame: Frame, id: string) => opacityOf(frame, id) <= 0.02;
  const sumError = (frame: Frame, f: (x: number) => number) => {
    const found = item(frame, "sum");
    if (!found) return Infinity;
    return curveError(polyline(found), f, sx, sy, XMIN, XMAX);
  };
  const counterShows = (frame: Frame, count: number) =>
    Array.from({ length: 16 }, (_, index) => index + 1).every((other) => (other === count ? visible(frame, `counter.n${other}`) : !item(frame, `counter.n${other}`)));

  // Every drawn item stays on screen; everything but the closing caption stays above the caption band.
  for (let tenth = 0; tenth <= DURATION * 10; tenth += 5) {
    const frame = at(Math.min(tenth / 10, 29.99));
    for (const entry of frame) {
      if (entry.opacity <= 0.02) continue;
      const box = bounds(entry);
      if (entry.nodeId === "cover") continue;
      expect(box.min.x >= -1 && box.max.x <= W + 1 && box.min.y >= -1 && box.max.y <= H + 1, `${entry.nodeId} leaves the frame at ${tenth / 10}s.`);
      if (entry.nodeId !== "closing") expect(box.max.y <= CAPTION_TOP, `${entry.nodeId} enters the caption band at ${tenth / 10}s (bottom ${box.max.y.toFixed(0)}).`);
    }
  }

  // [0–4s] Establish the target.
  const early = at(0.25);
  expect(opacityOf(early, "axes.xaxis") > 0.2 && opacityOf(early, "axes.xaxis") < 0.8, "Axes are not fading in at 0.25s.");
  expect(visible(at(0.5), "axes.xaxis") && visible(at(0.5), "lower.xaxis"), "Axes are not in by 0.5s.");
  const wipe = at(1.25);
  const coverLeft = screen(wipe, "cover").x;
  expect(Math.abs(coverLeft - (92 + 550)) < 2 && Math.abs(screen(at(0.5), "cover").x - 92) < 0.5, `Target wipe is not half way at 1.25s (cover at ${coverLeft.toFixed(0)}).`);
  expect(!item(at(2.1), "cover"), "Wipe cover remains after 2s.");
  const target = item(at(2.5), "goal");
  expect(!!target && target.opacity > 0.95, "Dashed target is missing.");
  if (target) {
    const box = bounds(target);
    expect(Math.abs(box.min.y - sy(1)) < 2 && Math.abs(box.max.y - sy(-1)) < 2, "Target levels are not at +1 and -1.");
    expect(Math.abs(box.min.x - sx(XMIN)) < 2 && Math.abs(box.max.x - sx(XMAX)) < 2, "Target does not span two periods.");
  }
  const established = at(2.5);
  expect(visible(established, "title"), "Title is missing at 2.5s.");
  const wave1 = item(established, "c1.wave");
  expect(!!wave1 && curveError(polyline(wave1), (x) => term(1, x), sx, cy, XMIN, XMAX) < 1, "The orange sine below is not (4/π) sin x.");
  expect(!item(established, "sum"), "Blue curve shows before 4s.");
  const flying = at(3.6);
  expect(visible(flying, "flyer.wave", 0.5) && hidden(flying, "c1.wave"), "The orange sine does not travel toward the equation.");
  const flown = screen(at(3.9), "flyer.wave", X0, CY);
  const termSpot = screen(at(4.5), "eq.t1.o", 24, 0);
  expect(Math.hypot(flown.x - termSpot.x, flown.y - termSpot.y) < 12, "The orange sine does not land on the first equation term.");

  // [4–8s] Start with the fundamental.
  const tracing = item(at(5), "sum");
  if (tracing) {
    const points = polyline(tracing);
    const reach = Math.max(...points.map((p) => p.x));
    expect(reach > sx(-0.5) && reach < sx(0.5), `Trace is not half way at 5s (reaches x=${reach.toFixed(0)}).`);
  } else problems.push("Blue curve is not tracing at 5s.");
  const one = at(7);
  expect(sumError(one, (x) => partial(1, x)) < 1, "Blue curve is not S1 at 7s.");
  expect(visible(one, "eq.pre1") && visible(one, "eq.four.num") && visible(one, "eq.t1.i"), "S1 equation is not shown.");
  expect(!item(one, "eq.pre2") && hidden(one, "eq.expanded.t3o.frac.num"), "Later terms show at 7s.");
  expect(counterShows(one, 1), "Counter does not read 1 term at 7s.");
  expect(visible(one, "goal"), "Target hidden at 7s.");

  // [8–12s] Third harmonic.
  const revealed = at(8.9);
  expect(visible(revealed, "c3.wave") && visible(revealed, "c3.note"), "Third harmonic and its label are not shown below.");
  const arrows = at(9.8);
  ARROW_X.forEach((x, index) => {
    const tail = screen(arrows, `arrows.m${index}.shaft`, 0, 0);
    const tip = screen(arrows, `arrows.m${index}.head`, 0, -term(3, x) * PY);
    expect(Math.abs(tail.y - sy(partial(1, x))) < 1 && Math.abs(tip.y - sy(partial(2, x))) < 1 && Math.abs(tip.x - sx(x)) < 1, `Arrow ${index} does not run from S1 to S2.`);
    const lowerTip = screen(arrows, `arrows.l${index}.head`, 0, -term(3, x) * PYC);
    expect(Math.abs(lowerTip.y - cy(term(3, x))) < 1, `Lower arrow ${index} does not reach the component.`);
  });
  expect(visible(arrows, "arrows.m1.head") && sumError(arrows, (x) => partial(1, x)) < 1, "Arrows are not shown over the unchanged S1.");
  const halfway = at(11);
  expect(sumError(halfway, (x) => partial(1, x) + easeInOut(0.5) * term(3, x)) < 1, "Blend at 11s is not S1 + ½·term3.");
  const quarter = at(10.5);
  expect(sumError(quarter, (x) => partial(1, x) + easeInOut(0.25) * term(3, x)) < 1, "Blend at 10.5s is not S1 + α·term3.");
  expect(visible(halfway, "eq.pre2") && visible(halfway, "eq.expanded.t3o.frac.num") && visible(halfway, "eq.expanded.open"), "S2 equation is not shown during the blend.");
  const two = at(12.3);
  expect(sumError(two, (x) => partial(2, x)) < 1, "Blue curve is not S2 after 12s.");
  expect(counterShows(two, 2), "Counter does not read 2 terms.");
  expect(hidden(two, "arrows.m0.head") && hidden(two, "c3.wave"), "Arrows or third harmonic remain after 12s.");

  // [12–16s] Fifth harmonic.
  const five = at(12.9);
  expect(visible(five, "c5.wave") && visible(five, "c5.note"), "Fifth harmonic is not shown below.");
  expect(visible(at(13.1), "eq.expanded.t5o.frac.num"), "Fifth term is not appended before its blend.");
  const three = at(15.5);
  expect(sumError(three, (x) => partial(3, x)) < 1, "Blue curve is not S3 at 15.5s.");
  expect(counterShows(three, 3), "Counter does not read 3 terms.");
  expect(Math.abs(screen(at(16.2), "eq.pre4", 0, 0).x - (EQ.x + P * EQ_SCALE)) < 1, "Equation does not contract by 16s.");

  // [16–22s] More odd harmonics.
  for (let index = 0; index < 5; index += 1) {
    const k = 7 + 2 * index;
    const mid = at(16.5 + index);
    expect(visible(mid, `c${k}.wave`, 0.9), `Harmonic ${k} is not shown below during its addition.`);
    expect(visible(mid, `eq.expanded.t${k}o.frac.num`), `Term ${k} is not appended during its addition.`);
    expect(sumError(mid, (x) => partial(3 + index, x) + 0.5 * term(k, x)) < 1, `Blend of harmonic ${k} is not half way.`);
    expect(counterShows(at(17.05 + index), 4 + index), `Counter does not read ${4 + index} terms.`);
  }
  const eight = at(21.1);
  expect(sumError(eight, (x) => partial(8, x)) < 1, "Blue curve is not S8 at 21.1s.");
  for (const k of [3, 5, 7, 9, 11, 13, 15]) expect(visible(eight, `eq.expanded.t${k}i.frac.num`), `Expanded S8 is missing term ${k}.`);
  const general = at(21.9);
  expect(visible(general, "eq.general.sigma") && visible(general, "eq.general.nv8") && visible(general, "eq.preN.sub"), "General formula with N = 8 is not shown.");
  expect(hidden(general, "eq.expanded.t15i.frac.num"), "Expanded terms remain under the general formula.");
  expect(visible(general, "focus.box", 0.9), "The jump at x = 0 is not highlighted.");

  // [22–27s] Edges.
  for (let index = 0; index < 8; index += 1) {
    const time = 22.375 + index * 0.375 + 0.02;
    expect(counterShows(at(time), 9 + index), `Counter does not read ${9 + index} terms at ${time.toFixed(2)}s.`);
    expect(visible(at(time), `eq.general.nv${9 + index}`), `N does not read ${9 + index} at ${time.toFixed(2)}s.`);
  }
  const edges = at(26);
  expect(sumError(edges, (x) => partial(16, x)) < 1, "Blue curve is not S16 at 26s.");
  expect(visible(edges, "inset.plate") && visible(edges, "gibbs.line1") && visible(edges, "midpoint.label"), "Inset and annotations are not shown at 26s.");
  const insetCurve = item(edges, "inset.curve");
  expect(!!insetCurve && curveError(polyline(insetCurve), (x) => partial(16, x), insetX, insetY, -INSET.half, INSET.half) < 0.5, "Inset curve is not S16.");
  const peakX = gibbsPeak();
  const ring = screen(edges, "gibbs.ring");
  expect(Math.hypot(ring.x - insetX(peakX), ring.y - insetY(partial(16, peakX))) < 0.5 && partial(16, peakX) > 1.17, "Gibbs pointer is not on the overshoot.");
  const dot = screen(edges, "midpoint.dot");
  if (insetCurve) expect(Math.abs((drawnY(polyline(insetCurve), dot.x) ?? Infinity) - dot.y) < 0.5 && Math.abs(dot.y - insetY(0)) < 0.01, "Midpoint dot is not on the curve at y = 0.");
  const inset24 = item(at(24), "inset.curve");
  const alpha24 = easeInOut((24 - (22 + 5 * 0.375)) / 0.375);
  expect(!!inset24 && curveError(polyline(inset24), (x) => partial(13, x) + alpha24 * term(27, x), insetX, insetY, -INSET.half, INSET.half) < 0.5, "Inset curve is not S13 + α·term27 at 24s.");
  expect(hidden(at(22.2), "c15.wave") && hidden(at(22.2), "lower.xaxis"), "Lower graph remains under the inset.");

  // [27–30s] Hold.
  const held = at(29.5);
  expect(sumError(held, (x) => partial(16, x)) < 1, "Final curve is not the sixteen-term sum.");
  expect(visible(held, "goal") && visible(held, "closing") && visible(held, "eq.general.frac.num") && visible(held, "eq.general.nv16"), "Final composition is incomplete.");
  expect(counterShows(held, 16), "Final counter does not read 16 terms.");
  expect(hidden(held, "inset.plate") && hidden(held, "gibbs.line1") && hidden(held, "focus.box"), "Inset is not closed for the hold.");
  for (const x of [-Math.PI, 0, Math.PI]) {
    const y = drawnY(polyline(item(held, "sum")!), sx(x));
    expect(y !== undefined && Math.abs(y - Y0) < 0.6, `Final sum does not cross the midpoint at x = ${x.toFixed(2)}.`);
  }
  return problems;
}

// ---------------------------------------------------------------- preview

/** The slice of Playwright this preview uses. */
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

async function preview(directory: string, runtime: AnimationRuntime, here: string): Promise<void> {
  const times = [0.25, 0.5, 1.25, 2.0, 3.6, 4.0, 5.0, 6.0, 8.0, 8.9, 9.8, 11.0, 12.0, 12.9, 15.0, 16.0, 16.5, 18.5, 21.0, 21.9, 22.4, 23.5, 25.0, 25.6, 27.0, 27.4, 29.99];
  const esbuild = await import("esbuild");
  // Playwright has no types in this repo, and may be installed globally (NODE_PATH), which only require() honours.
  const playwright = "playwright";
  const { chromium } = (await import(playwright).catch(() => createRequire(import.meta.url)(playwright))) as { chromium: Chromium };
  const bundle = await esbuild.build({
    stdin: {
      contents: `import { CanvasRenderer, cssFont } from "@gvr/canvas-renderer"; (globalThis as any).GVR = { CanvasRenderer, cssFont };`,
      resolveDir: here,
      loader: "ts",
    },
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
      const gvr = (globalThis as any).GVR;
      const renderer = new gvr.CanvasRenderer(canvas);
      renderer.resize(width, height, 1);
      (globalThis as any).renderer = renderer;
    }, [W, H]);
    for (const time of times) {
      const frame: ResolvedFrame = runtime.evaluate(ms(time));
      await page.evaluate((json: string) => (globalThis as any).renderer.render(JSON.parse(json)), JSON.stringify(frame));
      await page.locator("#c").screenshot({ path: resolve(directory, `t${time.toFixed(2).padStart(5, "0")}.png`) });
    }
    // Font check: actual widths of the equation's text in this browser, as screen boxes.
    for (const time of [21.1, 29.99]) {
      const frame = runtime.evaluate(ms(time));
      const texts = frame.drawItems
        .filter((entry) => entry.nodeId.startsWith("eq.") && entry.geometry.kind === "text" && entry.opacity > 0.5)
        .map((entry) => ({ id: entry.nodeId, item: entry }));
      const measured = await page.evaluate(
        (list: { font: unknown; content: string }[]) =>
          list.map((entry) => {
            const ctx = document.createElement("canvas").getContext("2d")!;
            ctx.font = (globalThis as any).GVR.cssFont(entry.font);
            return { width: ctx.measureText(entry.content).width };
          }),
        texts.map((entry) => entry.item.geometry as Extract<ResolvedDrawItem["geometry"], { kind: "text" }>).map((g) => ({ font: g.font, content: g.content })),
      );
      const boxes = texts.map((entry, index) => {
        const g = entry.item.geometry as Extract<ResolvedDrawItem["geometry"], { kind: "text" }>;
        const width = measured[index]!.width;
        const x0 = g.align === "center" ? -width / 2 : g.align === "right" ? -width : 0;
        const a = transformPoint(entry.item.logicalMatrix, x0, -g.font.size * 0.35);
        const b = transformPoint(entry.item.logicalMatrix, x0 + width, g.font.size * 0.35);
        return { id: entry.id, x0: a.x, x1: b.x, y0: a.y, y1: b.y };
      });
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
          const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          if (dx > 1 && dy > 1) overlaps.push(`${a.id}/${b.id} by ${dx.toFixed(1)}px`);
        }
      }
      const right = Math.max(...boxes.map((box) => box.x1));
      console.log(`equation text at ${time}s: right edge ${right.toFixed(0)}px, overlaps ${overlaps.length ? overlaps.join(", ") : "none"}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`preview ${directory} (${times.length} stills)`);
}

async function main(): Promise<void> {
  for (const id of ["goal", "cover", "sum", "flyer", "eq", "counter", "inset", "gibbs", "midpoint", "focus", "arrows", "lower", "axes", "closing", "title", "wave", "formula", "note", "plate", "curve", "frac", "num", "bar", "den", "plus", "shut", "sigma", "upper", "lower", "comma", "tail", "sub", "main", "swatch", "leader", "ring", "dot", "label", "box", "joinA", "joinB", "shaft", "head", "general", "expanded", "four", "range", "axis0", "xaxis", "yaxis"]) {
    if (KEYWORD_SET.has(id)) throw new Error(`${id} is a reserved keyword`);
  }
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "square-wave-from-sine-waves.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source);
  console.log(`wrote ${outPath} (${bytes} bytes, ${(bytes / (512 * 1024) * 100).toFixed(1)}% of maxSourceBytes)`);
  if (bytes > 512 * 1024) {
    console.error("Program exceeds maxSourceBytes (512 KiB).");
    process.exit(1);
  }
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene) {
    console.error(compiled.diagnostics.map((entry) => `${entry.code}: ${entry.message}`).join("\n"));
    process.exit(1);
  }
  if (compiled.diagnostics.length > 0) {
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
  console.log(
    `compile ${compileMs.toFixed(0)}ms  nodes ${scene.nodes.length}/500  tracks ${scene.timeline.tracks.length}/1000  steps ${scene.timeline.steps.length}/1000  geometry ${geometry}/10000`,
  );
  const runtime = new AnimationRuntime(scene);
  const evalStart = performance.now();
  for (let time = 0; time < DURATION; time += 0.5) runtime.evaluate(ms(time));
  console.log(`evaluate ${((performance.now() - evalStart) / (DURATION * 2)).toFixed(1)}ms per frame`);
  const problems = assertStory(runtime);
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
  console.log(`builder ${((performance.now() - STARTED) / 1000).toFixed(1)}s`);
}

await main();
