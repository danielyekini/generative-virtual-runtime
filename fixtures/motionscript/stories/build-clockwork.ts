/**
 * Builds fixtures/motionscript/stories/clockwork.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-clockwork.ts
 *
 * Thirty seconds, the scene budget. A brass train is revealed exploded, assembled, then run.
 * Adjacent wheels turn in opposite directions. Angular rate follows tooth count.
 * The second hand is locked to the fourth wheel. Minute and hour hands move at
 * 1/60 and 1/720 of that rate. Positive rotation is clockwise on screen.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const DURATION = 30_000;
const CX = 760;
const CY = 390;
const MODULE = 4.2;
const SPIN = 0.7;
const SECOND_PERIOD = 5;

const PAPER = "#f3eadc";
const INK = "#241e18";
const MUTED = "#6e6256";
const GUIDE = "#c9b59a";
const BRASS = "#c4a15b";
const BRASS_DARK = "#7c5a28";
const BRASS_DEEP = "#5c4218";
const BRASS_LITE = "#e4d0a0";
const STEEL = "#1e2833";
const STEEL_LITE = "#5c6a7a";
const ACCENT = "#a61e2a";
const JEWEL = "#9d2740";
const DIAL = "#f7f3ea";

type Pt = { x: number; y: number };
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { t: number; v: number; ease?: Ease };

const TEETH = { barrel: 18, centre: 14, third: 12, fourth: 10, escape: 9 } as const;
type GearId = keyof typeof TEETH;
const GEARS: GearId[] = ["barrel", "centre", "third", "fourth", "escape"];
const MESH: [GearId, GearId][] = [
  ["barrel", "centre"],
  ["centre", "third"],
  ["third", "fourth"],
  ["fourth", "escape"],
];

const rp = (teeth: number) => (teeth * MODULE) / 2;
const tipR = (teeth: number) => rp(teeth) + MODULE;
const rootR = (teeth: number) => rp(teeth) - MODULE * 1.25;

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

function n(value: number, digits = 2): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function polar(radius: number, angle: number): Pt {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}

function hypot(a: Pt, b: Pt = { x: 0, y: 0 }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wrap(angle: number): number {
  const turn = Math.PI * 2;
  return ((angle % turn) + turn) % turn;
}

function angDiff(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function spinDisplacement(localT: number): number {
  return localT - SPIN + (SPIN * SPIN) / (localT + SPIN);
}

function spinExpr(phase: number, omega: number): string {
  const a = SPIN.toFixed(2);
  const a2 = (SPIN * SPIN).toFixed(4);
  return `${n(phase, 5)} + ${n(omega, 5)} * (local_t - ${a} + ${a2} / (local_t + ${a}))`;
}

type Layout = Record<GearId, Pt> & { balance: Pt };

function meshDistance(a: GearId, b: GearId): number {
  return rp(TEETH[a]) + rp(TEETH[b]);
}

function overlaps(layout: Layout, a: GearId, b: GearId, gap: number): boolean {
  return hypot(layout[a], layout[b]) < tipR(TEETH[a]) + tipR(TEETH[b]) + gap;
}

function distToSegment(point: Pt, from: Pt, to: Pt): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return hypot(point, from);
  const u = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length));
  return hypot(point, { x: from.x + dx * u, y: from.y + dy * u });
}

function placeTrain(): Layout {
  let best: { score: number; layout: Layout } | undefined;
  const fourth: Pt = { x: 6, y: 64 };
  for (let escapeDeg = 8; escapeDeg <= 70; escapeDeg += 4) {
    const escape = add(fourth, polar(meshDistance("fourth", "escape"), rad(escapeDeg)));
    for (let thirdDeg = -168; thirdDeg <= -78; thirdDeg += 4) {
      const third = add(fourth, polar(meshDistance("third", "fourth"), rad(thirdDeg)));
      for (let centreDeg = -188; centreDeg <= -96; centreDeg += 4) {
        const centre = add(third, polar(meshDistance("centre", "third"), rad(centreDeg)));
        for (let barrelDeg = 150; barrelDeg <= 214; barrelDeg += 4) {
          const barrel = add(centre, polar(meshDistance("barrel", "centre"), rad(barrelDeg)));
          const gears = { barrel, centre, third, fourth, escape };
          let blocked = false;
          for (const id of GEARS) {
            if (hypot(gears[id]) + tipR(TEETH[id]) > 168) blocked = true;
            if (hypot(gears[id]) < tipR(TEETH[id]) + 18) blocked = true;
            if (distToSegment(gears[id], { x: 0, y: 12 }, { x: 18, y: -132 }) < tipR(TEETH[id]) + 8) blocked = true;
          }
          if (blocked) continue;
          for (let i = 0; i < GEARS.length; i += 1) {
            for (let j = i + 1; j < GEARS.length; j += 1) {
              const left = GEARS[i]!;
              const right = GEARS[j]!;
              const meshed = MESH.some(([a, b]) => (a === left && b === right) || (a === right && b === left));
              if (!meshed && overlaps({ ...gears, balance: { x: 0, y: 0 } }, left, right, 8)) blocked = true;
            }
          }
          if (blocked) continue;
          const maxR = Math.max(...GEARS.map((id) => hypot(gears[id]) + tipR(TEETH[id])));
          let score = maxR;
          score += Math.max(0, gears.barrel.x + 36) * 2.4;
          score += Math.abs(gears.barrel.y + 6) * 0.35;
          score += Math.max(0, gears.centre.x) * 0.4;
          score += Math.abs(gears.escape.x - 40) * 0.08;
          if (!best || score < best.score) best = { score, layout: { ...gears, balance: { x: 0, y: 0 } } };
        }
      }
    }
  }
  if (!best) throw new Error("No clock-train layout cleared the hands and the plate.");
  const layout = best.layout;
  let balanceBest: { score: number; at: Pt } | undefined;
  for (let gap = 24; gap <= 42; gap += 3) {
    for (let angle = -120; angle <= 200; angle += 3) {
      const at = add(layout.escape, polar(tipR(TEETH.escape) + gap, rad(angle)));
      if (hypot(at) + 24 > 176) continue;
      let blocked = false;
      for (const id of GEARS) {
        if (hypot(at, layout[id]) < tipR(TEETH[id]) + 24 + 5) blocked = true;
      }
      if (blocked || hypot(at) < 36) continue;
      const score = Math.abs(angle - 24) * 0.4 + gap * 0.15 + Math.max(0, -at.y) * 0.15;
      if (!balanceBest || score < balanceBest.score) balanceBest = { score, at };
    }
  }
  if (!balanceBest) throw new Error("No seat for the balance.");
  layout.balance = balanceBest.at;
  for (const [a, b] of MESH) {
    const error = Math.abs(hypot(layout[a], layout[b]) - meshDistance(a, b));
    if (error > 0.02) throw new Error(`${a}/${b} center distance off by ${error}`);
  }
  return layout;
}

type Phase = Record<GearId, number>;
type Rate = Record<GearId, number>;

function solveDrive(layout: Layout): { phase: Phase; omega: Rate } {
  const omegaF = (Math.PI * 2) / SECOND_PERIOD;
  const omega = {
    fourth: omegaF,
    third: -omegaF * (TEETH.fourth / TEETH.third),
    centre: 0,
    barrel: 0,
    escape: -omegaF * (TEETH.fourth / TEETH.escape),
  };
  omega.centre = -omega.third * (TEETH.third / TEETH.centre);
  omega.barrel = -omega.centre * (TEETH.centre / TEETH.barrel);
  const phase = { barrel: 0, centre: 0, third: 0, fourth: 0, escape: 0 };
  phase.barrel = Math.atan2(layout.centre.y - layout.barrel.y, layout.centre.x - layout.barrel.x);
  const order: [GearId, GearId][] = MESH;
  for (const [driver, driven] of order) {
    const phi = Math.atan2(layout[driven].y - layout[driver].y, layout[driven].x - layout[driver].x);
    const pitchA = (Math.PI * 2) / TEETH[driver];
    const pitchB = (Math.PI * 2) / TEETH[driven];
    const tooth = (wrap(phi - phase[driver]) % pitchA) / pitchA;
    // External mesh: the tooth fractions sum to half a pitch, so the wheels can turn opposite ways.
    const target = (0.5 - tooth + 1) % 1;
    phase[driven] = wrap(phi + Math.PI) - target * pitchB;
  }
  for (const time of [0, 0.4, 1.2, 3, 8, 16]) {
    const travel = spinDisplacement(time);
    for (const [driver, driven] of MESH) {
      const phi = Math.atan2(layout[driven].y - layout[driver].y, layout[driven].x - layout[driver].x);
      const rotA = phase[driver] + omega[driver] * travel;
      const rotB = phase[driven] + omega[driven] * travel;
      const pitchA = (Math.PI * 2) / TEETH[driver];
      const pitchB = (Math.PI * 2) / TEETH[driven];
      const u = (wrap(phi - rotA) / pitchA) % 1;
      const v = (wrap(phi + Math.PI - rotB) / pitchB) % 1;
      const sum = (u + v) % 1;
      const error = Math.abs(sum - 0.5);
      if (Math.min(error, 1 - error) > 0.02) {
        throw new Error(`${driver}/${driven} mesh drifted to ${error.toFixed(3)} at t=${time}`);
      }
    }
  }
  return { phase, omega };
}

function plateRadius(layout: Layout): number {
  const gearReach = Math.max(...GEARS.map((id) => hypot(layout[id]) + tipR(TEETH[id])));
  const balanceReach = hypot(layout.balance) + 28;
  return Math.max(150, gearReach, balanceReach) + 18;
}

function pillarSeats(layout: Layout, radius: number): Pt[] {
  const seats: Pt[] = [];
  const scored: { at: Pt; clearance: number }[] = [];
  for (let step = 0; step < 120; step += 1) {
    const at = polar(radius, rad(step * 3));
    let clearance = Infinity;
    for (const id of GEARS) clearance = Math.min(clearance, hypot(at, layout[id]) - tipR(TEETH[id]));
    clearance = Math.min(clearance, hypot(at, layout.balance) - 28);
    scored.push({ at, clearance });
  }
  const picked: number[] = [];
  while (seats.length < 4) {
    let choice = -1;
    let best = -Infinity;
    for (let index = 0; index < scored.length; index += 1) {
      if (picked.some((other) => Math.abs(index - other) < 12 || Math.abs(index - other) > 108)) continue;
      const clearance = scored[index]!.clearance;
      if (clearance > best) {
        best = clearance;
        choice = index;
      }
    }
    if (choice < 0 || best < 8) break;
    picked.push(choice);
    seats.push(scored[choice]!.at);
  }
  if (seats.length < 4) throw new Error("Pillars could not clear the train.");
  return seats;
}

function gearCommands(teeth: number): string {
  const pitch = rp(teeth);
  const tip = tipR(teeth);
  const root = Math.max(MODULE * 1.6, rootR(teeth));
  const step = (Math.PI * 2) / teeth;
  const commands: string[] = [];
  const pointAt = (radius: number, angle: number) => polar(radius, angle);
  let first = true;
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const center = tooth * step;
    const samples = [
      pointAt(root, center - step * 0.3),
      pointAt(tip, center - step * 0.13),
      pointAt(tip, center + step * 0.13),
      pointAt(root, center + step * 0.3),
    ];
    for (const point of samples) {
      commands.push(`${first ? "move" : "line"} (${n(point.x)}, ${n(point.y)});`);
      first = false;
    }
  }
  commands.push("close;");
  const inner = Math.min(root - 2.4, pitch * 0.56);
  const hub = Math.max(5.5, pitch * 0.2);
  if (inner > hub + 4.5) {
    commands.push(circleCommands(0, 0, inner));
    return commands.join("\n    ");
  }
  commands.push(circleCommands(0, 0, Math.max(4.2, pitch * 0.16)));
  return commands.join("\n    ");
}

function circleCommands(cx: number, cy: number, radius: number): string {
  const k = radius * 0.5522847498;
  const move = `move (${n(cx + radius)}, ${n(cy)});`;
  const cubics = [
    [cx + radius, cy + k, cx + k, cy + radius, cx, cy + radius],
    [cx - k, cy + radius, cx - radius, cy + k, cx - radius, cy],
    [cx - radius, cy - k, cx - k, cy - radius, cx, cy - radius],
    [cx + k, cy - radius, cx + radius, cy - k, cx + radius, cy],
  ];
  const body = cubics
    .map((curve) => `cubic (${n(curve[0]!)}, ${n(curve[1]!)}) (${n(curve[2]!)}, ${n(curve[3]!)}) (${n(curve[4]!)}, ${n(curve[5]!)});`)
    .join("\n    ");
  return `${move}\n    ${body}\n    close;`;
}

function spiralCommands(inner: number, outer: number, turns: number): string {
  const steps = Math.round(turns * 18);
  const lines: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const u = step / steps;
    const radius = inner + (outer - inner) * u;
    const angle = u * turns * Math.PI * 2;
    const point = polar(radius, angle);
    lines.push(`${step === 0 ? "move" : "line"} (${n(point.x)}, ${n(point.y)});`);
  }
  return lines.join("\n      ");
}

function annulus(outer: number, inner: number): string {
  return `${circleCommands(0, 0, outer)}\n    ${circleCommands(0, 0, inner)}`;
}

function world(point: Pt): Pt {
  return { x: CX + point.x, y: CY + point.y };
}

const HOUR_PHASE = -2.05;
const MINUTE_PHASE = 1.05;

let LABEL = { x: -8, y: 170 };

let OFF = {
  back: { x: 0, y: 240 },
  train: { x: 0, y: 0 },
  front: { x: 0, y: -240 },
  hour: { x: 260, y: -20 },
  minute: { x: 260, y: 70 },
  second: 36,
};

function layoutExplode(layout: Layout, radius: number): void {
  const parts = [
    ...GEARS.map((id) => ({ at: layout[id], r: tipR(TEETH[id]) + 8 })),
    { at: layout.balance, r: 36 },
  ];
  const clears = (plate: Pt) => parts.every((part) => hypot(plate, part.at) >= radius + part.r + 8);
  const onSheet = (plate: Pt) => {
    const top = CY + plate.y - radius;
    const bottom = CY + plate.y + radius;
    const left = CX + plate.x - radius;
    const right = CX + plate.x + radius;
    if (top < 24 || bottom > 880 || left < 32 || right > 1248) return false;
    return !(right > 50 && left < 348 && bottom > 44 && top < 276);
  };
  let front: Pt | undefined;
  for (let y = -70; y >= -280 && !front; y -= 6) {
    for (let x = 100; x <= 340; x += 6) {
      const plate = { x, y };
      if (onSheet(plate) && clears(plate)) {
        front = plate;
        break;
      }
    }
  }
  let back: Pt | undefined;
  for (let y = 70; y <= 340 && !back; y += 6) {
    for (let x = -100; x >= -380; x -= 6) {
      const plate = { x, y };
      if (onSheet(plate) && clears(plate)) {
        back = plate;
        break;
      }
    }
  }
  if (!front || !back) throw new Error("No exploded plate seats.");
  const handClears = (at: Pt) =>
    hypot(at, front) > radius + 36 &&
    hypot(at, back) > radius + 36 &&
    parts.every((part) => hypot(at, part.at) > part.r + 28);
  let hour: Pt | undefined;
  let minute: Pt | undefined;
  for (let y = -120; y >= -260 && !hour; y -= 8) {
    for (let x = -80; x <= 120 && !hour; x += 8) {
      if (handClears({ x, y })) hour = { x, y };
    }
  }
  if (hour) {
    for (const candidate of [
      { x: hour.x + 84, y: hour.y + 18 },
      { x: hour.x - 84, y: hour.y + 18 },
      { x: hour.x, y: hour.y + 90 },
    ]) {
      if (!minute && handClears(candidate)) minute = candidate;
    }
  }
  if (!hour || !minute) throw new Error("No exploded hand seats.");
  const gearBottom = Math.max(...GEARS.map((id) => layout[id].y + tipR(TEETH[id])), layout.balance.y + 34);
  LABEL = { x: -16, y: gearBottom + 20 };
  OFF = { back, train: { x: 0, y: 0 }, front, hour, minute, second: 36 };
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

function track(target: string, samples: Key[]): string {
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    const sample = ordered[index]!;
    const pct = percent(Math.max(0, Math.min(DURATION, sample.t)), previous);
    previous = pct.value;
    const ease = sample.ease && index < ordered.length - 1 ? ` ease ${sample.ease}` : "";
    lines.push(`  ${pct.text} ${n(sample.v, 3)}${ease};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function fade(target: string, showAt: number, hideAt?: number): string {
  const keys: Key[] = [
    { t: 0, v: 0, ease: "hold" },
    { t: ms(showAt), v: 0, ease: "easeOut" },
    { t: ms(showAt + 0.7), v: 1, ease: "hold" },
  ];
  if (hideAt !== undefined) {
    keys.push({ t: ms(hideAt), v: 1, ease: "easeIn" }, { t: ms(hideAt + 0.8), v: 0, ease: "hold" }, { t: DURATION, v: 0 });
  } else {
    keys.push({ t: DURATION, v: 1 });
  }
  return track(target, keys);
}

function settle(target: string, home: number, offset: number, from: number, to: number): string {
  const spread = home + offset * 1.32;
  const exploded = home + offset;
  return track(target, [
    { t: 0, v: spread, ease: "hold" },
    { t: ms(0.7), v: spread, ease: "easeOut" },
    { t: ms(4.6), v: exploded, ease: "hold" },
    { t: ms(from), v: exploded, ease: "easeInOut" },
    { t: ms(to), v: home, ease: "hold" },
    { t: DURATION, v: home },
  ]);
}

function partMotion(id: string, home: Pt, offset: Pt, from: number, to: number): string {
  return [settle(`${id}.position.x`, home.x, offset.x, from, to), settle(`${id}.position.y`, home.y, offset.y, from, to), fade(`${id}.opacity`, 0.9)].join("\n");
}

function rotationTrack(id: string, phase: number, omega: number): string {
  return `animate ${id}.rotation {\n  expression "${spinExpr(phase, omega)}";\n  start 14.5s;\n  duration 15.5s;\n  fill forwards;\n};`;
}

function directionWord(omega: number): string {
  return omega >= 0 ? "CW" : "CCW";
}

function gearSource(id: GearId, phase: number, layout: Layout): string {
  const teeth = TEETH[id];
  const pitch = rp(teeth);
  const root = Math.max(MODULE * 1.6, rootR(teeth));
  const inner = Math.min(root - 2.4, pitch * 0.56);
  const hub = Math.max(5.5, pitch * 0.2);
  const spoked = inner > hub + 4.5;
  const markR = spoked ? (inner + root) / 2 : pitch * 0.45;
  const spokeCount = id === "barrel" ? 5 : 4;
  const spokes = spoked
    ? Array.from({ length: spokeCount }, (_, index) => {
        const angle = (index / spokeCount) * Math.PI * 2 + 0.2;
        const from = polar(hub + 1, angle);
        const to = polar(inner - 1.2, angle);
        return `    line spoke${index} { from (${n(from.x)}, ${n(from.y)}); to (${n(to.x)}, ${n(to.y)}); stroke ${BRASS_DEEP} width ${n(Math.max(1.6, pitch * 0.045))} cap round; };`;
      }).join("\n")
    : "";
  const spring =
    id === "barrel" && spoked
      ? `    path spring {\n      ${spiralCommands(hub + 1.5, inner - 2, 2.4)}\n      stroke ${STEEL} width 1.35 cap round;\n    };`
      : "";
  const arborLength = 86;
  return `group ${id} {
  position (${n(world(layout[id]).x)}, ${n(world(layout[id]).y)});
  rotation ${n(deg(phase), 3)}deg;
  opacity 0;
  zIndex ${4 + GEARS.indexOf(id)};
  path wheel {
    fill ${BRASS};
    stroke ${BRASS_DEEP} width 1.35;
    fillRule evenodd;
    ${gearCommands(teeth)}
  };
${spokes}
${spring}
  circle hub { radius ${n(hub)}; fill ${BRASS_LITE}; stroke ${BRASS_DEEP} width 1; };
  circle bore { radius ${n(Math.max(3.2, hub * 0.42))}; fill ${INK}; };
  circle mark { position (${n(markR)}, 0); radius 2.15; fill ${INK}; };
  circle callout {
    radius ${n(tipR(teeth) + 8)};
    stroke ${ACCENT} width 1.6;
    opacity 0;
  };
  group arbor {
    rotation ${n(deg(-phase), 3)}deg;
    group shaft {
      line metal { from (0, 0); to (0, ${n(arborLength)}); stroke ${STEEL} width 2.6 cap round; };
    };
    circle pin { radius ${n(Math.max(3.4, hub * 0.34))}; fill ${STEEL_LITE}; stroke ${STEEL} width 1; };
  };
};`;
}

function arrowSource(id: GearId, layout: Layout, omega: number): string {
  const teeth = TEETH[id];
  const radius = tipR(teeth) + 18;
  const away = Math.atan2(-layout[id].y, -layout[id].x);
  const sweep = omega >= 0 ? 0.72 : -0.72;
  const start = away - sweep / 2;
  const end = away + sweep / 2;
  const lines: string[] = [];
  for (let step = 0; step <= 7; step += 1) {
    const angle = start + (end - start) * (step / 7);
    const point = polar(radius, angle);
    lines.push(`${step === 0 ? "move" : "line"} (${n(point.x)}, ${n(point.y)});`);
  }
  const tangentSign = Math.sign(sweep) || 1;
  const tx = tangentSign * -Math.sin(end);
  const ty = tangentSign * Math.cos(end);
  const head = Math.atan2(ty, tx);
  return `group arrow${id} {
  position (${n(world(layout[id]).x)}, ${n(world(layout[id]).y)});
  opacity 0;
  zIndex 13;
  path arc {
    ${lines.join("\n    ")}
    stroke ${ACCENT} width 1.5 cap round;
  };
  group head {
    position (${n(radius * Math.cos(end))}, ${n(radius * Math.sin(end))});
    rotation ${n(deg(head), 3)}deg;
    polygon vane { points ((0, 0), (-9, -3.6), (-9, 3.6)); fill ${ACCENT}; };
  };
};`;
}

function ticks(radius: number, count: number, majorEvery: number, innerMajor: number, innerMinor: number): string {
  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const major = index % majorEvery === 0;
    const inner = polar(major ? innerMajor : innerMinor, angle);
    const outer = polar(radius, angle);
    lines.push(
      `    line tick${index} { from (${n(inner.x)}, ${n(inner.y)}); to (${n(outer.x)}, ${n(outer.y)}); stroke ${major ? INK : MUTED} width ${major ? 2.2 : 1}; };`,
    );
  }
  return lines.join("\n");
}

function program(layout: Layout, drive: { phase: Phase; omega: Rate }, pillars: Pt[], radius: number): string {
  const dialR = radius + 16;
  const bezelOuter = dialR + 15;
  const minuteLen = dialR * 0.58;
  const hourLen = dialR * 0.38;
  const subR = tipR(TEETH.fourth) + 14;
  const secondLen = subR - 6;
  const secondLift = polar(OFF.second, drive.phase.fourth - Math.PI / 2);
  const legend = [
    ["barrel", "1  BARREL"],
    ["centre", "2  CENTRE"],
    ["third", "3  THIRD"],
    ["fourth", "4  FOURTH"],
    ["hand", "5  SECOND HAND"],
  ] as const;
  const jewel = (id: string, at: Pt) => `    circle jewel${id} {
      position (${n(at.x)}, ${n(at.y)});
      radius 5.4;
      fill ${JEWEL};
      stroke ${BRASS_DEEP} width 1.4;
    };
    circle jewel${id}Hi { position (${n(at.x - 1.1)}, ${n(at.y - 1.2)}); radius 1.5; fill #f4d5da; };`;
  const motion = [
    partMotion("plateBack", world({ x: 0, y: 0 }), OFF.back, 6.6, 8.8),
    ...GEARS.map((id, index) => partMotion(id, world(layout[id]), OFF.train, 6.8 + index * 0.4, 9.2 + index * 0.4)),
    partMotion("balance", world(layout.balance), OFF.train, 8.8, 11.2),
    ...pillars.map((seat, index) => partMotion(`pillar${index}`, world(seat), OFF.back, 9.0, 11.4)),
    partMotion("plateFront", world({ x: 0, y: 0 }), OFF.front, 9.8, 12.2),
    partMotion("hourHand", world({ x: 0, y: 0 }), OFF.hour, 10.6, 12.8),
    partMotion("minuteHand", world({ x: 0, y: 0 }), OFF.minute, 11.1, 13.4),
    settle("secondHand.position.x", 0, secondLift.x, 8.2, 10.6),
    settle("secondHand.position.y", 0, secondLift.y, 8.2, 10.6),
    fade("secondHand.opacity", 0.9),
    ...GEARS.map((id) => rotationTrack(id, drive.phase[id], drive.omega[id])),
    ...GEARS.map((id) => rotationTrack(`${id}.arbor`, -drive.phase[id], -drive.omega[id])),
    ...GEARS.map((id) =>
      track(`${id}.arbor.shaft.scale.y`, [
        { t: 0, v: 1, ease: "hold" },
        { t: ms(6.8 + GEARS.indexOf(id) * 0.4), v: 1, ease: "easeInOut" },
        { t: ms(9.2 + GEARS.indexOf(id) * 0.4), v: 0.16, ease: "hold" },
        { t: DURATION, v: 0.16 },
      ]),
    ),
    ...pillars.flatMap((_, index) =>
      ["x", "y"].map((axis) =>
        track(`pillar${index}.shaft.scale.${axis}`, [
            { t: 0, v: 1, ease: "hold" },
            { t: ms(9.0), v: 1, ease: "easeInOut" },
            { t: ms(11.4), v: 0.04, ease: "hold" },
            { t: DURATION, v: 0.04 },
          ]),
      ),
    ),
    `animate balance.rotation {\n  expression "0.38 * sin(local_t * 10.0531)";\n  start 14.5s;\n  duration 15.5s;\n  fill forwards;\n};`,
    `animate hourHand.rotation {\n  expression "${spinExpr(HOUR_PHASE, drive.omega.fourth / 720)}";\n  start 14.5s;\n  duration 15.5s;\n  fill forwards;\n};`,
    `animate minuteHand.rotation {\n  expression "${spinExpr(MINUTE_PHASE, drive.omega.fourth / 60)}";\n  start 14.5s;\n  duration 15.5s;\n  fill forwards;\n};`,
    ...legend.map((entry, index) => {
      const start = 14.6 + index * 1;
      return fade(entry[0] === "hand" ? "secondHand.accent.opacity" : `${entry[0]}.callout.opacity`, start, 20.2);
    }),
    ...GEARS.map((id, index) => fade(`arrow${id}.opacity`, 14.6 + index * 1, 20.2)),
    fade("power.opacity", 14.5, 20.4),
    track("power.trim.end", [
      { t: 0, v: 0, ease: "hold" },
      { t: ms(14.6), v: 0, ease: "easeInOut" },
      { t: ms(19.2), v: 1, ease: "hold" },
      { t: DURATION, v: 1 },
    ]),
    fade("dial.opacity", 20.4),
    fade("bezel.opacity", 20.7),
    fade("nut.opacity", 21.2),
    fade("captions.exploded.opacity", 0.6, 6.2),
    fade("captions.assembly.opacity", 6.4, 13.8),
    fade("captions.route.opacity", 14.2, 19.4),
    fade("captions.legend.opacity", 14.4, 19.2),
    ...(["guideH", "guideV", "guideRing"] as const).map((id) =>
      track(`${id}.opacity`, [
        { t: 0, v: 1, ease: "hold" },
        { t: ms(20.2), v: 1, ease: "easeIn" },
        { t: ms(20.9), v: 0, ease: "hold" },
        { t: DURATION, v: 0 },
      ]),
    ),
    track("captions.legend.marker.position.y", [
      { t: 0, v: 470, ease: "hold" },
      { t: ms(14.6), v: 470, ease: "hold" },
      { t: ms(15.5), v: 470, ease: "easeInOut" },
      { t: ms(15.8), v: 498, ease: "hold" },
      { t: ms(16.5), v: 498, ease: "easeInOut" },
      { t: ms(16.8), v: 526, ease: "hold" },
      { t: ms(17.5), v: 526, ease: "easeInOut" },
      { t: ms(17.8), v: 554, ease: "hold" },
      { t: ms(18.5), v: 554, ease: "easeInOut" },
      { t: ms(18.8), v: 582, ease: "hold" },
      { t: DURATION, v: 582 },
    ]),
    ...cameraTracks(layout, radius, dialR),
  ];
  const powerPoints = ["barrel", "centre", "third", "fourth"] as const;
  const labelIds = [...GEARS, "balance"] as const;
  const labels = labelIds
    .map((id, index) => {
      const point = world({ x: LABEL.x, y: LABEL.y + index * 24 });
      return `text label${id} {
  position (${n(point.x)}, ${n(point.y)});
  content "${id === "balance" ? "BALANCE" : id.toUpperCase()}";
  fontFamily "sans";
  fontSize 15;
  fontWeight 650;
  align left;
  baseline middle;
  fill ${INK};
  opacity 0;
  zIndex 14;
};`;
    })
    .join("\n");
  const labelMotion = labelIds.map((id) => fade(`label${id}.opacity`, 1.1, 6.4));
  return `// CLOCKWORK
// 30 seconds. Precise ink on a warm sheet, with brass wheels and steel arbors.
// 0:00 reveal the exploded train. 0:07 assemble gears, axles and hands.
// 0:14 mesh. Adjacent wheels reverse. Rate follows tooth count.
// The red path runs from the barrel to the fourth wheel and its second hand.
// 0:20 the dial closes. 0:21 the view pulls back to the running clock.
scene "clockwork" {
  version "0.2";
  viewport (1280, 720);
  background ${PAPER};
  duration 30s;
  requires "easing.hold";
  requires "geometry.operators";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "transform.parent";
  requires "text.basic";
};
camera main {
  position (640, 390);
  zoom 1;
  rotation 0deg;
};
rectangle sheetOuter {
  position (28, 22);
  size (1224, 676);
  stroke ${INK} width 1.4;
  zIndex 0;
};
rectangle sheetInner {
  position (40, 34);
  size (1200, 652);
  stroke ${MUTED} width 0.7;
  zIndex 0;
};
rectangle titleBlock {
  position (58, 52);
  size (268, 210);
  stroke ${INK} width 1;
  zIndex 1;
};
line titleRule {
  from (58, 112);
  to (326, 112);
  stroke ${INK} width 0.8;
  zIndex 1;
};
text titleFig { position (70, 78); content "FIG. 1"; fontFamily "sans"; fontSize 20; fontWeight 700; fill ${INK}; zIndex 1; };
text titleName { position (70, 100); content "EIGHT-DAY TRAIN"; fontFamily "sans"; fontSize 13; fontWeight 500; fill ${INK}; zIndex 1; };
text titleMat { position (70, 132); content "BRASS AND STEEL"; fontFamily "sans"; fontSize 12; fontWeight 500; fill ${MUTED}; zIndex 1; };
${GEARS.map(
  (id, index) =>
    `text title${id} { position (70, ${154 + index * 16}); content "${id.toUpperCase()}   ${TEETH[id]}   ${directionWord(drive.omega[id])}"; fontFamily "sans"; fontSize 12; fontWeight 500; fill ${INK}; zIndex 1; };`,
).join("\n")}
text titleLaw { position (70, 242); content "RATE FOLLOWS TOOTH COUNT"; fontFamily "sans"; fontSize 11; fontWeight 500; fill ${MUTED}; zIndex 1; };
line guideH { from (${CX - radius - 30}, ${CY}); to (${CX + radius + 30}, ${CY}); stroke ${GUIDE} width 1; zIndex 1; };
line guideV { from (${CX}, ${CY - radius - 24}); to (${CX}, ${CY + radius + 24}); stroke ${GUIDE} width 1; zIndex 1; };
circle guideRing { position (${CX}, ${CY}); radius ${n(radius)}; stroke ${GUIDE} width 1; zIndex 1; };
group plateBack {
  position (${CX}, ${CY});
  opacity 0;
  zIndex 2;
  circle disc { radius ${n(radius)}; fill ${BRASS}; stroke ${BRASS_DEEP} width 1.6; };
  circle rim { radius ${n(radius - 7)}; stroke ${BRASS_DEEP} width 1; };
  line etchH { from (${n(-radius + 18)}, 0); to (${n(radius - 18)}, 0); stroke ${BRASS_DEEP} width 0.8; };
  line etchV { from (0, ${n(-radius + 18)}); to (0, ${n(radius - 18)}); stroke ${BRASS_DEEP} width 0.8; };
  circle post { radius 7; fill ${STEEL}; stroke ${BRASS_DEEP} width 1.2; };
};
${pillars
  .map(
    (seat, index) => `group pillar${index} {
  position (${n(world(seat).x)}, ${n(world(seat).y)});
  opacity 0;
  zIndex 3;
  group shaft {
    line rod { from (0, 0); to (${n(OFF.front.x - OFF.back.x)}, ${n(OFF.front.y - OFF.back.y)}); stroke ${BRASS_DARK} width 5.5 cap round; };
  };
  circle foot { radius 7; fill ${BRASS_DEEP}; };
};`,
  )
  .join("\n")}
${GEARS.map((id) => gearSource(id, drive.phase[id], layout)).join("\n")}
group balance {
  position (${n(world(layout.balance).x)}, ${n(world(layout.balance).y)});
  opacity 0;
  zIndex 9;
  path rim {
    fill ${BRASS};
    stroke ${BRASS_DEEP} width 1.3;
    fillRule evenodd;
    ${annulus(24, 16)}
  };
  line armA { from (-15, 0); to (15, 0); stroke ${BRASS_DEEP} width 2.2 cap round; };
  line armB { from (0, -15); to (0, 15); stroke ${BRASS_DEEP} width 2.2 cap round; };
  circle hub { radius 5.5; fill ${BRASS_LITE}; stroke ${BRASS_DEEP} width 1; };
  path spring {
    ${spiralCommands(3.2, 13, 3.1)}
    stroke ${STEEL} width 1.15 cap round;
  };
  circle screwA { position (0, -20); radius 2.3; fill ${STEEL}; };
  circle screwB { position (0, 20); radius 2.3; fill ${STEEL}; };
  circle screwC { position (-20, 0); radius 2.3; fill ${STEEL}; };
  circle screwD { position (20, 0); radius 2.3; fill ${STEEL}; };
};
${GEARS.map((id) => arrowSource(id, layout, drive.omega[id])).join("\n")}
path power {
  position (0, 0);
  stroke ${ACCENT} width 2.2 cap round join round;
  opacity 0;
  zIndex 13;
  ${powerPoints
    .map((id, index) => `${index === 0 ? "move" : "line"} (${n(world(layout[id]).x)}, ${n(world(layout[id]).y)});`)
    .join("\n  ")}
};
operators power { trim 0, 0, 0; };
group plateFront {
  position (${CX}, ${CY});
  opacity 0;
  zIndex 12;
  path rim {
    fill ${BRASS};
    stroke ${BRASS_DEEP} width 1.5;
    fillRule evenodd;
    ${annulus(radius, radius - 13)}
  };
  ${GEARS.map((id) => jewel(id, layout[id])).join("\n")}
  ${jewel("Balance", layout.balance)}
  ${jewel("Post", { x: 0, y: 0 })}
  ${pillars
    .map(
      (seat, index) =>
        `  circle screw${index} { position (${n(seat.x)}, ${n(seat.y)}); radius 3.1; fill ${STEEL}; };\n  line slot${index} { from (${n(seat.x - 2)}, ${n(seat.y)}); to (${n(seat.x + 2)}, ${n(seat.y)}); stroke ${BRASS_LITE} width 0.8; };`,
    )
    .join("\n")}
};
${labels}
group dial {
  position (${CX}, ${CY});
  opacity 0;
  zIndex 15;
  circle face { radius ${n(dialR)}; fill ${DIAL}; stroke ${INK} width 1.3; };
  circle track { radius ${n(dialR - 18)}; stroke ${GUIDE} width 1; };
${ticks(dialR - 8, 60, 5, dialR - 26, dialR - 16)}
  text brand { position (0, ${n(-dialR * 0.46)}); content "EIGHT-DAY"; fontFamily "sans"; fontSize 18; fontWeight 650; align center; baseline middle; fill ${INK}; };
  text serial { position (0, ${n(dialR * 0.34)}); content "NO. 4"; fontFamily "sans"; fontSize 13; fontWeight 500; align center; baseline middle; fill ${MUTED}; };
  text num12 { position (0, ${n(-dialR + 42)}); content "12"; fontFamily "sans"; fontSize 22; fontWeight 650; align center; baseline middle; fill ${INK}; };
  text num3 { position (${n(dialR - 42)}, 0); content "3"; fontFamily "sans"; fontSize 22; fontWeight 650; align center; baseline middle; fill ${INK}; };
  text num6 { position (0, ${n(dialR - 46)}); content "6"; fontFamily "sans"; fontSize 22; fontWeight 650; align center; baseline middle; fill ${INK}; };
  text num9 { position (${n(-dialR + 42)}, 0); content "9"; fontFamily "sans"; fontSize 22; fontWeight 650; align center; baseline middle; fill ${INK}; };
  group sub {
    position (${n(layout.fourth.x)}, ${n(layout.fourth.y)});
    circle well { radius ${n(subR)}; fill ${DIAL}; stroke ${INK} width 1.2; };
${ticks(subR - 2, 12, 3, subR - 8, subR - 5).replaceAll("tick", "sub")}
  };
};
group bezel {
  position (${CX}, ${CY});
  opacity 0;
  zIndex 16;
  path ring {
    fill ${BRASS};
    stroke ${BRASS_DEEP} width 1.6;
    fillRule evenodd;
    ${annulus(bezelOuter, dialR + 1)}
  };
  ellipse footL { position (-62, ${n(bezelOuter - 2)}); size (34, 14); fill ${BRASS_DARK}; };
  ellipse footR { position (62, ${n(bezelOuter - 2)}); size (34, 14); fill ${BRASS_DARK}; };
  rectangle crown {
    position (${n(bezelOuter - 2)}, -9);
    size (16, 18);
    fill ${BRASS_DARK};
    stroke ${BRASS_DEEP} width 1;
  };
};
group hourHand {
  position (${CX}, ${CY});
  rotation ${n(deg(HOUR_PHASE), 3)}deg;
  opacity 0;
  zIndex 17;
  polygon blade { points ((-5.2, 16), (-2.1, 0), (0, ${n(-hourLen)}), (2.1, 0), (5.2, 16)); fill ${STEEL}; };
};
group minuteHand {
  position (${CX}, ${CY});
  rotation ${n(deg(MINUTE_PHASE), 3)}deg;
  opacity 0;
  zIndex 18;
  polygon blade { points ((-3.3, 18), (-1.15, 0), (0, ${n(-minuteLen)}), (1.15, 0), (3.3, 18)); fill ${STEEL}; };
};
group secondHand {
  transformParent fourth;
  position (0, 0);
  rotation ${n(deg(-drive.phase.fourth), 3)}deg;
  opacity 0;
  zIndex 19;
  line blade { from (0, 11); to (0, ${n(-secondLen)}); stroke ${STEEL} width 1.7 cap round; };
  circle poise { position (0, 16); radius 4.2; stroke ${STEEL} width 1.3; };
  circle boss { radius 3.3; fill ${STEEL}; };
  line accent { from (0, 8); to (0, ${n(-secondLen)}); stroke ${ACCENT} width 3.2 cap round; opacity 0; };
};
circle nut {
  position (${CX}, ${CY});
  radius 4.6;
  fill ${BRASS_DARK};
  stroke ${BRASS_DEEP} width 1;
  opacity 0;
  zIndex 20;
};
group captions {
  space screen;
  zIndex 30;
  text exploded {
    position (860, 52);
    content "EXPLODED VIEW";
    fontFamily "sans";
    fontSize 22;
    fontWeight 650;
    fill ${INK};
    opacity 0;
  };
  text assembly {
    position (860, 52);
    content "ASSEMBLY";
    fontFamily "sans";
    fontSize 22;
    fontWeight 650;
    fill ${INK};
    opacity 0;
  };
  text route {
    position (48, 48);
    content "POWER PATH";
    fontFamily "sans";
    fontSize 22;
    fontWeight 650;
    fill ${ACCENT};
    opacity 0;
  };
  group legend {
    opacity 0;
    rectangle plate { position (40, 450); size (220, 156); fill ${PAPER}; stroke ${INK} width 1; opacity 0.94; };
    rectangle marker { position (52, 470); size (8, 8); fill ${ACCENT}; };
    ${legend
      .map(
        (entry, index) =>
          `text row${index} { position (70, ${478 + index * 28}); content "${entry[1]}"; fontFamily "sans"; fontSize 15; fontWeight 600; baseline middle; fill ${INK}; };`,
      )
      .join("\n    ")}
  };
};
${labelMotion.join("\n")}
${motion.join("\n")}
complete;
`;
}

function cameraTracks(layout: Layout, radius: number, dialR: number): string[] {
  const explodedPoints = [
    ...GEARS.map((id) => ({ ...world(add(layout[id], OFF.train)), r: tipR(TEETH[id]) + 36 })),
    { ...world(add(layout.balance, OFF.train)), r: 36 },
    { ...world(OFF.back), r: radius },
    { ...world(OFF.front), r: radius },
    { ...world(OFF.hour), r: dialR * 0.42 },
    { ...world(OFF.minute), r: dialR * 0.62 },
    { ...world(LABEL), r: 16 },
    { ...world({ x: LABEL.x + 78, y: LABEL.y + 130 }), r: 12 },
  ];
  const fit = (points: { x: number; y: number; r: number }[], maxZoom: number, pad: number) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x - point.r);
      minY = Math.min(minY, point.y - point.r);
      maxX = Math.max(maxX, point.x + point.r);
      maxY = Math.max(maxY, point.y + point.r);
    }
    const zoom = Math.min(maxZoom, (1280 - pad * 2) / (maxX - minX), (720 - pad * 2) / (maxY - minY));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
  };
  const opened = fit(explodedPoints, 0.92, 36);
  const wide = { x: 590, y: 400, zoom: 0.9 };
  const shots = [
    { t: 0, ...opened, ease: "hold" as Ease },
    { t: ms(7.2), ...opened, ease: "easeInOut" as Ease },
    { t: ms(13.8), x: CX, y: CY, zoom: 1.52, ease: "easeInOut" as Ease },
    { t: ms(18.2), x: CX - 8, y: CY, zoom: 1.58, ease: "easeInOut" as Ease },
    { t: ms(21.4), x: CX, y: CY, zoom: 1.48, ease: "easeInOut" as Ease },
    { t: ms(30), ...wide },
  ];
  const axis = (channel: "x" | "y" | "zoom", read: (shot: (typeof shots)[number]) => number) =>
    track(
      channel === "zoom" ? "camera(main).zoom" : `camera(main).position.${channel}`,
      shots.map((shot, index) => ({ t: shot.t, v: read(shot), ease: index < shots.length - 1 && "ease" in shot ? shot.ease : undefined })),
    );
  return [axis("x", (shot) => shot.x), axis("y", (shot) => shot.y), axis("zoom", (shot) => shot.zoom)];
}

function cssPaint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined || color.a === undefined) {
    return "none";
  }
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
  if (geometry.kind === "polygon") {
    const points = geometry.points.map((point) => `${point.x},${point.y}`).join(" ");
    return `<polygon points="${points}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}"/>`;
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
    const rule = geometry.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
    return `<path d="${d}" ${transform} ${opacity} fill="${fill}" stroke="${strokePaint}" stroke-width="${stroke ? width : 0}" stroke-linecap="round" stroke-linejoin="round"${rule}/>`;
  }
  if (geometry.kind === "text") {
    const anchor = geometry.align === "center" ? "middle" : geometry.align === "right" ? "end" : "start";
    const baseline = geometry.baseline === "middle" ? "middle" : geometry.baseline === "top" ? "hanging" : geometry.baseline === "bottom" ? "text-after-edge" : "alphabetic";
    const weight = geometry.font.weight;
    const size = geometry.font.size;
    const content = geometry.content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<text ${transform} ${opacity} fill="${fill}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="${baseline}">${content}</text>`;
  }
  return "";
}

function pointOf(items: readonly ResolvedDrawItem[], id: string, x: number, y: number): Pt | undefined {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) return undefined;
  return transformPoint(item.logicalMatrix, x, y);
}

function gearAngle(items: readonly ResolvedDrawItem[], id: GearId): number {
  const hub = pointOf(items, `${id}.hub`, 0, 0);
  const mark = pointOf(items, `${id}.mark`, 0, 0);
  if (!hub || !mark) throw new Error(`Missing ${id} hub or mark.`);
  return Math.atan2(mark.y - hub.y, mark.x - hub.x);
}

function main(): void {
  const layout = placeTrain();
  const drive = solveDrive(layout);
  const radius = plateRadius(layout);
  layoutExplode(layout, radius);
  const pillars = pillarSeats(layout, radius - 18);
  const source = program(layout, drive, pillars, radius);
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "clockwork.ms");
  writeFileSync(outPath, source);
  console.log(`wrote ${outPath} (${source.length} bytes)`);
  console.log(
    GEARS.map((id) => `${id} T${TEETH[id]} ${directionWord(drive.omega[id])} ω ${drive.omega[id].toFixed(3)}`).join("\n"),
  );
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
  const early = runtime.evaluate(ms(16));
  const later = runtime.evaluate(ms(16.7));
  for (const [driver, driven] of MESH) {
    const ratio = angDiff(gearAngle(early.drawItems, driven), gearAngle(later.drawItems, driven)) / angDiff(gearAngle(early.drawItems, driver), gearAngle(later.drawItems, driver));
    const expected = -TEETH[driver] / TEETH[driven];
    if (Math.abs(ratio - expected) > 0.04) {
      console.error(`${driver}/${driven} ratio ${ratio.toFixed(3)} expected ${expected.toFixed(3)}`);
      process.exit(1);
    }
    if (Math.sign(angDiff(gearAngle(early.drawItems, driver), gearAngle(later.drawItems, driver))) === Math.sign(angDiff(gearAngle(early.drawItems, driven), gearAngle(later.drawItems, driven)))) {
      console.error(`${driver} and ${driven} turn the same way`);
      process.exit(1);
    }
  }
  const revealed = runtime.evaluate(ms(5.2));
  const dialR = radius + 16;
  const mustSee = [
    ["back plate", pointOf(revealed.drawItems, "plateBack.disc", 0, radius)],
    ["front plate", pointOf(revealed.drawItems, "plateFront.rim", 0, -radius)],
    ["hour hand", pointOf(revealed.drawItems, "hourHand.blade", 0, -dialR * 0.38)],
    ["minute hand", pointOf(revealed.drawItems, "minuteHand.blade", 0, -dialR * 0.58)],
  ] as const;
  for (const [name, point] of mustSee) {
    if (!point || point.x < 24 || point.x > 1256 || point.y < 20 || point.y > 700) {
      console.error(`${name} falls outside the exploded frame at (${point?.x.toFixed(0)}, ${point?.y.toFixed(0)}).`);
      process.exit(1);
    }
  }
  const seated = runtime.evaluate(ms(13.8));
  const floating = runtime.evaluate(ms(6.4));
  const hub = pointOf(seated.drawItems, "fourth.hub", 0, 0);
  const hand = pointOf(seated.drawItems, "secondHand.boss", 0, 0);
  const floatingHub = pointOf(floating.drawItems, "fourth.hub", 0, 0);
  const floatingHand = pointOf(floating.drawItems, "secondHand.boss", 0, 0);
  if (!hub || !hand || !floatingHub || !floatingHand) {
    console.error("Missing fourth wheel or second hand.");
    process.exit(1);
  }
  if (hypot(hub, hand) > 2.5) {
    console.error(`Second hand left the fourth arbor by ${hypot(hub, hand).toFixed(2)}`);
    process.exit(1);
  }
  if (hypot(floatingHub, floatingHand) < 16) {
    console.error("Second hand did not lift off in the exploded view.");
    process.exit(1);
  }
  const handEarly = pointOf(early.drawItems, "secondHand.blade", 0, -20);
  const handLater = pointOf(later.drawItems, "secondHand.blade", 0, -20);
  const hubEarly = pointOf(early.drawItems, "fourth.hub", 0, 0);
  const hubLater = pointOf(later.drawItems, "fourth.hub", 0, 0);
  if (!handEarly || !handLater || !hubEarly || !hubLater) throw new Error("Missing hand samples.");
  const sweep = angDiff(Math.atan2(handEarly.y - hubEarly.y, handEarly.x - hubEarly.x), Math.atan2(handLater.y - hubLater.y, handLater.x - hubLater.x));
  if (sweep <= 0) {
    console.error(`Second hand swept ${sweep.toFixed(3)} instead of clockwise.`);
    process.exit(1);
  }
  const previewDir = resolve("/tmp/clockwork-preview");
  mkdirSync(previewDir, { recursive: true });
  const moments = [1.1, 3.0, 5.2, 8.0, 10.6, 13.6, 15.4, 17.2, 19.0, 21.2, 24.5, 29.4];
  for (const time of moments) {
    const frame = runtime.evaluate(ms(time));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${PAPER}"/>${frame.drawItems.map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(previewDir, `f${time.toFixed(1)}.svg`), svg);
  }
  console.log(`preview ${previewDir}`);
  console.log(
    `plate ${radius.toFixed(1)}  dial ${(radius + 16).toFixed(1)}  front ${OFF.front.y.toFixed(0)}  back ${OFF.back.y.toFixed(0)}`,
  );
  console.log(GEARS.map((id) => `${id} (${layout[id].x.toFixed(1)}, ${layout[id].y.toFixed(1)})`).join("  "));
}

main();
