import { describe, expect, it } from "vitest";
import { tapeLayout, tileResolved } from "./frame-tape";

describe("frame tape layout (P016)", () => {
  it("covers the whole span with contiguous tiles sized near the scene aspect", () => {
    const tiles = tapeLayout(30000, 1280, 38, 16 / 9);
    expect(tiles.length).toBe(Math.round(1280 / (38 * 16 / 9)));
    expect(tiles[0]!.startMs).toBe(0);
    expect(tiles.at(-1)!.endMs).toBe(30000);
    expect(tiles.at(-1)!.x + tiles.at(-1)!.width).toBe(1280);
    for (let i = 1; i < tiles.length; i++) {
      expect(tiles[i]!.startMs).toBe(tiles[i - 1]!.endMs);
      expect(tiles[i]!.x).toBe(tiles[i - 1]!.x + tiles[i - 1]!.width);
    }
  });

  it("has no tiles for static or unsized tracks", () => {
    expect(tapeLayout(0, 800, 38, 1)).toEqual([]);
    expect(tapeLayout(1000, 0, 38, 1)).toEqual([]);
  });

  it("shows a tile only once its whole range is resolved", () => {
    const [first, second] = tapeLayout(1000, 400, 40, 1);
    expect(tileResolved(first!, 0)).toBe(false);
    expect(tileResolved(first!, first!.endMs)).toBe(true);
    expect(tileResolved(second!, first!.endMs)).toBe(false);
    expect(tileResolved(second!, 1000)).toBe(true);
  });
});
