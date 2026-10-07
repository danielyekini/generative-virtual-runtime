import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "./capabilities";

const root = join(import.meta.dirname, "../../..");

interface ReleaseVersion {
  language: "motionscript" | "scene-ir";
  version: string;
  status: "released" | "draft" | "prerelease";
  wireVersion?: string;
  file: string;
}

interface Releases {
  languages: Record<"motionscript" | "scene-ir", { current: string; wireVersion: string }>;
  versions: ReleaseVersion[];
  combinations: { motionscript: string; sceneIr: string }[];
}

interface Mapping {
  status: "exact" | "approximate" | "unsupported" | "untested" | "not-applicable";
  scope?: string;
  conformanceTests?: string[];
}

interface Capability {
  id: string;
  introducedIn?: { motionscript: string; sceneIr: string };
  support: { compiler: string; runtime: string; renderer: string };
  conformanceTests: string[];
  adapters: { lottie: Mapping; svg: Mapping };
}

function compareSemver(left: string, right: string): number {
  const parse = (version: string) => {
    const [main, pre] = version.split("-");
    return { nums: (main ?? "").split(".").map((part) => Number(part)), pre: pre ?? null };
  };
  const a = parse(left);
  const b = parse(right);
  const length = Math.max(a.nums.length, b.nums.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a.nums[index] ?? 0) - (b.nums[index] ?? 0);
    if (delta !== 0) return delta;
  }
  if (a.pre === b.pre) return 0;
  if (a.pre && !b.pre) return -1;
  if (!a.pre && b.pre) return 1;
  return (a.pre ?? "") < (b.pre ?? "") ? -1 : 1;
}

function walkTests(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkTests(path, out);
    else if (name.endsWith(".test.ts")) out.push(path);
  }
}

function testIds(): Set<string> {
  const files: string[] = [];
  walkTests(join(root, "packages"), files);
  walkTests(join(root, "evaluation/harness"), files);
  const ids = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const relativePath = relative(root, file);
    for (const match of text.matchAll(/\bit\(\s*"([^"]+)"/g)) {
      if (match[1]) ids.add(`${relativePath}#${match[1]}`);
    }
  }
  return ids;
}

describe("capability registry", () => {
  const releases = JSON.parse(readFileSync(join(root, "packages/schema/capabilities/releases.json"), "utf8")) as Releases;
  const registry = JSON.parse(readFileSync(join(root, "packages/schema/capabilities/registry.json"), "utf8")) as {
    capabilities: Capability[];
  };
  const titles = testIds();

  it("orders semantic versions numerically, including 0.10.0 after 0.9.0", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect("0.10.0".localeCompare("0.9.0")).toBeLessThan(0);
    expect(compareSemver("0.2.0-rc.1", "0.2.0")).toBeLessThan(0);
    expect(compareSemver("0.2.0", "0.1.0")).toBeGreaterThan(0);
  });

  it("points each language at its greatest released version", () => {
    for (const language of ["motionscript", "scene-ir"] as const) {
      const released = releases.versions.filter((item) => item.language === language && item.status === "released");
      const latest = [...released].sort((a, b) => compareSemver(a.version, b.version)).at(-1);
      expect(releases.languages[language].current).toBe(latest?.version);
      expect(latest?.wireVersion).toBe(releases.languages[language].wireVersion);
      const current = releases.versions.find((item) => item.language === language && item.version === releases.languages[language].current);
      expect(current?.status).toBe("released");
    }
    for (const item of releases.versions) {
      expect(readFileSync(join(root, item.file), "utf8").length).toBeGreaterThan(0);
      if (item.status !== "released") {
        expect(item.version).not.toBe(releases.languages[item.language].current);
      }
    }
    for (const combo of releases.combinations) {
      for (const [language, version] of [
        ["motionscript", combo.motionscript],
        ["scene-ir", combo.sceneIr],
      ] as const) {
        expect(releases.versions.some((item) => item.language === language && item.version === version && item.status === "released")).toBe(true);
      }
    }
  });

  it("registers every language capability and only cites tests that exist", () => {
    const ids = registry.capabilities.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const name of CAPABILITIES) expect(ids).toContain(name);

    const pending = {
      motionscript: readFileSync(join(root, "docs/languages/motionscript/versions/pending.md"), "utf8"),
      "scene-ir": readFileSync(join(root, "docs/languages/scene-ir/versions/pending.md"), "utf8"),
    };

    for (const capability of registry.capabilities) {
      const cited = [
        ...capability.conformanceTests,
        ...capability.adapters.lottie.conformanceTests ?? [],
        ...capability.adapters.svg.conformanceTests ?? [],
      ];
      for (const testId of cited) expect(titles, testId).toContain(testId);

      const layers = [capability.support.compiler, capability.support.runtime, capability.support.renderer];
      if (layers.includes("supported")) expect(capability.conformanceTests.length, capability.id).toBeGreaterThan(0);

      if (capability.introducedIn) {
        for (const language of ["motionscript", "scene-ir"] as const) {
          const version = language === "motionscript" ? capability.introducedIn.motionscript : capability.introducedIn.sceneIr;
          const record = releases.versions.find((item) => item.language === language && item.version === version && item.status === "released");
          expect(record, `${capability.id} ${language}`).toBeDefined();
          const notes = readFileSync(join(root, record!.file), "utf8");
          expect(notes, capability.id).toContain(capability.id);
        }
      } else {
        expect(pending.motionscript, capability.id).toContain(capability.id);
        expect(pending["scene-ir"], capability.id).toContain(capability.id);
      }

      for (const mapping of [capability.adapters.lottie, capability.adapters.svg]) {
        if (mapping.status === "exact" || mapping.status === "approximate" || mapping.status === "unsupported") {
          expect(mapping.scope && mapping.scope.length > 0, capability.id).toBe(true);
          expect(mapping.conformanceTests?.length ?? 0, capability.id).toBeGreaterThan(0);
        }
        if (mapping.status === "untested") expect(mapping.scope && mapping.scope.length > 0, capability.id).toBe(true);
      }
    }
  });
});
