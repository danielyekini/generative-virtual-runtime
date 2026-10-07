import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDataset, sha256Text, writesMotion } from "./dataset";
import { fixtureAdapter } from "./fixture-adapter";
import { importSource } from "./registry";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function file(name: string) {
  const path = join("fixtures/import/fixture", name);
  return { path, source: readFileSync(join(root, path), "utf8") };
}

const options = {
  formatId: "fixture",
  adapterVersion: "0.1.0",
  emitterVersion: "0.1.0",
  irVersion: "0.1",
  motionScriptVersion: "0.1",
};

describe("dataset manifest", () => {
  it("writes only items at or above the threshold, and never writes failures", () => {
    expect(writesMotion("exact", "exact")).toBe(true);
    expect(writesMotion("degraded", "exact")).toBe(false);
    expect(writesMotion("partial", "partial")).toBe(true);
    expect(writesMotion("failed", "partial")).toBe(false);
  });

  it("keeps known-loss statuses when the training filter asks for exact only", () => {
    const files = ["exact.json", "degraded.json", "partial.json", "failed.json"].map(file);
    const built = buildDataset(fixtureAdapter, files, { ...options, include: ["exact"] }, {
      emit: (scene) => `scene ${scene.sceneId}\n`,
    });
    const byStatus = Object.fromEntries(built.manifest.items.map((item) => [item.status, item]));
    expect(byStatus.exact?.included).toBe(true);
    expect(byStatus.degraded?.status).toBe("degraded");
    expect(byStatus.degraded?.included).toBe(false);
    expect(byStatus.partial?.status).toBe("partial");
    expect(byStatus.partial?.included).toBe(false);
    expect(byStatus.failed?.output).toBeUndefined();
    expect(byStatus.failed?.outputHash).toBeUndefined();
    expect(built.manifest.items.filter((item) => item.included).every((item) => item.status === "exact")).toBe(true);
    expect(built.manifest.counts.failed).toBe(1);
  });

  it("repeats the same manifest and output hashes", () => {
    const files = ["exact.json", "degraded.json", "failed.json"].map(file);
    const hooks = { emit: (scene: { sceneId: string }) => `scene "${scene.sceneId}";\n` };
    const first = buildDataset(fixtureAdapter, files, options, hooks);
    const second = buildDataset(fixtureAdapter, files, options, hooks);
    expect(second.manifest).toEqual(first.manifest);
    expect(second.outputs).toEqual(first.outputs);
    const exact = first.manifest.items.find((item) => item.status === "exact");
    expect(exact?.sourceHash).toBe(sha256Text(files[0]!.source));
    expect(exact?.outputHash).toBe(sha256Text(first.outputs[exact!.output!]!));
    expect(importSource(fixtureAdapter, files[0]!.source).fidelity.overall).toBe("exact");
  });
});
