import { describe, expect, it } from "vitest";
import { validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

// E054 (standalone-auto-orient.md): standalone transform.autoOrient is stopped.
// Facing along a route uses geometry.pathProgress `attach … { orient true; }`;
// other facing is an explicit rotation (or scale) writer. Both spellings below
// must keep failing with an honest diagnostic, never silently orient.
const header = `scene "auto-orient" {version "0.2"; viewport (400,300); background #000000; duration 2s;};`;
const compile = (body: string) => compileMotionScript(`${header}\n${body}\ncomplete;`);

describe("transform.autoOrient stays unsupported (E054 stop)", () => {
  it("rejects an autoOrient node property and an autoOrient track", () => {
    const property = compile(`circle c { radius 4; fill #ffffff; autoOrient true; };`);
    expect(property.ok).toBe(false);
    expect(property.diagnostics.map((d) => [d.code, d.message])).toEqual([["INVALID_TYPE", "Unknown property autoOrient."]]);

    const track = compile(`circle c { radius 4; fill #ffffff; };\nanimate c.autoOrient { from 0; to 1; duration 1s; };`);
    expect(track.ok).toBe(false);
    expect(track.diagnostics.map((d) => [d.code, d.message])).toEqual([
      ["UNSUPPORTED_PROPERTY", "Property autoOrient on c is not a V1 animation target."],
    ]);
  });

  it("rejects a Scene IR track on a transform.autoOrient channel", () => {
    const base = compile(`circle c { radius 4; fill #ffffff; };\nanimate c.rotation { from 0; to 90; duration 1s; };`);
    expect(base.diagnostics).toEqual([]);
    const scene = structuredClone(base.scene!) as SceneIR;
    expect(validateSceneIR(scene).ok).toBe(true);
    (scene.timeline.tracks[0]!.target as { channel: string }).channel = "transform.autoOrient";
    expect(validateSceneIR(scene).ok).toBe(false);
  });
});
