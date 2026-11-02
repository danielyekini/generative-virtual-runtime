import { describe, expect, it } from "vitest";
import { validateDelta } from "@gvr/schema";
import { emitEntityPatchDelta } from "./entity-patch";

describe("emitEntityPatchDelta", () => {
  it("emits APPLY_ENTITY_PATCH deltas for durable revisions", () => {
    const delta = emitEntityPatchDelta({
      generationId: "e004",
      unitId: 3,
      expectedRevision: 2,
      nextRevision: 3,
      patchExpectedRevision: 1,
      patchNextRevision: 2,
      operations: [
        { op: "REMOVE_ENTITY", entityId: "roof", activationMs: 500 },
        {
          op: "UPSERT_ENTITY",
          activationMs: 500,
          entity: { id: "room.pillar", kind: "drawable", parentId: "room", present: true, label: "pillar" },
          node: {
            id: "room.pillar",
            name: "pillar",
            parentId: "room",
            kind: "rectangle",
            zIndex: 1,
            transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
            opacity: 1,
            visible: true,
            size: { x: 20, y: 80 },
            fill: { type: "solid", r: 0.5, g: 0.5, b: 0.5, a: 1 },
          },
        },
      ],
    });
    expect(delta.operations).toEqual([
      expect.objectContaining({
        op: "APPLY_ENTITY_PATCH",
        patch: expect.objectContaining({ expectedRevision: 1, nextRevision: 2 }),
      }),
    ]);
    const validated = validateDelta(delta, undefined, "0.2");
    expect(validated.ok, validated.ok ? "" : validated.diagnostics.map((d) => d.message).join("; ")).toBe(true);
  });
});
