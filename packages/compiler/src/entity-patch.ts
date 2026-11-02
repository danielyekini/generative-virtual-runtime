/**
 * Compiler wiring for entities.durableRevisions (E004) and
 * entities.drawableBindings (E023).
 * Builds Scene IR deltas that apply durable entity patches after/before seals.
 * Declarative MotionScript statements for these ops remain a follow-up; hosts and
 * tests use this emitter with `requires "entities.durableRevisions"` and, for
 * geometry register/bind ops, `requires "entities.drawableBindings"`.
 */

import type {
  EntityPatch,
  EntityPatchOp,
  SceneIRDelta,
  SourceSpan,
} from "@gvr/schema";

const EMPTY_SPAN: SourceSpan = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
};

export interface EntityPatchDeltaOptions {
  generationId: string;
  unitId: number;
  expectedRevision: number;
  nextRevision: number;
  patchExpectedRevision: number;
  patchNextRevision: number;
  operations: EntityPatchOp[];
  sourceSpan?: SourceSpan;
}

/** Emit a single Scene IR delta containing one APPLY_ENTITY_PATCH operation. */
export function emitEntityPatchDelta(options: EntityPatchDeltaOptions): SceneIRDelta {
  const patch: EntityPatch = {
    expectedRevision: options.patchExpectedRevision,
    nextRevision: options.patchNextRevision,
    operations: options.operations,
  };
  return {
    generationId: options.generationId,
    unitId: options.unitId,
    expectedRevision: options.expectedRevision,
    nextRevision: options.nextRevision,
    sourceSpan: options.sourceSpan ?? EMPTY_SPAN,
    operations: [{ op: "APPLY_ENTITY_PATCH", patch }],
  };
}
