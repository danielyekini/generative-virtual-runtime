import { describe, expect, it } from "vitest";
import { cyclicLocalTimeMs, innermostCycle } from "./cyclic-timing";
import type { SceneIR, StepDefinition, TimingScope, TrackDefinition } from "./types";
import { validateSceneIR } from "./validate";

/**
 * timing.cyclicScopes validation (Scene IR 0.23.0, E043). Decision:
 * docs/decisions/engine/time-composition.md.
 */

function track(id: string, startMs: number, durationMs: number, timingScopeId?: string, channel = "transform.position.x"): TrackDefinition {
  return {
    id,
    kind: "keyframe",
    target: { kind: "node", nodeId: "box", channel } as TrackDefinition["target"],
    valueType: "number",
    startMs,
    durationMs,
    fill: { before: "none", after: "forwards" },
    keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 10 }],
    ...(timingScopeId ? { timingScopeId } : {}),
  };
}

function scene(
  timingScopes: TimingScope[],
  tracks: TrackDefinition[],
  steps: StepDefinition[] = [],
  capabilities = ["timing.localScopes", "timing.cyclicScopes"],
): SceneIR {
  return {
    irVersion: "0.2",
    sceneId: "cyclic",
    viewport: { width: 400, height: 300, fit: "contain" },
    background: { type: "solid", r: 1, g: 1, b: 1, a: 1 },
    resources: [],
    nodes: [
      {
        id: "box",
        name: "box",
        parentId: null,
        space: "world",
        kind: "rectangle",
        zIndex: 0,
        transform: { position: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        opacity: 1,
        visible: true,
        size: { x: 10, y: 10 },
        fill: { type: "solid", r: 0, g: 0, b: 0, a: 1 },
      },
    ],
    cameras: [{ id: "main", position: { x: 200, y: 150 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs: 10_000, tracks, steps },
    compositions: [],
    instances: [],
    timingScopes,
    requiredCapabilities: capabilities,
  };
}

function codes(input: SceneIR): string[] {
  const result = validateSceneIR(input);
  return result.ok ? [] : result.diagnostics.map((item) => `${item.code} ${item.path}`);
}

const loop: TimingScope = { id: "loop", parentId: null, offsetMs: 500, stretch: 1, periodMs: 2_000 };

describe("timing.cyclicScopes validation", () => {
  it("accepts a period, a finite repeat and tracks or steps inside one period", () => {
    const once: TimingScope = { id: "once", parentId: null, offsetMs: 0, stretch: 1, periodMs: 500, repeat: 4 };
    expect(
      codes(
        scene([loop, once], [track("a", 0, 2_000, "loop")], [
          { id: "s1", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 0, value: true, timingScopeId: "once" },
          { id: "s2", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 250, value: false, timingScopeId: "once" },
        ]),
      ),
    ).toEqual([]);
  });

  it("requires the capability for periodMs and repeat", () => {
    expect(codes(scene([loop], [], [], ["timing.localScopes"]))).toContain("MISSING_REQUIRED requiredCapabilities");
  });

  it("rejects bad periods, out-of-range repeats and a repeat without a period", () => {
    for (const bad of [
      { periodMs: 0 },
      { periodMs: -5 },
      { periodMs: 1_000, repeat: 0 },
      { periodMs: 1_000, repeat: 1.5 },
      { periodMs: 1_000, repeat: 10_001 },
      { repeat: 2 },
    ]) {
      const scope = { id: "s", parentId: null, offsetMs: 0, stretch: 1, ...bad } as TimingScope;
      expect(codes(scene([scope], [])).some((code) => code.startsWith("INVALID_TIMING"))).toBe(true);
    }
  });

  it("requires a cyclic track to lie inside one period, through affine child scopes", () => {
    const child: TimingScope = { id: "child", parentId: "loop", offsetMs: 1_000, stretch: 1 };
    expect(codes(scene([loop], [track("a", 500, 1_600, "loop")]))).toContain("INVALID_TIMING timeline.tracks[0]");
    expect(codes(scene([loop, child], [track("a", 0, 1_000, "child")]))).toEqual([]);
    expect(codes(scene([loop, child], [track("a", 0, 1_001, "child")]))).toContain("INVALID_TIMING timeline.tracks[0]");
  });

  it("gives the cyclic chain exclusive ownership of each channel it writes", () => {
    const other: TimingScope = { id: "other", parentId: null, offsetMs: 0, stretch: 1, periodMs: 3_000 };
    expect(codes(scene([loop], [track("a", 0, 1_000, "loop"), track("b", 5_000, 1_000)]))).toContain(
      "OVERLAPPING_WRITERS timeline",
    );
    expect(codes(scene([loop, other], [track("a", 0, 1_000, "loop"), track("b", 0, 1_000, "other")]))).toContain(
      "OVERLAPPING_WRITERS timeline",
    );
    // Writers in the same cycle compare inside the cycle's own frame.
    expect(codes(scene([loop], [track("a", 0, 1_000, "loop"), track("b", 1_000, 1_000, "loop")]))).toEqual([]);
    expect(codes(scene([loop], [track("a", 0, 1_200, "loop"), track("b", 1_000, 1_000, "loop")]))).toContain(
      "OVERLAPPING_WRITERS timeline.tracks[1]",
    );
    // A root step on a channel a cyclic step owns is a conflict too.
    expect(
      codes(
        scene([loop], [], [
          { id: "s1", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 0, value: true, timingScopeId: "loop" },
          { id: "s2", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 4_000, value: false },
        ]),
      ),
    ).toContain("OVERLAPPING_WRITERS timeline");
  });

  it("lets steps name only a scope whose chain has a period", () => {
    const affine: TimingScope = { id: "affine", parentId: null, offsetMs: 0, stretch: 1 };
    expect(
      codes(
        scene([affine], [], [
          { id: "s1", target: { kind: "node", nodeId: "box", channel: "visible" }, timeMs: 0, value: true, timingScopeId: "affine" },
        ]),
      ),
    ).toContain("INVALID_TIMING timeline.steps[0].timingScopeId");
  });

  it("leaves programs without a period exactly as timing.localScopes", () => {
    const affine: TimingScope = { id: "affine", parentId: null, offsetMs: 1_000, stretch: 2 };
    expect(codes(scene([affine], [track("a", 0, 1_000, "affine")], [], ["timing.localScopes"]))).toEqual([]);
    expect(codes(scene([affine], [track("a", 0, 5_000, "affine")], [], ["timing.localScopes"]))).toContain(
      "INVALID_TIMING timeline.tracks[0]",
    );
  });

  it("does not enter anything below a finite repetition before its first cycle", () => {
    const outer: TimingScope = { id: "outer", parentId: null, offsetMs: 2_000, stretch: 1, periodMs: 1_000, repeat: 2 };
    const inner: TimingScope = { id: "inner", parentId: "outer", offsetMs: 0, stretch: 1, periodMs: 250 };
    expect(cyclicLocalTimeMs([outer, inner], "inner", 1_000)).toBe(Number.NEGATIVE_INFINITY);
    expect(cyclicLocalTimeMs([outer, inner], "inner", 2_300)).toBeCloseTo(50, 9);
    expect(innermostCycle([outer, inner], "inner", 1_000)).toBeUndefined();
    expect(innermostCycle([outer, inner], "inner", 2_300)).toEqual({ scopeId: "inner", cycle: 1, finite: false });
  });
});
