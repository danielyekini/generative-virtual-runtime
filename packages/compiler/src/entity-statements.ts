/**
 * Lower declarative MotionScript entity statements (0.9.0) onto APPLY_ENTITY_PATCH.
 */

import {
  NODE_CHANNELS,
  diagnostic,
  type Diagnostic,
  type EntityPatchOp,
  type NodeAnimChannel,
  type NodeDefinition,
  type SourceSpan,
} from "@gvr/schema";
import type {
  BehaviourDeclAst,
  BindDeclAst,
  CancelBehaviourAst,
  EntityDeclAst,
  GeometryDeclAst,
  RemoveEntityAst,
  ReparentDeclAst,
  UnitAst,
} from "./ast";
import { emitEntityPatchDelta } from "./entity-patch";

export type EntityStatementAst =
  | EntityDeclAst
  | GeometryDeclAst
  | BindDeclAst
  | RemoveEntityAst
  | ReparentDeclAst
  | BehaviourDeclAst
  | CancelBehaviourAst;

export function isEntityStatement(unit: UnitAst): unit is EntityStatementAst {
  return (
    unit.kind === "entity" ||
    unit.kind === "geometry" ||
    unit.kind === "bind" ||
    unit.kind === "removeEntity" ||
    unit.kind === "reparent" ||
    unit.kind === "behaviour" ||
    unit.kind === "cancelBehaviour"
  );
}

export interface EntityLowerContext {
  sealedThroughMs: number;
  diagnostics: Diagnostic[];
  ensureCapability: (name: "entities.durableRevisions" | "entities.drawableBindings") => void;
  lowerNode: (ast: NonNullable<EntityDeclAst["node"]>, parentId: string | null) => NodeDefinition[] | undefined;
}

function issue(code: Diagnostic["code"], message: string, sourceSpan?: SourceSpan): Diagnostic {
  return diagnostic({
    code,
    phase: "compile",
    category: code === "UNSUPPORTED_PROPERTY" ? "type" : "temporal",
    effect: "UNIT_REJECTED",
    message,
    sourceSpan,
  });
}

export function lowerEntityStatement(
  unit: EntityStatementAst,
  ctx: EntityLowerContext,
): EntityPatchOp[] | undefined {
  ctx.ensureCapability("entities.durableRevisions");
  if (unit.kind === "geometry" || unit.kind === "bind") {
    ctx.ensureCapability("entities.drawableBindings");
  }

  if (unit.kind !== "cancelBehaviour" && "activationMs" in unit) {
    if (unit.activationMs < ctx.sealedThroughMs) {
      ctx.diagnostics.push(
        issue(
          "INVALID_TIMING",
          `Entity activation ${unit.activationMs}ms is before sealed horizon ${ctx.sealedThroughMs}ms.`,
          unit.span,
        ),
      );
      return undefined;
    }
  }

  if (unit.kind === "entity") {
    let node: NodeDefinition | undefined;
    if (unit.node) {
      const nodes = ctx.lowerNode(unit.node, null);
      if (!nodes || nodes.length === 0) return undefined;
      const root = nodes[0];
      if (!root) return undefined;
      // Private drawable id must equal the entity id.
      node = { ...root, id: unit.name, name: unit.node.name, parentId: null };
      if (nodes.length > 1) {
        ctx.diagnostics.push(
          issue("INVALID_TYPE", "Private entity nodes cannot nest children in this release.", unit.span),
        );
        return undefined;
      }
    }
    return [
      {
        op: "UPSERT_ENTITY",
        activationMs: unit.activationMs,
        entity: {
          id: unit.name,
          kind: unit.entityKind,
          parentId: unit.parentId,
          present: true,
          ...(unit.label ? { label: unit.label } : {}),
        },
        ...(node ? { node } : {}),
      },
    ];
  }

  if (unit.kind === "geometry") {
    if (!unit.node) return undefined;
    const nodes = ctx.lowerNode(unit.node, null);
    if (!nodes || nodes.length === 0) return undefined;
    const root = nodes[0];
    if (!root || nodes.length > 1) {
      ctx.diagnostics.push(
        issue("INVALID_TYPE", "geometry requires exactly one drawable node without children.", unit.span),
      );
      return undefined;
    }
    const node: NodeDefinition = { ...root, id: unit.name, name: unit.node.name, parentId: null };
    return [
      {
        op: "REGISTER_GEOMETRY",
        activationMs: unit.activationMs,
        geometry: { id: unit.name, space: unit.space, node },
      },
    ];
  }

  if (unit.kind === "bind") {
    return [
      {
        op: "BIND_GEOMETRY",
        entityId: unit.entityId,
        geometryId: unit.geometryId,
        activationMs: unit.activationMs,
      },
    ];
  }

  if (unit.kind === "removeEntity") {
    return [{ op: "REMOVE_ENTITY", entityId: unit.entityId, activationMs: unit.activationMs }];
  }

  if (unit.kind === "reparent") {
    return [
      {
        op: "REPARENT",
        entityId: unit.entityId,
        parentId: unit.parentId,
        activationMs: unit.activationMs,
      },
    ];
  }

  if (unit.kind === "behaviour") {
    if (!(unit.channel in NODE_CHANNELS)) {
      ctx.diagnostics.push(
        issue("UNSUPPORTED_PROPERTY", `Behaviour channel ${unit.channel} is not animatable.`, unit.span),
      );
      return undefined;
    }
    return [
      {
        op: "ACTIVATE_BEHAVIOUR",
        behaviour: {
          id: unit.id,
          entityId: unit.entityId,
          channel: unit.channel as NodeAnimChannel,
          activationMs: unit.activationMs,
          active: true,
        },
      },
    ];
  }

  return [{ op: "CANCEL_BEHAVIOUR", behaviourId: unit.behaviourId }];
}

export function emitEntityStatementDelta(options: {
  generationId: string;
  unitId: number;
  expectedRevision: number;
  nextRevision: number;
  patchExpectedRevision: number;
  patchNextRevision: number;
  operations: EntityPatchOp[];
  sourceSpan: SourceSpan;
}) {
  return emitEntityPatchDelta(options);
}
