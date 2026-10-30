import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkManifest } from "./harness";
import { validateSceneIR } from "./validate";

const repo = resolve(import.meta.dirname, "../../..");

describe("fixture harness", () => {
  it("admits 2000 nodes and rejects 2001 with the live finite limit", () => {
    const scene = JSON.parse(readFileSync(resolve(repo, "fixtures/ir/valid/minimal.json"), "utf8"));
    const node = scene.nodes[0];
    scene.timeline.tracks = []; scene.timeline.steps = [];
    scene.nodes = Array.from({length: 2000}, (_, i) => ({...node, id: `n${i}`, name: `n${i}`}));
    expect(validateSceneIR(scene).ok).toBe(true);
    scene.nodes.push({...node,id:"extra",name:"extra"});
    const result=validateSceneIR(scene);expect(result.ok).toBe(false);
    if(!result.ok)expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code:"RESOURCE_LIMIT",message:"Node count 2001 exceeds 2000."})]));
  });
  it("accepts the valid IR and rejects every required fault", () => {
    const results = checkManifest(resolve(repo, "fixtures/ir/manifest.json"));
    const failed = results.filter((result) => !result.matched);
    expect(failed.map((result) => ({ file: result.file, codes: result.codes }))).toEqual([]);
  });

  it("applies resource limits as configuration", () => {
    const scene = JSON.parse(readFileSync(resolve(repo, "fixtures/ir/valid/minimal.json"), "utf8")) as unknown;
    const limited = validateSceneIR(scene, { maxNodes: 0 });
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.diagnostics.some((item) => item.code === "RESOURCE_LIMIT")).toBe(true);
  });

  it("rejects a vec2 track that aliases a scalar writer", () => {
    const scene = JSON.parse(readFileSync(resolve(repo, "fixtures/ir/valid/minimal.json"), "utf8")) as {
      timeline: { durationMs: number; tracks: unknown[]; steps: unknown[] };
    };
    scene.timeline.durationMs = 1000;
    scene.timeline.tracks = [
      {
        id: "move",
        kind: "keyframe",
        target: { kind: "node", nodeId: "box", channel: "transform.position" },
        valueType: "vec2",
        startMs: 0,
        durationMs: 1000,
        fill: { before: "none", after: "forwards" },
        keyframes: [
          { offset: 0, value: { x: 0, y: 0 }, easing: "linear" },
          { offset: 1, value: { x: 10, y: 0 } },
        ],
      },
      {
        id: "slide",
        kind: "keyframe",
        target: { kind: "node", nodeId: "box", channel: "transform.position.x" },
        valueType: "number",
        startMs: 0,
        durationMs: 1000,
        fill: { before: "none", after: "forwards" },
        keyframes: [
          { offset: 0, value: 0, easing: "linear" },
          { offset: 1, value: 10 },
        ],
      },
    ];
    const result = validateSceneIR(scene);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === "OVERLAPPING_WRITERS")).toBe(true);
    }
  });

  it("prints PASS and FAIL from the command line", () => {
    const tsx = resolve(repo, "node_modules/tsx/dist/cli.mjs");
    const pass = execFileSync(process.execPath, [tsx, "packages/schema/src/cli.ts", "fixtures/ir/valid/minimal.json"], {
      cwd: repo,
      encoding: "utf8",
    });
    expect(pass.trim()).toBe("PASS");
    expect(() =>
      execFileSync(process.execPath, [tsx, "packages/schema/src/cli.ts", "fixtures/ir/invalid/invalid-opacity.json"], {
        cwd: repo,
        encoding: "utf8",
      }),
    ).toThrow();
  });
});
