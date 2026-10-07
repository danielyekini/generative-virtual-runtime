import {
  CAMERA_CHANNELS,
  NODE_CHANNELS,
  type Camera2DDefinition,
  type KeyframeTrack,
  type NodeDefinition,
  type PathCommand,
  type SceneIR,
  type Paint,
  type SolidColor,
  type SegmentEasing,
  type Stroke,
  type TrackDefinition,
  type Vec2,
} from "@gvr/schema";

/**
 * Frozen MotionScript emission, importer milestone I0.
 *
 * - Header order is version, viewport, background, duration.
 * - The camera is always `main`, with position, zoom, and rotation.
 * - Hierarchy is nested. A child name is the last segment of its canonical id.
 * - Inside a node, placement comes before geometry and paint.
 * - Compiler defaults are omitted: zero position and pivot, zero rotation,
 *   unit scale, opacity 1, visible true, zIndex 0, world space, nonzero fill,
 *   left/alphabetic text, sans at weight 400, butt/miter stroke, miter limit 4.
 * - Tracks always state start and duration. Two-keyframe tracks are `animate`
 *   from/to. Longer tracks stay `keyframes`. Expressions are copied from the
 *   stored source. `fill` is written only when it is not `forwards`.
 * - Whole seconds use `s`. Any other whole millisecond count uses `ms`.
 * - Angles use `deg` when that round-trips, otherwise `rad`.
 * - Colours are lowercase `#rrggbb` or `#rrggbbaa`.
 * - Identical IR emits identical text.
 */

export function emitMotionScript(scene: SceneIR): string {
  const lines: string[] = [];
  lines.push(`scene ${quote(scene.sceneId)} {`);
  lines.push(`  version "${scene.irVersion}";`);
  lines.push(`  viewport (${formatNumber(scene.viewport.width)}, ${formatNumber(scene.viewport.height)});`);
  lines.push(`  background ${formatColor(scene.background)};`);
  lines.push(`  duration ${formatDuration(scene.timeline.durationMs)};`);
  for (const capability of scene.requiredCapabilities ?? []) lines.push(`  requires ${quote(capability)};`);
  lines.push(`};`);
  for (const scope of scene.timingScopes ?? []) {
    const body = [`  offset ${formatDuration(scope.offsetMs)};`, `  stretch ${formatNumber(scope.stretch)};`];
    if (scope.parentId) body.unshift(`  parent ${scope.parentId};`);
    lines.push(`timing ${scope.id} {`, ...body, `};`);
  }
  for (const composition of scene.compositions ?? []) {
    lines.push(`composition ${composition.id} {`);
    const emitted = new Set<string>();
    for (const node of childrenOf(composition.nodes, null)) lines.push(...emitNode(scene, composition.nodes, node, 1, emitted));
    lines.push(`};`);
  }
  for (const instance of scene.instances ?? []) {
    const body = [
      `  start ${formatDuration(instance.activation.startMs)};`,
      `  end ${formatDuration(instance.activation.endMs)};`,
      `  timing ${instance.timingScopeId};`,
    ];
    if (instance.parentId) body.push(`  parent ${instance.parentId};`);
    if (instance.transformParentId) body.push(`  transformParent ${instance.transformParentId};`);
    if (!zeroVec(instance.transform.position)) body.push(`  position ${formatVec(instance.transform.position)};`);
    lines.push(`instance ${instance.id} of ${instance.definitionId} {`, ...body, `};`);
  }
  const camera = scene.cameras.find((item) => item.id === "main") ?? scene.cameras[0];
  if (camera) lines.push(...emitCamera(camera));
  const emitted = new Set<string>();
  for (const node of childrenOf(scene.nodes, null)) lines.push(...emitNode(scene, scene.nodes, node, 0, emitted));
  for (const node of scene.nodes) {
    if (!emitted.has(node.id)) lines.push(...emitNode(scene, scene.nodes, node, 0, emitted));
  }
  for (const list of scene.geometryOperators ?? []) {
    const body = list.operators.map((operator) =>
      operator.op === "round"
        ? `  round ${formatNumber(operator.radius)};`
        : `  trim ${formatNumber(operator.start)}, ${formatNumber(operator.end)}, ${formatNumber(operator.offset)};`,
    );
    lines.push(`operators ${list.nodeId} {`, ...body, `};`);
  }
  for (const track of scene.timeline.tracks) lines.push(...emitTrack(track));
  for (const step of scene.timeline.steps) {
    lines.push(`step ${step.target.nodeId}.visible {`);
    lines.push(`  at ${formatDuration(step.timeMs)};`);
    lines.push(`  value ${step.value ? "true" : "false"};`);
    lines.push(`};`);
  }
  lines.push("complete;");
  return `${lines.join("\n")}\n`;
}

function emitCamera(camera: Camera2DDefinition): string[] {
  return [
    "camera main {",
    `  position ${formatVec(camera.position)};`,
    `  zoom ${formatNumber(camera.zoom)};`,
    `  rotation ${formatAngle(camera.rotation)};`,
    "};",
  ];
}

function emitNode(scene: SceneIR, nodes: readonly NodeDefinition[], node: NodeDefinition, depth: number, emitted: Set<string>): string[] {
  emitted.add(node.id);
  const pad = "  ".repeat(depth);
  const inner = "  ".repeat(depth + 1);
  const body = [...transformLines(node), ...geometryLines(scene, node)].map((line) => inner + line);
  if (node.kind === "group") {
    for (const child of childrenOf(nodes, node.id)) body.push(...emitNode(scene, nodes, child, depth + 1, emitted));
  }
  return [`${pad}${node.kind} ${node.name} {`, ...body, `${pad}};`];
}

function geometryLines(scene: SceneIR, node: NodeDefinition): string[] {
  const lines: string[] = [];
  if (node.kind === "rectangle" && node.cornerRadius) lines.push(`cornerRadius ${formatNumber(node.cornerRadius)};`);
  if (node.kind === "rectangle" || node.kind === "ellipse") lines.push(`size ${formatVec(node.size)};`);
  if (node.kind === "image") {
    const resource = scene.resources.find((entry) => entry.id === node.resourceId && entry.kind === "image");
    lines.push(`href ${quote(resource && resource.kind === "image" ? resource.href : "")};`);
    lines.push(`size ${formatVec(node.size)};`);
  }
  if (node.kind === "circle") lines.push(`radius ${formatNumber(node.radius)};`);
  if (node.kind === "line") {
    lines.push(`from ${formatVec(node.from)};`);
    lines.push(`to ${formatVec(node.to)};`);
  }
  if (node.kind === "polygon") lines.push(`points (${node.points.map((point) => formatVec(point)).join(", ")});`);
  if (node.kind === "text") {
    lines.push(`content ${quote(node.content)};`);
    if (node.font.family !== "sans") lines.push(`fontFamily ${quote(node.font.family)};`);
    lines.push(`fontSize ${formatNumber(node.font.size)};`);
    if (node.font.weight !== 400) lines.push(`fontWeight ${formatNumber(node.font.weight)};`);
    if (node.font.style !== "normal") lines.push(`fontStyle ${node.font.style};`);
    if (node.align !== "left") lines.push(`align ${node.align};`);
    if (node.baseline !== "alphabetic") lines.push(`baseline ${node.baseline};`);
  }
  if (node.kind === "path" && node.fillRule !== "nonzero") lines.push(`fillRule ${node.fillRule};`);
  if (node.kind !== "group" && node.kind !== "line" && node.kind !== "image" && node.fill) lines.push(`fill ${formatPaint(node.fill)};`);
  if (node.kind !== "group" && "stroke" in node && node.stroke) lines.push(`${formatStroke(node.stroke)};`);
  if (node.kind === "path") {
    for (const command of node.commands) lines.push(formatCommand(command));
  }
  return lines;
}

function transformLines(node: NodeDefinition): string[] {
  const lines: string[] = [];
  const { position, pivot, rotation, scale } = node.transform;
  if (!zeroVec(position)) lines.push(`position ${formatVec(position)};`);
  if (!zeroVec(pivot)) lines.push(`pivot ${formatVec(pivot)};`);
  if (!near(rotation, 0)) lines.push(`rotation ${formatAngle(rotation)};`);
  if (!near(scale.x, 1) || !near(scale.y, 1)) lines.push(`scale ${formatVec(scale)};`);
  if (!near(node.opacity, 1)) lines.push(`opacity ${formatNumber(node.opacity)};`);
  if (node.inheritOpacity === false) lines.push("inheritOpacity false;");
  if (node.transformParentId) lines.push(`transformParent ${node.transformParentId};`);
  if (node.kind === "group" && node.compositing?.isolated) lines.push("isolated true;");
  if (node.kind === "group" && node.compositing?.blend) {
    lines.push(`blend ${node.compositing.blend === "source-over" ? "sourceOver" : node.compositing.blend};`);
  }
  if (node.kind === "group" && node.compositing?.effect?.type === "blur") {
    lines.push(`blur ${formatNumber(node.compositing.effect.radius)};`);
  }
  if (!node.visible) lines.push("visible false;");
  if (node.parentId === null && node.space === "screen") lines.push("space screen;");
  if (node.zIndex !== 0) lines.push(`zIndex ${formatInteger(node.zIndex)};`);
  return lines;
}

function emitTrack(track: TrackDefinition): string[] {
  const target = formatTarget(track);
  const timing = [`  start ${formatDuration(track.startMs)};`, `  duration ${formatDuration(track.durationMs)};`];
  if (track.fill.after !== "forwards") timing.push("  fill none;");
  if (track.timingScopeId) timing.push(`  timing ${track.timingScopeId};`);
  if (track.kind === "keyframe" && track.composition) timing.push(`  order ${track.composition.order};`);
  if (track.kind === "expression") {
    return [`animate ${target} {`, `  expression ${quote(track.source)};`, ...timing, "};"];
  }
  if (isFromTo(track)) {
    const from = track.keyframes[0];
    const to = track.keyframes[1];
    if (!from || !to) return [];
    return [
      `animate ${target} {`,
      `  from ${formatAnim(from.value, track.valueType)};`,
      `  to ${formatAnim(to.value, track.valueType)};`,
      ...timing,
      `  ease ${formatEase(from.easing)};`,
      "};",
    ];
  }
  const frames = track.keyframes.map((frame, index) => {
    const ease = index === track.keyframes.length - 1 ? "" : ` ease ${formatEase(frame.easing)}`;
    const spatial = frame.spatial ? ` spatial ${formatVec(frame.spatial.out)} ${formatVec(frame.spatial.in)}` : "";
    return `  ${formatPercent(frame.offset)} ${formatAnim(frame.value, track.valueType)}${ease}${spatial};`;
  });
  return [`keyframes ${target} {`, ...timing, ...frames, "};"];
}

function formatEase(easing: SegmentEasing | undefined): string {
  if (!easing || typeof easing === "string") return easing ?? "linear";
  if (easing.type === "hold") return "hold";
  return `cubic(${formatNumber(easing.x1)}, ${formatNumber(easing.y1)}, ${formatNumber(easing.x2)}, ${formatNumber(easing.y2)})`;
}

function isFromTo(track: KeyframeTrack): boolean {
  const [from, to] = track.keyframes;
  return (
    track.keyframes.length === 2 &&
    !!from &&
    !!to &&
    from.offset === 0 &&
    to.offset === 1 &&
    to.easing === undefined &&
    track.valueType !== "path" &&
    !track.keyframes.some((frame) => frame.spatial)
  );
}

function formatTarget(track: TrackDefinition): string {
  if (track.target.kind === "camera") return `camera(${track.target.cameraId}).${CAMERA_CHANNELS[track.target.channel].dslPath}`;
  return `${track.target.nodeId}.${NODE_CHANNELS[track.target.channel].dslPath}`;
}

function formatAnim(
  value: number | Vec2 | PathCommand[],
  valueType: "number" | "vec2" | "angle" | "path",
): string {
  if (valueType === "path" && Array.isArray(value)) {
    return `path { ${value.map((command) => formatCommand(command)).join(" ")} }`;
  }
  if (typeof value !== "number") return formatVec(value as Vec2);
  return valueType === "angle" ? formatAngle(value) : formatNumber(value);
}

function formatCommand(command: PathCommand): string {
  if (command.cmd === "M") return `move ${formatVec(command)};`;
  if (command.cmd === "L") return `line ${formatVec(command)};`;
  if (command.cmd === "Q") return `quadratic (${formatNumber(command.cx)}, ${formatNumber(command.cy)}) (${formatNumber(command.x)}, ${formatNumber(command.y)});`;
  if (command.cmd === "C") {
    return `cubic (${formatNumber(command.c1x)}, ${formatNumber(command.c1y)}) (${formatNumber(command.c2x)}, ${formatNumber(command.c2y)}) (${formatNumber(command.x)}, ${formatNumber(command.y)});`;
  }
  return "close;";
}

function formatPaint(paint: Paint): string {
  if (paint.type === "solid") return formatColor(paint);
  const stops = paint.stops.map((stop) => `${formatNumber(stop.offset)} ${formatColor(stop.color)}`).join(" ");
  if (paint.type === "linear") {
    return `linear ${formatVec({ x: paint.x1, y: paint.y1 })} ${formatVec({ x: paint.x2, y: paint.y2 })} ${stops}`;
  }
  return `radial ${formatVec({ x: paint.cx, y: paint.cy })} ${formatNumber(paint.r)} ${stops}`;
}

function formatStroke(stroke: Stroke): string {
  let text = `stroke ${formatPaint(stroke.color)} width ${formatNumber(stroke.width)}`;
  if (stroke.cap !== "butt") text += ` cap ${stroke.cap}`;
  if (stroke.join !== "miter") text += ` join ${stroke.join}`;
  if (!near(stroke.miterLimit, 4)) text += ` miterLimit ${formatNumber(stroke.miterLimit)}`;
  return text;
}

function formatColor(color: SolidColor): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)));
  const hex = (value: number) => channel(value).toString(16).padStart(2, "0");
  const rgb = `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
  return channel(color.a) === 255 ? rgb : `${rgb}${hex(color.a)}`;
}

function formatDuration(ms: number): string {
  if (near(ms, Math.round(ms)) && Math.round(ms) % 1000 === 0) return `${Math.round(ms) / 1000}s`;
  if (near(ms, Math.round(ms))) return `${Math.round(ms)}ms`;
  return `${formatNumber(ms)}ms`;
}

function formatAngle(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  for (const digits of [0, 1, 2, 3, 4, 5, 6, 8]) {
    const rounded = Number(degrees.toFixed(digits));
    const back = (rounded * Math.PI) / 180;
    if (near(back, radians)) return `${trim(rounded)}deg`;
  }
  return `${formatNumber(radians)}rad`;
}

function formatPercent(offset: number): string {
  const percent = offset * 100;
  for (const digits of [0, 1, 2, 3, 4, 5, 6, 8]) {
    const rounded = Number(percent.toFixed(digits));
    if (near(rounded / 100, offset)) return `${trim(rounded)}%`;
  }
  return `${formatNumber(percent)}%`;
}

function formatVec(value: Vec2): string {
  return `(${formatNumber(value.x)}, ${formatNumber(value.y)})`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value) || Object.is(value, -0)) return "0";
  if (near(value, Math.round(value))) return String(Math.round(value));
  for (const digits of [1, 2, 3, 4, 5, 6, 8, 10, 12]) {
    const text = trim(Number(value.toFixed(digits)));
    if (near(Number(text), value)) return text;
  }
  return String(value);
}

function formatInteger(value: number): string {
  return String(Math.trunc(value));
}

function trim(value: number): string {
  return value.toString();
}

function quote(value: string): string {
  let out = '"';
  for (const ch of value) {
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return `${out}"`;
}

function childrenOf(nodes: readonly NodeDefinition[], parentId: string | null): NodeDefinition[] {
  return nodes.filter((node) => node.parentId === parentId);
}

function zeroVec(value: Vec2): boolean {
  return near(value.x, 0) && near(value.y, 0);
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}
