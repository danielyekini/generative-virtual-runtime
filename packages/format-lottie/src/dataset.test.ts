import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDataset } from "@gvr/format-import-core/dataset";
import { emitMotionScript, EMITTER_VERSION } from "@gvr/motionscript-emitter";
import { verifyRoundTrip } from "@gvr/round-trip";
import { DSL_VERSION, IR_VERSION } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { LOTTIE_ADAPTER_VERSION, lottieAdapter } from "./adapter";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/import/lottie");

const options = {
  formatId: "lottie",
  adapterVersion: LOTTIE_ADAPTER_VERSION,
  emitterVersion: EMITTER_VERSION,
  irVersion: IR_VERSION,
  motionScriptVersion: DSL_VERSION,
};

function files() {
  return readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".json") && !name.includes("expected"))
    .sort()
    .map((name) => ({
      path: `fixtures/import/lottie/${name}`,
      source: readFileSync(join(fixtureDir, name), "utf8"),
    }));
}

describe("lottie dataset manifest", () => {
  it("repeats hashes and never labels a known loss as exact", () => {
    const hooks = {
      emit: emitMotionScript,
      verify: (scene: Parameters<typeof verifyRoundTrip>[0]) => verifyRoundTrip(scene).ok,
    };
    const first = buildDataset(lottieAdapter, files(), options, hooks);
    const second = buildDataset(lottieAdapter, files(), { ...options, include: ["exact"] }, hooks);
    expect(second.outputs).toEqual(first.outputs);
    expect(second.manifest.counts).toEqual(first.manifest.counts);
    expect(second.manifest.items.map((item) => [item.input, item.status, item.sourceHash, item.outputHash])).toEqual(
      first.manifest.items.map((item) => [item.input, item.status, item.sourceHash, item.outputHash]),
    );

    const exact = first.manifest.items.filter((item) => item.status === "exact");
    const degraded = first.manifest.items.filter((item) => item.status === "degraded");
    const losses = first.manifest.items.filter((item) => item.status === "partial" || item.status === "failed" || item.status === "degraded");
    expect(exact.length).toBeGreaterThan(0);
    expect(losses.length).toBeGreaterThan(0);
    expect(exact.every((item) => item.outputHash && item.roundTripVerified)).toBe(true);
    expect(degraded.every((item) => item.status === "degraded" && item.included)).toBe(true);
    expect(second.manifest.items.filter((item) => item.included).every((item) => item.status === "exact")).toBe(true);
    expect(second.manifest.items.find((item) => item.input.endsWith("easing_bezier.json"))?.status).toBe("exact");
    expect(second.manifest.items.find((item) => item.input.endsWith("malformed.json"))?.outputHash).toBeUndefined();
    expect(first.manifest.adapterVersion).toBe(LOTTIE_ADAPTER_VERSION);
    expect(first.manifest.emitterVersion).toBe(EMITTER_VERSION);
  });
});
