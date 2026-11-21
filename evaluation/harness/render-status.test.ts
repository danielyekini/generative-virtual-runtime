import { describe, expect, it } from "vitest";
import { classifyCapture } from "./render-status";

describe("render capture classification", () => {
  it("keeps a production frame as a native pass", () => {
    expect(
      classifyCapture({
        sceneKind: "compiled",
        logs: [],
        referenceFrames: 5,
        nativeFrames: 5,
        nativePrepared: true,
      }),
    ).toEqual({
      executionRoute: "production",
      referenceStatus: "PASS",
      nativeStatus: "PASS",
    });
  });

  it("labels diagnostic continuation separately from a native pass", () => {
    const classified = classifyCapture({
      sceneKind: "diagnostic_not_production",
      logs: [],
      referenceFrames: 5,
      nativeFrames: 5,
      nativePrepared: true,
    });
    expect(classified.executionRoute).toBe("diagnostic-continuation");
    expect(classified.nativeStatus).toBe("DIAGNOSTIC");
  });

  it("leaves a reference player exception unverified", () => {
    const classified = classifyCapture({
      sceneKind: "diagnostic_not_production",
      logs: ["error: Uncaught TypeError: Cannot read properties of undefined (reading 's')"],
      referenceFrames: 5,
      nativeFrames: 5,
      nativePrepared: true,
    });
    expect(classified.referenceStatus).toBe("UNVERIFIED");
    expect(classified.nativeStatus).toBe("DIAGNOSTIC");
  });
});
