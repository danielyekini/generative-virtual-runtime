/**
 * Durable entity revisions (entities.durableRevisions / E002–E004).
 * Follows capacity/E001 rules: copy containers, never mutate accepted nested maps.
 */

import type {
  BehaviourId,
  BehaviourRecord,
  ChannelId,
  EntityId,
  EntityPatch,
  EntityPatchOp,
  EntityRecord,
  NodeDefinition,
  OwnershipGrant,
  WriterClass,
} from "@gvr/schema";

export type {
  BehaviourId,
  BehaviourRecord,
  ChannelId,
  EntityId,
  EntityPatch,
  EntityPatchOp,
  EntityRecord,
  OwnershipGrant,
  WriterClass,
};

export type EntityPatchCode =
  | "STALE_REVISION"
  | "SEALED_HISTORY"
  | "UNKNOWN_ENTITY"
  | "OWNERSHIP_CONFLICT"
  | "INVALID_ACTIVATION"
  | "UNKNOWN_BEHAVIOUR"
  | "NODE_CONFLICT";

export interface EntityPatchDiagnostic {
  code: EntityPatchCode;
  message: string;
  path?: string;
}

export interface CompactEntityContext {
  revision: number;
  sealedThroughMs: number;
  entity: EntityRecord | null;
  ownership: OwnershipGrant[];
  behaviours: BehaviourRecord[];
}

interface EntityVersion {
  fromMs: number;
  record: EntityRecord;
}

export interface EntityStoreSnapshot {
  revision: number;
  sealedThroughMs: number;
  entities: Map<EntityId, EntityVersion[]>;
  ownership: OwnershipGrant[];
  behaviours: Map<BehaviourId, BehaviourRecord>;
  /** Late or bound node payloads keyed by entity id (immutable records). */
  nodes: Map<EntityId, NodeDefinition>;
}

function cloneSnapshot(base: EntityStoreSnapshot): EntityStoreSnapshot {
  return {
    revision: base.revision,
    sealedThroughMs: base.sealedThroughMs,
    entities: new Map(
      [...base.entities.entries()].map(([id, versions]) => [
        id,
        versions.map((v) => ({ fromMs: v.fromMs, record: { ...v.record } })),
      ]),
    ),
    ownership: base.ownership.map((grant) => ({ ...grant })),
    behaviours: new Map([...base.behaviours.entries()].map(([id, behaviour]) => [id, { ...behaviour }])),
    nodes: new Map([...base.nodes.entries()].map(([id, node]) => [id, structuredClone(node)])),
  };
}

function overlaps(a: OwnershipGrant, b: OwnershipGrant): boolean {
  if (a.entityId !== b.entityId || a.channel !== b.channel) return false;
  const aEnd = a.untilMs ?? Number.POSITIVE_INFINITY;
  const bEnd = b.untilMs ?? Number.POSITIVE_INFINITY;
  return a.fromMs < bEnd && b.fromMs < aEnd;
}

function fail(code: EntityPatchCode, message: string, path?: string): EntityPatchDiagnostic {
  return { code, message, path };
}

function latestVersion(
  versions: EntityVersion[] | undefined,
  sceneTimeMs: number,
  options?: { excludeStartsAtMs?: number },
): EntityRecord | null {
  if (!versions || versions.length === 0) return null;
  // At an incomplete seal frontier, exclude activations that start on the seal
  // (matches track sampling). Otherwise use inclusive time.
  const exclude = options?.excludeStartsAtMs;
  let chosen: EntityVersion | undefined;
  for (const version of versions) {
    const visible =
      exclude !== undefined && sceneTimeMs === exclude
        ? version.fromMs < exclude
        : version.fromMs <= sceneTimeMs;
    if (visible) chosen = version;
  }
  if (!chosen) return null;
  return chosen.record.present ? { ...chosen.record } : null;
}

function currentRecord(versions: EntityVersion[] | undefined): EntityRecord | null {
  if (!versions || versions.length === 0) return null;
  return { ...versions[versions.length - 1]!.record };
}

function emptySnapshot(): EntityStoreSnapshot {
  return {
    revision: 0,
    sealedThroughMs: 0,
    entities: new Map(),
    ownership: [],
    behaviours: new Map(),
    nodes: new Map(),
  };
}

/**
 * Revision-guarded entity/ownership/behaviour store.
 * Topology and behaviour changes that would alter the sealed presentation prefix
 * are rejected; activation at/after the seal remains allowed and is invisible to
 * the sealed left-limit sample.
 */
export class EntityRevisionStore {
  private accepted: EntityStoreSnapshot = emptySnapshot();
  private pending?: EntityStoreSnapshot;
  private disposed = false;

  get revision(): number {
    return this.accepted.revision;
  }

  get sealedThroughMs(): number {
    return this.accepted.sealedThroughMs;
  }

  /** Export a deep clone for assemble candidates. */
  snapshot(): EntityStoreSnapshot {
    return cloneSnapshot(this.accepted);
  }

  /** Replace accepted state (used when publishing a flushed assemble candidate). */
  restore(snapshot: EntityStoreSnapshot): void {
    if (this.disposed) return;
    this.accepted = cloneSnapshot(snapshot);
    this.pending = undefined;
  }

  /** True when this id has any revisioned entity timeline. */
  tracks(entityId: EntityId): boolean {
    return this.accepted.entities.has(entityId);
  }

  /** Advance the sealed presentation frontier (monotonic). */
  seal(horizonMs: number): EntityPatchDiagnostic | undefined {
    if (this.disposed) return fail("INVALID_ACTIVATION", "Store is disposed.");
    if (!(horizonMs > this.accepted.sealedThroughMs)) {
      return fail("INVALID_ACTIVATION", `Seal must advance past ${this.accepted.sealedThroughMs}ms.`);
    }
    this.accepted = { ...this.accepted, sealedThroughMs: horizonMs };
    this.pending = undefined;
    return undefined;
  }

  /**
   * Validate and stage a patch against accepted (+ pending) state.
   * Does not publish until {@link commit}.
   */
  enqueue(patch: EntityPatch): EntityPatchDiagnostic | undefined {
    if (this.disposed) return fail("INVALID_ACTIVATION", "Store is disposed.");
    const base = this.pending ?? this.accepted;
    if (patch.expectedRevision !== base.revision) {
      return fail(
        "STALE_REVISION",
        `Expected revision ${base.revision}, got ${patch.expectedRevision}.`,
      );
    }
    if (patch.nextRevision !== base.revision + 1) {
      return fail(
        "STALE_REVISION",
        `nextRevision must be ${base.revision + 1}, got ${patch.nextRevision}.`,
      );
    }
    const candidate = cloneSnapshot(base);
    for (const [index, operation] of patch.operations.entries()) {
      const path = `operations[${index}]`;
      const error = this.applyOp(candidate, operation, path);
      if (error) return error;
    }
    candidate.revision = patch.nextRevision;
    this.pending = candidate;
    return undefined;
  }

  /** Apply a patch to a snapshot without mutating this store (assemble path). */
  applyToSnapshot(
    base: EntityStoreSnapshot,
    patch: EntityPatch,
  ): { ok: true; snapshot: EntityStoreSnapshot } | { ok: false; diagnostic: EntityPatchDiagnostic } {
    if (patch.expectedRevision !== base.revision) {
      return {
        ok: false,
        diagnostic: fail(
          "STALE_REVISION",
          `Expected revision ${base.revision}, got ${patch.expectedRevision}.`,
        ),
      };
    }
    if (patch.nextRevision !== base.revision + 1) {
      return {
        ok: false,
        diagnostic: fail(
          "STALE_REVISION",
          `nextRevision must be ${base.revision + 1}, got ${patch.nextRevision}.`,
        ),
      };
    }
    const candidate = cloneSnapshot(base);
    for (const [index, operation] of patch.operations.entries()) {
      const path = `operations[${index}]`;
      const error = this.applyOp(candidate, operation, path);
      if (error) return { ok: false, diagnostic: error };
    }
    candidate.revision = patch.nextRevision;
    return { ok: true, snapshot: candidate };
  }

  /** Publish the staged candidate; no-op if nothing is pending. */
  commit(): void {
    if (this.disposed || !this.pending) return;
    this.accepted = this.pending;
    this.pending = undefined;
  }

  /** Drop an uncommitted candidate (cancellation / dispose of pending work). */
  cancelPending(): void {
    this.pending = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.pending = undefined;
    this.accepted = emptySnapshot();
  }

  /**
   * Entity as effective at scene time.
   * Pass excludeStartsAtMs when sampling an incomplete seal frontier so
   * activations that start on the seal stay invisible (E002 left-limit).
   */
  entityAt(
    entityId: EntityId,
    sceneTimeMs: number,
    options?: { excludeStartsAtMs?: number },
  ): EntityRecord | null {
    return latestVersion(this.accepted.entities.get(entityId), sceneTimeMs, options);
  }

  entityAtSnapshot(
    snapshot: EntityStoreSnapshot,
    entityId: EntityId,
    sceneTimeMs: number,
    options?: { excludeStartsAtMs?: number },
  ): EntityRecord | null {
    return latestVersion(snapshot.entities.get(entityId), sceneTimeMs, options);
  }

  nodeFor(entityId: EntityId): NodeDefinition | undefined {
    const node = this.accepted.nodes.get(entityId);
    return node ? structuredClone(node) : undefined;
  }

  context(entityId: EntityId): CompactEntityContext {
    const entity = currentRecord(this.accepted.entities.get(entityId));
    return {
      revision: this.accepted.revision,
      sealedThroughMs: this.accepted.sealedThroughMs,
      entity,
      ownership: this.accepted.ownership.filter((grant) => grant.entityId === entityId).map((g) => ({ ...g })),
      behaviours: [...this.accepted.behaviours.values()]
        .filter((behaviour) => behaviour.entityId === entityId)
        .map((behaviour) => ({ ...behaviour })),
    };
  }

  private applyOp(
    state: EntityStoreSnapshot,
    operation: EntityPatchOp,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    switch (operation.op) {
      case "UPSERT_ENTITY":
        return this.upsert(state, operation.entity, operation.activationMs, operation.node, path);
      case "REMOVE_ENTITY":
        return this.remove(state, operation.entityId, operation.activationMs, path);
      case "REPARENT":
        return this.reparent(state, operation.entityId, operation.parentId, operation.activationMs, path);
      case "GRANT_OWNERSHIP":
        return this.grant(state, operation.grant, path);
      case "REVOKE_OWNERSHIP":
        return this.revoke(state, operation.entityId, operation.channel, operation.atMs, path);
      case "ACTIVATE_BEHAVIOUR":
        return this.activateBehaviour(state, operation.behaviour, path);
      case "CANCEL_BEHAVIOUR":
        return this.cancelBehaviour(state, operation.behaviourId, path);
    }
  }

  private guardActivation(
    state: EntityStoreSnapshot,
    activationMs: number,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    if (!Number.isFinite(activationMs) || activationMs < 0) {
      return fail("INVALID_ACTIVATION", "activationMs must be a finite number >= 0.", path);
    }
    // Facts before the seal rewrite sealed presentation; activation at the seal is
    // allowed and remains invisible to the sealed left-limit sample.
    if (activationMs < state.sealedThroughMs) {
      return fail(
        "SEALED_HISTORY",
        `Activation ${activationMs}ms is before sealed horizon ${state.sealedThroughMs}ms.`,
        path,
      );
    }
    return undefined;
  }

  private appendVersion(state: EntityStoreSnapshot, entity: EntityRecord, activationMs: number): void {
    const versions = state.entities.get(entity.id) ?? [];
    state.entities.set(entity.id, [...versions, { fromMs: activationMs, record: { ...entity } }]);
  }

  private upsert(
    state: EntityStoreSnapshot,
    entity: EntityRecord,
    activationMs: number,
    node: NodeDefinition | undefined,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const guarded = this.guardActivation(state, activationMs, path);
    if (guarded) return guarded;
    if (entity.parentId) {
      const parent = currentRecord(state.entities.get(entity.parentId));
      if (!parent || !parent.present) {
        return fail("UNKNOWN_ENTITY", `Parent ${entity.parentId} does not exist.`, path);
      }
    }
    if (node) {
      if (node.id !== entity.id) {
        return fail("NODE_CONFLICT", `Node id ${node.id} must match entity id ${entity.id}.`, path);
      }
      state.nodes.set(entity.id, structuredClone(node));
    }
    this.appendVersion(state, entity, activationMs);
    return undefined;
  }

  private remove(
    state: EntityStoreSnapshot,
    entityId: EntityId,
    activationMs: number,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const guarded = this.guardActivation(state, activationMs, path);
    if (guarded) return guarded;
    const existing = currentRecord(state.entities.get(entityId));
    if (!existing || !existing.present) {
      return fail("UNKNOWN_ENTITY", `Entity ${entityId} does not exist.`, path);
    }
    this.appendVersion(state, { ...existing, present: false }, activationMs);
    return undefined;
  }

  private reparent(
    state: EntityStoreSnapshot,
    entityId: EntityId,
    parentId: EntityId | null,
    activationMs: number,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const guarded = this.guardActivation(state, activationMs, path);
    if (guarded) return guarded;
    const existing = currentRecord(state.entities.get(entityId));
    if (!existing || !existing.present) {
      return fail("UNKNOWN_ENTITY", `Entity ${entityId} does not exist.`, path);
    }
    if (parentId) {
      const parent = currentRecord(state.entities.get(parentId));
      if (!parent || !parent.present) {
        return fail("UNKNOWN_ENTITY", `Parent ${parentId} does not exist.`, path);
      }
    }
    this.appendVersion(state, { ...existing, parentId }, activationMs);
    return undefined;
  }

  private grant(
    state: EntityStoreSnapshot,
    grant: OwnershipGrant,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const entity = currentRecord(state.entities.get(grant.entityId));
    if (!entity || !entity.present) {
      return fail("UNKNOWN_ENTITY", `Entity ${grant.entityId} does not exist.`, path);
    }
    if (grant.fromMs < state.sealedThroughMs) {
      return fail(
        "SEALED_HISTORY",
        `Ownership from ${grant.fromMs}ms rewrites sealed horizon ${state.sealedThroughMs}ms.`,
        path,
      );
    }
    for (const existing of state.ownership) {
      if (overlaps(existing, grant) && existing.owner !== grant.owner) {
        return fail(
          "OWNERSHIP_CONFLICT",
          `Channel ${grant.channel} on ${grant.entityId} already owned by ${existing.owner}.`,
          path,
        );
      }
    }
    state.ownership = [...state.ownership, { ...grant }];
    return undefined;
  }

  private revoke(
    state: EntityStoreSnapshot,
    entityId: EntityId,
    channel: ChannelId,
    atMs: number,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    if (atMs < state.sealedThroughMs) {
      return fail(
        "SEALED_HISTORY",
        `Revoke at ${atMs}ms rewrites sealed horizon ${state.sealedThroughMs}ms.`,
        path,
      );
    }
    let found = false;
    state.ownership = state.ownership.map((grant) => {
      if (grant.entityId !== entityId || grant.channel !== channel) return grant;
      if ((grant.untilMs ?? Number.POSITIVE_INFINITY) <= atMs) return grant;
      found = true;
      return { ...grant, untilMs: atMs };
    });
    if (!found) return fail("UNKNOWN_ENTITY", `No open ownership for ${entityId}.${channel}.`, path);
    return undefined;
  }

  private activateBehaviour(
    state: EntityStoreSnapshot,
    behaviour: BehaviourRecord,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const guarded = this.guardActivation(state, behaviour.activationMs, path);
    if (guarded) return guarded;
    const entity = currentRecord(state.entities.get(behaviour.entityId));
    if (!entity || !entity.present) {
      return fail("UNKNOWN_ENTITY", `Entity ${behaviour.entityId} does not exist.`, path);
    }
    const ownershipError = this.grant(
      state,
      {
        entityId: behaviour.entityId,
        channel: behaviour.channel,
        owner: behaviour.id,
        writerClass: "behaviour",
        fromMs: behaviour.activationMs,
      },
      path,
    );
    if (ownershipError) return ownershipError;
    state.behaviours.set(behaviour.id, { ...behaviour, active: true });
    return undefined;
  }

  private cancelBehaviour(
    state: EntityStoreSnapshot,
    behaviourId: BehaviourId,
    path: string,
  ): EntityPatchDiagnostic | undefined {
    const existing = state.behaviours.get(behaviourId);
    if (!existing) return fail("UNKNOWN_BEHAVIOUR", `Behaviour ${behaviourId} does not exist.`, path);
    state.behaviours.set(behaviourId, { ...existing, active: false });
    state.ownership = state.ownership.map((grant) =>
      grant.owner === behaviourId && (grant.untilMs === undefined || grant.untilMs > state.sealedThroughMs)
        ? { ...grant, untilMs: Math.max(state.sealedThroughMs, grant.fromMs) }
        : grant,
    );
    return undefined;
  }
}
