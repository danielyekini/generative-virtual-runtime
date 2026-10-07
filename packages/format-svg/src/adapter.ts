import type { AnimationFormatAdapter } from "@gvr/format-import-core";
import { SVG_ADAPTER_VERSION, type SvgDocument } from "./model";
import { normaliseSvg } from "./normalise";
import { parseSvgDocument } from "./parse";

const CAPABILITIES = [
  { feature: "viewport", level: "exact" as const, notes: "viewBox, numeric width/height, meet and none" },
  { feature: "shapes", level: "exact" as const, notes: "rect, circle, ellipse, line, polygon, polyline, path" },
  { feature: "group", level: "exact" as const },
  { feature: "transform", level: "exact" as const, notes: "translate, rotate, scale, decomposable matrix" },
  { feature: "text", level: "approximated" as const },
  { feature: "group-opacity", level: "exact" as const, notes: "Isolated render scope" },
  { feature: "smil", level: "exact" as const, notes: "Time-based opacity, rotate, and translate. Indefinite repeat is one cycle." },
  { feature: "css-keyframes", level: "exact" as const, notes: "Embedded opacity keyframes." },
  { feature: "arc", level: "approximated" as const },
  { feature: "skew", level: "unsupported" as const },
  { feature: "script", level: "unsupported" as const },
];

export const svgAdapter: AnimationFormatAdapter<SvgDocument> = {
  formatId: "svg",
  extensions: [".svg"],
  capabilities: CAPABILITIES,
  validateLimits: { maxNodes: 2000, maxDepth: 64 },
  detect(source) {
    return { formatId: "svg", confident: /<svg[\s>]/.test(source) };
  },
  parse(source, context) {
    return parseSvgDocument(source, context);
  },
  normalise(document, context) {
    return normaliseSvg(document, context);
  },
};

export { SVG_ADAPTER_VERSION };
