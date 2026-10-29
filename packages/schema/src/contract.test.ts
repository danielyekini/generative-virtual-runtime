import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateExpression, parseExpression } from "./expr";
import { MOTION_SCRIPT_EBNF } from "./grammar";
import { drawableOrder, logicalMatrix, worldMatrix } from "./graph";
import { lex } from "./lex";
import { DEFAULT_LIMITS } from "./limits";
import {
  applyEasing,
  cameraViewMatrix,
  containFit,
  mapWorldToLogical,
  rotation,
  transformPoint,
} from "./math";
import { resolveAddress } from "./registry";
import type { SceneIR } from "./types";
import { validateSceneIR } from "./validate";

const repo = resolve(import.meta.dirname, "../../..");

function load(path: string): SceneIR {
  return JSON.parse(readFileSync(resolve(repo, path), "utf8")) as SceneIR;
}

describe("coordinate contract", () => {
  it("rotates the positive x axis clockwise", () => {
    const point = transformPoint(rotation(Math.PI / 2), 1, 0);
    expect(point.x).toBeCloseTo(0, 10);
    expect(point.y).toBeCloseTo(1, 10);
  });

  it("maps the specification camera example to (1040, 360)", () => {
    const viewport = { width: 1280, height: 720 };
    const camera = { position: { x: 500, y: 300 }, zoom: 2, rotation: 0 };
    expect(mapWorldToLogical(viewport, camera, { x: 700, y: 300 })).toEqual({ x: 1040, y: 360 });
    const scene = load("fixtures/ir/valid/camera-mapping.json");
    const cameraNode = scene.cameras[0];
    if (!cameraNode) throw new Error("missing camera");
    const origin = transformPoint(logicalMatrix(scene.nodes, scene.viewport, cameraNode, "marker"), 0, 0);
    expect(origin).toEqual({ x: 1040, y: 360 });
    const meaning = JSON.parse(readFileSync(resolve(repo, "fixtures/meanings/camera.json"), "utf8")) as {
      logicalPoint: { x: number; y: number };
    };
    expect(meaning.logicalPoint).toEqual({ x: 1040, y: 360 });
  });

  it("reads the rectangle from its top-left", () => {
    const scene = load("fixtures/ir/valid/minimal.json");
    const box = scene.nodes[0];
    if (!box) throw new Error("missing box");
    const matrix = worldMatrix(scene.nodes, box.id);
    expect(transformPoint(matrix, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(transformPoint(matrix, 200, 80)).toEqual({ x: 300, y: 130 });
  });

  it("reads the circle from its centre, with top at negative local y", () => {
    const scene = load("fixtures/ir/valid/circle.json");
    const matrix = worldMatrix(scene.nodes, "dot");
    expect(transformPoint(matrix, 0, 0)).toEqual({ x: 400, y: 300 });
    expect(transformPoint(matrix, 0, -40)).toEqual({ x: 400, y: 260 });
    expect(transformPoint(matrix, 40, 0)).toEqual({ x: 440, y: 300 });
  });

  it("rotates the ear around the attachment point", () => {
    const scene = load("fixtures/ir/valid/ear-pivot.json");
    const world = worldMatrix(scene.nodes, "bunny.ear");
    const attachment = transformPoint(world, 0, 30);
    expect(attachment.x).toBeCloseTo(235, 9);
    expect(attachment.y).toBeCloseTo(425, 9);
    const center = transformPoint(world, 0, 0);
    expect(center.x).toBeCloseTo(180 + 55 + 15 * Math.SQRT2, 9);
    expect(center.y).toBeCloseTo(500 + (-75 - 15 * Math.SQRT2), 9);
    const meaning = JSON.parse(readFileSync(resolve(repo, "fixtures/meanings/ear-pivot.json"), "utf8")) as {
      parentAttachment: { x: number; y: number };
      worldAttachment: { x: number; y: number };
    };
    expect(meaning.parentAttachment).toEqual({ x: 55, y: -75 });
    expect(meaning.worldAttachment).toEqual({ x: 235, y: 425 });
  });

  it("letterboxes instead of stretching", () => {
    const wide = containFit({ width: 1280, height: 720 }, 1920, 1080);
    expect(wide.scale).toBeCloseTo(1.5, 10);
    expect(wide.offsetX).toBeCloseTo(0, 10);
    expect(wide.offsetY).toBeCloseTo(0, 10);
    const square = containFit({ width: 1280, height: 720 }, 1000, 1000);
    expect(square.scale).toBeCloseTo(1000 / 1280, 10);
    expect(square.offsetX).toBeCloseTo(0, 10);
    expect(square.offsetY).toBeGreaterThan(0);
    const portrait = containFit({ width: 1280, height: 720 }, 720, 1280);
    expect(portrait.scale).toBeCloseTo(720 / 1280, 10);
    expect(portrait.offsetY).toBeGreaterThan(0);
  });

  it("keeps a high zIndex child behind its parent's later sibling", () => {
    const scene = load("fixtures/ir/valid/subtree-order.json");
    expect(drawableOrder(scene.nodes).map((node) => node.id)).toEqual(["back.mark", "mid"]);
    const stacked = load("fixtures/ir/valid/z-order.json");
    expect(drawableOrder(stacked.nodes).map((node) => node.id)).toEqual(["red", "blue", "green"]);
  });
});

describe("property registry", () => {
  const nodes = ["bunny", "bunny.head", "bunny.head.leftEar"];

  it("resolves the documented addresses", () => {
    expect(resolveAddress("bunny.position.x", nodes)).toMatchObject({ ok: true, type: "number" });
    expect(resolveAddress("bunny.position", nodes)).toMatchObject({ ok: true, type: "vec2" });
    expect(resolveAddress("bunny.rotation", nodes)).toMatchObject({ ok: true, type: "angle" });
    expect(resolveAddress("bunny.opacity", nodes)).toMatchObject({ ok: true, type: "number" });
    expect(resolveAddress("camera(main).zoom", nodes)).toMatchObject({
      ok: true,
      type: "number",
      target: { kind: "camera", cameraId: "main", channel: "zoom" },
    });
  });

  it("uses the longest node id", () => {
    const resolved = resolveAddress("bunny.head.leftEar.rotation", nodes);
    expect(resolved).toMatchObject({
      ok: true,
      target: { kind: "node", nodeId: "bunny.head.leftEar", channel: "transform.rotation" },
    });
  });

  it("rejects properties that are not animation targets", () => {
    expect(resolveAddress("bunny.fill", nodes).ok).toBe(false);
    expect(resolveAddress("bunny.head.leftEar.blur", nodes)).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_PROPERTY",
    });
  });
});

describe("easing and expressions", () => {
  it("matches the four V1 curves at one half", () => {
    expect(applyEasing("linear", 0.5)).toBe(0.5);
    expect(applyEasing("easeIn", 0.5)).toBe(0.25);
    expect(applyEasing("easeOut", 0.5)).toBe(0.75);
    expect(applyEasing("easeInOut", 0.5)).toBe(0.5);
  });

  it("evaluates the bunny hop and rejects non-finite samples", () => {
    const parsed = parseExpression("500 - abs(sin(local_t * 4 * PI)) * 90");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const at = (localT: number) =>
      evaluateExpression(parsed.ast, { t: localT, localT, progress: localT / 5 });
    expect(at(0)).toEqual({ ok: true, value: 500 });
    const quarter = at(0.125);
    expect(quarter.ok).toBe(true);
    if (quarter.ok) expect(quarter.value).toBeCloseTo(410, 6);
    const divided = parseExpression("1 / 0");
    const rooted = parseExpression("sqrt(-1)");
    expect(divided.ok && evaluateExpression(divided.ast, { t: 0, localT: 0, progress: 0 })).toEqual({
      ok: false,
      reason: "domain",
    });
    expect(rooted.ok && evaluateExpression(rooted.ast, { t: 0, localT: 0, progress: 0 })).toEqual({
      ok: false,
      reason: "domain",
    });
  });
});

describe("tokens", () => {
  it("treats # as a colour and // as a comment", () => {
    const color = lex("#FFAA00");
    expect(color.diagnostics).toEqual([]);
    expect(color.tokens.map((token) => token.type)).toEqual(["color"]);
    const commented = lex("// #FFAA00\nscene");
    expect(commented.tokens.map((token) => token.type)).toEqual(["keyword"]);
    expect(commented.tokens[0]?.lexeme).toBe("scene");
  });

  it("keeps numbers, units, and escapes intact", () => {
    const number = lex("12.345");
    expect(number.tokens).toHaveLength(1);
    expect(number.tokens[0]).toMatchObject({ type: "number", numberValue: 12.345 });
    expect(lex("6s").tokens[0]).toMatchObject({ type: "duration", numberValue: 6000 });
    expect(lex("500ms").tokens[0]).toMatchObject({ type: "duration", numberValue: 500 });
    expect(lex("90deg").tokens[0]?.numberValue).toBeCloseTo(Math.PI / 2, 10);
    expect(lex("25%").tokens[0]).toMatchObject({ type: "percentage", numberValue: 0.25 });
    const text = lex(String.raw`"hel\"lo"`);
    expect(text.tokens[0]?.stringValue).toBe('hel"lo');
    const split = lex("12sec");
    expect(split.tokens.map((token) => token.type)).toEqual(["number", "identifier"]);
  });

  it("lexes the bunny program without errors", () => {
    const source = readFileSync(resolve(repo, "fixtures/motionscript/bunny.ms"), "utf8");
    const result = lex(source);
    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.some((token) => token.type === "color")).toBe(true);
    expect(result.tokens.some((token) => token.type === "duration" && token.numberValue === 6000)).toBe(true);
    expect(result.tokens.at(-1)?.lexeme).toBe(";");
  });
});

describe("published contract", () => {
  const text = readFileSync(resolve(repo, "packages/schema/CONTRACT.md"), "utf8");

  it("answers the geometry questions in prose", () => {
    for (const phrase of [
      "top-left",
      "centred on the local origin",
      "clockwise",
      "1280",
      "720",
      "milliseconds",
      "radians",
      "contain",
      "bunny.position.x",
      "camera(main).zoom",
      "(1040, 360)",
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it("keeps the grammar and the default budgets", () => {
    expect(MOTION_SCRIPT_EBNF).toContain("program        = sceneHeader");
    expect(MOTION_SCRIPT_EBNF).toContain("complete       = \"complete\"");
    expect(DEFAULT_LIMITS.maxDurationMs).toBe(60_000);
    expect(DEFAULT_LIMITS.maxNodes).toBe(500);
    expect(DEFAULT_LIMITS.maxDepth).toBe(16);
    expect(DEFAULT_LIMITS.maxTracks).toBe(1000);
    expect(DEFAULT_LIMITS.maxGeometryItems).toBe(10_000);
    expect(DEFAULT_LIMITS.maxExpressionDepth).toBe(32);
    expect(DEFAULT_LIMITS.maxExpressionOps).toBe(256);
    expect(cameraViewMatrix({ width: 1280, height: 720 }, { position: { x: 640, y: 360 }, zoom: 1, rotation: 0 })).toEqual([
      1, 0, 0, 0, 1, 0, 0, 0, 1,
    ]);
  });
});
