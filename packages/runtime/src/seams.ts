/**
 * E016 seam classification and intersection splitting prototype.
 * See docs/decisions/engine/seam-depth-order.md. Superseded for scenes by the
 * released space.planarSeams path in projectSpatialFrame (exact plane-line
 * clipping); kept as a host helper for its existing callers.
 *
 * E010 plane-test order remains the occlusion authority. This module classifies
 * overlapping projected surfaces, suppresses false intersections at shared
 * edges, optionally splits true intersections into ordered 2D fragments, and
 * rejects animated order overrides that contradict plane tests.
 */

import type { PathCommand, ResolvedDrawItem, ResolvedFrame, Vec2 } from "@gvr/schema";
import type { ProjectedSurface, SpatialDiagnostic, SpatialProjection } from "./spatial";

export type SeamPairKind = "ordered" | "coplanar-tie" | "shared-edge" | "intersect" | "disjoint";

export type SeamDiagnosticCode =
  | "SEAM_SHARED_EDGE"
  | "SEAM_SPLIT"
  | "SEAM_SPLIT_LIMIT"
  | "SEAM_ORDER_OVERRIDE_REJECTED"
  | "SEAM_UNION";

export interface SeamDiagnostic {
  code: SeamDiagnosticCode;
  message: string;
  nodeIds: string[];
}

export interface SeamPairClassification {
  a: string;
  b: string;
  kind: SeamPairKind;
  /** −1: a paints before b; 1: b before a; 0: tie / undecided. */
  order: -1 | 0 | 1;
}

export interface SharedEdge {
  a: string;
  b: string;
  from: Vec2;
  to: Vec2;
}

export interface SeamResolveOptions {
  /** Endpoint match epsilon in logical units (default 1e-3). */
  edgeEpsilon?: number;
  /** Max fragments emitted for one intersecting pair (default 8). */
  maxFragmentsPerPair?: number;
  /** When true, clip intersecting pairs into ordered fragments. Default true. */
  splitIntersections?: boolean;
  /**
   * Optional animated / authored tie-break: negative means left paints first.
   * Applied only for coplanar-tie / undecided pairs; contradicts plane order → diagnostic.
   */
  animatedOrder?: (a: string, b: string) => number | undefined;
}

export interface SeamResolveResult {
  frame: ResolvedFrame;
  classifications: SeamPairClassification[];
  sharedEdges: SharedEdge[];
  diagnostics: SeamDiagnostic[];
  spatialDiagnostics: SpatialDiagnostic[];
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function nearly(a: Vec2, b: Vec2, eps: number): boolean {
  return dist2(a, b) <= eps * eps;
}

/** Extract polyline rings from a draw item (projected paths/polygons/rects). */
export function outlineOf(item: ResolvedDrawItem): Vec2[] {
  const g = item.geometry;
  if (g.kind === "path") {
    const pts: Vec2[] = [];
    for (const cmd of g.commands) {
      if (cmd.cmd === "M" || cmd.cmd === "L") pts.push({ x: cmd.x, y: cmd.y });
      else if (cmd.cmd === "Q" || cmd.cmd === "C") pts.push({ x: cmd.x, y: cmd.y });
    }
    return pts;
  }
  if (g.kind === "polygon") return g.points.map((p) => ({ x: p.x, y: p.y }));
  if (g.kind === "rectangle") {
    const w = g.size.x;
    const h = g.size.y;
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
  }
  if (g.kind === "circle") {
    const n = 16;
    const out: Vec2[] = [];
    for (let i = 0; i < n; i += 1) {
      const t = (i / n) * Math.PI * 2;
      out.push({ x: Math.cos(t) * g.radius, y: Math.sin(t) * g.radius });
    }
    return out;
  }
  if (g.kind === "ellipse") {
    const n = 16;
    const rx = g.size.x / 2;
    const ry = g.size.y / 2;
    const out: Vec2[] = [];
    for (let i = 0; i < n; i += 1) {
      const t = (i / n) * Math.PI * 2;
      out.push({ x: Math.cos(t) * rx, y: Math.sin(t) * ry });
    }
    return out;
  }
  return [];
}

function edgesOf(ring: Vec2[]): Array<{ from: Vec2; to: Vec2 }> {
  if (ring.length < 2) return [];
  const out: Array<{ from: Vec2; to: Vec2 }> = [];
  for (let i = 0; i < ring.length; i += 1) {
    const from = ring[i]!;
    const to = ring[(i + 1) % ring.length]!;
    if (dist2(from, to) > 1e-18) out.push({ from, to });
  }
  return out;
}

function sameSegment(a: { from: Vec2; to: Vec2 }, b: { from: Vec2; to: Vec2 }, eps: number): boolean {
  return (nearly(a.from, b.from, eps) && nearly(a.to, b.to, eps))
    || (nearly(a.from, b.to, eps) && nearly(a.to, b.from, eps));
}

/** Find a shared edge between two projected outlines, if any. */
export function findSharedEdge(a: ResolvedDrawItem, b: ResolvedDrawItem, eps = 1e-3): SharedEdge | undefined {
  const ae = edgesOf(outlineOf(a));
  const be = edgesOf(outlineOf(b));
  for (const ea of ae) {
    for (const eb of be) {
      if (sameSegment(ea, eb, eps)) {
        return { a: a.nodeId, b: b.nodeId, from: { ...ea.from }, to: { ...ea.to } };
      }
    }
  }
  return undefined;
}

function planeSide(point: { x: number; y: number; z: number }, plane: ProjectedSurface): number {
  const n = plane.normal;
  const nl = Math.hypot(n.x, n.y, n.z) || 1;
  return ((point.x - plane.origin.x) * n.x + (point.y - plane.origin.y) * n.y + (point.z - plane.origin.z) * n.z) / nl;
}

function countSides(
  pts: Array<{ x: number; y: number; z: number }>,
  plane: ProjectedSurface,
  eps: number,
): { near: number; far: number } {
  let near = 0;
  let far = 0;
  for (const p of pts) {
    const d = planeSide(p, plane);
    if (d > eps) near += 1;
    else if (d < -eps) far += 1;
  }
  return { near, far };
}

/** Map a projected outline into view-space samples on its surface plane. */
function viewSamples(surface: ProjectedSurface, ring: Vec2[]): Array<{ x: number; y: number; z: number }> {
  if (ring.length === 0) return [surface.origin];
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
  const txLen = Math.hypot(surface.tx.x, surface.tx.y, surface.tx.z) || 1;
  const tyLen = Math.hypot(surface.ty.x, surface.ty.y, surface.ty.z) || 1;
  return ring.map((p) => {
    const u = (p.x - cx) / txLen;
    const v = (p.y - cy) / tyLen;
    return {
      x: surface.origin.x + surface.tx.x * u + surface.ty.x * v,
      y: surface.origin.y + surface.tx.y * u + surface.ty.y * v,
      z: surface.origin.z + surface.tx.z * u + surface.ty.z * v,
    };
  });
}

/**
 * Classify one overlapping pair using E010-style plane straddling plus shared-edge detection.
 * `order` uses paint slots when tied (lower paints first).
 */
export function classifySurfacePair(
  a: { item: ResolvedDrawItem; surface: ProjectedSurface; slot: number },
  b: { item: ResolvedDrawItem; surface: ProjectedSurface; slot: number },
  options: { edgeEpsilon?: number } = {},
): SeamPairClassification {
  const eps = options.edgeEpsilon ?? 1e-3;
  if (findSharedEdge(a.item, b.item, eps)) {
    return { a: a.item.nodeId, b: b.item.nodeId, kind: "shared-edge", order: a.slot < b.slot ? -1 : 1 };
  }

  const aRing = outlineOf(a.item);
  const bRing = outlineOf(b.item);
  if (aRing.length < 3 || bRing.length < 3) {
    return { a: a.item.nodeId, b: b.item.nodeId, kind: "disjoint", order: 0 };
  }

  const sideEps = 1e-6 * Math.max(1, Math.abs(a.surface.depth), Math.abs(b.surface.depth));
  const aOfB = countSides(viewSamples(a.surface, aRing), b.surface, sideEps);
  const bOfA = countSides(viewSamples(b.surface, bRing), a.surface, sideEps);
  const straddles = (c: { near: number; far: number }) => c.near > 0 && c.far > 0;
  if (straddles(aOfB) && straddles(bOfA)) {
    return { a: a.item.nodeId, b: b.item.nodeId, kind: "intersect", order: 0 };
  }
  if (aOfB.near === 0 && aOfB.far === 0 && bOfA.near === 0 && bOfA.far === 0) {
    return { a: a.item.nodeId, b: b.item.nodeId, kind: "coplanar-tie", order: a.slot < b.slot ? -1 : 1 };
  }
  const votes = new Set<number>();
  if (aOfB.far > 0 && aOfB.near === 0) votes.add(-1);
  else if (aOfB.near > 0 && aOfB.far === 0) votes.add(1);
  if (bOfA.far > 0 && bOfA.near === 0) votes.add(1);
  else if (bOfA.near > 0 && bOfA.far === 0) votes.add(-1);
  if (votes.size === 1) {
    return { a: a.item.nodeId, b: b.item.nodeId, kind: "ordered", order: [...votes][0] as -1 | 1 };
  }
  return { a: a.item.nodeId, b: b.item.nodeId, kind: "coplanar-tie", order: a.slot < b.slot ? -1 : 1 };
}

/** Clip a polygon by the half-plane nx*x + ny*y + c >= 0. */
export function clipPolygon(poly: Vec2[], nx: number, ny: number, c: number): Vec2[] {
  if (poly.length === 0) return [];
  const inside = (p: Vec2) => nx * p.x + ny * p.y + c >= -1e-9;
  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i]!;
    const prev = poly[(i + poly.length - 1) % poly.length]!;
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn !== prevIn) {
      const d0 = nx * prev.x + ny * prev.y + c;
      const d1 = nx * cur.x + ny * cur.y + c;
      const t = d0 / (d0 - d1);
      out.push({ x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t });
    }
    if (curIn) out.push(cur);
  }
  return out;
}

function pathFromRing(ring: Vec2[]): PathCommand[] {
  if (ring.length === 0) return [];
  const cmds: PathCommand[] = [{ cmd: "M", x: ring[0]!.x, y: ring[0]!.y }];
  for (let i = 1; i < ring.length; i += 1) cmds.push({ cmd: "L", x: ring[i]!.x, y: ring[i]!.y });
  cmds.push({ cmd: "Z" });
  return cmds;
}

function centroid(ring: Vec2[]): Vec2 {
  if (ring.length === 0) return { x: 0, y: 0 };
  const s = ring.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / ring.length, y: s.y / ring.length };
}

/**
 * Split two intersecting projected items along the perpendicular bisector of
 * their centroids (bounded stand-in for the projected plane–plane line).
 */
export function splitIntersectingPair(
  a: ResolvedDrawItem,
  b: ResolvedDrawItem,
  options: { maxFragmentsPerPair?: number } = {},
): { fragments: ResolvedDrawItem[]; limited: boolean } {
  const max = options.maxFragmentsPerPair ?? 8;
  const ar = outlineOf(a);
  const br = outlineOf(b);
  if (ar.length < 3 || br.length < 3) return { fragments: [a, b], limited: false };
  const ca = centroid(ar);
  const cb = centroid(br);
  let nx = cb.x - ca.x;
  let ny = cb.y - ca.y;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
  const c = -(nx * mid.x + ny * mid.y);
  const parts = [
    clipPolygon(ar, nx, ny, c),
    clipPolygon(ar, -nx, -ny, -c),
    clipPolygon(br, nx, ny, c),
    clipPolygon(br, -nx, -ny, -c),
  ];
  const tags = ["a-p", "a-n", "b-p", "b-n"] as const;
  const sources = [a, a, b, b];
  const fragments: ResolvedDrawItem[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const ring = parts[i]!;
    if (ring.length < 3) continue;
    const src = sources[i]!;
    fragments.push({
      ...src,
      nodeId: `${src.nodeId}#${tags[i]}`,
      geometry: { kind: "path", commands: pathFromRing(ring), fillRule: "nonzero" },
    });
  }
  if (fragments.length > max) return { fragments: fragments.slice(0, max), limited: true };
  fragments.sort((l, r) => {
    const lc = centroid(outlineOf(l));
    const rc = centroid(outlineOf(r));
    return (nx * rc.x + ny * rc.y) - (nx * lc.x + ny * lc.y);
  });
  return { fragments, limited: false };
}

/** Convex hull of coplanar projected outlines (merge/union helper). */
export function unionProjected(items: readonly ResolvedDrawItem[]): Vec2[] {
  const pts = items.flatMap(outlineOf);
  if (pts.length === 0) return [];
  const sorted = [...pts].sort((p, q) => (p.x === q.x ? p.y - q.y : p.x - q.x));
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Resolve seams on a spatial projection: classify pairs, optionally split
 * intersections, apply animated tie-breaks only where allowed.
 */
export function resolveSeams(projection: SpatialProjection, options: SeamResolveOptions = {}): SeamResolveResult {
  const eps = options.edgeEpsilon ?? 1e-3;
  const split = options.splitIntersections !== false;
  const maxFrag = options.maxFragmentsPerPair ?? 8;
  const diagnostics: SeamDiagnostic[] = [];
  const classifications: SeamPairClassification[] = [];
  const sharedEdges: SharedEdge[] = [];

  const items = projection.frame.drawItems;
  const slot = new Map(items.map((item, index) => [item.nodeId, index]));
  const byId = new Map(items.map((item) => [item.nodeId, item]));
  const surfaces = projection.surfaces;

  const surfaceIds = [...surfaces.keys()].filter((id) => byId.has(id) && !surfaces.get(id)!.culled);
  for (let i = 0; i < surfaceIds.length; i += 1) {
    for (let j = i + 1; j < surfaceIds.length; j += 1) {
      const idA = surfaceIds[i]!;
      const idB = surfaceIds[j]!;
      const itemA = byId.get(idA)!;
      const itemB = byId.get(idB)!;
      const classed = classifySurfacePair(
        { item: itemA, surface: surfaces.get(idA)!, slot: slot.get(idA) ?? i },
        { item: itemB, surface: surfaces.get(idB)!, slot: slot.get(idB) ?? j },
        { edgeEpsilon: eps },
      );
      classifications.push(classed);
      if (classed.kind === "shared-edge") {
        const edge = findSharedEdge(itemA, itemB, eps);
        if (edge) sharedEdges.push(edge);
        diagnostics.push({
          code: "SEAM_SHARED_EDGE",
          message: `Shared edge between ${idA} and ${idB}; authored order kept.`,
          nodeIds: [idA, idB],
        });
      }
      if (options.animatedOrder && classed.kind === "ordered") {
        const pref = options.animatedOrder(idA, idB);
        if (pref !== undefined) {
          const want = pref < 0 ? -1 : 1;
          if (want !== classed.order) {
            diagnostics.push({
              code: "SEAM_ORDER_OVERRIDE_REJECTED",
              message: `Animated order cannot override plane-test occlusion for ${idA}/${idB}.`,
              nodeIds: [idA, idB],
            });
          }
        }
      }
    }
  }

  let drawItems = [...items];
  if (split) {
    const replace = new Map<string, ResolvedDrawItem[]>();
    for (const c of classifications) {
      if (c.kind !== "intersect") continue;
      const a = byId.get(c.a);
      const b = byId.get(c.b);
      if (!a || !b) continue;
      const { fragments, limited } = splitIntersectingPair(a, b, { maxFragmentsPerPair: maxFrag });
      if (limited) {
        diagnostics.push({
          code: "SEAM_SPLIT_LIMIT",
          message: `Fragment cap ${maxFrag} hit for ${c.a}/${c.b}; keeping unsplit items.`,
          nodeIds: [c.a, c.b],
        });
        continue;
      }
      diagnostics.push({
        code: "SEAM_SPLIT",
        message: `Split intersecting pair ${c.a}/${c.b} into ${fragments.length} fragments.`,
        nodeIds: [c.a, c.b],
      });
      replace.set(c.a, fragments.filter((f) => f.nodeId.startsWith(`${c.a}#`)));
      replace.set(c.b, fragments.filter((f) => f.nodeId.startsWith(`${c.b}#`)));
    }
    if (replace.size) {
      const next: ResolvedDrawItem[] = [];
      for (const item of drawItems) {
        const parts = replace.get(item.nodeId);
        if (parts) next.push(...parts);
        else next.push(item);
      }
      drawItems = next;
    }
  }

  return {
    frame: { ...projection.frame, drawItems },
    classifications,
    sharedEdges,
    diagnostics,
    spatialDiagnostics: projection.diagnostics,
  };
}
