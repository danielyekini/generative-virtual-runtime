import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateResolvedFrame } from "@gvr/schema";
import { buildFrames, hierarchyCorners } from "../../../fixtures/frame-cases";

const dir = resolve(import.meta.dirname, "../../../fixtures/frames");

describe("resolved-frame fixtures", () => {
  const frames = buildFrames();

  it("matches the files on disk and validates", () => {
    for (const [id, frame] of Object.entries(frames)) {
      const stored = JSON.parse(readFileSync(resolve(dir, `${id}.json`), "utf8")) as unknown;
      expect(stored).toEqual(JSON.parse(JSON.stringify(frame)));
      expect(validateResolvedFrame(stored).ok).toBe(true);
    }
  });

  it("bakes hierarchy corners into the expected outline", () => {
    const outline = frames["hierarchy-transform"]?.drawItems.find((item) => item.nodeId === "expected");
    expect(outline?.geometry).toMatchObject({ kind: "polygon", points: hierarchyCorners() });
    expect(outline?.logicalMatrix).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});
