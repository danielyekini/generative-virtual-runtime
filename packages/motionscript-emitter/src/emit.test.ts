import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import type { NodeDefinition, ResolvedDrawItem, SceneIR, TrackDefinition } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { emitMotionScript } from "./emit";

const motionDir = resolve(import.meta.dirname, "../../../fixtures/motionscript");

function compile(source: string): SceneIR {
  const compiled = compileMotionScript(source);
  expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
  if (!compiled.scene) throw new Error("missing scene");
  return compiled.scene;
}

function roundTrip(scene: SceneIR): { source: string; again: SceneIR } {
  const source = emitMotionScript(scene);
  const again = compile(source);
  expect(emitMotionScript(again)).toBe(source);
  return { source, again };
}

describe("canonical emitter", () => {
  it("preserves fractional timing at the scene boundary", () => {
    for (const [duration, start] of [[5000, 1233.3333333333335], [5000, 2633.3333333333335], [1e-8, 3e-9]]) {
      const scene = compile(`scene "boundary" {
        version "0.1"; viewport (10, 10); background #000000; duration ${duration}ms;
      };
      rectangle dot { size (1, 1); fill #ffffff; };
      animate dot.opacity { start ${start}ms; duration ${duration! - start!}ms; from 0; to 1; };
      complete;`);
      const { again } = roundTrip(scene);
      expect(again.timeline.durationMs).toBe(scene.timeline.durationMs);
      expect(again.timeline.tracks).toEqual(scene.timeline.tracks);
      const before = new AnimationRuntime(scene), after = new AnimationRuntime(again);
      for (const time of [duration!, start!, (duration! + start!)/2, 0]) {
        expect(after.evaluate(time)).toEqual(before.evaluate(time));
      }
    }
  });

  it("round-trips spatialLayer declarations (space.planar25d)", () => {
    const source = readFileSync(resolve(motionDir, "spatial-crane.ms"), "utf8");
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("space.planar25d");
    expect(again.spatialLayers).toEqual(scene.spatialLayers);
    expect(sameFrame(new AnimationRuntime(scene).evaluate(0).drawItems, new AnimationRuntime(again).evaluate(0).drawItems)).toBe("");
  });

  it("round-trips spatialLayer seams (space.planarSeams)", () => {
    const source = readFileSync(resolve(motionDir, "spatial-seams.ms"), "utf8");
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("space.planarSeams");
    expect(again.spatialLayers).toEqual(scene.spatialLayers);
    expect(again.spatialLayers![0]!.seams!.edges).toHaveLength(2);
    for (const t of [0, 2000]) {
      expect(sameFrame(new AnimationRuntime(scene).evaluate(t).drawItems, new AnimationRuntime(again).evaluate(t).drawItems)).toBe("");
    }
  });

  it("round-trips group clip", () => {
    const source = readFileSync(resolve(motionDir, "clip-mask.ms"), "utf8");
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("compositing.mask");
    const card = again.nodes.find((node) => node.id === "Card");
    expect(card).toMatchObject({ kind: "group", compositing: { clip: { geometryId: "Window" } } });
    expect(sameFrame(new AnimationRuntime(scene).evaluate(0).drawItems, new AnimationRuntime(again).evaluate(0).drawItems)).toBe("");
  });

  it("round-trips group matte", () => {
    const source = readFileSync(resolve(motionDir, "alpha-matte.ms"), "utf8");
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("compositing.matte");
    const card = again.nodes.find((node) => node.id === "Card");
    expect(card).toMatchObject({ kind: "group", compositing: { matte: { nodeId: "Window" } } });
    expect(sameFrame(new AnimationRuntime(scene).evaluate(0).drawItems, new AnimationRuntime(again).evaluate(0).drawItems)).toBe("");
  });

  it("round-trips physics declarations (physics.planar2d)", () => {
    const source = readFileSync(resolve(motionDir, "physics-marble.ms"), "utf8");
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("physics.planar2d");
    expect(again.physics).toEqual(scene.physics);
    expect(sameFrame(new AnimationRuntime(scene).evaluate(0).drawItems, new AnimationRuntime(again).evaluate(0).drawItems)).toBe("");
  });

  it("round-trips generative audio declarations (audio.generative)", () => {
    const source = `scene "gen-audio" {
  version "0.2";
  viewport (400, 300);
  background #ffffff;
  duration 4s;
};
circle Dot { position (200, 150); radius 20; fill #3366ff; };
audio Hello = speech "This is an example of what I sound like";
audio Tracks = effect "Train tracks" { duration 3s; loop; voice "rails"; seed 1; stability 0.4; };
cue N1 narration Hello at 0ms;
cue E1 effects Tracks at 1200ms;
complete;
`;
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toEqual(expect.arrayContaining(["audio.cues", "audio.generative"]));
    expect(again.resources.filter((resource) => resource.kind === "audio")).toEqual(
      scene.resources.filter((resource) => resource.kind === "audio"),
    );
    expect(again.audioCues).toEqual(scene.audioCues);
  });

  it("round-trips interact declarations (input.bindings)", () => {
    const source = `scene "panel" {
  version "0.2";
  viewport (400, 300);
  background #ffffff;
  duration 2s;
};
group Panel {
  position (40, 40);
  rectangle Button {
    size (100, 40);
    fill #3366ff;
  };
};
circle Knob {
  position (200, 150);
  radius 12;
  fill #ff8800;
};
rectangle Glass {
  size (30, 40);
  fill #ffffff;
  opacity 0.3;
};
interact Knob {
  focusable true;
  tabIndex 2;
  on drag dragTranslate (20, 20) (380, 280);
  on wheel step scale.x 0.25 0.5 2;
  on key "ArrowRight" step position.x 10 20 380;
};
interact Panel {
  focusable true;
  on click toggle Glass.opacity 0.3 0.9;
  on activate set Panel.Button.rotation 0;
};
interact Glass {
  pointer none;
};
complete;
`;
    const scene = compile(source);
    expect(scene.requiredCapabilities).toContain("input.bindings");
    const { again, source: emitted } = roundTrip(scene);
    expect(emitted).toContain("interact Knob");
    expect(emitted).toContain('on key "ArrowRight" step position.x 10 20 380');
    expect(emitted).toContain("on click toggle Glass.opacity 0.3 0.9");
    expect(emitted).toContain("on activate set Panel.Button.rotation 0");
    expect(again.interactions).toEqual(scene.interactions);
  });

  it("round-trips numeric text bindings (text.dynamicContent)", () => {
    const source = `scene "readout" {
  version "0.2";
  viewport (320, 180);
  background #0b1220;
  duration 2s;
};
text Price {
  content "0.00";
  fontSize 24;
  fill #22c55e;
  align center;
  number 42.5;
  fractionDigits 2;
  group ",";
  prefix "$";
};
text Status {
  content "Ready";
  fontSize 18;
  fill #f8fafc;
};
animate Price.number {
  from 10;
  to 99.5;
  duration 2s;
};
step Status.content {
  at 1s;
  value "Go";
};
complete;
`;
    const scene = compile(source);
    expect(scene.requiredCapabilities).toContain("text.dynamicContent");
    const { again, source: emitted } = roundTrip(scene);
    expect(emitted).toContain("number 42.5;");
    expect(emitted).toContain("fractionDigits 2;");
    expect(emitted).toContain('prefix "$";');
    expect(emitted).toContain("Price.number");
    expect(emitted).toContain("step Status.content");
    const price = again.nodes.find((node) => node.id === "Price");
    expect(price?.kind).toBe("text");
    if (price?.kind === "text") {
      expect(price.numeric).toEqual({
        value: 42.5,
        format: { fractionDigits: 2, group: ",", prefix: "$" },
      });
    }
    expect(again.timeline.steps).toEqual(scene.timeline.steps);
  });

  it("round-trips path attachments (geometry.pathProgress)", () => {
    const source = `scene "attach" {
  version "0.2";
  viewport (400, 300);
  background #ffffff;
  duration 2s;
};
path Rail {
  stroke #334155 width 2;
  move (0, 0);
  line (200, 0);
  line (200, 100);
};
circle Tip {
  radius 6;
  fill #f97316;
};
circle Wheel {
  radius 8;
  fill #111111;
};
rectangle Mark {
  size (10, 10);
  fill #000000;
};
attach Tip along Rail {
  progress 0.5;
  orient true;
};
attach Wheel along Rail {
  progress 0;
  orient false;
  rollRadius 8;
};
attach Mark along Rail {
  progress 1;
};
animate Tip.path.progress {
  from 0;
  to 1;
  duration 2s;
};
complete;
`;
    const scene = compile(source);
    expect(scene.requiredCapabilities).toContain("geometry.pathProgress");
    const { again, source: emitted } = roundTrip(scene);
    expect(emitted).toContain("attach Tip along Rail {");
    expect(emitted).toContain("  orient true;");
    expect(emitted).toContain("  rollRadius 8;");
    expect(emitted).toContain("Tip.path.progress");
    expect(again.pathAttachments).toEqual(scene.pathAttachments);
    expect(again.pathAttachments).toEqual([
      { nodeId: "Tip", pathId: "Rail", progress: 0.5, orient: true },
      { nodeId: "Wheel", pathId: "Rail", progress: 0, orient: false, rollRadius: 8 },
      { nodeId: "Mark", pathId: "Rail", progress: 1 },
    ]);
    expect(again.timeline.tracks).toEqual(scene.timeline.tracks);
  });

  it("round-trips animated solid paint channels", () => {
    const source = `scene "paint" {
  version "0.2";
  viewport (100, 100);
  background #000000;
  duration 1s;
  requires "paint.animatedSolid";
};
circle Dot {
  radius 10;
  fill #ff0000;
  stroke #00ff00 width 2;
};
keyframes Dot.fill.r {
  start 0ms;
  duration 1000ms;
  0% 1;
  100% 0;
};
keyframes Dot.stroke.width {
  start 0ms;
  duration 1000ms;
  0% 2;
  100% 8;
};
complete;
`;
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again.requiredCapabilities).toContain("paint.animatedSolid");
    expect(again.timeline.tracks.map((track) => track.target)).toEqual(scene.timeline.tracks.map((track) => track.target));
    const before = new AnimationRuntime(scene);
    const after = new AnimationRuntime(again);
    for (const time of [0, 500, 1000]) {
      expect(after.evaluate(time)).toEqual(before.evaluate(time));
    }
  });

  it("round-trips a 0.2 program", () => {
    const source = `scene "cap" {
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
composition chip {
  rectangle body { size (10, 10); fill #ffffff; };
};
instance one of chip { start 0ms; end 1s; timing local; };
rectangle box { size (4, 4); fill #ff0000; position (1, 2); };
operators box { trim 0, 1, 0; round 2; };
animate box.position.x { from 0; to 10; duration 1s; ease cubic(0.4, 0, 0.2, 1); timing local; };
animate box.position.y { from 0; to 10; duration 1s; ease hold; };
complete;
`;
    const scene = compile(source);
    const { again } = roundTrip(scene);
    expect(again).toEqual(scene);
  });

  it("replays every hand-authored program at the same samples", () => {
    for (const name of readdirSync(motionDir).filter((file) => file.endsWith(".ms"))) {
      const scene = compile(readFileSync(resolve(motionDir, name), "utf8"));
      const { again } = roundTrip(scene);
      expect(sameScene(scene, again), name).toBe("");
      const times = sampleTimes(scene.timeline.durationMs);
      const before = new AnimationRuntime(scene);
      const after = new AnimationRuntime(again);
      for (const time of times) {
        expect(sameFrame(before.evaluate(time).drawItems, after.evaluate(time).drawItems), `${name} @ ${time}`).toBe("");
      }
    }
  });

  it("keeps steps, screen space, pivots, and multi-stop keyframes", () => {
    const scene = compile(`
      scene "coverage" {
        version "0.1";
        viewport (1280, 720);
        background #101014;
        duration 2s;
      };
      camera main { position (640, 360); zoom 1; rotation 0deg; };
      text label {
        content "Stay";
        fontSize 28;
        fill #ffffff;
        align center;
        space screen;
        position (640, 40);
      };
      group arm {
        position (400, 400);
        rectangle bone {
          position (0, -12);
          size (160, 24);
          pivot (0, 12);
          fill #f59e0b;
        };
      };
      circle mark { radius 12; fill #38bdf8; position (80, 80); zIndex 2; };
      keyframes mark.position {
        duration 2s;
        0% (80, 80);
        25% (120, 40) ease easeIn;
        70% (200, 160) ease easeOut;
        100% (320, 80);
      };
      step mark.visible { at 1500ms; value false; };
      complete;
    `);
    const { source, again } = roundTrip(scene);
    expect(source).toContain("space screen;");
    expect(source).toContain("pivot (0, 12);");
    expect(source).toContain("keyframes mark.position");
    expect(source).toContain("step mark.visible");
    expect(sameScene(scene, again)).toBe("");
    const before = new AnimationRuntime(scene);
    const after = new AnimationRuntime(again);
    expect(after.evaluate(1400).drawItems.some((item) => item.nodeId === "mark")).toBe(true);
    expect(after.evaluate(1500).drawItems.some((item) => item.nodeId === "mark")).toBe(false);
    expect(sameFrame(before.evaluate(500).drawItems, after.evaluate(500).drawItems)).toBe("");
    expect(sameFrame(before.evaluate(1600).drawItems, after.evaluate(1600).drawItems)).toBe("");
  });

  it("round-trips text.layoutMetrics", () => {
    const scene = compile(`scene "labels" {
      version "0.2"; viewport (400, 300); background #0b1220; duration 1s;
      requires "text.layoutMetrics";
    };
    text Title {
      position (200, 140);
      content "GO";
      fontSize 48;
      align center;
      baseline middle;
      fill #f8fafc;
    };
    complete;`);
    expect(scene.requiredCapabilities).toContain("text.layoutMetrics");
    const { source, again } = roundTrip(scene);
    expect(source).toContain('requires "text.layoutMetrics";');
    expect(again.requiredCapabilities).toContain("text.layoutMetrics");
    const title = again.nodes.find((node) => node.id === "Title");
    expect(title?.kind).toBe("text");
    if (title?.kind === "text") {
      expect(title.align).toBe("center");
      expect(title.baseline).toBe("middle");
      expect(title.content).toBe("GO");
    }
  });
});

function sampleTimes(durationMs: number): number[] {
  const times = [0, durationMs];
  for (const fraction of [0.25, 0.5, 0.75]) times.push(durationMs * fraction);
  return times;
}

function sameScene(left: SceneIR, right: SceneIR): string {
  if (left.sceneId !== right.sceneId) return `scene ${left.sceneId} != ${right.sceneId}`;
  if (!near(left.timeline.durationMs, right.timeline.durationMs)) return "duration";
  if (left.nodes.length !== right.nodes.length) return `nodes ${left.nodes.length} != ${right.nodes.length}`;
  for (let index = 0; index < left.nodes.length; index += 1) {
    const mismatch = sameNode(left.nodes[index]!, right.nodes[index]!);
    if (mismatch) return mismatch;
  }
  if (left.timeline.tracks.length !== right.timeline.tracks.length) return "track count";
  for (let index = 0; index < left.timeline.tracks.length; index += 1) {
    const mismatch = sameTrack(left.timeline.tracks[index]!, right.timeline.tracks[index]!);
    if (mismatch) return mismatch;
  }
  if (left.timeline.steps.length !== right.timeline.steps.length) return "step count";
  for (let index = 0; index < left.timeline.steps.length; index += 1) {
    const a = left.timeline.steps[index]!;
    const b = right.timeline.steps[index]!;
    if (a.target.nodeId !== b.target.nodeId || a.value !== b.value || !near(a.timeMs, b.timeMs)) return `step ${a.target.nodeId}`;
  }
  return "";
}

function sameNode(left: NodeDefinition, right: NodeDefinition): string {
  if (left.id !== right.id || left.kind !== right.kind) return `${left.id} kind`;
  if (!near(left.opacity, right.opacity) || left.visible !== right.visible || left.zIndex !== right.zIndex) return left.id;
  if (!near(left.transform.rotation, right.transform.rotation)) return `${left.id} rotation`;
  if (!sameVec(left.transform.position, right.transform.position) || !sameVec(left.transform.pivot, right.transform.pivot)) return `${left.id} transform`;
  if (!sameVec(left.transform.scale, right.transform.scale)) return `${left.id} scale`;
  if (stable(geometryOf(left)) !== stable(geometryOf(right))) return `${left.id} geometry`;
  return "";
}

function geometryOf(node: NodeDefinition): unknown {
  if (node.kind === "group") return null;
  if (node.kind === "circle") return { radius: node.radius, fill: node.fill, stroke: node.stroke };
  if (node.kind === "line") return { from: node.from, to: node.to, stroke: node.stroke };
  if (node.kind === "text") return { content: node.content, font: node.font, align: node.align, baseline: node.baseline, fill: node.fill, stroke: node.stroke };
  if (node.kind === "path") return { commands: node.commands, fillRule: node.fillRule, fill: node.fill, stroke: node.stroke };
  if (node.kind === "polygon") return { points: node.points, fill: node.fill, stroke: node.stroke };
  if (node.kind === "image") return { size: node.size, resourceId: node.resourceId };
  if (node.kind === "rectangle") return { size: node.size, fill: node.fill, stroke: node.stroke, cornerRadius: node.cornerRadius };
  return { size: node.size, fill: node.fill, stroke: node.stroke };
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === "number" ? Number(item.toFixed(4)) : item));
}

function sameTrack(left: TrackDefinition, right: TrackDefinition): string {
  const id = left.target.kind === "node" ? left.target.nodeId : left.target.cameraId;
  if (left.kind !== right.kind || left.target.channel !== right.target.channel) return `track ${id}`;
  if (!near(left.startMs, right.startMs) || !near(left.durationMs, right.durationMs)) return `track timing ${id}`;
  if (left.fill.after !== right.fill.after) return `track fill ${id}`;
  if (left.kind === "expression" && right.kind === "expression" && left.source !== right.source) return `expression ${id}`;
  if (left.kind === "keyframe" && right.kind === "keyframe") {
    if (left.keyframes.length !== right.keyframes.length) return `keyframes ${id}`;
    for (let index = 0; index < left.keyframes.length; index += 1) {
      const a = left.keyframes[index]!;
      const b = right.keyframes[index]!;
      if (!near(a.offset, b.offset) || !sameEasing(a.easing, b.easing)) return `keyframe ${id}`;
      if (typeof a.value === "number" || typeof b.value === "number") {
        if (typeof a.value !== "number" || typeof b.value !== "number" || !near(a.value, b.value)) return `keyframe value ${id}`;
      } else if (Array.isArray(a.value) || Array.isArray(b.value)) {
        if (JSON.stringify(a.value) !== JSON.stringify(b.value)) return `keyframe path ${id}`;
      } else if (!sameVec(a.value, b.value)) return `keyframe vec ${id}`;
    }
  }
  return "";
}

function sameFrame(left: readonly ResolvedDrawItem[], right: readonly ResolvedDrawItem[]): string {
  if (left.length !== right.length) return `draw ${left.length} != ${right.length}`;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    if (a.nodeId !== b.nodeId || a.geometry.kind !== b.geometry.kind) return a.nodeId;
    if (!near(a.opacity, b.opacity)) return `${a.nodeId} opacity`;
    for (let cell = 0; cell < a.logicalMatrix.length; cell += 1) {
      if (!near(a.logicalMatrix[cell] ?? 0, b.logicalMatrix[cell] ?? 0)) return `${a.nodeId} matrix`;
    }
  }
  return "";
}

function sameVec(left: { x: number; y: number }, right: { x: number; y: number }): boolean {
  return near(left.x, right.x) && near(left.y, right.y);
}

/** Semantic easing equality: hold/cubic objects compare by value, not identity. */
function sameEasing(left: unknown, right: unknown): boolean {
  const a = left ?? "linear";
  const b = right ?? "linear";
  if (a === b) return true;
  if (typeof a === "string" || typeof b === "string") return a === b;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const leftEase = a as { type: string; x1?: number; y1?: number; x2?: number; y2?: number };
  const rightEase = b as { type: string; x1?: number; y1?: number; x2?: number; y2?: number };
  if (leftEase.type !== rightEase.type) return false;
  if (leftEase.type === "hold") return true;
  return (
    near(leftEase.x1 ?? 0, rightEase.x1 ?? 0) &&
    near(leftEase.y1 ?? 0, rightEase.y1 ?? 0) &&
    near(leftEase.x2 ?? 0, rightEase.x2 ?? 0) &&
    near(leftEase.y2 ?? 0, rightEase.y2 ?? 0)
  );
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-4;
}

describe("E017 semantic easing equality", () => {
  it("round-trips hold easing without object-identity comparison failures", () => {
    const scene = compile(`scene "hold" {
      version "0.2"; viewport (10, 10); background #000000; duration 1s;
    };
    rectangle box { size (1, 1); fill #ffffff; };
    animate box.opacity { from 0; to 1; duration 1s; ease hold; };
    complete;`);
    expect(scene.requiredCapabilities).toContain("easing.hold");
    const { again } = roundTrip(scene);
    expect(again.timeline.tracks).toEqual(scene.timeline.tracks);
    expect(sameTrack(scene.timeline.tracks[0]!, again.timeline.tracks[0]!)).toBe("");
  });
});
