/**
 * Lower Scene IR `physics` (physics.planar2d) onto PhysicsSession / authored constraints.
 */

import {
  diagnostic,
  type Diagnostic,
  type NodeDefinition,
  type PhysicsBodyDefinition,
  type PhysicsWorldDefinition,
  type SceneIR,
} from "@gvr/schema";
import type { SampledScene } from "./sample";
import {
  PHYSICS_CHANNELS,
  PhysicsSession,
  solveAuthoredConstraints,
  type PhysicsChannel,
  type PhysicsDiagnostic,
  type PhysicsOwnership,
  type PhysicsWrite,
  type AuthoredDistanceConstraint,
} from "./physics";

export function declaredPhysicsChannels(world: PhysicsWorldDefinition | undefined): Set<string> {
  const owned = new Set<string>();
  if (!world) return owned;
  for (const body of world.bodies) {
    const entityId = body.entityId ?? body.id;
    for (const channel of PHYSICS_CHANNELS) owned.add(`${entityId}:${channel}`);
  }
  // Authored constraints own position channels of their endpoints.
  if (world.mode === "authored") {
    for (const constraint of world.constraints ?? []) {
      for (const entityId of [constraint.a, constraint.b]) {
        owned.add(`${entityId}:transform.position.x`);
        owned.add(`${entityId}:transform.position.y`);
      }
    }
  }
  return owned;
}

export function physicsOwnershipFromWorld(world: PhysicsWorldDefinition): PhysicsOwnership {
  const owned = declaredPhysicsChannels(world);
  return (entityId, channel) => owned.has(`${entityId}:${channel}`);
}

function toHostBody(body: PhysicsBodyDefinition) {
  return {
    id: body.id,
    ...(body.entityId ? { entityId: body.entityId } : {}),
    kind: body.kind,
    x: body.x,
    y: body.y,
    angle: body.angle,
    vx: body.vx ?? 0,
    vy: body.vy ?? 0,
    omega: body.omega ?? 0,
    mass: body.mass ?? (body.kind === "dynamic" ? 1 : 0),
    restitution: body.restitution ?? 0.2,
    friction: body.friction ?? 0.4,
    collider: { ...body.collider },
    ...(body.surfaceId ? { surfaceId: body.surfaceId } : {}),
  };
}

export interface ScenePhysicsSession {
  mode: "dynamic" | "authored";
  world: PhysicsWorldDefinition;
  /** Present for dynamic mode. */
  session?: PhysicsSession;
  constraints: readonly AuthoredDistanceConstraint[];
  lastWrites: readonly PhysicsWrite[];
  lastDiagnostics: readonly Diagnostic[];
  /** Advance dynamic session or solve authored constraints at sceneTimeMs. */
  advance(sampled: SampledScene, sceneTimeMs: number): PhysicsWrite[];
  /** Apply lastWrites onto a sampled scene (copying touched nodes). */
  applyTo(sampled: SampledScene): SampledScene;
  dispose(): void;
}

/**
 * Build a host physics session from a validated scene's `physics` world.
 * Dynamic mode uses PhysicsSession; authored mode solves distance constraints
 * on entity positions each advance. AnimationRuntime stays pure — hosts call
 * advance + evaluate(..., overlay) or applyTo.
 */
export function createScenePhysicsSession(scene: SceneIR): ScenePhysicsSession | undefined {
  const world = scene.physics;
  if (!world) return undefined;
  const ownership = physicsOwnershipFromWorld(world);
  let session: PhysicsSession | undefined;
  let lastWrites: PhysicsWrite[] = [];
  let lastDiagnostics: Diagnostic[] = [];
  let disposed = false;

  if (world.mode === "dynamic") {
    session = new PhysicsSession({
      ownership,
      ...(world.gravity ? { gravity: { ...world.gravity } } : {}),
      ...(world.fixedDtMs !== undefined ? { fixedDtMs: world.fixedDtMs } : {}),
      ...(world.seed !== undefined ? { seed: world.seed } : {}),
      ...(world.maxBodies !== undefined ? { maxBodies: world.maxBodies } : {}),
      ...(world.maxJoints !== undefined ? { maxJoints: world.maxJoints } : {}),
      ...(world.maxContactsPerStep !== undefined ? { maxContactsPerStep: world.maxContactsPerStep } : {}),
      ...(world.maxSolverIterations !== undefined ? { maxSolverIterations: world.maxSolverIterations } : {}),
      ...(world.maxStepsPerAdvance !== undefined ? { maxStepsPerAdvance: world.maxStepsPerAdvance } : {}),
    });
    for (const body of world.bodies) {
      const error = session.addBody(toHostBody(body));
      if (error) lastDiagnostics.push(physicsToDiagnostic(error));
    }
    for (const joint of world.joints ?? []) {
      const error = session.addJoint({
        id: joint.id,
        bodyA: joint.bodyA,
        bodyB: joint.bodyB,
        restLength: joint.restLength,
        ...(joint.anchorA ? { anchorA: { ...joint.anchorA } } : {}),
        ...(joint.anchorB ? { anchorB: { ...joint.anchorB } } : {}),
        ...(joint.compliance !== undefined ? { compliance: joint.compliance } : {}),
      });
      if (error) lastDiagnostics.push(physicsToDiagnostic(error));
    }
  }

  const constraints: AuthoredDistanceConstraint[] = (world.constraints ?? []).map((constraint) => ({
    id: constraint.id,
    a: constraint.a,
    b: constraint.b,
    restLength: constraint.restLength,
    ...(constraint.stiffness !== undefined ? { stiffness: constraint.stiffness } : {}),
  }));

  const applyWrites = (sampled: SampledScene, writes: readonly PhysicsWrite[]): SampledScene => {
    if (writes.length === 0) return sampled;
    const byEntity = new Map<string, Map<PhysicsChannel, number>>();
    for (const write of writes) {
      let channels = byEntity.get(write.entityId);
      if (!channels) {
        channels = new Map();
        byEntity.set(write.entityId, channels);
      }
      channels.set(write.channel, write.value);
    }
    const nodes = sampled.nodes.map((node) => {
      const channels = byEntity.get(node.id);
      if (!channels) return node;
      const copy: NodeDefinition = {
        ...node,
        transform: {
          ...node.transform,
          position: { ...node.transform.position },
          scale: { ...node.transform.scale },
        },
      };
      for (const [channel, value] of channels) {
        if (channel === "transform.position.x") copy.transform.position.x = value;
        else if (channel === "transform.position.y") copy.transform.position.y = value;
        else if (channel === "transform.rotation") copy.transform.rotation = value;
      }
      return copy;
    });
    return { ...sampled, nodes };
  };

  return {
    mode: world.mode,
    world,
    session,
    constraints,
    get lastWrites() {
      return lastWrites;
    },
    get lastDiagnostics() {
      return lastDiagnostics;
    },
    advance(sampled, sceneTimeMs) {
      if (disposed) throw new Error("ScenePhysicsSession is disposed.");
      lastDiagnostics = [];
      if (world.mode === "dynamic" && session) {
        lastWrites = session.advance(sceneTimeMs);
        lastDiagnostics = session.lastDiagnostics.map(physicsToDiagnostic);
        return lastWrites;
      }
      // Authored: pull current entity positions, solve, emit owned position writes.
      const points = new Map<string, { x: number; y: number }>();
      for (const node of sampled.nodes) {
        points.set(node.id, { x: node.transform.position.x, y: node.transform.position.y });
      }
      const next = solveAuthoredConstraints(points, constraints);
      lastWrites = [];
      for (const [entityId, pose] of next) {
        if (ownership(entityId, "transform.position.x", sceneTimeMs)) {
          lastWrites.push({ entityId, channel: "transform.position.x", value: pose.x });
        }
        if (ownership(entityId, "transform.position.y", sceneTimeMs)) {
          lastWrites.push({ entityId, channel: "transform.position.y", value: pose.y });
        }
      }
      return lastWrites;
    },
    applyTo(sampled) {
      return applyWrites(sampled, lastWrites);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      session?.dispose();
    },
  };
}

function physicsToDiagnostic(item: PhysicsDiagnostic): Diagnostic {
  return diagnostic({
    code: "RUNTIME_DEGRADED",
    phase: "runtime",
    category: "runtime",
    severity: "warning",
    effect: "RUNTIME_DEGRADED",
    recovery: "Continue with physics writes that ownership allows.",
    message: `${item.code}${item.bodyId ? ` ${item.bodyId}` : ""}: ${item.message}`,
  });
}
