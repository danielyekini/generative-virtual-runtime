import {
  buildPathMetrics,
  dashCommands,
  markerSamples,
  rollingAngle,
  sampleAtProgress,
  type PathMetrics,
  type PathSample,
} from "@gvr/schema";
import type { PathCommand } from "@gvr/schema";

export type { PathMetrics, PathSample };

export interface PathAttachment {
  readonly position: { x: number; y: number };
  /** Tangent orientation in radians when `orient` is true; otherwise undefined. */
  readonly rotation?: number;
  readonly progress: number;
  readonly distance: number;
  readonly totalLength: number;
  /**
   * Optional rolling angle from distance/radius. Independent of `rotation`.
   * Authors that need a rolling wheel must request this explicitly — orient alone
   * does not produce it.
   */
  readonly rolling?: number;
}

export interface AttachAlongPathOptions {
  readonly commands: readonly PathCommand[];
  /** Normalised progress in [0, 1]. */
  readonly progress: number;
  /** When true, set `rotation` from the path tangent. */
  readonly orient?: boolean;
  /** When set, compute `rolling` as distance/radius (radians). */
  readonly rollRadius?: number;
}

/**
 * Host-level path attachment for travellers, arrowheads and contacts.
 * The language surface is Scene IR `pathAttachments` / MotionScript `attach`
 * (`geometry.pathProgress`, 0.17.0); `sampleScene` applies them through this helper.
 */
export function attachAlongPath(options: AttachAlongPathOptions): PathAttachment {
  const metrics = buildPathMetrics(options.commands);
  const sample = sampleAtProgress(metrics, options.progress);
  return {
    position: { ...sample.point },
    progress: sample.progress,
    distance: sample.distance,
    totalLength: sample.totalLength,
    ...(options.orient ? { rotation: sample.angle } : {}),
    ...(options.rollRadius !== undefined
      ? { rolling: rollingAngle(sample.distance, options.rollRadius) }
      : {}),
  };
}

/** Convenience: marker samples (progress list) over resolved path commands. */
export function pathMarkers(
  commands: readonly PathCommand[],
  progresses: readonly number[],
): readonly PathSample[] {
  return markerSamples(buildPathMetrics(commands), progresses);
}

/** Geometry-only dash expansion for hosts/prototypes; not a stroke paint claim. */
export function pathDashCommands(
  commands: readonly PathCommand[],
  pattern: readonly number[],
  phase: number = 0,
): PathCommand[] {
  return dashCommands(commands, pattern, phase);
}

export { buildPathMetrics, sampleAtProgress, rollingAngle };
