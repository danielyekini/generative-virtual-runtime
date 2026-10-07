import { compileMotionScript } from "@gvr/compiler";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import type { SceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { canonicalSampleTimes, formatRoundTripReport, verifyRoundTrip } from "./verify";

function scene(): SceneIR {
  const compiled = compileMotionScript(`
    scene "dot" {
      version "0.1";
      viewport (1280, 720);
      background #101014;
      duration 2s;
    };
    camera main { position (640, 360); zoom 1; rotation 0deg; };
    circle mark {
      radius 12;
      fill #38bdf8;
      position (40, 80);
    };
    animate mark.position {
      duration 2s;
      from (40, 80);
      to (240, 80);
      ease linear;
    };
    complete;
  `);
  expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
  if (!compiled.scene) throw new Error("missing scene");
  return compiled.scene;
}

describe("semantic round-trip", () => {
  it("accepts a faithful emit and compile", () => {
    const report = verifyRoundTrip(scene());
    expect(formatRoundTripReport(report)).toContain("STATUS\tpass");
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);
    expect(report.sampleTimes).toContain(0);
    expect(report.sampleTimes).toContain(2000);
    expect(report.sampleTimes).toContain(1000);
  });

  it("samples keyframe and step times", () => {
    const compiled = compileMotionScript(`
      scene "steps" {
        version "0.1";
        viewport (1280, 720);
        background #101014;
        duration 2s;
      };
      camera main { position (640, 360); zoom 1; rotation 0deg; };
      circle mark { radius 8; fill #ffffff; position (10, 10); };
      keyframes mark.position {
        duration 2s;
        0% (10, 10);
        25% (40, 10) ease linear;
        100% (80, 10);
      };
      step mark.visible { at 1500ms; value false; };
      complete;
    `);
    expect(compiled.scene).toBeDefined();
    const times = canonicalSampleTimes(compiled.scene!);
    expect(times).toContain(500);
    expect(times).toContain(1500);
  });

  it("catches a bad emitter position mapping", () => {
    const report = verifyRoundTrip(scene(), {
      emit: (value) => emitMotionScript(value).replaceAll("(40, 80)", "(90, 80)"),
    });
    expect(report.ok).toBe(false);
    expect(report.compileOk).toBe(true);
    expect(report.mismatches.some((item) => item.property.startsWith("matrix["))).toBe(true);
    expect(formatRoundTripReport(report)).toContain("STATUS\tfail");
  });

  it("catches a bad emitter easing mapping", () => {
    const report = verifyRoundTrip(scene(), {
      emit: (value) => emitMotionScript(value).replace("ease linear;", "ease easeIn;"),
    });
    expect(report.ok).toBe(false);
    const midpoint = report.mismatches.filter((item) => item.timeMs === 1000);
    expect(midpoint.length).toBeGreaterThan(0);
  });
});
