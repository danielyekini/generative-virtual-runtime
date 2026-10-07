import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { importSource } from "@gvr/format-import-core";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { formatRoundTripReport, verifyRoundTrip } from "@gvr/round-trip";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { lottieAdapter } from "./adapter";
import { framesToMs } from "@gvr/format-import-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureDir = join(root, "fixtures/import/lottie");

function load(name: string) {
  const source = readFileSync(join(fixtureDir, `${name}.json`), "utf8");
  return importSource(lottieAdapter, source, { sourceName: `${name}.json` });
}

function origin(runtime: AnimationRuntime, timeMs: number, nodeId: string) {
  const item = runtime.evaluate(timeMs).drawItems.find((draw) => draw.nodeId === nodeId);
  if (!item) return undefined;
  return transformPoint(item.logicalMatrix, 0, 0);
}

describe("lottie adapter", () => {
  it("imports deterministic IR for the same bytes", () => {
    const first = load("static_shape");
    const second = load("static_shape");
    expect(JSON.stringify(first.scene)).toBe(JSON.stringify(second.scene));
  });

  it("validates imported Scene IR", () => {
    for (const name of ["static_shape", "solid_layer", "parented_transform", "hold_keyframe", "in_point"]) {
      const result = load(name);
      expect(result.ok, name).toBe(true);
      const validated = validateSceneIR(result.scene);
      expect(validated.ok, name).toBe(true);
    }
  });

  it("maps anchor and position as position = p - a", () => {
    const result = load("rotation_anchor");
    expect(result.ok).toBe(true);
    const layer = result.scene!.nodes.find((node) => node.id === "layer_1");
    expect(layer?.kind).toBe("group");
    if (layer?.kind === "group") {
      expect(layer.transform.pivot).toEqual({ x: 25, y: 25 });
      expect(layer.transform.position).toEqual({ x: 125, y: 125 });
    }
  });

  it("keeps parent-local child transforms", () => {
    const result = load("parented_transform");
    const child = result.scene!.nodes.find((node) => node.id === "layer_1.layer_2");
    expect(child?.parentId).toBe("layer_1");
    if (child?.kind === "group") {
      expect(child.transform.position).toEqual({ x: 50, y: 0 });
    }
  });

  it("applies fill when fl is a sibling of geometry under shapes", () => {
    const result = load("sibling_fill");
    expect(result.ok).toBe(true);
    const circle = result.scene!.nodes.find((node) => node.kind === "ellipse");
    expect(circle && "fill" in circle && circle.fill).toBeTruthy();
    if (circle && "fill" in circle && circle.fill?.type === "solid") {
      expect(circle.fill.r).toBeCloseTo(0.2, 4);
      expect(circle.fill.g).toBeCloseTo(0.7, 4);
      expect(circle.fill.b).toBeCloseTo(0.9, 4);
    }
  });

  it("parents children when the parent layer is listed later in the JSON", () => {
    const result = load("parent_listed_later");
    expect(result.ok).toBe(true);
    const child = result.scene!.nodes.find((node) => node.id === "layer_10.layer_2");
    expect(child?.parentId).toBe("layer_10");
    const runtime = new AnimationRuntime(result.scene!);
    const dot = "layer_10.layer_2.Dot";
    expect(origin(runtime, 0, dot)?.x).toBeCloseTo(120, 3);
    expect(origin(runtime, 1000, dot)?.x).toBeCloseTo(190, 3);
  });

  it("maps Lottie rectangle centre to Scene IR top-left", () => {
    const result = load("centred_rect");
    const box = result.scene!.nodes.find((node) => node.kind === "rectangle");
    expect(box?.kind).toBe("rectangle");
    if (box?.kind === "rectangle") {
      expect(box.transform.position).toEqual({ x: 60, y: 30 });
      expect(box.size).toEqual({ x: 80, y: 40 });
      expect(box.fill).toBeDefined();
    }
  });

  it("converts composition in-point to duration and scene time zero", () => {
    const result = load("in_point");
    expect(result.scene!.timeline.durationMs).toBe(2000);
    const dot = result.scene!.nodes.find((node) => node.kind === "ellipse");
    expect(dot).toBeDefined();
  });

  it("animates position in milliseconds", () => {
    const result = load("animated_position");
    expect(result.ok).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const dot = "layer_1.group0.ellipseNode";
    const start = origin(runtime, 0, dot);
    const mid = origin(runtime, 500, dot);
    const end = origin(runtime, 1000, dot);
    expect(start?.x).toBeCloseTo(40, 3);
    expect(end?.x).toBeCloseTo(360, 3);
    expect(mid!.x).toBeGreaterThan(start!.x);
    expect(mid!.x).toBeLessThan(end!.x);
  });

  it("holds flat segments before the next key time", () => {
    const result = load("hold_keyframe");
    expect(result.ok).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const dot = "layer_1.group0.ellipseNode";
    expect(origin(runtime, 0, dot)?.x).toBeCloseTo(50, 3);
    expect(origin(runtime, 1000, dot)?.x).toBeCloseTo(50, 3);
    expect(origin(runtime, 1500, dot)?.x).toBeCloseTo(150, 3);
  });

  it("preserves spatial tangent Z for arc-length sampling", () => {
    const result = load("spatial_tangent_z");
    expect(result.ok).toBe(true);
    const track = result.scene!.timeline.tracks.find(
      (item) => item.kind === "keyframe" && item.target.kind === "node" && item.target.channel === "transform.position",
    );
    expect(track?.kind).toBe("keyframe");
    if (track?.kind === "keyframe") {
      expect(track.keyframes[0]?.spatial?.out).toMatchObject({ x: 50, y: 0, z: 400 });
      expect(track.keyframes[0]?.spatial?.in).toMatchObject({ x: -50, y: 0, z: -400 });
    }
    const validated = validateSceneIR(result.scene);
    expect(validated.ok, validated.ok ? "" : JSON.stringify(validated)).toBe(true);
    const mid = origin(new AnimationRuntime(result.scene!), 1000, "layer_1");
    // 3D arc-length mid differs from the 2D-only chord mid on this handle layout.
    expect(mid?.x).not.toBeCloseTo(200, 0);
  });

  it("imports solid stroke line caps and joins", () => {
    const result = load("stroke_round_cap");
    expect(result.ok).toBe(true);
    const path = result.scene!.nodes.find((node) => node.kind === "path");
    expect(path && "stroke" in path && path.stroke?.cap).toBe("round");
    expect(path && "stroke" in path && path.stroke?.join).toBe("round");
  });

  it("keeps mild AE-near easings as cubics; true diagonal stays linear", () => {
    const result = load("easing_ae_near_linear");
    expect(result.ok).toBe(true);
    const tracks = result.scene!.timeline.tracks.filter(
      (track) => track.kind === "keyframe" && track.target.kind === "node" && track.target.channel === "transform.position",
    );
    expect(tracks.length).toBe(2);
    const mild = tracks.find((track) => track.kind === "keyframe" && track.keyframes[0]?.easing && typeof track.keyframes[0].easing === "object");
    const linear = tracks.find((track) => track.kind === "keyframe" && track.keyframes[0]?.easing === "linear");
    expect(mild?.kind).toBe("keyframe");
    if (mild?.kind === "keyframe") {
      expect(mild.keyframes[0]?.easing).toEqual({ type: "cubic", x1: 0.167, y1: 0.118, x2: 0.833, y2: 0.877 });
    }
    expect(linear?.kind).toBe("keyframe");
    if (linear?.kind === "keyframe") {
      expect(linear.keyframes[0]?.easing).toBe("linear");
    }
    expect(result.scene!.requiredCapabilities).toContain("easing.cubicBezier");
  });

  it("imports animated trim as trim.start/end tracks", () => {
    const result = load("animated_trim");
    expect(result.ok, result.diagnostics.map((item) => `${item.feature}:${item.message}`).join("\n")).toBe(true);
    expect(result.scene?.requiredCapabilities).toContain("geometry.animatedTrim");
    expect(result.scene?.geometryOperators?.some((entry) => entry.operators.some((op) => op.op === "trim"))).toBe(true);
    const endTrack = result.scene?.timeline.tracks.find(
      (track) => track.kind === "keyframe" && track.target.kind === "node" && track.target.channel === "trim.end",
    );
    expect(endTrack?.kind).toBe("keyframe");
    if (endTrack?.kind === "keyframe") {
      expect(endTrack.keyframes[0]?.value).toBeCloseTo(0, 5);
      expect(endTrack.keyframes.at(-1)?.value).toBeCloseTo(1, 5);
    }
    expect(result.diagnostics.some((item) => item.feature === "tm" && item.fidelity === "exact")).toBe(true);
    const validated = validateSceneIR(result.scene);
    expect(validated.ok, validated.ok ? "" : JSON.stringify(validated)).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const pathId = result.scene!.geometryOperators![0]!.nodeId;
    const commandsAt = (ms: number) => {
      const item = runtime.evaluate(ms).drawItems.find((draw) => draw.nodeId === pathId);
      return item?.geometry.kind === "path" ? item.geometry.commands : undefined;
    };
    expect(commandsAt(0)?.length ?? 0).toBe(0);
    expect((commandsAt(1000)?.length ?? 0) > 0).toBe(true);
  });

  it("inventories omitted constructs before lowering", () => {
    const result = load("inventory_gaps");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("partial");
    const features = result.diagnostics.map((item) => `${item.feature}\t${item.target ?? ""}`);
    expect(features).toContain("layer\tasset_comp_1.layer_3");
    expect(features).toContain("matte\tlayer_2");
    expect(features).toContain("effect\tlayer_2");
    expect(features).not.toContain("precomp\tasset_comp_1");
    expect(features).not.toContain("solid-color\tlayer_2");
    expect(result.diagnostics.some((item) => item.feature === "spatial-tangent" && item.fidelity === "exact")).toBe(true);
    expect(result.diagnostics.some((item) => item.feature === "spatial-tangent" && item.fidelity === "unsupported")).toBe(false);
    expect(result.diagnostics.some((item) => item.message.includes("Gaussian Blur"))).toBe(true);
    expect(result.diagnostics.some((item) => item.feature === "precomp" && item.fidelity === "exact")).toBe(true);
    const solid = load("solid_layer");
    expect(solid.fidelity.overall).toBe("exact");
    expect(solid.diagnostics.some((item) => item.feature === "solid-color")).toBe(false);
  });

  it("clamps tracks that start before or extend past the composition window", () => {
    const result = load("track_outside_duration");
    expect(result.ok).toBe(true);
    expect(result.scene).toBeDefined();
    const validated = validateSceneIR(result.scene);
    expect(validated.ok, validated.ok ? "" : JSON.stringify(validated)).toBe(true);
    const duration = result.scene!.timeline.durationMs;
    expect(duration).toBeCloseTo(1000, 6);
    for (const track of result.scene!.timeline.tracks) {
      expect(track.startMs).toBeGreaterThanOrEqual(0);
      expect(track.startMs).toBeLessThan(duration);
      expect(track.startMs + track.durationMs).toBeLessThanOrEqual(duration + 1e-6);
    }
    const runtime = new AnimationRuntime(result.scene!);
    const nodeId = "layer_1.ellipseNode";
    const start = origin(runtime, 0, nodeId);
    const mid = origin(runtime, 500, nodeId);
    const end = origin(runtime, 999, nodeId);
    // Composition window is frames 10–20 of a 0→100 move across frames 0–30.
    expect(start?.x).toBeCloseTo(100 / 3, 1);
    expect(end?.x).toBeCloseTo(200 / 3, 1);
    expect(mid!.x).toBeGreaterThan(start!.x);
    expect(mid!.x).toBeLessThan(end!.x);
  });

  it("places solid layers over composition bounds not centred at origin", () => {
    const result = load("solid_layer");
    expect(result.ok).toBe(true);
    const solid = result.scene!.nodes.find((node) => node.id === "layer_1.solid");
    expect(solid?.kind).toBe("rectangle");
    if (solid?.kind !== "rectangle") throw new Error("missing solid");
    expect(solid.transform.position).toEqual({ x: 0, y: 0 });
    expect(solid.size).toEqual({ x: 320, y: 240 });
    const runtime = new AnimationRuntime(result.scene!);
    const item = runtime.evaluate(0).drawItems.find((draw) => draw.nodeId === solid.id);
    expect(item).toBeDefined();
    const topLeft = transformPoint(item!.logicalMatrix, 0, 0);
    const bottomRight = transformPoint(item!.logicalMatrix, solid.size.x, solid.size.y);
    expect(topLeft.x).toBeCloseTo(0, 3);
    expect(topLeft.y).toBeCloseTo(0, 3);
    expect(bottomRight.x).toBeCloseTo(320, 3);
    expect(bottomRight.y).toBeCloseTo(240, 3);
  });

  it("omits non-positive stroke width so validation accepts fill-only shapes", () => {
    const result = load("zero_stroke_width");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    expect(result.scene).toBeDefined();
    const validated = validateSceneIR(result.scene);
    expect(validated.ok).toBe(true);
    const ellipse = result.scene!.nodes.find((node) => node.kind === "ellipse");
    expect(ellipse?.kind).toBe("ellipse");
    if (ellipse?.kind === "ellipse") {
      expect(ellipse.stroke).toBeUndefined();
      expect(ellipse.fill).toBeDefined();
    }
    const runtime = new AnimationRuntime(result.scene!);
    const duration = result.scene!.timeline.durationMs;
    for (const timeMs of [0, duration / 2, Math.max(0, duration - 1)]) {
      const item = runtime.evaluate(timeMs).drawItems.find((draw) => draw.nodeId === ellipse!.id);
      expect(item?.appearance.stroke, `stroke at ${timeMs}`).toBeUndefined();
      expect(item?.appearance.fill, `fill at ${timeMs}`).toBeDefined();
    }
  });

  it("lowers static Gaussian Blur onto an isolated blur effect", () => {
    const result = load("gaussian_blur_static");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    expect(result.fidelity.unsupported).toHaveLength(0);
    const layer = result.scene!.nodes.find((node) => node.id === "layer_1");
    expect(layer?.kind).toBe("group");
    if (layer?.kind === "group") {
      expect(layer.compositing).toEqual({ isolated: true, effect: { type: "blur", radius: 6 } });
    }
    expect(result.scene!.requiredCapabilities).toContain("effects.blur");
    const runtime = new AnimationRuntime(result.scene!);
    for (const timeMs of [0, 500, 1000]) {
      const frame = runtime.evaluate(timeMs);
      expect(frame.renderTree?.kind).toBe("scope");
      const blurred = frame.renderTree?.kind === "scope"
        ? frame.renderTree.children.find((child) => child.kind === "scope" && child.effect?.type === "blur")
        : undefined;
      expect(blurred, `blur scope at ${timeMs}`).toMatchObject({
        kind: "scope",
        isolated: true,
        effect: { type: "blur", radius: 6 },
      });
    }
    const roundTrip = verifyRoundTrip(result.scene!);
    expect(roundTrip.ok, formatRoundTripReport(roundTrip)).toBe(true);

    const animated = load("gaussian_blur_animated");
    expect(animated.ok).toBe(true);
    expect(animated.fidelity.overall).toBe("partial");
    expect(animated.diagnostics.some((item) => item.feature === "effect" && item.fidelity === "unsupported")).toBe(true);
    const animatedLayer = animated.scene!.nodes.find((node) => node.id === "layer_1");
    expect(animatedLayer?.kind === "group" && animatedLayer.compositing?.effect).toBeFalsy();

    const blankEdge = load("gaussian_blur_blank_edge");
    expect(blankEdge.ok).toBe(true);
    expect(blankEdge.fidelity.overall).toBe("exact");
    const blankLayer = blankEdge.scene!.nodes.find((node) => node.id === "layer_1");
    expect(blankLayer?.kind === "group" && blankLayer.compositing?.effect).toEqual({ type: "blur", radius: 2.4 });
  });

  it("reports skew and masks without silent loss", () => {
    const skew = load("unsupported_skew");
    expect(skew.ok).toBe(true);
    expect(skew.fidelity.overall).toBe("partial");
    expect(skew.diagnostics.some((item) => item.feature === "skew")).toBe(true);

    const mask = load("unsupported_mask");
    expect(mask.ok).toBe(true);
    expect(mask.fidelity.overall).toBe("partial");
    expect(mask.diagnostics.some((item) => item.feature === "mask")).toBe(true);
  });

  it("fails malformed input without a scene", () => {
    const result = load("malformed");
    expect(result.ok).toBe(false);
    expect(result.scene).toBeUndefined();
  });

  it("round-trips every exact fixture within the documented tolerance", () => {
    const files = readdirSync(fixtureDir).filter((name) => name.endsWith(".json") && !name.includes("expected"));
    const failures: string[] = [];
    for (const file of files) {
      const result = load(file.replace(/\.json$/, ""));
      if (!result.scene || result.fidelity.overall !== "exact") continue;
      const report = verifyRoundTrip(result.scene);
      if (!report.ok) failures.push(`${file}\n${formatRoundTripReport(report)}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("catches a bad easing mapping on an imported fixture", () => {
    const imported = load("animated_position");
    expect(imported.scene).toBeDefined();
    const report = verifyRoundTrip(imported.scene!, {
      emit: (scene) => emitMotionScript(scene).replaceAll("ease linear;", "ease easeIn;"),
    });
    expect(report.ok).toBe(false);
    expect(report.mismatches.some((item) => item.timeMs > 0 && item.timeMs < imported.scene!.timeline.durationMs)).toBe(true);
  });

  it("round-trips through MotionScript at sampled times", () => {
    const imported = load("static_shape");
    const script = emitMotionScript(imported.scene!);
    const compiled = compileMotionScript(script);
    expect(compiled.ok).toBe(true);
    const left = new AnimationRuntime(imported.scene!);
    const right = new AnimationRuntime(compiled.scene!);
    for (const timeMs of [0, 500, 1000, imported.scene!.timeline.durationMs]) {
      const a = left.evaluate(timeMs).drawItems;
      const b = right.evaluate(timeMs).drawItems;
      expect(a.length).toBe(b.length);
      for (let index = 0; index < a.length; index += 1) {
        expect(a[index]!.nodeId).toBe(b[index]!.nodeId);
        const ax = transformPoint(a[index]!.logicalMatrix, 0, 0);
        const bx = transformPoint(b[index]!.logicalMatrix, 0, 0);
        expect(ax.x).toBeCloseTo(bx.x, 3);
        expect(ax.y).toBeCloseTo(bx.y, 3);
      }
    }
  });

  it("documents frame timing helper used by the adapter", () => {
    expect(framesToMs(30, 30)).toBe(1000);
  });

  it("imports static gradient stroke as stroke paint not fill", () => {
    const result = load("gradient_stroke_ring");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    expect(result.fidelity.unsupported).toHaveLength(0);
    expect(result.scene!.requiredCapabilities).toContain("paint.gradientStroke");
    expect(result.scene!.requiredCapabilities).not.toContain("paint.linearGradient");
    const path = result.scene!.nodes.find((node) => node.kind === "path");
    expect(path?.kind).toBe("path");
    if (path?.kind !== "path") throw new Error("missing path");
    expect(path.fill).toBeUndefined();
    expect(path.stroke).toBeDefined();
    expect(path.stroke!.width).toBeCloseTo(3, 5);
    expect(path.stroke!.color.type).toBe("linear");
    if (path.stroke!.color.type === "linear") {
      expect(path.stroke!.color.stops.length).toBeGreaterThanOrEqual(2);
    }
    const validated = validateSceneIR(result.scene);
    expect(validated.ok).toBe(true);
    const roundTrip = verifyRoundTrip(result.scene!);
    expect(roundTrip.ok, formatRoundTripReport(roundTrip)).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const item = runtime.evaluate(0).drawItems.find((draw) => draw.nodeId === path.id);
    expect(item?.appearance.fill).toBeUndefined();
    expect(item?.appearance.stroke?.color.type).toBe("linear");
  });

  it("imports matching-topology animated path morph exactly", () => {
    const result = load("animated_path_morph");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    expect(result.fidelity.unsupported).toHaveLength(0);
    expect(result.scene!.requiredCapabilities).toContain("geometry.pathMorph");
    const pathNode = result.scene!.nodes.find((node) => node.kind === "path");
    expect(pathNode?.kind).toBe("path");
    const track = result.scene!.timeline.tracks.find(
      (entry) => entry.kind === "keyframe" && entry.valueType === "path" && entry.target.kind === "node" && entry.target.channel === "commands",
    );
    expect(track?.kind).toBe("keyframe");
    if (track?.kind !== "keyframe" || pathNode?.kind !== "path") throw new Error("missing morph track");
    const runtime = new AnimationRuntime(result.scene!);
    const duration = result.scene!.timeline.durationMs;
    const commandsAt = (timeMs: number) => {
      const node = runtime.evaluate(timeMs).drawItems.find((draw) => draw.nodeId === pathNode.id);
      return node?.geometry.kind === "path" ? node.geometry.commands : undefined;
    };
    const start = commandsAt(0);
    const mid = commandsAt(duration / 2);
    const nearEnd = commandsAt(Math.max(0, duration - 1 / 30));
    expect(start?.[0]).toMatchObject({ cmd: "M" });
    expect(nearEnd?.[0]).toMatchObject({ cmd: "M" });
    expect(mid?.length).toBe(start?.length);
    expect(mid?.[1]).toMatchObject({ cmd: "C" });
    // Fixture keys: small → wide at mid → small. Mid must differ from the ends.
    if (start?.[1]?.cmd === "C" && mid?.[1]?.cmd === "C" && nearEnd?.[1]?.cmd === "C") {
      expect(Math.abs(mid[1].x - start[1].x)).toBeGreaterThan(1);
      expect(mid[1].x).toBeCloseTo(40, 3);
      expect(start[1].x).toBeCloseTo(nearEnd[1].x, 1);
    }
    const quarter = commandsAt(duration / 4);
    if (start?.[1]?.cmd === "C" && quarter?.[1]?.cmd === "C" && mid?.[1]?.cmd === "C") {
      expect(quarter[1].x).toBeCloseTo((start[1].x + mid[1].x) / 2, 2);
    }
    const roundTrip = verifyRoundTrip(result.scene!);
    expect(roundTrip.ok, formatRoundTripReport(roundTrip)).toBe(true);
  });

  it("loads every golden fixture file", () => {
    const files = readdirSync(fixtureDir).filter((name) => name.endsWith(".json") && !name.includes("expected"));
    expect(files.length).toBeGreaterThanOrEqual(13);
  });

  it("matches recorded diagnostics sidecars", () => {
    for (const name of ["unsupported_skew", "unsupported_mask", "malformed"]) {
      const expected = JSON.parse(readFileSync(join(fixtureDir, `${name}.expected-diagnostics.json`), "utf8")) as {
        overall: string;
        ok: boolean;
        diagnostics: { feature: string; level: string; code: string }[];
      };
      const result = load(name);
      expect(result.ok).toBe(expected.ok);
      expect(result.fidelity.overall).toBe(expected.overall);
      for (const item of expected.diagnostics) {
        expect(result.diagnostics.some((diag) => diag.feature === item.feature && diag.fidelity === item.level)).toBe(true);
      }
    }
  });
});
