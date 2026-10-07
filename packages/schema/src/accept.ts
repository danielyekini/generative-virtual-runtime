import { isKnownCapability } from "./capabilities";
import { diagnostic, type Diagnostic } from "./diagnostics";
import { migrateSceneTo02 } from "./migrate";
import type { SceneIR } from "./types";
import { validateSceneIR, type ValidateResult } from "./validate";

/**
 * A 0.2 consumer loads 0.1 through migration.
 * A 0.1 consumer rejects 0.2.
 * Missing capabilities and unready resources reject the scene before playback.
 */
export function acceptScene(
  scene: SceneIR,
  options: { consumer: "0.1" | "0.2"; enabled: readonly string[] },
): ValidateResult<SceneIR> {
  const validated = validateSceneIR(scene);
  if (!validated.ok) return validated;
  if (options.consumer === "0.1") {
    if (validated.value.irVersion !== "0.1") {
      return fail("UNSUPPORTED_IR_VERSION", "A 0.1 consumer cannot load Scene IR 0.2.");
    }
    return validated;
  }
  const migrated = validated.value.irVersion === "0.1" ? migrateSceneTo02(validated.value) : validated.value;
  const again = validateSceneIR(migrated);
  if (!again.ok) return again;
  const required = again.value.requiredCapabilities ?? [];
  const unknown = required.filter((name) => !isKnownCapability(name));
  if (unknown.length > 0) {
    return fail("INVALID_ENUM", `Unknown capabilities: ${unknown.join(", ")}.`);
  }
  const missing = required.filter((name) => !options.enabled.includes(name));
  if (missing.length > 0) {
    return fail("MISSING_REQUIRED", `Missing required capabilities: ${missing.join(", ")}.`);
  }
  const blocked = again.value.resources.filter((resource) => resource.readiness === "pending" || resource.readiness === "failed");
  if (blocked.length > 0) {
    return fail("MISSING_REQUIRED", `Resource ${blocked[0]?.id ?? ""} is not ready.`);
  }
  return again;
}

function fail(code: "UNSUPPORTED_IR_VERSION" | "MISSING_REQUIRED" | "INVALID_ENUM", message: string): ValidateResult<SceneIR> {
  const item: Diagnostic = diagnostic({
    code,
    phase: "validate",
    category: code === "MISSING_REQUIRED" ? "resource" : "type",
    effect: "PROGRAM_FATAL",
    message,
  });
  return { ok: false, diagnostics: [item] };
}
