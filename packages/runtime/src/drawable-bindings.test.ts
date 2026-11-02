import { describe, expect, it } from "vitest";
import { emitEntityPatchDelta } from "@gvr/compiler";
import type { NodeDefinition, SceneIRDelta, SourceSpan } from "@gvr/schema";
import { StreamingRuntime } from "./streaming";

const span: SourceSpan = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
};

function rect(id: string, size = { x: 20, y: 40 }): NodeDefinition {
  return {
    id,
    name: id,
    parentId: null,
    space: "world",
    kind: "rectangle",
    zIndex: 0,
    transform: {
      position: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    opacity: 1,
    visible: true,
    size,
    fill: { type: "solid", r: 0.2, g: 0.4, b: 0.8, a: 1 },
  };
}

function seedWindows(runtime: StreamingRuntime): void {
  const create: SceneIRDelta = {
    generationId: "windows",
    unitId: 1,
    expectedRevision: 0,
    nextRevision: 1,
    sourceSpan: span,
    operations: [
      {
        op: "CREATE_SCENE",
        scene: {
          irVersion: "0.2",
          sceneId: "windows",
          viewport: { width: 200, height: 200, fit: "contain" },
          background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
          resources: [],
          cameras: [{ id: "main", position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }],
          initialCameraId: "main",
          durationMs: 2000,
          requiredCapabilities: ["entities.durableRevisions", "entities.drawableBindings"],
        },
      },
      {
        op: "APPLY_ENTITY_PATCH",
        patch: {
          expectedRevision: 0,
          nextRevision: 1,
          operations: [
            {
              op: "REGISTER_GEOMETRY",
              activationMs: 0,
              geometry: { id: "pane", space: "world", node: rect("pane") },
            },
            {
              op: "UPSERT_ENTITY",
              activationMs: 0,
              entity: { id: "window-a", kind: "drawable", parentId: null, present: true, label: "left" },
            },
            {
              op: "UPSERT_ENTITY",
              activationMs: 0,
              entity: { id: "window-b", kind: "drawable", parentId: null, present: true, label: "right" },
            },
            { op: "BIND_GEOMETRY", entityId: "window-a", geometryId: "pane", activationMs: 0 },
            { op: "BIND_GEOMETRY", entityId: "window-b", geometryId: "pane", activationMs: 0 },
          ],
        },
      },
      { op: "SEAL_TIMELINE", horizonMs: 500 },
    ],
  };
  runtime.enqueue(create);
  runtime.flushCommands();
}

describe("drawable bindings (entities.drawableBindings)", () => {
  it("projects shared geometry under two window instances after seal", () => {
    const runtime = new StreamingRuntime();
    seedWindows(runtime);
    expect(runtime.rejectedDiagnostics.map((d) => d.message)).toEqual([]);

    const frame = runtime.evaluate(250);
    const ids = frame.drawItems.map((item) => item.nodeId).sort();
    expect(ids).toEqual(["window-a", "window-b"]);
    for (const id of ["window-a", "window-b"] as const) {
      const item = frame.drawItems.find((entry) => entry.nodeId === id);
      expect(item?.geometry).toMatchObject({ kind: "rectangle", size: { x: 20, y: 40 } });
    }
    expect(runtime.entities.drawableBudget(250)).toMatchObject({
      geometryAssets: 1,
      boundInstances: 2,
      expandedGeometryPayloads: 2,
      retainedGeometryPayloads: 1,
      retainedUnits: 3,
    });
    expect(runtime.entities.drawableBudget(250).retainedUnits).toBeLessThan(
      runtime.entities.drawableBudget(250).expandedGeometryPayloads +
        runtime.entities.drawableBudget(250).geometryAssets +
        1,
    );
  });

  it("post-seal bind leaves sealed prefix unchanged", () => {
    const runtime = new StreamingRuntime();
    const create: SceneIRDelta = {
      generationId: "chips",
      unitId: 1,
      expectedRevision: 0,
      nextRevision: 1,
      sourceSpan: span,
      operations: [
        {
          op: "CREATE_SCENE",
          scene: {
            irVersion: "0.2",
            sceneId: "chips",
            viewport: { width: 200, height: 200, fit: "contain" },
            background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
            resources: [],
            cameras: [{ id: "main", position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }],
            initialCameraId: "main",
            durationMs: 2000,
            requiredCapabilities: ["entities.durableRevisions", "entities.drawableBindings"],
          },
        },
        {
          op: "APPLY_ENTITY_PATCH",
          patch: {
            expectedRevision: 0,
            nextRevision: 1,
            operations: [
              {
                op: "REGISTER_GEOMETRY",
                activationMs: 0,
                geometry: { id: "chip", space: "world", node: rect("chip", { x: 12, y: 12 }) },
              },
              {
                op: "UPSERT_ENTITY",
                activationMs: 0,
                entity: { id: "chip-1", kind: "drawable", parentId: null, present: true },
              },
              {
                op: "UPSERT_ENTITY",
                activationMs: 0,
                entity: { id: "chip-2", kind: "drawable", parentId: null, present: true },
              },
              { op: "BIND_GEOMETRY", entityId: "chip-1", geometryId: "chip", activationMs: 0 },
              { op: "BIND_GEOMETRY", entityId: "chip-2", geometryId: "chip", activationMs: 0 },
            ],
          },
        },
        { op: "SEAL_TIMELINE", horizonMs: 400 },
      ],
    };
    runtime.enqueue(create);
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics).toEqual([]);

    const sealedIds = runtime.evaluate(400).drawItems.map((item) => item.nodeId).sort();
    expect(sealedIds).toEqual(["chip-1", "chip-2"]);

    const late = emitEntityPatchDelta({
      generationId: "chips",
      unitId: 2,
      expectedRevision: 1,
      nextRevision: 2,
      patchExpectedRevision: 1,
      patchNextRevision: 2,
      operations: [
        {
          op: "UPSERT_ENTITY",
          activationMs: 400,
          entity: { id: "chip-3", kind: "drawable", parentId: null, present: true },
        },
        { op: "BIND_GEOMETRY", entityId: "chip-3", geometryId: "chip", activationMs: 400 },
      ],
    });
    runtime.enqueue(late);
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics).toEqual([]);

    // Incomplete seal frontier left-limit: activations at 400ms stay invisible.
    expect(runtime.evaluate(400).drawItems.map((item) => item.nodeId).sort()).toEqual(["chip-1", "chip-2"]);
    expect(runtime.evaluate(500).drawItems.map((item) => item.nodeId).sort()).toEqual(["chip-1", "chip-2"]);

    runtime.enqueue({
      generationId: "chips",
      unitId: 3,
      expectedRevision: 2,
      nextRevision: 3,
      sourceSpan: span,
      operations: [{ op: "COMPLETE_PROGRAM" }],
    });
    runtime.flushCommands();

    expect(runtime.evaluate(399).drawItems.map((item) => item.nodeId).sort()).toEqual(["chip-1", "chip-2"]);
    expect(runtime.evaluate(400).drawItems.map((item) => item.nodeId).sort()).toEqual([
      "chip-1",
      "chip-2",
      "chip-3",
    ]);
  });

  it("rejects binding ops without entities.drawableBindings", () => {
    const runtime = new StreamingRuntime();
    const create: SceneIRDelta = {
      generationId: "ungated",
      unitId: 1,
      expectedRevision: 0,
      nextRevision: 1,
      sourceSpan: span,
      operations: [
        {
          op: "CREATE_SCENE",
          scene: {
            irVersion: "0.2",
            sceneId: "ungated",
            viewport: { width: 100, height: 100, fit: "contain" },
            background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
            resources: [],
            cameras: [{ id: "main", position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }],
            initialCameraId: "main",
            durationMs: 1000,
            requiredCapabilities: ["entities.durableRevisions"],
          },
        },
        {
          op: "APPLY_ENTITY_PATCH",
          patch: {
            expectedRevision: 0,
            nextRevision: 1,
            operations: [
              {
                op: "REGISTER_GEOMETRY",
                activationMs: 0,
                geometry: { id: "pane", space: "world", node: rect("pane") },
              },
            ],
          },
        },
      ],
    };
    runtime.enqueue(create);
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics.some((d) => d.message.includes("entities.drawableBindings"))).toBe(true);
  });
});
