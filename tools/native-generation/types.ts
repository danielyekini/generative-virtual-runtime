/** P007 generation adapter contract. Provider secrets stay in the host env. */

export type GenerationChunk = {
  text: string;
  done?: boolean;
};

export type StreamGenerationOptions = {
  signal?: AbortSignal;
  onChunk?: (chunk: GenerationChunk) => void;
  /** Optional system/context text (typically the P006 reference). */
  system?: string;
};

export interface MotionScriptGenerator {
  readonly providerId: string;
  readonly modelId: string;
  stream(prompt: string, options?: StreamGenerationOptions): Promise<string>;
}

export type GenerationApproach = "direct" | "director";

export type GenerationMetrics = {
  providerId: string;
  modelId: string;
  taskId: string;
  approach: GenerationApproach;
  promptChars: number;
  referenceFingerprint: string | null;
  referencePath: string | null;
  ttfbMs: number | null;
  totalMs: number;
  directorMs: number | null;
  implementMs: number | null;
  firstSealMs: number | null;
  firstSealHorizonMs: number | null;
  firstSealBytes: number | null;
  sourceChars: number;
  estimatedTokensUtf16Div4: number;
  offlineOk: boolean;
  progressiveOk: boolean;
  compileErrorCount: number;
  runtimeRejectCount: number;
  repairAttempts: number;
  directorOk: boolean | null;
  cancelled: boolean;
  staleIgnored: boolean;
  status: "pass" | "fail" | "blocked" | "cancelled";
  notes: string[];
};
