import { stripModelFences } from "./text.js";
import type { MotionScriptGenerator, StreamGenerationOptions } from "./types.js";

export const PINNED_OLLAMA_MODEL = "qwen2.5-coder:14b";
export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

/**
 * Pinned live provider for P007: local Ollama `qwen2.5-coder:14b`.
 * Host-only; no cloud API key. Uses Ollama native streaming `/api/chat`.
 */
export class OllamaGenerator implements MotionScriptGenerator {
  readonly providerId = "ollama";
  readonly modelId: string;
  private readonly host: string;

  constructor(options?: { modelId?: string; host?: string }) {
    this.modelId = options?.modelId ?? process.env.GVR_LLM_MODEL ?? PINNED_OLLAMA_MODEL;
    this.host = (options?.host ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST).replace(/\/$/, "");
  }

  async stream(prompt: string, options: StreamGenerationOptions = {}): Promise<string> {
    const { signal, onChunk, system } = options;
    const response = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelId,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              system ??
              "You write MotionScript only. Output a complete program ending with complete; and nothing else. No markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        options: {
          temperature: 0.2,
        },
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Ollama HTTP ${response.status} for model ${this.modelId}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        const err = new Error("generation cancelled");
        err.name = "AbortError";
        throw err;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let json: { message?: { content?: string }; done?: boolean };
        try {
          json = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
        } catch {
          continue;
        }
        const text = json.message?.content ?? "";
        if (text) {
          out += text;
          onChunk?.({ text, done: false });
        }
        if (json.done) {
          onChunk?.({ text: "", done: true });
          return stripModelFences(out);
        }
      }
    }
    onChunk?.({ text: "", done: true });
    return stripModelFences(out);
  }
}

export async function ollamaModelAvailable(
  modelId = PINNED_OLLAMA_MODEL,
  host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
): Promise<boolean> {
  try {
    const response = await fetch(`${host.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { models?: Array<{ name?: string }> };
    return (body.models ?? []).some((model) => model.name === modelId || model.name?.startsWith(`${modelId}:`));
  } catch {
    return false;
  }
}
