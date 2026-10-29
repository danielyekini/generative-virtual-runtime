/**
 * Builds fixtures/motionscript/stories/into-the-moons-shadow.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-into-the-moons-shadow.ts
 *
 * One moon path drives both plates. The sky disc is placed from the observer's
 * depth in the shadow, so the limbs agree with the footprint:
 * first contact on the sun's left limb, totality while the larger disc drifts
 * across it, and final contact on the right limb. The bright sliver at the end
 * of totality returns on the left limb — the limb first contact touched —
 * because a larger disc traveling one way uncovers that side first.
 * MotionScript has no audio. The score is recorded in the program header.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR, type ResolvedDrawItem } from "@gvr/schema";

const DURATION = 40;
const BAR = 36;
const SPLIT = 438;
const AIM_Y = (BAR + SPLIT) / 2;

const SUN = { x: 130, y: 330, r: 90 };
const MOON_X = 600;
const MOON_R = 52;
const EARTH = { x: 880, y: 330, r: 150 };
const OBS = { x: EARTH.x - EARTH.r, y: EARTH.y };

const SKY_X = 640;
const SKY_Y = 626;
const SKY_R = 60;
const SKY_M = 84;
const SKY_INK = "#12161c";

const WIDE_X = 620;
const SETTLED_X = 690;
const Z_WIDE = 0.7;
const Z_SETTLED = 0.8;
const Z_CLOSE = 2.32;
const Z_NESTED = 1.4;

type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
type Key = { t: number; v: number; ease?: Ease };
type Pt = { x: number; y: number };
type Ray = { sun: Pt; moon: Pt; far: Pt };
type Shadow = {
  moon: Pt;
  tip: Pt;
  umbraHi: Ray;
  umbraLo: Ray;
  penHi: Ray;
  penLo: Ray;
  penLoY: number;
  penHiY: number;
  umbLoY: number;
  umbHiY: number;
};

function fail(message: string): never {
  throw new Error(message);
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function num(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}

function pct(seconds: number): string {
  if (seconds <= 0) return "0%";
  if (seconds >= DURATION) return "100%";
  const text = ((seconds / DURATION) * 100).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

function pair(p: Pt): string {
  return `(${num(p.x)}, ${num(p.y)})`;
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(a: Pt, scale: number): Pt {
  return { x: a.x * scale, y: a.y * scale };
}

function dot(a: Pt, b: Pt): number {
  return a.x * b.x + a.y * b.y;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function smoothstep(t0: number, t1: number, t: number): number {
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  return u * u * (3 - 2 * u);
}

function side(a: Pt, b: Pt, p: Pt): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function yAtX(a: Pt, b: Pt, x: number): number {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-6) fail("a shadow boundary is vertical");
  return a.y + ((x - a.x) / dx) * (b.y - a.y);
}

function extendToX(from: Pt, through: Pt, x: number): Pt {
  const dx = through.x - from.x;
  if (Math.abs(dx) < 1e-6) fail("cannot extend a vertical ray");
  const t = (x - from.x) / dx;
  if (t <= 1) fail("shadow ray does not travel toward Earth");
  return { x, y: from.y + t * (through.y - from.y) };
}

function tangents(internal: boolean, moon: Pt): { sun: Pt; moon: Pt }[] {
  const dx = moon.x - SUN.x;
  const dy = moon.y - SUN.y;
  const dist = Math.hypot(dx, dy);
  const ux = dx / dist;
  const uy = dy / dist;
  const px = -uy;
  const py = ux;
  const cos = internal ? (SUN.r + MOON_R) / dist : (SUN.r - MOON_R) / dist;
  if (cos * cos > 1) fail("shadow tangents are not real");
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  const rays: { sun: Pt; moon: Pt }[] = [];
  for (const sign of [1, -1]) {
    const nx = ux * cos + px * sign * sin;
    const ny = uy * cos + py * sign * sin;
    const sun = { x: SUN.x + SUN.r * nx, y: SUN.y + SUN.r * ny };
    const limb = internal
      ? { x: moon.x - MOON_R * nx, y: moon.y - MOON_R * ny }
      : { x: moon.x + MOON_R * nx, y: moon.y + MOON_R * ny };
    rays.push({ sun, moon: limb });
  }
  return rays;
}

function lineMeet(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const ab = sub(b, a);
  const cd = sub(d, c);
  const cross = ab.x * cd.y - ab.y * cd.x;
  if (Math.abs(cross) < 1e-6) fail("umbra boundaries do not meet");
  const t = ((c.x - a.x) * cd.y - (c.y - a.y) * cd.x) / cross;
  return add(a, mul(ab, t));
}

function shadow(moonY: number): Shadow {
  const moon = { x: MOON_X, y: moonY };
  // The Sun is the larger disc, so the direct tangents converge beyond the Moon.
  // That narrowing cone is the umbra. The crossing tangents diverge and bound the penumbra.
  const direct = tangents(false, moon).sort((a, b) => a.moon.y - b.moon.y);
  const crossing = tangents(true, moon).sort((a, b) => a.moon.y - b.moon.y);
  const upper = direct[0]!;
  const lower = direct[1]!;
  const tip = lineMeet(upper.sun, upper.moon, lower.sun, lower.moon);
  if (tip.x <= moon.x) fail("umbra tip fell on the sun side of the moon");
  const clipX = tip.x + 420;
  const ray = (item: { sun: Pt; moon: Pt }, farX: number): Ray => ({
    sun: item.sun,
    moon: item.moon,
    far: extendToX(item.sun, item.moon, farX),
  });
  const umbraHi = ray(upper, tip.x);
  const umbraLo = ray(lower, tip.x);
  const penHi = ray(crossing[0]!, clipX);
  const penLo = ray(crossing[1]!, clipX);
  const penYs = [yAtX(penHi.sun, penHi.moon, OBS.x), yAtX(penLo.sun, penLo.moon, OBS.x)].sort((a, b) => a - b);
  const umbYs = [yAtX(umbraHi.sun, umbraHi.moon, OBS.x), yAtX(umbraLo.sun, umbraLo.moon, OBS.x)].sort((a, b) => a - b);
  return {
    moon,
    tip,
    umbraHi,
    umbraLo,
    penHi,
    penLo,
    penLoY: penYs[0]!,
    penHiY: penYs[1]!,
    umbLoY: umbYs[0]!,
    umbHiY: umbYs[1]!,
  };
}

function along(moon: Pt, tip: Pt, p: Pt): number {
  const axis = sub(tip, moon);
  const den = dot(axis, axis) || 1;
  return dot(sub(p, moon), axis) / den;
}

function sameSide(a: Pt, b: Pt, p: Pt, ref: Pt): boolean {
  return side(a, b, p) * side(a, b, ref) >= -1e-4;
}

function inUmbra(p: Pt, g: Shadow): boolean {
  const ref = add(g.moon, mul(sub(g.tip, g.moon), 0.35));
  const t = along(g.moon, g.tip, p);
  return t > 0.04 && t < 0.992 && sameSide(g.umbraHi.moon, g.tip, p, ref) && sameSide(g.umbraLo.moon, g.tip, p, ref);
}

function inPenumbra(p: Pt, g: Shadow): boolean {
  const ref = add(g.moon, mul(sub(g.tip, g.moon), 0.35));
  const t = along(g.moon, g.tip, p);
  return t > 0.04 && sameSide(g.penHi.moon, g.penHi.far, p, ref) && sameSide(g.penLo.moon, g.penLo.far, p, ref);
}

function umbraHitsEarth(moonY: number): boolean {
  const g = shadow(moonY);
  for (let i = 0; i < 120; i += 1) {
    const angle = (i / 120) * Math.PI * 2;
    const p = { x: EARTH.x + Math.cos(angle) * EARTH.r, y: EARTH.y + Math.sin(angle) * EARTH.r };
    if (inUmbra(p, g)) return true;
  }
  return false;
}

function solveEdge(kind: "pen" | "umb", which: "hi" | "lo"): number {
  const read = (moonY: number) => {
    const g = shadow(moonY);
    if (kind === "pen") return which === "hi" ? g.penHiY : g.penLoY;
    return which === "hi" ? g.umbHiY : g.umbLoY;
  };
  let lo = SUN.y - 220;
  let hi = SUN.y + 220;
  const flo = read(lo) - OBS.y;
  const fhi = read(hi) - OBS.y;
  if (flo > 0 || fhi < 0) fail(`${kind} ${which} edge is not crossed (${num(flo)} … ${num(fhi)})`);
  for (let i = 0; i < 56; i += 1) {
    const mid = (lo + hi) / 2;
    if (read(mid) < OBS.y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function solveTouch(): number {
  let lo = SUN.y - 220;
  let hi = SUN.y;
  if (umbraHitsEarth(lo)) fail("umbra already meets Earth at the search start");
  if (!umbraHitsEarth(hi)) fail("aligned umbra misses Earth");
  for (let i = 0; i < 56; i += 1) {
    const mid = (lo + hi) / 2;
    if (umbraHitsEarth(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

function distToLine(p: Pt, a: Pt, b: Pt): number {
  const d = sub(b, a);
  const len = Math.hypot(d.x, d.y) || 1;
  return Math.abs(d.x * (p.y - a.y) - d.y * (p.x - a.x)) / len;
}

function skyOffset(g: Shadow): number {
  const { penLoY, penHiY, umbLoY, umbHiY } = g;
  const obs = OBS.y;
  if (!(penLoY < umbLoY && umbLoY < umbHiY && umbHiY < penHiY)) fail("shadow edges crossed");
  if (obs >= penHiY) return -(SKY_R + SKY_M) + (2 * SKY_R * (penHiY - obs)) / (penHiY - umbHiY);
  if (obs >= umbHiY) return -(SKY_R + SKY_M) + (2 * SKY_R * (penHiY - obs)) / (penHiY - umbHiY);
  if (obs >= umbLoY) return -(SKY_M - SKY_R) + (2 * (SKY_M - SKY_R) * (umbHiY - obs)) / (umbHiY - umbLoY);
  if (obs >= penLoY) return SKY_M - SKY_R + (2 * SKY_R * (umbLoY - obs)) / (umbLoY - penLoY);
  return SKY_M - SKY_R + (2 * SKY_R * (umbLoY - obs)) / (umbLoY - penLoY);
}

function monotone(xs: number[], ys: number[]): (t: number) => number {
  const n = xs.length;
  const secant: number[] = [];
  for (let i = 0; i < n - 1; i += 1) secant.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const slope = secant.map((value, i) => {
    if (i === 0) return value;
    const prev = secant[i - 1]!;
    if (prev * value <= 0) return 0;
    return (prev + value) / 2;
  });
  slope.push(secant[n - 2]!);
  for (let i = 0; i < n - 1; i += 1) {
    const span = secant[i]!;
    if (Math.abs(span) < 1e-9) {
      slope[i] = 0;
      slope[i + 1] = 0;
      continue;
    }
    const a = slope[i]! / span;
    const b = slope[i + 1]! / span;
    const sum = a * a + b * b;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      slope[i] = scale * a * span;
      slope[i + 1] = scale * b * span;
    }
  }
  slope[n - 1] = 0;
  return (t: number) => {
    if (t <= xs[0]!) return ys[0]!;
    if (t >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (i < n - 2 && xs[i + 1]! < t) i += 1;
    const h = xs[i + 1]! - xs[i]!;
    const u = (t - xs[i]!) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i]! +
      (u3 - 2 * u2 + u) * h * slope[i]! +
      (-2 * u3 + 3 * u2) * ys[i + 1]! +
      (u3 - u2) * h * slope[i + 1]!
    );
  };
}

const yTouch = solveTouch();
const yC1 = solveEdge("pen", "hi");
const yC2 = solveEdge("umb", "hi");
const yC3 = solveEdge("umb", "lo");
const yC4 = solveEdge("pen", "lo");
const y0 = Math.min(yTouch - 28, SUN.y - 48);

const moonPath = monotone(
  [0, 6.5, 11, 21, 26, 31, 38],
  [y0, yTouch, yC1, yC2, SUN.y, yC3, yC4],
);

function moonY(t: number): number {
  return t >= 38 ? yC4 : moonPath(t);
}

function focusX(t: number): number {
  if (t < 5) return WIDE_X;
  if (t < 10) return lerp(WIDE_X, SETTLED_X, smoothstep(5, 10, t));
  if (t < 13.2) return SETTLED_X;
  if (t < 18) return lerp(SETTLED_X, OBS.x, smoothstep(13.2, 18, t));
  if (t < 33) return OBS.x;
  if (t < 38) return lerp(OBS.x, WIDE_X, smoothstep(33, 38, t));
  return WIDE_X;
}

function zoomAt(t: number): number {
  if (t < 5) return lerp(Z_WIDE, 0.76, smoothstep(0, 5, t));
  if (t < 10) return lerp(0.76, Z_SETTLED, smoothstep(5, 10, t));
  if (t < 13.2) return Z_SETTLED;
  if (t < 18) return lerp(Z_SETTLED, Z_CLOSE, smoothstep(13.2, 18, t));
  if (t < 25) return Z_CLOSE;
  if (t < 30) return lerp(Z_CLOSE, Z_NESTED, smoothstep(25, 30, t));
  if (t < 33) return Z_NESTED;
  if (t < 38) return lerp(Z_NESTED, Z_WIDE, smoothstep(33, 38, t));
  return Z_WIDE;
}

function cameraAt(t: number): { x: number; y: number; zoom: number } {
  const zoom = zoomAt(t);
  return {
    x: focusX(t),
    y: SUN.y + (360 - AIM_Y) / zoom,
    zoom,
  };
}

function screenOf(world: Pt, t: number): Pt {
  const cam = cameraAt(t);
  return {
    x: 640 + (world.x - cam.x) * cam.zoom,
    y: 360 + (world.y - cam.y) * cam.zoom,
  };
}

function skyM(t: number): number {
  return skyOffset(shadow(moonY(t)));
}

function checkModel(): void {
  const aligned = shadow(SUN.y);
  if (!inUmbra(OBS, aligned)) fail("aligned umbra misses the observer");
  if (aligned.tip.x < EARTH.x + EARTH.r + 40) fail("umbra tip does not clear Earth");
  for (const ray of [aligned.umbraHi, aligned.umbraLo, aligned.penHi, aligned.penLo]) {
    const radial = sub(ray.sun, SUN);
    const dir = sub(ray.moon, ray.sun);
    if (Math.abs(dot(radial, dir)) > 1.5) fail("sun tangent is not perpendicular");
    if (Math.abs(Math.hypot(radial.x, radial.y) - SUN.r) > 0.4) fail("sun tangent missed the limb");
  }
  if (!(y0 < yTouch && yTouch < yC1 && yC1 < yC2 && yC2 < SUN.y && SUN.y < yC3 && yC3 < yC4)) {
    fail(
      `moon knots are out of order ${[y0, yTouch, yC1, yC2, SUN.y, yC3, yC4].map((value) => num(value)).join(" < ")}`,
    );
  }
  const touch = shadow(yTouch);
  if (inPenumbra(OBS, touch)) fail("observer is already inside the penumbra when the umbra first meets Earth");
  if (distToLine(OBS, shadow(yC1).penHi.sun, shadow(yC1).penHi.far) > 0.35 && distToLine(OBS, shadow(yC1).penLo.sun, shadow(yC1).penLo.far) > 0.35) {
    fail("first penumbral contact missed the observer");
  }
  if (inUmbra(OBS, shadow(yC1))) fail("observer is inside the umbra at first penumbral contact");
  if (Math.abs(skyM(11) + SKY_R + SKY_M) > 0.6) fail(`sky first contact offset ${num(skyM(11))}`);
  if (Math.abs(skyM(21) + (SKY_M - SKY_R)) > 0.6) fail(`sky second contact offset ${num(skyM(21))}`);
  if (Math.abs(skyM(26)) > 1.25) fail(`mid-totality sky offset ${num(skyM(26))}`);
  if (Math.abs(skyM(31) - (SKY_M - SKY_R)) > 0.6) fail(`sky third contact offset ${num(skyM(31))}`);
  if (Math.abs(skyM(38) - (SKY_R + SKY_M)) > 0.6) fail(`sky fourth contact offset ${num(skyM(38))}`);
  let previous = moonY(0);
  let previousSky = skyM(0);
  let slowest = Infinity;
  for (let t = 0.25; t <= 40; t += 0.25) {
    const y = moonY(t);
    const m = skyM(t);
    if (y < previous - 1e-3) fail(`moon reversed at ${t}`);
    if (m < previousSky - 1e-3) fail(`sky moon reversed at ${t}`);
    if (t <= 30) slowest = Math.min(slowest, (y - previous) / 0.25);
    previous = y;
    previousSky = m;
  }
  if (slowest < 0.35) fail(`moon nearly stalls at ${num(slowest)} px/s`);
  const opening = [SUN, { x: MOON_X, y: moonY(0) }, EARTH];
  for (const time of [0, 10, 40]) {
    for (const body of time === 40 ? [SUN, { x: MOON_X, y: moonY(40) }, EARTH] : opening) {
      const radius = body === SUN ? SUN.r : body.x === MOON_X ? MOON_R : EARTH.r;
      const center = screenOf(body, time);
      const zoom = zoomAt(time);
      if (center.x - radius * zoom < 8 || center.x + radius * zoom > 1272) fail(`body x leaves the plate at ${time}s`);
      if (center.y - radius * zoom < BAR + 4 || center.y + radius * zoom > SPLIT - 8) fail(`body y leaves the upper plate at ${time}s`);
    }
    if (Math.abs(screenOf(OBS, time).y - AIM_Y) > 0.6) fail("observer left the alignment line");
  }
  const show = shadow(moonY(8));
  const tipScreen = screenOf(show.tip, 8);
  if (show.tip.x < EARTH.x + EARTH.r + 24) fail("umbra tip does not clear Earth while the cone is revealed");
  if (tipScreen.x < 40 || tipScreen.x > 1264 || tipScreen.y < BAR + 4 || tipScreen.y > SPLIT - 8) {
    fail(`tip is off the plate at 8s (${num(tipScreen.x)}, ${num(tipScreen.y)})`);
  }
}

function times(): number[] {
  const out: number[] = [];
  for (let i = 0; i <= DURATION * 2; i += 1) out.push(i / 2);
  return out;
}

function trackNum(target: string, valueAt: (t: number) => number): string {
  const body = times()
    .map((t) => `  ${pct(t)} ${num(valueAt(t))};`)
    .join("\n");
  return `keyframes ${target} {\n  start 0s;\n  duration 40s;\n${body}\n};\n`;
}

function pathBody(points: Pt[], closed: boolean): string {
  const [first, ...rest] = points;
  if (!first) fail("empty path");
  const cmds = [`move ${pair(first)};`, ...rest.map((point) => `line ${pair(point)};`)];
  if (closed) cmds.push("close;");
  return cmds.join(" ");
}

function trackPath(target: string, bodyAt: (t: number) => string): string {
  const body = times()
    .map((t) => `  ${pct(t)} path { ${bodyAt(t)} };`)
    .join("\n");
  return `keyframes ${target} {\n  start 0s;\n  duration 40s;\n${body}\n};\n`;
}

function trackKeys(target: string, keys: Key[], note?: string): string {
  const body = keys
    .map((key, index) => {
      const ease = index < keys.length - 1 && key.ease && key.ease !== "linear" ? ` ease ${key.ease}` : "";
      return `  ${pct(key.t)} ${num(key.v)}${ease};`;
    })
    .join("\n");
  const banner = note ? `// ${note}\n` : "";
  return `${banner}keyframes ${target} {\n  start 0s;\n  duration 40s;\n${body}\n};\n`;
}

const CLIP_X = EARTH.x + EARTH.r + 36;

function umbraBody(t: number): string {
  const g = shadow(moonY(t));
  return pathBody([g.umbraHi.moon, g.tip, g.umbraLo.moon], true);
}

function penumbraBody(t: number): string {
  const g = shadow(moonY(t));
  return pathBody([g.penHi.moon, g.penHi.far, g.penLo.far, g.penLo.moon], true);
}

function umbraInsetBody(t: number): string {
  const g = shadow(moonY(t));
  return pathBody(
    [g.umbraHi.moon, extendToX(g.umbraHi.sun, g.umbraHi.moon, CLIP_X), extendToX(g.umbraLo.sun, g.umbraLo.moon, CLIP_X), g.umbraLo.moon],
    true,
  );
}

function penumbraInsetBody(t: number): string {
  const g = shadow(moonY(t));
  return pathBody(
    [g.penHi.moon, extendToX(g.penHi.sun, g.penHi.moon, CLIP_X), extendToX(g.penLo.sun, g.penLo.moon, CLIP_X), g.penLo.moon],
    true,
  );
}

function rayBody(t: number, which: "umbraHi" | "umbraLo" | "penHi" | "penLo", clip: boolean): string {
  const g = shadow(moonY(t));
  const ray = g[which];
  const far = clip ? extendToX(ray.sun, ray.moon, CLIP_X) : ray.far;
  return pathBody([ray.sun, far], false);
}

function labelUmbra(t: number): Pt {
  const g = shadow(moonY(t));
  const x = EARTH.x - 6;
  const hi = yAtX(g.umbraHi.moon, g.tip, x);
  const lo = yAtX(g.umbraLo.moon, g.tip, x);
  return { x, y: (hi + lo) / 2 };
}

function labelPenumbra(t: number): Pt {
  const g = shadow(moonY(t));
  const x = EARTH.x + EARTH.r * 0.28;
  const hi = yAtX(g.umbraLo.moon, g.tip, x);
  const lo = yAtX(g.penLo.sun, g.penLo.far, x);
  return { x, y: (hi + lo) / 2 };
}

function labelTrack(t: number): Pt {
  return screenOf({ x: OBS.x + 58, y: OBS.y - 30 }, t);
}

const TRACK = `move (${num(OBS.x + 18)}, ${num(EARTH.y - 48)}); line (${num(OBS.x + 18)}, ${num(EARTH.y + 52)});`;

function system(labels: boolean, coneOpacity: number, rayWidth: number, clip: boolean): string {
  const label = (content: string, x: number, y: number, size: number, align: "center" | "right") =>
    labels
      ? `text name {
      content "${content}";
      fontFamily "sans";
      fontSize ${size};
      fontWeight 600;
      align ${align};
      baseline bottom;
      fill #f4efe4;
      position (${num(x)}, ${num(y)});
      opacity 0;
    };`
      : "";
  return `group earth {
    position ${pair({ x: EARTH.x, y: EARTH.y })};
    zIndex 1;
    circle air {
      radius ${EARTH.r + 11};
      fill radial (0, 0) ${EARTH.r + 11} 0 #8ec8ee00 0.78 #8ec8ee00 0.9 #b7ddf240 1 #b7ddf200;
    };
    circle disc {
      radius ${EARTH.r};
      fill radial (-40, -6) ${EARTH.r + 28} 0 #c5e4f6 0.42 #3f86be 1 #142c48;
      stroke #d7ebf6 width 1.4;
    };
    ellipse landA { position (-40, -22); size (58, 32); fill #2f6d5888; };
    ellipse landB { position (-16, 34); size (44, 26); fill #3d7c6280; };
    ellipse landC { position (6, 4); size (24, 16); fill #24544666; };
    ${label("Earth", 0, -(EARTH.r + 18), 26, "center")}
  };
  path penumbra {
    opacity ${coneOpacity};
    zIndex 2;
    fill #9eb4cc47;
    ${clip ? penumbraInsetBody(0) : penumbraBody(0)}
  };
  path umbra {
    opacity ${coneOpacity};
    zIndex 3;
    fill #0c1424d4;
    ${clip ? umbraInsetBody(0) : umbraBody(0)}
  };
  path rayPenHi {
    zIndex 4;
    stroke #e7dcc488 width ${rayWidth} cap round;
    ${rayBody(0, "penHi", clip)}
  };
  path rayPenLo {
    zIndex 4;
    stroke #e7dcc488 width ${rayWidth} cap round;
    ${rayBody(0, "penLo", clip)}
  };
  path rayUmbraHi {
    zIndex 4;
    stroke #fff6e2cc width ${rayWidth} cap round;
    ${rayBody(0, "umbraHi", clip)}
  };
  path rayUmbraLo {
    zIndex 4;
    stroke #fff6e2cc width ${rayWidth} cap round;
    ${rayBody(0, "umbraLo", clip)}
  };
  group sun {
    position ${pair(SUN)};
    zIndex 5;
    ellipse glow {
      size (230, 230);
      fill radial (0, 0) 115 0 #f8e7c066 1 #f8e7c000;
    };
    circle disc {
      radius ${SUN.r};
      fill radial (-16, -12) ${SUN.r + 8} 0 #fff9ef 0.58 #f4d7a6 1 #e2b56c;
    };
    ${label("Sun", 0, -(SUN.r + 18), 26, "center")}
  };
  group moon {
    position (${num(MOON_X)}, ${num(moonY(0))});
    zIndex 6;
    circle disc {
      radius ${MOON_R};
      fill radial (-8, -7) ${MOON_R + 4} 0 #d5dde4 0.62 #7e8994 1 #3c4450;
      stroke #2a3138 width 1.2;
    };
    ${label("Moon", 0, -(MOON_R + 16), 26, "center")}
  };
  path track {
    zIndex 7;
    opacity 0;
    stroke #f0c56e width 3.6 cap round;
    ${TRACK}
  };
  group watcher {
    position ${pair(OBS)};
    zIndex 8;
    circle halo {
      radius 13;
      fill #ef7a3200;
      stroke #ef7a32 width 1.6;
      opacity 0;
    };
    circle dot {
      radius 5.4;
      fill #ef7a32;
      stroke #ffd3ae width 1.5;
    };
    ${label("Observer", 16, 2, 18, "left")}
  };`;
}

function insetFrame(): { x: number; y: number; w: number; h: number; gx: number; gy: number; scale: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const consider = (p: Pt) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };
  for (const t of times()) {
    if (t < 14 || t > 36) continue;
    const g = shadow(moonY(t));
    consider(SUN);
    consider(g.moon);
    consider({ x: EARTH.x, y: EARTH.y });
    consider(OBS);
    consider(extendToX(g.umbraHi.sun, g.umbraHi.moon, CLIP_X));
    consider(extendToX(g.umbraLo.sun, g.umbraLo.moon, CLIP_X));
    consider(extendToX(g.penHi.sun, g.penHi.moon, CLIP_X));
    consider(extendToX(g.penLo.sun, g.penLo.moon, CLIP_X));
  }
  minX -= SUN.r + 24;
  maxX += 24;
  minY -= EARTH.r + 36;
  maxY += EARTH.r + 28;
  const scale = Math.min(292 / (maxX - minX), 148 / (maxY - minY));
  const pad = 8;
  const w = (maxX - minX) * scale + pad * 2;
  const h = (maxY - minY) * scale + pad * 2;
  const x = 1280 - 18 - w;
  const y = BAR + 10;
  return { x, y, w, h, gx: x + pad - minX * scale, gy: y + pad - minY * scale, scale };
}

const inset = insetFrame();

function opacityBundle(): string {
  const body = (from: number, to: number): Key[] => [
    { t: 0, v: 0, ease: "hold" },
    { t: from, v: 0, ease: "easeOut" },
    { t: to, v: 1, ease: "hold" },
    { t: 6.6, v: 1, ease: "easeIn" },
    { t: 7.6, v: 0, ease: "hold" },
    { t: 35.2, v: 0, ease: "easeOut" },
    { t: 36.6, v: 1, ease: "hold" },
    { t: 40, v: 1 },
  ];
  return [
    trackKeys("orbit.sun.name.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 0.2, v: 0, ease: "easeOut" },
      ...body(0.2, 1.05).slice(2),
    ], "Sun, then Moon, then Earth. The relationship holds through 0:05."),
    trackKeys("orbit.moon.name.opacity", body(1.15, 2.0)),
    trackKeys("orbit.earth.name.opacity", body(2.15, 3.0)),
    trackKeys("orbit.watcher.name.opacity", body(2.15, 3.0)),
    trackKeys("orbit.umbraTag.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 7.7, v: 0, ease: "easeOut" },
      { t: 9.2, v: 1, ease: "hold" },
      { t: 13.5, v: 1, ease: "easeIn" },
      { t: 14.6, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("orbit.penumbraTag.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 8.0, v: 0, ease: "easeOut" },
      { t: 9.5, v: 1, ease: "hold" },
      { t: 13.5, v: 1, ease: "easeIn" },
      { t: 14.6, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("orbit.penumbra.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 7.2, v: 0, ease: "easeOut" },
      { t: 8.8, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ], "Rays finish drawing, then the translucent fills."),
    trackKeys("orbit.umbra.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 7.6, v: 0, ease: "easeOut" },
      { t: 9.3, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
    trackKeys("orbit.watcher.halo.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 0.35, v: 0, ease: "easeOut" },
      { t: 1.5, v: 1, ease: "easeInOut" },
      { t: 4.6, v: 0.42, ease: "hold" },
      { t: 40, v: 0.42 },
    ]),
    trackKeys("orbit.track.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 15.2, v: 0, ease: "easeOut" },
      { t: 16.8, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
    trackKeys("insetRoot.diagram.track.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 15.2, v: 0, ease: "easeOut" },
      { t: 16.8, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
    trackKeys("orbit.track.trim.end", [
      { t: 0, v: 0, ease: "hold" },
      { t: 15.4, v: 0, ease: "linear" },
      { t: 18, v: 0.32, ease: "linear" },
      { t: 21, v: 0.5, ease: "linear" },
      { t: 31, v: 0.86, ease: "easeOut" },
      { t: 36, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
    trackKeys("insetRoot.diagram.track.trim.end", [
      { t: 0, v: 0, ease: "hold" },
      { t: 15.4, v: 0, ease: "linear" },
      { t: 18, v: 0.32, ease: "linear" },
      { t: 21, v: 0.5, ease: "linear" },
      { t: 31, v: 0.86, ease: "easeOut" },
      { t: 36, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
    ...(["rayPenHi", "rayPenLo", "rayUmbraHi", "rayUmbraLo"] as const).map((id) =>
      trackKeys(`orbit.${id}.trim.end`, [
        { t: 0, v: 0, ease: "hold" },
        { t: 5, v: 0, ease: "easeInOut" },
        { t: 7.35, v: 1, ease: "hold" },
        { t: 40, v: 1 },
      ], id === "rayPenHi" ? "Boundary rays draw from the Sun past the Moon." : undefined),
    ),
    trackKeys("insetRoot.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 13.8, v: 0, ease: "easeOut" },
      { t: 15.3, v: 1, ease: "hold" },
      { t: 36.2, v: 1, ease: "easeIn" },
      { t: 37.7, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("plate.trackTag.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 15.6, v: 0, ease: "easeOut" },
      { t: 17.2, v: 1, ease: "hold" },
      { t: 33, v: 1, ease: "easeIn" },
      { t: 34.4, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("plate.explain.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 25, v: 0, ease: "easeOut" },
      { t: 25.7, v: 1, ease: "hold" },
      { t: 28.15, v: 1, ease: "easeIn" },
      { t: 29, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.wash.opacity", [
      { t: 0, v: 0.62, ease: "hold" },
      { t: 14, v: 0.62, ease: "easeInOut" },
      { t: 21, v: 0.06, ease: "hold" },
      { t: 31, v: 0.06, ease: "easeInOut" },
      { t: 38, v: 0.62, ease: "hold" },
      { t: 40, v: 0.62 },
    ]),
    trackKeys("sky.corona.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 21, v: 0, ease: "easeOut" },
      { t: 22.2, v: 0.9, ease: "hold" },
      { t: 30.35, v: 0.9, ease: "easeIn" },
      { t: 30.85, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.mover.disc.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 21, v: 0, ease: "easeOut" },
      { t: 21.45, v: 1, ease: "hold" },
      { t: 30.55, v: 1, ease: "easeIn" },
      { t: 30.95, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capOutside.opacity", [
      { t: 0, v: 1, ease: "hold" },
      { t: 10.15, v: 1, ease: "easeIn" },
      { t: 10.7, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capPartial.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 10.75, v: 0, ease: "easeOut" },
      { t: 11.15, v: 1, ease: "hold" },
      { t: 20.4, v: 1, ease: "easeIn" },
      { t: 20.8, v: 0, ease: "hold" },
      { t: 30.85, v: 0, ease: "easeOut" },
      { t: 31.2, v: 1, ease: "hold" },
      { t: 37.35, v: 1, ease: "easeIn" },
      { t: 37.75, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capTotal.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 20.85, v: 0, ease: "easeOut" },
      { t: 21.2, v: 1, ease: "hold" },
      { t: 30.4, v: 1, ease: "easeIn" },
      { t: 30.8, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capFiltered.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 10.9, v: 0, ease: "easeOut" },
      { t: 11.35, v: 1, ease: "hold" },
      { t: 20.4, v: 1, ease: "easeIn" },
      { t: 20.8, v: 0, ease: "hold" },
      { t: 30.95, v: 0, ease: "easeOut" },
      { t: 31.35, v: 1, ease: "hold" },
      { t: 37.35, v: 1, ease: "easeIn" },
      { t: 37.75, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capCorona.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 21.05, v: 0, ease: "easeOut" },
      { t: 21.7, v: 1, ease: "hold" },
      { t: 30.35, v: 1, ease: "easeIn" },
      { t: 30.75, v: 0, ease: "hold" },
      { t: 40, v: 0 },
    ]),
    trackKeys("sky.capEnded.opacity", [
      { t: 0, v: 0, ease: "hold" },
      { t: 37.8, v: 0, ease: "easeOut" },
      { t: 38.15, v: 1, ease: "hold" },
      { t: 40, v: 1 },
    ]),
  ].join("\n");
}

function emit(): string {
  const cam0 = cameraAt(0);
  const morphFor = (root: string, clip: boolean) =>
    [
      trackPath(`${root}.penumbra.commands`, clip ? penumbraInsetBody : penumbraBody),
      trackPath(`${root}.umbra.commands`, clip ? umbraInsetBody : umbraBody),
      trackPath(`${root}.rayPenHi.commands`, (t) => rayBody(t, "penHi", clip)),
      trackPath(`${root}.rayPenLo.commands`, (t) => rayBody(t, "penLo", clip)),
      trackPath(`${root}.rayUmbraHi.commands`, (t) => rayBody(t, "umbraHi", clip)),
      trackPath(`${root}.rayUmbraLo.commands`, (t) => rayBody(t, "umbraLo", clip)),
      trackNum(`${root}.moon.position.y`, moonY),
    ].join("\n");
  const morph = `${morphFor("orbit", false)}\n${morphFor("insetRoot.diagram", true)}`;
  return `// INTO THE MOON'S SHADOW
// 40 seconds. Stylised scientific plate. Ivory Sun, slate Moon, blue Earth.
// Sizes, distances and timing are exaggerated. Both plates share one moon path.
// 0:00 two viewpoints. 0:05 the shadow cone. 0:11 first contact.
// 0:21 totality, corona only while the bright disc is covered.
// 0:31 the left limb returns. 0:38 the right limb clears. Hold to 0:40.
// First contact is the sun's left limb and final contact is the right limb.
// The sliver at the end of totality is on the left again: a larger disc
// traveling one way uncovers the limb it first touched.
// Sound is not a channel. Quiet ambience, no travel whoosh.
// Soft ticks on the shadow labels. Small contact tones at 0:11, 0:21, 0:31, 0:38.
// The ambience thins through totality and resolves on the held last frame.
scene "into-the-moons-shadow" {
  version "0.2";
  viewport (1280, 720);
  background #0e141c;
  duration 40s;
  requires "easing.hold";
  requires "geometry.operators";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "geometry.pathMorph";
  requires "paint.radialGradient";
  requires "text.basic";
};
camera main {
  position (${num(cam0.x)}, ${num(cam0.y)});
  zoom ${num(cam0.zoom)};
  rotation 0deg;
};
group orbit {
  zIndex 2;
  ${system(true, 0, 1.55, false)}
  text umbraTag {
    content "Umbra: Sun fully hidden";
    fontFamily "sans";
    fontSize 18;
    fontWeight 600;
    align center;
    baseline middle;
    fill #f7f1e6;
    position ${pair(labelUmbra(0))};
    opacity 0;
    zIndex 9;
  };
  text penumbraTag {
    content "Penumbra: Sun partly hidden";
    fontFamily "sans";
    fontSize 18;
    fontWeight 600;
    align center;
    baseline middle;
    fill #f7f1e6;
    position ${pair(labelPenumbra(0))};
    opacity 0;
    zIndex 9;
  };
};
group insetRoot {
  space screen;
  opacity 0;
  zIndex 7;
  rectangle frame {
    position (${num(inset.x)}, ${num(inset.y)});
    size (${num(inset.w)}, ${num(inset.h)});
    fill #101820;
    stroke #d9cbb0 width 1.25;
  };
  group diagram {
    position (${num(inset.gx)}, ${num(inset.gy)});
    scale (${num(inset.scale)}, ${num(inset.scale)});
    ${system(false, 1, 4.5, true)}
  };
};
group sky {
  space screen;
  zIndex 10;
  rectangle ground {
    position (0, ${SPLIT});
    size (1280, ${720 - SPLIT});
    fill ${SKY_INK};
  };
  rectangle rule {
    position (0, ${SPLIT});
    size (1280, 1.5);
    fill #cbbda6;
    zIndex 8;
  };
  group wash {
    opacity 0.62;
    zIndex 1;
    ellipse washWest {
      position (96, 640);
      size (210, 360);
      fill radial (0, 0) 170 0 #1b527a55 1 #1b527a00;
    };
    ellipse washEast {
      position (1184, 640);
      size (210, 360);
      fill radial (0, 0) 170 0 #1b527a55 1 #1b527a00;
    };
  };
  circle corona {
    position (${SKY_X}, ${SKY_Y});
    radius 148;
    fill radial (0, 0) 148 0 #fff8ef00 0.52 #fff8ef00 0.58 #fff6e6d0 0.68 #f0e2c07a 0.82 #e4d5ae33 1 #e4d5ae00;
    opacity 0;
    zIndex 2;
  };
  circle sun {
    position (${SKY_X}, ${SKY_Y});
    radius ${SKY_R};
    fill #fff3d4;
    zIndex 3;
  };
  group mover {
    position (${num(SKY_X + skyM(0))}, ${SKY_Y});
    zIndex 4;
    circle erase {
      radius ${SKY_M};
      fill ${SKY_INK};
    };
    circle disc {
      radius ${SKY_M};
      fill #07090d;
      opacity 0;
    };
  };
  text capOutside {
    content "Observer's sky — filtered view outside totality.";
    fontFamily "sans";
    fontSize 16;
    fontWeight 560;
    align left;
    baseline alphabetic;
    fill #f4efe4;
    position (36, 462);
    zIndex 6;
  };
  text capPartial {
    content "Partial eclipse.";
    fontFamily "sans";
    fontSize 18;
    fontWeight 650;
    align left;
    baseline alphabetic;
    fill #f4efe4;
    position (36, 462);
    opacity 0;
    zIndex 6;
  };
  text capTotal {
    content "Total eclipse.";
    fontFamily "sans";
    fontSize 18;
    fontWeight 650;
    align left;
    baseline alphabetic;
    fill #f4efe4;
    position (36, 462);
    opacity 0;
    zIndex 6;
  };
  text capEnded {
    content "Eclipse ended.";
    fontFamily "sans";
    fontSize 18;
    fontWeight 650;
    align left;
    baseline alphabetic;
    fill #f4efe4;
    position (36, 462);
    opacity 0;
    zIndex 6;
  };
  text capFiltered {
    content "Filtered view";
    fontFamily "sans";
    fontSize 14;
    fontWeight 500;
    align left;
    baseline alphabetic;
    fill #b7c4d0;
    position (36, 486);
    opacity 0;
    zIndex 6;
  };
  text capCorona {
    content "Corona shown during totality";
    fontFamily "sans";
    fontSize 14;
    fontWeight 500;
    align left;
    baseline alphabetic;
    fill #d9cbb6;
    position (36, 486);
    opacity 0;
    zIndex 6;
  };
};
group plate {
  space screen;
  zIndex 12;
  rectangle band {
    position (0, 0);
    size (1280, ${BAR});
    fill #0e141c;
  };
  text disclaimer {
    content "Not to scale — sizes, distances and timing exaggerated";
    fontFamily "sans";
    fontSize 15;
    fontWeight 560;
    align center;
    baseline middle;
    fill #d9cbb6;
    position (640, 18);
  };
  text trackTag {
    content "Path of totality";
    fontFamily "sans";
    fontSize 16;
    fontWeight 600;
    align left;
    baseline bottom;
    fill #f0c56e;
    position ${pair(labelTrack(0))};
    opacity 0;
  };
  group explain {
    opacity 0;
    rectangle backing {
      position (28, 48);
      size (360, 64);
      fill #121820f2;
      stroke #d9cbb655 width 1;
    };
    text umbraLine {
      content "Inside umbra → total eclipse";
      fontFamily "sans";
      fontSize 15;
      fontWeight 600;
      align left;
      baseline alphabetic;
      fill #f4efe4;
      position (42, 74);
    };
    text penumbraLine {
      content "Inside penumbra → partial eclipse";
      fontFamily "sans";
      fontSize 15;
      fontWeight 600;
      align left;
      baseline alphabetic;
      fill #f4efe4;
      position (42, 98);
    };
  };
};
operators orbit.rayPenHi { trim 0, 0, 0; };
operators orbit.rayPenLo { trim 0, 0, 0; };
operators orbit.rayUmbraHi { trim 0, 0, 0; };
operators orbit.rayUmbraLo { trim 0, 0, 0; };
operators orbit.track { trim 0, 0, 0; };
operators insetRoot.diagram.track { trim 0, 0, 0; };
${trackNum("camera(main).position.x", (t) => cameraAt(t).x)}
${trackNum("camera(main).position.y", (t) => cameraAt(t).y)}
${trackNum("camera(main).zoom", (t) => cameraAt(t).zoom)}
${morph}
${trackNum("sky.mover.position.x", (t) => SKY_X + skyM(t))}
${trackNum("orbit.umbraTag.position.x", (t) => labelUmbra(t).x)}
${trackNum("orbit.umbraTag.position.y", (t) => labelUmbra(t).y)}
${trackNum("orbit.penumbraTag.position.x", (t) => labelPenumbra(t).x)}
${trackNum("orbit.penumbraTag.position.y", (t) => labelPenumbra(t).y)}
${trackNum("plate.trackTag.position.x", (t) => labelTrack(t).x)}
${trackNum("plate.trackTag.position.y", (t) => labelTrack(t).y)}
${opacityBundle()}
complete;
`;
}

function origin(items: readonly ResolvedDrawItem[], id: string): Pt | undefined {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item) return undefined;
  return transformPoint(item.logicalMatrix, 0, 0);
}

function edgeGap(items: readonly ResolvedDrawItem[], id: string, zoom: number): number {
  const item = items.find((entry) => entry.nodeId === id);
  if (!item || item.geometry.kind !== "path") fail(`missing ${id}`);
  const observer = origin(items, "orbit.watcher.dot");
  if (!observer) fail("missing observer");
  let best = Infinity;
  let cursor: Pt | undefined;
  const points: Pt[] = [];
  for (const command of item.geometry.commands) {
    if (command.cmd === "M" || command.cmd === "L") {
      const point = transformPoint(item.logicalMatrix, command.x, command.y);
      if (cursor) {
        const dx = point.x - cursor.x;
        const dy = point.y - cursor.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = clamp(((observer.x - cursor.x) * dx + (observer.y - cursor.y) * dy) / (len * len), 0, 1);
        best = Math.min(best, Math.hypot(cursor.x + dx * t - observer.x, cursor.y + dy * t - observer.y));
      }
      cursor = point;
      points.push(point);
      if (command.cmd === "M") cursor = point;
    }
    if (command.cmd === "Z" && points[0] && cursor) {
      const point = points[0];
      const dx = point.x - cursor.x;
      const dy = point.y - cursor.y;
      const len = Math.hypot(dx, dy) || 1;
      const t = clamp(((observer.x - cursor.x) * dx + (observer.y - cursor.y) * dy) / (len * len), 0, 1);
      best = Math.min(best, Math.hypot(cursor.x + dx * t - observer.x, cursor.y + dy * t - observer.y));
    }
  }
  return best / zoom;
}

function verify(source: string): void {
  const compiled = compileMotionScript(source);
  if (!compiled.ok || !compiled.scene) {
    fail(compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) fail(validated.diagnostics.map((item) => item.message).join("\n"));
  const runtime = new AnimationRuntime(compiled.scene);
  if (runtime.degraded) fail(runtime.lastDiagnostics.map((item) => item.message).join("\n"));
  const at = (seconds: number) => runtime.evaluate(seconds * 1000);
  for (const seconds of [0, 5, 8, 11, 16, 18, 21, 26, 31, 34, 38, 40]) {
    const frame = at(seconds);
    const dot = origin(frame.drawItems, "orbit.watcher.dot");
    const earth = origin(frame.drawItems, "orbit.earth.disc");
    const moon = origin(frame.drawItems, "orbit.moon.disc");
    const sky = origin(frame.drawItems, "sky.mover.erase");
    if (!dot || !earth || !moon || !sky) fail(`missing bodies at ${seconds}s`);
    const expectedDot = screenOf(OBS, seconds);
    const expectedEarth = screenOf({ x: EARTH.x, y: EARTH.y }, seconds);
    const expectedMoon = screenOf({ x: MOON_X, y: moonY(seconds) }, seconds);
    if (Math.hypot(dot.x - expectedDot.x, dot.y - expectedDot.y) > 1.25) fail(`observer drifted at ${seconds}s`);
    if (Math.hypot(earth.x - expectedEarth.x, earth.y - expectedEarth.y) > 1.25) fail(`Earth drifted at ${seconds}s`);
    if (Math.hypot(moon.x - expectedMoon.x, moon.y - expectedMoon.y) > 1.25) fail(`Moon drifted at ${seconds}s`);
    if (Math.abs(dot.y - AIM_Y) > 1.25) fail(`observer left the screen line at ${seconds}s`);
    const worldOffset = {
      x: (dot.x - earth.x) / zoomAt(seconds),
      y: (dot.y - earth.y) / zoomAt(seconds),
    };
    if (Math.hypot(worldOffset.x - (OBS.x - EARTH.x), worldOffset.y - (OBS.y - EARTH.y)) > 1.5) {
      fail(`observer left Earth's limb at ${seconds}s`);
    }
    if (Math.hypot(sky.x - (SKY_X + skyM(seconds)), sky.y - SKY_Y) > 1.25) fail(`sky moon drifted at ${seconds}s`);
  }
  if (edgeGap(at(11).drawItems, "orbit.penumbra", zoomAt(11)) > 2.5) fail("rendered penumbra missed first contact");
  if (edgeGap(at(21).drawItems, "orbit.umbra", zoomAt(21)) > 2.5) fail("rendered umbra missed second contact");
  if (edgeGap(at(31).drawItems, "orbit.umbra", zoomAt(31)) > 2.5) fail("rendered umbra missed third contact");
  if (edgeGap(at(38).drawItems, "orbit.penumbra", zoomAt(38)) > 2.5) fail("rendered penumbra missed fourth contact");
  const separation = (seconds: number) => {
    const sky = origin(at(seconds).drawItems, "sky.mover.erase");
    if (!sky) fail("missing sky");
    return Math.hypot(sky.x - SKY_X, sky.y - SKY_Y);
  };
  if (Math.abs(separation(11) - (SKY_R + SKY_M)) > 1.2) fail("first contact is not a limb touch");
  if (Math.abs(separation(21) - (SKY_M - SKY_R)) > 1.2) fail("totality does not start on the limb");
  if (separation(26) > SKY_M - SKY_R - 4) fail("the moon does not cover the sun through mid-totality");
  if (Math.abs(separation(31) - (SKY_M - SKY_R)) > 1.2) fail("totality does not end on the limb");
  if (Math.abs(separation(38) - (SKY_R + SKY_M)) > 1.2) fail("final contact is not a limb touch");
  const leftOfSun = (seconds: number) => (origin(at(seconds).drawItems, "sky.mover.erase")?.x ?? 0) < SKY_X;
  if (!leftOfSun(11) || !leftOfSun(21)) fail("ingress is not from the left limb");
  if (leftOfSun(31) || leftOfSun(38)) fail("egress is not toward the right limb");
  const opacityOf = (seconds: number, id: string) => at(seconds).drawItems.find((item) => item.nodeId === id)?.opacity ?? -1;
  if (opacityOf(0.12, "orbit.sun.name") > 0.05) fail("Sun label appears too early");
  if (opacityOf(1.2, "orbit.sun.name") < 0.8) fail("Sun label did not finish revealing");
  if (opacityOf(1.2, "orbit.moon.name") > 0.2) fail("Moon label overlaps the Sun reveal");
  if (opacityOf(2.2, "orbit.moon.name") < 0.8) fail("Moon label did not finish revealing");
  if (opacityOf(2.2, "orbit.earth.name") > 0.2) fail("Earth label overlaps the Moon reveal");
  if (opacityOf(3.2, "orbit.earth.name") < 0.8) fail("Earth label did not finish revealing");
  if (opacityOf(6, "orbit.penumbra") > 0.05) fail("shadow fill appears before the rays");
  if (opacityOf(10, "orbit.umbra") < 0.95) fail("umbra fill is not up by 0:10");
  if (opacityOf(20.5, "sky.corona") > 0.02) fail("corona appears while the crescent remains");
  if (opacityOf(22.4, "sky.corona") < 0.8) fail("corona did not fade in");
  if (opacityOf(31.6, "sky.corona") > 0.02) fail("corona remains after totality");
  if (opacityOf(29.15, "plate.explain.umbraLine") > 0.05) fail("explanatory text remains after 0:29");
  if (opacityOf(26.4, "plate.explain.umbraLine") < 0.9) fail("explanatory text missing inside totality");
  if (opacityOf(40, "plate.disclaimer") < 0.99) fail("scale disclaimer faded");
  if (opacityOf(40, "sky.capEnded") < 0.95) fail("ending caption missing");
  const endCam = cameraAt(40);
  const startCam = cameraAt(0);
  if (Math.abs(endCam.zoom - startCam.zoom) > 1e-6 || Math.abs(endCam.x - startCam.x) > 1e-6) {
    fail("the held ending is not the opening frame");
  }
}

checkModel();
const source = emit();
const out = resolve(dirname(fileURLToPath(import.meta.url)), "into-the-moons-shadow.ms");
writeFileSync(out, source);
verify(source);
console.log(
  [
    `wrote ${out} (${source.length} bytes)`,
    `knots y0 ${num(y0)} touch ${num(yTouch)} c1 ${num(yC1)} c2 ${num(yC2)} mid ${num(SUN.y)} c3 ${num(yC3)} c4 ${num(yC4)}`,
    `inset scale ${num(inset.scale)} frame ${num(inset.w)}×${num(inset.h)} at ${num(inset.x)},${num(inset.y)}`,
    `tip clearance ${num(shadow(SUN.y).tip.x - (EARTH.x + EARTH.r))}`,
  ].join("\n"),
);
