import { describe, expect, it } from "vitest";
import {
  formatNumber,
  measureTextLine,
  resolveNumericContent,
  staticVariantCount,
} from "./text-metrics";

const sans16 = { family: "sans", size: 16, weight: 400, style: "normal" as const };

describe("text-metrics prototype (E013)", () => {
  it("formats order-book style prices with two fraction digits", () => {
    expect(formatNumber(99, { fractionDigits: 2 })).toBe("99.00");
    expect(formatNumber(99.005, { fractionDigits: 2 })).toBe("99.01");
    expect(formatNumber(1000.5, { fractionDigits: 2, group: "," })).toBe("1,000.50");
  });

  it("formats counters with integer padding and optional sign", () => {
    expect(formatNumber(7, { minIntegerDigits: 2 })).toBe("07");
    expect(formatNumber(42, { sign: "always" })).toBe("+42");
    expect(formatNumber(-3.2, { fractionDigits: 1, suffix: "%" })).toBe("-3.2%");
  });

  it("rejects non-finite values", () => {
    expect(() => formatNumber(Number.NaN)).toThrow(/finite/);
    expect(() => formatNumber(Number.POSITIVE_INFINITY)).toThrow(/finite/);
  });

  it("measures a centered alphabetic line relative to the anchor", () => {
    const metrics = measureTextLine("99.00", sans16, "center", "alphabetic");
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.box.min.x).toBeCloseTo(-metrics.width / 2, 6);
    expect(metrics.box.max.x).toBeCloseTo(metrics.width / 2, 6);
    expect(metrics.box.min.y).toBeCloseTo(-metrics.ascent, 6);
    expect(metrics.box.max.y).toBeCloseTo(metrics.descent, 6);
  });

  it("keeps digits equal-width under the builtin sans table", () => {
    const zero = measureTextLine("0", sans16).width;
    const nine = measureTextLine("9", sans16).width;
    expect(zero).toBeCloseTo(nine, 6);
    expect(measureTextLine("00", sans16).width).toBeCloseTo(2 * zero, 6);
  });

  it("shows static-variant footprint for discrete quantity sequences", () => {
    // Order-book style quantity trail: 100 → 160 → 60 → 30 (and repeats).
    const quantities = [100, 160, 60, 30, 100, 60];
    expect(staticVariantCount(quantities)).toBe(4);
    // One dynamic node formats every sample without new content literals.
    const contents = quantities.map((q) => resolveNumericContent(q, { fractionDigits: 0 }));
    expect(new Set(contents).size).toBe(4);
    expect(contents).toEqual(["100", "160", "60", "30", "100", "60"]);
  });

  it("held-out: score readout with two decimals replaces opacity-swapped chips", () => {
    const scores = [0.12, 0.45, 0.9, 0.045];
    const chips = scores.map((s) => formatNumber(s, { fractionDigits: 2 }));
    expect(chips).toEqual(["0.12", "0.45", "0.90", "0.05"]);
    expect(staticVariantCount(scores.map((s) => Number(s.toFixed(2))))).toBe(4);
  });
});
