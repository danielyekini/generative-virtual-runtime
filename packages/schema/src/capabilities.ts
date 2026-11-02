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
  "geometry.animatedTrim",
  "paint.linearGradient",
  "paint.radialGradient",
  "paint.gradientStroke",
  "paint.animatedSolid",
  "text.basic",
  "resources.image",
  "svg.smilTimeBased",
  "svg.cssKeyframes",
  "compositing.isolatedOpacity",
  "compositing.blend",
  "effects.blur",
  "effects.shadow",
  "geometry.pathMorph",
  "entities.durableRevisions",
  "entities.drawableBindings",
  "input.bindings",
  "audio.cues",
  "space.planar25d",
] as const;

export type CapabilityName = (typeof CAPABILITIES)[number];

const CAPABILITY_SET = new Set<string>(CAPABILITIES);

export function isKnownCapability(name: string): name is CapabilityName {
  return CAPABILITY_SET.has(name);
}
