import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { transformPoint, type ResolvedFrame, type SceneIR, type Vec2 } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { hitTest } from "./input";
import { sampleScene } from "./sample";
import {
  orbitCamera,
  projectSpatialFrame,
  projectSurfacePoint,
  surfaceDragDelta,
  unprojectToSurface,
  type SpatialCamera,
  type SpatialLayer,
  type SpatialSurface,
} from "./spatial";

const IVORY = { type: "solid" as const, r: 1, g: 0.97, b: 0.9, a: 1 };
const BLUE = { type: "solid" as const, r: 0.35, g: 0.45, b: 0.7, a: 1 };

function frameOf(source: string, t = 0): { scene: SceneIR; frame: ResolvedFrame } {
  const result = compileMotionScript(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  const scene = result.scene!;
  return { scene, frame: buildResolvedFrame(scene, sampleScene(scene, t), t) };
}

const perspective: SpatialCamera = { projection: "perspective" };
const ortho: SpatialCamera = { projection: "orthographic" };

function layer(camera: SpatialCamera, surfaces: SpatialSurface[]): SpatialLayer[] {
  return [{ id: "L", camera, surfaces }];
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

function pathPoints(frame: ResolvedFrame, nodeId: string): Vec2[] {
  const item = frame.drawItems.find((entry) => entry.nodeId === nodeId)!;
  if (item.geometry.kind === "path") {
    return item.geometry.commands.flatMap((c) => (c.cmd === "M" || c.cmd === "L" ? [transformPoint(item.logicalMatrix, c.x, c.y)] : []));
  }
  if (item.geometry.kind === "polygon") return item.geometry.points.map((p) => transformPoint(item.logicalMatrix, p.x, p.y));
  throw new Error(`unexpected ${item.geometry.kind}`);
}

// ---------------------------------------------------------------------------
// Compatibility: z = 0 under the default cameras is the 2D frame.

describe("default cameras reproduce 2D", () => {
  const source = `scene "flat" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
group Card { position (100, 80); rotation 10deg;
  rectangle Face { size (200, 120); cornerRadius 12; fill #ffeecc; stroke #333333 width 2; };
  text Title { position (100, 60); content "Hi"; fontFamily "sans"; fontSize 24; fill #000000; align center; };
};
circle Dot { position (500, 200); radius 30; fill #ff0000; };
complete;`;

  for (const camera of [perspective, ortho]) {
    it(`${camera.projection}: matrices, geometry and order are unchanged`, () => {
      const { frame } = frameOf(source);
      const result = projectSpatialFrame(frame, layer(camera, frame.drawItems.map((item) => ({ nodeId: item.nodeId }))));
      expect(result.diagnostics).toEqual([]);
      expect(order(result.frame)).toEqual(order(frame));
      result.frame.drawItems.forEach((item, index) => {
        const before = frame.drawItems[index]!;
        expect(item.geometry).toEqual(before.geometry);
        item.logicalMatrix.forEach((value, k) => expect(value).toBeCloseTo(before.logicalMatrix[k]!, 9));
        expect(result.surfaces.get(item.nodeId)!.mode).toBe("affine-exact");
      });
    });
  }

  it("is deterministic", () => {
    const { frame } = frameOf(source);
    const layers = layer(orbitCamera({ target: { x: 320, y: 180, z: 0 }, distance: 900, yaw: 0.4, pitch: -0.2 }),
      frame.drawItems.map((item) => ({ nodeId: item.nodeId })));
    expect(projectSpatialFrame(frame, layers).frame).toEqual(projectSpatialFrame(frame, layers).frame);
  });
});

// ---------------------------------------------------------------------------
// Crane: a two-sided sheet folded along a diagonal hinge.

describe("Crane: two-sided hinged fold", () => {
  // Square sheet 200×200 at (220, 80), split along its diagonal into Base and Flap.
  const source = `scene "crane" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
polygon Base { points ((220, 80), (420, 80), (420, 280)); fill #fff8e6; };
polygon Flap { points ((220, 80), (420, 280), (220, 280)); fill #fff8e6; };
complete;`;
  const hinge = { from: { x: 220, y: 80 }, to: { x: 420, y: 280 } };

  function fold(angle: number, camera: SpatialCamera = perspective) {
    const { frame } = frameOf(source);
    return projectSpatialFrame(frame, layer(camera, [
      { nodeId: "Base", back: { fill: BLUE } },
      { nodeId: "Flap", parent: "Base", transform: { hinge: { ...hinge, angle } }, back: { fill: BLUE } },
    ]));
  }

  it("lifts toward the viewer for a negative hinge angle and paints over the base", () => {
    const half = fold(-Math.PI / 2);
    const flap = half.surfaces.get("Flap")!;
    const base = half.surfaces.get("Base")!;
    expect(flap.depth).toBeLessThan(base.depth);
    expect(order(half.frame)).toEqual(["Base", "Flap"]);
  });

  it("shows the reverse colour once the fold passes 90°", () => {
    expect(fold(-Math.PI / 3).surfaces.get("Flap")!.facing).toBe("front");
    const past = fold((-2 * Math.PI) / 3);
    expect(past.surfaces.get("Flap")!.facing).toBe("back");
    expect(past.frame.drawItems.find((i) => i.nodeId === "Flap")!.appearance.fill).toEqual(BLUE);
    expect(past.frame.drawItems.find((i) => i.nodeId === "Base")!.appearance.fill).toEqual(IVORY_LIKE);
  });

  it("lies exactly mirrored across the crease at 180°, coplanar, on top, and is what is hit", () => {
    const folded = fold(-Math.PI);
    const points = pathPoints(folded.frame, "Flap");
    // Mirror of (220,280) across the diagonal is (420,80).
    const expected = [{ x: 220, y: 80 }, { x: 420, y: 280 }, { x: 420, y: 80 }];
    points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i]!.x, 6);
      expect(p.y).toBeCloseTo(expected[i]!.y, 6);
    });
    expect(folded.surfaces.get("Flap")!.mode).toBe("affine-exact");
    expect(order(folded.frame)).toEqual(["Base", "Flap"]);
    expect(folded.diagnostics).toEqual([]);
    // Over the folded flap (upper-right triangle) the flap is hit; lower-left is now bare table.
    expect(hitTest(folded.frame, { x: 380, y: 110 })?.nodeId).toBe("Flap");
    expect(hitTest(folded.frame, { x: 250, y: 250 })).toBeUndefined();
  });

  it("folding away from the viewer paints the flap under the base", () => {
    const under = fold(Math.PI / 2, orbitCamera({ target: { x: 320, y: 180, z: 0 }, distance: 1000, pitch: 0.5 }));
    expect(under.surfaces.get("Flap")!.depth).toBeGreaterThan(under.surfaces.get("Base")!.depth);
    expect(order(under.frame)).toEqual(["Flap", "Base"]);
  });

  it("an orthographic fold is affine-exact at every angle", () => {
    for (const angle of [-0.3, -1, -2, -3]) {
      const result = fold(angle, { projection: "orthographic", pitch: 0.4, yaw: 0.2 });
      expect(result.surfaces.get("Flap")!.mode).toBe("affine-exact");
      expect(result.frame.drawItems.find((i) => i.nodeId === "Flap")!.geometry.kind).toBe("polygon");
    }
  });
});

const IVORY_LIKE = { type: "solid", r: 1, g: 248 / 255, b: 230 / 255, a: 1 };

// ---------------------------------------------------------------------------
// Home: walls under an orbiting perspective camera, a hinged door, a floor drag.

describe("Home: depth order, back faces and input under projection", () => {
  // Front is declared first, so plain 2D order would paint the back wall over it.
  const source = `scene "home" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle Front { position (220, 100); size (200, 160); fill #d8c8a8; };
rectangle Door { position (290, 180); size (60, 80); fill #6b4a2b; };
rectangle Back { position (220, 100); size (200, 160); fill #b0a080; };
rectangle Left { position (220, 100); size (200, 160); fill #c0b090; };
rectangle Floor { position (220, 100); size (200, 200); fill #e8e0d0; };
complete;`;
  const target = { x: 320, y: 180, z: 100 };

  function house(yaw: number, doorAngle = 0) {
    const { frame } = frameOf(source);
    return projectSpatialFrame(frame, layer(orbitCamera({ target, distance: 900, yaw, pitch: -0.25 }), [
      { nodeId: "Front", back: { fill: BLUE } },
      { nodeId: "Door", parent: "Front", transform: { hinge: { from: { x: 290, y: 180 }, to: { x: 290, y: 260 }, angle: doorAngle } } },
      { nodeId: "Back", transform: { position: { x: 0, y: 0, z: 200 } } },
      // Left wall: rotate the panel about its left edge into depth (z 0…200).
      { nodeId: "Left", transform: { hinge: { from: { x: 220, y: 100 }, to: { x: 220, y: 260 }, angle: -Math.PI / 2 } } },
      // Floor: move the slab's top edge to the wall base, then hinge it into depth (z 0…200).
      { nodeId: "Floor", transform: { hinge: { from: { x: 220, y: 260 }, to: { x: 420, y: 260 }, angle: Math.PI / 2 }, position: { x: 0, y: 160, z: 0 } } },
    ]));
  }

  it("orders by occlusion, not declaration, and the front wall is hit", () => {
    const view = house(0.35);
    const ids = order(view.frame);
    expect(ids.indexOf("Back")).toBeLessThan(ids.indexOf("Front"));
    expect(ids.indexOf("Front")).toBeLessThan(ids.indexOf("Door"));
    expect(view.surfaces.get("Front")!.facing).toBe("front");
    const centre = projectSurfacePoint(view, "Front", { x: 240, y: 120 })!;
    expect(hitTest(view.frame, centre)?.nodeId).toBe("Front");
    const door = projectSurfacePoint(view, "Door", { x: 320, y: 220 })!;
    expect(hitTest(view.frame, door)?.nodeId).toBe("Door");
    expect(view.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
  });

  it("orbiting behind swaps occlusion and shows the front wall's reverse", () => {
    const behind = house(Math.PI - 0.35);
    const ids = order(behind.frame);
    expect(ids.indexOf("Front")).toBeLessThan(ids.indexOf("Back"));
    expect(behind.surfaces.get("Front")!.facing).toBe("back");
    expect(behind.frame.drawItems.find((i) => i.nodeId === "Front")!.appearance.fill).toEqual(BLUE);
    const p = projectSurfacePoint(behind, "Back", { x: 320, y: 140 })!;
    expect(hitTest(behind.frame, p)?.nodeId).toBe("Back");
  });

  it("an opened door swings out of the wall and the wall behind it becomes hittable", () => {
    const closed = house(0.35, 0);
    const open = house(0.35, Math.PI / 2);
    const doorway = projectSurfacePoint(closed, "Front", { x: 335, y: 230 })!;
    expect(hitTest(closed.frame, doorway)?.nodeId).toBe("Door");
    const doorwayOpen = projectSurfacePoint(open, "Front", { x: 335, y: 230 })!;
    expect(hitTest(open.frame, doorwayOpen)?.nodeId).not.toBe("Door");
    expect(open.surfaces.get("Door")!.mode).toBe("projected");
  });

  it("tilted rectangles become projected paths that match the analytic projection", () => {
    const view = house(0.35);
    const back = view.frame.drawItems.find((i) => i.nodeId === "Back")!;
    expect(back.geometry.kind).toBe("path");
    const corners = pathPoints(view.frame, "Back");
    const expected = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 160 }, { x: 0, y: 160 }]
      .map((p) => projectSurfacePoint(view, "Back", { x: 220 + p.x, y: 100 + p.y })!);
    corners.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i]!.x, 6);
      expect(p.y).toBeCloseTo(expected[i]!.y, 6);
    });
  });

  it("unprojection round-trips and in-plane drag deltas are exact on the floor", () => {
    const view = house(0.35);
    const a = { x: 260, y: 140 };
    const b = { x: 380, y: 230 };
    const sa = projectSurfacePoint(view, "Floor", a)!;
    const sb = projectSurfacePoint(view, "Floor", b)!;
    const back = unprojectToSurface(view, "Floor", sa)!;
    expect(back.plane.x).toBeCloseTo(a.x, 6);
    expect(back.plane.y).toBeCloseTo(a.y, 6);
    // Floor local origin is at the rectangle's top-left (220, 100).
    expect(back.local.x).toBeCloseTo(a.x - 220, 6);
    expect(back.local.y).toBeCloseTo(a.y - 100, 6);
    const delta = surfaceDragDelta(view, "Floor", sa, sb)!;
    expect(delta.x).toBeCloseTo(b.x - a.x, 6);
    expect(delta.y).toBeCloseTo(b.y - a.y, 6);
  });
});

// ---------------------------------------------------------------------------
// Echo: depth recession of upright words and a camera dolly.

describe("Echo: depth recession and dolly", () => {
  const source = `scene "echo" {version "0.2"; viewport (640,360); background #2a1840; duration 1s;};
text Call { position (320, 200); content "ECHO"; fontFamily "sans"; fontSize 64; fill #fff4dc; align center; };
text First { position (320, 200); content "ECHO"; fontFamily "sans"; fontSize 64; fill #fff4dc; align center; };
complete;`;
  const f = 1000;
  // scale = f / (f + z): 75% at z = f/0.75 − f.
  const z75 = f / 0.75 - f;

  function words(camera: SpatialCamera) {
    const { frame } = frameOf(source);
    return projectSpatialFrame(frame, layer(camera, [
      { nodeId: "Call" },
      { nodeId: "First", transform: { position: { x: -120, y: -40, z: z75 } } },
    ]));
  }

  it("a deeper word is uniformly smaller, upright, exact and painted behind", () => {
    const result = words(perspective);
    const first = result.frame.drawItems.find((i) => i.nodeId === "First")!;
    expect(result.surfaces.get("First")!.mode).toBe("affine-exact");
    expect(first.geometry.kind).toBe("text");
    expect(first.logicalMatrix[0]).toBeCloseTo(0.75, 9);
    expect(first.logicalMatrix[4]).toBeCloseTo(0.75, 9);
    expect(first.logicalMatrix[1]).toBeCloseTo(0, 9);
    expect(first.logicalMatrix[3]).toBeCloseTo(0, 9);
    expect(order(result.frame)).toEqual(["First", "Call"]);
  });

  it("dollying the camera forward enlarges both by the perspective ratio", () => {
    const dolly = 200;
    const result = words({ projection: "perspective", position: { x: 320, y: 180, z: -f + dolly } });
    const call = result.frame.drawItems.find((i) => i.nodeId === "Call")!;
    const first = result.frame.drawItems.find((i) => i.nodeId === "First")!;
    expect(call.logicalMatrix[0]).toBeCloseTo(f / (f - dolly), 9);
    expect(first.logicalMatrix[0]).toBeCloseTo(f / (f + z75 - dolly), 9);
  });

  it("text on a tilted plane uses an affine tangent and says so", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [
      { nodeId: "Call", transform: { rotation: { y: 0.6 }, pivot: { x: 320, y: 200, z: 0 } } },
    ]));
    expect(result.surfaces.get("Call")!.mode).toBe("affine-approx");
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_AFFINE_APPROXIMATION"]);
    expect(result.frame.drawItems.find((i) => i.nodeId === "Call")!.geometry.kind).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// Bounds, culling and failure cases.

describe("bounds and failure cases", () => {
  const source = `scene "bounds" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle A { position (100, 100); size (200, 100); fill #ff0000; stroke #000000 width 4; };
rectangle B { position (100, 100); size (200, 100); fill #0000ff; };
complete;`;

  it("culls a surface crossing the near plane, so it neither paints nor hits", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A", transform: { position: { x: 0, y: 0, z: -1200 } } }]));
    expect(order(result.frame)).toEqual(["B"]);
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_NEAR_CULLED"]);
    expect(result.surfaces.get("A")!.culled).toBe("near");
    expect(unprojectToSurface(result, "A", { x: 200, y: 150 })).toBeUndefined();
  });

  it("hidden back faces neither paint nor hit", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [
      { nodeId: "B", backface: "hidden", transform: { rotation: { y: Math.PI }, pivot: { x: 200, y: 150, z: 0 } } },
    ]));
    expect(order(result.frame)).toEqual(["A"]);
    expect(hitTest(result.frame, { x: 200, y: 150 })?.nodeId).toBe("A");
  });

  it("projected strokes scale with the local area factor", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [
      { nodeId: "A", transform: { position: { x: 0, y: 0, z: 1000 }, rotation: { x: 0.3 }, pivot: { x: 200, y: 150, z: 0 } } },
    ]));
    const a = result.frame.drawItems.find((i) => i.nodeId === "A")!;
    expect(a.geometry.kind).toBe("path");
    expect(a.appearance.stroke!.width).toBeGreaterThan(1.5);
    expect(a.appearance.stroke!.width).toBeLessThan(2.2);
  });

  it("fails closed over the surface limit", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A" }, { nodeId: "B" }]), { maxSurfaces: 1 });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_LIMIT_EXCEEDED"]);
    expect(result.frame.drawItems).toEqual([]);
  });

  it("fails closed over the per-surface vertex limit", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A" }, { nodeId: "B" }]), { maxVerticesPerSurface: 3 });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_LIMIT_EXCEEDED", "SPATIAL_LIMIT_EXCEEDED"]);
    expect(result.frame.drawItems).toEqual([]);
  });

  it("reports interpenetrating surfaces", () => {
    const { frame } = frameOf(source);
    const result = projectSpatialFrame(frame, layer(orbitCamera({ target: { x: 200, y: 150, z: 0 }, distance: 800, yaw: 0.3 }), [
      { nodeId: "A", transform: { rotation: { y: 0.5 }, pivot: { x: 200, y: 150, z: 0 } } },
      { nodeId: "B", transform: { rotation: { y: -0.5 }, pivot: { x: 200, y: 150, z: 0 } } },
    ]));
    expect(result.diagnostics.map((d) => d.code)).toContain("SPATIAL_SURFACES_INTERSECT");
  });

  it("rejects parent cycles, unknown parents, duplicates and invalid cameras", () => {
    const { frame } = frameOf(source);
    const cyc = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A", parent: "B" }, { nodeId: "B", parent: "A" }]));
    expect(cyc.diagnostics.map((d) => d.code)).toContain("SPATIAL_PARENT_CYCLE");
    expect(cyc.frame.drawItems).toEqual([]);
    const unknown = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A", parent: "Nope" }]));
    expect(unknown.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_UNKNOWN_PARENT"]);
    const dup = projectSpatialFrame(frame, layer(perspective, [{ nodeId: "A" }, { nodeId: "A" }]));
    expect(dup.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_DUPLICATE_SURFACE"]);
    const bad = projectSpatialFrame(frame, layer({ projection: "perspective", focalLength: 0 }, [{ nodeId: "A" }]));
    expect(bad.diagnostics.map((d) => d.code)).toEqual(["SPATIAL_INVALID_CAMERA"]);
    expect(order(bad.frame)).toEqual(["A", "B"]);
  });

  it("sorts inside compositing scopes and keeps the render tree equal to the draw list", () => {
    const scoped = `scene "scoped" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
group Stage { isolated true; opacity 0.9;
  rectangle Near { position (100, 100); size (200, 100); fill #ff0000; };
  rectangle Far { position (100, 100); size (200, 100); fill #0000ff; };
};
circle Caption { position (500, 300); radius 10; fill #000000; };
complete;`;
    const { frame } = frameOf(scoped);
    const result = projectSpatialFrame(frame, layer(perspective, [
      { nodeId: "Stage.Near" },
      { nodeId: "Stage.Far", transform: { position: { x: 0, y: 0, z: 300 } } },
    ]));
    expect(order(result.frame)).toEqual(["Stage.Far", "Stage.Near", "Caption"]);
    expect(treeOrder(result.frame)).toEqual(order(result.frame));
    expect(hitTest(result.frame, { x: 200, y: 150 })?.nodeId).toBe("Stage.Near");
  });
});
