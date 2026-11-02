/**
 * Run: turn the loaded program's current text into Scene IR. Instant mode
 * only; P002 adds Stream. No round-trip work happens here (that belongs to
 * Split mode, P004). Pure, so tests and agents share the Player's path.
 */
import { compileMotionScript } from "@gvr/compiler";
import { ImportRegistry, fixtureAdapter, formatImportReport, importSource } from "@gvr/format-import-core";
import { lottieAdapter } from "@gvr/format-lottie";
import { svgAdapter } from "@gvr/format-svg";
import { validateSceneIR, type SceneIR, type Telemetry } from "@gvr/schema";
import { locateDiagnostics, type LocatedDiagnostic, type ProgramFormat } from "../library";
import { readFrameMs } from "../timeline";

const registry = new ImportRegistry();
registry.register(fixtureAdapter);
registry.register(lottieAdapter);
registry.register(svgAdapter);

export type RunState = "ok" | "recovered" | "failed";

export interface RunOutcome {
  format: ProgramFormat;
  /** ok: scene and no errors; recovered: scene with errors; failed: no playable scene. */
  state: RunState;
  scene?: SceneIR;
  diagnostics: LocatedDiagnostic[];
  /** One-line result for the header/status and Report tab. */
  summary: string;
  /** Multi-line Report tab body (compile counts or importer fidelity report). */
  report: string;
  /** Step size for frame stepping. */
  frameMs: number;
  /** The exact text that was run, so the editor can tell when it changed. */
  source: string;
}

const isError = (severity: string) => severity === "error" || severity === "fatal";

export function runProgram(source: string, format: ProgramFormat, name: string, telemetry?: Telemetry): RunOutcome {
  if (format === "motionscript") return runMotionScript(source, telemetry);
  const adapter = registry.get(format) ?? fixtureAdapter;
  const result = importSource(adapter, source, { sourceName: name });
  const valid = result.scene && validateSceneIR(result.scene).ok ? result.scene : undefined;
  const diagnostics = locateDiagnostics(result.diagnostics, source);
  const errors = diagnostics.filter((item) => isError(item.severity)).length;
  const counts = `exact ${result.fidelity.exact.length} · approximated ${result.fidelity.approximated.length} · dropped ${result.fidelity.dropped.length} · unsupported ${result.fidelity.unsupported.length}`;
  const state: RunState = !valid ? "failed" : result.fidelity.overall === "exact" && errors === 0 ? "ok" : "recovered";
  const summary = !valid
    ? `Import produced no playable Scene IR (${result.fidelity.overall}). ${counts}.`
    : `Imported ${valid.sceneId} (${result.fidelity.overall}). ${counts}.`;
  return {
    format,
    state,
    scene: valid,
    diagnostics,
    summary,
    report: formatImportReport(result),
    frameMs: format === "lottie" ? readFrameMs(source) : 1000 / 30,
    source,
  };
}

function runMotionScript(source: string, telemetry?: Telemetry): RunOutcome {
  const compiled = compileMotionScript(source, telemetry);
  const valid = compiled.scene && validateSceneIR(compiled.scene).ok ? compiled.scene : undefined;
  const diagnostics = locateDiagnostics(compiled.diagnostics, source);
  const errors = diagnostics.filter((item) => isError(item.severity)).length;
  const state: RunState = !valid ? "failed" : compiled.ok && errors === 0 ? "ok" : "recovered";
  const shape = valid ? `${valid.nodes.length} nodes · ${(valid.timeline.durationMs / 1000).toFixed(2)} s · viewport ${valid.viewport.width}×${valid.viewport.height}` : "";
  const summary = state === "failed"
    ? `Run failed: no Scene IR. ${diagnostics.length} diagnostic${diagnostics.length === 1 ? "" : "s"}.`
    : state === "recovered"
      ? `Compiled ${valid!.sceneId} with ${errors} error${errors === 1 ? "" : "s"}; showing the recovered scene. ${shape}.`
      : `Compiled ${valid!.sceneId}. ${shape}.`;
  const report = [
    `STATUS\t${state}`,
    valid ? `SCENE\t${valid.sceneId}\t${shape}` : "SCENE\tnone",
    `DIAGNOSTICS\t${diagnostics.length}`,
    ...diagnostics.map((item) => `${item.severity.toUpperCase()}\t${item.text}${item.recovery ? `\n\trecovery: ${item.recovery}` : ""}`),
  ].join("\n");
  return { format: "motionscript", state, scene: valid, diagnostics, summary, report, frameMs: 1000 / 30, source };
}
