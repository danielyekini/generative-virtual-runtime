/**
 * E011 planar 2D physics prototype. See docs/decisions/engine/physics-integration.md.
 *
 * Simulation is fixed-step in the E010 world/layer XY plane. Bodies write only
 * physics-owned channels. Checkpoints + event log support seek/replay. No
 * MotionScript / Scene IR syntax is claimed here.
 */

export type PhysicsBodyKind = "static" | "kinematic" | "dynamic";
export type PhysicsCollider =
  | { kind: "circle"; radius: number }
  | { kind: "aabb"; halfWidth: number; halfHeight: number };

export interface PhysicsBody {
  id: string;
  /** Entity that receives channel writes (defaults to id). */
  entityId?: string;
  kind: PhysicsBodyKind;
  x: number;
  y: number;
  /** Radians. */
  angle: number;
  /** Linear velocity in units / second. */
  vx: number;
  vy: number;
  /** Angular velocity in radians / second. */
  omega: number;
  /** Mass in arbitrary units; ignored for static/kinematic. */
  mass: number;
  restitution: number;
  friction: number;
  collider: PhysicsCollider;
  /** Optional E010 planar surface attachment (presentation only). */
  surfaceId?: string;
}

export interface PhysicsDistanceJoint {
  id: string;
  bodyA: string;
  bodyB: string;
  anchorA?: { x: number; y: number };
  anchorB?: { x: number; y: number };
  restLength: number;
  /** 0 = hard, 1 = soft (default 0.2). */
  compliance?: number;
}

export interface AuthoredDistanceConstraint {
  id: string;
  /** Point ids in the positions map. */
  a: string;
  b: string;
  restLength: number;
  /** 0..1 fraction of error corrected per pass (default 1). */
  stiffness?: number;
}

export type PhysicsChannel = "transform.x" | "transform.y" | "transform.rotation";

export const PHYSICS_CHANNELS: readonly PhysicsChannel[] = [
  "transform.x",
  "transform.y",
  "transform.rotation",
];

export type PhysicsOwnership = (entityId: string, channel: PhysicsChannel, sceneTimeMs: number) => boolean;

export type PhysicsDiagnosticCode =
  | "PHYSICS_BODY_LIMIT"
  | "PHYSICS_JOINT_LIMIT"
  | "PHYSICS_DUPLICATE_BODY"
  | "PHYSICS_DUPLICATE_JOINT"
  | "PHYSICS_UNKNOWN_BODY"
  | "PHYSICS_STEP_CLAMP"
  | "PHYSICS_OWNERSHIP_REJECTED"
  | "PHYSICS_DISPOSED";

export interface PhysicsDiagnostic {
  code: PhysicsDiagnosticCode;
  message: string;
  bodyId?: string;
  jointId?: string;
  channel?: PhysicsChannel;
}

export interface PhysicsWrite {
  entityId: string;
  channel: PhysicsChannel;
  value: number;
}

export interface PhysicsCost {
  bodies: number;
  joints: number;
  steps: number;
  contacts: number;
  wallMs: number;
}

export type PhysicsEvent =
  | { type: "force"; bodyId: string; fx: number; fy: number; atMs: number }
  | { type: "beginDrag"; bodyId: string; atMs: number }
  | { type: "dragTo"; bodyId: string; x: number; y: number; atMs: number }
  | { type: "endDrag"; bodyId: string; atMs: number };

export interface PhysicsSnapshot {
  sceneTimeMs: number;
  accumulatorMs: number;
  seed: number;
  bodies: readonly PhysicsBody[];
  joints: readonly PhysicsDistanceJoint[];
  events: readonly PhysicsEvent[];
  dragKind: Readonly<Record<string, PhysicsBodyKind>>;
}

export interface PhysicsSessionOptions {
  fixedDtMs?: number;
  maxStepsPerAdvance?: number;
  maxBodies?: number;
  maxJoints?: number;
  maxContactsPerStep?: number;
  maxSolverIterations?: number;
  gravity?: { x: number; y: number };
  seed?: number;
  ownership?: PhysicsOwnership;
}

interface InternalBody extends PhysicsBody {
  entityId: string;
  invMass: number;
  invInertia: number;
}

const DEFAULTS = {
  fixedDtMs: 1000 / 60,
  maxStepsPerAdvance: 8,
  maxBodies: 256,
  maxJoints: 256,
  maxContactsPerStep: 1024,
  maxSolverIterations: 8,
  gravity: { x: 0, y: 980 },
  seed: 1,
} as const;

function cloneBody(body: PhysicsBody): PhysicsBody {
  return {
    ...body,
    collider: { ...body.collider },
  };
}

function inertiaOf(body: PhysicsBody): number {
  if (body.kind !== "dynamic" || !(body.mass > 0)) return Infinity;
  if (body.collider.kind === "circle") {
    const r = body.collider.radius;
    return 0.5 * body.mass * r * r;
  }
  const { halfWidth: hx, halfHeight: hy } = body.collider;
  return (body.mass / 12) * (4 * hx * hx + 4 * hy * hy);
}

function toInternal(body: PhysicsBody): InternalBody {
  const entityId = body.entityId ?? body.id;
  const invMass = body.kind === "dynamic" && body.mass > 0 ? 1 / body.mass : 0;
  const inertia = inertiaOf(body);
  const invInertia = Number.isFinite(inertia) && inertia > 0 ? 1 / inertia : 0;
  return { ...cloneBody(body), entityId, invMass, invInertia };
}

function worldAnchor(body: InternalBody, local: { x: number; y: number } | undefined): { x: number; y: number } {
  const lx = local?.x ?? 0;
  const ly = local?.y ?? 0;
  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  return { x: body.x + c * lx - s * ly, y: body.y + s * lx + c * ly };
}

function extent(body: InternalBody): { minX: number; minY: number; maxX: number; maxY: number } {
  if (body.collider.kind === "circle") {
    const r = body.collider.radius;
    return { minX: body.x - r, minY: body.y - r, maxX: body.x + r, maxY: body.y + r };
  }
  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  const { halfWidth: hx, halfHeight: hy } = body.collider;
  const corners = [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy },
  ].map((p) => ({ x: body.x + c * p.x - s * p.y, y: body.y + s * p.x + c * p.y }));
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}

interface Contact {
  a: string;
  b: string;
  nx: number;
  ny: number;
  penetration: number;
  px: number;
  py: number;
}

function circleCircle(a: InternalBody, b: InternalBody): Contact | undefined {
  if (a.collider.kind !== "circle" || b.collider.kind !== "circle") return undefined;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const r = a.collider.radius + b.collider.radius;
  if (dist >= r || dist <= 1e-9) return undefined;
  const nx = dx / dist;
  const ny = dy / dist;
  return {
    a: a.id,
    b: b.id,
    nx,
    ny,
    penetration: r - dist,
    px: a.x + nx * a.collider.radius,
    py: a.y + ny * a.collider.radius,
  };
}

function aabbAabb(a: InternalBody, b: InternalBody): Contact | undefined {
  // Axis-aligned only when both angles are ~0; otherwise fall back to extent overlap.
  const ea = extent(a);
  const eb = extent(b);
  const overlapX = Math.min(ea.maxX, eb.maxX) - Math.max(ea.minX, eb.minX);
  const overlapY = Math.min(ea.maxY, eb.maxY) - Math.max(ea.minY, eb.minY);
  if (overlapX <= 0 || overlapY <= 0) return undefined;
  if (overlapX < overlapY) {
    const nx = a.x < b.x ? -1 : 1;
    return {
      a: a.id,
      b: b.id,
      nx,
      ny: 0,
      penetration: overlapX,
      px: nx < 0 ? ea.minX : ea.maxX,
      py: (Math.max(ea.minY, eb.minY) + Math.min(ea.maxY, eb.maxY)) / 2,
    };
  }
  const ny = a.y < b.y ? -1 : 1;
  return {
    a: a.id,
    b: b.id,
    nx: 0,
    ny,
    penetration: overlapY,
    px: (Math.max(ea.minX, eb.minX) + Math.min(ea.maxX, eb.maxX)) / 2,
    py: ny < 0 ? ea.minY : ea.maxY,
  };
}

function circleAabb(circle: InternalBody, box: InternalBody): Contact | undefined {
  if (circle.collider.kind !== "circle" || box.collider.kind !== "aabb") return undefined;
  const cos = Math.cos(box.angle);
  const sin = Math.sin(box.angle);
  const dx = circle.x - box.x;
  const dy = circle.y - box.y;
  // Localise into box space (inverse rotation).
  const lx = cos * dx + sin * dy;
  const ly = -sin * dx + cos * dy;
  const { halfWidth: hx, halfHeight: hy } = box.collider;
  const cx = Math.max(-hx, Math.min(hx, lx));
  const cy = Math.max(-hy, Math.min(hy, ly));
  const ox = lx - cx;
  const oy = ly - cy;
  const dist = Math.hypot(ox, oy);

  // Normal is from circle (a) toward box (b), matching circleCircle.
  const toWorld = (nx: number, ny: number) => ({
    nx: cos * nx - sin * ny,
    ny: sin * nx + cos * ny,
  });

  if (Math.abs(lx) <= hx && Math.abs(ly) <= hy && dist <= 1e-9) {
    // Centre inside AABB: push out along smallest axis, then invert to a→b.
    const px = hx - Math.abs(lx);
    const py = hy - Math.abs(ly);
    let outX = 0;
    let outY = 0;
    let pen = 0;
    if (px < py) {
      outX = lx < 0 ? -1 : 1;
      pen = px + circle.collider.radius;
    } else {
      outY = ly < 0 ? -1 : 1;
      pen = py + circle.collider.radius;
    }
    const world = toWorld(-outX, -outY);
    return {
      a: circle.id,
      b: box.id,
      nx: world.nx,
      ny: world.ny,
      penetration: pen,
      px: circle.x + world.nx * circle.collider.radius,
      py: circle.y + world.ny * circle.collider.radius,
    };
  }
  if (dist >= circle.collider.radius || dist <= 1e-9) return undefined;
  // Vector from closest surface point to circle centre is outward from box;
  // invert for a(circle) → b(box).
  const world = toWorld(-(ox / dist), -(oy / dist));
  return {
    a: circle.id,
    b: box.id,
    nx: world.nx,
    ny: world.ny,
    penetration: circle.collider.radius - dist,
    px: circle.x + world.nx * circle.collider.radius,
    py: circle.y + world.ny * circle.collider.radius,
  };
}

function findContact(a: InternalBody, b: InternalBody): Contact | undefined {
  if (a.collider.kind === "circle" && b.collider.kind === "circle") return circleCircle(a, b);
  if (a.collider.kind === "aabb" && b.collider.kind === "aabb") return aabbAabb(a, b);
  if (a.collider.kind === "circle" && b.collider.kind === "aabb") return circleAabb(a, b);
  if (a.collider.kind === "aabb" && b.collider.kind === "circle") {
    const c = circleAabb(b, a);
    if (!c) return undefined;
    return { ...c, a: a.id, b: b.id, nx: -c.nx, ny: -c.ny };
  }
  return undefined;
}

/**
 * Pure authored distance constraints (no momentum). Strongest non-dynamic
 * alternative retained for Counter-style rigs.
 */
export function solveAuthoredConstraints(
  points: ReadonlyMap<string, { x: number; y: number }>,
  constraints: readonly AuthoredDistanceConstraint[],
  passes = 4,
): Map<string, { x: number; y: number }> {
  const keyed = new Map([...points.entries()].map(([id, p]) => [id, { ...p }]));
  for (let pass = 0; pass < passes; pass += 1) {
    for (const constraint of constraints) {
      const pa = keyed.get(constraint.a);
      const pb = keyed.get(constraint.b);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1e-9) continue;
      const stiffness = constraint.stiffness ?? 1;
      const frac = ((dist - constraint.restLength) / dist) * 0.5 * stiffness;
      const ox = dx * frac;
      const oy = dy * frac;
      keyed.set(constraint.a, { x: pa.x + ox, y: pa.y + oy });
      keyed.set(constraint.b, { x: pb.x - ox, y: pb.y - oy });
    }
  }
  return keyed;
}

export class PhysicsSession {
  private readonly fixedDtMs: number;
  private readonly maxStepsPerAdvance: number;
  private readonly maxBodies: number;
  private readonly maxJoints: number;
  private readonly maxContactsPerStep: number;
  private readonly maxSolverIterations: number;
  private readonly gravity: { x: number; y: number };
  private seed: number;
  private ownership: PhysicsOwnership;
  private bodies = new Map<string, InternalBody>();
  private joints = new Map<string, PhysicsDistanceJoint>();
  private events: PhysicsEvent[] = [];
  private dragKind = new Map<string, PhysicsBodyKind>();
  private sceneTimeMs = 0;
  private accumulatorMs = 0;
  private disposed = false;
  private diagnostics: PhysicsDiagnostic[] = [];
  private lastCost: PhysicsCost = { bodies: 0, joints: 0, steps: 0, contacts: 0, wallMs: 0 };
  private lastWrites: PhysicsWrite[] = [];

  constructor(options: PhysicsSessionOptions = {}) {
    this.fixedDtMs = options.fixedDtMs ?? DEFAULTS.fixedDtMs;
    this.maxStepsPerAdvance = options.maxStepsPerAdvance ?? DEFAULTS.maxStepsPerAdvance;
    this.maxBodies = options.maxBodies ?? DEFAULTS.maxBodies;
    this.maxJoints = options.maxJoints ?? DEFAULTS.maxJoints;
    this.maxContactsPerStep = options.maxContactsPerStep ?? DEFAULTS.maxContactsPerStep;
    this.maxSolverIterations = options.maxSolverIterations ?? DEFAULTS.maxSolverIterations;
    this.gravity = options.gravity ?? { ...DEFAULTS.gravity };
    this.seed = options.seed ?? DEFAULTS.seed;
    this.ownership = options.ownership ?? (() => true);
  }

  get seedValue(): number {
    return this.seed;
  }

  get timeMs(): number {
    return this.sceneTimeMs;
  }

  get lastDiagnostics(): readonly PhysicsDiagnostic[] {
    return this.diagnostics;
  }

  get cost(): PhysicsCost {
    return this.lastCost;
  }

  get writes(): readonly PhysicsWrite[] {
    return this.lastWrites;
  }

  get eventLog(): readonly PhysicsEvent[] {
    return this.events;
  }

  setOwnership(ownership: PhysicsOwnership): void {
    this.ensureOpen();
    this.ownership = ownership;
  }

  addBody(body: PhysicsBody): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    if (this.bodies.has(body.id)) {
      return this.note({ code: "PHYSICS_DUPLICATE_BODY", message: `duplicate body ${body.id}`, bodyId: body.id });
    }
    if (this.bodies.size >= this.maxBodies) {
      return this.note({ code: "PHYSICS_BODY_LIMIT", message: `maxBodies ${this.maxBodies}`, bodyId: body.id });
    }
    this.bodies.set(body.id, toInternal(body));
    return undefined;
  }

  addJoint(joint: PhysicsDistanceJoint): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    if (this.joints.has(joint.id)) {
      return this.note({ code: "PHYSICS_DUPLICATE_JOINT", message: `duplicate joint ${joint.id}`, jointId: joint.id });
    }
    if (this.joints.size >= this.maxJoints) {
      return this.note({ code: "PHYSICS_JOINT_LIMIT", message: `maxJoints ${this.maxJoints}`, jointId: joint.id });
    }
    if (!this.bodies.has(joint.bodyA) || !this.bodies.has(joint.bodyB)) {
      return this.note({
        code: "PHYSICS_UNKNOWN_BODY",
        message: `joint ${joint.id} references unknown body`,
        jointId: joint.id,
      });
    }
    this.joints.set(joint.id, { ...joint, anchorA: joint.anchorA ? { ...joint.anchorA } : undefined, anchorB: joint.anchorB ? { ...joint.anchorB } : undefined });
    return undefined;
  }

  body(id: string): PhysicsBody | undefined {
    const body = this.bodies.get(id);
    return body ? cloneBody(body) : undefined;
  }

  /** Apply an instantaneous impulse (force × Δt) in mass·units/second. */
  applyForce(bodyId: string, fx: number, fy: number, atMs = this.sceneTimeMs): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    const body = this.bodies.get(bodyId);
    if (!body) return this.note({ code: "PHYSICS_UNKNOWN_BODY", message: `unknown body ${bodyId}`, bodyId });
    if (body.kind === "dynamic") {
      body.vx += fx * body.invMass;
      body.vy += fy * body.invMass;
    }
    this.events.push({ type: "force", bodyId, fx, fy, atMs });
    return undefined;
  }

  beginDrag(bodyId: string, atMs = this.sceneTimeMs): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    const body = this.bodies.get(bodyId);
    if (!body) return this.note({ code: "PHYSICS_UNKNOWN_BODY", message: `unknown body ${bodyId}`, bodyId });
    if (!this.dragKind.has(bodyId)) this.dragKind.set(bodyId, body.kind);
    body.kind = "kinematic";
    body.vx = 0;
    body.vy = 0;
    body.omega = 0;
    body.invMass = 0;
    body.invInertia = 0;
    this.events.push({ type: "beginDrag", bodyId, atMs });
    return undefined;
  }

  dragTo(bodyId: string, x: number, y: number, atMs = this.sceneTimeMs): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    const body = this.bodies.get(bodyId);
    if (!body) return this.note({ code: "PHYSICS_UNKNOWN_BODY", message: `unknown body ${bodyId}`, bodyId });
    body.x = x;
    body.y = y;
    body.vx = 0;
    body.vy = 0;
    this.events.push({ type: "dragTo", bodyId, x, y, atMs });
    return undefined;
  }

  endDrag(bodyId: string, atMs = this.sceneTimeMs): PhysicsDiagnostic | undefined {
    this.ensureOpen();
    const body = this.bodies.get(bodyId);
    if (!body) return this.note({ code: "PHYSICS_UNKNOWN_BODY", message: `unknown body ${bodyId}`, bodyId });
    const prior = this.dragKind.get(bodyId) ?? "dynamic";
    this.dragKind.delete(bodyId);
    body.kind = prior;
    const refreshed = toInternal(cloneBody(body));
    this.bodies.set(bodyId, refreshed);
    this.events.push({ type: "endDrag", bodyId, atMs });
    return undefined;
  }

  /**
   * Advance simulation toward `sceneTimeMs` (must be >= current time).
   * Returns channel writes for the resulting poses.
   */
  advance(sceneTimeMs: number): PhysicsWrite[] {
    this.ensureOpen();
    this.diagnostics = [];
    const started = nowMs();
    let steps = 0;
    let contacts = 0;
    if (sceneTimeMs < this.sceneTimeMs) {
      // Seek backward is restore+replay; do not invent reverse integration.
      this.lastWrites = this.collectWrites(sceneTimeMs);
      this.lastCost = {
        bodies: this.bodies.size,
        joints: this.joints.size,
        steps: 0,
        contacts: 0,
        wallMs: nowMs() - started,
      };
      return this.lastWrites;
    }
    this.accumulatorMs += sceneTimeMs - this.sceneTimeMs;
    while (this.accumulatorMs + 1e-9 >= this.fixedDtMs && steps < this.maxStepsPerAdvance) {
      contacts += this.stepOnce(this.fixedDtMs);
      this.accumulatorMs -= this.fixedDtMs;
      this.sceneTimeMs += this.fixedDtMs;
      steps += 1;
    }
    if (this.accumulatorMs + 1e-9 >= this.fixedDtMs) {
      this.note({
        code: "PHYSICS_STEP_CLAMP",
        message: `clamped to ${this.maxStepsPerAdvance} steps; leftover ${this.accumulatorMs.toFixed(2)}ms`,
      });
      // Drop leftover rather than spiral; host should seek via checkpoint for large jumps.
      this.accumulatorMs = 0;
      this.sceneTimeMs = sceneTimeMs;
    } else {
      this.sceneTimeMs = sceneTimeMs;
    }
    this.lastWrites = this.collectWrites(sceneTimeMs);
    this.lastCost = {
      bodies: this.bodies.size,
      joints: this.joints.size,
      steps,
      contacts,
      wallMs: nowMs() - started,
    };
    return this.lastWrites;
  }

  checkpoint(): PhysicsSnapshot {
    this.ensureOpen();
    const dragKind: Record<string, PhysicsBodyKind> = {};
    for (const [id, kind] of this.dragKind) dragKind[id] = kind;
    return {
      sceneTimeMs: this.sceneTimeMs,
      accumulatorMs: this.accumulatorMs,
      seed: this.seed,
      bodies: [...this.bodies.values()].map(cloneBody),
      joints: [...this.joints.values()].map((j) => ({
        ...j,
        anchorA: j.anchorA ? { ...j.anchorA } : undefined,
        anchorB: j.anchorB ? { ...j.anchorB } : undefined,
      })),
      events: this.events.map((e) => ({ ...e })),
      dragKind,
    };
  }

  restore(snapshot: PhysicsSnapshot): void {
    this.ensureOpen();
    this.sceneTimeMs = snapshot.sceneTimeMs;
    this.accumulatorMs = snapshot.accumulatorMs;
    this.seed = snapshot.seed;
    this.bodies = new Map(snapshot.bodies.map((b) => [b.id, toInternal(b)]));
    this.joints = new Map(snapshot.joints.map((j) => [j.id, { ...j }]));
    this.events = snapshot.events.map((e) => ({ ...e }));
    this.dragKind = new Map(Object.entries(snapshot.dragKind));
    this.diagnostics = [];
    this.lastWrites = this.collectWrites(this.sceneTimeMs);
  }

  /**
   * After `restore(checkpoint)`, apply `log` entries after the restored prefix
   * (by index) whose `atMs` ≤ `untilMs`, then advance. Checkpointed events are
   * not re-applied.
   */
  replayFrom(log: readonly PhysicsEvent[], untilMs: number): PhysicsWrite[] {
    this.ensureOpen();
    const startLen = this.events.length;
    for (let i = startLen; i < log.length; i += 1) {
      const event = log[i]!;
      if (event.atMs > untilMs) break;
      if (event.type === "force") {
        const body = this.bodies.get(event.bodyId);
        if (body?.kind === "dynamic") {
          body.vx += event.fx * body.invMass;
          body.vy += event.fy * body.invMass;
        }
        this.events.push({ ...event });
      } else if (event.type === "beginDrag") {
        const body = this.bodies.get(event.bodyId);
        if (body) {
          if (!this.dragKind.has(event.bodyId)) this.dragKind.set(event.bodyId, body.kind);
          body.kind = "kinematic";
          body.vx = 0;
          body.vy = 0;
          body.omega = 0;
          body.invMass = 0;
          body.invInertia = 0;
          this.events.push({ ...event });
        }
      } else if (event.type === "dragTo") {
        const body = this.bodies.get(event.bodyId);
        if (body) {
          body.x = event.x;
          body.y = event.y;
          body.vx = 0;
          body.vy = 0;
          this.events.push({ ...event });
        }
      } else if (event.type === "endDrag") {
        const body = this.bodies.get(event.bodyId);
        if (body) {
          const prior = this.dragKind.get(event.bodyId) ?? "dynamic";
          this.dragKind.delete(event.bodyId);
          body.kind = prior;
          this.bodies.set(event.bodyId, toInternal(cloneBody(body)));
          this.events.push({ ...event });
        }
      }
    }
    return this.advance(untilMs);
  }

  reset(): void {
    this.ensureOpen();
    this.bodies.clear();
    this.joints.clear();
    this.events = [];
    this.dragKind.clear();
    this.sceneTimeMs = 0;
    this.accumulatorMs = 0;
    this.diagnostics = [];
    this.lastWrites = [];
    this.lastCost = { bodies: 0, joints: 0, steps: 0, contacts: 0, wallMs: 0 };
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
  }

  private ensureOpen(): void {
    if (this.disposed) throw new Error("PhysicsSession is disposed.");
  }

  private note(diagnostic: PhysicsDiagnostic): PhysicsDiagnostic {
    this.diagnostics.push(diagnostic);
    return diagnostic;
  }

  private collectWrites(sceneTimeMs: number): PhysicsWrite[] {
    const writes: PhysicsWrite[] = [];
    for (const body of this.bodies.values()) {
      const candidates: PhysicsWrite[] = [
        { entityId: body.entityId, channel: "transform.x", value: body.x },
        { entityId: body.entityId, channel: "transform.y", value: body.y },
        { entityId: body.entityId, channel: "transform.rotation", value: (body.angle * 180) / Math.PI },
      ];
      for (const write of candidates) {
        if (this.ownership(write.entityId, write.channel, sceneTimeMs)) writes.push(write);
        else {
          this.note({
            code: "PHYSICS_OWNERSHIP_REJECTED",
            message: `physics cannot write ${write.entityId}.${write.channel}`,
            bodyId: body.id,
            channel: write.channel,
          });
        }
      }
    }
    return writes;
  }

  private stepOnce(dtMs: number): number {
    const dt = dtMs / 1000;
    for (const body of this.bodies.values()) {
      if (body.kind !== "dynamic") continue;
      body.vx += this.gravity.x * dt;
      body.vy += this.gravity.y * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.omega * dt;
    }

    // Distance joints (position correction + light velocity damping).
    for (const joint of this.joints.values()) {
      const a = this.bodies.get(joint.bodyA);
      const b = this.bodies.get(joint.bodyB);
      if (!a || !b) continue;
      const pa = worldAnchor(a, joint.anchorA);
      const pb = worldAnchor(b, joint.anchorB);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1e-9) continue;
      const compliance = joint.compliance ?? 0.2;
      const corr = ((dist - joint.restLength) / dist) * (1 - compliance) * 0.5;
      const ox = dx * corr;
      const oy = dy * corr;
      const invSum = a.invMass + b.invMass;
      if (invSum <= 0) continue;
      if (a.kind === "dynamic") {
        a.x += ox * (a.invMass / invSum) * 2;
        a.y += oy * (a.invMass / invSum) * 2;
      }
      if (b.kind === "dynamic") {
        b.x -= ox * (b.invMass / invSum) * 2;
        b.y -= oy * (b.invMass / invSum) * 2;
      }
    }

    const list = [...this.bodies.values()];
    let contactCount = 0;
    for (let iter = 0; iter < this.maxSolverIterations; iter += 1) {
      const contacts: Contact[] = [];
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (contacts.length >= this.maxContactsPerStep) break;
          const contact = findContact(list[i]!, list[j]!);
          if (contact) contacts.push(contact);
        }
      }
      if (iter === 0) contactCount = contacts.length;
      if (contacts.length === 0) break;
      for (const contact of contacts) {
        const a = this.bodies.get(contact.a)!;
        const b = this.bodies.get(contact.b)!;
        const invSum = a.invMass + b.invMass;
        if (invSum <= 0) continue;
        const percent = 0.8;
        const corr = (contact.penetration * percent) / invSum;
        if (a.kind === "dynamic") {
          a.x -= contact.nx * corr * a.invMass;
          a.y -= contact.ny * corr * a.invMass;
        }
        if (b.kind === "dynamic") {
          b.x += contact.nx * corr * b.invMass;
          b.y += contact.ny * corr * b.invMass;
        }
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * contact.nx + rvy * contact.ny;
        if (vn > 0) continue;
        const e = Math.min(a.restitution, b.restitution);
        const jImp = (-(1 + e) * vn) / invSum;
        const ix = jImp * contact.nx;
        const iy = jImp * contact.ny;
        if (a.kind === "dynamic") {
          a.vx -= ix * a.invMass;
          a.vy -= iy * a.invMass;
        }
        if (b.kind === "dynamic") {
          b.vx += ix * b.invMass;
          b.vy += iy * b.invMass;
        }
        const tx = -contact.ny;
        const ty = contact.nx;
        const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
        const mu = Math.sqrt(Math.max(0, a.friction * b.friction));
        let jt = -vt / invSum;
        const maxF = mu * Math.abs(jImp);
        jt = Math.max(-maxF, Math.min(maxF, jt));
        if (a.kind === "dynamic") {
          a.vx -= jt * tx * a.invMass;
          a.vy -= jt * ty * a.invMass;
        }
        if (b.kind === "dynamic") {
          b.vx += jt * tx * b.invMass;
          b.vy += jt * ty * b.invMass;
        }
      }
    }
    return contactCount;
  }
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
