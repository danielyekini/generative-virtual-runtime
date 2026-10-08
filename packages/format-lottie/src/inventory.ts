/**
 * Source inventory runs on the parsed JSON before any Scene IR is built.
 * Each finding is recorded before lowering. The lowerer removes it when that construct is represented.
 */

export interface InventoryFinding {
  feature: string;
  message: string;
  target: string;
}

export function inventoryLottie(value: unknown): InventoryFinding[] {
  if (!isRecord(value)) return [];
  const findings: InventoryFinding[] = [];
  const assets = Array.isArray(value.assets) ? value.assets : [];
  assets.forEach((asset, index) => {
    if (!isRecord(asset)) return;
    const id = typeof asset.id === "string" && asset.id.length > 0 ? asset.id : String(index);
    const target = `asset_${id}`;
    if (Array.isArray(asset.layers)) {
      findings.push({
        feature: "precomp",
        target,
        message: `Precomp asset ${id} has ${asset.layers.length} layers and was inventoried before lowering.`,
      });
      asset.layers.forEach((layer, layerOrder) => {
        if (isRecord(layer)) collectLayer(findings, layer, `${target}.layer_${layerIndex(layer, layerOrder)}`, true);
      });
      return;
    }
    if (typeof asset.p === "string" || typeof asset.u === "string") {
      findings.push({
        feature: "image",
        target,
        message: `Image asset ${id} was inventoried and not lowered.`,
      });
    }
  });
  if (Array.isArray(value.layers)) {
    value.layers.forEach((layer, layerOrder) => {
      if (isRecord(layer)) collectLayer(findings, layer, `layer_${layerIndex(layer, layerOrder)}`, false);
    });
  }
  return findings;
}

function collectLayer(findings: InventoryFinding[], layer: Record<string, unknown>, target: string, insideAsset: boolean): void {
  const ty = typeof layer.ty === "number" ? layer.ty : -1;
  if (insideAsset && ty !== 4 && ty !== 3 && ty !== 1) {
    findings.push({
      feature: "layer",
      target,
      message: `Layer type ${ty} was inventoried and not lowered.`,
    });
  }
  if (typeof layer.tt === "number" && layer.tt !== 0) {
    findings.push({
      feature: "matte",
      target,
      message: `Track matte type ${layer.tt} was inventoried and not lowered.`,
    });
  }
  if (layer.td === 1) {
    findings.push({
      feature: "matte",
      target,
      message: "Matte source layer was inventoried and not lowered.",
    });
  }
  if (Array.isArray(layer.ef) && layer.ef.length > 0) {
    const names = layer.ef
      .map((effect) => (isRecord(effect) && typeof effect.nm === "string" ? effect.nm : "effect"))
      .join(", ");
    findings.push({
      feature: "effect",
      target,
      message: `Effect stack (${names}) was inventoried and not lowered.`,
    });
  }
  if (hasSpatialTangents(layer.ks)) {
    findings.push({
      feature: "spatial-tangent",
      target,
      message: "Spatial tangents on position were inventoried and not lowered.",
    });
  }
  if (ty === 1) collectSolidColor(findings, layer.sc, target);
  collectAnimatedFill(findings, layer.shapes, `${target}.shapes`);
}

/** A rejected animated colour must not disappear behind an exact import label. */
function collectAnimatedFill(findings: InventoryFinding[], shapes: unknown, target: string): void {
  if (!Array.isArray(shapes)) return;
  shapes.forEach((shape, index) => {
    if (!isRecord(shape)) return;
    const location = `${target}[${index}]`;
    if (shape.ty === "gr") collectAnimatedFill(findings, shape.it, `${location}.it`);
    if (shape.ty === "fl" && isRecord(shape.c) && shape.c.a === 1) {
      findings.push({ feature: "animated-fill-color", target: `${location}.c`,
        message: "Animated solid fill colour is not represented by the current language channels; its paint is not lowered." });
    }
  });
}

function collectSolidColor(findings: InventoryFinding[], sc: unknown, target: string): void {
  if (Array.isArray(sc) && sc.length >= 3 && sc.every((channel) => typeof channel === "number")) return;
  const encoded = typeof sc === "string" ? sc : "";
  findings.push({
    feature: "solid-color",
    target,
    message: encoded
      ? `Solid colour ${encoded} was inventoried and not lowered.`
      : "Solid colour was missing or not an RGB array and was not lowered.",
  });
}

function hasSpatialTangents(ks: unknown): boolean {
  if (!isRecord(ks) || !isRecord(ks.p)) return false;
  const position = ks.p;
  if (position.a !== 1 || !Array.isArray(position.k)) return false;
  return position.k.some((frame) => isRecord(frame) && (nonzeroVec(frame.ti) || nonzeroVec(frame.to)));
}

function nonzeroVec(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((component) => typeof component === "number" && Math.abs(component) > 1e-6);
}

function layerIndex(layer: Record<string, unknown>, arrayOrder: number): number {
  return typeof layer.ind === "number" ? layer.ind : arrayOrder + 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
