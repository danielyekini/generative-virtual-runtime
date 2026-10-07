import {
  diagnostic,
  type Diagnostic,
  type DiagnosticCategory,
  type DiagnosticCode,
} from "./diagnostics";
import { isKnownCapability } from "./capabilities";
import { cubicControlsMonotonic } from "./easing";
import { expressionComplexity, exprsEqual, parseExpression } from "./expr";
import { nodeDepth } from "./graph";
import { resolveLimits, type ResourceLimits } from "./limits";
import { channelSpec, isValidSample, scalarWriters } from "./registry";
import { rootTimeMs } from "./timing";
import {
  IR_VERSION,
  IR_VERSION_02,
  type Camera2DDefinition,
  type Expr,
  type NodeDefinition,
  type PathCommand,
  type ResolvedFrame,
  type SceneIR,
  type SceneIRDelta,
  type SolidColor,
  type StepDefinition,
  type Stroke,
  type TimingScope,
  type TrackDefinition,
  type Vec2,
} from "./types";

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; diagnostics: Diagnostic[] };

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NODE_KINDS = ["group", "rectangle", "circle", "ellipse", "line", "polygon", "path", "image", "text"] as const;
const NODE_CHANNELS = new Set([
  "transform.position",
  "transform.position.x",
  "transform.position.y",
  "transform.rotation",
  "transform.scale",
  "transform.scale.x",
  "transform.scale.y",
  "transform.pivot",
  "transform.pivot.x",
  "transform.pivot.y",
  "opacity",
  "visible",
]);
const CAMERA_CHANNELS = new Set(["position", "position.x", "position.y", "zoom", "rotation"]);
const OPS = new Set([
  "CREATE_SCENE",
  "ADD_NODES",
  "ADD_TRACKS",
  "ADD_STEPS",
  "SEAL_TIMELINE",
  "COMPLETE_PROGRAM",
]);

const CATEGORY: Partial<Record<DiagnosticCode, DiagnosticCategory>> = {
  DUPLICATE_ID: "reference",
  INVALID_PARENT: "reference",
  CYCLE: "reference",
  UNKNOWN_TARGET: "reference",
  INVALID_CAMERA: "reference",
  CAMERA_COUNT: "reference",
  OVERLAPPING_WRITERS: "temporal",
  INVALID_TIMING: "temporal",
  RESOURCE_LIMIT: "resource",
  INVALID_EXPRESSION: "syntax",
  MALFORMED_PATH: "syntax",
};

class Diags {
  readonly items: Diagnostic[] = [];

  add(
    code: DiagnosticCode,
    path: string,
    message: string,
    extra?: { target?: string; sceneTimeMs?: number },
  ): void {
    this.items.push(
      diagnostic({
        code,
        phase: "validate",
        category: CATEGORY[code] ?? "type",
        path,
        message,
        target: extra?.target,
        sceneTimeMs: extra?.sceneTimeMs,
      }),
    );
  }
}

export function validateSceneIR(
  input: unknown,
  overrides?: Partial<ResourceLimits>,
): ValidateResult<SceneIR> {
  const limits = resolveLimits(overrides);
  const diags = new Diags();
  if (!isRecord(input)) {
    diags.add("INVALID_JSON", "", "Scene IR must be a JSON object.");
    return { ok: false, diagnostics: diags.items };
  }
  const version = input.irVersion;
  const v02 = version === IR_VERSION_02;
  const sceneKeys = ["irVersion", "sceneId", "viewport", "background", "resources", "nodes", "cameras", "initialCameraId", "timeline"];
  if (v02) sceneKeys.push("compositions", "instances", "timingScopes", "requiredCapabilities", "geometryOperators");
  rejectUnknown(input, sceneKeys, "", diags);
  if (version !== IR_VERSION && version !== IR_VERSION_02) {
    diags.add("UNSUPPORTED_IR_VERSION", "irVersion", `IR version must be ${IR_VERSION} or ${IR_VERSION_02}.`);
  }
  readSceneId(input.sceneId, "sceneId", diags);
  readViewport(input.viewport, "viewport", diags);
  readColor(input.background, "background", diags);
  const resources = readResources(input.resources, diags, v02);
  const nodes = readNodes(input.nodes, diags, limits, true, "nodes", v02);
  const cameras = readCameras(input.cameras, diags);
  if (typeof input.initialCameraId !== "string" || input.initialCameraId !== "main") {
    diags.add("INVALID_CAMERA", "initialCameraId", 'V1 initialCameraId must be "main".');
  }
  const nodeIds = new Set((nodes ?? []).map((node) => node.id));
  const compositions = v02 ? readCompositions(input.compositions, diags, limits, nodeIds) : [];
  const scopes = v02 ? readTimingScopes(input.timingScopes, diags) : [];
  if (v02) {
    readInstances(input.instances, nodes, compositions, scopes, input.timeline, diags);
    readCapabilities(input.requiredCapabilities, diags);
    readOperators(input.geometryOperators, nodes, compositions, diags);
  }
  readTimeline(input.timeline, nodes, cameras, limits, diags, v02, scopes);
  const compositionNodes = compositions.flatMap((composition) => composition.nodes);
  const nodeCount = (nodes?.length ?? 0) + compositionNodes.length;
  if (nodeCount > limits.maxNodes) {
    diags.add("RESOURCE_LIMIT", "nodes", `Node count ${nodeCount} exceeds ${limits.maxNodes}.`);
  }
  if (nodes) {
    let geometry = 0;
    let depth = 0;
    for (const list of [nodes, ...compositions.map((composition) => composition.nodes)]) {
      for (const node of list) {
        if (typeof node.id === "string") depth = Math.max(depth, nodeDepth(list, node.id));
        if (node.kind === "path" && Array.isArray(node.commands)) geometry += node.commands.length;
        if (node.kind === "polygon" && Array.isArray(node.points)) geometry += node.points.length;
      }
    }
    if (depth > limits.maxDepth) {
      diags.add("RESOURCE_LIMIT", "nodes", `Hierarchy depth ${depth} exceeds ${limits.maxDepth}.`);
    }
    if (geometry > limits.maxGeometryItems) {
      diags.add(
        "RESOURCE_LIMIT",
        "nodes",
        `Geometry complexity ${geometry} exceeds ${limits.maxGeometryItems}.`,
      );
    }
    checkFonts([...nodes, ...compositionNodes], resources, diags);
    checkImages([...nodes, ...compositionNodes], resources, diags);
  }
  if (diags.items.length > 0) return { ok: false, diagnostics: diags.items };
  return { ok: true, value: input as unknown as SceneIR };
}

export function validateResolvedFrame(input: unknown): ValidateResult<ResolvedFrame> {
  const diags = new Diags();
  if (!isRecord(input)) {
    diags.add("INVALID_JSON", "", "A resolved frame must be a JSON object.");
    return { ok: false, diagnostics: diags.items };
  }
  rejectUnknown(input, ["sceneTimeMs", "revision", "viewport", "background", "drawItems", "renderTree"], "", diags);
  readFinite(input.sceneTimeMs, "sceneTimeMs", diags);
  if (typeof input.sceneTimeMs === "number" && input.sceneTimeMs < 0) {
    diags.add("INVALID_TIMING", "sceneTimeMs", "Scene time cannot be negative.");
  }
  if (!Number.isInteger(input.revision) || typeof input.revision !== "number" || input.revision < 0) {
    diags.add("INVALID_TYPE", "revision", "Revision must be an integer >= 0.");
  }
  readViewport(input.viewport, "viewport", diags);
  readColor(input.background, "background", diags);
  if (!Array.isArray(input.drawItems)) {
    diags.add("INVALID_TYPE", "drawItems", "drawItems must be an array.");
  } else {
    input.drawItems.forEach((item, index) => readDrawItem(item, `drawItems[${index}]`, diags));
  }
  if (input.renderTree !== undefined) readRenderTree(input.renderTree, "renderTree", diags, new Set());
  if (diags.items.length > 0) return { ok: false, diagnostics: diags.items };
  return { ok: true, value: input as unknown as ResolvedFrame };
}

export function validateDelta(
  input: unknown,
  overrides?: Partial<ResourceLimits>,
): ValidateResult<SceneIRDelta> {
  const limits = resolveLimits(overrides);
  const diags = new Diags();
  if (!isRecord(input)) {
    diags.add("INVALID_JSON", "", "A scene delta must be a JSON object.");
    return { ok: false, diagnostics: diags.items };
  }
  rejectUnknown(
    input,
    ["generationId", "unitId", "expectedRevision", "nextRevision", "operations", "sourceSpan"],
    "",
    diags,
  );
  if (typeof input.generationId !== "string" || input.generationId.length === 0) {
    diags.add("INVALID_TYPE", "generationId", "generationId must be a non-empty string.");
  }
  readRevision(input.unitId, "unitId", diags);
  readRevision(input.expectedRevision, "expectedRevision", diags);
  readRevision(input.nextRevision, "nextRevision", diags);
  if (
    typeof input.expectedRevision === "number" &&
    typeof input.nextRevision === "number" &&
    input.nextRevision !== input.expectedRevision + 1
  ) {
    diags.add("INVALID_TYPE", "nextRevision", "nextRevision must be expectedRevision + 1.");
  }
  readSpan(input.sourceSpan, "sourceSpan", diags);
  if (!Array.isArray(input.operations) || input.operations.length === 0) {
    diags.add("MISSING_REQUIRED", "operations", "A delta needs at least one operation.");
  } else {
    input.operations.forEach((operation, index) => {
      readOperation(operation, `operations[${index}]`, limits, diags);
    });
  }
  if (diags.items.length > 0) return { ok: false, diagnostics: diags.items };
  return { ok: true, value: input as unknown as SceneIRDelta };
}

function readTimeline(
  value: unknown,
  nodes: NodeDefinition[] | undefined,
  cameras: Camera2DDefinition[] | undefined,
  limits: ResourceLimits,
  diags: Diags,
  v02: boolean,
  scopes: TimingScope[],
): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", "timeline", "timeline must be an object.");
    return;
  }
  rejectUnknown(value, ["durationMs", "tracks", "steps"], "timeline", diags);
  const duration = readFinite(value.durationMs, "timeline.durationMs", diags);
  if (duration !== undefined) {
    if (duration <= 0) diags.add("INVALID_TIMING", "timeline.durationMs", "Duration must be positive.");
    else if (duration > limits.maxDurationMs) {
      diags.add(
        "RESOURCE_LIMIT",
        "timeline.durationMs",
        `Duration ${duration}ms exceeds ${limits.maxDurationMs}ms.`,
      );
    }
  }
  const nodeIds = new Set((nodes ?? []).map((node) => node.id));
  const cameraIds = new Set((cameras ?? []).map((camera) => camera.id));
  const tracks = Array.isArray(value.tracks) ? value.tracks : undefined;
  if (!tracks) diags.add("INVALID_TYPE", "timeline.tracks", "tracks must be an array.");
  else if (tracks.length > limits.maxTracks) {
    diags.add("RESOURCE_LIMIT", "timeline.tracks", `Track count ${tracks.length} exceeds ${limits.maxTracks}.`);
  } else if (duration !== undefined && duration > 0) {
    const parsed: TrackDefinition[] = [];
    const ids = new Set<string>();
    tracks.forEach((track, index) => {
      const item = readTrack(track, `timeline.tracks[${index}]`, duration, nodeIds, cameraIds, limits, diags, v02, scopes);
      if (!item) return;
      if (ids.has(item.id)) diags.add("DUPLICATE_ID", `timeline.tracks[${index}].id`, `Duplicate track id ${item.id}.`);
      ids.add(item.id);
      parsed.push(item);
    });
    checkOverlap(parsed, scopes, diags);
  }
  const steps = Array.isArray(value.steps) ? value.steps : undefined;
  if (!steps) diags.add("INVALID_TYPE", "timeline.steps", "steps must be an array.");
  else if (steps.length > limits.maxSteps) {
    diags.add("RESOURCE_LIMIT", "timeline.steps", `Step count ${steps.length} exceeds ${limits.maxSteps}.`);
  } else if (duration !== undefined) {
    const seen = new Map<string, Set<number>>();
    steps.forEach((step, index) => {
      const item = readStep(step, `timeline.steps[${index}]`, duration, nodeIds, diags);
      if (!item) return;
      const key = item.target.nodeId;
      const times = seen.get(key) ?? new Set<number>();
      if (times.has(item.timeMs)) {
        diags.add(
          "OVERLAPPING_WRITERS",
          `timeline.steps[${index}]`,
          `Two steps write ${key}.visible at ${item.timeMs}ms.`,
          { target: `${key}.visible`, sceneTimeMs: item.timeMs },
        );
      }
      times.add(item.timeMs);
      seen.set(key, times);
    });
  }
}

function readTrack(
  value: unknown,
  path: string,
  durationMs: number,
  nodeIds: Set<string>,
  cameraIds: Set<string>,
  limits: ResourceLimits,
  diags: Diags,
  v02: boolean,
  scopes: TimingScope[],
): TrackDefinition | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A track must be an object.");
    return undefined;
  }
  const kind = value.kind;
  if (kind !== "keyframe" && kind !== "expression") {
    diags.add("INVALID_ENUM", `${path}.kind`, 'Track kind must be "keyframe" or "expression".');
    return undefined;
  }
  const allowed =
    kind === "keyframe"
      ? ["id", "kind", "target", "valueType", "startMs", "durationMs", "fill", "keyframes"]
      : ["id", "kind", "target", "valueType", "startMs", "durationMs", "fill", "source", "ast"];
  if (v02) {
    allowed.push("timingScopeId");
    if (kind === "keyframe") allowed.push("composition");
  }
  rejectUnknown(value, allowed, path, diags);
  const id = readIdent(value.id, `${path}.id`, diags);
  const target = readTarget(value.target, `${path}.target`, nodeIds, cameraIds, diags);
  const start = readFinite(value.startMs, `${path}.startMs`, diags);
  const length = readFinite(value.durationMs, `${path}.durationMs`, diags);
  readFill(value.fill, `${path}.fill`, diags);
  if (length !== undefined && length <= 0) {
    diags.add("INVALID_TIMING", `${path}.durationMs`, "Track duration must be positive.");
  }
  const scopeId = typeof value.timingScopeId === "string" ? value.timingScopeId : undefined;
  if (value.timingScopeId !== undefined && scopeId === undefined) {
    diags.add("INVALID_TYPE", `${path}.timingScopeId`, "timingScopeId must be a string.");
  }
  if (scopeId && !scopes.some((scope) => scope.id === scopeId)) {
    diags.add("UNKNOWN_TARGET", `${path}.timingScopeId`, `Timing scope ${scopeId} does not exist.`);
  }
  if (start !== undefined && length !== undefined && length > 0) {
    if (!scopeId) {
      if (start < 0 || start >= durationMs) {
        diags.add("INVALID_TIMING", `${path}.startMs`, "Track start must lie inside the scene duration.");
      }
      if (start + length > durationMs + 1e-6) {
        diags.add("INVALID_TIMING", path, "A track cannot extend past the scene duration.");
      }
    } else if (scopes.some((scope) => scope.id === scopeId)) {
      const span = rootSpan(scopes, scopeId, start, length);
      if (!span || span.start < -1e-6 || span.end > durationMs + 1e-6) {
        diags.add("INVALID_TIMING", path, "A track cannot extend past the scene duration.");
      }
    }
  }
  if (value.composition !== undefined) readCompositionOrder(value.composition, `${path}.composition`, diags);
  if (!target || !id) return undefined;
  const spec = channelSpec(target);
  if (spec.animation !== "track") {
    diags.add(
      "INVALID_TRACK_TARGET",
      `${path}.target`,
      `${targetLabel(target)} is changed with a step, not a track.`,
      { target: targetLabel(target) },
    );
  }
  if (value.kind === "expression" && spec.type === "vec2") {
    diags.add(
      "INVALID_TRACK_TARGET",
      `${path}.target`,
      "V1 expressions produce a number. Animate the scalar components instead.",
      { target: targetLabel(target) },
    );
  }
  const expectedType = spec.type === "boolean" ? "boolean" : spec.type;
  if (value.valueType !== expectedType) {
    diags.add(
      "INVALID_TRACK_TARGET",
      `${path}.valueType`,
      `${targetLabel(target)} has type ${spec.type}, not ${String(value.valueType)}.`,
      { target: targetLabel(target) },
    );
  }
  if (kind === "keyframe") {
    readKeyframes(value.keyframes, `${path}.keyframes`, spec.type, target.kind === "camera" ? target.channel : target.channel, diags, v02);
  } else {
    readExpressionTrack(value, path, limits, diags);
  }
  return value as unknown as TrackDefinition;
}

function readKeyframes(
  value: unknown,
  path: string,
  type: string,
  channel: string,
  diags: Diags,
  v02: boolean,
): void {
  if (!Array.isArray(value) || value.length < 2) {
    diags.add("INVALID_KEYFRAMES", path, "A keyframe track needs at least two keyframes.");
    return;
  }
  let sawStart = false;
  let sawEnd = false;
  let previous = -1;
  value.forEach((frame, index) => {
    const framePath = `${path}[${index}]`;
    if (!isRecord(frame)) {
      diags.add("INVALID_TYPE", framePath, "A keyframe must be an object.");
      return;
    }
    rejectUnknown(frame, v02 ? ["offset", "value", "easing", "spatial"] : ["offset", "value", "easing"], framePath, diags);
    if (frame.spatial !== undefined) {
      if (channel !== "transform.position" && channel !== "position") {
        diags.add("UNSUPPORTED_PROPERTY", `${framePath}.spatial`, "Spatial tangents belong on a vec2 position channel.");
      }
      if (!isRecord(frame.spatial)) diags.add("INVALID_TYPE", `${framePath}.spatial`, "spatial must be an object.");
      else {
        rejectUnknown(frame.spatial, ["out", "in"], `${framePath}.spatial`, diags);
        readVec(frame.spatial.out, `${framePath}.spatial.out`, diags);
        readVec(frame.spatial.in, `${framePath}.spatial.in`, diags);
      }
    }
    const offset = readFinite(frame.offset, `${framePath}.offset`, diags);
    if (offset !== undefined && (offset < 0 || offset > 1)) {
      diags.add("INVALID_KEYFRAMES", `${framePath}.offset`, "Keyframe offsets must lie in [0, 1].");
    }
    if (offset === 0) sawStart = true;
    if (offset === 1) sawEnd = true;
    if (offset !== undefined) {
      if (offset <= previous) {
        diags.add("INVALID_KEYFRAMES", `${framePath}.offset`, "Keyframe offsets must strictly increase.");
      }
      previous = offset;
    }
    const last = index === value.length - 1;
    if (frame.easing !== undefined) {
      if (!v02 && typeof frame.easing !== "string") {
        diags.add("UNSUPPORTED_PROPERTY", `${framePath}.easing`, "Scene IR 0.1 easing is a name.");
      } else if (!isEasing(frame.easing, diags, `${framePath}.easing`)) {
        diags.add("INVALID_ENUM", `${framePath}.easing`, "Unknown easing.");
      } else if (last) {
        diags.add(
          "INVALID_KEYFRAMES",
          `${framePath}.easing`,
          "The last keyframe has no outgoing segment, so it cannot carry easing.",
        );
      }
    }
    if (!sampleOk(type, channel, frame.value)) {
      diags.add("INVALID_TRACK_VALUE", `${framePath}.value`, "Keyframe value does not match the target type.");
    }
  });
  if (!sawStart || !sawEnd) {
    diags.add("INVALID_KEYFRAMES", path, "Keyframe offsets must include both 0 and 1.");
  }
}

function readExpressionTrack(value: Record<string, unknown>, path: string, limits: ResourceLimits, diags: Diags): void {
  if (typeof value.source !== "string") {
    diags.add("MISSING_REQUIRED", `${path}.source`, "An expression track needs its source text.");
    return;
  }
  const parsed = parseExpression(value.source);
  const ast = readExpr(value.ast, `${path}.ast`, diags);
  if (!parsed.ok) {
    for (const item of parsed.diagnostics) {
      diags.items.push({ ...item, path: `${path}.source` });
    }
    return;
  }
  if (ast && !exprsEqual(parsed.ast, ast)) {
    diags.add("INVALID_EXPRESSION", path, "Expression source and AST do not match.");
  }
  const complexity = expressionComplexity(parsed.ast);
  if (complexity.depth > limits.maxExpressionDepth) {
    diags.add(
      "RESOURCE_LIMIT",
      path,
      `Expression depth ${complexity.depth} exceeds ${limits.maxExpressionDepth}.`,
    );
  }
  if (complexity.ops > limits.maxExpressionOps) {
    diags.add("RESOURCE_LIMIT", path, `Expression has ${complexity.ops} operations; the limit is ${limits.maxExpressionOps}.`);
  }
}

function readStep(
  value: unknown,
  path: string,
  durationMs: number,
  nodeIds: Set<string>,
  diags: Diags,
): StepDefinition | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A step must be an object.");
    return undefined;
  }
  rejectUnknown(value, ["id", "target", "timeMs", "value"], path, diags);
  readIdent(value.id, `${path}.id`, diags);
  const time = readFinite(value.timeMs, `${path}.timeMs`, diags);
  if (time !== undefined && (time < 0 || time > durationMs)) {
    diags.add("INVALID_TIMING", `${path}.timeMs`, "A step must lie within the scene duration.");
  }
  if (!isRecord(value.target)) {
    diags.add("INVALID_TYPE", `${path}.target`, "A step target must be an object.");
    return undefined;
  }
  rejectUnknown(value.target, ["kind", "nodeId", "channel"], `${path}.target`, diags);
  if (value.target.kind !== "node" || value.target.channel !== "visible") {
    diags.add("INVALID_TRACK_TARGET", `${path}.target`, "V1 steps can write only node visible.");
    return undefined;
  }
  if (typeof value.target.nodeId !== "string" || !nodeIds.has(value.target.nodeId)) {
    diags.add("UNKNOWN_TARGET", `${path}.target.nodeId`, "Step target node does not exist.");
    return undefined;
  }
  if (typeof value.value !== "boolean") {
    diags.add("INVALID_TRACK_VALUE", `${path}.value`, "visible steps require a boolean.");
    return undefined;
  }
  return value as unknown as StepDefinition;
}

function readTarget(
  value: unknown,
  path: string,
  nodeIds: Set<string>,
  cameraIds: Set<string>,
  diags: Diags,
): TrackDefinition["target"] | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A track target must be an object.");
    return undefined;
  }
  if (value.kind === "node") {
    rejectUnknown(value, ["kind", "nodeId", "channel"], path, diags);
    if (typeof value.nodeId !== "string" || !nodeIds.has(value.nodeId)) {
      diags.add("UNKNOWN_TARGET", `${path}.nodeId`, "Track target node does not exist.", {
        target: typeof value.nodeId === "string" ? value.nodeId : undefined,
      });
      return undefined;
    }
    if (typeof value.channel !== "string" || !NODE_CHANNELS.has(value.channel)) {
      diags.add("UNSUPPORTED_PROPERTY", `${path}.channel`, "That node channel is not animatable.");
      return undefined;
    }
    return value as TrackDefinition["target"];
  }
  if (value.kind === "camera") {
    rejectUnknown(value, ["kind", "cameraId", "channel"], path, diags);
    if (typeof value.cameraId !== "string" || !cameraIds.has(value.cameraId)) {
      diags.add("UNKNOWN_TARGET", `${path}.cameraId`, "Track target camera does not exist.");
      return undefined;
    }
    if (typeof value.channel !== "string" || !CAMERA_CHANNELS.has(value.channel)) {
      diags.add("UNSUPPORTED_PROPERTY", `${path}.channel`, "That camera channel is not animatable.");
      return undefined;
    }
    return value as TrackDefinition["target"];
  }
  diags.add("INVALID_ENUM", `${path}.kind`, 'Target kind must be "node" or "camera".');
  return undefined;
}

function checkOverlap(tracks: TrackDefinition[], scopes: TimingScope[], diags: Diags): void {
  const writers = new Map<string, { start: number; end: number; id: string; path: string }[]>();
  tracks.forEach((track, index) => {
    const span = track.timingScopeId
      ? rootSpan(scopes, track.timingScopeId, track.startMs, track.durationMs)
      : { start: track.startMs, end: track.startMs + track.durationMs };
    if (!span) return;
    for (const scalar of scalarWriters(track.target)) {
      const list = writers.get(scalar) ?? [];
      list.push({
        start: span.start,
        end: span.end,
        id: track.id,
        path: `timeline.tracks[${index}]`,
      });
      writers.set(scalar, list);
    }
  });
  for (const [scalar, list] of writers) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i += 1) {
      const previous = list[i - 1];
      const current = list[i];
      if (!previous || !current) continue;
      if (current.start < previous.end - 1e-9) {
        diags.add(
          "OVERLAPPING_WRITERS",
          current.path,
          `${current.id} overlaps ${previous.id} on ${scalar}.`,
          { target: scalar },
        );
      }
    }
  }
}

function readNodes(
  value: unknown,
  diags: Diags,
  limits: ResourceLimits,
  requireParents: boolean,
  path = "nodes",
  v02 = false,
): NodeDefinition[] | undefined {
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", path, "nodes must be an array.");
    return undefined;
  }
  const nodes: NodeDefinition[] = [];
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const node = readNode(entry, `${path}[${index}]`, diags, limits, v02);
    if (!node) return;
    if (ids.has(node.id)) diags.add("DUPLICATE_ID", `${path}[${index}].id`, `Duplicate node id ${node.id}.`);
    ids.add(node.id);
    nodes.push(node);
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (node.parentId === null) {
      if (node.id !== node.name) {
        diags.add("INVALID_ID", node.id, `Root ${node.id} must use its name as its id.`);
      }
      if (node.space !== "world" && node.space !== "screen") {
        diags.add("SPACE_VIOLATION", node.id, "A root must declare space world or screen.");
      }
      continue;
    }
    if (!byId.has(node.parentId)) {
      if (requireParents) {
        diags.add("INVALID_PARENT", node.id, `Parent ${node.parentId} does not exist.`, {
          target: node.id,
        });
      }
    } else if (node.id !== `${node.parentId}.${node.name}`) {
      diags.add(
        "INVALID_ID",
        node.id,
        `Canonical id must be ${node.parentId}.${node.name}.`,
      );
    }
    if (node.space !== undefined) {
      diags.add("SPACE_VIOLATION", node.id, "Only a root may declare space.");
    }
    if (node.transformParentId) {
      if (!byId.has(node.transformParentId)) {
        diags.add("INVALID_PARENT", node.id, `Transform parent ${node.transformParentId} does not exist.`, {
          target: node.id,
        });
      }
    }
  }
  for (const node of nodes) {
    if (cycleFrom(node.id, byId, "contain")) {
      diags.add("CYCLE", node.id, `Node ${node.id} is part of a parent cycle.`, { target: node.id });
      break;
    }
    if (node.transformParentId !== undefined && cycleFrom(node.id, byId, "transform")) {
      diags.add("CYCLE", node.id, `Node ${node.id} is part of a transform cycle.`, { target: node.id });
      break;
    }
  }
  return nodes;
}

function cycleFrom(start: string, byId: Map<string, NodeDefinition>, via: "contain" | "transform"): boolean {
  const seen = new Set<string>();
  let current: string | null = start;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    const node = byId.get(current);
    if (!node) return false;
    if (via === "transform" && node.transformParentId !== undefined) current = node.transformParentId;
    else current = node.parentId;
  }
  return false;
}

function readNode(value: unknown, path: string, diags: Diags, limits: ResourceLimits, v02: boolean): NodeDefinition | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A node must be an object.");
    return undefined;
  }
  const kind = value.kind;
  if (typeof kind !== "string" || !NODE_KINDS.includes(kind as (typeof NODE_KINDS)[number])) {
    diags.add("INVALID_ENUM", `${path}.kind`, "Unknown node kind.");
    return undefined;
  }
  const common = ["id", "name", "parentId", "space", "zIndex", "transform", "opacity", "visible", "kind"];
  if (v02) common.push("transformParentId", "inheritOpacity");
  const extra: Record<string, string[]> = {
    group: v02 ? ["compositing"] : [],
    rectangle: v02 ? ["size", "cornerRadius", "fill", "stroke"] : ["size", "fill", "stroke"],
    circle: ["radius", "fill", "stroke"],
    ellipse: ["size", "fill", "stroke"],
    line: ["from", "to", "stroke"],
    polygon: ["points", "fill", "stroke"],
    path: ["commands", "fillRule", "fill", "stroke"],
    image: ["resourceId", "size"],
    text: ["content", "font", "align", "baseline", "fill", "stroke"],
  };
  rejectUnknown(value, [...common, ...(extra[kind] ?? [])], path, diags);
  readIdent(value.name, `${path}.name`, diags);
  if (typeof value.id !== "string" || value.id.length === 0) {
    diags.add("INVALID_ID", `${path}.id`, "A node id is required.");
  }
  if (value.parentId !== null && typeof value.parentId !== "string") {
    diags.add("INVALID_TYPE", `${path}.parentId`, "parentId must be a string or null.");
  }
  if (value.space !== undefined && value.space !== "world" && value.space !== "screen") {
    diags.add("INVALID_ENUM", `${path}.space`, 'space must be "world" or "screen".');
  }
  if (typeof value.zIndex !== "number" || !Number.isInteger(value.zIndex)) {
    diags.add("INVALID_TYPE", `${path}.zIndex`, "zIndex must be an integer.");
  }
  readTransform(value.transform, `${path}.transform`, diags);
  readOpacity(value.opacity, `${path}.opacity`, diags);
  if (typeof value.visible !== "boolean") diags.add("INVALID_TYPE", `${path}.visible`, "visible must be a boolean.");
  if (value.transformParentId !== undefined && value.transformParentId !== null && typeof value.transformParentId !== "string") {
    diags.add("INVALID_TYPE", `${path}.transformParentId`, "transformParentId must be a string or null.");
  }
  if (value.inheritOpacity !== undefined && typeof value.inheritOpacity !== "boolean") {
    diags.add("INVALID_TYPE", `${path}.inheritOpacity`, "inheritOpacity must be a boolean.");
  }
  readGeometry(value, path, kind, limits, diags, v02);
  return value as unknown as NodeDefinition;
}

function readGeometry(
  value: Record<string, unknown>,
  path: string,
  kind: string,
  limits: ResourceLimits,
  diags: Diags,
  v02: boolean,
): void {
  if (kind === "rectangle" || kind === "ellipse" || kind === "image") {
    const size = readVec(value.size, `${path}.size`, diags);
    if (size && (size.x <= 0 || size.y <= 0)) {
      diags.add("INVALID_GEOMETRY", `${path}.size`, "Width and height must be positive.");
    }
  }
  if (kind === "rectangle" && value.cornerRadius !== undefined) {
    const radius = readFinite(value.cornerRadius, `${path}.cornerRadius`, diags);
    if (radius !== undefined && radius < 0) diags.add("INVALID_GEOMETRY", `${path}.cornerRadius`, "Corner radius cannot be negative.");
  }
  if (kind === "image" && (typeof value.resourceId !== "string" || value.resourceId.length === 0)) {
    diags.add("MISSING_REQUIRED", `${path}.resourceId`, "An image needs a resource id.");
  }
  if (kind === "group" && value.compositing !== undefined) readCompositing(value.compositing, `${path}.compositing`, diags);
  if (kind === "circle") {
    const radius = readFinite(value.radius, `${path}.radius`, diags);
    if (radius !== undefined && radius <= 0) {
      diags.add("INVALID_GEOMETRY", `${path}.radius`, "Radius must be positive.");
    }
  }
  if (kind === "line") {
    readVec(value.from, `${path}.from`, diags);
    readVec(value.to, `${path}.to`, diags);
    if (value.stroke === undefined) diags.add("MISSING_REQUIRED", `${path}.stroke`, "A line requires a stroke.");
  }
  if (kind === "polygon") {
    if (!Array.isArray(value.points) || value.points.length < 3) {
      diags.add("INVALID_GEOMETRY", `${path}.points`, "A polygon needs at least three points.");
    } else {
      value.points.forEach((point, index) => readVec(point, `${path}.points[${index}]`, diags));
    }
  }
  if (kind === "path") {
    if (value.fillRule !== "nonzero" && value.fillRule !== "evenodd") {
      diags.add("INVALID_ENUM", `${path}.fillRule`, 'fillRule must be "nonzero" or "evenodd".');
    }
    readPath(value.commands, `${path}.commands`, diags);
  }
  if (kind === "text") {
    if (typeof value.content !== "string") diags.add("INVALID_TYPE", `${path}.content`, "Text content must be a string.");
    else if (/[\r\n]/.test(value.content)) {
      diags.add("INVALID_GEOMETRY", `${path}.content`, "V1 text is a single line.");
    }
    readFont(value.font, `${path}.font`, diags);
    if (value.align !== "left" && value.align !== "center" && value.align !== "right") {
      diags.add("INVALID_ENUM", `${path}.align`, 'align must be "left", "center", or "right".');
    }
    if (!["alphabetic", "middle", "top", "bottom"].includes(String(value.baseline))) {
      diags.add("INVALID_ENUM", `${path}.baseline`, "Unknown text baseline.");
    }
    if (value.fill === undefined) diags.add("MISSING_REQUIRED", `${path}.fill`, "Text requires a fill.");
  }
  if (value.fill !== undefined && kind !== "group" && kind !== "line" && kind !== "image") {
    readPaint(value.fill, `${path}.fill`, diags, v02);
  }
  if (value.stroke !== undefined) readStroke(value.stroke, `${path}.stroke`, diags, v02);
  void limits;
}

function readPath(value: unknown, path: string, diags: Diags): void {
  if (!Array.isArray(value) || value.length === 0) {
    diags.add("MALFORMED_PATH", path, "A path needs at least one command and must start with move.");
    return;
  }
  const first = value[0];
  if (!isRecord(first) || first.cmd !== "M") {
    diags.add("MALFORMED_PATH", path, "A path must start with an absolute move.");
    return;
  }
  let open = false;
  let hasPoint = false;
  value.forEach((command, index) => {
    const commandPath = `${path}[${index}]`;
    if (!isRecord(command) || typeof command.cmd !== "string") {
      diags.add("MALFORMED_PATH", commandPath, "A path command must declare cmd.");
      return;
    }
    if (command.cmd === "M") {
      readFinite(command.x, `${commandPath}.x`, diags);
      readFinite(command.y, `${commandPath}.y`, diags);
      rejectUnknown(command, ["cmd", "x", "y"], commandPath, diags);
      open = true;
      hasPoint = true;
      return;
    }
    if (command.cmd === "L") {
      if (!hasPoint) diags.add("MALFORMED_PATH", commandPath, "line requires a current point.");
      readFinite(command.x, `${commandPath}.x`, diags);
      readFinite(command.y, `${commandPath}.y`, diags);
      rejectUnknown(command, ["cmd", "x", "y"], commandPath, diags);
      hasPoint = true;
      return;
    }
    if (command.cmd === "Q") {
      if (!hasPoint) diags.add("MALFORMED_PATH", commandPath, "quadratic requires a current point.");
      for (const key of ["cx", "cy", "x", "y"]) readFinite(command[key], `${commandPath}.${key}`, diags);
      rejectUnknown(command, ["cmd", "cx", "cy", "x", "y"], commandPath, diags);
      hasPoint = true;
      return;
    }
    if (command.cmd === "C") {
      if (!hasPoint) diags.add("MALFORMED_PATH", commandPath, "cubic requires a current point.");
      for (const key of ["c1x", "c1y", "c2x", "c2y", "x", "y"]) {
        readFinite(command[key], `${commandPath}.${key}`, diags);
      }
      rejectUnknown(command, ["cmd", "c1x", "c1y", "c2x", "c2y", "x", "y"], commandPath, diags);
      hasPoint = true;
      return;
    }
    if (command.cmd === "Z") {
      rejectUnknown(command, ["cmd"], commandPath, diags);
      if (!open) diags.add("MALFORMED_PATH", commandPath, "close has no open subpath.");
      open = false;
      hasPoint = true;
      return;
    }
    diags.add("MALFORMED_PATH", commandPath, `Unknown path command ${command.cmd}.`);
  });
}

function readTransform(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "transform must be an object.");
    return;
  }
  rejectUnknown(value, ["position", "pivot", "rotation", "scale"], path, diags);
  readVec(value.position, `${path}.position`, diags);
  readVec(value.pivot, `${path}.pivot`, diags);
  readFinite(value.rotation, `${path}.rotation`, diags);
  const scale = readVec(value.scale, `${path}.scale`, diags);
  if (scale && (!Number.isFinite(scale.x) || !Number.isFinite(scale.y))) {
    diags.add("NON_FINITE", `${path}.scale`, "Scale components must be finite.");
  }
}

function readFont(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "font must be an object.");
    return;
  }
  rejectUnknown(value, ["family", "size", "weight", "style"], path, diags);
  if (typeof value.family !== "string" || value.family.length === 0) {
    diags.add("INVALID_TYPE", `${path}.family`, "font.family is required.");
  }
  const size = readFinite(value.size, `${path}.size`, diags);
  if (size !== undefined && size <= 0) diags.add("INVALID_GEOMETRY", `${path}.size`, "Font size must be positive.");
  const weight = readFinite(value.weight, `${path}.weight`, diags);
  if (weight !== undefined && (weight < 1 || weight > 1000)) {
    diags.add("INVALID_GEOMETRY", `${path}.weight`, "Font weight must lie in 1..1000.");
  }
  if (value.style !== "normal" && value.style !== "italic") {
    diags.add("INVALID_ENUM", `${path}.style`, 'font.style must be "normal" or "italic".');
  }
}

function readResources(value: unknown, diags: Diags, v02 = false): { id: string; kind: string; family: string }[] {
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "resources", "resources must be an array.");
    return [];
  }
  const resources: { id: string; kind: string; family: string }[] = [];
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `resources[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "A resource must be an object.");
      return;
    }
    if (entry.readiness !== undefined && entry.readiness !== "ready" && entry.readiness !== "pending" && entry.readiness !== "failed") {
      diags.add("INVALID_ENUM", `${path}.readiness`, 'readiness must be "ready", "pending", or "failed".');
    }
    const id = readIdent(entry.id, `${path}.id`, diags);
    if (id && ids.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate resource id ${id}.`);
    if (id) ids.add(id);
    if (entry.kind === "image") {
      if (!v02) diags.add("UNSUPPORTED_PROPERTY", path, "Image resources require Scene IR 0.2.");
      rejectUnknown(entry, ["id", "kind", "href", "readiness"], path, diags);
      if (typeof entry.href !== "string" || entry.href.length === 0) {
        diags.add("MISSING_REQUIRED", `${path}.href`, "An image resource needs an href.");
      }
      resources.push({ id: id ?? "", kind: "image", family: "" });
      return;
    }
    rejectUnknown(entry, v02 ? ["id", "kind", "family", "source", "readiness"] : ["id", "kind", "family", "source"], path, diags);
    if (entry.kind !== "font") diags.add("INVALID_ENUM", `${path}.kind`, 'A resource kind is "font" or, in 0.2, "image".');
    if (entry.source !== "builtin") diags.add("INVALID_ENUM", `${path}.source`, 'V1 font source must be "builtin".');
    if (typeof entry.family !== "string" || entry.family.length === 0) {
      diags.add("INVALID_TYPE", `${path}.family`, "A font family name is required.");
      return;
    }
    resources.push({ id: id ?? "", kind: "font", family: entry.family });
  });
  return resources;
}

function checkImages(nodes: NodeDefinition[], resources: { id: string; kind: string }[], diags: Diags): void {
  const images = new Set(resources.filter((resource) => resource.kind === "image").map((resource) => resource.id));
  for (const node of nodes) {
    if (node.kind !== "image") continue;
    if (!images.has(node.resourceId)) {
      diags.add("UNKNOWN_TARGET", node.id, `Image resource ${node.resourceId} does not exist.`, { target: node.id });
    }
  }
}

function checkFonts(nodes: NodeDefinition[], resources: { family: string }[], diags: Diags): void {
  const families = new Set(resources.map((resource) => resource.family));
  for (const node of nodes) {
    if (node.kind !== "text" || !node.font || typeof node.font.family !== "string") continue;
    if (!families.has(node.font.family)) {
      diags.add("UNKNOWN_TARGET", node.id, `Text font ${node.font.family} has no resource.`, {
        target: node.id,
      });
    }
  }
}

function readCameras(value: unknown, diags: Diags): Camera2DDefinition[] | undefined {
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "cameras", "cameras must be an array.");
    return undefined;
  }
  if (value.length !== 1) {
    diags.add("CAMERA_COUNT", "cameras", "V1 requires exactly one camera.");
  }
  const cameras: Camera2DDefinition[] = [];
  value.forEach((entry, index) => {
    const path = `cameras[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "A camera must be an object.");
      return;
    }
    rejectUnknown(entry, ["id", "position", "zoom", "rotation"], path, diags);
    if (entry.id !== "main") diags.add("INVALID_CAMERA", `${path}.id`, 'The V1 camera must be named "main".');
    readVec(entry.position, `${path}.position`, diags);
    const zoom = readFinite(entry.zoom, `${path}.zoom`, diags);
    if (zoom !== undefined && zoom <= 0) diags.add("INVALID_ZOOM", `${path}.zoom`, "Camera zoom must be strictly positive.");
    readFinite(entry.rotation, `${path}.rotation`, diags);
    cameras.push(entry as unknown as Camera2DDefinition);
  });
  return cameras;
}

function readViewport(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "viewport must be an object.");
    return;
  }
  rejectUnknown(value, ["width", "height", "fit"], path, diags);
  const width = readFinite(value.width, `${path}.width`, diags);
  const height = readFinite(value.height, `${path}.height`, diags);
  if (width !== undefined && width <= 0) diags.add("INVALID_GEOMETRY", `${path}.width`, "Viewport width must be positive.");
  if (height !== undefined && height <= 0) {
    diags.add("INVALID_GEOMETRY", `${path}.height`, "Viewport height must be positive.");
  }
  if (value.fit !== "contain") diags.add("INVALID_ENUM", `${path}.fit`, 'V1 viewport fit must be "contain".');
}

function readFill(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "fill must be an object.");
    return;
  }
  rejectUnknown(value, ["before", "after"], path, diags);
  if (value.before !== "none") diags.add("INVALID_ENUM", `${path}.before`, 'V1 fill.before must be "none".');
  if (value.after !== "none" && value.after !== "forwards") {
    diags.add("INVALID_ENUM", `${path}.after`, 'fill.after must be "none" or "forwards".');
  }
}

function readOpacity(value: unknown, path: string, diags: Diags): void {
  if (typeof value !== "number") {
    diags.add("INVALID_TYPE", path, "opacity must be a number.");
    return;
  }
  if (!Number.isFinite(value)) {
    diags.add("NON_FINITE", path, "opacity must be finite.");
    return;
  }
  if (value < 0 || value > 1) diags.add("INVALID_OPACITY", path, "opacity must lie in [0, 1].");
}

function readColor(value: unknown, path: string, diags: Diags): SolidColor | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_COLOR", path, "A colour must be a solid colour object.");
    return undefined;
  }
  rejectUnknown(value, ["type", "r", "g", "b", "a"], path, diags);
  if (value.type !== "solid") diags.add("INVALID_ENUM", `${path}.type`, 'V1 colours have type "solid".');
  for (const channel of ["r", "g", "b", "a"] as const) {
    const component = value[channel];
    if (typeof component !== "number" || !Number.isFinite(component) || component < 0 || component > 1) {
      diags.add("INVALID_COLOR", `${path}.${channel}`, "Colour channels must lie in [0, 1].");
    }
  }
  return value as unknown as SolidColor;
}

function readPaint(value: unknown, path: string, diags: Diags, allowGradient: boolean): void {
  if (!isRecord(value)) {
    diags.add("INVALID_COLOR", path, "A paint must be an object.");
    return;
  }
  if (value.type === "solid") {
    readColor(value, path, diags);
    return;
  }
  if (!allowGradient || (value.type !== "linear" && value.type !== "radial")) {
    diags.add("INVALID_ENUM", `${path}.type`, 'Paint type must be "solid", or a 0.2 gradient.');
    return;
  }
  if (value.type === "linear") {
    rejectUnknown(value, ["type", "x1", "y1", "x2", "y2", "stops"], path, diags);
    readFinite(value.x1, `${path}.x1`, diags);
    readFinite(value.y1, `${path}.y1`, diags);
    readFinite(value.x2, `${path}.x2`, diags);
    readFinite(value.y2, `${path}.y2`, diags);
  } else {
    rejectUnknown(value, ["type", "cx", "cy", "r", "stops"], path, diags);
    readFinite(value.cx, `${path}.cx`, diags);
    readFinite(value.cy, `${path}.cy`, diags);
    const radius = readFinite(value.r, `${path}.r`, diags);
    if (radius !== undefined && radius < 0) diags.add("INVALID_GEOMETRY", `${path}.r`, "A radial radius cannot be negative.");
  }
  if (!Array.isArray(value.stops) || value.stops.length < 2) {
    diags.add("INVALID_COLOR", `${path}.stops`, "A gradient needs at least two stops.");
    return;
  }
  value.stops.forEach((stop, index) => {
    const stopPath = `${path}.stops[${index}]`;
    if (!isRecord(stop)) {
      diags.add("INVALID_COLOR", stopPath, "A gradient stop must be an object.");
      return;
    }
    rejectUnknown(stop, ["offset", "color"], stopPath, diags);
    const offset = readFinite(stop.offset, `${stopPath}.offset`, diags);
    if (offset !== undefined && (offset < 0 || offset > 1)) {
      diags.add("INVALID_COLOR", `${stopPath}.offset`, "Gradient offsets must lie in [0, 1].");
    }
    readColor(stop.color, `${stopPath}.color`, diags);
  });
}

function readCompositing(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "compositing must be an object.");
    return;
  }
  rejectUnknown(value, ["isolated", "blend", "effect"], path, diags);
  if (typeof value.isolated !== "boolean") diags.add("INVALID_TYPE", `${path}.isolated`, "isolated must be a boolean.");
  if (value.blend !== undefined && value.blend !== "source-over" && value.blend !== "multiply" && value.blend !== "screen" && value.blend !== "overlay") {
    diags.add("INVALID_ENUM", `${path}.blend`, "Unknown blend mode.");
  }
  if (value.effect === undefined) return;
  if (!isRecord(value.effect)) {
    diags.add("INVALID_TYPE", `${path}.effect`, "effect must be an object.");
    return;
  }
  if (value.effect.type === "blur") {
    rejectUnknown(value.effect, ["type", "radius"], `${path}.effect`, diags);
    const radius = readFinite(value.effect.radius, `${path}.effect.radius`, diags);
    if (radius !== undefined && radius < 0) diags.add("INVALID_GEOMETRY", `${path}.effect.radius`, "Blur radius cannot be negative.");
    return;
  }
  if (value.effect.type === "shadow") {
    rejectUnknown(value.effect, ["type", "dx", "dy", "blur", "color"], `${path}.effect`, diags);
    readFinite(value.effect.dx, `${path}.effect.dx`, diags);
    readFinite(value.effect.dy, `${path}.effect.dy`, diags);
    readFinite(value.effect.blur, `${path}.effect.blur`, diags);
    if (typeof value.effect.color !== "string") diags.add("INVALID_COLOR", `${path}.effect.color`, "Shadow colour is a CSS colour string.");
    return;
  }
  diags.add("INVALID_ENUM", `${path}.effect.type`, 'effect.type must be "blur" or "shadow".');
}

function readStroke(value: unknown, path: string, diags: Diags, allowGradient = false): Stroke | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_STROKE", path, "A stroke must be an object.");
    return undefined;
  }
  rejectUnknown(value, ["color", "width", "cap", "join", "miterLimit"], path, diags);
  readPaint(value.color, `${path}.color`, diags, allowGradient);
  const width = readFinite(value.width, `${path}.width`, diags);
  if (width !== undefined && width <= 0) diags.add("INVALID_STROKE", `${path}.width`, "Stroke width must be positive.");
  if (value.cap !== "butt" && value.cap !== "round" && value.cap !== "square") {
    diags.add("INVALID_ENUM", `${path}.cap`, 'Stroke cap must be "butt", "round", or "square".');
  }
  if (value.join !== "miter" && value.join !== "round" && value.join !== "bevel") {
    diags.add("INVALID_ENUM", `${path}.join`, 'Stroke join must be "miter", "round", or "bevel".');
  }
  const miter = readFinite(value.miterLimit, `${path}.miterLimit`, diags);
  if (miter !== undefined && miter < 1) diags.add("INVALID_STROKE", `${path}.miterLimit`, "miterLimit must be >= 1.");
  return value as unknown as Stroke;
}

function readVec(value: unknown, path: string, diags: Diags): Vec2 | undefined {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Expected a vector { x, y }.");
    return undefined;
  }
  rejectUnknown(value, ["x", "y"], path, diags);
  const x = readFinite(value.x, `${path}.x`, diags);
  const y = readFinite(value.y, `${path}.y`, diags);
  if (x === undefined || y === undefined) return undefined;
  return { x, y };
}

function readExpr(value: unknown, path: string, diags: Diags): Expr | undefined {
  if (!isRecord(value) || typeof value.type !== "string") {
    diags.add("INVALID_EXPRESSION", path, "Expression AST must be an object.");
    return undefined;
  }
  if (value.type === "number") {
    rejectUnknown(value, ["type", "value"], path, diags);
    const number = readFinite(value.value, `${path}.value`, diags);
    if (number === undefined) return undefined;
    return { type: "number", value: number };
  }
  if (value.type === "ref") {
    rejectUnknown(value, ["type", "name"], path, diags);
    if (value.name !== "PI" && value.name !== "t" && value.name !== "local_t" && value.name !== "progress") {
      diags.add("INVALID_EXPRESSION", `${path}.name`, "Unknown expression reference.");
      return undefined;
    }
    return { type: "ref", name: value.name };
  }
  if (value.type === "unary") {
    rejectUnknown(value, ["type", "op", "argument"], path, diags);
    if (value.op !== "+" && value.op !== "-") {
      diags.add("INVALID_EXPRESSION", `${path}.op`, "Unary operator must be + or -.");
      return undefined;
    }
    const argument = readExpr(value.argument, `${path}.argument`, diags);
    if (!argument) return undefined;
    return { type: "unary", op: value.op, argument };
  }
  if (value.type === "binary") {
    rejectUnknown(value, ["type", "op", "left", "right"], path, diags);
    if (value.op !== "+" && value.op !== "-" && value.op !== "*" && value.op !== "/" && value.op !== "%") {
      diags.add("INVALID_EXPRESSION", `${path}.op`, "Unknown binary operator.");
      return undefined;
    }
    const left = readExpr(value.left, `${path}.left`, diags);
    const right = readExpr(value.right, `${path}.right`, diags);
    if (!left || !right) return undefined;
    return { type: "binary", op: value.op, left, right };
  }
  if (value.type === "call") {
    rejectUnknown(value, ["type", "callee", "args"], path, diags);
    const callee = value.callee;
    const arity: Record<string, number> = {
      sin: 1, cos: 1, abs: 1, sqrt: 1, min: 2, max: 2, pow: 2, clamp: 3, lerp: 3,
    };
    if (typeof callee !== "string" || arity[callee] === undefined) {
      diags.add("INVALID_EXPRESSION", `${path}.callee`, "Unknown call.");
      return undefined;
    }
    if (!Array.isArray(value.args)) {
      diags.add("INVALID_EXPRESSION", `${path}.args`, "Call arguments must be an array.");
      return undefined;
    }
    const args: Expr[] = [];
    value.args.forEach((arg, index) => {
      const parsed = readExpr(arg, `${path}.args[${index}]`, diags);
      if (parsed) args.push(parsed);
    });
    if (args.length !== value.args.length || args.length !== arity[callee]) {
      diags.add("INVALID_EXPRESSION", path, "Wrong number of call arguments.");
      return undefined;
    }
    return { type: "call", callee: callee as "sin", args };
  }
  diags.add("INVALID_EXPRESSION", `${path}.type`, "Unknown expression node.");
  return undefined;
}

function readDrawItem(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A draw item must be an object.");
    return;
  }
  rejectUnknown(value, ["nodeId", "geometry", "appearance", "logicalMatrix", "opacity"], path, diags);
  if (typeof value.nodeId !== "string" || value.nodeId.length === 0) {
    diags.add("INVALID_ID", `${path}.nodeId`, "A draw item needs a node id.");
  }
  readOpacity(value.opacity, `${path}.opacity`, diags);
  if (!Array.isArray(value.logicalMatrix) || value.logicalMatrix.length !== 9) {
    diags.add("INVALID_TYPE", `${path}.logicalMatrix`, "logicalMatrix is a column-major 3×3 matrix of 9 numbers.");
  } else {
    value.logicalMatrix.forEach((entry, index) => {
      if (typeof entry !== "number" || !Number.isFinite(entry)) {
        diags.add("NON_FINITE", `${path}.logicalMatrix[${index}]`, "Matrix components must be finite.");
      }
    });
    if (value.logicalMatrix[2] !== 0 || value.logicalMatrix[5] !== 0 || value.logicalMatrix[8] !== 1) {
      diags.add(
        "INVALID_TYPE",
        `${path}.logicalMatrix`,
        "V1 matrices are affine: components [2] and [5] are 0 and [8] is 1.",
      );
    }
  }
  if (!isRecord(value.appearance)) {
    diags.add("INVALID_TYPE", `${path}.appearance`, "appearance must be an object.");
  } else {
    rejectUnknown(value.appearance, ["fill", "stroke"], `${path}.appearance`, diags);
    if (value.appearance.fill !== undefined) readPaint(value.appearance.fill, `${path}.appearance.fill`, diags, true);
    if (value.appearance.stroke !== undefined) readStroke(value.appearance.stroke, `${path}.appearance.stroke`, diags);
  }
  readResolvedGeometry(value.geometry, `${path}.geometry`, diags);
}

function readResolvedGeometry(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value) || typeof value.kind !== "string") {
    diags.add("INVALID_TYPE", path, "geometry must declare a kind.");
    return;
  }
  if (value.kind === "rectangle") {
    rejectUnknown(value, ["kind", "size", "cornerRadius"], path, diags);
    const size = readVec(value.size, `${path}.size`, diags);
    if (size && (size.x <= 0 || size.y <= 0)) diags.add("INVALID_GEOMETRY", `${path}.size`, "Size must be positive.");
    if (value.cornerRadius !== undefined) {
      const radius = readFinite(value.cornerRadius, `${path}.cornerRadius`, diags);
      if (radius !== undefined && radius < 0) diags.add("INVALID_GEOMETRY", `${path}.cornerRadius`, "Corner radius cannot be negative.");
    }
    return;
  }
  if (value.kind === "ellipse") {
    rejectUnknown(value, ["kind", "size"], path, diags);
    const size = readVec(value.size, `${path}.size`, diags);
    if (size && (size.x <= 0 || size.y <= 0)) diags.add("INVALID_GEOMETRY", `${path}.size`, "Size must be positive.");
    return;
  }
  if (value.kind === "image") {
    rejectUnknown(value, ["kind", "resourceId", "href", "size"], path, diags);
    const size = readVec(value.size, `${path}.size`, diags);
    if (size && (size.x <= 0 || size.y <= 0)) diags.add("INVALID_GEOMETRY", `${path}.size`, "Size must be positive.");
    return;
  }
  if (value.kind === "circle") {
    rejectUnknown(value, ["kind", "radius"], path, diags);
    const radius = readFinite(value.radius, `${path}.radius`, diags);
    if (radius !== undefined && radius <= 0) diags.add("INVALID_GEOMETRY", `${path}.radius`, "Radius must be positive.");
    return;
  }
  if (value.kind === "line") {
    rejectUnknown(value, ["kind", "from", "to"], path, diags);
    readVec(value.from, `${path}.from`, diags);
    readVec(value.to, `${path}.to`, diags);
    return;
  }
  if (value.kind === "polygon") {
    rejectUnknown(value, ["kind", "points"], path, diags);
    if (!Array.isArray(value.points) || value.points.length < 3) {
      diags.add("INVALID_GEOMETRY", `${path}.points`, "A polygon needs at least three points.");
    }
    return;
  }
  if (value.kind === "path") {
    rejectUnknown(value, ["kind", "commands", "fillRule"], path, diags);
    readPath(value.commands, `${path}.commands`, diags);
    return;
  }
  if (value.kind === "text") {
    rejectUnknown(value, ["kind", "content", "font", "align", "baseline"], path, diags);
    readFont(value.font, `${path}.font`, diags);
    return;
  }
  diags.add("INVALID_ENUM", `${path}.kind`, "Unknown resolved geometry.");
}

function readOperation(value: unknown, path: string, limits: ResourceLimits, diags: Diags): void {
  if (!isRecord(value) || typeof value.op !== "string") {
    diags.add("INVALID_TYPE", path, "An operation needs an op name.");
    return;
  }
  if (!OPS.has(value.op)) {
    diags.add("INVALID_ENUM", `${path}.op`, `Unknown runtime operation ${value.op}.`);
    return;
  }
  if (value.op === "COMPLETE_PROGRAM") {
    rejectUnknown(value, ["op"], path, diags);
    return;
  }
  if (value.op === "SEAL_TIMELINE") {
    rejectUnknown(value, ["op", "horizonMs"], path, diags);
    const horizon = readFinite(value.horizonMs, `${path}.horizonMs`, diags);
    if (horizon !== undefined && horizon < 0) {
      diags.add("INVALID_TIMING", `${path}.horizonMs`, "A seal horizon cannot be negative.");
    }
    return;
  }
  if (value.op === "ADD_NODES") {
    rejectUnknown(value, ["op", "nodes"], path, diags);
    readNodes(value.nodes, diags, limits, false, "nodes", false);
    return;
  }
  if (value.op === "ADD_TRACKS" || value.op === "ADD_STEPS" || value.op === "CREATE_SCENE") {
    if (value.op === "CREATE_SCENE" && !isRecord(value.scene)) {
      diags.add("INVALID_TYPE", `${path}.scene`, "CREATE_SCENE requires a scene header.");
    }
    if ((value.op === "ADD_TRACKS" || value.op === "ADD_STEPS") && !Array.isArray(value[value.op === "ADD_TRACKS" ? "tracks" : "steps"])) {
      diags.add("INVALID_TYPE", path, `${value.op} requires an array payload.`);
    }
  }
}

function readSpan(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
    diags.add("INVALID_TYPE", path, "sourceSpan needs start and end points.");
    return;
  }
  for (const end of ["start", "end"] as const) {
    const point = value[end];
    if (!isRecord(point)) continue;
    for (const key of ["offset", "line", "column"] as const) {
      const component = point[key];
      if (typeof component !== "number" || !Number.isInteger(component) || component < 0) {
        diags.add("INVALID_TYPE", `${path}.${end}.${key}`, "Source positions must be integers >= 0.");
      }
    }
    if (typeof point.line === "number" && point.line < 1) {
      diags.add("INVALID_TYPE", `${path}.${end}.line`, "Lines are 1-based.");
    }
    if (typeof point.column === "number" && point.column < 1) {
      diags.add("INVALID_TYPE", `${path}.${end}.column`, "Columns are 1-based.");
    }
  }
}

function readSceneId(value: unknown, path: string, diags: Diags): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 200 || /[\u0000-\u001f]/.test(value)) {
    diags.add("INVALID_TYPE", path, "sceneId must be a short string without control characters.");
  }
}

function readIdent(value: unknown, path: string, diags: Diags): string | undefined {
  if (typeof value !== "string" || !IDENT.test(value)) {
    diags.add("INVALID_ID", path, "Expected an identifier without dots.");
    return undefined;
  }
  return value;
}

function readRevision(value: unknown, path: string, diags: Diags): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    diags.add("INVALID_TYPE", path, "Expected an integer >= 0.");
  }
}

function readFinite(value: unknown, path: string, diags: Diags): number | undefined {
  if (typeof value !== "number") {
    diags.add("INVALID_TYPE", path, "Expected a finite number.");
    return undefined;
  }
  if (!Number.isFinite(value)) {
    diags.add("NON_FINITE", path, "Expected a finite number.");
    return undefined;
  }
  return value;
}

function sampleOk(type: string, channel: string, value: unknown): boolean {
  if (type !== "number" && type !== "vec2" && type !== "angle" && type !== "boolean") return false;
  return isValidSample(type, channel, value);
}

function readCompositions(
  value: unknown,
  diags: Diags,
  limits: ResourceLimits,
  nodeIds: Set<string>,
): { id: string; nodes: NodeDefinition[] }[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "compositions", "compositions must be an array.");
    return [];
  }
  const compositions: { id: string; nodes: NodeDefinition[] }[] = [];
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `compositions[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "A composition must be an object.");
      return;
    }
    rejectUnknown(entry, ["id", "nodes"], path, diags);
    const id = readIdent(entry.id, `${path}.id`, diags);
    if (id && (ids.has(id) || nodeIds.has(id))) {
      diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate composition id ${id}.`);
    }
    if (id) ids.add(id);
    const nodes = readNodes(entry.nodes, diags, limits, true, `${path}.nodes`, true) ?? [];
    if (id) compositions.push({ id, nodes });
  });
  return compositions;
}

function readTimingScopes(value: unknown, diags: Diags): TimingScope[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "timingScopes", "timingScopes must be an array.");
    return [];
  }
  const scopes: TimingScope[] = [];
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `timingScopes[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "A timing scope must be an object.");
      return;
    }
    rejectUnknown(entry, ["id", "parentId", "offsetMs", "stretch"], path, diags);
    const id = readIdent(entry.id, `${path}.id`, diags);
    if (id && ids.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate timing scope ${id}.`);
    if (id) ids.add(id);
    if (entry.parentId !== null && typeof entry.parentId !== "string") {
      diags.add("INVALID_TYPE", `${path}.parentId`, "parentId must be a string or null.");
    }
    const offset = readFinite(entry.offsetMs, `${path}.offsetMs`, diags);
    const stretch = readFinite(entry.stretch, `${path}.stretch`, diags);
    if (stretch === 0) diags.add("INVALID_TIMING", `${path}.stretch`, "Timing stretch cannot be zero.");
    if (!id || offset === undefined || stretch === undefined || stretch === 0) return;
    scopes.push({
      id,
      parentId: typeof entry.parentId === "string" ? entry.parentId : null,
      offsetMs: offset,
      stretch,
    });
  });
  const byId = new Map(scopes.map((scope) => [scope.id, scope]));
  for (const scope of scopes) {
    if (scope.parentId && !byId.has(scope.parentId)) {
      diags.add("INVALID_PARENT", `timingScopes.${scope.id}`, `Timing parent ${scope.parentId} does not exist.`);
    }
  }
  for (const scope of scopes) {
    if (scopeChainBroken(scope.id, byId)) {
      diags.add("CYCLE", `timingScopes.${scope.id}`, `Timing scope ${scope.id} is part of a cycle.`);
      break;
    }
  }
  return scopes;
}

function scopeChainBroken(start: string, byId: Map<string, TimingScope>): boolean {
  const seen = new Set<string>();
  let current: string | null = start;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return false;
}

function readInstances(
  value: unknown,
  nodes: NodeDefinition[] | undefined,
  compositions: { id: string; nodes: NodeDefinition[] }[],
  scopes: TimingScope[],
  timeline: unknown,
  diags: Diags,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "instances", "instances must be an array.");
    return;
  }
  const nodeIds = new Set((nodes ?? []).map((node) => node.id));
  const definitions = new Set(compositions.map((composition) => composition.id));
  const scopeIds = new Set(scopes.map((scope) => scope.id));
  const duration = isRecord(timeline) && typeof timeline.durationMs === "number" ? timeline.durationMs : undefined;
  const instances: { id: string; parentId: string | null; transformParentId: string | null }[] = [];
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `instances[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "An instance must be an object.");
      return;
    }
    rejectUnknown(
      entry,
      ["id", "definitionId", "parentId", "transformParentId", "transform", "opacity", "visible", "activation", "timingScopeId"],
      path,
      diags,
    );
    const id = readIdent(entry.id, `${path}.id`, diags);
    if (id && (ids.has(id) || nodeIds.has(id))) diags.add("DUPLICATE_ID", `${path}.id`, `Instance id ${id} collides with another id.`);
    if (id) ids.add(id);
    if (typeof entry.definitionId !== "string" || !definitions.has(entry.definitionId)) {
      diags.add("UNKNOWN_TARGET", `${path}.definitionId`, "Instance definition does not exist.");
    }
    const parentId = readOptionalId(entry.parentId, `${path}.parentId`, diags);
    const transformParentId = readOptionalId(entry.transformParentId, `${path}.transformParentId`, diags);
    readTransform(entry.transform, `${path}.transform`, diags);
    readOpacity(entry.opacity, `${path}.opacity`, diags);
    if (typeof entry.visible !== "boolean") diags.add("INVALID_TYPE", `${path}.visible`, "visible must be a boolean.");
    if (!isRecord(entry.activation)) {
      diags.add("INVALID_TYPE", `${path}.activation`, "activation must be an object.");
    } else {
      rejectUnknown(entry.activation, ["startMs", "endMs"], `${path}.activation`, diags);
      const start = readFinite(entry.activation.startMs, `${path}.activation.startMs`, diags);
      const end = readFinite(entry.activation.endMs, `${path}.activation.endMs`, diags);
      if (start !== undefined && end !== undefined && end <= start) {
        diags.add("INVALID_TIMING", `${path}.activation`, "Instance activation must have a positive duration.");
      }
      if (duration !== undefined && start !== undefined && end !== undefined && (start < 0 || end > duration + 1e-6)) {
        diags.add("INVALID_TIMING", `${path}.activation`, "Instance activation must lie inside the scene duration.");
      }
    }
    if (typeof entry.timingScopeId !== "string" || !scopeIds.has(entry.timingScopeId)) {
      diags.add("UNKNOWN_TARGET", `${path}.timingScopeId`, "Instance timing scope does not exist.");
    }
    if (id) instances.push({ id, parentId: parentId ?? null, transformParentId: transformParentId ?? null });
  });
  const known = new Set([...nodeIds, ...instances.map((item) => item.id)]);
  for (const item of instances) {
    if (item.parentId && !known.has(item.parentId)) {
      diags.add("INVALID_PARENT", `instances.${item.id}`, `Instance parent ${item.parentId} does not exist.`);
    }
    if (item.transformParentId && !known.has(item.transformParentId)) {
      diags.add("INVALID_PARENT", `instances.${item.id}`, `Transform parent ${item.transformParentId} does not exist.`);
    }
  }
  const parents = new Map(instances.map((item) => [item.id, item.parentId]));
  const transforms = new Map(instances.map((item) => [item.id, item.transformParentId]));
  for (const item of instances) {
    if (linkCycle(item.id, parents)) {
      diags.add("CYCLE", `instances.${item.id}`, `Instance ${item.id} is part of a containment cycle.`);
      break;
    }
  }
  for (const item of instances) {
    if (linkCycle(item.id, transforms)) {
      diags.add("CYCLE", `instances.${item.id}`, `Instance ${item.id} is part of a transform-parent cycle.`);
      break;
    }
  }
}

function readOptionalId(value: unknown, path: string, diags: Diags): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") {
    diags.add("INVALID_TYPE", path, "Expected a string or null.");
    return undefined;
  }
  return value;
}

function linkCycle(start: string, nextOf: Map<string, string | null>): boolean {
  const seen = new Set<string>();
  let current: string | null = start;
  while (current) {
    if (!nextOf.has(current)) return false;
    if (seen.has(current)) return true;
    seen.add(current);
    current = nextOf.get(current) ?? null;
  }
  return false;
}

function readCapabilities(value: unknown, diags: Diags): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "requiredCapabilities", "requiredCapabilities must be an array.");
    return;
  }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || !isKnownCapability(entry)) {
      diags.add("INVALID_ENUM", `requiredCapabilities[${index}]`, "Unknown capability.");
      return;
    }
    if (seen.has(entry)) diags.add("INVALID_ENUM", `requiredCapabilities[${index}]`, `Duplicate capability ${entry}.`);
    seen.add(entry);
  });
}

function readOperators(
  value: unknown,
  nodes: NodeDefinition[] | undefined,
  compositions: { id: string; nodes: NodeDefinition[] }[],
  diags: Diags,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "geometryOperators", "geometryOperators must be an array.");
    return;
  }
  const ids = new Set((nodes ?? []).map((node) => node.id));
  for (const composition of compositions) for (const node of composition.nodes) ids.add(node.id);
  value.forEach((entry, index) => {
    const path = `geometryOperators[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "A geometry operator list must be an object.");
      return;
    }
    rejectUnknown(entry, ["nodeId", "operators"], path, diags);
    if (typeof entry.nodeId !== "string" || !ids.has(entry.nodeId)) {
      diags.add("UNKNOWN_TARGET", `${path}.nodeId`, "Geometry operators name a node that does not exist.");
    }
    if (!Array.isArray(entry.operators) || entry.operators.length === 0) {
      diags.add("MISSING_REQUIRED", `${path}.operators`, "A geometry operator list needs at least one operator.");
      return;
    }
    entry.operators.forEach((operator, operatorIndex) => readOperator(operator, `${path}.operators[${operatorIndex}]`, diags));
  });
}

function readOperator(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A geometry operator must be an object.");
    return;
  }
  if (value.op === "trim") {
    rejectUnknown(value, ["op", "start", "end", "offset"], path, diags);
    const start = readFinite(value.start, `${path}.start`, diags);
    const end = readFinite(value.end, `${path}.end`, diags);
    readFinite(value.offset, `${path}.offset`, diags);
    if ((start !== undefined && (start < 0 || start > 1)) || (end !== undefined && (end < 0 || end > 1))) {
      diags.add("INVALID_GEOMETRY", path, "Trim start and end must lie in [0, 1].");
    }
    return;
  }
  if (value.op === "round") {
    rejectUnknown(value, ["op", "radius"], path, diags);
    const radius = readFinite(value.radius, `${path}.radius`, diags);
    if (radius !== undefined && radius < 0) diags.add("INVALID_GEOMETRY", `${path}.radius`, "Round radius cannot be negative.");
    return;
  }
  diags.add("INVALID_ENUM", `${path}.op`, 'Geometry operator must be "trim" or "round".');
}

function readCompositionOrder(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "composition must be an object.");
    return;
  }
  rejectUnknown(value, ["order", "mode"], path, diags);
  if (typeof value.order !== "number" || !Number.isInteger(value.order)) {
    diags.add("INVALID_TYPE", `${path}.order`, "composition.order must be an integer.");
  }
  if (value.mode !== "replace") diags.add("INVALID_ENUM", `${path}.mode`, 'composition.mode must be "replace".');
}

function rootSpan(
  scopes: TimingScope[],
  scopeId: string,
  start: number,
  length: number,
): { start: number; end: number } | undefined {
  const rootStart = rootTimeMs(scopes, scopeId, start);
  const rootEnd = rootTimeMs(scopes, scopeId, start + length);
  if (rootStart === undefined || rootEnd === undefined) return undefined;
  return { start: Math.min(rootStart, rootEnd), end: Math.max(rootStart, rootEnd) };
}

function readRenderTree(value: unknown, path: string, diags: Diags, seen: Set<object>): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A render tree node must be an object.");
    return;
  }
  if (seen.has(value)) {
    diags.add("CYCLE", path, "A render tree cannot contain a cycle.");
    return;
  }
  seen.add(value);
  if (value.kind === "leaf") {
    rejectUnknown(value, ["kind", "item"], path, diags);
    readDrawItem(value.item, `${path}.item`, diags);
    return;
  }
  if (value.kind === "scope") {
    rejectUnknown(value, ["kind", "id", "isolated", "opacity", "blend", "effect", "children"], path, diags);
    if (value.blend !== undefined && value.blend !== "source-over" && value.blend !== "multiply" && value.blend !== "screen" && value.blend !== "overlay") {
      diags.add("INVALID_ENUM", `${path}.blend`, "Unknown blend mode.");
    }
    if (value.effect !== undefined) readCompositing({ isolated: true, effect: value.effect }, `${path}.effect`, diags);
    if (typeof value.id !== "string" || value.id.length === 0) diags.add("INVALID_ID", `${path}.id`, "A render scope needs an id.");
    if (typeof value.isolated !== "boolean") diags.add("INVALID_TYPE", `${path}.isolated`, "isolated must be a boolean.");
    readOpacity(value.opacity, `${path}.opacity`, diags);
    if (!Array.isArray(value.children)) {
      diags.add("INVALID_TYPE", `${path}.children`, "A render scope needs children.");
      return;
    }
    value.children.forEach((child, index) => readRenderTree(child, `${path}.children[${index}]`, diags, seen));
    return;
  }
  diags.add("INVALID_ENUM", `${path}.kind`, 'A render tree node is "scope" or "leaf".');
}

function isEasing(value: unknown, diags: Diags, path: string): boolean {
  if (value === "linear" || value === "easeIn" || value === "easeOut" || value === "easeInOut") return true;
  if (!isRecord(value) || (value.type !== "hold" && value.type !== "cubic")) return false;
  if (value.type === "hold") {
    rejectUnknown(value, ["type"], path, diags);
    return true;
  }
  rejectUnknown(value, ["type", "x1", "y1", "x2", "y2"], path, diags);
  const cubic = { type: "cubic" as const, x1: Number(value.x1), y1: Number(value.y1), x2: Number(value.x2), y2: Number(value.y2) };
  if (!cubicControlsMonotonic(cubic)) {
    diags.add("INVALID_KEYFRAMES", path, "Cubic easing x controls must lie in [0, 1].");
  }
  return true;
}

function targetLabel(target: TrackDefinition["target"]): string {
  return target.kind === "node" ? `${target.nodeId}.${target.channel}` : `camera(${target.cameraId}).${target.channel}`;
}

function rejectUnknown(value: Record<string, unknown>, allowed: readonly string[], path: string, diags: Diags): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      diags.add("UNSUPPORTED_PROPERTY", path ? `${path}.${key}` : key, `Property ${key} is not part of V1.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
