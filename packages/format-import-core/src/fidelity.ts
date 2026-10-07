import type { FidelityItem, FidelityReport, FidelityStatus, ImportDiagnostic } from "./types";

const SEVERITY = {
  exact: "info",
  approximated: "warning",
  dropped: "warning",
  unsupported: "error",
} as const;

/** Loss outranks approximation. No scene at all is a failed import. */
export function fidelityReport(items: readonly FidelityItem[], sceneProduced: boolean): FidelityReport {
  const exact = items.filter((item) => item.level === "exact");
  const approximated = items.filter((item) => item.level === "approximated");
  const dropped = items.filter((item) => item.level === "dropped");
  const unsupported = items.filter((item) => item.level === "unsupported");
  let overall: FidelityStatus = "exact";
  if (!sceneProduced) overall = "failed";
  else if (dropped.length > 0 || unsupported.length > 0) overall = "partial";
  else if (approximated.length > 0) overall = "degraded";
  return { overall, exact, approximated, dropped, unsupported };
}

export function diagnosticsFromFidelity(items: readonly FidelityItem[], sceneProduced: boolean): ImportDiagnostic[] {
  return items.map((item) => ({
    code: codeFor(item.level),
    severity: !sceneProduced && item.level === "unsupported" ? "fatal" : SEVERITY[item.level],
    fidelity: item.level,
    feature: item.feature,
    message: item.message,
    target: item.target,
    sourceSpan: item.sourceSpan,
  }));
}

function codeFor(level: FidelityItem["level"]): string {
  if (level === "exact") return "IMPORT_EXACT";
  if (level === "approximated") return "IMPORT_APPROXIMATED";
  if (level === "dropped") return "IMPORT_DROPPED";
  return "IMPORT_UNSUPPORTED";
}
