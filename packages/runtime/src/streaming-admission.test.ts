import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { DEFAULT_LIMITS, validateSceneIR, type RuntimeOperation, type SceneIRDelta } from "@gvr/schema";
import { AnimationRuntime } from "./runtime";
import { StreamingRuntime } from "./streaming";

const source = JSON.parse(readFileSync(new URL("../../../docs/evaluations/2026-10-30-capacity/known-transform-parent-replay.json", import.meta.url), "utf8")).source as string;
const compiled = compileMotionScript(source);
const header = compiled.deltas[0]!.operations[0]!;
const parent = compiled.scene!.nodes.find(node => node.id === "Parent")!;
const child = compiled.scene!.nodes.find(node => node.id === "Other.b")!;
const other = compiled.scene!.nodes.find(node => node.id === "Other")!;
const span = compiled.deltas[0]!.sourceSpan;
function delta(revision: number, ...operations: RuntimeOperation[]): SceneIRDelta {
  return {generationId: "admission", unitId: revision + 1, expectedRevision: revision,
    nextRevision: revision + 1, sourceSpan: span, operations};
}
function started(flush: boolean): StreamingRuntime {
  const runtime = new StreamingRuntime();
  runtime.enqueue(delta(0, header, {op: "ADD_NODES", nodes: [parent]}));
  if (flush) runtime.flushCommands();
  return runtime;
}
const track = {id: "move", kind: "keyframe" as const, target: {kind: "node" as const, nodeId: "Parent", channel: "transform.position.x" as const},
  valueType: "number" as const, startMs: 0, durationMs: 1000, fill: {before: "none" as const, after: "forwards" as const},
  keyframes: [{offset: 0, value: 0}, {offset: 1, value: 20}]};

describe.each([false, true])("assembled admission (flush each: %s)", flushEach => {
  it("replays non-root cross-unit transform parents with offline frame equivalence", () => {
    expect(compiled.ok).toBe(true);
    const runtime = new StreamingRuntime();
    for (const item of compiled.deltas) {
      runtime.enqueue(item);
      if (flushEach) runtime.flushCommands();
    }
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics).toEqual([]);
    expect(runtime.scene).toEqual(compiled.scene);
    expect(runtime.revision).toBe(compiled.deltas.at(-1)!.nextRevision);
    const offline = new AnimationRuntime(compiled.scene!);
    for (const time of [0, 100, 500, 999, 1000]) {
      expect(runtime.evaluate(time).drawItems).toEqual(offline.evaluate(time).drawItems);
    }
  });

  it("validates dependencies across operations in one atomic candidate", () => {
    const runtime = started(flushEach);
    runtime.enqueue(delta(1, {op: "ADD_NODES", nodes: [child]}, {op: "ADD_NODES", nodes: [other]}));
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics).toEqual([]);
    expect(runtime.scene!.nodes.map(node => node.id)).toEqual(["Parent", "Other.b", "Other"]);
  });

  it.each([
    ["missing containment parent", [{op: "ADD_NODES", nodes: [child]}], "INVALID_PARENT"],
    ["missing transform parent on child", [{op: "ADD_NODES", nodes: [other, {...child, transformParentId: "absent"}]}], "INVALID_PARENT"],
    ["missing transform parent on root", [{op: "ADD_NODES", nodes: [{...other, transformParentId: "absent"}]}], "INVALID_PARENT"],
    ["duplicate accepted ID", [{op: "ADD_NODES", nodes: [parent]}], "DUPLICATE_ID"],
    ["root transform cycle", [{op: "ADD_NODES", nodes: [{...other, transformParentId: "Other"}]}], "CYCLE"],
    ["unknown track target", [{op: "ADD_TRACKS", tracks: [{...track, target: {...track.target, nodeId: "absent"}}]}], "UNKNOWN_TARGET"],
    ["malformed track", [{op: "ADD_TRACKS", tracks: [null]}], "INVALID_TYPE"],
    ["unknown step target", [{op: "ADD_STEPS", steps: [{id: "s", target: {kind: "node", nodeId: "absent", channel: "visible"}, timeMs: 100, value: false}]}], "UNKNOWN_TARGET"],
    ["bad header", [{op: "CREATE_SCENE", scene: {}}], "INVALID_TYPE"],
  ] as const)("rejects %s and allows correction at the same revision", (_name, operations, code) => {
    const runtime = started(flushEach);
    const accepted = runtime.scene;
    const before = structuredClone(accepted);
    runtime.enqueue(delta(1, ...operations as unknown as RuntimeOperation[]));
    expect(runtime.scene).toBe(accepted);
    expect(runtime.scene).toEqual(before);
    expect(runtime.revision).toBe(flushEach ? 1 : 0);
    expect(runtime.sealedThroughMs).toBe(0);
    expect(runtime.authoringComplete).toBe(false);
    expect(runtime.rejectedDiagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code,
      generationId: "admission", unitId: 2, sourceSpan: span, effect: "UNIT_REJECTED"})]));
    runtime.enqueue(delta(1, {op: "ADD_NODES", nodes: [other, child]}, {op: "COMPLETE_PROGRAM"}));
    const results = runtime.flushCommands();
    expect(results.map(result => result.revision)).toEqual(flushEach ? [2] : [1, 2]);
    expect(runtime.revision).toBe(2);
    expect(runtime.scene!.nodes.map(node => node.id)).toEqual(["Parent", "Other", "Other.b"]);
  });

  it("rejects cumulative writers and total node limits across deltas", () => {
    const runtime = started(flushEach);
    runtime.enqueue(delta(1, {op: "ADD_TRACKS", tracks: [track]}));
    if (flushEach) runtime.flushCommands();
    runtime.enqueue(delta(2, {op: "ADD_TRACKS", tracks: [{...track, id: "conflict"}]}));
    expect(runtime.rejectedDiagnostics.at(-1)?.code).toBe("OVERLAPPING_WRITERS");
    runtime.enqueue(delta(2, {op: "ADD_NODES", nodes: Array.from({length: DEFAULT_LIMITS.maxNodes}, (_, i) =>
      ({...other, id: `n${i}`, name: `n${i}`}))}));
    expect(runtime.rejectedDiagnostics.at(-1)?.code).toBe("RESOURCE_LIMIT");
    runtime.flushCommands();
    expect(runtime.revision).toBe(2);
    expect(runtime.scene!.nodes).toHaveLength(1);
    expect(runtime.scene!.timeline.tracks).toEqual([track]);
  });
});

it("keeps sealed state, frames and initiating diagnostics after a failed mixed transaction", () => {
  const runtime = started(true);
  runtime.enqueue(delta(1, {op: "ADD_TRACKS", tracks: [{...track, durationMs: 500}]}, {op: "SEAL_TIMELINE", horizonMs: 500}));
  runtime.flushCommands();
  const accepted = runtime.scene;
  const frame = runtime.evaluate(250);
  runtime.enqueue(delta(2, {op: "SEAL_TIMELINE", horizonMs: 800},
    {op: "ADD_TRACKS", tracks: [{...track, id: "bad", startMs: 800, durationMs: 200, target: {...track.target, nodeId: "absent"}}]}));
  expect(runtime.flushCommands()).toEqual([]);
  expect(runtime.scene).toBe(accepted);
  expect(runtime.evaluate(250)).toEqual(frame);
  expect([runtime.revision, runtime.sealedThroughMs, runtime.authoringComplete]).toEqual([2, 500, false]);
  expect(runtime.rejectedDiagnostics[0]).toMatchObject({code: "UNKNOWN_TARGET", path: "timeline.tracks[1].target.nodeId", unitId: 3});
  runtime.enqueue(delta(2, {op: "ADD_TRACKS", tracks: [{...track, id: "late", startMs: 500, durationMs: 500}]}));
  runtime.flushCommands();
  expect(runtime.revision).toBe(3);
  expect(runtime.rejectedDiagnostics[0]?.code).toBe("UNKNOWN_TARGET");
});

it("enforces advancing seals, frozen bases, writer frontiers and completion against queued state", () => {
  const runtime = started(false);
  runtime.enqueue(delta(1, {op: "SEAL_TIMELINE", horizonMs: 500}));
  const operations: RuntimeOperation[][] = [
    [{op: "SEAL_TIMELINE", horizonMs: 500}], [{op: "SEAL_TIMELINE", horizonMs: 1001}],
    [header], [{op: "ADD_NODES", nodes: [other]}],
    [{op: "ADD_TRACKS", tracks: [{...track, durationMs: 500}]}],
    [{op: "ADD_STEPS", steps: [{id: "s", target: {kind: "node", nodeId: "Parent", channel: "visible"}, timeMs: 499, value: false}]}],
  ];
  for (const ops of operations) {
    const count = runtime.rejectedDiagnostics.length;
    runtime.enqueue(delta(2, ...ops));
    expect(runtime.rejectedDiagnostics.length).toBeGreaterThan(count);
  }
  runtime.enqueue(delta(2, {op: "ADD_STEPS", steps: [{id: "boundary", target: {kind: "node", nodeId: "Parent", channel: "visible"}, timeMs: 500, value: false}]}, {op: "COMPLETE_PROGRAM"}));
  runtime.enqueue(delta(3, {op: "ADD_TRACKS", tracks: [track]}));
  expect(runtime.rejectedDiagnostics.at(-1)?.message).toBe("The program is already complete.");
  runtime.flushCommands();
  expect([runtime.revision, runtime.sealedThroughMs, runtime.authoringComplete]).toEqual([3, 1000, true]);
});

it("checks scoped writer time in root coordinates", () => {
  if (header.op !== "CREATE_SCENE") throw new Error("header");
  const runtime = new StreamingRuntime();
  runtime.enqueue(delta(0, {op: "CREATE_SCENE", scene: {...header.scene, timingScopes: [{id: "local", parentId: null, offsetMs: 500, stretch: 2}]}}, {op: "ADD_NODES", nodes: [parent]}, {op: "SEAL_TIMELINE", horizonMs: 500}));
  runtime.enqueue(delta(1, {op: "ADD_TRACKS", tracks: [{...track, timingScopeId: "local", durationMs: 250}]}));
  expect(runtime.rejectedDiagnostics).toEqual([]);
  runtime.flushCommands();
  expect(runtime.revision).toBe(2);
});

it("owns queued payloads and drops the assembled candidate on disposal", () => {
  const runtime = new StreamingRuntime();
  const input = delta(0, structuredClone(header), {op: "ADD_NODES", nodes: [structuredClone(parent)]});
  runtime.enqueue(input);
  (input.operations[1] as {nodes: typeof parent[]}).nodes[0]!.id = "changed";
  input.operations.length = 0;
  runtime.flushCommands();
  expect(runtime.scene!.nodes[0]!.id).toBe("Parent");
  const accepted = runtime.scene;
  runtime.enqueue(delta(1, {op: "ADD_NODES", nodes: [other, child]}));
  expect(runtime.scene).toBe(accepted);
  expect(runtime.scene!.nodes).toHaveLength(1);
  runtime.dispose();
  expect(runtime.flushCommands()).toEqual([]);
  expect(runtime.scene).toBeUndefined();
});

it("does not accept operations before a scene or leak root transform-parent holes into full validation", () => {
  const runtime = new StreamingRuntime();
  runtime.enqueue(delta(0, {op: "COMPLETE_PROGRAM"}));
  expect(runtime.flushCommands()).toEqual([]);
  expect(runtime.rejectedDiagnostics[0]?.code).toBe("MISSING_REQUIRED");
  const result = validateSceneIR({...compiled.scene!, nodes: [{...other, transformParentId: "absent"}]});
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.diagnostics[0]).toMatchObject({code: "INVALID_PARENT", target: "Other"});
});

it("replays forward transform references emitted as an atomic batch without changing declaration order", async () => {
  const {emitMotionScript} = await import("@gvr/motionscript-emitter");
  const scene = {...compiled.scene!, nodes: [{...other, transformParentId: "Parent"}, parent]};
  const generated = emitMotionScript(scene);
  expect(generated).toContain("batch {");
  const result = compileMotionScript(generated);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  const runtime = new StreamingRuntime();
  for (const item of result.deltas) {runtime.enqueue(item); runtime.flushCommands();}
  expect(runtime.rejectedDiagnostics).toEqual([]);
  expect(runtime.scene!.nodes.map(node => node.id)).toEqual(["Other", "Parent"]);
  const offline = new AnimationRuntime(scene);
  expect(runtime.evaluate(500).drawItems).toEqual(offline.evaluate(500).drawItems);
});

it("validates queued capability and resource headers with the nodes that depend on them", () => {
  const program = `scene "profile" {version "0.2"; viewport (100,100); background #ffffff; duration 1s;};
    rectangle box {size (10,10); cornerRadius 2; fill #ffffff;};
    operators box {round 1;};
    text label {content "queued font"; fontSize 12; fill #000000;}; complete;`;
  const result = compileMotionScript(program);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  for (const flushEach of [false, true]) {
    const runtime = new StreamingRuntime();
    for (const item of result.deltas) {runtime.enqueue(item); if (flushEach) runtime.flushCommands();}
    runtime.flushCommands();
    expect(runtime.rejectedDiagnostics).toEqual([]);
    expect(runtime.scene).toEqual(result.scene);
  }
});
