/**
 * Map Scene IR spatialLayers onto host SpatialLayer and project a resolved frame.
 */

import {
  diagnostic,
  type Diagnostic,
  type ResolvedAppearance,
  type ResolvedFrame,
  type SceneIR,
  type SpatialLayerDefinition,
  type SpatialSurfaceDefinition,
} from "@gvr/schema";
import {
  projectSpatialFrame,
  type SpatialCamera,
  type SpatialDiagnostic,
  type SpatialLayer,
  type SpatialSurface,
  type SpatialTransform,
} from "./spatial";

export function layersFromScene(scene: SceneIR): SpatialLayer[] {
  return (scene.spatialLayers ?? []).map(toHostLayer);
}

function toHostLayer(layer: SpatialLayerDefinition): SpatialLayer {
  const camera: SpatialCamera = {
    projection: layer.camera.projection,
    ...(layer.camera.position ? { position: { ...layer.camera.position } } : {}),
    ...(layer.camera.yaw !== undefined ? { yaw: layer.camera.yaw } : {}),
    ...(layer.camera.pitch !== undefined ? { pitch: layer.camera.pitch } : {}),
    ...(layer.camera.roll !== undefined ? { roll: layer.camera.roll } : {}),
    ...(layer.camera.focalLength !== undefined ? { focalLength: layer.camera.focalLength } : {}),
    ...(layer.camera.zoom !== undefined ? { zoom: layer.camera.zoom } : {}),
    ...(layer.camera.near !== undefined ? { near: layer.camera.near } : {}),
  };
  return {
    id: layer.id,
    camera,
    surfaces: layer.surfaces.map(toHostSurface),
  };
}

function toHostSurface(surface: SpatialSurfaceDefinition): SpatialSurface {
  const transform = surface.transform
    ? ({
        ...(surface.transform.position ? { position: { ...surface.transform.position } } : {}),
        ...(surface.transform.pivot ? { pivot: { ...surface.transform.pivot } } : {}),
        ...(surface.transform.rotation ? { rotation: { ...surface.transform.rotation } } : {}),
        ...(surface.transform.scale ? { scale: { ...surface.transform.scale } } : {}),
        ...(surface.transform.hinge
          ? {
              hinge: {
                from: { ...surface.transform.hinge.from },
                to: { ...surface.transform.hinge.to },
                angle: surface.transform.hinge.angle,
              },
            }
          : {}),
      } satisfies SpatialTransform)
    : undefined;
  const back: ResolvedAppearance | undefined = surface.backFill
    ? { fill: { ...surface.backFill } }
    : undefined;
  return {
    nodeId: surface.nodeId,
    ...(surface.parent ? { parent: surface.parent } : {}),
    ...(transform ? { transform } : {}),
    ...(back ? { back } : {}),
    ...(surface.backface ? { backface: surface.backface } : {}),
  };
}

export function projectSceneSpatial(
  scene: SceneIR,
  frame: ResolvedFrame,
): { frame: ResolvedFrame; diagnostics: Diagnostic[] } {
  const layers = layersFromScene(scene);
  if (layers.length === 0) return { frame, diagnostics: [] };
  const projection = projectSpatialFrame(frame, layers);
  return {
    frame: projection.frame,
    diagnostics: projection.diagnostics.map(spatialToDiagnostic),
  };
}

function spatialToDiagnostic(item: SpatialDiagnostic): Diagnostic {
  const severity = item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "info";
  const code = severity === "error" ? "SPACE_VIOLATION" : "RUNTIME_DEGRADED";
  return diagnostic({
    code,
    phase: "runtime",
    category: "runtime",
    severity,
    effect: severity === "error" ? "RUNTIME_DEGRADED" : "NONE",
    recovery: severity === "error" ? "Omit the affected surfaces for this sample." : "Continue.",
    message: `${item.code} ${item.layerId}: ${item.message}`,
  });
}
