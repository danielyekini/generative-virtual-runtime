/**
 * Builds fixtures/motionscript/stories/the-city-comes-around.ms.
 * Run: npx tsx fixtures/motionscript/stories/build-the-city-comes-around.ts
 * Set GVR_PREVIEW_DIR to also render PNG stills through the real CanvasRenderer
 * in headless Chromium (needs Playwright; the binary comes from GVR_CHROME,
 * CHROME_PATH or evaluation/harness/chrome.ts, else Playwright's own Chromium).
 *
 * Thirty seconds, one seamless loop. An isometric district repeats every
 * L = 880 world units along the street. The camera starts on the corner café of
 * unit 0, pans along the shops, rises over the rooftops and the railway, comes
 * back down and settles on the café of unit 1, exactly one unit further on.
 *
 * MotionScript is 2D, so the builder owns the projection: world (X, Y, Z) maps
 * to (X − Y, (X + Y) / 2 − Z). X runs along the street (screen right and down),
 * Y runs toward the viewer, Z is up. Static architecture is merged into one path
 * per colour and paint layer, across all three unit copies, because instances
 * are not drawn and the node budget is 500. Paint order is static, so the layers
 * are chosen to agree with depth for every actor route; the van needs two copies.
 *
 * Every actor repeats with a period that divides 30s. Routes are expressions of
 * u = (t + phase) % period, written as sums of clamped ramps, so t = 30s samples
 * exactly like t = 0s. The camera is the only keyframed motion.
 * MotionScript has no audio: the sound cues are a small screen-space caption.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem, type SceneIR } from "@gvr/schema";

const STARTED = performance.now();
const DURATION = 30_000;
const L = 880;
const UNITS = [-1, 0, 1];

const BG = "#e6d5b8";
const GROUND = "#d8c7aa";
const PAVE = "#e4d6bd";
const CURB = "#b9a78c";
const ROAD = "#7d7a78";
const ROAD_FAR = "#8a8682";
const STRIPE = "#f3ecdd";
const LANE = "#d9cfba";
const TEAL = "#2f8a86";
const TEAL_DARK = "#226a68";
const TEAL_ROOF = "#4a9893";
const TEAL_ROOF_EDGE = "#6fb1aa";
const MUSTARD = "#e2a92f";
const MUSTARD_DARK = "#b98420";
const MUSTARD_TOP = "#f0c35a";
const CORAL = "#ec7a62";
const CORAL_DARK = "#c95e49";
const CREAM = "#f4ead6";
const GLASS = "#36505a";
const GLASS_LIT = "#f6d58c";
const SHADOW = "#3a2a1a40";
const INK = "#2b2522";
const SKIN = "#e7b48f";
const LEAF = "#6f9b4f";
const LEAF_DARK = "#4f7a3e";
const SOIL = "#8a5b3c";
const PLANTER = "#a8714d";
const WOOD = "#9b6a45";

/** Brick palettes: front face, side face, trim. */
const BRICK = {
  terracotta: ["#c8694b", "#a4533b", "#f1dcc3"],
  ochre: ["#d79f5c", "#b07f45", "#f6e6c9"],
  sand: ["#e3c391", "#bf9f70", "#fbf0dc"],
  rose: ["#cf8d7a", "#a96f5f", "#f6e2d6"],
  umber: ["#b9805c", "#946446", "#f2dcc4"],
  far: ["#cdb79a", "#b8a184", "#ddcbb0"],
  back: ["#c49a7c", "#a27c62", "#ead7c2"],
} as const;
type Brick = keyof typeof BRICK;

type Pt = { x: number; y: number };
type V3 = [number, number, number];
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";

function n(value: number, digits = 2): string {
  const fixed = value.toFixed(digits);
  const text = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
  return text === "-0" ? "0" : text;
}

function iso(X: number, Y: number, Z = 0): Pt {
  return { x: X - Y, y: (X + Y) / 2 - Z };
}

function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

// ---------------------------------------------------------------------------
// Static architecture: one merged path per paint layer.

type LayerDef = { id: string; z: number; fill: string; opacity?: number };
const LAYERS: LayerDef[] = [];
const LAYER_CMDS = new Map<string, string[]>();
let geometryItems = 0;

function layer(id: string, z: number, fill: string, opacity?: number): string {
  if (!LAYER_CMDS.has(id)) {
    LAYERS.push({ id, z, fill, opacity });
    LAYER_CMDS.set(id, []);
  }
  return id;
}

/** Camera frames over the whole programme, in projected world coordinates, padded a little. */
let VIEWS: { x0: number; x1: number; y0: number; y1: number }[] = [];
let culled = 0;

function setViews(stops: CamPlan): void {
  VIEWS = [];
  for (let t = 0; t <= 30.0001; t += 0.1) {
    const c = cameraAt(stops, t);
    const hw = 640 / c.z + 8;
    const hh = 360 / c.z + 8;
    VIEWS.push({ x0: c.x - hw, x1: c.x + hw, y0: c.y - hh, y1: c.y + hh });
  }
}

function seen(pts: Pt[]): boolean {
  if (VIEWS.length === 0) return true;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  return VIEWS.some((v) => x0 < v.x1 && v.x0 < x1 && y0 < v.y1 && v.y0 < y1);
}

function poly(id: string, pts: Pt[]): void {
  const cmds = LAYER_CMDS.get(id);
  if (!cmds) throw new Error(`Unknown layer ${id}`);
  if (!seen(pts)) {
    culled += 1;
    return;
  }
  cmds.push(`move (${n(pts[0]!.x)}, ${n(pts[0]!.y)});`);
  for (const p of pts.slice(1)) cmds.push(`line (${n(p.x)}, ${n(p.y)});`);
  cmds.push("close;");
  geometryItems += pts.length + 1;
}

function poly3(id: string, pts: V3[]): void {
  poly(id, pts.map(([X, Y, Z]) => iso(X, Y, Z)));
}

/** Plane Y = const, facing the viewer's lower left. */
function front(id: string, X0: number, X1: number, Y: number, Z0: number, Z1: number): void {
  poly3(id, [[X0, Y, Z0], [X1, Y, Z0], [X1, Y, Z1], [X0, Y, Z1]]);
}

/** Plane X = const, facing the viewer's lower right. */
function side(id: string, X: number, Y0: number, Y1: number, Z0: number, Z1: number): void {
  poly3(id, [[X, Y0, Z0], [X, Y1, Z0], [X, Y1, Z1], [X, Y0, Z1]]);
}

function top(id: string, X0: number, X1: number, Y0: number, Y1: number, Z: number): void {
  poly3(id, [[X0, Y0, Z], [X1, Y0, Z], [X1, Y1, Z], [X0, Y1, Z]]);
}

function box(ids: [string, string, string], X0: number, X1: number, Y0: number, Y1: number, Z0: number, Z1: number): void {
  top(ids[0], X0, X1, Y0, Y1, Z1);
  front(ids[1], X0, X1, Y1, Z0, Z1);
  side(ids[2], X1, Y0, Y1, Z0, Z1);
}

/** Paint layers, bottom to top. Within one zIndex the emission order below is paint order. */
const Z = {
  ground: 0,
  far: 1,
  rail: 2,
  train: 3,
  back: 5,
  sideFaces: 6,
  street: 7,
  front: 8,
  roof: 9,
  cyclist: 10,
  walkers: 11,
  awnings: 12,
  vanFront: 13,
  caption: 60,
};

function defineLayers(): void {
  layer("gBase", Z.ground, GROUND);
  layer("gPave", Z.ground, PAVE);
  layer("gRoadFar", Z.ground, ROAD_FAR);
  layer("gRoad", Z.ground, ROAD);
  layer("gCurb", Z.ground, CURB);
  layer("gStripe", Z.ground, STRIPE);
  layer("gLane", Z.ground, LANE);
  layer("gGrass", Z.ground, "#a9b979");
  layer("fTop", Z.far, "#a9b3a4");
  layer("fFront", Z.far, BRICK.far[0]);
  layer("fSide", Z.far, BRICK.far[1]);
  layer("fWin", Z.far, "#a6a69a");
  layer("rPier", Z.rail, "#b2a493");
  layer("rPierSide", Z.rail, "#968979");
  layer("rDeckTop", Z.rail, "#8d847b");
  layer("rDeckFront", Z.rail, "#b8ab9b");
  layer("rDeckSide", Z.rail, "#9a8f82");
  layer("rTrack", Z.rail, "#5f5853");
  for (const brick of ["back", "terracotta", "ochre", "sand", "rose", "umber"] as Brick[]) {
    layer(`bFront_${brick}`, Z.back, BRICK[brick][0]);
    layer(`bSide_${brick}`, Z.back, BRICK[brick][1]);
  }
  layer("bRoof", Z.back, TEAL_ROOF);
  layer("bRoofEdge", Z.back, TEAL_ROOF_EDGE);
  layer("bWin", Z.back, GLASS);
  layer("bWinLit", Z.back, GLASS_LIT);
  layer("bTank", Z.back, "#8c6a4f");
  layer("bTankDark", Z.back, "#6d513c");
  layer("bTankTop", Z.back, "#a8836a");
  layer("bTree", Z.back, LEAF);
  layer("bTreeDark", Z.back, LEAF_DARK);
  for (const brick of ["terracotta", "ochre", "sand", "rose", "umber"] as Brick[]) {
    layer(`sSide_${brick}`, Z.sideFaces, BRICK[brick][1]);
  }
  layer("sWin", Z.sideFaces, GLASS);
  for (const brick of ["terracotta", "ochre", "sand", "rose", "umber"] as Brick[]) {
    layer(`fr_${brick}`, Z.front, BRICK[brick][0]);
  }
  layer("frBand", Z.front, "#5b4a40");
  layer("frShop", Z.front, "#41575c");
  layer("frShopLit", Z.front, "#f3cf86");
  layer("frDoor", Z.front, "#4b3a30");
  layer("frWin", Z.front, GLASS);
  layer("frWinLit", Z.front, GLASS_LIT);
  layer("frTrim", Z.front, "#f3e3c9");
  layer("frBalcony", Z.front, "#e9dcc6");
  layer("frRail", Z.front, "#3f3a36", 0.55);
  layer("frBoxSoil", Z.front, PLANTER);
  layer("frBoxLeaf", Z.front, LEAF);
  layer("rfRoof", Z.front, TEAL_ROOF);
  layer("rfParapetTop", Z.front, TEAL_ROOF_EDGE);
  layer("rfParapet", Z.front, TEAL_DARK);
  layer("rpBed", Z.roof, PLANTER);
  layer("rpBedSide", Z.roof, "#8a5a3c");
  layer("rpSoil", Z.roof, SOIL);
  layer("rpLeaf", Z.roof, LEAF);
  layer("rpLeafDark", Z.roof, LEAF_DARK);
  layer("rpGlass", Z.roof, "#cfe8e2", 0.78);
  layer("rpGlassFrame", Z.roof, "#e8f3ef");
  layer("rpWood", Z.roof, WOOD);
  layer("rpWoodDark", Z.roof, "#7a5032");
  layer("rpLine", Z.roof, "#5a524b");
  layer("rpTank", Z.roof, "#9fa7a3");
  layer("rpTankTop", Z.roof, "#c5cbc6");
  layer("aTeal", Z.awnings, TEAL);
  layer("aTealDark", Z.awnings, TEAL_DARK);
  layer("aCoral", Z.awnings, CORAL);
  layer("aCoralDark", Z.awnings, CORAL_DARK);
  layer("aMustard", Z.awnings, MUSTARD);
  layer("aMustardDark", Z.awnings, MUSTARD_DARK);
  layer("aStripe", Z.awnings, CREAM);
  layer("aBlade", Z.awnings, "#3b3431");
  layer("aLamp", Z.awnings, "#3b3431");
  layer("aLampGlow", Z.awnings, "#fbe4a6");
}

// ---------------------------------------------------------------------------
// District layout, in unit-local world coordinates.

/** Cross streets at X 0–60 and 400–460. Block 1 is 60–400, block 2 is 460–880. */
const FRONT_DEPTH = 90;
const SIDEWALK = 14;
const ROAD_FAR_EDGE = 14;
const ROAD_NEAR_EDGE = 78;
const NEAR_WALK = 98;
const LANE_CAR = 53;
const LANE_VAN = 21;
const LANE_BIKE = 68;
const WALK_FAR = 7;
const WALK_NEAR = 94;
const BACK_STREET = -110;
const RAIL_Y = -245;
const DECK = 60;
const GROUND_FLOOR = 30;
const FLOOR = 24;
const PARAPET = 6;

type WindowStyle = "single" | "paired" | "triple" | "tall";
type Building = {
  id: string;
  x0: number;
  x1: number;
  floors: number;
  brick: Brick;
  windows: WindowStyle;
  awning?: "teal" | "coral" | "mustard";
  striped?: boolean;
  balcony?: "pair" | "full";
  boxes?: boolean;
  lit: number[];
  blade?: string;
};

function height(b: Building): number {
  return GROUND_FLOOR + FLOOR * (b.floors - 1) + PARAPET;
}

/** Same 20-unit structural bays everywhere; façades differ in colour, grouping, awnings and balconies. */
const BLOCK1: Building[] = [
  { id: "cafe", x0: 60, x1: 160, floors: 2, brick: "terracotta", windows: "single", awning: "teal", boxes: true, lit: [1, 3] },
  { id: "b", x0: 160, x1: 240, floors: 3, brick: "ochre", windows: "paired", awning: "coral", striped: true, balcony: "pair", lit: [2], blade: CORAL },
  { id: "c", x0: 240, x1: 320, floors: 2, brick: "rose", windows: "triple", awning: "mustard", boxes: true, lit: [0, 4], blade: MUSTARD },
  { id: "d", x0: 320, x1: 400, floors: 3, brick: "sand", windows: "tall", balcony: "full", lit: [1, 5], blade: TEAL },
];
const BLOCK2: Building[] = [
  { id: "e", x0: 460, x1: 560, floors: 2, brick: "umber", windows: "paired", awning: "coral", boxes: true, lit: [0], blade: CORAL },
  { id: "f", x0: 560, x1: 660, floors: 3, brick: "terracotta", windows: "triple", awning: "teal", balcony: "pair", lit: [3, 4], blade: TEAL },
  { id: "g", x0: 660, x1: 780, floors: 4, brick: "sand", windows: "single", awning: "mustard", striped: true, balcony: "full", lit: [2, 7, 9], blade: MUSTARD },
  { id: "h", x0: 780, x1: 880, floors: 2, brick: "ochre", windows: "tall", awning: "coral", boxes: true, lit: [1] },
];
const FRONT_ROW = [...BLOCK1, ...BLOCK2];

type BackBuilding = { x0: number; x1: number; h: number; brick: Brick; tank?: boolean };
const BACK_ROW: BackBuilding[] = [
  { x0: 70, x1: 170, h: 70, brick: "back", tank: true },
  { x0: 170, x1: 260, h: 140, brick: "rose" },
  { x0: 290, x1: 400, h: 126, brick: "back" },
  { x0: 700, x1: 880, h: 132, brick: "umber" },
];
/** Rail section with nothing in front of it: the cross street and the park. */
const EXPOSED = { x0: 400, x1: 680 };

const CROSS1 = 74;
const CROSS2 = 252;
const CROSS3 = 474;
const CROSS4 = 660;
const CROSS_HALF = 11;

function windowsFor(b: Building, ox: number): { lit: V3[][]; dark: V3[][]; trim: V3[][] } {
  const lit: V3[][] = [];
  const dark: V3[][] = [];
  const trim: V3[][] = [];
  const bays = (b.x1 - b.x0) / 20;
  let index = 0;
  for (let floor = 1; floor < b.floors; floor += 1) {
    const z0 = GROUND_FLOOR + FLOOR * (floor - 1);
    const spans: [number, number, number, number][] = [];
    if (b.windows === "single") for (let bay = 0; bay < bays; bay += 1) spans.push([bay * 20 + 6, bay * 20 + 14, z0 + 6, z0 + 18]);
    if (b.windows === "tall") for (let bay = 0; bay < bays; bay += 1) spans.push([bay * 20 + 7, bay * 20 + 13, z0 + 3, z0 + 20]);
    if (b.windows === "paired") for (let bay = 0; bay + 1 < bays; bay += 2) spans.push([bay * 20 + 5, bay * 20 + 35, z0 + 7, z0 + 17]);
    if (b.windows === "triple") {
      for (let bay = 0; bay + 1 < bays; bay += 2) {
        for (const at of [6, 17, 28]) spans.push([bay * 20 + at, bay * 20 + at + 6, z0 + 6, z0 + 18]);
      }
    }
    trim.push([[ox + b.x0, 0, z0 + 1], [ox + b.x1, 0, z0 + 1], [ox + b.x1, 0, z0 + 3], [ox + b.x0, 0, z0 + 3]]);
    for (const [a, c, z1, z2] of spans) {
      const quad: V3[] = [[ox + b.x0 + a, 0, z1], [ox + b.x0 + c, 0, z1], [ox + b.x0 + c, 0, z2], [ox + b.x0 + a, 0, z2]];
      (b.lit.includes(index) ? lit : dark).push(quad);
      index += 1;
    }
  }
  return { lit, dark, trim };
}

function frontBuilding(b: Building, ox: number, perUnit: string[]): void {
  const h = height(b);
  const X0 = ox + b.x0;
  const X1 = ox + b.x1;
  side(`sSide_${b.brick}`, X1, -FRONT_DEPTH, 0, 0, h);
  for (let floor = 1; floor < b.floors; floor += 1) {
    const z0 = GROUND_FLOOR + FLOOR * (floor - 1);
    side("sWin", X1, -FRONT_DEPTH + 24, -FRONT_DEPTH + 66, z0 + 7, z0 + 17);
  }
  if (b.id === "cafe") {
    perUnit.push(`path cafe${unitName(ox)}Front { zIndex ${Z.front}; fill ${BRICK[b.brick][0]}; ${quadPath([[X0, 0, 0], [X1, 0, 0], [X1, 0, h], [X0, 0, h]])} };`);
  } else {
    front(`fr_${b.brick}`, X0, X1, 0, 0, h);
  }
  front("frBand", X0, X1, 0, GROUND_FLOOR - 3, GROUND_FLOOR);
  // Shopfront: glazing with a door. The café's glazing is lit.
  const shop = b.id === "cafe" || b.id === "e" ? "frShopLit" : "frShop";
  front(shop, X0 + 6, X1 - 22, 0, 4, GROUND_FLOOR - 7);
  front("frDoor", X1 - 18, X1 - 8, 0, 0, GROUND_FLOOR - 7);
  const w = windowsFor(b, ox);
  for (const q of w.trim) poly3("frTrim", q);
  for (const q of w.dark) poly3("frWin", q);
  for (const q of w.lit) poly3("frWinLit", q);
  if (b.boxes) {
    for (const q of w.dark.concat(w.lit)) {
      const xa = q[0]![0];
      const xb = q[1]![0];
      const za = q[0]![2];
      front("frBoxSoil", xa - 1, xb + 1, 3.5, za - 5, za - 1.5);
      poly3("frBoxLeaf", [[xa - 1, 3.5, za - 1.5], [xb + 1, 3.5, za - 1.5], [xb, 3.5, za + 1.5], [(xa + xb) / 2, 3.5, za + 3], [xa, 3.5, za + 1.5]]);
    }
  }
  if (b.balcony) {
    const floor = GROUND_FLOOR + FLOOR * (b.floors - 2);
    const spans: [number, number][] = b.balcony === "full" ? [[X0 + 4, X1 - 4]] : [[X0 + 4, X0 + 36], [X1 - 36, X1 - 4]];
    for (const [a, c] of spans) {
      top("frBalcony", a, c, 0, 7, floor + 1);
      front("frBalcony", a, c, 7, floor - 1, floor + 1);
      front("frRail", a, c, 7, floor + 1, floor + 9);
    }
  }
  // Roof slab and parapet.
  top("rfRoof", X0, X1, -FRONT_DEPTH, 0, h - PARAPET + 1);
  top("rfParapetTop", X0, X1, -3, 0, h);
  front("rfParapet", X0, X1, -3, h - PARAPET + 1, h);
  front("rfParapet", X0, X1, -FRONT_DEPTH + 3, h - PARAPET + 1, h);
  if (b.awning && b.id !== "cafe") awning(b, ox, `a${cap(b.awning)}`, `a${cap(b.awning)}Dark`);
  if (b.blade) {
    const bx = X0 + 8;
    side("aBlade", bx, 0, 2, 33, 46);
    side("aBlade", bx, 2, 14, 44, 45);
  }
}

function cap(text: string): string {
  return text[0]!.toUpperCase() + text.slice(1);
}

function awning(b: Building, ox: number, light: string, dark: string): void {
  const X0 = ox + b.x0 + 3;
  const X1 = ox + b.x1 - 3;
  poly3(light, [[X0, 0, 32], [X1, 0, 32], [X1, 13, 26], [X0, 13, 26]]);
  front(dark, X0, X1, 13, 22, 26);
  side(dark, X1, 0, 13, 26, 32);
  if (b.striped) {
    for (let x = X0; x + 5 <= X1; x += 10) poly3("aStripe", [[x, 0, 32], [x + 5, 0, 32], [x + 5, 13, 26], [x, 13, 26]]);
  }
}

function quadPath(pts: V3[]): string {
  const p = pts.map(([X, Y, Zv]) => iso(X, Y, Zv));
  geometryItems += p.length + 1;
  return `move (${n(p[0]!.x)}, ${n(p[0]!.y)}); ${p.slice(1).map((q) => `line (${n(q.x)}, ${n(q.y)});`).join(" ")} close;`;
}

function backBuilding(b: BackBuilding, ox: number): void {
  const X0 = ox + b.x0;
  const X1 = ox + b.x1;
  const Y0 = -210;
  const Y1 = -130;
  front(`bFront_${b.brick}`, X0, X1, Y1, 0, b.h);
  side(`bSide_${b.brick}`, X1, Y0, Y1, 0, b.h);
  top("bRoof", X0, X1, Y0, Y1, b.h);
  top("bRoofEdge", X0, X1, Y1 - 3, Y1, b.h + 2);
  front("bRoofEdge", X0, X1, Y1, b.h - 2, b.h + 2);
  for (let z = 30; z + 14 < b.h - 6; z += 24) {
    const litBand = Math.round((b.x0 + z) / 24) % 5 === 0;
    front(litBand ? "bWinLit" : "bWin", X0 + 8, X1 - 8, Y1, z, z + 12);
    side("bWin", X1, Y0 + 14, Y1 - 14, z, z + 12);
  }
  front("bWin", X0 + 8, X1 - 8, Y1, 4, 20);
  if (b.tank) {
    // Water tank on legs, at the back of the roof, in front of the railway.
    const cx = ox + 120;
    const cy = -185;
    for (const [lx, ly] of [[-9, -9], [9, -9], [-9, 9], [9, 9]] as [number, number][]) {
      box(["bTankDark", "bTankDark", "bTankDark"], cx + lx - 1.5, cx + lx + 1.5, cy + ly - 1.5, cy + ly + 1.5, b.h, b.h + 14);
    }
    const ring = (zv: number, r: number) =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return iso(cx + Math.cos(a) * r, cy + Math.sin(a) * r, zv);
      });
    const lower = ring(b.h + 14, 14);
    const upper = ring(b.h + 46, 14);
    // Body: the silhouette between the two rings.
    const body = [...upper.slice(0, 9), ...lower.slice(0, 9).reverse()];
    poly("bTank", body);
    poly("bTankDark", [upper[1]!, upper[2]!, upper[3]!, lower[3]!, lower[2]!, lower[1]!]);
    poly("bTankTop", ring(b.h + 46, 14));
    poly("bTankDark", [iso(cx - 15, cy, b.h + 46), iso(cx, cy, b.h + 58), iso(cx + 15, cy, b.h + 46), iso(cx, cy + 15, b.h + 46)]);
  }
}

function unitName(ox: number): string {
  const k = Math.round(ox / L);
  return k < 0 ? `m${-k}` : `${k}`;
}

function ground(): void {
  const xa = -2 * L;
  const xb = 3 * L;
  poly3("gBase", [[xa, -760, 0], [xb, -760, 0], [xb, 260, 0], [xa, 260, 0]]);
  poly3("gPave", [[xa, -FRONT_DEPTH - 2, 0], [xb, -FRONT_DEPTH - 2, 0], [xb, SIDEWALK, 0], [xa, SIDEWALK, 0]]);
  poly3("gPave", [[xa, ROAD_NEAR_EDGE, 0], [xb, ROAD_NEAR_EDGE, 0], [xb, NEAR_WALK, 0], [xa, NEAR_WALK, 0]]);
  poly3("gRoad", [[xa, ROAD_FAR_EDGE, 0], [xb, ROAD_FAR_EDGE, 0], [xb, ROAD_NEAR_EDGE, 0], [xa, ROAD_NEAR_EDGE, 0]]);
  poly3("gRoadFar", [[xa, -130, 0], [xb, -130, 0], [xb, -90, 0], [xa, -90, 0]]);
  poly3("gCurb", [[xa, ROAD_FAR_EDGE - 1.5, 0], [xb, ROAD_FAR_EDGE - 1.5, 0], [xb, ROAD_FAR_EDGE, 0], [xa, ROAD_FAR_EDGE, 0]]);
  poly3("gCurb", [[xa, ROAD_NEAR_EDGE, 0], [xb, ROAD_NEAR_EDGE, 0], [xb, ROAD_NEAR_EDGE + 1.5, 0], [xa, ROAD_NEAR_EDGE + 1.5, 0]]);
  poly3("gCurb", [[xa, NEAR_WALK, 0], [xb, NEAR_WALK, 0], [xb, NEAR_WALK + 2, 0], [xa, NEAR_WALK + 2, 0]]);
  poly3("gLane", [[xa, 61, 0], [xb, 61, 0], [xb, 62, 0], [xa, 62, 0]]);
  for (let x = xa; x < xb; x += 40) poly3("gLane", [[x, 44.5, 0], [x + 16, 44.5, 0], [x + 16, 45.5, 0], [x, 45.5, 0]]);
  for (let k = -2; k <= 2; k += 1) {
    const ox = k * L;
    for (const [c0, c1] of [[0, 60], [400, 460]] as [number, number][]) {
      poly3("gRoad", [[ox + c0, -700, 0], [ox + c1, -700, 0], [ox + c1, ROAD_FAR_EDGE, 0], [ox + c0, ROAD_FAR_EDGE, 0]]);
      poly3("gLane", [[ox + c0 + 29.5, -700, 0], [ox + c0 + 30.5, -700, 0], [ox + c0 + 30.5, -2, 0], [ox + c0 + 29.5, -2, 0]]);
    }
    for (const cx of [CROSS1, CROSS2, CROSS3, CROSS4]) {
      for (let y = ROAD_FAR_EDGE + 2; y + 4 <= ROAD_NEAR_EDGE - 1; y += 8) {
        poly3("gStripe", [[ox + cx - CROSS_HALF, y, 0], [ox + cx + CROSS_HALF, y, 0], [ox + cx + CROSS_HALF, y + 4, 0], [ox + cx - CROSS_HALF, y + 4, 0]]);
      }
    }
    // The park in front of the exposed viaduct.
    poly3("gGrass", [[ox + 470, -228, 0], [ox + 690, -228, 0], [ox + 690, -140, 0], [ox + 470, -140, 0]]);
  }
}

function railway(): void {
  const xa = -2 * L;
  const xb = 3 * L;
  for (let x = xa; x < xb; x += 80) {
    front("rPier", x, x + 7, RAIL_Y + 8, 0, DECK - 6);
    side("rPierSide", x + 7, RAIL_Y - 8, RAIL_Y + 8, 0, DECK - 6);
  }
  box(["rDeckTop", "rDeckFront", "rDeckSide"], xa, xb, RAIL_Y - 12, RAIL_Y + 12, DECK - 6, DECK);
  poly3("rTrack", [[xa, RAIL_Y - 5, DECK], [xb, RAIL_Y - 5, DECK], [xb, RAIL_Y - 4, DECK], [xa, RAIL_Y - 4, DECK]]);
  poly3("rTrack", [[xa, RAIL_Y + 4, DECK], [xb, RAIL_Y + 4, DECK], [xb, RAIL_Y + 5, DECK], [xa, RAIL_Y + 5, DECK]]);
}

function farDistrict(): void {
  const rows: [number, number, number][] = [
    [-330, -290, 0],
    [-430, -370, 37],
    [-540, -470, 71],
    [-660, -580, 13],
  ];
  for (const [Y0, Y1, seed] of rows) {
    // One unit's worth of boxes, repeated per unit so the far district has the same period as the street.
    const boxes: [number, number, number][] = [];
    let x = 0;
    let i = seed;
    while (x < L - 60) {
      const w = Math.min(100 + ((i * 37) % 5) * 20, L - x);
      boxes.push([x, w, 50 + ((i * 53) % 7) * 18]);
      x += w + ((i * 11) % 3) * 10;
      i += 1;
    }
    for (let k = -3; k <= 3; k += 1) {
      for (const [bx, w, h] of boxes) {
        const X0 = k * L + bx;
        box(["fTop", "fFront", "fSide"], X0, X0 + w - 10, Y0, Y1, 0, h);
        if (h > 70) front("fWin", X0 + 8, X0 + w - 18, Y1, h - 34, h - 26);
      }
    }
  }
}

/** The near side (reusing existing colour layers; each new colour costs a node): a planted verge, a service lane and low foreground buildings seen mostly as roofs. */
const NEAR_ROWS: { Y0: number; Y1: number; parts: [number, number, number, Brick][] }[] = [
  { Y0: 176, Y1: 252, parts: [[20, 150, 34, "sand"], [160, 300, 48, "terracotta"], [310, 470, 34, "ochre"], [480, 640, 48, "rose"], [650, 860, 34, "umber"]] },
  { Y0: 290, Y1: 372, parts: [[10, 220, 46, "ochre"], [230, 420, 34, "sand"], [430, 620, 46, "terracotta"], [630, 870, 34, "rose"]] },
];

function nearSide(ox: number): void {
  poly3("gGrass", [[ox, 102, 0], [ox + L, 102, 0], [ox + L, 150, 0], [ox, 150, 0]]);
  for (let x = 6; x < L; x += 88) {
    box(["rpLeaf", "rpLeafDark", "bTreeDark"], ox + x, ox + x + 70, 104, 110, 0, 5);
    blob("aCoral", ox + x + 20, 130, 0, 5, 6);
    blob("aMustard", ox + x + 56, 136, 0, 5, 6);
  }
  poly3("gRoadFar", [[ox, 152, 0], [ox + L, 152, 0], [ox + L, 174, 0], [ox, 174, 0]]);
  poly3("gRoadFar", [[ox, 256, 0], [ox + L, 256, 0], [ox + L, 286, 0], [ox, 286, 0]]);
  for (const row of NEAR_ROWS) {
    for (const [x0, x1, h, brick] of row.parts) {
      const X0 = ox + x0;
      const X1 = ox + x1;
      front(`fr_${brick}`, X0, X1, row.Y1, 0, h);
      side(`sSide_${brick}`, X1, row.Y0, row.Y1, 0, h);
      front("frWin", X0 + 8, X1 - 8, row.Y1, h - 22, h - 12);
      top("rfRoof", X0, X1, row.Y0, row.Y1, h);
      top("rfParapetTop", X0, X1, row.Y0, row.Y0 + 3, h + 2);
      // Roof clutter: a vent box, a planter strip, a skylight.
      box(["rpTankTop", "rpTank", "rpTank"], X0 + 18, X0 + 34, row.Y0 + 20, row.Y0 + 36, h, h + 8);
      box(["rpSoil", "rpBed", "rpBedSide"], X0 + 50, X1 - 30, row.Y1 - 18, row.Y1 - 10, h, h + 4);
      if (x1 - x0 > 160) top("rpGlassFrame", X1 - 70, X1 - 40, row.Y0 + 14, row.Y0 + 40, h + 0.5);
    }
  }
}

function rooftops(ox: number): void {
  // Café roof (H 60): planter rows and the watering spot. Stay 30 units clear of the taller neighbour.
  const hc = height(BLOCK1[0]!);
  for (const y of [-74, -56]) {
    box(["rpSoil", "rpBed", "rpBedSide"], ox + 70, ox + 118, y, y + 9, hc - PARAPET + 1, hc - PARAPET + 6);
    for (let x = ox + 74; x < ox + 116; x += 10) blob("rpLeaf", x + 2, y + 4.5, hc - PARAPET + 6, 4.4, 6);
  }
  // Roof C (H 60): greenhouse, two raised beds the second gardener moves between.
  const c = BLOCK1[2]!;
  const h2 = height(c) - PARAPET + 1;
  greenhouse(ox + 246, ox + 280, -84, -56, h2);
  for (const bx of [BED1_X, BED2_X]) {
    box(["rpSoil", "rpBed", "rpBedSide"], ox + bx - 7, ox + bx + 7, -46, -14, h2, h2 + 6);
    for (let y = -42; y < -14; y += 7) blob("rpLeafDark", ox + bx, y + 2, h2 + 6, 3.2, 4.5);
  }
  // Roof D (H 84): rooftop tank and a vent.
  const hd = height(BLOCK1[3]!) - PARAPET + 1;
  box(["rpTankTop", "rpTank", "rpTank"], ox + 340, ox + 356, -70, -54, hd, hd + 14);
  box(["rpTankTop", "rpTank", "rpTank"], ox + 368, ox + 378, -30, -20, hd, hd + 6);
  // Roof E (H 60): pergola and laundry poles.
  const he = height(BLOCK2[0]!) - PARAPET + 1;
  for (const [px, py] of [[470, -80], [500, -80], [470, -50], [500, -50]] as [number, number][]) {
    front("rpWoodDark", ox + px, ox + px + 3, py + 3, he, he + 22);
  }
  for (let x = 470; x <= 500; x += 10) top("rpWood", ox + x, ox + x + 3, -82, -46, he + 22);
  for (const y of [-74, -62]) for (let x = 474; x < 500; x += 7) blob("rpLeaf", ox + x, y, he + 2, 3.5, 6);
  box(["rpWood", "rpWood", "rpWoodDark"], ox + LAUNDRY_X0, ox + LAUNDRY_X0 + 2, LAUNDRY_Y - 1, LAUNDRY_Y + 1, he, he + 24);
  box(["rpWood", "rpWood", "rpWoodDark"], ox + LAUNDRY_X1, ox + LAUNDRY_X1 + 2, LAUNDRY_Y - 1, LAUNDRY_Y + 1, he, he + 24);
  poly3("rpLine", [[ox + LAUNDRY_X0 + 1, LAUNDRY_Y, he + 23], [ox + LAUNDRY_X1 + 1, LAUNDRY_Y, he + 23], [ox + LAUNDRY_X1 + 1, LAUNDRY_Y, he + 22.4], [ox + LAUNDRY_X0 + 1, LAUNDRY_Y, he + 22.4]]);
  // Roof G (H 108): solar-style frames and a vent.
  const hg = height(BLOCK2[2]!) - PARAPET + 1;
  for (const y of [-80, -62, -44]) box(["rpGlassFrame", "rpTank", "rpTank"], ox + 676, ox + 740, y, y + 12, hg, hg + 3);
  // Roof H (H 60): planter ring with shrubs that sway.
  const hh = height(BLOCK2[3]!) - PARAPET + 1;
  box(["rpSoil", "rpBed", "rpBedSide"], ox + 790, ox + 860, -80, -70, hh, hh + 5);
  box(["rpSoil", "rpBed", "rpBedSide"], ox + 790, ox + 800, -70, -20, hh, hh + 5);
  // Park trees in front of the exposed viaduct: low, so the train stays visible.
  for (const [tx, ty] of [[500, -200], [560, -170], [620, -205], [660, -160]] as [number, number][]) {
    box(["rpWoodDark", "rpWoodDark", "rpWoodDark"], ox + tx - 1, ox + tx + 1, ty - 1, ty + 1, 0, 12);
    blob("bTreeDark", ox + tx, ty, 10, 10, 14);
    blob("bTree", ox + tx - 1, ty + 1, 14, 7, 9);
  }
}

/** A rounded clump: an ellipse-ish polygon standing on (X, Y, Z). */
function blob(id: string, X: number, Y: number, Zv: number, r: number, hgt: number): void {
  const c = iso(X, Y, Zv);
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(a) * r * 1.3, y: c.y - hgt * 0.55 + Math.sin(a) * hgt * 0.55 });
  }
  poly(id, pts);
}

function greenhouse(X0: number, X1: number, Y0: number, Y1: number, Zb: number): void {
  const h = 18;
  box(["rpGlass", "rpGlass", "rpGlass"], X0, X1, Y0, Y1, Zb, Zb + h);
  poly3("rpGlassFrame", [[X0, Y0, Zb + h], [X1, Y0, Zb + h], [X1, (Y0 + Y1) / 2, Zb + h + 9], [X0, (Y0 + Y1) / 2, Zb + h + 9]]);
  for (let x = X0; x <= X1; x += 8.5) front("rpGlassFrame", x, x + 0.8, Y1, Zb, Zb + h);
  for (let y = Y0; y <= Y1; y += 7) side("rpGlassFrame", X1, y, y + 0.8, Zb, Zb + h);
}

function lamps(ox: number): void {
  for (const x of [150, 330, 560, 760]) {
    front("aLamp", ox + x, ox + x + 1.6, 12, 0, 42);
    box(["aLampGlow", "aLamp", "aLamp"], ox + x - 2, ox + x + 3.6, 9, 14.6, 42, 46);
  }
}

// ---------------------------------------------------------------------------
// Periodic expressions: sums of clamped ramps of u = (t + phase) % period.

type Knot = { u: number; v: number; ease?: "linear" | "out" | "in" | "smooth" };

function uText(period: number, phase: number): string {
  const p = ((phase % period) + period) % period;
  return p === 0 ? `(t % ${n(period, 3)})` : `((t + ${n(p, 3)}) % ${n(period, 3)})`;
}

function rampText(c: string, ease: Knot["ease"]): string {
  if (ease === "out") return `${c} * (2 - ${c})`;
  if (ease === "in") return `${c} * ${c}`;
  if (ease === "smooth") return `${c} * ${c} * (3 - 2 * ${c})`;
  return c;
}

function rampValue(c: number, ease: Knot["ease"]): number {
  if (ease === "out") return c * (2 - c);
  if (ease === "in") return c * c;
  if (ease === "smooth") return c * c * (3 - 2 * c);
  return c;
}

/** Piecewise curve through knots over one period. knots[0].u = 0, last u = period, same value at both ends. */
function wave(knots: Knot[], period: number, phase: number, offset = 0, digits = 2): string {
  checkKnots(knots, period);
  const u = uText(period, phase);
  const terms: string[] = [n(knots[0]!.v + offset, digits)];
  for (let i = 0; i + 1 < knots.length; i += 1) {
    const a = knots[i]!;
    const b = knots[i + 1]!;
    const dv = b.v - a.v;
    if (Math.abs(dv) < 1e-9) continue;
    const c = `clamp((${u} - ${n(a.u, 3)}) * ${n(1 / (b.u - a.u), 4)}, 0, 1)`;
    const mag = n(Math.abs(dv), digits);
    terms.push(`${dv < 0 ? "-" : "+"} ${mag} * ${rampText(c, a.ease)}`);
  }
  return terms.join(" ");
}

function waveValue(knots: Knot[], period: number, phase: number, t: number, offset = 0): number {
  const p = ((phase % period) + period) % period;
  const u = (t + p) % period;
  let v = knots[0]!.v + offset;
  for (let i = 0; i + 1 < knots.length; i += 1) {
    const a = knots[i]!;
    const b = knots[i + 1]!;
    const c = Math.max(0, Math.min(1, (u - a.u) / (b.u - a.u)));
    v += (b.v - a.v) * rampValue(c, a.ease);
  }
  return v;
}

function checkKnots(knots: Knot[], period: number): void {
  if (knots[0]!.u !== 0 || Math.abs(knots[knots.length - 1]!.u - period) > 1e-9) throw new Error("Knots must span one period.");
  if (Math.abs(knots[0]!.v - knots[knots.length - 1]!.v) > 1e-6) throw new Error("Knots must close.");
  for (let i = 1; i < knots.length; i += 1) if (knots[i]!.u <= knots[i - 1]!.u) throw new Error("Knots must increase.");
}

/** A closed route: waypoints in world X, Y at times u within one period. */
type Way = { u: number; X: number; Y: number; ease?: Knot["ease"] };
type Route = { period: number; ways: Way[] };

function routeKnots(route: Route, pick: (w: Way) => number): Knot[] {
  return route.ways.map((w) => ({ u: w.u, v: pick(w), ease: w.ease }));
}

function routeAt(route: Route, phase: number, t: number): { X: number; Y: number } {
  const X = waveValue(routeKnots(route, (w) => w.X), route.period, phase, t);
  const Y = waveValue(routeKnots(route, (w) => w.Y), route.period, phase, t);
  return { X, Y };
}

/** Rotate a route so that it starts at u = 0 and closes at u = period. */
function closeRoute(period: number, ways: Way[]): Route {
  const first = ways[0]!;
  const last = ways[ways.length - 1]!;
  if (first.u !== 0) throw new Error("Route must start at u = 0.");
  if (last.u !== period) ways.push({ u: period, X: first.X, Y: first.Y });
  return { period, ways };
}

function placeTracks(id: string, route: Route, phase: number, ox: number, dy = 0, dz = 0): string[] {
  const sx = routeKnots(route, (w) => w.X - (w.Y + dy));
  const sy = routeKnots(route, (w) => (w.X + w.Y + dy) / 2 - dz);
  return [
    animate(`${id}.position.x`, wave(sx, route.period, phase, ox)),
    animate(`${id}.position.y`, wave(sy, route.period, phase, ox / 2)),
  ];
}

function animate(target: string, expression: string): string {
  return `animate ${target} {\n  expression "${expression}";\n  start 0s;\n  duration 30s;\n};`;
}

/** Heading of a route segment: 1 along ±X, −1 along ±Y (the sprite is mirrored). */
function headingKnots(route: Route, turn = 0.16): Knot[] {
  const segs: { u0: number; u1: number; h: number }[] = [];
  for (let i = 0; i + 1 < route.ways.length; i += 1) {
    const a = route.ways[i]!;
    const b = route.ways[i + 1]!;
    const dx = Math.abs(b.X - a.X);
    const dy = Math.abs(b.Y - a.Y);
    if (dx < 1e-6 && dy < 1e-6) continue;
    segs.push({ u0: a.u, u1: b.u, h: dx >= dy ? 1 : -1 });
  }
  const knots: Knot[] = [{ u: 0, v: segs[0]!.h }];
  for (let i = 1; i < segs.length; i += 1) {
    if (segs[i]!.h === segs[i - 1]!.h) continue;
    const at = segs[i]!.u0;
    knots.push({ u: at - turn, v: segs[i - 1]!.h });
    knots.push({ u: at + turn, v: segs[i]!.h });
  }
  knots.push({ u: route.period, v: segs[0]!.h });
  return knots;
}

/**
 * 1 except on the back-street leg. A vehicle there is behind the front row, but the front row's
 * side faces paint below the street layer (so cross-street traffic can pass in front of them),
 * so it would draw over them. The corners where it vanishes are covered by the next building.
 */
function streetSideKnots(route: Route): Knot[] {
  const knots: Knot[] = [{ u: 0, v: 1 }];
  for (let i = 0; i + 1 < route.ways.length; i += 1) {
    const a = route.ways[i]!;
    const b = route.ways[i + 1]!;
    if (a.Y > -100 || b.Y > -100) continue;
    knots.push({ u: a.u, v: 1 }, { u: a.u + 0.01, v: 0 }, { u: b.u - 0.01, v: 0 }, { u: b.u, v: 1 });
  }
  knots.push({ u: route.period, v: 1 });
  return knots.filter((k, i, all) => i === 0 || k.u > all[i - 1]!.u);
}

function onStreetSide(route: Route, phase: number, t: number): boolean {
  return waveValue(streetSideKnots(route), route.period, phase, t) > 0.5;
}

/** 1 while the route moves, 0 while it waits, with short ramps. */
function movingKnots(route: Route, ramp = 0.18): Knot[] {
  const knots: Knot[] = [{ u: 0, v: 1 }];
  for (let i = 0; i + 1 < route.ways.length; i += 1) {
    const a = route.ways[i]!;
    const b = route.ways[i + 1]!;
    if (Math.abs(b.X - a.X) + Math.abs(b.Y - a.Y) > 1e-6) continue;
    knots.push({ u: a.u, v: 1 });
    knots.push({ u: a.u + ramp, v: 0 });
    knots.push({ u: b.u - ramp, v: 0 });
    knots.push({ u: b.u, v: 1 });
  }
  knots.push({ u: route.period, v: 1 });
  return knots.filter((k, i, all) => i === 0 || k.u > all[i - 1]!.u);
}

function squareWave(period: number, phase: number, sharp = 7, invert = false): string {
  const w = (2 * Math.PI) / period;
  return `clamp(0.5 ${invert ? "-" : "+"} ${sharp} * sin(t * ${n(w, 5)} + ${n(phase * w, 4)}), 0, 1)`;
}


// ---------------------------------------------------------------------------
// Actor routes (unit-local), all periods divide 30s.

const PED_PERIOD = 30;
const PED = { cross1: 0.8, cross: 3.8, far: 8.0, gather: 1.2 };

/**
 * The crossing loop of one block: near sidewalk −X to crossing 1, crossing 1 near→far, far
 * sidewalk +X past the shops, a pause at crossing 2, crossing 2 far→near. u = 0 lies inside the
 * near-sidewalk leg, so the walking speed is the same on both sides of the seam.
 */
function pedLoop(c1: number, c2: number): Route {
  const u1 = PED.cross1;
  const u2 = u1 + PED.cross;
  const u3 = u2 + PED.far;
  const u4 = u3 + PED.gather;
  const u5 = u4 + PED.cross;
  const nearT = PED_PERIOD - u5 + u1;
  const vn = (c2 - c1) / nearT;
  return closeRoute(PED_PERIOD, [
    { u: 0, X: c1 + u1 * vn, Y: WALK_NEAR },
    { u: u1, X: c1, Y: WALK_NEAR },
    { u: u2, X: c1, Y: WALK_FAR },
    { u: u3, X: c2, Y: WALK_FAR },
    { u: u4, X: c2, Y: WALK_FAR },
    { u: u5, X: c2, Y: WALK_NEAR },
  ]);
}

/** Phase that puts a loop walker at X on the far sidewalk at time t. */
function farPhase(route: Route, X: number, t: number): number {
  const a = route.ways[2]!;
  const b = route.ways[3]!;
  const u = a.u + ((X - a.X) / (b.X - a.X)) * (b.u - a.u);
  return (((u - t) % PED_PERIOD) + PED_PERIOD) % PED_PERIOD;
}

type Walker = { id: string; route: Route; phase: number; dx: number; dy: number; coat: string; head: string };

const LOOP1 = pedLoop(CROSS1, CROSS2);
const LOOP2 = pedLoop(CROSS3, CROSS4);

const VAN_STOP_X = 176;
/** C is screened by the parked van body at 0:09 (iso: 21 units upstream of its centre); D is under the café awning at 0:07. */
const C_AT: [number, number] = [VAN_STOP_X - 21, 9.0];
const D_AT: [number, number] = [114, 6.7];

/** Pair A/B crosses behind the car at 0:01; C passes behind the parked van; D walks under the café awning. */
const WALKERS: Walker[] = [
  { id: "pedA", route: LOOP1, phase: 0, dx: 0, dy: 0, coat: CORAL, head: SKIN },
  { id: "pedB", route: LOOP1, phase: PED_PERIOD - 0.55, dx: 7, dy: 3, coat: TEAL, head: "#c98f6a" },
  { id: "pedC", route: LOOP1, phase: farPhase(LOOP1, C_AT[0], C_AT[1]), dx: 0, dy: 0, coat: "#5a6d8a", head: "#d6a07c" },
  { id: "pedD", route: LOOP1, phase: farPhase(LOOP1, D_AT[0], D_AT[1]), dx: -4, dy: -3, coat: MUSTARD, head: SKIN },
  { id: "pedE", route: LOOP2, phase: 7, dx: 0, dy: 0, coat: "#8a5a8a", head: SKIN },
  { id: "pedF", route: LOOP2, phase: 6.45, dx: 7, dy: 3, coat: CORAL_DARK, head: "#c98f6a" },
];

const CAR_PERIOD = 15;
function carLoop(xDown: number, xUp: number): Route {
  const a = { X: xDown, Y: BACK_STREET };
  const b = { X: xDown, Y: LANE_CAR };
  const c = { X: xUp, Y: LANE_CAR };
  const d = { X: xUp, Y: BACK_STREET };
  const legs = [Math.abs(b.Y - a.Y), Math.abs(c.X - b.X), Math.abs(d.Y - c.Y), Math.abs(a.X - d.X)];
  const total = legs.reduce((s, v) => s + v, 0);
  let u = 0;
  const ways: Way[] = [{ u: 0, ...a }];
  for (const [i, p] of [b, c, d, a].entries()) {
    u += (legs[i]! / total) * CAR_PERIOD;
    ways.push({ u: i === 3 ? CAR_PERIOD : u, ...p });
  }
  return { period: CAR_PERIOD, ways };
}
/** Cross-street lanes: down at X 40 and 446, up at X 424 and 904 (the next unit's 24); the van uses 36 and 431. */
const CAR1 = carLoop(40, 424);
const CAR2 = carLoop(446, L + 24);
/** Car 1 reaches the main street just before 0:00 and rolls past the café. */
const CAR1_PHASE = 2.05;
const CAR2_PHASE = 3;

const VAN_PERIOD = 30;
const VAN_H = 24;
const VAN = closeRoute(VAN_PERIOD, [
  { u: 0, X: 36, Y: -86 },
  { u: 4.4, X: 36, Y: -40 },
  { u: 5.3, X: 36, Y: LANE_VAN },
  { u: 7.0, X: VAN_STOP_X, Y: LANE_VAN, ease: undefined },
  { u: 19.6, X: VAN_STOP_X, Y: LANE_VAN, ease: "in" },
  { u: 21.8, X: 431, Y: LANE_VAN },
  { u: 23.0, X: 431, Y: -112 },
  { u: 27.0, X: 36, Y: -112 },
]);
VAN.ways[3]!.ease = undefined;
VAN.ways[2]!.ease = "out";
/** The van switches between the street layer and the layer above walkers at the building line. */
const VAN_FRONT_ON = 5.15;
const VAN_FRONT_OFF = 21.96;

/** Cyclists: one per unit, 2L per 30s, so the copies hand over every 15s. */
const BIKE_SPEED = (2 * L) / 30;
const BIKE_X0 = 0;

const BED1_X = 256;
const BED2_X = 292;
const LAUNDRY_X0 = 506;
const LAUNDRY_X1 = 540;
const LAUNDRY_Y = -36;

const GARDEN_PERIOD = 15;
const GARDENER_B = closeRoute(GARDEN_PERIOD, [
  { u: 0, X: BED1_X + 10, Y: -30 },
  { u: 2.5, X: BED1_X + 10, Y: -30 },
  { u: 4.4, X: BED2_X - 10, Y: -30, ease: undefined },
  { u: 7.4, X: BED2_X - 10, Y: -30 },
  { u: 9.4, X: BED1_X + 10, Y: -30 },
]);

/** Watering: tip at 1.6s, pour, return by 3.8s, every 10s. */
const WATER_PERIOD = 10;
const WATER_KNOTS: Knot[] = [
  { u: 0, v: 0 },
  { u: 1.6, v: 0, ease: "smooth" },
  { u: 2.2, v: -0.85 },
  { u: 3.2, v: -0.85, ease: "smooth" },
  { u: 3.8, v: 0 },
  { u: 10, v: 0 },
];
const POUR_KNOTS: Knot[] = [
  { u: 0, v: 0 },
  { u: 2.1, v: 0 },
  { u: 2.3, v: 1 },
  { u: 3.15, v: 1 },
  { u: 3.35, v: 0 },
  { u: 10, v: 0 },
];

// ---------------------------------------------------------------------------
// Camera: centre in projected world coordinates, and zoom.

/** Camera keys: position (projected world) or zoom, with the velocity the curve passes through. */
type CamKey = { t: number; v: number; d: number };
type CamPlan = { x: CamKey[]; y: CamKey[]; z: CamKey[] };
const C0 = { x: 50, y: 2 };
const OPENING_ZOOM = 2;
const WIDE_ZOOM = 0.8;

/** Train: constant speed through the pass; solved below from the camera at 0:13. */
const TRAIN_CARS = 4;
const CAR_LEN = 64;
const CAR_GAP = 6;
const TRAIN_LEN = TRAIN_CARS * CAR_LEN + (TRAIN_CARS - 1) * CAR_GAP;
const TRAIN_W = 14;
const TRAIN_H = 22;

/** Height of the frame centre above the street line, projected. */
const CLOSE_LIFT = 23;
const WIDE_LIFT = 150;
/** The match with the train: ramp up, a short plateau at train speed, ramp down. */
const MATCH = { start: 14.9, ramp: 0.3, plateau: 0.3 };

function cameraPlan(trainSpeed: number): CamPlan {
  const v = trainSpeed;
  const pan = 37;
  const m0 = MATCH.start;
  const m1 = m0 + MATCH.ramp;
  const m2 = m1 + MATCH.plateau;
  const m3 = m2 + MATCH.ramp;
  const xm0 = 404;
  const xm1 = xm0 + 0.5 * MATCH.ramp * v;
  const xm2 = xm1 + MATCH.plateau * v;
  const xm3 = xm2 + 0.5 * MATCH.ramp * v;
  const x: CamKey[] = [
    { t: 0, v: C0.x, d: 0 },
    { t: 0.5, v: C0.x, d: 0 },
    { t: 2, v: C0.x + 28, d: pan },
    { t: 9.4, v: C0.x + 28 + pan * 7.4, d: pan },
    { t: 14, v: 400, d: 8 },
    { t: m0, v: xm0, d: 8 },
    { t: m1, v: xm1, d: v },
    { t: m2, v: xm2, d: v },
    { t: m3, v: xm3, d: 4 },
    { t: 20, v: 530, d: 5 },
    { t: 23, v: 548, d: 22 },
    { t: 25, v: 650, d: 70 },
    { t: 29.5, v: C0.x + L, d: 0 },
    { t: 30, v: C0.x + L, d: 0 },
  ];
  // Height of the frame centre above the street line, and how fast it changes, at each x key.
  const lift: Record<number, [number, number]> = {
    0: [CLOSE_LIFT, 0],
    0.5: [CLOSE_LIFT, 0],
    2: [CLOSE_LIFT, 0],
    9.4: [CLOSE_LIFT, 0],
    14: [WIDE_LIFT, 6],
    [m0]: [WIDE_LIFT, 0],
    [m1]: [WIDE_LIFT, 0],
    [m2]: [WIDE_LIFT, 0],
    [m3]: [WIDE_LIFT, 0],
    20: [WIDE_LIFT, 0],
    23: [60, -30],
    25: [CLOSE_LIFT, 0],
    29.5: [CLOSE_LIFT, 0],
    30: [CLOSE_LIFT, 0],
  };
  const y: CamKey[] = x.map((key) => ({ t: key.t, v: key.v / 2 - lift[key.t]![0], d: key.d / 2 - lift[key.t]![1] }));
  const z: CamKey[] = [
    { t: 0, v: OPENING_ZOOM, d: 0 },
    { t: 9.4, v: OPENING_ZOOM, d: 0 },
    { t: 14, v: WIDE_ZOOM, d: 0 },
    { t: 20, v: WIDE_ZOOM, d: 0 },
    { t: 23, v: 1.72, d: 0.3 },
    { t: 25, v: OPENING_ZOOM, d: 0 },
    { t: 30, v: OPENING_ZOOM, d: 0 },
  ];
  return { x, y, z };
}

function hermite(keys: CamKey[], t: number): number {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1]!.t <= t) i += 1;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const T = b.t - a.t;
  const s = Math.max(0, Math.min(1, (t - a.t) / T));
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a.v + (s3 - 2 * s2 + s) * T * a.d + (-2 * s3 + 3 * s2) * b.v + (s3 - s2) * T * b.d;
}

function cameraAt(plan: CamPlan, t: number): { x: number; y: number; z: number } {
  return { x: hermite(plan.x, t), y: hermite(plan.y, t), z: hermite(plan.z, t) };
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
  return { text: `${n(value * 100, digits)}%`, value };
}

function keyframes(target: string, keys: { t: number; v: number; ease: Ease }[]): string {
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  keys.forEach((key, index) => {
    const pct = percent(ms(key.t), previous);
    previous = pct.value;
    const ease = index < keys.length - 1 && key.ease !== "linear" ? ` ease ${key.ease}` : "";
    lines.push(`  ${pct.text} ${n(key.v, 3)}${ease};`);
  });
  lines.push("};");
  return lines.join("\n");
}

/** Cubic Hermite segments as cubic(1/3, y1, 2/3, y2) eases: x stays linear in time, y passes the key velocities. */
function cameraTrack(target: string, keys: CamKey[]): string {
  const lines = [`keyframes ${target} {`, "  start 0s;", "  duration 30s;"];
  let previous = -1;
  keys.forEach((key, index) => {
    const pct = percent(ms(key.t), previous);
    previous = pct.value;
    let ease = "";
    const next = keys[index + 1];
    if (next) {
      const dv = next.v - key.v;
      const dt = next.t - key.t;
      if (Math.abs(dv) < 1e-9) ease = key.d === 0 && next.d === 0 ? " ease hold" : "";
      else ease = ` ease cubic(0.3333, ${n((key.d * dt) / (3 * dv), 4)}, 0.6667, ${n(1 - (next.d * dt) / (3 * dv), 4)})`;
    }
    lines.push(`  ${pct.text} ${n(key.v, 3)}${ease};`);
  });
  lines.push("};");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sprites. Local coordinates are the iso projection of a box around the actor's
// ground point, heading +X. scale.x = −1 mirrors a +X sprite into a +Y one.

function boxFaces(X0: number, X1: number, Y0: number, Y1: number, Z0: number, Z1: number): { top: string; front: string; side: string } {
  return {
    top: quadPath([[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]]),
    front: quadPath([[X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X0, Y1, Z1]]),
    side: quadPath([[X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X1, Y0, Z1]]),
  };
}

function footprint(X0: number, X1: number, Y0: number, Y1: number): string {
  return quadPath([[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]]);
}

function carSprite(id: string, body: string, bodyDark: string, bodyTop: string, z: number): string {
  const b = boxFaces(-15, 15, -7, 7, 3, 11);
  const cab = boxFaces(-8, 7, -6, 6, 11, 18);
  const glass = [
    quadPath([[-6, 6, 12], [5, 6, 12], [5, 6, 17], [-6, 6, 17]]),
    quadPath([[7, -5, 12], [7, 5, 12], [7, 5, 17], [7, -5, 17]]),
  ].join(" ");
  const lights = [quadPath([[15, -6, 6], [15, -3, 6], [15, -3, 9], [15, -6, 9]]), quadPath([[15, 3, 6], [15, 6, 6], [15, 6, 9], [15, 3, 9]])].join(" ");
  const wheels = [-9, 9].map((x) => quadPath([[x - 3.5, 7, 0], [x + 3.5, 7, 0], [x + 3.5, 7, 5], [x - 3.5, 7, 5]])).join(" ");
  return `group ${id} {
  zIndex ${z};
  path shadow { fill ${SHADOW}; ${footprint(-18, 18, -9, 10)} };
  path wheels { fill ${INK}; ${wheels} ${quadPath([[15, 4, 0], [15, 7, 0], [15, 7, 4], [15, 4, 4]])} };
  path shade { fill ${bodyDark}; ${b.side} ${cab.side} };
  path body { fill ${body}; ${b.front} ${cab.front} };
  path roof { fill ${bodyTop}; ${b.top} ${cab.top} };
  path glass { fill ${GLASS}; ${glass} ${lights} };
};`;
}

function vanSprite(id: string, z: number, visible: boolean): string {
  // Height 24 keeps the roof under building E (60) where the van turns off the cross street.
  const cargo = boxFaces(-20, 8, -7, 7, 3, VAN_H);
  const cabF = boxFaces(8, 20, -7, 7, 3, 17);
  const cabB = boxFaces(-32, -20, -7, 7, 3, 17);
  const winF = quadPath([[20, -5, 10], [20, 5, 10], [20, 5, 16], [20, -5, 16]]) + " " + quadPath([[10, 7, 10], [18, 7, 10], [18, 7, 16], [10, 7, 16]]);
  const winB = quadPath([[-30, 7, 10], [-22, 7, 10], [-22, 7, 16], [-30, 7, 16]]);
  const wheels = [-14, 2, 14].map((x) => quadPath([[x - 3.5, 7, 0], [x + 3.5, 7, 0], [x + 3.5, 7, 5], [x - 3.5, 7, 5]])).join(" ");
  const wheelsB = [-26, -10, 2].map((x) => quadPath([[x - 3.5, 7, 0], [x + 3.5, 7, 0], [x + 3.5, 7, 5], [x - 3.5, 7, 5]])).join(" ");
  const stripe = quadPath([[-19, 7, 12], [7, 7, 12], [7, 7, 15], [-19, 7, 15]]);
  return `group ${id} {
  zIndex ${z};
  visible ${visible};
  path shadow { fill ${SHADOW}; ${footprint(-34, 23, -9, 10)} };
  group cabBack {
    opacity 0;
    path wheels { fill ${INK}; ${wheelsB} };
    path side { fill ${MUSTARD_DARK}; ${cabB.side} };
    path body { fill ${MUSTARD}; ${cabB.front} };
    path roof { fill ${MUSTARD_TOP}; ${cabB.top} };
    path glass { fill ${GLASS}; ${winB} };
  };
  group cabFront {
    path wheels { fill ${INK}; ${wheels} };
  };
  path cargoSide { fill ${MUSTARD_DARK}; ${cargo.side} };
  path cargo { fill ${MUSTARD}; ${cargo.front} };
  path cargoTop { fill ${MUSTARD_TOP}; ${cargo.top} };
  path stripe { fill ${CORAL}; ${stripe} };
  group cab {
    path side { fill ${MUSTARD_DARK}; ${cabF.side} };
    path body { fill ${MUSTARD}; ${cabF.front} };
    path roof { fill ${MUSTARD_TOP}; ${cabF.top} };
    path glass { fill ${GLASS}; ${winF} };
  };
};`;
}

function walkerSprite(id: string, coat: string, head: string, z: number): string {
  const legs = `move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close;`;
  return `group ${id} {
  zIndex ${z};
  ellipse shadow { position (0, 0); size (14, 6); fill ${SHADOW}; };
  path legs { fill ${INK}; ${legs} };
  rectangle coat { position (-3.6, -23); size (7.2, 12.5); cornerRadius 2.4; fill ${coat}; };
  circle head { position (0, -26.4); radius 3.3; fill ${head}; };
};`;
}

function cyclistSprite(id: string, z: number): string {
  const wheel = (cx: number) => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return iso(cx + Math.cos(a) * 6, 0, 6 + Math.sin(a) * 6);
    });
    geometryItems += 15;
    return `move (${n(pts[0]!.x)}, ${n(pts[0]!.y)}); ${pts.slice(1).map((p) => `line (${n(p.x)}, ${n(p.y)});`).join(" ")} close;`;
  };
  const frame = [iso(-9, 0, 6), iso(-1, 0, 7), iso(4, 0, 15), iso(-4, 0, 15), iso(-9, 0, 6)];
  const fork = [iso(9, 0, 6), iso(5, 0, 17)];
  geometryItems += 8;
  return `group ${id} {
  zIndex ${z};
  ellipse shadow { position (0, 0); size (26, 8); fill ${SHADOW}; };
  path wheels { stroke ${INK} width 1.3; ${wheel(-9)} ${wheel(9)} };
  path frame { stroke ${TEAL_DARK} width 1.6 cap round join round; move (${n(frame[0]!.x)}, ${n(frame[0]!.y)}); ${frame.slice(1).map((p) => `line (${n(p.x)}, ${n(p.y)});`).join(" ")} move (${n(fork[0]!.x)}, ${n(fork[0]!.y)}); line (${n(fork[1]!.x)}, ${n(fork[1]!.y)}); };
  group rider {
    position (${n(iso(-3, 0, 16).x)}, ${n(iso(-3, 0, 16).y)});
    path legs { pivot (0, 0); fill ${INK}; move (-1, 0); line (1.2, 0); line (5, 8); line (3, 8.6); close; move (-1, 0); line (1, 0); line (-1.5, 8.4); line (-3.2, 7.6); close; };
    rectangle coat { position (-3, -13); size (6.4, 13); cornerRadius 2; fill ${CORAL}; rotation 14deg; };
    circle head { position (3.6, -16); radius 3.2; fill ${SKIN}; };
  };
};`;
}

function gardenerA(id: string, ox: number): string {
  const h = height(BLOCK1[0]!) - PARAPET + 1;
  const at = iso(ox + 92, -40, h);
  return `group ${id} {
  position (${n(at.x)}, ${n(at.y)});
  zIndex ${Z.roof};
  ellipse shadow { size (14, 6); fill ${SHADOW}; };
  path legs { fill ${INK}; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill ${TEAL}; };
  circle head { position (0, -26.4); radius 3.3; fill ${SKIN}; };
  path hat { fill ${MUSTARD}; move (-5, -28); line (5, -28); line (2.5, -31); line (-2.5, -31); close; };
  group arm {
    position (2.5, -19);
    path can { fill ${CORAL}; stroke ${CORAL_DARK} width 0.6; move (0, 0); line (7, 2); line (7, 4); line (9, 4); line (9, 10); line (3, 10); line (3, 4); line (5, 4); line (5, 2.6); line (0, 1.2); close; move (9, 5); line (15, 2); line (15.6, 3); line (9, 7); close; };
    path water { opacity 0; stroke #8fd0e6 width 0.9 cap round; move (15.6, 3.4); line (16.4, 7); move (17.2, 4.2); line (18.4, 8.4); move (16.2, 9); line (16.8, 12); move (18.6, 10); line (19.4, 13.4); };
  };
};`;
}

function gardenerB(id: string): string {
  return `group ${id} {
  zIndex ${Z.roof};
  ellipse shadow { size (14, 6); fill ${SHADOW}; };
  path legs { fill ${INK}; move (-1.6, -12); line (-0.2, -12); line (-2.4, 0); line (-3.8, 0); close; move (0.2, -12); line (1.6, -12); line (3.8, 0); line (2.4, 0); close; };
  rectangle coat { position (-3.8, -23); size (7.6, 12.5); cornerRadius 2.4; fill ${MUSTARD}; };
  circle head { position (0, -26.4); radius 3.3; fill #c98f6a; };
  path pot { fill ${PLANTER}; move (-5, -18); line (5, -18); line (4, -11); line (-4, -11); close; };
  ellipse plant { position (0, -21); size (11, 7); fill ${LEAF}; };
};`;
}

function laundry(id: string, ox: number): string {
  const he = height(BLOCK2[0]!) - PARAPET + 1;
  const pivot = iso(ox + LAUNDRY_X0, LAUNDRY_Y, he + 22.4);
  const cloths: string[] = [];
  const colours = [CREAM, CORAL, TEAL_ROOF_EDGE, MUSTARD_TOP];
  for (const [i, x] of [LAUNDRY_X0 + 4, LAUNDRY_X0 + 12, LAUNDRY_X0 + 20, LAUNDRY_X0 + 27].entries()) {
    const pts: V3[] = [[ox + x, LAUNDRY_Y, he + 22.4], [ox + x + 6, LAUNDRY_Y, he + 22.4], [ox + x + 6, LAUNDRY_Y, he + 13 + (i % 2) * 2], [ox + x, LAUNDRY_Y, he + 14]];
    const p = pts.map(([X, Y, Zv]) => {
      const q = iso(X, Y, Zv);
      return { x: q.x - pivot.x, y: q.y - pivot.y };
    });
    geometryItems += 5;
    cloths.push(`path c${i} { fill ${colours[i]}; move (${n(p[0]!.x)}, ${n(p[0]!.y)}); ${p.slice(1).map((q) => `line (${n(q.x)}, ${n(q.y)});`).join(" ")} close; };`);
  }
  return `group ${id} {
  position (${n(pivot.x)}, ${n(pivot.y)});
  zIndex ${Z.roof};
  ${cloths.join("\n  ")}
};`;
}

function shrubs(id: string, ox: number): string {
  const hh = height(BLOCK2[3]!) - PARAPET + 1;
  const base = iso(ox + 826, -75, hh + 5);
  const parts: string[] = [];
  for (const [X, Y] of [[796, -75], [808, -75], [820, -75], [832, -75], [844, -75], [795, -60], [795, -46], [795, -32]] as [number, number][]) {
    const c = iso(ox + X, Y, hh + 5);
    const pts: Pt[] = [];
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      pts.push({ x: c.x - base.x + Math.cos(a) * 6, y: c.y - base.y - 6 + Math.sin(a) * 6 });
    }
    geometryItems += 9;
    parts.push(`move (${n(pts[0]!.x)}, ${n(pts[0]!.y)}); ${pts.slice(1).map((q) => `line (${n(q.x)}, ${n(q.y)});`).join(" ")} close;`);
  }
  return `path ${id} { position (${n(base.x)}, ${n(base.y)}); zIndex ${Z.roof}; fill ${LEAF_DARK}; ${parts.join(" ")} };`;
}

/** Shear for text on a front face: local x → (1, 0.5), local y → (0, 1), as rotation · scale · rotation. */
function shearSvd(m00: number, m01: number, m10: number, m11: number): { r1: number; sx: number; sy: number; r2: number } {
  const E = (m00 + m11) / 2;
  const F = (m00 - m11) / 2;
  const G = (m10 + m01) / 2;
  const H = (m10 - m01) / 2;
  const Q = Math.hypot(E, H);
  const R = Math.hypot(F, G);
  const a1 = Math.atan2(G, F);
  const a2 = Math.atan2(H, E);
  return { r1: (a2 + a1) / 2, sx: Q + R, sy: Q - R, r2: (a2 - a1) / 2 };
}

const SHEAR = shearSvd(1, 0, 0.5, 1);

function cafeSign(id: string, ox: number): string {
  const anchor = iso(ox + 72, 0.5, GROUND_FLOOR + 22);
  const deg = (r: number) => `${n((r * 180) / Math.PI, 4)}deg`;
  return `group ${id} {
  position (${n(anchor.x)}, ${n(anchor.y)});
  rotation ${deg(SHEAR.r1)};
  scale (${n(SHEAR.sx, 5)}, ${n(SHEAR.sy, 5)});
  zIndex ${Z.awnings};
  group face {
    rotation ${deg(SHEAR.r2)};
    rectangle board { position (0, 0); size (44, 13); cornerRadius 2; fill #2a3b3c; stroke ${CREAM} width 0.8; };
    rectangle glow { position (-1.5, -1.5); size (47, 16); cornerRadius 3; stroke ${CORAL} width 2; opacity 0; };
    text dim { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #7b8c88; };
    text lit { position (22, 7); content "CAFÉ"; fontFamily "sans"; fontSize 10; fontWeight 800; align center; baseline middle; fill #ffe7a8; };
  };
};`;
}

function cafeAwning(id: string, ox: number): string {
  const b = BLOCK1[0]!;
  const X0 = ox + b.x0 + 3;
  const X1 = ox + b.x1 - 3;
  return `group ${id} {
  zIndex ${Z.awnings};
  path canopy { fill ${TEAL}; ${quadPath([[X0, 0, 32], [X1, 0, 32], [X1, 13, 26], [X0, 13, 26]])} };
  path valance { fill ${TEAL_DARK}; ${quadPath([[X0, 13, 22], [X1, 13, 22], [X1, 13, 26], [X0, 13, 26]])} ${quadPath([[X1, 0, 26], [X1, 13, 26], [X1, 13, 32], [X1, 0, 32]])} };
  path scallop { fill ${CREAM}; ${Array.from({ length: Math.floor((X1 - X0) / 8) }, (_, i) => quadPath([[X0 + i * 8 + 2, 13, 22], [X0 + i * 8 + 6, 13, 22], [X0 + i * 8 + 6, 13, 23.5], [X0 + i * 8 + 2, 13, 23.5]])).join(" ")} };
};`;
}

function bladeGlow(id: string, ox: number, b: Building): string {
  const bx = ox + b.x0 + 8;
  return `path ${id} { zIndex ${Z.awnings}; fill ${b.blade}; opacity 0; ${quadPath([[bx, 3, 34], [bx, 13, 34], [bx, 13, 43], [bx, 3, 43]])} };`;
}

// ---------------------------------------------------------------------------
// Program.

const CAPTIONS: [string, number, number, string][] = [
  ["cap1", 0, 4.9, "Sound: soft city ambience, a bicycle freewheel, a distant train rumble"],
  ["cap2", 5.1, 9.9, "Sound: a quiet engine idle and a brief shop-door bell"],
  ["cap3", 10.1, 14.9, "Sound: the train rumble grows; leaves and laundry flutter"],
  ["cap4", 15.1, 19.9, "Sound: an even wheel rhythm, softened behind the buildings"],
  ["cap5", 20.1, 24.9, "Sound: the train recedes; café and street sounds return"],
  ["cap6", 25.1, 30, "Sound: soft city ambience, a bicycle freewheel, a distant train rumble"],
];

type TrainPlan = { speed: number; A: number; w: number; D: number; x13: number };



/** World X of the train head when its top-front corner touches the frame's left or top edge at 0:13. */
function entryX13(): number {
  const cam = cameraAt(cameraPlan(0), 13);
  const left = cam.x - 640 / cam.z;
  const topEdge = cam.y - 360 / cam.z;
  const Yr = RAIL_Y + TRAIN_W / 2;
  const yAtLeft = iso(left + Yr, Yr, DECK + TRAIN_H).y;
  return yAtLeft >= topEdge ? left + Yr : 2 * (topEdge + DECK + TRAIN_H) - Yr;
}

/**
 * X(t) = A + (L / 30) t + ((w t + 5w) % 30w). Over 30s the train moves one unit plus one
 * full wrap, so X(30) = X(0) + L. The wrap is at 0:25, off screen.
 */
function planTrain(): TrainPlan {
  const x13 = entryX13();
  const speed = (EXPOSED.x1 + 6 + TRAIN_LEN - x13) / 6.5;
  const w = speed - L / 30;
  const D = 30 * w;
  const A = x13 - (13 * L) / 30 - 18 * w;
  return { speed, A, w, D, x13 };
}

function trainNodes(plan: TrainPlan): string {
  const cars: string[] = [];
  const roofs: string[] = [];
  const wins: string[] = [];
  const skirts: string[] = [];
  for (let i = 0; i < TRAIN_CARS; i += 1) {
    const x1 = -i * (CAR_LEN + CAR_GAP);
    const x0 = x1 - CAR_LEN;
    const f = boxFaces(x0, x1, -TRAIN_W, 0, 2, TRAIN_H);
    cars.push(`path car${i} { fill ${CREAM}; ${f.front} ${i === 0 ? f.side : ""} };`);
    roofs.push(f.top);
    for (let x = x0 + 5; x + 7 < x1 - 3; x += 10) wins.push(quadPath([[x, 0, 10], [x + 7, 0, 10], [x + 7, 0, 17], [x, 0, 17]]));
    skirts.push(quadPath([[x0, 0, 2], [x1, 0, 2], [x1, 0, 6], [x0, 0, 6]]));
    if (i > 0) skirts.push(quadPath([[x1, -TRAIN_W + 3, 6], [x1 + CAR_GAP, -TRAIN_W + 3, 6], [x1 + CAR_GAP, -3, 6], [x1, -3, 6]]));
  }
  const yr = RAIL_Y + TRAIN_W / 2;
  const sx = `${n(plan.A - yr + 0, 3)} + ${n(L / 30, 5)} * t + ((t * ${n(plan.w, 5)} + ${n(5 * plan.w, 4)}) % ${n(plan.D, 4)})`;
  const sy = `${n((plan.A + yr) / 2 - DECK, 3)} + ${n(L / 60, 5)} * t + 0.5 * ((t * ${n(plan.w, 5)} + ${n(5 * plan.w, 4)}) % ${n(plan.D, 4)})`;
  return `group train {
  zIndex ${Z.train};
  ${cars.join("\n  ")}
  path roof { fill ${TEAL}; ${roofs.join(" ")} };
  path skirt { fill ${TEAL_DARK}; ${skirts.join(" ")} };
  path windows { fill ${GLASS}; ${wins.join(" ")} };
};
${animate("train.position.x", sx)}
${animate("train.position.y", sy)}`;
}

function unitActors(k: number): { nodes: string[]; motion: string[]; steps: string[] } {
  const ox = k * L;
  const u = unitName(ox);
  const nodes: string[] = [];
  const motion: string[] = [];
  const steps: string[] = [];
  nodes.push(cafeAwning(`cafe${u}Awning`, ox));
  nodes.push(cafeSign(`cafe${u}Sign`, ox));
  motion.push(animate(`cafe${u}Sign.face.lit.opacity`, squareWave(2, 0.5)));
  motion.push(animate(`cafe${u}Sign.face.glow.opacity`, squareWave(2, 0.5, 7, true)));
  for (const [i, b] of FRONT_ROW.entries()) {
    if (!b.blade) continue;
    const id = `blade${u}${b.id}`;
    nodes.push(bladeGlow(id, ox, b));
    const period = [3, 5, 6, 2, 3, 5][i % 6]!;
    motion.push(animate(`${id}.opacity`, squareWave(period, i * 0.37)));
  }
  // Car 1 around the central block, car 2 around block 2.
  for (const [id, route, phase, colours] of [
    [`car${u}a`, CAR1, CAR1_PHASE, [MUSTARD, MUSTARD_DARK, MUSTARD_TOP]],
    [`car${u}b`, CAR2, CAR2_PHASE, [CORAL, CORAL_DARK, "#f4a08b"]],
  ] as [string, Route, number, string[]][]) {
    nodes.push(carSprite(id, colours[0]!, colours[1]!, colours[2]!, Z.street));
    motion.push(...placeTracks(id, route, phase, ox));
    motion.push(animate(`${id}.scale.x`, wave(headingKnots(route), route.period, phase)));
    motion.push(animate(`${id}.opacity`, wave(streetSideKnots(route), route.period, phase)));
  }
  // The van: street layer while in the cross streets, above walkers on the main street.
  for (const [id, z, visible] of [[`van${u}Back`, Z.street, true], [`van${u}`, Z.vanFront, false]] as [string, number, boolean][]) {
    nodes.push(vanSprite(id, z, visible));
    motion.push(...placeTracks(id, VAN, 0, ox));
    motion.push(animate(`${id}.opacity`, wave(streetSideKnots(VAN), VAN.period, 0)));
    motion.push(animate(`${id}.scale.x`, wave(headingKnots(VAN, 0.2), VAN.period, 0)));
    // The cab is at the near end on +X and +Y headings, at the far end on −Y and −X.
    const cabKnots: Knot[] = [
      { u: 0, v: 1 },
      { u: 21.75, v: 1 },
      { u: 21.85, v: 0 },
      { u: 30 - 0.05, v: 0 },
      { u: 30, v: 1 },
    ];
    motion.push(animate(`${id}.cab.opacity`, wave(cabKnots, 30, 0)));
    motion.push(animate(`${id}.cabFront.opacity`, wave(cabKnots, 30, 0)));
    motion.push(animate(`${id}.cabBack.opacity`, wave(cabKnots.map((c) => ({ ...c, v: 1 - c.v })), 30, 0)));
  }
  steps.push(`step van${u}.visible { at ${n(VAN_FRONT_ON * 1000, 0)}ms; value true; };`);
  steps.push(`step van${u}.visible { at ${n(VAN_FRONT_OFF * 1000, 0)}ms; value false; };`);
  steps.push(`step van${u}Back.visible { at ${n(VAN_FRONT_ON * 1000, 0)}ms; value false; };`);
  steps.push(`step van${u}Back.visible { at ${n(VAN_FRONT_OFF * 1000, 0)}ms; value true; };`);
  for (const w of WALKERS) {
    const id = `${w.id}${u}`;
    nodes.push(walkerSprite(id, w.coat, w.head, Z.walkers));
    const shifted: Route = { period: w.route.period, ways: w.route.ways.map((p) => ({ ...p, X: p.X + w.dx, Y: p.Y + w.dy })) };
    motion.push(...placeTracks(id, shifted, w.phase, ox));
    const stride = wave(movingKnots(w.route), w.route.period, w.phase);
    motion.push(animate(`${id}.legs.scale.x`, `1 - 0.72 * abs(sin(t * 6.28319 + ${n(w.phase * 3.1, 2)})) * (${stride})`));
  }
  // Cyclist: rides +X in the bike lane; copies one unit apart hand over every 15s.
  const bike = `bike${u}`;
  nodes.push(cyclistSprite(bike, Z.cyclist));
  const span = UNITS.length * L;
  const firstUnit = UNITS[0]! * L;
  const startX = BIKE_X0 + ox - firstUnit;
  motion.push(animate(`${bike}.position.x`, `${n(firstUnit - LANE_BIKE, 2)} + ((t * ${n(BIKE_SPEED, 5)} + ${n(startX, 2)}) % ${span})`));
  motion.push(animate(`${bike}.position.y`, `${n((firstUnit + LANE_BIKE) / 2, 2)} + 0.5 * ((t * ${n(BIKE_SPEED, 5)} + ${n(startX, 2)}) % ${span})`));
  motion.push(animate(`${bike}.rider.legs.rotation`, `0.35 * sin(t * 9.42478)`));
  // Rooftop gardeners, laundry and shrubs.
  nodes.push(gardenerA(`gardenA${u}`, ox));
  motion.push(animate(`gardenA${u}.arm.rotation`, wave(WATER_KNOTS, WATER_PERIOD, 0, 0, 3)));
  motion.push(animate(`gardenA${u}.arm.water.opacity`, wave(POUR_KNOTS, WATER_PERIOD, 0)));
  const hc = height(BLOCK1[2]!) - PARAPET + 1;
  nodes.push(gardenerB(`gardenB${u}`));
  motion.push(...placeTracks(`gardenB${u}`, GARDENER_B, 0, ox, 0, hc));
  nodes.push(laundry(`laundry${u}`, ox));
  motion.push(animate(`laundry${u}.scale.y`, `1 - 0.08 * sin(t * 4.18879) * sin(t * 4.18879)`));
  motion.push(animate(`laundry${u}.position.x`, `${n(iso(ox + LAUNDRY_X0, LAUNDRY_Y, 0).x, 2)} + 0.6 * sin(t * 2.0944)`));
  nodes.push(shrubs(`shrubs${u}`, ox));
  motion.push(animate(`shrubs${u}.scale.x`, `1 + 0.035 * sin(t * 2.51327)`));
  return { nodes, motion, steps };
}

function program(plan: TrainPlan, stops: CamPlan): string {
  setViews(stops);
  defineLayers();
  ground();
  farDistrict();
  railway();
  const perUnit: string[] = [];
  for (const k of [-2, ...UNITS, 2]) {
    const ox = k * L;
    for (const b of BACK_ROW) backBuilding(b, ox);
  }
  for (const k of UNITS) {
    const ox = k * L;
    for (const b of FRONT_ROW) frontBuilding(b, ox, perUnit);
    rooftops(ox);
    lamps(ox);
    nearSide(ox);
  }
  // Partial copies at both ends so the wide shot has no edge.
  for (const k of [-2, 2]) {
    const ox = k * L;
    for (const b of FRONT_ROW) {
      if (k === -2 && b.x0 < 400) continue;
      if (k === 2 && b.x0 > 400) continue;
      frontBuilding({ ...b, id: b.id === "cafe" ? "cafeEdge" : b.id }, ox, perUnit);
    }
  }
  const actors = UNITS.map(unitActors);
  const statics = LAYERS.filter((def) => (LAYER_CMDS.get(def.id) ?? []).length > 0).map((def) => {
    const cmds = LAYER_CMDS.get(def.id)!;
    const opacity = def.opacity !== undefined ? ` opacity ${def.opacity};` : "";
    return `path ${def.id} { zIndex ${def.z};${opacity} fill ${def.fill};\n  ${chunk(cmds).join("\n  ")}\n};`;
  });
  const camera = [
    cameraTrack("camera(main).position.x", stops.x),
    cameraTrack("camera(main).position.y", stops.y),
    cameraTrack("camera(main).zoom", stops.z),
  ];
  const captions = CAPTIONS.map(([id, , , words]) => `text ${id} { position (640, 682); content "${words}"; fontFamily "sans"; fontSize 15; fontWeight 600; align center; baseline middle; fill #fbf3e4; opacity 0; };`);
  const captionMotion = CAPTIONS.map(([id, show, hide], index) => {
    const keys: { t: number; v: number; ease: Ease }[] = [];
    // One caption at a time: fade out before the gap, fade the next one in after it.
    if (index === 0) keys.push({ t: 0, v: 1, ease: "hold" }, { t: hide - 0.25, v: 1, ease: "easeIn" }, { t: hide, v: 0, ease: "hold" }, { t: 30, v: 0, ease: "hold" });
    else if (index === CAPTIONS.length - 1) keys.push({ t: 0, v: 0, ease: "hold" }, { t: show, v: 0, ease: "easeOut" }, { t: show + 0.25, v: 1, ease: "hold" }, { t: 30, v: 1, ease: "hold" });
    else keys.push({ t: 0, v: 0, ease: "hold" }, { t: show, v: 0, ease: "easeOut" }, { t: show + 0.25, v: 1, ease: "hold" }, { t: hide - 0.25, v: 1, ease: "easeIn" }, { t: hide, v: 0, ease: "hold" }, { t: 30, v: 0, ease: "hold" });
    return keyframes(`captions.${id}.opacity`, keys);
  });
  return `// THE CITY COMES AROUND
// 30 seconds, one seamless loop. Isometric district, repeating every ${L} world units.
// Projection (builder-side): screen = (X − Y, (X + Y) / 2 − Z). X is the street, Y toward the viewer, Z up.
// 0:00 the café corner wakes. 0:05 three façades, a van settles, a walker passes behind it.
// 0:10 the camera rises over the rooftops; the train enters upper left at 0:13.
// 0:15 the widest view; the train passes behind a water tank, between buildings, over the viaduct.
// 0:20 the camera descends to the next café. 0:29.5 it holds on the opening composition, one unit on.
// Every actor repeats with a period that divides 30s. Sound cues are a caption; MotionScript has no audio.
scene "the-city-comes-around" {
  version "0.2";
  viewport (1280, 720);
  background ${BG};
  duration 30s;
  requires "easing.hold";
  requires "easing.cubicBezier";
  requires "geometry.roundedRect";
  requires "text.basic";
};
camera main {
  position (${n(C0.x)}, ${n(C0.y)});
  zoom ${OPENING_ZOOM};
  rotation 0deg;
};
${statics.join("\n")}
${perUnit.join("\n")}
${trainNodes(plan)}
${actors.flatMap((a) => a.nodes).join("\n")}
group captions {
  space screen;
  zIndex ${Z.caption};
  rectangle plate { position (250, 666); size (780, 32); cornerRadius 8; fill #2b2522; opacity 0.62; };
  ${captions.join("\n  ")}
};
${camera.join("\n")}
${captionMotion.join("\n")}
${actors.flatMap((a) => a.motion).join("\n")}
${actors.flatMap((a) => a.steps).join("\n")}
complete;
`;
}

function chunk(cmds: string[]): string[] {
  const lines: string[] = [];
  for (let i = 0; i < cmds.length; i += 12) lines.push(cmds.slice(i, i + 12).join(" "));
  return lines;
}

// ---------------------------------------------------------------------------
// Model checks: paint order must agree with depth wherever two actors overlap.

type ActorBox = { id: string; z: number; order: number; X0: number; X1: number; Y0: number; Y1: number; Z0: number; Z1: number; visible: boolean };

function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Convex overlap by separating axes, ignoring contact within 1.5 projected units (a corner touch). */
function overlaps(a: Pt[], b: Pt[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const nx = (q.y - p.y) / len;
      const ny = (p.x - q.x) / len;
      const slack = 1.5;
      let amin = Infinity;
      let amax = -Infinity;
      let bmin = Infinity;
      let bmax = -Infinity;
      for (const v of a) {
        const d = v.x * nx + v.y * ny;
        amin = Math.min(amin, d);
        amax = Math.max(amax, d);
      }
      for (const v of b) {
        const d = v.x * nx + v.y * ny;
        bmin = Math.min(bmin, d);
        bmax = Math.max(bmax, d);
      }
      if (amax <= bmin + slack || bmax <= amin + slack) return false;
    }
  }
  return true;
}

function boxHull(b: ActorBox): Pt[] {
  const pts: Pt[] = [];
  for (const X of [b.X0, b.X1]) for (const Y of [b.Y0, b.Y1]) for (const Zv of [b.Z0, b.Z1]) pts.push(iso(X, Y, Zv));
  return hull(pts);
}

/** +1 when a is in front of b, −1 when behind, 0 when they intersect. */
function depthOrder(a: ActorBox, b: ActorBox): number {
  if (a.X0 >= b.X1) return 1;
  if (b.X0 >= a.X1) return -1;
  if (a.Y0 >= b.Y1) return 1;
  if (b.Y0 >= a.Y1) return -1;
  if (a.Z0 >= b.Z1) return 1;
  if (b.Z0 >= a.Z1) return -1;
  return 0;
}

function headingAt(route: Route, phase: number, t: number): number {
  const dt = 0.02;
  const a = routeAt(route, phase, t - dt);
  const b = routeAt(route, phase, t + dt);
  return Math.abs(b.X - a.X) >= Math.abs(b.Y - a.Y) ? 1 : -1;
}

function actorBoxes(t: number): ActorBox[] {
  const boxes: ActorBox[] = [];
  let order = 0;
  const vehicle = (id: string, z: number, at: { X: number; Y: number }, heading: number, len: number, wid: number, hgt: number, visible: boolean) => {
    const hx = heading > 0 ? len / 2 : wid / 2;
    const hy = heading > 0 ? wid / 2 : len / 2;
    boxes.push({ id, z, order: order++, X0: at.X - hx, X1: at.X + hx, Y0: at.Y - hy, Y1: at.Y + hy, Z0: 0, Z1: hgt, visible });
  };
  for (const k of UNITS) {
    const ox = k * L;
    const shift = (p: { X: number; Y: number }) => ({ X: p.X + ox, Y: p.Y });
    vehicle(`car${k}a`, Z.street, shift(routeAt(CAR1, CAR1_PHASE, t)), headingAt(CAR1, CAR1_PHASE, t), 30, 14, 18, onStreetSide(CAR1, CAR1_PHASE, t));
    vehicle(`car${k}b`, Z.street, shift(routeAt(CAR2, CAR2_PHASE, t)), headingAt(CAR2, CAR2_PHASE, t), 30, 14, 18, onStreetSide(CAR2, CAR2_PHASE, t));
    const front = t >= VAN_FRONT_ON && t < VAN_FRONT_OFF;
    vehicle(`van${k}`, front ? Z.vanFront : Z.street, shift(routeAt(VAN, 0, t)), headingAt(VAN, 0, t), 40, 14, VAN_H, onStreetSide(VAN, 0, t));
    for (const w of WALKERS) {
      const p = routeAt(w.route, w.phase, t);
      const X = p.X + w.dx + ox;
      const Y = p.Y + w.dy;
      boxes.push({ id: `${w.id}${k}`, z: Z.walkers, order: order++, X0: X - 3, X1: X + 3, Y0: Y - 3, Y1: Y + 3, Z0: 0, Z1: 29, visible: true });
    }
    const span = UNITS.length * L;
    const bx = UNITS[0]! * L + ((t * BIKE_SPEED + BIKE_X0 + ox - UNITS[0]! * L) % span);
    boxes.push({ id: `bike${k}`, z: Z.cyclist, order: order++, X0: bx - 11, X1: bx + 11, Y0: LANE_BIKE - 2, Y1: LANE_BIKE + 2, Z0: 0, Z1: 32, visible: true });
  }
  return boxes;
}

/** Front-row buildings as boxes, with the projected outline of the layer each face is painted in. */
const BUILDING_FACES = UNITS.flatMap((k) =>
  FRONT_ROW.map((b) => {
    const X0 = k * L + b.x0;
    const X1 = k * L + b.x1;
    const h = height(b);
    const box: ActorBox = { id: `${b.id}${unitTag(k)}`, z: Z.front, order: 0, X0, X1, Y0: -FRONT_DEPTH, Y1: 0, Z0: 0, Z1: h, visible: true };
    const side = hull([iso(X1, -FRONT_DEPTH, 0), iso(X1, 0, 0), iso(X1, 0, h), iso(X1, -FRONT_DEPTH, h)]);
    const front = hull([iso(X0, 0, 0), iso(X1, 0, 0), iso(X1, 0, h), iso(X0, 0, h)]);
    const roof = hull([iso(X0, 0, h), iso(X1, 0, h), iso(X1, -FRONT_DEPTH, h), iso(X0, -FRONT_DEPTH, h)]);
    return { box, side, front, roof };
  }),
);

function checkPaintOrder(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (let t = 0; t <= 30.0001; t += 0.05) {
    const boxes = actorBoxes(t).filter((b) => b.visible);
    for (const a of boxes) {
      const hull = boxHull(a);
      for (const b of BUILDING_FACES) {
        const depth = depthOrder(a, b.box);
        for (const [z, faceHull] of [[Z.sideFaces, b.side], [Z.front, b.front], [Z.front, b.roof]] as [number, Pt[]][]) {
          if (a.z === z || !overlaps(hull, faceHull)) continue;
          const drawnAbove = a.z > z ? 1 : -1;
          const key = `${a.id}/${b.box.id}/${z}`;
          if (depth !== 0 && depth !== drawnAbove && !seen.has(key)) {
            seen.add(key);
            problems.push(`${t.toFixed(2)}s: ${a.id} and building ${b.box.id} overlap with paint order against depth.`);
          }
        }
      }
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.z === b.z) continue;
        if (!overlaps(boxHull(a), boxHull(b))) continue;
        const drawnAbove = a.z > b.z ? 1 : -1;
        const depth = depthOrder(a, b);
        const key = `${a.id}/${b.id}`;
        if (depth !== 0 && depth !== drawnAbove && !seen.has(key)) {
          seen.add(key);
          problems.push(`${t.toFixed(2)}s: ${a.id} and ${b.id} overlap with paint order against depth.`);
        }
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Runtime checks on evaluated draw items.

function find(items: readonly ResolvedDrawItem[], id: string): ResolvedDrawItem | undefined {
  return items.find((entry) => entry.nodeId === id);
}

function must(items: readonly ResolvedDrawItem[], id: string): ResolvedDrawItem {
  const item = find(items, id);
  if (!item) throw new Error(`Missing draw item ${id}`);
  return item;
}

function at(items: readonly ResolvedDrawItem[], id: string, x = 0, y = 0): Pt {
  return transformPoint(must(items, id).logicalMatrix, x, y);
}

/** Inside the frame and above the caption plate. */
function onScreen(p: Pt, pad = 4): boolean {
  return p.x >= pad && p.x <= 1280 - pad && p.y >= pad && p.y <= 650;
}

function geometryBounds(item: ResolvedDrawItem): Pt[] {
  const g = item.geometry;
  const local: Pt[] = [];
  if (g.kind === "path") for (const c of g.commands) if ("x" in c) local.push({ x: c.x, y: c.y });
  if (g.kind === "rectangle") local.push({ x: 0, y: 0 }, { x: g.size.x, y: g.size.y });
  if (g.kind === "ellipse") local.push({ x: -g.size.x / 2, y: -g.size.y / 2 }, { x: g.size.x / 2, y: g.size.y / 2 });
  if (g.kind === "circle") local.push({ x: -g.radius, y: -g.radius }, { x: g.radius, y: g.radius });
  return local.map((p) => transformPoint(item.logicalMatrix, p.x, p.y));
}

function bbox(items: readonly ResolvedDrawItem[], id: string): { x0: number; x1: number; y0: number; y1: number } {
  const pts = geometryBounds(must(items, id));
  return {
    x0: Math.min(...pts.map((p) => p.x)),
    x1: Math.max(...pts.map((p) => p.x)),
    y0: Math.min(...pts.map((p) => p.y)),
    y1: Math.max(...pts.map((p) => p.y)),
  };
}

function index(items: readonly ResolvedDrawItem[], id: string): number {
  const i = items.findIndex((entry) => entry.nodeId === id);
  if (i < 0) throw new Error(`Missing draw item ${id}`);
  return i;
}

function boxesMeet(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Root id split into role and unit: "cafem1Sign.face.lit" → ["cafe·Sign.face.lit", "m1"]. */
function role(id: string): [string, string] | undefined {
  const m = /^([a-zA-Z]+?)(m1|0|1)([A-Za-z]*)(\..*)?$/.exec(id);
  if (!m || !UNITS.map(unitTag).includes(m[2]!)) return undefined;
  return [`${m[1]}·${m[3]}${m[4] ?? ""}`, m[2]!];
}

function unitTag(k: number): string {
  return unitName(k * L);
}

/** Projected world point of a local point on a draw item (undoes the camera). */
function worldOf(items: readonly ResolvedDrawItem[], id: string, x = 0, y = 0): Pt {
  const m = mustCamera(items);
  const p = at(items, id, x, y);
  return { x: (p.x - m[6]!) / m[0]!, y: (p.y - m[7]!) / m[4]! };
}

/** Street-level world X, Y of a projected ground point. */
function groundXY(p: Pt): { X: number; Y: number } {
  return { X: p.y + p.x / 2, Y: p.y - p.x / 2 };
}

let evaluations = () => 0;

function runtimeChecks(scene: SceneIR, plan: TrainPlan, cam: CamPlan): string[] {
  const runtime = new AnimationRuntime(scene);
  const cache = new Map<number, readonly ResolvedDrawItem[]>();
  evaluations = () => cache.size;
  const frame = (seconds: number) => {
    const key = ms(seconds);
    if (!cache.has(key)) cache.set(key, runtime.evaluate(key).drawItems);
    return cache.get(key)!;
  };
  const problems: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) problems.push(message);
  };
  const near = (a: number, b: number, limit: number) => Math.abs(a - b) <= limit;
  const ground = (s: number, id: string) => groundXY(worldOf(frame(s), id));

  // Loop. The camera at 0:30 is the camera at 0:00 moved one unit; static paths repeat with the unit.
  const m0 = mustCamera(frame(0));
  const m30 = mustCamera(frame(30));
  expect(near(m0[0]!, m30[0]!, 1e-9) && near(m0[6]! - m30[6]!, L * m0[0]!, 1e-6) && near(m0[7]! - m30[7]!, (L / 2) * m0[0]!, 1e-6), "The camera at 0:30 is not the opening camera moved by one unit.");
  // Every actor mark drawn on screen at 0:00 has an identical mark at 0:30, from some unit copy.
  const end = frame(30);
  let unmatched = 0;
  for (const item of frame(0)) {
    const r = role(item.nodeId);
    if (!r || item.opacity < 0.004) continue;
    const pts = geometryBounds(item);
    if (pts.length === 0 || pts.every((p) => p.x < 0) || pts.every((p) => p.x > 1280) || pts.every((p) => p.y < 0) || pts.every((p) => p.y > 720)) continue;
    const box = bbox(frame(0), item.nodeId);
    const twin = end.find((other) => {
      if (role(other.nodeId)?.[0] !== r[0] || !near(other.opacity, item.opacity, 0.01)) return false;
      const o = bbox(end, other.nodeId);
      return near(o.x0, box.x0, 0.05) && near(o.x1, box.x1, 0.05) && near(o.y0, box.y0, 0.05) && near(o.y1, box.y1, 0.05);
    });
    if (!twin) {
      unmatched += 1;
      if (unmatched <= 5) problems.push(`${item.nodeId} at 0:00 has no identical mark at 0:30.`);
    }
  }
  // Motion continues across the seam at the same speed.
  for (const id of ["car0a.body", "pedA0.coat", "pedB0.coat", "bike0.frame", "gardenA0.arm.can", "car0b.body"]) {
    const r = role(id)!;
    const a0 = at(frame(0), id);
    const a1 = at(frame(0.1), id);
    const twin = end.find((other) => role(other.nodeId)?.[0] === r[0] && near(at(end, other.nodeId).x, a0.x, 0.05) && near(at(end, other.nodeId).y, a0.y, 0.05));
    if (!twin) {
      problems.push(`${id} has no twin at 0:30.`);
      continue;
    }
    const b0 = at(frame(29.9), twin.nodeId);
    const b1 = at(end, twin.nodeId);
    const jump = Math.hypot(a1.x - a0.x - (b1.x - b0.x), a1.y - a0.y - (b1.y - b0.y));
    expect(jump < 0.5, `${id} changes speed across the seam (${jump.toFixed(2)}px per 0.1s).`);
  }

  // The camera only ever travels forward along the district, and covers exactly one unit.
  let back = 0;
  let previousX = -Infinity;
  for (let s = 0; s <= 30.0001; s += 0.25) {
    const m = mustCamera(frame(s));
    const x = (640 - m[6]!) / m[0]!;
    back = Math.max(back, previousX - x);
    previousX = x;
  }
  for (let s = 0; s <= 30; s += 0.01) back = Math.max(back, hermite(cam.x, s) - hermite(cam.x, s + 0.01));
  expect(back < 0.01, `The camera moves backward along the street (by ${back.toFixed(2)} units).`);

  // 0:00–0:05 The corner wakes.
  const open = frame(0);
  expect(mustCamera(frame(0.5)).every((v, i) => near(v, m0[i]!, 1e-9)), "The camera moves during the opening hold.");
  const cafe = bbox(open, "cafe0Front");
  expect(cafe.x0 > 200 && cafe.x1 < 1080 && cafe.y0 > 4 && cafe.y1 < 650, "The café is not framed at 0:00.");
  expect(onScreen(at(open, "cafe0Sign.face.board", 22, 7)), "The café sign is off screen at 0:00.");
  expect(onScreen(at(open, "gardenA0.head")), "The rooftop gardener is off screen at 0:00.");
  const crossing = worldToScreen(open, iso(CROSS1, 46, 0));
  expect(onScreen(crossing), "The crossing is off screen at 0:00.");
  const cafeX = BLOCK1[0]!;
  expect(ground(0.3, "car0a.shadow").X < cafeX.x0 + 10 && ground(2.4, "car0a.shadow").X > cafeX.x1, "The mustard car does not roll past the café in the opening.");
  expect(onScreen(at(frame(0.3), "car0a.body")) && onScreen(at(frame(2.4), "car0a.body")), "The mustard car leaves the frame while passing the café.");
  for (const [id, t0, t1] of [["pedA0", 1.0, 4.4], ["pedB0", 1.55, 4.95]] as [string, number, number][]) {
    const a = ground(t0, `${id}.shadow`);
    const b = ground(t1, `${id}.shadow`);
    expect(onScreen(at(frame(t0), `${id}.coat`)) && onScreen(at(frame(t1), `${id}.coat`)), `${id} is off screen while crossing.`);
    expect(a.Y > 70 && b.Y < 27 && near(a.X, b.X, 8), `${id} does not cross the street between ${t0}s and ${t1}s.`);
  }
  expect(ground(1.4, "car0a.shadow").X > ground(1.4, "pedA0.shadow").X + 25, "The walkers cross before the car has passed.");
  const bikeA = ground(0.3, "bike0.shadow");
  const bikeB = ground(2.6, "bike0.shadow");
  expect(onScreen(at(frame(0.3), "bike0.frame")) && bikeB.X > bikeA.X + 100 && near(bikeA.Y, LANE_BIKE, 1), "The cyclist does not approach in the bike lane.");
  const lit = (s: number) => must(frame(s), "cafe0Sign.face.lit").opacity;
  const glow = (s: number) => must(frame(s), "cafe0Sign.face.glow").opacity;
  expect(lit(0) > 0.95 && glow(0) < 0.05 && lit(1.0) < 0.05 && glow(1.0) > 0.95 && lit(2.0) > 0.95, "The café sign does not alternate between two states.");
  const angle = (s: number) => {
    const m = must(frame(s), "gardenA0.arm.can").logicalMatrix;
    return Math.atan2(m[1]!, m[0]!);
  };
  expect(Math.abs(angle(2.7) - angle(0)) > 0.6 && near(angle(5), angle(0), 1e-6), "The gardener does not tip the watering can and return it.");
  expect(must(frame(2.7), "gardenA0.arm.water").opacity > 0.9 && must(frame(0), "gardenA0.arm.water").opacity < 0.01, "No water pours from the can.");
  const cafe5 = bbox(frame(5), "cafe0Front");
  expect(cafe5.x0 < cafe.x0 - 150 && cafe5.x1 > 0, "The café does not move toward the left edge by 0:05.");

  // 0:05–0:10 Repetition with variation; the van settles, then a walker passes behind it.
  const van = (s: number) => ground(s, "van0.shadow");
  expect(near(van(7.3).X, VAN_STOP_X, 0.01) && near(van(11).X, VAN_STOP_X, 0.01), "The van is not parked from 0:07.3 to 0:11.");
  const vanSpeed = (s: number) => (van(s + 0.05).X - van(s).X) / 0.05;
  expect(vanSpeed(5.8) > vanSpeed(6.5) && vanSpeed(6.5) > vanSpeed(6.9) && vanSpeed(6.9) < 15, "The van does not settle into its stop.");
  expect(onScreen(at(frame(C_AT[1]), "van0.cargo")), "The parked van is off screen when the walker passes.");
  const c = ground(C_AT[1], "pedC0.shadow");
  const cBox = bbox(frame(C_AT[1]), "pedC0.coat");
  const vBox = bbox(frame(C_AT[1]), "van0.cargo");
  expect(near(c.X, C_AT[0], 1) && c.Y < LANE_VAN && cBox.x0 > vBox.x0 && cBox.x1 < vBox.x1 && cBox.y1 > vBox.y0 && index(frame(C_AT[1]), "pedC0.coat") < index(frame(C_AT[1]), "van0.cargo"), `Walker C is not behind the van body at ${C_AT[1]}s.`);
  // Rear first, then out beyond the bonnet (the cab is at the +X end).
  const vanAll = (s: number) => {
    const f = frame(s);
    const boxes = ["van0.cargo", "van0.cab.body", "van0.cab.side", "van0.cargoSide"].map((id) => bbox(f, id));
    return { x0: Math.min(...boxes.map((b) => b.x0)), x1: Math.max(...boxes.map((b) => b.x1)) };
  };
  let enter = -1;
  let leave = -1;
  const settled = 7.05;
  expect(bbox(frame(settled), "pedC0.coat").x1 <= vanAll(settled).x0, "Walker C is already behind the van before it has settled.");
  for (let s = settled; s <= 12; s += 0.05) {
    const pb = bbox(frame(s), "pedC0.coat");
    const vb = vanAll(s);
    const hidden = pb.x1 > vb.x0 && pb.x0 < vb.x1;
    if (hidden && enter < 0) enter = s;
    if (!hidden && enter >= 0 && leave < 0) leave = s;
  }
  expect(enter > 7.05 && leave > enter && bbox(frame(leave), "pedC0.coat").x0 >= vanAll(leave).x1 - 0.01, `Walker C does not pass behind the settled van and reappear beyond the bonnet (${enter.toFixed(2)}s → ${leave.toFixed(2)}s).`);
  const awn = bbox(frame(D_AT[1]), "cafe0Awning.canopy");
  const dHead = bbox(frame(D_AT[1]), "pedD0.head");
  expect(boxesMeet(dHead, awn) && index(frame(D_AT[1]), "pedD0.head") < index(frame(D_AT[1]), "cafe0Awning.canopy"), `Walker D is not partly hidden under the café awning at ${D_AT[1]}s.`);
  for (const [s, b] of [[5.6, BLOCK1[1]!], [7.6, BLOCK1[2]!], [9.4, BLOCK1[3]!]] as [number, Building][]) {
    expect(onScreen(worldToScreen(frame(s), iso((b.x0 + b.x1) / 2, 0, 40))), `The ${b.id} façade is not framed at ${s}s.`);
  }
  const signs = ["blade0b", "blade0c", "blade0d"].map((id) => [4, 5, 6, 7, 8].map((s) => (must(frame(s), id).opacity > 0.5 ? 1 : 0)).join(""));
  expect(new Set(signs).size === 3, `The shop signs do not animate on staggered cycles (${signs.join(" ")}).`);

  // 0:10–0:15 Above the shops; the train's front enters upper left at 0:13.
  expect(onScreen(at(frame(14), "gardenB0.head")) && onScreen(at(frame(14), "laundry0.c0")), "The rooftop gardens are not in the elevated view.");
  expect(mustCamera(frame(14))[0]! < 0.85, "The camera has not risen and pulled back by 0:14.");
  const headLocal = iso(0, 0, TRAIN_H);
  const head = (s: number) => at(frame(s), "train.car0", headLocal.x, headLocal.y);
  const h0 = head(12.9);
  const h1 = head(13.0);
  const h2 = head(13.2);
  expect(h0.x < 0 || h0.y < 0, "The train is already in frame before 0:13.");
  expect((near(h1.x, 0, 3) && h1.y > 0 && h1.y < 360) || (near(h1.y, 0, 3) && h1.x > 0 && h1.x < 640), `The train's front is not at the upper-left edge at 0:13 (${h1.x.toFixed(1)}, ${h1.y.toFixed(1)}).`);
  expect(h2.x > 0 && h2.y > 0, "The train does not enter after 0:13.");
  const spacing = (s: number) => {
    const a = worldOf(frame(s), "train.car0");
    const b = worldOf(frame(s), "train.car1");
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  expect(near(spacing(13.5), spacing(18.5), 1e-6), "Carriage spacing changes during the pass.");
  const speed = (s: number) => (worldOf(frame(s + 0.1), "train.car0").x - worldOf(frame(s), "train.car0").x) / 0.1;
  expect(near(speed(13.5), plan.speed, 0.5) && near(speed(18.5), plan.speed, 0.5), "The train's speed changes during the pass.");
  const p1 = MATCH.start + MATCH.ramp;
  const p2 = p1 + MATCH.plateau;
  const ma = head(p1 + 0.02);
  const mb = head(p2 - 0.02);
  expect(Math.hypot(mb.x - ma.x, mb.y - ma.y) < 2, `The camera does not match the train between ${p1}s and ${p2}s (${Math.hypot(mb.x - ma.x, mb.y - ma.y).toFixed(1)}px).`);

  // 0:15–0:20 Behind the water tank, between buildings, over the viaduct; clear by 0:19.5.
  let tank = false;
  for (let s = 13; s <= 19.5; s += 0.25) {
    const f = frame(s);
    for (const k of UNITS) {
      const tankBox = screenBox(f, tankOutline(k));
      for (let car = 0; car < TRAIN_CARS; car += 1) {
        if (boxesMeet(tankBox, bbox(f, `train.car${car}`)) && index(f, "bTank") > index(f, `train.car${car}`)) tank = true;
      }
    }
  }
  expect(tank, "The train never passes behind a water tank.");
  const tailLocal = iso(-(TRAIN_CARS - 1) * (CAR_LEN + CAR_GAP) - CAR_LEN, 0, 0);
  const tailX = (s: number) => worldOf(frame(s), `train.car${TRAIN_CARS - 1}`, tailLocal.x, tailLocal.y).x + (RAIL_Y + TRAIN_W / 2);
  expect(tailX(19.5) > EXPOSED.x1 && tailX(18.5) < EXPOSED.x1, `The last carriage does not clear the exposed viaduct just before 0:19.5 (tail X ${tailX(18.5).toFixed(0)} → ${tailX(19.5).toFixed(0)}).`);
  expect(onScreen(worldToScreen(frame(17.2), iso((EXPOSED.x0 + EXPOSED.x1) / 2, RAIL_Y, DECK))), "The exposed viaduct is off screen during the pass.");
  for (const s of [16.5, 18.5]) {
    const f = frame(s);
    const moving = UNITS.flatMap((k) => [`car${unitTag(k)}a.body`, `car${unitTag(k)}b.body`]).filter((id) => onScreen(at(f, id)));
    expect(moving.length >= 2, `Too little traffic in the wide view at ${s}s.`);
  }
  for (const s of [24.95, 25.05, 0, 30]) {
    const f = frame(s);
    const a = at(f, "train.car0");
    const b = at(f, `train.car${TRAIN_CARS - 1}`, tailLocal.x, tailLocal.y);
    expect(!onScreen(a, -60) && !onScreen(b, -60), `The train is in frame at ${s}s.`);
  }

  // 0:20–0:25 Back toward the street; the van goes behind a building; the café awning enters from the right.
  const behind = frame(22.6);
  const e = BLOCK2[0]!;
  const eBox = screenBox(behind, [iso(e.x0, 0, 0), iso(e.x1, 0, 0), iso(e.x1, 0, height(e)), iso(e.x0, -FRONT_DEPTH, height(e)), iso(e.x0, 0, height(e))]);
  expect(onScreen(at(behind, "van0Back.cargo")) && boxesMeet(bbox(behind, "van0Back.cargo"), eBox) && index(behind, "van0Back.cargo") < index(behind, "fr_umber"), "The van does not go behind the next building at 0:22.6.");
  expect(find(behind, "van0.cargo") === undefined, "The front copy of the van is still drawn at 0:22.6.");
  let off = -1;
  let entered = -1;
  for (let s = 20; s <= 25.001; s += 0.1) {
    const box = bbox(frame(s), "cafe1Awning.canopy");
    if (box.x0 >= 1280 && off < 0) off = s;
    if (off >= 0 && entered < 0 && box.x0 < 1280) entered = s;
  }
  expect(off >= 0 && entered > off && entered < 25, `The teal café awning does not enter from the right before 0:25 (off ${off.toFixed(1)}s, in ${entered.toFixed(1)}s).`);
  expect(near(mustCamera(frame(25))[0]!, OPENING_ZOOM, 1e-6), "The camera has not reached the opening scale by 0:25.");

  // 0:25–0:30 The city comes around.
  const settle = mustCamera(frame(29.5));
  expect(settle.every((v, i) => near(v, m30[i]!, 1e-6)), "The camera has not reached the opening composition by 0:29.5.");
  // The beats' actors sit above the caption plate when they are asserted.
  const beats: [string, number[]][] = [
    ["car0a.body", [0.3, 1.4, 2.4]],
    ["pedA0.coat", [1, 2.5, 4.4]],
    ["pedB0.coat", [1, 2.5, 4.4]],
    ["bike0.frame", [0.3, 2.6]],
    ["pedD0.coat", [D_AT[1]]],
    ["van0.cargo", [7.3, C_AT[1]]],
    ["cafe0Sign.face.board", [0, 1]],
    ["cafe1Awning.canopy", [29.5]],
  ];
  for (const [id, times] of beats) {
    for (const s of times) expect(bbox(frame(s), id).y1 < 652, `${id} runs under the caption at ${s}s.`);
  }
  return problems;
}

function worldToScreen(items: readonly ResolvedDrawItem[], p: Pt): Pt {
  const m = mustCamera(items);
  return transformPoint(m as unknown as Parameters<typeof transformPoint>[0], p.x, p.y);
}

function screenBox(items: readonly ResolvedDrawItem[], pts: Pt[]): { x0: number; x1: number; y0: number; y1: number } {
  const q = pts.map((p) => worldToScreen(items, p));
  return { x0: Math.min(...q.map((p) => p.x)), x1: Math.max(...q.map((p) => p.x)), y0: Math.min(...q.map((p) => p.y)), y1: Math.max(...q.map((p) => p.y)) };
}

/** Projected outline of unit k's water tank body. */
function tankOutline(k: number): Pt[] {
  const b = BACK_ROW.find((item) => item.tank)!;
  const cx = k * L + 120;
  const pts: Pt[] = [];
  for (const zv of [b.h + 14, b.h + 46]) for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) pts.push(iso(cx + Math.cos(a) * 14, -185 + Math.sin(a) * 14, zv));
  return pts;
}


/** The world-to-logical matrix, read from the ground layer (identity local transform). */
function mustCamera(items: readonly ResolvedDrawItem[]): number[] {
  const m = must(items, "gBase").logicalMatrix;
  return [...m];
}

// ---------------------------------------------------------------------------
// Real-renderer preview (optional).

async function preview(source: string, dir: string, times: number[]): Promise<void> {
  const require = createRequire(import.meta.url);
  const esbuild = require("esbuild") as typeof import("esbuild");
  let playwright: { chromium: { launch: (options: Record<string, unknown>) => Promise<any> } };
  try {
    playwright = require("playwright");
  } catch {
    throw new Error("GVR_PREVIEW_DIR needs Playwright (require('playwright')) to drive headless Chromium.");
  }
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const entry = `
    import { CanvasRenderer } from "@gvr/canvas-renderer";
    import { AnimationRuntime } from "@gvr/runtime";
    import { compileMotionScript } from "@gvr/compiler";
    window.renderStills = (source, times) => {
      const t0 = performance.now();
      const compiled = compileMotionScript(source);
      const compileMs = performance.now() - t0;
      if (!compiled.ok || !compiled.scene) return { error: compiled.diagnostics.map((d) => d.message).join("\\n") };
      const runtime = new AnimationRuntime(compiled.scene);
      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      const renderer = new CanvasRenderer(canvas);
      renderer.resize(1280, 720, 1);
      const shots = [];
      let renderMs = 0;
      for (const t of times) {
        const r0 = performance.now();
        renderer.render(runtime.evaluate(Math.round(t * 1000)));
        renderMs += performance.now() - r0;
        shots.push(canvas.toDataURL("image/png"));
      }
      return { shots, compileMs, renderMs: renderMs / times.length };
    };`;
  const bundle = await esbuild.build({
    stdin: { contents: entry, resolveDir: repo, loader: "ts" },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
  });
  // GVR_CHROME / CHROME_PATH or a well-known install, as the evaluation harness resolves it; else Playwright's own Chromium.
  let executablePath: string | undefined;
  const chrome = (await import("../../../evaluation/harness/chrome")) as { resolveChromeBinary?: () => string; default?: { resolveChromeBinary: () => string } };
  const resolveChrome = chrome.resolveChromeBinary ?? chrome.default?.resolveChromeBinary;
  try {
    executablePath = resolveChrome?.();
  } catch {
    executablePath = undefined;
  }
  console.log(`preview browser ${executablePath ?? "Playwright Chromium"}`);
  const browser = await playwright.chromium.launch(executablePath ? { executablePath, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent("<!doctype html><html><body style='margin:0'></body></html>");
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const result = (await page.evaluate(([src, ts]: [string, number[]]) => (window as any).renderStills(src, ts), [source, times])) as {
      shots?: string[];
      compileMs?: number;
      renderMs?: number;
      error?: string;
    };
    if (result.error || !result.shots) throw new Error(result.error ?? "No stills.");
    mkdirSync(dir, { recursive: true });
    result.shots.forEach((shot, i) => writeFileSync(resolve(dir, `f${times[i]!.toFixed(2).padStart(5, "0")}.png`), Buffer.from(shot.split(",")[1]!, "base64")));
    console.log(`preview ${dir} (${result.shots.length} stills, Chromium compile ${result.compileMs!.toFixed(0)}ms, render ${result.renderMs!.toFixed(1)}ms per frame)`);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const plan = planTrain();
  const stops = cameraPlan(plan.speed);
  const source = program(plan, stops);
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = resolve(here, "the-city-comes-around.ms");
  writeFileSync(outPath, source);
  const bytes = Buffer.byteLength(source);
  console.log(`wrote ${outPath} (${bytes} bytes; budget ${DEFAULT_LIMITS.maxSourceBytes})`);
  const compileStart = performance.now();
  const compiled = compileMotionScript(source);
  const compileMs = performance.now() - compileStart;
  if (!compiled.ok || !compiled.scene || compiled.diagnostics.length > 0) {
    console.error(compiled.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    process.exit(1);
  }
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) {
    console.error(validated.diagnostics.map((item) => item.message).join("\n"));
    process.exit(1);
  }
  const scene = compiled.scene;
  const steps = scene.timeline.steps?.length ?? 0;
  console.log(
    `nodes ${scene.nodes.length}/${DEFAULT_LIMITS.maxNodes}  tracks ${scene.timeline.tracks.length}/${DEFAULT_LIMITS.maxTracks}  steps ${steps}/${DEFAULT_LIMITS.maxSteps}  geometry ${geometryItems}/${DEFAULT_LIMITS.maxGeometryItems}  compile ${compileMs.toFixed(0)}ms`,
  );
  console.log(`static polygons culled outside every camera frame: ${culled}`);
  console.log(`train ${plan.speed.toFixed(1)} units/s, head at X ${plan.x13.toFixed(0)} at 0:13`);
  if (bytes > DEFAULT_LIMITS.maxSourceBytes) {
    console.error(`Source is ${bytes} bytes, over maxSourceBytes.`);
    process.exit(1);
  }
  const orderStart = performance.now();
  const orderProblems = checkPaintOrder();
  const runtimeStart = performance.now();
  const runtimeProblems = runtimeChecks(scene, plan, stops);
  console.log(`paint-order check ${((runtimeStart - orderStart) / 1000).toFixed(1)}s, runtime checks ${((performance.now() - runtimeStart) / 1000).toFixed(1)}s (${evaluations()} frames evaluated)`);
  const problems = [...orderProblems, ...runtimeProblems].filter((p) => p.length > 0);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const evalStart = performance.now();
  const runtime = new AnimationRuntime(scene);
  for (let s = 0; s < 30; s += 0.5) runtime.evaluate(ms(s));
  console.log(`evaluate ${((performance.now() - evalStart) / 60).toFixed(2)}ms per frame`);
  const previewDir = process.env.GVR_PREVIEW_DIR;
  if (previewDir) {
    await preview(source, resolve(previewDir), [0, 0.5, 1.2, 2.6, 4.0, 5.0, 6.2, 7.3, 8.2, 9.4, 10, 11.5, 13.0, 13.4, 14, 15, 15.6, 16.5, 17.5, 18.5, 19.5, 20, 21.5, 22.6, 23.5, 25, 27, 29.5, 30]);
  }
  console.log(`builder ${((performance.now() - STARTED) / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
