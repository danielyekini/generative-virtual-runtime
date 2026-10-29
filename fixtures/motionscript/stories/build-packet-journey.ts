/**
 * Builds fixtures/motionscript/stories/packet-journey.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-packet-journey.ts
 *
 * Thirty-five seconds. A message splits into five packets, the routes diverge,
 * packet 3 is lost, and the receiver rebuilds the line after retransmission.
 * Labels that must stay attached to the schematic are world-space. The buffer
 * monitor during the wide shot is screen-space so it stays legible.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const DURATION = 35_000;

const BG = "#070b12";
const INK = "#e7eef6";
const MUTED = "#8b9bb0";
const PANEL = "#101820";
const EDGE = "#314052";
const LINK = "#5c6b80";
const CYAN = "#3de0ff";
const CYAN_DEEP = "#145e72";
const VIOLET = "#1b1630";
const VIOLET_EDGE = "#8d7dff";
const VIOLET_INK = "#d4ccff";
const AMBER = "#f5b042";
const GRID = "#162230";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Sample = { t: number; v: number; ease?: Ease };
type Stop = { t: number; p: Pt; ease?: Ease };

const HUB: Pt = { x: 280, y: 350 };
const U1: Pt = { x: 570, y: 155 };
const U2: Pt = { x: 880, y: 135 };
const U3: Pt = { x: 1140, y: 178 };
const RI: Pt = { x: 1320, y: 228 };
const MN1: Pt = { x: 610, y: 308 };
const MN2: Pt = { x: 930, y: 286 };
const MN3: Pt = { x: 1160, y: 268 };
const MS1: Pt = { x: 610, y: 458 };
const MS2: Pt = { x: 930, y: 472 };
const MS3: Pt = { x: 1160, y: 438 };
const L1: Pt = { x: 560, y: 568 };
const FAIL: Pt = { x: 830, y: 648 };
const L2: Pt = { x: 1100, y: 712 };
const INLET: Pt = { x: 1200, y: 328 };
const MESSAGE: Pt = { x: 1580, y: 214 };
const SLOT_Y = 448;
const SLOT_X = [1404, 1492, 1580, 1668, 1756];

const FRAGS = ["HEL", "LO,", " NET", "WOR", "K!"];
const ASM_X = [-118, -68, -8, 54, 108];

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function along(a: Pt, b: Pt, distance: number): Pt {
  const length = dist(a, b) || 1;
  const u = distance / length;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function distToSegment(point: Pt, from: Pt, to: Pt): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return dist(point, from);
  const u = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length));
  return dist(point, { x: from.x + dx * u, y: from.y + dy * u });
}

const Q1 = along(HUB, U1, 176);
const Q5 = along(HUB, U1, 46);
const Q2 = along(HUB, MN1, 152);
const Q4 = along(HUB, MS1, 152);
const Q3 = along(HUB, L1, 142);
const AFTER = along(FAIL, L2, 36);
const SLOT: Pt[] = SLOT_X.map((x) => ({ x, y: SLOT_Y }));
const BAR: Pt = { x: 250, y: 246 };
const SPLIT: Pt[] = [
  { x: 156, y: 246 },
  { x: 206, y: 246 },
  { x: 262, y: 246 },
  { x: 318, y: 246 },
  { x: 368, y: 246 },
];
const SPREAD: Pt[] = [
  { x: 430, y: 210 },
  { x: 520, y: 300 },
  { x: 430, y: 390 },
  { x: 520, y: 480 },
  { x: 430, y: 560 },
];

function asm(index: number, dy = 0): Pt {
  return { x: MESSAGE.x + ASM_X[index]!, y: MESSAGE.y + dy };
}

function stop(t: number, p: Pt, ease?: Ease): Stop {
  return ease ? { t, p, ease } : { t, p };
}

function seat(index: number, arrive: number): Stop[] {
  return [
    stop(arrive, SLOT[index]!, "hold"),
    stop(31.22, SLOT[index]!, "easeInOut"),
    stop(31.92, asm(index, -16), "easeOut"),
    stop(32.08, asm(index), "hold"),
    stop(35, asm(index)),
  ];
}

const P1: Stop[] = [
  stop(0, SPLIT[0]!, "hold"),
  stop(1.05, SPLIT[0]!, "easeOut"),
  stop(2.05, SPREAD[0]!, "easeInOut"),
  stop(3.35, Q1, "hold"),
  stop(5.2, Q1, "easeOut"),
  stop(6.4, U1, "hold"),
  stop(7.1, U1, "easeOut"),
  stop(8.4, U2, "hold"),
  stop(9.85, U2, "easeOut"),
  stop(11.0, U3, "hold"),
  stop(11.45, U3, "easeOut"),
  stop(12.4, RI, "hold"),
  stop(12.9, RI, "easeOut"),
  stop(13.65, INLET, "hold"),
  stop(14.12, INLET, "easeOut"),
  ...seat(0, 15),
];

const P5: Stop[] = [
  stop(0, SPLIT[4]!, "hold"),
  stop(1.7, SPLIT[4]!, "easeOut"),
  stop(2.15, SPREAD[4]!, "easeInOut"),
  stop(3.55, Q5, "hold"),
  stop(6.55, Q5, "easeOut"),
  stop(7.7, U1, "hold"),
  stop(8.7, U1, "easeOut"),
  stop(10.1, U2, "hold"),
  stop(11.2, U2, "easeOut"),
  stop(12.5, U3, "hold"),
  stop(12.6, U3, "easeOut"),
  stop(13.55, RI, "hold"),
  stop(13.8, RI, "easeOut"),
  stop(14.55, INLET, "hold"),
  stop(16.9, INLET, "easeOut"),
  ...seat(4, 18.5),
];

const P2: Stop[] = [
  stop(0, SPLIT[1]!, "hold"),
  stop(1.22, SPLIT[1]!, "easeOut"),
  stop(2.08, SPREAD[1]!, "easeInOut"),
  stop(3.4, Q2, "hold"),
  stop(5.75, Q2, "easeOut"),
  stop(6.85, MN1, "hold"),
  stop(9.35, MN1, "easeOut"),
  stop(10.45, MN2, "hold"),
  stop(10.9, MN2, "easeOut"),
  stop(11.85, MN3, "hold"),
  stop(12.1, MN3, "easeOut"),
  stop(12.7, INLET, "hold"),
  stop(12.82, INLET, "easeOut"),
  ...seat(1, 13),
];

const P4: Stop[] = [
  stop(0, SPLIT[3]!, "hold"),
  stop(1.55, SPLIT[3]!, "easeOut"),
  stop(2.12, SPREAD[3]!, "easeInOut"),
  stop(3.48, Q4, "hold"),
  stop(6.6, Q4, "easeOut"),
  stop(7.5, MS1, "hold"),
  stop(7.85, MS1, "easeOut"),
  stop(8.85, MS2, "hold"),
  stop(9.15, MS2, "easeOut"),
  stop(10.15, MS3, "hold"),
  stop(10.4, MS3, "easeOut"),
  stop(11.1, INLET, "hold"),
  stop(11.22, INLET, "easeOut"),
  ...seat(3, 11.5),
];

const P3: Stop[] = [
  stop(0, SPLIT[2]!, "hold"),
  stop(1.38, SPLIT[2]!, "easeOut"),
  stop(2.1, SPREAD[2]!, "easeInOut"),
  stop(3.42, Q3, "hold"),
  stop(6.2, Q3, "easeOut"),
  stop(7.35, L1, "hold"),
  stop(7.9, L1, "easeOut"),
  stop(9, FAIL, "hold"),
  stop(35, FAIL),
];

const RETRY: Stop[] = [
  stop(0, { x: 168, y: 392 }, "hold"),
  stop(23.05, { x: 168, y: 392 }, "easeOut"),
  stop(23.42, Q4, "hold"),
  stop(23.5, Q4, "easeOut"),
  stop(24.65, MS1, "hold"),
  stop(25.2, MS1, "easeOut"),
  stop(26.15, MS2, "hold"),
  stop(26.55, MS2, "easeOut"),
  stop(27.2, MS3, "hold"),
  stop(27.4, MS3, "easeOut"),
  stop(27.72, INLET, "hold"),
  stop(27.84, INLET, "easeOut"),
  ...seat(2, 28),
];

type Wire = { id: string; a: Pt; b: Pt; dim?: boolean };

const WIRES: Wire[] = [
  { id: "up0", a: HUB, b: U1 },
  { id: "up1", a: U1, b: U2 },
  { id: "up2", a: U2, b: U3 },
  { id: "up3", a: U3, b: RI },
  { id: "up4", a: RI, b: INLET },
  { id: "mn0", a: HUB, b: MN1 },
  { id: "mn1", a: MN1, b: MN2 },
  { id: "mn2", a: MN2, b: MN3 },
  { id: "mn3", a: MN3, b: INLET },
  { id: "ms0", a: HUB, b: MS1 },
  { id: "ms1", a: MS1, b: MS2 },
  { id: "ms2", a: MS2, b: MS3 },
  { id: "ms3", a: MS3, b: INLET },
  { id: "lo0", a: HUB, b: L1 },
  { id: "lo1", a: L1, b: FAIL },
  { id: "lo2", a: AFTER, b: L2, dim: true },
];

function travels(stops: Stop[]): [Pt, Pt, number, number][] {
  const windows: [Pt, Pt, number, number][] = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index]!;
    const to = stops[index + 1]!;
    if (from.ease === "hold") continue;
    if (dist(from.p, to.p) < 1) continue;
    windows.push([from.p, to.p, from.t, to.t]);
  }
  return windows;
}

function wireWindows(): Map<string, [number, number][]> {
  const map = new Map<string, [number, number][]>();
  for (const wire of WIRES) map.set(wire.id, []);
  const trips = [P1, P2, P3, P4, P5, RETRY];
  for (const trip of trips) {
    for (const [from, to, start, end] of travels(trip)) {
      for (const wire of WIRES) {
        if (wire.dim) continue;
        if (distToSegment(from, wire.a, wire.b) < 10 && distToSegment(to, wire.a, wire.b) < 10) {
          map.get(wire.id)!.push([start, end]);
        }
      }
    }
  }
  return map;
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

function track(target: string, samples: Sample[]): string {
  const ordered = [...samples].map((sample) => ({ ...sample, t: ms(sample.t) })).sort((a, b) => a.t - b.t);
  if (ordered[0]!.t > 0) ordered.unshift({ t: 0, v: ordered[0]!.v, ease: "hold" });
  ordered[0]!.t = 0;
  if (ordered[ordered.length - 1]!.t < DURATION) ordered.push({ t: DURATION, v: ordered[ordered.length - 1]!.v });
  ordered[ordered.length - 1]!.t = DURATION;
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 35s;"];
  let previous = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    const sample = ordered[index]!;
    const pct = percent(Math.max(0, Math.min(DURATION, sample.t)), previous);
    previous = pct.value;
    const ease = sample.ease && index < ordered.length - 1 ? ` ease ${sample.ease}` : "";
    lines.push(`  ${pct.text} ${n(sample.v, 4)}${ease};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function place(id: string, stops: Stop[]): string {
  return [
    track(
      `${id}.position.x`,
      stops.map((item) => ({ t: item.t, v: item.p.x, ease: item.ease })),
    ),
    track(
      `${id}.position.y`,
      stops.map((item) => ({ t: item.t, v: item.p.y, ease: item.ease })),
    ),
  ].join("\n");
}

function span(target: string, windows: [number, number, number, number][]): string {
  const keys: Sample[] = [{ t: 0, v: windows[0]?.[2] ?? 0, ease: "hold" }];
  for (const [show, hide, from, to] of windows) {
    keys.push({ t: show, v: from, ease: "easeOut" });
    keys.push({ t: hide, v: to, ease: "hold" });
  }
  keys.push({ t: 35, v: keys[keys.length - 1]!.v });
  return track(target, keys);
}

function pulse(target: string, windows: [number, number][], peak = 1): string {
  const keys: Sample[] = [{ t: 0, v: 0, ease: "hold" }];
  const ordered = [...windows].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of ordered) {
    const span = Math.max(0.16, end - start);
    const a = start;
    const b = start + span;
    keys.push({ t: Math.max(0, a), v: 0, ease: "easeOut" });
    keys.push({ t: a + Math.min(0.08, span * 0.25), v: peak, ease: "hold" });
    keys.push({ t: Math.max(a + 0.12, b - 0.06), v: peak, ease: "easeIn" });
    keys.push({ t: b + 0.05, v: 0, ease: "hold" });
  }
  keys.push({ t: 35, v: 0 });
  return track(target, keys);
}

function text(name: string, x: number, y: number, content: string, size: number, fill: string, weight = 600, extra = ""): string {
  const align = extra.includes("align ") ? "" : "align center;";
  return `text ${name} { position (${n(x)}, ${n(y)}); content "${content}"; fontFamily "sans"; fontSize ${size}; fontWeight ${weight}; ${align} baseline middle; fill ${fill}; ${extra} };`;
}

function packet(id: string, num: string, frag: string): string {
  return `group ${id} {
  position (${n(SPLIT[0]!.x)}, ${n(SPLIT[0]!.y)});
  opacity 0;
  zIndex 24;
  ellipse halo { position (0, 0); size (104, 64); fill ${CYAN}; opacity 0; };
  rectangle body { position (-46, -24); size (92, 48); cornerRadius 6; fill ${VIOLET}; stroke ${VIOLET_EDGE} width 1.6; };
  rectangle cyan { position (-48, -26); size (96, 52); cornerRadius 7; stroke ${CYAN} width 2.1; opacity 0; };
  rectangle amber { position (-48, -26); size (96, 52); cornerRadius 7; stroke ${AMBER} width 2.4; opacity 0; };
  ${text("index", -28, -1, num, 14, VIOLET_INK, 700, "align left;")}
  ${text("frag", 10, 1, frag, 16, INK, 650)}
  rectangle burst { position (-50, -28); size (100, 56); cornerRadius 8; stroke #e9fbff width 2.6; opacity 0; };
};`;
}

function dashed(w: number, h: number): string {
  const x = -w / 2;
  const y = -h / 2;
  const parts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const dx = (x1 - x0) / length;
    const dy = (y1 - y0) / length;
    for (let cursor = 0; cursor < length - 0.4; cursor += 12) {
      const end = Math.min(length, cursor + 7);
      parts.push(`move (${n(x0 + dx * cursor)}, ${n(y0 + dy * cursor)});`);
      parts.push(`line (${n(x0 + dx * end)}, ${n(y0 + dy * end)});`);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
  return parts.join("\n      ");
}

function router(id: string, label: string, at: Pt): string {
  return `group ${id} {
  position (${n(at.x)}, ${n(at.y)});
  zIndex 4;
  rectangle body { position (-34, -18); size (68, 36); cornerRadius 4; fill ${PANEL}; stroke ${EDGE} width 1.25; };
  circle lamp { position (22, 0); radius 3.2; fill ${CYAN}; opacity 0.85; };
  ${id === "rU2" ? `circle busy { position (22, 0); radius 6; fill ${AMBER}; opacity 0; };` : ""}
  ${text("label", -6, 0, label, 12, MUTED, 650)}
};`;
}

function ack(id: string, stops: Stop[], show: number, hide: number): string {
  return `group ${id} {
  position (${n(stops[0]!.p.x)}, ${n(stops[0]!.p.y)});
  opacity 0;
  zIndex 28;
  circle blip { radius 6.5; fill ${CYAN}; stroke ${VIOLET_INK} width 1.2; };
};
${place(id, stops)}
${span(`${id}.opacity`, [[show, show + 0.12, 0, 1], [hide, hide + 0.18, 1, 0]])}`;
}

function program(): string {
  const glow = wireWindows();
  const gridX = [120, 400, 680, 960, 1240, 1520, 1800];
  const gridY = [120, 280, 440, 600, 760];
  const routers = [
    router("rU1", "A1", U1),
    router("rU2", "A2", U2),
    router("rU3", "A3", U3),
    router("rIn", "A4", RI),
    router("rN1", "B1", MN1),
    router("rN2", "B2", MN2),
    router("rN3", "B3", MN3),
    router("rS1", "C1", MS1),
    router("rS2", "C2", MS2),
    router("rS3", "C3", MS3),
    router("rL1", "D1", L1),
    router("rL2", "D2", L2),
  ];
  const grey = WIRES.map((wire) => {
    const opacity = wire.dim ? 0.28 : 0.9;
    return `line ${wire.id} { from (${n(wire.a.x)}, ${n(wire.a.y)}); to (${n(wire.b.x)}, ${n(wire.b.y)}); stroke ${LINK} width ${wire.dim ? 1.2 : 1.6}; opacity ${opacity}; };`;
  }).join("\n    ");
  const glows = WIRES.filter((wire) => !wire.dim)
    .map((wire) => `line g${wire.id} { from (${n(wire.a.x)}, ${n(wire.a.y)}); to (${n(wire.b.x)}, ${n(wire.b.y)}); stroke ${CYAN} width 3.4 cap round; opacity 0; };`)
    .join("\n    ");
  const slots = SLOT.map((slot, index) => `group slot${index + 1} {
  position (${n(slot.x)}, ${n(slot.y)});
  zIndex 12;
  path dashes { ${dashed(108, 74)} stroke ${MUTED} width 1.4 cap round; opacity 0.85; };
  rectangle plate { position (-50, -32); size (100, 64); cornerRadius 5; fill #0d1c24; stroke ${CYAN} width 1.8; opacity 0; };
  ${text("num", 0, -46, String(index + 1), 13, MUTED, 700)}
  ${text("hot", 0, -46, String(index + 1), 13, CYAN, 700, "opacity 0;")}
  ${text("frag", 0, 4, FRAGS[index]!, 13, INK, 650, "opacity 0;")}
};`).join("\n");
  const insetSlots = SLOT_X.map((_, index) => {
    const x = 18 + index * 58;
    return `rectangle cell${index} { position (${x}, 36); size (50, 58); cornerRadius 4; fill #0d1c24; stroke ${MUTED} width 1.2; };
rectangle lit${index} { position (${x}, 36); size (50, 58); cornerRadius 4; fill #102830; stroke ${CYAN} width 1.6; opacity 0; };
${text(`n${index}`, x + 25, 58, String(index + 1), 16, INK, 700)}`;
  }).join("\n    ");
  const packets = [
    ["pkt1", "1", FRAGS[0]!, P1, 1.02, 15, 29.5],
    ["pkt2", "2", FRAGS[1]!, P2, 1.18, 13, 29.86],
    ["pkt4", "4", FRAGS[3]!, P4, 1.5, 11.5, 30.58],
    ["pkt5", "5", FRAGS[4]!, P5, 1.66, 18.5, 30.94],
  ] as const;
  const motion: string[] = [];
  motion.push(span("bar.opacity", [[1.02, 1.4, 1, 0]]));
  motion.push(span("sender.kept.opacity", [[3.05, 3.4, 0, 1]]));
  motion.push(span("sender.keptCap.opacity", [[3.05, 3.4, 0, 1]]));
  for (const [id, , , stops, appear, seatAt, flashAt] of packets) {
    motion.push(place(id, [...stops]));
    motion.push(span(`${id}.opacity`, [[appear, appear + 0.18, 0, 1], [32.28, 32.5, 1, 0]]));
    motion.push(span(`${id}.halo.opacity`, [[stops.find((item) => item.t > 4)!.t, seatAt, 0, 0.14], [seatAt, seatAt + 0.25, 0.14, 0]]));
    motion.push(track(`${id}.cyan.opacity`, [
      { t: 0, v: 0, ease: "hold" },
      { t: appear + 0.16, v: 0, ease: "easeOut" },
      { t: appear + 0.32, v: 1, ease: "easeIn" },
      { t: appear + 0.62, v: 0, ease: "hold" },
      { t: seatAt - 0.08, v: 0, ease: "easeOut" },
      { t: seatAt + 0.26, v: 1, ease: "hold" },
      { t: 35, v: 1 },
    ]));
    motion.push(pulse(`${id}.burst.opacity`, [[flashAt, flashAt + 0.28]], 0.95));
  }
  motion.push(place("pkt3", P3));
  motion.push(span("pkt3.opacity", [[1.34, 1.52, 0, 1], [8.78, 8.92, 1, 0.15], [8.92, 9.04, 0.15, 1], [9.04, 9.3, 1, 0]]));
  motion.push(span("pkt3.halo.opacity", [[6.2, 8.85, 0, 0.14], [8.85, 9.4, 0.14, 0]]));
  motion.push(pulse("pkt3.cyan.opacity", [[1.55, 1.9]]));
  motion.push(span("pkt3.amber.opacity", [[8.72, 8.88, 0, 1], [8.88, 9.02, 1, 0.15], [9.02, 9.16, 0.15, 1], [9.16, 9.42, 1, 0]]));
  motion.push(place("retry", RETRY));
  motion.push(span("retry.opacity", [[23.02, 23.2, 0, 1], [32.28, 32.5, 1, 0]]));
  motion.push(span("retry.halo.opacity", [[23.45, 28, 0, 0.16], [28, 28.3, 0.16, 0]]));
  motion.push(span("retry.amber.opacity", [[23.08, 23.22, 0, 1], [28.05, 28.45, 1, 0]]));
  motion.push(span("retry.cyan.opacity", [[28.15, 28.5, 0, 1]]));
  motion.push(pulse("retry.burst.opacity", [[30.22, 30.5]]));
  motion.push(span("topology.wires.opacity", [[2.7, 4.7, 0, 1]]));
  motion.push(span("topology.opacity", [[32.55, 34.1, 1, 0.46]]));
  motion.push(span("topology.wires.rU2.busy.opacity", [[8.35, 8.55, 0, 1], [9.85, 10.15, 1, 0]]));
  for (const wire of WIRES) {
    if (wire.dim) continue;
    const windows = glow.get(wire.id) ?? [];
    if (windows.length === 0) continue;
    motion.push(pulse(`topology.wires.g${wire.id}.opacity`, windows, 0.95));
  }
  const fills: [string, number][] = [
    ["slot1", 15],
    ["slot2", 13],
    ["slot3", 28],
    ["slot4", 11.5],
    ["slot5", 18.5],
  ];
  for (const [id, at] of fills) {
    motion.push(span(`${id}.plate.opacity`, [[at - 0.08, at + 0.22, 0, 1]]));
    motion.push(span(`${id}.hot.opacity`, [[at - 0.08, at + 0.22, 0, 1]]));
    motion.push(span(`${id}.frag.opacity`, [[at + 0.05, at + 0.3, 0, 1]]));
    motion.push(span(`${id}.dashes.opacity`, [[at - 0.05, at + 0.25, 0.85, 0.2]]));
  }
  motion.push(span("fault.opacity", [[8.95, 9.12, 0, 1]]));
  motion.push(span("lost.opacity", [[9.02, 9.28, 0, 1]]));
  motion.push(span("wait.opacity", [[4.8, 5.1, 0, 1], [28.35, 28.6, 1, 0]]));
  motion.push(span("got.opacity", [[28.42, 28.68, 0, 1], [31.15, 31.45, 1, 0]]));
  motion.push(span("hist4.opacity", [[11.38, 11.52, 0, 1], [12.9, 13.08, 1, 0]]));
  motion.push(span("hist42.opacity", [[12.95, 13.12, 0, 1], [14.9, 15.08, 1, 0]]));
  motion.push(span("hist421.opacity", [[14.95, 15.12, 0, 1], [18.4, 18.6, 1, 0]]));
  motion.push(span("hist4215.opacity", [[18.48, 18.68, 0, 1], [27.9, 28.1, 1, 0]]));
  motion.push(span("histAll.opacity", [[27.95, 28.15, 0, 1], [31.2, 31.5, 1, 0]]));
  motion.push(span("awaiting.opacity", [[17.15, 17.45, 0, 1], [21.85, 22.02, 1, 0]]));
  motion.push(span("timeout.opacity", [[21.98, 22.12, 0, 1], [23.02, 23.22, 1, 0]]));
  motion.push(span("retx.opacity", [[22.95, 23.18, 0, 1], [24.15, 24.4, 1, 0]]));
  motion.push(track("timer.meter.scale.x", [
    { t: 0, v: 1, ease: "hold" },
    { t: 6.2, v: 1, ease: "linear" },
    { t: 22, v: 0, ease: "hold" },
    { t: 35, v: 0 },
  ]));
  motion.push(span("timer.meter.opacity", [[19.4, 20.1, 1, 0.35], [20.1, 20.7, 0.35, 1], [20.7, 21.3, 1, 0.3], [21.3, 21.9, 0.3, 1], [21.9, 22.05, 1, 0.15]]));
  motion.push(span("timer.warn.opacity", [[19.3, 19.7, 0, 1], [22, 22.15, 1, 0.2]]));
  motion.push(span("banner.opacity", [[31.95, 32.28, 0, 1]]));
  motion.push(span("banner.sweep.opacity", [[32.42, 32.55, 0, 0.85], [33.15, 33.4, 0.85, 0]]));
  motion.push(track("banner.sweep.position.x", [
    { t: 0, v: -190, ease: "hold" },
    { t: 32.4, v: -190, ease: "easeInOut" },
    { t: 33.25, v: 190, ease: "hold" },
    { t: 35, v: 190 },
  ]));
  motion.push(span("done.opacity", [[32.28, 32.55, 0, 1]]));
  motion.push(span("inset.opacity", [[17.35, 17.7, 0, 1], [21.35, 21.9, 1, 0]]));
  const insetFill: [number, number][] = [
    [0, 15],
    [1, 13],
    [2, 28],
    [3, 11.5],
    [4, 18.5],
  ];
  for (const [index, at] of insetFill) {
    if (at > 22) continue;
    if (at < 17.4) motion.push(span(`inset.lit${index}.opacity`, [[17.35, 17.7, 0, 1], [21.35, 21.9, 1, 0]]));
    else motion.push(span(`inset.lit${index}.opacity`, [[at - 0.05, at + 0.2, 0, 1], [21.35, 21.9, 1, 0]]));
  }
  const cam = [
  stop(0, { x: 330, y: 370 }, "hold"),
  stop(1, { x: 330, y: 370 }, "easeInOut"),
  stop(3.15, { x: 560, y: 400 }, "easeInOut"),
    stop(5, { x: 960, y: 420 }, "hold"),
    stop(10.15, { x: 960, y: 420 }, "easeInOut"),
    stop(11.55, { x: 1540, y: 372 }, "hold"),
    stop(16.65, { x: 1540, y: 372 }, "easeInOut"),
    stop(17.65, { x: 960, y: 420 }, "hold"),
    stop(20.55, { x: 880, y: 440 }, "easeInOut"),
    stop(22, { x: 500, y: 480 }, "hold"),
    stop(23.4, { x: 540, y: 468 }, "easeInOut"),
    stop(25.05, { x: 760, y: 458 }, "easeInOut"),
    stop(26.45, { x: 1060, y: 430 }, "easeInOut"),
    stop(27.6, { x: 1340, y: 390 }, "easeInOut"),
    stop(28.15, { x: 1560, y: 368 }, "hold"),
    stop(33, { x: 1560, y: 368 }, "easeInOut"),
    stop(35, { x: 980, y: 420 }),
  ];
  const zoom = [1.72, 1.72, 1.02, 0.64, 0.64, 1.12, 1.12, 0.64, 0.7, 1.02, 1.06, 1.08, 1.14, 1.16, 1.16, 1.16, 0.62];
  motion.push(track("camera(main).position.x", cam.map((item) => ({ t: item.t, v: item.p.x, ease: item.ease }))));
  motion.push(track("camera(main).position.y", cam.map((item) => ({ t: item.t, v: item.p.y, ease: item.ease }))));
  motion.push(track("camera(main).zoom", cam.map((item, index) => ({ t: item.t, v: zoom[index]!, ease: item.ease }))));

  const acks = [
    ack("ack4", [stop(17.2, SLOT[3]!, "easeInOut"), stop(18.1, MS2, "easeInOut"), stop(19.05, MS1, "easeInOut"), stop(19.85, HUB)], 17.15, 19.8),
    ack("ack2", [stop(17.5, SLOT[1]!, "easeInOut"), stop(18.4, MN2, "easeInOut"), stop(19.3, MN1, "easeInOut"), stop(20.15, HUB)], 17.45, 20.1),
    ack("ack1", [stop(17.85, SLOT[0]!, "easeInOut"), stop(18.9, U2, "easeInOut"), stop(19.8, U1, "easeInOut"), stop(20.7, HUB)], 17.8, 20.65),
    ack("ack5", [stop(18.7, SLOT[4]!, "easeInOut"), stop(19.6, U3, "easeInOut"), stop(20.4, U1, "easeInOut"), stop(21.25, HUB)], 18.65, 21.2),
    ack("ackF", [stop(32.7, MESSAGE, "easeInOut"), stop(33.5, { x: 900, y: 120 }, "easeInOut"), stop(34.35, add(HUB, { x: -20, y: -30 }))], 32.65, 34.3),
  ];

  return `// PACKET JOURNEY
// 35 seconds. Dark schematic, cyan routes, violet packets, amber for loss and retransmission.
// 0:00 the message splits. 0:05 the routes diverge. Packet 3 dies on the lower link at 0:09.
// 0:11 packets 4, 2, then 1 land out of order. 0:18 packet 5 fills slot 5.
// 0:22 the timer expires and packet 3 is sent again on the middle route.
// 0:28 the buffer completes. 0:32 the line reads HELLO, NETWORK! and holds.
scene "packet-journey" {
  version "0.2";
  viewport (1280, 720);
  background ${BG};
  duration 35s;
  requires "easing.hold";
  requires "geometry.roundedRect";
  requires "text.basic";
};
camera main {
  position (330, 370);
  zoom 1.72;
  rotation 0deg;
};
group grid {
  zIndex 0;
  ${gridX.map((x, index) => `line v${index} { from (${x}, 40); to (${x}, 820); stroke ${GRID} width 1; };`).join("\n  ")}
  ${gridY.map((y, index) => `line h${index} { from (40, ${y}); to (1880, ${y}); stroke ${GRID} width 1; };`).join("\n  ")}
};
group topology {
  opacity 1;
  zIndex 2;
  group wires {
    opacity 0;
    zIndex 2;
    ${grey}
    ${glows}
    ${routers.join("\n    ")}
    ${text("up", 760, 96, "UPPER", 13, MUTED, 650)}
    ${text("mid", 780, 360, "MIDDLE", 13, MUTED, 650)}
    ${text("low", 700, 600, "LOWER", 13, MUTED, 650)}
  };
};
group fault {
  opacity 0;
  zIndex 16;
  line xa { from (${n(FAIL.x - 14)}, ${n(FAIL.y - 14)}); to (${n(FAIL.x + 14)}, ${n(FAIL.y + 14)}); stroke ${AMBER} width 2.6 cap round; };
  line xb { from (${n(FAIL.x - 14)}, ${n(FAIL.y + 14)}); to (${n(FAIL.x + 14)}, ${n(FAIL.y - 14)}); stroke ${AMBER} width 2.6 cap round; };
  circle gap { position (${n(FAIL.x)}, ${n(FAIL.y)}); radius 5; fill ${BG}; stroke ${AMBER} width 1.4; };
};
group lost {
  position (${n(FAIL.x + 8)}, ${n(FAIL.y - 36)});
  opacity 0;
  zIndex 18;
  ${text("words", 0, 0, "Packet lost", 18, AMBER, 700)}
};
group sender {
  position (168, 350);
  zIndex 10;
  rectangle body { position (-82, -50); size (164, 100); cornerRadius 6; fill ${PANEL}; stroke ${EDGE} width 1.5; };
  ${text("name", 0, -26, "SENDER", 15, INK, 700)}
  ${text("kept", 0, 2, "NET", 16, VIOLET_INK, 700, "opacity 0;")}
  ${text("keptCap", 0, 24, "RETAINED", 11, MUTED, 650, "opacity 0;")}
  circle port { position (82, 0); radius 4; fill ${CYAN}; };
};
group receiver {
  position (1348, 292);
  zIndex 10;
  rectangle body { position (-86, -42); size (172, 84); cornerRadius 6; fill ${PANEL}; stroke ${EDGE} width 1.5; };
  ${text("name", 0, 0, "RECEIVER", 15, INK, 700)}
  circle port { position (-86, 0); radius 4.5; fill ${CYAN}; };
};
group timer {
  position (168, 468);
  zIndex 14;
  ${text("caption", 0, -16, "ACK TIMER", 11, MUTED, 650)}
  rectangle track { position (-64, 0); size (128, 8); cornerRadius 2; fill #0c141c; stroke ${EDGE} width 1; };
  rectangle meter { position (-64, 0); size (128, 8); cornerRadius 2; fill ${CYAN}; pivot (0, 4); };
  rectangle warn { position (-64, 0); size (128, 8); cornerRadius 2; fill ${AMBER}; opacity 0; };
};
${text("awaiting", 168, 508, "3 — awaiting acknowledgement", 15, AMBER, 650, "zIndex 15; opacity 0;")}
${text("timeout", 168, 508, "Timeout: packet 3.", 16, AMBER, 700, "zIndex 15; opacity 0;")}
${text("retx", 168, 534, "3 — retransmission", 15, AMBER, 700, "zIndex 15; opacity 0;")}
group bar {
  position (${n(BAR.x)}, ${n(BAR.y)});
  zIndex 20;
  rectangle plate { position (-168, -26); size (336, 52); cornerRadius 6; fill #102028; stroke ${CYAN} width 1.6; };
  ${text("words", 0, 1, "HELLO, NETWORK!", 22, INK, 700)}
};
${packet("pkt1", "1", FRAGS[0]!)}
${packet("pkt2", "2", FRAGS[1]!)}
${packet("pkt3", "3", FRAGS[2]!)}
${packet("pkt4", "4", FRAGS[3]!)}
${packet("pkt5", "5", FRAGS[4]!)}
${packet("retry", "3", FRAGS[2]!)}
${slots}
${text("hist4", 1580, 378, "4", 18, CYAN, 700, "zIndex 20; opacity 0;")}
${text("hist42", 1580, 378, "4 → 2", 18, CYAN, 700, "zIndex 20; opacity 0;")}
${text("hist421", 1580, 378, "4 → 2 → 1", 18, CYAN, 700, "zIndex 20; opacity 0;")}
${text("hist4215", 1580, 378, "4 → 2 → 1 → 5", 18, CYAN, 700, "zIndex 20; opacity 0;")}
${text("histAll", 1580, 378, "4 → 2 → 1 → 5 → 3", 18, CYAN, 700, "zIndex 20; opacity 0;")}
${text("wait", 1580, 524, "Waiting for all packets", 16, MUTED, 650, "zIndex 20; opacity 0;")}
${text("got", 1580, 524, "All packets received", 16, CYAN, 700, "zIndex 20; opacity 0;")}
group banner {
  position (${n(MESSAGE.x)}, ${n(MESSAGE.y)});
  opacity 0;
  zIndex 34;
  ellipse glow { position (0, 0); size (420, 92); fill ${CYAN}; opacity 0.14; };
  rectangle plate { position (-188, -28); size (376, 56); cornerRadius 6; fill #102830; stroke ${CYAN} width 1.8; };
  ${text("words", 0, 1, "HELLO, NETWORK!", 26, INK, 700)}
  rectangle sweep { position (-190, -22); size (28, 44); fill ${CYAN}; opacity 0; };
};
${text("done", MESSAGE.x, MESSAGE.y + 78, "Message complete", 18, CYAN, 650, "zIndex 36; opacity 0;")}
${acks.join("\n")}
group inset {
  space screen;
  position (0, 0);
  opacity 0;
  zIndex 50;
  rectangle plate { position (24, 16); size (314, 112); cornerRadius 6; fill #0c1218; stroke ${EDGE} width 1.2; opacity 0.94; };
  ${text("caption", 181, 30, "BUFFER", 12, MUTED, 700)}
  ${insetSlots}
};
${motion.join("\n")}
complete;
`;
}

function sampleStop(stops: Stop[], time: number): Pt {
  let index = 0;
  while (index < stops.length - 1 && stops[index + 1]!.t < time) index += 1;
  const from = stops[index]!;
  const to = stops[Math.min(stops.length - 1, index + 1)]!;
  if (from === to || from.ease === "hold" || to.t <= from.t) return from.p;
  const u = Math.max(0, Math.min(1, (time - from.t) / (to.t - from.t)));
  const eased = from.ease === "easeOut" ? 1 - (1 - u) * (1 - u) : from.ease === "easeInOut" ? (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) : from.ease === "easeIn" ? u * u : u;
  return { x: from.p.x + (to.p.x - from.p.x) * eased, y: from.p.y + (to.p.y - from.p.y) * eased };
}

function project(point: Pt, poly: Pt[]): number | undefined {
  let best = Infinity;
  let alongLength = 0;
  let cursor = 0;
  for (let index = 0; index < poly.length - 1; index += 1) {
    const from = poly[index]!;
    const to = poly[index + 1]!;
    const length = dist(from, to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const denom = length * length || 1;
    const raw = ((point.x - from.x) * dx + (point.y - from.y) * dy) / denom;
    const u = Math.max(0, Math.min(1, raw));
    const nearest = { x: from.x + dx * u, y: from.y + dy * u };
    const gap = dist(point, nearest);
    if (gap < best) {
      best = gap;
      alongLength = cursor + length * u;
    }
    cursor += length;
  }
  return best < 28 ? alongLength : undefined;
}

function assertOrder(): void {
  const poly = [Q5, Q1, U1, U2, U3, RI, INLET];
  for (let time = 6.6; time <= 14.4; time += 0.1) {
    const lead = project(sampleStop(P1, time), poly);
    const follow = project(sampleStop(P5, time), poly);
    if (lead === undefined || follow === undefined) continue;
    if (follow > lead + 8) throw new Error(`Packet 5 passes packet 1 at ${time.toFixed(2)}s (${follow.toFixed(0)} > ${lead.toFixed(0)}).`);
  }
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
  const geometry = item.geometry;
  if (geometry.kind === "line") {
    return `<line x1="${geometry.from.x}" y1="${geometry.from.y}" x2="${geometry.to.x}" y2="${geometry.to.y}" ${transform} ${opacity} fill="none" stroke="${strokePaint}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  if (geometry.kind === "circle") {
    return `<circle cx="0" cy="0" r="${geometry.radius}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}"/>`;
  }
  if (geometry.kind === "ellipse") {
    return `<ellipse cx="0" cy="0" rx="${geometry.size.x / 2}" ry="${geometry.size.y / 2}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}"/>`;
  }
  if (geometry.kind === "rectangle") {
    const radius = geometry.cornerRadius ?? 0;
    return `<rect x="0" y="0" width="${geometry.size.x}" height="${geometry.size.y}" rx="${radius}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}"/>`;
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
    return `<path d="${d}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}" stroke-linecap="round"/>`;
  }
  if (geometry.kind === "text") {
    const anchor = geometry.align === "center" ? "middle" : geometry.align === "right" ? "end" : "start";
    const baseline = geometry.baseline === "middle" ? "middle" : geometry.baseline === "top" ? "hanging" : geometry.baseline === "bottom" ? "text-after-edge" : "alphabetic";
    const content = geometry.content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<text ${transform} ${opacity} fill="${fill}" font-family="sans-serif" font-size="${geometry.font.size}" font-weight="${geometry.font.weight}" text-anchor="${anchor}" dominant-baseline="${baseline}">${content}</text>`;
  }
  return "";
}

function centerOf(items: readonly ResolvedDrawItem[], id: string, x: number, y: number): Pt {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) throw new Error(`Missing ${id}`);
  return transformPoint(item.logicalMatrix, x, y);
}

function opacityOf(items: readonly ResolvedDrawItem[], id: string): number {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) throw new Error(`Missing ${id}`);
  return item.opacity;
}

function onScreen(point: Pt, pad = 12): boolean {
  return point.x >= pad && point.x <= 1280 - pad && point.y >= pad && point.y <= 720 - pad;
}

function near(a: Pt, b: Pt, limit: number): boolean {
  return dist(a, b) <= limit;
}

function main(): void {
  assertOrder();
  const source = program();
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "packet-journey.ms");
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
  const frame = (seconds: number) => runtime.evaluate(ms(seconds));
  const body = (items: readonly ResolvedDrawItem[], id: string) => centerOf(items, `${id}.body`, 46, 24);
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const opening = frame(0.6);
  expect(opacityOf(opening.drawItems, "bar.words") > 0.8, "Opening message is missing.");
  expect(onScreen(centerOf(opening.drawItems, "bar.words", 0, 0)), "Opening message is off screen.");
  const formed = frame(2.4);
  for (const id of ["pkt1", "pkt2", "pkt3", "pkt4", "pkt5"]) {
    expect(opacityOf(formed.drawItems, `${id}.body`) > 0.7, `${id} did not form.`);
  }
  const wide = frame(5);
  expect(onScreen(centerOf(wide.drawItems, "sender.name", 0, 0)), "Sender leaves the wide shot.");
  expect(onScreen(centerOf(wide.drawItems, "receiver.name", 0, 0)), "Receiver leaves the wide shot.");
  const lost = frame(9.45);
  expect(opacityOf(lost.drawItems, "pkt3.body") < 0.05, "Packet 3 is still visible after the loss.");
  expect(opacityOf(lost.drawItems, "lost.words") > 0.7, "Packet lost label is missing.");
  expect(onScreen(centerOf(lost.drawItems, "lost.words", 0, 0)), "Packet lost label is off screen.");
  const fourth = frame(11.55);
  expect(near(body(fourth.drawItems, "pkt4"), centerOf(fourth.drawItems, "slot4.plate", 50, 32), 36), "Packet 4 missed slot 4.");
  expect(opacityOf(fourth.drawItems, "slot3.plate") < 0.08, "Slot 3 filled early.");
  expect(opacityOf(fourth.drawItems, "slot5.plate") < 0.08, "Slot 5 filled early.");
  expect(opacityOf(fourth.drawItems, "hist4") > 0.7, "Arrival history missed 4.");
  const second = frame(13.05);
  expect(near(body(second.drawItems, "pkt2"), centerOf(second.drawItems, "slot2.plate", 50, 32), 36), "Packet 2 missed slot 2.");
  const first = frame(15.05);
  expect(near(body(first.drawItems, "pkt1"), centerOf(first.drawItems, "slot1.plate", 50, 32), 36), "Packet 1 missed slot 1.");
  expect(opacityOf(first.drawItems, "hist421") > 0.7, "Arrival history missed 4 → 2 → 1.");
  expect(opacityOf(first.drawItems, "wait") > 0.7, "Waiting label is missing.");
  const fifth = frame(18.55);
  expect(near(body(fifth.drawItems, "pkt5"), centerOf(fifth.drawItems, "slot5.plate", 50, 32), 36), "Packet 5 missed slot 5.");
  expect(opacityOf(fifth.drawItems, "slot3.plate") < 0.08, "Slot 3 filled before retransmission.");
  const monitor = frame(18);
  expect(opacityOf(monitor.drawItems, "inset.plate") > 0.7, "Buffer inset is hidden while the network is wide.");
  const expired = frame(22.2);
  expect(opacityOf(expired.drawItems, "timeout") > 0.7, "Timeout label is missing.");
  expect(onScreen(centerOf(expired.drawItems, "timeout", 0, 0)), "Timeout label is off screen.");
  const launched = frame(24.2);
  expect(opacityOf(launched.drawItems, "retry.body") > 0.8, "Retransmission did not launch.");
  expect(opacityOf(launched.drawItems, "retry.amber") > 0.7, "Retransmitted packet lost its amber outline.");
  const complete = frame(28.2);
  expect(near(body(complete.drawItems, "retry"), centerOf(complete.drawItems, "slot3.plate", 50, 32), 42), "Retransmitted packet missed slot 3.");
  const received = frame(29);
  expect(opacityOf(received.drawItems, "got") > 0.7, "All packets received is missing.");
  for (const id of ["slot1", "slot2", "slot3", "slot4", "slot5"]) {
    expect(opacityOf(received.drawItems, `${id}.plate`) > 0.8, `${id} is empty when the buffer should be full.`);
  }
  const rebuilt = frame(32.35);
  expect(opacityOf(rebuilt.drawItems, "banner.words") > 0.8, "Rebuilt message is missing.");
  const cleared = frame(32.65);
  expect(opacityOf(cleared.drawItems, "pkt1.body") < 0.08, "Packet borders remain after assembly.");
  const held = frame(34.8);
  expect(opacityOf(held.drawItems, "banner.words") > 0.9, "The message does not hold.");
  expect(opacityOf(held.drawItems, "done") > 0.8, "Message complete is missing.");
  expect(onScreen(centerOf(held.drawItems, "banner.words", 0, 0)), "Final message is off screen.");
  expect(onScreen(centerOf(held.drawItems, "receiver.name", 0, 0)), "Final receiver is off screen.");
  expect(onScreen(centerOf(held.drawItems, "fault.xa", FAIL.x, FAIL.y)), "Final failed link is off screen.");
  const middle = { x: (MS1.x + MS2.x) / 2, y: (MS1.y + MS2.y) / 2 };
  expect(onScreen(centerOf(held.drawItems, "topology.wires.ms1", middle.x, middle.y)), "Final middle route is off screen.");
  for (const id of ["slot1", "slot2", "slot3", "slot4", "slot5"]) {
    expect(onScreen(centerOf(held.drawItems, `${id}.num`, 0, 0)), `${id} leaves the final frame.`);
    expect(opacityOf(held.drawItems, `${id}.plate`) > 0.8, `${id} is not filled in the final frame.`);
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const previewDir = resolve("/tmp/packet-journey-preview");
  mkdirSync(previewDir, { recursive: true });
  for (const time of [0.6, 2.2, 4.8, 7.4, 9.15, 11.6, 13.1, 15.1, 18.6, 21.4, 22.3, 24.9, 28.3, 30.4, 32.3, 34.8]) {
    const shot = frame(time);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${BG}"/>${shot.drawItems.map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(previewDir, `f${time.toFixed(1)}.svg`), svg);
  }
  console.log(`preview ${previewDir}`);
}

main();
