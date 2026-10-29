/**
 * Builds fixtures/motionscript/stories/adding-two-vectors.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-adding-two-vectors.ts
 *
 * Thirty seconds. a = (3, 1), b = (1, 2), same scale on both axes.
 * 0:00 meet the vectors. 0:05 translate b head to tail. 0:10 draw a + b.
 * 0:15 add the components. 0:20 reverse the order. 0:25 hold the principle.
 * Screen y grows downward. A vector group sits on its tail; local +y is down.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const DURATION = 30;
const UNIT = 104;
const OX = 132;
const OY = 552;

const PAPER = "#f6f3ec";
const INK = "#3c3c38";
const MUTED = "#8a8478";
const GRID = "#e0d9cc";
const AXIS = "#b7b0a3";
const GUIDE = "#a39888";
const BLUE = "#4e7594";
const AMBER = "#b6843c";
const TEAL = "#2f7d76";

const HEAD = 23;
const HEAD_HALF = 9;
const SHAFT = 5.5;
const ADVANCE = 15.6533203125;

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { t: number; v: string; ease?: Ease };

const sx = (x: number): number => OX + x * UNIT;
const sy = (y: number): number => OY - y * UNIT;
const delta = (x: number, y: number): Pt => ({ x: x * UNIT, y: -y * UNIT });

const A = delta(3, 1);
const B = delta(1, 2);
const SUM = delta(4, 3);
const ORIGIN: Pt = { x: OX, y: OY };
const HEAD_A: Pt = { x: sx(3), y: sy(1) };
const HEAD_B: Pt = { x: sx(1), y: sy(2) };
const HEAD_SUM: Pt = { x: sx(4), y: sy(3) };

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function v2(point: Pt): string {
  return `(${n(point.x)}, ${n(point.y)})`;
}

function labelAt(vector: Pt, along: number, gap: number, side: 1 | -1): Pt {
  const len = Math.hypot(vector.x, vector.y);
  const ux = vector.x / len;
  const uy = vector.y / len;
  return {
    x: ux * len * along + -uy * side * gap,
    y: uy * len * along + ux * side * gap,
  };
}

function unitOf(vector: Pt): Pt {
  const len = Math.hypot(vector.x, vector.y);
  return { x: vector.x / len, y: vector.y / len };
}

function headPoints(vector: Pt): [Pt, Pt, Pt] {
  const u = unitOf(vector);
  const px = -u.y;
  const py = u.x;
  const tip = { x: vector.x, y: vector.y };
  const base = { x: vector.x - u.x * HEAD, y: vector.y - u.y * HEAD };
  return [
    tip,
    { x: base.x + px * HEAD_HALF, y: base.y + py * HEAD_HALF },
    { x: base.x - px * HEAD_HALF, y: base.y - py * HEAD_HALF },
  ];
}

function shaftEnd(vector: Pt): Pt {
  const u = unitOf(vector);
  const inset = HEAD - 7;
  return { x: vector.x - u.x * inset, y: vector.y - u.y * inset };
}

function dashes(from: Pt, to: Pt, dash = 8, gap = 6): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return "";
  const ux = dx / len;
  const uy = dy / len;
  const lines: string[] = [];
  let cursor = 0;
  while (cursor < len - 0.4) {
    const end = Math.min(len, cursor + dash);
    lines.push(`    move (${n(from.x + ux * cursor)}, ${n(from.y + uy * cursor)});`);
    lines.push(`    line (${n(from.x + ux * end)}, ${n(from.y + uy * end)});`);
    cursor = end + gap;
  }
  return lines.join("\n");
}

function track(target: string, points: Key[]): string {
  const ordered = [...points].sort((a, b) => a.t - b.t);
  if (ordered[0]?.t !== 0 || ordered[ordered.length - 1]?.t !== DURATION) {
    throw new Error(`${target} must run from 0s to ${DURATION}s`);
  }
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  for (const point of ordered) {
    const ms = Math.round(point.t * 1000);
    const pct = percent(ms, previous);
    if (pct.value <= previous) throw new Error(`${target} repeats a key at ${point.t}s`);
    previous = pct.value;
    const ease = point.ease ? ` ease ${point.ease}` : "";
    lines.push(`  ${pct.text} ${point.v}${ease};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function percent(ms: number, previous: number): { text: string; value: number } {
  if (ms <= 0) return { text: "0%", value: 0 };
  if (ms >= DURATION * 1000) return { text: "100%", value: 1 };
  let digits = 4;
  let value = Number(((ms / (DURATION * 1000)) * 100).toFixed(digits)) / 100;
  while (value <= previous && digits < 8) {
    digits += 1;
    value = Number(((ms / (DURATION * 1000)) * 100).toFixed(digits)) / 100;
  }
  const shown = (value * 100).toFixed(digits).replace(/\.?0+$/, "");
  return { text: `${shown}%`, value };
}

function arrive(t0: number, t1: number, peak = "1"): Key[] {
  const keys: Key[] = t0 <= 0 ? [{ t: 0, v: "0", ease: "easeOut" }] : [{ t: 0, v: "0", ease: "hold" }, { t: t0, v: "0", ease: "easeOut" }];
  keys.push({ t: t1, v: peak, ease: "hold" });
  if (t1 < DURATION) keys.push({ t: DURATION, v: peak });
  return keys;
}

function reveal(t0: number, t1: number, out0: number, out1: number, peak = "1"): Key[] {
  const keys: Key[] = t0 <= 0 ? [{ t: 0, v: "0", ease: "easeOut" }] : [{ t: 0, v: "0", ease: "hold" }, { t: t0, v: "0", ease: "easeOut" }];
  keys.push({ t: t1, v: peak, ease: "hold" }, { t: out0, v: peak, ease: "easeIn" }, { t: out1, v: "0", ease: "hold" });
  if (out1 < DURATION) keys.push({ t: DURATION, v: "0" });
  return keys;
}

function sweep(t0: number, t1: number): Key[] {
  return [
    { t: 0, v: "0", ease: "hold" },
    { t: t0, v: "0", ease: "easeOut" },
    { t: t1, v: "1", ease: "hold" },
    { t: DURATION, v: "1" },
  ];
}

function pulse(t0: number, t1: number, peakOpacity: number, peakScale: number): { opacity: Key[]; scale: Key[] } {
  const mid = t0 + (t1 - t0) * 0.32;
  const back = Math.min(DURATION, t1 + 0.04);
  return {
    opacity: [
      { t: 0, v: "0", ease: "hold" },
      { t: t0, v: "0", ease: "easeOut" },
      { t: mid, v: n(peakOpacity, 3), ease: "easeIn" },
      { t: t1, v: "0", ease: "hold" },
      { t: DURATION, v: "0" },
    ],
    scale: [
      { t: 0, v: "(1, 1)", ease: "hold" },
      { t: t0, v: "(1, 1)", ease: "easeOut" },
      { t: t1, v: `(${n(peakScale)}, ${n(peakScale)})`, ease: "hold" },
      { t: back, v: "(1, 1)", ease: "hold" },
      { t: DURATION, v: "(1, 1)" },
    ],
  };
}

type Arrow = {
  name: string;
  vector: Pt;
  at: Pt;
  color: string;
  z: number;
  label: string;
  labelSize: number;
  along: number;
  gap: number;
  draw: [number, number];
};

function arrow(spec: Arrow): { body: string; operator: string; tracks: string[] } {
  const end = shaftEnd(spec.vector);
  const [tip, left, right] = headPoints(spec.vector);
  const label = labelAt(spec.vector, spec.along, spec.gap, -1);
  const [draw0, draw1] = spec.draw;
  const body = `group ${spec.name} {
  position ${v2(spec.at)};
  zIndex ${spec.z};
  path shaft {
    stroke ${spec.color} width ${SHAFT} cap round join round;
    zIndex 1;
    move (0, 0);
    line ${v2(end)};
  };
  polygon head {
    points (${v2(tip)}, ${v2(left)}, ${v2(right)});
    fill ${spec.color};
    opacity 0;
    zIndex 2;
  };
  text label {
    position ${v2(label)};
    content "${spec.label}";
    fontFamily "sans";
    fontSize ${spec.labelSize};
    fontWeight 600;
    align center;
    baseline middle;
    fill ${INK};
    opacity 0;
    zIndex 3;
  };
};`;
  return {
    body,
    operator: `operators ${spec.name}.shaft { trim 0, 0, 0; };`,
    tracks: [
      track(`${spec.name}.shaft.trim.end`, sweep(draw0, draw1)),
      track(`${spec.name}.head.opacity`, arrive(draw1 - 0.26, draw1)),
      track(`${spec.name}.label.opacity`, arrive(draw1 - 0.18, Math.min(DURATION, draw1 + 0.16))),
    ],
  };
}

function gridSource(): string {
  const lines: string[] = [];
  for (let x = 0; x <= 5; x += 1) {
    lines.push(`  line vertical${x} { from ${v2({ x: sx(x), y: sy(0) })}; to ${v2({ x: sx(x), y: sy(4) })}; stroke ${GRID} width 1.15; zIndex 0; };`);
  }
  for (let y = 0; y <= 4; y += 1) {
    lines.push(`  line horizontal${y} { from ${v2({ x: sx(0), y: sy(y) })}; to ${v2({ x: sx(5), y: sy(y) })}; stroke ${GRID} width 1.15; zIndex 0; };`);
  }
  const numbers: string[] = [];
  for (let x = 1; x <= 5; x += 1) {
    numbers.push(
      `  text tickX${x} { position (${n(sx(x))}, ${n(OY + 28)}); content "${x}"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill ${MUTED}; zIndex 2; };`,
    );
  }
  for (let y = 1; y <= 4; y += 1) {
    numbers.push(
      `  text tickY${y} { position (${n(OX - 16)}, ${n(sy(y))}); content "${y}"; fontFamily "sans"; fontSize 16; fontWeight 500; align right; baseline middle; fill ${MUTED}; zIndex 2; };`,
    );
  }
  return `group plane {
  opacity 0;
  zIndex 1;
${lines.join("\n")}
  line axisX { from ${v2({ x: sx(0), y: sy(0) })}; to ${v2({ x: sx(5), y: sy(0) })}; stroke ${AXIS} width 1.8 cap butt; zIndex 1; };
  line axisY { from ${v2({ x: sx(0), y: sy(0) })}; to ${v2({ x: sx(0), y: sy(4) })}; stroke ${AXIS} width 1.8 cap butt; zIndex 1; };
${numbers.join("\n")}
  text axisNameX { position (${n(sx(5) + 18)}, ${n(OY)}); content "x"; fontFamily "sans"; fontSize 18; fontStyle italic; fontWeight 500; align left; baseline middle; fill ${MUTED}; zIndex 2; };
  text axisNameY { position (${n(OX)}, ${n(sy(4) - 22)}); content "y"; fontFamily "sans"; fontSize 18; fontStyle italic; fontWeight 500; align center; baseline alphabetic; fill ${MUTED}; zIndex 2; };
  text originLabel { position (${n(OX - 14)}, ${n(OY + 28)}); content "O"; fontFamily "sans"; fontSize 22; fontWeight 600; align right; baseline alphabetic; fill ${INK}; zIndex 3; };
  circle originDot { position ${v2(ORIGIN)}; radius 5; fill ${INK}; stroke ${PAPER} width 3; zIndex 4; };
};`;
}

function guideSource(): string {
  const across = dashes({ x: OX + 14, y: sy(3) }, { x: sx(4) - 16, y: sy(3) }, 7, 6);
  const down = dashes({ x: sx(4), y: OY - 14 }, { x: sx(4), y: sy(3) + 16 }, 7, 6);
  return `group guides {
  opacity 0;
  zIndex 4;
  path across {
    stroke ${GUIDE} width 1.7 cap butt;
    zIndex 1;
${across}
  };
  path down {
    stroke ${GUIDE} width 1.7 cap butt;
    zIndex 1;
${down}
  };
};`;
}

function ghostSource(): string {
  const end = shaftEnd(B);
  const [tip, left, right] = headPoints(B);
  return `group ghostB {
  position ${v2(ORIGIN)};
  opacity 0;
  zIndex 5;
  path shaft {
    stroke ${AMBER} width 4 cap butt;
    zIndex 1;
${dashes({ x: 0, y: 0 }, end, 8, 7)}
  };
  path chevron {
    stroke ${AMBER} width 4 cap round join round;
    zIndex 2;
    move ${v2(left)};
    line ${v2(tip)};
    line ${v2(right)};
  };
};`;
}

const EQ_X = 792;
const EQ_Y = [324, 372, 420];
const LINE_2 = "      = (3 + 1, 1 + 2)";
const LINE_2_BASE = EQ_Y[1] ?? 372;

function underline(name: string, term: string): string {
  const index = LINE_2.indexOf(term);
  if (index < 0) throw new Error(`missing equation term ${term}`);
  const x0 = EQ_X + index * ADVANCE + 1;
  const x1 = EQ_X + (index + term.length) * ADVANCE - 1;
  const y = LINE_2_BASE + 9;
  return `line ${name} { from (${n(x0)}, ${n(y)}); to (${n(x1)}, ${n(y)}); stroke ${INK} width 2.4 cap round; opacity 0; zIndex 21; };`;
}

function copySource(): string {
  const prose = (name: string, content: string, y: number, size: number, weight: number) =>
    `text ${name} { position (56, ${n(y)}); content "${content}"; fontFamily "sans"; fontSize ${size}; fontWeight ${weight}; align left; baseline alphabetic; fill ${INK}; opacity 0; zIndex 20; };`;
  const equation = (name: string, content: string, y: number) =>
    `text ${name} { position (${n(EQ_X)}, ${n(y)}); content "${content}"; fontFamily "Menlo"; fontSize 26; fontWeight 400; align left; baseline alphabetic; fill ${INK}; opacity 0; zIndex 20; };`;
  return [
    `text title { position (56, 58); content "Adding Two Vectors"; fontFamily "sans"; fontSize 34; fontWeight 600; align left; baseline alphabetic; fill ${INK}; opacity 0; zIndex 20; };`,
    prose("capMeet", "Add vectors by placing them head to tail.", 646, 22, 500),
    prose("capSame", "Same length. Same direction.", 646, 22, 500),
    prose("capSum", "The sum connects the start to the final endpoint.", 646, 22, 500),
    prose("capOrder", "Either order reaches the same endpoint.", 646, 22, 500),
    prose("capCommute", "a + b = b + a", 616, 28, 600),
    prose("capRule", "Place head to tail. Connect start to finish.", 658, 22, 500),
    equation("eqLine1", "a + b = (3, 1) + (1, 2)", EQ_Y[0] ?? 324),
    equation("eqLine2", LINE_2, LINE_2_BASE),
    equation("eqLine3", "      = (4, 3)", EQ_Y[2] ?? 420),
    equation("eqResult", "a + b = (4, 3)", 372),
    underline("underX", "3 + 1"),
    underline("underY", "1 + 2"),
    `group endpoint {
  opacity 0;
  zIndex 14;
  circle dot { position ${v2(HEAD_SUM)}; radius 5.5; fill ${INK}; stroke ${PAPER} width 3; zIndex 1; };
  text coord { position (${n(HEAD_SUM.x + 18)}, ${n(HEAD_SUM.y - 26)}); content "(4, 3)"; fontFamily "sans"; fontSize 18; fontWeight 600; align left; baseline middle; fill ${INK}; zIndex 2; };
};`,
  ].join("\n");
}

function ring(name: string, at: Pt, radius: number, color: string): string {
  return `circle ${name} { position ${v2(at)}; radius ${radius}; stroke ${color} width 2.1; opacity 0; zIndex 15; };`;
}

function motion(): string {
  const joint = pulse(7.95, 8.6, 0.72, 1.62);
  const origin = pulse(10.05, 10.8, 0.55, 1.48);
  const sum = pulse(23.05, 23.8, 0.5, 1.4);
  const route = [
    { t: 0, v: "1", ease: "hold" as const },
    { t: 14.55, v: "1", ease: "easeInOut" as const },
    { t: 15.2, v: "0.78", ease: "hold" as const },
    { t: 20.05, v: "0.78", ease: "easeInOut" as const },
    { t: 20.75, v: "0.2", ease: "hold" as const },
    { t: 25.05, v: "0.2", ease: "easeIn" as const },
    { t: 26.05, v: "0", ease: "hold" as const },
    { t: DURATION, v: "0" },
  ];
  return [
    track("plane.opacity", arrive(0, 1)),
    track("title.opacity", arrive(0.05, 0.75)),
    track(
      "capMeet.opacity",
      [
        { t: 0, v: "0", ease: "hold" },
        { t: 0.45, v: "0", ease: "easeOut" },
        { t: 1.15, v: "1", ease: "hold" },
        { t: 4.25, v: "1", ease: "easeInOut" },
        { t: 5.0, v: "0.55", ease: "hold" },
        { t: 5.2, v: "0.55", ease: "easeIn" },
        { t: 5.75, v: "0", ease: "hold" },
        { t: DURATION, v: "0" },
      ],
    ),
    track("capSame.opacity", reveal(5.35, 6.05, 9.55, 10.35)),
    track("capSum.opacity", reveal(10.35, 11.05, 14.6, 15.25)),
    track("capOrder.opacity", reveal(20.4, 21.05, 24.75, 25.4)),
    track("capCommute.opacity", arrive(25.2, 25.95)),
    track("capRule.opacity", arrive(26.15, 27)),
    track("ghostB.opacity", reveal(5.5, 6.15, 9.55, 10.4, "0.38")),
    track("vectorB.position", [
      { t: 0, v: v2(ORIGIN), ease: "hold" },
      { t: 5.5, v: v2(ORIGIN), ease: "easeInOut" },
      { t: 8, v: v2(HEAD_A), ease: "hold" },
      { t: DURATION, v: v2(HEAD_A) },
    ]),
    track("vectorA.opacity", route),
    track("vectorB.opacity", route),
    track("endpoint.opacity", arrive(10, 11)),
    track("ringOrigin.opacity", origin.opacity),
    track("ringOrigin.scale", origin.scale),
    track("ringJoint.opacity", joint.opacity),
    track("ringJoint.scale", joint.scale),
    track("guides.opacity", reveal(15, 15.7, 19.95, 20.55)),
    track("eqLine1.opacity", reveal(15.05, 15.6, 20, 20.45)),
    track("eqLine2.opacity", reveal(16.05, 16.6, 20, 20.45)),
    track("eqLine3.opacity", reveal(17.05, 17.6, 20, 20.45)),
    track("underX.opacity", reveal(18.2, 18.48, 18.82, 19.08)),
    track("underY.opacity", reveal(19.15, 19.42, 19.72, 19.96)),
    track("eqResult.opacity", arrive(20.2, 20.75)),
    track("ringSum.opacity", sum.opacity),
    track("ringSum.scale", sum.scale),
  ].join("\n");
}

function program(): string {
  const arrows = [
    arrow({ name: "vectorA", vector: A, at: ORIGIN, color: BLUE, z: 6, label: "a", labelSize: 26, along: 0.58, gap: 40, draw: [1, 2] }),
    arrow({ name: "vectorB", vector: B, at: ORIGIN, color: AMBER, z: 7, label: "b", labelSize: 26, along: 0.5, gap: 44, draw: [2.5, 3.5] }),
    arrow({ name: "vectorB2", vector: B, at: ORIGIN, color: AMBER, z: 8, label: "b", labelSize: 26, along: 0.5, gap: 44, draw: [20.5, 21.5] }),
    arrow({ name: "vectorA2", vector: A, at: HEAD_B, color: BLUE, z: 9, label: "a", labelSize: 26, along: 0.5, gap: 42, draw: [22, 23] }),
    arrow({ name: "sum", vector: SUM, at: ORIGIN, color: TEAL, z: 11, label: "a + b", labelSize: 24, along: 0.44, gap: 38, draw: [11, 13] }),
  ];
  return `// ADDING TWO VECTORS
// 30 seconds. Off-white sheet, equal scales, a = (3, 1) and b = (1, 2).
// 0:00 draw a, then b. 0:05 slide b onto the head of a. 0:10 draw a + b.
// 0:15 add the components. 0:20 reverse the order. 0:25 hold a + b = b + a.
scene "adding-two-vectors" {
  version "0.2";
  viewport (1280, 720);
  background ${PAPER};
  duration 30s;
  requires "easing.hold";
  requires "geometry.operators";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
${gridSource()}
${guideSource()}
${ghostSource()}
${arrows.map((item) => item.body).join("\n")}
${copySource()}
${ring("ringOrigin", ORIGIN, 15, INK)}
${ring("ringJoint", HEAD_A, 16, INK)}
${ring("ringSum", HEAD_SUM, 16, TEAL)}
${arrows.map((item) => item.operator).join("\n")}
${arrows.flatMap((item) => item.tracks).join("\n")}
${motion()}
complete;
`;
}

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined || color.a === undefined) {
    return "none";
  }
  return cssColor(color as SolidColor);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.02) return "";
  const matrix = item.logicalMatrix;
  const transform = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const fill = item.appearance.fill?.type === "solid" ? cssPaint(item.appearance.fill) : "none";
  const stroke = item.appearance.stroke;
  const strokePaint = stroke ? cssPaint(stroke.color.type === "solid" ? stroke.color : undefined) : "none";
  const width = stroke?.width ?? 1;
  const cap = stroke?.cap ?? "butt";
  const join = stroke?.join ?? "miter";
  const geometry = item.geometry;
  if (geometry.kind === "text") {
    const anchor = geometry.align === "center" ? "middle" : geometry.align === "right" ? "end" : "start";
    const baseline = geometry.baseline === "middle" ? "central" : geometry.baseline === "top" ? "text-before-edge" : geometry.baseline === "bottom" ? "text-after-edge" : "auto";
    const family = geometry.font.family === "sans" ? "Helvetica, sans-serif" : geometry.font.family;
    const style = geometry.font.style === "italic" ? "italic" : "normal";
    return `<text transform="${transform}" fill="${fill}" opacity="${item.opacity.toFixed(3)}" font-family="${family}" font-size="${geometry.font.size}" font-weight="${geometry.font.weight}" font-style="${style}" text-anchor="${anchor}" dominant-baseline="${baseline}">${escapeXml(geometry.content)}</text>`;
  }
  const common = `transform="${transform}" opacity="${item.opacity.toFixed(3)}" fill="${fill}" stroke="${strokePaint}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="${join}"`;
  if (geometry.kind === "line") {
    return `<line x1="${geometry.from.x}" y1="${geometry.from.y}" x2="${geometry.to.x}" y2="${geometry.to.y}" ${common}/>`;
  }
  if (geometry.kind === "circle") return `<circle cx="0" cy="0" r="${geometry.radius}" ${common}/>`;
  if (geometry.kind === "polygon") {
    const points = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
    return `<polygon points="${points}" ${common}/>`;
  }
  if (geometry.kind === "path") {
    if (geometry.commands.length < 2) return "";
    const d = geometry.commands
      .map((command) => {
        if (command.cmd === "M") return `M ${command.x} ${command.y}`;
        if (command.cmd === "L") return `L ${command.x} ${command.y}`;
        if (command.cmd === "Q") return `Q ${command.cx} ${command.cy} ${command.x} ${command.y}`;
        if (command.cmd === "C") return `C ${command.c1x} ${command.c1y} ${command.c2x} ${command.c2y} ${command.x} ${command.y}`;
        return "Z";
      })
      .join(" ");
    return `<path d="${d}" ${common}/>`;
  }
  return "";
}

function frameSvg(runtime: AnimationRuntime, time: number): string {
  const frame = runtime.evaluate(time * 1000);
  const body = frame.drawItems.map(drawItem).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${PAPER}"/>${body}</svg>`;
}

function tip(frameItems: readonly ResolvedDrawItem[], id: string, local: Pt): Pt | undefined {
  const item = frameItems.find((entry) => entry.nodeId === id);
  if (!item) return undefined;
  return transformPoint(item.logicalMatrix, local.x, local.y);
}

function opacity(frameItems: readonly ResolvedDrawItem[], id: string): number {
  return frameItems.find((entry) => entry.nodeId === id)?.opacity ?? -1;
}

function near(actual: Pt | undefined, expected: Pt, tolerance: number, label: string): void {
  if (!actual) throw new Error(`${label} is missing`);
  const error = Math.hypot(actual.x - expected.x, actual.y - expected.y);
  if (error > tolerance) {
    throw new Error(`${label} off by ${error.toFixed(2)}: expected ${n(expected.x)},${n(expected.y)} got ${n(actual.x)},${n(actual.y)}`);
  }
}

function expectOpacity(value: number, low: number, high: number, label: string): void {
  if (value < low || value > high) throw new Error(`${label} opacity ${value.toFixed(3)} outside ${low}..${high}`);
}

function assertStory(runtime: AnimationRuntime): void {
  const at = (seconds: number) => runtime.evaluate(seconds * 1000).drawItems;
  const early = at(1.5);
  const drawn = at(4);
  const midMove = at(6.75);
  const parked = at(9);
  const summing = at(12);
  const summed = at(14.2);
  const quietRoute = at(16);
  const terms = at(18.6);
  const vertical = at(19.5);
  const cleanEq = at(19.95);
  const reversed = at(21.2);
  const compare = at(24);
  const held = at(29);

  near(tip(drawn, "vectorA.head", A), HEAD_A, 1.5, "a at 4s");
  near(tip(drawn, "vectorB.head", B), HEAD_B, 1.5, "b at 4s");
  near(tip(drawn, "vectorB.shaft", { x: 0, y: 0 }), ORIGIN, 1.5, "b tail at 4s");
  expectOpacity(opacity(drawn, "ghostB.shaft"), -1, 0.05, "ghost before the move");

  const halfway = { x: (ORIGIN.x + HEAD_A.x) / 2, y: (ORIGIN.y + HEAD_A.y) / 2 };
  near(tip(midMove, "vectorB.shaft", { x: 0, y: 0 }), halfway, 2, "b tail at the eased midpoint");
  expectOpacity(opacity(midMove, "ghostB.shaft"), 0.25, 0.45, "ghost during the move");

  near(tip(parked, "vectorB.shaft", { x: 0, y: 0 }), HEAD_A, 1.5, "b tail on a");
  near(tip(parked, "vectorB.head", B), HEAD_SUM, 1.5, "b head at (4, 3)");
  expectOpacity(opacity(early, "vectorA.head"), -1, 0.05, "a head while the shaft is drawing");
  expectOpacity(opacity(drawn, "vectorA.head"), 0.95, 1, "a head after the draw");
  expectOpacity(opacity(drawn, "vectorB.head"), 0.95, 1, "b head after the draw");

  near(tip(summed, "sum.head", SUM), HEAD_SUM, 1.5, "resultant at 14s");
  expectOpacity(opacity(summing, "sum.head"), -1, 0.2, "resultant head before the shaft arrives");
  expectOpacity(opacity(summed, "sum.label"), 0.95, 1, "resultant label");
  expectOpacity(opacity(summed, "endpoint.dot"), 0.95, 1, "endpoint marker");
  expectOpacity(opacity(quietRoute, "vectorA.label"), 0.7, 0.86, "route softened");

  expectOpacity(opacity(terms, "eqLine1"), 0.95, 1, "equation line 1");
  expectOpacity(opacity(terms, "eqLine2"), 0.95, 1, "equation line 2");
  expectOpacity(opacity(terms, "eqLine3"), 0.95, 1, "equation line 3");
  expectOpacity(opacity(terms, "underX"), 0.7, 1, "horizontal underline");
  expectOpacity(opacity(terms, "underY"), -1, 0.05, "vertical underline not yet");
  expectOpacity(opacity(vertical, "underY"), 0.7, 1, "vertical underline");
  expectOpacity(opacity(vertical, "underX"), -1, 0.05, "horizontal underline finished");
  expectOpacity(opacity(cleanEq, "eqLine1"), 0.95, 1, "equation still held");
  expectOpacity(opacity(cleanEq, "underY"), -1, 0.12, "underlines clear before the collapse");

  expectOpacity(opacity(reversed, "eqResult"), 0.95, 1, "retained component sum");
  expectOpacity(opacity(reversed, "eqLine2"), -1, 0.05, "working lines gone");
  expectOpacity(opacity(reversed, "guides.across"), -1, 0.05, "guides gone");
  expectOpacity(opacity(reversed, "vectorA.label"), 0.12, 0.28, "first route faint");
  expectOpacity(opacity(reversed, "vectorB2.head"), -1, 0.35, "reversed b still drawing at 21.2");

  near(tip(compare, "vectorB2.head", B), HEAD_B, 1.5, "reversed b");
  near(tip(compare, "vectorA2.shaft", { x: 0, y: 0 }), HEAD_B, 1.5, "reversed a tail");
  near(tip(compare, "vectorA2.head", A), HEAD_SUM, 1.5, "reversed a head");
  near(tip(compare, "sum.head", SUM), HEAD_SUM, 1.5, "resultant stays");
  expectOpacity(opacity(compare, "capOrder"), 0.95, 1, "order sentence");

  expectOpacity(opacity(held, "vectorA.label"), -1, 0.02, "first route gone");
  expectOpacity(opacity(held, "vectorB2.label"), 0.95, 1, "reversed b remains");
  expectOpacity(opacity(held, "vectorA2.label"), 0.95, 1, "reversed a remains");
  expectOpacity(opacity(held, "sum.label"), 0.95, 1, "resultant remains");
  expectOpacity(opacity(held, "eqResult"), 0.95, 1, "component sum remains");
  expectOpacity(opacity(held, "capCommute"), 0.95, 1, "commutative law");
  expectOpacity(opacity(held, "capRule"), 0.95, 1, "final rule");
  expectOpacity(opacity(held, "capOrder"), -1, 0.02, "order sentence gone");
  expectOpacity(opacity(held, "title"), 0.95, 1, "title remains");
}

function main(): void {
  if (Math.hypot(HEAD_A.x + B.x - HEAD_SUM.x, HEAD_A.y + B.y - HEAD_SUM.y) > 0.01) {
    throw new Error("translated b does not land on (4, 3)");
  }
  if (Math.hypot(HEAD_B.x + A.x - HEAD_SUM.x, HEAD_B.y + A.y - HEAD_SUM.y) > 0.01) {
    throw new Error("reversed a does not land on (4, 3)");
  }
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "adding-two-vectors.ms");
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
  assertStory(runtime);
  console.log("story checks passed");
  const previewDir = resolve("/tmp/adding-two-vectors");
  mkdirSync(previewDir, { recursive: true });
  const moments = [0.7, 1.5, 2.1, 3.1, 4.2, 6.8, 8.1, 9.6, 11.5, 14.2, 16.2, 18.6, 19.5, 20.6, 21.2, 22.5, 24, 26.4, 29];
  for (const time of moments) writeFileSync(resolve(previewDir, `t${time.toFixed(1)}.svg`), frameSvg(runtime, time));
  const columns = 5;
  const scale = 0.28;
  const cellW = 1280 * scale;
  const cellH = 720 * scale;
  const rows = Math.ceil(moments.length / columns);
  const sheet = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(columns * cellW)}" height="${Math.ceil(rows * cellH)}" viewBox="0 0 ${columns * cellW} ${rows * cellH}">`,
  ];
  moments.forEach((time, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const frame = runtime.evaluate(time * 1000);
    sheet.push(
      `<g transform="translate(${column * cellW} ${row * cellH}) scale(${scale})"><rect width="1280" height="720" fill="${PAPER}"/>${frame.drawItems.map(drawItem).join("")}<text x="28" y="52" fill="${INK}" font-size="36" font-family="Helvetica, sans-serif">${time.toFixed(1)}s</text></g>`,
    );
  });
  sheet.push("</svg>");
  const sheetPath = resolve(previewDir, "sheet.svg");
  writeFileSync(sheetPath, sheet.join(""));
  console.log(`preview ${sheetPath}`);
  try {
    execFileSync("qlmanage", ["-t", "-s", "1600", "-o", previewDir, sheetPath], { stdio: "ignore" });
    for (const time of [4.2, 9.6, 14.2, 18.6, 24, 29]) {
      execFileSync("qlmanage", ["-t", "-s", "1280", "-o", previewDir, resolve(previewDir, `t${time.toFixed(1)}.svg`)], { stdio: "ignore" });
    }
  } catch {
    console.log("qlmanage preview skipped");
  }
}

main();
