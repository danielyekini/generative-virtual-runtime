import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { transformPoint, type ResolvedFrame, type SceneIR, type Vec2 } from "@gvr/schema";
import { EntityRevisionStore } from "./entities";
import { buildResolvedFrame } from "./frame";
import {
  hitTest,
  hitTestAll,
  InputSession,
  ownershipFromGrants,
  replayInput,
  type InputEvent,
  type InputSessionOptions,
} from "./input";
import { sampleScene } from "./sample";

const source = `scene "panel" {version "0.2"; viewport (400,300); background #ffffff; duration 4s;};
group Panel {
  position (40, 40);
  rectangle Button { size (100, 40); cornerRadius 8; fill #3366ff; };
  text Label { position (50, 26); content "Go"; fontFamily "sans"; fontSize 16; fill #ffffff; align center; };
};
rectangle Glass { position (40, 40); size (30, 40); fill #ffffff; opacity 0.3; };
circle Knob { position (200, 150); radius 12; fill #ff8800; };
group Spin { position (300, 80); rotation 45deg; rectangle Bar { position (-30, -5); size (60, 10); fill #22aa22; }; };
path Ring { position (300, 220); fillRule evenodd; fill #aa00aa; move (-30, -30); line (30, -30); line (30, 30); line (-30, 30); close; move (-10, -10); line (10, -10); line (10, 10); line (-10, 10); close; };
line Wire { from (20, 280); to (180, 280); stroke #000000 width 2; };
rectangle Hollow { position (220, 260); size (40, 30); stroke #000000 width 4; };
complete;`;

function compiled(): SceneIR {
  const result = compileMotionScript(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  expect(result.ok).toBe(true);
  return result.scene!;
}

function frameAt(scene: SceneIR, t: number, session?: InputSession): ResolvedFrame {
  const sampled = sampleScene(scene, t);
  return buildResolvedFrame(scene, session ? session.applyTo(sampled, t) : sampled, t);
}

/** Map a local geometry point of a draw item into logical viewport space. */
function at(frame: ResolvedFrame, nodeId: string, local: Vec2): Vec2 {
  const item = frame.drawItems.find((entry) => entry.nodeId === nodeId);
  if (!item) throw new Error(`no draw item ${nodeId}`);
  return transformPoint(item.logicalMatrix, local.x, local.y);
}

describe("painted-geometry hit testing (E007)", () => {
  const scene = compiled();
  const frame = frameAt(scene, 0);

  it("hits the topmost painted item and reports occluded items beneath", () => {
    const glassPoint = at(frame, "Panel.Button", { x: 10, y: 20 });
    expect(hitTest(frame, glassPoint)?.nodeId).toBe("Glass");
    expect(hitTestAll(frame, glassPoint).map((hit) => hit.nodeId)).toEqual(["Glass", "Panel.Button"]);
    expect(hitTest(frame, glassPoint, { passThrough: new Set(["Glass"]) })?.nodeId).toBe("Panel.Button");
  });

  it("respects rounded corners, rotation and even-odd holes", () => {
    expect(hitTest(frame, at(frame, "Panel.Button", { x: 99.5, y: 0.5 }))).toBeUndefined();
    expect(hitTest(frame, at(frame, "Panel.Button", { x: 92, y: 20 }))?.nodeId).toBe("Panel.Button");
    // Rotated bar: a local end point hits; the unrotated bounding-box corner does not.
    expect(hitTest(frame, at(frame, "Spin.Bar", { x: 58, y: 5 }))?.nodeId).toBe("Spin.Bar");
    const bar = frame.drawItems.find((item) => item.nodeId === "Spin.Bar")!;
    const centre = transformPoint(bar.logicalMatrix, 30, 5);
    expect(hitTest(frame, { x: centre.x + 28, y: centre.y })).toBeUndefined();
    expect(hitTest(frame, at(frame, "Ring", { x: 20, y: 0 }))?.nodeId).toBe("Ring");
    expect(hitTest(frame, at(frame, "Ring", { x: 0, y: 0 }))).toBeUndefined();
  });

  it("uses stroke bands for lines and unfilled shapes, with optional slop", () => {
    expect(hitTest(frame, at(frame, "Wire", { x: 100, y: 280.9 }))?.part).toBe("stroke");
    expect(hitTest(frame, at(frame, "Wire", { x: 100, y: 283 }))).toBeUndefined();
    expect(hitTest(frame, at(frame, "Wire", { x: 100, y: 283 }), { strokeSlop: 3 })?.nodeId).toBe("Wire");
    expect(hitTest(frame, at(frame, "Hollow", { x: 0, y: 15 }))?.nodeId).toBe("Hollow");
    expect(hitTest(frame, at(frame, "Hollow", { x: 20, y: 15 }))).toBeUndefined();
  });

  it("hit-tests text with host metrics or a conservative estimate, and skips invisible items", () => {
    const label = at(frame, "Panel.Label", { x: 0, y: -5 });
    expect(hitTest(frame, label)?.nodeId).toBe("Panel.Label");
    const narrow = { measureText: () => ({ width: 2, ascent: 12, descent: 4 }) };
    expect(hitTest(frame, at(frame, "Panel.Label", { x: 8, y: -5 }), narrow)?.nodeId).toBe("Panel.Button");
    const hidden = { ...frame, drawItems: frame.drawItems.map((item) => (item.nodeId === "Glass" ? { ...item, opacity: 0 } : item)) };
    expect(hitTest(hidden, at(frame, "Panel.Button", { x: 10, y: 20 }))?.nodeId).toBe("Panel.Button");
  });
});

function demoOptions(store: EntityRevisionStore, initial: Record<string, number>): InputSessionOptions {
  return {
    ownership: ownershipFromGrants((id) => store.context(id).ownership),
    initial,
    targets: [
      { entityId: "Glass", pointer: "none" },
      {
        entityId: "Panel",
        focusable: true,
        tabIndex: 1,
        bindings: [{ on: "click", entityId: "Glass", action: { kind: "toggle", channel: "opacity", values: [0.3, 0.9] } }],
      },
      {
        entityId: "Knob",
        focusable: true,
        tabIndex: 0,
        bindings: [
          { on: "drag", action: { kind: "dragTranslate", min: { x: 20, y: 20 }, max: { x: 380, y: 280 } } },
          { on: "wheel", action: { kind: "step", channel: "transform.scale.x", delta: 0.25, min: 0.5, max: 2 } },
          { on: "key", key: "ArrowRight", action: { kind: "step", channel: "transform.position.x", delta: 10, min: 20, max: 380 } },
        ],
      },
      { entityId: "Spin", bindings: [{ on: "click", action: { kind: "set", channel: "transform.rotation", value: 0 } }] },
    ],
  };
}

function grantInput(store: EntityRevisionStore): void {
  const grant = (entityId: string, channel: string) => ({
    op: "GRANT_OWNERSHIP" as const,
    grant: { entityId, channel, owner: "input", writerClass: "input" as const, fromMs: 0 },
  });
  expect(
    store.enqueue({
      expectedRevision: 0,
      nextRevision: 1,
      operations: [
        { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "Glass", kind: "drawable", parentId: null, present: true } },
        { op: "UPSERT_ENTITY", activationMs: 0, entity: { id: "Knob", kind: "drawable", parentId: null, present: true } },
        grant("Glass", "opacity"),
        grant("Knob", "transform.position.x"),
        grant("Knob", "transform.position.y"),
        grant("Knob", "transform.scale.x"),
      ],
    }),
  ).toBeUndefined();
  store.commit();
}

const KNOB_INITIAL = { "Knob:transform.position.x": 200, "Knob:transform.position.y": 150, "Knob:transform.scale.x": 1, "Glass:opacity": 0.3 };

describe("InputSession demonstrator (E007)", () => {
  const scene = compiled();
  const base = frameAt(scene, 0);
  const button = at(base, "Panel.Button", { x: 80, y: 20 });
  const underGlass = at(base, "Panel.Button", { x: 10, y: 20 });
  const knob = at(base, "Knob", { x: 0, y: 0 });

  const script: InputEvent[] = [
    { type: "pointermove", sceneTimeMs: 0, pointerId: 1, x: underGlass.x, y: underGlass.y },
    { type: "pointerdown", sceneTimeMs: 10, pointerId: 1, x: underGlass.x, y: underGlass.y },
    { type: "pointerup", sceneTimeMs: 20, pointerId: 1, x: underGlass.x + 1, y: underGlass.y },
    { type: "pointerdown", sceneTimeMs: 30, pointerId: 1, x: knob.x, y: knob.y },
    { type: "pointermove", sceneTimeMs: 40, pointerId: 1, x: knob.x + 2, y: knob.y },
    { type: "pointermove", sceneTimeMs: 50, pointerId: 1, x: knob.x + 30, y: knob.y + 10 },
    { type: "pointermove", sceneTimeMs: 60, pointerId: 1, x: knob.x + 500, y: knob.y + 10 },
    { type: "pointerup", sceneTimeMs: 70, pointerId: 1, x: knob.x + 500, y: knob.y + 10 },
    { type: "wheel", sceneTimeMs: 80, x: 380, y: 160, deltaY: -120 },
    { type: "keydown", sceneTimeMs: 90, key: "Tab" },
    { type: "keydown", sceneTimeMs: 100, key: "Enter" },
    { type: "keydown", sceneTimeMs: 110, key: "Tab", shiftKey: true },
  ];

  it("routes hover, click-through-decoration, capture drag, wheel and keyboard into owned state", () => {
    const store = new EntityRevisionStore();
    grantInput(store);
    const session = new InputSession(demoOptions(store, KNOB_INITIAL));
    const signals = script.map((event) => session.process(event, frameAt(scene, event.sceneTimeMs, session)));

    // Pointer passes through the pointer:none glass to the Panel target (Button bubbles to Panel).
    expect(signals[0]).toEqual([{ type: "enter", entityId: "Panel" }]);
    expect(signals[1]).toEqual([
      { type: "focus", entityId: "Panel", reason: "pointer" },
      { type: "down", entityId: "Panel", pointerId: 1 },
    ]);
    expect(signals[2]).toEqual([
      { type: "up", entityId: "Panel", pointerId: 1 },
      { type: "click", entityId: "Panel", pointerId: 1 },
      { type: "write", entityId: "Glass", channel: "opacity", value: 0.9 },
    ]);
    // Below threshold: no drag yet.
    expect(signals[4]!.some((signal) => signal.type === "dragstart")).toBe(false);
    expect(signals[5]!.map((signal) => signal.type)).toEqual(["dragstart", "drag", "write", "write"]);
    expect(signals[5]!.filter((signal) => signal.type === "write")).toEqual([
      { type: "write", entityId: "Knob", channel: "transform.position.x", value: 230 },
      { type: "write", entityId: "Knob", channel: "transform.position.y", value: 160 },
    ]);
    // Capture holds while the pointer leaves the knob; drag clamps to bounds.
    expect(signals[6]!.filter((signal) => signal.type === "write")).toEqual([
      { type: "write", entityId: "Knob", channel: "transform.position.x", value: 380 },
    ]);
    expect(signals[7]!.map((signal) => signal.type)).toContain("dragend");
    expect(signals[7]!.map((signal) => signal.type)).not.toContain("click");
    // Wheel at the moved knob steps owned scale.
    expect(signals[8]).toContainEqual({ type: "write", entityId: "Knob", channel: "transform.scale.x", value: 1.25 });
    // The knob took focus on pointerdown; Tab order is Knob (tabIndex 0) then Panel (1).
    expect(signals[9]).toEqual([
      { type: "blur", entityId: "Knob", reason: "keyboard" },
      { type: "focus", entityId: "Panel", reason: "keyboard" },
    ]);
    // Enter activates through the same click binding.
    expect(signals[10]).toEqual([
      { type: "activate", entityId: "Panel" },
      { type: "write", entityId: "Glass", channel: "opacity", value: 0.3 },
    ]);
    // Shift+Tab moves backwards.
    expect(signals[11]).toEqual([
      { type: "blur", entityId: "Panel", reason: "keyboard" },
      { type: "focus", entityId: "Knob", reason: "keyboard" },
    ]);

    // Production sampling/frame resolution reflects input-owned state.
    const after = frameAt(scene, 120, session);
    const knobItem = after.drawItems.find((item) => item.nodeId === "Knob")!;
    expect(knobItem.logicalMatrix).toEqual(
      frameAt(scene, 120).drawItems.find((item) => item.nodeId === "Knob")!.logicalMatrix.map((v, i) =>
        i === 0 ? v * 1.25 : i === 6 ? v + 180 : i === 7 ? v + 10 : v,
      ),
    );
    expect(after.drawItems.find((item) => item.nodeId === "Glass")!.opacity).toBeCloseTo(0.3);
  });

  it("rejects writes to channels input does not own and leaves state unchanged", () => {
    const store = new EntityRevisionStore();
    grantInput(store);
    const session = new InputSession(demoOptions(store, KNOB_INITIAL));
    const spin = at(base, "Spin.Bar", { x: 30, y: 5 });
    session.process({ type: "pointerdown", sceneTimeMs: 0, pointerId: 7, x: spin.x, y: spin.y }, base);
    const up = session.process({ type: "pointerup", sceneTimeMs: 0, pointerId: 7, x: spin.x, y: spin.y }, base);
    expect(up).toContainEqual({ type: "rejected", entityId: "Spin", channel: "transform.rotation", code: "INPUT_NOT_OWNER" });
    expect(session.state()).toEqual(KNOB_INITIAL);
    expect(frameAt(scene, 0, session).drawItems.find((item) => item.nodeId === "Spin.Bar")!.logicalMatrix).toEqual(
      base.drawItems.find((item) => item.nodeId === "Spin.Bar")!.logicalMatrix,
    );
  });

  it("replays a recorded log to identical signals and state", () => {
    const store = new EntityRevisionStore();
    grantInput(store);
    const options = demoOptions(store, KNOB_INITIAL);
    const live = new InputSession(options);
    const liveSignals = script.map((event) => live.process(event, frameAt(scene, event.sceneTimeMs, live)));
    const events = live.history().map((step) => step.event);
    const replay = replayInput(options, events, (t, session) => frameAt(scene, t, session));
    expect(replay.steps).toEqual(liveSignals);
    expect(replay.session.state()).toEqual(live.state());
    expect(live.history().map((step) => step.seq)).toEqual(script.map((_, index) => index + 1));
  });

  it("releases capture, hover and focus when the target leaves the frame", () => {
    const store = new EntityRevisionStore();
    grantInput(store);
    const session = new InputSession(demoOptions(store, KNOB_INITIAL));
    session.process({ type: "pointerdown", sceneTimeMs: 0, pointerId: 1, x: knob.x, y: knob.y }, base);
    expect(session.capturedEntity).toBe("Knob");
    expect(session.focusedEntity).toBe("Knob");
    const removed = { ...base, sceneTimeMs: 5, drawItems: base.drawItems.filter((item) => item.nodeId !== "Knob") };
    const signals = session.process({ type: "pointermove", sceneTimeMs: 5, pointerId: 1, x: knob.x + 40, y: knob.y }, removed);
    expect(signals.slice(0, 3)).toEqual([
      { type: "capturelost", entityId: "Knob", reason: "removed" },
      { type: "leave", entityId: "Knob", reason: "removed" },
      { type: "blur", entityId: "Knob", reason: "removed" },
    ]);
    expect(signals.some((signal) => signal.type === "drag" || signal.type === "write")).toBe(false);
    expect(session.capturedEntity).toBeUndefined();
    // A pointer cancel with no capture is a no-op; mismatched frames fail closed.
    expect(session.process({ type: "pointercancel", sceneTimeMs: 6, pointerId: 1 }, { ...removed, sceneTimeMs: 6 })).toEqual([]);
    expect(() => session.process({ type: "keydown", sceneTimeMs: 7, key: "Tab" }, removed)).toThrow(/does not match/);
  });

  it("stops writing after the input grant is revoked and bounds the replay log", () => {
    const store = new EntityRevisionStore();
    grantInput(store);
    expect(
      store.enqueue({
        expectedRevision: 1,
        nextRevision: 2,
        operations: [{ op: "REVOKE_OWNERSHIP", entityId: "Glass", channel: "opacity", atMs: 100 }],
      }),
    ).toBeUndefined();
    store.commit();
    const session = new InputSession({ ...demoOptions(store, KNOB_INITIAL), maxLog: 2 });
    const click = (t: number) => {
      session.process({ type: "pointerdown", sceneTimeMs: t, pointerId: 1, x: button.x, y: button.y }, frameAt(scene, t, session));
      return session.process({ type: "pointerup", sceneTimeMs: t, pointerId: 1, x: button.x, y: button.y }, frameAt(scene, t, session));
    };
    expect(click(50)).toContainEqual({ type: "write", entityId: "Glass", channel: "opacity", value: 0.9 });
    expect(click(150)).toContainEqual({ type: "rejected", entityId: "Glass", channel: "opacity", code: "INPUT_NOT_OWNER" });
    // After revocation the authored value is presented again.
    expect(frameAt(scene, 150, session).drawItems.find((item) => item.nodeId === "Glass")!.opacity).toBeCloseTo(0.3);
    expect(session.history()).toHaveLength(2);
  });
});
