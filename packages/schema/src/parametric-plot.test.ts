import { describe, expect, it } from "vitest";
import { lerpPathCommands } from "./path-morph";
import { buildPathMetrics, sampleAtProgress } from "./path-metrics";
import {
  maxChordErrorToCurve,
  plotAdaptive,
  plotUniform,
  type ParametricFn,
} from "./parametric-plot";
import type { Vec2 } from "./types";

/** Design curve: cubic Bezier with a sharp mid bend (high curvature mid-span). */
const design: ParametricFn = t => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 20, y: 120 };
  const p2 = { x: 80, y: -40 };
  const p3 = { x: 100, y: 0 };
  return cubic(p0, p1, p2, p3, t);
};

/** Held-out curve: logarithmic spiral (curvature changes monotonically). */
const heldOut: ParametricFn = t => {
  const angle = t * Math.PI * 3;
  const radius = 10 + 30 * t;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
};

/** Straight edge control — adaptive must not invent a curve primitive. */
const edge: ParametricFn = t => ({ x: 100 * t, y: 40 * t });

/** Dyadic-corner cone (folds at 1/4 and 1/2) so binary subdivision can land. */
const cone: ParametricFn = t => {
  if (t <= 0.25) {
    const u = t / 0.25;
    return { x: lerp(50, 0, u), y: lerp(0, 80, u) };
  }
  if (t <= 0.5) {
    const u = (t - 0.25) / 0.25;
    return { x: lerp(0, 100, u), y: 80 };
  }
  const u = (t - 0.5) / 0.5;
  return { x: lerp(100, 50, u), y: lerp(80, 0, u) };
};

describe("parametric plot experiment (E020)", () => {
  it("keeps a straight edge as two points — no new primitive", () => {
    const adaptive = plotAdaptive(edge, { tolerance: 0.25 });
    expect(adaptive.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 40 },
    ]);
    expect(adaptive.evaluations).toBe(1);
    expect(maxChordErrorToCurve(edge, adaptive.points)).toBeLessThan(1e-9);
  });

  it("recovers a dyadic cone without inventing extra geometry kinds", () => {
    const adaptive = plotAdaptive(cone, { tolerance: 0.25 });
    expect(adaptive.commands.every(c => c.cmd === "M" || c.cmd === "L" || c.cmd === "Z")).toBe(true);
    expect(adaptive.points.length).toBeLessThanOrEqual(5);
    expect(maxChordErrorToCurve(cone, adaptive.points)).toBeLessThan(1e-6);
  });

  it("beats equal-vertex uniform sampling on the design Bezier", () => {
    const adaptive = plotAdaptive(design, { tolerance: 0.75 });
    const uniform = plotUniform(design, adaptive.points.length - 1);
    const adaptiveErr = maxChordErrorToCurve(design, adaptive.points);
    const uniformErr = maxChordErrorToCurve(design, uniform.points);
    expect(adaptiveErr).toBeLessThan(uniformErr);
    expect(adaptiveErr).toBeLessThan(2);
  });

  it("does not beat equal-vertex uniform on the held-out spiral (stop gate)", () => {
    const adaptive = plotAdaptive(heldOut, { tolerance: 0.75 });
    const uniform = plotUniform(heldOut, adaptive.points.length - 1);
    const adaptiveErr = maxChordErrorToCurve(heldOut, adaptive.points);
    const uniformErr = maxChordErrorToCurve(heldOut, uniform.points);
    // Honest stop: midpoint chord-error adaptive loses the equal-vertex comparison.
    expect(adaptiveErr).toBeGreaterThanOrEqual(uniformErr);
  });

  it("costs more evaluations than a matching-error uniform on the held-out spiral", () => {
    const adaptive = plotAdaptive(heldOut, { tolerance: 0.5 });
    const adaptiveErr = maxChordErrorToCurve(heldOut, adaptive.points);
    let segments = 4;
    let uniform = plotUniform(heldOut, segments);
    while (maxChordErrorToCurve(heldOut, uniform.points) > adaptiveErr && segments < 2048) {
      segments *= 2;
      uniform = plotUniform(heldOut, segments);
    }
    expect(maxChordErrorToCurve(heldOut, uniform.points)).toBeLessThanOrEqual(adaptiveErr + 1e-9);
    const adaptiveTotalEvals = adaptive.evaluations + 2;
    expect(adaptiveTotalEvals).toBeGreaterThan(uniform.evaluations);
  });

  it("preserves a progress contact after building path metrics", () => {
    const adaptive = plotAdaptive(design, { tolerance: 0.5 });
    const tip = sampleAtProgress(buildPathMetrics(adaptive.commands), 1);
    const end = design(1);
    expect(tip.point.x).toBeCloseTo(end.x, 6);
    expect(tip.point.y).toBeCloseTo(end.y, 6);
  });

  it("keeps same-topology morphs when both keys share the sample count", () => {
    const base = plotAdaptive(design, { tolerance: 1 });
    const shifted: ParametricFn = t => {
      const p = design(t);
      return { x: p.x, y: p.y + 10 };
    };
    const shiftedPoints = base.parameters.map(t => shifted(t));
    const from = base.commands;
    const to = [
      { cmd: "M" as const, x: shiftedPoints[0]!.x, y: shiftedPoints[0]!.y },
      ...shiftedPoints.slice(1).map(p => ({ cmd: "L" as const, x: p.x, y: p.y })),
    ];
    const mid = lerpPathCommands(from, to, 0.5);
    expect(mid).toBeDefined();
    expect(mid![0]).toMatchObject({ cmd: "M", x: 0, y: 5 });
  });
});

function cubic(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}
