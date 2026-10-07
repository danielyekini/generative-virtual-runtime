import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./compile";

const root = resolve(import.meta.dirname, "../../..");

function source(name: string): string {
  return readFileSync(resolve(root, "fixtures/motionscript", name), "utf8");
}

function header(duration = "2s"): string {
  return `scene "demo" {\n  version "0.1";\n  viewport (1280, 720);\n  background #101014;\n  duration ${duration};\n};\n`;
}

describe("bunny", () => {
  const compiled = compileMotionScript(source("bunny.ms"));

  it("compiles the design example to a valid scene", () => {
    expect(compiled.diagnostics, compiled.diagnostics.map((item) => item.message).join("\n")).toEqual([]);
    expect(compiled.ok).toBe(true);
    expect(compiled.scene && validateSceneIR(compiled.scene).ok).toBe(true);
    expect(compiled.sealedThroughMs).toBe(6000);
  });

  it("keeps the hierarchy, the hop, and the sealed zoom", () => {
    const scene = compiled.scene;
    if (!scene) throw new Error("missing scene");
    expect(scene.nodes.map((node) => node.id)).toEqual(["bunny", "bunny.body", "bunny.head", "bunny.ear", "chocolate"]);
    const ear = scene.nodes.find((node) => node.id === "bunny.ear");
    expect(ear?.transform.position).toEqual({ x: 55, y: -105 });
    const hopX = scene.timeline.tracks.find((track) => track.target.kind === "node" && track.target.channel === "transform.position.x");
    expect(hopX).toMatchObject({
      kind: "keyframe",
      startMs: 0,
      durationMs: 5000,
      keyframes: [
        { offset: 0, value: 180, easing: "easeInOut" },
        { offset: 1, value: 900 },
      ],
    });
    const hopY = scene.timeline.tracks.find((track) => track.kind === "expression");
    expect(hopY && hopY.kind === "expression" ? hopY.source : "").toBe("500 - abs(sin(local_t * 4 * PI)) * 90");
    const zoom = scene.timeline.tracks.find((track) => track.target.kind === "camera");
    expect(zoom).toMatchObject({ startMs: 2000, durationMs: 3000 });
  });
});

describe("language coverage", () => {
  it("lowers a header, a constant, every primitive, and a nested group", () => {
    const compiled = compileMotionScript(`${header("1s")}
      const SCALE = 2;
      camera main { position (100, 80); zoom 1.5; rotation 10deg; };
      group root {
        position (10, 20);
        rectangle box { size (30, 40); fill #ff0000; stroke #0000ff width 2 cap round; };
        circle dot { radius 5; fill #00ff00; };
        ellipse egg { size (8, 12); fill #ffff00; };
        line edge { from (0, 0); to (4, 4); stroke #ffffff; };
        polygon tri { points ((0, 0), (10, 0), (0, 10)); fill #123456; };
        path trail {
          fillRule evenodd;
          fill #abcdef;
          move (0, 0);
          line (2, 0);
          quadratic (3, 1) (4, 0);
          cubic (5, 1) (6, 1) (7, 0);
          close;
        };
        text label { content "Hi"; fontFamily "sans"; fontSize 16; fill #ffffff; };
      };
      complete;
    `);
    expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    const scene = compiled.scene;
    if (!scene) throw new Error("missing scene");
    expect(scene.cameras[0]).toMatchObject({ zoom: 1.5 });
    expect(scene.cameras[0]?.rotation).toBeCloseTo((10 * Math.PI) / 180, 8);
    expect(scene.nodes.map((node) => node.kind)).toEqual([
      "group",
      "rectangle",
      "circle",
      "ellipse",
      "line",
      "polygon",
      "path",
      "text",
    ]);
    const trail = scene.nodes.find((node) => node.id === "root.trail");
    expect(trail && trail.kind === "path" ? trail.commands.map((command) => command.cmd) : []).toEqual([
      "M",
      "L",
      "Q",
      "C",
      "Z",
    ]);
    expect(trail && trail.kind === "path" ? trail.fillRule : "").toBe("evenodd");
    expect(scene.resources).toEqual([{ id: "font1", kind: "font", family: "sans", source: "builtin" }]);
    expect(scene.nodes.find((node) => node.id === "root")?.transform.position).toEqual({ x: 10, y: 20 });
  });

  it("compiles vec2 tracks, keyframes, expressions, and steps", () => {
    const compiled = compileMotionScript(`${header("2s")}
      const AMP = 90;
      rectangle box { position (0, 0); size (10, 10); fill #ff0000; };
      animate box.position { from (0, 0); to (100, 50); duration 1s; };
      keyframes box.opacity { duration 2s; 0% 1; 50% 0.25 ease easeIn; 100% 1; };
      animate box.position.x { expression "AMP + local_t"; start 1s; duration 1s; };
      step box.visible { at 1500ms; value false; };
      complete;
    `);
    expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    const scene = compiled.scene;
    if (!scene) throw new Error("missing scene");
    const move = scene.timeline.tracks[0];
    expect(move).toMatchObject({
      valueType: "vec2",
      keyframes: [
        { offset: 0, value: { x: 0, y: 0 } },
        { offset: 1, value: { x: 100, y: 50 } },
      ],
    });
    const fade = scene.timeline.tracks[1];
    expect(fade && fade.kind === "keyframe" ? fade.keyframes.map((frame) => frame.offset) : []).toEqual([0, 0.5, 1]);
    const expr = scene.timeline.tracks[2];
    expect(expr && expr.kind === "expression" ? expr.source : "").toBe("90 + local_t");
    expect(scene.timeline.steps).toEqual([
      { id: "step1", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 1500, value: false },
    ]);
  });
});

describe("rejected units", () => {
  it("drops a circle with a string radius and keeps the earlier rectangle", () => {
    const compiled = compileMotionScript(`${header()}
      rectangle box { size (10, 10); fill #ff0000; };
      circle x { radius "hello"; };
      complete;
    `);
    expect(compiled.ok).toBe(false);
    expect(compiled.scene?.nodes.map((node) => node.id)).toEqual(["box"]);
    expect(compiled.diagnostics.length).toBeGreaterThan(0);
  });

  it("does not keep an unknown target or a negative zoom", () => {
    const compiled = compileMotionScript(`${header()}
      camera main { position (10, 10); zoom -1; rotation 0deg; };
      rectangle box { size (10, 10); fill #ff0000; };
      animate missing.position.x { from 0; to 100; duration 1s; };
      complete;
    `);
    expect(compiled.ok).toBe(false);
    expect(compiled.scene?.cameras[0]?.zoom).toBe(1);
    expect(compiled.scene?.cameras[0]?.position).toEqual({ x: 640, y: 360 });
    expect(compiled.scene?.timeline.tracks).toEqual([]);
    expect(compiled.diagnostics.some((item) => item.code === "INVALID_ZOOM")).toBe(true);
    expect(compiled.diagnostics.some((item) => item.code === "UNKNOWN_TARGET")).toBe(true);
  });

  it("rejects only the overlapping writer", () => {
    const compiled = compileMotionScript(`${header()}
      rectangle bunny { size (10, 10); fill #ff0000; };
      animate bunny.position.x { from 0; to 100; duration 1s; };
      animate bunny.position.x { from 0; to 40; duration 1s; };
      complete;
    `);
    expect(compiled.ok).toBe(false);
    expect(compiled.scene?.timeline.tracks).toHaveLength(1);
    expect(compiled.diagnostics.some((item) => item.code === "OVERLAPPING_WRITERS")).toBe(true);
  });

  it("rolls a batch back when one item is invalid", () => {
    const compiled = compileMotionScript(`${header()}
      batch {
        rectangle a { size (10, 10); fill #ff0000; };
        rectangle b { size (12, 12); fill #00ff00; };
        animate missing.position.x { from 0; to 1; duration 1s; };
      };
      complete;
    `);
    expect(compiled.scene?.nodes).toEqual([]);
    expect(compiled.scene?.timeline.tracks).toEqual([]);
  });

  it("refuses a track that starts before the seal and accepts one on the horizon", () => {
    const compiled = compileMotionScript(`${header("3s")}
      rectangle box { size (10, 10); fill #ff0000; };
      seal 2s;
      animate box.position.x { from 0; to 10; start 1s; duration 1s; };
      animate box.opacity { from 1; to 0; start 2s; duration 1s; };
      complete;
    `);
    expect(compiled.scene?.timeline.tracks).toHaveLength(1);
    expect(compiled.scene?.timeline.tracks[0]).toMatchObject({ startMs: 2000 });
    expect(compiled.diagnostics.some((item) => item.message.includes("before the seal"))).toBe(true);
  });
});

describe("golden scene", () => {
  it("matches a hand-written circle scene", () => {
    const compiled = compileMotionScript(`scene "dot" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 1s;
};
circle mark {
  position (400, 300);
  radius 40;
  fill #38bdf8;
};
complete;
`);
    const ink = { type: "solid" as const, r: 16 / 255, g: 16 / 255, b: 20 / 255, a: 1 };
    const cyan = { type: "solid" as const, r: 56 / 255, g: 189 / 255, b: 248 / 255, a: 1 };
    expect(compiled.scene).toEqual({
      irVersion: "0.1",
      sceneId: "dot",
      viewport: { width: 1280, height: 720, fit: "contain" },
      background: ink,
      resources: [],
      cameras: [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
      initialCameraId: "main",
      timeline: { durationMs: 1000, tracks: [], steps: [] },
      nodes: [
        {
          id: "mark",
          name: "mark",
          parentId: null,
          space: "world",
          zIndex: 0,
          transform: {
            position: { x: 400, y: 300 },
            pivot: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 },
          },
          opacity: 1,
          visible: true,
          kind: "circle",
          radius: 40,
          fill: cyan,
        },
      ],
    });
  });
});

const CAPABILITY = `scene "cap" {
  version "0.2";
  viewport (100, 100);
  background #000000;
  duration 1s;
  requires "easing.cubicBezier";
  requires "easing.hold";
  requires "timing.localScopes";
  requires "composition.definitions";
  requires "geometry.operators";
};
timing local { offset 0ms; stretch 1; };
instance one of chip { start 0ms; end 1s; timing local; };
operators box { trim 0, 1, 0; round 2; };
composition chip {
  rectangle body { size (10, 10); fill #ffffff; };
};
rectangle box { size (4, 4); fill #ff0000; position (1, 2); };
animate box.position.x { from 0; to 10; duration 1s; ease cubic(0.4, 0, 0.2, 1); timing local; };
animate box.position.y { from 0; to 10; duration 1s; ease hold; };
complete;
`;

describe("motion script 0.2", () => {
  it("compiles compositions, instances, scopes, and cubic easing", () => {
    const compiled = compileMotionScript(CAPABILITY);
    expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    expect(compiled.scene?.irVersion).toBe("0.2");
    expect(compiled.scene?.compositions?.[0]?.id).toBe("chip");
    expect(compiled.scene?.instances?.[0]?.definitionId).toBe("chip");
    expect(compiled.scene?.geometryOperators?.[0]?.operators).toHaveLength(2);
    const track = compiled.scene?.timeline.tracks[0];
    expect(track?.kind).toBe("keyframe");
    if (track?.kind === "keyframe") expect(track.keyframes[0]?.easing).toEqual({ type: "cubic", x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
  });

  it("rejects 0.1 use of the new units and fails unknown targets", () => {
    const old = compileMotionScript(`scene "old" {
  version "0.1";
  viewport (100, 100);
  background #000000;
  duration 1s;
};
rectangle box { size (4, 4); fill #ff0000; };
animate box.opacity { from 0; to 1; duration 1s; ease cubic(0.4, 0, 0.2, 1); };
complete;
`);
    expect(old.ok).toBe(false);
    expect(old.scene?.timeline.tracks).toEqual([]);

    const missing = compileMotionScript(`scene "miss" {
  version "0.2";
  viewport (100, 100);
  background #000000;
  duration 1s;
};
timing local { offset 0ms; stretch 1; };
instance one of gone { start 0ms; end 1s; timing local; };
complete;
`);
    expect(missing.ok).toBe(false);
    expect(missing.scene?.instances).toEqual([]);

    const stretch = compileMotionScript(`scene "flat" {
  version "0.2";
  viewport (100, 100);
  background #000000;
  duration 1s;
};
timing local { offset 0ms; stretch 0; };
complete;
`);
    expect(stretch.ok).toBe(false);
  });
});

describe("visual programs", () => {
  it("compiles the five hand-written animations", () => {
    for (const name of ["ball.ms", "caption.ms", "nested.ms", "diagram.ms", "camera.ms"]) {
      const compiled = compileMotionScript(source(name));
      expect(compiled.ok, `${name}\n${compiled.diagnostics.map((item) => item.message).join("\n")}`).toBe(true);
      expect(compiled.scene && validateSceneIR(compiled.scene).ok).toBe(true);
    }
  });
});
