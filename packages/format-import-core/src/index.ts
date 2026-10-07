export { fixtureAdapter } from "./fixture-adapter";
export { diagnosticsFromFidelity, fidelityReport } from "./fidelity";
export { DEFAULT_IMPORT_LIMITS } from "./limits";
export type { ImportLimits } from "./limits";
export { allocateId, framesToMs, sanitiseName, secondsToMs, yUpToYDown } from "./normalise";
export { ImportRegistry, importSource, spanAt } from "./registry";
export { displayedScene, formatGroupedDiagnostics, formatImportDiagnostic, formatImportReport, retainedScene } from "./report";
export { IMPORT_VERSION } from "./types";
export type {
  AnimationFormatAdapter,
  DetectionResult,
  FidelityItem,
  FidelityLevel,
  FidelityReport,
  FidelityStatus,
  ImportCapability,
  ImportContext,
  ImportDiagnostic,
  ImportResult,
  ParseResult,
  SourceMetadata,
} from "./types";
