import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import {
  measureTextLine,
  transformPoint,
  type ResolvedFrame,
  type TextAlign,
  type TextBaseline,
  type Vec2,
} from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { hitTest } from "./input";
import { sampleScene } from "./sample";
import { projectSpatialFrame, type SpatialCamera, type SpatialLayer } from "./spatial";

function frameOf(source: string): ResolvedFrame {
  const result = compileMotionScript(source);
  expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
  const scene = result.scene!;
  return buildResolvedFrame(scene, sampleScene(scene, 0), 0);
}

function at(frame: ResolvedFrame, nodeId: string, local: Vec2): Vec2 {
  const item = frame.drawItems.find((entry) => entry.nodeId === nodeId);
  if (!item) throw new Error(`missing ${nodeId}`);
  return transformPoint(item.logicalMatrix, local.x, local.y);
}

function label(requires: boolean, align: TextAlign, baseline: TextBaseline, content = "WWW"): string {
  return `scene "labels" {
  version "0.2";
  viewport (400, 300);
  background #0b1220;
  duration 1s;
  ${requires ? 'requires "text.layoutMetrics";' : ""}
};
text Title {
  position (160, 120);
  content "${content}";
  fontSize 20;
  align ${align};
  baseline ${baseline};
  fill #f8fafc;
};
complete;`;
}

describe("text layout metrics (text.layoutMetrics)", () => {
  it("hit-tests align and baseline boxes from builtin sans metrics", () => {
    const aligns: TextAlign[] = ["left", "center", "right"];
    const baselines: TextBaseline[] = ["alphabetic", "top", "middle", "bottom"];
    for (const align of aligns) {
      for (const baseline of baselines) {
        const frame = frameOf(label(true, align, baseline));
        expect(frame.textLayoutMetrics).toBe(true);
        const item = frame.drawItems.find((entry) => entry.nodeId === "Title");
        if (!item || item.geometry.kind !== "text") throw new Error("expected text");
        const line = measureTextLine(item.geometry.content, item.geometry.font, align, baseline);
        const inside = {
          x: (line.box.min.x + line.box.max.x) / 2,
          y: (line.box.min.y + line.box.max.y) / 2,
        };
        expect(hitTest(frame, at(frame, "Title", inside))?.nodeId).toBe("Title");
        expect(hitTest(frame, at(frame, "Title", { x: line.box.min.x + 0.5, y: inside.y }))?.nodeId).toBe("Title");
        expect(hitTest(frame, at(frame, "Title", { x: line.box.max.x - 0.5, y: inside.y }))?.nodeId).toBe("Title");
        expect(hitTest(frame, at(frame, "Title", { x: line.box.max.x + 2, y: inside.y }))).toBeUndefined();
        expect(hitTest(frame, at(frame, "Title", { x: inside.x, y: line.box.min.y - 2 }))).toBeUndefined();
      }
    }
  });

  it("keeps the legacy em-box unless text.layoutMetrics is required", () => {
    const measured = frameOf(label(true, "center", "alphabetic", "III"));
    const legacy = frameOf(label(false, "center", "alphabetic", "III"));
    expect(legacy.textLayoutMetrics).toBeUndefined();
    const item = measured.drawItems.find((entry) => entry.nodeId === "Title");
    if (!item || item.geometry.kind !== "text") throw new Error("expected text");
    const line = measureTextLine(item.geometry.content, item.geometry.font, "center", "alphabetic");
    const legacyWidth = item.geometry.font.size * 0.6 * [...item.geometry.content].length;
    const outsideMeasured = { x: line.box.max.x + 1, y: 0 };
    expect(outsideMeasured.x).toBeLessThan(legacyWidth / 2);
    expect(hitTest(measured, at(measured, "Title", outsideMeasured))).toBeUndefined();
    expect(hitTest(legacy, at(legacy, "Title", outsideMeasured))?.nodeId).toBe("Title");
  });

  it("lets host measureText override builtin metrics", () => {
    const frame = frameOf(label(true, "left", "alphabetic", "GO"));
    const narrow = { measureText: () => ({ width: 2, ascent: 16, descent: 4 }) };
    expect(hitTest(frame, at(frame, "Title", { x: 1, y: -4 }))?.nodeId).toBe("Title");
    expect(hitTest(frame, at(frame, "Title", { x: 8, y: -4 }), narrow)).toBeUndefined();
  });

  it("uses the measured box for spatial text outlines", () => {
    const camera: SpatialCamera = { projection: "perspective" };
    const project = (requires: boolean) => {
      const frame = frameOf(label(requires, "left", "alphabetic", "WWW"));
      const layers: SpatialLayer[] = [{ id: "L", camera, surfaces: [{ nodeId: "Title" }] }];
      return projectSpatialFrame(frame, layers).frame.drawItems.find((item) => item.nodeId === "Title")!;
    };
    const measured = project(true);
    const legacy = project(false);
    expect(measured.logicalMatrix).not.toEqual(legacy.logicalMatrix);
  });
});
