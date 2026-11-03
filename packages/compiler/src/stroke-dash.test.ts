import { describe, expect, it } from "vitest";
import { acceptScene, validateSceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

const header = `scene "marks" {version "0.2"; viewport (640,360); background #0b1220; duration 2s;`;

function compile(body: string) {
  return compileMotionScript(`${header}};\n${body}\ncomplete;`);
}

describe("paint.strokeDash (MotionScript 0.21.0)", () => {
  it("accepts a dashed stroke and requires paint.strokeDash", () => {
    const dashed = compile(`line Wire {
  from (80, 180);
  to (560, 180);
  stroke #f8fafc width 6 dash (18, 10) phase 4;
};`);
    expect(dashed.diagnostics, dashed.diagnostics.map((item) => item.message).join("\n")).toEqual([]);
    expect(dashed.ok).toBe(true);
    expect(dashed.scene!.requiredCapabilities).toContain("paint.strokeDash");
    expect(validateSceneIR(dashed.scene!).ok).toBe(true);
    const wire = dashed.scene!.nodes.find((node) => node.id === "Wire");
    expect(wire && "stroke" in wire && wire.stroke).toMatchObject({ dash: [18, 10], phase: 4 });

    const solid = compile(`line Wire {
  from (80, 180);
  to (560, 180);
  stroke #f8fafc width 6;
};`);
    expect(solid.diagnostics).toEqual([]);
    expect(solid.scene!.requiredCapabilities ?? []).not.toContain("paint.strokeDash");
    const plain = solid.scene!.nodes.find((node) => node.id === "Wire");
    expect(plain && "stroke" in plain && plain.stroke?.dash).toBeUndefined();

    const scene = dashed.scene!;
    const stripped = {
      ...scene,
      requiredCapabilities: (scene.requiredCapabilities ?? []).filter((name) => name !== "paint.strokeDash"),
    };
    expect(validateSceneIR(stripped).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: [] }).ok).toBe(false);
    expect(acceptScene(scene, { consumer: "0.2", enabled: ["paint.strokeDash"] }).ok).toBe(true);
  });

  it("rejects phase without a dash and a phase track on a solid stroke", () => {
    const phaseOnly = compile(`line Wire {
  from (0, 0);
  to (40, 0);
  stroke #ffffff width 2 phase 4;
};`);
    expect(phaseOnly.ok).toBe(false);
    expect(phaseOnly.diagnostics.some((item) => item.message.includes("phase requires a dash"))).toBe(true);

    const bareTrack = compile(`line Wire {
  from (0, 0);
  to (40, 0);
  stroke #ffffff width 2;
};
keyframes Wire.stroke.phase { start 0ms; duration 1s; 0% 0; 100% 8; };`);
    expect(bareTrack.ok).toBe(false);
    expect(bareTrack.diagnostics.some((item) => item.code === "INVALID_TRACK_TARGET")).toBe(true);

    const animated = compile(`line Wire {
  from (80, 180);
  to (560, 180);
  stroke #f8fafc width 6 dash (18, 10);
};
keyframes Wire.stroke.phase { start 0ms; duration 2s; 0% 0; 100% 28; };`);
    expect(animated.diagnostics, animated.diagnostics.map((item) => item.message).join("\n")).toEqual([]);
    expect(animated.scene!.requiredCapabilities).toContain("paint.strokeDash");
    expect(animated.scene!.requiredCapabilities ?? []).not.toContain("paint.animatedSolid");
    const track = animated.scene!.timeline.tracks.find(
      (item) => item.target.kind === "node" && item.target.channel === "stroke.phase",
    );
    expect(track?.target).toMatchObject({ kind: "node", nodeId: "Wire", channel: "stroke.phase" });
  });
});
