import { describe, expect, it } from "vitest";
import { lerpPathCommands } from "@gvr/schema";
import { trimCommands } from "@gvr/schema";
import { attachAlongPath, pathDashCommands, pathMarkers } from "./path-progress";
import type { PathCommand } from "@gvr/schema";

const rail: PathCommand[] = [
  { cmd: "M", x: 0, y: 0 },
  { cmd: "L", x: 80, y: 0 },
  { cmd: "L", x: 80, y: 60 },
];

describe("path progress host helpers", () => {
  it("attaches a traveller after morph and trim without baking keys", () => {
    const a: PathCommand[] = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 100, y: 0 },
    ];
    const b: PathCommand[] = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 100, y: 40 },
    ];
    const morph = lerpPathCommands(a, b, 0.5)!;
    const visible = trimCommands(morph, 0, 0.5, 0);
    const tip = attachAlongPath({ commands: visible, progress: 1, orient: true, rollRadius: 10 });
    expect(tip.position.x).toBeCloseTo(50, 5);
    expect(tip.position.y).toBeCloseTo(10, 5);
    expect(tip.rotation).toBeDefined();
    expect(tip.rolling).toBeCloseTo(tip.distance! / 10, 9);
    // Orient follows the slanted tangent; rolling is distance-based — they differ.
    expect(tip.rotation).not.toBeCloseTo(tip.rolling!, 1);
  });

  it("shares a contact sample across differently authored source sizes", () => {
    const coarse = pathMarkers(rail, [0.5])[0]!;
    const fine: PathCommand[] = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 40, y: 0 },
      { cmd: "L", x: 80, y: 0 },
      { cmd: "L", x: 80, y: 30 },
      { cmd: "L", x: 80, y: 60 },
    ];
    const fineContact = pathMarkers(fine, [0.5])[0]!;
    expect(fineContact.point.x).toBeCloseTo(coarse.point.x, 5);
    expect(fineContact.point.y).toBeCloseTo(coarse.point.y, 5);
    expect(fine.length).toBeGreaterThan(rail.length);
  });

  it("keeps dashed guides compact versus per-segment paths", () => {
    const line: PathCommand[] = [
      { cmd: "M", x: 0, y: 0 },
      { cmd: "L", x: 100, y: 0 },
    ];
    const dashed = pathDashCommands(line, [8, 8], 0);
    const handAuthoredMoves = 7; // naive 8-on / 8-off authoring would need many M ops
    expect(dashed.filter(c => c.cmd === "M").length).toBeLessThanOrEqual(handAuthoredMoves);
    expect(dashed.length).toBeGreaterThan(2);
  });
});
