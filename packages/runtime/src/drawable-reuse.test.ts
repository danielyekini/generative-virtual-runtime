import { describe, expect, it } from "vitest";
import type { NodeDefinition } from "@gvr/schema";
import { EntityRevisionStore } from "./entities";

function rect(id: string): NodeDefinition {
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
    size: { x: 20, y: 40 },
    fill: { type: "solid", r: 0.2, g: 0.4, b: 0.8, a: 1 },
  };
}

describe("drawable reuse bindings (E005 prototype)", () => {
  it("shares one pane geometry across two window instances with independent rotation ownership", () => {
    const store = new EntityRevisionStore();
    expect(
      store.enqueue({
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
      }),
    ).toBeUndefined();
    store.commit();
    expect(store.seal(200)).toBeUndefined();

    const a = store.resolveDrawable("window-a", 100);
    const b = store.resolveDrawable("window-b", 100);
    expect(a?.id).toBe("window-a");
    expect(b?.id).toBe("window-b");
    expect(a).toMatchObject({ kind: "rectangle", size: { x: 20, y: 40 } });
    expect(b).toMatchObject({ kind: "rectangle", size: { x: 20, y: 40 } });
    expect(store.geometry("pane")?.node).toMatchObject({ kind: "rectangle", size: { x: 20, y: 40 } });

    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [
          {
            op: "ACTIVATE_BEHAVIOUR",
            behaviour: {
              id: "spin-a",
              entityId: "window-a",
              channel: "transform.rotation",
              activationMs: 200,
              active: true,
            },
          },
          {
            op: "ACTIVATE_BEHAVIOUR",
            behaviour: {
              id: "spin-b",
              entityId: "window-b",
              channel: "transform.rotation",
              activationMs: 200,
              active: true,
            },
          },
        ],
      }),
    ).toBeUndefined();
    store.commit();
    expect(store.context("window-a").ownership).toEqual([
      expect.objectContaining({ owner: "spin-a", channel: "transform.rotation" }),
    ]);
    expect(store.context("window-b").ownership).toEqual([
      expect.objectContaining({ owner: "spin-b", channel: "transform.rotation" }),
    ]);

    const budget = store.drawableBudget(250);
    expect(budget).toEqual({
      geometryAssets: 1,
      boundInstances: 2,
      expandedGeometryPayloads: 2,
      retainedGeometryPayloads: 1,
      retainedUnits: 3,
    });
    expect(budget.retainedGeometryPayloads).toBeLessThan(budget.expandedGeometryPayloads);
  });

  it("activates a third shared chip after the seal without rewriting the sealed prefix", () => {
    const store = new EntityRevisionStore();
    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [
          {
            op: "REGISTER_GEOMETRY",
            activationMs: 0,
            geometry: { id: "chip", space: "world", node: rect("chip") },
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
      }),
    ).toBeUndefined();
    store.commit();
    expect(store.seal(400)).toBeUndefined();

    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [
          {
            op: "UPSERT_ENTITY",
            activationMs: 400,
            entity: { id: "chip-3", kind: "drawable", parentId: null, present: true },
          },
          { op: "BIND_GEOMETRY", entityId: "chip-3", geometryId: "chip", activationMs: 400 },
        ],
      }),
    ).toBeUndefined();
    store.commit();

    const atSeal = { excludeStartsAtMs: 400 };
    expect(store.entityAt("chip-3", 400, atSeal)).toBeNull();
    expect(store.bindingAt("chip-3", 400, atSeal)).toBeNull();
    expect(store.entityAt("chip-3", 401)?.id).toBe("chip-3");
    expect(store.bindingAt("chip-3", 401)).toBe("chip");
    expect(store.resolveDrawable("chip-3", 401)).toMatchObject({
      kind: "rectangle",
      size: { x: 20, y: 40 },
    });
    expect(store.drawableBudget(401).boundInstances).toBe(3);
    expect(store.drawableBudget(401).geometryAssets).toBe(1);
  });

  it("rejects bind cycles, unknown geometry, and geometry id collisions with entities", () => {
    const store = new EntityRevisionStore();
    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [
          {
            op: "UPSERT_ENTITY",
            activationMs: 0,
            entity: { id: "pane", kind: "drawable", parentId: null, present: true },
          },
          {
            op: "REGISTER_GEOMETRY",
            activationMs: 0,
            geometry: { id: "pane", space: "world", node: rect("pane") },
          },
        ],
      })?.code,
    ).toBe("BIND_CYCLE");

    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [
          {
            op: "REGISTER_GEOMETRY",
            activationMs: 0,
            geometry: { id: "shared", space: "world", node: rect("shared") },
          },
          {
            op: "UPSERT_ENTITY",
            activationMs: 0,
            entity: { id: "leaf", kind: "drawable", parentId: null, present: true },
          },
          { op: "BIND_GEOMETRY", entityId: "leaf", geometryId: "missing", activationMs: 0 },
        ],
      })?.code,
    ).toBe("UNKNOWN_GEOMETRY");

    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [
          {
            op: "REGISTER_GEOMETRY",
            activationMs: 0,
            geometry: { id: "shared", space: "world", node: rect("shared") },
          },
          {
            op: "UPSERT_ENTITY",
            activationMs: 0,
            entity: { id: "shared", kind: "drawable", parentId: null, present: true },
          },
          { op: "BIND_GEOMETRY", entityId: "shared", geometryId: "shared", activationMs: 0 },
        ],
      })?.code,
    ).toBe("BIND_CYCLE");
  });

  it("rejects sealed-history binds and keeps the prior revision", () => {
    const store = new EntityRevisionStore();
    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [
          {
            op: "REGISTER_GEOMETRY",
            activationMs: 0,
            geometry: { id: "shared", space: "world", node: rect("shared") },
          },
          {
            op: "UPSERT_ENTITY",
            activationMs: 0,
            entity: { id: "leaf", kind: "drawable", parentId: null, present: true },
          },
        ],
      }),
    ).toBeUndefined();
    store.commit();
    expect(store.seal(100)).toBeUndefined();
    const before = store.revision;
    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [{ op: "BIND_GEOMETRY", entityId: "leaf", geometryId: "shared", activationMs: 50 }],
      })?.code,
    ).toBe("SEALED_HISTORY");
    expect(store.revision).toBe(before);
    expect(store.bindingAt("leaf", 200)).toBeNull();
  });
});
