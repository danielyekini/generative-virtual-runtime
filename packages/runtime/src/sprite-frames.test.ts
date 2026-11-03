/** E045: the production sampler floors and clamps the frame channel to the atlas grid. */
import { compileMotionScript } from "@gvr/compiler";
import { describe, expect, it } from "vitest";
import { spriteCell } from "./frame";
import { AnimationRuntime } from "./index";

function cellsAt(source: string, times: number[]) {
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  const runtime = new AnimationRuntime(result.scene!);
  return times.map((t) => {
    const item = runtime.evaluate(t).drawItems.find((entry) => entry.geometry.kind === "image")!;
    return item.geometry.kind === "image" ? item.geometry : undefined;
  });
}

const header = `scene "s" {version "0.2"; viewport (320,180); background #ffffff; duration 3s;};`;

describe("resources.spriteFrames sampling (E045)", () => {
  it("steps eight frames evenly over the track and holds the last cell", () => {
    const geometry = cellsAt(`${header}
image Walker { href "walk.png"; size (64, 64); sampling pixelated; frames (4, 2); position (0, 0); };
animate Walker.frame { from 0; to 8; duration 800ms; };
complete;`, [0, 99, 100, 450, 799, 800, 2000]);
    expect(geometry.map((entry) => entry!.frame && entry!.frame.row * 4 + entry!.frame.column)).toEqual([0, 0, 1, 4, 7, 7, 7]);
    expect(geometry.every((entry) => entry!.sampling === "pixelated")).toBe(true);
  });

  it("loops under a cyclic scope", () => {
    const geometry = cellsAt(`${header}
timing walk { period 800ms; };
image Walker { href "walk.png"; size (64, 64); frames (4, 2); position (0, 0); };
animate Walker.frame { from 0; to 8; duration 800ms; timing walk; };
complete;`, [0, 100, 800, 900, 1650]);
    expect(geometry.map((entry) => entry!.frame!.row * 4 + entry!.frame!.column)).toEqual([0, 1, 0, 1, 0]);
  });

  it("uses the static frame, and resolves no cell without a grid", () => {
    const [still] = cellsAt(`${header}
image Still { href "walk.png"; size (64, 64); frames (4, 2); frame 6; position (0, 0); };
complete;`, [0]);
    expect(still!.frame).toEqual({ column: 2, row: 1, columns: 4, rows: 2 });
    const [plain] = cellsAt(`${header}
image Hero { href "hero.png"; size (32, 32); position (0, 0); };
complete;`, [0]);
    expect(plain).not.toHaveProperty("frame");
    expect(plain).not.toHaveProperty("sampling");
  });

  it("clamps out-of-range and non-finite channel values", () => {
    const grid = { columns: 3, rows: 2 };
    expect(spriteCell(grid, -4)).toEqual({ column: 0, row: 0, columns: 3, rows: 2 });
    expect(spriteCell(grid, 99)).toEqual({ column: 2, row: 1, columns: 3, rows: 2 });
    expect(spriteCell(grid, Number.NaN)).toEqual({ column: 0, row: 0, columns: 3, rows: 2 });
    expect(spriteCell(grid, 3.999999)).toEqual({ column: 0, row: 1, columns: 3, rows: 2 });
  });
});
