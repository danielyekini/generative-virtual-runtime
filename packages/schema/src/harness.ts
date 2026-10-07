import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Diagnostic } from "./diagnostics";
import { resolveLimits, type ResourceLimits } from "./limits";
import { validateDelta, validateResolvedFrame, validateSceneIR } from "./validate";

export interface ManifestCase {
  file: string;
  expect: "pass" | "fail";
  codes?: string[];
  limits?: Partial<ResourceLimits>;
  validator?: "scene" | "frame" | "delta";
}

export interface Manifest {
  cases: ManifestCase[];
}

export interface CaseResult {
  file: string;
  ok: boolean;
  expected: "pass" | "fail";
  matched: boolean;
  codes: string[];
  diagnostics: Diagnostic[];
}

export function checkManifest(manifestPath: string): CaseResult[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const root = dirname(manifestPath);
  return manifest.cases.map((entry) => checkCase(resolve(root, entry.file), entry));
}

export function checkCase(file: string, entry: ManifestCase): CaseResult {
  const json = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const limits = resolveLimits(entry.limits);
  const result =
    entry.validator === "frame"
      ? validateResolvedFrame(json)
      : entry.validator === "delta"
        ? validateDelta(json, limits)
        : validateSceneIR(json, limits);
  const codes: string[] = result.ok ? [] : result.diagnostics.map((item) => item.code);
  const codesMatch = (entry.codes ?? []).every((code) => codes.includes(code));
  const matched = entry.expect === "pass" ? result.ok : !result.ok && codesMatch;
  return {
    file,
    ok: result.ok,
    expected: entry.expect,
    matched,
    codes,
    diagnostics: result.ok ? [] : result.diagnostics,
  };
}

export function formatDiagnostic(item: Diagnostic): string {
  const where = item.path ?? item.target ?? "";
  return `${item.code}\t${item.severity}\t${where}\t${item.message}`;
}
