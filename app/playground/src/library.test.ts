import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import {
  MINE_COLLECTION,
  collectionsOf,
  decodeMine,
  encodeMine,
  filterLibrary,
  locateDiagnostics,
  mineEntry,
  programNameFromFile,
  sceneIdOf,
  selectionFor,
  type ProgramEntry,
} from "./library";

const entries: ProgramEntry[] = [
  { key: "preset:binary-tree", label: "Two Ways Through a Binary Tree", caption: "BFS and preorder DFS", collection: "Stories", origin: "installed", source: "" },
  { key: "preset:moon", label: "Into the Moon’s Shadow", caption: "A forty-second éclipse plate", collection: "Stories", origin: "installed", source: "" },
  { key: "frame:text", label: "Text", caption: "Baseline alignment", collection: "Frames", origin: "installed", source: "" },
  mineEntry("mine:a", "My bouncing ball", 'scene "mine-ball" {};'),
];

describe("filterLibrary", () => {
  it("matches every token across label, caption and key, ignoring case and accents", () => {
    expect(filterLibrary(entries, { text: "binary DFS", collection: "all" }).map((e) => e.key)).toEqual(["preset:binary-tree"]);
    expect(filterLibrary(entries, { text: "eclipse", collection: "all" }).map((e) => e.key)).toEqual(["preset:moon"]);
    expect(filterLibrary(entries, { text: "frame:", collection: "all" }).map((e) => e.key)).toEqual(["frame:text"]);
  });

  it("filters by collection and returns everything for an empty query", () => {
    expect(filterLibrary(entries, { text: "", collection: "all" })).toHaveLength(4);
    expect(filterLibrary(entries, { text: "", collection: "Frames" }).map((e) => e.key)).toEqual(["frame:text"]);
    expect(filterLibrary(entries, { text: "ball", collection: MINE_COLLECTION }).map((e) => e.key)).toEqual(["mine:a"]);
    expect(filterLibrary(entries, { text: "ball", collection: "Stories" })).toEqual([]);
  });

  it("counts collections in first-seen order", () => {
    expect(collectionsOf(entries)).toEqual([
      { name: "Stories", count: 2 },
      { name: "Frames", count: 1 },
      { name: MINE_COLLECTION, count: 1 },
    ]);
  });
});

describe("user programs", () => {
  it("round-trips only user programs through storage", () => {
    const decoded = decodeMine(encodeMine(entries));
    expect(decoded).toEqual([entries[3]]);
    expect(decoded[0]?.caption).toContain('scene "mine-ball"');
  });

  it("ignores missing, corrupt or foreign storage without throwing", () => {
    expect(decodeMine(null)).toEqual([]);
    expect(decodeMine("{not json")).toEqual([]);
    expect(decodeMine(JSON.stringify({ version: 2, programs: [] }))).toEqual([]);
    expect(decodeMine(JSON.stringify({ version: 1, programs: [{ key: "preset:x", label: "x", source: "" }, { key: "mine:y", label: 3, source: "" }, null] }))).toEqual([]);
  });

  it("names uploads from the file name and reads the scene id", () => {
    expect(programNameFromFile("stories/orbit.ms")).toBe("orbit");
    expect(programNameFromFile("C:\\work\\Lesson 1.motionscript")).toBe("Lesson 1");
    expect(programNameFromFile(".ms")).toBe("Untitled program");
    expect(sceneIdOf('scene "orbit" {')).toBe("orbit");
    expect(sceneIdOf("circle c {}")).toBeUndefined();
  });
});

describe("locateDiagnostics", () => {
  const source = 'scene "x" {\n  version "0.1";\n  viewport (100, 100);\n  duration 1s;\n};\ncircle c {\n  radius 10;\n  fill #zz;\n};\n';

  it("keeps compiler line, column and offsets so the editor can jump to the error", () => {
    const compiled = compileMotionScript(source);
    expect(compiled.ok).toBe(false);
    const [first] = locateDiagnostics(compiled.diagnostics, source);
    expect(first).toMatchObject({ code: "BAD_COLOR", line: 8, column: 8, start: source.indexOf("#zz") });
    expect(first?.text).toMatch(/^line 8, column 8 · BAD_COLOR · /);
    expect(first?.recovery.length).toBeGreaterThan(0);
    const range = selectionFor(first!, source);
    expect(range && source.slice(range.start, range.end)).toBe("#");
  });

  it("clamps spans to the source and widens empty spans", () => {
    const [far] = locateDiagnostics([{
      code: "UNEXPECTED_EOF" as never, phase: "parse" as never, category: "syntax" as never, severity: "error", effect: "UNIT_REJECTED" as never,
      recovery: "r", message: "m",
      sourceSpan: { start: { offset: 999, line: 3, column: 1 }, end: { offset: 999, line: 3, column: 1 } },
    }], "ab\ncd");
    expect(far).toMatchObject({ start: 5, end: 5 });
    expect(selectionFor(far!, "ab\ncd")).toEqual({ start: 3, end: 5 });
    const [none] = locateDiagnostics([{ code: "X" as never, phase: "validate" as never, category: "c" as never, severity: "error", effect: "UNIT_REJECTED" as never, recovery: "r", message: "m" }], "abc");
    expect(none?.line).toBeUndefined();
    expect(selectionFor(none!, "abc")).toBeUndefined();
  });
});
