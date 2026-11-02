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

export type GenerationMetrics = {
  providerId: string;
  modelId: string;
  taskId: string;
  promptChars: number;
  referenceFingerprint: string | null;
  referencePath: string | null;
  ttfbMs: number | null;
  totalMs: number;
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
  cancelled: boolean;
  staleIgnored: boolean;
  status: "pass" | "fail" | "blocked" | "cancelled";
  notes: string[];
};
