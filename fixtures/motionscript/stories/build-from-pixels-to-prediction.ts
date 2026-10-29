/**
 * Builds fixtures/motionscript/stories/from-pixels-to-prediction.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-from-pixels-to-prediction.ts
 * Set GVR_PREVIEW_DIR to also write PNG stills drawn by the real CanvasRenderer
 * in headless Chromium (Playwright; GVR_CHROME or CHROME_PATH picks the binary).
 *
 * Thirty seconds. A handwritten 7 becomes a 28 × 28 grid of intensities, flows
 * into 784 inputs, through two hidden layers and a softmax, and comes out as
 * "Prediction: 7". Charcoal schematic: grey wires, cyan positive, orange
 * negative, white labels. Brightness is an opacity overlay on each node,
 * because MotionScript cannot animate a fill colour. Sound cues are drawn as
 * small visual pulses; MotionScript has no audio.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, KEYWORD_SET, transformPoint, validateSceneIR, type ResolvedDrawItem } from "@gvr/schema";

const BUILD_START = performance.now();
const DURATION = 30_000;

const BG = "#15181c";
const PANEL = "#1d2227";
const NODE_FILL = "#1b1f24";
const NODE_EDGE = "#5b636d";
const WIRE = "#3d444c";
const GRID = "#343a41";
const MUTED = "#8b949e";
const WHITE = "#f2f4f6";
const CYAN = "#3ad8ff";
const CYAN_DEEP = "#0f2a33";
const ORANGE = "#ff8a3d";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Value = number | [number, number];
type Key = [number, Value, Ease?];

// ---------------------------------------------------------------- the image

/** 28 × 28 grid, 7 world units a pixel, top-left corner. */
const CELL = 7;
const GRID_N = 28;
const IMG: Pt = { x: 22, y: 226 };
const IMG_SIZE = CELL * GRID_N;
const IMG_CENTRE: Pt = { x: IMG.x + IMG_SIZE / 2, y: IMG.y + IMG_SIZE / 2 };

/** The handwritten 7 in pixel units: a small hook, the top bar, the diagonal. */
const STROKE: [Pt, Pt, Pt, Pt][] = [
  [{ x: 5.6, y: 9.6 }, { x: 6.0, y: 8.4 }, { x: 7.4, y: 8.2 }, { x: 7.4, y: 8.2 }],
  [{ x: 7.4, y: 8.2 }, { x: 11, y: 7.4 }, { x: 16.5, y: 7.0 }, { x: 21.4, y: 7.5 }],
  [{ x: 21.4, y: 7.5 }, { x: 19.2, y: 12 }, { x: 15.6, y: 17.6 }, { x: 13.0, y: 24.2 }],
];

function bezier(seg: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  const [a, b, c, d] = seg;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

const STROKE_POINTS: Pt[] = STROKE.flatMap((seg) => Array.from({ length: 41 }, (_, i) => bezier(seg, i / 40)));

function distanceToStroke(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < STROKE_POINTS.length - 1; i += 1) {
    const a = STROKE_POINTS[i]!;
    const b = STROKE_POINTS[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(x - a.x - t * dx, y - a.y - t * dy));
  }
  return best;
}

/** Anti-aliased raster of the stroke, rounded to two decimals like a displayed intensity. */
const PIXELS: number[][] = Array.from({ length: GRID_N }, (_, r) =>
  Array.from({ length: GRID_N }, (_, c) => {
    const v = Math.max(0, Math.min(1, 1.6 - distanceToStroke(c + 0.5, r + 0.5)));
    return Math.round(v * 100) / 100;
  }),
);

const BINS = [0.25, 0.5, 0.75, 1];
const BANDS = 7;
const BAND_ROWS = GRID_N / BANDS;

function grey(level: number): string {
  const v = Math.round(22 + (242 - 22) * level);
  const h = v.toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
}

function pixelCentre(r: number, c: number): Pt {
  return { x: IMG.x + (c + 0.5) * CELL, y: IMG.y + (r + 0.5) * CELL };
}

// -------------------------------------------------------------- the network

const INPUT_X = 340;
const H1_X = 540;
const H2_X = 740;
const OUT_X = 920;
const CY = 324;
const R_IN = 7;
const R_H = 11;
const R_OUT = 13;

/** Fourteen representative inputs, in pixel index order. Rows and columns are 0-based. */
const INPUT_PIXELS: [number, number][] = [
  [3, 10], [7, 9], [7, 13], [8, 13], [10, 19], [13, 6], [14, 17],
  [16, 16], [18, 15], [20, 13], [21, 20], [23, 12], [25, 13], [27, 8],
];
const IN_Y = INPUT_PIXELS.map((_, k) => (k < 7 ? 144 + 24 * k : 360 + 24 * (k - 7)));
const inputValue = (k: number) => PIXELS[INPUT_PIXELS[k]![0]]![INPUT_PIXELS[k]![1]]!;
const pixelIndex = (k: number) => INPUT_PIXELS[k]![0] * GRID_N + INPUT_PIXELS[k]![1];

/** Inspected in [0–5s] in this order: a stroke pixel, an edge pixel, a background pixel. */
const INSPECT = [2, 9, 5];
const INSPECT_AT = [1.0, 1.67, 2.33];
const INSPECT_SCALE = 5.5;
/** Explicit pixel-to-input guides in [5–9s]: the three inspected pixels, then three more. */
const GUIDES = [2, 9, 5, 1, 6, 11];
const GUIDE_AT = [5.0, 5.25, 5.5, 5.75, 6.0, 6.25];

const H_Y = [164, 204, 244, 284, 364, 404, 444, 484];
const SELECTED = 3;
const OUT_Y = Array.from({ length: 10 }, (_, d) => CY + (d - 4.5) * 36);

/** The selected neuron's three representative incoming connections. */
const REP = [
  { k: 2, w: 0.62 },
  { k: 4, w: -0.41 },
  { k: 9, w: 0.35 },
];
const OTHERS_SUM = 0.41;
const BIAS = -0.18;
const round2 = (v: number) => Math.round(v * 100) / 100;
const PRODUCTS = REP.map(({ k, w }) => round2(inputValue(k) * w));
const Z = round2(PRODUCTS.reduce((a, b) => a + b, 0) + OTHERS_SUM + BIAS);
const ACT = Math.max(0, Z);

/** Illustrative hidden activations. Only the selected neuron is computed on screen. */
const H1_ACT = [0.1, 0, 0.58, ACT, 0.34, 0, 0.78, 0.21];
const H2_ACT = [0.05, 0.71, 0.3, 0, 0.88, 0.12, 0.47, 0];
const SUBDUED = 0.45;

/** Output scores, chosen so softmax gives 7: 92%, 1: 3%, 9: 2%, the other seven 3% together. */
const SCORES = [-1.6, -0.02, -2.3, -1.85, -2.05, -2.2, -1.7, 3.4, -2.4, -0.43];
const EXPS = SCORES.map(Math.exp);
const PROBS = EXPS.map((e) => e / EXPS.reduce((a, b) => a + b, 0));
const BAR_X = 120;
const BAR_MAX = 150;
const barLength = (d: number) => Math.max(1.5, PROBS[d]! * BAR_MAX);
const pctText = (d: number) => (PROBS[d]! >= 0.01 ? `${Math.round(PROBS[d]! * 100)}%` : "<1%");
const OTHER_DIGITS = [0, 2, 3, 4, 5, 6, 8];

/** Seeded weights, signs only, for the coloured wire overlays. */
function weights(rows: number, cols: number, seed: number): number[][] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => next() * 2 - 1));
}
const W1 = weights(14, 8, 7);
for (const { k, w } of REP) W1[k]![SELECTED] = w;
const W2 = weights(8, 8, 11);
const W3 = weights(8, 10, 13);
for (let j = 0; j < 8; j += 1) W3[j]![7] = Math.abs(W3[j]![7]!) * (H2_ACT[j]! > 0.25 ? 1 : -1);

// ------------------------------------------------------------------- timing

/** Camera stops: time, centre, zoom, ease into the next stop. */
const CAMERA: [number, Pt, number, Ease][] = [
  [0, IMG_CENTRE, 2.8, "hold"],
  [3.0, IMG_CENTRE, 2.8, "easeInOut"],
  [5.0, { x: 380, y: CY }, 1.5, "easeInOut"],
  [9.0, { x: 360, y: CY }, 1.42, "easeInOut"],
  [10.0, { x: 611, y: 312 }, 2.1, "hold"],
  [14.6, { x: 611, y: 312 }, 2.1, "easeInOut"],
  [15.8, { x: 640, y: CY }, 1.45, "linear"],
  [19.8, { x: 700, y: CY }, 1.45, "easeInOut"],
  [20.8, { x: 1040, y: CY }, 1.5, "hold"],
  [25.0, { x: 1040, y: CY }, 1.5, "easeInOut"],
  [26.0, { x: 687, y: 330 }, 0.94, "hold"],
  [30, { x: 687, y: 330 }, 0.94, "hold"],
];

const CAPTIONS: [string, number, number, string][] = [
  ["cap1", 15.4, 17.8, "Learned combinations of pixel patterns"],
  ["cap2", 17.95, 20.1, "Combine evidence across layers"],
  ["cap3", 25.4, 30, "Weights were learned during training; this is inference."],
];

const MULT_AT = [9.8, 10.2, 10.6];
const SUM_AT = 11.0;
const BIAS_AT = 11.8;
const Z_AT = 12.5;
const RELU_AT = 13.1;
const GLOW_AT = 13.9;
const H1_AT = (j: number) => 15.4 + j * 0.18;
const H2_AT = (j: number) => 17.4 + j * 0.17;
const SCORE_AT = (d: number) => 20.2 + d * 0.16;
const SOFTMAX_AT = 22.0;
const BAR_AT = 22.4;
const TRACE_START = 26.0;
const TRACE_END = 28.0;

// ------------------------------------------------------------------ helpers

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function fmt(value: Value): string {
  return typeof value === "number" ? n(value, 4) : `(${n(value[0], 4)}, ${n(value[1], 4)})`;
}

/** Signed two-decimal display with a true minus sign. */
function signed(value: number): string {
  return `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(2)}`;
}

function plain(value: number, digits = 2): string {
  return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
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
  ordered[0]!.t = 0;
  if (ordered[ordered.length - 1]!.t < DURATION) ordered.push({ t: DURATION, v: ordered[ordered.length - 1]!.v, ease: undefined });
  ordered[ordered.length - 1]!.t = DURATION;
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

/** Piecewise fades: each window eases from one value to the next, then holds. */
function span(target: string, windows: [number, number, number, number][], ease: Ease = "easeOut"): string {
  const keys: Key[] = [[0, windows[0]![2], "hold"]];
  for (const [from, to, a, b] of windows) {
    keys.push([from, a, ease]);
    keys.push([to, b, "hold"]);
  }
  return track(target, keys);
}

/** Short flashes that rise quickly and decay. */
function pulse(target: string, times: number[], peak = 1, width = 0.35): string {
  const keys: Key[] = [[0, 0, "hold"]];
  for (const at of [...times].sort((a, b) => a - b)) {
    keys.push([at, 0, "easeOut"]);
    keys.push([at + 0.06, peak, "easeIn"]);
    keys.push([at + width, 0, "hold"]);
  }
  return track(target, keys);
}

function text(name: string, x: number, y: number, content: string, size: number, fill: string, weight = 600, extra = ""): string {
  const align = extra.includes("align ") ? "" : "align center; ";
  const family = extra.includes("fontFamily ") ? "" : 'fontFamily "sans"; ';
  return `text ${name} { position (${n(x)}, ${n(y)}); content "${content}"; ${family}fontSize ${size}; fontWeight ${weight}; ${align}baseline middle; fill ${fill}; ${extra}};`;
}

function mono(name: string, x: number, y: number, content: string, size: number, fill: string, extra = ""): string {
  return text(name, x, y, content, size, fill, 500, `fontFamily "monospace"; ${extra.includes("align ") ? "" : "align center; "}${extra}`);
}

function segments(pairs: [Pt, Pt][]): string {
  return pairs.map(([a, b]) => `move (${n(a.x)}, ${n(a.y)}); line (${n(b.x)}, ${n(b.y)});`).join(" ");
}

function polyline(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? "move" : "line"} (${n(p.x)}, ${n(p.y)});`).join(" ");
}

function rectPath(x: number, y: number, w: number, h: number): string {
  return `move (${n(x)}, ${n(y)}); line (${n(x + w)}, ${n(y)}); line (${n(x + w)}, ${n(y + h)}); line (${n(x)}, ${n(y + h)}); close;`;
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

const inputAt = (k: number): Pt => ({ x: INPUT_X, y: IN_Y[k]! });
const h1At = (j: number): Pt => ({ x: H1_X, y: H_Y[j]! });
const h2At = (j: number): Pt => ({ x: H2_X, y: H_Y[j]! });
const outAt = (d: number): Pt => ({ x: OUT_X, y: OUT_Y[d]! });
const NEURON = h1At(SELECTED);

/** Highlight route for [25–30s]: inspected stroke pixel → input → hidden 1 → hidden 2 → output 7 → its bar. */
const ROUTE: Pt[] = [
  pixelCentre(...INPUT_PIXELS[2]!),
  inputAt(2),
  NEURON,
  h2At(4),
  outAt(7),
  { x: OUT_X + BAR_X + barLength(7), y: OUT_Y[7]! },
];
const ROUTE_LENGTHS = ROUTE.slice(1).map((p, i) => Math.hypot(p.x - ROUTE[i]!.x, p.y - ROUTE[i]!.y));
const ROUTE_TOTAL = ROUTE_LENGTHS.reduce((a, b) => a + b, 0);
/** Time at which the travelling highlight reaches ROUTE[i]; constant speed so it matches the trimmed trail. */
const routeAt = (i: number) => TRACE_START + (ROUTE_LENGTHS.slice(0, i).reduce((a, b) => a + b, 0) / ROUTE_TOTAL) * (TRACE_END - TRACE_START);
const STAGES: [string, number, number][] = [
  ["Pixels", IMG_CENTRE.x, 0],
  ["Weighted sums + activations", (H1_X + H2_X) / 2, 1],
  ["Scores", OUT_X + 25, 4],
  ["Probabilities", OUT_X + BAR_X + 75, 5],
];
const STAGE_Y = 548;

// ------------------------------------------------------------------ program

function imagePart(): string {
  const ink = STROKE.map((seg, i) => `${i === 0 ? `move (${n(IMG.x + seg[0].x * CELL)}, ${n(IMG.y + seg[0].y * CELL)}); ` : ""}cubic (${n(IMG.x + seg[1].x * CELL)}, ${n(IMG.y + seg[1].y * CELL)}) (${n(IMG.x + seg[2].x * CELL)}, ${n(IMG.y + seg[2].y * CELL)}) (${n(IMG.x + seg[3].x * CELL)}, ${n(IMG.y + seg[3].y * CELL)});`).join(" ");
  const cells: string[] = [];
  for (let band = 0; band < BANDS; band += 1) {
    for (let bin = 0; bin < BINS.length; bin += 1) {
      const rects: string[] = [];
      for (let r = band * BAND_ROWS; r < (band + 1) * BAND_ROWS; r += 1) {
        for (let c = 0; c < GRID_N; c += 1) {
          const v = PIXELS[r]![c]!;
          if (v < 0.03) continue;
          const b = BINS.findIndex((level) => v <= level + 1e-9);
          if (b === bin) rects.push(rectPath(c * CELL, r * CELL, CELL, CELL));
        }
      }
      if (rects.length > 0) cells.push(`path b${band}l${bin} { ${rects.join(" ")} fill ${grey(BINS[bin]!)}; opacity 0; };`);
    }
  }
  const vertical = Array.from({ length: GRID_N + 1 }, (_, i) => [{ x: i * CELL, y: 0 }, { x: i * CELL, y: IMG_SIZE }] as [Pt, Pt]);
  const rows = Array.from({ length: BANDS }, (_, band) => {
    const lines: [Pt, Pt][] = [];
    for (let r = band * BAND_ROWS; r < (band + 1) * BAND_ROWS + (band === BANDS - 1 ? 1 : 0); r += 1) lines.push([{ x: 0, y: r * CELL }, { x: IMG_SIZE, y: r * CELL }]);
    return `path r${band} { ${segments(lines)} stroke ${GRID} width 0.35; opacity 0; };`;
  });
  const inspect = INSPECT.map((k, j) => {
    const [r, c] = INPUT_PIXELS[k]!;
    const at = pixelCentre(r, c);
    const v = PIXELS[r]![c]!;
    const side = c < 10 ? -1 : 1;
    return `group pk${j} {
    position (${n(at.x)}, ${n(at.y)});
    zIndex ${10 + j};
    rectangle mark { position (-3.5, -3.5); size (7, 7); stroke ${CYAN} width 0.7; opacity 0; };
    group zoom {
      opacity 0;
      rectangle sq { position (-3.5, -3.5); size (7, 7); fill ${grey(v)}; stroke ${CYAN} width 0.35; };
    };
    group tag {
      position (${side * 32}, 0);
      opacity 0;
      rectangle plate { position (-17, -8); size (34, 16); cornerRadius 3; fill ${BG}; stroke ${CYAN} width 0.5; };
      ${mono("val", 0, 0.5, v.toFixed(2), 10, WHITE)}
    };
  };`;
  });
  return `group img {
  zIndex 2;
  rectangle frame { position (${IMG.x - 1}, ${IMG.y - 1}); size (${IMG_SIZE + 2}, ${IMG_SIZE + 2}); fill #0e1013; stroke ${GRID} width 0.8; };
  path ink { ${ink} stroke ${WHITE} width ${n(2.3 * CELL)} cap round join round; };
  group cells {
    position (${IMG.x}, ${IMG.y});
    ${cells.join("\n    ")}
  };
  group gridH {
    position (${IMG.x}, ${IMG.y});
    ${rows.join("\n    ")}
  };
  group gridV {
    position (${IMG.x}, ${IMG.y});
    scale (1, 0);
    path lines { ${segments(vertical)} stroke ${GRID} width 0.35; };
  };
  group scan {
    position (${IMG.x}, ${IMG.y});
    opacity 0;
    rectangle haze { position (0, -7); size (${IMG_SIZE}, 14); fill ${CYAN}; opacity 0.14; };
    rectangle bar { position (0, -0.7); size (${IMG_SIZE}, 1.4); fill ${CYAN}; };
  };
  ${text("label", IMG_CENTRE.x, IMG.y - 14, "28 × 28 pixels", 10, MUTED, 600, "opacity 0; ")}
  ${inspect.join("\n  ")}
};`;
}

function wiresPart(): string {
  const a: [Pt, Pt][] = [];
  const aPos: [Pt, Pt][] = [];
  const aNeg: [Pt, Pt][] = [];
  for (let k = 0; k < 14; k += 1) {
    for (let j = 0; j < 8; j += 1) {
      const pair: [Pt, Pt] = [inputAt(k), h1At(j)];
      a.push(pair);
      const w = W1[k]![j]!;
      if (w > 0.25) aPos.push(pair);
      if (w < -0.25) aNeg.push(pair);
    }
  }
  const layer = (from: (i: number) => Pt, to: (i: number) => Pt, rows: number, cols: number, w: number[][]) => {
    const all: [Pt, Pt][] = [];
    const pos: [Pt, Pt][] = [];
    const neg: [Pt, Pt][] = [];
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        const pair: [Pt, Pt] = [from(i), to(j)];
        all.push(pair);
        if (w[i]![j]! > 0.25) pos.push(pair);
        if (w[i]![j]! < -0.25) neg.push(pair);
      }
    }
    return { all, pos, neg };
  };
  const b = layer(h1At, h2At, 8, 8, W2);
  const c = layer(h2At, outAt, 8, 10, W3);
  const fan = Array.from({ length: 14 }, (_, k) => [inputAt(k), NEURON] as [Pt, Pt]);
  const wire = (id: string, pairs: [Pt, Pt][], color: string, width: number, opacity: number) =>
    `path ${id} { ${segments(pairs)} stroke ${color} width ${width}; opacity ${opacity}; };`;
  const guides = GUIDES.map((k) => {
    const [r, c2] = INPUT_PIXELS[k]!;
    const from = pixelCentre(r, c2);
    const to = { x: INPUT_X - R_IN - 2, y: IN_Y[k]! };
    return `path g${k} { move (${n(from.x)}, ${n(from.y)}); line (${n(to.x)}, ${n(to.y)}); stroke ${CYAN} width 0.9 cap round; opacity 0; };`;
  });
  return `group wires {
  zIndex 3;
  opacity 0;
  ${wire("a", a, WIRE, 0.5, 0.8)}
  ${wire("b", b.all, WIRE, 0.5, 0.8)}
  ${wire("c", c.all, WIRE, 0.5, 0.8)}
  ${wire("aPos", aPos, CYAN, 0.8, 0)}
  ${wire("aNeg", aNeg, ORANGE, 0.8, 0)}
  ${wire("bPos", b.pos, CYAN, 0.8, 0)}
  ${wire("bNeg", b.neg, ORANGE, 0.8, 0)}
  ${wire("cPos", c.pos, CYAN, 0.9, 0)}
  ${wire("cNeg", c.neg, ORANGE, 0.9, 0)}
  ${wire("fan", fan, WHITE, 0.9, 0)}
};
group guides {
  zIndex 4;
  ${guides.join("\n  ")}
};`;
}

function nodeGroup(id: string, at: Pt, radius: number, extra = ""): string {
  return `group ${id} {
    position (${n(at.x)}, ${n(at.y)});
    circle base { radius ${radius}; fill ${NODE_FILL}; stroke ${NODE_EDGE} width 1; };
    circle glow { radius ${radius}; fill ${CYAN}; opacity 0; };
    circle tick { radius ${radius + 3}; stroke ${CYAN} width 1; opacity 0; };
    ${extra}
  };`;
}

function layersPart(): string {
  const inputs = IN_Y.map((y, k) => nodeGroup(`n${k}`, { x: INPUT_X, y }, R_IN));
  const hidden = (prefix: string, x: number, title: string) => {
    const nodes = H_Y.map((y, j) => nodeGroup(`n${j}`, { x, y }, R_H, prefix === "h1" && j === SELECTED ? `circle sel { radius ${R_H + 4}; stroke ${WHITE} width 1.4; opacity 0; };` : ""));
    return `group ${prefix} {
  zIndex 6;
  opacity 0;
  ${text("title", x, 116, title, 12, WHITE, 700)}
  ${text("sub", x, 132, "learned representation", 9, MUTED, 500)}
  ${text("more", x, CY, "⋮", 20, MUTED, 600)}
  rectangle beat { position (${x - 22}, 146); size (44, 356); cornerRadius 22; stroke ${CYAN} width 1.2; opacity 0; };
  ${nodes.join("\n  ")}
};`;
  };
  const outputs = OUT_Y.map((y, d) => {
    const ring = d === 7 ? `circle win { radius ${R_OUT + 4}; stroke ${CYAN} width 2.2; opacity 0; };` : "";
    return `group d${d} {
    position (${OUT_X}, ${n(y)});
    circle base { radius ${R_OUT}; fill ${NODE_FILL}; stroke ${NODE_EDGE} width 1; };
    circle glow { radius ${R_OUT}; fill ${CYAN}; opacity 0; };
    circle neg { radius ${R_OUT}; fill ${ORANGE}; opacity 0; };
    ${ring}
    ${text("digit", 0, 0.5, String(d), 12, WHITE, 700)}
    ${mono("score", 25, 0.5, plain(SCORES[d]!), 11, SCORES[d]! >= 0 ? CYAN : ORANGE, "align left; opacity 0; ")}
    rectangle bar { position (${BAR_X}, -6); size (${n(barLength(d), 3)}, 12); fill ${d === 7 ? CYAN : MUTED}; scale (0, 1); };
    ${mono("pct", BAR_X + barLength(d) + 6, 0.5, pctText(d), 11, d === 7 ? CYAN : WHITE, "align left; opacity 0; ")}
  };`;
  });
  return `group inp {
  zIndex 6;
  opacity 0;
  ${text("title", INPUT_X, 116, "784 inputs", 12, WHITE, 700)}
  ${text("more", INPUT_X, CY, "⋮", 20, MUTED, 600)}
  group brace {
    opacity 0;
    rectangle plate { position (${INPUT_X + 14}, ${CY - 12}); size (104, 24); cornerRadius 4; fill ${BG}; opacity 0.92; };
    path mark { move (${INPUT_X + 12}, 140); line (${INPUT_X + 18}, 140); line (${INPUT_X + 18}, 508); line (${INPUT_X + 12}, 508); move (${INPUT_X + 18}, ${CY}); line (${INPUT_X + 23}, ${CY}); stroke ${WHITE} width 1.1 join round; };
    ${text("words", INPUT_X + 26, CY + 0.5, "One input per pixel", 10, WHITE, 600, "align left; ")}
  };
  ${inputs.join("\n  ")}
};
${hidden("h1", H1_X, "Hidden layer 1")}
${hidden("h2", H2_X, "Hidden layer 2")}
group out {
  zIndex 6;
  opacity 0;
  ${text("title", OUT_X, 116, "Outputs 0–9", 12, WHITE, 700)}
  ${text("scores", OUT_X + 42, 132, "scores", 9, MUTED, 500, "opacity 0; ")}
  ${text("probs", OUT_X + BAR_X + 75, 132, "probability", 9, MUTED, 500, "opacity 0; ")}
  group smax {
    opacity 0;
    rectangle box { position (${OUT_X + 75}, 148); size (32, 352); cornerRadius 6; fill ${PANEL}; stroke ${NODE_EDGE} width 1; };
    rectangle glow { position (${OUT_X + 73}, 146); size (36, 356); cornerRadius 8; stroke ${CYAN} width 1.6; opacity 0; };
    ${text("word", OUT_X + 91, CY, "Softmax", 12, WHITE, 700, "rotation 270deg; ")}
  };
  ${text("others", OUT_X + BAR_X, 514, `${OTHER_DIGITS.join(", ")} combined: ${Math.round(OTHER_DIGITS.reduce((s, d) => s + PROBS[d]!, 0) * 100)}%`, 10, MUTED, 500, "align left; opacity 0; ")}
  ${outputs.join("\n  ")}
};`;
}

function calcPart(): string {
  const reps = REP.map(({ k, w }, i) => {
    const from = inputAt(k);
    const label = lerp(from, NEURON, 0.42);
    return `path c${i} { move (${from.x + R_IN}, ${from.y}); line (${NEURON.x - R_H}, ${NEURON.y}); stroke ${w >= 0 ? CYAN : ORANGE} width 1.8 cap round; opacity 0; };
  path p${i} { move (${from.x + R_IN}, ${from.y}); line (${NEURON.x - R_H}, ${NEURON.y}); stroke ${WHITE} width 3 cap round; };
  group m${i} {
    position (${n(label.x + 16)}, ${n(label.y - 9)});
    opacity 0;
    rectangle plate { position (-74, -7); size (108, 14); cornerRadius 3; fill ${BG}; opacity 0.9; };
    ${mono("eq", 0, 0.5, `${inputValue(k).toFixed(2)} × ${plain(w)} =`, 9, WHITE, "align right; ")}
  };
  ${mono(`r${i}`, label.x + 18, label.y - 8.5, signed(PRODUCTS[i]!), 9, PRODUCTS[i]! >= 0 ? CYAN : ORANGE, "align left; opacity 0; ")}`;
  });
  const g = { x: 650, y: 230 };
  return `group calc {
  zIndex 8;
  rectangle panel { position (553, 176); size (262, 176); cornerRadius 8; fill ${BG}; stroke ${GRID} width 0.8; opacity 0; };
  ${reps.join("\n  ")}
  group more {
    position (432, 306);
    opacity 0;
    rectangle plate { position (-34, -7); size (68, 26); cornerRadius 3; fill ${BG}; opacity 0.9; };
    ${text("dots", 0, 0, "⋯ 781 more", 9, MUTED, 500)}
  };
  ${mono("moreSum", 432, 318, signed(OTHERS_SUM), 9, CYAN, "opacity 0; ")}
  ${text("sigma", NEURON.x, NEURON.y + 0.5, "Σ", 14, WHITE, 700, "opacity 0; ")}
  ${mono("bias", 585, 330, `b = ${plain(BIAS)}`, 9, ORANGE, "opacity 0; ")}
  ${mono("zval", 558, NEURON.y + 0.5, `z = ${plain(Z)}`, 10, WHITE, "align left; opacity 0; ")}
  group arrow {
    opacity 0;
    line shaft { from (614, ${NEURON.y}); to (642, ${NEURON.y}); stroke ${WHITE} width 1.2; };
    polygon tip { points ((646, ${NEURON.y}), (639, ${NEURON.y - 3.5}), (639, ${NEURON.y + 3.5})); fill ${WHITE}; };
  };
  ${text("f1", 684, 194, "z = Σᵢ wᵢ xᵢ + b", 12, WHITE, 600, "opacity 0; ")}
  ${text("f2", 684, 212, "a = max(0, z)", 12, WHITE, 600, "opacity 0; ")}
  group graph {
    position (${g.x}, ${g.y});
    opacity 0;
    rectangle box { position (0, 0); size (150, 110); cornerRadius 6; fill ${PANEL}; stroke ${GRID} width 0.8; };
    ${text("name", 8, 12, "ReLU", 9, MUTED, 600, "align left; ")}
    path axes { move (8, 80); line (142, 80); move (55, 104); line (55, 14); stroke ${NODE_EDGE} width 0.8; };
    ${text("zaxis", 140, 90, "z", 8, MUTED, 500)}
    path relu { move (10, 80); line (55, 80); line (125, 10); stroke ${CYAN} width 1.8 join round; };
    circle dot { position (55, 80); radius 3.6; fill ${WHITE}; opacity 0; };
    ${mono("aval", 14, 30, `a = ${plain(ACT)}`, 9, CYAN, "align left; opacity 0; ")}
  };
  circle boom { position (${NEURON.x}, ${NEURON.y}); radius ${R_H}; stroke ${CYAN} width 1.4; opacity 0; };
};`;
}

function tracePart(): string {
  const stages = STAGES.map(([words, x], i) => text(`s${i}`, x, STAGE_Y, words, 12, WHITE, 650, "opacity 0; "));
  const arrows = STAGES.slice(1).map(([, x], i) => {
    return text(`a${i}`, (STAGES[i]![1] + x) / 2, STAGE_Y, "→", 18, MUTED, 600, "opacity 0; ");
  });
  return `path trail { ${polyline(ROUTE)} stroke ${CYAN} width 2.4 cap round join round; opacity 0; zIndex 9; };
group hl {
  position (${n(ROUTE[0]!.x)}, ${n(ROUTE[0]!.y)});
  opacity 0;
  zIndex 12;
  circle halo { radius 11; fill ${CYAN}; opacity 0.3; };
  circle core { radius 4.5; fill ${WHITE}; };
};
group stages {
  zIndex 10;
  ${stages.join("\n  ")}
  ${arrows.join("\n  ")}
};
group pred {
  position (1290, ${OUT_Y[7]});
  opacity 0;
  zIndex 10;
  rectangle badge { position (-62, -15); size (124, 30); cornerRadius 6; fill ${CYAN_DEEP}; stroke ${CYAN} width 1.5; };
  ${text("words", 0, 0.5, "Prediction: 7", 15, WHITE, 700)}
  rectangle ping { position (-62, -15); size (124, 30); cornerRadius 6; stroke ${CYAN} width 2; opacity 0; };
};`;
}

function motionPart(): string {
  const motion: string[] = [];

  // [0–5s] The grid scans over the 7, three pixels are inspected, then the camera pulls back.
  motion.push(span("img.scan.opacity", [[0.15, 0.25, 0, 1], [1.15, 1.3, 1, 0]]));
  motion.push(track("img.scan.position.y", [[0, IMG.y, "hold"], [0.2, IMG.y, "linear"], [1.2, IMG.y + IMG_SIZE, "hold"]]));
  motion.push(track("img.gridV.scale", [[0, [1, 0], "hold"], [0.2, [1, 0], "linear"], [1.2, [1, 1], "hold"]]));
  for (let band = 0; band < BANDS; band += 1) {
    const at = 0.2 + ((band + 0.5) / BANDS) * 1.0;
    motion.push(span(`img.gridH.r${band}.opacity`, [[at - 0.08, at + 0.08, 0, 1]]));
    for (let bin = 0; bin < BINS.length; bin += 1) {
      if (programHasCells(band, bin)) motion.push(span(`img.cells.b${band}l${bin}.opacity`, [[at - 0.05, at + 0.15, 0, 0.94]]));
    }
  }
  motion.push(span("img.ink.opacity", [[0.3, 1.2, 1, 0.3]], "easeInOut"));
  motion.push(span("img.label.opacity", [[0.9, 1.2, 0, 1]]));
  INSPECT.forEach((_, j) => {
    const t0 = INSPECT_AT[j]!;
    motion.push(span(`img.pk${j}.mark.opacity`, [[t0, t0 + 0.1, 0, 1], [8.0, 8.6, 1, 0]]));
    motion.push(span(`img.pk${j}.zoom.opacity`, [[t0, t0 + 0.06, 0, 1], [t0 + 0.6, t0 + 0.66, 1, 0]]));
    motion.push(track(`img.pk${j}.zoom.scale`, [[0, [1, 1], "hold"], [t0, [1, 1], "easeOut"], [t0 + 0.18, [INSPECT_SCALE, INSPECT_SCALE], "hold"], [t0 + 0.48, [INSPECT_SCALE, INSPECT_SCALE], "easeIn"], [t0 + 0.66, [1, 1], "hold"]]));
    motion.push(span(`img.pk${j}.tag.opacity`, [[t0 + 0.1, t0 + 0.2, 0, 1], [t0 + 0.5, t0 + 0.62, 1, 0]]));
  });

  // The network appears to the right while the camera pulls back.
  motion.push(span("wires.opacity", [[3.4, 4.4, 0, 1]], "easeInOut"));
  for (const id of ["inp", "h1", "h2", "out"]) motion.push(span(`${id}.opacity`, [[3.5 + (id === "inp" ? 0 : id === "h1" ? 0.2 : id === "h2" ? 0.4 : 0.6), 4.5 + (id === "inp" ? 0 : 0.3), 0, 1]], "easeInOut"));

  // Guides: the three inspected pixels connect first, then three more in [5–9s].
  GUIDES.forEach((k, i) => {
    const drawAt = i < 3 ? 4.3 + i * 0.1 : GUIDE_AT[i]! - 0.3;
    motion.push(span(`guides.g${k}.opacity`, [[drawAt, drawAt + 0.05, 0, 0.85], [8.0, 8.6, 0.85, 0]]));
    motion.push(track(`guides.g${k}.trim.end`, [[0, 0, "hold"], [drawAt, 0, "easeInOut"], [drawAt + 0.5, 1, "hold"]]));
  });

  // [5–9s] Values arrive. Guided inputs get a value chip; the rest light in index order.
  const arrive = (k: number) => {
    const g = GUIDES.indexOf(k);
    return g >= 0 ? GUIDE_AT[g]! + 0.6 : 5.15 + k * 0.13;
  };
  for (let k = 0; k < 14; k += 1) {
    const at = arrive(k);
    const v = inputValue(k);
    motion.push(track(`inp.n${k}.glow.opacity`, [[0, 0, "hold"], [at, 0, "easeOut"], [at + 0.25, v, "hold"], [17.0, v, "easeInOut"], [17.8, v * SUBDUED, "hold"]]));
    motion.push(pulse(`inp.n${k}.tick.opacity`, [at], 0.9, 0.3));
  }
  GUIDES.forEach((k, i) => {
    const [r, c] = INPUT_PIXELS[k]!;
    const from = pixelCentre(r, c);
    const to = { x: INPUT_X - R_IN - 10, y: IN_Y[k]! };
    const t0 = GUIDE_AT[i]!;
    motion.push(span(`chips.v${k}.opacity`, [[t0, t0 + 0.08, 0, 1], [t0 + 0.55, t0 + 0.65, 1, 0]]));
    motion.push(track(`chips.v${k}.position.x`, [[0, from.x, "hold"], [t0, from.x, "easeInOut"], [t0 + 0.6, to.x, "hold"]]));
    motion.push(track(`chips.v${k}.position.y`, [[0, from.y, "hold"], [t0, from.y, "easeInOut"], [t0 + 0.6, to.y, "hold"]]));
  });
  motion.push(span("inp.brace.opacity", [[6.0, 6.4, 0, 1], [8.4, 8.9, 1, 0]]));

  // Transition into [9–15s]: every connection into the selected neuron lights, then three remain.
  motion.push(span("wires.fan.opacity", [[8.4, 8.9, 0, 0.9], [9.3, 9.8, 0.9, 0.12], [14.8, 15.3, 0.12, 0]]));
  motion.push(span(`h1.n${SELECTED}.sel.opacity`, [[8.5, 8.9, 0, 1], [15.2, 15.6, 1, 0]]));
  motion.push(span("wires.a.opacity", [[9.2, 9.7, 0.8, 0.3], [14.8, 15.6, 0.3, 0.8]]));
  motion.push(span("wires.b.opacity", [[9.2, 9.7, 0.8, 0.3], [14.8, 15.6, 0.3, 0.8]]));

  // [9–15s] Multiply, sum with bias, activate.
  motion.push(span("calc.panel.opacity", [[9.3, 9.8, 0, 0.96], [14.9, 15.4, 0.96, 0]]));
  REP.forEach(({ k }, i) => {
    const t0 = MULT_AT[i]!;
    motion.push(span(`calc.c${i}.opacity`, [[9.3, 9.8, 0, 1], [14.9, 15.4, 1, 0]]));
    motion.push(track(`calc.p${i}.trim.end`, [[0, 0, "hold"], [t0, 0, "linear"], [t0 + 0.45, 1, "hold"]]));
    motion.push(track(`calc.p${i}.trim.start`, [[0, 0, "hold"], [t0 + 0.12, 0, "linear"], [t0 + 0.57, 1, "hold"]]));
    motion.push(span(`calc.m${i}.opacity`, [[t0, t0 + 0.2, 0, 1], [12.2, 12.6, 1, 0]]));
    motion.push(span(`calc.r${i}.opacity`, [[t0 + 0.3, t0 + 0.45, 0, 1], [SUM_AT + 0.6, SUM_AT + 0.8, 1, 0]]));
    const label = lerp(inputAt(k), NEURON, 0.42);
    motion.push(track(`calc.r${i}.position.x`, [[0, label.x + 18, "hold"], [SUM_AT + i * 0.05, label.x + 18, "easeIn"], [SUM_AT + 0.8, NEURON.x - 8, "hold"]]));
    motion.push(track(`calc.r${i}.position.y`, [[0, label.y - 8.5, "hold"], [SUM_AT + i * 0.05, label.y - 8.5, "easeIn"], [SUM_AT + 0.8, NEURON.y, "hold"]]));
    motion.push(pulse(`inp.n${k}.tick.opacity`, [arrive(k), t0], 0.9, 0.3));
  });
  motion.push(span("calc.more.opacity", [[10.0, 10.3, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.moreSum.opacity", [[10.9, 11.1, 0, 1], [SUM_AT + 0.6, SUM_AT + 0.8, 1, 0]]));
  motion.push(track("calc.moreSum.position.x", [[0, 432, "hold"], [SUM_AT + 0.15, 432, "easeIn"], [SUM_AT + 0.8, NEURON.x - 8, "hold"]]));
  motion.push(track("calc.moreSum.position.y", [[0, 318, "hold"], [SUM_AT + 0.15, 318, "easeIn"], [SUM_AT + 0.8, NEURON.y, "hold"]]));
  motion.push(span("calc.sigma.opacity", [[10.8, 11.0, 0, 1], [GLOW_AT, GLOW_AT + 0.3, 1, 0]]));
  motion.push(span("calc.bias.opacity", [[BIAS_AT - 0.2, BIAS_AT, 0, 1], [BIAS_AT + 0.45, BIAS_AT + 0.6, 1, 0]]));
  motion.push(track("calc.bias.position.x", [[0, 585, "hold"], [BIAS_AT, 585, "easeIn"], [BIAS_AT + 0.6, NEURON.x + 4, "hold"]]));
  motion.push(track("calc.bias.position.y", [[0, 330, "hold"], [BIAS_AT, 330, "easeIn"], [BIAS_AT + 0.6, NEURON.y + 4, "hold"]]));
  motion.push(span("calc.f1.opacity", [[11.2, 11.6, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.zval.opacity", [[Z_AT, Z_AT + 0.3, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.arrow.opacity", [[RELU_AT - 0.2, RELU_AT, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.graph.opacity", [[RELU_AT - 0.2, RELU_AT + 0.1, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.f2.opacity", [[RELU_AT, RELU_AT + 0.4, 0, 1], [14.9, 15.3, 1, 0]]));
  motion.push(span("calc.graph.dot.opacity", [[RELU_AT + 0.1, RELU_AT + 0.2, 0, 1]]));
  motion.push(track("calc.graph.dot.position.x", [[0, 55, "hold"], [RELU_AT + 0.2, 55, "easeInOut"], [RELU_AT + 0.75, 55 + 70 * (ACT / 1.5556), "hold"]]));
  motion.push(track("calc.graph.dot.position.y", [[0, 80, "hold"], [RELU_AT + 0.2, 80, "easeInOut"], [RELU_AT + 0.75, 80 - 70 * (ACT / 1.5556), "hold"]]));
  motion.push(span("calc.graph.aval.opacity", [[RELU_AT + 0.7, RELU_AT + 0.9, 0, 1]]));
  motion.push(span("calc.boom.opacity", [[GLOW_AT + 0.1, GLOW_AT + 0.15, 0, 0.9], [GLOW_AT + 0.15, GLOW_AT + 0.9, 0.9, 0]]));
  motion.push(track("calc.boom.scale", [[0, [1, 1], "hold"], [GLOW_AT + 0.1, [1, 1], "easeOut"], [GLOW_AT + 0.9, [3.2, 3.2], "hold"]]));

  // [15–20s] Hidden layer 1 reveals its pattern, then hidden layer 2 computes from it.
  H1_ACT.forEach((a, j) => {
    const at = j === SELECTED ? GLOW_AT : H1_AT(j);
    motion.push(track(`h1.n${j}.glow.opacity`, [[0, 0, "hold"], [at, 0, "easeOut"], [at + 0.5, a, "hold"], [17.0, a, "easeInOut"], [17.8, a * SUBDUED, "hold"]]));
    if (j !== SELECTED) motion.push(pulse(`h1.n${j}.tick.opacity`, [at], 0.7, 0.35));
  });
  H2_ACT.forEach((a, j) => {
    const at = H2_AT(j);
    motion.push(span(`h2.n${j}.glow.opacity`, [[at, at + 0.5, 0, a]]));
    motion.push(pulse(`h2.n${j}.tick.opacity`, [at], 0.7, 0.35));
  });
  motion.push(span("wires.aPos.opacity", [[15.2, 15.5, 0, 0.75], [16.6, 17.2, 0.75, 0.18]]));
  motion.push(span("wires.aNeg.opacity", [[15.2, 15.5, 0, 0.75], [16.6, 17.2, 0.75, 0.18]]));
  motion.push(span("wires.bPos.opacity", [[17.0, 17.3, 0, 0.8], [18.6, 19.2, 0.8, 0.2]]));
  motion.push(span("wires.bNeg.opacity", [[17.0, 17.3, 0, 0.8], [18.6, 19.2, 0.8, 0.2]]));
  motion.push(pulse("h1.beat.opacity", [16.4], 0.7, 0.6));
  motion.push(pulse("h2.beat.opacity", [18.5], 0.7, 0.6));
  motion.push(span("wires.cPos.opacity", [[19.3, 19.8, 0, 0.85], [22.0, 22.6, 0.85, 0.22]]));
  motion.push(span("wires.cNeg.opacity", [[19.3, 19.8, 0, 0.85], [22.0, 22.6, 0.85, 0.22]]));

  // [20–25s] Scores, softmax, probabilities.
  motion.push(span("out.scores.opacity", [[20.1, 20.4, 0, 1], [22.0, 22.4, 1, 0]]));
  SCORES.forEach((s, d) => {
    const at = SCORE_AT(d);
    motion.push(span(`out.d${d}.score.opacity`, [[at, at + 0.25, 0, 1], [SOFTMAX_AT + d * 0.03, SOFTMAX_AT + 0.4 + d * 0.03, 1, 0]]));
    motion.push(track(`out.d${d}.score.position.x`, [[0, 25, "hold"], [SOFTMAX_AT + d * 0.03, 25, "easeIn"], [SOFTMAX_AT + 0.4 + d * 0.03, 62, "hold"]]));
    if (s >= 0) motion.push(span(`out.d${d}.glow.opacity`, [[at, at + 0.3, 0, Math.min(1, s / 3.4)]]));
    else motion.push(span(`out.d${d}.neg.opacity`, [[at, at + 0.3, 0, Math.min(0.75, (-s / 2.5) * 0.75)]]));
    const barAt = BAR_AT + (d === 7 ? 0.2 : 0.05 * d);
    motion.push(track(`out.d${d}.bar.scale`, [[0, [0, 1], "hold"], [barAt, [0, 1], "easeOut"], [barAt + (d === 7 ? 1.4 : 0.8), [1, 1], "hold"]]));
    motion.push(span(`out.d${d}.pct.opacity`, [[23.2 + (d === 7 ? 0.4 : 0), 23.5 + (d === 7 ? 0.4 : 0), 0, 1]]));
  });
  motion.push(span("out.smax.opacity", [[20.6, 21.2, 0, 1]]));
  motion.push(track("out.smax.glow.opacity", [[0, 0, "hold"], [21.6, 0, "easeIn"], [22.5, 1, "easeOut"], [23.4, 0.15, "hold"]]));
  motion.push(span("out.probs.opacity", [[22.4, 22.8, 0, 1]]));
  motion.push(span("out.others.opacity", [[23.6, 24.0, 0, 1]]));
  motion.push(span("out.d7.win.opacity", [[24.4, 24.8, 0, 1]]));
  for (const d of OTHER_DIGITS.concat([1, 9])) motion.push(span(`out.d${d}.opacity`, [[24.4, 25.0, 1, 0.6]]));

  // [25–30s] Prediction, then one highlight retraces the forward pass.
  motion.push(span("pred.opacity", [[25.6, 26.0, 0, 1]]));
  motion.push(pulse("pred.ping.opacity", [26.0], 0.9, 0.6));
  motion.push(span("trail.opacity", [[TRACE_START - 0.05, TRACE_START, 0, 0.9], [TRACE_END + 0.3, TRACE_END + 0.9, 0.9, 0.55]]));
  motion.push(track("trail.trim.end", [[0, 0, "hold"], [TRACE_START, 0, "linear"], [TRACE_END, 1, "hold"]]));
  motion.push(span("hl.opacity", [[TRACE_START - 0.15, TRACE_START, 0, 1], [TRACE_END + 0.3, TRACE_END + 0.8, 1, 0]]));
  const hlKeys = (axis: "x" | "y"): Key[] => [[0, ROUTE[0]![axis], "hold"], ...ROUTE.map((p, i) => [routeAt(i), p[axis], i < ROUTE.length - 1 ? "linear" : "hold"] as Key)];
  motion.push(track("hl.position.x", hlKeys("x")));
  motion.push(track("hl.position.y", hlKeys("y")));
  STAGES.forEach(([, , routeIndex], i) => {
    const at = routeAt(routeIndex);
    motion.push(span(`stages.s${i}.opacity`, [[at - 0.1, at + 0.15, 0, 1]]));
    if (i > 0) motion.push(span(`stages.a${i - 1}.opacity`, [[at - 0.2, at, 0, 1]]));
  });

  // Screen captions.
  motion.push(span("captions.plate.opacity", [[15.2, 15.5, 0, 0.86], [20.0, 20.3, 0.86, 0], [25.2, 25.5, 0, 0.86]]));
  for (const [id, show, hide] of CAPTIONS) {
    const windows: [number, number, number, number][] = [[show, show + 0.25, 0, 1]];
    if (hide < 30) windows.push([hide - 0.2, hide, 1, 0]);
    motion.push(span(`captions.${id}.opacity`, windows));
  }

  motion.push(track("camera(main).position.x", CAMERA.map(([t, p, , e]) => [t, p.x, e] as Key)));
  motion.push(track("camera(main).position.y", CAMERA.map(([t, p, , e]) => [t, p.y, e] as Key)));
  motion.push(track("camera(main).zoom", CAMERA.map(([t, , z, e]) => [t, z, e] as Key)));
  return dedupe(motion).join("\n");
}

/** A later track for the same target replaces the earlier one; keep one writer per channel. */
function dedupe(tracks: string[]): string[] {
  const byTarget = new Map<string, string>();
  for (const entry of tracks) {
    const target = /^keyframes (\S+) \{/.exec(entry)?.[1];
    if (!target) continue;
    byTarget.set(target, entry);
  }
  return [...byTarget.values()];
}

function programHasCells(band: number, bin: number): boolean {
  for (let r = band * BAND_ROWS; r < (band + 1) * BAND_ROWS; r += 1) {
    for (let c = 0; c < GRID_N; c += 1) {
      const v = PIXELS[r]![c]!;
      if (v >= 0.03 && BINS.findIndex((level) => v <= level + 1e-9) === bin) return true;
    }
  }
  return false;
}

function program(): string {
  const chips = GUIDES.map((k) => {
    const [r, c] = INPUT_PIXELS[k]!;
    const at = pixelCentre(r, c);
    return `group v${k} {
    position (${n(at.x)}, ${n(at.y)});
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill ${CYAN_DEEP}; stroke ${CYAN} width 0.6; };
    ${mono("val", 0, 0.5, inputValue(k).toFixed(2), 8, WHITE)}
  };`;
  });
  const captions = CAPTIONS.map(([id, , , words]) => text(id, 640, 679, words, id === "cap3" ? 16 : 19, WHITE, id === "cap3" ? 500 : 600, "opacity 0; ")).join("\n  ");
  return `// FROM PIXELS TO PREDICTION
// 30 seconds. A handwritten 7, its 28 × 28 intensities, 784 inputs, two hidden layers, ten outputs.
// Charcoal schematic: grey connections, cyan positive, orange negative, white labels.
// Brightness is activation: a cyan disc over each node whose opacity is the value.
// 0:00 grid and three inspected pixels. 0:05 values enter the inputs. 0:09 one neuron computes.
// 0:15 both hidden layers activate. 0:20 scores, softmax, probabilities. 0:25 the forward pass retraced.
// Hidden activations other than the computed neuron, the weights and the scores are illustrative.
// Sound cues are drawn as pulses; MotionScript has no audio.
scene "from-pixels-to-prediction" {
  version "0.2";
  viewport (1280, 720);
  background ${BG};
  duration 30s;
  requires "easing.hold";
  requires "geometry.roundedRect";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (${IMG_CENTRE.x}, ${IMG_CENTRE.y});
  zoom 2.8;
  rotation 0deg;
};
${imagePart()}
${wiresPart()}
${layersPart()}
${calcPart()}
group chips {
  zIndex 11;
  ${chips.join("\n  ")}
};
${tracePart()}
group header {
  space screen;
  zIndex 60;
  ${text("title", 24, 28, "From Pixels to Prediction", 15, MUTED, 650, "align left; ")}
};
group captions {
  space screen;
  zIndex 60;
  rectangle plate { position (240, 656); size (800, 46); cornerRadius 8; fill #0b0d10; opacity 0; };
  ${captions}
};
operators guides.${GUIDES.map((k) => `g${k}`).join(" { trim 0, 0, 0; };\noperators guides.")} { trim 0, 0, 0; };
${REP.map((_, i) => `operators calc.p${i} { trim 0, 0, 0; };`).join("\n")}
operators trail { trim 0, 0, 0; };
${motionPart()}
complete;
`;
}

// ------------------------------------------------------------------- checks

function find(items: readonly ResolvedDrawItem[], id: string): ResolvedDrawItem {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) throw new Error(`Missing ${id}`);
  return item;
}

function screenOf(items: readonly ResolvedDrawItem[], id: string, x = 0, y = 0): Pt {
  return transformPoint(find(items, id).logicalMatrix, x, y);
}

function opacityOf(items: readonly ResolvedDrawItem[], id: string): number {
  return find(items, id).opacity;
}

function contentOf(items: readonly ResolvedDrawItem[], id: string): string {
  const geometry = find(items, id).geometry;
  return geometry.kind === "text" ? geometry.content : "";
}

/** Inside the frame and above the caption plate. */
function onScreen(point: Pt, pad = 8): boolean {
  return point.x >= pad && point.x <= 1280 - pad && point.y >= pad && point.y <= 650;
}

/** Screen scale of a node, from its matrix. */
function scaleOf(items: readonly ResolvedDrawItem[], id: string): number {
  const m = find(items, id).logicalMatrix;
  return Math.hypot(m[0], m[1]);
}

function verify(runtime: AnimationRuntime): string[] {
  const frame = (seconds: number) => runtime.evaluate(ms(seconds)).drawItems;
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;
  const imgCorners = (items: readonly ResolvedDrawItem[]) => [screenOf(items, "img.frame"), screenOf(items, "img.frame", IMG_SIZE + 2, IMG_SIZE + 2)];

  // Arithmetic shown on screen must add up.
  expect(near(PRODUCTS.reduce((a, b) => a + b, 0) + OTHERS_SUM + BIAS, Z, 0.005) && Z > 0, `Displayed z does not equal its terms (${Z}).`);
  expect(Math.round(PROBS[7]! * 100) === 92 && Math.round(PROBS[1]! * 100) === 3 && Math.round(PROBS[9]! * 100) === 2, `Softmax gives ${PROBS.map((p) => (p * 100).toFixed(1)).join(", ")}.`);
  expect(Math.round(OTHER_DIGITS.reduce((s, d) => s + PROBS[d]!, 0) * 100) === 3, "The other seven digits do not total 3%.");
  expect(inputValue(2) > 0.9 && inputValue(9) > 0.3 && inputValue(9) < 0.8 && inputValue(5) === 0, "Inspected pixels are not stroke, edge and background.");

  // [0–5s] Close on the 7, grid in one second, three pixels in two, pull back in two.
  const opening = frame(0.1);
  expect(opacityOf(opening, "img.ink") > 0.95, "The handwritten 7 is not visible at the start.");
  expect(imgCorners(opening).every((p) => onScreen(p)), "The close-up does not contain the digit.");
  expect(near(screenOf(opening, "img.frame", IMG_SIZE + 2).x - screenOf(opening, "img.frame").x, (IMG_SIZE + 2) * 2.8, 1), "The opening is not a close-up.");
  expect(opacityOf(opening, "img.cells.b1l3") < 0.05, "Pixels show before the grid reveal.");
  const half = frame(0.7);
  expect(opacityOf(half, "img.scan.bar") > 0.95, "No scanning pulse during the reveal.");
  expect(opacityOf(half, "img.cells.b1l3") > 0.9 && opacityOf(half, "img.cells.b6l3") < 0.05, "The grid does not reveal top to bottom.");
  const gridded = frame(1.25);
  for (let band = 0; band < BANDS; band += 1) expect(opacityOf(gridded, `img.gridH.r${band}`) > 0.95, `Grid band ${band} is not revealed by 1.25s.`);
  expect(near(screenOf(gridded, "img.gridV.lines", 0, IMG_SIZE).y, screenOf(gridded, "img.frame", 0, IMG_SIZE + 1).y, 1.5), "Vertical grid lines do not reach the bottom.");
  INSPECT.forEach((k, j) => {
    const items = frame(INSPECT_AT[j]! + 0.33);
    const width = (screenOf(items, `img.pk${j}.zoom.sq`, 7, 0).x - screenOf(items, `img.pk${j}.zoom.sq`).x);
    expect(near(width, CELL * INSPECT_SCALE * 2.8, 2), `Pixel ${j + 1} is not enlarged (${width.toFixed(1)}px).`);
    expect(opacityOf(items, `img.pk${j}.tag.val`) > 0.95 && contentOf(items, `img.pk${j}.tag.val`) === inputValue(k).toFixed(2), `Pixel ${j + 1} does not show its intensity.`);
    expect(onScreen(screenOf(items, `img.pk${j}.tag.plate`)) && onScreen(screenOf(items, `img.pk${j}.tag.plate`, 34, 16)), `Pixel ${j + 1} value is off screen.`);
    const others = INSPECT.map((_, o) => o).filter((o) => o !== j).filter((o) => opacityOf(items, `img.pk${o}.tag.val`) > 0.05);
    expect(others.length === 0, `Pixel ${j + 1} overlaps another inspection.`);
  });
  const shrunk = frame(3.05);
  for (let j = 0; j < 3; j += 1) expect(scaleOf(shrunk, `img.pk${j}.zoom.sq`) < 2.8 * 1.01 && opacityOf(shrunk, `img.pk${j}.mark`) > 0.95, `Pixel ${j + 1} does not return to the grid as a marked pixel.`);
  const pulled = frame(5.0);
  const pulledImg = imgCorners(pulled);
  expect(pulledImg.every((p) => onScreen(p)) && near(pulledImg[1]!.x - pulledImg[0]!.x, (IMG_SIZE + 2) * 1.5, 1), "The grid does not shrink to the left.");
  expect(pulledImg[1]!.x < 640, "The grid does not sit on the left after the pullback.");
  expect(opacityOf(pulled, "inp.n0.base") > 0.95 && screenOf(pulled, "inp.n0.base").x > pulledImg[1]!.x + 100, "The network does not appear to the right.");
  for (const k of INSPECT) {
    const guide = find(pulled, `guides.g${k}`);
    const g = guide.geometry;
    const last = g.kind === "path" ? g.commands[g.commands.length - 1] : undefined;
    const end = last && last.cmd === "L" ? transformPoint(guide.logicalMatrix, last.x, last.y) : undefined;
    const node = screenOf(pulled, `inp.n${k}.base`);
    expect(guide.opacity > 0.8 && !!end && near(end.y, node.y, 1) && near(end.x, node.x - (R_IN + 2) * 1.5, 1.5), `Inspected pixel ${k} does not connect to its input node.`);
  }

  // [5–9s] Values flow in over two seconds; bright pixels light their inputs, background stays dim.
  const flowing = frame(5.8);
  const chip = screenOf(flowing, "chips.v5.plate", 13, 6.5);
  expect(opacityOf(flowing, "chips.v5.val") > 0.9 && chip.x > screenOf(flowing, "img.frame").x && chip.x < screenOf(flowing, "inp.n5.base").x, "Value chips do not travel from pixel to input.");
  const lit = frame(7.2);
  for (let k = 0; k < 14; k += 1) expect(near(opacityOf(lit, `inp.n${k}.glow`), inputValue(k), 0.02), `Input ${k} brightness ${opacityOf(lit, `inp.n${k}.glow`).toFixed(2)} does not match pixel ${pixelIndex(k)} (${inputValue(k)}).`);
  expect(opacityOf(lit, "inp.brace.words") > 0.95 && onScreen(screenOf(lit, "inp.brace.words")), "“One input per pixel” is missing.");
  expect(GUIDES.every((k) => opacityOf(lit, `guides.g${k}`) > 0.8), "Fewer than six explicit mappings are shown.");
  expect(opacityOf(lit, "inp.title") > 0.95 && onScreen(screenOf(lit, "inp.title")), "“784 inputs” is missing.");
  expect(imgCorners(lit).every((p) => onScreen(p)) && onScreen(screenOf(lit, "inp.n13.base")) && onScreen(screenOf(lit, "inp.n0.base")), "Image and input layer are not both framed.");
  const fanned = frame(9.0);
  expect(GUIDES.every((k) => opacityOf(fanned, `guides.g${k}`) < 0.05), "Guides do not fade before the neuron.");
  expect(opacityOf(fanned, "wires.fan") > 0.8 && opacityOf(fanned, `h1.n${SELECTED}.sel`) > 0.95, "Connections into the selected neuron are not highlighted.");

  // [9–15s] Push in, keep the inputs at the left edge, multiply, sum, activate.
  const pushed = frame(10.9);
  for (const { k } of REP) {
    const p = screenOf(pushed, `inp.n${k}.base`);
    expect(onScreen(p) && p.x < 160, `Input ${k} is not held at the left edge (${p.x.toFixed(0)}px).`);
  }
  expect(onScreen(screenOf(pushed, `h1.n${SELECTED}.base`)), "The selected neuron is off screen.");
  REP.forEach(({ k, w }, i) => {
    expect(opacityOf(pushed, `calc.c${i}`) > 0.95 && opacityOf(pushed, `calc.m${i}.eq`) > 0.95, `Connection ${i + 1} is not isolated with its product.`);
    expect(contentOf(pushed, `calc.m${i}.eq`) === `${inputValue(k).toFixed(2)} × ${plain(w)} =` && contentOf(pushed, `calc.r${i}`) === signed(PRODUCTS[i]!), `Product ${i + 1} is wrong.`);
    expect(onScreen(screenOf(pushed, `calc.m${i}.plate`)) && onScreen(screenOf(pushed, `calc.m${i}.plate`, 108, 14)), `Product ${i + 1} is off screen.`);
  });
  expect(opacityOf(pushed, "calc.more.dots") > 0.95, "No ellipsis for the omitted connections.");
  expect(opacityOf(pushed, "h2.n4.base") < 0.05 || opacityOf(pushed, "calc.panel") > 0.9, "The neuron is not isolated from the next layer.");
  const midPulse = find(frame(MULT_AT[0]! + 0.3), "calc.p0").geometry;
  expect(midPulse.kind === "path" && midPulse.commands.length >= 2, "The multiplication pulse does not travel.");
  const summed = frame(12.9);
  expect(opacityOf(summed, "calc.zval") > 0.95 && contentOf(summed, "calc.zval") === `z = ${plain(Z)}`, "z is not shown after the bias.");
  expect(opacityOf(summed, "calc.sigma") > 0.95 && opacityOf(summed, "calc.f1") > 0.95, "The summation is not shown.");
  for (let i = 0; i < 3; i += 1) expect(opacityOf(summed, `calc.r${i}`) < 0.05, `Contribution ${i + 1} does not enter the sum.`);
  expect(opacityOf(frame(BIAS_AT + 0.3), "calc.bias") > 0.9, "The bias does not join.");
  const activated = frame(14.5);
  expect(near(opacityOf(activated, `h1.n${SELECTED}.glow`), ACT, 0.02), "The neuron does not brighten to its activation.");
  expect(opacityOf(activated, "calc.f2") > 0.95 && opacityOf(activated, "calc.graph.relu") > 0.95, "The ReLU step is missing.");
  const dot = screenOf(activated, "calc.graph.dot");
  const origin = screenOf(activated, "calc.graph.relu", 55, 80);
  expect(near(origin.x - dot.x, dot.y - origin.y, 1) && dot.x > origin.x + 10, "The ReLU dot is not on the positive branch.");
  for (const id of ["calc.f1", "calc.f2", "calc.graph.box", "calc.zval"]) expect(onScreen(screenOf(activated, id)), `${id} is off screen.`);
  expect(onScreen(screenOf(activated, "calc.graph.box", 150, 110)), "The ReLU graph is cut off.");

  // [15–20s] Track right; layer 1 pattern, then layer 2, earlier layers subdued.
  const first = frame(17.0);
  H1_ACT.forEach((a, j) => expect(near(opacityOf(first, `h1.n${j}.glow`), a, 0.02), `Hidden 1 unit ${j} reads ${opacityOf(first, `h1.n${j}.glow`).toFixed(2)}, not ${a}.`));
  H2_ACT.forEach((_, j) => expect(opacityOf(first, `h2.n${j}.glow`) < 0.02, `Hidden 2 unit ${j} lights before layer 1 finishes.`));
  expect(opacityOf(first, "captions.cap1") > 0.95 && opacityOf(first, "captions.cap2") < 0.05, "“Learned combinations of pixel patterns” is not the caption.");
  const second = frame(19.4);
  H2_ACT.forEach((a, j) => expect(near(opacityOf(second, `h2.n${j}.glow`), a, 0.02), `Hidden 2 unit ${j} reads ${opacityOf(second, `h2.n${j}.glow`).toFixed(2)}, not ${a}.`));
  H1_ACT.forEach((a, j) => expect(near(opacityOf(second, `h1.n${j}.glow`), a * SUBDUED, 0.02), `Hidden 1 unit ${j} is not subdued.`));
  expect(opacityOf(second, "captions.cap2") > 0.95 && opacityOf(second, "captions.cap1") < 0.05, "“Combine evidence across layers” is not the caption.");
  for (let j = 0; j < 8; j += 1) expect(onScreen(screenOf(second, `h1.n${j}.base`)) && onScreen(screenOf(second, `h2.n${j}.base`)), `Hidden unit ${j} is off screen.`);
  expect(screenOf(frame(16.0), "h1.n0.base").x - screenOf(second, "h1.n0.base").x > 40, "The camera does not track right across the hidden layers.");
  expect(opacityOf(frame(19.9), "wires.cPos") > 0.8, "Outgoing connections do not brighten toward the outputs.");

  // [20–25s] Scores, softmax, probability bars, output 7 outlined.
  const scored = frame(21.9);
  SCORES.forEach((s, d) => {
    expect(opacityOf(scored, `out.d${d}.score`) > 0.9 && contentOf(scored, `out.d${d}.score`) === plain(s), `Score for ${d} is missing.`);
    expect(onScreen(screenOf(scored, `out.d${d}.base`)) && onScreen(screenOf(scored, `out.d${d}.pct`, 30)), `Output ${d} row is off screen.`);
  });
  expect(opacityOf(scored, "out.smax.word") > 0.95, "The Softmax block is missing.");
  const settled = frame(24.2);
  const barWidth = (d: number) => screenOf(settled, `out.d${d}.bar`, barLength(d)).x - screenOf(settled, `out.d${d}.bar`).x;
  SCORES.forEach((_, d) => {
    expect(opacityOf(settled, `out.d${d}.score`) < 0.05, `Score ${d} is not replaced.`);
    expect(opacityOf(settled, `out.d${d}.pct`) > 0.95 && contentOf(settled, `out.d${d}.pct`) === pctText(d), `Probability for ${d} is missing.`);
    if (d !== 7) expect(barWidth(7) > barWidth(d) * 10, `Bar 7 is not the longest against ${d}.`);
  });
  expect(near(barWidth(7), PROBS[7]! * BAR_MAX * 1.5, 1), "Bar 7 does not settle at 92%.");
  expect(opacityOf(settled, "out.others") > 0.95, "Other digits’ combined share is missing.");
  const outlined = frame(25.0);
  expect(opacityOf(outlined, "out.d7.win") > 0.95 && near(opacityOf(outlined, "out.d3.base"), 0.6, 0.02) && opacityOf(outlined, "out.d7.base") > 0.99, "Output 7 is not outlined against dimmed competitors.");

  // [25–30s] Pull back, prediction, one highlight along the forward pass, final hold.
  const wide = frame(26.0);
  for (const id of ["inp.n0.base", "inp.n13.base", "out.d0.base", "out.d9.base", "h1.title", "out.others"]) expect(onScreen(screenOf(wide, id)), `${id} is outside the wide shot.`);
  expect(imgCorners(wide).every((p) => onScreen(p)), "The handwritten 7 is outside the wide shot.");
  expect(opacityOf(wide, "pred.words") > 0.95 && onScreen(screenOf(wide, "pred.badge")) && onScreen(screenOf(wide, "pred.badge", 124, 30)), "“Prediction: 7” is not beside the winning output.");
  expect(near(screenOf(wide, "pred.words").y, screenOf(wide, "out.d7.base").y, 1), "The prediction is not level with output 7.");
  for (let i = 0; i < ROUTE.length; i += 1) {
    const items = frame(Math.min(routeAt(i), 29.99));
    const at = screenOf(items, "hl.core");
    const expected = transformPoint(find(items, "trail").logicalMatrix, ROUTE[i]!.x, ROUTE[i]!.y);
    expect(near(at.x, expected.x, 0.5) && near(at.y, expected.y, 0.5), `Highlight misses waypoint ${i} at ${routeAt(i).toFixed(2)}s.`);
  }
  const tracing = frame(27.0);
  const trail = find(tracing, "trail").geometry;
  const tip = trail.kind === "path" ? trail.commands[trail.commands.length - 1] : undefined;
  const tipScreen = tip && tip.cmd === "L" ? transformPoint(find(tracing, "trail").logicalMatrix, tip.x, tip.y) : undefined;
  expect(!!tipScreen && near(tipScreen.x, screenOf(tracing, "hl.core").x, 1.5) && near(tipScreen.y, screenOf(tracing, "hl.core").y, 1.5), "The trail does not end at the travelling highlight.");
  expect(opacityOf(tracing, "captions.cap3") > 0.95, "The inference caption is not visible during the trace.");
  const end = frame(29.95);
  expect(opacityOf(end, "img.ink") > 0.25 && opacityOf(end, "img.cells.b1l3") > 0.9, "The handwritten 7 is not visible at the end.");
  H1_ACT.forEach((a, j) => expect(a === 0 || opacityOf(end, `h1.n${j}.glow`) > 0.04, `Hidden 1 unit ${j} is dark at the end.`));
  H2_ACT.forEach((a, j) => expect(a === 0 || opacityOf(end, `h2.n${j}.glow`) > 0.04, `Hidden 2 unit ${j} is dark at the end.`));
  expect(opacityOf(end, "pred.words") > 0.95 && opacityOf(end, "captions.cap3") > 0.95, "The prediction or caption is missing at the end.");
  for (let i = 0; i < STAGES.length; i += 1) expect(opacityOf(end, `stages.s${i}`) > 0.95 && onScreen(screenOf(end, `stages.s${i}`)), `Stage label ${i + 1} is missing at the end.`);
  expect(opacityOf(end, "h1.sub") > 0.95 && contentOf(end, "h1.sub") === "learned representation", "Hidden layers are not labelled as learned representations.");
  for (const [id, show, hide] of CAPTIONS) {
    const items = frame((show + hide) / 2);
    const visible = CAPTIONS.filter(([other]) => opacityOf(items, `captions.${other}`) > 0.05).map(([other]) => other);
    expect(visible.length === 1 && visible[0] === id, `Caption ${id} overlaps ${visible.join(", ")}.`);
  }
  return problems;
}

function reservedIds(source: string): string[] {
  const ids = new Set<string>();
  for (const match of source.matchAll(/^\s*(?:group|rectangle|circle|ellipse|line|polygon|path|text)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm)) ids.add(match[1]!);
  return [...ids].filter((id) => KEYWORD_SET.has(id));
}

/** PNG stills drawn by the real CanvasRenderer in headless Chromium. */
async function writeStills(source: string, dir: string, times: number[]): Promise<void> {
  const require = createRequire(import.meta.url);
  const esbuild = require("esbuild") as typeof import("esbuild");
  const { chromium } = require("playwright") as { chromium: { launch: (options: object) => Promise<any> } };
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = await esbuild.build({
    stdin: {
      contents: `import { compileMotionScript } from "@gvr/compiler"; import { AnimationRuntime } from "@gvr/runtime"; import { CanvasRenderer } from "@gvr/canvas-renderer"; (window as any).gvr = { compileMotionScript, AnimationRuntime, CanvasRenderer };`,
      resolveDir: here,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  });
  const executablePath = process.env.GVR_CHROME?.trim() || process.env.CHROME_PATH?.trim() || undefined;
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.setContent('<html><body style="margin:0;background:#000"><canvas id="c"></canvas></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const compileMs = await page.evaluate((src: string) => {
      const g = (window as any).gvr;
      const started = performance.now();
      const result = g.compileMotionScript(src);
      const elapsed = performance.now() - started;
      (window as any).rt = new g.AnimationRuntime(result.scene);
      (window as any).cr = new g.CanvasRenderer(document.getElementById("c"));
      (window as any).cr.resize(1280, 720, 1);
      return elapsed;
    }, source);
    console.log(`compile in Chromium ${compileMs.toFixed(0)} ms`);
    mkdirSync(dir, { recursive: true });
    for (const time of times) {
      await page.evaluate((at: number) => (window as any).cr.render((window as any).rt.evaluate(at)), ms(time));
      await page.locator("#c").screenshot({ path: resolve(dir, `f${time.toFixed(2).padStart(5, "0")}.png`) });
    }
  } finally {
    await browser.close();
  }
  console.log(`preview ${dir} (${times.length} PNG stills)`);
}

async function main(): Promise<void> {
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "from-pixels-to-prediction.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source, "utf8");
  console.log(`wrote ${outPath} (${bytes} bytes of ${DEFAULT_LIMITS.maxSourceBytes})`);
  const problems: string[] = [];
  if (bytes > DEFAULT_LIMITS.maxSourceBytes) problems.push(`Source is ${bytes} bytes, over maxSourceBytes.`);
  const reserved = reservedIds(source);
  if (reserved.length > 0) problems.push(`Reserved keywords used as ids: ${reserved.join(", ")}.`);
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene || compiled.diagnostics.length > 0) {
    console.error(compiled.diagnostics.map((item) => `${item.sourceSpan ? `${item.sourceSpan.start.line}:${item.sourceSpan.start.column} ` : ""}${item.code}: ${item.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((item) => item.message).join("\n"));
    process.exit(1);
  }
  const scene = compiled.scene;
  const steps = scene.timeline.steps?.length ?? 0;
  console.log(`compile ${compileMs.toFixed(0)} ms  nodes ${scene.nodes.length}/${DEFAULT_LIMITS.maxNodes}  tracks ${scene.timeline.tracks.length}/${DEFAULT_LIMITS.maxTracks}  steps ${steps}/${DEFAULT_LIMITS.maxSteps}`);
  const runtime = new AnimationRuntime(scene);
  problems.push(...verify(runtime));
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`checks passed  builder ${(performance.now() - BUILD_START).toFixed(0)} ms`);
  const previewDir = process.env.GVR_PREVIEW_DIR;
  if (!previewDir) return;
  await writeStills(source, previewDir, [
    0.1, 0.7, 1.25, 1.33, 2.0, 2.66, 3.05, 4.0, 5.0, 6.0, 7.2, 8.7, 9.0, 10.0, 10.9, 11.5, 12.2, 12.9, 13.6, 14.5, 15.0,
    16.0, 17.0, 18.2, 19.4, 20.0, 21.0, 21.9, 22.6, 23.4, 24.2, 25.0, 25.5, 26.0, 26.5, 27.0, 27.5, 28.0, 29.95,
  ]);
}

await main();
