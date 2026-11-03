/**
 * Browser Ollama client for Studio Generate. Talks through the Vite `/ollama`
 * proxy (or a same-origin absolute host) so the workbench can reach local Ollama
 * without CORS. Host/settings stay out of MotionScript.
 */
import { stripModelFences } from "../../../../tools/native-generation/text";
import type { MotionScriptGenerator, StreamGenerationOptions } from "../../../../tools/native-generation/types";
import { STUDIO_GENERATE_MODEL } from "./generate-reference";

export const DEFAULT_STUDIO_OLLAMA_BASE = "/ollama";

export class StudioOllamaGenerator implements MotionScriptGenerator {
  readonly providerId = "ollama";
  readonly modelId: string;
  private readonly base: string;

  constructor(options?: { modelId?: string; base?: string }) {
    this.modelId = options?.modelId ?? STUDIO_GENERATE_MODEL;
    this.base = (options?.base ?? DEFAULT_STUDIO_OLLAMA_BASE).replace(/\/$/, "");
  }

  async stream(prompt: string, options: StreamGenerationOptions = {}): Promise<string> {
    const { signal, onChunk, system } = options;
    const response = await fetch(`${this.base}/api/chat`, {
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
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(
        response.status === 0 || response.type === "error"
          ? `Ollama unreachable at ${this.base} (is it running?).`
          : `Ollama HTTP ${response.status} for model ${this.modelId}`,
      );
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

export async function studioOllamaAvailable(
  modelId = STUDIO_GENERATE_MODEL,
  base = DEFAULT_STUDIO_OLLAMA_BASE,
): Promise<boolean> {
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { models?: Array<{ name?: string }> };
    return (body.models ?? []).some((model) => model.name === modelId || model.name?.startsWith(`${modelId}:`));
  } catch {
    return false;
  }
}
