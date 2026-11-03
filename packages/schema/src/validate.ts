import {
  diagnostic,
  type Diagnostic,
  type DiagnosticCategory,
  type DiagnosticCode,
} from "./diagnostics";
import { isKnownCapability } from "./capabilities";
import { cubicControlsMonotonic } from "./easing";
import { expressionComplexity, exprsEqual, parseExpression } from "./expr";
import { indexNodes, nodeDepth } from "./graph";
import { resolveLimits, type ResourceLimits } from "./limits";

/**
 * Identity-keyed reuse of immutable path/keyframe payload walks (E003).
 * Nested geometry and keyframe arrays are shared by reference across assemble/
 * compile candidates and must not be mutated once accepted. Contextual
 * reference, writer, timing, seal and limit checks always re-run.
 */
const validatedPathArrays = new WeakMap<object, true>();
const validatedKeyframeArrays = new WeakMap<object, true>();
let immutableFactHits = 0;
let immutableFactMisses = 0;

/** Test/telemetry counters for immutable validation-fact reuse. */
export function immutableValidationFactStats(): { hits: number; misses: number } {
  return { hits: immutableFactHits, misses: immutableFactMisses };
}

/** Reset reuse counters (tests). WeakMaps keep living object entries. */
export function resetImmutableValidationFactStats(): void {
  immutableFactHits = 0;
  immutableFactMisses = 0;
}
import { channelSpec, isValidSample, scalarWriters } from "./registry";
import { pathsShareTopology } from "./spatial";
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
  "commands",
  "trim.start",
  "trim.end",
  "trim.offset",
  "fill.r",
  "fill.g",
  "fill.b",
  "fill.a",
  "stroke.r",
  "stroke.g",
  "stroke.b",
  "stroke.a",
  "stroke.width",
]);
const CAMERA_CHANNELS = new Set(["position", "position.x", "position.y", "zoom", "rotation"]);
const OPS = new Set([
  "CREATE_SCENE",
  "ADD_NODES",
  "ADD_TRACKS",
  "ADD_STEPS",
  "ADD_AUDIO_CUES",
  "SEAL_TIMELINE",
  "COMPLETE_PROGRAM",
  "APPLY_ENTITY_PATCH",
]);
const ENTITY_PATCH_OPS = new Set([
  "UPSERT_ENTITY",
  "REMOVE_ENTITY",
  "REPARENT",
  "GRANT_OWNERSHIP",
  "REVOKE_OWNERSHIP",
  "ACTIVATE_BEHAVIOUR",
  "CANCEL_BEHAVIOUR",
  "REGISTER_GEOMETRY",
  "BIND_GEOMETRY",
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
  if (v02) sceneKeys.push("compositions", "instances", "timingScopes", "requiredCapabilities", "geometryOperators", "interactions", "audioCues", "spatialLayers", "physics");
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
  if (v02) readInteractions(input.interactions, nodes, input.timeline, input.requiredCapabilities, diags);
  if (v02) readAudio(input.audioCues, resources, input.timeline, input.requiredCapabilities, diags);
  if (v02) readSpatialLayers(input.spatialLayers, nodeIds, input.requiredCapabilities, diags);
  if (v02) readPhysics(input.physics, nodeIds, input.timeline, input.interactions, input.requiredCapabilities, diags);
  if (v02 && nodes) readClipTargets(nodes, compositions.flatMap((c) => c.nodes), input.requiredCapabilities, diags);
  const compositionNodes = compositions.flatMap((composition) => composition.nodes);
  const nodeCount = (nodes?.length ?? 0) + compositionNodes.length;
  if (nodeCount > limits.maxNodes) {
    diags.add("RESOURCE_LIMIT", "nodes", `Node count ${nodeCount} exceeds ${limits.maxNodes}.`);
  }
  if (nodes) {
    let geometry = 0;
    let depth = 0;
    // Topology depth/index stays call-local. Immutable path/keyframe payloads may
    // reuse prior successful walks via identity WeakMaps (E003); graph/writer/
    // timing/seal/limit checks still run every call.
    for (const list of [nodes, ...compositions.map((composition) => composition.nodes)]) {
      const index = indexNodes(list);
      for (const node of list) {
        if (typeof node.id === "string") depth = Math.max(depth, nodeDepth(list, node.id, index));
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

/** Validate delta shape. References and aggregate limits require the assembled scene. */
export function validateDelta(
  input: unknown,
  overrides?: Partial<ResourceLimits>,
  wireVersion: SceneIR["irVersion"] = IR_VERSION,
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
    let version = wireVersion;
    input.operations.forEach((operation, index) => {
      if (isRecord(operation) && operation.op === "CREATE_SCENE" && isRecord(operation.scene)
        && (operation.scene.irVersion === IR_VERSION || operation.scene.irVersion === IR_VERSION_02)) {
        version = operation.scene.irVersion;
      }
      readOperation(operation, `operations[${index}]`, limits, diags, version === IR_VERSION_02);
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
  if (validatedKeyframeArrays.has(value)) {
    immutableFactHits += 1;
    return;
  }
  immutableFactMisses += 1;
  const before = diags.items.length;
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
      if (type === "path" || (channel !== "transform.position" && channel !== "position")) {
        diags.add("UNSUPPORTED_PROPERTY", `${framePath}.spatial`, "Spatial tangents belong on a vec2 position channel.");
      }
      if (!isRecord(frame.spatial)) diags.add("INVALID_TYPE", `${framePath}.spatial`, "spatial must be an object.");
      else {
        rejectUnknown(frame.spatial, ["out", "in"], `${framePath}.spatial`, diags);
        readSpatialTangent(frame.spatial.out, `${framePath}.spatial.out`, diags);
        readSpatialTangent(frame.spatial.in, `${framePath}.spatial.in`, diags);
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
    } else if (type === "path" && Array.isArray(frame.value)) {
      readPath(frame.value, `${framePath}.value`, diags);
    }
  });
  if (!sawStart || !sawEnd) {
    diags.add("INVALID_KEYFRAMES", path, "Keyframe offsets must include both 0 and 1.");
  }
  if (type === "path") {
    const paths = value
      .map((frame) => (isRecord(frame) && Array.isArray(frame.value) ? frame.value : undefined))
      .filter((entry): entry is unknown[] => Array.isArray(entry));
    const first = paths[0];
    if (first) {
      for (let index = 1; index < paths.length; index += 1) {
        const next = paths[index];
        if (!next || !pathsShareTopology(first as never, next as never)) {
          diags.add(
            "INVALID_KEYFRAMES",
            `${path}[${index}].value`,
            "Path morph keyframes must share the same command topology.",
          );
        }
      }
    }
  }
  if (diags.items.length === before) validatedKeyframeArrays.set(value, true);
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
    const scalars = scalarWriters(track.target);
    const keys =
      scalars.length > 0
        ? scalars
        : track.target.kind === "node" && track.target.channel === "commands"
          ? [`node:${track.target.nodeId}:commands`]
          : [];
    for (const scalar of keys) {
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
    } else {
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
    }
    if (requireParents && node.transformParentId) {
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
  if (validatedPathArrays.has(value)) {
    immutableFactHits += 1;
    return;
  }
  immutableFactMisses += 1;
  const before = diags.items.length;
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
  if (diags.items.length === before) validatedPathArrays.set(value, true);
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

function readResources(value: unknown, diags: Diags, v02 = false): ResourceFacts[] {
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "resources", "resources must be an array.");
    return [];
  }
  const resources: ResourceFacts[] = [];
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
    if (entry.kind === "audio") {
      if (!v02) diags.add("UNSUPPORTED_PROPERTY", path, "Audio resources require Scene IR 0.2.");
      rejectUnknown(entry, ["id", "kind", "href", "durationMs", "readiness", "source"], path, diags);
      const source = entry.source;
      const generative = isRecord(source) && source.type === "generative";
      if (generative) {
        readGenerativeAudioSource(source, `${path}.source`, diags);
        if (entry.href !== undefined && (typeof entry.href !== "string" || entry.href.length === 0)) {
          diags.add("INVALID_TYPE", `${path}.href`, "A materialised generative href must be a non-empty string.");
        }
      } else {
        if (isRecord(source) && source.type === "href") {
          rejectUnknown(source, ["type", "href"], `${path}.source`, diags);
          if (typeof source.href !== "string" || source.href.length === 0) {
            diags.add("MISSING_REQUIRED", `${path}.source.href`, "An href audio source needs a non-empty href.");
          }
        } else if (source !== undefined) {
          diags.add("INVALID_ENUM", `${path}.source.type`, 'Audio source type must be "href" or "generative".');
        }
        const href = typeof entry.href === "string" ? entry.href : isRecord(source) && typeof source.href === "string" ? source.href : "";
        if (href.length === 0) {
          diags.add("MISSING_REQUIRED", `${path}.href`, "An audio resource needs an href.");
        }
      }
      const duration = entry.durationMs === undefined ? undefined : readFinite(entry.durationMs, `${path}.durationMs`, diags);
      if (duration !== undefined && !(duration > 0)) {
        diags.add("INVALID_TIMING", `${path}.durationMs`, "An audio resource needs a positive decoded durationMs.");
      } else if (!generative && duration === undefined) {
        diags.add("MISSING_REQUIRED", `${path}.durationMs`, "An audio resource needs a positive decoded durationMs.");
      }
      // Ready generative resources still need a positive durationMs.
      if (generative && entry.readiness === "ready" && (duration === undefined || !(duration > 0))) {
        diags.add("INVALID_TIMING", `${path}.durationMs`, "A ready generative audio resource needs a positive durationMs.");
      }
      resources.push({
        id: id ?? "",
        kind: "audio",
        family: "",
        durationMs: duration !== undefined && duration > 0 ? duration : undefined,
        generative: generative || undefined,
      });
      return;
    }
    rejectUnknown(entry, v02 ? ["id", "kind", "family", "source", "readiness"] : ["id", "kind", "family", "source"], path, diags);
    if (entry.kind !== "font") diags.add("INVALID_ENUM", `${path}.kind`, 'A resource kind is "font" or, in 0.2, "image" or "audio".');
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

function checkFonts(nodes: NodeDefinition[], resources: ResourceFacts[], diags: Diags): void {
  const families = new Set(resources.filter((resource) => resource.kind === "font").map((resource) => resource.family));
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
  rejectUnknown(value, ["isolated", "blend", "effect", "clip"], path, diags);
  if (typeof value.isolated !== "boolean") diags.add("INVALID_TYPE", `${path}.isolated`, "isolated must be a boolean.");
  if (value.blend !== undefined && value.blend !== "source-over" && value.blend !== "multiply" && value.blend !== "screen" && value.blend !== "overlay") {
    diags.add("INVALID_ENUM", `${path}.blend`, "Unknown blend mode.");
  }
  if (value.clip !== undefined) {
    if (!isRecord(value.clip)) {
      diags.add("INVALID_TYPE", `${path}.clip`, "clip must be an object.");
    } else {
      rejectUnknown(value.clip, ["geometryId"], `${path}.clip`, diags);
      if (typeof value.clip.geometryId !== "string" || value.clip.geometryId.length === 0) {
        diags.add("INVALID_ID", `${path}.clip.geometryId`, "clip.geometryId must be a non-empty node id.");
      }
    }
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

const CLIP_GEOMETRY_KINDS = new Set(["rectangle", "circle", "ellipse", "polygon", "path"]);

/** compositing.mask (0.16.0): every clip.geometryId must name drawable outline geometry and require the capability. */
function readClipTargets(
  rootNodes: readonly { id?: unknown; kind?: unknown; compositing?: unknown }[],
  compositionNodes: readonly { id?: unknown; kind?: unknown; compositing?: unknown }[],
  required: unknown,
  diags: Diags,
): void {
  const caps = Array.isArray(required) ? required : [];
  const hasMask = caps.includes("compositing.mask");
  const byId = new Map<string, { kind?: unknown }>();
  for (const node of [...rootNodes, ...compositionNodes]) {
    if (typeof node.id === "string") byId.set(node.id, node);
  }
  let index = 0;
  for (const node of [...rootNodes, ...compositionNodes]) {
    const path = `nodes[${index}]`;
    index += 1;
    if (!isRecord(node) || node.kind !== "group" || !isRecord(node.compositing) || node.compositing.clip === undefined) continue;
    if (!hasMask) {
      diags.add("MISSING_REQUIRED", "requiredCapabilities", "Group clip requires compositing.mask in requiredCapabilities.");
    }
    const clip = node.compositing.clip;
    if (!isRecord(clip) || typeof clip.geometryId !== "string") continue;
    const target = byId.get(clip.geometryId);
    if (!target) {
      diags.add("UNKNOWN_TARGET", `${path}.compositing.clip.geometryId`, `Clip geometry ${clip.geometryId} does not exist.`);
      continue;
    }
    if (typeof target.kind !== "string" || !CLIP_GEOMETRY_KINDS.has(target.kind)) {
      diags.add(
        "INVALID_GEOMETRY",
        `${path}.compositing.clip.geometryId`,
        "Clip geometry must be a rectangle, circle, ellipse, polygon or path.",
      );
    }
  }
}

function readResolvedClip(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "clip must be an object.");
    return;
  }
  rejectUnknown(value, ["geometry", "logicalMatrix"], path, diags);
  if (!Array.isArray(value.logicalMatrix) || value.logicalMatrix.length !== 9) {
    diags.add("INVALID_TYPE", `${path}.logicalMatrix`, "logicalMatrix is a column-major 3×3 matrix of 9 numbers.");
  } else {
    value.logicalMatrix.forEach((entry, index) => {
      if (typeof entry !== "number" || !Number.isFinite(entry)) {
        diags.add("NON_FINITE", `${path}.logicalMatrix[${index}]`, "Matrix components must be finite.");
      }
    });
  }
  readResolvedGeometry(value.geometry, `${path}.geometry`, diags);
  if (isRecord(value.geometry) && typeof value.geometry.kind === "string" && !CLIP_GEOMETRY_KINDS.has(value.geometry.kind)) {
    diags.add("INVALID_GEOMETRY", `${path}.geometry`, "Clip geometry must be a rectangle, circle, ellipse, polygon or path.");
  }
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

/** Spatial tangents may carry optional Z for AE/lottie-web arc-length only. */
function readSpatialTangent(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Expected a spatial tangent { x, y, z? }.");
    return;
  }
  rejectUnknown(value, ["x", "y", "z"], path, diags);
  readFinite(value.x, `${path}.x`, diags);
  readFinite(value.y, `${path}.y`, diags);
  if (value.z !== undefined) readFinite(value.z, `${path}.z`, diags);
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

function readOperation(value: unknown, path: string, limits: ResourceLimits, diags: Diags, v02: boolean): void {
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
    readNodes(value.nodes, diags, limits, false, "nodes", v02);
    return;
  }
  if (value.op === "ADD_AUDIO_CUES") {
    rejectUnknown(value, ["op", "cues"], path, diags);
    if (!Array.isArray(value.cues)) diags.add("INVALID_TYPE", `${path}.cues`, "ADD_AUDIO_CUES requires a cues array.");
    return;
  }
  if (value.op === "APPLY_ENTITY_PATCH") {
    rejectUnknown(value, ["op", "patch"], path, diags);
    readEntityPatch(value.patch, `${path}.patch`, limits, diags, v02);
    return;
  }
  if (value.op === "ADD_TRACKS" || value.op === "ADD_STEPS" || value.op === "CREATE_SCENE") {
    const key = value.op === "CREATE_SCENE" ? "scene" : value.op === "ADD_TRACKS" ? "tracks" : "steps";
    rejectUnknown(value, ["op", key], path, diags);
    if (value.op === "CREATE_SCENE") {
      if (!isRecord(value.scene)) {
        diags.add("INVALID_TYPE", `${path}.scene`, "CREATE_SCENE requires a scene header.");
      } else {
        const keys = ["irVersion", "sceneId", "viewport", "background", "resources", "cameras", "initialCameraId", "durationMs"];
        if (v02) keys.push("compositions", "instances", "timingScopes", "requiredCapabilities", "geometryOperators", "interactions", "spatialLayers", "physics");
        rejectUnknown(value.scene, keys, `${path}.scene`, diags);
        for (const list of ["resources", "cameras"]) {
          if (!Array.isArray(value.scene[list])) diags.add("INVALID_TYPE", `${path}.scene.${list}`, `${list} must be an array.`);
        }
      }
    }
    if ((value.op === "ADD_TRACKS" || value.op === "ADD_STEPS") && !Array.isArray(value[value.op === "ADD_TRACKS" ? "tracks" : "steps"])) {
      diags.add("INVALID_TYPE", path, `${value.op} requires an array payload.`);
    }
  }
}

function readEntityPatch(value: unknown, path: string, limits: ResourceLimits, diags: Diags, v02: boolean): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "APPLY_ENTITY_PATCH requires a patch object.");
    return;
  }
  rejectUnknown(value, ["expectedRevision", "nextRevision", "operations"], path, diags);
  for (const key of ["expectedRevision", "nextRevision"] as const) {
    const revision = value[key];
    if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 0) {
      diags.add("INVALID_TYPE", `${path}.${key}`, "Entity patch revisions must be integers >= 0.");
    }
  }
  if (!Array.isArray(value.operations)) {
    diags.add("INVALID_TYPE", `${path}.operations`, "Entity patch operations must be an array.");
    return;
  }
  for (const [index, operation] of value.operations.entries()) {
    readEntityPatchOp(operation, `${path}.operations[${index}]`, limits, diags, v02);
  }
}

function readEntityPatchOp(value: unknown, path: string, limits: ResourceLimits, diags: Diags, v02: boolean): void {
  if (!isRecord(value) || typeof value.op !== "string") {
    diags.add("INVALID_TYPE", path, "An entity patch operation needs an op name.");
    return;
  }
  if (!ENTITY_PATCH_OPS.has(value.op)) {
    diags.add("INVALID_ENUM", `${path}.op`, `Unknown entity patch operation ${value.op}.`);
    return;
  }
  if (value.op === "UPSERT_ENTITY") {
    rejectUnknown(value, ["op", "entity", "activationMs", "node"], path, diags);
    readFinite(value.activationMs, `${path}.activationMs`, diags);
    readEntityRecord(value.entity, `${path}.entity`, diags);
    if (value.node !== undefined) readNodes([value.node], diags, limits, false, `${path}.node`, v02);
    return;
  }
  if (value.op === "REMOVE_ENTITY") {
    rejectUnknown(value, ["op", "entityId", "activationMs"], path, diags);
    readEntityId(value.entityId, `${path}.entityId`, diags);
    readFinite(value.activationMs, `${path}.activationMs`, diags);
    return;
  }
  if (value.op === "REPARENT") {
    rejectUnknown(value, ["op", "entityId", "parentId", "activationMs"], path, diags);
    readEntityId(value.entityId, `${path}.entityId`, diags);
    if (value.parentId !== null) readEntityId(value.parentId, `${path}.parentId`, diags);
    readFinite(value.activationMs, `${path}.activationMs`, diags);
    return;
  }
  if (value.op === "GRANT_OWNERSHIP") {
    rejectUnknown(value, ["op", "grant"], path, diags);
    readOwnershipGrant(value.grant, `${path}.grant`, diags);
    return;
  }
  if (value.op === "REVOKE_OWNERSHIP") {
    rejectUnknown(value, ["op", "entityId", "channel", "atMs"], path, diags);
    readEntityId(value.entityId, `${path}.entityId`, diags);
    readChannelId(value.channel, `${path}.channel`, diags);
    readFinite(value.atMs, `${path}.atMs`, diags);
    return;
  }
  if (value.op === "ACTIVATE_BEHAVIOUR") {
    rejectUnknown(value, ["op", "behaviour"], path, diags);
    readBehaviourRecord(value.behaviour, `${path}.behaviour`, diags);
    return;
  }
  if (value.op === "CANCEL_BEHAVIOUR") {
    rejectUnknown(value, ["op", "behaviourId"], path, diags);
    readEntityId(value.behaviourId, `${path}.behaviourId`, diags);
    return;
  }
  if (value.op === "REGISTER_GEOMETRY") {
    rejectUnknown(value, ["op", "geometry", "activationMs"], path, diags);
    readFinite(value.activationMs, `${path}.activationMs`, diags);
    readGeometryAsset(value.geometry, `${path}.geometry`, limits, diags, v02);
    return;
  }
  if (value.op === "BIND_GEOMETRY") {
    rejectUnknown(value, ["op", "entityId", "geometryId", "activationMs"], path, diags);
    readEntityId(value.entityId, `${path}.entityId`, diags);
    readEntityId(value.geometryId, `${path}.geometryId`, diags);
    readFinite(value.activationMs, `${path}.activationMs`, diags);
  }
}

function readGeometryAsset(
  value: unknown,
  path: string,
  limits: ResourceLimits,
  diags: Diags,
  v02: boolean,
): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Geometry asset required.");
    return;
  }
  rejectUnknown(value, ["id", "space", "node"], path, diags);
  readEntityId(value.id, `${path}.id`, diags);
  if (value.space !== "world" && value.space !== "local") {
    diags.add("INVALID_ENUM", `${path}.space`, 'Geometry space must be "world" or "local".');
  }
  if (value.node === undefined) {
    diags.add("INVALID_TYPE", `${path}.node`, "Geometry asset requires a node payload.");
    return;
  }
  readNodes([value.node], diags, limits, false, `${path}.node`, v02);
  if (isRecord(value.node) && typeof value.node.id === "string" && typeof value.id === "string" && value.node.id !== value.id) {
    diags.add(
      "INVALID_TYPE",
      `${path}.node.id`,
      `Geometry node id ${value.node.id} must match geometry id ${value.id}.`,
    );
  }
}

function readEntityId(value: unknown, path: string, diags: Diags): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    diags.add("INVALID_TYPE", path, "Entity ids must be short non-empty strings.");
  }
}

function readChannelId(value: unknown, path: string, diags: Diags): void {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    diags.add("INVALID_TYPE", path, "Channel ids must be short non-empty strings.");
  }
}

function readEntityRecord(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Entity record required.");
    return;
  }
  rejectUnknown(value, ["id", "kind", "parentId", "present", "label"], path, diags);
  readEntityId(value.id, `${path}.id`, diags);
  if (value.kind !== "drawable" && value.kind !== "group") {
    diags.add("INVALID_ENUM", `${path}.kind`, "Entity kind must be drawable or group.");
  }
  if (value.parentId !== null) readEntityId(value.parentId, `${path}.parentId`, diags);
  if (typeof value.present !== "boolean") {
    diags.add("INVALID_TYPE", `${path}.present`, "present must be a boolean.");
  }
  if (value.label !== undefined && (typeof value.label !== "string" || value.label.length > 200)) {
    diags.add("INVALID_TYPE", `${path}.label`, "label must be a short string.");
  }
}

function readOwnershipGrant(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Ownership grant required.");
    return;
  }
  rejectUnknown(value, ["entityId", "channel", "owner", "writerClass", "fromMs", "untilMs"], path, diags);
  readEntityId(value.entityId, `${path}.entityId`, diags);
  readChannelId(value.channel, `${path}.channel`, diags);
  if (typeof value.owner !== "string" || value.owner.length === 0) {
    diags.add("INVALID_TYPE", `${path}.owner`, "owner must be a behaviour id or generative.");
  }
  if (!["generative", "behaviour", "input", "physics"].includes(value.writerClass as string)) {
    diags.add("INVALID_ENUM", `${path}.writerClass`, "Unknown writer class.");
  }
  readFinite(value.fromMs, `${path}.fromMs`, diags);
  if (value.untilMs !== undefined) readFinite(value.untilMs, `${path}.untilMs`, diags);
}

function readBehaviourRecord(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Behaviour record required.");
    return;
  }
  rejectUnknown(value, ["id", "entityId", "channel", "activationMs", "active"], path, diags);
  readEntityId(value.id, `${path}.id`, diags);
  readEntityId(value.entityId, `${path}.entityId`, diags);
  readChannelId(value.channel, `${path}.channel`, diags);
  readFinite(value.activationMs, `${path}.activationMs`, diags);
  if (typeof value.active !== "boolean") {
    diags.add("INVALID_TYPE", `${path}.active`, "active must be a boolean.");
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
  if (type !== "number" && type !== "vec2" && type !== "angle" && type !== "boolean" && type !== "path") return false;
  return isValidSample(type as "number" | "vec2" | "angle" | "boolean" | "path", channel, value);
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

interface ResourceFacts {
  id: string;
  kind: string;
  family: string;
  /** Decoded length for audio resources. */
  durationMs?: number;
  /** True when the resource carries a generative source (audio.generative). */
  generative?: boolean;
}

const AUDIO_BUS_NAMES = new Set(["narration", "effects", "music"]);
/** Cue count bound, matching the runtime AudioSession default. */
export const MAX_AUDIO_CUES = 4096;

function readGenerativeAudioSource(source: Record<string, unknown>, path: string, diags: Diags): void {
  rejectUnknown(source, ["type", "modality", "prompt", "voice", "durationHintMs", "loop", "seed", "style"], path, diags);
  if (source.modality !== "speech" && source.modality !== "effect") {
    diags.add("INVALID_ENUM", `${path}.modality`, 'Generative modality must be "speech" or "effect".');
  }
  if (typeof source.prompt !== "string" || source.prompt.length === 0) {
    diags.add("MISSING_REQUIRED", `${path}.prompt`, "A generative audio source needs a non-empty prompt.");
  }
  if (source.voice !== undefined && typeof source.voice !== "string") {
    diags.add("INVALID_TYPE", `${path}.voice`, "voice must be a string.");
  }
  if (source.durationHintMs !== undefined) {
    const hint = readFinite(source.durationHintMs, `${path}.durationHintMs`, diags);
    if (hint !== undefined && !(hint > 0)) {
      diags.add("INVALID_TIMING", `${path}.durationHintMs`, "durationHintMs must be positive.");
    }
  }
  if (source.loop !== undefined && typeof source.loop !== "boolean") {
    diags.add("INVALID_TYPE", `${path}.loop`, "loop must be a boolean.");
  }
  if (source.seed !== undefined) {
    const seed = readFinite(source.seed, `${path}.seed`, diags);
    if (seed !== undefined && !Number.isInteger(seed)) {
      diags.add("INVALID_TYPE", `${path}.seed`, "seed must be an integer.");
    }
  }
  if (source.style !== undefined) {
    if (!isRecord(source.style)) {
      diags.add("INVALID_TYPE", `${path}.style`, "style must be an object.");
    } else {
      rejectUnknown(source.style, ["stability", "similarity", "speed"], `${path}.style`, diags);
      for (const key of ["stability", "similarity", "speed"] as const) {
        if (source.style[key] === undefined) continue;
        const value = readFinite(source.style[key], `${path}.style.${key}`, diags);
        if (value !== undefined && !Number.isFinite(value)) {
          diags.add("INVALID_TYPE", `${path}.style.${key}`, `${key} must be a finite number.`);
        }
      }
    }
  }
}

/**
 * audio.cues (Scene IR 0.11.0) and audio.generative (0.14.0). Audio resources
 * and cues require audio.cues; generative sources also require audio.generative.
 * Cues name declared audio resources, use a known bus and stay inside the
 * resource when duration is known; start times lie in [0, durationMs].
 * Semantics follow docs/decisions/engine/audible-media-clock.md and
 * docs/decisions/engine/generative-audio-contract.md.
 */
function readAudio(value: unknown, resources: ResourceFacts[], timeline: unknown, required: unknown, diags: Diags): void {
  const audio = new Map(resources.filter((resource) => resource.kind === "audio").map((resource) => [resource.id, resource]));
  const hasCapability = Array.isArray(required) && required.includes("audio.cues");
  const hasGenerative = Array.isArray(required) && required.includes("audio.generative");
  const generativeCount = [...audio.values()].filter((resource) => resource.generative).length;
  if (audio.size > 0 && !hasCapability) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "Audio resources require audio.cues in requiredCapabilities.");
  }
  if (generativeCount > 0 && !hasGenerative) {
    diags.add(
      "MISSING_REQUIRED",
      "requiredCapabilities",
      "Generative audio resources require audio.generative in requiredCapabilities.",
    );
  }
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "audioCues", "audioCues must be an array.");
    return;
  }
  if (value.length > 0 && !hasCapability && audio.size === 0) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "Audio cues require audio.cues in requiredCapabilities.");
  }
  if (value.length > MAX_AUDIO_CUES) {
    diags.add("RESOURCE_LIMIT", "audioCues", `Audio cue count ${value.length} exceeds ${MAX_AUDIO_CUES}.`);
  }
  const sceneDuration = isRecord(timeline) && typeof timeline.durationMs === "number" ? timeline.durationMs : undefined;
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `audioCues[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "An audio cue must be an object.");
      return;
    }
    rejectUnknown(
      entry,
      ["id", "resourceId", "bus", "startMs", "offsetMs", "durationMs", "loops", "gain", "fadeInMs", "fadeOutMs", "required"],
      path,
      diags,
    );
    const id = readIdent(entry.id, `${path}.id`, diags);
    if (id !== undefined) {
      if (ids.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate audio cue id ${id}.`);
      ids.add(id);
    }
    const resource = typeof entry.resourceId === "string" ? audio.get(entry.resourceId) : undefined;
    if (!resource) diags.add("UNKNOWN_TARGET", `${path}.resourceId`, "An audio cue names an audio resource that does not exist.");
    if (typeof entry.bus !== "string" || !AUDIO_BUS_NAMES.has(entry.bus)) {
      diags.add("INVALID_ENUM", `${path}.bus`, "bus must be narration, effects or music.");
    }
    const start = readFinite(entry.startMs, `${path}.startMs`, diags);
    if (start !== undefined && (start < 0 || (sceneDuration !== undefined && start > sceneDuration + 1e-9))) {
      diags.add("INVALID_TIMING", `${path}.startMs`, "A cue starts within [0, timeline.durationMs].");
    }
    const nonNegative = (key: string): number | undefined => {
      if (entry[key] === undefined) return undefined;
      const n = readFinite(entry[key], `${path}.${key}`, diags);
      if (n !== undefined && n < 0) diags.add("INVALID_TIMING", `${path}.${key}`, `${key} must not be negative.`);
      return n;
    };
    const offset = nonNegative("offsetMs") ?? 0;
    nonNegative("fadeInMs");
    nonNegative("fadeOutMs");
    const length = entry.durationMs === undefined ? undefined : readFinite(entry.durationMs, `${path}.durationMs`, diags);
    if (length !== undefined && !(length > 0)) diags.add("INVALID_TIMING", `${path}.durationMs`, "A cue durationMs must be positive.");
    if (resource?.durationMs !== undefined) {
      if (offset >= resource.durationMs) {
        diags.add("INVALID_TIMING", `${path}.offsetMs`, `offsetMs must lie inside resource ${resource.id} (${resource.durationMs}ms).`);
      } else if (length !== undefined && offset + length > resource.durationMs + 1e-9) {
        diags.add("INVALID_TIMING", `${path}.durationMs`, `offsetMs + durationMs exceeds resource ${resource.id} (${resource.durationMs}ms).`);
      }
    }
    if (entry.loops !== undefined && !(typeof entry.loops === "number" && Number.isInteger(entry.loops) && entry.loops >= 1 && entry.loops <= 1000)) {
      diags.add("INVALID_TYPE", `${path}.loops`, "loops must be an integer in [1, 1000].");
    }
    if (entry.gain !== undefined) {
      const gain = readFinite(entry.gain, `${path}.gain`, diags);
      if (gain !== undefined && (gain < 0 || gain > 4)) diags.add("INVALID_TRACK_VALUE", `${path}.gain`, "gain must lie in [0, 4].");
    }
    if (entry.required !== undefined && typeof entry.required !== "boolean") {
      diags.add("INVALID_TYPE", `${path}.required`, "required must be a boolean.");
    }
  });
}

/** Surfaces across all layers in one scene, matching the runtime projection default. */
export const MAX_SPATIAL_SURFACES = 1024;
export const MAX_SEAM_FRAGMENTS = 1024;
export const MAX_PHYSICS_BODIES = 256;
export const MAX_PHYSICS_JOINTS = 256;
export const PHYSICS_OWNED_CHANNELS = [
  "transform.position.x",
  "transform.position.y",
  "transform.rotation",
] as const;

function readSpatialVec3(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "Expected a vector { x, y, z }.");
    return;
  }
  rejectUnknown(value, ["x", "y", "z"], path, diags);
  for (const axis of ["x", "y", "z"] as const) readFinite(value[axis], `${path}.${axis}`, diags);
}

function readSpatialCamera(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A spatial layer needs a camera object.");
    return;
  }
  rejectUnknown(value, ["projection", "position", "yaw", "pitch", "roll", "focalLength", "zoom", "near"], path, diags);
  if (value.projection !== "perspective" && value.projection !== "orthographic") {
    diags.add("INVALID_ENUM", `${path}.projection`, 'projection must be "perspective" or "orthographic".');
  }
  if (value.position !== undefined) readSpatialVec3(value.position, `${path}.position`, diags);
  for (const key of ["yaw", "pitch", "roll"] as const) {
    if (value[key] !== undefined) readFinite(value[key], `${path}.${key}`, diags);
  }
  for (const key of ["focalLength", "zoom", "near"] as const) {
    if (value[key] === undefined) continue;
    const n = readFinite(value[key], `${path}.${key}`, diags);
    if (n !== undefined && !(n > 0)) diags.add("INVALID_TRACK_VALUE", `${path}.${key}`, `${key} must be greater than 0.`);
  }
}

function readSpatialTransform(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A surface transform must be an object.");
    return;
  }
  rejectUnknown(value, ["position", "pivot", "rotation", "scale", "hinge"], path, diags);
  for (const key of ["position", "pivot", "rotation", "scale"] as const) {
    if (value[key] !== undefined) readSpatialVec3(value[key], `${path}.${key}`, diags);
  }
  if (value.hinge === undefined) return;
  const hpath = `${path}.hinge`;
  if (!isRecord(value.hinge)) {
    diags.add("INVALID_TYPE", hpath, "A hinge must be an object.");
    return;
  }
  rejectUnknown(value.hinge, ["from", "to", "angle"], hpath, diags);
  const from = readVec(value.hinge.from, `${hpath}.from`, diags);
  const to = readVec(value.hinge.to, `${hpath}.to`, diags);
  readFinite(value.hinge.angle, `${hpath}.angle`, diags);
  if (from && to && from.x === to.x && from.y === to.y) {
    diags.add("INVALID_TRACK_VALUE", hpath, "A hinge line needs distinct from and to points.");
  }
}

/**
 * space.planarSeams (Scene IR 0.15.0). Opt-in seam/split compositing for one
 * layer; declared seam edges name two distinct surfaces of that layer.
 */
function readSpatialSeams(value: unknown, inLayer: Set<string>, path: string, required: unknown, diags: Diags): void {
  if (!(Array.isArray(required) && required.includes("space.planarSeams"))) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "Spatial layer seams require space.planarSeams in requiredCapabilities.");
  }
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "seams must be an object.");
    return;
  }
  rejectUnknown(value, ["split", "edgeEpsilon", "maxFragments", "edges"], path, diags);
  if (value.split !== undefined && typeof value.split !== "boolean") diags.add("INVALID_TYPE", `${path}.split`, "split must be a boolean.");
  if (value.edgeEpsilon !== undefined) {
    const n = readFinite(value.edgeEpsilon, `${path}.edgeEpsilon`, diags);
    if (n !== undefined && !(n > 0)) diags.add("INVALID_TRACK_VALUE", `${path}.edgeEpsilon`, "edgeEpsilon must be greater than 0.");
  }
  if (value.maxFragments !== undefined) {
    const n = readFinite(value.maxFragments, `${path}.maxFragments`, diags);
    if (n !== undefined && !(Number.isInteger(n) && n >= 0 && n <= MAX_SEAM_FRAGMENTS)) {
      diags.add("INVALID_TRACK_VALUE", `${path}.maxFragments`, `maxFragments must be an integer from 0 to ${MAX_SEAM_FRAGMENTS}.`);
    }
  }
  if (value.edges === undefined) return;
  if (!Array.isArray(value.edges)) {
    diags.add("INVALID_TYPE", `${path}.edges`, "edges must be an array.");
    return;
  }
  if (value.edges.length > MAX_SPATIAL_SURFACES) {
    diags.add("RESOURCE_LIMIT", `${path}.edges`, `Seam edge count ${value.edges.length} exceeds ${MAX_SPATIAL_SURFACES}.`);
  }
  const seen = new Set<string>();
  value.edges.forEach((edge, index) => {
    const epath = `${path}.edges[${index}]`;
    if (!isRecord(edge)) {
      diags.add("INVALID_TYPE", epath, "A seam edge must be an object { a, b }.");
      return;
    }
    rejectUnknown(edge, ["a", "b"], epath, diags);
    for (const key of ["a", "b"] as const) {
      if (typeof edge[key] !== "string" || !inLayer.has(edge[key] as string)) {
        diags.add("UNKNOWN_TARGET", `${epath}.${key}`, "A seam edge names a surface of the same layer.");
      }
    }
    if (typeof edge.a === "string" && edge.a === edge.b) diags.add("INVALID_TRACK_VALUE", epath, "A seam edge needs two different surfaces.");
    if (typeof edge.a === "string" && typeof edge.b === "string") {
      const key = [edge.a, edge.b].sort().join("\u0000");
      if (seen.has(key)) diags.add("DUPLICATE_ID", epath, `Seam ${edge.a}/${edge.b} is declared twice.`);
      seen.add(key);
    }
  });
}

/**
 * space.planar25d (Scene IR 0.12.0). Layers list their surfaces; each surface
 * names a root-scene node, appears once in the scene, and parents only within
 * its layer. Projection happens at frame resolution (runtime SpatialLayer).
 */
function readSpatialLayers(value: unknown, nodeIds: Set<string>, required: unknown, diags: Diags): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "spatialLayers", "spatialLayers must be an array.");
    return;
  }
  if (value.length > 0 && !(Array.isArray(required) && required.includes("space.planar25d"))) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "spatialLayers require space.planar25d in requiredCapabilities.");
  }
  let total = 0;
  for (const layer of value) if (isRecord(layer) && Array.isArray(layer.surfaces)) total += layer.surfaces.length;
  if (total > MAX_SPATIAL_SURFACES) {
    diags.add("RESOURCE_LIMIT", "spatialLayers", `Surface count ${total} exceeds ${MAX_SPATIAL_SURFACES}.`);
  }
  const layerIds = new Set<string>();
  const surfaceOwner = new Set<string>();
  value.forEach((layer, index) => {
    const path = `spatialLayers[${index}]`;
    if (!isRecord(layer)) {
      diags.add("INVALID_TYPE", path, "A spatial layer must be an object.");
      return;
    }
    rejectUnknown(layer, ["id", "camera", "surfaces", "seams"], path, diags);
    const id = readIdent(layer.id, `${path}.id`, diags);
    if (id !== undefined) {
      if (layerIds.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate spatial layer id ${id}.`);
      layerIds.add(id);
    }
    readSpatialCamera(layer.camera, `${path}.camera`, diags);
    if (!Array.isArray(layer.surfaces)) {
      diags.add("INVALID_TYPE", `${path}.surfaces`, "surfaces must be an array.");
      return;
    }
    const inLayer = new Set<string>();
    for (const surface of layer.surfaces) if (isRecord(surface) && typeof surface.nodeId === "string") inLayer.add(surface.nodeId);
    const parents = new Map<string, string>();
    const seen = new Set<string>();
    layer.surfaces.forEach((surface, surfaceIndex) => {
      const spath = `${path}.surfaces[${surfaceIndex}]`;
      if (!isRecord(surface)) {
        diags.add("INVALID_TYPE", spath, "A spatial surface must be an object.");
        return;
      }
      rejectUnknown(surface, ["nodeId", "parent", "transform", "backFill", "backface"], spath, diags);
      const nodeId = typeof surface.nodeId === "string" ? surface.nodeId : undefined;
      if (nodeId === undefined || !nodeIds.has(nodeId)) {
        diags.add("UNKNOWN_TARGET", `${spath}.nodeId`, "A spatial surface names a node that does not exist.");
      } else if (seen.has(nodeId) || surfaceOwner.has(nodeId)) {
        diags.add("DUPLICATE_ID", `${spath}.nodeId`, `Node ${nodeId} is already a spatial surface.`);
      } else {
        seen.add(nodeId);
        surfaceOwner.add(nodeId);
      }
      if (surface.parent !== undefined) {
        if (typeof surface.parent !== "string" || !inLayer.has(surface.parent)) {
          diags.add("UNKNOWN_TARGET", `${spath}.parent`, "A surface parent must be another surface of the same layer.");
        } else if (surface.parent === nodeId) {
          diags.add("CYCLE", `${spath}.parent`, "A surface cannot be its own parent.");
        } else if (nodeId !== undefined) parents.set(nodeId, surface.parent);
      }
      if (surface.transform !== undefined) readSpatialTransform(surface.transform, `${spath}.transform`, diags);
      if (surface.backFill !== undefined) readColor(surface.backFill, `${spath}.backFill`, diags);
      if (surface.backface !== undefined && surface.backface !== "visible" && surface.backface !== "hidden") {
        diags.add("INVALID_ENUM", `${spath}.backface`, 'backface must be "visible" or "hidden".');
      }
    });
    if (layer.seams !== undefined) readSpatialSeams(layer.seams, inLayer, `${path}.seams`, required, diags);
    for (const start of parents.keys()) {
      const trail = new Set<string>([start]);
      for (let at = parents.get(start); at !== undefined; at = parents.get(at)) {
        if (trail.has(at)) {
          diags.add("CYCLE", `${path}.surfaces`, `Surface parents form a cycle at ${at}.`);
          return;
        }
        trail.add(at);
      }
    }
  });
}

const INTERACTION_CHANNELS = new Set([
  "transform.position.x",
  "transform.position.y",
  "transform.rotation",
  "transform.scale.x",
  "transform.scale.y",
  "opacity",
]);
const INTERACTION_TRIGGERS = new Set(["click", "activate", "drag", "wheel", "key"]);

/**
 * physics.planar2d (Scene IR 0.13.0). One world per scene. Dynamic mode needs
 * bodies (and optional joints); authored mode needs constraints. Each body
 * entity exclusively owns transform.position.x/y and transform.rotation.
 */
function readPhysics(
  value: unknown,
  nodeIds: Set<string>,
  timeline: unknown,
  interactions: unknown,
  required: unknown,
  diags: Diags,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", "physics", "physics must be an object.");
    return;
  }
  if (!(Array.isArray(required) && required.includes("physics.planar2d"))) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "physics requires physics.planar2d in requiredCapabilities.");
  }
  rejectUnknown(
    value,
    [
      "id",
      "mode",
      "gravity",
      "fixedDtMs",
      "seed",
      "maxBodies",
      "maxJoints",
      "maxContactsPerStep",
      "maxSolverIterations",
      "maxStepsPerAdvance",
      "bodies",
      "joints",
      "constraints",
    ],
    "physics",
    diags,
  );
  readIdent(value.id, "physics.id", diags);
  if (value.mode !== "dynamic" && value.mode !== "authored") {
    diags.add("INVALID_ENUM", "physics.mode", 'mode must be "dynamic" or "authored".');
  }
  if (value.gravity !== undefined) {
    if (!isRecord(value.gravity)) diags.add("INVALID_TYPE", "physics.gravity", "gravity must be a vec2.");
    else {
      rejectUnknown(value.gravity, ["x", "y"], "physics.gravity", diags);
      readFinite(value.gravity.x, "physics.gravity.x", diags);
      readFinite(value.gravity.y, "physics.gravity.y", diags);
    }
  }
  for (const key of [
    "fixedDtMs",
    "seed",
    "maxBodies",
    "maxJoints",
    "maxContactsPerStep",
    "maxSolverIterations",
    "maxStepsPerAdvance",
  ] as const) {
    if (value[key] === undefined) continue;
    const number = readFinite(value[key], `physics.${key}`, diags);
    if (number !== undefined && key !== "seed" && !(number > 0)) {
      diags.add("INVALID_TRACK_VALUE", `physics.${key}`, `${key} must be greater than 0.`);
    }
  }
  if (!Array.isArray(value.bodies)) {
    diags.add("INVALID_TYPE", "physics.bodies", "bodies must be an array.");
    return;
  }
  if (value.bodies.length > MAX_PHYSICS_BODIES) {
    diags.add("RESOURCE_LIMIT", "physics.bodies", `Body count ${value.bodies.length} exceeds ${MAX_PHYSICS_BODIES}.`);
  }
  if (value.mode === "dynamic" && value.bodies.length === 0) {
    diags.add("MISSING_REQUIRED", "physics.bodies", "A dynamic physics world needs at least one body.");
  }
  if (value.mode === "authored") {
    if (!Array.isArray(value.constraints) || value.constraints.length === 0) {
      diags.add("MISSING_REQUIRED", "physics.constraints", "An authored physics world needs at least one constraint.");
    }
    if (Array.isArray(value.joints) && value.joints.length > 0) {
      diags.add("INVALID_TYPE", "physics.joints", "Authored mode does not use joints; use constraints.");
    }
  }
  const bodyIds = new Set<string>();
  const owned = new Map<string, string>();
  value.bodies.forEach((body, index) => {
    const path = `physics.bodies[${index}]`;
    if (!isRecord(body)) {
      diags.add("INVALID_TYPE", path, "A physics body must be an object.");
      return;
    }
    rejectUnknown(
      body,
      ["id", "entityId", "kind", "x", "y", "angle", "vx", "vy", "omega", "mass", "restitution", "friction", "collider", "surfaceId"],
      path,
      diags,
    );
    const id = readIdent(body.id, `${path}.id`, diags);
    if (id !== undefined) {
      if (bodyIds.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate physics body id ${id}.`);
      bodyIds.add(id);
    }
    const entityId = body.entityId === undefined ? id : typeof body.entityId === "string" ? body.entityId : undefined;
    if (body.entityId !== undefined && (typeof body.entityId !== "string" || body.entityId.length === 0)) {
      diags.add("INVALID_TYPE", `${path}.entityId`, "entityId must be a non-empty string.");
    } else if (entityId !== undefined && !nodeIds.has(entityId)) {
      diags.add("UNKNOWN_TARGET", `${path}.entityId`, `Physics body ${id ?? "?"} names entity ${entityId}, which does not exist.`);
    }
    if (body.kind !== "static" && body.kind !== "kinematic" && body.kind !== "dynamic") {
      diags.add("INVALID_ENUM", `${path}.kind`, 'kind must be "static", "kinematic" or "dynamic".');
    }
    for (const key of ["x", "y", "angle"] as const) readFinite(body[key], `${path}.${key}`, diags);
    for (const key of ["vx", "vy", "omega", "mass", "restitution", "friction"] as const) {
      if (body[key] !== undefined) readFinite(body[key], `${path}.${key}`, diags);
    }
    if (body.mass !== undefined) {
      const mass = readFinite(body.mass, `${path}.mass`, diags);
      if (mass !== undefined && mass < 0) diags.add("INVALID_TRACK_VALUE", `${path}.mass`, "mass must be >= 0.");
    }
    if (body.surfaceId !== undefined && (typeof body.surfaceId !== "string" || body.surfaceId.length === 0)) {
      diags.add("INVALID_TYPE", `${path}.surfaceId`, "surfaceId must be a non-empty string.");
    }
    readPhysicsCollider(body.collider, `${path}.collider`, diags);
    if (entityId !== undefined) {
      for (const channel of PHYSICS_OWNED_CHANNELS) {
        owned.set(`node:${entityId}:${channel}`, path);
      }
    }
  });
  if (value.mode === "authored" && Array.isArray(value.constraints)) {
    value.constraints.forEach((constraint, index) => {
      if (!isRecord(constraint)) return;
      for (const key of ["a", "b"] as const) {
        if (typeof constraint[key] !== "string") continue;
        owned.set(`node:${constraint[key]}:transform.position.x`, `physics.constraints[${index}]`);
        owned.set(`node:${constraint[key]}:transform.position.y`, `physics.constraints[${index}]`);
      }
    });
  }
  if (value.joints !== undefined) {
    if (!Array.isArray(value.joints)) {
      diags.add("INVALID_TYPE", "physics.joints", "joints must be an array.");
    } else {
      if (value.joints.length > MAX_PHYSICS_JOINTS) {
        diags.add("RESOURCE_LIMIT", "physics.joints", `Joint count ${value.joints.length} exceeds ${MAX_PHYSICS_JOINTS}.`);
      }
      const jointIds = new Set<string>();
      value.joints.forEach((joint, index) => {
        const path = `physics.joints[${index}]`;
        if (!isRecord(joint)) {
          diags.add("INVALID_TYPE", path, "A physics joint must be an object.");
          return;
        }
        rejectUnknown(joint, ["id", "bodyA", "bodyB", "restLength", "anchorA", "anchorB", "compliance"], path, diags);
        const id = readIdent(joint.id, `${path}.id`, diags);
        if (id !== undefined) {
          if (jointIds.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate physics joint id ${id}.`);
          jointIds.add(id);
        }
        for (const key of ["bodyA", "bodyB"] as const) {
          if (typeof joint[key] !== "string" || !bodyIds.has(joint[key])) {
            diags.add("UNKNOWN_TARGET", `${path}.${key}`, `Joint names unknown body ${String(joint[key])}.`);
          }
        }
        const rest = readFinite(joint.restLength, `${path}.restLength`, diags);
        if (rest !== undefined && rest < 0) diags.add("INVALID_TRACK_VALUE", `${path}.restLength`, "restLength must be >= 0.");
        if (joint.compliance !== undefined) {
          const compliance = readFinite(joint.compliance, `${path}.compliance`, diags);
          if (compliance !== undefined && (compliance < 0 || compliance > 1)) {
            diags.add("INVALID_TRACK_VALUE", `${path}.compliance`, "compliance must be in [0, 1].");
          }
        }
        for (const key of ["anchorA", "anchorB"] as const) {
          if (joint[key] === undefined) continue;
          if (!isRecord(joint[key])) diags.add("INVALID_TYPE", `${path}.${key}`, "anchor must be a vec2.");
          else {
            rejectUnknown(joint[key], ["x", "y"], `${path}.${key}`, diags);
            readFinite(joint[key].x, `${path}.${key}.x`, diags);
            readFinite(joint[key].y, `${path}.${key}.y`, diags);
          }
        }
      });
    }
  }
  if (value.constraints !== undefined) {
    if (!Array.isArray(value.constraints)) {
      diags.add("INVALID_TYPE", "physics.constraints", "constraints must be an array.");
    } else {
      const constraintIds = new Set<string>();
      value.constraints.forEach((constraint, index) => {
        const path = `physics.constraints[${index}]`;
        if (!isRecord(constraint)) {
          diags.add("INVALID_TYPE", path, "A physics constraint must be an object.");
          return;
        }
        rejectUnknown(constraint, ["id", "a", "b", "restLength", "stiffness"], path, diags);
        const id = readIdent(constraint.id, `${path}.id`, diags);
        if (id !== undefined) {
          if (constraintIds.has(id)) diags.add("DUPLICATE_ID", `${path}.id`, `Duplicate physics constraint id ${id}.`);
          constraintIds.add(id);
        }
        for (const key of ["a", "b"] as const) {
          if (typeof constraint[key] !== "string" || !nodeIds.has(constraint[key])) {
            diags.add("UNKNOWN_TARGET", `${path}.${key}`, `Constraint names unknown point/entity ${String(constraint[key])}.`);
          }
        }
        const rest = readFinite(constraint.restLength, `${path}.restLength`, diags);
        if (rest !== undefined && rest < 0) diags.add("INVALID_TRACK_VALUE", `${path}.restLength`, "restLength must be >= 0.");
        if (constraint.stiffness !== undefined) {
          const stiffness = readFinite(constraint.stiffness, `${path}.stiffness`, diags);
          if (stiffness !== undefined && (stiffness < 0 || stiffness > 1)) {
            diags.add("INVALID_TRACK_VALUE", `${path}.stiffness`, "stiffness must be in [0, 1].");
          }
        }
      });
    }
  }
  // Exclusive ownership vs tracks and input bindings.
  const tracks = isRecord(timeline) && Array.isArray(timeline.tracks) ? timeline.tracks : [];
  tracks.forEach((track, index) => {
    if (!isRecord(track) || !isRecord(track.target) || track.target.kind !== "node") return;
    let scalars: string[] = [];
    try {
      scalars = scalarWriters(track.target as unknown as Parameters<typeof scalarWriters>[0]);
    } catch {
      return;
    }
    for (const scalar of scalars) {
      if (owned.has(scalar)) {
        diags.add(
          "OVERLAPPING_WRITERS",
          `timeline.tracks[${index}]`,
          `${scalar.slice(5)} is physics-owned by ${owned.get(scalar)}; a track cannot also write it.`,
        );
      }
    }
  });
  if (Array.isArray(interactions)) {
    interactions.forEach((entry, index) => {
      if (!isRecord(entry) || !Array.isArray(entry.bindings)) return;
      const target = typeof entry.nodeId === "string" ? entry.nodeId : undefined;
      entry.bindings.forEach((binding, bindingIndex) => {
        if (!isRecord(binding) || !isRecord(binding.action)) return;
        const writes = binding.nodeId === undefined ? target : typeof binding.nodeId === "string" ? binding.nodeId : undefined;
        if (writes === undefined) return;
        const channels =
          binding.action.kind === "dragTranslate"
            ? ["transform.position.x", "transform.position.y"]
            : typeof binding.action.channel === "string"
              ? [binding.action.channel]
              : [];
        for (const channel of channels) {
          const key = `node:${writes}:${channel}`;
          if (owned.has(key)) {
            diags.add(
              "OVERLAPPING_WRITERS",
              `interactions[${index}].bindings[${bindingIndex}]`,
              `${writes}.${channel} is physics-owned; input cannot also write it. Use PhysicsSession drag handoff instead.`,
            );
          }
        }
      });
    });
  }
}

function readPhysicsCollider(value: unknown, path: string, diags: Diags): void {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "collider must be an object.");
    return;
  }
  if (value.kind === "circle") {
    rejectUnknown(value, ["kind", "radius"], path, diags);
    const radius = readFinite(value.radius, `${path}.radius`, diags);
    if (radius !== undefined && !(radius > 0)) diags.add("INVALID_TRACK_VALUE", `${path}.radius`, "circle radius must be > 0.");
    return;
  }
  if (value.kind === "aabb") {
    rejectUnknown(value, ["kind", "halfWidth", "halfHeight"], path, diags);
    const hx = readFinite(value.halfWidth, `${path}.halfWidth`, diags);
    const hy = readFinite(value.halfHeight, `${path}.halfHeight`, diags);
    if (hx !== undefined && !(hx > 0)) diags.add("INVALID_TRACK_VALUE", `${path}.halfWidth`, "halfWidth must be > 0.");
    if (hy !== undefined && !(hy > 0)) diags.add("INVALID_TRACK_VALUE", `${path}.halfHeight`, "halfHeight must be > 0.");
    return;
  }
  diags.add("INVALID_ENUM", `${path}.kind`, 'collider kind must be "circle" or "aabb".');
}

/**
 * input.bindings (Scene IR 0.10.0). Targets name root-scene nodes; actions are
 * bounded; every written (node, channel) is exclusively input-owned, so no
 * timeline track may write the same scalar.
 */
function readInteractions(
  value: unknown,
  nodes: NodeDefinition[] | undefined,
  timeline: unknown,
  required: unknown,
  diags: Diags,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    diags.add("INVALID_TYPE", "interactions", "interactions must be an array.");
    return;
  }
  if (value.length > 0 && !(Array.isArray(required) && required.includes("input.bindings"))) {
    diags.add("MISSING_REQUIRED", "requiredCapabilities", "interactions require input.bindings in requiredCapabilities.");
  }
  const ids = new Set((nodes ?? []).map((node) => node.id));
  const seen = new Set<string>();
  const owned = new Map<string, string>();
  value.forEach((entry, index) => {
    const path = `interactions[${index}]`;
    if (!isRecord(entry)) {
      diags.add("INVALID_TYPE", path, "An interaction target must be an object.");
      return;
    }
    rejectUnknown(entry, ["nodeId", "pointer", "focusable", "tabIndex", "bindings"], path, diags);
    const target = typeof entry.nodeId === "string" ? entry.nodeId : undefined;
    if (target === undefined || !ids.has(target)) {
      diags.add("UNKNOWN_TARGET", `${path}.nodeId`, "An interaction target names a node that does not exist.");
    } else if (seen.has(target)) {
      diags.add("DUPLICATE_ID", `${path}.nodeId`, `Node ${target} already has an interaction target.`);
    } else seen.add(target);
    if (entry.pointer !== undefined && entry.pointer !== "auto" && entry.pointer !== "none") {
      diags.add("INVALID_ENUM", `${path}.pointer`, 'pointer must be "auto" or "none".');
    }
    if (entry.focusable !== undefined && typeof entry.focusable !== "boolean") {
      diags.add("INVALID_TYPE", `${path}.focusable`, "focusable must be a boolean.");
    }
    if (entry.tabIndex !== undefined && !(typeof entry.tabIndex === "number" && Number.isInteger(entry.tabIndex))) {
      diags.add("INVALID_TYPE", `${path}.tabIndex`, "tabIndex must be an integer.");
    }
    if (entry.bindings === undefined) return;
    if (!Array.isArray(entry.bindings)) {
      diags.add("INVALID_TYPE", `${path}.bindings`, "bindings must be an array.");
      return;
    }
    entry.bindings.forEach((binding, bindingIndex) => {
      const bpath = `${path}.bindings[${bindingIndex}]`;
      if (!isRecord(binding)) {
        diags.add("INVALID_TYPE", bpath, "A binding must be an object.");
        return;
      }
      rejectUnknown(binding, ["on", "key", "nodeId", "action"], bpath, diags);
      const on = binding.on;
      if (typeof on !== "string" || !INTERACTION_TRIGGERS.has(on)) {
        diags.add("INVALID_ENUM", `${bpath}.on`, "on must be click, activate, drag, wheel or key.");
      }
      if (on === "key" ? typeof binding.key !== "string" || binding.key.length === 0 : binding.key !== undefined) {
        diags.add("INVALID_TYPE", `${bpath}.key`, "key is a non-empty string required only for on key.");
      }
      const writes = binding.nodeId === undefined ? target : typeof binding.nodeId === "string" ? binding.nodeId : undefined;
      if (binding.nodeId !== undefined && (writes === undefined || !ids.has(writes))) {
        diags.add("UNKNOWN_TARGET", `${bpath}.nodeId`, "A binding writes a node that does not exist.");
      }
      const channels = readInteractionAction(binding.action, `${bpath}.action`, on, diags);
      if (writes !== undefined) for (const channel of channels) owned.set(`node:${writes}:${channel}`, `${bpath}.action`);
    });
  });
  // Exclusive ownership: an input-owned scalar cannot also have a timeline writer.
  const tracks = isRecord(timeline) && Array.isArray(timeline.tracks) ? timeline.tracks : [];
  tracks.forEach((track, index) => {
    if (!isRecord(track) || !isRecord(track.target) || track.target.kind !== "node") return;
    let scalars: string[] = [];
    try {
      scalars = scalarWriters(track.target as unknown as Parameters<typeof scalarWriters>[0]);
    } catch {
      return;
    }
    for (const scalar of scalars) {
      if (owned.has(scalar)) {
        diags.add(
          "OVERLAPPING_WRITERS",
          `timeline.tracks[${index}]`,
          `${scalar.slice(5)} is input-owned by ${owned.get(scalar)}; a track cannot also write it.`,
        );
      }
    }
  });
}

function readInteractionAction(value: unknown, path: string, on: unknown, diags: Diags): string[] {
  if (!isRecord(value)) {
    diags.add("INVALID_TYPE", path, "A binding needs an action object.");
    return [];
  }
  const channel = (): string | undefined => {
    if (typeof value.channel !== "string" || !INTERACTION_CHANNELS.has(value.channel)) {
      diags.add("INVALID_TRACK_TARGET", `${path}.channel`, "Interaction channel must be position.x/y, rotation, scale.x/y or opacity.");
      return undefined;
    }
    return value.channel;
  };
  const inRange = (name: string, numbers: (number | undefined)[]): void => {
    if (name !== "opacity") return;
    if (numbers.some((n) => n !== undefined && (n < 0 || n > 1))) diags.add("INVALID_OPACITY", path, "Opacity values must lie in [0, 1].");
  };
  if (value.kind === "dragTranslate" ? on !== "drag" : on === "drag") {
    diags.add("INVALID_ENUM", `${path}.kind`, "dragTranslate is the only action for on drag, and only on drag.");
  }
  switch (value.kind) {
    case "set": {
      rejectUnknown(value, ["kind", "channel", "value"], path, diags);
      const name = channel();
      const v = readFinite(value.value, `${path}.value`, diags);
      if (name) inRange(name, [v]);
      return name ? [name] : [];
    }
    case "toggle": {
      rejectUnknown(value, ["kind", "channel", "values"], path, diags);
      const name = channel();
      if (!Array.isArray(value.values) || value.values.length !== 2) {
        diags.add("INVALID_TYPE", `${path}.values`, "toggle needs exactly two values.");
        return name ? [name] : [];
      }
      const a = readFinite(value.values[0], `${path}.values[0]`, diags);
      const b = readFinite(value.values[1], `${path}.values[1]`, diags);
      if (name) inRange(name, [a, b]);
      return name ? [name] : [];
    }
    case "step": {
      rejectUnknown(value, ["kind", "channel", "delta", "min", "max"], path, diags);
      const name = channel();
      readFinite(value.delta, `${path}.delta`, diags);
      const min = readFinite(value.min, `${path}.min`, diags);
      const max = readFinite(value.max, `${path}.max`, diags);
      if (min !== undefined && max !== undefined && min > max) diags.add("INVALID_TRACK_VALUE", path, "step min must not exceed max.");
      if (name) inRange(name, [min, max]);
      return name ? [name] : [];
    }
    case "dragTranslate": {
      rejectUnknown(value, ["kind", "min", "max"], path, diags);
      const vec = (v: unknown, p: string): Vec2 | undefined => {
        if (!isRecord(v)) {
          diags.add("INVALID_TYPE", p, "Expected a vec2.");
          return undefined;
        }
        rejectUnknown(v, ["x", "y"], p, diags);
        const x = readFinite(v.x, `${p}.x`, diags);
        const y = readFinite(v.y, `${p}.y`, diags);
        return x === undefined || y === undefined ? undefined : { x, y };
      };
      const min = vec(value.min, `${path}.min`);
      const max = vec(value.max, `${path}.max`);
      if (min && max && (min.x > max.x || min.y > max.y)) diags.add("INVALID_TRACK_VALUE", path, "dragTranslate min must not exceed max.");
      return ["transform.position.x", "transform.position.y"];
    }
    default:
      diags.add("INVALID_ENUM", `${path}.kind`, "Action kind must be set, toggle, step or dragTranslate.");
      return [];
  }
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
    rejectUnknown(value, ["kind", "id", "isolated", "opacity", "blend", "effect", "clip", "children"], path, diags);
    if (value.blend !== undefined && value.blend !== "source-over" && value.blend !== "multiply" && value.blend !== "screen" && value.blend !== "overlay") {
      diags.add("INVALID_ENUM", `${path}.blend`, "Unknown blend mode.");
    }
    if (value.effect !== undefined) readCompositing({ isolated: true, effect: value.effect }, `${path}.effect`, diags);
    if (value.clip !== undefined) readResolvedClip(value.clip, `${path}.clip`, diags);
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
