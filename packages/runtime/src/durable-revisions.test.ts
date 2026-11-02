import { describe, expect, it } from "vitest";
import { emitEntityPatchDelta } from "@gvr/compiler";
import type { NodeDefinition, SceneIRDelta, SourceSpan } from "@gvr/schema";
import { EntityRevisionStore } from "./entities";
import { StreamingRuntime } from "./streaming";

const span: SourceSpan = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
};

function root(id: string, y: number): NodeDefinition {
  return {
    id,
    name: id,
    parentId: null,
    space: "world",
    kind: "rectangle",
    zIndex: 0,
    transform: {
      position: { x: 0, y },
      pivot: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    opacity: 1,
    visible: true,
    size: { x: 40, y: 20 },
    fill: { type: "solid", r: 0.2, g: 0.2, b: 0.8, a: 1 },
  };
}

function child(parentId: string, name: string, y: number): NodeDefinition {
  return {
    id: `${parentId}.${name}`,
    name,
    parentId,
    kind: "rectangle",
    zIndex: 0,
    transform: {
      position: { x: 0, y },
      pivot: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    opacity: 1,
    visible: true,
    size: { x: 40, y: 20 },
    fill: { type: "solid", r: 0.2, g: 0.2, b: 0.8, a: 1 },
  };
}

function seedHouse(runtime: StreamingRuntime): void {
  const create: SceneIRDelta = {
    generationId: "house",
    unitId: 1,
    expectedRevision: 0,
    nextRevision: 1,
    sourceSpan: span,
    operations: [
      {
        op: "CREATE_SCENE",
        scene: {
          irVersion: "0.2",
          sceneId: "house",
          viewport: { width: 200, height: 200, fit: "contain" },
          background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
          resources: [],
          cameras: [{ id: "main", position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }],
          initialCameraId: "main",
          durationMs: 2000,
          requiredCapabilities: ["entities.durableRevisions"],
        },
      },
      {
        op: "ADD_NODES",
        nodes: [root("room", 0), child("room", "roof", -40), child("room", "spin", 20)],
      },
      {
        op: "APPLY_ENTITY_PATCH",
        patch: {
          expectedRevision: 0,
          nextRevision: 1,
          operations: [
            { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "room", kind: "group", parentId: null, present: true, label: "middle-room" } },
            {
              op: "UPSERT_ENTITY",
              activationMs: 0,
              entity: { id: "room.roof", kind: "drawable", parentId: "room", present: true, label: "roof" },
              node: child("room", "roof", -40),
            },
            {
              op: "UPSERT_ENTITY",
              activationMs: 0,
              entity: { id: "room.spin", kind: "drawable", parentId: "room", present: true, label: "spinner" },
              node: child("room", "spin", 20),
            },
          ],
        },
      },
      { op: "SEAL_TIMELINE", horizonMs: 500 },
    ],
  };
  runtime.enqueue(create);
  runtime.flushCommands();
}

describe("durable entity revisions vertical slice", () => {
  it("roof remove pillar add retains independent rotation with sealed prefix and compact context", () => {
    const runtime = new StreamingRuntime();
    seedHouse(runtime);
    expect(runtime.revision).toBe(1);
    expect(runtime.rejectedDiagnostics.map((d) => d.message)).toEqual([]);

    const sealedIds = runtime.evaluate(500).drawItems.map((item) => item.nodeId).sort();
    expect(sealedIds).toEqual(["room", "room.roof", "room.spin"]);

    const edit = emitEntityPatchDelta({
      generationId: "house",
      unitId: 2,
      expectedRevision: 1,
      nextRevision: 2,
      patchExpectedRevision: 1,
      patchNextRevision: 2,
      operations: [
        { op: "REMOVE_ENTITY", entityId: "room.roof", activationMs: 500 },
        {
          op: "UPSERT_ENTITY",
          activationMs: 500,
          entity: { id: "room.pillar", kind: "drawable", parentId: "room", present: true, label: "pillar" },
          node: child("room", "pillar", 10),
        },
        {
          op: "ACTIVATE_BEHAVIOUR",
          behaviour: {
            id: "spin-loop",
            entityId: "room.spin",
            channel: "transform.rotation",
            activationMs: 500,
            active: true,
          },
        },
      ],
      sourceSpan: span,
    });
    runtime.enqueue(edit);
    expect(runtime.rejectedDiagnostics.map((d) => `${d.code}:${d.message}`)).toEqual([]);
    runtime.flushCommands();

    // Incomplete seal frontier left-limit: activations at 500ms stay invisible.
    expect(runtime.evaluate(500).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "room",
      "room.roof",
      "room.spin",
    ]);
    expect(runtime.evaluate(501).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "room",
      "room.roof",
      "room.spin",
    ]);

    runtime.enqueue({
      generationId: "house",
      unitId: 3,
      expectedRevision: 2,
      nextRevision: 3,
      sourceSpan: span,
      operations: [{ op: "COMPLETE_PROGRAM" }],
    });
    runtime.flushCommands();

    // Completed playback uses inclusive activation: just before 500ms roof remains.
    expect(runtime.evaluate(499).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "room",
      "room.roof",
      "room.spin",
    ]);
    // At/after activation: roof gone, pillar present, spinner retained.
    expect(runtime.evaluate(500).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "room",
      "room.pillar",
      "room.spin",
    ]);
    expect(runtime.evaluate(501).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "room",
      "room.pillar",
      "room.spin",
    ]);

    const spin = runtime.entities.context("room.spin");
    expect(spin.revision).toBe(2);
    expect(spin.sealedThroughMs).toBe(2000);
    expect(spin.behaviours).toEqual([
      expect.objectContaining({ id: "spin-loop", active: true, channel: "transform.rotation" }),
    ]);
    expect(spin.ownership).toEqual([
      expect.objectContaining({ owner: "spin-loop", writerClass: "behaviour", fromMs: 500 }),
    ]);
  });

  it("undo and replay restore topology from the accepted patch log", () => {
    const runtime = new StreamingRuntime();
    seedHouse(runtime);

    const remove = emitEntityPatchDelta({
      generationId: "house",
      unitId: 2,
      expectedRevision: 1,
      nextRevision: 2,
      patchExpectedRevision: 1,
      patchNextRevision: 2,
      operations: [{ op: "REMOVE_ENTITY", entityId: "room.roof", activationMs: 500 }],
      sourceSpan: span,
    });
    runtime.enqueue(remove);
    runtime.flushCommands();

    // Undo strategy: compensating patch after the seal, never rewrite sealed history.
    const undo = emitEntityPatchDelta({
      generationId: "house",
      unitId: 3,
      expectedRevision: 2,
      nextRevision: 3,
      patchExpectedRevision: 2,
      patchNextRevision: 3,
      operations: [
        {
          op: "UPSERT_ENTITY",
          activationMs: 500,
          entity: { id: "room.roof", kind: "drawable", parentId: "room", present: true, label: "roof" },
          node: child("room", "roof", -40),
        },
      ],
      sourceSpan: span,
    });
    runtime.enqueue(undo);
    runtime.enqueue({
      generationId: "house",
      unitId: 4,
      expectedRevision: 3,
      nextRevision: 4,
      sourceSpan: span,
      operations: [{ op: "COMPLETE_PROGRAM" }],
    });
    runtime.flushCommands();
    expect(runtime.evaluate(501).drawItems.map((item) => item.nodeId).sort()).toContain("room.roof");
    // Compensating undo leaves the sealed prefix unchanged (roof still present at the seal).
    expect(runtime.evaluate(500).drawItems.map((item) => item.nodeId).sort()).toContain("room.roof");

    // Replay strategy: rebuild entity store from the accepted patch log.
    const replay = new EntityRevisionStore();
    for (const patch of runtime.entityPatches) {
      if (
        replay.sealedThroughMs < 500 &&
        patch.operations.some(
          (op) =>
            ("activationMs" in op && typeof op.activationMs === "number" && op.activationMs >= 500) ||
            (op.op === "ACTIVATE_BEHAVIOUR" && op.behaviour.activationMs >= 500) ||
            (op.op === "GRANT_OWNERSHIP" && op.grant.fromMs >= 500),
        )
      ) {
        expect(replay.seal(500)).toBeUndefined();
      }
      expect(replay.enqueue(patch)).toBeUndefined();
      replay.commit();
    }
    expect(replay.entityAt("room.roof", 250)?.label).toBe("roof");
    expect(replay.entityAt("room.roof", 501)?.label).toBe("roof");
    expect(replay.revision).toBe(runtime.entities.revision);
  });
});
