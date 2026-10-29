/**
 * Builds fixtures/motionscript/stories/motionscript-to-motion.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-motionscript-to-motion.ts
 * Set GVR_PREVIEW_DIR to also write SVG stills of the key moments.
 *
 * Thirty seconds. A five-stage pipeline (MotionScript → Compiler → Scene IR →
 * Runtime → Renderer) carries one white circle from description to pixels.
 * Cyan is code, violet is scene data, amber is timing, white is rendered.
 * MotionScript has no audio, so narration is a screen-space caption and the
 * sound cues become small visual pulses on the stage that would make them.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const DURATION = 30_000;

const BG = "#0a0e14";
const INK = "#e8eef5";
const MUTED = "#8a99ad";
const PANEL = "#111821";
const EDGE = "#2b3747";
const LINK = "#4a596c";
const CYAN = "#3de0ff";
const CYAN_FILL = "#0d2430";
const VIOLET = "#8d7dff";
const VIOLET_FILL = "#1c1736";
const VIOLET_INK = "#d4ccff";
const AMBER = "#f5b042";
const AMBER_FILL = "#2a1d08";
const WHITE = "#ffffff";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Value = number | [number, number];
type Key = [number, Value, Ease?];

const PIPE_Y = 260;
const STAGES = [
  { id: "sMS", title: "MotionScript", x: 320, accent: CYAN },
  { id: "sComp", title: "Compiler", x: 880, accent: INK },
  { id: "sIR", title: "Scene IR", x: 1440, accent: VIOLET_INK },
  { id: "sRun", title: "Runtime", x: 2000, accent: AMBER },
  { id: "sRen", title: "Renderer", x: 2560, accent: WHITE },
] as const;
const HALF_W = 220;
const HALF_H = 130;

/** Preview canvas beneath Runtime and Renderer. */
const CANVAS: Pt = { x: 2280, y: 590 };
const CANVAS_HALF: Pt = { x: 500, y: 125 };
const BALL_Y = 15;
const BALL_FROM = -380;
const BALL_TO = 380;

/** Runtime panel geometry, local to the panel. */
const GRAPH = { x0: -185, x1: -45, y0: 45, y1: -55 };
const GUIDE = { x0: 5, x1: 185, y: -5 };
const PLAY = { x0: -190, x1: 190, y: 95 };

/** Evaluation clock. 16s → 18s is the two-second movement. */
const RUN_START = 16;
const RUN_END = 18;
const SCRUB_START = 18.8;
const SCRUB_END = 19.6;
const RESUME = 22.3;
const RESUME_END = 24.3;

const CARD_TEXT = ["Create a circle", "Move right over two seconds", "Ease in and out"];
const CARD_AT = [0.4, 1.0, 1.6];
const ROW_TEXT = ["circle ball { radius 40 }", "move ball.x 0s → 2s", "ease easeInOut"];
const ROW_TAG = ["structure ✓", "reference ✓", "animation ✓"];
const SCAN_AT = [5.5, 6.5, 7.5];
const IR_CARD_AT = [10.8, 11.3, 11.8];
const STATE_AT = [22.3, 22.62, 22.94, 23.26, 23.58, 23.9];

const CAPTIONS: [string, number, number, string][] = [
  ["cap1", 0.3, 4.85, "MotionScript describes the scene, its objects, and how they change over time."],
  ["cap2", 5.15, 9.85, "The compiler checks those instructions and converts them into a structured scene representation."],
  ["cap3", 10.15, 14.85, "Scene IR stores what exists, what animates, and the camera settings in one common format."],
  ["cap4", 15.15, 20.85, "At a chosen time, the runtime evaluates the animation tracks to determine the scene’s current state."],
  ["cap5", 21.15, 23.55, "The renderer draws that state onto the canvas."],
  ["cap6", 23.65, 25.9, "Repeating this as time advances produces the animation."],
  ["cap7", 26.2, 30, "MotionScript expresses the animation. GVR compiles, evaluates, and renders it."],
];

/** Camera stops: time, centre, zoom, ease into the next stop. */
const CAMERA: [number, Pt, number, Ease][] = [
  [0, { x: 320, y: 260 }, 2, "hold"],
  [4.4, { x: 320, y: 260 }, 2, "easeInOut"],
  [5.5, { x: 880, y: 260 }, 2, "hold"],
  [10, { x: 880, y: 260 }, 2, "easeInOut"],
  [10.8, { x: 1440, y: 260 }, 2, "hold"],
  [15, { x: 1440, y: 260 }, 2, "easeInOut"],
  [16, { x: 2280, y: 422 }, 0.92, "hold"],
  [20.4, { x: 2280, y: 422 }, 0.92, "easeInOut"],
  [21.4, { x: 2470, y: 440 }, 1, "hold"],
  [25.6, { x: 2470, y: 440 }, 1, "easeInOut"],
  [26.6, { x: 1440, y: 500 }, 0.45, "hold"],
  [30, { x: 1440, y: 500 }, 0.45, "hold"],
];

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

function code(name: string, x: number, y: number, content: string, size: number, fill: string, extra = ""): string {
  return text(name, x, y, content, size, fill, 500, `fontFamily "monospace"; align left; ${extra}`);
}

function easeInOut(u: number): number {
  return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
}

function stage(index: number, inner: string): string {
  const s = STAGES[index]!;
  return `group ${s.id} {
  position (${s.x}, ${PIPE_Y});
  zIndex 4;
  rectangle body { position (${-HALF_W}, ${-HALF_H}); size (${HALF_W * 2}, ${HALF_H * 2}); cornerRadius 12; fill ${PANEL}; stroke ${EDGE} width 1.6; };
  rectangle glow { position (${-HALF_W - 3}, ${-HALF_H - 3}); size (${HALF_W * 2 + 6}, ${HALF_H * 2 + 6}); cornerRadius 14; stroke ${s.accent} width 4; opacity 0; };
  rectangle glow2 { position (${-HALF_W - 3}, ${-HALF_H - 3}); size (${HALF_W * 2 + 6}, ${HALF_H * 2 + 6}); cornerRadius 14; stroke ${s.accent} width 6; opacity 0; };
  rectangle accent { position (-28, ${-HALF_H}); size (56, 4); cornerRadius 2; fill ${s.accent}; };
  ${text("title", 0, -100, s.title, 26, INK, 700)}
  ${inner}
};`;
}

function msPanel(): string {
  const cards = CARD_TEXT.map((content, index) => `group c${index} {
      position (0, ${-50 + index * 52});
      opacity 0;
      rectangle card { position (-185, -20); size (370, 40); cornerRadius 6; fill ${CYAN_FILL}; stroke ${CYAN} width 1.4; };
      ${code("num", -172, 0, String(index + 1), 13, MUTED)}
      ${code("words", -150, 0, content, 18, CYAN)}
    };`).join("\n    ");
  return `group tag {
    position (0, -66);
    opacity 0;
    rectangle pill { position (-128, -13); size (256, 26); cornerRadius 13; stroke ${CYAN} width 1.2; opacity 0.7; };
    ${text("words", 0, 0, "animation authoring language", 14, CYAN, 600)}
  };
  group cards {
    position (0, 30);
    ${cards}
  };`;
}

function compilerPanel(): string {
  const rows = ROW_TEXT.map((content, index) => `group r${index} {
      position (0, ${-30 + index * 45});
      opacity 0;
      rectangle row { position (-190, -17); size (380, 34); cornerRadius 5; fill #0d1a22; stroke ${EDGE} width 1.2; };
      ${code("code", -176, 0, content, 15, CYAN)}
    };`).join("\n    ");
  const tags = ROW_TAG.map((content, index) => text(`t${index}`, 180, -30 + index * 45, content, 13, VIOLET_INK, 650, "align right; opacity 0; ")).join("\n    ");
  return `${text("sub", 0, -70, "parse · check · lower", 14, MUTED, 600)}
  group rows {
    position (0, 0);
    ${rows}
    ${tags}
  };
  group scan {
    position (0, -30);
    opacity 0;
    rectangle frame { position (-194, -20); size (388, 40); cornerRadius 6; fill ${CYAN}; stroke ${CYAN} width 2; opacity 0.12; };
    rectangle edge { position (-194, -20); size (388, 40); cornerRadius 6; stroke ${CYAN} width 2; };
    line beam { from (0, -18); to (0, 18); stroke ${WHITE} width 2.4 cap round; position (-190, 0); };
  };`;
}

function irPanel(): string {
  const xs = [-145, 0, 145];
  const shell = (index: number, inner: string) => `group k${index} {
      position (${xs[index]}, 45);
      opacity 0;
      rectangle card { position (-62, -70); size (124, 140); cornerRadius 8; fill ${VIOLET_FILL}; stroke ${VIOLET} width 1.6; };
      rectangle ring { position (-65, -73); size (130, 146); cornerRadius 10; stroke ${VIOLET_INK} width 2.4; opacity 0; };
      ${inner}
    };`;
  const objects = shell(0, `${text("label", 0, -50, "Objects", 15, VIOLET_INK, 700)}
      circle ball { position (0, 2); radius 20; fill ${WHITE}; };
      ${text("name", 0, 45, "circle · ball", 12, MUTED, 600)}`);
  const tracks = shell(1, `${text("label", 0, -54, "Animation", 14, VIOLET_INK, 700)}
      ${text("label2", 0, -37, "tracks", 14, VIOLET_INK, 700)}
      line axis { from (-48, 14); to (48, 14); stroke ${MUTED} width 1.4; };
      polygon k0 { points ((-40, 8), (-34, 14), (-40, 20), (-46, 14)); fill ${AMBER}; };
      polygon k1 { points ((40, 8), (46, 14), (40, 20), (34, 14)); fill ${AMBER}; };
      line lane { from (-40, -6); to (40, -6); stroke ${EDGE} width 1; };
      circle dot { position (-40, -6); radius 7; fill ${WHITE}; };
      ${text("prop", 0, 45, "position.x", 12, MUTED, 600)}`);
  const camera = shell(2, `${text("label", 0, -50, "Camera", 15, VIOLET_INK, 700)}
      rectangle box { position (-26, -12); size (36, 28); cornerRadius 4; stroke ${VIOLET_INK} width 2; };
      polygon lens { points ((10, 2), (26, -10), (26, 14)); stroke ${VIOLET_INK} width 2; };
      ${text("zoom", 0, 45, "centre · zoom 1", 12, MUTED, 600)}`);
  return `path bracket { move (-195, -48); line (-195, -60); line (195, -60); line (195, -48); move (0, -60); line (0, -70); stroke ${VIOLET} width 2.2 cap round; opacity 0; };
  group cards {
    line j0 { from (-83, 45); to (-62, 45); stroke ${VIOLET} width 1.6; opacity 0; };
    line j1 { from (62, 45); to (83, 45); stroke ${VIOLET} width 1.6; opacity 0; };
    ${objects}
    ${tracks}
    ${camera}
  };`;
}

function runtimePanel(): string {
  const curve: string[] = [];
  for (let step = 0; step <= 28; step += 1) {
    const u = step / 28;
    const x = GRAPH.x0 + (GRAPH.x1 - GRAPH.x0) * u;
    const y = GRAPH.y0 + (GRAPH.y1 - GRAPH.y0) * easeInOut(u);
    curve.push(`${step === 0 ? "move" : "line"} (${n(x)}, ${n(y)});`);
  }
  const ticks = [0, 1, 2].map((second) => {
    const x = PLAY.x0 + ((PLAY.x1 - PLAY.x0) * second) / 2;
    return `line tick${second} { from (${n(x)}, ${PLAY.y - 5}); to (${n(x)}, ${PLAY.y + 5}); stroke ${MUTED} width 1.4; };
    ${text(`sec${second}`, x + (second === 0 ? 14 : second === 2 ? -14 : 0), PLAY.y + 17, `${second}s`, 14, MUTED, 600)}`;
  }).join("\n    ");
  const labels = (["Start", "Between", "Finish"] as const).map((word, index) => {
    const x = GUIDE.x0 + ((GUIDE.x1 - GUIDE.x0) * index) / 2;
    return `line g${index} { from (${n(x)}, ${GUIDE.y - 7}); to (${n(x)}, ${GUIDE.y + 7}); stroke ${MUTED} width 1.4; };
    ${text(`l${index}`, x, GUIDE.y + 26, word, 16, INK, 650, "opacity 0; ")}`;
  }).join("\n    ");
  return `circle clock { position (176, -100); radius 6; fill ${AMBER}; opacity 0.25; };
  group graph {
    rectangle box { position (-195, -65); size (160, 120); cornerRadius 6; fill #0b1016; stroke ${EDGE} width 1.2; };
    path curve { ${curve.join(" ")} stroke ${AMBER} width 2.2 cap round join round; opacity 0.8; };
    ${text("caption", -115, 70, "ease in-out", 14, MUTED, 600)}
    circle marker { position (${GRAPH.x0}, ${GRAPH.y0}); radius 6.5; fill ${AMBER}; stroke ${WHITE} width 1.6; };
  };
  group guide {
    ${text("caption", 95, -42, "evaluated ball.x", 14, MUTED, 600)}
    line rail { from (${GUIDE.x0}, ${GUIDE.y}); to (${GUIDE.x1}, ${GUIDE.y}); stroke ${MUTED} width 2; };
    ${labels}
    circle ring { position (${GUIDE.x0}, ${GUIDE.y}); radius 11; stroke ${WHITE} width 2.4; };
    circle core { position (${GUIDE.x0}, ${GUIDE.y}); radius 4; fill ${AMBER}; };
  };
  group clockline {
    opacity 0;
    line axis { from (${PLAY.x0}, ${PLAY.y}); to (${PLAY.x1}, ${PLAY.y}); stroke ${MUTED} width 1.6; };
    ${ticks}
    group playhead {
      position (${PLAY.x0}, ${PLAY.y});
      line stem { from (0, -13); to (0, 11); stroke ${AMBER} width 3 cap round; };
      polygon tip { points ((-6, -19), (6, -19), (0, -11)); fill ${AMBER}; };
    };
  };`;
}

function rendererPanel(): string {
  return `group frame {
    rectangle box { position (-170, -60); size (340, 150); cornerRadius 8; fill #0b1016; stroke ${EDGE} width 1.2; };
    ${code("recv", -150, -30, "receive state", 15, MUTED)}
    ${code("state", -150, 2, "t = 1s   ball.x = mid", 15, AMBER, "opacity 0; ")}
    ${code("draw", -150, 34, "draw circle → canvas", 15, WHITE, "opacity 0; ")}
    ${code("live", -150, 66, "playing · new state each frame", 13, MUTED, "opacity 0; ")}
  };`;
}

function connectors(): string {
  const parts: string[] = [];
  for (let index = 0; index < STAGES.length - 1; index += 1) {
    const a = STAGES[index]!.x + HALF_W + 8;
    const b = STAGES[index + 1]!.x - HALF_W - 10;
    parts.push(`line w${index} { from (${a}, ${PIPE_Y}); to (${b - 8}, ${PIPE_Y}); stroke ${LINK} width 3 cap round; };`);
    parts.push(`polygon a${index} { points ((${b - 12}, ${PIPE_Y - 9}), (${b + 2}, ${PIPE_Y}), (${b - 12}, ${PIPE_Y + 9})); fill ${LINK}; };`);
    parts.push(`line h${index} { from (${a}, ${PIPE_Y}); to (${b - 8}, ${PIPE_Y}); stroke ${CYAN} width 5 cap round; opacity 0; };`);
  }
  return parts.join("\n  ");
}

function program(): string {
  const motion: string[] = [];
  const at = (index: number) => STAGES[index]!.x;

  // [0–5s] Description cards, then the cyan document.
  motion.push(span("sMS.tag.opacity", [[0.1, 0.5, 0, 1], [25.8, 26.3, 1, 0]]));
  CARD_TEXT.forEach((_, index) => {
    const start = CARD_AT[index]!;
    motion.push(span(`sMS.cards.c${index}.opacity`, [[start, start + 0.4, 0, 1]]));
    motion.push(track(`sMS.cards.c${index}.position.x`, [[0, -40, "hold"], [start, -40, "easeOut"], [start + 0.4, 0, "hold"]]));
  });
  motion.push(pulse("sMS.glow.opacity", CARD_AT.map((t) => t + 0.3), 0.35, 0.3));
  motion.push(track("sMS.cards.scale", [[0, [1, 1], "hold"], [3.95, [1, 1], "easeIn"], [4.35, [0.18, 0.3], "hold"], [25.7, [1, 1], "hold"]]));
  motion.push(span("sMS.cards.opacity", [[4.2, 4.4, 1, 0], [25.7, 26.3, 0, 1]]));

  motion.push(span("doc.opacity", [[4.15, 4.35, 0, 1], [5.35, 5.55, 1, 0]]));
  motion.push(track("doc.scale", [[0, [0.6, 0.6], "hold"], [4.15, [0.6, 0.6], "easeOut"], [4.4, [1, 1], "hold"], [5.3, [1, 1], "easeIn"], [5.55, [1.8, 1.4], "hold"]]));
  motion.push(track("doc.position.x", [[0, at(0), "hold"], [4.4, at(0), "easeInOut"], [5.4, at(1), "hold"]]));

  // [5–10s] Compile: open into rows, inspect, assemble the violet package.
  ROW_TEXT.forEach((_, index) => {
    const show = 5.35 + index * 0.08;
    motion.push(span(`sComp.rows.r${index}.opacity`, [[show, show + 0.3, 0, 1]]));
    const tagAt = SCAN_AT[index]! + 0.75;
    motion.push(span(`sComp.rows.t${index}.opacity`, [[tagAt, tagAt + 0.2, 0, 1], [8.5, 8.75, 1, 0]]));
  });
  motion.push(span("sComp.rows.opacity", [[8.5, 9.25, 1, 0], [25.7, 26.3, 0, 1]]));
  motion.push(track("sComp.rows.scale", [[0, [1, 1], "hold"], [8.5, [1, 1], "easeIn"], [9.25, [0.3, 0.3], "hold"], [25.7, [1, 1], "hold"]]));
  motion.push(span("sComp.scan.opacity", [[5.4, 5.55, 0, 1], [8.4, 8.6, 1, 0]]));
  motion.push(track("sComp.scan.position.y", [
    [0, -30, "hold"],
    [SCAN_AT[1]! - 0.08, -30, "easeInOut"],
    [SCAN_AT[1]! + 0.08, 15, "hold"],
    [SCAN_AT[2]! - 0.08, 15, "easeInOut"],
    [SCAN_AT[2]! + 0.08, 60, "hold"],
  ]));
  const beam: Key[] = [[0, -190, "hold"]];
  for (const start of SCAN_AT) {
    beam.push([start, -190, "easeInOut"]);
    beam.push([start + 0.82, 190, "hold"]);
  }
  motion.push(track("sComp.scan.beam.position.x", beam));
  motion.push(pulse("sComp.glow.opacity", SCAN_AT.map((t) => t + 0.1), 0.45, 0.5));

  motion.push(span("pkg.opacity", [[8.75, 9.4, 0, 1], [10.45, 10.85, 1, 0]]));
  motion.push(track("pkg.scale", [[0, [0.35, 0.35], "hold"], [8.75, [0.35, 0.35], "easeOut"], [9.45, [1, 1], "hold"], [10, [1, 1], "easeInOut"], [10.8, [2, 2.17], "hold"]]));
  motion.push(track("pkg.position.x", [[0, at(1), "hold"], [10, at(1), "easeInOut"], [10.8, at(2), "hold"]]));
  motion.push(track("pkg.position.y", [[0, 290, "hold"], [10, 290, "easeInOut"], [10.8, PIPE_Y, "hold"]]));
  motion.push(span("chime.opacity", [[9.45, 9.5, 0, 0.9], [9.5, 10.1, 0.9, 0]]));
  motion.push(track("chime.scale", [[0, [1, 1], "hold"], [9.45, [1, 1], "easeOut"], [10.1, [1.7, 1.7], "hold"]]));

  // [10–15s] Scene IR cards, bracket, and the moving timeline dot.
  IR_CARD_AT.forEach((start, index) => {
    motion.push(span(`sIR.cards.k${index}.opacity`, [[start, start + 0.4, 0, 1]]));
    motion.push(track(`sIR.cards.k${index}.position.y`, [[0, 65, "hold"], [start, 65, "easeOut"], [start + 0.4, 45, "hold"]]));
    motion.push(pulse(`sIR.cards.k${index}.ring.opacity`, [start + 0.36], 0.9, 0.4));
  });
  motion.push(span("sIR.cards.j0.opacity", [[11.6, 11.8, 0, 1]]));
  motion.push(span("sIR.cards.j1.opacity", [[12.1, 12.3, 0, 1]]));
  motion.push(span("sIR.bracket.opacity", [[12.0, 12.4, 0, 1]]));
  motion.push(track("sIR.cards.k1.dot.position.x", [[0, -40, "hold"], [12.5, -40, "easeInOut"], [14.1, 40, "hold"]]));

  // Timeline extends right into the runtime.
  motion.push(span("extend.opacity", [[14.5, 14.6, 0, 1], [16.2, 16.8, 1, 0]]));
  motion.push(track("extend.trim.end", [[0, 0, "hold"], [14.6, 0, "easeInOut"], [15.7, 1, "hold"]]));
  motion.push(span("sRun.clockline.opacity", [[15.5, 15.9, 0, 1]]));

  // [15–21s] Evaluate time.
  const playX = (fraction: number) => PLAY.x0 + (PLAY.x1 - PLAY.x0) * fraction;
  const graphX = (fraction: number) => GRAPH.x0 + (GRAPH.x1 - GRAPH.x0) * fraction;
  const graphY = (value: number) => GRAPH.y0 + (GRAPH.y1 - GRAPH.y0) * value;
  const guideX = (value: number) => GUIDE.x0 + (GUIDE.x1 - GUIDE.x0) * value;
  /** Evaluated clock fraction (linear) and eased value, per phase. */
  const clock = (map: (f: number) => number, mapEased: (v: number) => number) => ({
    linear: [
      [0, map(0), "hold"],
      [RUN_START, map(0), "linear"],
      [RUN_END, map(1), "hold"],
      [SCRUB_START, map(1), "linear"],
      [SCRUB_END, map(0.5), "hold"],
      [RESUME, map(0.5), "linear"],
      [RESUME_END, map(1), "hold"],
    ] as Key[],
    eased: [
      [0, mapEased(0), "hold"],
      [RUN_START, mapEased(0), "easeInOut"],
      [RUN_END, mapEased(1), "hold"],
      [SCRUB_START, mapEased(1), "easeIn"],
      [SCRUB_END, mapEased(0.5), "hold"],
      [RESUME, mapEased(0.5), "easeOut"],
      [RESUME_END, mapEased(1), "hold"],
    ] as Key[],
  });
  motion.push(track("sRun.clockline.playhead.position.x", clock(playX, playX).linear));
  motion.push(track("sRun.graph.marker.position.x", clock(graphX, graphX).linear));
  motion.push(track("sRun.graph.marker.position.y", clock(graphY, graphY).eased));
  motion.push(track("sRun.guide.ring.position.x", clock(guideX, guideX).eased));
  motion.push(track("sRun.guide.core.position.x", clock(guideX, guideX).eased));
  motion.push(span("sRun.guide.l0.opacity", [[RUN_START, RUN_START + 0.25, 0, 1]]));
  motion.push(span("sRun.guide.l1.opacity", [[RUN_START + 1, RUN_START + 1.25, 0, 1]]));
  motion.push(span("sRun.guide.l2.opacity", [[RUN_END, RUN_END + 0.25, 0, 1]]));
  const ticksAt: number[] = [];
  for (let t = RUN_START; t < 20.3; t += 0.5) ticksAt.push(t);
  for (let t = RESUME; t < RESUME_END; t += 0.5) ticksAt.push(t);
  motion.push(pulse("sRun.clock.opacity", ticksAt, 1, 0.3));

  // Midpoint state travels as an amber packet into the renderer.
  const ringWorld = { x: at(3) + guideX(0.5), y: PIPE_Y + GUIDE.y };
  motion.push(span("state.opacity", [[20.2, 20.4, 0, 1], [20.95, 21.15, 1, 0]]));
  motion.push(track("state.scale", [[0, [0.5, 0.5], "hold"], [20.2, [0.5, 0.5], "easeOut"], [20.4, [1, 1], "hold"]]));
  motion.push(track("state.position.x", [[0, ringWorld.x, "hold"], [20.35, ringWorld.x, "easeInOut"], [21.05, at(4) - 90, "hold"]]));
  motion.push(track("state.position.y", [[0, ringWorld.y, "hold"], [20.35, ringWorld.y, "easeInOut"], [21.05, PIPE_Y + 2, "hold"]]));

  // [21–26s] Draw: first frame at the midpoint, then playback resumes.
  motion.push(pulse("sRen.glow.opacity", [21.0, ...STATE_AT.map((t) => t + 0.26)], 0.6, 0.3));
  motion.push(span("sRen.frame.state.opacity", [[21.0, 21.2, 0, 1], [RESUME, RESUME + 0.2, 1, 0]]));
  motion.push(span("sRen.frame.draw.opacity", [[21.15, 21.35, 0, 1]]));
  motion.push(span("sRen.frame.live.opacity", [[RESUME, RESUME + 0.2, 0, 1], [RESUME_END + 0.2, RESUME_END + 0.5, 1, 0]]));
  motion.push(span("drawLink.opacity", [[21.1, 21.3, 0, 0.9]]));
  motion.push(span("canvas.ball.opacity", [[21.2, 21.45, 0, 1]]));
  motion.push(track("canvas.ball.scale", [[0, [0.6, 0.6], "hold"], [21.2, [0.6, 0.6], "easeOut"], [21.45, [1, 1], "hold"]]));
  const ballMid = BALL_FROM + (BALL_TO - BALL_FROM) * 0.5;
  motion.push(track("canvas.ball.position.x", [[0, ballMid, "hold"], [RESUME, ballMid, "easeOut"], [RESUME_END, BALL_TO, "hold"]]));
  STATE_AT.forEach((start, index) => {
    const id = `tick${index}`;
    motion.push(span(`${id}.opacity`, [[start, start + 0.05, 0, 1], [start + 0.22, 0.3 + start, 1, 0]]));
    motion.push(track(`${id}.position.x`, [[0, at(3) + HALF_W - 4, "hold"], [start, at(3) + HALF_W - 4, "linear"], [start + 0.3, at(4) - HALF_W + 4, "hold"]]));
  });

  // [26–30s] Wide view, one highlight through every stage, the GVR bracket.
  motion.push(span("wide.opacity", [[25.9, 26.5, 0, 1]]));
  for (const s of STAGES) motion.push(span(`${s.id}.title.opacity`, [[25.8, 26.3, 1, 0]]));
  const HL_START = 26.5;
  const HL_END = 28.5;
  const hlAt = (x: number) => HL_START + ((x - at(0)) / (at(4) - at(0))) * (HL_END - HL_START);
  motion.push(span("hl.opacity", [[HL_START - 0.15, HL_START, 0, 1], [HL_END, HL_END + 0.3, 1, 0]]));
  motion.push(track("hl.position.x", [[0, at(0), "hold"], [HL_START, at(0), "linear"], [HL_END, at(4), "hold"]]));
  STAGES.forEach((s, index) => {
    const pass = hlAt(s.x);
    motion.push(span(`${s.id}.glow2.opacity`, [[pass - 0.15, pass, 0, 1], [pass + 0.25, pass + 0.7, 1, index === 4 ? 0.35 : 0]]));
    if (index < STAGES.length - 1) {
      const a = hlAt(s.x + HALF_W);
      const b = hlAt(STAGES[index + 1]!.x - HALF_W);
      motion.push(span(`links.h${index}.opacity`, [[a - 0.05, a + 0.05, 0, 1], [b + 0.1, b + 0.5, 1, 0]]));
    }
  });
  motion.push(span("gvr.opacity", [[28.0, 28.5, 0, 1]]));
  motion.push(track("gvr.bracket.trim.end", [[0, 0, "hold"], [27.9, 0, "easeOut"], [28.5, 1, "hold"]]));
  motion.push(span("resolve.opacity", [[28.5, 28.55, 0, 0.7], [28.55, 29.4, 0.7, 0]]));
  motion.push(track("resolve.scale", [[0, [1, 1], "hold"], [28.5, [1, 1], "easeOut"], [29.4, [1.5, 1.5], "hold"]]));

  for (const [id, show, hide] of CAPTIONS) {
    const windows: [number, number, number, number][] = [[show, show + 0.25, 0, 1]];
    if (hide < 30) windows.push([hide - 0.2, hide, 1, 0]);
    motion.push(span(`captions.${id}.opacity`, windows));
  }

  motion.push(track("camera(main).position.x", CAMERA.map(([t, p, , e]) => [t, p.x, e] as Key)));
  motion.push(track("camera(main).position.y", CAMERA.map(([t, p, , e]) => [t, p.y, e] as Key)));
  motion.push(track("camera(main).zoom", CAMERA.map(([t, , z, e]) => [t, z, e] as Key)));

  const irExtend = { x0: at(2) + 40, y0: PIPE_Y + 45 + 14, x1: at(3) + PLAY.x0, y1: PIPE_Y + PLAY.y };
  const captions = CAPTIONS.map(([id, , , words]) => text(id, 640, 679, words, 18, INK, 550, "opacity 0; ")).join("\n  ");
  const ticks = STATE_AT.map((_, index) => `group tick${index} {
  position (${at(3) + HALF_W - 4}, ${PIPE_Y});
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill ${AMBER}; };
};`).join("\n");
  const wide = STAGES.map((s, index) => text(`n${index}`, s.x, 92, s.title, 46, s.accent, 700)).join("\n  ");

  return `// FROM MOTIONSCRIPT TO MOTION
// 30 seconds. MotionScript → Compiler → Scene IR → Runtime → Renderer, one white circle.
// Cyan is code, violet is scene data, amber is timing, white is rendered output.
// 0:00 three instruction cards. 0:05 the compiler inspects and packs Scene IR.
// 0:10 Objects, Animation tracks and Camera. 0:15 the runtime evaluates 0s → 2s, then scrubs to 1s.
// 0:21 the renderer draws the midpoint, then playback finishes the move. 0:26 the whole pipeline.
// Narration is a caption. Sound cues are drawn as pulses; MotionScript has no audio.
scene "motionscript-to-motion" {
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
  position (320, 260);
  zoom 2;
  rotation 0deg;
};
group links {
  zIndex 2;
  ${connectors()}
};
${stage(0, msPanel())}
${stage(1, compilerPanel())}
${stage(2, irPanel())}
${stage(3, runtimePanel())}
${stage(4, rendererPanel())}
group canvas {
  position (${CANVAS.x}, ${CANVAS.y});
  zIndex 6;
  rectangle sheet { position (${-CANVAS_HALF.x}, ${-CANVAS_HALF.y}); size (${CANVAS_HALF.x * 2}, ${CANVAS_HALF.y * 2}); cornerRadius 10; fill #05080c; stroke ${EDGE} width 1.6; };
  ${text("label", -CANVAS_HALF.x + 20, -CANVAS_HALF.y + 24, "Preview canvas", 18, MUTED, 650, "align left; ")}
  line floor { from (${BALL_FROM}, ${BALL_Y + 52}); to (${BALL_TO}, ${BALL_Y + 52}); stroke #18212c width 2; };
  circle ball { position (${BALL_FROM + (BALL_TO - BALL_FROM) * 0.5}, ${BALL_Y}); radius 40; fill ${WHITE}; opacity 0; };
};
line drawLink { from (${at(4)}, ${PIPE_Y + HALF_H + 6}); to (${at(4)}, ${CANVAS.y - CANVAS_HALF.y - 8}); stroke ${WHITE} width 2.4 cap round; opacity 0; zIndex 5; };
path extend { move (${irExtend.x0}, ${irExtend.y0}); line (${at(2) + 200}, ${irExtend.y0}); line (${at(3) - 250}, ${irExtend.y1}); line (${irExtend.x1}, ${irExtend.y1}); stroke ${AMBER} width 3 cap round join round; opacity 0; zIndex 8; };
group doc {
  position (${at(0)}, 290);
  opacity 0;
  zIndex 30;
  rectangle sheet { position (-34, -44); size (68, 88); cornerRadius 5; fill ${CYAN_FILL}; stroke ${CYAN} width 2.2; };
  line l0 { from (-20, -22); to (18, -22); stroke ${CYAN} width 3 cap round; };
  line l1 { from (-20, -6); to (22, -6); stroke ${CYAN} width 3 cap round; };
  line l2 { from (-20, 10); to (8, 10); stroke ${CYAN} width 3 cap round; };
  ${code("ext", -20, 28, ".ms", 13, CYAN)}
};
group pkg {
  position (${at(1)}, 290);
  opacity 0;
  zIndex 30;
  rectangle box { position (-110, -60); size (220, 120); cornerRadius 10; fill ${VIOLET_FILL}; stroke ${VIOLET} width 2.4; };
  rectangle bar0 { position (-80, 14); size (44, 22); cornerRadius 4; stroke ${VIOLET} width 1.4; };
  rectangle bar1 { position (-22, 14); size (44, 22); cornerRadius 4; stroke ${VIOLET} width 1.4; };
  rectangle bar2 { position (36, 14); size (44, 22); cornerRadius 4; stroke ${VIOLET} width 1.4; };
  ${text("words", 0, -20, "Scene IR", 26, VIOLET_INK, 700)}
};
circle chime { position (${at(1)}, 290); radius 80; stroke ${VIOLET_INK} width 2.4; opacity 0; zIndex 29; };
group state {
  position (${at(3) + GUIDE.x0 + (GUIDE.x1 - GUIDE.x0) * 0.5}, ${PIPE_Y + GUIDE.y});
  opacity 0;
  zIndex 32;
  rectangle chip { position (-54, -18); size (108, 36); cornerRadius 7; fill ${AMBER_FILL}; stroke ${AMBER} width 2; };
  ${text("words", 0, 1, "t = 1s", 15, AMBER, 700)}
};
${ticks}
group hl {
  position (${at(0)}, ${PIPE_Y});
  opacity 0;
  zIndex 40;
  ellipse halo { size (90, 90); fill ${CYAN}; opacity 0.25; };
  circle core { radius 16; fill ${WHITE}; };
};
group wide {
  opacity 0;
  zIndex 10;
  ${wide}
};
group gvr {
  opacity 0;
  zIndex 10;
  path bracket { move (100, 790); line (100, 815); line (1440, 815); line (1440, 835); move (1440, 815); line (2780, 815); line (2780, 790); stroke ${INK} width 4 cap round join round; };
  ${text("name", 1440, 885, "GVR", 72, WHITE, 800)}
  ${text("tagline", 1440, 950, "the system that turns animation descriptions into visuals", 38, MUTED, 600)}
};
ellipse resolve { position (1440, 885); size (300, 140); stroke ${WHITE} width 3; opacity 0; zIndex 11; };
group header {
  space screen;
  zIndex 60;
  ${text("title", 24, 28, "From MotionScript to Motion", 15, MUTED, 650, "align left; ")}
};
group captions {
  space screen;
  zIndex 60;
  rectangle plate { position (110, 656); size (1060, 46); cornerRadius 8; fill #05080c; opacity 0.86; };
  ${captions}
};
operators extend { trim 0, 0, 0; };
operators gvr.bracket { trim 0, 0, 0; };
${motion.join("\n")}
complete;
`;
}

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined) return "none";
  return cssColor(color as SolidColor);
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.004) return "";
  const matrix = item.logicalMatrix;
  const transform = `transform="matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})"`;
  const fill = item.appearance.fill?.type === "solid" ? cssPaint(item.appearance.fill) : "none";
  const stroke = item.appearance.stroke;
  const strokePaint = stroke ? cssPaint(stroke.color.type === "solid" ? stroke.color : undefined) : "none";
  const width = stroke?.width ?? 1;
  const opacity = `opacity="${item.opacity.toFixed(3)}"`;
  const paint = `fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}"`;
  const geometry = item.geometry;
  if (geometry.kind === "line") {
    return `<line x1="${geometry.from.x}" y1="${geometry.from.y}" x2="${geometry.to.x}" y2="${geometry.to.y}" ${transform} ${opacity} fill="none" stroke="${strokePaint}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  if (geometry.kind === "circle") return `<circle cx="0" cy="0" r="${geometry.radius}" ${transform} ${opacity} ${paint}/>`;
  if (geometry.kind === "ellipse") return `<ellipse cx="0" cy="0" rx="${geometry.size.x / 2}" ry="${geometry.size.y / 2}" ${transform} ${opacity} ${paint}/>`;
  if (geometry.kind === "rectangle") {
    return `<rect x="0" y="0" width="${geometry.size.x}" height="${geometry.size.y}" rx="${geometry.cornerRadius ?? 0}" ${transform} ${opacity} ${paint}/>`;
  }
  if (geometry.kind === "polygon") {
    return `<polygon points="${geometry.points.map((p) => `${p.x},${p.y}`).join(" ")}" ${transform} ${opacity} ${paint}/>`;
  }
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
    return `<path d="${d}" ${transform} ${opacity} ${paint} stroke-linecap="round"/>`;
  }
  if (geometry.kind === "text") {
    const anchor = geometry.align === "center" ? "middle" : geometry.align === "right" ? "end" : "start";
    const baseline = geometry.baseline === "middle" ? "middle" : geometry.baseline === "top" ? "hanging" : geometry.baseline === "bottom" ? "text-after-edge" : "alphabetic";
    const content = geometry.content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const family = geometry.font.family === "sans" ? "sans-serif" : geometry.font.family;
    return `<text ${transform} ${opacity} fill="${fill}" font-family="${family}" font-size="${geometry.font.size}" font-weight="${geometry.font.weight}" text-anchor="${anchor}" dominant-baseline="${baseline}">${content}</text>`;
  }
  return "";
}

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

/** Inside the frame and above the caption plate. */
function onScreen(point: Pt, pad = 12): boolean {
  return point.x >= pad && point.x <= 1280 - pad && point.y >= pad && point.y <= 650;
}

function main(): void {
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "motionscript-to-motion.ms");
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
  console.log(`nodes ${compiled.scene.nodes.length}  tracks ${compiled.scene.timeline.tracks.length}`);
  const runtime = new AnimationRuntime(compiled.scene);
  const frame = (seconds: number) => runtime.evaluate(ms(seconds)).drawItems;
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;

  const described = frame(3);
  for (let index = 0; index < 3; index += 1) {
    expect(opacityOf(described, `sMS.cards.c${index}.words`) > 0.95, `Card ${index + 1} is not shown.`);
    const left = screenOf(described, `sMS.cards.c${index}.card`);
    const right = screenOf(described, `sMS.cards.c${index}.card`, 370, 40);
    expect(onScreen(left) && onScreen(right), `Card ${index + 1} leaves the close-up.`);
  }
  expect(opacityOf(described, "sMS.tag.words") > 0.95, "The authoring-language label is missing.");
  expect(opacityOf(frame(0.7), "sMS.cards.c1.words") < 0.05, "Card 2 enters before card 1 has finished.");
  const compressed = frame(4.6);
  expect(opacityOf(compressed, "sMS.cards.c0.words") < 0.05, "Cards remain after compressing.");
  expect(opacityOf(compressed, "doc.sheet") > 0.9 && onScreen(screenOf(compressed, "doc.sheet", 34, 44)), "The document is not tracked.");
  const inspecting = frame(6.8);
  expect(opacityOf(inspecting, "sComp.rows.r2.code") > 0.9, "Compiler rows are missing.");
  expect(opacityOf(inspecting, "sComp.scan.edge") > 0.9, "Inspection highlight is missing.");
  expect(near(screenOf(inspecting, "sComp.body", HALF_W, HALF_H).x, 640, 2), "Compiler is not centred.");
  const packed = frame(9.7);
  expect(opacityOf(packed, "pkg.words") > 0.95 && opacityOf(packed, "sComp.rows.r0.code") < 0.05, "Scene IR package did not assemble.");
  const organised = frame(13);
  for (let index = 0; index < 3; index += 1) {
    expect(opacityOf(organised, `sIR.cards.k${index}.card`) > 0.95, `Scene IR card ${index + 1} is missing.`);
    expect(onScreen(screenOf(organised, `sIR.cards.k${index}.card`)) && onScreen(screenOf(organised, `sIR.cards.k${index}.card`, 124, 140)), `Scene IR card ${index + 1} is off screen.`);
  }
  expect(opacityOf(organised, "pkg.words") < 0.05, "The package lingers over the Scene IR shot.");
  expect(opacityOf(organised, "sIR.bracket") > 0.95, "Scene IR bracket is missing.");
  const runAt = (seconds: number) => {
    const items = frame(seconds);
    return {
      items,
      ring: screenOf(items, "sRun.guide.ring").x,
      play: screenOf(items, "sRun.clockline.playhead.stem").x,
      zero: screenOf(items, "sRun.clockline.axis", PLAY.x0).x,
      from: screenOf(items, "sRun.guide.rail", GUIDE.x0).x,
    };
  };
  const finish = runAt(18.4);
  const between = runAt(20);
  const zoom = 0.92;
  expect(near(finish.ring - finish.from, (GUIDE.x1 - GUIDE.x0) * zoom, 1), "Evaluated position does not reach Finish.");
  expect(near(between.ring - between.from, (GUIDE.x1 - GUIDE.x0) * 0.5 * zoom, 1), "Scrub does not return to Between.");
  expect(near(between.play - between.zero, (PLAY.x1 - PLAY.x0) * 0.5 * zoom, 1), "Playhead does not rest at 1s.");
  const quarter = runAt(16.5);
  expect(near(quarter.ring - quarter.from, (GUIDE.x1 - GUIDE.x0) * 0.125 * zoom, 1), "Evaluated position does not ease in.");
  for (const id of ["l0", "l1", "l2"]) expect(opacityOf(finish.items, `sRun.guide.${id}`) > 0.95, `Runtime label ${id} is missing.`);
  expect(opacityOf(between.items, "canvas.ball") < 0.01, "The circle is drawn before the renderer receives state.");
  expect(onScreen(screenOf(between.items, "canvas.sheet", 1000, 250)) && onScreen(screenOf(between.items, "sRun.title", 0, -14)), "Runtime and canvas do not both fit.");
  const drawn = frame(21.8);
  const ballFrame = (items: readonly ResolvedDrawItem[]) => screenOf(items, "canvas.ball").x - screenOf(items, "canvas.sheet").x;
  expect(opacityOf(drawn, "canvas.ball") > 0.95, "The first frame is not drawn.");
  expect(near(ballFrame(drawn), (CANVAS_HALF.x + 0) * 1, 1), "First frame does not draw the midpoint.");
  const mid = frame(23.3);
  const midShare = (ballFrame(mid) - (CANVAS_HALF.x + BALL_FROM)) / (BALL_TO - BALL_FROM);
  expect(near(midShare, 0.5 + 0.5 * (1 - 0.5 * 0.5), 0.01), "Playback does not slow into the finish.");
  const rested = frame(25);
  expect(near(ballFrame(rested), CANVAS_HALF.x + BALL_TO, 1), "The circle does not rest at Finish.");
  expect(onScreen(screenOf(rested, "canvas.ball", 40, 40)) && onScreen(screenOf(rested, "sRen.title", 0, -14)), "Renderer push loses the circle or the renderer.");
  const tracing = frame(27.5);
  expect(opacityOf(tracing, "hl.core") > 0.95, "The pipeline highlight is missing.");
  const end = frame(29.95);
  for (let index = 0; index < STAGES.length; index += 1) {
    expect(opacityOf(end, `wide.n${index}`) > 0.95 && onScreen(screenOf(end, `wide.n${index}`)), `Stage ${index + 1} label is not readable at the end.`);
  }
  expect(opacityOf(end, "gvr.name") > 0.95 && onScreen(screenOf(end, "gvr.tagline")), "The GVR bracket is missing.");
  expect(opacityOf(end, "canvas.ball") > 0.95 && onScreen(screenOf(end, "canvas.ball")), "The circle is not visible at the end.");
  expect(opacityOf(end, "captions.cap7") > 0.95, "The closing narration is missing.");
  for (const [id, show, hide] of CAPTIONS) {
    const items = frame((show + hide) / 2);
    const visible = CAPTIONS.filter(([other]) => opacityOf(items, `captions.${other}`) > 0.05).map(([other]) => other);
    expect(visible.length === 1 && visible[0] === id, `Caption ${id} overlaps ${visible.join(", ")}.`);
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const previewDir = process.env.GVR_PREVIEW_DIR;
  if (!previewDir) return;
  mkdirSync(previewDir, { recursive: true });
  for (const time of [0.8, 3, 4.6, 6.8, 9.7, 10.5, 13, 15.2, 17, 18.4, 20, 20.7, 21.8, 23.3, 25, 26.2, 27.5, 29.95]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${BG}"/>${frame(time).map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(previewDir, `f${time.toFixed(2)}.svg`), svg);
  }
  console.log(`preview ${previewDir}`);
}

main();
