export const CAPABILITIES = [
  "timing.localScopes",
  "easing.cubicBezier",
  "easing.hold",
  "composition.definitions",
  "geometry.operators",
  "render.tree",
  "transform.parent",
  "geometry.roundedRect",
  "geometry.spatialCurve",
  "geometry.trimPath",
  "paint.linearGradient",
  "paint.radialGradient",
  "text.basic",
  "resources.image",
  "svg.smilTimeBased",
  "svg.cssKeyframes",
  "compositing.isolatedOpacity",
  "compositing.blend",
  "effects.blur",
  "effects.shadow",
] as const;

export type CapabilityName = (typeof CAPABILITIES)[number];

const CAPABILITY_SET = new Set<string>(CAPABILITIES);

export function isKnownCapability(name: string): name is CapabilityName {
  return CAPABILITY_SET.has(name);
}
