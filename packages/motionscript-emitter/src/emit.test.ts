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
      if (!near(a.offset, b.offset) || (a.easing ?? "linear") !== (b.easing ?? "linear")) return `keyframe ${id}`;
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

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-4;
}
