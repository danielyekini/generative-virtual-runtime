import type { ImportDiagnostic, ImportResult } from "./types";

/**
 * One stable text form shared by the CLI and the dev page.
 * COUNTS are conversion decisions. GROUP lines collapse repeated messages.
 * LOC keeps every source location.
 */
export function formatImportReport(result: ImportResult): string {
  const { fidelity } = result;
  const lines = [
    `STATUS\t${fidelity.overall}`,
    `COUNTS\tconversion\texact\t${fidelity.exact.length}\tapproximated\t${fidelity.approximated.length}\tdropped\t${fidelity.dropped.length}\tunsupported\t${fidelity.unsupported.length}`,
    ...formatGroupedDiagnostics(result.diagnostics),
  ];
  return lines.join("\n");
}

export function formatGroupedDiagnostics(items: readonly ImportDiagnostic[]): string[] {
  const groups: { code: string; severity: string; fidelity: string; message: string; locations: string[] }[] = [];
  const index = new Map<string, number>();
  for (const item of items) {
    const key = `${item.code}\0${item.severity}\0${item.fidelity}\0${item.message}`;
    let at = index.get(key);
    if (at === undefined) {
      at = groups.length;
      index.set(key, at);
      groups.push({
        code: item.code,
        severity: item.severity,
        fidelity: item.fidelity,
        message: item.message,
        locations: [],
      });
    }
    groups[at]!.locations.push(diagnosticLocation(item));
  }
  const lines: string[] = [];
  for (const group of groups) {
    lines.push(`GROUP\t${group.code}\t${group.severity}\t${group.fidelity}\t${group.locations.length}\t${group.message}`);
    for (const location of group.locations) lines.push(`LOC\t${location}`);
  }
  return lines;
}

function diagnosticLocation(item: ImportDiagnostic): string {
  if (item.target) return item.target;
  if (item.sourceSpan) return `${item.sourceSpan.start.line}:${item.sourceSpan.start.column}`;
  return "";
}

export function formatImportDiagnostic(item: ImportDiagnostic): string {
  const where = item.sourceSpan ? `${item.sourceSpan.start.line}:${item.sourceSpan.start.column}` : item.target ?? "";
  return `${item.code}\t${item.severity}\t${item.fidelity}\t${where}\t${item.message}`;
}

/**
 * The scene this import should draw.
 * A new import replaces the canvas. No scene, or exact 0 and approximated 0, clears it.
 */
export function displayedScene<T>(result: {
  scene?: T;
  fidelity?: { exact: readonly unknown[]; approximated: readonly unknown[] };
}): T | undefined {
  if (!result.scene) return undefined;
  const fidelity = result.fidelity;
  if (fidelity && fidelity.exact.length === 0 && fidelity.approximated.length === 0) return undefined;
  return result.scene;
}

/**
 * A failed attempt does not become the displayed scene.
 * When a previous scene is already on the canvas, it stays there and the attempt is still failed.
 */
export function retainedScene<T extends { sceneId: string }>(
  previous: T | undefined,
  result: {
    scene?: T;
    fidelity?: { exact: readonly unknown[]; approximated: readonly unknown[] };
  },
): { shown: T | undefined; importFailed: boolean; heldPrevious: boolean } {
  const accepted = displayedScene(result);
  if (accepted) return { shown: accepted, importFailed: false, heldPrevious: false };
  if (previous) return { shown: previous, importFailed: true, heldPrevious: true };
  return { shown: undefined, importFailed: true, heldPrevious: false };
}
