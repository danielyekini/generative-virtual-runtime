import {
  applySegmentEasing,
  channelSpec,
  diagnostic,
  evaluateExpression,
  isValidSample,
  cubicPoint,
  lerp,
  lerpVec2,
  localTimeMs,
  scalarWriters,
  type Camera2DDefinition,
  type Diagnostic,
  type KeyframeTrack,
  type NodeDefinition,
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
}

interface CameraPose {
  position: Vec2;
  zoom: number;
  rotation: number;
}

export interface SampledScene {
  nodes: NodeDefinition[];
  camera: Camera2DDefinition;
  diagnostics: Diagnostic[];
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
  scene.timeline.tracks.forEach((track, index) => {
    for (const scalar of scalarWriters(track.target)) {
      const list = byScalar.get(scalar) ?? [];
      list.push({ track, index });
      byScalar.set(scalar, list);
    }
  });

  const cache = new Map<string, number | Vec2 | undefined>();
  for (const [scalar, writers] of byScalar) {
    const selected = selectWriter(scene, writers, sceneTimeMs, options?.excludeStartsAtMs);
    if (!selected) continue;
    const cacheKey = `${selected.track.id}:${selected.mode}`;
    let value = cache.get(cacheKey);
    if (!cache.has(cacheKey)) {
      value = sampleTrack(scene, selected.track, selected.mode, sceneTimeMs, diagnostics);
      cache.set(cacheKey, value);
    }
    if (value === undefined) continue;
    writeScalar(scalar, component(value, scalar), nodePoses, cameraPose);
  }

  const steps = [...scene.timeline.steps].sort((a, b) => a.timeMs - b.timeMs);
  const visible = new Map<string, boolean>();
  for (const step of steps) {
    const holdFrontier = options?.excludeStartsAtMs === sceneTimeMs;
    if (step.timeMs < sceneTimeMs || (step.timeMs === sceneTimeMs && !holdFrontier)) {
      visible.set(step.target.nodeId, step.value);
    }
  }
  for (const [id, value] of visible) {
    const pose = nodePoses.get(id);
    if (pose) pose.visible = value;
  }

  return {
    nodes: scene.nodes.map((node) => applyNodePose(node, nodePoses.get(node.id) ?? nodePose(node))),
    camera: { ...cameraSource, ...cameraPose, position: { ...cameraPose.position } },
    diagnostics,
  };
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
  return { ...node, transform, opacity: pose.opacity, visible: pose.visible };
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

function sampleKeyframes(track: KeyframeTrack, progress: number): number | Vec2 | undefined {
  const keys = track.keyframes;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return undefined;
  if (progress >= 1) return last.value;
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
  const span = to.offset - from.offset;
  const local = span === 0 ? 0 : (progress - from.offset) / span;
  const eased = applySegmentEasing(from.easing ?? "linear", local);
  if (typeof from.value === "number" && typeof to.value === "number") return lerp(from.value, to.value, eased);
  if (typeof from.value === "number" || typeof to.value === "number") return undefined;
  if (from.spatial) {
    const c1 = { x: from.value.x + from.spatial.out.x, y: from.value.y + from.spatial.out.y };
    const c2 = { x: to.value.x + from.spatial.in.x, y: to.value.y + from.spatial.in.y };
    return cubicPoint(eased, from.value, c1, c2, to.value);
  }
  return lerpVec2(from.value, to.value, eased);
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
