import {
  lerpPathCommands,
  type CompositionDefinition,
  type CompositionInstance,
  type GeometryOperatorList,
  type Keyframe,
  type KeyframeTrack,
  type NodeAnimChannel,
  type NodeDefinition,
  type Paint,
  type PathCommand,
  type ResourceDefinition,
  type SceneIR,
  type SegmentEasing,
  type SolidColor,
  type StepDefinition,
  type TimingScope,
  type Vec2,
} from "@gvr/schema";
import {
  allocateId,
  diagnosticsFromFidelity,
  fidelityReport,
  framesToMs,
  type FidelityItem,
  type ImportContext,
  type ImportResult,
} from "@gvr/format-import-core";
import type {
  AnimatedScalar,
  AnimatedVec2,
  LottieDocument,
  LottieEasing,
  LottieLayer,
  LottieShapeItem,
  LottieShapeTransform,
  SolidPaint,
  StrokePaint,
} from "./model";
import { LOTTIE_ADAPTER_VERSION } from "./model";

interface LowerContext {
  document: LottieDocument;
  sceneDurationMs: number;
  notes: FidelityItem[];
  usedIds: Set<string>;
  nodes: NodeDefinition[];
  tracks: KeyframeTrack[];
  steps: StepDefinition[];
  trackSerial: number;
  stepSerial: number;
  layerIdByIndex: Map<string, string>;
  timeOffsetMs: number;
  scopeKey: string;
  capabilities: string[];
  handled: Set<string>;
  compositions: CompositionDefinition[];
  compositionIds: Map<string, string>;
  instances: CompositionInstance[];
  timingScopes: TimingScope[];
  operators: GeometryOperatorList[];
  resources: ResourceDefinition[];
}

export function normaliseLottie(document: LottieDocument, context: ImportContext): ImportResult {
  const notes: FidelityItem[] = [];
  for (const finding of document.findings ?? []) {
    notes.push({
      feature: finding.feature,
      level: "unsupported",
      message: finding.message,
      target: finding.target,
    });
  }
  const durationMs = framesToMs(document.outFrame - document.inFrame, document.frameRate);
  if (!(durationMs > 0)) {
    notes.push({ feature: "timing", level: "unsupported", message: "Composition timing could not be converted." });
    return finish(document, context, notes, undefined);
  }

  const lower: LowerContext = {
    document,
    sceneDurationMs: durationMs,
    notes,
    usedIds: new Set<string>(),
    nodes: [],
    tracks: [],
    steps: [],
    trackSerial: 0,
    stepSerial: 0,
    layerIdByIndex: new Map<string, string>(),
    timeOffsetMs: 0,
    scopeKey: "root",
    capabilities: [],
    handled: new Set<string>(),
    compositions: [],
    compositionIds: new Map<string, string>(),
    instances: [],
    timingScopes: [],
    operators: [],
    resources: [],
  };

  const supportedLayers = document.layers.filter((layer) => layer.kind !== "unsupported");
  for (const layer of document.layers) {
    if (layer.kind === "unsupported") {
      notes.push({
        feature: "layer",
        level: "unsupported",
        message: layer.unsupportedReason ?? "Unsupported layer type.",
        target: `layer_${layer.index}`,
      });
    }
    if (layer.hasMask) {
      notes.push({
        feature: "mask",
        level: "unsupported",
        message: "Layer masks are not imported in v0.1.",
        target: `layer_${layer.index}`,
      });
    }
    if (layer.hasSkew) {
      notes.push({
        feature: "skew",
        level: "unsupported",
        message: "Skew is not representable in Scene IR v0.1.",
        target: `layer_${layer.index}`,
      });
    }
    if (layer.hasAutoOrient) {
      notes.push({
        feature: "auto-orient",
        level: "unsupported",
        message: "Auto-orient is not imported in v0.1.",
        target: `layer_${layer.index}`,
      });
    }
  }

  if (supportedLayers.length === 0) {
    notes.push({ feature: "scene", level: "unsupported", message: "No supported layers were found." });
    return finish(document, context, notes, undefined);
  }

  const maxOrder = Math.max(...document.layers.map((layer) => layer.arrayOrder));
  // Lottie paints by global layer list order (earlier = on top). Scene IR draws
  // by hierarchical zIndex, so a parent null listed below the sky would bury
  // its children. Lift each layer's zIndex to the max stack score among itself
  // and its descendants so parenting does not invert global paint order.
  placeLayers(lower, supportedLayers, maxOrder, null);

  const capabilities = [...new Set(lower.capabilities)];
  const profiled = capabilities.length > 0;
  const scene: SceneIR = {
    irVersion: profiled ? "0.2" : "0.1",
    sceneId: allocateId(null, document.name ?? "lottie", new Set()).id,
    viewport: { width: document.width, height: document.height, fit: "contain" },
    background: { type: "solid", r: 16 / 255, g: 16 / 255, b: 20 / 255, a: 1 },
    resources: lower.resources,
    nodes: lower.nodes,
    ...(profiled ? { requiredCapabilities: capabilities } : {}),
    ...(lower.compositions.length > 0 ? { compositions: lower.compositions } : {}),
    ...(lower.instances.length > 0 ? { instances: lower.instances } : {}),
    ...(lower.timingScopes.length > 0 ? { timingScopes: lower.timingScopes } : {}),
    ...(lower.operators.length > 0 ? { geometryOperators: lower.operators } : {}),
    cameras: [{ id: "main", position: { x: document.width / 2, y: document.height / 2 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks: lower.tracks, steps: lower.steps },
  };

  notes.push({
    feature: "frame-timing",
    level: "exact",
    message: `Converted composition frames ${document.inFrame}–${document.outFrame} at ${document.frameRate}fps to ${durationMs}ms.`,
  });

  const kept = notes.filter((note) => note.level !== "unsupported" || !lower.handled.has(`${note.feature}:${note.target ?? ""}`));
  return finish(document, context, kept, scene);
}

function placeLayers(lower: LowerContext, layers: LottieLayer[], maxOrder: number, hostParent: string | null): void {
  const layerZIndex = stackZIndexes(layers, maxOrder);
  for (const layer of orderParentsBeforeChildren(layers)) {
    const zIndex = layerZIndex.get(layer.index) ?? (maxOrder - layer.arrayOrder) * 10;
    const linked = layer.parentIndex !== undefined ? lower.layerIdByIndex.get(`${lower.scopeKey}:${layer.parentIndex}`) : undefined;
    const parentId = linked ?? hostParent;
    const lottieParent = linked !== undefined;
    if (layer.parentIndex !== undefined && linked === undefined) {
      lower.notes.push({
        feature: "parent",
        level: "unsupported",
        message: `Layer ${layer.index} parents to missing index ${layer.parentIndex}.`,
        target: layer.inventoryTarget,
      });
    }
    const layerId = allocateId(parentId, `layer_${layer.index}`, lower.usedIds);
    lower.layerIdByIndex.set(`${lower.scopeKey}:${layer.index}`, layerId.id);
    const anchor = vec2Static(layer.transform.anchor, { x: 0, y: 0 });
    const position = vec2Static(layer.transform.position, { x: 0, y: 0 });
    const scalePercent = vec2Static(layer.transform.scale, { x: 100, y: 100 });
    const rotationDeg = scalarStatic(layer.transform.rotation, 0);
    const opacityPercent = scalarStatic(layer.transform.opacity, 100);
    const baseVisible = !layer.hidden && layer.inFrame <= lower.document.inFrame && layer.outFrame > lower.document.inFrame;
    const group: NodeDefinition = {
      id: layerId.id,
      name: layerId.name,
      parentId,
      zIndex,
      transform: {
        position: sub(position, anchor),
        pivot: { ...anchor },
        rotation: (rotationDeg * Math.PI) / 180,
        scale: { x: scalePercent.x / 100, y: scalePercent.y / 100 },
      },
      opacity: opacityPercent / 100,
      visible: baseVisible,
      ...(parentId ? {} : { space: "world" as const }),
      kind: "group",
      ...(lottieParent && parentId ? { transformParentId: parentId, inheritOpacity: false as const } : {}),
      ...(layer.blend || layer.blurRadius !== undefined
        ? {
            compositing: {
              isolated: true,
              ...(layer.blend ? { blend: layer.blend } : {}),
              ...(layer.blurRadius !== undefined ? { effect: { type: "blur" as const, radius: layer.blurRadius } } : {}),
            },
          }
        : {}),
    };
    if (lottieParent) lower.capabilities.push("transform.parent");
    if (layer.blend) lower.capabilities.push("compositing.blend", "compositing.isolatedOpacity");
    if (layer.blurRadius !== undefined) {
      lower.capabilities.push("effects.blur", "compositing.isolatedOpacity");
      lower.handled.add(`effect:${layer.inventoryTarget}`);
      lower.notes.push({
        feature: "effect",
        level: "exact",
        message: `Imported static Gaussian Blur on ${layerId.id}.`,
        target: layer.inventoryTarget,
      });
    }
    if (layer.solidColor) lower.handled.add(`solid-color:${layer.inventoryTarget}`);
    lower.nodes.push(group);
    addLayerVisibilitySteps(lower, layerId.id, layer);
    addTransformTracks(lower, layerId.id, layer.transform, layer.inventoryTarget);
    if (layer.trackMatte) {
      lower.notes.push({
        feature: "matte",
        level: "unsupported",
        message: "Track matte content is withheld so it is not drawn unmasked.",
        target: layer.inventoryTarget,
      });
    } else if (layer.kind === "solid" && layer.solidWidth && layer.solidHeight && layer.solidColor) {
      lowerSolid(lower, layerId.id, layer, zIndex);
    } else if (layer.kind === "shape") {
      lowerShapes(lower, layerId.id, layer.shapes, zIndex);
    } else if (layer.kind === "precomp") {
      lowerPrecomp(lower, layer, layerId.id);
    } else if (layer.kind === "text") {
      lowerText(lower, layer, layerId.id, zIndex);
    } else if (layer.kind === "image") {
      lowerImage(lower, layer, layerId.id, zIndex);
    }
  }
}

function compositionIdFor(ctx: LowerContext, assetId: string, layerIndex: number): string {
  const existing = ctx.compositionIds.get(assetId);
  if (existing) return existing;
  const cleaned = assetId.replace(/[^A-Za-z0-9_]/g, "");
  const base = /^[A-Za-z_][A-Za-z0-9_]*$/.test(cleaned) ? cleaned : `comp${layerIndex}`;
  const id = claimIdent(ctx, base);
  ctx.compositionIds.set(assetId, id);
  ctx.compositions.push({ id, nodes: [] });
  return id;
}

function claimIdent(ctx: LowerContext, base: string): string {
  const taken = new Set<string>([
    ...ctx.usedIds,
    ...ctx.compositions.map((item) => item.id),
    ...ctx.instances.map((item) => item.id),
    ...ctx.timingScopes.map((item) => item.id),
  ]);
  const root = /^[A-Za-z_][A-Za-z0-9_]*$/.test(base) ? base : "comp";
  let id = root;
  let suffix = 2;
  while (taken.has(id)) {
    id = `${root}${suffix}`;
    suffix += 1;
  }
  return id;
}

function lowerPrecomp(ctx: LowerContext, layer: LottieLayer, parentId: string): void {
  const asset = ctx.document.assets.find((entry) => entry.id === layer.refId);
  if (!asset) {
    ctx.notes.push({ feature: "precomp", level: "unsupported", message: `Missing precomp ${layer.refId ?? ""}.`, target: layer.inventoryTarget });
    return;
  }
  const offset = framesToMs((layer.startFrame ?? ctx.document.inFrame) - ctx.document.inFrame, ctx.document.frameRate);
  const savedOffset = ctx.timeOffsetMs;
  const savedScope = ctx.scopeKey;
  ctx.timeOffsetMs = savedOffset + (Number.isFinite(offset) ? offset : 0);
  ctx.scopeKey = `asset:${asset.id}`;
  const layers = asset.layers.filter((entry) => entry.kind !== "unsupported");
  const maxOrder = layers.reduce((max, entry) => Math.max(max, entry.arrayOrder), 0);
  placeLayers(ctx, layers, maxOrder, parentId);
  ctx.timeOffsetMs = savedOffset;
  ctx.scopeKey = savedScope;
  ctx.handled.add(`precomp:asset_${asset.id}`);
  ctx.handled.add(`layer:${layer.inventoryTarget}`);
  const duration = framesToMs(ctx.document.outFrame - ctx.document.inFrame, ctx.document.frameRate);
  const start = Math.max(0, Number.isFinite(offset) ? offset : 0);
  const definitionId = compositionIdFor(ctx, asset.id, layer.index);
  const scopeId = claimIdent(ctx, `pre${layer.index}`);
  ctx.timingScopes.push({ id: scopeId, parentId: null, offsetMs: start, stretch: 1 });
  ctx.instances.push({
    id: claimIdent(ctx, `inst${layer.index}`),
    definitionId,
    parentId: null,
    transformParentId: null,
    transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    activation: { startMs: start, endMs: Math.max(start + 1, duration) },
    timingScopeId: scopeId,
  });
  ctx.capabilities.push("composition.definitions", "timing.localScopes");
  ctx.notes.push({ feature: "precomp", level: "exact", message: `Expanded precomp ${asset.id}.`, target: layer.inventoryTarget });
}

function lowerText(ctx: LowerContext, layer: LottieLayer, parentId: string, zIndex: number): void {
  if (!layer.text) {
    ctx.notes.push({ feature: "text", level: "unsupported", message: "Text layer has no document text.", target: layer.inventoryTarget });
    return;
  }
  const fontId = `font${ctx.resources.length + 1}`;
  ctx.resources.push({ id: fontId, kind: "font", family: layer.text.family, source: "builtin", readiness: "ready" });
  const node = allocateId(parentId, "text", ctx.usedIds);
  ctx.nodes.push({
    id: node.id,
    name: node.name,
    parentId,
    zIndex: zIndex + 1,
    transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    kind: "text",
    content: layer.text.content,
    font: { family: layer.text.family, size: layer.text.size, weight: 400, style: "normal" },
    align: "left",
    baseline: "alphabetic",
    fill: rgba(layer.text.color, 1),
  });
  ctx.capabilities.push("text.basic");
  ctx.handled.add(`layer:${layer.inventoryTarget}`);
  ctx.notes.push({ feature: "text", level: "exact", message: `Imported text ${node.id}.`, target: node.id });
}

function lowerImage(ctx: LowerContext, layer: LottieLayer, parentId: string, zIndex: number): void {
  const image = ctx.document.images.find((entry) => entry.id === layer.refId);
  if (!image || !(image.width > 0) || !(image.height > 0)) {
    ctx.notes.push({ feature: "image", level: "unsupported", message: "Image layer has no usable asset.", target: layer.inventoryTarget });
    return;
  }
  const resourceId = `image${ctx.resources.length + 1}`;
  ctx.resources.push({ id: resourceId, kind: "image", href: image.href, readiness: "ready" });
  const node = allocateId(parentId, "image", ctx.usedIds);
  ctx.nodes.push({
    id: node.id,
    name: node.name,
    parentId,
    zIndex: zIndex + 1,
    transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    kind: "image",
    resourceId,
    size: { x: image.width, y: image.height },
  });
  ctx.capabilities.push("resources.image");
  ctx.handled.add(`image:asset_${image.id}`);
  ctx.handled.add(`layer:${layer.inventoryTarget}`);
  ctx.notes.push({ feature: "image", level: "exact", message: `Imported image ${node.id}.`, target: node.id });
}

function lowerSolid(ctx: LowerContext, parentId: string, layer: LottieLayer, zIndex: number): void {
  const width = layer.solidWidth ?? 0;
  const height = layer.solidHeight ?? 0;
  const color = layer.solidColor ?? [0, 0, 0];
  const rect = allocateId(parentId, "solid", ctx.usedIds);
  ctx.nodes.push({
    id: rect.id,
    name: rect.name,
    parentId,
    zIndex: zIndex + 1,
    transform: { position: { x: -width / 2, y: -height / 2 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
    opacity: 1,
    visible: true,
    kind: "rectangle",
    size: { x: width, y: height },
    fill: rgba(color, 1),
  });
  ctx.notes.push({ feature: "solid", level: "exact", message: `Imported solid layer ${parentId}.`, target: parentId });
}

function lowerShapes(ctx: LowerContext, parentId: string, shapes: LottieShapeItem[], zIndex: number): void {
  let order = 0;
  for (const item of shapes) {
    lowerShapeItem(ctx, parentId, item, zIndex + order + 1, order);
    order += 1;
  }
}

function lowerShapeItem(ctx: LowerContext, parentId: string, item: LottieShapeItem, zIndex: number, order: number): void {
  if (item.kind === "unsupported") {
    ctx.notes.push({ feature: item.feature, level: "unsupported", message: item.message, target: parentId });
    return;
  }
  if (item.kind === "group") {
    const groupId = allocateId(parentId, item.name ?? `group${order}`, ctx.usedIds);
    const tr = item.transform;
    ctx.nodes.push({
      id: groupId.id,
      name: groupId.name,
      parentId,
      zIndex,
      transform: shapeTransform(tr),
      opacity: tr.opacity,
      visible: true,
      kind: "group",
    });
    let childOrder = 0;
    for (const child of item.items) {
      lowerShapeItem(ctx, groupId.id, child, zIndex + childOrder + 1, childOrder);
      childOrder += 1;
    }
    return;
  }
  const nodeId = allocateId(parentId, item.name ?? item.kind, ctx.usedIds);
  if (item.kind === "ellipse") {
    const fill = shapeFill(ctx, item);
    const stroke = shapeStroke(ctx, item, nodeId.id);
    ctx.nodes.push({
      id: nodeId.id,
      name: nodeId.name,
      parentId,
      zIndex,
      transform: { position: { ...item.center }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      opacity: 1,
      visible: true,
      kind: "ellipse",
      size: { x: item.size.x, y: item.size.y },
      ...(fill ? { fill } : {}),
      ...(stroke ? { stroke } : {}),
    });
    ctx.notes.push({ feature: "ellipse", level: "exact", message: `Imported ellipse ${nodeId.id}.`, target: nodeId.id });
    return;
  }
  if (item.kind === "rectangle") {
    // Lottie `rc.p` is the rectangle centre; Scene IR (0,0) is top-left.
    const topLeft = {
      x: item.position.x - item.size.x / 2,
      y: item.position.y - item.size.y / 2,
    };
    const fill = shapeFill(ctx, item);
    const stroke = shapeStroke(ctx, item, nodeId.id);
    ctx.nodes.push({
      id: nodeId.id,
      name: nodeId.name,
      parentId,
      zIndex,
      transform: { position: topLeft, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      opacity: 1,
      visible: true,
      kind: "rectangle",
      size: { x: item.size.x, y: item.size.y },
      ...(item.cornerRadius > 0 ? { cornerRadius: item.cornerRadius } : {}),
      ...(fill ? { fill } : {}),
      ...(stroke ? { stroke } : {}),
    });
    if (item.cornerRadius > 0) ctx.capabilities.push("geometry.roundedRect");
    ctx.notes.push({ feature: "rectangle", level: "exact", message: `Imported rectangle ${nodeId.id}.`, target: nodeId.id });
    return;
  }
  if (item.kind === "path") {
    const commands = pathCommands(item);
    if (commands.length === 0) {
      ctx.notes.push({ feature: "path", level: "unsupported", message: "Path could not be lowered.", target: nodeId.id });
      return;
    }
    const fill = shapeFill(ctx, item);
    const stroke = shapeStroke(ctx, item, nodeId.id);
    ctx.nodes.push({
      id: nodeId.id,
      name: nodeId.name,
      parentId,
      zIndex,
      transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      opacity: 1,
      visible: true,
      kind: "path",
      commands,
      fillRule: "nonzero",
      ...(fill ? { fill } : {}),
      ...(stroke ? { stroke } : {}),
    });
    if (item.trim) {
      ctx.operators.push({ nodeId: nodeId.id, operators: [{ op: "trim", start: item.trim.start, end: item.trim.end, offset: item.trim.offset }] });
      ctx.capabilities.push("geometry.trimPath");
    }
    if (item.morph && item.morph.length >= 2) {
      addPathMorphTrack(ctx, nodeId.id, item);
    } else {
      ctx.notes.push({ feature: "path", level: "exact", message: `Imported path ${nodeId.id}.`, target: nodeId.id });
    }
  }
}

function addPathMorphTrack(
  ctx: LowerContext,
  nodeId: string,
  item: Extract<LottieShapeItem, { kind: "path" }>,
): void {
  const morph = item.morph;
  if (!morph || morph.length < 2) return;
  const { document } = ctx;
  const samples = morph.map((frame) => ({
    frame: frame.frame,
    value: pathCommandsFromPoints(frame.commands, frame.closed),
    hold: frame.hold,
    easing: frame.easing,
  }));
  if (samples.some((sample) => sample.value.length === 0)) {
    ctx.notes.push({
      feature: "sh.animated",
      level: "unsupported",
      message: "Animated path could not be converted to Scene IR commands.",
      target: nodeId,
    });
    return;
  }
  const times = samples.map((sample) => framesToMs(sample.frame - document.inFrame, document.frameRate) + ctx.timeOffsetMs);
  const start = times[0] ?? 0;
  const end = times[times.length - 1] ?? start;
  const duration = end - start;
  if (!(duration > 0)) {
    ctx.notes.push({ feature: "path", level: "exact", message: `Imported path ${nodeId}.`, target: nodeId });
    return;
  }
  let approximated = false;
  const keyframes: Keyframe[] = samples.map((sample, index) => {
    const offset = ((times[index] ?? start) - start) / duration;
    const easing = mapEasing(sample);
    if (sample.easing === "bezier-approx" && !sample.hold) approximated = true;
    if (typeof easing === "object") ctx.capabilities.push(easing.type === "hold" ? "easing.hold" : "easing.cubicBezier");
    if (index === samples.length - 1) return { offset, value: sample.value };
    return { offset, value: sample.value, easing };
  });
  const clamped = clampTrackToScene(start, duration, keyframes, ctx.sceneDurationMs);
  if (!clamped) {
    ctx.notes.push({ feature: "path", level: "exact", message: `Imported path ${nodeId}.`, target: nodeId });
    return;
  }
  ctx.capabilities.push("geometry.pathMorph");
  ctx.trackSerial += 1;
  ctx.tracks.push({
    id: `track${ctx.trackSerial}`,
    kind: "keyframe",
    target: { kind: "node", nodeId, channel: "commands" },
    valueType: "path",
    startMs: clamped.startMs,
    durationMs: clamped.durationMs,
    fill: { before: "none", after: "forwards" },
    keyframes: clamped.keyframes,
  });
  if (approximated) {
    ctx.notes.push({
      feature: "easing",
      level: "approximated",
      message: `Bezier easing on ${nodeId}.commands was mapped to Scene IR easing names.`,
      target: nodeId,
    });
  }
  ctx.notes.push({
    feature: "path-morph",
    level: approximated ? "approximated" : "exact",
    message: `Imported animated path morph on ${nodeId}.commands.`,
    target: nodeId,
  });
}

function shapeTransform(tr: LottieShapeTransform) {
  return {
    position: sub(tr.position, tr.anchor),
    pivot: { ...tr.anchor },
    rotation: tr.rotation,
    scale: { ...tr.scale },
  };
}

function addLayerVisibilitySteps(ctx: LowerContext, nodeId: string, layer: LottieLayer): void {
  const { document } = ctx;
  const showMs = framesToMs(layer.inFrame - document.inFrame, document.frameRate);
  const hideMs = framesToMs(layer.outFrame - document.inFrame, document.frameRate);
  const durationMs = ctx.sceneDurationMs;
  // A zero-length in/out window must not emit show and hide at the same timeMs.
  if (!(hideMs > showMs + 1e-9)) return;
  if (layer.inFrame > document.inFrame && showMs >= 0 && showMs < durationMs) {
    ctx.steps.push({ id: nextStepId(ctx), target: { kind: "node", nodeId, channel: "visible" }, timeMs: showMs, value: true });
  }
  if (hideMs > 0 && hideMs <= durationMs + 1e-9) {
    ctx.steps.push({ id: nextStepId(ctx), target: { kind: "node", nodeId, channel: "visible" }, timeMs: hideMs, value: false });
  }
}

function addTransformTracks(ctx: LowerContext, nodeId: string, transform: LottieLayer["transform"], inventoryTarget = nodeId): void {
  const anchorStatic = transform.anchor.kind === "static" ? transform.anchor.value : undefined;
  if (transform.position.kind === "animated") {
    if (transform.position.keyframes.some((frame) => frame.spatial)) {
      addSpatialPositionTrack(ctx, nodeId, transform.position, anchorStatic, inventoryTarget);
    } else {
      addVec2DerivedTracks(ctx, nodeId, "transform.position", transform.position, anchorStatic, "position");
    }
  }
  if (transform.scale.kind === "animated") {
    addScaledVec2Tracks(ctx, nodeId, "transform.scale", transform.scale, 100);
  }
  if (transform.rotation.kind === "animated") {
    addScalarTrack(ctx, nodeId, "transform.rotation", transform.rotation, (value) => (value * Math.PI) / 180, "rotation");
  }
  if (transform.opacity.kind === "animated") {
    addScalarTrack(ctx, nodeId, "opacity", transform.opacity, (value) => value / 100, "opacity");
  }
  if (transform.anchor.kind === "animated") {
    ctx.notes.push({
      feature: "animated-anchor",
      level: "unsupported",
      message: "Animated anchor is not lowered in v0.1.",
      target: nodeId,
    });
  }
}

function addSpatialPositionTrack(
  ctx: LowerContext,
  nodeId: string,
  animated: AnimatedVec2,
  anchor: Vec2 | undefined,
  inventoryTarget: string,
): void {
  if (animated.kind !== "animated" || animated.keyframes.length < 2) return;
  const anchorVec = anchor ?? { x: 0, y: 0 };
  const { document } = ctx;
  const times = animated.keyframes.map((sample) => framesToMs(sample.frame - document.inFrame, document.frameRate) + ctx.timeOffsetMs);
  const start = times[0] ?? 0;
  const end = times[times.length - 1] ?? start;
  const duration = end - start;
  if (!(duration > 0)) return;
  const keyframes = animated.keyframes.map((sample, index) => {
    const offset = ((times[index] ?? start) - start) / duration;
    const value = { x: sample.value.x - anchorVec.x, y: sample.value.y - anchorVec.y };
    if (index === animated.keyframes.length - 1) return { offset, value };
    const easing = mapEasing(sample);
    if (typeof easing === "object") ctx.capabilities.push(easing.type === "hold" ? "easing.hold" : "easing.cubicBezier");
    return { offset, value, easing, ...(sample.spatial ? { spatial: sample.spatial } : {}) };
  });
  const clamped = clampTrackToScene(start, duration, keyframes, ctx.sceneDurationMs);
  if (!clamped) return;
  ctx.trackSerial += 1;
  ctx.tracks.push({
    id: `track${ctx.trackSerial}`,
    kind: "keyframe",
    target: { kind: "node", nodeId, channel: "transform.position" },
    valueType: "vec2",
    startMs: clamped.startMs,
    durationMs: clamped.durationMs,
    fill: { before: "none", after: "forwards" },
    keyframes: clamped.keyframes,
  });
  ctx.capabilities.push("geometry.spatialCurve");
  ctx.handled.add(`spatial-tangent:${inventoryTarget}`);
  ctx.notes.push({ feature: "spatial-tangent", level: "exact", message: `Spatial curve on ${nodeId}.`, target: nodeId });
}

function addVec2DerivedTracks(
  ctx: LowerContext,
  nodeId: string,
  channelPrefix: "transform.position",
  animated: AnimatedVec2,
  anchor: Vec2 | undefined,
  feature: string,
): void {
  if (animated.kind !== "animated") return;
  const anchorVec = anchor ?? { x: 0, y: 0 };
  const samples = expandHoldVec2Keyframes(animated.keyframes);
  addScalarChannelTrack(
    ctx,
    nodeId,
    "transform.position.x",
    samples.map((s) => ({ frame: s.frame, value: s.value.x - anchorVec.x, hold: s.hold, easing: s.easing })),
    feature,
  );
  addScalarChannelTrack(
    ctx,
    nodeId,
    "transform.position.y",
    samples.map((s) => ({ frame: s.frame, value: s.value.y - anchorVec.y, hold: s.hold, easing: s.easing })),
    feature,
  );
}

function addScaledVec2Tracks(
  ctx: LowerContext,
  nodeId: string,
  channelPrefix: "transform.scale",
  animated: AnimatedVec2,
  divisor: number,
): void {
  if (animated.kind !== "animated") return;
  const samples = expandHoldVec2Keyframes(animated.keyframes);
  addScalarChannelTrack(
    ctx,
    nodeId,
    "transform.scale.x",
    samples.map((s) => ({ frame: s.frame, value: s.value.x / divisor, hold: s.hold, easing: s.easing })),
    "scale",
  );
  addScalarChannelTrack(
    ctx,
    nodeId,
    "transform.scale.y",
    samples.map((s) => ({ frame: s.frame, value: s.value.y / divisor, hold: s.hold, easing: s.easing })),
    "scale",
  );
}

function addScalarTrack(
  ctx: LowerContext,
  nodeId: string,
  channel: "transform.rotation" | "opacity",
  animated: AnimatedScalar,
  map: (value: number) => number,
  feature: string,
): void {
  if (animated.kind !== "animated") return;
  const samples = expandHoldScalarKeyframes(animated.keyframes);
  addScalarChannelTrack(
    ctx,
    nodeId,
    channel,
    samples.map((s) => ({ frame: s.frame, value: map(s.value), hold: s.hold, easing: s.easing })),
    feature,
    channel === "transform.rotation" ? "angle" : "number",
  );
}

function addScalarChannelTrack(
  ctx: LowerContext,
  nodeId: string,
  channel: NodeAnimChannel,
  samples: { frame: number; value: number; hold: boolean; easing: LottieEasing }[],
  feature: string,
  valueType: "number" | "angle" = "number",
): void {
  if (samples.length < 2) return;
  const { document } = ctx;
  const times = samples.map((sample) => framesToMs(sample.frame - document.inFrame, document.frameRate) + ctx.timeOffsetMs);
  const start = times[0] ?? 0;
  const end = times[times.length - 1] ?? start;
  const duration = end - start;
  if (!(duration > 0)) return;

  let approximated = false;
  const keyframes = samples.map((sample, index) => {
    const offset = ((times[index] ?? start) - start) / duration;
    const easing = mapEasing(sample);
    if (sample.easing === "bezier-approx" && !sample.hold) approximated = true;
    if (typeof easing === "object") ctx.capabilities.push(easing.type === "hold" ? "easing.hold" : "easing.cubicBezier");
    if (index === samples.length - 1) return { offset, value: sample.value };
    return { offset, value: sample.value, easing };
  });

  if (approximated) {
    ctx.notes.push({
      feature: "easing",
      level: "approximated",
      message: `Bezier easing on ${nodeId}.${channel} was mapped to Scene IR easing names.`,
      target: nodeId,
    });
  } else {
    ctx.notes.push({ feature, level: "exact", message: `Imported motion on ${nodeId}.${channel}.`, target: nodeId });
  }

  const clamped = clampTrackToScene(start, duration, keyframes, ctx.sceneDurationMs);
  if (!clamped) return;
  ctx.trackSerial += 1;
  ctx.tracks.push({
    id: `track${ctx.trackSerial}`,
    kind: "keyframe",
    target: { kind: "node", nodeId, channel },
    valueType,
    startMs: clamped.startMs,
    durationMs: clamped.durationMs,
    fill: { before: "none", after: "forwards" },
    keyframes: clamped.keyframes,
  });
}

/**
 * Keep root tracks inside [0, sceneDurationMs]. Key times outside the window are
 * resampled onto the clamped ends so in-window motion is unchanged.
 */
function clampTrackToScene(
  startMs: number,
  durationMs: number,
  keyframes: Keyframe[],
  sceneDurationMs: number,
): { startMs: number; durationMs: number; keyframes: Keyframe[] } | undefined {
  const endMs = startMs + durationMs;
  const lo = Math.max(0, startMs);
  const hi = Math.min(sceneDurationMs, endMs);
  if (!(hi > lo) || !(sceneDurationMs > 0)) return undefined;
  if (Math.abs(lo - startMs) < 1e-9 && Math.abs(hi - endMs) < 1e-9) {
    return { startMs, durationMs, keyframes };
  }

  const span = hi - lo;
  const samples: Keyframe[] = [];
  const startValue = sampleTrackValue(startMs, durationMs, keyframes, lo);
  const startEasing = easingCrossing(startMs, durationMs, keyframes, lo);
  samples.push({
    offset: 0,
    value: startValue,
    ...(startEasing ? { easing: startEasing } : {}),
    ...(spatialCrossing(startMs, durationMs, keyframes, lo) ? { spatial: spatialCrossing(startMs, durationMs, keyframes, lo) } : {}),
  });

  for (const key of keyframes) {
    const time = startMs + key.offset * durationMs;
    if (time <= lo + 1e-9 || time >= hi - 1e-9) continue;
    samples.push({
      offset: (time - lo) / span,
      value: key.value,
      ...(key.easing ? { easing: key.easing } : {}),
      ...(key.spatial ? { spatial: key.spatial } : {}),
    });
  }

  samples.push({ offset: 1, value: sampleTrackValue(startMs, durationMs, keyframes, hi) });
  return { startMs: lo, durationMs: span, keyframes: dedupeKeyframeOffsets(samples) };
}

function sampleTrackValue(
  startMs: number,
  durationMs: number,
  keyframes: Keyframe[],
  timeMs: number,
): number | Vec2 | PathCommand[] {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first || !last) return 0;
  if (!(durationMs > 0)) return first.value;
  const progress = (timeMs - startMs) / durationMs;
  if (progress <= 0) return first.value;
  if (progress >= 1) return last.value;
  let segment = 0;
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const next = keyframes[index + 1];
    if (next && progress < next.offset) {
      segment = index;
      break;
    }
    segment = index;
  }
  const from = keyframes[segment] ?? first;
  const to = keyframes[segment + 1] ?? last;
  const span = to.offset - from.offset;
  const local = span === 0 ? 0 : (progress - from.offset) / span;
  if (from.easing && typeof from.easing === "object" && from.easing.type === "hold") return from.value;
  if (Array.isArray(from.value) || Array.isArray(to.value)) {
    if (!Array.isArray(from.value)) return from.value;
    if (!Array.isArray(to.value)) return from.value;
    return lerpPathCommands(from.value, to.value, local) ?? from.value;
  }
  if (typeof from.value === "number" && typeof to.value === "number") return from.value + (to.value - from.value) * local;
  if (typeof from.value === "number" || typeof to.value === "number") return from.value;
  return {
    x: from.value.x + (to.value.x - from.value.x) * local,
    y: from.value.y + (to.value.y - from.value.y) * local,
  };
}

function easingCrossing(startMs: number, durationMs: number, keyframes: Keyframe[], timeMs: number): SegmentEasing | undefined {
  if (!(durationMs > 0)) return undefined;
  const progress = (timeMs - startMs) / durationMs;
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index];
    const to = keyframes[index + 1];
    if (!from || !to) continue;
    if (progress >= from.offset - 1e-12 && progress < to.offset - 1e-12) return from.easing;
  }
  return undefined;
}

function spatialCrossing(
  startMs: number,
  durationMs: number,
  keyframes: Keyframe[],
  timeMs: number,
): Keyframe["spatial"] | undefined {
  if (!(durationMs > 0)) return undefined;
  const progress = (timeMs - startMs) / durationMs;
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index];
    const to = keyframes[index + 1];
    if (!from || !to) continue;
    if (Math.abs(progress - from.offset) < 1e-9) return from.spatial;
  }
  return undefined;
}

function dedupeKeyframeOffsets(keys: Keyframe[]): Keyframe[] {
  const out: Keyframe[] = [];
  for (const key of keys) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.offset - key.offset) < 1e-9) {
      out[out.length - 1] = { ...key, offset: prev.offset };
      continue;
    }
    out.push(key);
  }
  if (out.length === 1) {
    const only = out[0]!;
    return [
      { offset: 0, value: only.value, ...(only.easing ? { easing: only.easing } : {}) },
      { offset: 1, value: only.value },
    ];
  }
  if (out[0]) out[0] = { ...out[0], offset: 0 };
  const last = out[out.length - 1];
  if (last) {
    const { easing: _easing, spatial: _spatial, ...terminal } = last;
    out[out.length - 1] = { ...terminal, offset: 1 };
  }
  return out;
}

function expandHoldScalarKeyframes(keyframes: { frame: number; value: number; hold: boolean; easing: LottieEasing }[]) {
  return keyframes;
}

function expandHoldVec2Keyframes(keyframes: { frame: number; value: Vec2; hold: boolean; easing: LottieEasing; spatial?: { out: Vec2; in: Vec2 } }[]) {
  return keyframes;
}

function mapEasing(sample: { hold: boolean; easing: LottieEasing }): SegmentEasing {
  if (sample.hold) return { type: "hold" };
  if (sample.easing === "bezier-approx") return "easeInOut";
  return sample.easing;
}

function pathCommands(item: Extract<LottieShapeItem, { kind: "path" }>): PathCommand[] {
  return pathCommandsFromPoints(item.commands, item.closed);
}

function pathCommandsFromPoints(
  points: { vertex: Vec2; inTangent: Vec2; outTangent: Vec2 }[],
  closed: boolean,
): PathCommand[] {
  if (points.length === 0) return [];
  const commands: PathCommand[] = [];
  const first = points[0]!.vertex;
  commands.push({ cmd: "M", x: first.x, y: first.y });
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]!;
    const curr = points[index]!;
    const c1 = { x: prev.vertex.x + prev.outTangent.x, y: prev.vertex.y + prev.outTangent.y };
    const c2 = { x: curr.vertex.x + curr.inTangent.x, y: curr.vertex.y + curr.inTangent.y };
    commands.push({ cmd: "C", c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x: curr.vertex.x, y: curr.vertex.y });
  }
  if (closed && points.length > 1) {
    const prev = points[points.length - 1]!;
    const curr = points[0]!;
    const c1 = { x: prev.vertex.x + prev.outTangent.x, y: prev.vertex.y + prev.outTangent.y };
    const c2 = { x: curr.vertex.x + curr.inTangent.x, y: curr.vertex.y + curr.inTangent.y };
    commands.push({ cmd: "C", c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x: curr.vertex.x, y: curr.vertex.y });
    commands.push({ cmd: "Z" });
  }
  return commands;
}

function finish(document: LottieDocument, context: ImportContext, notes: FidelityItem[], scene: SceneIR | undefined): ImportResult {
  const fidelity = fidelityReport(notes, scene !== undefined);
  return {
    ok: scene !== undefined,
    scene,
    diagnostics: diagnosticsFromFidelity(notes, scene !== undefined),
    fidelity,
    sourceMetadata: {
      formatId: "lottie",
      adapterVersion: LOTTIE_ADAPTER_VERSION,
      sourceBytes: new TextEncoder().encode(context.sourceText).length,
      name: document.name,
    },
  };
}

function shapeFill(ctx: LowerContext, item: Extract<LottieShapeItem, { kind: "ellipse" | "rectangle" | "path" }>): Paint | undefined {
  if (item.gradient) {
    ctx.capabilities.push(item.gradient.type === "linear" ? "paint.linearGradient" : "paint.radialGradient");
    return gradientToPaint(item.gradient, 1);
  }
  return item.fill ? rgba(item.fill.color, item.fill.opacity) : undefined;
}

function shapeStroke(
  ctx: LowerContext,
  item: Extract<LottieShapeItem, { kind: "ellipse" | "rectangle" | "path" }>,
  target: string,
) {
  // Gradient stroke wins over a sibling solid stroke (Bodymovin often emits both).
  if (item.gradientStroke) {
    ctx.capabilities.push("paint.gradientStroke");
    ctx.notes.push({
      feature: "gs",
      level: "exact",
      message: `Imported gradient stroke on ${target}.`,
      target,
    });
    return {
      color: gradientToPaint(item.gradientStroke, item.gradientStroke.opacity),
      width: item.gradientStroke.width,
      cap: item.gradientStroke.cap,
      join: item.gradientStroke.join,
      miterLimit: item.gradientStroke.miterLimit,
    };
  }
  if (item.stroke) return strokePaint(item.stroke);
  return undefined;
}

function gradientToPaint(gradient: { type: "linear" | "radial"; x1: number; y1: number; x2: number; y2: number; stops: { offset: number; color: [number, number, number] }[] }, alpha: number): Paint {
  const stops = gradient.stops.map((stop) => ({ offset: stop.offset, color: rgba(stop.color, alpha) }));
  if (gradient.type === "radial") {
    return {
      type: "radial",
      cx: gradient.x1,
      cy: gradient.y1,
      r: Math.max(1, Math.hypot(gradient.x2 - gradient.x1, gradient.y2 - gradient.y1)),
      stops,
    };
  }
  return { type: "linear", x1: gradient.x1, y1: gradient.y1, x2: gradient.x2, y2: gradient.y2, stops };
}

function rgba(rgb: [number, number, number], alpha: number): SolidColor {
  return { type: "solid", r: rgb[0], g: rgb[1], b: rgb[2], a: alpha };
}

function strokePaint(stroke: StrokePaint) {
  return {
    color: rgba(stroke.color, stroke.opacity),
    width: stroke.width,
    cap: "butt" as const,
    join: "miter" as const,
    miterLimit: 4,
  };
}

function vec2Static(value: AnimatedVec2, fallback: Vec2): Vec2 {
  return value.kind === "static" ? value.value : fallback;
}

function scalarStatic(value: AnimatedScalar, fallback: number): number {
  return value.kind === "static" ? value.value : fallback;
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function nextStepId(ctx: LowerContext): string {
  ctx.stepSerial += 1;
  return `step${ctx.stepSerial}`;
}

/**
 * Scene IR cannot interleave a child above an uncle. To approximate Lottie's
 * global layer order under parenting, each layer gets
 * max(ownScore, descendantScores) where earlier arrayOrder ⇒ higher score.
 */
function stackZIndexes(layers: readonly LottieLayer[], maxOrder: number): Map<number, number> {
  const byIndex = new Map(layers.map((layer) => [layer.index, layer]));
  const children = new Map<number, LottieLayer[]>();
  for (const layer of layers) {
    if (layer.parentIndex === undefined || !byIndex.has(layer.parentIndex)) continue;
    const list = children.get(layer.parentIndex) ?? [];
    list.push(layer);
    children.set(layer.parentIndex, list);
  }
  const ownScore = (layer: LottieLayer) => (maxOrder - layer.arrayOrder) * 10;
  const memo = new Map<number, number>();
  const scoreOf = (layer: LottieLayer): number => {
    const cached = memo.get(layer.index);
    if (cached !== undefined) return cached;
    let score = ownScore(layer);
    for (const child of children.get(layer.index) ?? []) score = Math.max(score, scoreOf(child));
    memo.set(layer.index, score);
    return score;
  };
  for (const layer of layers) scoreOf(layer);
  return memo;
}

/** Stable topological order: parents before children; array order breaks ties. */
function orderParentsBeforeChildren(layers: LottieLayer[]): LottieLayer[] {
  const byIndex = new Map(layers.map((layer) => [layer.index, layer]));
  const visiting = new Set<number>();
  const done = new Set<number>();
  const ordered: LottieLayer[] = [];

  function visit(layer: LottieLayer): void {
    if (done.has(layer.index)) return;
    if (visiting.has(layer.index)) return;
    visiting.add(layer.index);
    if (layer.parentIndex !== undefined) {
      const parent = byIndex.get(layer.parentIndex);
      if (parent) visit(parent);
    }
    visiting.delete(layer.index);
    done.add(layer.index);
    ordered.push(layer);
  }

  for (const layer of [...layers].sort((a, b) => a.arrayOrder - b.arrayOrder)) visit(layer);
  return ordered;
}
