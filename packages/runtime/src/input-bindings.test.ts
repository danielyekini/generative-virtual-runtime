import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { transformPoint, type ResolvedFrame, type SceneIR, type Vec2 } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { createSceneInputSession, declaredInputChannels, logicalPointFromCss } from "./input";
import { AnimationRuntime } from "./runtime";
import { sampleScene } from "./sample";
import { projectSpatialFrame, projectSurfacePoint } from "./spatial";
import { layersFromScene } from "./spatial-scene";
import { StreamingRuntime } from "./streaming";

const source = `scene "lesson" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};
group Board { position (100, 50); scale (2, 2); rotation 90deg;
  circle Dot { position (10, 10); radius 6; fill #ff8800; };
};
rectangle Toggle { position (20, 240); size (60, 30); fill #3366ff; };
rectangle Lamp { position (300, 240); size (30, 30); fill #ffcc00; opacity 0.2; };
interact Board.Dot { focusable true; on drag dragTranslate (-50, -50) (50, 50); };
interact Toggle { focusable true; on click toggle Lamp.opacity 1 0.2; };
animate Board.rotation { from 1.5707963267948966; to 1.5707963267948966; duration 4s; };
complete;`;

function compiled(): SceneIR {
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  return result.scene!;
}

function at(frame: ResolvedFrame, nodeId: string, local: Vec2): Vec2 {
  const item = frame.drawItems.find((entry) => entry.nodeId === nodeId)!;
  return transformPoint(item.logicalMatrix, local.x, local.y);
}

describe("scene-declared interactions (Scene IR 0.10.0 input.bindings)", () => {
  it("drives declared bindings through AnimationRuntime with parent-space drag", () => {
    const scene = compiled();
    expect([...declaredInputChannels(scene.interactions)].sort()).toEqual([
      "Board.Dot:transform.position.x",
      "Board.Dot:transform.position.y",
      "Lamp:opacity",
    ]);
    const runtime = new AnimationRuntime(scene);
    const session = createSceneInputSession(scene);
    const overlay = session.applyTo.bind(session);
    const frame = (t: number) => runtime.evaluate(t, overlay);
    expect(session.state()).toEqual({
      "Board.Dot:transform.position.x": 10,
      "Board.Dot:transform.position.y": 10,
      "Lamp:opacity": 0.2,
    });

    const start = at(frame(0), "Board.Dot", { x: 0, y: 0 });
    session.process({ type: "pointerdown", sceneTimeMs: 0, pointerId: 1, x: start.x, y: start.y }, frame(0));
    // Board is rotated 90° and scaled 2×: a +20 viewport x move is −10 parent-space y.
    const moved = session.process(
      { type: "pointermove", sceneTimeMs: 16, pointerId: 1, x: start.x + 20, y: start.y },
      frame(16),
    );
    expect(moved.filter((signal) => signal.type === "write")).toEqual([
      { type: "write", entityId: "Board.Dot", channel: "transform.position.y", value: expect.closeTo(0, 9) },
    ]);
    session.process({ type: "pointerup", sceneTimeMs: 32, pointerId: 1, x: start.x + 20, y: start.y }, frame(32));
    // The dot now paints exactly under the released pointer.
    const after = at(frame(32), "Board.Dot", { x: 0, y: 0 });
    expect(after.x).toBeCloseTo(start.x + 20, 6);
    expect(after.y).toBeCloseTo(start.y, 6);

    const toggle = at(frame(40), "Toggle", { x: 30, y: 15 });
    session.process({ type: "pointerdown", sceneTimeMs: 40, pointerId: 1, x: toggle.x, y: toggle.y }, frame(40));
    session.process({ type: "pointerup", sceneTimeMs: 40, pointerId: 1, x: toggle.x, y: toggle.y }, frame(40));
    expect(frame(41).drawItems.find((item) => item.nodeId === "Lamp")!.opacity).toBe(1);
    // Keyboard activation reaches the same binding.
    session.process({ type: "keydown", sceneTimeMs: 50, key: "Enter" }, frame(50));
    expect(frame(51).drawItems.find((item) => item.nodeId === "Lamp")!.opacity).toBe(0.2);
    // Without the overlay the authored scene is unchanged.
    expect(runtime.evaluate(51).drawItems.find((item) => item.nodeId === "Lamp")!.opacity).toBe(0.2);
  });

  it("delivers interactions through streamed compiler deltas", () => {
    const result = compileMotionScript(source);
    const streaming = new StreamingRuntime();
    for (const delta of result.deltas) {
      streaming.enqueue(delta);
      for (const outcome of streaming.flushCommands()) expect(outcome.ok).toBe(true);
    }
    expect(streaming.scene?.interactions).toEqual(result.scene!.interactions);
    expect(streaming.scene?.requiredCapabilities).toContain("input.bindings");
  });

  it("applies input overlays to the sealed streaming sample", () => {
    const result = compileMotionScript(source.replace("complete;", "seal 1s;\ncomplete;"));
    const streaming = new StreamingRuntime();
    for (const delta of result.deltas) {
      if (delta.operations.some(op => op.op === "COMPLETE_PROGRAM")) continue;
      streaming.enqueue(delta); streaming.flushCommands();
    }
    const session = createSceneInputSession(streaming.scene!);
    let overlayTime = -1;
    const frame = (time: number) => streaming.evaluate(time, (sampled, boundedTime) => {
      overlayTime = boundedTime;
      return session.applyTo(sampled, boundedTime);
    });
    const toggle = at(frame(0), "Toggle", { x: 30, y: 15 });
    session.process({ type: "pointerdown", sceneTimeMs: 0, pointerId: 1, x: toggle.x, y: toggle.y }, frame(0));
    session.process({ type: "pointerup", sceneTimeMs: 0, pointerId: 1, x: toggle.x, y: toggle.y }, frame(0));
    expect(frame(9000).drawItems.find(item => item.nodeId === "Lamp")!.opacity).toBe(1);
    expect(overlayTime).toBe(1000);
    expect(streaming.evaluate(9000).drawItems.find(item => item.nodeId === "Lamp")!.opacity).toBe(0.2);
  });

  it("maps CSS pointer positions through the renderer contain fit", () => {
    // 400×300 viewport in an 800×800 box: scale 2, letterbox 100px top.
    expect(logicalPointFromCss({ width: 400, height: 300 }, 800, 800, 0, 100)).toEqual({ x: 0, y: 0 });
    expect(logicalPointFromCss({ width: 400, height: 300 }, 800, 800, 400, 400)).toEqual({ x: 200, y: 150 });
  });

  it("uses surfaceDragDelta for dragTranslate on projected spatial surfaces", () => {
    const result = compileMotionScript(`scene "floor" {
  version "0.2"; viewport (640, 360); background #ffffff; duration 1s; requires "space.planar25d";
};
rectangle Floor { position (220, 100); size (200, 200); fill #e0d6c0; };
spatialLayer room {
  camera { projection perspective; position (320, 180, -1000); yaw 0.4; pitch -0.5; focalLength 1000; };
  surface Floor { hinge (220, 260) (420, 260) 90deg; position (0, 160, 0); };
};
interact Floor { on drag dragTranslate (-400, -400) (400, 400); };
complete;`);
    expect(result.diagnostics).toEqual([]);
    const scene = result.scene!;
    const runtime = new AnimationRuntime(scene);
    const session = createSceneInputSession(scene);
    const overlay = session.applyTo.bind(session);
    const frame = (t: number) => runtime.evaluate(t, overlay);
    const layout = buildResolvedFrame(scene, sampleScene(scene, 0), 0);
    const projected = projectSpatialFrame(layout, layersFromScene(scene));
    const start = projectSurfacePoint(projected, "Floor", { x: 320, y: 180 })!;
    const end = projectSurfacePoint(projected, "Floor", { x: 360, y: 180 })!;
    session.process({ type: "pointerdown", sceneTimeMs: 0, pointerId: 1, x: start.x, y: start.y }, frame(0));
    const before = session.state();
    const moved = session.process(
      { type: "pointermove", sceneTimeMs: 16, pointerId: 1, x: end.x, y: end.y },
      frame(16),
    );
    const after = session.state();
    expect(moved.some((signal) => signal.type === "write")).toBe(true);
    // Exact plane delta along +x (~40), not the foreshortened viewport dx.
    expect(after["Floor:transform.position.x"]).toBeCloseTo((before["Floor:transform.position.x"] ?? 0) + 40, 6);
    expect(after["Floor:transform.position.x"]).not.toBeCloseTo(
      (before["Floor:transform.position.x"] ?? 0) + (end.x - start.x),
      1,
    );
  });
});
