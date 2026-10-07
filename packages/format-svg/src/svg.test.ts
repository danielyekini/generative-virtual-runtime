import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importSource } from "@gvr/format-import-core";
import { verifyRoundTrip } from "@gvr/round-trip";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { svgAdapter } from "./adapter";
import { parseSvgPath } from "./path";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/import/svg");

function load(name: string) {
  const source = readFileSync(join(fixtureDir, `${name}.svg`), "utf8");
  return importSource(svgAdapter, source, { sourceName: `${name}.svg` });
}

function origin(name: string, nodeId: string) {
  const result = load(name);
  expect(result.scene, name).toBeDefined();
  const item = new AnimationRuntime(result.scene!).evaluate(0).drawItems.find((draw) => draw.nodeId === nodeId);
  expect(item, nodeId).toBeDefined();
  return { result, point: transformPoint(item!.logicalMatrix, 0, 0), item: item! };
}

describe("svg adapter", () => {
  it("does not depend on MotionScript or the canvas renderer", () => {
    const pkg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8");
    const dependencies = JSON.parse(pkg).dependencies as Record<string, string>;
    expect(Object.keys(dependencies).sort()).toEqual(["@gvr/format-import-core", "@gvr/schema"]);
  });

  it("imports static primitives into validated Scene IR", () => {
    const result = load("static_primitives");
    expect(result.fidelity.overall).toBe("exact");
    expect(validateSceneIR(result.scene).ok).toBe(true);
    const kinds = result.scene!.nodes.map((node) => node.kind);
    expect(kinds).toEqual(["rectangle", "circle", "ellipse", "line", "polygon", "path", "path"]);
    const dot = origin("static_primitives", "dot");
    expect(dot.point).toEqual({ x: 80, y: 30 });
    expect(dot.item.geometry.kind).toBe("circle");
  });

  it("keeps nested transforms parent-local", () => {
    const dot = origin("nested_groups", "outer.inner.dot");
    expect(dot.result.scene!.nodes.find((node) => node.id === "outer.inner.dot")?.parentId).toBe("outer.inner");
    expect(dot.point.x).toBeCloseTo(20, 4);
    expect(dot.point.y).toBeCloseTo(32, 4);
  });

  it("translates a viewBox minX/minY to the origin", () => {
    const box = origin("viewbox_offset", "view.box");
    expect(box.result.scene!.viewport).toEqual({ width: 100, height: 80, fit: "contain" });
    expect(box.point.x).toBeCloseTo(0, 4);
    expect(box.point.y).toBeCloseTo(0, 4);
  });

  it("rotates a rectangle about a point", () => {
    const box = origin("rotate_about_point", "box.box");
    expect(box.point.x).toBeCloseTo(60, 3);
    expect(box.point.y).toBeCloseTo(10, 3);
  });

  it("scales preserveAspectRatio none onto the viewport", () => {
    const box = origin("preserve_none", "view.box");
    expect(box.result.scene!.viewport).toEqual({ width: 200, height: 50, fit: "contain" });
    const corner = transformPoint(box.item.logicalMatrix, 100, 100);
    expect(corner.x).toBeCloseTo(200, 3);
    expect(corner.y).toBeCloseTo(50, 3);
  });

  it("marks simple text as approximated and keeps the string", () => {
    const result = load("simple_text");
    expect(result.fidelity.overall).toBe("degraded");
    const text = result.scene!.nodes.find((node) => node.kind === "text");
    expect(text && text.kind === "text" && text.content).toBe("Hello");
    expect(result.diagnostics.some((item) => item.feature === "text" && item.fidelity === "approximated")).toBe(true);
  });

  it("isolates overlapping group opacity", () => {
    const result = load("group_opacity_overlap");
    expect(result.fidelity.overall).toBe("exact");
    const group = result.scene!.nodes.find((node) => node.id === "stack");
    expect(group?.kind === "group" && group.compositing?.isolated).toBe(true);
    expect(group?.opacity).toBe(0.5);
    expect(result.scene!.nodes.filter((node) => node.kind === "rectangle").every((node) => node.opacity === 1)).toBe(true);
  });

  it("rejects scripts and event handlers with no scene", () => {
    const result = load("script_event");
    expect(result.ok).toBe(false);
    expect(result.scene).toBeUndefined();
    expect(result.fidelity.overall).toBe("failed");
  });

  it("lowers arcs to cubics and round-trips the static scene", () => {
    const quarter = parseSvgPath("M1 0 A1 1 0 0 1 0 1");
    expect(quarter?.approximated).toBe(true);
    const curve = quarter?.commands.find((command) => command.cmd === "C");
    expect(curve && curve.cmd === "C" && curve.x).toBeCloseTo(0, 3);
    expect(curve && curve.cmd === "C" && curve.y).toBeCloseTo(1, 3);

    const result = load("arc_path");
    expect(result.fidelity.overall).toBe("degraded");
    expect(result.diagnostics.some((item) => item.feature === "arc")).toBe(true);
    const report = verifyRoundTrip(result.scene!);
    expect(report.ok, report.mismatches.map((item) => item.property).join(",")).toBe(true);
  });

  it("round-trips the five comparison fixtures", () => {
    for (const name of ["static_primitives", "nested_groups", "viewbox_offset", "rotate_about_point", "preserve_none"]) {
      const result = load(name);
      expect(result.fidelity.overall, name).toBe("exact");
      const report = verifyRoundTrip(result.scene!);
      expect(report.ok, name).toBe(true);
    }
  });

  it("imports time-based SMIL opacity and embedded CSS keyframes", () => {
    const smil = load("smil_opacity");
    expect(smil.ok).toBe(true);
    expect(smil.scene!.irVersion).toBe("0.2");
    expect(smil.scene!.timeline.durationMs).toBe(2000);
    const runtime = new AnimationRuntime(smil.scene!);
    const frame = runtime.evaluate(1000);
    const box = frame.drawItems.find((item) => item.nodeId.endsWith("box"));
    expect(box?.opacity).toBeCloseTo(0.5, 2);

    const css = load("css_fade");
    expect(css.ok).toBe(true);
    expect(css.scene!.requiredCapabilities).toContain("svg.cssKeyframes");
    const faded = new AnimationRuntime(css.scene!).evaluate(0);
    const green = faded.drawItems.find((item) => item.nodeId.endsWith("box"));
    expect(green?.opacity).toBeCloseTo(0, 2);
  });

  it("loads every svg fixture", () => {
    const files = readdirSync(fixtureDir).filter((name) => name.endsWith(".svg"));
    expect(files.length).toBeGreaterThanOrEqual(5);
  });
});
