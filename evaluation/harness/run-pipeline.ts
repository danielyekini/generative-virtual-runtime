/**
 * Isolated evaluation harness. Calls production import, emit, compile,
 * validation, and runtime APIs. Does not modify those packages.
 *
 * Usage (from the repository root):
 *   npx tsx evaluation/harness/run-pipeline.ts
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { importSource, IMPORT_VERSION, formatImportReport } from "@gvr/format-import-core";
import { lottieAdapter, LOTTIE_ADAPTER_VERSION, type LottieDocument } from "@gvr/format-lottie";
import { svgAdapter, SVG_ADAPTER_VERSION, SVG_STATIC_DURATION_MS, type SvgDocument } from "@gvr/format-svg";
import { emitMotionScript, EMITTER_VERSION } from "@gvr/motionscript-emitter";
import { AnimationRuntime } from "@gvr/runtime";
import { DSL_VERSION, IR_VERSION, validateSceneIR, type SceneIR } from "@gvr/schema";
import { chromeVersion, resolveChromeBinary } from "./chrome";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidence = resolve(repo, "evaluation/evidence");
const corpusRoot = resolve(repo, "fixtures/corpus");
const LOTTIE_BG = "#101014";
const SVG_BG = "#000000";

interface Fixture {
  id: string;
  role: "baseline" | "pack";
  format: "lottie" | "svg";
  sourcePath: string;
  fileName: string;
}

function corpusFile(format: "lottie" | "svg", id: string, originalName: string): Fixture {
  const ext = format === "lottie" ? "json" : "svg";
  const sourcePath = resolve(corpusRoot, format, `${id}.${ext}`);
  return {
    id,
    role: id === "LOT-00" ? "baseline" : "pack",
    format,
    sourcePath,
    fileName: originalName,
  };
}

const FIXTURES: Fixture[] = [
  corpusFile("lottie", "LOT-00", "panning_landscape_motionscript_v1_compatible.json"),
  corpusFile("lottie", "LOT-01", "Celebrations Begin.json"),
  corpusFile("lottie", "LOT-02", "Hover Button.json"),
  corpusFile("lottie", "LOT-03", "lottie_ex1.json"),
  corpusFile("lottie", "LOT-04", "lottie_ex2.json"),
  corpusFile("lottie", "LOT-05", "lottie_simple_ex1.json"),
  corpusFile("lottie", "LOT-06", "Punches.json"),
  corpusFile("lottie", "LOT-07", "Wave Animation.json"),
  corpusFile("svg", "SVG-01", "Celebrations Begin.svg"),
  corpusFile("svg", "SVG-02", "Jumping Jack.svg"),
];

const LAYER_TY: Record<number, string> = {
  0: "precomp",
  1: "solid",
  2: "image",
  3: "null",
  4: "shape",
  5: "text",
  6: "audio",
  13: "camera",
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function tryGit(command: string): string {
  try {
    return execSync(command, { cwd: repo, encoding: "utf8" }).trim();
  } catch (error) {
    return error instanceof Error ? error.message.split("\n")[0] : String(error);
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const text = JSON.stringify(value, null, 2);
  writeFileSync(path, text.length > 8_000_000 ? JSON.stringify(value) : `${text}\n`);
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function note(examples: { feature: string; path: string }[], feature: string, path: string): void {
  if (examples.filter((item) => item.feature === feature).length >= 6) return;
  examples.push({ feature, path });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonzeroSkew(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (raw.a === 1 && Array.isArray(raw.k)) {
    return raw.k.some((frame) => isRecord(frame) && Array.isArray(frame.s) && Math.abs(Number(frame.s[0])) > 1e-6);
  }
  const value = raw.k;
  return typeof value === "number" && Math.abs(value) > 1e-6;
}

function scanAnimated(raw: unknown, bag: LottieBag, path: string): void {
  if (!isRecord(raw) || raw.a !== 1 || !Array.isArray(raw.k)) return;
  bag.animatedProperties += 1;
  if (typeof raw.x === "string" && raw.x.trim()) {
    bag.expressions += 1;
    note(bag.examples, "expression", path);
  }
  for (const frame of raw.k) {
    if (!isRecord(frame)) continue;
    if (frame.h === 1) bag.holdKeyframes += 1;
    if (frame.i !== undefined || frame.o !== undefined) bag.easingHandles += 1;
    if (frame.to !== undefined || frame.ti !== undefined) {
      bag.spatialTangents += 1;
      note(bag.examples, "spatial-tangent", path);
    }
  }
}

interface LottieBag {
  topLevelKeys: string[];
  name?: string;
  version?: string;
  frameRate?: number;
  inFrame?: number;
  outFrame?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  markers: string[];
  fonts: string[];
  chars: number;
  rootLayerTypes: Record<string, number>;
  assetLayerTypes: Record<string, number>;
  shapeTypes: Record<string, number>;
  masks: number;
  mattes: number;
  effects: number;
  blendModes: number;
  skew: number;
  autoOrient: number;
  spatialTangents: number;
  textLayers: number;
  hiddenLayers: number;
  parenting: number;
  ddd: number;
  animatedProperties: number;
  expressions: number;
  holdKeyframes: number;
  easingHandles: number;
  roundedRects: number;
  animatedRoundedRects: number;
  images: { id?: string; embedded: boolean; path?: string; width?: number; height?: number }[];
  precompAssets: { id?: string; layers: number }[];
  missingAssets: string[];
  examples: { feature: string; path: string }[];
}

function scanLayer(layer: Record<string, unknown>, path: string, scope: "root" | "asset", bag: LottieBag): void {
  const ty = typeof layer.ty === "number" ? layer.ty : -1;
  const name = LAYER_TY[ty] ?? `ty_${ty}`;
  bump(scope === "root" ? bag.rootLayerTypes : bag.assetLayerTypes, name);
  if (Array.isArray(layer.masksProperties) && layer.masksProperties.length > 0) {
    bag.masks += 1;
    note(bag.examples, "mask", `${path}.masksProperties`);
  }
  if (typeof layer.tt === "number") {
    bag.mattes += 1;
    note(bag.examples, "matte", `${path}.tt`);
  }
  if (Array.isArray(layer.ef) && layer.ef.length > 0) {
    bag.effects += 1;
    note(bag.examples, "effect", `${path}.ef`);
  }
  if (typeof layer.bm === "number" && layer.bm !== 0) {
    bag.blendModes += 1;
    note(bag.examples, "blend", `${path}.bm`);
  }
  if (layer.ddd === 1) bag.ddd += 1;
  if (layer.hd === true) bag.hiddenLayers += 1;
  if (typeof layer.parent === "number") bag.parenting += 1;
  if (ty === 5) {
    bag.textLayers += 1;
    note(bag.examples, "text-layer", path);
    const font = readTextFont(layer);
    if (font) bag.fonts.push(font);
  }
  const ks = isRecord(layer.ks) ? layer.ks : undefined;
  if (ks) {
    if (nonzeroSkew(ks.sk) || nonzeroSkew(ks.sa)) {
      bag.skew += 1;
      note(bag.examples, "skew", `${path}.ks.sk`);
    }
    if (ks.ao === 1 || (isRecord(ks.ao) && ks.ao.k === 1)) {
      bag.autoOrient += 1;
      note(bag.examples, "auto-orient", `${path}.ks.ao`);
    }
    for (const key of ["a", "p", "s", "r", "o", "rx", "ry", "rz", "or"]) scanAnimated(ks[key], bag, `${path}.ks.${key}`);
  }
  if (Array.isArray(layer.shapes)) scanShapes(layer.shapes, `${path}.shapes`, bag);
}

function readTextFont(layer: Record<string, unknown>): string | undefined {
  const text = isRecord(layer.t) ? layer.t : undefined;
  const data = text && isRecord(text.d) ? text.d : undefined;
  const keys = data && Array.isArray(data.k) ? data.k : [];
  for (const key of keys) {
    const source = isRecord(key) && isRecord(key.s) ? key.s : isRecord(key) ? key : undefined;
    if (source && typeof source.f === "string") return source.f;
  }
  return undefined;
}

function scanShapes(items: unknown[], path: string, bag: LottieBag): void {
  items.forEach((item, index) => {
    if (!isRecord(item) || typeof item.ty !== "string") return;
    bump(bag.shapeTypes, item.ty);
    const here = `${path}[${index}]`;
    if (item.ty === "gf" || item.ty === "gs") note(bag.examples, "gradient", here);
    if (item.ty === "tm" || item.ty === "rp" || item.ty === "mm" || item.ty === "rd" || item.ty === "op") {
      note(bag.examples, item.ty, here);
    }
    if (item.ty === "rc") {
      const radius = item.r;
      if (isRecord(radius) && radius.a === 1) bag.animatedRoundedRects += 1;
      else if (isRecord(radius) && typeof radius.k === "number" && Math.abs(radius.k) > 1e-6) bag.roundedRects += 1;
    }
    if (typeof item.bm === "number" && item.bm !== 0) {
      bag.blendModes += 1;
      note(bag.examples, "shape-blend", here);
    }
    for (const key of ["p", "s", "r", "o", "c", "w", "ks"]) scanAnimated(item[key], bag, `${here}.${key}`);
    if (item.ty === "gr" && Array.isArray(item.it)) scanShapes(item.it, `${here}.it`, bag);
  });
}

function scanLottie(value: unknown): LottieBag {
  const bag: LottieBag = {
    topLevelKeys: isRecord(value) ? Object.keys(value) : [],
    markers: [],
    fonts: [],
    chars: 0,
    rootLayerTypes: {},
    assetLayerTypes: {},
    shapeTypes: {},
    masks: 0,
    mattes: 0,
    effects: 0,
    blendModes: 0,
    skew: 0,
    autoOrient: 0,
    spatialTangents: 0,
    textLayers: 0,
    hiddenLayers: 0,
    parenting: 0,
    ddd: 0,
    animatedProperties: 0,
    expressions: 0,
    holdKeyframes: 0,
    easingHandles: 0,
    roundedRects: 0,
    animatedRoundedRects: 0,
    images: [],
    precompAssets: [],
    missingAssets: [],
    examples: [],
  };
  if (!isRecord(value)) return bag;
  bag.name = typeof value.nm === "string" ? value.nm : undefined;
  bag.version = typeof value.v === "string" ? value.v : undefined;
  bag.frameRate = typeof value.fr === "number" ? value.fr : undefined;
  bag.inFrame = typeof value.ip === "number" ? value.ip : undefined;
  bag.outFrame = typeof value.op === "number" ? value.op : undefined;
  bag.width = typeof value.w === "number" ? value.w : undefined;
  bag.height = typeof value.h === "number" ? value.h : undefined;
  if (bag.frameRate && bag.inFrame !== undefined && bag.outFrame !== undefined && bag.frameRate > 0) {
    bag.durationMs = ((bag.outFrame - bag.inFrame) / bag.frameRate) * 1000;
  }
  if (Array.isArray(value.markers)) {
    for (const marker of value.markers) {
      if (isRecord(marker) && typeof marker.cm === "string") bag.markers.push(marker.cm);
    }
  }
  const fonts = isRecord(value.fonts) && Array.isArray(value.fonts.list) ? value.fonts.list : [];
  for (const font of fonts) {
    if (!isRecord(font)) continue;
    const name = typeof font.fFamily === "string" ? font.fFamily : typeof font.fName === "string" ? font.fName : undefined;
    if (name) bag.fonts.push(name);
  }
  bag.chars = Array.isArray(value.chars) ? value.chars.length : 0;
  if (Array.isArray(value.layers)) {
    value.layers.forEach((layer, index) => {
      if (isRecord(layer)) scanLayer(layer, `$.layers[${index}]`, "root", bag);
    });
  }
  if (Array.isArray(value.assets)) {
    value.assets.forEach((asset, index) => {
      if (!isRecord(asset)) return;
      if (Array.isArray(asset.layers)) {
        bag.precompAssets.push({ id: typeof asset.id === "string" ? asset.id : undefined, layers: asset.layers.length });
        asset.layers.forEach((layer, layerIndex) => {
          if (isRecord(layer)) scanLayer(layer, `$.assets[${index}].layers[${layerIndex}]`, "asset", bag);
        });
        return;
      }
      const embedded = asset.e === 1 || (typeof asset.p === "string" && asset.p.startsWith("data:"));
      const path = `${typeof asset.u === "string" ? asset.u : ""}${typeof asset.p === "string" ? asset.p : ""}`;
      bag.images.push({
        id: typeof asset.id === "string" ? asset.id : undefined,
        embedded,
        path: path || undefined,
        width: typeof asset.w === "number" ? asset.w : undefined,
        height: typeof asset.h === "number" ? asset.h : undefined,
      });
      if (!embedded && path) bag.missingAssets.push(path);
    });
  }
  bag.fonts = [...new Set(bag.fonts)];
  return bag;
}

interface SvgBag {
  root: string;
  viewBox?: string;
  widthAttr?: string;
  heightAttr?: string;
  preserveAspectRatio?: string;
  percentSize: boolean;
  tags: Record<string, number>;
  smil: { animate: number; animateTransform: number; animateMotion: number; set: number };
  durations: string[];
  repeatCounts: string[];
  attributeNames: Record<string, number>;
  calcModes: Record<string, number>;
  keyTimeSamples: number[];
  styleBlocks: number;
  inlineStyleAttrs: number;
  scripts: number;
  eventAttrs: number;
  foreignObjects: number;
  images: { embedded: boolean; hrefPrefix: string }[];
  externalHrefs: string[];
  clipPaths: number;
  masks: number;
  gradients: number;
  filters: number;
  textNodes: number;
  fonts: string[];
  observationWindowSec?: number;
}

function scanSvg(source: string): SvgBag {
  const bag: SvgBag = {
    root: "",
    percentSize: false,
    tags: {},
    smil: { animate: 0, animateTransform: 0, animateMotion: 0, set: 0 },
    durations: [],
    repeatCounts: [],
    attributeNames: {},
    calcModes: {},
    keyTimeSamples: [],
    styleBlocks: 0,
    inlineStyleAttrs: 0,
    scripts: 0,
    eventAttrs: 0,
    foreignObjects: 0,
    images: [],
    externalHrefs: [],
    clipPaths: 0,
    masks: 0,
    gradients: 0,
    filters: 0,
    textNodes: 0,
    fonts: [],
  };
  const root = source.match(/<svg\b([^>]*)>/i);
  bag.root = root ? `<svg${root[1]}>` : "";
  const rootAttrs = attrs(root?.[1] ?? "");
  bag.viewBox = rootAttrs.viewBox;
  bag.widthAttr = rootAttrs.width;
  bag.heightAttr = rootAttrs.height;
  bag.preserveAspectRatio = rootAttrs.preserveAspectRatio;
  bag.percentSize = /%$/.test(rootAttrs.width ?? "") || /%$/.test(rootAttrs.height ?? "");
  const tagRe = /<([a-zA-Z][\w:-]*)\b([^>]*)\/?>/g;
  const durations = new Map<string, number>();
  for (const match of source.matchAll(tagRe)) {
    const tag = match[1].toLowerCase();
    bump(bag.tags, tag);
    const at = attrs(match[2]);
    if (tag === "style") bag.styleBlocks += 1;
    if (at.style) bag.inlineStyleAttrs += 1;
    if (tag === "script") bag.scripts += 1;
    if (tag === "foreignobject") bag.foreignObjects += 1;
    if (tag === "clippath") bag.clipPaths += 1;
    if (tag === "mask") bag.masks += 1;
    if (tag === "lineargradient" || tag === "radialgradient") bag.gradients += 1;
    if (tag === "filter") bag.filters += 1;
    if (tag === "text" || tag === "tspan") bag.textNodes += 1;
    if (at["font-family"]) bag.fonts.push(at["font-family"]);
    for (const key of Object.keys(at)) {
      if (/^on/i.test(key)) bag.eventAttrs += 1;
    }
    if (tag === "image") {
      const href = at.href || at["xlink:href"] || "";
      bag.images.push({ embedded: href.startsWith("data:"), hrefPrefix: href.slice(0, 48) });
      if (href && !href.startsWith("data:") && !href.startsWith("#")) bag.externalHrefs.push(href);
    }
    if (tag === "animate" || tag === "animatetransform" || tag === "animatemotion" || tag === "set") {
      if (tag === "animate") bag.smil.animate += 1;
      if (tag === "animatetransform") bag.smil.animateTransform += 1;
      if (tag === "animatemotion") bag.smil.animateMotion += 1;
      if (tag === "set") bag.smil.set += 1;
      if (at.dur) durations.set(at.dur, (durations.get(at.dur) ?? 0) + 1);
      if (at.repeatCount) bag.repeatCounts.push(at.repeatCount);
      if (at.attributeName) bump(bag.attributeNames, at.attributeName);
      if (at.calcMode) bump(bag.calcModes, at.calcMode);
      if (at.keyTimes && bag.keyTimeSamples.length < 8) {
        for (const part of at.keyTimes.split(";").map((item) => Number(item.trim()))) {
          if (Number.isFinite(part)) bag.keyTimeSamples.push(part);
        }
      }
    }
  }
  bag.durations = [...durations.keys()];
  bag.repeatCounts = [...new Set(bag.repeatCounts)];
  bag.fonts = [...new Set(bag.fonts)];
  const seconds = bag.durations.map(parseDuration).filter((value) => value > 0);
  bag.observationWindowSec = seconds.length ? Math.max(...seconds) : undefined;
  return bag;
}

function attrs(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of source.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[match[1]] = match[2];
  return out;
}

function parseDuration(value: string): number {
  const match = /^([0-9]*\.?[0-9]+)(ms|s)?$/.exec(value.trim());
  if (!match) return 0;
  const number = Number(match[1]);
  return match[2] === "ms" ? number / 1000 : number;
}

function complexity(scene: SceneIR) {
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  let depth = 1;
  let commands = 0;
  for (const node of scene.nodes) {
    if (node.kind === "path") commands += node.commands.length;
    if (node.kind === "polygon") commands += node.points.length;
    let current = node;
    let level = 1;
    const seen = new Set<string>();
    while (current.parentId) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
      level += 1;
    }
    depth = Math.max(depth, level);
  }
  return {
    nodes: scene.nodes.length,
    tracks: scene.timeline.tracks.length,
    steps: scene.timeline.steps.length,
    geometryItems: commands,
    depth,
    durationMs: scene.timeline.durationMs,
    viewport: scene.viewport,
    background: scene.background,
  };
}

function groupDiagnostics(items: { code?: string; feature?: string; message?: string; severity?: string }[]) {
  const groups = new Map<string, { code: string; feature: string; severity: string; message: string; count: number }>();
  for (const item of items) {
    const code = item.code ?? "";
    const feature = item.feature ?? "";
    const message = item.message ?? "";
    const severity = item.severity ?? "";
    const key = `${code}\u0000${feature}\u0000${severity}\u0000${message}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { code, feature, severity, message, count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function hexBackground(scene: SceneIR | undefined, format: "lottie" | "svg"): string {
  if (!scene) return format === "lottie" ? LOTTIE_BG : SVG_BG;
  const color = scene.background;
  const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");
  if (color.a < 1) return SVG_BG;
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

interface SampleSpec {
  id: string;
  label: string;
  fraction: number;
  sourceTimeMs: number;
  lottieFrame?: number;
  svgTimeSec?: number;
}

function buildSamples(fixture: Fixture, inventory: { lottie?: LottieBag; svg?: SvgBag }): SampleSpec[] {
  if (fixture.format === "lottie" && inventory.lottie?.durationMs && inventory.lottie.frameRate && inventory.lottie.inFrame !== undefined && inventory.lottie.outFrame !== undefined) {
    const { durationMs, frameRate, inFrame, outFrame } = inventory.lottie;
    const span = outFrame - inFrame;
    const fractions = [
      ["start", 0],
      ["q25", 0.25],
      ["q50", 0.5],
      ["q75", 0.75],
      ["near_end", 0.995],
    ] as const;
    return fractions.map(([id, fraction]) => {
      const frame = inFrame + span * fraction;
      return {
        id,
        label: id === "start" ? "start" : id === "near_end" ? "near end (before out point)" : `${fraction * 100}%`,
        fraction,
        sourceTimeMs: durationMs * fraction,
        lottieFrame: frame,
      };
    });
  }
  const windowSec = inventory.svg?.observationWindowSec ?? SVG_STATIC_DURATION_MS / 1000;
  const fractions: [string, number, string][] = [
    ["start", 0, "start"],
    ["q25", 0.25, "25%"],
    ["q50", 0.5, "50%"],
    ["q75", 0.75, "75%"],
    ["near_end", 0.995, "near end of one cycle"],
  ];
  const extra = extraSvgFractions(inventory.svg);
  for (const fraction of extra) fractions.push([`key_${fraction.toFixed(3)}`, fraction, `SMIL key fraction ${fraction.toFixed(3)}`]);
  return fractions.map(([id, fraction, label]) => ({
    id,
    label,
    fraction,
    sourceTimeMs: windowSec * 1000 * fraction,
    svgTimeSec: windowSec * fraction,
  }));
}

function extraSvgFractions(svg: SvgBag | undefined): number[] {
  if (!svg) return [];
  const interesting = svg.keyTimeSamples.filter((value) => value > 0.05 && value < 0.95 && [0.25, 0.5, 0.75].every((mark) => Math.abs(value - mark) > 0.04));
  const unique = [...new Set(interesting.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b);
  if (unique.length <= 2) return unique;
  return [unique[Math.floor(unique.length / 3)], unique[Math.floor((unique.length * 2) / 3)]];
}

function stage(name: string, status: string, detail: string) {
  return { name, status, detail };
}

async function main(): Promise<void> {
  mkdirSync(evidence, { recursive: true });
  const missing = FIXTURES.filter((fixture) => !existsSync(fixture.sourcePath)).map((fixture) => fixture.sourcePath);
  if (missing.length > 0) {
    throw new Error(
      `Fidelity corpus missing under fixtures/corpus (${missing.length} file(s)). Run: shasum -a 256 -c fixtures/corpus/SHA256SUMS\n${missing.join("\n")}`,
    );
  }
  let chromeBinary = "";
  let chrome = "";
  try {
    chromeBinary = resolveChromeBinary();
    chrome = chromeVersion(chromeBinary);
  } catch (error) {
    chrome = error instanceof Error ? error.message : String(error);
  }
  const gateSettings = JSON.parse(readFileSync(resolve(repo, "evaluation/gate-settings.json"), "utf8")) as Record<string, unknown>;
  const environment = {
    capturedAt: new Date().toISOString(),
    repository: repo,
    gitHead: tryGit("git rev-parse HEAD"),
    gitStatus: tryGit("git status -sb"),
    gitLog: tryGit("git log -1 --oneline"),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    npm: tryGit("npm -v"),
    chromeBinary: chromeBinary || null,
    chrome,
    gateSettings,
    languages: JSON.parse(readFileSync(resolve(repo,"packages/schema/capabilities/releases.json"),"utf8")).languages,
    lottieWeb: JSON.parse(readFileSync(resolve(repo, "node_modules/lottie-web/package.json"), "utf8")).version,
    versions: {
      importCore: IMPORT_VERSION,
      lottieAdapter: LOTTIE_ADAPTER_VERSION,
      svgAdapter: SVG_ADAPTER_VERSION,
      emitter: EMITTER_VERSION,
      legacyIrDefault: IR_VERSION,
      legacyDslDefault: DSL_VERSION,
      svgStaticDurationMs: SVG_STATIC_DURATION_MS,
    },
    commands: [
      "npx tsx evaluation/harness/run-pipeline.ts",
      "npx tsx evaluation/harness/drive-browser.ts",
      "node evaluation/harness/write-report.mjs",
    ],
  };
  writeJson(resolve(evidence, "environment.json"), environment);

  const manifest = [];
  const results = [];
  const jobs = [];

  for (const fixture of FIXTURES) {
    console.log(`\n=== ${fixture.id} ${fixture.fileName} ===`);
    const result = evaluateFixture(fixture);
    manifest.push(result.manifestEntry);
    results.push(result.publicResult);
    if (result.job) jobs.push(result.job);
    writeJson(resolve(evidence, "results.json"), { fixtures: results });
  }

  writeJson(resolve(evidence, "manifest.json"), {
    packRoots: [relative(repo, resolve(corpusRoot, "lottie")), relative(repo, resolve(corpusRoot, "svg"))],
    corpusRoot: relative(repo, corpusRoot),
    checksums: "fixtures/corpus/SHA256SUMS",
    archives: [],
    svgFilesDiscovered: 2,
    lottieFilesDiscovered: 8,
    note: "Canonical corpus lives under fixtures/corpus/ (committed). Scratch copies are written to evaluation/evidence/sources/.",
    fixtures: manifest,
  });
  writeJson(resolve(evidence, "render-jobs.json"), { jobs });
  console.log(`\nWrote ${results.length} fixture results and ${jobs.length} render jobs.`);
}

function evaluateFixture(fixture: Fixture) {
  const stages: { name: string; status: string; detail: string }[] = [];
  const dir = resolve(evidence, "fixtures", fixture.id);
  mkdirSync(dir, { recursive: true });
  let source = "";
  let sourceBytes = 0;
  let parseError = "";
  mkdirSync(resolve(evidence, "sources"), { recursive: true });
  try {
    source = readFileSync(fixture.sourcePath, "utf8");
    sourceBytes = Buffer.byteLength(source);
    copyFileSync(fixture.sourcePath, resolve(evidence, "sources", `${fixture.id}.${fixture.format === "lottie" ? "json" : "svg"}`));
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  let lottie: LottieBag | undefined;
  let svg: SvgBag | undefined;
  let jsonValue: unknown;
  if (!source) {
    stages.push(stage("source_parse", "FAIL", parseError));
  } else if (fixture.format === "lottie") {
    try {
      jsonValue = JSON.parse(source);
      lottie = scanLottie(jsonValue);
      stages.push(stage("source_parse", "PASS", `JSON object, ${sourceBytes} bytes`));
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
      stages.push(stage("source_parse", "FAIL", parseError));
    }
  } else {
    svg = scanSvg(source);
    const wellFormed = source.includes("<svg") && source.includes("</svg>");
    stages.push(stage("source_parse", wellFormed ? "PASS" : "FAIL", wellFormed ? "SVG document located by lexical scan; production XML parse follows import" : "No svg root"));
  }

  const adapter = fixture.format === "lottie" ? lottieAdapter : svgAdapter;
  let production: ReturnType<typeof importSource> | undefined;
  let importThrown = "";
  const importStart = performance.now();
  if (source && stages[0]?.status !== "FAIL") {
    try {
      production = importSource(adapter, source, { sourceName: fixture.fileName });
    } catch (error) {
      importThrown = error instanceof Error ? error.stack ?? error.message : String(error);
    }
  }
  const importMs = performance.now() - importStart;
  if (!source || stages[0]?.status === "FAIL") {
    stages.push(stage("import", "NOT_REACHED", "Source parse failed."));
  } else if (importThrown) {
    stages.push(stage("import", "FAIL", importThrown.split("\n")[0]));
  } else if (production) {
    const fidelity = production.fidelity.overall;
    const status = fidelity === "exact" ? "PASS" : fidelity === "degraded" ? "DEGRADED" : fidelity === "partial" ? "PARTIAL" : "FAIL";
    stages.push(
      stage(
        "import",
        status,
        `fidelity ${fidelity}; exact ${production.fidelity.exact.length}; approximated ${production.fidelity.approximated.length}; dropped ${production.fidelity.dropped.length}; unsupported ${production.fidelity.unsupported.length}; scene ${production.scene ? "yes" : "no"}`,
      ),
    );
  }

  let diagnosticScene: SceneIR | undefined;
  let diagnosticFidelity = "";
  let diagnosticError = "";
  if (source && !production?.scene) {
    try {
      const parsed = adapter.parse(source, { sourceName: fixture.fileName, sourceText: source, maxSourceBytes: Number.MAX_SAFE_INTEGER });
      if (!parsed.ok) {
        diagnosticError = parsed.diagnostics.map((item) => `${item.code}: ${item.message}`).join(" | ");
      } else {
        // Keep the adapter/parsed-value correlation explicit for the union of formats.
        const context = { sourceName: fixture.fileName, sourceText: source, maxSourceBytes: Number.MAX_SAFE_INTEGER };
        const normalised = fixture.format === "lottie"
          ? lottieAdapter.normalise(parsed.value as LottieDocument, context)
          : svgAdapter.normalise(parsed.value as SvgDocument, context);
        diagnosticScene = normalised.scene;
        diagnosticFidelity = normalised.fidelity.overall;
        writeJson(resolve(dir, "diagnostic-import.json"), {
          note: "Not the production importSource route. Used only because production returned no Scene IR, so later stages could be inspected. Outcomes from this object are not a native pass.",
          fidelity: normalised.fidelity.overall,
          diagnostics: groupDiagnostics(normalised.diagnostics).slice(0, 80),
          sceneProduced: Boolean(normalised.scene),
          validation: normalised.scene ? summariseValidation(normalised.scene) : null,
        });
        if (normalised.scene) writeJson(resolve(dir, "diagnostic-scene.json"), normalised.scene);
      }
    } catch (error) {
      diagnosticError = error instanceof Error ? error.message : String(error);
    }
  }

  const productionScene = production?.ok ? production.scene : undefined;
  let script = "";
  let emitMs = 0;
  let emitError = "";
  if (!productionScene) {
    stages.push(stage("motionscript_emit", "NOT_REACHED", production?.scene ? "Production import dropped the scene." : "Production import produced no scene."));
  } else {
    const start = performance.now();
    try {
      script = emitMotionScript(productionScene);
      emitMs = performance.now() - start;
      writeFileSync(resolve(dir, "generated.motion"), script);
      stages.push(stage("motionscript_emit", "PASS", `${script.length} chars in ${emitMs.toFixed(1)} ms`));
    } catch (error) {
      emitMs = performance.now() - start;
      emitError = error instanceof Error ? error.message : String(error);
      stages.push(stage("motionscript_emit", "FAIL", emitError));
    }
  }

  let compiled: ReturnType<typeof compileMotionScript> | undefined;
  let compileMs = 0;
  if (!script) {
    stages.push(stage("compile", "NOT_REACHED", "No MotionScript from the production scene."));
    stages.push(stage("ir_validate_compiled", "NOT_REACHED", "Compile did not run."));
  } else {
    const start = performance.now();
    try {
      compiled = compileMotionScript(script);
      compileMs = performance.now() - start;
      const codes = groupDiagnostics(compiled.diagnostics.map((item) => ({ code: item.code, message: item.message, severity: item.severity }))).slice(0, 40);
      writeJson(resolve(dir, "compile-diagnostics.json"), { ok: compiled.ok, count: compiled.diagnostics.length, groups: codes });
      if (compiled.scene) writeJson(resolve(dir, "compiled-scene.json"), compiled.scene);
      stages.push(stage("compile", compiled.ok ? "PASS" : "FAIL", `ok ${compiled.ok}; diagnostics ${compiled.diagnostics.length}; ${compileMs.toFixed(1)} ms`));
      stages.push(stage("ir_validate_compiled", compiled.ok ? "PASS" : "FAIL", compiled.ok ? "compileMotionScript accepted the scene" : codes[0]?.message ?? "validation failed"));
    } catch (error) {
      compileMs = performance.now() - start;
      stages.push(stage("compile", "FAIL", error instanceof Error ? error.message : String(error)));
      stages.push(stage("ir_validate_compiled", "NOT_REACHED", "Compiler threw."));
    }
  }

  if (production?.ok && production.scene) {
    stages.push(stage("ir_validate_import", "PASS", "importSource returns a scene only after validateSceneIR succeeds"));
    writeJson(resolve(dir, "imported-scene.json"), production.scene);
  } else if (production) {
    stages.push(stage("ir_validate_import", production.scene ? "FAIL" : "FAIL", "No accepted Scene IR from importSource."));
  } else {
    stages.push(stage("ir_validate_import", "NOT_REACHED", "Import did not return a result."));
  }

  const runtimeScene = compiled?.ok ? compiled.scene : productionScene;
  const runtimeKind = compiled?.ok ? "compiled" : productionScene ? "imported" : "none";
  const samples = buildSamples(fixture, { lottie, svg });
  const runtimeSamples = [];
  if (!runtimeScene) {
    stages.push(stage("runtime", "NOT_REACHED", "No accepted scene to evaluate."));
  } else {
    const runtime = new AnimationRuntime(runtimeScene);
    let failed = "";
    for (const sample of samples) {
      const timeMs = Math.min(sample.sourceTimeMs, runtimeScene.timeline.durationMs);
      const clamped = timeMs !== sample.sourceTimeMs;
      const start = performance.now();
      try {
        const frame = runtime.evaluate(timeMs);
        runtimeSamples.push({
          id: sample.id,
          requestedMs: sample.sourceTimeMs,
          evaluatedMs: timeMs,
          clampedToDuration: clamped,
          drawItems: frame.drawItems.length,
          diagnostics: runtime.lastDiagnostics.length,
          ms: performance.now() - start,
        });
      } catch (error) {
        failed = error instanceof Error ? error.message : String(error);
        runtimeSamples.push({ id: sample.id, requestedMs: sample.sourceTimeMs, error: failed });
        break;
      }
    }
    stages.push(
      stage(
        "runtime",
        failed ? "FAIL" : runtime.degraded ? "DEGRADED" : "PASS",
        failed || `${runtimeKind} scene; ${runtimeSamples.length} samples; draw items ${runtimeSamples.map((item) => item.drawItems).join(",")}`,
      ),
    );
  }
  stages.push(stage("render", "NOT_REACHED", "Browser render is a later harness step."));

  if (production) {
    writeFileSync(resolve(dir, "import-report.txt"), formatImportReport(production));
    writeJson(resolve(dir, "import-diagnostics.json"), {
      ok: production.ok,
      fidelity: production.fidelity.overall,
      counts: {
        exact: production.fidelity.exact.length,
        approximated: production.fidelity.approximated.length,
        dropped: production.fidelity.dropped.length,
        unsupported: production.fidelity.unsupported.length,
      },
      groups: groupDiagnostics(production.diagnostics).slice(0, 100),
      sourceMetadata: production.sourceMetadata,
    });
  }
  if (importThrown) writeFileSync(resolve(dir, "import-exception.txt"), importThrown);
  if (diagnosticError) writeFileSync(resolve(dir, "diagnostic-error.txt"), diagnosticError);

  const sceneForRender = compiled?.ok ? compiled.scene : productionScene;
  const diagnosticRender = !sceneForRender && diagnosticScene ? diagnosticScene : undefined;
  const renderKind = compiled?.ok ? "compiled" : productionScene ? "imported" : diagnosticRender ? "diagnostic_not_production" : "none";
  const renderScene = sceneForRender ?? diagnosticRender;
  const logicalWidth = renderScene?.viewport.width ?? lottie?.width ?? svgViewSize(svg).width;
  const logicalHeight = renderScene?.viewport.height ?? lottie?.height ?? svgViewSize(svg).height;
  const job = source
    ? {
        id: fixture.id,
        format: fixture.format,
        role: fixture.role,
        fileName: fixture.fileName,
        sourceUrl: `/sources/${fixture.id}.${fixture.format === "lottie" ? "json" : "svg"}`,
        sceneUrl: renderScene
          ? `/fixtures/${fixture.id}/${renderKind === "compiled" ? "compiled-scene.json" : renderKind === "imported" ? "imported-scene.json" : "diagnostic-scene.json"}`
          : null,
        sceneKind: renderKind,
        executionRoute: renderKind === "diagnostic_not_production" ? "diagnostic-continuation" : "production",
        cssWidth: Math.max(1, Math.round(logicalWidth || 1)),
        cssHeight: Math.max(1, Math.round(logicalHeight || 1)),
        logicalWidth,
        logicalHeight,
        background: hexBackground(renderScene, fixture.format),
        backgroundReason:
          (fixture.format === "lottie"
            ? "Importer writes opaque #101014 when the scene is accepted. Reference frames are composited on the same colour."
            : "SVG import background is transparent. The canvas renderer paints black letterbox first, so a transparent background stays black. Reference frames use the same black.") +
          (renderKind === "diagnostic_not_production"
            ? " This scene is diagnostic continuation after production importSource returned no scene. It is not a production playback pass."
            : ""),
        samples,
        observation:
          fixture.format === "lottie"
            ? `One composition cycle from ip ${lottie?.inFrame} to op ${lottie?.outFrame} at ${lottie?.frameRate} fps. The file is not an infinite timeline; loop is a player behaviour. Near-end is 99.5% of the way from ip to op so the out-point does not blank the frame. No interactive input is encoded in the JSON.`
            : `SMIL repeatCount is indefinite. Observation window is one cycle of ${svg?.observationWindowSec ?? "unknown"} seconds, sampled with SVGSVGElement.setCurrentTime. No pointer input.`,
      }
    : null;

  const blocking = stages.find((item) => item.status === "FAIL" || item.status === "BLOCKED");
  const sourcePathRel = relative(repo, fixture.sourcePath);
  const publicResult = {
    id: fixture.id,
    role: fixture.role,
    format: fixture.format,
    fileName: fixture.fileName,
    sourcePath: sourcePathRel,
    sourceBytes,
    sha256: source ? sha256(source) : "",
    inventory: fixture.format === "lottie" ? lottie : svg,
    timingsMs: { import: importMs, emit: emitMs, compile: compileMs },
    complexity: sceneForRender ? complexity(sceneForRender) : diagnosticScene ? { ...complexity(diagnosticScene), diagnostic: true } : null,
    production: production
      ? {
          ok: production.ok,
          fidelity: production.fidelity.overall,
          counts: {
            exact: production.fidelity.exact.length,
            approximated: production.fidelity.approximated.length,
            dropped: production.fidelity.dropped.length,
            unsupported: production.fidelity.unsupported.length,
          },
          diagnosticGroups: groupDiagnostics(production.diagnostics).slice(0, 40),
        }
      : { ok: false, error: importThrown || parseError },
    diagnostic: diagnosticScene
      ? { fidelity: diagnosticFidelity, complexity: complexity(diagnosticScene), validation: summariseValidation(diagnosticScene) }
      : diagnosticError
        ? { error: diagnosticError }
        : null,
    motionScript: script
      ? { chars: script.length, bytes: Buffer.byteLength(script), path: `fixtures/${fixture.id}/generated.motion` }
      : null,
    compile: compiled
      ? { ok: compiled.ok, diagnostics: compiled.diagnostics.length, scene: Boolean(compiled.scene) }
      : null,
    runtime: { kind: runtimeKind, samples: runtimeSamples },
    stages,
    earliestBlockingStage: blocking?.name ?? null,
    evidence: {
      importReport: production ? `fixtures/${fixture.id}/import-report.txt` : null,
      importedScene: productionScene ? `fixtures/${fixture.id}/imported-scene.json` : null,
      compiledScene: compiled?.scene ? `fixtures/${fixture.id}/compiled-scene.json` : null,
      motion: script ? `fixtures/${fixture.id}/generated.motion` : null,
    },
  };

  writeJson(resolve(dir, "result.json"), publicResult);
  console.log(stages.map((item) => `  ${item.name}: ${item.status}`).join("\n"));
  return {
    manifestEntry: {
      id: fixture.id,
      role: fixture.role,
      format: fixture.format,
      fileName: fixture.fileName,
      sourcePath: sourcePathRel,
      evidenceSource: source ? `sources/${fixture.id}.${fixture.format === "lottie" ? "json" : "svg"}` : null,
      bytes: sourceBytes,
      sha256: publicResult.sha256,
      width: lottie?.width ?? svgViewSize(svg).width,
      height: lottie?.height ?? svgViewSize(svg).height,
      durationMs: lottie?.durationMs ?? (svg?.observationWindowSec ? svg.observationWindowSec * 1000 : null),
      frameRate: lottie?.frameRate ?? null,
    },
    publicResult,
    job,
  };
}

function svgViewSize(svg: SvgBag | undefined): { width?: number; height?: number } {
  if (!svg?.viewBox) return {};
  const parts = svg.viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4) return {};
  return { width: parts[2], height: parts[3] };
}

function summariseValidation(scene: SceneIR) {
  const validated = validateSceneIR(scene);
  return {
    ok: validated.ok,
    diagnostics: validated.ok
      ? []
      : validated.diagnostics.slice(0, 20).map((item) => ({ code: item.code, message: item.message })),
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
