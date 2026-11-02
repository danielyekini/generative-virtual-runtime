import { describe, expect, it } from "vitest";
import {
  PHYSICS_CHANNELS,
  PhysicsSession,
  solveAuthoredConstraints,
  type PhysicsBody,
  type PhysicsOwnership,
} from "./physics";

function ball(id: string, overrides: Partial<PhysicsBody> = {}): PhysicsBody {
  return {
    id,
    kind: "dynamic",
    x: 0,
    y: 0,
    angle: 0,
    vx: 0,
    vy: 0,
    omega: 0,
    mass: 1,
    restitution: 0.2,
    friction: 0.4,
    collider: { kind: "circle", radius: 10 },
    ...overrides,
  };
}

function ground(id: string, y: number): PhysicsBody {
  return {
    id,
    kind: "static",
    x: 0,
    y,
    angle: 0,
    vx: 0,
    vy: 0,
    omega: 0,
    mass: 0,
    restitution: 0.1,
    friction: 0.5,
    collider: { kind: "aabb", halfWidth: 400, halfHeight: 10 },
  };
}

describe("solveAuthoredConstraints", () => {
  it("pulls endpoints to rest length without introducing velocity state", () => {
    const points = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 100, y: 0 }],
    ]);
    const next = solveAuthoredConstraints(points, [{ id: "rod", a: "a", b: "b", restLength: 40 }], 8);
    const a = next.get("a")!;
    const b = next.get("b")!;
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(40, 5);
  });
});

describe("PhysicsSession", () => {
  it("exposes the physics channel set used for ownership writes", () => {
    expect(PHYSICS_CHANNELS).toEqual(["transform.x", "transform.y", "transform.rotation"]);
  });

  it("integrates gravity onto a dynamic body and writes physics-owned channels", () => {
    const owned: PhysicsOwnership = () => true;
    const session = new PhysicsSession({ ownership: owned, gravity: { x: 0, y: 980 }, fixedDtMs: 1000 / 60 });
    expect(session.addBody(ball("m", { x: 50, y: 10 }))).toBeUndefined();
    const writes = session.advance(1000 / 60);
    const y = writes.find((w) => w.entityId === "m" && w.channel === "transform.y")!;
    expect(y.value).toBeGreaterThan(10);
    expect(session.cost.steps).toBe(1);
    expect(session.body("m")!.vy).toBeGreaterThan(0);
  });

  it("rejects writes when ownership denies physics", () => {
    const ownership: PhysicsOwnership = (_e, channel) => channel !== "transform.y";
    const session = new PhysicsSession({ ownership, gravity: { x: 0, y: 0 } });
    session.addBody(ball("m", { x: 1, y: 2 }));
    const writes = session.advance(0);
    expect(writes.some((w) => w.channel === "transform.y")).toBe(false);
    expect(writes.some((w) => w.channel === "transform.x")).toBe(true);
    expect(session.lastDiagnostics.some((d) => d.code === "PHYSICS_OWNERSHIP_REJECTED")).toBe(true);
  });

  it("resolves circle-on-ground contact so the ball rests above the floor", () => {
    const session = new PhysicsSession({ gravity: { x: 0, y: 980 }, fixedDtMs: 1000 / 60, maxStepsPerAdvance: 16 });
    session.addBody(ball("m", { x: 0, y: 50, restitution: 0.05 }));
    session.addBody(ground("floor", 100));
    for (let t = 0; t < 2000; t += 1000 / 60) session.advance(t + 1000 / 60);
    const y = session.body("m")!.y;
    // Floor top ≈ 90, ball radius 10 → rest near 80.
    expect(y).toBeGreaterThan(70);
    expect(y).toBeLessThan(95);
  });

  it("keeps a distance joint near rest length", () => {
    const session = new PhysicsSession({ gravity: { x: 0, y: 0 }, fixedDtMs: 1000 / 60 });
    session.addBody(ball("a", { x: 0, y: 0 }));
    session.addBody(ball("b", { x: 80, y: 0 }));
    expect(session.addJoint({ id: "link", bodyA: "a", bodyB: "b", restLength: 40 })).toBeUndefined();
    session.advance(500);
    const a = session.body("a")!;
    const b = session.body("b")!;
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(50);
  });

  it("promotes a dragged body to kinematic and restores kind on endDrag", () => {
    const session = new PhysicsSession({ gravity: { x: 0, y: 980 } });
    session.addBody(ball("m", { x: 0, y: 0 }));
    session.beginDrag("m", 0);
    expect(session.body("m")!.kind).toBe("kinematic");
    session.dragTo("m", 40, 20, 16);
    expect(session.body("m")!.x).toBe(40);
    expect(session.body("m")!.y).toBe(20);
    session.endDrag("m", 32);
    expect(session.body("m")!.kind).toBe("dynamic");
    expect(session.eventLog.map((e) => e.type)).toEqual(["beginDrag", "dragTo", "endDrag"]);
  });

  it("checkpoint + restore + replay matches a continuous run", () => {
    const build = () => {
      const session = new PhysicsSession({ gravity: { x: 0, y: 980 }, fixedDtMs: 1000 / 60, seed: 7 });
      session.addBody(ball("m", { x: 10, y: 0 }));
      session.addBody(ground("floor", 200));
      return session;
    };
    const continuous = build();
    continuous.advance(100);
    const snap = continuous.checkpoint();
    continuous.applyForce("m", 200, 0, 100);
    continuous.advance(400);
    const expected = continuous.body("m")!;
    const log = [...continuous.eventLog];

    const restored = build();
    restored.restore(snap);
    restored.replayFrom(log, 400);
    const got = restored.body("m")!;
    expect(got.x).toBeCloseTo(expected.x, 4);
    expect(got.y).toBeCloseTo(expected.y, 4);
    expect(got.vx).toBeCloseTo(expected.vx, 4);
    expect(got.vy).toBeCloseTo(expected.vy, 4);
  });

  it("clamps oversized advances and reports PHYSICS_STEP_CLAMP", () => {
    const session = new PhysicsSession({ maxStepsPerAdvance: 2, fixedDtMs: 16 });
    session.addBody(ball("m"));
    session.advance(1000);
    expect(session.lastDiagnostics.some((d) => d.code === "PHYSICS_STEP_CLAMP")).toBe(true);
    expect(session.cost.steps).toBe(2);
  });

  it("enforces body limits and dispose", () => {
    const session = new PhysicsSession({ maxBodies: 1 });
    expect(session.addBody(ball("a"))).toBeUndefined();
    expect(session.addBody(ball("b"))?.code).toBe("PHYSICS_BODY_LIMIT");
    session.dispose();
    expect(() => session.advance(16)).toThrow(/disposed/);
  });

  it("adopts planar XY only (surfaceId is presentation metadata)", () => {
    const session = new PhysicsSession({ gravity: { x: 0, y: 0 } });
    session.addBody(ball("panel", { x: 5, y: 9, surfaceId: "door" }));
    expect(session.body("panel")!.surfaceId).toBe("door");
    expect(session.body("panel")!.x).toBe(5);
    expect(session.body("panel")!.y).toBe(9);
  });
});
