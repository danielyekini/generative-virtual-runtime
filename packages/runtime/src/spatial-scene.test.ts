import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { buildResolvedFrame } from "./frame";
import { hitTest } from "./input";
import { AnimationRuntime } from "./runtime";
import { sampleScene } from "./sample";
import { projectSpatialFrame, projectSurfacePoint } from "./spatial";
import { layersFromScene, projectSceneSpatial } from "./spatial-scene";

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, `../../../fixtures/motionscript/${name}`), "utf8");

function compile(name: string) {
  const result = compileMotionScript(fixture(name));
  expect(result.ok, result.diagnostics.map((item) => item.message).join("\n")).toBe(true);
  return result.scene!;
}

describe("AnimationRuntime spatialLayers (space.planar25d)", () => {
  it("projects declared layers on evaluate and exposes spatial diagnostics", () => {
    const scene = compile("spatial-crane.ms");
    expect(layersFromScene(scene)).toHaveLength(1);
    const runtime = new AnimationRuntime(scene);
    const frame = runtime.evaluate(0);
    const layout = buildResolvedFrame(scene, sampleScene(scene, 0), 0);
    const manual = projectSpatialFrame(layout, layersFromScene(scene)).frame;
    expect(frame.drawItems.map((item) => item.nodeId)).toEqual(manual.drawItems.map((item) => item.nodeId));
    expect(frame.drawItems.length).toBeGreaterThan(0);
    // Default elevated camera lifts the flap; Mark rides with it.
    expect(frame.drawItems.some((item) => item.nodeId === "Flap")).toBe(true);
    expect(runtime.lastDiagnostics.every((item) => item.phase === "runtime" || item.phase === "compile")).toBe(true);
  });

  it("leaves scenes without spatialLayers unchanged", () => {
    const result = compileMotionScript(`scene "flat" {version "0.2"; viewport (100,100); background #000000; duration 1s;};
rectangle Box { size (10, 10); fill #ffffff; };
complete;`);
    expect(result.ok, result.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    const scene = result.scene!;
    const runtime = new AnimationRuntime(scene);
    const frame = runtime.evaluate(0);
    const layout = buildResolvedFrame(scene, sampleScene(scene, 0), 0);
    expect(frame).toEqual(layout);
    expect(projectSceneSpatial(scene, layout).diagnostics).toEqual([]);
  });

  it("hits the projected crane flap centre", () => {
    const scene = compile("spatial-crane.ms");
    const runtime = new AnimationRuntime(scene);
    const frame = runtime.evaluate(0);
    const layout = buildResolvedFrame(scene, sampleScene(scene, 0), 0);
    const projected = projectSpatialFrame(layout, layersFromScene(scene));
    const at = projectSurfacePoint(projected, "Flap", { x: 287, y: 213 });
    expect(at).toBeDefined();
    expect(hitTest(frame, at!)?.nodeId).toBe("Flap");
  });

  it("projects the home and echo Studio samples", () => {
    for (const name of ["spatial-home.ms", "spatial-echo.ms"]) {
      const scene = compile(name);
      const frame = new AnimationRuntime(scene).evaluate(0);
      expect(frame.drawItems.length).toBeGreaterThan(0);
    }
  });
});
