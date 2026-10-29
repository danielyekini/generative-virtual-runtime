import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { importSource } from "@gvr/format-import-core";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { formatRoundTripReport, verifyRoundTrip } from "@gvr/round-trip";
import { AnimationRuntime } from "@gvr/runtime";
import { applySegmentEasing, transformPoint, validateSceneIR } from "@gvr/schema";
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
    const child = result.scene!.nodes.find((node) => node.id === "layer_2");
    expect(child?.parentId).toBeNull();
    expect(child?.transformParentId).toBe("layer_1");
    if (child?.kind === "group") {
      expect(child.transform.position).toEqual({ x: 50, y: 0 });
    }
  });


  it("keeps global source layer paint order independent of transform parenting", () => {
    const imported = load("parent_interleaved_layers");
    expect(imported.ok).toBe(true);
    expect(imported.scene!.requiredCapabilities).toContain("transform.parent");
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const child = scene.nodes.find(node => node.id === "layer_1")!;
      expect(child.parentId).toBeNull();
      expect(child.transformParentId).toBe("layer_3");
      for (const time of [0, 1500, 500, 1999, 1000]) {
        const items = new AnimationRuntime(scene).evaluate(time).drawItems;
        expect(items.map(item => item.nodeId)).toEqual(["layer_3.Box", "layer_2.Box", "layer_1.Box"]);
        expect(items.at(-1)!.appearance.fill).toMatchObject({ r: 1, g: 0, b: 0 });
        expect(transformPoint(items.at(-1)!.logicalMatrix, 0, 0)).toEqual({ x: 34, y: 34 });
      }
    }
  });

  it("preserves precomp containment opacity and visibility without transform-parent inheritance", () => {
    const imported = load("parent_precomp_containment");
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const child = scene.nodes.find(node => node.id === "layer_10.layer_1")!;
      expect(child.parentId).toBe("layer_10");
      expect(child.transformParentId).toBe("layer_10.layer_3");
      expect(child.inheritOpacity).toBeUndefined();
      const runtime = new AnimationRuntime(scene);
      for (const time of [0, 1500, 500, 1999, 1000]) {
        const items = runtime.evaluate(time).drawItems;
        expect(items.map(item => item.nodeId)).toEqual(["layer_10.layer_2.Box", "layer_10.layer_1.Box"]);
        expect(items.every(item => item.opacity === 0.5)).toBe(true);
      }
    }
  });

  it("keeps multi-level parent transforms without inheriting parent paint state", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "parent_interleaved_layers.json"), "utf8"));
    source.layers[0].parent = 2;
    source.layers[1] = { ...source.layers[1], ty: 3, parent: 3, ks: { ...source.layers[1].ks, p: { a: 0, k: [10, 0] }, o: { a: 0, k: 30 } } };
    source.layers[2] = { ...source.layers[2], ty: 3, hd: true, ip: 30, ks: { ...source.layers[2].ks, p: { a: 0, k: [20, 0] }, o: { a: 0, k: 25 } } };
    const imported = importSource(lottieAdapter, JSON.stringify(source));
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const runtime = new AnimationRuntime(scene);
      for (const time of [0, 1500, 500, 1000]) {
        const items = runtime.evaluate(time).drawItems;
        expect(items).toHaveLength(1);
        expect(items[0]!.opacity).toBe(1);
        expect(transformPoint(items[0]!.logicalMatrix, 0, 0)).toEqual({ x: 64, y: 34 });
      }
    }
  });

  it("retains source paint order inside isolated render scopes through round trip", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "parent_interleaved_layers.json"), "utf8"));
    source.layers[1].bm = 1;
    const imported = importSource(lottieAdapter, JSON.stringify(source));
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    const leaves = (tree: any): string[] => tree.kind === "leaf" ? [tree.item.nodeId] : tree.children.flatMap(leaves);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const frame = new AnimationRuntime(scene).evaluate(0);
      expect(leaves(frame.renderTree)).toEqual(["layer_3.Box", "layer_2.Box", "layer_1.Box"]);
      expect(leaves(frame.renderTree)).toEqual(frame.drawItems.map(item => item.nodeId));
    }
  });

  it("scopes transform parent lookup to each reused precomp expansion", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "parent_precomp_containment.json"), "utf8"));
    source.layers.push({ ...source.layers[0], ind: 20, ks: { ...source.layers[0].ks, p: { a: 0, k: [100, 0] } } });
    const imported = importSource(lottieAdapter, JSON.stringify(source));
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      expect(scene.nodes.find(node => node.id === "layer_10.layer_1")!.transformParentId).toBe("layer_10.layer_3");
      expect(scene.nodes.find(node => node.id === "layer_20.layer_1")!.transformParentId).toBe("layer_20.layer_3");
      const items = new AnimationRuntime(scene).evaluate(0).drawItems;
      expect(transformPoint(items.find(item => item.nodeId === "layer_10.layer_1.Box")!.logicalMatrix, 0, 0).x).toBe(34);
      expect(transformPoint(items.find(item => item.nodeId === "layer_20.layer_1.Box")!.logicalMatrix, 0, 0).x).toBe(134);
    }
  });

  it("preserves the published one-ancestor opacity skip through round trip", () => {
    const base = load("static_shape").scene!;
    const transform = { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } };
    const scene = { ...base, irVersion: "0.2" as const, requiredCapabilities: ["transform.parent"], nodes: [
      { id: "grand", name: "grand", parentId: null, space: "world" as const, zIndex: 0, transform, visible: true, opacity: 0.5, kind: "group" as const },
      { id: "grand.Bridge", name: "Bridge", parentId: "grand", zIndex: 0, transform, visible: true, opacity: 0.25, kind: "group" as const },
      { id: "grand.Bridge.box", name: "box", parentId: "grand.Bridge", zIndex: 0, transform, visible: true, opacity: 0.8, inheritOpacity: false, kind: "rectangle" as const, size: { x: 10, y: 10 } },
    ], timeline: { durationMs: 2000, tracks: [], steps: [] } };
    expect(validateSceneIR(scene).ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(scene));
    expect(compiled.ok, JSON.stringify(compiled.diagnostics)).toBe(true);
    for (const route of [scene, compiled.scene!]) {
      expect(new AnimationRuntime(route).evaluate(0).drawItems[0]!.opacity).toBe(0.4);
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

  it("paints nested shape groups in reverse source order through round trip", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "sibling_fill.json"), "utf8"));
    const shape = (name: string, color: number[]) => ({ ty: "gr", nm: name, it: [
      { ty: "rc", nm: "Box", p: { a: 0, k: [20, 20] }, s: { a: 0, k: [40, 40] }, r: { a: 0, k: 0 } },
      { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 } },
    ] });
    source.layers[0].shapes = [{ ty: "gr", nm: "Outer", it: [shape("Face", [1, 0, 0, 1]), shape("Hair", [0, 0, 1, 1])] }];
    const imported = importSource(lottieAdapter, JSON.stringify(source), { sourceName: "nested-paint-order.json" });
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const items = new AnimationRuntime(scene).evaluate(0).drawItems;
      expect(items.map(item => item.nodeId)).toEqual(["layer_1.Outer.Hair.Box", "layer_1.Outer.Face.Box"]);
      expect(items[0]!.appearance.fill).toMatchObject({ type: "solid", b: 1 });
      expect(items[1]!.appearance.fill).toMatchObject({ type: "solid", r: 1 });
    }
  });

  it("reports omitted animated fill colour instead of claiming exact conversion", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "sibling_fill.json"), "utf8"));
    const fill = source.layers[0].shapes.find((shape: { ty: string }) => shape.ty === "fl");
    fill.c = { a: 1, k: [{ t: 0, s: [1, 0, 0, 1] }, { t: 30, s: [0, 0, 1, 1] }] };
    source.layers[0].shapes = [{ ty: "gr", nm: "Nested", it: source.layers[0].shapes }];
    const result = importSource(lottieAdapter, JSON.stringify(source), { sourceName: "animated-fill.json" });
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("partial");
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ feature: "animated-fill-color", fidelity: "unsupported" })]));
    expect(result.fidelity.unsupported.some(item => item.target?.endsWith(".c"))).toBe(true);
  });

  it("parents children when the parent layer is listed later in the JSON", () => {
    const result = load("parent_listed_later");
    expect(result.ok).toBe(true);
    const child = result.scene!.nodes.find((node) => node.id === "layer_2");
    expect(child?.parentId).toBeNull();
    expect(child?.transformParentId).toBe("layer_10");
    const runtime = new AnimationRuntime(result.scene!);
    const dot = "layer_2.Dot";
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

  it("preserves source cubic handles through import and shuffled round-trip seeks", () => {
    const imported = load("easing_preservation");
    expect(imported.fidelity.overall).toBe("exact");
    const controls = [[.167, .172, .833, .829], [.7, .2, .01, .02], [.99, .98, .2, .8], [.1, .9, .42, .2], [.42, 0, .58, 1], [.2, -.5, .8, 1.5]];
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    const runtimes = [new AnimationRuntime(imported.scene!), new AnimationRuntime(compiled.scene!)];
    const component = (u: number, a: number, b: number) => 3 * (1-u)**2 * u * a + 3 * (1-u) * u**2 * b + u**3;
    controls.forEach(([x1, y1, x2, y2], index) => {
      const nodeId = `layer_${index + 1}`;
      const track = imported.scene!.timeline.tracks.find(t => t.kind === "keyframe" && t.target.kind === "node" && t.target.nodeId === nodeId && t.target.channel === "transform.position.x");
      expect(track?.kind === "keyframe" && track.keyframes[0]?.easing).toEqual({ type: "cubic", x1, y1, x2, y2 });
      for (const progress of [.75, 0, .25, 1, .5, .001, .999]) {
        // Independent bisection of the source parametric curve, not named easing.
        let lo = 0, hi = 1;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          if (component(mid, x1!, x2!) < progress) lo = mid; else hi = mid;
        }
        const expected = 40 + 320 * component((lo + hi) / 2, y1!, y2!);
        for (const runtime of runtimes) expect(Math.abs(origin(runtime, progress * 2000, `${nodeId}.group0.ellipseNode`)!.x - expected)).toBeLessThan(.001);
      }
    });
  });

  it("preserves animated shape-group transforms and opacity", () => {
    const imported = load("animated_group_transform");
    expect(imported.fidelity.overall).toBe("exact");
    expect(verifyRoundTrip(imported.scene!).ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      const runtime = new AnimationRuntime(scene);
      for (const t of [1000, 0, 2000, 500]) {
        const f = t / 2000, angle = Math.PI * f, scale = 2 - f;
        const item = runtime.evaluate(t).drawItems.find(i => i.nodeId === "layer_1.Moving.ellipseNode")!;
        const point = transformPoint(item.logicalMatrix, 0, 0);
        expect(point.x).toBeCloseTo(10 + 20*f + 15*scale*Math.cos(angle), 3);
        expect(point.y).toBeCloseTo(15*scale*Math.sin(angle), 3);
        expect(item.opacity).toBeCloseTo(1-f, 3);
      }
    }
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

  it("preserves clipped cubic position and morph through shuffled round-trip seeks", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "track_outside_duration.json"), "utf8"));
    const easing = { type: "cubic" as const, x1: .333, y1: 0, x2: .667, y2: 1 };
    const handles = { i: { x: .667, y: 1 }, o: { x: .333, y: 0 } };
    Object.assign(source.layers[0].ks.p.k[0], handles);
    const path = (x: number) => ({ v: [[x, 0], [x + 10, 0]], i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], c: false });
    source.layers[0].shapes[0] = { ty: "sh", nm: "Morph", ks: { a: 1, k: [
      { t: 0, s: [path(0)], ...handles }, { t: 30, s: [path(100)] },
    ] } };
    const imported = importSource(lottieAdapter, JSON.stringify(source), { sourceName: "clipped-cubic.json" });
    expect(imported.ok).toBe(true);
    const compiled = compileMotionScript(emitMotionScript(imported.scene!));
    expect(compiled.ok).toBe(true);
    for (const scene of [imported.scene!, compiled.scene!]) {
      expect(validateSceneIR(scene).ok).toBe(true);
      const runtime = new AnimationRuntime(scene);
      for (const time of [1000, 0, 500, 125, 875, 250, 750, 0]) {
        const item = runtime.evaluate(time).drawItems.find(item => item.geometry.kind === "path")!;
        const expected = 100 * applySegmentEasing(easing, (time + 1000) / 3000);
        expect(transformPoint(item.logicalMatrix, 0, 0).x).toBeCloseTo(expected, 4);
        if (item.geometry.kind === "path") expect((item.geometry.commands[0] as { x: number }).x).toBeCloseTo(expected, 4);
      }
    }
  });

  it("preserves cubic scalar and morph curves when both composition boundaries clip keys", () => {
    const result = load("clipped_cubic_morph");
    expect(result.fidelity.overall).toBe("exact");
    expect(validateSceneIR(result.scene).ok).toBe(true);
    const emitted = compileMotionScript(emitMotionScript(result.scene!));
    expect(emitted.ok).toBe(true);
    const direct = new AnimationRuntime(result.scene!);
    const compiled = new AnimationRuntime(emitted.scene!);
    const curve = { type: "cubic" as const, x1: 0.333, y1: 0, x2: 0.667, y2: 1 };
    // Independent source-time oracle: do not compare two identically clipped routes alone.
    for (const frame of [10, 11, 20, 29.5, 30, 40, 49.5, 50, 20, 10]) {
      const u = applySegmentEasing(curve, (frame < 30 ? frame : frame - 30) / 30);
      const expectedPosition = frame < 30 ? 100 * u : 100 * (1 - u);
      const expectedMorphX = frame < 30 ? -20 - 20 * u : -40 + 20 * u;
      const timeMs = (frame - 10) * 1000 / 30;
      for (const runtime of [direct, compiled]) {
        const draw = runtime.evaluate(timeMs).drawItems[0]!;
        expect(draw.logicalMatrix[6], `position at source frame ${frame}`).toBeCloseTo(expectedPosition, 3);
        expect(draw.geometry.kind).toBe("path");
        if (draw.geometry.kind === "path") {
          const first = draw.geometry.commands[0]!;
          expect(first.cmd).toBe("M");
          if (first.cmd === "M") expect(first.x, `morph at source frame ${frame}`).toBeCloseTo(expectedMorphX, 3);
        }
      }
    }
  });

  it("reports non-monotonic clipped spatial geometry as approximate", () => {
    const raw = JSON.parse(readFileSync(join(fixtureDir, "track_outside_duration.json"), "utf8"));
    const keys = raw.layers[0].ks.p.k;
    keys[0].to = [20, 80, 0];
    keys[0].ti = [-20, -40, 0];
    keys[0].o = { x: 0.3, y: -0.2 };
    keys[0].i = { x: 0.7, y: 1.2 };
    const result = importSource(lottieAdapter, JSON.stringify(raw));
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("degraded");
    expect(result.diagnostics.some(item => item.feature === "spatial-window-clipping" && item.fidelity === "approximated")).toBe(true);
    expect(validateSceneIR(result.scene).ok).toBe(true);
    expect(verifyRoundTrip(result.scene!).ok).toBe(true);
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

  it("preserves ordered stroke passes with shared morph trim and transforms", () => {
    const result = load("multiple_stroke_morph_trim");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    const paths = result.scene!.nodes.filter(node => node.kind === "path");
    expect(paths).toHaveLength(2);
    expect(paths[0]!.parentId).toBe(paths[1]!.parentId);
    expect(paths[0]!.stroke?.color.type).toBe("linear");
    expect(paths[1]!.stroke?.color).toMatchObject({ type: "solid", r: 1, g: 0, b: 0, a: 0.6 });
    expect(paths.map(path => path.stroke?.width)).toEqual([4, 10]);
    const compiled = compileMotionScript(emitMotionScript(result.scene!));
    expect(compiled.ok).toBe(true);
    const direct = new AnimationRuntime(result.scene!);
    const emitted = new AnimationRuntime(compiled.scene!);
    for (const time of [0, 1000, 500, 1999, 250, 0]) {
      const sample = direct.evaluate(time);
      const draws = sample.drawItems.filter(draw => paths.some(path => path.id === draw.nodeId));
      expect(draws).toHaveLength(2);
      expect(draws.map(draw => draw.nodeId)).toEqual(paths.map(path => path.id));
      expect(draws[0]!.geometry).toEqual(draws[1]!.geometry);
      expect(draws[0]!.logicalMatrix).toEqual(draws[1]!.logicalMatrix);
      expect(transformPoint(draws[0]!.logicalMatrix, 0, 0)).toEqual({ x: 107, y: 111 });
      expect(draws[0]!.logicalMatrix[0]).toBeCloseTo(Math.cos(25 * Math.PI / 180) * 1.2, 5);
      const compare = (a: unknown, b: unknown, color = false): void => {
        if (typeof a === "number" && typeof b === "number") {
          expect(Math.abs(a - b)).toBeLessThanOrEqual(color ? 1 / 255 : 0.001);
        } else if (a && b && typeof a === "object" && typeof b === "object") {
          expect(Object.keys(a)).toEqual(Object.keys(b));
          const isColor = "r" in a && "g" in a && "b" in a && "a" in a;
          for (const key of Object.keys(a)) compare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], isColor);
        } else expect(a).toEqual(b);
      };
      compare(sample, emitted.evaluate(time));
      if (time === 0 && draws[0]!.geometry.kind === "path") expect(draws[0]!.geometry.commands).toHaveLength(0);
      if (time === 1000 && draws[0]!.geometry.kind === "path") expect(draws[0]!.geometry.commands.length).toBeGreaterThan(0);
    }
    const roundTrip = verifyRoundTrip(result.scene!);
    expect(roundTrip.ok, formatRoundTripReport(roundTrip)).toBe(true);
  });

  it("keeps stroke scope on preceding geometry", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "multiple_stroke_morph_trim.json"), "utf8"));
    const items = source.layers[0].shapes[0].it;
    items.splice(2, 0, { ...structuredClone(items[0]), nm: "Later path" });
    const result = importSource(lottieAdapter, JSON.stringify(source));
    expect(result.ok).toBe(true);
    const paths = result.scene!.nodes.filter(node => node.kind === "path");
    expect(paths).toHaveLength(3);
    expect(paths.filter(path => path.id.includes("Later")).map(path => path.stroke?.width)).toEqual([4]);
    expect(paths.filter(path => !path.id.includes("Later")).map(path => path.stroke?.width)).toEqual([4, 10]);
  });

  it("retains two gradient strokes instead of overwriting the first", () => {
    const source = JSON.parse(readFileSync(join(fixtureDir, "multiple_stroke_morph_trim.json"), "utf8"));
    const items = source.layers[0].shapes[0].it;
    items[1] = { ...structuredClone(items[2]), w: { a: 0, k: 8 } };
    const result = importSource(lottieAdapter, JSON.stringify(source));
    expect(result.ok).toBe(true);
    const paths = result.scene!.nodes.filter(node => node.kind === "path");
    expect(paths.map(path => path.stroke?.width)).toEqual([4, 8]);
    expect(paths.map(path => path.stroke?.color.type)).toEqual(["linear", "linear"]);
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

it("converts trim offset degrees and discloses unverified trim modes", () => {
 const source=JSON.parse(readFileSync(join(fixtureDir,'animated_trim.json'),'utf8'));
 const trim=source.layers[0].shapes[0].it.find((item: {ty:string})=>item.ty==='tm');
 trim.o={a:0,k:90};trim.m=2;
 const result=importSource(lottieAdapter,JSON.stringify(source),{sourceName:'trim-modes.json'});
 const operation=result.scene?.geometryOperators?.[0]?.operators[0];
 expect(operation?.op).toBe('trim');
 if(operation?.op==='trim')expect(operation.offset).toBe(.25);
 expect(result.diagnostics.some(item=>item.feature==='tm' && item.fidelity==='approximated' && item.message.includes('Individual'))).toBe(true);
 expect(result.diagnostics.some(item=>item.feature==='tm' && item.fidelity==='approximated' && item.message.includes('wrapped tail'))).toBe(true);
 trim.o={a:1,k:[{t:0,s:[0],i:{x:[.833],y:[.833]},o:{x:[.167],y:[.167]}},{t:30,s:[90]}]};
 const animated=importSource(lottieAdapter,JSON.stringify(source),{sourceName:'animated-offset.json'});
 const offsetTrack=animated.scene?.timeline.tracks.find(track=>track.kind==='keyframe' && track.target.kind==='node' && track.target.channel==='trim.offset');
 expect(offsetTrack?.kind).toBe('keyframe');
 if(offsetTrack?.kind==='keyframe')expect(offsetTrack.keyframes.at(-1)?.value).toBe(.25);
});
