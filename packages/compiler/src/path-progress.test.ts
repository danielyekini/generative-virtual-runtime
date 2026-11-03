import { describe, expect, it } from "vitest";
import { acceptScene, pathAttachmentOwnedChannels, validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "attach" {version "0.2"; viewport (400,300); background #ffffff; duration 2s;};`;
const nodes = `path Rail { stroke #334155 width 2; move (0, 0); line (200, 0); line (200, 100); };
circle Tip { radius 6; fill #f97316; };
rectangle Panel { size (10, 10); fill #000000; };`;

function compile(body: string, prelude = nodes) {
  return compileMotionScript(`${header}\n${prelude}\n${body}\ncomplete;`);
}

describe("path attachments (MotionScript 0.17.0 geometry.pathProgress)", () => {
  it("lowers attach into Scene IR pathAttachments and gates geometry.pathProgress", () => {
    const result = compile(`attach Tip along Rail { progress 0.5; orient true; rollRadius 10; };
animate Tip.path.progress { from 0; to 1; duration 2s; };`);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const scene = result.scene!;
    expect(scene.requiredCapabilities).toContain("geometry.pathProgress");
    expect(scene.requiredCapabilities).toContain("geometry.pathSpace");
    expect(scene.pathAttachments).toEqual([
      { nodeId: "Tip", pathId: "Rail", progress: 0.5, orient: true, rollRadius: 10 },
    ]);
    expect(scene.timeline.tracks[0]).toMatchObject({ target: { kind: "node", nodeId: "Tip", channel: "path.progress" } });
    expect(validateSceneIR(scene).ok).toBe(true);
    // The streamed header carries the same list (base definition).
    const creates = result.deltas.flatMap((delta) => delta.operations).filter((op) => op.op === "CREATE_SCENE");
    const last = creates[creates.length - 1];
    expect(last && last.op === "CREATE_SCENE" ? last.scene.pathAttachments : undefined).toEqual(scene.pathAttachments);
  });

  it("lowers a position-only attachment without orient or rollRadius", () => {
    const result = compile(`attach Tip along Rail { progress 0; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.pathAttachments).toEqual([{ nodeId: "Tip", pathId: "Rail", progress: 0 }]);
    expect(pathAttachmentOwnedChannels(result.scene!.pathAttachments![0]!)).toEqual([
      "transform.position.x",
      "transform.position.y",
    ]);
  });

  it("is rejected by acceptScene unless geometry.pathProgress is enabled", () => {
    const result = compile(`attach Tip along Rail { progress 0.25; };`);
    const scene = result.scene!;
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["geometry.pathProgress"] }).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["geometry.pathProgress", "geometry.pathSpace"] }).ok).toBe(true);
    const missing = validateSceneIR({ ...scene, requiredCapabilities: [] } as SceneIR);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics.some((item) => item.message.includes("geometry.pathProgress"))).toBe(true);
  });

  it("keeps attach and along reserved while body words stay ordinary identifiers", () => {
    const result = compileMotionScript(`${header}
      path progress { move (0, 0); line (10, 0); stroke #000000 width 1; };
      circle orient { radius 4; fill #000000; };
      attach orient along progress { progress 1; };
      complete;`);
    expect(result.diagnostics).toEqual([]);
    expect(result.scene!.pathAttachments).toEqual([{ nodeId: "orient", pathId: "progress", progress: 1 }]);
    const plain = compile("");
    expect(plain.scene!.pathAttachments).toBeUndefined();
    expect(plain.scene!.requiredCapabilities ?? []).not.toContain("geometry.pathProgress");
    expect(plain.scene!.requiredCapabilities ?? []).not.toContain("geometry.pathSpace");
  });

  it("requires geometry.pathSpace alongside geometry.pathProgress and rejects mixed spaces", () => {
    const result = compile(`attach Tip along Rail { progress 0.5; };`);
    expect(result.ok).toBe(true);
    expect(result.scene!.requiredCapabilities).toEqual(expect.arrayContaining(["geometry.pathProgress", "geometry.pathSpace"]));
    const mixed = compileMotionScript(`${header}
      path Rail { space screen; stroke #334155 width 2; move (0, 0); line (40, 0); };
      circle Tip { radius 4; fill #000000; };
      attach Tip along Rail { progress 1; };
      complete;`);
    expect(mixed.ok).toBe(false);
    expect(mixed.diagnostics.map((item) => item.code)).toContain("SPACE_VIOLATION");
    expect(mixed.scene!.pathAttachments).toBeUndefined();
  });

  it("defers forward-declared travellers, paths and progress tracks until they resolve", () => {
    const forward = compileMotionScript(`${header}
      animate Late.path.progress { from 0; to 1; duration 1s; };
      attach Late along Later { progress 0; orient true; };
      circle Late { radius 4; fill #000000; };
      path Later { stroke #000000 width 1; move (0, 0); line (50, 0); };
      complete;`);
    expect(forward.diagnostics).toEqual([]);
    expect(forward.ok).toBe(true);
    expect(forward.scene!.pathAttachments?.[0]).toMatchObject({ nodeId: "Late", pathId: "Later", orient: true });
    expect(forward.scene!.timeline.tracks).toHaveLength(1);
    const missing = compile(`attach Nope along Rail { progress 0; };`);
    expect(missing.diagnostics.map((d) => d.code)).toContain("UNKNOWN_TARGET");
    expect(missing.scene!.pathAttachments).toBeUndefined();
    const missingPath = compile(`attach Tip along Nope { progress 0; };`);
    expect(missingPath.diagnostics.map((d) => d.code)).toContain("UNKNOWN_TARGET");
  });

  it("rejects malformed declarations with source diagnostics", () => {
    const cases = [
      `attach Tip along Rail { };`,
      `attach Tip along Rail { orient true; };`,
      `attach Tip Rail { progress 0; };`,
      `attach Tip along Rail { progress; };`,
      `attach Tip along Rail { progress 0; orient maybe; };`,
      `attach Tip along Rail { progress 0; rollRadius; };`,
      `attach Tip along Rail { progress 0; speed 2; };`,
    ];
    for (const body of cases) {
      const result = compile(body);
      expect(result.diagnostics.length, body).toBeGreaterThan(0);
      expect(result.scene?.pathAttachments, body).toBeUndefined();
    }
  });

  it("validates range, target kind and duplicate attachments", () => {
    const high = compile(`attach Tip along Rail { progress 1.5; };`);
    expect(high.diagnostics.map((d) => d.code)).toContain("INVALID_TRACK_VALUE");
    const radius = compile(`attach Tip along Rail { progress 0; rollRadius 0; };`);
    expect(radius.diagnostics.map((d) => d.code)).toContain("INVALID_TRACK_VALUE");
    const notPath = compile(`attach Tip along Panel { progress 0; };`);
    expect(notPath.diagnostics.map((d) => d.code)).toContain("INVALID_GEOMETRY");
    expect(notPath.scene!.pathAttachments).toBeUndefined();
    const twice = compile(`attach Tip along Rail { progress 0; }; attach Tip along Rail { progress 1; };`);
    expect(twice.diagnostics.map((d) => d.code)).toContain("DUPLICATE_ID");
    const self = compile(`attach Rail along Rail { progress 0; };`);
    expect(self.diagnostics.map((d) => d.code)).toContain("INVALID_GEOMETRY");
    const orphan = compile(`animate Tip.path.progress { from 0; to 1; duration 1s; };`);
    expect(orphan.diagnostics.map((d) => d.code)).toContain("INVALID_TRACK_TARGET");
  });

  it("owns position exclusively and rotation only for orient or rollRadius", () => {
    const position = compile(`attach Tip along Rail { progress 0; };
animate Tip.position.x { from 0; to 10; duration 1s; };`);
    expect(position.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    const vec = compile(`attach Tip along Rail { progress 0; };
animate Tip.position { from (0, 0); to (10, 10); duration 1s; };`);
    expect(vec.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    // Plain attachment leaves rotation free.
    const free = compile(`attach Tip along Rail { progress 0; };
animate Tip.rotation { from 0; to 1; duration 1s; };`);
    expect(free.ok, free.diagnostics.map((d) => d.message).join("\n")).toBe(true);
    for (const props of ["orient true;", "rollRadius 4;", "orient true; rollRadius 4;"]) {
      const owned = compile(`attach Tip along Rail { progress 0; ${props} };
animate Tip.rotation { from 0; to 1; duration 1s; };`);
      expect(owned.diagnostics.map((d) => d.code), props).toContain("OVERLAPPING_WRITERS");
    }
    // orient false leaves rotation to the author.
    const off = compile(`attach Tip along Rail { progress 0; orient false; };
animate Tip.rotation { from 0; to 1; duration 1s; };`);
    expect(off.ok).toBe(true);
    // Other nodes and channels stay animatable; path.progress tracks are allowed.
    const other = compile(`attach Tip along Rail { progress 0; orient true; };
animate Panel.position.x { from 0; to 10; duration 1s; };
animate Tip.opacity { from 1; to 0.5; duration 1s; };
animate Tip.path.progress { from 0; to 1; duration 1s; };`);
    expect(other.ok, other.diagnostics.map((d) => d.message).join("\n")).toBe(true);
  });

  it("rejects overlap with interact and physics writers", () => {
    const input = compile(`attach Tip along Rail { progress 0; };
interact Tip { on drag dragTranslate (0, 0) (10, 10); };`);
    expect(input.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    const rotation = compile(`attach Tip along Rail { progress 0; orient true; };
interact Panel { on click set Tip.rotation 1; };`);
    expect(rotation.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
    const free = compile(`attach Tip along Rail { progress 0; };
interact Panel { on click set Tip.rotation 1; };`);
    expect(free.ok).toBe(true);
    const physics = compile(`attach Tip along Rail { progress 0; };
physics bowl {
  mode dynamic;
  body marble { entity Tip; kind dynamic; position (0, 0); collider circle 6; };
};`);
    expect(physics.diagnostics.map((d) => d.code)).toContain("OVERLAPPING_WRITERS");
  });

  it("freezes attachments after the first seal", () => {
    const sealed = compile(`seal 500ms;
attach Tip along Rail { progress 0; };`);
    expect(sealed.diagnostics.some((d) => d.message.includes("frozen"))).toBe(true);
    expect(sealed.scene!.pathAttachments).toBeUndefined();
  });
});
