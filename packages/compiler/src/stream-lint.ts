/**
 * Streaming authorship linter (E006).
 * Classifies offline validity vs progressive playability against released
 * MotionScript rules. Does not invent declarative entity syntax.
 */

import { DEFAULT_LIMITS, type SourceSpan } from "@gvr/schema";
import type { ProgramAst, UnitAst } from "./ast";
import { compileMotionScript } from "./compile";
import { parseMotionScript } from "./parse";
import { isSealedHistoryWrite } from "./sealed-write";

export type StreamLintCode =
  | "OVERSIZED_UNIT"
  | "EARLY_SEAL"
  | "LATE_FIRST_SEAL"
  | "SETUP_BEFORE_USEFUL"
  | "NO_SEAL"
  | "SEALED_HISTORY_WRITE"
  | "UNRESOLVED_DEPENDENCY"
  | "COMPILE_ERROR";

export type StreamLintSeverity = "error" | "advisory";

export interface StreamLintFinding {
  code: StreamLintCode;
  severity: StreamLintSeverity;
  message: string;
  sourceSpan?: SourceSpan;
  unitIndex?: number;
  unitBytes?: number;
}

export interface StreamLintOptions {
  /** UTF-8 budget for one top-level unit (default DEFAULT_LIMITS.maxBufferedUnitBytes). */
  maxBufferedUnitBytes?: number;
  /** Bytes before the first seal that trigger LATE_FIRST_SEAL (default 64 KiB). */
  lateFirstSealBytes?: number;
  /** Treat LATE_FIRST_SEAL / SETUP_BEFORE_USEFUL / NO_SEAL as errors (default advisory). */
  strictProgressive?: boolean;
}

export interface StreamLintResult {
  offlineOk: boolean;
  progressiveOk: boolean;
  sealedThroughMs: number;
  completed: boolean;
  unitCount: number;
  sealCount: number;
  findings: StreamLintFinding[];
  compileDiagnostics: ReturnType<typeof compileMotionScript>["diagnostics"];
}

const DEFAULT_LATE_FIRST_SEAL_BYTES = 64 * 1024;

/**
 * Top-level unit AST spans currently cover the opening token only. Measure each
 * unit as the UTF-8 slice from its start offset to the next unit (or complete).
 */
function topLevelUnitByteSizes(source: string, program: ProgramAst): number[] {
  const starts = program.units.map((unit) => unit.span.start.offset);
  const completeAt = source.search(/\bcomplete\s*;/);
  const endFallback = completeAt >= 0 ? completeAt : source.length;
  return program.units.map((_, index) => {
    const start = starts[index] ?? 0;
    const end = starts[index + 1] ?? endFallback;
    return new TextEncoder().encode(source.slice(start, Math.max(start, end))).byteLength;
  });
}

function isWriterUnit(unit: UnitAst): boolean {
  return unit.kind === "animate" || unit.kind === "keyframes" || unit.kind === "step";
}

function unitIntroducesDrawable(unit: UnitAst): boolean {
  if (unit.kind === "node") return true;
  if (unit.kind === "batch") return unit.items.some(unitIntroducesDrawable);
  return false;
}

function unitIntroducesWriter(unit: UnitAst): boolean {
  if (isWriterUnit(unit)) return true;
  if (unit.kind === "batch") return unit.items.some(unitIntroducesWriter);
  return false;
}

function advisorySeverity(options: StreamLintOptions): StreamLintSeverity {
  return options.strictProgressive ? "error" : "advisory";
}

/**
 * Lint a MotionScript source for offline vs progressive streaming authorship.
 */
export function lintStreamingAuthorship(source: string, options: StreamLintOptions = {}): StreamLintResult {
  const maxUnit = options.maxBufferedUnitBytes ?? DEFAULT_LIMITS.maxBufferedUnitBytes;
  const lateBytes = options.lateFirstSealBytes ?? DEFAULT_LATE_FIRST_SEAL_BYTES;
  const findings: StreamLintFinding[] = [];

  const parsed: ProgramAst = parseMotionScript(source);
  for (const diagnostic of parsed.diagnostics) {
    findings.push({
      code: "COMPILE_ERROR",
      severity: "error",
      message: diagnostic.message,
      sourceSpan: diagnostic.sourceSpan,
    });
  }

  const compiled = compileMotionScript(source);
  for (const diagnostic of compiled.diagnostics) {
    if (diagnostic.code === "SEAL_BLOCKED") {
      findings.push({
        code: "UNRESOLVED_DEPENDENCY",
        severity: "error",
        message: diagnostic.message,
        sourceSpan: diagnostic.sourceSpan,
      });
    } else if (isSealedHistoryWrite(diagnostic)) {
      // Only writes behind the sealed horizon (E047). Other INVALID_TIMING
      // diagnostics are ordinary compile errors below.
      findings.push({
        code: "SEALED_HISTORY_WRITE",
        severity: "error",
        message: diagnostic.message,
        sourceSpan: diagnostic.sourceSpan,
      });
    } else if (diagnostic.code === "RESOURCE_LIMIT") {
      findings.push({
        code: "OVERSIZED_UNIT",
        severity: "error",
        message: diagnostic.message,
        sourceSpan: diagnostic.sourceSpan,
      });
    } else if (!compiled.ok) {
      findings.push({
        code: "COMPILE_ERROR",
        severity: "error",
        message: diagnostic.message,
        sourceSpan: diagnostic.sourceSpan,
      });
    }
  }

  let sealCount = 0;
  let firstSealIndex: number | undefined;
  let firstSealSpan: SourceSpan | undefined;
  let bytesBeforeFirstSeal = 0;
  let sawDrawableBeforeFirstSeal = false;
  let sawWriterBeforeFirstSeal = false;
  let measuredPrefixBytes = 0;
  const unitSizes = topLevelUnitByteSizes(source, parsed);

  if (parsed.header) {
    measuredPrefixBytes += new TextEncoder().encode(
      source.slice(parsed.header.span.start.offset, parsed.header.span.end.offset),
    ).byteLength;
  }

  parsed.units.forEach((unit, index) => {
    const bytes = unitSizes[index] ?? 0;
    if (bytes > maxUnit) {
      findings.push({
        code: "OVERSIZED_UNIT",
        severity: "error",
        message: `Unit is ${bytes} UTF-8 bytes; limit is ${maxUnit}.`,
        sourceSpan: unit.span,
        unitIndex: index,
        unitBytes: bytes,
      });
    }

    if (firstSealIndex === undefined) {
      measuredPrefixBytes += bytes;
      if (unitIntroducesDrawable(unit)) sawDrawableBeforeFirstSeal = true;
      if (unitIntroducesWriter(unit)) sawWriterBeforeFirstSeal = true;
    }

    if (unit.kind === "seal") {
      sealCount += 1;
      if (firstSealIndex === undefined) {
        firstSealIndex = index;
        firstSealSpan = unit.span;
        bytesBeforeFirstSeal = measuredPrefixBytes;
        if (!sawDrawableBeforeFirstSeal) {
          findings.push({
            code: "EARLY_SEAL",
            severity: "error",
            message: "First seal occurs before any drawable node is declared.",
            sourceSpan: unit.span,
            unitIndex: index,
          });
        } else if (!sawWriterBeforeFirstSeal) {
          findings.push({
            code: "SETUP_BEFORE_USEFUL",
            severity: "error",
            message: "Drawable setup reaches the first seal without time-local writers.",
            sourceSpan: firstSealSpan,
            unitIndex: index,
          });
        }
        if (bytesBeforeFirstSeal > lateBytes) {
          findings.push({
            code: "LATE_FIRST_SEAL",
            severity: advisorySeverity(options),
            message: `First seal is preceded by ${bytesBeforeFirstSeal} UTF-8 bytes (advisory threshold ${lateBytes}).`,
            sourceSpan: unit.span,
            unitIndex: index,
            unitBytes: bytesBeforeFirstSeal,
          });
        }
      }
    }
  });

  if (sealCount === 0 && compiled.ok && compiled.completed) {
    findings.push({
      code: "NO_SEAL",
      severity: advisorySeverity(options),
      message: "Program completes offline without progressive seal units.",
    });
  }

  // Deduplicate identical code+message pairs from parse+compile overlap.
  const seen = new Set<string>();
  const unique = findings.filter((finding) => {
    const key = `${finding.code}:${finding.message}:${finding.sourceSpan?.start.offset ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const offlineOk = compiled.ok && compiled.completed && parsed.diagnostics.length === 0;
  const hasProgressiveError = unique.some((finding) => finding.severity === "error");
  const progressiveOk = offlineOk && sealCount > 0 && !hasProgressiveError;

  return {
    offlineOk,
    progressiveOk,
    sealedThroughMs: compiled.sealedThroughMs,
    completed: compiled.completed,
    unitCount: parsed.units.length,
    sealCount,
    findings: unique,
    compileDiagnostics: compiled.diagnostics,
  };
}
