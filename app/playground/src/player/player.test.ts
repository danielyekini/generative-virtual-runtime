import { describe, expect, it } from "vitest";
import { collectionsOf, filterLibrary } from "../library";
import { COLLECTIONS, formatForFile, installedPrograms } from "./programs";
import { decodeMeta } from "./library-state";
import { canonicalProgramKey, PROBE_IDS } from "./program-keys";
import { runProgram } from "./run";
import { describeSceneSummary } from "./scene-summary";
import { DEFAULT_SETTINGS, decodeRecent, decodeSettings, pushRecent } from "./settings";

const programs = installedPrograms();

describe("installed programs", () => {
  it("uses the spec collections with unique keys and only known formats", () => {
    const keys = new Set(programs.map((entry) => entry.key));
    expect(keys.size).toBe(programs.length);
    expect(collectionsOf(programs).map((item) => item.name)).toEqual([...COLLECTIONS]);
    for (const entry of programs) {
      expect(["motionscript", "fixture", "lottie", "svg"]).toContain(entry.format);
      expect(entry.source.length).toBeGreaterThan(0);
      if (entry.collection === "Imports") expect(entry.format).not.toBe("motionscript");
      else expect(entry.format).toBe("motionscript");
    }
  });

  it("files capability probes under Test frames, not Stories (P031)", () => {
    const stories = programs.filter((entry) => entry.collection === "Stories");
    const frames = programs.filter((entry) => entry.collection === "Test frames");
    for (const id of PROBE_IDS) {
      expect(frames.map((entry) => entry.key), id).toContain(`frame:${id}`);
      expect(programs.some((entry) => entry.key === `story:${id}`), id).toBe(false);
    }
    // Stories keep the elaborate narratives; no story caption is a "(capability.id)" probe note.
    expect(stories.length).toBeGreaterThan(10);
    for (const entry of stories) expect(entry.caption, entry.key).not.toMatch(/\([a-z]+\.[A-Za-z0-9]+\)\.?$/);
    for (const label of ["Clip mask", "Dynamic text", "Path progress", "Physics marble", "Spatial crane", "Spatial echo", "Spatial home", "Spatial seams", "Alpha matte"]) {
      expect(frames.map((entry) => entry.label), label).toContain(label);
    }
  });

  it("resolves pre-P031 probe keys and leaves other keys alone", () => {
    expect(canonicalProgramKey("story:clip-mask")).toBe("frame:clip-mask");
    expect(canonicalProgramKey("story:into-the-moons-shadow")).toBe("story:into-the-moons-shadow");
    expect(canonicalProgramKey("sample:ball")).toBe("sample:ball");
    expect(decodeRecent(JSON.stringify(["story:clip-mask", "frame:clip-mask", "sample:ball"]))).toEqual(["frame:clip-mask", "sample:ball"]);
    const meta = decodeMeta(JSON.stringify({ "story:dynamic-text": { favourite: true, tags: ["probe"] }, "story:alpha-matte": { favourite: true }, "frame:alpha-matte": { favourite: false } }));
    expect(meta["frame:dynamic-text"]?.favourite).toBe(true);
    expect(meta["frame:dynamic-text"]?.tags).toEqual(["probe"]);
    expect(meta["story:dynamic-text"]).toBeUndefined();
    expect(meta["frame:alpha-matte"]?.favourite).toBe(false);
  });

  it("finds a story by caption words", () => {
    const hits = filterLibrary(programs, { text: "eclipse moon", collection: "all" });
    expect(hits.map((entry) => entry.key)).toContain("story:into-the-moons-shadow");
  });

  it("lists Interactive demos with input.bindings after compile", () => {
    const interactive = programs.filter((entry) => entry.collection === "Interactive");
    expect(interactive.map((entry) => entry.key)).toEqual([
      "interactive:click-toggle",
      "interactive:drag-zoom",
      "interactive:keys-focus",
      "interactive:pointer-pass",
    ]);
    for (const entry of interactive) {
      expect(entry.tags).toContain("interact");
      const outcome = runProgram(entry.source, entry.format, entry.label);
      expect(outcome.scene?.interactions?.length, entry.key).toBeGreaterThan(0);
      expect(outcome.scene?.requiredCapabilities, entry.key).toContain("input.bindings");
    }
  });

  it("picks a format for opened files", () => {
    expect(formatForFile("a.svg", "<svg/>")).toBe("svg");
    expect(formatForFile("a.json", '{"v":"5","fr":30,"layers":[]}')).toBe("lottie");
    expect(formatForFile("a.json", '{"scene":{}}')).toBe("fixture");
    expect(formatForFile("a.ms", "scene")).toBe("motionscript");
  });
});

describe("runProgram (instant Run)", () => {
  it("compiles every installed native program into a playable scene", () => {
    for (const entry of programs.filter((item) => item.format === "motionscript")) {
      const outcome = runProgram(entry.source, entry.format, entry.label);
      expect(outcome.scene, entry.key).toBeDefined();
      expect(outcome.state, `${entry.key}: ${outcome.summary}`).not.toBe("failed");
    }
  }, 120_000);

  it("reports located diagnostics and no scene for a broken program, keeping the source text", () => {
    const broken = 'scene "x" {\n  version "0.1";\n  viewport (100, 100);\n  duration 1s;\n};\ncircle c {\n  radius 10;\n  fill #zz;\n};\n';
    const outcome = runProgram(broken, "motionscript", "broken");
    expect(outcome.source).toBe(broken);
    expect(outcome.state).not.toBe("ok");
    const first = outcome.diagnostics[0];
    expect(first).toMatchObject({ code: "BAD_COLOR", line: 8, column: 8 });
    expect(outcome.report).toContain("BAD_COLOR");
  });

  it("fails without a scene for unparsable source", () => {
    const outcome = runProgram("this is not motionscript", "motionscript", "junk");
    expect(outcome.state).toBe("failed");
    expect(outcome.scene).toBeUndefined();
    expect(outcome.diagnostics.length).toBeGreaterThan(0);
  });

  it("imports Lottie and SVG through the importers with a fidelity report and no round-trip", () => {
    const lottie = programs.find((entry) => entry.key === "import:lottie:animated_position")!;
    const outcome = runProgram(lottie.source, "lottie", lottie.label);
    expect(outcome.scene).toBeDefined();
    expect(outcome.report).toMatch(/^STATUS\t/);
    expect(outcome.frameMs).toBeGreaterThan(0);
    const malformed = programs.find((entry) => entry.key === "import:lottie:malformed")!;
    expect(runProgram(malformed.source, "lottie", malformed.label).state).toBe("failed");
    const svg = programs.find((entry) => entry.key === "import:svg:static_primitives")!;
    expect(runProgram(svg.source, "svg", svg.label).scene).toBeDefined();
  });

  it("summarises a scene without dumping it", () => {
    const entry = programs.find((item) => item.key === "frame:primitive-gallery")!;
    const scene = runProgram(entry.source, "motionscript", entry.label).scene!;
    const text = describeSceneSummary(scene);
    expect(text).toContain(`scene ${scene.sceneId}`);
    expect(text).toContain(`nodes ${scene.nodes.length}`);
  });
});

describe("player settings", () => {
  it("defaults autoplay off and the source panel closed", () => {
    expect(DEFAULT_SETTINGS.autoplay).toBe(false);
    expect(DEFAULT_SETTINGS.sourceOpen).toBe(false);
    expect(decodeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings("{bad")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid fields and rejects invalid ones", () => {
    const decoded = decodeSettings(JSON.stringify({ autoplay: true, panelTab: "nope", dpr: "3", sourceWidth: 10, panelHeight: 300 }));
    expect(decoded).toMatchObject({ autoplay: true, panelTab: "diagnostics", dpr: "device", sourceWidth: 420, panelHeight: 300 });
  });

  it("keeps recent programs unique, newest first and bounded", () => {
    let recent: string[] = [];
    for (const key of ["a", "b", "c", "a", "d", "e", "f", "g"]) recent = pushRecent(recent, key);
    expect(recent).toEqual(["g", "f", "e", "d", "a", "c"]);
    expect(decodeRecent(JSON.stringify(["x", 3, "y"]))).toEqual(["x", "y"]);
    expect(decodeRecent("nope")).toEqual([]);
  });
});
