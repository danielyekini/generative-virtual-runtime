import { describe, expect, it } from "vitest";
import { compileMotionScript } from "./compile";

function header(version = "0.2"): string {
  return `scene "demo" {
  version "${version}";
  viewport (1280, 720);
  background #101014;
  duration 2s;
};
`;
}

describe("E017 native diagnostics", () => {
  it("names reserved words used as node ids", () => {
    for (const id of ["clip", "step", "spatialLayer", "physics", "interact", "hold", "seal"]) {
      const compiled = compileMotionScript(`${header()}
circle ${id} { radius 5; fill #00ff00; };
complete;
`);
      expect(compiled.ok).toBe(false);
      expect(
        compiled.diagnostics.some((item) => item.message === `\`${id}\` is reserved; an identifier is required.`),
        compiled.diagnostics.map((item) => item.message).join("\n"),
      ).toBe(true);
    }
  });

  it("registers easing.hold for ease hold without an explicit requires", () => {
    const compiled = compileMotionScript(`${header()}
rectangle box { position (0, 0); size (10, 10); fill #ff0000; };
animate box.position.y { from 0; to 10; duration 1s; ease hold; };
complete;
`);
    expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
    expect(compiled.scene?.requiredCapabilities).toContain("easing.hold");
    const track = compiled.scene?.timeline.tracks[0];
    expect(track?.kind).toBe("keyframe");
    if (track?.kind === "keyframe") expect(track.keyframes[0]?.easing).toEqual({ type: "hold" });
  });

  it("suppresses UNKNOWN_TARGET cascades after a rolled-back unit", () => {
    const compiled = compileMotionScript(`${header()}
circle kept { radius 5; fill #00ff00; };
batch {
  circle actor { radius 5; fill #00ff00; };
  circle actor { radius 5; fill #ff0000; };
};
animate actor.opacity { from 0; to 1; duration 1s; };
animate kept.opacity { from 0; to 1; duration 1s; };
complete;
`);
    expect(compiled.ok).toBe(false);
    expect(compiled.diagnostics.some((item) => item.code === "DUPLICATE_ID")).toBe(true);
    expect(compiled.diagnostics.some((item) => item.code === "UNKNOWN_TARGET" && item.message.includes("actor"))).toBe(
      false,
    );
    expect(compiled.scene?.nodes.map((node) => node.id)).toEqual(["kept"]);
    expect(compiled.scene?.timeline.tracks).toHaveLength(1);
  });

  it("attributes validation failures on a rejected unit to that unit's source span", () => {
    const compiled = compileMotionScript(`${header()}
circle child { radius 5; fill #00ff00; transformParent Missing; };
complete;
`);
    expect(compiled.ok).toBe(false);
    const parent = compiled.diagnostics.find((item) => item.code === "INVALID_PARENT");
    expect(parent?.sourceSpan).toBeDefined();
    expect(parent?.target).toBe("child");
  });

  it("keeps independent UNKNOWN_TARGET diagnostics", () => {
    const compiled = compileMotionScript(`${header()}
circle kept { radius 5; fill #00ff00; };
animate Missing.opacity { from 0; to 1; duration 1s; };
complete;
`);
    expect(compiled.diagnostics.some((item) => item.code === "UNKNOWN_TARGET" && item.message.includes("Missing"))).toBe(
      true,
    );
    expect(compiled.diagnostics.find((item) => item.code === "UNKNOWN_TARGET")?.sourceSpan).toBeDefined();
  });
});
