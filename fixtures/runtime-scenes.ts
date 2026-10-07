import { parseExpression, type NodeDefinition, type PropertyTarget, type SceneIR, type TrackDefinition, type Transform, type Vec2 } from "../packages/schema/src/index";

export const VIEWPORT = { width: 1280, height: 720, fit: "contain" as const };

const FILL = { before: "none" as const, after: "forwards" as const };

export const HIERARCHY = {
  bunny: { position: { x: 480, y: 420 }, rotation: Math.PI / 6 },
  body: { position: { x: 0, y: 24 }, size: { x: 120, y: 80 } },
  head: { position: { x: 55, y: -55 }, rotation: Math.PI / 8, radius: 42 },
  ear: { position: { x: 0, y: -50 }, pivot: { x: 0, y: 30 }, size: { x: 18, y: 60 } },
  joint: { position: { x: 0, y: -20 }, radius: 8 },
  durationMs: 2000,
};

function hex(value: string) {
  const body = value.slice(1);
  return {
    type: "solid" as const,
    r: parseInt(body.slice(0, 2), 16) / 255,
    g: parseInt(body.slice(2, 4), 16) / 255,
    b: parseInt(body.slice(4, 6), 16) / 255,
    a: 1,
  };
}

function xf(position: Vec2, extra?: Partial<Omit<Transform, "position">>): Transform {
  return {
    position,
    pivot: extra?.pivot ?? { x: 0, y: 0 },
    rotation: extra?.rotation ?? 0,
    scale: extra?.scale ?? { x: 1, y: 1 },
  };
}

function scene(
  sceneId: string,
  durationMs: number,
  nodes: NodeDefinition[],
  tracks: TrackDefinition[] = [],
  extras?: Partial<Pick<SceneIR, "cameras" | "timeline">> & { steps?: SceneIR["timeline"]["steps"] },
): SceneIR {
  return {
    irVersion: "0.1",
    sceneId,
    viewport: VIEWPORT,
    background: hex("#101014"),
    resources: [{ id: "sans", kind: "font", family: "sans", source: "builtin" }],
    cameras: extras?.cameras ?? [{ id: "main", position: { x: 640, y: 360 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: {
      durationMs,
      tracks,
      steps: extras?.steps ?? [],
    },
    nodes,
  };
}

function numeric(
  id: string,
  target: PropertyTarget,
  startMs: number,
  durationMs: number,
  from: number,
  to: number,
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut",
  after: "none" | "forwards" = "forwards",
): TrackDefinition {
  return {
    id,
    kind: "keyframe",
    target,
    valueType: target.kind === "node" && target.channel === "transform.rotation" ? "angle" : "number",
    startMs,
    durationMs,
    fill: { before: "none", after },
    keyframes: [
      { offset: 0, value: from, ...(easing ? { easing } : { easing: "linear" as const }) },
      { offset: 1, value: to },
    ],
  };
}

function expression(id: string, target: PropertyTarget, source: string, startMs: number, durationMs: number): TrackDefinition {
  const parsed = parseExpression(source);
  if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join("\n"));
  return {
    id,
    kind: "expression",
    target,
    valueType: "number",
    startMs,
    durationMs,
    fill: FILL,
    source,
    ast: parsed.ast,
  };
}

function rect(
  id: string,
  name: string,
  parentId: string | null,
  position: Vec2,
  size: Vec2,
  color: string,
): NodeDefinition {
  return {
    id,
    name,
    parentId,
    ...(parentId === null ? { space: "world" as const } : {}),
    zIndex: 0,
    transform: xf(position),
    opacity: 1,
    visible: true,
    kind: "rectangle",
    size,
    fill: hex(color),
  };
}

export interface RuntimeSceneEntry {
  id: string;
  label: string;
  caption: string;
  watch: string[];
  scene: SceneIR;
}

export function buildRuntimeScenes(): RuntimeSceneEntry[] {
  const hierarchy = scene(
    "hierarchy",
    HIERARCHY.durationMs,
    [
      {
        id: "bunny",
        name: "bunny",
        parentId: null,
        space: "world",
        kind: "group",
        zIndex: 0,
        transform: xf(HIERARCHY.bunny.position, { rotation: HIERARCHY.bunny.rotation }),
        opacity: 1,
        visible: true,
      },
      {
        id: "bunny.body",
        name: "body",
        parentId: "bunny",
        kind: "ellipse",
        zIndex: 0,
        transform: xf(HIERARCHY.body.position),
        opacity: 1,
        visible: true,
        size: HIERARCHY.body.size,
        fill: hex("#f5f5f5"),
      },
      {
        id: "bunny.head",
        name: "head",
        parentId: "bunny",
        kind: "circle",
        zIndex: 1,
        transform: xf(HIERARCHY.head.position, { rotation: HIERARCHY.head.rotation }),
        opacity: 1,
        visible: true,
        radius: HIERARCHY.head.radius,
        fill: hex("#ffffff"),
      },
      {
        id: "bunny.head.ear",
        name: "ear",
        parentId: "bunny.head",
        kind: "ellipse",
        zIndex: 0,
        transform: xf(HIERARCHY.ear.position, { pivot: HIERARCHY.ear.pivot, rotation: 0 }),
        opacity: 1,
        visible: true,
        size: HIERARCHY.ear.size,
        fill: hex("#fecdd3"),
      },
      {
        id: "bunny.head.joint",
        name: "joint",
        parentId: "bunny.head",
        kind: "circle",
        zIndex: 2,
        transform: xf(HIERARCHY.joint.position),
        opacity: 1,
        visible: true,
        radius: HIERARCHY.joint.radius,
        fill: hex("#facc15"),
      },
    ],
    [
      numeric(
        "earSpin",
        { kind: "node", nodeId: "bunny.head.ear", channel: "transform.rotation" },
        0,
        HIERARCHY.durationMs,
        0,
        Math.PI / 2,
      ),
    ],
  );

  const slide = scene(
    "slide",
    5000,
    [rect("box", "box", null, { x: 100, y: 300 }, { x: 80, y: 80 }, "#38bdf8")],
    [numeric("slideX", { kind: "node", nodeId: "box", channel: "transform.position.x" }, 0, 4000, 100, 900)],
  );

  const easings = ["linear", "easeIn", "easeOut", "easeInOut"] as const;
  const easing = scene(
    "easing",
    1000,
    easings.flatMap((name, index) => {
      const y = 90 + index * 140;
      return [
        rect(name, name, null, { x: 120, y }, { x: 70, y: 48 }, "#a3e635"),
        {
          id: `${name}Label`,
          name: `${name}Label`,
          parentId: null,
          space: "world" as const,
          kind: "text" as const,
          zIndex: 1,
          transform: xf({ x: 24, y: y + 34 }),
          opacity: 1,
          visible: true,
          content: name,
          font: { family: "sans", size: 28, weight: 700, style: "normal" as const },
          align: "left" as const,
          baseline: "alphabetic" as const,
          fill: hex("#e7e7ea"),
        },
      ];
    }),
    easings.map((name) =>
      numeric(name, { kind: "node", nodeId: name, channel: "transform.position.x" }, 0, 1000, 120, 1000, name),
    ),
  );

  const vec2 = scene(
    "vec2",
    4000,
    [
      {
        id: "dot",
        name: "dot",
        parentId: null,
        space: "world",
        kind: "circle",
        zIndex: 0,
        transform: xf({ x: 120, y: 160 }),
        opacity: 1,
        visible: true,
        radius: 36,
        fill: hex("#c084fc"),
      },
    ],
    [
      {
        id: "move",
        kind: "keyframe",
        target: { kind: "node", nodeId: "dot", channel: "transform.position" },
        valueType: "vec2",
        startMs: 0,
        durationMs: 4000,
        fill: FILL,
        keyframes: [
          { offset: 0, value: { x: 120, y: 160 }, easing: "linear" },
          { offset: 1, value: { x: 1000, y: 520 } },
        ],
      },
    ],
  );

  const keyframes = scene(
    "keyframes",
    4000,
    [
      {
        id: "bob",
        name: "bob",
        parentId: null,
        space: "world",
        kind: "circle",
        zIndex: 0,
        transform: xf({ x: 240, y: 500 }),
        opacity: 1,
        visible: true,
        radius: 28,
        fill: hex("#f59e0b"),
      },
    ],
    [
      {
        id: "bobY",
        kind: "keyframe",
        target: { kind: "node", nodeId: "bob", channel: "transform.position.y" },
        valueType: "number",
        startMs: 0,
        durationMs: 4000,
        fill: FILL,
        keyframes: [
          { offset: 0, value: 500, easing: "linear" },
          { offset: 0.25, value: 300, easing: "linear" },
          { offset: 0.5, value: 500, easing: "linear" },
          { offset: 0.75, value: 350, easing: "linear" },
          { offset: 1, value: 500 },
        ],
      },
    ],
  );

  const hop = scene(
    "expression",
    6000,
    [
      {
        id: "bunny",
        name: "bunny",
        parentId: null,
        space: "world",
        kind: "group",
        zIndex: 0,
        transform: xf({ x: 180, y: 500 }),
        opacity: 1,
        visible: true,
      },
      {
        id: "bunny.body",
        name: "body",
        parentId: "bunny",
        kind: "ellipse",
        zIndex: 0,
        transform: xf({ x: 0, y: 0 }),
        opacity: 1,
        visible: true,
        size: { x: 110, y: 80 },
        fill: hex("#f5f5f5"),
      },
      {
        id: "bunny.head",
        name: "head",
        parentId: "bunny",
        kind: "circle",
        zIndex: 1,
        transform: xf({ x: 55, y: -55 }),
        opacity: 1,
        visible: true,
        radius: 42,
        fill: hex("#ffffff"),
      },
    ],
    [
      numeric(
        "hopX",
        { kind: "node", nodeId: "bunny", channel: "transform.position.x" },
        0,
        5000,
        180,
        900,
        "easeInOut",
      ),
      expression(
        "hopY",
        { kind: "node", nodeId: "bunny", channel: "transform.position.y" },
        "500 - abs(sin(local_t * 4 * PI)) * 90",
        0,
        5000,
      ),
    ],
  );

  const fallback = scene(
    "fallback",
    1000,
    [rect("box", "box", null, { x: 100, y: 300 }, { x: 80, y: 80 }, "#fb7185")],
    [
      expression(
        "brokenX",
        { kind: "node", nodeId: "box", channel: "transform.position.x" },
        "100 + 10 / (local_t - 0.5)",
        0,
        1000,
      ),
      expression(
        "brokenY",
        { kind: "node", nodeId: "box", channel: "transform.position.y" },
        "300 + sqrt(local_t - 0.5)",
        0,
        1000,
      ),
    ],
  );

  const camera = scene(
    "camera",
    2000,
    [
      {
        id: "marker",
        name: "marker",
        parentId: null,
        space: "world",
        kind: "circle",
        zIndex: 0,
        transform: xf({ x: 700, y: 300 }),
        opacity: 1,
        visible: true,
        radius: 18,
        fill: hex("#ffffff"),
      },
      {
        id: "label",
        name: "label",
        parentId: null,
        space: "screen",
        kind: "text",
        zIndex: 1,
        transform: xf({ x: 80, y: 120 }),
        opacity: 1,
        visible: true,
        content: "screen",
        font: { family: "sans", size: 48, weight: 700, style: "normal" },
        align: "left",
        baseline: "alphabetic",
        fill: hex("#67e8f9"),
      },
    ],
    [numeric("zoom", { kind: "camera", cameraId: "main", channel: "zoom" }, 0, 2000, 1, 2)],
    { cameras: [{ id: "main", position: { x: 500, y: 300 }, zoom: 1, rotation: 0 }] },
  );

  return [
    {
      id: "hierarchy",
      label: "Hierarchy",
      caption:
        "Bunny, head, and ear are rotated. The ear spins from 0° to 90° around the yellow joint. The joint stays put while the pink ear moves.",
      watch: ["bunny.head.ear", "bunny.head.joint", "bunny.body"],
      scene: hierarchy,
    },
    {
      id: "slide",
      label: "Slide",
      caption: "x travels from 100 to 900 over 4 seconds. At 5 seconds the forwards fill still holds 900.",
      watch: ["box"],
      scene: slide,
    },
    {
      id: "easing",
      label: "Easing",
      caption: "The same 120→1000 trip with linear, ease-in, ease-out, and ease-in-out. Compare them at half a second.",
      watch: ["linear", "easeIn", "easeOut", "easeInOut"],
      scene: easing,
    },
    {
      id: "vec2",
      label: "Vec2",
      caption: "One track writes both position channels, from (120, 160) to (1000, 520).",
      watch: ["dot"],
      scene: vec2,
    },
    {
      id: "keyframes",
      label: "Keyframes",
      caption: "Y is 500, 300, 500, 350, 500 at 0%, 25%, 50%, 75%, and 100%.",
      watch: ["bob"],
      scene: keyframes,
    },
    {
      id: "expression",
      label: "Expression",
      caption: "X eases from 180 to 900. Y is 500 - abs(sin(local_t * 4 * PI)) * 90. Scrubbing matches a direct seek.",
      watch: ["bunny.body"],
      scene: hop,
    },
    {
      id: "fallback",
      label: "Fallback",
      caption:
        "At half a second the x expression divides by zero and the square snaps back to its authored x of 100. Negative sqrt keeps the authored y. The tracks stay enabled on either side.",
      watch: ["box"],
      scene: fallback,
    },
    {
      id: "camera",
      label: "Camera",
      caption:
        "Zoom goes from 1 to 2 with the camera at (500, 300). The white disc is world (700, 300) and ends at logical (1040, 360). The word screen is screen-space and does not move.",
      watch: ["marker", "label"],
      scene: camera,
    },
  ];
}

export function sceneById(id: string): SceneIR {
  const entry = buildRuntimeScenes().find((item) => item.id === id);
  if (!entry) throw new Error(`missing runtime scene ${id}`);
  return entry.scene;
}
