import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};`;
const nodes = `rectangle wall { size (100, 80); fill #3366ff; };
rectangle door { size (40, 80); fill #ff6633; };
circle Dot { position (200, 150); radius 20; fill #3366ff; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

const enabled = ["space.planar25d"];

const layerSource = `spatialLayer orbit {
  camera {
    projection perspective;
    position (200, 150, -1000);
    yaw 0.2;
    pitch -0.1;
    focalLength 1000;
  };
  surface wall {
    position (0, 0, 40);
  };
  surface door {
    parent wall;
    hinge (0, 0) (0, 80) 0.5;
    backface hidden;
  };
};`;

describe("spatialLayer declarations (MotionScript 0.12.0 space.planar25d)", () => {
  it("lowers a spatial layer with camera, surfaces, hinge and backface into Scene IR", () => {
    const result = compile(layerSource);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("space.planar25d");
    expect(scene.spatialLayers).toEqual([
      {
        id: "orbit",
        camera: { projection: "perspective", position: { x: 200, y: 150, z: -1000 }, yaw: 0.2, pitch: -0.1, focalLength: 1000 },
        surfaces: [
          { nodeId: "wall", transform: { position: { x: 0, y: 0, z: 40 } } },
          {
            nodeId: "door",
            parent: "wall",
            transform: { hinge: { from: { x: 0, y: 0 }, to: { x: 0, y: 80 }, angle: 0.5 } },
            backface: "hidden",
          },
        ],
      },
    ]);
    expect(validateSceneIR(scene).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled }).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);

    const ops = result.deltas.flatMap((delta) => delta.operations);
    const created = ops.filter((op) => op.op === "CREATE_SCENE").at(-1);
    expect(created && created.op === "CREATE_SCENE" ? created.scene.spatialLayers : undefined).toEqual(scene.spatialLayers);
  });

  it("lowers every camera and transform property, angle tokens and a back fill", () => {
    const result = compile(`spatialLayer flat {
      camera { projection orthographic; position (0, 0, -500); yaw 10deg; pitch 0.1; roll -0.2; zoom 2; near 5; };
      surface wall { position (1, 2, 3); pivot (4, 5, 6); rotation (0.1, 0.2, 0.3); scale (1, 2, 1); backFill #112233; backface visible; };
      surface door { hinge (0, 0) (0, 80) 90deg; };
    };`);
    expect(result.diagnostics).toEqual([]);
    const layer = result.scene!.spatialLayers![0]!;
    expect(layer.camera.projection).toBe("orthographic");
    expect(layer.camera.yaw).toBeCloseTo((10 * Math.PI) / 180, 12);
    expect(layer.camera).toMatchObject({ pitch: 0.1, roll: -0.2, zoom: 2, near: 5, position: { x: 0, y: 0, z: -500 } });
    const wall = layer.surfaces[0]!;
    expect(wall.transform).toEqual({
      position: { x: 1, y: 2, z: 3 },
      pivot: { x: 4, y: 5, z: 6 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 1, y: 2, z: 1 },
    });
    expect(wall.backFill).toMatchObject({ type: "solid", a: 1 });
    expect(wall.backface).toBe("visible");
    expect(layer.surfaces[1]!.transform!.hinge!.angle).toBeCloseTo(Math.PI / 2, 12);
    expect(validateSceneIR(result.scene!).ok).toBe(true);
  });

  it("rejects spatial layers without the capability and enforces validation bounds", () => {
    const scene = compile(layerSource).scene!;
    const withoutCapability: SceneIR = { ...scene, requiredCapabilities: [] };
    const missing = validateSceneIR(withoutCapability);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("space.planar25d"))).toBe(true);

    const layer = scene.spatialLayers![0]!;
    const withLayer = (patch: Record<string, unknown>) => validateSceneIR({ ...scene, spatialLayers: [{ ...layer, ...patch }] } as SceneIR).ok;
    const withCamera = (patch: Record<string, unknown>) => withLayer({ camera: { ...layer.camera, ...patch } });
    const withSurface = (patch: Record<string, unknown>, index = 0) =>
      withLayer({ surfaces: layer.surfaces.map((surface, at) => (at === index ? { ...surface, ...patch } : surface)) });

    expect(withLayer({})).toBe(true);
    expect(withLayer({ extra: 1 })).toBe(false);
    expect(withLayer({ id: "1bad" })).toBe(false);
    expect(validateSceneIR({ ...scene, spatialLayers: [layer, layer] } as SceneIR).ok).toBe(false);
    expect(validateSceneIR({ ...scene, spatialLayers: "nope" } as unknown as SceneIR).ok).toBe(false);

    expect(withCamera({ projection: "fisheye" })).toBe(false);
    expect(withCamera({ extra: 1 })).toBe(false);
    expect(withCamera({ yaw: Number.POSITIVE_INFINITY })).toBe(false);
    expect(withCamera({ position: { x: 0, y: 0 } })).toBe(false);
    expect(withCamera({ position: { x: 0, y: 0, z: Number.NaN } })).toBe(false);
    expect(withCamera({ focalLength: 0 })).toBe(false);
    expect(withCamera({ focalLength: -10 })).toBe(false);
    expect(withCamera({ zoom: 0 })).toBe(false);
    expect(withCamera({ near: 0 })).toBe(false);
    expect(withLayer({ camera: undefined })).toBe(false);

    expect(withSurface({ nodeId: "Missing" })).toBe(false);
    expect(withSurface({ extra: 1 })).toBe(false);
    expect(withSurface({ parent: "Dot" })).toBe(false);
    expect(withSurface({ parent: "wall" }, 0)).toBe(false);
    expect(withSurface({ backface: "both" })).toBe(false);
    expect(withSurface({ transform: { extra: 1 } })).toBe(false);
    expect(withSurface({ transform: { position: { x: 0, y: 0, z: 0, w: 1 } } })).toBe(false);
    expect(withSurface({ transform: { hinge: { from: { x: 1, y: 1 }, to: { x: 1, y: 1 }, angle: 0.5 } } }, 1)).toBe(false);
    expect(withSurface({ transform: { hinge: { from: { x: 0, y: 0 }, to: { x: 0, y: 80 }, angle: Number.NaN } } }, 1)).toBe(false);
    expect(withSurface({ transform: { hinge: { from: { x: 0, y: 0 }, to: { x: 0, y: 80 }, angle: 1, extra: 1 } } }, 1)).toBe(false);
    expect(withLayer({ surfaces: [layer.surfaces[0], layer.surfaces[0]] })).toBe(false);
    expect(
      withLayer({
        surfaces: [
          { nodeId: "wall", parent: "door" },
          { nodeId: "door", parent: "wall" },
        ],
      }),
    ).toBe(false);

    // A node belongs to at most one layer.
    const second = { ...layer, id: "other", surfaces: [{ nodeId: "wall" }] };
    expect(validateSceneIR({ ...scene, spatialLayers: [layer, second] } as SceneIR).ok).toBe(false);
    // Parents stay inside their own layer.
    const orphan = { id: "other", camera: layer.camera, surfaces: [{ nodeId: "Dot", parent: "wall" }] };
    expect(validateSceneIR({ ...scene, spatialLayers: [layer, orphan] } as SceneIR).ok).toBe(false);

    // At most 1024 surfaces per scene.
    const many = Array.from({ length: 1025 }, (_, index) => ({ nodeId: `n${index}` }));
    const big = validateSceneIR({ ...scene, spatialLayers: [{ id: "big", camera: layer.camera, surfaces: many }] } as SceneIR);
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.diagnostics.some((item) => item.code === "RESOURCE_LIMIT")).toBe(true);
  });

  it("reports compile diagnostics, forward references and frozen layers", () => {
    const codes = (body: string) => compile(body).diagnostics.map((item) => item.code);
    expect(codes(`${layerSource}\n${layerSource}`)).toContain("DUPLICATE_ID");
    expect(codes(`spatialLayer a { camera { projection perspective; }; surface Missing { }; };`)).toContain("UNKNOWN_TARGET");
    expect(compile(`spatialLayer a { camera { projection perspective; }; surface wall { parent Dot; }; surface Dot { }; surface wall { }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { surface wall { }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { zoom 2; }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection fisheye; }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; bogus 1; }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; position (1, 2); }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; }; surface wall { hinge (0, 0) (0, 80); }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; }; surface wall { backface sideways; }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; }; extra { }; };`).ok).toBe(false);
    // The hinge needs distinct points; the compiler reports the validator diagnostic.
    expect(compile(`spatialLayer a { camera { projection perspective; }; surface door { hinge (1, 1) (1, 1) 0.5; }; };`).ok).toBe(false);
    expect(compile(`spatialLayer a { camera { projection perspective; focalLength 0; }; };`).ok).toBe(false);

    // Forward reference: the node arrives after the layer.
    const forward = compileMotionScript(`${header}
spatialLayer a { camera { projection orthographic; }; surface later { }; };
rectangle later { size (10, 10); fill #000000; };
complete;`);
    expect(forward.diagnostics).toEqual([]);
    expect(forward.scene!.spatialLayers![0]!.surfaces[0]!.nodeId).toBe("later");

    const frozen = compileMotionScript(`${header}\n${nodes}\nseal 1s;\n${layerSource}\ncomplete;`);
    expect(frozen.diagnostics.some((item) => item.message.includes("frozen"))).toBe(true);
    expect(frozen.scene!.spatialLayers).toBeUndefined();
  });

  it("keeps older identifiers spelled like spatial body words compiling", () => {
    const result = compile(`circle surface { position (10, 10); radius 4; fill #000000; };
      rectangle hinge { size (4, 4); fill #000000; }; circle projection { radius 2; fill #000000; }; circle yaw { radius 2; fill #000000; };
      circle perspective { radius 2; fill #000000; }; circle backface { radius 2; fill #000000; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities ?? []).not.toContain("space.planar25d");
    expect(result.scene!.spatialLayers).toBeUndefined();
  });
});
