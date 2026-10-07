import type { ImportContext, ImportDiagnostic, ParseResult } from "@gvr/format-import-core";
import { spanAt } from "@gvr/format-import-core";
import { inventoryLottie } from "./inventory";
import type { LottieCompAsset, LottieDocument, LottieImageAsset, LottieLayer, LottieTransform } from "./model";
import { parseShapeItems } from "./parse-shapes";
import { readScalarProperty, readVec2Property } from "./property";

const DEFAULT_V = { x: 0, y: 0 };

export function parseLottieDocument(source: string, context: ImportContext): ParseResult<LottieDocument> {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [malformed(source, error instanceof Error ? error.message : "Invalid JSON.", 0)],
    };
  }
  if (!isRecord(value)) {
    return { ok: false, diagnostics: [malformed(source, "A Lottie file must be a JSON object.", 0)] };
  }
  const frameRate = readNumber(value.fr);
  const inFrame = readNumber(value.ip);
  const outFrame = readNumber(value.op);
  const width = readNumber(value.w);
  const height = readNumber(value.h);
  if (!(frameRate > 0)) {
    return { ok: false, diagnostics: [malformed(source, "fr must be a positive number.", indexOfKey(source, "fr"))] };
  }
  if (!(outFrame > inFrame)) {
    return { ok: false, diagnostics: [malformed(source, "op must be greater than ip.", indexOfKey(source, "op"))] };
  }
  if (!(width > 0) || !(height > 0)) {
    return { ok: false, diagnostics: [malformed(source, "w and h must be positive.", indexOfKey(source, "w"))] };
  }
  if (!Array.isArray(value.layers)) {
    return { ok: false, diagnostics: [malformed(source, "layers must be an array.", indexOfKey(source, "layers"))] };
  }
  const layers: LottieLayer[] = [];
  value.layers.forEach((raw, arrayOrder) => {
    if (!isRecord(raw)) return;
    const layer = parseLayer(raw, arrayOrder, inFrame, outFrame, `layer_${typeof raw.ind === "number" ? raw.ind : arrayOrder + 1}`);
    if (layer) layers.push(layer);
  });
  const { assets, images } = parseAssets(value.assets, inFrame, outFrame);
  return {
    ok: true,
    value: {
      frameRate,
      inFrame,
      outFrame,
      width,
      height,
      name: typeof value.nm === "string" ? value.nm : undefined,
      layers,
      assets,
      images,
      findings: inventoryLottie(value),
    },
  };
}

function parseAssets(raw: unknown, compIn: number, compOut: number): { assets: LottieCompAsset[]; images: LottieImageAsset[] } {
  const assets: LottieCompAsset[] = [];
  const images: LottieImageAsset[] = [];
  if (!Array.isArray(raw)) return { assets, images };
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0) continue;
    if (Array.isArray(entry.layers)) {
      const layers: LottieLayer[] = [];
      entry.layers.forEach((layer, arrayOrder) => {
        if (!isRecord(layer)) return;
        const index = typeof layer.ind === "number" ? layer.ind : arrayOrder + 1;
        const parsed = parseLayer(layer, arrayOrder, compIn, compOut, `asset_${entry.id}.layer_${index}`);
        if (parsed) layers.push(parsed);
      });
      assets.push({ id: entry.id, layers });
      continue;
    }
    if (typeof entry.p === "string") {
      const embedded = entry.e === 1;
      const href = embedded ? (entry.p.startsWith("data:") ? entry.p : `data:image/png;base64,${entry.p}`) : `${typeof entry.u === "string" ? entry.u : ""}${entry.p}`;
      images.push({
        id: entry.id,
        href,
        width: readNumber(entry.w),
        height: readNumber(entry.h),
      });
    }
  }
  return { assets, images };
}

function parseLayer(
  raw: Record<string, unknown>,
  arrayOrder: number,
  compIn: number,
  compOut: number,
  inventoryTarget: string,
): LottieLayer | undefined {
  const index = typeof raw.ind === "number" ? raw.ind : arrayOrder + 1;
  const ty = typeof raw.ty === "number" ? raw.ty : -1;
  let kind: LottieLayer["kind"] = "unsupported";
  let unsupportedReason: string | undefined;
  if (ty === 4) kind = "shape";
  else if (ty === 3) kind = "null";
  else if (ty === 1) kind = "solid";
  else if (ty === 0 && typeof raw.refId === "string") kind = "precomp";
  else if (ty === 2 && typeof raw.refId === "string") kind = "image";
  else if (ty === 5) kind = "text";
  else unsupportedReason = `Layer type ${ty} is outside the supported subset.`;

  const ks = isRecord(raw.ks) ? raw.ks : {};
  const hasSkew = hasNonZeroSkew(ks.sk) || hasNonZeroSkew(ks.sa);
  const hasAutoOrient = ks.ao === 1;
  const hasMask = Array.isArray(raw.masksProperties) && raw.masksProperties.length > 0;

  const inFrame = typeof raw.ip === "number" ? raw.ip : compIn;
  const outFrame = typeof raw.op === "number" ? raw.op : compOut;

  return {
    index,
    arrayOrder,
    parentIndex: typeof raw.parent === "number" ? raw.parent : undefined,
    name: typeof raw.nm === "string" ? raw.nm : undefined,
    kind,
    inFrame,
    outFrame,
    hidden: raw.hd === true,
    hasMask,
    hasSkew,
    hasAutoOrient,
    transform: parseTransform(ks),
    shapes: kind === "shape" ? parseShapeItems(raw.shapes) : [],
    solidWidth: kind === "solid" ? readNumber(raw.sw) : undefined,
    solidHeight: kind === "solid" ? readNumber(raw.sh) : undefined,
    solidColor: kind === "solid" ? readRgb(raw.sc) : undefined,
    refId: typeof raw.refId === "string" ? raw.refId : undefined,
    startFrame: typeof raw.st === "number" ? raw.st : inFrame,
    trackMatte: typeof raw.tt === "number" && raw.tt !== 0,
    blend: blendMode(raw.bm),
    blurRadius: staticGaussianBlurRadius(raw.ef),
    text: kind === "text" ? readText(raw.t) : undefined,
    inventoryTarget,
    unsupportedReason,
  };
}

/** lottie-web 5.13.0 SVGGaussianBlurEffect: sigma = blurriness * 0.3. */
const BLURRINESS_TO_SIGMA = 0.3;

/**
 * Accepts one static Gaussian Blur (ty 29) with static Blurriness and both-axis
 * dimensions. Animated radii, other dimensions, or mixed effect stacks return undefined.
 */
function staticGaussianBlurRadius(effects: unknown): number | undefined {
  if (!Array.isArray(effects) || effects.length !== 1) return undefined;
  const effect = effects[0];
  if (!isRecord(effect) || effect.ty !== 29) return undefined;
  const parts = effect.ef;
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  let blurriness: number | undefined;
  for (const part of parts) {
    if (!isRecord(part)) return undefined;
    const name = typeof part.nm === "string" ? part.nm : "";
    const value = part.v;
    if (!isRecord(value)) return undefined;
    if (name === "Blurriness") {
      if (value.a === 1) return undefined;
      if (typeof value.k !== "number" || !(value.k >= 0)) return undefined;
      blurriness = value.k;
      continue;
    }
    if (name === "Blur Dimensions") {
      // AE/Lottie: 1 = horizontal and vertical. Other values are out of scope.
      if (value.a === 1) return undefined;
      if (value.k !== 1) return undefined;
      continue;
    }
    // Some exporters leave Repeat Edge Pixels as a blank name with ty 7.
    if (name === "Repeat Edge Pixels" || (name.trim() === "" && part.ty === 7)) continue;
    return undefined;
  }
  if (blurriness === undefined) return undefined;
  return blurriness * BLURRINESS_TO_SIGMA;
}

function blendMode(value: unknown): LottieLayer["blend"] {
  if (value === 1) return "multiply";
  if (value === 2) return "screen";
  if (value === 3) return "overlay";
  return undefined;
}

function readText(value: unknown): LottieLayer["text"] {
  if (!isRecord(value) || !isRecord(value.d) || !Array.isArray(value.d.k)) return undefined;
  const first = value.d.k[0];
  if (!isRecord(first) || !isRecord(first.s) || typeof first.s.t !== "string" || first.s.t.length === 0) return undefined;
  const color = readRgb(first.s.fc) ?? [1, 1, 1];
  return {
    content: first.s.t,
    size: typeof first.s.s === "number" && first.s.s > 0 ? first.s.s : 16,
    family: typeof first.s.f === "string" && first.s.f.length > 0 ? first.s.f : "sans",
    color,
  };
}

function parseTransform(ks: Record<string, unknown>): LottieTransform {
  return {
    anchor: readVec2Property(ks.a, DEFAULT_V),
    position: readVec2Property(ks.p, DEFAULT_V),
    scale: readVec2Property(ks.s, { x: 100, y: 100 }),
    rotation: readScalarProperty(ks.r, 0),
    opacity: readScalarProperty(ks.o, 100),
  };
}

function hasNonZeroSkew(raw: unknown): boolean {
  const scalar = readScalarProperty(raw, 0);
  if (scalar.kind === "static") return Math.abs(scalar.value) > 1e-6;
  return scalar.keyframes.some((frame) => Math.abs(frame.value) > 1e-6);
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function readRgb(value: unknown): [number, number, number] | undefined {
  if (typeof value === "string") {
    const hex = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(value.trim());
    if (!hex?.[1]) return undefined;
    const packed = Number.parseInt(hex[1], 16);
    return [((packed >> 16) & 255) / 255, ((packed >> 8) & 255) / 255, (packed & 255) / 255];
  }
  if (!Array.isArray(value) || value.length < 3) return undefined;
  return [channel(value[0]), channel(value[1]), channel(value[2])];
}

function channel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function malformed(source: string, message: string, offset: number): ImportDiagnostic {
  return {
    code: "IMPORT_MALFORMED",
    severity: "fatal",
    fidelity: "unsupported",
    feature: "source",
    message,
    sourceSpan: spanAt(source, offset),
  };
}

function indexOfKey(source: string, key: string): number {
  const found = source.indexOf(`"${key}"`);
  return found >= 0 ? found : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
