/**
 * Bounded 2.5D spatial layers (E010 prototype).
 *
 * Planar surfaces (ordinary resolved draw items) receive rigid 3D placements,
 * hinges and a layer camera (perspective or orthographic). The result is again
 * an ordinary `ResolvedFrame`: projected items, front/back appearance and a
 * depth-resolved paint order. Renderers and `hitTest` consume it unchanged, so
 * what is painted is what is hit. No Scene IR or MotionScript wiring: language
 * support is the follow-up versioning item named in
 * docs/decisions/engine/spatial-graphics.md.
 *
 * Coordinates: x right, y down, z away from the viewer (right-handed). The
 * plane z = 0 is the 2D layout ("plane space": each item's logicalMatrix output).
 * The default camera reproduces 2D exactly for surfaces left in that plane.
 */
import {
  IDENTITY,
  type Mat3,
  type Paint,
  type PathCommand,
  type RenderTreeNode,
  type ResolvedAppearance,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
  type Vec2,
} from "@gvr/schema";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Column-major 4×4; column vectors p' = M p. */
export type Mat4 = readonly number[];

/** Radians, right-hand rule about each axis; applied x, then y, then z. */
export interface SpatialRotation {
  x?: number;
  y?: number;
  z?: number;
}

export interface SpatialHinge {
  /** Hinge line in the parent's plane coordinates (z = 0). */
  from: Vec2;
  to: Vec2;
  /** Radians, right-hand rule about from → to. */
  angle: number;
}

/**
 * local = H × T(position) × T(pivot) × Rz × Ry × Rx × S × T(−pivot)
 * where H is the optional hinge rotation in parent coordinates.
 */
export interface SpatialTransform {
  position?: Vec3;
  pivot?: Vec3;
  rotation?: SpatialRotation;
  scale?: Vec3;
  hinge?: SpatialHinge;
}

export interface SpatialSurface {
  /** Draw item (node id) that becomes a planar surface. */
  nodeId: string;
  /** Surface whose 3D placement composes before this one (rigid attachment). */
  parent?: string;
  transform?: SpatialTransform;
  /** Appearance of the reverse face. Omitted: the front appearance. */
  back?: ResolvedAppearance;
  /** "hidden" culls the reverse face (no paint, no hit). Default "visible". */
  backface?: "visible" | "hidden";
}

export interface SpatialCamera {
  projection: "perspective" | "orthographic";
  /** Eye position. Default: viewport centre at z = −focalLength. */
  position?: Vec3;
  /** Radians. Camera rotation R = Ry(yaw) × Rx(pitch) × Rz(roll); it looks along R·(0,0,1). */
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** Perspective: logical units from eye to the unit-scale picture plane. Default 1000. */
  focalLength?: number;
  /** Orthographic: uniform scale. Default 1. */
  zoom?: number;
  /** Perspective near plane (view depth). Default 1. */
  near?: number;
}

export interface SpatialLayer {
  id: string;
  camera: SpatialCamera;
  surfaces: readonly SpatialSurface[];
}

export interface SpatialLimits {
  /** Surfaces across all layers in one frame. */
  maxSurfaces: number;
  /** Flattened vertices per surface. */
  maxVerticesPerSurface: number;
  /** Flattened vertices across all surfaces. */
  maxTotalVertices: number;
  /** Largest scope group sorted with pairwise plane tests (otherwise depth only). */
  maxPairwiseSort: number;
  /** Segments per curve (cubic/quadratic, quarter ellipse, rounded corner). */
  curveSegments: number;
}

export const DEFAULT_SPATIAL_LIMITS: SpatialLimits = {
  maxSurfaces: 1024,
  maxVerticesPerSurface: 4096,
  maxTotalVertices: 65536,
  maxPairwiseSort: 256,
  curveSegments: 16,
};

export const DEFAULT_FOCAL_LENGTH = 1000;

export type SpatialDiagnosticCode =
  | "SPATIAL_INVALID_CAMERA"
  | "SPATIAL_DUPLICATE_SURFACE"
  | "SPATIAL_UNKNOWN_PARENT"
  | "SPATIAL_PARENT_CYCLE"
  | "SPATIAL_LIMIT_EXCEEDED"
  | "SPATIAL_NEAR_CULLED"
  | "SPATIAL_SURFACES_INTERSECT"
  | "SPATIAL_ORDER_CYCLE"
  | "SPATIAL_AFFINE_APPROXIMATION"
  | "SPATIAL_DEPTH_ONLY_SORT";

export interface SpatialDiagnostic {
  code: SpatialDiagnosticCode;
  severity: "error" | "warning" | "info";
  layerId: string;
  nodeIds: string[];
  message: string;
}

export type SurfaceMode = "affine-exact" | "affine-approx" | "projected";

export interface ProjectedSurface {
  nodeId: string;
  layerId: string;
  facing: "front" | "back";
  /** Culled surfaces have no draw item. */
  culled?: "backface" | "near" | "limit";
  mode: SurfaceMode;
  /** Mean view depth of the flattened outline. */
  depth: number;
  /** Plane origin and tangents in view space: P(q) = origin + q.x·tx + q.y·ty. */
  origin: Vec3;
  tx: Vec3;
  ty: Vec3;
  normal: Vec3;
  /** Original item local → plane matrix. */
  planeMatrix: Mat3;
}

interface CameraModel {
  projection: "perspective" | "orthographic";
  view: Mat4;
  focal: number;
  zoom: number;
  near: number;
  cx: number;
  cy: number;
}

export interface SpatialProjection {
  frame: ResolvedFrame;
  diagnostics: SpatialDiagnostic[];
  surfaces: ReadonlyMap<string, ProjectedSurface>;
  /** Layer id → camera model (for unprojection). */
  cameras: ReadonlyMap<string, CameraModel>;
}

// ---------------------------------------------------------------------------
// 4×4 helpers

const I4: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row]! * b[col * 4 + k]!;
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function translate4(x: number, y: number, z: number): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function scale4(x: number, y: number, z: number): Mat4 {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

/** Rotation about a unit axis through the origin (Rodrigues), right-hand rule. */
function axisRotation(axis: Vec3, angle: number): Mat4 {
  const { x, y, z } = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
}

const X_AXIS: Vec3 = { x: 1, y: 0, z: 0 };
const Y_AXIS: Vec3 = { x: 0, y: 1, z: 0 };
const Z_AXIS: Vec3 = { x: 0, y: 0, z: 1 };

export function transformPoint4(m: Mat4, p: Vec3): Vec3 {
  return {
    x: m[0]! * p.x + m[4]! * p.y + m[8]! * p.z + m[12]!,
    y: m[1]! * p.x + m[5]! * p.y + m[9]! * p.z + m[13]!,
    z: m[2]! * p.x + m[6]! * p.y + m[10]! * p.z + m[14]!,
  };
}

function transformDir4(m: Mat4, d: Vec3): Vec3 {
  return {
    x: m[0]! * d.x + m[4]! * d.y + m[8]! * d.z,
    y: m[1]! * d.x + m[5]! * d.y + m[9]! * d.z,
    z: m[2]! * d.x + m[6]! * d.y + m[10]! * d.z,
  };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

/** The rigid/scaled local placement of one surface in its parent's space. */
export function spatialLocalMatrix(transform: SpatialTransform = {}): Mat4 {
  const p = transform.position ?? { x: 0, y: 0, z: 0 };
  const v = transform.pivot ?? { x: 0, y: 0, z: 0 };
  const r = transform.rotation ?? {};
  const s = transform.scale ?? { x: 1, y: 1, z: 1 };
  let m = multiplyMat4(translate4(p.x, p.y, p.z), translate4(v.x, v.y, v.z));
  m = multiplyMat4(m, axisRotation(Z_AXIS, r.z ?? 0));
  m = multiplyMat4(m, axisRotation(Y_AXIS, r.y ?? 0));
  m = multiplyMat4(m, axisRotation(X_AXIS, r.x ?? 0));
  m = multiplyMat4(m, scale4(s.x, s.y, s.z));
  m = multiplyMat4(m, translate4(-v.x, -v.y, -v.z));
  if (transform.hinge) m = multiplyMat4(hingeMatrix(transform.hinge), m);
  return m;
}

/** Rotation about the in-plane line from → to (z = 0). Identity for a degenerate line. */
export function hingeMatrix(hinge: SpatialHinge): Mat4 {
  const dx = hinge.to.x - hinge.from.x;
  const dy = hinge.to.y - hinge.from.y;
  const len = Math.hypot(dx, dy);
  if (!(len > 0)) return I4;
  const axis = { x: dx / len, y: dy / len, z: 0 };
  return multiplyMat4(
    translate4(hinge.from.x, hinge.from.y, 0),
    multiplyMat4(axisRotation(axis, hinge.angle), translate4(-hinge.from.x, -hinge.from.y, 0)),
  );
}

function cameraRotation(camera: SpatialCamera): Mat4 {
  return multiplyMat4(
    axisRotation(Y_AXIS, camera.yaw ?? 0),
    multiplyMat4(axisRotation(X_AXIS, camera.pitch ?? 0), axisRotation(Z_AXIS, camera.roll ?? 0)),
  );
}

function transpose3(m: Mat4): Mat4 {
  return [m[0]!, m[4]!, m[8]!, 0, m[1]!, m[5]!, m[9]!, 0, m[2]!, m[6]!, m[10]!, 0, 0, 0, 0, 1];
}

/**
 * Orbit helper: eye = target − distance × forward, forward = R·(0,0,1).
 * Dolly changes `distance`; zoom changes `focalLength`.
 */
export function orbitCamera(options: {
  target: Vec3;
  distance: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  focalLength?: number;
  near?: number;
}): SpatialCamera {
  const camera: SpatialCamera = {
    projection: "perspective",
    yaw: options.yaw ?? 0,
    pitch: options.pitch ?? 0,
    roll: options.roll ?? 0,
    ...(options.focalLength !== undefined ? { focalLength: options.focalLength } : {}),
    ...(options.near !== undefined ? { near: options.near } : {}),
  };
  const forward = transformDir4(cameraRotation(camera), Z_AXIS);
  camera.position = {
    x: options.target.x - options.distance * forward.x,
    y: options.target.y - options.distance * forward.y,
    z: options.target.z - options.distance * forward.z,
  };
  return camera;
}

function cameraModel(camera: SpatialCamera, viewport: { width: number; height: number }): CameraModel | string {
  const focal = camera.focalLength ?? DEFAULT_FOCAL_LENGTH;
  const zoom = camera.zoom ?? 1;
  const near = camera.near ?? 1;
  if (camera.projection !== "perspective" && camera.projection !== "orthographic") return "unknown projection";
  if (!(Number.isFinite(focal) && focal > 0)) return "focalLength must be finite and > 0";
  if (!(Number.isFinite(zoom) && zoom > 0)) return "zoom must be finite and > 0";
  if (!(Number.isFinite(near) && near > 0)) return "near must be finite and > 0";
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const eye = camera.position ?? { x: cx, y: cy, z: -focal };
  for (const value of [eye.x, eye.y, eye.z, camera.yaw ?? 0, camera.pitch ?? 0, camera.roll ?? 0]) {
    if (!Number.isFinite(value)) return "camera values must be finite";
  }
  // View = Rᵀ × T(−eye), then shift so the default eye sees plane z = 0 unchanged.
  const view = multiplyMat4(transpose3(cameraRotation(camera)), translate4(-eye.x, -eye.y, -eye.z));
  return { projection: camera.projection, view, focal, zoom, near, cx, cy };
}

function projectView(cam: CameraModel, c: Vec3): Vec2 {
  if (cam.projection === "orthographic") return { x: cam.cx + cam.zoom * c.x, y: cam.cy + cam.zoom * c.y };
  return { x: cam.cx + (cam.focal * c.x) / c.z, y: cam.cy + (cam.focal * c.y) / c.z };
}

// ---------------------------------------------------------------------------
// Geometry flattening (local item space)

interface Outline {
  points: Vec2[];
  closed: boolean;
}

function flatten(geometry: ResolvedGeometry, segments: number): Outline[] {
  switch (geometry.kind) {
    case "rectangle":
      return [{ points: roundRect(geometry.size.x, geometry.size.y, geometry.cornerRadius ?? 0, segments), closed: true }];
    case "image":
      return [{ points: roundRect(geometry.size.x, geometry.size.y, 0, segments), closed: true }];
    case "circle":
      return [{ points: ellipse(geometry.radius, geometry.radius, segments), closed: true }];
    case "ellipse":
      return [{ points: ellipse(geometry.size.x / 2, geometry.size.y / 2, segments), closed: true }];
    case "line":
      return [{ points: [geometry.from, geometry.to], closed: false }];
    case "polygon":
      return [{ points: [...geometry.points], closed: true }];
    case "path":
      return flattenPath(geometry.commands, segments);
    case "text":
      return [{ points: textBox(geometry), closed: true }];
  }
}

function roundRect(w: number, h: number, radius: number, segments: number): Vec2[] {
  const r = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
  if (r === 0) return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const out: Vec2[] = [];
  const corners: [number, number, number][] = [
    [w - r, r, -Math.PI / 2],
    [w - r, h - r, 0],
    [r, h - r, Math.PI / 2],
    [r, r, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const a = start + (i / segments) * (Math.PI / 2);
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return out;
}

function ellipse(rx: number, ry: number, segments: number): Vec2[] {
  const count = segments * 4;
  const out: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    out.push({ x: rx * Math.cos(a), y: ry * Math.sin(a) });
  }
  return out;
}

function flattenPath(commands: readonly PathCommand[], segments: number): Outline[] {
  const out: Outline[] = [];
  let current: Outline | undefined;
  let pen: Vec2 = { x: 0, y: 0 };
  let start: Vec2 = { x: 0, y: 0 };
  const begin = (p: Vec2) => {
    current = { points: [p], closed: false };
    out.push(current);
  };
  for (const command of commands) {
    switch (command.cmd) {
      case "M":
        pen = { x: command.x, y: command.y };
        start = pen;
        begin(pen);
        break;
      case "L":
        if (!current) begin(pen);
        pen = { x: command.x, y: command.y };
        current!.points.push(pen);
        break;
      case "Q": {
        if (!current) begin(pen);
        const p0 = pen;
        for (let i = 1; i <= segments; i += 1) {
          const t = i / segments;
          const m = 1 - t;
          current!.points.push({
            x: m * m * p0.x + 2 * m * t * command.cx + t * t * command.x,
            y: m * m * p0.y + 2 * m * t * command.cy + t * t * command.y,
          });
        }
        pen = { x: command.x, y: command.y };
        break;
      }
      case "C": {
        if (!current) begin(pen);
        const p0 = pen;
        for (let i = 1; i <= segments; i += 1) {
          const t = i / segments;
          const m = 1 - t;
          current!.points.push({
            x: m * m * m * p0.x + 3 * m * m * t * command.c1x + 3 * m * t * t * command.c2x + t * t * t * command.x,
            y: m * m * m * p0.y + 3 * m * m * t * command.c1y + 3 * m * t * t * command.c2y + t * t * t * command.y,
          });
        }
        pen = { x: command.x, y: command.y };
        break;
      }
      case "Z":
        if (current) current.closed = true;
        pen = start;
        current = undefined;
        break;
    }
  }
  return out.filter((outline) => outline.points.length > 0);
}

/** Conservative em-box estimate, as the hit-tester uses without host metrics. */
function textBox(geometry: Extract<ResolvedGeometry, { kind: "text" }>): Vec2[] {
  const size = geometry.font.size;
  const width = 0.6 * size * Math.max(1, geometry.content.length);
  const x0 = geometry.align === "center" ? -width / 2 : geometry.align === "right" ? -width : 0;
  const [top, bottom] =
    geometry.baseline === "top" ? [0, size]
      : geometry.baseline === "middle" ? [-size / 2, size / 2]
        : geometry.baseline === "bottom" ? [-size, 0]
          : [-0.8 * size, 0.2 * size];
  return [
    { x: x0, y: top },
    { x: x0 + width, y: top },
    { x: x0 + width, y: bottom },
    { x: x0, y: bottom },
  ];
}

function applyMat3(m: Mat3, p: Vec2): Vec2 {
  return { x: m[0] * p.x + m[3] * p.y + m[6], y: m[1] * p.x + m[4] * p.y + m[7] };
}

// ---------------------------------------------------------------------------
// Projection

interface Work {
  item: ResolvedDrawItem;
  slot: number;
  layer: SpatialLayer;
  surface: ProjectedSurface;
  /** View-space flattened outline points. */
  view: Vec3[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  output?: ResolvedDrawItem;
}

/**
 * Project the surfaces of each layer and resolve their paint order.
 * Items that are not surfaces are unchanged and keep their paint slots.
 */
export function projectSpatialFrame(
  frame: ResolvedFrame,
  layers: readonly SpatialLayer[],
  limits: Partial<SpatialLimits> = {},
): SpatialProjection {
  const bound: SpatialLimits = { ...DEFAULT_SPATIAL_LIMITS, ...limits };
  const diagnostics: SpatialDiagnostic[] = [];
  const surfaces = new Map<string, ProjectedSurface>();
  const cameras = new Map<string, CameraModel>();
  const slotOf = new Map(frame.drawItems.map((item, index) => [item.nodeId, index]));
  const owner = new Map<string, { layer: SpatialLayer; surface: SpatialSurface }>();

  let surfaceCount = 0;
  for (const layer of layers) {
    const model = cameraModel(layer.camera, frame.viewport);
    if (typeof model === "string") {
      diagnostics.push({ code: "SPATIAL_INVALID_CAMERA", severity: "error", layerId: layer.id, nodeIds: [], message: model });
      continue;
    }
    cameras.set(layer.id, model);
    for (const surface of layer.surfaces) {
      if (owner.has(surface.nodeId)) {
        diagnostics.push({
          code: "SPATIAL_DUPLICATE_SURFACE", severity: "error", layerId: layer.id, nodeIds: [surface.nodeId],
          message: `Surface ${surface.nodeId} is declared more than once.`,
        });
        continue;
      }
      owner.set(surface.nodeId, { layer, surface });
      surfaceCount += 1;
    }
  }
  if (surfaceCount > bound.maxSurfaces) {
    diagnostics.push({
      code: "SPATIAL_LIMIT_EXCEEDED", severity: "error", layerId: "", nodeIds: [],
      message: `${surfaceCount} surfaces exceed the limit of ${bound.maxSurfaces}; spatial layers were not drawn.`,
    });
    const hiddenIds = new Set(owner.keys());
    return {
      frame: rebuild(frame, frame.drawItems.filter((item) => !hiddenIds.has(item.nodeId)), hiddenIds),
      diagnostics, surfaces, cameras,
    };
  }

  // World placement per surface (parent chain within its layer).
  const worlds = new Map<string, Mat4>();
  const resolving = new Set<string>();
  const world = (nodeId: string): Mat4 | undefined => {
    const cached = worlds.get(nodeId);
    if (cached) return cached;
    const entry = owner.get(nodeId)!;
    if (resolving.has(nodeId)) {
      diagnostics.push({
        code: "SPATIAL_PARENT_CYCLE", severity: "error", layerId: entry.layer.id, nodeIds: [...resolving],
        message: `Surface parents form a cycle at ${nodeId}.`,
      });
      return undefined;
    }
    resolving.add(nodeId);
    let parent: Mat4 | undefined = I4;
    const parentId = entry.surface.parent;
    if (parentId !== undefined) {
      const parentEntry = owner.get(parentId);
      if (!parentEntry || parentEntry.layer !== entry.layer) {
        diagnostics.push({
          code: "SPATIAL_UNKNOWN_PARENT", severity: "error", layerId: entry.layer.id, nodeIds: [nodeId],
          message: `Surface ${nodeId} names parent ${parentId}, which is not a surface of the same layer.`,
        });
        parent = undefined;
      } else {
        parent = world(parentId);
      }
    }
    resolving.delete(nodeId);
    if (!parent) return undefined;
    const result = multiplyMat4(parent, spatialLocalMatrix(entry.surface.transform));
    worlds.set(nodeId, result);
    return result;
  };

  const work: Work[] = [];
  const removed = new Set<string>();
  let totalVertices = 0;
  for (const [nodeId, { layer, surface }] of owner) {
    const slot = slotOf.get(nodeId);
    if (slot === undefined) continue; // Not painted in this frame (hidden/removed).
    const item = frame.drawItems[slot]!;
    const cam = cameras.get(layer.id)!;
    const placement = world(nodeId);
    if (!placement) {
      removed.add(nodeId);
      continue;
    }
    const m = multiplyMat4(cam.view, placement);
    const origin = transformPoint4(m, { x: 0, y: 0, z: 0 });
    const tx = transformDir4(m, X_AXIS);
    const ty = transformDir4(m, Y_AXIS);
    const normal = cross(tx, ty);
    const facingDot = cam.projection === "perspective" ? dot(normal, origin) : normal.z;
    const facing: "front" | "back" = facingDot >= 0 ? "front" : "back";
    const outlines = flatten(item.geometry, bound.curveSegments);
    const vertexCount = outlines.reduce((sum, outline) => sum + outline.points.length, 0);
    const projected: ProjectedSurface = {
      nodeId, layerId: layer.id, facing, mode: "affine-exact", depth: 0,
      origin, tx, ty, normal, planeMatrix: item.logicalMatrix,
    };
    surfaces.set(nodeId, projected);
    totalVertices += vertexCount;
    if (vertexCount > bound.maxVerticesPerSurface || totalVertices > bound.maxTotalVertices) {
      projected.culled = "limit";
      removed.add(nodeId);
      diagnostics.push({
        code: "SPATIAL_LIMIT_EXCEEDED", severity: "error", layerId: layer.id, nodeIds: [nodeId],
        message: `Surface ${nodeId} flattens to ${vertexCount} vertices (limits ${bound.maxVerticesPerSurface} per surface, ${bound.maxTotalVertices} per frame); not drawn.`,
      });
      continue;
    }
    const toView = (p: Vec2): Vec3 => {
      const q = applyMat3(item.logicalMatrix, p);
      return { x: origin.x + q.x * tx.x + q.y * ty.x, y: origin.y + q.x * tx.y + q.y * ty.y, z: origin.z + q.x * tx.z + q.y * ty.z };
    };
    const view = outlines.flatMap((outline) => outline.points.map(toView));
    projected.depth = view.length ? view.reduce((sum, v) => sum + v.z, 0) / view.length : origin.z;
    if (cam.projection === "perspective" && view.some((v) => v.z < cam.near)) {
      projected.culled = "near";
      removed.add(nodeId);
      diagnostics.push({
        code: "SPATIAL_NEAR_CULLED", severity: "warning", layerId: layer.id, nodeIds: [nodeId],
        message: `Surface ${nodeId} crosses the near plane (${cam.near}); culled whole (no near clipping in this prototype).`,
      });
      continue;
    }
    if (facing === "back" && surface.backface === "hidden") {
      projected.culled = "backface";
      removed.add(nodeId);
      continue;
    }
    const appearance = facing === "back" && surface.back ? surface.back : item.appearance;
    const screen = view.map((v) => projectView(cam, v));
    const bounds = boundsOf(screen);
    const parallel = Math.abs(normal.x) <= 1e-9 * length(normal) && Math.abs(normal.y) <= 1e-9 * length(normal);
    const affine = cam.projection === "orthographic" || parallel;
    const keepsShape = item.geometry.kind === "text" || item.geometry.kind === "image";
    let output: ResolvedDrawItem;
    if (affine || keepsShape) {
      projected.mode = affine ? "affine-exact" : "affine-approx";
      if (!affine) {
        diagnostics.push({
          code: "SPATIAL_AFFINE_APPROXIMATION", severity: "info", layerId: layer.id, nodeIds: [nodeId],
          message: `${item.geometry.kind} ${nodeId} uses the affine tangent of the perspective at its centre.`,
        });
      }
      const centre = outlineCentre(outlines);
      const matrix = tangentAffine(cam, toView, centre, Math.max(1, extentOf(outlines)));
      output = { ...item, appearance, logicalMatrix: matrix };
    } else {
      projected.mode = "projected";
      const centre = outlineCentre(outlines);
      const jac = tangentAffine(cam, toView, centre, Math.max(1, extentOf(outlines)));
      const areaScale = Math.sqrt(Math.abs(jac[0] * jac[4] - jac[1] * jac[3]));
      const project = (p: Vec2) => projectView(cam, toView(p));
      const commands: PathCommand[] = [];
      for (const outline of outlines) {
        outline.points.forEach((p, index) => {
          const s = project(p);
          commands.push(index === 0 ? { cmd: "M", x: s.x, y: s.y } : { cmd: "L", x: s.x, y: s.y });
        });
        if (outline.closed) commands.push({ cmd: "Z" });
      }
      const fillRule = item.geometry.kind === "path" ? item.geometry.fillRule : "nonzero";
      output = {
        ...item,
        geometry: { kind: "path", commands, fillRule },
        appearance: projectAppearance(appearance, project, areaScale, item.geometry.kind === "line"),
        logicalMatrix: IDENTITY,
      };
    }
    work.push({ item, slot, layer, surface: projected, view, bounds, output });
  }

  // Resolve order inside each compositing scope; non-surfaces keep their slots.
  const scopeOf = scopeMembership(frame);
  const groups = new Map<string, Work[]>();
  for (const entry of work) {
    const key = `${entry.layer.id}\u0000${scopeOf.get(entry.item.nodeId) ?? "root"}`;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  const replacement = new Map<number, ResolvedDrawItem>();
  for (const list of groups.values()) {
    const ordered = depthOrder(list, cameras.get(list[0]!.layer.id)!, bound, diagnostics);
    const slots = list.map((entry) => entry.slot).sort((a, b) => a - b);
    slots.forEach((slot, index) => replacement.set(slot, ordered[index]!.output!));
  }
  const items: ResolvedDrawItem[] = [];
  frame.drawItems.forEach((item, index) => {
    if (removed.has(item.nodeId)) return;
    items.push(replacement.get(index) ?? item);
  });
  return { frame: rebuild(frame, items, removed), diagnostics, surfaces, cameras };
}

function outlineCentre(outlines: Outline[]): Vec2 {
  const all = outlines.flatMap((outline) => outline.points);
  if (all.length === 0) return { x: 0, y: 0 };
  const b = boundsOf(all);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

function extentOf(outlines: Outline[]): number {
  const all = outlines.flatMap((outline) => outline.points);
  if (all.length === 0) return 1;
  const b = boundsOf(all);
  return Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2;
}

function boundsOf(points: Vec2[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Local → logical affine matching the projection at `centre` (exact when the projection is affine). */
function tangentAffine(cam: CameraModel, toView: (p: Vec2) => Vec3, centre: Vec2, step: number): Mat3 {
  const h = cam.projection === "orthographic" ? step : Math.min(step, 1e-3 * step + 1e-3);
  const c = projectView(cam, toView(centre));
  const px = projectView(cam, toView({ x: centre.x + h, y: centre.y }));
  const py = projectView(cam, toView({ x: centre.x, y: centre.y + h }));
  const a = (px.x - c.x) / h, b = (px.y - c.y) / h;
  const d = (py.x - c.x) / h, e = (py.y - c.y) / h;
  return [a, b, 0, d, e, 0, c.x - a * centre.x - d * centre.y, c.y - b * centre.x - e * centre.y, 1];
}

function projectAppearance(
  appearance: ResolvedAppearance,
  project: (p: Vec2) => Vec2,
  areaScale: number,
  strokeOnly: boolean,
): ResolvedAppearance {
  const out: ResolvedAppearance = {};
  if (appearance.fill && !strokeOnly) out.fill = projectPaint(appearance.fill, project, areaScale);
  if (appearance.stroke) {
    out.stroke = {
      ...appearance.stroke,
      color: projectPaint(appearance.stroke.color, project, areaScale),
      width: appearance.stroke.width * areaScale,
    };
  }
  return out;
}

function projectPaint(paint: Paint, project: (p: Vec2) => Vec2, areaScale: number): Paint {
  if (paint.type === "linear") {
    const a = project({ x: paint.x1, y: paint.y1 });
    const b = project({ x: paint.x2, y: paint.y2 });
    return { ...paint, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }
  if (paint.type === "radial") {
    const c = project({ x: paint.cx, y: paint.cy });
    return { ...paint, cx: c.x, cy: c.y, r: paint.r * areaScale };
  }
  return paint;
}

// ---------------------------------------------------------------------------
// Depth order

/** Plane side classification of `points` against `plane`, relative to the eye. */
function sideCounts(points: Vec3[], plane: ProjectedSurface, cam: CameraModel): { near: number; far: number } | undefined {
  const n = plane.normal;
  const nl = length(n);
  if (!(nl > 0)) return undefined;
  const eyeSide = cam.projection === "perspective" ? dot(n, sub({ x: 0, y: 0, z: 0 }, plane.origin)) : -n.z;
  if (Math.abs(eyeSide) <= 1e-12 * nl) return undefined;
  const sign = eyeSide > 0 ? 1 : -1;
  const eps = 1e-6 * Math.max(1, Math.abs(plane.depth));
  let near = 0, far = 0;
  for (const p of points) {
    const d = (dot(n, sub(p, plane.origin)) / nl) * sign;
    if (d > eps) near += 1;
    else if (d < -eps) far += 1;
  }
  return { near, far };
}

function overlaps(a: Work, b: Work): boolean {
  const eps = 1e-9;
  return a.bounds.minX < b.bounds.maxX - eps && b.bounds.minX < a.bounds.maxX - eps
    && a.bounds.minY < b.bounds.maxY - eps && b.bounds.minY < a.bounds.maxY - eps;
}

/** −1: a paints first; 1: b paints first; 0: either order (no occlusion / coplanar / undecided). */
function pairOrder(a: Work, b: Work, cam: CameraModel): { order: -1 | 0 | 1; intersect: boolean } {
  const aOfB = sideCounts(a.view, b.surface, cam);
  const bOfA = sideCounts(b.view, a.surface, cam);
  const votes = new Set<number>();
  if (aOfB) {
    if (aOfB.far > 0 && aOfB.near === 0) votes.add(-1);
    else if (aOfB.near > 0 && aOfB.far === 0) votes.add(1);
  }
  if (bOfA) {
    if (bOfA.far > 0 && bOfA.near === 0) votes.add(1);
    else if (bOfA.near > 0 && bOfA.far === 0) votes.add(-1);
  }
  // Coplanar overlapping surfaces (decals, doors in walls, folded flaps) keep authored order.
  const flat = (counts?: { near: number; far: number }) => !!counts && counts.near === 0 && counts.far === 0;
  if (flat(aOfB) && flat(bOfA)) return { order: a.slot < b.slot ? -1 : 1, intersect: false };
  const straddles = (counts?: { near: number; far: number }) => !!counts && counts.near > 0 && counts.far > 0;
  const intersect = straddles(aOfB) && straddles(bOfA);
  if (votes.size !== 1) return { order: 0, intersect };
  return { order: [...votes][0] as -1 | 1, intersect };
}

function depthOrder(list: Work[], cam: CameraModel, limits: SpatialLimits, diagnostics: SpatialDiagnostic[]): Work[] {
  // Farther first; ties keep the original paint order (children after parents).
  const priority = (a: Work, b: Work) => {
    const scale = 1e-9 * Math.max(1, Math.abs(a.surface.depth), Math.abs(b.surface.depth));
    if (Math.abs(a.surface.depth - b.surface.depth) > scale) return b.surface.depth - a.surface.depth;
    return a.slot - b.slot;
  };
  const layerId = list[0]!.layer.id;
  if (list.length > limits.maxPairwiseSort) {
    diagnostics.push({
      code: "SPATIAL_DEPTH_ONLY_SORT", severity: "info", layerId, nodeIds: [],
      message: `${list.length} surfaces in one scope exceed ${limits.maxPairwiseSort}; ordered by mean depth only.`,
    });
    return [...list].sort(priority);
  }
  const after = list.map(() => new Set<number>());
  const indegree = list.map(() => 0);
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]!, b = list[j]!;
      if (!overlaps(a, b)) continue;
      const { order, intersect } = pairOrder(a, b, cam);
      if (intersect) {
        diagnostics.push({
          code: "SPATIAL_SURFACES_INTERSECT", severity: "warning", layerId, nodeIds: [a.item.nodeId, b.item.nodeId],
          message: `Surfaces ${a.item.nodeId} and ${b.item.nodeId} interpenetrate; painter order cannot be exact (no splitting).`,
        });
      }
      if (order === -1 && !after[i]!.has(j)) { after[i]!.add(j); indegree[j]! += 1; }
      if (order === 1 && !after[j]!.has(i)) { after[j]!.add(i); indegree[i]! += 1; }
    }
  }
  const done = new Array<boolean>(list.length).fill(false);
  const out: Work[] = [];
  let reportedCycle = false;
  while (out.length < list.length) {
    let pick = -1;
    for (let i = 0; i < list.length; i += 1) {
      if (done[i] || indegree[i]! > 0) continue;
      if (pick < 0 || priority(list[i]!, list[pick]!) < 0) pick = i;
    }
    if (pick < 0) {
      const remaining = list.map((_, i) => i).filter((i) => !done[i]);
      for (const i of remaining) if (pick < 0 || priority(list[i]!, list[pick]!) < 0) pick = i;
      if (!reportedCycle) {
        reportedCycle = true;
        diagnostics.push({
          code: "SPATIAL_ORDER_CYCLE", severity: "warning", layerId, nodeIds: remaining.map((i) => list[i]!.item.nodeId),
          message: "Cyclic overlap among surfaces; broken by mean depth.",
        });
      }
    }
    done[pick] = true;
    out.push(list[pick]!);
    for (const j of after[pick]!) indegree[j]! -= 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Render tree consistency

function scopeMembership(frame: ResolvedFrame): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (node: RenderTreeNode, scope: string) => {
    if (node.kind === "leaf") out.set(node.item.nodeId, scope);
    else for (const child of node.children) walk(child, node.id);
  };
  if (frame.renderTree) walk(frame.renderTree, "root");
  return out;
}

/** Keep renderTree leaves identical to drawItems (same order), so painting and hit-testing agree. */
function rebuild(frame: ResolvedFrame, items: ResolvedDrawItem[], removed: ReadonlySet<string>): ResolvedFrame {
  const out: ResolvedFrame = { ...frame, drawItems: items };
  if (!frame.renderTree) return out;
  // Leaves are visited in drawItems order; refill them in the new order.
  let cursor = 0;
  const refill = (node: RenderTreeNode): RenderTreeNode | undefined => {
    if (node.kind === "leaf") {
      if (removed.has(node.item.nodeId)) return undefined;
      return { kind: "leaf", item: items[cursor++]! };
    }
    return { ...node, children: node.children.map(refill).filter((child): child is RenderTreeNode => !!child) };
  };
  out.renderTree = refill(frame.renderTree)!;
  return out;
}

// ---------------------------------------------------------------------------
// Unprojection (input on projected surfaces)

/**
 * Intersect the eye ray through a logical point with a surface plane.
 * Returns the plane-space point and the item's original local point, or
 * undefined for culled/edge-on surfaces or points behind the eye.
 */
export function unprojectToSurface(
  projection: SpatialProjection,
  nodeId: string,
  point: Vec2,
): { plane: Vec2; local: Vec2 } | undefined {
  const surface = projection.surfaces.get(nodeId);
  if (!surface || surface.culled) return undefined;
  const cam = projection.cameras.get(surface.layerId);
  if (!cam) return undefined;
  const origin: Vec3 = cam.projection === "perspective"
    ? { x: 0, y: 0, z: 0 }
    : { x: (point.x - cam.cx) / cam.zoom, y: (point.y - cam.cy) / cam.zoom, z: 0 };
  const dir: Vec3 = cam.projection === "perspective"
    ? { x: (point.x - cam.cx) / cam.focal, y: (point.y - cam.cy) / cam.focal, z: 1 }
    : { x: 0, y: 0, z: 1 };
  const denom = dot(surface.normal, dir);
  if (Math.abs(denom) <= 1e-12 * length(surface.normal)) return undefined;
  const t = dot(surface.normal, sub(surface.origin, origin)) / denom;
  if (!(t > 0)) return undefined;
  const hit = { x: origin.x + t * dir.x, y: origin.y + t * dir.y, z: origin.z + t * dir.z };
  const r = sub(hit, surface.origin);
  // Solve r = qx·tx + qy·ty (least squares via the Gram matrix).
  const a = dot(surface.tx, surface.tx), b = dot(surface.tx, surface.ty), c = dot(surface.ty, surface.ty);
  const det = a * c - b * b;
  if (!(Math.abs(det) > 1e-18)) return undefined;
  const rx = dot(r, surface.tx), ry = dot(r, surface.ty);
  const plane = { x: (c * rx - b * ry) / det, y: (a * ry - b * rx) / det };
  const m = surface.planeMatrix;
  const d2 = m[0] * m[4] - m[1] * m[3];
  if (!(Math.abs(d2) > 1e-12)) return undefined;
  const px = plane.x - m[6], py = plane.y - m[7];
  const local = { x: (m[4] * px - m[3] * py) / d2, y: (m[0] * py - m[1] * px) / d2 };
  return { plane, local };
}

/** Exact in-plane drag delta (plane space) between two logical pointer positions. */
export function surfaceDragDelta(projection: SpatialProjection, nodeId: string, from: Vec2, to: Vec2): Vec2 | undefined {
  const a = unprojectToSurface(projection, nodeId, from);
  const b = unprojectToSurface(projection, nodeId, to);
  if (!a || !b) return undefined;
  return { x: b.plane.x - a.plane.x, y: b.plane.y - a.plane.y };
}

/** Project a plane-space point of a surface to logical viewport coordinates. */
export function projectSurfacePoint(projection: SpatialProjection, nodeId: string, plane: Vec2): Vec2 | undefined {
  const surface = projection.surfaces.get(nodeId);
  const cam = surface ? projection.cameras.get(surface.layerId) : undefined;
  if (!surface || !cam) return undefined;
  const v = {
    x: surface.origin.x + plane.x * surface.tx.x + plane.y * surface.ty.x,
    y: surface.origin.y + plane.x * surface.tx.y + plane.y * surface.ty.y,
    z: surface.origin.z + plane.x * surface.tx.z + plane.y * surface.ty.z,
  };
  if (cam.projection === "perspective" && !(v.z > 0)) return undefined;
  return projectView(cam, v);
}
