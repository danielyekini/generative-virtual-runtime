import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import type { ResolvedFrame, SceneIR, Vec2 } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { hitTest } from "./input";
import { AnimationRuntime } from "./runtime";
import { sampleScene } from "./sample";
import {
  orbitCamera,
  projectSpatialFrame,
  unprojectToSurface,
  type SpatialCamera,
  type SpatialLayer,
  type SpatialProjection,
  type SpatialSeams,
  type SpatialSurface,
} from "./spatial";

function frameOf(source: string, t = 0): { scene: SceneIR; frame: ResolvedFrame } {
  const result = compileMotionScript(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  const scene = result.scene!;
  return { scene, frame: buildResolvedFrame(scene, sampleScene(scene, t), t) };
}

function layer(camera: SpatialCamera, surfaces: SpatialSurface[], seams?: SpatialSeams): SpatialLayer[] {
  return [{ id: "L", camera, surfaces, ...(seams ? { seams } : {}) }];
}

function order(frame: ResolvedFrame): string[] {
  return frame.drawItems.map((item) => item.nodeId);
}

function treeOrder(frame: ResolvedFrame): string[] {
  const out: string[] = [];
  const walk = (node: NonNullable<ResolvedFrame["renderTree"]>) => {
    if (node.kind === "leaf") out.push(node.item.nodeId);
    else node.children.forEach(walk);
  };
  if (frame.renderTree) walk(frame.renderTree);
  return out;
}

function codes(projection: SpatialProjection): string[] {
  return projection.diagnostics.map((d) => d.code);
}

/** Point-in-polygon (even-odd) in item-local coordinates. */
function inside(poly: readonly Vec2[], p: Vec2): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]!, b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * Ground truth: the surface nearest the eye along the ray through `p`, from the
 * unprojected plane hits (independent of paint order). Undefined when no surface
 * covers the point or two hits are within `margin` of each other or an edge.
 */
function nearestSurface(projection: SpatialProjection, outlines: Record<string, Vec2[]>, p: Vec2): string | undefined {
  const hits: Array<{ id: string; depth: number }> = [];
  for (const [id, poly] of Object.entries(outlines)) {
    const hit = unprojectToSurface(projection, id, p);
    if (!hit) continue;
    const near = [{ x: 1.5, y: 0 }, { x: -1.5, y: 0 }, { x: 0, y: 1.5 }, { x: 0, y: -1.5 }]
      .map((d) => inside(poly, { x: hit.local.x + d.x, y: hit.local.y + d.y }));
    if (near.some((v) => v !== inside(poly, hit.local))) return undefined; // too close to an outline edge
    if (!inside(poly, hit.local)) continue;
    const s = projection.surfaces.get(id)!;
    const v = {
      x: s.origin.x + hit.plane.x * s.tx.x + hit.plane.y * s.ty.x,
      y: s.origin.y + hit.plane.x * s.tx.y + hit.plane.y * s.ty.y,
      z: s.origin.z + hit.plane.x * s.tx.z + hit.plane.y * s.ty.z,
    };
    const perspective = projection.cameras.get(s.layerId)!.projection === "perspective";
    hits.push({ id, depth: perspective ? Math.hypot(v.x, v.y, v.z) : v.z });
  }
  if (hits.length === 0) return undefined;
  hits.sort((a, b) => a.depth - b.depth);
  if (hits.length > 1 && hits[1]!.depth - hits[0]!.depth < 0.5) return undefined;
  return hits[0]!.id;
}

/** Count grid points whose topmost painted item is not the nearest surface. */
function occlusionErrors(projection: SpatialProjection, outlines: Record<string, Vec2[]>): { checked: number; wrong: number } {
  let checked = 0, wrong = 0;
  for (let x = 0; x <= 640; x += 8) {
    for (let y = 0; y <= 360; y += 8) {
      const expected = nearestSurface(projection, outlines, { x, y });
      if (!expected) continue;
      checked += 1;
      if (hitTest(projection.frame, { x, y })?.nodeId !== expected) wrong += 1;
    }
  }
  return { checked, wrong };
}

const crossing = `scene "cross" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle A { position (100, 100); size (200, 100); fill #ff0000; };
rectangle B { position (100, 100); size (200, 100); fill #0000ff; };
complete;`;
const rectOutline = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }];
const camera = orbitCamera({ target: { x: 200, y: 150, z: 0 }, distance: 800, yaw: 0.3 });
const crossingSurfaces: SpatialSurface[] = [
  { nodeId: "A", transform: { rotation: { y: 0.5 }, pivot: { x: 200, y: 150, z: 0 } } },
  { nodeId: "B", transform: { rotation: { y: -0.5 }, pivot: { x: 200, y: 150, z: 0 } } },
];

describe("space.planarSeams: intersection splitting", () => {
  it("splits crossing panels along their plane intersection so every covered pixel shows the nearer panel", () => {
    const { frame } = frameOf(crossing);
    const before = projectSpatialFrame(frame, layer(camera, crossingSurfaces));
    expect(codes(before)).toContain("SPATIAL_SURFACES_INTERSECT");
    const unsplit = occlusionErrors(before, { A: rectOutline, B: rectOutline });
    expect(unsplit.wrong).toBeGreaterThan(0); // the E010 painter lie

    const after = projectSpatialFrame(frame, layer(camera, crossingSurfaces, {}));
    expect(codes(after)).toEqual(["SPATIAL_SURFACES_SPLIT"]);
    expect(order(after.frame).sort()).toEqual(["A", "A", "B", "B"]);
    expect(treeOrder(after.frame)).toEqual(order(after.frame));
    const split = occlusionErrors(after, { A: rectOutline, B: rectOutline });
    expect(split.checked).toBeGreaterThan(100);
    expect(split.wrong).toBe(0);
  });

  it("splits under orthographic projection and keeps appearance and node identity", () => {
    const { frame } = frameOf(crossing);
    const ortho: SpatialCamera = { ...camera, projection: "orthographic" };
    const after = projectSpatialFrame(frame, layer(ortho, crossingSurfaces, {}));
    expect(codes(after)).toEqual(["SPATIAL_SURFACES_SPLIT"]);
    for (const item of after.frame.drawItems) {
      expect(item.geometry.kind).toBe("path");
      expect(item.appearance.fill).toEqual(frame.drawItems.find((d) => d.nodeId === item.nodeId)!.appearance.fill);
    }
    const result = occlusionErrors(after, { A: rectOutline, B: rectOutline });
    expect(result.checked).toBeGreaterThan(100);
    expect(result.wrong).toBe(0);
  });

  it("splits concave panels that share an edge yet still cross", () => {
    const L = [{ x: 150, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 200 }, { x: 150, y: 200 }];
    const poly = (p: Vec2) => `(${p.x}, ${p.y})`;
    const source = `scene "ell" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
polygon P { points (${L.map(poly).join(", ")}); fill #ff0000; };
polygon Q { points (${L.map(poly).join(", ")}); fill #0000ff; };
complete;`;
    const { frame } = frameOf(source);
    const surfaces: SpatialSurface[] = [
      { nodeId: "P" },
      { nodeId: "Q", transform: { rotation: { y: Math.PI / 2 }, pivot: { x: 200, y: 0, z: 0 } } },
    ];
    const cam = orbitCamera({ target: { x: 200, y: 150, z: 0 }, distance: 700, yaw: 0.6, pitch: -0.2 });
    const before = projectSpatialFrame(frame, layer(cam, surfaces));
    expect(codes(before)).toContain("SPATIAL_SURFACES_INTERSECT");
    const after = projectSpatialFrame(frame, layer(cam, surfaces, {}));
    expect(codes(after)).toEqual(["SPATIAL_SURFACES_SPLIT"]);
    expect(occlusionErrors(before, { P: L, Q: L }).wrong).toBeGreaterThan(0);
    const result = occlusionErrors(after, { P: L, Q: L });
    expect(result.checked).toBeGreaterThan(20);
    expect(result.wrong).toBe(0);
  });

  it("keeps the E010 report path when splitting is off, unsupported or over budget", () => {
    const { frame } = frameOf(crossing);
    const off = projectSpatialFrame(frame, layer(camera, crossingSurfaces, { split: false }));
    expect(codes(off)).toEqual(["SPATIAL_SURFACES_INTERSECT"]);
    expect(order(off.frame)).toHaveLength(2);

    const budget = projectSpatialFrame(frame, layer(camera, crossingSurfaces, { maxFragments: 1 }));
    expect(codes(budget)).toEqual(["SPATIAL_SPLIT_LIMIT", "SPATIAL_SURFACES_INTERSECT"]);
    expect(order(budget.frame)).toHaveLength(2);

    const stroked = frameOf(crossing.replace("fill #ff0000;", "fill #ff0000; stroke #000000 width 2;")).frame;
    const unsupported = projectSpatialFrame(stroked, layer(camera, crossingSurfaces, {}));
    expect(codes(unsupported)).toEqual(["SPATIAL_SPLIT_UNSUPPORTED", "SPATIAL_SURFACES_INTERSECT"]);
  });

  it("leaves non-intersecting layers byte-identical and is deterministic", () => {
    const { frame } = frameOf(crossing);
    const apart: SpatialSurface[] = [{ nodeId: "A" }, { nodeId: "B", transform: { position: { x: 0, y: 0, z: 200 } } }];
    expect(projectSpatialFrame(frame, layer(camera, apart, {})).frame).toEqual(projectSpatialFrame(frame, layer(camera, apart)).frame);
    const one = projectSpatialFrame(frame, layer(camera, crossingSurfaces, {}));
    const two = projectSpatialFrame(frame, layer(camera, crossingSurfaces, {}));
    expect(one.frame).toEqual(two.frame);
  });

  it("splits a three-way crossing within the fragment budget", () => {
    const source = crossing.replace("complete;", `rectangle C { position (100, 100); size (200, 100); fill #00ff00; };\ncomplete;`);
    const { frame } = frameOf(source);
    const surfaces: SpatialSurface[] = [
      ...crossingSurfaces,
      { nodeId: "C", transform: { rotation: { x: 0.6 }, pivot: { x: 200, y: 150, z: 0 } } },
    ];
    const after = projectSpatialFrame(frame, layer(camera, surfaces, {}));
    expect(codes(after).every((code) => code === "SPATIAL_SURFACES_SPLIT")).toBe(true);
    const result = occlusionErrors(after, { A: rectOutline, B: rectOutline, C: rectOutline });
    expect(result.checked).toBeGreaterThan(100);
    expect(result.wrong).toBe(0);
    expect(occlusionErrors(projectSpatialFrame(frame, layer(camera, surfaces)), { A: rectOutline, B: rectOutline, C: rectOutline }).wrong).toBeGreaterThan(0);
    expect(after.frame.drawItems.length).toBeLessThanOrEqual(3 + 64);
  });
});

describe("space.planarSeams: declared seams and order hints", () => {
  const fold = `scene "fold" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle Base { position (120, 100); size (200, 160); fill #ffeecc; };
rectangle Flap { position (320, 100); size (120, 160); fill #ccddff; };
complete;`;
  const hinged = (offset: number): SpatialSurface[] => [
    { nodeId: "Base" },
    // The flap's left edge sits on Base's right edge (x = 320) and folds about it.
    { nodeId: "Flap", parent: "Base", transform: { position: { x: offset, y: 0, z: 0 }, hinge: { from: { x: 320, y: 100 }, to: { x: 320, y: 260 }, angle: -0.8 } } },
  ];
  const cam = orbitCamera({ target: { x: 300, y: 180, z: 0 }, distance: 900, yaw: 0.2 });
  const seams: SpatialSeams = { edges: [{ a: "Base", b: "Flap" }] };

  it("accepts a hinge seam whose edges coincide in view space", () => {
    const { frame } = frameOf(fold);
    const result = projectSpatialFrame(frame, layer(cam, hinged(0), seams));
    expect(codes(result)).toEqual([]);
  });

  it("reports a drifted morph that only looks continuous across the fold", () => {
    const { frame } = frameOf(fold);
    const result = projectSpatialFrame(frame, layer(cam, hinged(3), seams));
    expect(codes(result)).toEqual(["SPATIAL_SEAM_OPEN"]);
    expect(result.diagnostics[0]!.nodeIds).toEqual(["Base", "Flap"]);
  });

  it("applies order hints only to ties and rejects hints that contradict plane tests", () => {
    const { frame } = frameOf(crossing);
    const coplanar: SpatialSurface[] = [{ nodeId: "A" }, { nodeId: "B" }];
    const hint = (id: string) => (id === "B" ? 0 : 1);
    const tied = projectSpatialFrame(frame, layer(camera, coplanar), {}, { orderHint: hint });
    expect(order(tied.frame)).toEqual(["B", "A"]);
    expect(order(projectSpatialFrame(frame, layer(camera, coplanar)).frame)).toEqual(["A", "B"]);

    const behind: SpatialSurface[] = [{ nodeId: "A" }, { nodeId: "B", transform: { position: { x: 0, y: 0, z: 200 } } }];
    const rejected = projectSpatialFrame(frame, layer(camera, behind), {}, { orderHint: (id) => (id === "A" ? 0 : 1) });
    expect(order(rejected.frame)).toEqual(["B", "A"]);
    expect(codes(rejected)).toEqual(["SPATIAL_ORDER_HINT_REJECTED"]);
  });
});

describe("space.planarSeams: scene wiring", () => {
  it("projects declared seams on AnimationRuntime evaluate", () => {
    const source = `scene "cross" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle A { position (100, 100); size (200, 100); fill #ff0000; };
rectangle B { position (100, 100); size (200, 100); fill #0000ff; };
spatialLayer L {
  camera { projection perspective; position (${camera.position!.x}, ${camera.position!.y}, ${camera.position!.z}); yaw ${camera.yaw}; pitch ${camera.pitch ?? 0}; };
  surface A { pivot (200, 150, 0); rotation (0, 0.5, 0); };
  surface B { pivot (200, 150, 0); rotation (0, -0.5, 0); };
  seams { maxFragments 8; };
};
complete;`;
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(compiled.scene!.requiredCapabilities).toContain("space.planarSeams");
    const runtime = new AnimationRuntime(compiled.scene!);
    const frame = runtime.evaluate(0);
    expect(order(frame).sort()).toEqual(["A", "A", "B", "B"]);
    expect(runtime.lastDiagnostics.some((d) => d.message.includes("SPATIAL_SURFACES_SPLIT"))).toBe(true);
  });
});
