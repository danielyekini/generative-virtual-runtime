/** Structured diagnostic. Classification, severity, and execution effect stay independent. */

export const DIAGNOSTIC_CODES = [
  "INVALID_JSON",
  "UNSUPPORTED_IR_VERSION",
  "INVALID_ENUM",
  "INVALID_TYPE",
  "MISSING_REQUIRED",
  "DUPLICATE_ID",
  "INVALID_ID",
  "INVALID_OPACITY",
  "INVALID_ZOOM",
  "MALFORMED_PATH",
  "INVALID_PARENT",
  "CYCLE",
  "UNSUPPORTED_PROPERTY",
  "INVALID_TRACK_TARGET",
  "INVALID_TRACK_VALUE",
  "OVERLAPPING_WRITERS",
  "RESOURCE_LIMIT",
  "NON_FINITE",
  "INVALID_COLOR",
  "INVALID_GEOMETRY",
  "INVALID_KEYFRAMES",
  "INVALID_TIMING",
  "INVALID_CAMERA",
  "CAMERA_COUNT",
  "SPACE_VIOLATION",
  "INVALID_EXPRESSION",
  "INVALID_STROKE",
  "UNKNOWN_TARGET",
  "UNKNOWN_CHARACTER",
  "UNTERMINATED_STRING",
  "BAD_ESCAPE",
  "BAD_COLOR",
  "SEAL_BLOCKED",
  "PROGRAM_FATAL",
  "RUNTIME_DEGRADED",
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export type DiagnosticPhase =
  | "lex"
  | "parse"
  | "validate"
  | "compile"
  | "runtime"
  | "transport"
  | "present";

export type DiagnosticCategory =
  | "syntax"
  | "type"
  | "reference"
  | "temporal"
  | "resource"
  | "runtime"
  | "transport"
  | "planning";

export type DiagnosticSeverity = "info" | "warning" | "error" | "fatal";

export type ExecutionEffect =
  | "NONE"
  | "UNIT_REJECTED"
  | "SEAL_BLOCKED"
  | "PROGRAM_FATAL"
  | "RUNTIME_DEGRADED";

export interface SourcePoint {
  /** UTF-16 code-unit offset from the start of the source, 0-based. */
  offset: number;
  /** 1-based line. */
  line: number;
  /** 1-based column, counted in UTF-16 code units. */
  column: number;
}

export interface SourceSpan {
  start: SourcePoint;
  end: SourcePoint;
}

export interface Diagnostic {
  code: DiagnosticCode;
  phase: DiagnosticPhase;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  effect: ExecutionEffect;
  /** What a caller should do. This does not mutate the accepted scene. */
  recovery: string;
  message: string;
  /** JSON path inside an IR document, when the diagnostic is not source-located. */
  path?: string;
  generationId?: string;
  unitId?: number;
  sourceSpan?: SourceSpan;
  target?: string;
  sceneTimeMs?: number;
}

export function diagnostic(
  init: Omit<Diagnostic, "severity" | "effect" | "recovery"> &
    Partial<Pick<Diagnostic, "severity" | "effect" | "recovery">>,
): Diagnostic {
  return {
    severity: init.severity ?? "error",
    effect: init.effect ?? "UNIT_REJECTED",
    recovery:
      init.recovery ??
      "Reject this unit atomically. Keep the last accepted scene unchanged.",
    code: init.code,
    phase: init.phase,
    category: init.category,
    message: init.message,
    path: init.path,
    generationId: init.generationId,
    unitId: init.unitId,
    sourceSpan: init.sourceSpan,
    target: init.target,
    sceneTimeMs: init.sceneTimeMs,
  };
}
