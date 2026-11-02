import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, validateSceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { fixtureAdapter } from "./fixture-adapter";
import { ImportRegistry, importSource } from "./registry";
import { displayedScene, formatImportReport, retainedScene } from "./report";
import { allocateId, framesToMs, sanitiseName, secondsToMs, yUpToYDown } from "./normalise";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = join(root, "packages/format-import-core/src/cli.ts");

function fixture(name: string): string {
  return readFileSync(join(root, "fixtures/import/fixture", name), "utf8");
}

function load(name: string) {
  const source = fixture(name);
  const file = join("fixtures/import/fixture", name);
  return { source, file, result: importSource(fixtureAdapter, source, { sourceName: file }) };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

function runCli(file?: string): { code: number; stdout: string } {
  const args = file ? [cli, file] : [cli];
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", ...args], { cwd: root, encoding: "utf8" });
    return { code: 0, stdout };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string | Buffer };
    const stdout = typeof failed.stdout === "string" ? failed.stdout : (failed.stdout?.toString("utf8") ?? "");
    return { code: failed.status ?? 1, stdout };
  }
}

describe("import core", () => {
  it("converts frames, axes, and names without knowing a source format", () => {
    expect(framesToMs(30, 30)).toBe(1000);
    expect(secondsToMs(1.5)).toBe(1500);
    expect(yUpToYDown(100, 720)).toBe(620);
    expect(sanitiseName("left", "node")).toBe("leftNode");
    const used = new Set<string>();
    expect(allocateId(null, "dot", used).id).toBe("dot");
    expect(allocateId(null, "dot", used).id).toBe("dot2");
    expect(allocateId("dot", "arm", used).id).toBe("dot.arm");
  });

  it("imports an exact scene the runtime can draw", () => {
    const { source, result } = load("exact.json");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("exact");
    expect(result.scene).toBeDefined();
    expect(result.sourceMetadata.sourceBytes).toBe(new TextEncoder().encode(source).length);
    const validated = validateSceneIR(result.scene);
    expect(validated.ok).toBe(true);
    const runtime = new AnimationRuntime(result.scene!);
    const start = runtime.evaluate(0).drawItems.find((item) => item.nodeId === "dot");
    const mid = runtime.evaluate(500).drawItems.find((item) => item.nodeId === "dot");
    expect(start?.geometry.kind).toBe("circle");
    expect(runtime.evaluate(0).drawItems.map((item) => item.nodeId).sort()).toEqual(["box", "dot"]);
    expect(transformPoint(start!.logicalMatrix, 0, 0).x).toBeCloseTo(100, 4);
    expect(transformPoint(mid!.logicalMatrix, 0, 0).x).toBeCloseTo(250, 4);
  });

  it("reports cubic ease as a degraded import", () => {
    const { result } = load("degraded.json");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("degraded");
    const track = result.scene?.timeline.tracks[0];
    expect(track?.kind).toBe("keyframe");
    if (track?.kind === "keyframe") {
      expect(track.keyframes[0]?.easing).toBe("easeInOut");
      expect(track.keyframes[1]?.easing).toBeUndefined();
    }
    expect(result.diagnostics.some((item) => item.code === "IMPORT_APPROXIMATED")).toBe(true);
  });

  it("keeps a shape when blur is dropped", () => {
    const { result } = load("partial.json");
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("partial");
    expect(result.scene?.nodes.map((node) => node.id)).toEqual(["dot"]);
    expect(result.diagnostics.some((item) => item.code === "IMPORT_DROPPED" && item.feature === "blur")).toBe(true);
  });

  it("clears the canvas when an import fails", () => {
    const { result } = load("failed.json");
    expect(result.ok).toBe(false);
    expect(result.scene).toBeUndefined();
    expect(result.fidelity.overall).toBe("failed");
    expect(result.diagnostics[0]?.code).toBe("IMPORT_MALFORMED");
    expect(displayedScene(result)).toBeUndefined();
    expect(displayedScene(load("partial.json").result)?.sceneId).toBe("softdot");
    expect(displayedScene({ scene: { sceneId: "empty" }, fidelity: { exact: [], approximated: [] } })).toBeUndefined();
  });

  it("keeps a previous scene when the next import fails", () => {
    const previous = { sceneId: "held" };
    const failed = load("failed.json").result;
    const held = retainedScene(previous, failed);
    expect(held.importFailed).toBe(true);
    expect(held.heldPrevious).toBe(true);
    expect(held.shown?.sceneId).toBe("held");
    const cleared = retainedScene(undefined, failed);
    expect(cleared.shown).toBeUndefined();
    expect(cleared.importFailed).toBe(true);
    const accepted = retainedScene(previous, load("partial.json").result);
    expect(accepted.importFailed).toBe(false);
    expect(accepted.shown?.sceneId).toBe("softdot");
  });

  it("groups repeated diagnostics and labels counts as conversion decisions", () => {
    const { result } = load("partial.json");
    const report = formatImportReport(result);
    expect(report.startsWith("STATUS\tpartial\nCOUNTS\tconversion\texact\t")).toBe(true);
    expect(report).toContain("GROUP\t");
    expect(report).toContain("LOC\t");
    const dropped = result.diagnostics.filter((item) => item.feature === "blur");
    expect(dropped.length).toBeGreaterThan(0);
    const locations = report.split("\n").filter((line) => line.startsWith("LOC\t"));
    expect(locations.length).toBe(result.diagnostics.length);
  });

  it("rejects a 3D mesh without producing Scene IR", () => {
    const { result } = load("unsupported.json");
    expect(result.ok).toBe(false);
    expect(result.scene).toBeUndefined();
    expect(result.fidelity.overall).toBe("failed");
    expect(result.diagnostics.some((item) => item.code === "IMPORT_UNSUPPORTED" && item.severity === "fatal")).toBe(true);
  });

  it("rejects a source over the size limit", () => {
    const result = importSource(fixtureAdapter, fixture("exact.json"), { maxSourceBytes: 8 });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("IMPORT_LIMIT");
    expect(result.scene).toBeUndefined();
  });

  it("prints the same report from the CLI", () => {
    expect(runCli().code).toBe(2);
    for (const name of ["exact.json", "degraded.json", "partial.json", "failed.json", "unsupported.json"]) {
      const { file, result } = load(name);
      const printed = runCli(file);
      expect(printed.code).toBe(result.ok ? 0 : 1);
      expect(printed.stdout).toBe(`${formatImportReport(result)}\n`);
    }
  });

  it("keeps format knowledge inside the import package", () => {
    const registry = new ImportRegistry();
    registry.register(fixtureAdapter);
    expect(registry.get("fixture")?.formatId).toBe("fixture");
    const importer = walk(join(root, "packages/format-import-core/src")).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(importer).not.toContain("@gvr/canvas-renderer");
    expect(importer).not.toContain("@gvr/runtime");
    expect(importer).not.toContain("react");
    const runtime = walk(join(root, "packages/runtime/src")).map((path) => readFileSync(path, "utf8")).join("\n");
    const renderer = walk(join(root, "packages/canvas-renderer/src")).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(runtime).not.toContain("@gvr/format-import-core");
    expect(renderer).not.toContain("@gvr/format-import-core");
  });
});
