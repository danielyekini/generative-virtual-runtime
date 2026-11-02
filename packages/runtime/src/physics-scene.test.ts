import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "./runtime";
import { createScenePhysicsSession, declaredPhysicsChannels } from "./physics-scene";
import { sampleScene } from "./sample";

const marbleSource = `scene "physics-marble" {
  version "0.2";
  viewport (400, 300);
  background #eef2f7;
  duration 3s;
  requires "physics.planar2d";
};
circle Marble {
  position (120, 40);
  radius 14;
  fill #3366ff;
};
rectangle Floor {
  position (200, 280);
  size (360, 20);
  fill #4a5568;
};
physics bowl {
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
};
complete;`;

const authoredSource = `scene "rods" {
  version "0.2";
  viewport (400, 300);
  background #ffffff;
  duration 1s;
  requires "physics.planar2d";
};
rectangle A { position (100, 100); size (10, 10); fill #111111; };
rectangle B { position (200, 100); size (10, 10); fill #222222; };
physics rods {
  mode authored;
  constraint rod {
    a A;
    b B;
    restLength 40;
    stiffness 1;
  };
};
complete;`;

describe("scene-declared physics (Scene IR 0.13.0 physics.planar2d)", () => {
  it("advances declared bodies on evaluate overlay and exposes physics diagnostics", () => {
    const result = compileMotionScript(marbleSource);
    expect(result.diagnostics).toEqual([]);
    const scene = result.scene!;
    expect([...declaredPhysicsChannels(scene.physics)].sort()).toEqual([
      "Floor:transform.position.x",
      "Floor:transform.position.y",
      "Floor:transform.rotation",
      "Marble:transform.position.x",
      "Marble:transform.position.y",
      "Marble:transform.rotation",
    ]);

    const physics = createScenePhysicsSession(scene)!;
    const runtime = new AnimationRuntime(scene);
    const dt = 1000 / 60;
    physics.advance(sampleScene(scene, 0), dt);
    let appliedY = 0;
    runtime.evaluate(dt, (sampled) => {
      const applied = physics.applyTo(sampled);
      appliedY = applied.nodes.find((node) => node.id === "Marble")!.transform.position.y;
      return applied;
    });
    expect(appliedY).toBeGreaterThan(40);
    expect(physics.session!.body("marble")!.vy).toBeGreaterThan(0);

    // Seek via checkpoint + restore stays deterministic with the same event log.
    const snap = physics.session!.checkpoint();
    physics.advance(sampleScene(scene, dt), dt * 2);
    const midY = physics.session!.body("marble")!.y;
    physics.session!.restore(snap);
    physics.advance(sampleScene(scene, dt), dt * 2);
    expect(physics.session!.body("marble")!.y).toBeCloseTo(midY, 10);
    physics.dispose();
  });

  it("solves authored constraints onto entity positions", () => {
    const scene = compileMotionScript(authoredSource).scene!;
    const physics = createScenePhysicsSession(scene)!;
    expect(physics.mode).toBe("authored");
    const sampled = sampleScene(scene, 0);
    const writes = physics.advance(sampled, 0);
    const applied = physics.applyTo(sampled);
    const a = applied.nodes.find((node) => node.id === "A")!;
    const b = applied.nodes.find((node) => node.id === "B")!;
    expect(Math.hypot(b.transform.position.x - a.transform.position.x, b.transform.position.y - a.transform.position.y)).toBeCloseTo(
      40,
      4,
    );
    expect(writes.some((write) => write.entityId === "A" && write.channel === "transform.position.x")).toBe(true);
    physics.dispose();
  });

  it("hands drag to kinematic pose then restores dynamic ownership writes", () => {
    const scene = compileMotionScript(marbleSource).scene!;
    const physics = createScenePhysicsSession(scene)!;
    const session = physics.session!;
    expect(session.beginDrag("marble")).toBeUndefined();
    expect(session.body("marble")!.kind).toBe("kinematic");
    expect(session.dragTo("marble", 150, 60)).toBeUndefined();
    expect(session.body("marble")!.x).toBe(150);
    expect(session.body("marble")!.y).toBe(60);
    expect(session.endDrag("marble")).toBeUndefined();
    expect(session.body("marble")!.kind).toBe("dynamic");
    const writes = session.advance(1000 / 60);
    expect(writes.some((write) => write.entityId === "Marble" && write.channel === "transform.position.x")).toBe(true);
    physics.dispose();
  });
});
