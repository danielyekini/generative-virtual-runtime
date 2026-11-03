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
  "paint.strokeDash",
  "text.basic",
  "resources.image",
  "resources.imageSampling",
  "resources.spriteFrames",
  "svg.smilTimeBased",
  "svg.cssKeyframes",
  "compositing.isolatedOpacity",
  "compositing.blend",
  "compositing.mask",
  "compositing.matte",
  "effects.blur",
  "effects.shadow",
  "geometry.pathMorph",
  "entities.durableRevisions",
  "entities.drawableBindings",
  "input.bindings",
  "audio.cues",
  "audio.generative",
  "space.planar25d",
  "physics.planar2d",
  "space.planarSeams",
  "geometry.pathProgress",
  "geometry.pathSpace",
  "text.dynamicContent",
  "text.layoutMetrics",
  "timing.cyclicScopes",
] as const;

export type CapabilityName = (typeof CAPABILITIES)[number];

const CAPABILITY_SET = new Set<string>(CAPABILITIES);

export function isKnownCapability(name: string): name is CapabilityName {
  return CAPABILITY_SET.has(name);
}
