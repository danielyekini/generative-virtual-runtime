import { createHash } from "node:crypto";
import type { SceneIR } from "@gvr/schema";
import { importSource } from "./registry";
import type { AnimationFormatAdapter, FidelityStatus, ImportResult } from "./types";

export const DATASET_MANIFEST_VERSION = "0.1";

const RANK: Record<FidelityStatus, number> = {
  exact: 3,
  degraded: 2,
  partial: 1,
  failed: 0,
};

export interface DatasetFile {
  /** Relative path. The manifest stores this string unchanged. */
  path: string;
  source: string;
}

export interface DatasetOptions {
  formatId: string;
  adapterVersion: string;
  emitterVersion: string;
  irVersion: string;
  motionScriptVersion: string;
  /**
   * Lowest status that still receives a `.motion` file.
   * `failed` never writes. Default is `partial` (exact, degraded, and partial).
   */
  writeAt?: "exact" | "degraded" | "partial";
  /**
   * Statuses marked `included` for a training filter.
   * This flag does not change `status`. A degraded import stays degraded.
   */
  include?: readonly FidelityStatus[];
}

export interface DatasetDiagnostic {
  code: string;
  feature: string;
  fidelity: string;
  message: string;
}

export interface DatasetItem {
  input: string;
  output?: string;
  status: FidelityStatus;
  sourceHash: string;
  outputHash?: string;
  roundTripVerified: boolean;
  included: boolean;
  diagnostics: DatasetDiagnostic[];
}

export interface DatasetManifest {
  manifestVersion: typeof DATASET_MANIFEST_VERSION;
  format: string;
  adapterVersion: string;
  emitterVersion: string;
  irVersion: string;
  motionScriptVersion: string;
  status: "complete";
  counts: Record<FidelityStatus, number>;
  items: DatasetItem[];
}

export interface DatasetBuild {
  manifest: DatasetManifest;
  /** MotionScript text keyed by the output path. Absent when the item was not written. */
  outputs: Record<string, string>;
}

export interface DatasetHooks {
  emit: (scene: SceneIR) => string;
  verify?: (scene: SceneIR) => boolean;
}

/** sha256 hex of the exact text, used for source and MotionScript bytes. */
export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** True when an item is good enough to write. Failed imports never write. */
export function writesMotion(status: FidelityStatus, writeAt: "exact" | "degraded" | "partial"): boolean {
  if (status === "failed") return false;
  return RANK[status] >= RANK[writeAt];
}

/**
 * Convert a file list with one adapter. The same files and hooks produce the same
 * manifest, including source and output hashes. Filtering only sets `included`.
 */
export function buildDataset(
  adapter: AnimationFormatAdapter,
  files: readonly DatasetFile[],
  options: DatasetOptions,
  hooks: DatasetHooks,
): DatasetBuild {
  const writeAt = options.writeAt ?? "partial";
  const include = new Set<FidelityStatus>(options.include ?? ["exact", "degraded", "partial", "failed"]);
  const outputs: Record<string, string> = {};
  const items: DatasetItem[] = [];
  const counts: Record<FidelityStatus, number> = { exact: 0, degraded: 0, partial: 0, failed: 0 };

  for (const file of files) {
    const imported = importSource(adapter, file.source, { sourceName: file.path });
    const status = imported.fidelity.overall;
    counts[status] += 1;
    const output = outputName(file.path);
    const write = writesMotion(status, writeAt) && imported.scene !== undefined;
    let motion: string | undefined;
    let roundTripVerified = false;
    if (write && imported.scene) {
      motion = hooks.emit(imported.scene);
      outputs[output] = motion;
      roundTripVerified = hooks.verify?.(imported.scene) ?? false;
    }
    items.push({
      input: file.path,
      output: motion === undefined ? undefined : output,
      status,
      sourceHash: sha256Text(file.source),
      outputHash: motion === undefined ? undefined : sha256Text(motion),
      roundTripVerified,
      included: include.has(status),
      diagnostics: diagnosticsOf(imported),
    });
  }

  return {
    manifest: {
      manifestVersion: DATASET_MANIFEST_VERSION,
      format: options.formatId,
      adapterVersion: options.adapterVersion,
      emitterVersion: options.emitterVersion,
      irVersion: options.irVersion,
      motionScriptVersion: options.motionScriptVersion,
      status: "complete",
      counts,
      items,
    },
    outputs,
  };
}

function outputName(input: string): string {
  const slash = Math.max(input.lastIndexOf("/"), input.lastIndexOf("\\"));
  const dot = input.lastIndexOf(".");
  if (dot > slash) return `${input.slice(0, dot)}.motion`;
  return `${input}.motion`;
}

function diagnosticsOf(imported: ImportResult): DatasetDiagnostic[] {
  return imported.diagnostics.map((item) => ({
    code: item.code,
    feature: item.feature,
    fidelity: item.fidelity,
    message: item.message,
  }));
}
