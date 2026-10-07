import type { AnimationFormatAdapter } from "@gvr/format-import-core";
import type { LottieDocument } from "./model";
import { LOTTIE_ADAPTER_VERSION } from "./model";
import { normaliseLottie } from "./normalise";
import { parseLottieDocument } from "./parse";

const CAPABILITIES = [
  { feature: "composition", level: "exact" as const, notes: "fr, ip, op, w, h" },
  { feature: "shape-layer", level: "exact" as const },
  { feature: "null-layer", level: "exact" as const },
  { feature: "solid-layer", level: "exact" as const },
  { feature: "transform", level: "exact" as const, notes: "anchor, position, scale, rotation, opacity" },
  { feature: "parenting", level: "exact" as const },
  { feature: "keyframes", level: "exact" as const, notes: "Scalar and vec2 where representable" },
  { feature: "hold-keyframe", level: "exact" as const },
  { feature: "bezier-ease", level: "exact" as const, notes: "Monotonic cubics. Controls outside [0, 1] stay named approximations." },
  { feature: "spatial-tangent", level: "exact" as const },
  { feature: "precomp", level: "exact" as const, notes: "Expanded into the scene graph with a basic time offset." },
  { feature: "solid-color", level: "exact" as const, notes: "RGB arrays and #RRGGBB" },
  { feature: "rounded-rect", level: "exact" as const },
  { feature: "mask", level: "unsupported" as const },
  { feature: "matte", level: "unsupported" as const, notes: "Detected mattes are withheld instead of drawn unmasked." },
  { feature: "skew", level: "unsupported" as const },
  {
    feature: "effects",
    level: "exact" as const,
    notes: "Static Gaussian Blur (ty 29) with both-axis dimensions. Animated or mixed stacks stay unsupported.",
  },
];

export const lottieAdapter: AnimationFormatAdapter<LottieDocument> = {
  formatId: "lottie",
  extensions: [".json", ".lottie.json"],
  capabilities: CAPABILITIES,
  validateLimits: { maxNodes: 2000, maxDepth: 64 },
  detect(source) {
    const confident =
      source.includes('"layers"') && (source.includes('"fr"') || source.includes('"v"'));
    return { formatId: "lottie", confident };
  },
  parse(source, context) {
    return parseLottieDocument(source, context);
  },
  normalise(document, context) {
    return normaliseLottie(document, context);
  },
};

export { LOTTIE_ADAPTER_VERSION };
