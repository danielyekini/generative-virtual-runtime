import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lintStreamingAuthorship } from "./stream-lint";

const root = resolve(import.meta.dirname, "../../..");

function fixture(name: string): string {
  return readFileSync(resolve(root, "fixtures/motionscript/streaming", name), "utf8");
}

describe("lintStreamingAuthorship", () => {
  it("accepts a progressive program with a first useful seal", () => {
    const result = lintStreamingAuthorship(fixture("progressive-ok.ms"));
    expect(result.offlineOk).toBe(true);
    expect(result.progressiveOk).toBe(true);
    expect(result.sealCount).toBe(2);
    expect(result.findings.filter((item) => item.severity === "error")).toEqual([]);
  });

  it("marks seal-free complete programs offline-ok but not progressive", () => {
    const result = lintStreamingAuthorship(fixture("no-seal-offline.ms"));
    expect(result.offlineOk).toBe(true);
    expect(result.progressiveOk).toBe(false);
    expect(result.findings.some((item) => item.code === "NO_SEAL")).toBe(true);
  });

  it("flags sealed-history writes after a seal", () => {
    const result = lintStreamingAuthorship(fixture("sealed-history-bad.ms"));
    expect(result.progressiveOk).toBe(false);
    expect(result.findings.some((item) => item.code === "SEALED_HISTORY_WRITE")).toBe(true);
  });

  it("flags an early seal before any drawable", () => {
    const result = lintStreamingAuthorship(fixture("early-seal-empty.ms"));
    expect(result.progressiveOk).toBe(false);
    expect(result.findings.some((item) => item.code === "EARLY_SEAL")).toBe(true);
  });

  it("flags oversized units against a tight budget", () => {
    const source = fixture("progressive-ok.ms");
    const result = lintStreamingAuthorship(source, { maxBufferedUnitBytes: 32 });
    expect(result.findings.some((item) => item.code === "OVERSIZED_UNIT")).toBe(true);
    expect(result.progressiveOk).toBe(false);
  });

  it("advises when the first seal arrives after a large prefix", () => {
    const source = fixture("progressive-ok.ms");
    const result = lintStreamingAuthorship(source, { lateFirstSealBytes: 8 });
    expect(result.findings.some((item) => item.code === "LATE_FIRST_SEAL" && item.severity === "advisory")).toBe(
      true,
    );
    expect(result.progressiveOk).toBe(true);
  });
});
