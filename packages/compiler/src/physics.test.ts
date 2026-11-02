import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 3s;};`;
const nodes = `circle Marble { position (120, 40); radius 14; fill #3366ff; };
rectangle Floor { position (200, 280); size (360, 20); fill #4a5568; };
rectangle A { position (100, 100); size (20, 20); fill #111111; };
rectangle B { position (160, 100); size (20, 20); fill #222222; };`;

function compile(body: string) {
  return compileMotionScript(`${header}\n${nodes}\n${body}\ncomplete;`);
}

const enabled = ["physics.planar2d"];

const dynamicSource = `physics bowl {
  mode dynamic;
  gravity (0, 980);
  seed 1;
  body marble {
    entity Marble;
    kind dynamic;
    position (120, 40);
    mass 1;
    restitution 0.35;
    friction 0.2;
    collider circle 14;
  };
  body floor {
    entity Floor;
    kind static;
    position (200, 280);
    collider aabb 180 10;
  };
  joint link {
    a marble;
    b floor;
    restLength 200;
    compliance 0.2;
  };
};`;

describe("physics declarations (MotionScript 0.13.0 physics.planar2d)", () => {
  it("lowers a dynamic world with bodies and joints into Scene IR", () => {
    const result = compile(dynamicSource);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("physics.planar2d");
    expect(scene.physics).toMatchObject({
      id: "bowl",
      mode: "dynamic",
      gravity: { x: 0, y: 980 },
      seed: 1,
      bodies: [
        {
          id: "marble",
          entityId: "Marble",
          kind: "dynamic",
          x: 120,
          y: 40,
          mass: 1,
          restitution: 0.35,
          friction: 0.2,
          collider: { kind: "circle", radius: 14 },
        },
        {
          id: "floor",
          entityId: "Floor",
          kind: "static",
          x: 200,
          y: 280,
          collider: { kind: "aabb", halfWidth: 180, halfHeight: 10 },
        },
      ],
      joints: [{ id: "link", bodyA: "marble", bodyB: "floor", restLength: 200, compliance: 0.2 }],
    });
    expect(validateSceneIR(scene).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled }).ok).toBe(true);
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);

    const ops = result.deltas.flatMap((delta) => delta.operations);
    const created = ops.filter((op) => op.op === "CREATE_SCENE").at(-1);
    expect(created && created.op === "CREATE_SCENE" ? created.scene.physics : undefined).toEqual(scene.physics);
  });

  it("lowers authored constraints and angle tokens", () => {
    const result = compile(`physics rods {
      mode authored;
      constraint rod {
        a A;
        b B;
        restLength 40;
        stiffness 1;
      };
    };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.scene!.physics).toEqual({
      id: "rods",
      mode: "authored",
      bodies: [],
      constraints: [{ id: "rod", a: "A", b: "B", restLength: 40, stiffness: 1 }],
    });
    expect(validateSceneIR(result.scene!).ok).toBe(true);
  });

  it("rejects physics without the capability and enforces validation bounds", () => {
    const scene = compile(dynamicSource).scene!;
    const withoutCapability: SceneIR = { ...scene, requiredCapabilities: [] };
    const missing = validateSceneIR(withoutCapability);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("physics.planar2d"))).toBe(true);

    const world = scene.physics!;
    const withWorld = (patch: Record<string, unknown>) =>
      validateSceneIR({ ...scene, physics: { ...world, ...patch } } as SceneIR).ok;
    expect(withWorld({})).toBe(true);
    expect(withWorld({ extra: 1 })).toBe(false);
    expect(withWorld({ mode: "soft" })).toBe(false);
    expect(withWorld({ bodies: [] })).toBe(false);
    expect(withWorld({ bodies: [{ ...world.bodies[0]!, collider: { kind: "circle", radius: 0 } }] })).toBe(false);
    expect(
      withWorld({
        joints: [{ id: "bad", bodyA: "missing", bodyB: "marble", restLength: 10 }],
      }),
    ).toBe(false);
  });

  it("reports compile diagnostics, forward references and frozen worlds", () => {
    const twice = compile(`${dynamicSource}\nphysics other { mode dynamic; body marble { entity Marble; kind dynamic; position (0,0); collider circle 1; }; };`);
    expect(twice.diagnostics.some((item) => item.message.includes("only one world"))).toBe(true);

    const forward = compile(`physics bowl {
      mode dynamic;
      body late {
        entity Late;
        kind dynamic;
        position (0, 0);
        collider circle 5;
      };
    };
    circle Late { position (0, 0); radius 5; fill #000000; };`);
    expect(forward.diagnostics).toEqual([]);
    expect(forward.scene!.physics!.bodies[0]!.entityId).toBe("Late");

    const missing = compile(`physics bowl {
      mode dynamic;
      body ghost {
        entity Nope;
        kind dynamic;
        position (0, 0);
        collider circle 5;
      };
    };`);
    expect(missing.diagnostics.some((item) => item.message.includes("Nope"))).toBe(true);

    const frozen = compile(`seal 1s; physics bowl { mode dynamic; body marble { entity Marble; kind dynamic; position (0,0); collider circle 1; }; };`);
    expect(frozen.diagnostics.some((item) => item.message.includes("frozen"))).toBe(true);

    const trackConflict = compile(`${dynamicSource}
    animate Marble.position.x { from 0; to 10; start 0ms; duration 1s; };`);
    expect(trackConflict.diagnostics.some((item) => item.code === "OVERLAPPING_WRITERS" || item.message.includes("physics-owned"))).toBe(true);
  });

  it("keeps older identifiers spelled like physics body words compiling", () => {
    const result = compile(`circle mode { position (10, 10); radius 4; fill #000000; };
    circle body { position (20, 20); radius 4; fill #000000; };
    circle joint { position (30, 30); radius 4; fill #000000; };
    circle collider { position (40, 40); radius 4; fill #000000; };
    physics sim {
      mode dynamic;
      body marble {
        entity Marble;
        kind dynamic;
        position (120, 40);
        collider circle 14;
      };
    };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.scene!.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["mode", "body", "joint", "collider", "Marble"]),
    );
    expect(result.scene!.physics!.id).toBe("sim");
  });
});
