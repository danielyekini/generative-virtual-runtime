import { describe, expect, it } from "vitest";
import { cubicPoint, spatialCubicPoint } from "./spatial";

describe("spatialCubicPoint", () => {
  it("samples spatial cubics by arc length", () => {
    const p0 = { x: 0, y: 0 };
    const p3 = { x: 100, y: 0 };
    // Long outbound handle, short inbound — parameter mid ≠ arc-length mid.
    const c1 = { x: 0, y: 200 };
    const c2 = { x: 100, y: 0 };
    const parameterMid = cubicPoint(0.5, p0, c1, c2, p3);
    const arcMid = spatialCubicPoint(0.5, p0, c1, c2, p3);
    expect(Math.hypot(arcMid.x - parameterMid.x, arcMid.y - parameterMid.y)).toBeGreaterThan(5);
    expect(spatialCubicPoint(0, p0, c1, c2, p3)).toEqual(p0);
    expect(spatialCubicPoint(1, p0, c1, c2, p3)).toEqual(p3);
    // Uniform chord progress should sit near half the polyline length, not the bezier parameter.
    const early = spatialCubicPoint(0.25, p0, c1, c2, p3);
    const late = spatialCubicPoint(0.75, p0, c1, c2, p3);
    expect(early.y).toBeGreaterThan(late.y);
  });

  it("includes Z in arc length like lottie-web when tangents carry depth", () => {
    const p0 = { x: 0, y: 0 };
    const p3 = { x: 100, y: 0 };
    // Flat XY cubic with asymmetric Z depth on the out handle (lottie-web style).
    const c1 = { x: 33, y: 0 };
    const c2 = { x: 66, y: 0 };
    const flat = spatialCubicPoint(0.5, p0, c1, c2, p3);
    const withZ = spatialCubicPoint(0.5, p0, c1, c2, p3, undefined, { c1z: 500, c2z: 0 });
    expect(Math.hypot(withZ.x - flat.x, withZ.y - flat.y)).toBeGreaterThan(1);
    expect(withZ.x).toBeLessThan(flat.x);
    expect(spatialCubicPoint(0, p0, c1, c2, p3, undefined, { c1z: 500 })).toEqual(p0);
    expect(spatialCubicPoint(1, p0, c1, c2, p3, undefined, { c1z: 500 })).toEqual(p3);
  });
});
