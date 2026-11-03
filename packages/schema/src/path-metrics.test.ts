import { expect, it, describe } from "vitest";
import { lerpPathCommands } from "./path-morph";
import {
  buildPathMetrics,
  dashCommands,
  markerSamples,
  orientAngleAtProgress,
  rollingAngle,
  sampleAtDistance,
  sampleAtProgress,
} from "./path-metrics";
import { trimCommands } from "./trim";
import type { PathCommand } from "./types";

const line: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "L", x: 100, y: 0 },
];

const morphA: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "L", x: 100, y: 0 },
];
const morphB: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "L", x: 100, y: 50 },
];

describe("path metrics", () => {
  it("reports point, tangent and distance along a straight path", () => {
    const metrics = buildPathMetrics(line);
    expect(metrics.totalLength).toBeCloseTo(100, 9);
    const mid = sampleAtProgress(metrics, 0.5);
    expect(mid.point.x).toBeCloseTo(50, 9);
    expect(mid.point.y).toBeCloseTo(0, 9);
    expect(mid.tangent.x).toBeCloseTo(1, 9);
    expect(mid.tangent.y).toBeCloseTo(0, 9);
    expect(mid.distance).toBeCloseTo(50, 9);
    expect(sampleAtDistance(metrics, 25).point.x).toBeCloseTo(25, 9);
  });

  it("keeps trim-end attachment on a morphing path without baked keys", () => {
    const midMorph = lerpPathCommands(morphA, morphB, 0.5)!;
    const trimmed = trimCommands(midMorph, 0, 0.6, 0);
    const tip = sampleAtProgress(buildPathMetrics(trimmed), 1);
    // Morph lifts the end; trim keeps 60% of that slanted segment.
    expect(tip.point.x).toBeCloseTo(60, 6);
    expect(tip.point.y).toBeCloseTo(15, 6);

    const longer = trimCommands(midMorph, 0, 0.9, 0);
    const longerTip = sampleAtProgress(buildPathMetrics(longer), 1);
    expect(longerTip.point.x).toBeCloseTo(90, 6);
    expect(longerTip.point.y).toBeCloseTo(22.5, 6);
  });

  it("does not treat orientation as rolling", () => {
    const metrics = buildPathMetrics(line);
    const orient = orientAngleAtProgress(metrics, 0.5);
    expect(orient).toBeCloseTo(0, 9);
    // Same place on the path: rolling depends on radius, not the tangent.
    expect(rollingAngle(50, 10)).toBeCloseTo(5, 9);
    expect(rollingAngle(50, 25)).toBeCloseTo(2, 9);
    expect(orient).not.toBeCloseTo(rollingAngle(50, 10), 1);
  });

  it("places markers and a contact without duplicating source geometry", () => {
    const metrics = buildPathMetrics(line);
    const [start, contact, end] = markerSamples(metrics, [0, 0.4, 1]);
    expect(start!.point.x).toBeCloseTo(0, 9);
    expect(contact!.point.x).toBeCloseTo(40, 9);
    expect(end!.point.x).toBeCloseTo(100, 9);
    // Contact shared with a second path of different command count still agrees in space.
    const denser: PathCommand[] = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 40, y: 0 },
      { cmd: "L", x: 100, y: 0 },
    ];
    const other = sampleAtProgress(buildPathMetrics(denser), 0.4);
    expect(other.point.x).toBeCloseTo(contact!.point.x, 9);
    expect(other.point.y).toBeCloseTo(contact!.point.y, 9);
    expect(denser.length).not.toBe(line.length);
  });

  it("dashes with phase without exploding into per-dash authoring paths", () => {
    const dashed = dashCommands(line, [10, 10], 0);
    // Four on-segments on a 100-unit line with 10 on / 10 off.
    const moves = dashed.filter(command => command.cmd === "M");
    expect(moves.length).toBe(5);
    expect(dashed.length).toBeLessThan(line.length + 40);

    const phased = dashCommands(line, [10, 10], 10);
    // Phase into the first gap → first ink starts at x=10.
    expect(phased[0]).toMatchObject({ cmd: "M", x: 10, y: 0 });
  });
});
