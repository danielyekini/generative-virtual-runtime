export interface CaptureClassification {
  executionRoute: "production" | "diagnostic-continuation";
  referenceStatus: "PASS" | "FAIL" | "UNVERIFIED";
  nativeStatus: "PASS" | "FAIL" | "NOT_REACHED" | "DIAGNOSTIC";
}

/**
 * Diagnostic-continuation frames are labeled and never counted as a native pass.
 * A reference player exception leaves the oracle unverified.
 */
export function classifyCapture(input: {
  sceneKind: string;
  logs: readonly string[];
  referenceFrames: number;
  nativeFrames: number;
  nativePrepared: boolean;
}): CaptureClassification {
  const diagnostic = input.sceneKind.startsWith("diagnostic");
  const referenceThrew = input.logs.some((line) => /Uncaught|TypeError/i.test(line));
  return {
    executionRoute: diagnostic ? "diagnostic-continuation" : "production",
    referenceStatus: referenceThrew ? "UNVERIFIED" : input.referenceFrames > 0 ? "PASS" : "FAIL",
    nativeStatus: diagnostic
      ? "DIAGNOSTIC"
      : input.nativePrepared
        ? input.nativeFrames > 0
          ? "PASS"
          : "FAIL"
        : "NOT_REACHED",
  };
}
