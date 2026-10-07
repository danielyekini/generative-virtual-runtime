import type {
  CameraAnimChannel,
  NodeAnimChannel,
  PropertyTarget,
  PropertyType,
} from "./types";

export type AnimationKind = "track" | "step" | "none";

export interface ChannelSpec {
  /** Dotted property path used in MotionScript after the node or camera id. */
  dslPath: string;
  type: PropertyType;
  animation: AnimationKind;
  /** Scalar channels covered by this address. Vec2 addresses cover both components. */
  scalars: readonly string[];
}

export const NODE_CHANNELS: Record<NodeAnimChannel, ChannelSpec> = {
  "transform.position": {
    dslPath: "position",
    type: "vec2",
    animation: "track",
    scalars: ["transform.position.x", "transform.position.y"],
  },
  "transform.position.x": {
    dslPath: "position.x",
    type: "number",
    animation: "track",
    scalars: ["transform.position.x"],
  },
  "transform.position.y": {
    dslPath: "position.y",
    type: "number",
    animation: "track",
    scalars: ["transform.position.y"],
  },
  "transform.rotation": {
    dslPath: "rotation",
    type: "angle",
    animation: "track",
    scalars: ["transform.rotation"],
  },
  "transform.scale": {
    dslPath: "scale",
    type: "vec2",
    animation: "track",
    scalars: ["transform.scale.x", "transform.scale.y"],
  },
  "transform.scale.x": {
    dslPath: "scale.x",
    type: "number",
    animation: "track",
    scalars: ["transform.scale.x"],
  },
  "transform.scale.y": {
    dslPath: "scale.y",
    type: "number",
    animation: "track",
    scalars: ["transform.scale.y"],
  },
  "transform.pivot": {
    dslPath: "pivot",
    type: "vec2",
    animation: "track",
    scalars: ["transform.pivot.x", "transform.pivot.y"],
  },
  "transform.pivot.x": {
    dslPath: "pivot.x",
    type: "number",
    animation: "track",
    scalars: ["transform.pivot.x"],
  },
  "transform.pivot.y": {
    dslPath: "pivot.y",
    type: "number",
    animation: "track",
    scalars: ["transform.pivot.y"],
  },
  opacity: {
    dslPath: "opacity",
    type: "number",
    animation: "track",
    scalars: ["opacity"],
  },
  visible: {
    dslPath: "visible",
    type: "boolean",
    animation: "step",
    scalars: ["visible"],
  },
  commands: {
    dslPath: "commands",
    type: "path",
    animation: "track",
    /** Path tracks are sampled as whole values, not scalar writers. */
    scalars: [],
  },
  "trim.start": {
    dslPath: "trim.start",
    type: "number",
    animation: "track",
    scalars: ["trim.start"],
  },
  "trim.end": {
    dslPath: "trim.end",
    type: "number",
    animation: "track",
    scalars: ["trim.end"],
  },
  "trim.offset": {
    dslPath: "trim.offset",
    type: "number",
    animation: "track",
    scalars: ["trim.offset"],
  },
};

export const CAMERA_CHANNELS: Record<CameraAnimChannel, ChannelSpec> = {
  position: {
    dslPath: "position",
    type: "vec2",
    animation: "track",
    scalars: ["position.x", "position.y"],
  },
  "position.x": {
    dslPath: "position.x",
    type: "number",
    animation: "track",
    scalars: ["position.x"],
  },
  "position.y": {
    dslPath: "position.y",
    type: "number",
    animation: "track",
    scalars: ["position.y"],
  },
  zoom: {
    dslPath: "zoom",
    type: "number",
    animation: "track",
    scalars: ["zoom"],
  },
  rotation: {
    dslPath: "rotation",
    type: "angle",
    animation: "track",
    scalars: ["rotation"],
  },
};

const NODE_BY_DSL = new Map<string, NodeAnimChannel>(
  (Object.entries(NODE_CHANNELS) as [NodeAnimChannel, ChannelSpec][]).map(([channel, spec]) => [
    spec.dslPath,
    channel,
  ]),
);

const CAMERA_BY_DSL = new Map<string, CameraAnimChannel>(
  (Object.entries(CAMERA_CHANNELS) as [CameraAnimChannel, ChannelSpec][]).map(([channel, spec]) => [
    spec.dslPath,
    channel,
  ]),
);

export type AddressResolution =
  | {
      ok: true;
      target: PropertyTarget;
      type: PropertyType;
      animation: AnimationKind;
      scalars: readonly string[];
    }
  | { ok: false; code: "UNSUPPORTED_PROPERTY" | "UNKNOWN_TARGET"; message: string };

/**
 * Resolve a MotionScript address.
 * Node ids may contain dots. The longest registered id that is a segment-aligned
 * prefix wins, and the remainder must be a known property path.
 * Cameras use camera(id).property and do not share the node id namespace.
 */
export function resolveAddress(
  address: string,
  nodeIds: readonly string[],
  cameraIds: readonly string[] = ["main"],
): AddressResolution {
  const camera = /^camera\(([A-Za-z_][A-Za-z0-9_]*)\)\.(.+)$/.exec(address);
  if (camera) {
    const cameraId = camera[1];
    const dslPath = camera[2];
    if (!cameraId || dslPath === undefined) {
      return { ok: false, code: "UNKNOWN_TARGET", message: `Malformed camera address ${address}.` };
    }
    if (!cameraIds.includes(cameraId)) {
      return { ok: false, code: "UNKNOWN_TARGET", message: `Unknown camera ${cameraId}.` };
    }
    const channel = CAMERA_BY_DSL.get(dslPath);
    if (!channel) {
      return {
        ok: false,
        code: "UNSUPPORTED_PROPERTY",
        message: `Camera property ${dslPath} is not animatable.`,
      };
    }
    const spec = CAMERA_CHANNELS[channel];
    return {
      ok: true,
      target: { kind: "camera", cameraId, channel },
      type: spec.type,
      animation: spec.animation,
      scalars: spec.scalars.map((scalar) => `camera:${cameraId}:${scalar}`),
    };
  }

  const matches = nodeIds
    .filter((id) => address === id || address.startsWith(`${id}.`))
    .sort((a, b) => b.length - a.length);
  const nodeId = matches[0];
  if (!nodeId) {
    return { ok: false, code: "UNKNOWN_TARGET", message: `No node id matches ${address}.` };
  }
  const dslPath = address.slice(nodeId.length + 1);
  if (!dslPath) {
    return {
      ok: false,
      code: "UNSUPPORTED_PROPERTY",
      message: `${nodeId} is a node, not a property.`,
    };
  }
  const channel = NODE_BY_DSL.get(dslPath);
  if (!channel) {
    return {
      ok: false,
      code: "UNSUPPORTED_PROPERTY",
      message: `Property ${dslPath} on ${nodeId} is not a V1 animation target.`,
    };
  }
  const spec = NODE_CHANNELS[channel];
  return {
    ok: true,
    target: { kind: "node", nodeId, channel },
    type: spec.type,
    animation: spec.animation,
    scalars: spec.scalars.map((scalar) => `node:${nodeId}:${scalar}`),
  };
}

export function channelSpec(target: PropertyTarget): ChannelSpec {
  if (target.kind === "node") return NODE_CHANNELS[target.channel];
  return CAMERA_CHANNELS[target.channel];
}

export function scalarWriters(target: PropertyTarget): string[] {
  const spec = channelSpec(target);
  const prefix = target.kind === "node" ? `node:${target.nodeId}` : `camera:${target.cameraId}`;
  return spec.scalars.map((scalar) => `${prefix}:${scalar}`);
}

/** Keyframe and base-value constraint. Expression samples use the same rule at runtime. */
export function isValidSample(type: PropertyType, channel: string, value: unknown): boolean {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "path") return isPathSample(value);
  if (type === "vec2") {
    if (!isVec(value)) return false;
    return Number.isFinite(value.x) && Number.isFinite(value.y);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (channel === "opacity" || channel.endsWith("opacity")) return value >= 0 && value <= 1;
  if (channel === "zoom" || channel.endsWith(".zoom")) return value > 0;
  if (channel === "trim.start" || channel === "trim.end") return value >= 0 && value <= 1;
  if (channel === "trim.offset") return Number.isFinite(value);
  return true;
}

function isPathSample(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  if (!isRecord(first) || first.cmd !== "M") return false;
  return value.every((entry) => {
    if (!isRecord(entry) || typeof entry.cmd !== "string") return false;
    if (entry.cmd === "Z") return true;
    if (entry.cmd === "M" || entry.cmd === "L") {
      return Number.isFinite(entry.x) && Number.isFinite(entry.y);
    }
    if (entry.cmd === "Q") {
      return [entry.cx, entry.cy, entry.x, entry.y].every((n) => typeof n === "number" && Number.isFinite(n));
    }
    if (entry.cmd === "C") {
      return [entry.c1x, entry.c1y, entry.c2x, entry.c2y, entry.x, entry.y].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      );
    }
    return false;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVec(value: unknown): value is { x: number; y: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof (value as { x: unknown }).x === "number" &&
    typeof (value as { y: unknown }).y === "number"
  );
}
