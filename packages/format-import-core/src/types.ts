import type { SceneIR, SourceSpan } from "@gvr/schema";

export const IMPORT_VERSION = "0.1.0";

export type FidelityLevel = "exact" | "approximated" | "dropped" | "unsupported";

export type FidelityStatus = "exact" | "degraded" | "partial" | "failed";

export interface ImportCapability {
  feature: string;
  level: FidelityLevel;
  notes?: string;
}

export interface FidelityItem {
  feature: string;
  level: FidelityLevel;
  message: string;
  target?: string;
  sourceSpan?: SourceSpan;
}

export interface FidelityReport {
  overall: FidelityStatus;
  exact: FidelityItem[];
  approximated: FidelityItem[];
  dropped: FidelityItem[];
  unsupported: FidelityItem[];
}

export interface ImportDiagnostic {
  code: string;
  severity: "info" | "warning" | "error" | "fatal";
  fidelity: FidelityLevel;
  feature: string;
  message: string;
  target?: string;
  sourceSpan?: SourceSpan;
}

export interface SourceMetadata {
  formatId: string;
  adapterVersion: string;
  sourceBytes: number;
  name?: string;
}

export interface ImportResult {
  /** False only when no Scene IR is produced. */
  ok: boolean;
  scene?: SceneIR;
  diagnostics: ImportDiagnostic[];
  fidelity: FidelityReport;
  sourceMetadata: SourceMetadata;
}

export interface ImportContext {
  /** File name or other label. Not the source text. */
  sourceName?: string;
  /** Original text, used only to point diagnostics at a location. */
  sourceText: string;
  maxSourceBytes: number;
}

export interface DetectionResult {
  formatId: string;
  confident: boolean;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; diagnostics: ImportDiagnostic[] };

/**
 * A format adapter parses its own source and normalises into Scene IR.
 * It does not emit MotionScript, evaluate time, or draw.
 */
export interface AnimationFormatAdapter<TParsed = unknown> {
  readonly formatId: string;
  readonly extensions: readonly string[];
  readonly capabilities: readonly ImportCapability[];
  /** Import-only ceilings. They do not raise generated-program defaults or the 512 KiB source limit. */
  readonly validateLimits?: { maxNodes?: number; maxDepth?: number };
  detect?(source: string): DetectionResult;
  parse(source: string, context: ImportContext): ParseResult<TParsed>;
  normalise(parsed: TParsed, context: ImportContext): ImportResult;
}
