import { validateSceneIR } from "@gvr/schema";
import { DEFAULT_IMPORT_LIMITS } from "./limits";
import { diagnosticsFromFidelity, fidelityReport } from "./fidelity";
import { IMPORT_VERSION, type AnimationFormatAdapter, type ImportContext, type ImportDiagnostic, type ImportResult } from "./types";

export class ImportRegistry {
  private readonly adapters = new Map<string, AnimationFormatAdapter>();

  register(adapter: AnimationFormatAdapter): void {
    this.adapters.set(adapter.formatId, adapter);
  }

  get(formatId: string): AnimationFormatAdapter | undefined {
    return this.adapters.get(formatId);
  }

  formats(): AnimationFormatAdapter[] {
    return [...this.adapters.values()];
  }
}

export function importSource(adapter: AnimationFormatAdapter, source: string, overrides?: Partial<ImportContext>): ImportResult {
  const context: ImportContext = {
    sourceName: overrides?.sourceName,
    sourceText: source,
    maxSourceBytes: overrides?.maxSourceBytes ?? DEFAULT_IMPORT_LIMITS.maxSourceBytes,
  };
  const metadata = {
    formatId: adapter.formatId,
    adapterVersion: IMPORT_VERSION,
    sourceBytes: byteLength(source),
    name: context.sourceName,
  };
  if (metadata.sourceBytes > context.maxSourceBytes) {
    return failed(metadata, [
      diagnostic("IMPORT_LIMIT", "Source exceeds the import size limit.", spanAt(source, 0)),
    ]);
  }
  const parsed = adapter.parse(source, context);
  if (!parsed.ok) return failed(metadata, parsed.diagnostics);
  const result = adapter.normalise(parsed.value, context);
  if (!result.scene) return { ...result, ok: false, sourceMetadata: { ...metadata, name: result.sourceMetadata.name } };
  const validated = validateSceneIR(result.scene, adapter.validateLimits);
  if (!validated.ok) {
    const diagnostics = [
      ...result.diagnostics,
      diagnostic("IMPORT_INVALID_IR", validated.diagnostics[0]?.message ?? "Imported Scene IR did not validate."),
    ];
    return failed(metadata, diagnostics, result.sourceMetadata.name);
  }
  return { ...result, ok: true, scene: validated.value, sourceMetadata: { ...metadata, name: result.sourceMetadata.name ?? metadata.name } };
}

function failed(
  metadata: ImportResult["sourceMetadata"],
  diagnostics: ImportDiagnostic[],
  name?: string,
): ImportResult {
  return {
    ok: false,
    diagnostics,
    fidelity: fidelityReport(
      diagnostics.map((item) => ({
        feature: item.feature,
        level: item.fidelity,
        message: item.message,
        target: item.target,
        sourceSpan: item.sourceSpan,
      })),
      false,
    ),
    sourceMetadata: { ...metadata, name: name ?? metadata.name },
  };
}

function diagnostic(code: string, message: string, sourceSpan?: ImportDiagnostic["sourceSpan"]): ImportDiagnostic {
  return {
    code,
    severity: "fatal",
    fidelity: "unsupported",
    feature: "source",
    message,
    sourceSpan,
  };
}

function byteLength(source: string): number {
  return new TextEncoder().encode(source).length;
}

export function spanAt(source: string, offset: number): ImportDiagnostic["sourceSpan"] {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let column = 1;
  for (let index = 0; index < clamped; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 1;
    } else column += 1;
  }
  const point = { offset: clamped, line, column };
  return { start: point, end: point };
}
