/**
 * Headless Node probe for physics.planar2d: compile fixture → PhysicsSession overlay.
 *
 *   node --import tsx packages/runtime/scripts/physics-studio-probe.mts [outdir]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "../src/runtime.ts";
import { createScenePhysicsSession } from "../src/physics-scene.ts";
import { sampleScene } from "../src/sample.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outDir = resolve(process.argv[2] || resolve(here, "physics-studio-out"));
mkdirSync(outDir, { recursive: true });

const source = readFileSync(resolve(root, "fixtures/motionscript/physics-marble.ms"), "utf8");
const compiled = compileMotionScript(source);
if (!compiled.ok || !compiled.scene) {
  console.error(compiled.diagnostics);
  process.exit(1);
}
const scene = compiled.scene;
const physics = createScenePhysicsSession(scene)!;
const runtime = new AnimationRuntime(scene);
const dt = 1000 / 60;
const samples: { t: number; y: number; resting: boolean }[] = [];
for (let step = 0; step < 120; step += 1) {
  const t = (step + 1) * dt;
  physics.advance(sampleScene(scene, t), t);
  let y = 0;
  runtime.evaluate(t, (sampled) => {
    const applied = physics.applyTo(sampled);
    y = applied.nodes.find((node) => node.id === "Marble")!.transform.position.y;
    return applied;
  });
  samples.push({ t, y, resting: y > 240 && y < 270 });
}
physics.dispose();
const last = samples.at(-1)!;
const pass = last.y > 240 && last.y < 270;
const report = {
  fixture: "physics-marble.ms",
  capability: "physics.planar2d",
  pass,
  finalMarbleY: last.y,
  samples: samples.filter((_, i) => i % 20 === 0 || i === samples.length - 1),
};
writeFileSync(resolve(outDir, "physics-studio-probe.json"), JSON.stringify(report, null, 2));
console.log(pass ? "PASS" : "FAIL", `marble y=${last.y.toFixed(2)}`);
process.exit(pass ? 0 : 1);
