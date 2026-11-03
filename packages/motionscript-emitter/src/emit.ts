import {
  CAMERA_CHANNELS,
  NODE_CHANNELS,
  type AudioResourceDefinition,
  type Camera2DDefinition,
  type InteractionBinding,
  type InteractionChannel,
  type InteractionTarget,
  type KeyframeTrack,
  type NodeDefinition,
  type PathAttachment,
  type PathCommand,
  type SceneIR,
  type Paint,
  type SolidColor,
  type SegmentEasing,
  type PhysicsBodyDefinition,
  type PhysicsConstraintDefinition,
  type PhysicsJointDefinition,
  type PhysicsWorldDefinition,
  type SpatialLayerDefinition,
  type SpatialSurfaceDefinition,
  type SpatialTransformDefinition,
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
  for (const layer of scene.spatialLayers ?? []) lines.push(...emitSpatialLayer(layer));
  if (scene.physics) lines.push(...emitPhysics(scene.physics));
  // Transform parents may follow their children in paint/declaration order.
  // Keep that order and admit all node definitions as one dependency-complete unit.
  const batchNodes = scene.nodes.some((node) => Boolean(node.transformParentId));
  if (batchNodes) lines.push("batch {");
  const emitted = new Set<string>();
  const depth = batchNodes ? 1 : 0;
  for (const node of childrenOf(scene.nodes, null)) lines.push(...emitNode(scene, scene.nodes, node, depth, emitted));
  for (const node of scene.nodes) {
    if (!emitted.has(node.id)) lines.push(...emitNode(scene, scene.nodes, node, depth, emitted));
  }
  if (batchNodes) lines.push("};");
  for (const list of scene.geometryOperators ?? []) {
    const body = list.operators.map((operator) =>
      operator.op === "round"
        ? `  round ${formatNumber(operator.radius)};`
        : `  trim ${formatNumber(operator.start)}, ${formatNumber(operator.end)}, ${formatNumber(operator.offset)};`,
    );
    lines.push(`operators ${list.nodeId} {`, ...body, `};`);
  }
  // input.bindings: interact declarations (after nodes so targets resolve).
  for (const target of scene.interactions ?? []) lines.push(...emitInteract(target));
  // geometry.pathProgress: attach declarations (after nodes so traveller and path resolve).
  for (const attachment of scene.pathAttachments ?? []) lines.push(...emitAttach(attachment));
  for (const track of scene.timeline.tracks) lines.push(...emitTrack(track));
  // audio.cues / audio.generative: resources then cues, all before completion.
  for (const resource of scene.resources) {
    if (resource.kind !== "audio") continue;
    if (resource.source?.type === "generative") {
      lines.push(emitGenerativeAudio(resource));
      continue;
    }
    const href = resource.href ?? (resource.source?.type === "href" ? resource.source.href : "");
    lines.push(`audio ${resource.id} ${quote(href)} ${formatDuration(resource.durationMs ?? 0)};`);
  }
  for (const cue of scene.audioCues ?? []) {
    const body: string[] = [];
    if (cue.offsetMs !== undefined) body.push(`offset ${formatDuration(cue.offsetMs)};`);
    if (cue.durationMs !== undefined) body.push(`duration ${formatDuration(cue.durationMs)};`);
    if (cue.loops !== undefined) body.push(`loops ${formatNumber(cue.loops)};`);
    if (cue.gain !== undefined) body.push(`gain ${formatNumber(cue.gain)};`);
    if (cue.fadeInMs !== undefined) body.push(`fadeIn ${formatDuration(cue.fadeInMs)};`);
    if (cue.fadeOutMs !== undefined) body.push(`fadeOut ${formatDuration(cue.fadeOutMs)};`);
    if (cue.required !== undefined) body.push(`required ${cue.required ? "true" : "false"};`);
    const head = `cue ${cue.id} ${cue.bus} ${cue.resourceId} at ${formatDuration(cue.startMs)}`;
    lines.push(body.length > 0 ? `${head} { ${body.join(" ")} };` : `${head};`);
  }
  for (const step of scene.timeline.steps) {
    lines.push(`step ${step.target.nodeId}.${step.target.channel} {`);
    lines.push(`  at ${formatDuration(step.timeMs)};`);
    const stepValue =
      typeof step.value === "string" ? quote(step.value) : step.value ? "true" : "false";
    lines.push(`  value ${stepValue};`);
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

/** Scene IR path attachments → MotionScript `attach` (geometry.pathProgress). */
function emitAttach(attachment: PathAttachment): string[] {
  const body = [`  progress ${formatNumber(attachment.progress)};`];
  if (attachment.orient !== undefined) body.push(`  orient ${attachment.orient ? "true" : "false"};`);
  if (attachment.rollRadius !== undefined) body.push(`  rollRadius ${formatNumber(attachment.rollRadius)};`);
  return [`attach ${attachment.nodeId} along ${attachment.pathId} {`, ...body, "};"];
}

/** Scene IR interactions → MotionScript `interact` (input.bindings). */
function emitInteract(target: InteractionTarget): string[] {
  const body: string[] = [];
  if (target.focusable !== undefined) body.push(`  focusable ${target.focusable ? "true" : "false"};`);
  if (target.tabIndex !== undefined) body.push(`  tabIndex ${formatInteger(target.tabIndex)};`);
  if (target.pointer !== undefined) body.push(`  pointer ${target.pointer};`);
  for (const binding of target.bindings ?? []) body.push(`  ${formatInteractBinding(binding)};`);
  return [`interact ${target.nodeId} {`, ...body, "};"];
}

function formatInteractBinding(binding: InteractionBinding): string {
  const trigger = binding.on === "key" ? `on key ${quote(binding.key ?? "")}` : `on ${binding.on}`;
  return `${trigger} ${formatInteractAction(binding)}`;
}

function formatInteractAction(binding: InteractionBinding): string {
  const action = binding.action;
  if (action.kind === "dragTranslate") {
    return `dragTranslate ${formatVec(action.min)} ${formatVec(action.max)}`;
  }
  const addr = formatInteractAddress(binding.nodeId, action.channel);
  if (action.kind === "set") return `set ${addr} ${formatNumber(action.value)}`;
  if (action.kind === "toggle") {
    return `toggle ${addr} ${formatNumber(action.values[0])} ${formatNumber(action.values[1])}`;
  }
  return `step ${addr} ${formatNumber(action.delta)} ${formatNumber(action.min)} ${formatNumber(action.max)}`;
}

function formatInteractAddress(nodeId: string | undefined, channel: InteractionChannel): string {
  const path = NODE_CHANNELS[channel]?.dslPath ?? channel;
  return nodeId ? `${nodeId}.${path}` : path;
}

function emitSpatialLayer(layer: SpatialLayerDefinition): string[] {
  const body: string[] = ["  camera {"];
  const camera = layer.camera;
  body.push(`    projection ${camera.projection};`);
  if (camera.position) body.push(`    position ${formatVec3(camera.position)};`);
  if (camera.yaw !== undefined) body.push(`    yaw ${formatNumber(camera.yaw)};`);
  if (camera.pitch !== undefined) body.push(`    pitch ${formatNumber(camera.pitch)};`);
  if (camera.roll !== undefined) body.push(`    roll ${formatNumber(camera.roll)};`);
  if (camera.focalLength !== undefined) body.push(`    focalLength ${formatNumber(camera.focalLength)};`);
  if (camera.zoom !== undefined) body.push(`    zoom ${formatNumber(camera.zoom)};`);
  if (camera.near !== undefined) body.push(`    near ${formatNumber(camera.near)};`);
  body.push("  };");
  for (const surface of layer.surfaces) body.push(...emitSpatialSurface(surface));
  if (layer.seams) {
    const seams = layer.seams;
    body.push("  seams {");
    if (seams.split !== undefined) body.push(`    split ${seams.split ? "true" : "false"};`);
    if (seams.edgeEpsilon !== undefined) body.push(`    epsilon ${formatNumber(seams.edgeEpsilon)};`);
    if (seams.maxFragments !== undefined) body.push(`    maxFragments ${formatNumber(seams.maxFragments)};`);
    for (const edge of seams.edges ?? []) body.push(`    edge ${edge.a} ${edge.b};`);
    body.push("  };");
  }
  return [`spatialLayer ${layer.id} {`, ...body, "};"];
}

function emitSpatialSurface(surface: SpatialSurfaceDefinition): string[] {
  const body: string[] = [];
  if (surface.parent) body.push(`    parent ${surface.parent};`);
  if (surface.transform) body.push(...emitSpatialTransform(surface.transform));
  if (surface.backface) body.push(`    backface ${surface.backface};`);
  if (surface.backFill) body.push(`    backFill ${formatColor(surface.backFill)};`);
  return [`  surface ${surface.nodeId} {`, ...body, "  };"];
}

function emitSpatialTransform(transform: SpatialTransformDefinition): string[] {
  const lines: string[] = [];
  if (transform.position) lines.push(`    position ${formatVec3(transform.position)};`);
  if (transform.pivot) lines.push(`    pivot ${formatVec3(transform.pivot)};`);
  if (transform.rotation) lines.push(`    rotation ${formatVec3(transform.rotation)};`);
  if (transform.scale) lines.push(`    scale ${formatVec3(transform.scale)};`);
  if (transform.hinge) {
    lines.push(
      `    hinge ${formatVec(transform.hinge.from)} ${formatVec(transform.hinge.to)} ${formatAngle(transform.hinge.angle)};`,
    );
  }
  return lines;
}

/** Spatial layer vectors always need three components (z = 0 is meaningful). */
function formatVec3(value: { x: number; y: number; z: number }): string {
  return `(${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)})`;
}

function emitPhysics(world: PhysicsWorldDefinition): string[] {
  const body: string[] = [`  mode ${world.mode};`];
  if (world.gravity) body.push(`  gravity ${formatVec(world.gravity)};`);
  if (world.fixedDtMs !== undefined) body.push(`  fixedDtMs ${formatNumber(world.fixedDtMs)};`);
  if (world.seed !== undefined) body.push(`  seed ${formatNumber(world.seed)};`);
  if (world.maxBodies !== undefined) body.push(`  maxBodies ${formatNumber(world.maxBodies)};`);
  if (world.maxJoints !== undefined) body.push(`  maxJoints ${formatNumber(world.maxJoints)};`);
  if (world.maxContactsPerStep !== undefined) body.push(`  maxContactsPerStep ${formatNumber(world.maxContactsPerStep)};`);
  if (world.maxSolverIterations !== undefined) body.push(`  maxSolverIterations ${formatNumber(world.maxSolverIterations)};`);
  if (world.maxStepsPerAdvance !== undefined) body.push(`  maxStepsPerAdvance ${formatNumber(world.maxStepsPerAdvance)};`);
  for (const item of world.bodies) body.push(...emitPhysicsBody(item));
  for (const joint of world.joints ?? []) body.push(...emitPhysicsJoint(joint));
  for (const constraint of world.constraints ?? []) body.push(...emitPhysicsConstraint(constraint));
  return [`physics ${world.id} {`, ...body, "};"];
}

function emitPhysicsBody(body: PhysicsBodyDefinition): string[] {
  const lines: string[] = [`  body ${body.id} {`, `    kind ${body.kind};`];
  if (body.entityId) lines.push(`    entity ${body.entityId};`);
  lines.push(`    position ${formatVec({ x: body.x, y: body.y })};`);
  if (body.angle) lines.push(`    angle ${formatAngle(body.angle)};`);
  if (body.vx !== undefined || body.vy !== undefined) {
    lines.push(`    velocity ${formatVec({ x: body.vx ?? 0, y: body.vy ?? 0 })};`);
  }
  if (body.omega !== undefined) lines.push(`    omega ${formatNumber(body.omega)};`);
  if (body.mass !== undefined) lines.push(`    mass ${formatNumber(body.mass)};`);
  if (body.restitution !== undefined) lines.push(`    restitution ${formatNumber(body.restitution)};`);
  if (body.friction !== undefined) lines.push(`    friction ${formatNumber(body.friction)};`);
  if (body.collider.kind === "circle") {
    lines.push(`    collider circle ${formatNumber(body.collider.radius)};`);
  } else {
    lines.push(`    collider aabb ${formatNumber(body.collider.halfWidth)} ${formatNumber(body.collider.halfHeight)};`);
  }
  if (body.surfaceId) lines.push(`    surface ${body.surfaceId};`);
  lines.push("  };");
  return lines;
}

function emitPhysicsJoint(joint: PhysicsJointDefinition): string[] {
  const lines: string[] = [
    `  joint ${joint.id} {`,
    `    a ${joint.bodyA};`,
    `    b ${joint.bodyB};`,
    `    restLength ${formatNumber(joint.restLength)};`,
  ];
  if (joint.anchorA) lines.push(`    anchorA ${formatVec(joint.anchorA)};`);
  if (joint.anchorB) lines.push(`    anchorB ${formatVec(joint.anchorB)};`);
  if (joint.compliance !== undefined) lines.push(`    compliance ${formatNumber(joint.compliance)};`);
  lines.push("  };");
  return lines;
}

function emitPhysicsConstraint(constraint: PhysicsConstraintDefinition): string[] {
  const lines: string[] = [
    `  constraint ${constraint.id} {`,
    `    a ${constraint.a};`,
    `    b ${constraint.b};`,
    `    restLength ${formatNumber(constraint.restLength)};`,
  ];
  if (constraint.stiffness !== undefined) lines.push(`    stiffness ${formatNumber(constraint.stiffness)};`);
  lines.push("  };");
  return lines;
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
    if (node.numeric) {
      lines.push(`number ${formatNumber(node.numeric.value)};`);
      const format = node.numeric.format;
      if (format?.fractionDigits !== undefined) lines.push(`fractionDigits ${formatNumber(format.fractionDigits)};`);
      if (format?.minIntegerDigits !== undefined) {
        lines.push(`minIntegerDigits ${formatNumber(format.minIntegerDigits)};`);
      }
      if (format?.sign !== undefined && format.sign !== "auto") lines.push(`sign ${format.sign};`);
      if (format?.group !== undefined) lines.push(`group ${quote(format.group)};`);
      if (format?.decimal !== undefined && format.decimal !== ".") lines.push(`decimal ${quote(format.decimal)};`);
      if (format?.prefix !== undefined && format.prefix !== "") lines.push(`prefix ${quote(format.prefix)};`);
      if (format?.suffix !== undefined && format.suffix !== "") lines.push(`suffix ${quote(format.suffix)};`);
    }
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
  if (node.kind === "group" && node.compositing?.clip) {
    lines.push(`clip ${node.compositing.clip.geometryId};`);
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
    const spatial = frame.spatial
      ? ` spatial ${formatSpatial(frame.spatial.out)} ${formatSpatial(frame.spatial.in)}`
      : "";
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

function emitGenerativeAudio(resource: AudioResourceDefinition): string {
  const source = resource.source;
  if (source?.type !== "generative") return `audio ${resource.id} ${quote("")} 0ms;`;
  const body: string[] = [];
  if (source.durationHintMs !== undefined) body.push(`duration ${formatDuration(source.durationHintMs)};`);
  if (source.voice !== undefined) body.push(`voice ${quote(source.voice)};`);
  if (source.loop === true) body.push("loop;");
  else if (source.loop === false) body.push("loop false;");
  if (source.seed !== undefined) body.push(`seed ${formatNumber(source.seed)};`);
  if (source.style?.stability !== undefined) body.push(`stability ${formatNumber(source.style.stability)};`);
  if (source.style?.similarity !== undefined) body.push(`similarity ${formatNumber(source.style.similarity)};`);
  if (source.style?.speed !== undefined) body.push(`speed ${formatNumber(source.style.speed)};`);
  const head = `audio ${resource.id} = ${source.modality} ${quote(source.prompt)}`;
  return body.length > 0 ? `${head} { ${body.join(" ")} };` : `${head};`;
}

function formatDuration(ms: number): string {
  // Timing validation depends on sums of independently authored values. Relative
  // pretty-print rounding can turn an exact scene-end into an invalid overrun.
  // The shortest JS decimal preserves the original double through the reader.
  if (Number.isInteger(ms) && ms % 1000 === 0) return `${ms / 1000}s`;
  return `${Object.is(ms, -0) ? "0" : String(ms)}ms`;
}

function formatAngle(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  for (const digits of [0, 1, 2, 3, 4, 5, 6, 8]) {
    const rounded = Number(degrees.toFixed(digits));
    // Same arithmetic as the lexer's `deg` token: emit degrees only when they parse back exactly.
    const back = (rounded * Math.PI) / 180;
    if (back === radians) return `${trim(rounded)}deg`;
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

function formatSpatial(value: { x: number; y: number; z?: number }): string {
  if (value.z === undefined || Math.abs(value.z) < 1e-12) return formatVec(value);
  return `(${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)})`;
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
