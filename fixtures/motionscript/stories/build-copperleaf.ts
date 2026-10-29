/**
 * Builds fixtures/motionscript/stories/copperleaf-run.ms — Copperleaf Run.
 * Run: npx tsx fixtures/motionscript/stories/build-copperleaf.ts
 *
 * Art is a 320×180 pixel grid. Each art pixel is a 4×4 block on the 1280×720
 * viewport, so camera, sprites, and scenery stay on whole art pixels.
 * Motion is held at 20 steps per second. Sprite poses change at 10fps.
 * MotionScript has no audio; the header lists the intended cues.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssColor } from "@gvr/canvas-renderer";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { validateSceneIR, type ResolvedDrawItem, type SolidColor } from "@gvr/schema";

const SCALE = 4;
const VW = 320;
const VH = 180;
const GROUND = 154;
const BROAD = GROUND - 14;
const MID = GROUND - 26;
const LAST = 600;
const FPS = 20;

type Rect = { x: number; y: number; w: number; h: number; fill: string };
type Block = [number, number, number, number, string];

const HOOD = "#2ecfc2";
const HOOD_DK = "#0e7a74";
const SKIN = "#ffd0b0";
const EYE = "#1a140f";
const SCARF = "#ff8a1e";
const SCARF_DK = "#d85a08";
const PACK = "#f0b030";
const PACK_DK = "#c48418";
const TUNIC = "#3cb56a";
const TUNIC_DK = "#1f7a46";
const BOOT = "#6b4630";
const BOOT_DK = "#3a2618";
const COPPER = "#e07038";
const COPPER_DK = "#a84820";
const COPPER_LT = "#f4a868";

function blocks(items: Block[]): Rect[] {
  return items.map(([x, y, w, h, fill]) => ({ x, y, w, h, fill }));
}

function limb(x: number, top: number, footX: number): Block[] {
  const height = Math.max(2, -top - 3);
  return [
    [x, top, 3, height, BOOT],
    [footX, -3, 5, 3, BOOT_DK],
  ];
}

const body = blocks([
  [-6, -22, 12, 4, HOOD_DK],
  [-5, -19, 10, 5, HOOD],
  [-1, -17, 6, 4, SKIN],
  [2, -16, 2, 2, EYE],
  [-2, -13, 7, 7, TUNIC],
  [4, -13, 2, 7, TUNIC_DK],
  [-8, -15, 6, 6, PACK],
  [-8, -15, 2, 6, PACK_DK],
]);

const scarves = [
  blocks([
    [-5, -12, 4, 3, SCARF],
    [-13, -11, 8, 3, SCARF],
    [-16, -9, 4, 3, SCARF_DK],
  ]),
  blocks([
    [-5, -13, 4, 3, SCARF],
    [-12, -14, 7, 3, SCARF],
    [-14, -16, 3, 3, SCARF_DK],
  ]),
  blocks([
    [-4, -12, 3, 3, SCARF],
    [-10, -10, 6, 3, SCARF_DK],
    [-12, -8, 3, 2, SCARF],
  ]),
];

const legs = [
  blocks([...limb(-6, -12, -7), ...limb(3, -11, 3)]),
  blocks([...limb(-4, -10, -5), ...limb(4, -12, 5)]),
  blocks([...limb(-2, -13, -2), ...limb(2, -10, 2)]),
  blocks([...limb(-7, -11, -8), ...limb(1, -13, 1)]),
  blocks([...limb(-5, -13, -5), ...limb(4, -10, 4)]),
  blocks([...limb(-3, -11, -3), ...limb(3, -12, 4)]),
];

function courier(dy: number, dx: number, scarf: Block[], poseLegs: Block[], arm?: Block): Rect[] {
  const move = (item: Block): Block => [item[0] + dx, item[1] + dy, item[2], item[3], item[4]];
  const torso: Block[] = [
    [-6, -22, 12, 4, HOOD_DK],
    [-5, -19, 10, 5, HOOD],
    [-1, -17, 6, 4, SKIN],
    [2, -16, 2, 2, EYE],
    [-2, -13, 7, 7, TUNIC],
    [4, -13, 2, 7, TUNIC_DK],
    [-8, -15, 6, 6, PACK],
    [-8, -15, 2, 6, PACK_DK],
  ];
  return blocks([...torso.map(move), ...scarf.map(move), ...poseLegs, ...(arm ? [move(arm)] : [])]);
}

const scarfBack: Block[] = [
  [-5, -12, 4, 3, SCARF],
  [-13, -11, 8, 3, SCARF],
  [-16, -9, 4, 3, SCARF_DK],
];
const scarfUp: Block[] = [
  [-4, -14, 4, 3, SCARF],
  [-10, -17, 6, 3, SCARF],
  [-12, -19, 3, 3, SCARF_DK],
];
const tucked: Block[] = [
  [-6, -10, 6, 3, BOOT],
  [-2, -8, 4, 3, BOOT_DK],
  [2, -11, 6, 3, BOOT],
  [4, -8, 4, 3, BOOT_DK],
];

const actions: Record<string, Rect[]> = {
  crouch0: courier(6, 0, scarfBack, [...limb(-5, -8, -6), ...limb(2, -7, 2)]),
  crouch1: courier(8, 0, scarfBack, [...limb(-4, -6, -5), ...limb(2, -6, 2)]),
  rise: courier(-2, 0, scarfBack, [...limb(-6, -14, -7), ...limb(3, -8, 4)]),
  tuck: courier(2, 0, scarfUp, tucked),
  fall: courier(0, 0, scarfUp, [...limb(-2, -12, -3), ...limb(1, -12, 1)]),
  land: courier(8, 0, scarfBack, [...limb(-7, -8, -8), ...limb(4, -8, 4)]),
  half: courier(4, 0, scarfBack, [...limb(-4, -10, -5), ...limb(2, -10, 2)]),
  brake0: courier(2, 2, scarfBack, [...limb(-6, -9, -8), ...limb(4, -10, 5)]),
  brake1: courier(1, 3, scarfBack, [...limb(-3, -10, -4), ...limb(5, -9, 6)]),
  cheer: courier(-1, 0, scarfUp, [...limb(-2, -12, -3), ...limb(1, -12, 1)], [3, -28, 3, 6, SKIN]),
  lean: courier(1, 4, scarfBack, [...limb(-2, -11, -2), ...limb(4, -12, 5)]),
};

const bugBody = blocks([
  [-7, -12, 14, 7, COPPER],
  [-5, -14, 10, 3, COPPER_LT],
  [-8, -10, 3, 4, COPPER_DK],
  [1, -10, 2, 2, EYE],
  [-3, -7, 8, 2, COPPER_DK],
]);

function bugStep(shift: number): Rect[] {
  return blocks([
    [-8 + shift, -5, 3, 5, BOOT_DK],
    [-6 + shift, -2, 4, 2, BOOT],
    [4 - shift, -5, 3, 5, BOOT_DK],
    [5 - shift, -2, 4, 2, BOOT],
  ]);
}

const bugLegs = [bugStep(0), bugStep(2), bugStep(-1), bugStep(3)];

const bugTurn = blocks([
  [-6, -12, 12, 7, COPPER],
  [-4, -14, 8, 3, COPPER_LT],
  [-3, -9, 2, 2, EYE],
  [2, -9, 2, 2, EYE],
  [-5, -5, 3, 5, BOOT_DK],
  [2, -5, 3, 5, BOOT_DK],
]);

const coinPixels = blocks([
  [-2, -6, 4, 2, "#ffe14a"],
  [-3, -4, 6, 4, "#ffe14a"],
  [-2, 0, 4, 2, "#ffe14a"],
  [-1, -4, 2, 2, "#e09a14"],
]);


function spread(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const extra = total - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0));
}

function arc(i: number, i0: number, i1: number, peakAt: number, y0: number, y1: number, peak: number): number {
  if (i <= i0) return y0;
  if (i >= i1) return y1;
  if (i <= peakAt) {
    const u = (i - i0) / (peakAt - i0);
    return Math.round(y0 + (peak - y0) * Math.sin((u * Math.PI) / 2));
  }
  const u = (i - peakAt) / (i1 - peakAt);
  return Math.round(peak + (y1 - peak) * (1 - Math.cos((u * Math.PI) / 2)));
}

type Cast = {
  pipX: number[];
  pipY: number[];
  pose: string[];
  camX: number[];
  camY: number[];
  bugX: number[];
  bugPose: string[];
  bugFace: number[];
  grounded: boolean[];
  broadLeft: number;
  broadRight: number;
  markerX: number;
};

function simulate(): Cast {
  const animVx = new Array<number>(300).fill(6);
  const accel = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
  accel.forEach((value, index) => {
    animVx[index] = value;
  });
  animVx[50] = 2;
  animVx[51] = 1;
  animVx[52] = 1;
  animVx[72] = 2;
  animVx[73] = 3;
  animVx[74] = 4;
  animVx[103] = 4;
  animVx[104] = 3;
  animVx[113] = 2;
  animVx[114] = 4;
  animVx[132] = 2;
  animVx[133] = 3;
  animVx[134] = 5;
  animVx[152] = 2;
  animVx[153] = 1;
  animVx[167] = 1;
  animVx[168] = 0;
  animVx[169] = 0;
  animVx[170] = 1;
  animVx[171] = 2;
  for (let frame = 172; frame <= 187; frame += 1) animVx[frame] = 8;
  animVx[188] = 2;
  animVx[189] = 3;
  animVx[190] = 5;
  animVx[210] = 4;
  animVx[211] = 2;
  animVx[212] = 3;
  animVx[213] = 1;
  for (let frame = 214; frame <= 225; frame += 1) animVx[frame] = 0;
  animVx[226] = 2;
  animVx[227] = 3;
  animVx[228] = 5;

  const pipX = new Array<number>(LAST + 1).fill(0);
  pipX[0] = -20;
  for (let frame = 0; frame < 300; frame += 1) {
    const parts = spread(animVx[frame] ?? 0, 2);
    pipX[frame * 2 + 1] = (pipX[frame * 2] ?? 0) + (parts[0] ?? 0);
    pipX[frame * 2 + 2] = (pipX[frame * 2 + 1] ?? 0) + (parts[1] ?? 0);
  }

  const pose = new Array<string>(LAST + 1);
  for (let tick = 0; tick <= LAST; tick += 1) {
    const frame = Math.min(300, Math.floor(tick / 2));
    pose[tick] = poseAt(frame);
  }

  const pipY = new Array<number>(LAST + 1);
  const grounded = new Array<boolean>(LAST + 1);
  for (let tick = 0; tick <= LAST; tick += 1) {
    const frame = Math.min(300, Math.floor(tick / 2));
    const running = (pose[tick] ?? "").startsWith("run");
    const bob = running && frame % 2 === 1 ? 1 : 0;
    let y = surfaceAt(tick) - bob;
    let air = false;
    if (tick > 106 && tick < 144) {
      y = arc(tick, 106, 144, 124, GROUND, GROUND, GROUND - 40);
      air = true;
    } else if (tick > 206 && tick < 210) {
      y = arc(tick, 206, 210, 208, GROUND, BROAD, BROAD - 8);
      air = true;
    } else if (tick > 228 && tick < 264) {
      y = arc(tick, 228, 264, 246, BROAD, BROAD, BROAD - 46);
      air = true;
    } else if (tick > 308 && tick < 334) {
      y = arc(tick, 308, 334, 320, BROAD, MID, MID - 24);
      air = true;
    } else if (tick > 344 && tick < 376) {
      y = arc(tick, 344, 376, 360, MID, GROUND, MID - 28);
      air = true;
    }
    pipY[tick] = y;
    grounded[tick] = !air;
  }

  const camX = new Array<number>(LAST + 1);
  const camY = new Array<number>(LAST + 1);
  for (let tick = 0; tick <= LAST; tick += 1) {
    const t = tick / FPS;
    const pip = pipX[tick] ?? 0;
    const follow = pip + 54;
    let cam = follow;
    if (t <= 0.7) cam = 160;
    else if (t < 1.5) {
      const u = (t - 0.7) / 0.8;
      cam = Math.round(160 + (follow - 160) * u);
    } else cam = pip + 160 - desiredScreen(t);
    camX[tick] = cam;
    camY[tick] = cameraY(tick);
  }

  const broadLeft = (pipX[210] ?? 0) - 10;
  const broadRight = (pipX[308] ?? 0) + 12;
  const meet = 246;
  const meetX = pipX[meet] ?? 0;
  const markerX = meetX - 8;
  const bugX = new Array<number>(LAST + 1).fill(broadRight - 12);
  const bugPose = new Array<string>(LAST + 1).fill("w0");
  const bugFace = new Array<number>(LAST + 1).fill(-1);
  const rightHold = broadRight - 12;
  const depart = meet - (rightHold - meetX);
  let phase = 0;
  for (let tick = 0; tick <= meet; tick += 1) {
    bugX[tick] = tick < depart ? rightHold : meetX + (meet - tick);
    if (tick > 0 && tick % 2 === 0) phase = (phase + 1) % 4;
    bugPose[tick] = `w${phase}`;
    bugFace[tick] = -1;
  }
  let cursor = meetX;
  let tick = meet;
  const advance = (count: number, speed: number, poseName: string | null, face: number) => {
    for (let step = 0; step < count && tick < LAST; step += 1) {
      tick += 1;
      cursor += speed;
      bugX[tick] = cursor;
      if (poseName) bugPose[tick] = poseName;
      else {
        if (tick % 2 === 0) phase = (phase + (speed >= 0 ? 3 : 1)) % 4;
        bugPose[tick] = `w${phase}`;
      }
      bugFace[tick] = face;
    }
  };
  advance(8, -1, null, -1);
  const paused = bugPose[tick] ?? "w0";
  advance(6, 0, paused, -1);
  advance(4, 0, "turn", 1);
  while (tick < LAST && cursor < broadRight - 14) advance(1, 2, null, 1);
  while (tick < LAST) advance(1, 0, bugPose[tick] ?? "w0", 1);

  return {
    pipX,
    pipY,
    pose,
    camX,
    camY,
    bugX,
    bugPose,
    bugFace,
    grounded,
    broadLeft,
    broadRight,
    markerX,
  };
}

function surfaceAt(tick: number): number {
  if (tick < 210) return GROUND;
  if (tick < 334) return BROAD;
  if (tick < 376) return MID;
  return GROUND;
}

function poseAt(frame: number): string {
  if (frame >= 50 && frame <= 51) return "crouch0";
  if (frame === 52) return "crouch1";
  if (frame >= 53 && frame <= 58) return "rise";
  if (frame >= 59 && frame <= 64) return "tuck";
  if (frame >= 65 && frame <= 71) return "fall";
  if (frame >= 72 && frame <= 73) return "land";
  if (frame >= 74 && frame <= 75) return "half";
  if (frame === 103) return "rise";
  if (frame === 104 || frame === 105) return "land";
  if (frame === 113) return "crouch0";
  if (frame === 114) return "crouch1";
  if (frame >= 115 && frame <= 119) return "rise";
  if (frame >= 120 && frame <= 125) return "tuck";
  if (frame >= 126 && frame <= 131) return "fall";
  if (frame >= 132 && frame <= 133) return "land";
  if (frame >= 134 && frame <= 135) return "half";
  if (frame === 152) return "crouch0";
  if (frame === 153) return "crouch1";
  if (frame >= 154 && frame <= 158) return "rise";
  if (frame >= 159 && frame <= 163) return "tuck";
  if (frame >= 164 && frame <= 166) return "fall";
  if (frame >= 167 && frame <= 169) return "land";
  if (frame >= 170 && frame <= 171) return "crouch0";
  if (frame >= 172 && frame <= 176) return "rise";
  if (frame >= 177 && frame <= 182) return "tuck";
  if (frame >= 183 && frame <= 187) return "fall";
  if (frame >= 188 && frame <= 189) return "land";
  if (frame === 190) return "half";
  if (frame >= 210 && frame <= 211) return "brake0";
  if (frame >= 212 && frame <= 219) return "brake1";
  if (frame >= 220 && frame <= 225) return "cheer";
  if (frame >= 226 && frame <= 228) return "lean";
  return `run${frame % 6}`;
}

function desiredScreen(t: number): number {
  if (t <= 20) return 106;
  if (t <= 21) return Math.round(106 + 94 * (t - 20));
  if (t <= 25) return Math.round(200 + 10 * ((t - 21) / 4));
  if (t <= 26.5) return Math.round(210 + (112 - 210) * ((t - 25) / 1.5));
  return 112;
}

function cameraY(tick: number): number {
  const upStart = 15.2 * FPS;
  const upEnd = 16.2 * FPS;
  const downStart = 18.6 * FPS;
  const downEnd = 19.8 * FPS;
  if (tick <= upStart) return 90;
  if (tick <= upEnd) return 90 - Math.round((16 * (tick - upStart)) / (upEnd - upStart));
  if (tick <= downStart) return 74;
  if (tick <= downEnd) return 74 + Math.round((16 * (tick - downStart)) / (downEnd - downStart));
  return 90;
}

function offsetOf(factor: number, cam: number, cam0: number): number {
  return Math.round((1 - factor) * (cam - cam0));
}

type Node = { id: string; lines: string[] };

function px(value: number): number {
  return Math.round(value) * SCALE;
}

function num(value: number): string {
  return String(Math.round(value));
}

function emitRects(owner: string, rects: Rect[], z = 0): string[] {
  return rects.map((rect, index) => {
    const name = `r${index}`;
    return `    rectangle ${name} { position (${num(px(rect.x))}, ${num(px(rect.y))}); size (${num(px(rect.w))}, ${num(px(rect.h))}); fill ${rect.fill}; zIndex ${z}; };`;
  });
}

function groupBlock(name: string, z: number, extra: string[], children: string[], opacity = 1): string[] {
  return [
    `  group ${name} {`,
    `    position (0, 0);`,
    `    zIndex ${z};`,
    ...(opacity !== 1 ? [`    opacity ${opacity};`] : []),
    ...extra,
    ...children,
    `  };`,
  ];
}

function percent(tick: number): string {
  if (tick <= 0) return "0%";
  if (tick >= LAST) return "100%";
  const floored = Math.floor((tick / 6) * 1e6) / 1e6;
  const text = floored.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function emitTrack(target: string, samples: number[]): string {
  const keys: { tick: number; value: number }[] = [];
  samples.forEach((value, tick) => {
    if (tick === 0 || tick === samples.length - 1 || value !== samples[tick - 1]) {
      if (keys[keys.length - 1]?.tick !== tick) keys.push({ tick, value });
    }
  });
  if (keys.length < 2) return "";
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!key) continue;
    const label = percent(key.tick);
    const parsed = label === "100%" ? 1 : label === "0%" ? 0 : Number(label.slice(0, -1)) / 100;
    if (parsed <= previous) throw new Error(`percent did not advance for ${target} at tick ${key.tick}`);
    previous = parsed;
    const hold = index < keys.length - 1 ? " ease hold" : "";
    lines.push(`  ${label} ${num(key.value)}${hold};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function samples(cast: Cast, read: (tick: number) => number): number[] {
  return Array.from({ length: LAST + 1 }, (_, tick) => read(tick));
}

function opacitySamples(on: (tick: number) => boolean): number[] {
  return Array.from({ length: LAST + 1 }, (_, tick) => (on(tick) ? 1 : 0));
}

function emitOpacity(target: string, on: (tick: number) => boolean): string {
  const values = opacitySamples(on);
  if (values.every((value) => value === values[0])) return "";
  return emitTrack(target, values);
}

function emitToggleGroup(name: string, rects: Rect[], on: (tick: number) => boolean, z = 0): { block: string[]; track: string } {
  const values = opacitySamples(on);
  const block = groupBlock(name, z, [], emitRects(name, rects), values[0] ?? 0);
  return { block, track: emitOpacity(`${name}.opacity`, on) };
}

function localSpan(factor: number, camX: number[], cam0: number): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const cam of camX) {
    const offset = offsetOf(factor, cam, cam0);
    min = Math.min(min, cam - VW / 2 - 24 - offset);
    max = Math.max(max, cam + VW / 2 + 24 - offset);
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

function buildSource(cast: Cast): string {
  const cam0 = cast.camX[0] ?? 160;
  const arch = (cast.pipX[530] ?? 0) - 8;
  const flagX = (cast.pipX[420] ?? 0) + 8;
  const takeoff = (cast.pipX[106] ?? 0) + 8;
  const land1 = (cast.pipX[144] ?? 0) - 14;
  const stepLand = cast.pipX[334] ?? 0;
  const farLand = (cast.pipX[376] ?? 0) - 16;
  const endX = cast.pipX[LAST] ?? 0;
  const trail = cast.pipX[580] ?? 0;

  const farSpan = localSpan(0.25, cast.camX, cam0);
  const midSpan = localSpan(0.5, cast.camX, cam0);
  const nearSpan = localSpan(1.125, cast.camX, cam0);
  const farSeam = Math.round(arch - offsetOf(0.25, cast.camX[540] ?? arch, cam0));
  const midSeam = Math.round(arch - offsetOf(0.5, cast.camX[540] ?? arch, cam0));
  const nearSeam = Math.round(arch - offsetOf(1.125, cast.camX[540] ?? arch, cam0));

  const mountains: string[] = [];
  let ridge = 0;
  for (let x = farSpan.min; x < Math.min(farSpan.max, farSeam); x += 160) {
    const peak = 46 + (ridge % 3) * 8;
    const fill = ridge % 2 === 0 ? "#9eb4d0" : "#7d97b8";
    mountains.push(
      `    rectangle m${ridge} { position (${num(px(x))}, ${num(px(78 - peak))}); size (${num(px(70))}, ${num(px(peak))}); fill ${fill}; };`,
      `    rectangle m${ridge}p { position (${num(px(x + 18))}, ${num(px(62 - peak))}); size (${num(px(28))}, ${num(px(18))}); fill ${ridge % 2 === 0 ? "#c5d4e6" : "#a9bdd4"}; };`,
    );
    ridge += 1;
  }
  const trees: string[] = [];
  let tree = 0;
  for (let x = midSpan.min + 20; x < Math.min(midSpan.max, midSeam); x += 200) {
    trees.push(
      `    rectangle t${tree}a { position (${num(px(x + 10))}, ${num(px(GROUND - 46))}); size (${num(px(6))}, ${num(px(28))}); fill #6b4428; };`,
      `    rectangle t${tree}b { position (${num(px(x))}, ${num(px(GROUND - 68))}); size (${num(px(26))}, ${num(px(22))}); fill #2f8a48; };`,
    );
    tree += 1;
  }
  const grass: string[] = [];
  let tuft = 0;
  for (let x = nearSpan.min; x < nearSpan.max; x += 140) {
    const cavern = x >= nearSeam;
    const fill = cavern ? "#2f6a58" : "#8ed15a";
    grass.push(
      `    rectangle g${tuft} { position (${num(px(x))}, ${num(px(GROUND - 8))}); size (${num(px(4))}, ${num(px(8))}); fill ${fill}; };`,
    );
    tuft += 1;
  }

  const platform = (name: string, x: number, y: number, w: number, top: string, body: string, z: number) => [
    `    rectangle ${name}body { position (${num(px(x))}, ${num(px(y))}); size (${num(px(w))}, ${num(px(VH - y))}); fill ${body}; zIndex ${z}; };`,
    `    rectangle ${name}top { position (${num(px(x))}, ${num(px(y))}); size (${num(px(w))}, ${num(px(4))}); fill ${top}; zIndex ${z + 1}; };`,
  ];

  const stage: string[] = [
    ...platform("pit1", takeoff, GROUND + 10, Math.max(8, land1 - takeoff), "#243038", "#182228", 0),
    ...platform("pit2", cast.broadRight, GROUND + 8, Math.max(8, farLand - cast.broadRight), "#243038", "#182228", 0),
    `    rectangle cave { position (${num(px(arch - 4))}, 0); size (${num(px(endX + 220 - arch))}, ${num(px(GROUND + 8))}); fill #16345c; zIndex 1; };`,
    `    rectangle caveDeep { position (${num(px(arch + 30))}, ${num(px(18))}); size (${num(px(180))}, ${num(px(70))}); fill #102848; zIndex 1; };`,
    ...platform("groundA", -48, GROUND, takeoff + 56, "#7ec850", "#6a4a30", 3),
    ...platform("groundB", land1, GROUND, Math.max(16, cast.broadLeft - land1 + 8), "#7ec850", "#6a4a30", 3),
    ...platform("groundC", cast.broadLeft, BROAD, cast.broadRight - cast.broadLeft, "#d8c4a0", "#7a7368", 3),
    ...platform("stone", stepLand - 18, MID, 36, "#c8c0b0", "#6e685c", 3),
    ...platform("ledge", farLand, GROUND, Math.max(24, arch - farLand + 8), "#7ec850", "#6a4a30", 3),
    ...platform("caveFloor", arch - 4, GROUND, endX + 200 - arch, "#4a6278", "#2a3c4c", 3),
    `    rectangle slab { position (${num(px(takeoff - 78))}, ${num(px(GROUND - 40))}); size (${num(px(64))}, ${num(px(10))}); fill #b7b1a6; zIndex 4; };`,
    `    rectangle slabLeg { position (${num(px(takeoff - 70))}, ${num(px(GROUND - 30))}); size (${num(px(6))}, ${num(px(30))}); fill #8d877c; zIndex 4; };`,
    `    rectangle ruin { position (${num(px(36))}, ${num(px(GROUND - 28))}); size (${num(px(14))}, ${num(px(28))}); fill #8a8478; zIndex 4; };`,
    `    rectangle ruinCap { position (${num(px(32))}, ${num(px(GROUND - 34))}); size (${num(px(22))}, ${num(px(6))}); fill #c2bbae; zIndex 4; };`,
    `    rectangle marker { position (${num(px(cast.markerX - 3))}, ${num(px(BROAD - 3))}); size (${num(px(6))}, ${num(px(3))}); fill #8a5a38; zIndex 4; };`,
    `    rectangle lowStep { position (${num(px(endX + 48))}, ${num(px(GROUND - 12))}); size (${num(px(28))}, ${num(px(12))}); fill #c08858; zIndex 4; };`,
    `    rectangle lowLip { position (${num(px(endX + 48))}, ${num(px(GROUND - 12))}); size (${num(px(28))}, ${num(px(3))}); fill #e0b078; zIndex 5; };`,
    `    rectangle pierL { position (${num(px(arch - 28))}, ${num(px(GROUND - 64))}); size (${num(px(16))}, ${num(px(64))}); fill #8d877c; zIndex 5; };`,
    `    rectangle pierR { position (${num(px(arch + 24))}, ${num(px(GROUND - 64))}); size (${num(px(16))}, ${num(px(64))}); fill #6e685c; zIndex 5; };`,
    `    rectangle lintel { position (${num(px(arch - 34))}, ${num(px(GROUND - 74))}); size (${num(px(80))}, ${num(px(12))}); fill #c2bbae; zIndex 5; };`,
    `    rectangle pole { position (${num(px(flagX))}, ${num(px(GROUND - 52))}); size (${num(px(3))}, ${num(px(52))}); fill #d7d1c6; zIndex 5; };`,
    `    rectangle poleFoot { position (${num(px(flagX - 4))}, ${num(px(GROUND - 4))}); size (${num(px(11))}, ${num(px(4))}); fill #8d877c; zIndex 5; };`,
  ];

  const mushrooms = [70, 150, 230, 320].map((shift, index) => {
    const x = arch + shift;
    return [
      `    rectangle sh${index} { position (${num(px(x + 4))}, ${num(px(GROUND - 16))}); size (${num(px(4))}, ${num(px(12))}); fill #e8d8c0; zIndex 4; };`,
      `    rectangle cap${index} { position (${num(px(x))}, ${num(px(GROUND - 24))}); size (${num(px(14))}, ${num(px(8))}); fill #e25a8c; zIndex 4; };`,
      `    rectangle glow${index} { position (${num(px(x + 4))}, ${num(px(GROUND - 22))}); size (${num(px(6))}, ${num(px(4))}); fill #9ef0d4; zIndex 4; };`,
    ].join("\n");
  });

  const timber = [40, 120].map((shift, index) => {
    const x = arch + 180 + shift;
    const y = GROUND - 32 - index * 8;
    return `    rectangle timber${index} { position (${num(px(x))}, ${num(px(y))}); size (${num(px(46))}, ${num(px(6))}); fill #c08858; zIndex 4; };`;
  });

  const cloth = [
    { name: "flagLow", y: GROUND - 24, w: 12, fill: "#7d6a99" },
    { name: "flagMid", y: GROUND - 34, w: 13, fill: "#b15a28" },
    { name: "flagHigh", y: GROUND - 44, w: 14, fill: "#e07020" },
    { name: "flagA", y: GROUND - 50, w: 14, fill: "#ff8a1e" },
    { name: "flagB", y: GROUND - 50, w: 12, fill: "#ff9a32" },
    { name: "flagC", y: GROUND - 48, w: 15, fill: "#ff7a12" },
  ];
  const flags = cloth.map(
    (item) =>
      `    rectangle ${item.name} { position (${num(px(flagX + 3))}, ${num(px(item.y))}); size (${num(px(item.w))}, ${num(px(8))}); fill ${item.fill}; opacity 0; zIndex 6; };`,
  );

  const collects = [40, 60, 80, 116, 132, 320, 352, 364, 580];
  const coins: string[] = [];
  const coinTracks: string[] = [];
  const sparkTracks: string[] = [];
  const coinSpots: { x: number; y: number; tick: number | null }[] = [];
  collects.forEach((tick) => {
    coinSpots.push({ x: cast.pipX[tick] ?? 0, y: (cast.pipY[tick] ?? GROUND) - 16, tick });
  });
  coinSpots.push({ x: trail + 96, y: GROUND - 20, tick: null });
  coinSpots.push({ x: trail + 156, y: GROUND - 26, tick: null });

  coinSpots.forEach((spot, index) => {
    const name = `coin${index}`;
    coins.push(
      `  group ${name} {`,
      `    position (${num(px(spot.x))}, ${num(px(spot.y))});`,
      `    zIndex 6;`,
      ...emitRects(name, coinPixels).map((line) => line.replace(/^    /, "    ")),
      `  };`,
    );
    if (spot.tick !== null) {
      coinTracks.push(emitOpacity(`${name}.opacity`, (tick) => tick < (spot.tick ?? 0)));
      const spark = `spark${index}`;
      const pixels: Rect[] = [
        { x: 0, y: -1, w: 2, h: 2, fill: "#fff6c8" },
        { x: 1, y: 0, w: 2, h: 2, fill: "#ffe14a" },
        { x: 0, y: 1, w: 2, h: 2, fill: "#fff6c8" },
        { x: -1, y: 0, w: 2, h: 2, fill: "#ffe14a" },
      ];
      coins.push(`  group ${spark} { position (${num(px(spot.x))}, ${num(px(spot.y))}); zIndex 14; opacity 0;`);
      pixels.forEach((pixel, pixelIndex) => {
        coins.push(
          `    rectangle p${pixelIndex} { position (${num(px(pixel.x))}, ${num(px(pixel.y))}); size (${num(px(pixel.w))}, ${num(px(pixel.h))}); fill ${pixel.fill}; };`,
        );
        const xs = samples(cast, (tick) => {
          const age = tick - (spot.tick ?? 0);
          const frame = Math.floor(age / 2);
          const spreadPx = frame < 0 || frame > 3 ? 0 : (frame + 1) * 3;
          return px((pixel.x) * spreadPx);
        });
        const ys = samples(cast, (tick) => {
          const age = tick - (spot.tick ?? 0);
          const frame = Math.floor(age / 2);
          const spreadPx = frame < 0 || frame > 3 ? 0 : (frame + 1) * 3;
          return px((pixel.y) * spreadPx);
        });
        sparkTracks.push(emitTrack(`${spark}.p${pixelIndex}.position.x`, xs));
        sparkTracks.push(emitTrack(`${spark}.p${pixelIndex}.position.y`, ys));
      });
      coins.push(`  };`);
      sparkTracks.push(emitOpacity(`${spark}.opacity`, (tick) => tick >= (spot.tick ?? 0) && tick < (spot.tick ?? 0) + 8));
    }
  });

  const dust = [0, 1, 2].map((index) => {
    const name = `dust${index}`;
    return `  rectangle ${name} { position (${num(px(cast.pipX[144] ?? 0))}, ${num(px(GROUND - 2))}); size (${num(px(2))}, ${num(px(2))}); fill #d8d0c0; opacity 0; zIndex 9; };`;
  });
  const dustTracks = [0, 1, 2].flatMap((index) => {
    const dirs = [
      [-1, -1],
      [1, -1],
      [0, -1],
    ];
    const dir = dirs[index] ?? [0, -1];
    const originX = cast.pipX[144] ?? 0;
    return [
      emitTrack(
        `dust${index}.position.x`,
        samples(cast, (tick) => px(originX + (dir[0] ?? 0) * (4 + Math.min(6, Math.max(0, tick - 144))))),
      ),
      emitTrack(
        `dust${index}.position.y`,
        samples(cast, (tick) => px(GROUND - 3 + (dir[1] ?? 0) * (3 + Math.min(4, Math.max(0, tick - 144))))),
      ),
      emitOpacity(`dust${index}.opacity`, (tick) => tick >= 144 && tick < 150),
    ];
  });

  const burst = cast.pipX[420] ?? flagX;
  const sparks = Array.from({ length: 8 }, (_, index) => {
    return `  rectangle burst${index} { position (${num(px(burst))}, ${num(px(GROUND - 52))}); size (${SCALE}, ${SCALE}); fill #fff4cc; opacity 0; zIndex 9; };`;
  });
  const sparkDirs = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  const burstTracks = sparkDirs.flatMap((dir, index) => [
    emitTrack(
      `burst${index}.position.x`,
      samples(cast, (tick) => {
        const age = Math.max(0, Math.min(4, Math.floor((tick - 420) / 2)));
        return px(burst + (dir[0] ?? 0) * age * 3);
      }),
    ),
    emitTrack(
      `burst${index}.position.y`,
      samples(cast, (tick) => {
        const age = Math.max(0, Math.min(4, Math.floor((tick - 420) / 2)));
        return px(GROUND - 52 + (dir[1] ?? 0) * age * 3);
      }),
    ),
    emitOpacity(`burst${index}.opacity`, (tick) => tick >= 420 && tick < 430),
  ]);

  const pipParts: string[] = [];
  const pipTracks: string[] = [];
  const addPart = (name: string, rects: Rect[], on: (tick: number) => boolean) => {
    const built = emitToggleGroup(name, rects, on);
    pipParts.push(...built.block);
    if (built.track) pipTracks.push(built.track);
  };
  addPart("body", body, (tick) => (cast.pose[tick] ?? "").startsWith("run"));
  scarves.forEach((scarf, index) => {
    addPart(`scarf${index}`, scarf, (tick) => {
      const name = cast.pose[tick] ?? "";
      if (!name.startsWith("run")) return false;
      return Number(name.slice(3)) % 3 === index;
    });
  });
  legs.forEach((leg, index) => {
    addPart(`leg${index}`, leg, (tick) => cast.pose[tick] === `run${index}`);
  });
  for (const [name, rects] of Object.entries(actions)) {
    addPart(name, rects, (tick) => cast.pose[tick] === name);
  }

  const bugParts: string[] = [];
  const bugTracks: string[] = [];
  const bugBodyBuilt = emitToggleGroup("shell", bugBody, (tick) => cast.bugPose[tick] !== "turn");
  bugParts.push(...bugBodyBuilt.block);
  if (bugBodyBuilt.track) bugTracks.push(bugBodyBuilt.track);
  bugLegs.forEach((leg, index) => {
    const built = emitToggleGroup(`w${index}`, leg, (tick) => cast.bugPose[tick] === `w${index}`);
    bugParts.push(...built.block);
    if (built.track) bugTracks.push(built.track);
  });
  const turnBuilt = emitToggleGroup("turn", bugTurn, (tick) => cast.bugPose[tick] === "turn");
  bugParts.push(...turnBuilt.block);
  if (turnBuilt.track) bugTracks.push(turnBuilt.track);

  const flagOn: Record<string, (tick: number) => boolean> = {
    flagLow: (tick) => tick >= 420 && tick < 426,
    flagMid: (tick) => tick >= 426 && tick < 432,
    flagHigh: (tick) => tick >= 432 && tick < 438,
    flagA: (tick) => tick >= 438 && (tick < 440 || Math.floor((tick - 440) / 4) % 3 === 0),
    flagB: (tick) => tick >= 440 && Math.floor((tick - 440) / 4) % 3 === 1,
    flagC: (tick) => tick >= 440 && Math.floor((tick - 440) / 4) % 3 === 2,
  };
  const flagTracks = cloth.map((item) => emitOpacity(item.name + ".opacity", flagOn[item.name] ?? (() => false)));

  const veilX = samples(cast, (tick) => {
    const t = tick / FPS;
    if (t <= 27) return px(340);
    if (t >= 28) return px(-110);
    const u = (t - 27) / 1;
    return px(Math.round(300 + (-96 - 300) * u));
  });

  const lines = [
    `// COPPERLEAF RUN`,
    `// 30 seconds. Pip, a teal-hooded courier, runs a woodland ruin into a cavern.`,
    `// Art pixels are 320×180, each drawn as a 4×4 block. Poses, camera, and layers hold on whole art pixels.`,
    `// Mountains move at 1/4 camera speed, trees at 1/2, foreground grass at 9/8. No pose blending.`,
    `// Sound is not a MotionScript channel. Intended cues:`,
    `// woodland ambience until 0:25, then cave drips; the beat stays continuous`,
    `// light footfalls while Pip runs; jump chirps at 0:05.3, 0:11.4, 0:15.4, and 0:17.2`,
    `// coin notes at 0:02, 0:03, 0:04, along both early arcs, the three stepping-stone coins, and 0:29`,
    `// landing thud at 0:07.2, later landing taps, beetle ticks, checkpoint arpeggio at 0:21`,
    `scene "copperleaf-run" {`,
    `  version "0.2";`,
    `  viewport (${VW * SCALE}, ${VH * SCALE});`,
    `  background #7ec8f8;`,
    `  duration 30s;`,
    `  requires "easing.hold";`,
    `};`,
    `camera main {`,
    `  position (${num(px(cast.camX[0] ?? 160))}, ${num(px(cast.camY[0] ?? 90))});`,
    `  zoom 1;`,
    `  rotation 0deg;`,
    `};`,
    `group far {`,
    `  position (0, 0);`,
    `  zIndex 0;`,
    `  rectangle sun { position (${num(px(48))}, ${num(px(18))}); size (${num(px(14))}, ${num(px(14))}); fill #ffe9a0; };`,
    `  rectangle sunCore { position (${num(px(52))}, ${num(px(22))}); size (${num(px(6))}, ${num(px(6))}); fill #fff6d4; };`,
    ...mountains,
    `};`,
    `group mid {`,
    `  position (0, 0);`,
    `  zIndex 2;`,
    ...trees,
    `};`,
    `group stage {`,
    `  position (0, 0);`,
    `  zIndex 4;`,
    ...stage,
    ...mushrooms,
    ...timber,
    ...flags,
    `};`,
    ...coins,
    `group actors {`,
    `  position (0, 0);`,
    `  zIndex 8;`,
    `  rectangle shadow { position (${num(px((cast.pipX[0] ?? 0) - 5))}, ${num(px(GROUND - 1))}); size (${num(px(10))}, ${num(px(2))}); fill #1c2818; opacity 1; zIndex 0; };`,
    `  group bug {`,
    `    position (${num(px(cast.bugX[0] ?? 0))}, ${num(px(BROAD))});`,
    `    zIndex 1;`,
    `    scale (${cast.bugFace[0] ?? -1}, 1);`,
    ...bugParts.map((line) => `  ${line}`),
    `  };`,
    `  group pip {`,
    `    position (${num(px(cast.pipX[0] ?? 0))}, ${num(px(cast.pipY[0] ?? GROUND))});`,
    `    zIndex 2;`,
    ...pipParts.map((line) => `  ${line}`),
    `  };`,
    `};`,
    `group near {`,
    `  position (0, 0);`,
    `  zIndex 12;`,
    ...grass,
    `};`,
    ...dust,
    ...sparks,
    `group veil {`,
    `  space screen;`,
    `  position (${num(px(340))}, 0);`,
    `  zIndex 30;`,
    `  rectangle shaft { position (0, 0); size (${num(px(80))}, ${VH * SCALE}); fill #6a645c; };`,
    `  rectangle shaftLit { position (${num(px(6))}, 0); size (${num(px(10))}, ${VH * SCALE}); fill #b7b1a6; };`,
    `  rectangle shaftDark { position (${num(px(64))}, 0); size (${num(px(12))}, ${VH * SCALE}); fill #3e3a36; };`,
    `  rectangle crack { position (${num(px(28))}, ${num(px(36))}); size (${num(px(8))}, ${num(px(22))}); fill #514c46; };`,
    `};`,
    emitTrack("far.position.x", samples(cast, (tick) => px(offsetOf(0.25, cast.camX[tick] ?? 0, cam0)))),
    emitTrack("mid.position.x", samples(cast, (tick) => px(offsetOf(0.5, cast.camX[tick] ?? 0, cam0)))),
    emitTrack("near.position.x", samples(cast, (tick) => px(offsetOf(1.125, cast.camX[tick] ?? 0, cam0)))),
    emitTrack("actors.pip.position.x", samples(cast, (tick) => px(cast.pipX[tick] ?? 0))),
    emitTrack("actors.pip.position.y", samples(cast, (tick) => px(cast.pipY[tick] ?? 0))),
    emitTrack("actors.bug.position.x", samples(cast, (tick) => px(cast.bugX[tick] ?? 0))),
    emitTrack(
      "actors.bug.scale.x",
      samples(cast, (tick) => cast.bugFace[tick] ?? 1),
    ),
    emitTrack("actors.shadow.position.x", samples(cast, (tick) => px((cast.pipX[tick] ?? 0) - 5))),
    emitTrack("actors.shadow.position.y", samples(cast, (tick) => px(surfaceAt(tick) - 1))),
    emitOpacity("actors.shadow.opacity", (tick) => Boolean(cast.grounded[tick])),
    ...pipTracks.map((track) => track.replaceAll("body.", "actors.pip.body.").replaceAll("scarf", "actors.pip.scarf").replaceAll("leg", "actors.pip.leg").replaceAll("crouch", "actors.pip.crouch").replaceAll("rise.", "actors.pip.rise.").replaceAll("tuck.", "actors.pip.tuck.").replaceAll("fall.", "actors.pip.fall.").replaceAll("land.", "actors.pip.land.").replaceAll("half.", "actors.pip.half.").replaceAll("brake", "actors.pip.brake").replaceAll("cheer.", "actors.pip.cheer.").replaceAll("lean.", "actors.pip.lean.")),
    ...bugTracks.map((track) => track.replaceAll("shell.", "actors.bug.shell.").replaceAll("w0.", "actors.bug.w0.").replaceAll("w1.", "actors.bug.w1.").replaceAll("w2.", "actors.bug.w2.").replaceAll("w3.", "actors.bug.w3.").replaceAll("turn.", "actors.bug.turn.")),
    ...coinTracks,
    ...sparkTracks,
    ...flagTracks.map((track) => track.replaceAll("flag", "stage.flag")),
    ...dustTracks,
    ...burstTracks,
    emitTrack("veil.position.x", veilX),
    emitTrack("camera(main).position.x", samples(cast, (tick) => px(cast.camX[tick] ?? 0))),
    emitTrack("camera(main).position.y", samples(cast, (tick) => px(cast.camY[tick] ?? 0))),
    `complete;`,
    ``,
  ];
  return lines.filter((line) => line !== "").join("\n") + "\n";
}

function paint(color: { type: string; r?: number; g?: number; b?: number; a?: number } | undefined): string {
  if (!color || color.type !== "solid" || color.r === undefined || color.g === undefined || color.b === undefined || color.a === undefined) {
    return "#ffffff";
  }
  return cssColor(color as SolidColor);
}

function drawItem(item: ResolvedDrawItem): string {
  if (item.opacity <= 0.004) return "";
  const matrix = item.logicalMatrix;
  const transform = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const fill = item.appearance.fill?.type === "solid" ? paint(item.appearance.fill) : "none";
  const geometry = item.geometry;
  if (geometry.kind === "rectangle") {
    return `<rect x="0" y="0" width="${geometry.size.x}" height="${geometry.size.y}" transform="${transform}" fill="${fill}" opacity="${item.opacity.toFixed(3)}"/>`;
  }
  return "";
}

function sheet(runtime: AnimationRuntime, times: number[]): string {
  const columns = 4;
  const scale = 0.28;
  const cellW = VW * SCALE * scale;
  const cellH = VH * SCALE * scale;
  const rows = Math.ceil(times.length / columns);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(columns * cellW)}" height="${Math.ceil(rows * cellH)}" shape-rendering="crispEdges">`,
  ];
  times.forEach((time, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const frame = runtime.evaluate(time);
    parts.push(
      `<g transform="translate(${column * cellW} ${row * cellH}) scale(${scale})"><rect width="${VW * SCALE}" height="${VH * SCALE}" fill="#7ec8f8"/>${frame.drawItems.map(drawItem).join("")}<text x="16" y="36" fill="#102028" font-size="28" font-family="sans-serif">${(time / 1000).toFixed(2)}s</text></g>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
}

function main(): void {
  const cast = simulate();
  const source = buildSource(cast);
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "copperleaf-run.ms");
  writeFileSync(outPath, source);
  console.log(`wrote ${outPath} (${source.length} bytes)`);
  const compiled = compileMotionScript(source);
  if (!compiled.ok || !compiled.scene) {
    console.error(compiled.diagnostics.map((item) => `${item.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((item) => item.message).join("\n"));
    process.exit(1);
  }
  const scene = compiled.scene;
  console.log(`nodes ${scene.nodes.length} tracks ${scene.timeline.tracks.length} steps ${scene.timeline.steps.length}`);
  if (scene.nodes.length > 500 || scene.timeline.tracks.length > 1000) {
    console.error("over budget");
    process.exit(1);
  }
  const runtime = new AnimationRuntime(scene);
  const at = (seconds: number) => runtime.evaluate(Math.round(seconds * 1000));
  const pipNode = (seconds: number) => {
    const tick = Math.round(seconds * FPS);
    return { x: cast.pipX[tick], y: cast.pipY[tick], pose: cast.pose[tick], bug: cast.bugX[tick] };
  };
  const beats = [0, 1, 2, 5.3, 6.2, 7.2, 10.5, 12.3, 13.2, 15, 16.7, 17.2, 18.8, 21, 22, 25, 27.5, 29, 30];
  for (const time of beats) {
    const tick = Math.min(LAST, Math.round(time * FPS));
    const screen = (cast.pipX[tick] ?? 0) - (cast.camX[tick] ?? 0) + VW / 2;
    const bugScreen = (cast.bugX[tick] ?? 0) - (cast.camX[tick] ?? 0) + VW / 2;
    console.log(
      `t=${time.toFixed(1)} pip ${cast.pipX[tick]},${cast.pipY[tick]} ${cast.pose[tick]} screen ${screen} bug ${cast.bugX[tick]} (${bugScreen.toFixed(0)}) ${cast.bugPose[tick]} cam ${cast.camX[tick]},${cast.camY[tick]}`,
    );
  }
  const hold = at(0.025);
  const first = at(0);
  const moved = at(0.05);
  const pip0 = first.drawItems.find((item) => item.nodeId.startsWith("actors.pip."));
  const pipHold = hold.drawItems.find((item) => item.nodeId === pip0?.nodeId);
  const pipNext = moved.drawItems.find((item) => item.nodeId === pip0?.nodeId);
  if (!pip0 || !pipHold || !pipNext) {
    console.error("missing pip draw");
    process.exit(1);
  }
  if (Math.abs((pipHold.logicalMatrix[6] ?? 0) - (pip0.logicalMatrix[6] ?? 0)) > 0.1) {
    console.error("hold eased between pixels");
    process.exit(1);
  }
  if (Math.abs((pipNext.logicalMatrix[6] ?? 0) - (pip0.logicalMatrix[6] ?? 0)) < 1) {
    console.error("expected a pixel step at 50ms");
    process.exit(1);
  }
  const story = pipNode(12.3);
  if ((story.y ?? 0) > BROAD - 20) console.error(`apex too low ${story.y}`);
  if (Math.abs((story.x ?? 0) - (story.bug ?? 0)) > 10) console.error(`beetle missed the apex by ${(story.x ?? 0) - (story.bug ?? 0)}`);
  if ((cast.pipY[144] ?? 0) !== GROUND) console.error(`landing y ${cast.pipY[144]}`);
  if ((cast.pipY[334] ?? 0) !== MID) console.error(`stone y ${cast.pipY[334]}`);
  if ((cast.pipY[376] ?? 0) !== GROUND) console.error(`far ledge y ${cast.pipY[376]}`);
  if (cast.pose[LAST] !== "run0") console.error(`ending pose ${cast.pose[LAST]}`);
  const preview = resolve("/tmp/copperleaf-preview");
  mkdirSync(preview, { recursive: true });
  const moments = [0.4, 1.2, 2, 3, 5.1, 5.4, 6.2, 7.2, 7.5, 10.5, 12.3, 13.2, 15, 16.7, 17.2, 18.8, 21, 22.2, 26.6, 27.5, 29, 30];
  const svgPath = resolve(preview, "sheet.svg");
  writeFileSync(svgPath, sheet(runtime, moments.map((time) => Math.round(time * 1000))));
  for (const time of [2, 6.2, 7.2, 12.3, 16.7, 22.2, 27.5, 30]) {
    const frame = runtime.evaluate(Math.round(time * 1000));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VW * SCALE}" height="${VH * SCALE}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#7ec8f8"/>${frame.drawItems.map(drawItem).join("")}</svg>`;
    writeFileSync(resolve(preview, `f${time.toFixed(1)}.svg`), svg);
  }
  console.log(`preview ${svgPath}`);
  try {
    execFileSync("qlmanage", ["-t", "-s", "1400", "-o", preview, svgPath], { stdio: "ignore" });
  } catch {
    console.log("qlmanage preview skipped");
  }
}

main();
