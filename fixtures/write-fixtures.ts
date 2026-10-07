import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseExpression } from "../packages/schema/src/expr";

const root = dirname(fileURLToPath(import.meta.url));
const ir = resolve(root, "ir");

const solid = (r: number, g: number, b: number, a = 1) => ({ type: "solid" as const, r, g, b, a });
const hex = (value: string) => {
  const body = value.slice(1);
  const r = parseInt(body.slice(0, 2), 16) / 255;
  const g = parseInt(body.slice(2, 4), 16) / 255;
  const b = parseInt(body.slice(4, 6), 16) / 255;
  const a = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
  return solid(r, g, b, a);
};
const vec = (x: number, y: number) => ({ x, y });
const xf = (
  position = vec(0, 0),
  extra?: { pivot?: { x: number; y: number }; rotation?: number; scale?: { x: number; y: number } },
) => ({
  position,
  pivot: extra?.pivot ?? vec(0, 0),
  rotation: extra?.rotation ?? 0,
  scale: extra?.scale ?? vec(1, 1),
});
const stroke = (color: ReturnType<typeof solid>, width = 4) => ({
  color,
  width,
  cap: "butt" as const,
  join: "miter" as const,
  miterLimit: 4,
});
const fillTrack = { before: "none" as const, after: "forwards" as const };

function scene(overrides: Record<string, unknown> = {}) {
  return {
    irVersion: "0.1",
    sceneId: "example",
    viewport: { width: 1280, height: 720, fit: "contain" },
    background: hex("#101014"),
    resources: [],
    cameras: [{ id: "main", position: vec(640, 360), zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs: 4000, tracks: [], steps: [] },
    nodes: [],
    ...overrides,
  };
}

function base(id: string, name: string, parentId: string | null, kindFields: Record<string, unknown>) {
  return {
    id,
    name,
    parentId,
    ...(parentId === null ? { space: "world" } : {}),
    zIndex: 0,
    transform: xf(),
    opacity: 1,
    visible: true,
    ...kindFields,
  };
}

function rect(id: string, name: string, parentId: string | null, fields: Record<string, unknown> = {}) {
  return base(id, name, parentId, {
    kind: "rectangle",
    size: vec(200, 80),
    fill: hex("#ff0000"),
    ...fields,
  });
}

function keyframes(id: string, target: unknown, valueType: string, values: unknown[], extra: Record<string, unknown> = {}) {
  return {
    id,
    kind: "keyframe",
    target,
    valueType,
    startMs: 0,
    durationMs: 1000,
    fill: fillTrack,
    keyframes: [
      { offset: 0, value: values[0], easing: "linear" },
      { offset: 1, value: values[1] },
    ],
    ...extra,
  };
}

function expressionTrack(source: string) {
  const parsed = parseExpression(source);
  if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("\n"));
  return {
    id: "expr",
    kind: "expression",
    target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
    valueType: "number",
    startMs: 0,
    durationMs: 1000,
    fill: fillTrack,
    source,
    ast: parsed.ast,
  };
}

function write(path: string, value: unknown) {
  const file = resolve(ir, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const minimal = scene({
  sceneId: "rectangle-origin",
  nodes: [
    rect("box", "box", null, {
      transform: xf(vec(100, 50)),
      size: vec(200, 80),
      fill: hex("#e23d3d"),
      stroke: stroke(hex("#1d4ed8"), 8),
    }),
  ],
});

const circle = scene({
  sceneId: "circle-center",
  nodes: [
    base("dot", "dot", null, {
      kind: "circle",
      transform: xf(vec(400, 300)),
      radius: 40,
      fill: hex("#38bdf8"),
    }),
  ],
});

const ear = scene({
  sceneId: "ear-pivot",
  nodes: [
    base("bunny", "bunny", null, {
      kind: "group",
      transform: xf(vec(180, 500)),
    }),
    base("bunny.ear", "ear", "bunny", {
      kind: "ellipse",
      transform: xf(vec(55, -105), { pivot: vec(0, 30), rotation: Math.PI / 4 }),
      size: vec(18, 60),
      fill: hex("#ffffff"),
    }),
  ],
});

const camera = scene({
  sceneId: "camera-mapping",
  cameras: [{ id: "main", position: vec(500, 300), zoom: 2, rotation: 0 }],
  nodes: [
    rect("marker", "marker", null, {
      transform: xf(vec(700, 300)),
      size: vec(2, 2),
      fill: hex("#ffffff"),
    }),
  ],
});

const zOrder = scene({
  sceneId: "z-order",
  nodes: [
    rect("red", "red", null, { zIndex: 0, transform: xf(vec(200, 200)), size: vec(180, 180), fill: hex("#ef4444") }),
    rect("blue", "blue", null, { zIndex: 1, transform: xf(vec(280, 260)), size: vec(180, 180), fill: hex("#3b82f6") }),
    rect("green", "green", null, { zIndex: 2, transform: xf(vec(360, 320)), size: vec(180, 180), fill: hex("#22c55e") }),
  ],
});

const subtree = scene({
  sceneId: "subtree-order",
  nodes: [
    base("back", "back", null, { kind: "group", zIndex: 0 }),
    rect("back.mark", "mark", "back", { zIndex: 50, size: vec(40, 40), fill: hex("#facc15") }),
    rect("mid", "mid", null, { zIndex: 1, transform: xf(vec(20, 20)), size: vec(40, 40), fill: hex("#3b82f6") }),
  ],
});

const primitives = scene({
  sceneId: "primitive-gallery",
  resources: [{ id: "sans", kind: "font", family: "sans", source: "builtin" }],
  nodes: [
    rect("rectangle", "rectangle", null, {
      transform: xf(vec(80, 80)),
      size: vec(200, 120),
      fill: hex("#e23d3d"),
      stroke: stroke(hex("#1d4ed8"), 8),
    }),
    base("circle", "circle", null, {
      kind: "circle",
      transform: xf(vec(460, 160)),
      radius: 70,
      fill: hex("#38bdf8"),
      stroke: stroke(hex("#0f172a"), 6),
    }),
    base("ellipse", "ellipse", null, {
      kind: "ellipse",
      transform: xf(vec(760, 160)),
      size: vec(180, 100),
      fill: hex("#a3e635"),
    }),
    base("line", "line", null, {
      kind: "line",
      transform: xf(vec(80, 340)),
      from: vec(0, 0),
      to: vec(280, 80),
      stroke: stroke(hex("#f8fafc"), 6),
    }),
    base("polygon", "polygon", null, {
      kind: "polygon",
      transform: xf(vec(480, 300)),
      points: [vec(0, 120), vec(140, 0), vec(220, 140)],
      fill: hex("#f59e0b"),
      stroke: stroke(hex("#7c2d12"), 4),
    }),
    base("path", "path", null, {
      kind: "path",
      transform: xf(vec(860, 320)),
      fillRule: "nonzero",
      fill: hex("#c084fc"),
      stroke: stroke(hex("#3b0764"), 4),
      commands: [
        { cmd: "M", x: 0, y: 40 },
        { cmd: "L", x: 120, y: 40 },
        { cmd: "L", x: 120, y: 120 },
        { cmd: "L", x: 0, y: 120 },
        { cmd: "Z" },
        { cmd: "M", x: 20, y: 40 },
        { cmd: "Q", cx: 60, cy: -20, x: 100, y: 40 },
      ],
    }),
    base("caption", "caption", null, {
      kind: "text",
      transform: xf(vec(80, 560)),
      content: "Hello",
      font: { family: "sans", size: 64, weight: 700, style: "normal" },
      align: "left",
      baseline: "alphabetic",
      fill: hex("#f8fafc"),
    }),
  ],
});

const hop = parseExpression("500 - abs(sin(local_t * 4 * PI)) * 90");
if (!hop.ok) throw new Error("hop expression failed");

const bunny = scene({
  sceneId: "bunny-demo",
  timeline: {
    durationMs: 6000,
    steps: [],
    tracks: [
      {
        id: "hopX",
        kind: "keyframe",
        target: { kind: "node", nodeId: "bunny", channel: "transform.position.x" },
        valueType: "number",
        startMs: 0,
        durationMs: 5000,
        fill: fillTrack,
        keyframes: [
          { offset: 0, value: 180, easing: "easeInOut" },
          { offset: 1, value: 900 },
        ],
      },
      {
        id: "hopY",
        kind: "expression",
        target: { kind: "node", nodeId: "bunny", channel: "transform.position.y" },
        valueType: "number",
        startMs: 0,
        durationMs: 5000,
        fill: fillTrack,
        source: "500 - abs(sin(local_t * 4 * PI)) * 90",
        ast: hop.ast,
      },
      {
        id: "zoom",
        kind: "keyframe",
        target: { kind: "camera", cameraId: "main", channel: "zoom" },
        valueType: "number",
        startMs: 2000,
        durationMs: 3000,
        fill: fillTrack,
        keyframes: [
          { offset: 0, value: 1, easing: "easeInOut" },
          { offset: 1, value: 1.25 },
        ],
      },
    ],
  },
  nodes: [
    base("bunny", "bunny", null, { kind: "group", transform: xf(vec(180, 500)) }),
    base("bunny.body", "body", "bunny", {
      kind: "ellipse",
      size: vec(110, 80),
      fill: hex("#f5f5f5"),
    }),
    base("bunny.head", "head", "bunny", {
      kind: "circle",
      transform: xf(vec(55, -55)),
      radius: 42,
      fill: hex("#ffffff"),
    }),
    base("bunny.ear", "ear", "bunny", {
      kind: "ellipse",
      transform: xf(vec(55, -105)),
      size: vec(18, 60),
      fill: hex("#ffffff"),
    }),
    rect("chocolate", "chocolate", null, {
      transform: xf(vec(970, 475)),
      size: vec(60, 50),
      fill: hex("#6b3f24"),
    }),
  ],
});

const ones = Array.from({ length: 33 }, () => "1").join("+");

write("valid/minimal.json", minimal);
write("valid/circle.json", circle);
write("valid/ear-pivot.json", ear);
write("valid/camera-mapping.json", camera);
write("valid/z-order.json", zOrder);
write("valid/subtree-order.json", subtree);
write("valid/primitives.json", primitives);
write("valid/bunny.json", bunny);
write("valid/frame-rectangle.json", {
  sceneTimeMs: 0,
  revision: 0,
  viewport: { width: 1280, height: 720, fit: "contain" },
  background: hex("#101014"),
  drawItems: [
    {
      nodeId: "box",
      geometry: { kind: "rectangle", size: vec(200, 80) },
      appearance: { fill: hex("#e23d3d") },
      logicalMatrix: [1, 0, 0, 0, 1, 0, 100, 50, 1],
      opacity: 1,
    },
  ],
});

write("invalid/bad-enum.json", scene({ viewport: { width: 1280, height: 720, fit: "cover" }, nodes: [rect("box", "box", null)] }));
write("invalid/duplicate-id.json", scene({ nodes: [rect("box", "box", null), rect("box", "box", null, { transform: xf(vec(10, 10)) })] }));
write("invalid/invalid-opacity.json", scene({ nodes: [rect("box", "box", null, { opacity: 1.5 })] }));
write("invalid/negative-zoom.json", scene({
  cameras: [{ id: "main", position: vec(640, 360), zoom: -1, rotation: 0 }],
  nodes: [rect("box", "box", null)],
}));
write("invalid/malformed-path.json", scene({
  nodes: [
    base("path", "path", null, {
      kind: "path",
      fillRule: "nonzero",
      commands: [{ cmd: "L", x: 10, y: 10 }],
    }),
  ],
}));
write("invalid/invalid-parent.json", scene({
  nodes: [rect("ghost.child", "child", "ghost")],
}));
write("invalid/unsupported-property.json", scene({
  nodes: [rect("box", "box", null, { blur: 4 })],
}));
write("invalid/invalid-track-target.json", scene({
  nodes: [rect("box", "box", null)],
  timeline: {
    durationMs: 1000,
    steps: [],
    tracks: [keyframes("fade", { kind: "node", nodeId: "box", channel: "opacity" }, "vec2", [vec(0, 0), vec(1, 1)], { durationMs: 1000 })],
  },
}));
write("invalid/duration-limit.json", scene({ timeline: { durationMs: 30001, tracks: [], steps: [] }, nodes: [rect("box", "box", null)] }));

const chain = [];
let parent: string | null = null;
let id = "";
for (let i = 0; i < 17; i += 1) {
  const name = `n${i}`;
  id = parent ? `${parent}.${name}` : name;
  chain.push(base(id, name, parent, { kind: "group" }));
  parent = id;
}
write("invalid/depth-limit.json", scene({ sceneId: "too-deep", nodes: chain }));
write("invalid/expression-depth.json", scene({
  nodes: [rect("box", "box", null)],
  timeline: { durationMs: 2000, steps: [], tracks: [expressionTrack(ones)] },
}));
write("invalid/overlapping-writers.json", scene({
  nodes: [rect("box", "box", null)],
  timeline: {
    durationMs: 2000,
    steps: [],
    tracks: [
      keyframes("a", { kind: "node", nodeId: "box", channel: "opacity" }, "number", [1, 0], { durationMs: 1500 }),
      keyframes("b", { kind: "node", nodeId: "box", channel: "opacity" }, "number", [0, 1], { startMs: 500, durationMs: 1000 }),
    ],
  },
}));

write("manifest.json", {
  cases: [
    { file: "valid/minimal.json", expect: "pass" },
    { file: "valid/circle.json", expect: "pass" },
    { file: "valid/ear-pivot.json", expect: "pass" },
    { file: "valid/camera-mapping.json", expect: "pass" },
    { file: "valid/z-order.json", expect: "pass" },
    { file: "valid/subtree-order.json", expect: "pass" },
    { file: "valid/primitives.json", expect: "pass" },
    { file: "valid/bunny.json", expect: "pass" },
    { file: "valid/frame-rectangle.json", expect: "pass", validator: "frame" },
    { file: "invalid/bad-enum.json", expect: "fail", codes: ["INVALID_ENUM"] },
    { file: "invalid/duplicate-id.json", expect: "fail", codes: ["DUPLICATE_ID"] },
    { file: "invalid/invalid-opacity.json", expect: "fail", codes: ["INVALID_OPACITY"] },
    { file: "invalid/negative-zoom.json", expect: "fail", codes: ["INVALID_ZOOM"] },
    { file: "invalid/malformed-path.json", expect: "fail", codes: ["MALFORMED_PATH"] },
    { file: "invalid/invalid-parent.json", expect: "fail", codes: ["INVALID_PARENT"] },
    { file: "invalid/unsupported-property.json", expect: "fail", codes: ["UNSUPPORTED_PROPERTY"] },
    { file: "invalid/invalid-track-target.json", expect: "fail", codes: ["INVALID_TRACK_TARGET"] },
    { file: "invalid/duration-limit.json", expect: "fail", codes: ["RESOURCE_LIMIT"] },
    { file: "invalid/depth-limit.json", expect: "fail", codes: ["RESOURCE_LIMIT"] },
    { file: "invalid/expression-depth.json", expect: "fail", codes: ["RESOURCE_LIMIT"] },
    { file: "invalid/overlapping-writers.json", expect: "fail", codes: ["OVERLAPPING_WRITERS"] },
  ],
});

mkdirSync(resolve(root, "meanings"), { recursive: true });
const meaning = (name: string, value: unknown) => {
  writeFileSync(resolve(root, "meanings", name), `${JSON.stringify(value, null, 2)}\n`);
};

meaning("rectangle.json", {
  fixture: "ir/valid/minimal.json",
  localOrigin: "top-left, minimum x and minimum y",
  size: "full width and full height",
  pivot: "local (0, 0), which is that top-left corner",
  parentTopLeft: { x: 100, y: 50 },
  parentBottomRight: { x: 300, y: 130 },
  positiveAngle: "clockwise radians",
});
meaning("circle.json", {
  fixture: "ir/valid/circle.json",
  center: "local origin",
  parentCenter: { x: 400, y: 300 },
  parentTop: { x: 400, y: 260 },
  parentRight: { x: 440, y: 300 },
  note: "Top is smaller y because y increases downward.",
});
meaning("ear-pivot.json", {
  fixture: "ir/valid/ear-pivot.json",
  ellipse: "centered on the ear's local origin; size is the full width and height",
  pivot: { x: 0, y: 30 },
  pivotMeaning: "bottom of the ellipse, the attachment point, in the ear's local geometry",
  rotation: "pi/4 radians, clockwise",
  parentAttachment: { x: 55, y: -75 },
  worldAttachment: { x: 235, y: 425 },
  parentCenter: { x: 76.2132034356, y: -96.2132034356 },
  note: "The attachment point does not move when the ear rotates. The visual centre does.",
});
meaning("camera.json", {
  fixture: "ir/valid/camera-mapping.json",
  formula: "p_logical = T(viewportCentre) * S(zoom) * R(-rotation) * T(-camera.position) * p_world",
  worldPoint: { x: 700, y: 300 },
  logicalPoint: { x: 1040, y: 360 },
});
meaning("z-order.json", {
  fixture: "ir/valid/z-order.json",
  drawableOrder: ["red", "blue", "green"],
  note: "Lower sibling zIndex is drawn first and therefore sits underneath.",
});
meaning("subtree-order.json", {
  fixture: "ir/valid/subtree-order.json",
  drawableOrder: ["back.mark", "mid"],
  note: "back.mark has zIndex 50, but zIndex only sorts siblings. The mark stays inside back, and back is behind mid.",
});

console.log("fixtures written");
