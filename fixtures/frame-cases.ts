import {
  IDENTITY,
  cameraViewMatrix,
  localMatrix,
  multiplyMat3,
  transformPoint,
  translation,
  type Mat3,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
  type SolidColor,
  type Stroke,
  type Vec2,
} from "../packages/schema/src/index";

export const VIEWPORT = { width: 1280, height: 720, fit: "contain" as const };

export const BACKGROUND: SolidColor = {
  type: "solid",
  r: 16 / 255,
  g: 16 / 255,
  b: 20 / 255,
  a: 1,
};

/** Rectangle whose matrix already contains translation, rotation, scale, and pivot. */
export const HIERARCHY = {
  position: { x: 560, y: 310 },
  pivot: { x: 80, y: 50 },
  rotation: Math.PI / 6,
  scale: { x: 1.4, y: 0.7 },
  size: { x: 160, y: 100 },
};

/** Specification camera sample. The resolved matrix is V × T(world), not a live camera. */
export const CAMERA_SAMPLE = {
  viewport: VIEWPORT,
  camera: { position: { x: 500, y: 300 }, zoom: 2, rotation: 0 },
  world: { x: 700, y: 300 },
  logical: { x: 1040, y: 360 },
};

export const Z_RECTS = [
  { id: "red", z: 0, at: { x: 200, y: 200 }, color: "#ef4444" },
  { id: "blue", z: 1, at: { x: 240, y: 240 }, color: "#3b82f6" },
  { id: "green", z: 2, at: { x: 280, y: 280 }, color: "#22c55e" },
] as const;

const hex = (value: string, a = 1): SolidColor => {
  const body = value.slice(1);
  return {
    type: "solid",
    r: parseInt(body.slice(0, 2), 16) / 255,
    g: parseInt(body.slice(2, 4), 16) / 255,
    b: parseInt(body.slice(4, 6), 16) / 255,
    a,
  };
};

const ink = (color: SolidColor, width = 4): Stroke => ({
  color,
  width,
  cap: "butt",
  join: "miter",
  miterLimit: 4,
});

function item(
  nodeId: string,
  geometry: ResolvedGeometry,
  logicalMatrix: Mat3,
  appearance: ResolvedDrawItem["appearance"],
  opacity = 1,
): ResolvedDrawItem {
  return { nodeId, geometry, appearance, logicalMatrix, opacity };
}

function frame(drawItems: ResolvedDrawItem[]): ResolvedFrame {
  return {
    sceneTimeMs: 0,
    revision: 1,
    viewport: VIEWPORT,
    background: BACKGROUND,
    drawItems: [
      ...drawItems,
      item(
        "viewport-edge",
        { kind: "rectangle", size: { x: VIEWPORT.width, y: VIEWPORT.height } },
        IDENTITY,
        { stroke: ink(hex("#86efac"), 4) },
      ),
    ],
  };
}

function at(point: Vec2): Mat3 {
  return translation(point.x, point.y);
}

export function hierarchyMatrix(): Mat3 {
  return localMatrix(HIERARCHY);
}

export function hierarchyCorners(): Vec2[] {
  const matrix = hierarchyMatrix();
  return [
    [0, 0],
    [HIERARCHY.size.x, 0],
    [HIERARCHY.size.x, HIERARCHY.size.y],
    [0, HIERARCHY.size.y],
  ].map(([x, y]) => transformPoint(matrix, x ?? 0, y ?? 0));
}

export function cameraMarkerMatrix(): Mat3 {
  return multiplyMat3(
    cameraViewMatrix(CAMERA_SAMPLE.viewport, CAMERA_SAMPLE.camera),
    translation(CAMERA_SAMPLE.world.x, CAMERA_SAMPLE.world.y),
  );
}

function cross(id: string, point: Vec2, radius: number): ResolvedDrawItem[] {
  return [
    item(
      `${id}-x`,
      { kind: "line", from: { x: -radius, y: 0 }, to: { x: radius, y: 0 } },
      at(point),
      { stroke: ink(hex("#facc15"), 2) },
    ),
    item(
      `${id}-y`,
      { kind: "line", from: { x: 0, y: -radius }, to: { x: 0, y: radius } },
      at(point),
      { stroke: ink(hex("#facc15"), 2) },
    ),
  ];
}

const hole: Extract<ResolvedGeometry, { kind: "path" }> = {
  kind: "path",
  fillRule: "evenodd",
  commands: [
    { cmd: "M", x: 0, y: 0 },
    { cmd: "L", x: 220, y: 0 },
    { cmd: "L", x: 220, y: 160 },
    { cmd: "L", x: 0, y: 160 },
    { cmd: "Z" },
    { cmd: "M", x: 50, y: 40 },
    { cmd: "L", x: 170, y: 40 },
    { cmd: "L", x: 170, y: 120 },
    { cmd: "L", x: 50, y: 120 },
    { cmd: "Z" },
  ],
};

export function buildFrames(): Record<string, ResolvedFrame> {
  const red = hex("#e23d3d");
  const blue = hex("#1d4ed8");
  const hierarchy = hierarchyMatrix();
  return {
    "primitive-gallery": frame([
      item("rectangle", { kind: "rectangle", size: { x: 200, y: 120 } }, at({ x: 80, y: 80 }), {
        fill: red,
        stroke: ink(blue, 8),
      }),
      item("circle", { kind: "circle", radius: 70 }, at({ x: 460, y: 160 }), {
        fill: hex("#38bdf8"),
        stroke: ink(hex("#0f172a"), 6),
      }),
      item("ellipse", { kind: "ellipse", size: { x: 180, y: 100 } }, at({ x: 760, y: 160 }), {
        fill: hex("#a3e635"),
        stroke: ink(hex("#365314"), 6),
      }),
      item(
        "line",
        { kind: "line", from: { x: 0, y: 0 }, to: { x: 280, y: 80 } },
        at({ x: 80, y: 340 }),
        { stroke: ink(hex("#f8fafc"), 6) },
      ),
      item(
        "polygon",
        { kind: "polygon", points: [{ x: 0, y: 120 }, { x: 140, y: 0 }, { x: 220, y: 140 }] },
        at({ x: 480, y: 300 }),
        { fill: hex("#f59e0b"), stroke: ink(hex("#7c2d12"), 4) },
      ),
      item(
        "path",
        {
          kind: "path",
          fillRule: "nonzero",
          commands: [
            { cmd: "M", x: 0, y: 40 },
            { cmd: "L", x: 120, y: 40 },
            { cmd: "L", x: 120, y: 120 },
            { cmd: "L", x: 0, y: 120 },
            { cmd: "Z" },
            { cmd: "M", x: 20, y: 40 },
            { cmd: "Q", cx: 60, cy: -20, x: 100, y: 40 },
          ],
        },
        at({ x: 860, y: 320 }),
        { fill: hex("#c084fc"), stroke: ink(hex("#3b0764"), 4) },
      ),
      item(
        "caption",
        {
          kind: "text",
          content: "Hello",
          font: { family: "sans", size: 64, weight: 700, style: "normal" },
          align: "left",
          baseline: "alphabetic",
        },
        at({ x: 80, y: 560 }),
        { fill: hex("#f8fafc") },
      ),
    ]),
    "hierarchy-transform": frame([
      item("neighbor", { kind: "rectangle", size: { x: 120, y: 70 } }, at({ x: 80, y: 80 }), {
        fill: hex("#fb923c"),
      }),
      item("pivoted", { kind: "rectangle", size: HIERARCHY.size }, hierarchy, {
        fill: hex("#3b82f6"),
        stroke: ink(hex("#eff6ff"), 4),
      }),
      item("expected", { kind: "polygon", points: hierarchyCorners() }, IDENTITY, {
        stroke: ink(hex("#f0abfc"), 3),
      }),
      item("pivot", { kind: "circle", radius: 7 }, at({ x: 640, y: 360 }), { fill: hex("#facc15") }),
    ]),
    "camera-mapping": frame([
      item("marker", { kind: "circle", radius: 10 }, cameraMarkerMatrix(), { fill: hex("#ffffff") }),
      item("ring", { kind: "circle", radius: 22 }, at(CAMERA_SAMPLE.logical), {
        stroke: ink(hex("#22d3ee"), 3),
      }),
      item(
        "label",
        {
          kind: "text",
          content: "1040, 360",
          font: { family: "sans", size: 28, weight: 600, style: "normal" },
          align: "left",
          baseline: "alphabetic",
        },
        at({ x: 1080, y: 368 }),
        { fill: hex("#e2e8f0") },
      ),
    ]),
    "z-order": frame(
      Z_RECTS.map((entry) =>
        item(entry.id, { kind: "rectangle", size: { x: 180, y: 180 } }, at(entry.at), { fill: hex(entry.color) }),
      ),
    ),
    opacity: frame([
      item("solid", { kind: "rectangle", size: { x: 220, y: 180 } }, at({ x: 120, y: 220 }), { fill: red }, 1),
      item("half", { kind: "rectangle", size: { x: 220, y: 180 } }, at({ x: 420, y: 220 }), { fill: red }, 0.5),
      item("quarter", { kind: "rectangle", size: { x: 220, y: 180 } }, at({ x: 720, y: 220 }), { fill: red }, 0.25),
      item(
        "solid-label",
        text("1", { x: 200, y: 460 }),
        at({ x: 200, y: 460 }),
        { fill: hex("#f8fafc") },
      ),
      item("half-label", text("0.5", { x: 500, y: 460 }), at({ x: 500, y: 460 }), { fill: hex("#f8fafc") }),
      item("quarter-label", text("0.25", { x: 790, y: 460 }), at({ x: 790, y: 460 }), { fill: hex("#f8fafc") }),
    ]),
    text: frame([
      ...cross("left", { x: 160, y: 220 }, 18),
      ...cross("middle", { x: 640, y: 360 }, 18),
      ...cross("right", { x: 1120, y: 520 }, 18),
      item("left", textBlock("Left", "left", "alphabetic", 72), at({ x: 160, y: 220 }), { fill: hex("#f8fafc") }),
      item("middle", textBlock("Middle", "center", "middle", 72), at({ x: 640, y: 360 }), { fill: hex("#fde68a") }),
      item("right", textBlock("Right", "right", "bottom", 48), at({ x: 1120, y: 520 }), { fill: hex("#a5f3fc") }),
    ]),
    "path-stress": frame([
      item("evenodd", hole, at({ x: 120, y: 140 }), { fill: hex("#c084fc"), stroke: ink(hex("#faf5ff"), 3) }),
      item("nonzero", { ...hole, fillRule: "nonzero" }, at({ x: 480, y: 140 }), {
        fill: hex("#c084fc"),
        stroke: ink(hex("#faf5ff"), 3),
      }),
      item(
        "cubic",
        {
          kind: "path",
          fillRule: "nonzero",
          commands: [
            { cmd: "M", x: 0, y: 80 },
            { cmd: "C", c1x: 80, c1y: -40, c2x: 160, c2y: 200, x: 240, y: 80 },
            { cmd: "C", c1x: 320, c1y: -40, c2x: 400, c2y: 200, x: 480, y: 80 },
          ],
        },
        at({ x: 120, y: 460 }),
        { stroke: ink(hex("#38bdf8"), 6) },
      ),
      item(
        "quadratic",
        {
          kind: "path",
          fillRule: "nonzero",
          commands: [
            { cmd: "M", x: 0, y: 80 },
            { cmd: "Q", cx: 80, cy: 0, x: 160, y: 80 },
            { cmd: "Q", cx: 240, cy: 160, x: 320, y: 80 },
          ],
        },
        at({ x: 720, y: 460 }),
        { stroke: ink(hex("#f9a8d4"), 6) },
      ),
    ]),
  };
}

function text(content: string, _anchor: Vec2): ResolvedGeometry {
  return textBlock(content, "left", "alphabetic", 36);
}

function textBlock(
  content: string,
  align: "left" | "center" | "right",
  baseline: "alphabetic" | "middle" | "top" | "bottom",
  size: number,
): ResolvedGeometry {
  return {
    kind: "text",
    content,
    font: { family: "sans", size, weight: 700, style: "normal" },
    align,
    baseline,
  };
}

export const FRAME_CATALOG = [
  {
    id: "primitive-gallery",
    label: "Primitive gallery",
    caption: "Rectangle, circle, ellipse, line, polygon, path, and text. The rectangle grows down and right from its top-left.",
  },
  {
    id: "hierarchy-transform",
    label: "Hierarchy transform",
    caption: "The blue rectangle is translated, rotated 30° clockwise, scaled, and pivoted. The magenta outline is that same geometry with the matrix already baked in. The yellow dot is the pivot.",
  },
  {
    id: "camera-mapping",
    label: "Camera mapping",
    caption: "World (700, 300) through the specification camera is logical (1040, 360). The white disc uses that resolved matrix. The cyan ring is drawn at (1040, 360) directly.",
  },
  {
    id: "z-order",
    label: "Z-order",
    caption: "Array order is paint order. Green is last, so it is on top. Reverse the list and red comes forward. The renderer does not sort.",
  },
  {
    id: "opacity",
    label: "Opacity",
    caption: "The same red at opacity 1, 0.5, and 0.25. Each value is already the resolved per-drawable alpha.",
  },
  {
    id: "text",
    label: "Text",
    caption: "Yellow crosses mark the anchors. Left sits on the alphabetic baseline, Middle is centered on the em box, Right ends on the bottom of the em box.",
  },
  {
    id: "path-stress",
    label: "Path stress",
    caption: "The left purple square uses even-odd fill, so the inner subpath is a hole. The right one is nonzero. Below are a cubic and a quadratic.",
  },
] as const;
