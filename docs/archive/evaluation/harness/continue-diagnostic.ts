/** Downstream checks for scenes production importSource refused. Not a native pass. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import { emitMotionScript } from "@gvr/motionscript-emitter";
import { AnimationRuntime } from "@gvr/runtime";
import { validateSceneIR, type SceneIR } from "@gvr/schema";

const evidence = resolve(import.meta.dirname, "../evidence");
const resultsPath = resolve(evidence, "results.json");
const results = JSON.parse(readFileSync(resultsPath, "utf8")) as { fixtures: Record<string, unknown>[] };

for (const id of ["LOT-03", "SVG-01", "SVG-02"]) {
  const scenePath = resolve(evidence, "fixtures", id, "diagnostic-scene.json");
  const scene = JSON.parse(readFileSync(scenePath, "utf8")) as SceneIR;
  const validation = validateSceneIR(scene);
  const record: Record<string, unknown> = {
    note: "Production importSource did not accept this scene. These steps call the same emitter, compiler, and runtime on the normalise output.",
    validationOk: validation.ok,
  };
  try {
    const script = emitMotionScript(scene);
    writeFileSync(resolve(evidence, "fixtures", id, "diagnostic.motion"), script);
    record.emit = { ok: true, chars: script.length };
    const compiled = compileMotionScript(script);
    record.compile = {
      ok: compiled.ok,
      diagnostics: compiled.diagnostics.slice(0, 12).map((item) => ({ code: item.code, message: item.message })),
    };
  } catch (error) {
    record.emitError = error instanceof Error ? error.message : String(error);
  }
  try {
    const runtime = new AnimationRuntime(scene);
    const frame = runtime.evaluate(0);
    record.runtime = { ok: true, drawItems: frame.drawItems.length, diagnostics: runtime.lastDiagnostics.length };
  } catch (error) {
    record.runtime = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const fixture = results.fixtures.find((item) => item.id === id);
  if (fixture) fixture.diagnosticContinuation = record;
  console.log(id, JSON.stringify(record));
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2));
