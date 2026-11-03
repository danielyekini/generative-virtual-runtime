import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import type { ResolvedFrame } from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { sampleScene } from "./sample";
import { projectSpatialFrame, type SpatialCamera, type SpatialLayer, type SpatialSurface } from "./spatial";

function frameOf(source: string, timeMs = 0): ResolvedFrame {
  const result = compileMotionScript(source);
  expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
  const scene = result.scene!;
  return buildResolvedFrame(scene, sampleScene(scene, timeMs), timeMs);
}

const dashed = `scene "marks" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 2s;
};
line Wire {
  from (80, 180);
  to (560, 180);
  stroke #f8fafc width 6 dash (18, 10) phase 0;
};
keyframes Wire.stroke.phase {
  start 0ms;
  duration 2s;
  0% 0;
  100% 24;
};
complete;`;

describe("paint.strokeDash", () => {
  it("samples stroke.phase and keeps solid strokes undashed", () => {
    const start = frameOf(dashed, 0);
    const mid = frameOf(dashed, 1000);
    const end = frameOf(dashed, 2000);
    const strokeAt = (frame: ResolvedFrame) => {
      const item = frame.drawItems.find((entry) => entry.nodeId === "Wire");
      if (!item?.appearance.stroke) throw new Error("missing stroke");
      return item.appearance.stroke;
    };
    expect(strokeAt(start).dash).toEqual([18, 10]);
    expect(strokeAt(start).phase ?? 0).toBeCloseTo(0);
    expect(strokeAt(mid).phase).toBeCloseTo(12);
    expect(strokeAt(end).phase).toBeCloseTo(24);
    expect(strokeAt(mid).dash).toEqual([18, 10]);

    const solid = frameOf(`scene "marks" {
      version "0.2"; viewport (640, 360); background #0b1220; duration 1s;
    };
    line Wire { from (0, 0); to (40, 0); stroke #ffffff width 2; };
    complete;`);
    const plain = solid.drawItems.find((entry) => entry.nodeId === "Wire")?.appearance.stroke;
    expect(plain?.dash).toBeUndefined();
    expect(plain?.phase).toBeUndefined();
  });

  it("scales dash and phase with the projected stroke width", () => {
    const source = `scene "marks" {version "0.2"; viewport (640,360); background #ffffff; duration 1s;};
rectangle A { position (100, 100); size (200, 100); fill #ff0000; stroke #000000 width 6 dash (18, 6) phase 3; };
complete;`;
    const frame = frameOf(source);
    const camera: SpatialCamera = { projection: "perspective" };
    const surfaces: SpatialSurface[] = [
      { nodeId: "A", transform: { position: { x: 0, y: 0, z: 1000 }, rotation: { x: 0.3 }, pivot: { x: 200, y: 150, z: 0 } } },
    ];
    const layers: SpatialLayer[] = [{ id: "L", camera, surfaces }];
    const projected = projectSpatialFrame(frame, layers);
    const stroke = projected.frame.drawItems.find((item) => item.nodeId === "A")?.appearance.stroke;
    if (!stroke?.dash) throw new Error("missing projected dash");
    expect(stroke.width).not.toBeCloseTo(6);
    expect(stroke.dash[0]! / stroke.width).toBeCloseTo(18 / 6);
    expect(stroke.dash[1]! / stroke.width).toBeCloseTo(1);
    expect((stroke.phase ?? 0) / stroke.width).toBeCloseTo(3 / 6);
  });
});
