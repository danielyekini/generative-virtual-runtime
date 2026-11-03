import { attachAlongPath } from "./path-progress";
import { trimmed } from "./frame";
import {
  applySegmentEasing,
  channelSpec,
  diagnostic,
  evaluateExpression,
  IDENTITY,
  invertMat3,
  isValidSample,
  lerp,
  lerpPathCommands,
  lerpVec2,
  localMatrix,
  localTimeMs,
  multiplyMat3,
  orderPathAttachments,
  resolveNumericContent,
  scalarWriters,
  spatialCubicPoint,
  transformPoint,
  type Camera2DDefinition,
  type Diagnostic,
  type KeyframeTrack,
  type Mat3,
  type NodeDefinition,
  type PathAttachment,
  type PathCommand,
  type SceneIR,
  type TrackDefinition,
  type Transform,
  type Vec2,
} from "@gvr/schema";

interface NodePose {
  position: Vec2;
  pivot: Vec2;
  rotation: number;
  scale: Vec2;
  opacity: number;
  visible: boolean;
  content?: string;
  textNumber?: number;
  commands?: PathCommand[];
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
  pathProgress?: number;
  fillR?: number;
  fillG?: number;
  fillB?: number;
  fillA?: number;
  strokeR?: number;
  strokeG?: number;
  strokeB?: number;
  strokeA?: number;
  strokeWidth?: number;
  strokePhase?: number;
}

export type TrimOverride = { start: number; end: number; offset: number };

interface CameraPose {
  position: Vec2;
  zoom: number;
  rotation: number;
}

export interface SampledScene {
  nodes: NodeDefinition[];
  camera: Camera2DDefinition;
  diagnostics: Diagnostic[];
  /** Sampled trim.start/end/offset tracks, merged over static geometryOperators. */
  trimOverrides: Record<string, TrimOverride>;
}

interface Writer {
  track: TrackDefinition;
  index: number;
}

/**
 * Sample authored tracks and steps at one scene time.
 * The returned nodes are copies. The input scene is left unchanged.
 * An invalid expression sample keeps that channel's authored base and records
 * RUNTIME_DEGRADED. The track stays enabled for every other timestamp.
 */
export function sampleScene(
  scene: SceneIR,
  sceneTimeMs: number,
  options?: { excludeStartsAtMs?: number },
): SampledScene {
  const diagnostics: Diagnostic[] = [];
  const nodePoses = new Map<string, NodePose>();
  for (const node of scene.nodes) nodePoses.set(node.id, nodePose(node));

  const cameraSource = scene.cameras.find((camera) => camera.id === scene.initialCameraId) ?? scene.cameras[0];
  if (!cameraSource) {
    throw new Error("SceneIR has no camera.");
  }
  const cameraPose = {
    position: { ...cameraSource.position },
    zoom: cameraSource.zoom,
    rotation: cameraSource.rotation,
  };

  const byScalar = new Map<string, Writer[]>();
  const byPath = new Map<string, Writer[]>();
  scene.timeline.tracks.forEach((track, index) => {
    if (track.kind === "keyframe" && track.valueType === "path" && track.target.kind === "node") {
      const key = `node:${track.target.nodeId}:commands`;
      const list = byPath.get(key) ?? [];
      list.push({ track, index });
      byPath.set(key, list);
      return;
    }
    for (const scalar of scalarWriters(track.target)) {
      const list = byScalar.get(scalar) ?? [];
      list.push({ track, index });
      byScalar.set(scalar, list);
    }
  });

  const cache = new Map<string, number | Vec2 | PathCommand[] | undefined>();
  for (const [scalar, writers] of byScalar) {
    const selected = selectWriter(scene, writers, sceneTimeMs, options?.excludeStartsAtMs);
    if (!selected) continue;
    const cacheKey = `${selected.track.id}:${selected.mode}`;
    let value = cache.get(cacheKey);
    if (!cache.has(cacheKey)) {
      value = sampleTrack(scene, selected.track, selected.mode, sceneTimeMs, diagnostics);
      cache.set(cacheKey, value);
    }
    if (value === undefined || Array.isArray(value)) continue;
    writeScalar(scalar, component(value, scalar), nodePoses, cameraPose);
  }

  for (const [key, writers] of byPath) {
    const selected = selectWriter(scene, writers, sceneTimeMs, options?.excludeStartsAtMs);
    if (!selected || selected.track.kind !== "keyframe") continue;
    const value = samplePathTrack(scene, selected.track, selected.mode, sceneTimeMs, diagnostics);
    if (value === undefined) continue;
    const nodeId = /^node:(.+):commands$/.exec(key)?.[1];
    if (!nodeId) continue;
    const pose = nodePoses.get(nodeId);
    if (pose) pose.commands = value;
  }

  const steps = [...scene.timeline.steps].sort((a, b) => a.timeMs - b.timeMs);
  const visible = new Map<string, boolean>();
  const contents = new Map<string, string>();
  for (const step of steps) {
    const holdFrontier = options?.excludeStartsAtMs === sceneTimeMs;
    if (step.timeMs < sceneTimeMs || (step.timeMs === sceneTimeMs && !holdFrontier)) {
      if (step.target.channel === "visible" && typeof step.value === "boolean") {
        visible.set(step.target.nodeId, step.value);
      } else if (step.target.channel === "content" && typeof step.value === "string") {
        contents.set(step.target.nodeId, step.value);
      }
    }
  }
  for (const [id, value] of visible) {
    const pose = nodePoses.get(id);
    if (pose) pose.visible = value;
  }
  for (const [id, value] of contents) {
    const pose = nodePoses.get(id);
    if (pose) pose.content = value;
  }

  const trimOverrides: Record<string, TrimOverride> = {};
  for (const list of scene.geometryOperators ?? []) {
    const trim = list.operators.find((op) => op.op === "trim");
    if (!trim || trim.op !== "trim") continue;
    const pose = nodePoses.get(list.nodeId);
    trimOverrides[list.nodeId] = {
      start: pose?.trimStart ?? trim.start,
      end: pose?.trimEnd ?? trim.end,
      offset: pose?.trimOffset ?? trim.offset,
    };
  }
  for (const [nodeId, pose] of nodePoses) {
    if (pose.trimStart === undefined && pose.trimEnd === undefined && pose.trimOffset === undefined) continue;
    const base = trimOverrides[nodeId] ?? { start: 0, end: 1, offset: 0 };
    trimOverrides[nodeId] = {
      start: pose.trimStart ?? base.start,
      end: pose.trimEnd ?? base.end,
      offset: pose.trimOffset ?? base.offset,
    };
  }

  applyPathAttachments(scene, nodePoses, trimOverrides, diagnostics, sceneTimeMs);

  return {
    nodes: scene.nodes.map((node) => applyNodePose(node, nodePoses.get(node.id) ?? nodePose(node))),
    camera: { ...cameraSource, ...cameraPose, position: { ...cameraPose.position } },
    diagnostics,
    trimOverrides,
  };
}

/**
 * geometry.pathProgress (Scene IR 0.17.0). Runs after track sampling and trim
 * resolution: the path outline is the sampled (morphed) command list with the
 * same trim rules as frame resolution, so late morph/trim edits move the
 * attached node without re-baking progress. Position is always written;
 * rotation only when `orient` or `rollRadius` is set (orient alone is not rolling).
 *
 * geometry.pathSpace (Scene IR 0.22.0) maps that command point through the path
 * node's sampled world matrix into the traveller's parent space. Scenes that
 * do not require the capability keep the 0.17 path-local write.
 */
function applyPathAttachments(
  scene: SceneIR,
  poses: Map<string, NodePose>,
  trimOverrides: Record<string, TrimOverride>,
  diagnostics: Diagnostic[],
  sceneTimeMs: number,
): void {
  if (!scene.pathAttachments?.length) return;
  const nodes = new Map(scene.nodes.map((node) => [node.id, node]));
  const compose = scene.requiredCapabilities?.includes("geometry.pathSpace") === true;
  const attachments = compose ? attachmentsInOrder(scene.pathAttachments, nodes, diagnostics, sceneTimeMs) : scene.pathAttachments;
  for (const attachment of attachments) {
    const pathNode = nodes.get(attachment.pathId);
    const pose = poses.get(attachment.nodeId);
    const traveller = nodes.get(attachment.nodeId);
    if (!pose || !pathNode || pathNode.kind !== "path" || !traveller) continue;
    const commands = trimmed(scene, pathNode.id, poses.get(pathNode.id)?.commands ?? pathNode.commands, trimOverrides);
    const placed = attachAlongPath({
      commands,
      progress: pose.pathProgress ?? attachment.progress,
      orient: attachment.orient,
      rollRadius: attachment.rollRadius,
    });
    if (!compose) {
      pose.position = { ...placed.position };
      if (attachment.orient === true || attachment.rollRadius !== undefined) {
        pose.rotation = (attachment.orient === true ? placed.rotation ?? 0 : 0) + (placed.rolling ?? 0);
      }
      continue;
    }
    const travellerSpace = hierarchySpace(nodes, traveller.id);
    const pathSpace = hierarchySpace(nodes, pathNode.id);
    if (travellerSpace === "missing" || pathSpace === "missing") continue;
    if (travellerSpace === "cycle" || pathSpace === "cycle" || travellerSpace !== pathSpace) {
      diagnostics.push(
        attachmentDiagnostic(
          travellerSpace === "cycle" || pathSpace === "cycle" ? "CYCLE" : "SPACE_VIOLATION",
          travellerSpace === pathSpace
            ? `Attachment ${attachment.nodeId} sits in a parent cycle.`
            : `Attachment ${attachment.nodeId} cannot follow ${attachment.pathId} across world and screen space.`,
          sceneTimeMs,
        ),
      );
      continue;
    }
    const parentId = traveller.transformParentId !== undefined ? traveller.transformParentId : traveller.parentId;
    const parentWorld = parentId ? worldMatrix(nodes, poses, parentId) : { matrix: IDENTITY };
    if ("error" in parentWorld) {
      if (parentWorld.error === "cycle") {
        diagnostics.push(attachmentDiagnostic("CYCLE", `Attachment ${attachment.nodeId} sits in a transform cycle.`, sceneTimeMs));
      }
      continue;
    }
    const inverse = parentId ? invertMat3(parentWorld.matrix) : IDENTITY;
    if (!inverse) {
      diagnostics.push(
        attachmentDiagnostic(
          "RUNTIME_DEGRADED",
          `Attachment ${attachment.nodeId} has a singular parent transform, so its path position was left authored.`,
          sceneTimeMs,
        ),
      );
      continue;
    }
    const pathWorld = worldMatrix(nodes, poses, pathNode.id);
    if ("error" in pathWorld) {
      if (pathWorld.error === "cycle") {
        diagnostics.push(attachmentDiagnostic("CYCLE", `Path ${attachment.pathId} sits in a transform cycle.`, sceneTimeMs));
      }
      continue;
    }
    const intoParent = multiplyMat3(inverse, pathWorld.matrix);
    const position = transformPoint(intoParent, placed.position.x, placed.position.y);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      diagnostics.push(attachmentDiagnostic("RUNTIME_DEGRADED", `Attachment ${attachment.nodeId} sampled a non-finite position.`, sceneTimeMs));
      continue;
    }
    pose.position = position;
    if (attachment.orient === true || attachment.rollRadius !== undefined) {
      const tangent = attachment.orient === true ? transformedTangent(intoParent, placed.position, placed.rotation ?? 0) : 0;
      if (attachment.orient === true && tangent === undefined) {
        diagnostics.push(
          attachmentDiagnostic(
            "RUNTIME_DEGRADED",
            `Attachment ${attachment.nodeId} has a degenerate path tangent after scale, so orientation was left at rolling only.`,
            sceneTimeMs,
          ),
        );
      }
      pose.rotation = (tangent ?? 0) + (placed.rolling ?? 0);
    }
  }
}

function attachmentsInOrder(
  attachments: readonly PathAttachment[],
  nodes: Map<string, NodeDefinition>,
  diagnostics: Diagnostic[],
  sceneTimeMs: number,
): PathAttachment[] {
  const byNode = new Map(attachments.map((entry) => [entry.nodeId, entry]));
  const { ready, cyclic } = orderPathAttachments(attachments, (id) => {
    const node = nodes.get(id);
    if (!node) return null;
    const parent = node.transformParentId !== undefined ? node.transformParentId : node.parentId;
    return parent ?? null;
  });
  if (cyclic.length > 0) {
    diagnostics.push(
      attachmentDiagnostic(
        "CYCLE",
        `Path attachments ${cyclic.join(", ")} depend on each other's transforms and were left authored.`,
        sceneTimeMs,
      ),
    );
  }
  return ready.flatMap((id) => {
    const entry = byNode.get(id);
    return entry ? [entry] : [];
  });
}

function hierarchySpace(nodes: Map<string, NodeDefinition>, id: string): "world" | "screen" | "cycle" | "missing" {
  const seen = new Set<string>();
  let current = nodes.get(id);
  if (!current) return "missing";
  while (current) {
    if (seen.has(current.id)) return "cycle";
    seen.add(current.id);
    if (!current.parentId) return current.space === "screen" ? "screen" : "world";
    const parent = nodes.get(current.parentId);
    if (!parent) return "missing";
    current = parent;
  }
  return "missing";
}

function worldMatrix(
  nodes: Map<string, NodeDefinition>,
  poses: Map<string, NodePose>,
  id: string,
  stack: string[] = [],
): { matrix: Mat3 } | { error: "missing" | "cycle" } {
  if (stack.includes(id)) return { error: "cycle" };
  const node = nodes.get(id);
  const pose = poses.get(id);
  if (!node || !pose) return { error: "missing" };
  const parentId = node.transformParentId !== undefined ? node.transformParentId : node.parentId;
  let parent: Mat3 = IDENTITY;
  if (parentId) {
    const resolved = worldMatrix(nodes, poses, parentId, [...stack, id]);
    if ("error" in resolved) return resolved;
    parent = resolved.matrix;
  }
  return {
    matrix: multiplyMat3(
      parent,
      localMatrix({ position: pose.position, pivot: pose.pivot, rotation: pose.rotation, scale: pose.scale }),
    ),
  };
}

function transformedTangent(matrix: Mat3, origin: Vec2, angle: number): number | undefined {
  const ahead = transformPoint(matrix, origin.x + Math.cos(angle), origin.y + Math.sin(angle));
  const at = transformPoint(matrix, origin.x, origin.y);
  const vx = ahead.x - at.x;
  const vy = ahead.y - at.y;
  if (!Number.isFinite(vx) || !Number.isFinite(vy) || Math.hypot(vx, vy) < 1e-8) return undefined;
  return Math.atan2(vy, vx);
}

function attachmentDiagnostic(code: Diagnostic["code"], message: string, sceneTimeMs: number): Diagnostic {
  return diagnostic({
    code,
    phase: "runtime",
    category: code === "RUNTIME_DEGRADED" ? "runtime" : "reference",
    severity: "warning",
    effect: "RUNTIME_DEGRADED",
    recovery: "Leave this traveller at its authored pose for this sample.",
    message,
    path: "pathAttachments",
    sceneTimeMs,
  });
}

function nodePose(node: NodeDefinition): NodePose {
  return {
    position: { ...node.transform.position },
    pivot: { ...node.transform.pivot },
    rotation: node.transform.rotation,
    scale: { ...node.transform.scale },
    opacity: node.opacity,
    visible: node.visible,
  };
}

function applyNodePose(node: NodeDefinition, pose: NodePose): NodeDefinition {
  const transform: Transform = {
    position: { ...pose.position },
    pivot: { ...pose.pivot },
    rotation: pose.rotation,
    scale: { ...pose.scale },
  };
  let posed: NodeDefinition =
    node.kind === "path" && pose.commands
      ? {
          ...node,
          transform,
          opacity: pose.opacity,
          visible: pose.visible,
          commands: pose.commands.map((command) => ({ ...command })),
        }
      : { ...node, transform, opacity: pose.opacity, visible: pose.visible };
  if (posed.kind === "text") {
    if (posed.numeric) {
      const value = pose.textNumber ?? posed.numeric.value;
      posed = {
        ...posed,
        content: resolveNumericContent(value, posed.numeric.format),
      };
    } else if (pose.content !== undefined) {
      posed = { ...posed, content: pose.content };
    }
  }
  return applyPaintPose(posed, pose);
}

function applyPaintPose(node: NodeDefinition, pose: NodePose): NodeDefinition {
  let next: NodeDefinition = node;
  if ("fill" in next && next.fill?.type === "solid") {
    const hasFill =
      pose.fillR !== undefined ||
      pose.fillG !== undefined ||
      pose.fillB !== undefined ||
      pose.fillA !== undefined;
    if (hasFill) {
      next = {
        ...next,
        fill: {
          type: "solid",
          r: pose.fillR ?? next.fill.r,
          g: pose.fillG ?? next.fill.g,
          b: pose.fillB ?? next.fill.b,
          a: pose.fillA ?? next.fill.a,
        },
      };
    }
  }
  if ("stroke" in next && next.stroke) {
    const stroke = next.stroke;
    const hasStrokeColor =
      pose.strokeR !== undefined ||
      pose.strokeG !== undefined ||
      pose.strokeB !== undefined ||
      pose.strokeA !== undefined;
    const hasWidth = pose.strokeWidth !== undefined;
    const hasPhase = pose.strokePhase !== undefined;
    if (hasStrokeColor || hasWidth || hasPhase) {
      const color =
        hasStrokeColor && stroke.color.type === "solid"
          ? {
              type: "solid" as const,
              r: pose.strokeR ?? stroke.color.r,
              g: pose.strokeG ?? stroke.color.g,
              b: pose.strokeB ?? stroke.color.b,
              a: pose.strokeA ?? stroke.color.a,
            }
          : stroke.color;
      next = {
        ...next,
        stroke: {
          ...stroke,
          color,
          width: pose.strokeWidth ?? stroke.width,
          ...(hasPhase ? { phase: pose.strokePhase } : {}),
        },
      };
    }
  }
  return next;
}

function selectWriter(
  scene: SceneIR,
  writers: readonly Writer[],
  sceneTimeMs: number,
  excludeStartsAtMs?: number,
): { track: TrackDefinition; mode: "active" | "hold" } | undefined {
  const timed = writers.flatMap((writer) => {
    const local = trackLocalTime(scene, writer.track, sceneTimeMs);
    return local === undefined ? [] : [{ ...writer, local }];
  });
  const visible =
    excludeStartsAtMs === sceneTimeMs
      ? timed.filter((writer) => {
          const frontier = trackLocalTime(scene, writer.track, excludeStartsAtMs);
          return frontier === undefined || writer.track.startMs !== frontier;
        })
      : timed;
  const active = visible.filter(
    (writer) => writer.local >= writer.track.startMs && writer.local < writer.track.startMs + writer.track.durationMs,
  );
  if (active.length > 0) {
    active.sort((a, b) => a.track.startMs - b.track.startMs || writerOrder(a) - writerOrder(b) || a.index - b.index);
    const winner = active[active.length - 1];
    return winner ? { track: winner.track, mode: "active" } : undefined;
  }
  const holds = visible.filter(
    (writer) => writer.track.fill.after === "forwards" && writer.local >= writer.track.startMs + writer.track.durationMs,
  );
  if (holds.length === 0) return undefined;
  holds.sort(
    (a, b) =>
      a.track.startMs + a.track.durationMs - (b.track.startMs + b.track.durationMs) ||
      writerOrder(a) - writerOrder(b) ||
      a.index - b.index,
  );
  const winner = holds[holds.length - 1];
  return winner ? { track: winner.track, mode: "hold" } : undefined;
}

function writerOrder(writer: Writer): number {
  return writer.track.kind === "keyframe" && writer.track.composition ? writer.track.composition.order : writer.index;
}

function trackLocalTime(scene: SceneIR, track: TrackDefinition, rootMs: number): number | undefined {
  if (!track.timingScopeId) return rootMs;
  return localTimeMs(scene.timingScopes ?? [], track.timingScopeId, rootMs);
}

function sampleTrack(
  scene: SceneIR,
  track: TrackDefinition,
  mode: "active" | "hold",
  sceneTimeMs: number,
  diagnostics: Diagnostic[],
): number | Vec2 | undefined {
  const local = trackLocalTime(scene, track, sceneTimeMs);
  if (local === undefined) return undefined;
  const progress = mode === "hold" ? 1 : (local - track.startMs) / track.durationMs;
  const value = track.kind === "keyframe" ? sampleKeyframes(track, progress) : sampleExpression(track, progress, sceneTimeMs, diagnostics);
  if (value === undefined) return undefined;
  const spec = channelSpec(track.target);
  if (!isValidSample(spec.type, track.target.channel, value)) {
    diagnostics.push(degraded(track, sceneTimeMs, "value is outside the channel domain"));
    return undefined;
  }
  return value;
}

function samplePathTrack(
  scene: SceneIR,
  track: KeyframeTrack,
  mode: "active" | "hold",
  sceneTimeMs: number,
  diagnostics: Diagnostic[],
): PathCommand[] | undefined {
  const local = trackLocalTime(scene, track, sceneTimeMs);
  if (local === undefined) return undefined;
  const progress = mode === "hold" ? 1 : (local - track.startMs) / track.durationMs;
  const value = samplePathKeyframes(track, progress);
  if (value === undefined) {
    diagnostics.push(degraded(track, sceneTimeMs, "path morph topology mismatch"));
    return undefined;
  }
  if (!isValidSample("path", "commands", value)) {
    diagnostics.push(degraded(track, sceneTimeMs, "value is outside the channel domain"));
    return undefined;
  }
  return value;
}

function sampleKeyframes(track: KeyframeTrack, progress: number): number | Vec2 | undefined {
  const keys = track.keyframes;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return undefined;
  // Hold the last authored key once progress reaches or passes it (including early-ending lists).
  if (progress >= 1 || progress >= last.offset) {
    return typeof last.value === "number" || (!Array.isArray(last.value) && "x" in last.value) ? last.value : undefined;
  }
  let segment = 0;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const next = keys[index + 1];
    if (next && progress < next.offset) {
      segment = index;
      break;
    }
  }
  const from = keys[segment];
  const to = keys[segment + 1] ?? last;
  if (!from) return undefined;
  if (Array.isArray(from.value) || Array.isArray(to.value)) return undefined;
  const span = to.offset - from.offset;
  const local = span === 0 ? 0 : (progress - from.offset) / span;
  const eased = applySegmentEasing(from.easing ?? "linear", local);
  if (typeof from.value === "number" && typeof to.value === "number") return lerp(from.value, to.value, eased);
  if (typeof from.value === "number" || typeof to.value === "number") return undefined;
  if (from.spatial) {
    const c1 = { x: from.value.x + from.spatial.out.x, y: from.value.y + from.spatial.out.y };
    const c2 = { x: to.value.x + from.spatial.in.x, y: to.value.y + from.spatial.in.y };
    return spatialCubicPoint(eased, from.value, c1, c2, to.value, undefined, {
      c1z: from.spatial.out.z ?? 0,
      c2z: from.spatial.in.z ?? 0,
    });
  }
  return lerpVec2(from.value, to.value, eased);
}

function samplePathKeyframes(track: KeyframeTrack, progress: number): PathCommand[] | undefined {
  const keys = track.keyframes;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last || !Array.isArray(first.value) || !Array.isArray(last.value)) return undefined;
  if (progress >= 1 || progress >= last.offset) return last.value.map((command) => ({ ...command }));
  let segment = 0;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const next = keys[index + 1];
    if (next && progress < next.offset) {
      segment = index;
      break;
    }
  }
  const from = keys[segment];
  const to = keys[segment + 1] ?? last;
  if (!from || !Array.isArray(from.value) || !Array.isArray(to.value)) return undefined;
  const span = to.offset - from.offset;
  const local = span === 0 ? 0 : (progress - from.offset) / span;
  const eased = applySegmentEasing(from.easing ?? "linear", local);
  return lerpPathCommands(from.value, to.value, eased);
}

function sampleExpression(
  track: Extract<TrackDefinition, { kind: "expression" }>,
  progress: number,
  sceneTimeMs: number,
  diagnostics: Diagnostic[],
): number | undefined {
  const localT = (progress * track.durationMs) / 1000;
  const result = evaluateExpression(track.ast, {
    t: sceneTimeMs / 1000,
    localT,
    progress,
  });
  if (!result.ok) {
    diagnostics.push(degraded(track, sceneTimeMs, result.reason));
    return undefined;
  }
  return result.value;
}

function component(value: number | Vec2, scalar: string): number {
  if (typeof value === "number") return value;
  return scalar.endsWith(".y") ? value.y : value.x;
}

function writeScalar(
  scalar: string,
  value: number,
  nodes: Map<string, NodePose>,
  camera: CameraPose,
): void {
  const [kind, id, ...rest] = scalar.split(":");
  const channel = rest.join(":");
  if (kind === "camera") {
    writeCamera(camera, channel, value);
    return;
  }
  if (!id) return;
  const pose = nodes.get(id);
  if (!pose) return;
  writeNode(pose, channel, value);
}

function writeNode(pose: NodePose, channel: string, value: number): void {
  switch (channel) {
    case "transform.position.x":
      pose.position.x = value;
      break;
    case "transform.position.y":
      pose.position.y = value;
      break;
    case "transform.rotation":
      pose.rotation = value;
      break;
    case "transform.scale.x":
      pose.scale.x = value;
      break;
    case "transform.scale.y":
      pose.scale.y = value;
      break;
    case "transform.pivot.x":
      pose.pivot.x = value;
      break;
    case "transform.pivot.y":
      pose.pivot.y = value;
      break;
    case "opacity":
      pose.opacity = value;
      break;
    case "trim.start":
      pose.trimStart = value;
      break;
    case "trim.end":
      pose.trimEnd = value;
      break;
    case "trim.offset":
      pose.trimOffset = value;
      break;
    case "path.progress":
      pose.pathProgress = value;
      break;
    case "text.number":
      pose.textNumber = value;
      break;
    case "fill.r":
      pose.fillR = value;
      break;
    case "fill.g":
      pose.fillG = value;
      break;
    case "fill.b":
      pose.fillB = value;
      break;
    case "fill.a":
      pose.fillA = value;
      break;
    case "stroke.r":
      pose.strokeR = value;
      break;
    case "stroke.g":
      pose.strokeG = value;
      break;
    case "stroke.b":
      pose.strokeB = value;
      break;
    case "stroke.a":
      pose.strokeA = value;
      break;
    case "stroke.width":
      pose.strokeWidth = value;
      break;
    case "stroke.phase":
      pose.strokePhase = value;
      break;
    default:
      break;
  }
}

function writeCamera(pose: CameraPose, channel: string, value: number): void {
  switch (channel) {
    case "position.x":
      pose.position.x = value;
      break;
    case "position.y":
      pose.position.y = value;
      break;
    case "zoom":
      pose.zoom = value;
      break;
    case "rotation":
      pose.rotation = value;
      break;
    default:
      break;
  }
}

function degraded(track: TrackDefinition, sceneTimeMs: number, detail: string): Diagnostic {
  const spec = channelSpec(track.target);
  const target =
    track.target.kind === "node"
      ? `${track.target.nodeId}.${spec.dslPath}`
      : `camera(${track.target.cameraId}).${spec.dslPath}`;
  return diagnostic({
    code: "RUNTIME_DEGRADED",
    phase: "runtime",
    category: "runtime",
    severity: "warning",
    effect: "RUNTIME_DEGRADED",
    recovery: "Substitute the authored base for this sample only. Keep the track enabled.",
    message: `${target} at ${sceneTimeMs}ms is an invalid sample (${detail}).`,
    target,
    sceneTimeMs,
  });
}
