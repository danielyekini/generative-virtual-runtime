import { describe, expect, it } from "vitest";
import {
  acceptScene,
  applyEasing,
  migrateSceneTo02,
  transformPoint,
  validateSceneIR,
  type NodeDefinition,
  type SceneIR,
  type TrackDefinition,
  type Vec2,
} from "@gvr/schema";
import { HIERARCHY, sceneById } from "../../../fixtures/runtime-scenes";
import { AnimationRuntime } from "./runtime";
import { RuntimeClock } from "./clock";
import { sampleScene } from "./sample";

function origin(frame: ReturnType<AnimationRuntime["evaluate"]>, id: string): Vec2 {
  const item = frame.drawItems.find((entry) => entry.nodeId === id);
  if (!item) throw new Error(`missing ${id}`);
  return transformPoint(item.logicalMatrix, 0, 0);
}

function localPoint(frame: ReturnType<AnimationRuntime["evaluate"]>, id: string, x: number, y: number): Vec2 {
  const item = frame.drawItems.find((entry) => entry.nodeId === id);
  if (!item) throw new Error(`missing ${id}`);
  return transformPoint(item.logicalMatrix, x, y);
}

/** Independent of localMatrix. Child transform is applied before its parent. */
function mapLocal(
  transform: { position: Vec2; pivot: Vec2; rotation: number; scale: Vec2 },
  x: number,
  y: number,
): Vec2 {
  const lx = (x - transform.pivot.x) * transform.scale.x;
  const ly = (y - transform.pivot.y) * transform.scale.y;
  const c = Math.cos(transform.rotation);
  const s = Math.sin(transform.rotation);
  return {
    x: transform.position.x + transform.pivot.x + lx * c - ly * s,
    y: transform.position.y + transform.pivot.y + lx * s + ly * c,
  };
}

function chain(
  transforms: { position: Vec2; pivot: Vec2; rotation: number; scale: Vec2 }[],
  x: number,
  y: number,
): Vec2 {
  let point = { x, y };
  for (const transform of transforms) point = mapLocal(transform, point.x, point.y);
  return point;
}

const unit = { x: 1, y: 1 };
const zero = { x: 0, y: 0 };

function bare(
  nodes: NodeDefinition[],
  tracks: TrackDefinition[] = [],
  steps: SceneIR["timeline"]["steps"] = [],
  durationMs = 4000,
): SceneIR {
  return {
    irVersion: "0.1",
    sceneId: "bare",
    viewport: { width: 1280, height: 720, fit: "contain" },
    background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    cameras: [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs, tracks, steps },
    nodes,
  };
}

function box(x: number, y = 0, opacity = 1, visible = true): NodeDefinition {
  return {
    id: "box",
    name: "box",
    parentId: null,
    space: "world",
    kind: "rectangle",
    zIndex: 0,
    transform: {
      position: { x, y },
      pivot: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    opacity,
    visible,
    size: { x: 10, y: 10 },
    fill: { type: "solid", r: 1, g: 0, b: 0, a: 1 },
  };
}

describe("runtime scenes", () => {
  it("accepts every hand-authored scene", () => {
    for (const id of ["hierarchy", "slide", "easing", "vec2", "keyframes", "expression", "fallback", "camera"]) {
      const result = validateSceneIR(sceneById(id));
      expect(result.ok, result.ok ? "" : result.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    }
  });
});

describe("hierarchy", () => {
  const runtime = new AnimationRuntime(sceneById("hierarchy"));
  const bunny = { position: HIERARCHY.bunny.position, pivot: zero, rotation: HIERARCHY.bunny.rotation, scale: unit };
  const head = { position: HIERARCHY.head.position, pivot: zero, rotation: HIERARCHY.head.rotation, scale: unit };
  const body = { position: HIERARCHY.body.position, pivot: zero, rotation: 0, scale: unit };

  function ear(rotation: number) {
    return { position: HIERARCHY.ear.position, pivot: HIERARCHY.ear.pivot, rotation, scale: unit };
  }

  it("rotates the ear around the joint and keeps the joint fixed", () => {
    const upright = runtime.evaluate(0);
    const turned = runtime.evaluate(1000);
    const expectedJoint = chain(
      [{ position: HIERARCHY.joint.position, pivot: zero, rotation: 0, scale: unit }, head, bunny],
      0,
      0,
    );
    expect(localPoint(upright, "bunny.head.ear", 0, 30)).toEqual(localPoint(upright, "bunny.head.joint", 0, 0));
    expect(origin(upright, "bunny.head.joint")).toEqual(origin(turned, "bunny.head.joint"));
    expect(origin(upright, "bunny.head.joint").x).toBeCloseTo(expectedJoint.x, 6);
    expect(origin(upright, "bunny.head.joint").y).toBeCloseTo(expectedJoint.y, 6);
    const centerUpright = chain([ear(0), head, bunny], 0, 0);
    const centerTurned = chain([ear(Math.PI / 4), head, bunny], 0, 0);
    expect(origin(upright, "bunny.head.ear").x).toBeCloseTo(centerUpright.x, 6);
    expect(origin(upright, "bunny.head.ear").y).toBeCloseTo(centerUpright.y, 6);
    expect(origin(turned, "bunny.head.ear").x).toBeCloseTo(centerTurned.x, 6);
    expect(origin(turned, "bunny.head.ear").y).toBeCloseTo(centerTurned.y, 6);
    expect(Math.hypot(centerTurned.x - centerUpright.x, centerTurned.y - centerUpright.y)).toBeGreaterThan(5);
    expect(origin(upright, "bunny.body").x).toBeCloseTo(chain([body, bunny], 0, 0).x, 6);
    expect(origin(upright, "bunny.body").y).toBeCloseTo(chain([body, bunny], 0, 0).y, 6);
  });
});

describe("numeric animation", () => {
  const runtime = new AnimationRuntime(sceneById("slide"));

  it("interpolates x and holds the end value", () => {
    const at = (ms: number) => origin(runtime.evaluate(ms), "box").x;
    expect(at(0)).toBe(100);
    expect(at(1000)).toBe(300);
    expect(at(2000)).toBe(500);
    expect(at(3000)).toBe(700);
    expect(at(4000)).toBe(900);
    expect(at(5000)).toBe(900);
  });

  it("does not overwrite the authored base", () => {
    const scene = sceneById("slide");
    const before = JSON.stringify(scene);
    new AnimationRuntime(scene).evaluate(2000);
    expect(JSON.stringify(scene)).toBe(before);
    expect(scene.nodes[0]?.transform.position.x).toBe(100);
  });
});

describe("easing", () => {
  const runtime = new AnimationRuntime(sceneById("easing"));

  it("matches the four curves at a quarter and a half", () => {
    const x = (ms: number, id: string) => origin(runtime.evaluate(ms), id).x;
    const trip = (u: number, name: "linear" | "easeIn" | "easeOut" | "easeInOut") => 120 + 880 * applyEasing(name, u);
    for (const name of ["linear", "easeIn", "easeOut", "easeInOut"] as const) {
      expect(x(250, name)).toBeCloseTo(trip(0.25, name), 6);
      expect(x(500, name)).toBeCloseTo(trip(0.5, name), 6);
    }
    expect(x(500, "linear")).toBe(560);
    expect(x(500, "easeIn")).toBe(340);
    expect(x(500, "easeOut")).toBe(780);
    expect(x(500, "easeInOut")).toBe(560);
  });
});

describe("vec2 and keyframes", () => {
  it("interpolates a position vector", () => {
    const frame = new AnimationRuntime(sceneById("vec2")).evaluate(2000);
    expect(origin(frame, "dot")).toEqual({ x: 560, y: 340 });
  });

  it("hits every keyframe boundary and the segment midpoints", () => {
    const runtime = new AnimationRuntime(sceneById("keyframes"));
    const y = (ms: number) => origin(runtime.evaluate(ms), "bob").y;
    expect(y(0)).toBe(500);
    expect(y(1000)).toBe(300);
    expect(y(2000)).toBe(500);
    expect(y(3000)).toBe(350);
    expect(y(4000)).toBe(500);
    expect(y(500)).toBe(400);
    expect(y(1500)).toBe(400);
    expect(y(2500)).toBe(425);
    expect(y(3500)).toBe(425);
  });
});

describe("expressions", () => {
  it("evaluates the hop and a direct seek to 2.375s", () => {
    const runtime = new AnimationRuntime(sceneById("expression"));
    const at = (ms: number) => origin(runtime.evaluate(ms), "bunny.body");
    expect(at(0)).toEqual({ x: 180, y: 500 });
    expect(at(125).y).toBeCloseTo(410, 5);
    expect(at(2500).x).toBe(540);
    expect(at(2500).y).toBeCloseTo(500, 5);
    const u = 2375 / 5000;
    const eased = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
    const sought = at(2375);
    expect(sought.x).toBeCloseTo(180 + 720 * eased, 6);
    expect(sought.y).toBeCloseTo(410, 5);
  });

  it("substitutes the authored base for an invalid sample and keeps the track", () => {
    const scene = sceneById("fallback");
    const runtime = new AnimationRuntime(scene);
    const at = (ms: number) => origin(runtime.evaluate(ms), "box");
    expect(at(0)).toEqual({ x: 80, y: 300 });
    expect(runtime.degraded).toBe(true);
    expect(runtime.lastDiagnostics.some((item) => item.effect === "RUNTIME_DEGRADED")).toBe(true);
    expect(at(250)).toEqual({ x: 60, y: 300 });
    expect(at(500).x).toBe(100);
    expect(at(500).y).toBeCloseTo(300, 6);
    expect(at(1000).x).toBe(120);
    expect(at(1000).y).toBeCloseTo(300 + Math.sqrt(0.5), 6);
    expect(at(0)).toEqual({ x: 80, y: 300 });
    expect(runtime.degraded).toBe(true);
    expect(scene.nodes[0]?.transform.position).toEqual({ x: 100, y: 300 });
  });

  it("does not evaluate an expression before its track starts", () => {
    const runtime = new AnimationRuntime(
      bare(
        [box(5)],
        [
          {
            id: "later",
            kind: "expression",
            target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
            valueType: "number",
            startMs: 1000,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            source: "1 / 0",
            ast: { type: "binary", op: "/", left: { type: "number", value: 1 }, right: { type: "number", value: 0 } },
          },
        ],
      ),
    );
    runtime.evaluate(500);
    expect(runtime.degraded).toBe(false);
    expect(runtime.lastDiagnostics).toEqual([]);
    expect(origin(runtime.evaluate(500), "box").x).toBe(5);
    runtime.evaluate(1000);
    expect(runtime.degraded).toBe(true);
    expect(origin(runtime.evaluate(1000), "box").x).toBe(5);
  });

  it("holds the terminal expression sample, clamped to the track", () => {
    const runtime = new AnimationRuntime(
      bare(
        [box(5)],
        [
          {
            id: "local",
            kind: "expression",
            target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
            valueType: "number",
            startMs: 0,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            source: "local_t",
            ast: { type: "ref", name: "local_t" },
          },
        ],
      ),
    );
    expect(origin(runtime.evaluate(0), "box").x).toBe(0);
    expect(origin(runtime.evaluate(500), "box").x).toBeCloseTo(0.5, 6);
    expect(origin(runtime.evaluate(2000), "box").x).toBeCloseTo(1, 6);
    expect(origin(runtime.evaluate(-100), "box").x).toBe(5);
  });
});

describe("track edges", () => {
  it("lets the later track own a shared endpoint and keeps the other component", () => {
    const runtime = new AnimationRuntime(
      bare(
        [box(0, 0)],
        [
          {
            id: "both",
            kind: "keyframe",
            target: { kind: "node", nodeId: "box", channel: "transform.position" },
            valueType: "vec2",
            startMs: 0,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            keyframes: [
              { offset: 0, value: { x: 0, y: 0 }, easing: "linear" },
              { offset: 1, value: { x: 10, y: 20 } },
            ],
          },
          {
            id: "onlyX",
            kind: "keyframe",
            target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
            valueType: "number",
            startMs: 1000,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            keyframes: [
              { offset: 0, value: 80, easing: "linear" },
              { offset: 1, value: 180 },
            ],
          },
        ],
      ),
    );
    expect(origin(runtime.evaluate(500), "box")).toEqual({ x: 5, y: 10 });
    expect(origin(runtime.evaluate(1000), "box")).toEqual({ x: 80, y: 20 });
    expect(origin(runtime.evaluate(1500), "box")).toEqual({ x: 130, y: 20 });
  });

  it("returns to the base when fill is none", () => {
    const runtime = new AnimationRuntime(
      bare([box(7)], [
        {
          id: "once",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
          valueType: "number",
          startMs: 0,
          durationMs: 1000,
          fill: { before: "none", after: "none" },
          keyframes: [
            { offset: 0, value: 0, easing: "linear" },
            { offset: 1, value: 50 },
          ],
        },
      ]),
    );
    expect(origin(runtime.evaluate(500), "box").x).toBe(25);
    expect(origin(runtime.evaluate(1000), "box").x).toBe(7);
  });

  it("interpolates angles along the numeric path", () => {
    const runtime = new AnimationRuntime(
      bare([box(0)], [
        {
          id: "spin",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.rotation" },
          valueType: "angle",
          startMs: 0,
          durationMs: 1000,
          fill: { before: "none", after: "forwards" },
          keyframes: [
            { offset: 0, value: 0, easing: "linear" },
            { offset: 1, value: Math.PI * 1.5 },
          ],
        },
      ]),
    );
    const frame = runtime.evaluate(500);
    const item = frame.drawItems[0];
    if (!item) throw new Error("missing box");
    const right = transformPoint(item.logicalMatrix, 1, 0);
    const angle = Math.atan2(right.y - 0, right.x - 0);
    expect(angle).toBeCloseTo(Math.PI * 0.75, 6);
    expect(angle).not.toBeCloseTo(-Math.PI * 0.25, 2);
  });
});

describe("visibility, opacity, and camera", () => {
  it("multiplies ancestor opacity and still emits a zero-alpha drawable", () => {
    const child: NodeDefinition = {
      ...box(0),
      id: "group.child",
      name: "child",
      parentId: "group",
      space: undefined,
      opacity: 0.5,
    };
    const runtime = new AnimationRuntime(
      bare(
        [
          {
            id: "group",
            name: "group",
            parentId: null,
            space: "world",
            kind: "group",
            zIndex: 0,
            transform: { position: zero, pivot: zero, rotation: 0, scale: unit },
            opacity: 1,
            visible: true,
          },
          child,
        ],
        [
          {
            id: "fade",
            kind: "keyframe",
            target: { kind: "node", nodeId: "group", channel: "opacity" },
            valueType: "number",
            startMs: 0,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            keyframes: [
              { offset: 0, value: 1, easing: "linear" },
              { offset: 1, value: 0 },
            ],
          },
        ],
      ),
    );
    expect(runtime.evaluate(0).drawItems[0]?.opacity).toBe(0.5);
    expect(runtime.evaluate(500).drawItems[0]?.opacity).toBeCloseTo(0.25, 6);
    const end = runtime.evaluate(1000);
    expect(end.drawItems).toHaveLength(1);
    expect(end.drawItems[0]?.opacity).toBe(0);
  });

  it("hides a subtree with a step and does not let a child step reveal it", () => {
    const runtime = new AnimationRuntime(
      bare(
        [
          {
            id: "group",
            name: "group",
            parentId: null,
            space: "world",
            kind: "group",
            zIndex: 0,
            transform: { position: zero, pivot: zero, rotation: 0, scale: unit },
            opacity: 1,
            visible: true,
          },
          { ...box(0), id: "group.child", name: "child", parentId: "group", space: undefined },
        ],
        [],
        [
          { id: "hide", target: { kind: "node", nodeId: "group", channel: "visible" }, timeMs: 400, value: false },
          { id: "show", target: { kind: "node", nodeId: "group.child", channel: "visible" }, timeMs: 800, value: true },
        ],
      ),
    );
    expect(runtime.evaluate(0).drawItems.map((item) => item.nodeId)).toEqual(["group.child"]);
    expect(runtime.evaluate(399).drawItems).toHaveLength(1);
    expect(runtime.evaluate(400).drawItems).toEqual([]);
    expect(runtime.evaluate(800).drawItems).toEqual([]);
  });

  it("maps the specification camera point and leaves screen space alone", () => {
    const runtime = new AnimationRuntime(sceneById("camera"));
    expect(origin(runtime.evaluate(0), "marker")).toEqual({ x: 840, y: 360 });
    expect(origin(runtime.evaluate(2000), "marker")).toEqual({ x: 1040, y: 360 });
    expect(origin(runtime.evaluate(0), "label")).toEqual({ x: 80, y: 120 });
    expect(origin(runtime.evaluate(2000), "label")).toEqual({ x: 80, y: 120 });
  });
});

describe("seek determinism", () => {
  it("matches playback, a direct seek, and a scrambled order", () => {
    const scene = sceneById("expression");
    const played = new AnimationRuntime(scene);
    const clock = new RuntimeClock();
    clock.play();
    clock.tick(2375);
    const fromPlayback = played.evaluate(clock.timeMs);
    const fromSeek = new AnimationRuntime(scene).evaluate(2375);
    expect(fromPlayback).toEqual(fromSeek);

    const order = [5000, 1000, 4000, 0, 2300];
    const history = new AnimationRuntime(scene);
    const fromHistory = order.map((time) => history.evaluate(time));
    const independent = order.map((time) => new AnimationRuntime(scene).evaluate(time));
    expect(fromHistory).toEqual(independent);

    const again = history.evaluate(2375);
    expect(again).toEqual(fromSeek);
  });

  it("freezes while paused, resumes, and keeps 2× on the same scene time", () => {
    const scene = sceneById("slide");
    const clock = new RuntimeClock();
    clock.play();
    clock.tick(1000);
    expect(clock.timeMs).toBe(1000);
    clock.pause();
    clock.tick(5000);
    expect(clock.timeMs).toBe(1000);
    clock.play();
    clock.tick(250);
    expect(clock.timeMs).toBe(1250);

    const fast = new RuntimeClock();
    fast.play();
    fast.setRate(2);
    fast.tick(1000);
    expect(fast.timeMs).toBe(2000);
    const runtime = new AnimationRuntime(scene);
    expect(runtime.evaluate(fast.timeMs)).toEqual(runtime.evaluate(2000));
    fast.seek(2375);
    expect(runtime.evaluate(fast.timeMs).sceneTimeMs).toBe(2375);
    expect(runtime.evaluate(fast.timeMs)).toEqual(new AnimationRuntime(scene).evaluate(2375));
  });
});

describe("capability profile 0.2", () => {
  const fill = { before: "none" as const, after: "forwards" as const };

  it("keeps migrated 0.1 samples identical, including shuffled seeks", () => {
    const scene = sceneById("slide");
    const migrated = migrateSceneTo02(scene);
    const times = [0, 120, 500, 1000, 2400, 4000];
    for (const time of times) {
      expect(sampleScene(migrated, time).nodes).toEqual(sampleScene(scene, time).nodes);
      expect(sampleScene(migrated, time).camera).toEqual(sampleScene(scene, time).camera);
    }
    const order = [4000, 0, 2400, 120, 500];
    const played = order.map((time) => new AnimationRuntime(migrated).evaluate(time).drawItems);
    const shuffled = order.map((time) => {
      const runtime = new AnimationRuntime(migrated);
      runtime.evaluate(50);
      return runtime.evaluate(time).drawItems;
    });
    expect(shuffled).toEqual(played);
    const frame = new AnimationRuntime(scene).evaluate(0);
    expect(frame.renderTree).toMatchObject({ kind: "scope", id: "root", isolated: false, opacity: 1 });
    if (frame.renderTree?.kind === "scope") expect(frame.renderTree.children).toHaveLength(frame.drawItems.length);
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(true);
  });

  it("applies cubic overshoot, hold, per-component easing, scopes, and composition order", () => {
    const cubic = {
      type: "cubic" as const,
      x1: 0,
      y1: 1.5,
      x2: 1,
      y2: 1.5,
    };
    const over = bare(
      [box(0)],
      [
        {
          id: "x",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
          valueType: "number",
          startMs: 0,
          durationMs: 1000,
          fill,
          keyframes: [
            { offset: 0, value: 0, easing: cubic },
            { offset: 1, value: 10 },
          ],
        },
        {
          id: "y",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.position.y" },
          valueType: "number",
          startMs: 0,
          durationMs: 1000,
          fill,
          keyframes: [
            { offset: 0, value: 0, easing: "linear" },
            { offset: 1, value: 10 },
          ],
        },
      ],
      [],
      1000,
    );
    over.irVersion = "0.2";
    expect(validateSceneIR(over).ok, "cubic scene").toBe(true);
    const mid = origin(new AnimationRuntime(over).evaluate(500), "box");
    expect(mid.x).toBeGreaterThan(10);
    expect(mid.y).toBeCloseTo(5, 6);

    const held = bare(
      [box(3)],
      [
        {
          id: "hold",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
          valueType: "number",
          startMs: 0,
          durationMs: 1000,
          fill,
          keyframes: [
            { offset: 0, value: 0, easing: { type: "hold" } },
            { offset: 1, value: 100 },
          ],
        },
      ],
      [],
      1000,
    );
    held.irVersion = "0.2";
    expect(validateSceneIR(held).ok, "hold scene").toBe(true);
    expect(origin(new AnimationRuntime(held).evaluate(900), "box").x).toBeCloseTo(0, 6);
    expect(origin(new AnimationRuntime(held).evaluate(1000), "box").x).toBeCloseTo(100, 6);

    const scoped = bare(
      [box(0)],
      [
        {
          id: "slide",
          kind: "keyframe",
          target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
          valueType: "number",
          startMs: 0,
          durationMs: 500,
          fill,
          timingScopeId: "local",
          keyframes: [
            { offset: 0, value: 0, easing: "linear" },
            { offset: 1, value: 100 },
          ],
        },
      ],
      [],
      1000,
    );
    scoped.irVersion = "0.2";
    scoped.timingScopes = [{ id: "local", parentId: null, offsetMs: 500, stretch: 1 }];
    expect(validateSceneIR(scoped).ok).toBe(true);
    expect(origin(new AnimationRuntime(scoped).evaluate(0), "box").x).toBeCloseTo(0, 6);
    expect(origin(new AnimationRuntime(scoped).evaluate(750), "box").x).toBeCloseTo(50, 6);
    expect(origin(new AnimationRuntime(scoped).evaluate(1000), "box").x).toBeCloseTo(100, 6);

    const ordered = bare([box(0)], [], [], 1000);
    ordered.irVersion = "0.2";
    ordered.timeline.tracks = [
      {
        id: "low",
        kind: "keyframe",
        target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
        valueType: "number",
        startMs: 0,
        durationMs: 1000,
        fill,
        composition: { order: 1, mode: "replace" },
        keyframes: [
          { offset: 0, value: 0, easing: "linear" },
          { offset: 1, value: 10 },
        ],
      },
      {
        id: "high",
        kind: "keyframe",
        target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
        valueType: "number",
        startMs: 0,
        durationMs: 1000,
        fill,
        composition: { order: 0, mode: "replace" },
        keyframes: [
          { offset: 0, value: 0, easing: "linear" },
          { offset: 1, value: 80 },
        ],
      },
    ];
    expect(validateSceneIR(ordered).ok).toBe(false);
    expect(origin(new AnimationRuntime(ordered).evaluate(500), "box").x).toBeCloseTo(5, 6);
  });
});

describe("geometry.spatialCurve", () => {
  it("samples spatial position keys by arc length", () => {
    const fill = { before: "none" as const, after: "forwards" as const };
    const scene: SceneIR = {
      irVersion: "0.2",
      sceneId: "spatial",
      viewport: { width: 200, height: 200, fit: "contain" },
      background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      resources: [],
      cameras: [{ id: "main", position: { x: 100, y: 100 }, zoom: 1, rotation: 0 }],
      initialCameraId: "main",
      nodes: [box(0, 0)],
      timeline: {
        durationMs: 1000,
        tracks: [
          {
            id: "pos",
            kind: "keyframe",
            target: { kind: "node", nodeId: "box", channel: "transform.position" },
            valueType: "vec2",
            startMs: 0,
            durationMs: 1000,
            fill,
            keyframes: [
              {
                offset: 0,
                value: { x: 0, y: 0 },
                easing: "linear",
                spatial: { out: { x: 0, y: 200 }, in: { x: 0, y: 0 } },
              },
              { offset: 1, value: { x: 100, y: 0 } },
            ],
          },
        ],
        steps: [],
      },
      compositions: [],
      instances: [],
      timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 1 }],
      requiredCapabilities: ["geometry.spatialCurve"],
      geometryOperators: [],
    };
    expect(validateSceneIR(scene).ok).toBe(true);
    const mid = origin(new AnimationRuntime(scene).evaluate(500), "box");
    // Arc-length mid ≠ bezier-parameter mid for this asymmetric handle layout.
    expect(mid.x).toBeCloseTo(35.5, 0);
    expect(mid.y).toBeCloseTo(86.2, 0);
    expect(Math.hypot(mid.x - 50, mid.y - 75)).toBeGreaterThan(10);
    expect(origin(new AnimationRuntime(scene).evaluate(0), "box")).toMatchObject({ x: 0, y: 0 });
    expect(origin(new AnimationRuntime(scene).evaluate(1000), "box")).toMatchObject({ x: 100, y: 0 });
  });
});

describe("geometry.pathMorph", () => {
  it("samples path morph tracks at boundaries and midpoints", () => {
    const from = [
      { cmd: "M" as const, x: 0, y: 0 },
      { cmd: "C" as const, c1x: 10, c1y: 0, c2x: 10, c2y: 0, x: 10, y: 0 },
      { cmd: "Z" as const },
    ];
    const to = [
      { cmd: "M" as const, x: 0, y: 0 },
      { cmd: "C" as const, c1x: 30, c1y: 0, c2x: 30, c2y: 0, x: 30, y: 0 },
      { cmd: "Z" as const },
    ];
    const scene: SceneIR = {
      irVersion: "0.2",
      sceneId: "morph",
      viewport: { width: 100, height: 100, fit: "contain" },
      background: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      resources: [],
      cameras: [{ id: "main", position: { x: 50, y: 50 }, zoom: 1, rotation: 0 }],
      initialCameraId: "main",
      nodes: [
        {
          id: "blob",
          name: "blob",
          parentId: null,
          space: "world",
          kind: "path",
          zIndex: 0,
          transform: {
            position: { x: 0, y: 0 },
            pivot: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
          },
          opacity: 1,
          visible: true,
          commands: from,
          fillRule: "nonzero",
          fill: { type: "solid", r: 1, g: 0, b: 0, a: 1 },
        },
      ],
      timeline: {
        durationMs: 1000,
        tracks: [
          {
            id: "morph",
            kind: "keyframe",
            target: { kind: "node", nodeId: "blob", channel: "commands" },
            valueType: "path",
            startMs: 0,
            durationMs: 1000,
            fill: { before: "none", after: "forwards" },
            keyframes: [
              { offset: 0, value: from, easing: "linear" },
              { offset: 1, value: to },
            ],
          },
        ],
        steps: [],
      },
      compositions: [],
      instances: [],
      timingScopes: [{ id: "root", parentId: null, offsetMs: 0, stretch: 1 }],
      requiredCapabilities: ["geometry.pathMorph"],
      geometryOperators: [],
    };
    expect(validateSceneIR(scene).ok).toBe(true);
    const sampled = (ms: number) => {
      const node = sampleScene(scene, ms).nodes.find((entry) => entry.id === "blob");
      return node && node.kind === "path" ? node.commands : undefined;
    };
    expect(sampled(0)?.[1]).toMatchObject({ cmd: "C", x: 10 });
    expect(sampled(500)?.[1]).toMatchObject({ cmd: "C", x: 20, c1x: 20 });
    expect(sampled(1000)?.[1]).toMatchObject({ cmd: "C", x: 30 });
    expect(sampled(1000)?.[2]).toEqual({ cmd: "Z" });
  });
});
