import type {
  GradientPaint,
  GradientStrokePaint,
  PathPoint,
  LottieShapeItem,
  LottieShapeTransform,
  SolidPaint,
  StrokePaint,
} from "./model";
import { readPathMorphKeyframes, readScalarProperty, readVec2Property } from "./property";

const DEFAULT_V = { x: 0, y: 0 };

/**
 * Bodymovin often places geometry and `fl`/`st` as siblings under `shapes`
 * or under a group `it` list. Paint applies to preceding unpainted geometry
 * in that list (same rule as nested groups).
 * `gf` is fill-only; `gs` is stroke-only — they must not be swapped.
 */
export function parseShapeItems(raw: unknown): LottieShapeItem[] {
  if (!Array.isArray(raw)) return [];
  const items: LottieShapeItem[] = [];
  let fill: SolidPaint | undefined;
  let stroke: StrokePaint | undefined;
  let gradientFill: GradientPaint | undefined;
  let gradientStroke: GradientStrokePaint | undefined;
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.ty !== "string") continue;
    if (entry.ty === "fl") {
      fill = parseFill(entry) ?? fill;
      continue;
    }
    if (entry.ty === "st") {
      stroke = parseStroke(entry) ?? stroke;
      continue;
    }
    if (entry.ty === "gf") {
      gradientFill = parseGradient(entry) ?? gradientFill;
      continue;
    }
    if (entry.ty === "gs") {
      gradientStroke = parseGradientStroke(entry) ?? gradientStroke;
      continue;
    }
    if (entry.ty === "tm") {
      const trim = parseTrim(entry);
      if (trim) applyTrim(items, trim);
      continue;
    }
    if (entry.ty === "tr") continue;
    const parsed = parseShapeItem(entry);
    if (parsed) items.push(parsed);
  }
  return applyPaintLayers(paintItems(items, fill, stroke), gradientFill, gradientStroke);
}

function parseShapeItem(entry: Record<string, unknown>): LottieShapeItem | undefined {
  switch (entry.ty) {
    case "gr":
      return parseGroup(entry);
    case "el":
      return parseEllipse(entry);
    case "rc":
      return parseRectangle(entry);
    case "sh":
      return parsePath(entry);
    case "fl":
    case "st":
      return undefined;
    default:
      return { kind: "unsupported", feature: String(entry.ty), message: `Shape item ${String(entry.ty)} is outside the supported subset.` };
  }
}

function parseGroup(entry: Record<string, unknown>): LottieShapeItem {
  const nested = Array.isArray(entry.it) ? entry.it : [];
  let transform: LottieShapeTransform = {
    anchor: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
  };
  const items: LottieShapeItem[] = [];
  let fill: SolidPaint | undefined;
  let stroke: StrokePaint | undefined;
  let gradientFill: GradientPaint | undefined;
  let gradientStroke: GradientStrokePaint | undefined;
  for (const child of nested) {
    if (!isRecord(child) || typeof child.ty !== "string") continue;
    if (child.ty === "tr") {
      transform = parseShapeTransform(child);
      continue;
    }
    if (child.ty === "fl") {
      fill = parseFill(child);
      continue;
    }
    if (child.ty === "st") {
      stroke = parseStroke(child);
      continue;
    }
    if (child.ty === "gf") {
      gradientFill = parseGradient(child) ?? gradientFill;
      continue;
    }
    if (child.ty === "gs") {
      gradientStroke = parseGradientStroke(child) ?? gradientStroke;
      continue;
    }
    if (child.ty === "tm") {
      const trim = parseTrim(child);
      if (trim) applyTrim(items, trim);
      continue;
    }
    const shape = parseShapeItem(child);
    if (shape) items.push(shape);
  }
  const painted = applyPaintLayers(paintItems(items, fill, stroke), gradientFill, gradientStroke);
  return { kind: "group", name: stringOrUndefined(entry.nm), items: painted, transform };
}

function paintItems(items: LottieShapeItem[], fill?: SolidPaint, stroke?: StrokePaint): LottieShapeItem[] {
  if (!fill && !stroke) return items;
  return items.map((item) => {
    if (item.kind === "ellipse" || item.kind === "rectangle" || item.kind === "path") {
      return {
        ...item,
        fill: item.fill ?? fill,
        stroke: item.stroke ?? stroke,
      };
    }
    if (item.kind === "group") {
      return { ...item, items: paintItems(item.items, fill, stroke) };
    }
    return item;
  });
}

function parseShapeTransform(entry: Record<string, unknown>): LottieShapeTransform {
  const anchor = readVec2Property(entry.a, DEFAULT_V).kind === "static" ? readVec2Property(entry.a, DEFAULT_V) : { kind: "static", value: DEFAULT_V };
  const position = readVec2Property(entry.p, DEFAULT_V);
  const scalePercent = readVec2Property(entry.s, { x: 100, y: 100 });
  const rotation = readScalarProperty(entry.r, 0);
  const opacity = readScalarProperty(entry.o, 100);
  const anchorValue = anchor.kind === "static" ? anchor.value : DEFAULT_V;
  const positionValue = position.kind === "static" ? position.value : DEFAULT_V;
  const scaleValue = scalePercent.kind === "static" ? scalePercent.value : { x: 100, y: 100 };
  const rotationValue = rotation.kind === "static" ? rotation.value : 0;
  const opacityValue = opacity.kind === "static" ? opacity.value : 100;
  return {
    anchor: anchorValue,
    position: positionValue,
    scale: { x: scaleValue.x / 100, y: scaleValue.y / 100 },
    rotation: (rotationValue * Math.PI) / 180,
    opacity: opacityValue / 100,
  };
}

function parseEllipse(entry: Record<string, unknown>): LottieShapeItem {
  const center = readVec2Property(entry.p, DEFAULT_V);
  const size = readVec2Property(entry.s, { x: 100, y: 100 });
  return {
    kind: "ellipse",
    name: stringOrUndefined(entry.nm),
    center: center.kind === "static" ? center.value : DEFAULT_V,
    size: size.kind === "static" ? size.value : { x: 100, y: 100 },
  };
}

function parseRectangle(entry: Record<string, unknown>): LottieShapeItem {
  const position = readVec2Property(entry.p, DEFAULT_V);
  const size = readVec2Property(entry.s, { x: 100, y: 100 });
  const radius = readScalarProperty(entry.r, 0);
  const corner = radius.kind === "static" ? radius.value : radius.keyframes[0]?.value ?? 0;
  return {
    kind: "rectangle",
    name: stringOrUndefined(entry.nm),
    position: position.kind === "static" ? position.value : DEFAULT_V,
    size: size.kind === "static" ? size.value : { x: 100, y: 100 },
    cornerRadius: corner,
  };
}

function parsePath(entry: Record<string, unknown>): LottieShapeItem {
  const ks = entry.ks;
  if (!isRecord(ks)) {
    return { kind: "unsupported", feature: "sh.path", message: "Path shape did not contain static path data." };
  }
  if (ks.a === 1) {
    const morph = readPathMorphKeyframes(ks.k);
    if (!morph || morph.length < 2) {
      return {
        kind: "unsupported",
        feature: "sh.animated",
        message: "Animated path command topology does not match, so it was not resampled.",
      };
    }
    const first = morph[0]!;
    return {
      kind: "path",
      name: stringOrUndefined(entry.nm),
      closed: first.closed,
      commands: first.commands,
      morph,
    };
  }
  const points = pathPointsFromData(ks.k);
  if (!points) {
    return { kind: "unsupported", feature: "sh.path", message: "Path shape did not contain static path data." };
  }
  return {
    kind: "path",
    name: stringOrUndefined(entry.nm),
    closed: points.closed,
    commands: points.commands,
  };
}

export function pathPointsFromData(raw: unknown): { commands: PathPoint[]; closed: boolean } | undefined {
  const path = unwrapPathData(raw);
  if (!path || !Array.isArray(path.v)) return undefined;
  const vertices = path.v as unknown[];
  const ins = (path.i as unknown[]) ?? [];
  const outs = (path.o as unknown[]) ?? [];
  const points: PathPoint[] = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const vertex = vecFromArray(vertices[index]);
    if (!vertex) continue;
    points.push({
      vertex,
      inTangent: vecFromArray(ins[index]) ?? { x: 0, y: 0 },
      outTangent: vecFromArray(outs[index]) ?? { x: 0, y: 0 },
    });
  }
  if (points.length === 0) return undefined;
  return { commands: points, closed: path.c === true };
}

/** Lottie stores animated path samples as `s[0]` and static path as `k` object. */
function unwrapPathData(raw: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(raw) && raw.length > 0 && isRecord(raw[0])) return raw[0];
  if (isRecord(raw)) return raw;
  return undefined;
}

function parseFill(entry: Record<string, unknown>): SolidPaint | undefined {
  const colorProp = entry.c;
  const opacityProp = entry.o;
  const color = colorFromProperty(colorProp);
  if (!color) return undefined;
  const opacity = readScalarProperty(opacityProp, 100);
  const alpha = opacity.kind === "static" ? opacity.value / 100 : 1;
  return { color, opacity: alpha };
}

function parseStroke(entry: Record<string, unknown>): StrokePaint | undefined {
  const color = colorFromProperty(entry.c);
  if (!color) return undefined;
  const opacity = readScalarProperty(entry.o, 100);
  const width = readScalarProperty(entry.w, 1);
  const resolved = width.kind === "static" ? width.value : 1;
  // Scene IR requires stroke width > 0. A zero-width Lottie stroke is fill-only paint.
  if (!(resolved > 0)) return undefined;
  return {
    color,
    opacity: opacity.kind === "static" ? opacity.value / 100 : 1,
    width: resolved,
  };
}

function colorFromProperty(raw: unknown): [number, number, number] | undefined {
  if (!isRecord(raw)) return undefined;
  const k = raw.a === 1 ? undefined : raw.k;
  if (!Array.isArray(k) || k.length < 3) return undefined;
  return [channel(k[0]), channel(k[1]), channel(k[2])];
}

function channel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function vecFromArray(value: unknown): { x: number; y: number } | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  return { x: num(value[0]), y: num(value[1]) };
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseGradient(entry: Record<string, unknown>): GradientPaint | undefined {
  const start = readVec2Property(entry.s, DEFAULT_V);
  const end = readVec2Property(entry.e, { x: 100, y: 0 });
  const gradient = entry.g;
  if (!isRecord(gradient) || !isRecord(gradient.k) || gradient.k.a === 1 || !Array.isArray(gradient.k.k)) return undefined;
  const raw = gradient.k.k;
  const count = typeof gradient.p === "number" ? gradient.p : Math.floor(raw.length / 4);
  const stops: GradientPaint["stops"] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = raw[index * 4];
    if (typeof offset !== "number") continue;
    stops.push({
      offset: Math.min(1, Math.max(0, offset)),
      color: [channel(raw[index * 4 + 1]), channel(raw[index * 4 + 2]), channel(raw[index * 4 + 3])],
    });
  }
  if (stops.length < 2) return undefined;
  const from = start.kind === "static" ? start.value : DEFAULT_V;
  const to = end.kind === "static" ? end.value : { x: 100, y: 0 };
  return { type: entry.t === 2 ? "radial" : "linear", x1: from.x, y1: from.y, x2: to.x, y2: to.y, stops };
}

function parseGradientStroke(entry: Record<string, unknown>): GradientStrokePaint | undefined {
  const gradient = parseGradient(entry);
  if (!gradient) return undefined;
  const width = readScalarProperty(entry.w, 1);
  const resolved = width.kind === "static" ? width.value : 1;
  // Scene IR requires stroke width > 0.
  if (!(resolved > 0)) return undefined;
  const opacity = readScalarProperty(entry.o, 100);
  const miter = readScalarProperty(entry.ml, 4);
  return {
    ...gradient,
    width: resolved,
    opacity: (opacity.kind === "static" ? opacity.value : 100) / 100,
    cap: lineCap(entry.lc),
    join: lineJoin(entry.lj),
    miterLimit: Math.max(1, miter.kind === "static" ? miter.value : 4),
  };
}

function lineCap(value: unknown): "butt" | "round" | "square" {
  if (value === 2) return "round";
  if (value === 3) return "square";
  return "butt";
}

function lineJoin(value: unknown): "miter" | "round" | "bevel" {
  if (value === 2) return "round";
  if (value === 3) return "bevel";
  return "miter";
}

function parseTrim(entry: Record<string, unknown>): { start: number; end: number; offset: number } | undefined {
  const start = readScalarProperty(entry.s, 0);
  const end = readScalarProperty(entry.e, 100);
  const offset = readScalarProperty(entry.o, 0);
  const unit = (value: ReturnType<typeof readScalarProperty>, fallback: number) =>
    (value.kind === "static" ? value.value : value.keyframes[0]?.value ?? fallback) / 100;
  return { start: unit(start, 0), end: unit(end, 100), offset: unit(offset, 0) };
}

function applyTrim(items: LottieShapeItem[], trim: { start: number; end: number; offset: number }): void {
  for (const item of items) {
    if (item.kind === "path" && !item.trim) item.trim = trim;
    if (item.kind === "group") applyTrim(item.items, trim);
  }
}

function applyPaintLayers(
  items: LottieShapeItem[],
  gradientFill: GradientPaint | undefined,
  gradientStroke: GradientStrokePaint | undefined,
): LottieShapeItem[] {
  if (!gradientFill && !gradientStroke) return items;
  return items.map((item) => {
    if (item.kind === "ellipse" || item.kind === "rectangle" || item.kind === "path") {
      return {
        ...item,
        ...(gradientFill && !item.gradient ? { gradient: gradientFill } : {}),
        ...(gradientStroke && !item.gradientStroke ? { gradientStroke } : {}),
      };
    }
    if (item.kind === "group") {
      return { ...item, items: applyPaintLayers(item.items, gradientFill, gradientStroke) };
    }
    return item;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
