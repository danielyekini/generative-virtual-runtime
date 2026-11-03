import type { MotionScriptGenerator, StreamGenerationOptions } from "./types.js";

/**
 * Deterministic adapter for CI and pipeline proof. Streams canned responses in
 * chunks. Optional `sequence` returns successive bodies (director then program).
 * Not a model-speed claim.
 */
export class FixtureGenerator implements MotionScriptGenerator {
  readonly providerId = "fixture";
  readonly modelId: string;

  constructor(
    readonly program: string,
    options?: { modelId?: string; chunkChars?: number; delayMs?: number; sequence?: string[] },
  ) {
    this.modelId = options?.modelId ?? "fixture-replay/v1";
    this.chunkChars = options?.chunkChars ?? 48;
    this.delayMs = options?.delayMs ?? 0;
    this.sequence = options?.sequence ? [...options.sequence] : null;
  }

  private readonly chunkChars: number;
  private readonly delayMs: number;
  private readonly sequence: string[] | null;
  private sequenceIndex = 0;

  async stream(prompt: string, options: StreamGenerationOptions = {}): Promise<string> {
    void prompt;
    let body = this.program;
    if (this.sequence && this.sequenceIndex < this.sequence.length) {
      const next = this.sequence[this.sequenceIndex++];
      if (typeof next === "string") body = next;
    }
    const { signal, onChunk } = options;
    let out = "";
    for (let i = 0; i < body.length; i += this.chunkChars) {
      if (signal?.aborted) {
        const err = new Error("generation cancelled");
        err.name = "AbortError";
        throw err;
      }
      const text = body.slice(i, i + this.chunkChars);
      out += text;
      onChunk?.({ text, done: false });
      if (this.delayMs > 0) await delay(this.delayMs, signal);
    }
    onChunk?.({ text: "", done: true });
    return out;
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("generation cancelled");
      err.name = "AbortError";
      reject(err);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        const err = new Error("generation cancelled");
        err.name = "AbortError";
        reject(err);
      },
      { once: true },
    );
  });
}
