import type { MotionScriptGenerator, StreamGenerationOptions } from "./types.js";

/**
 * Deterministic adapter for CI and pipeline proof. Streams a canned MotionScript
 * program in chunks. Not a model-speed claim.
 */
export class FixtureGenerator implements MotionScriptGenerator {
  readonly providerId = "fixture";
  readonly modelId: string;

  constructor(
    readonly program: string,
    options?: { modelId?: string; chunkChars?: number; delayMs?: number },
  ) {
    this.modelId = options?.modelId ?? "fixture-replay/v1";
    this.chunkChars = options?.chunkChars ?? 48;
    this.delayMs = options?.delayMs ?? 0;
  }

  private readonly chunkChars: number;
  private readonly delayMs: number;

  async stream(prompt: string, options: StreamGenerationOptions = {}): Promise<string> {
    void prompt;
    const { signal, onChunk } = options;
    let out = "";
    for (let i = 0; i < this.program.length; i += this.chunkChars) {
      if (signal?.aborted) {
        const err = new Error("generation cancelled");
        err.name = "AbortError";
        throw err;
      }
      const text = this.program.slice(i, i + this.chunkChars);
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
