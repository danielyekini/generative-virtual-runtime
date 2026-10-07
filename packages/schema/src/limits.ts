/**
 * Prototype resource budgets from the V1 design.
 * Profile before treating any number as a permanent performance claim.
 * Queue and source budgets are configuration for later stages; the IR
 * validator enforces the scene, geometry, and expression budgets.
 */
export interface ResourceLimits {
  /** Finite programme length. Default 30 seconds. */
  maxDurationMs: number;
  maxNodes: number;
  /** Root depth is 1. A chain of this many nodes is still valid. */
  maxDepth: number;
  maxTracks: number;
  maxSteps: number;
  /** Path commands plus polygon vertices, summed across the scene. */
  maxGeometryItems: number;
  maxExpressionDepth: number;
  maxExpressionOps: number;
  /** Decoded MotionScript source for one generation. */
  maxSourceBytes: number;
  /** One buffered syntactic unit. */
  maxBufferedUnitBytes: number;
  maxDeferredUnits: number;
  maxQueuedDeltas: number;
  maxTransportQueue: number;
  /** Provisional generated-timeline cushion before playback handoff. */
  startupBufferMs: number;
  /** Cap on extra delay between readiness and generated playback. */
  transitionCapMs: number;
}

export const DEFAULT_LIMITS: ResourceLimits = {
  maxDurationMs: 30_000,
  maxNodes: 500,
  maxDepth: 16,
  maxTracks: 1000,
  maxSteps: 1000,
  maxGeometryItems: 10_000,
  maxExpressionDepth: 32,
  maxExpressionOps: 256,
  maxSourceBytes: 512 * 1024,
  maxBufferedUnitBytes: 128 * 1024,
  maxDeferredUnits: 100,
  maxQueuedDeltas: 256,
  maxTransportQueue: 256,
  startupBufferMs: 750,
  transitionCapMs: 250,
};

export function resolveLimits(overrides?: Partial<ResourceLimits>): ResourceLimits {
  return { ...DEFAULT_LIMITS, ...overrides };
}
