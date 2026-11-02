import { describe, expect, it } from "vitest";
import { EntityRevisionStore } from "./entities";

function seedHouse(store: EntityRevisionStore): void {
  expect(
    store.enqueue({
      expectedRevision: 0,
      nextRevision: 1,
      operations: [
        { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "room", kind: "group", parentId: null, present: true, label: "middle-room" } },
        { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "roof", kind: "drawable", parentId: "room", present: true, label: "roof" } },
        { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "spin", kind: "drawable", parentId: "room", present: true, label: "spinner" } },
      ],
    }),
  ).toBeUndefined();
  store.commit();
  expect(store.seal(500)).toBeUndefined();
}

describe("EntityRevisionStore (E002 prototype)", () => {
  it("keeps sealed presentation while removing roof and adding pillar after the seal", () => {
    const store = new EntityRevisionStore();
    seedHouse(store);

    expect(store.entityAt("roof", 250)?.label).toBe("roof");
    expect(store.entityAt("pillar", 250)).toBeNull();

    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [
          { op: "REMOVE_ENTITY", entityId: "roof", activationMs: 500 },
          {
            op: "UPSERT_ENTITY",
            activationMs: 500,
            entity: { id: "pillar", kind: "drawable", parentId: "room", present: true, label: "pillar" },
          },
        ],
      }),
    ).toBeUndefined();
    store.commit();

    // Sealed left-limit still shows the roof and no pillar.
    expect(store.entityAt("roof", 500)?.label).toBe("roof");
    expect(store.entityAt("pillar", 500)).toBeNull();
    // Past the seal, roof is gone and pillar is present.
    expect(store.entityAt("roof", 501)).toBeNull();
    expect(store.entityAt("pillar", 501)?.label).toBe("pillar");
  });

  it("rejects patches that would rewrite sealed history and keeps the prior revision", () => {
    const store = new EntityRevisionStore();
    seedHouse(store);
    const before = store.revision;

    const error = store.enqueue({
      expectedRevision: 1,
      nextRevision: 2,
      operations: [{ op: "REMOVE_ENTITY", entityId: "roof", activationMs: 100 }],
    });
    expect(error?.code).toBe("SEALED_HISTORY");
    expect(store.revision).toBe(before);
    expect(store.entityAt("roof", 500)?.label).toBe("roof");
  });

  it("activates an independent rotation behaviour with exclusive ownership", () => {
    const store = new EntityRevisionStore();
    seedHouse(store);

    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [
          {
            op: "ACTIVATE_BEHAVIOUR",
            behaviour: {
              id: "spin-loop",
              entityId: "spin",
              channel: "transform.rotation",
              activationMs: 500,
              active: true,
            },
          },
        ],
      }),
    ).toBeUndefined();
    store.commit();

    const context = store.context("spin");
    expect(context.revision).toBe(2);
    expect(context.sealedThroughMs).toBe(500);
    expect(context.behaviours).toEqual([
      expect.objectContaining({ id: "spin-loop", active: true, channel: "transform.rotation" }),
    ]);
    expect(context.ownership).toEqual([
      expect.objectContaining({ owner: "spin-loop", writerClass: "behaviour", fromMs: 500 }),
    ]);

    const conflict = store.enqueue({
      expectedRevision: 2,
      nextRevision: 3,
      operations: [
        {
          op: "GRANT_OWNERSHIP",
          grant: {
            entityId: "spin",
            channel: "transform.rotation",
            owner: "physics-torque",
            writerClass: "physics",
            fromMs: 600,
          },
        },
      ],
    });
    expect(conflict?.code).toBe("OWNERSHIP_CONFLICT");
    expect(store.revision).toBe(2);
  });

  it("rejects stale revisions and drops cancelled pending patches", () => {
    const store = new EntityRevisionStore();
    seedHouse(store);

    expect(
      store.enqueue({
        expectedRevision: 0,
        nextRevision: 1,
        operations: [{ op: "REMOVE_ENTITY", entityId: "roof", activationMs: 500 }],
      })?.code,
    ).toBe("STALE_REVISION");

    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [{ op: "REMOVE_ENTITY", entityId: "roof", activationMs: 500 }],
      }),
    ).toBeUndefined();
    store.cancelPending();
    expect(store.entityAt("roof", 501)?.label).toBe("roof");
    expect(store.revision).toBe(1);
  });

  it("returns compact context without requiring a full scene dump", () => {
    const store = new EntityRevisionStore();
    seedHouse(store);
    const context = store.context("roof");
    expect(context).toEqual({
      revision: 1,
      sealedThroughMs: 500,
      entity: { id: "roof", kind: "drawable", parentId: "room", present: true, label: "roof" },
      ownership: [],
      behaviours: [],
    });
  });
});
