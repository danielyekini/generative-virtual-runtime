/**
 * Studio Generate session (P019 / P022): transcript turns + P007/P008 pipeline.
 */
import {
  disposeGenerationSession,
  runGenerationPipeline,
  type PipelineResult,
} from "../../../../tools/native-generation/pipeline";
import type { GenerationApproach, GenerationMetrics } from "../../../../tools/native-generation/types";
import { loadStudioReference, STUDIO_GENERATE_MODEL } from "./generate-reference";
import { StudioOllamaGenerator, studioOllamaAvailable } from "./studio-ollama";

export type GenerateRole = "user" | "model";

export type GenerateMessage = {
  id: string;
  role: GenerateRole;
  /** Display / preview text (streaming truncates in the UI). */
  text: string;
  pending?: boolean;
  phase?: "director" | "implement";
  approach?: GenerationApproach;
  modelId?: string;
  metrics?: GenerationMetrics;
  source?: string;
  directorRaw?: string | null;
  error?: string;
};

/** Detail share of the Generate middle column; 0 means closed. */
export const DETAIL_SHARE_DEFAULT = 0.42;
export const DETAIL_SHARE_EXPAND = 0.92;
export const DETAIL_SHARE_CLOSE = 0.08;

export type GenerateState = {
  approach: GenerationApproach;
  modelId: string;
  running: boolean;
  messages: GenerateMessage[];
  /** Selected model bubble for stream-like detail. */
  detailId: string | null;
  /** When detail is open, show director JSON instead of MotionScript. */
  detailView: "output" | "director";
  /** Fraction of middle column height for the detail pane (0 = closed). */
  detailShare: number;
  lastStatus: string;
};

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export function createGenerateState(): GenerateState {
  return {
    approach: "director",
    modelId: STUDIO_GENERATE_MODEL,
    running: false,
    messages: [],
    detailId: null,
    detailView: "output",
    detailShare: 0,
    lastStatus: "Typed prompts · Ollama qwen2.5-coder:14b · Director default",
  };
}

export type GenerateHost = {
  onChange: () => void;
  /** Load a generated MotionScript into the Player and run it. */
  acceptProgram: (label: string, source: string) => void;
};

export class GenerateController {
  readonly state: GenerateState;
  private readonly host: GenerateHost;
  private abort: AbortController | null = null;
  private sessionId: string | null = null;
  private generation = 0;

  constructor(host: GenerateHost, state = createGenerateState()) {
    this.host = host;
    this.state = state;
  }

  setApproach(approach: GenerationApproach): void {
    this.state.approach = approach;
    this.host.onChange();
  }

  setModelId(modelId: string): void {
    this.state.modelId = modelId.trim() || STUDIO_GENERATE_MODEL;
    this.host.onChange();
  }

  openDetail(id: string): void {
    this.state.detailId = id;
    this.state.detailView = "output";
    if (this.state.detailShare <= 0) this.state.detailShare = DETAIL_SHARE_DEFAULT;
    this.host.onChange();
  }

  closeDetail(): void {
    this.state.detailId = null;
    this.state.detailView = "output";
    this.state.detailShare = 0;
    this.host.onChange();
  }

  /** Fully expanded detail: return to transcript (keep selection closed). */
  returnToTranscript(): void {
    this.state.detailId = null;
    this.state.detailView = "output";
    this.state.detailShare = 0;
    this.host.onChange();
  }

  setDetailView(view: "output" | "director"): void {
    this.state.detailView = view;
    this.host.onChange();
  }

  setDetailShare(share: number): void {
    const clamped = Math.min(1, Math.max(0, share));
    if (clamped <= DETAIL_SHARE_CLOSE) {
      this.closeDetail();
      return;
    }
    this.state.detailShare = clamped >= DETAIL_SHARE_EXPAND ? 1 : clamped;
    if (!this.state.detailId) {
      const latest = [...this.state.messages].reverse().find((message) => message.role === "model");
      if (latest) this.state.detailId = latest.id;
    }
    this.host.onChange();
  }

  formatTranscript(): string {
    const lines: string[] = [];
    for (const message of this.state.messages) {
      const role = message.role === "user" ? "User" : "Model";
      const body =
        message.role === "model"
          ? message.source?.trim() || message.text || message.error || ""
          : message.text;
      lines.push(`## ${role}\n${body.trim()}`);
    }
    return lines.join("\n\n");
  }

  async copyTranscript(): Promise<boolean> {
    const text = this.formatTranscript();
    if (!text.trim()) {
      this.state.lastStatus = "Transcript is empty";
      this.host.onChange();
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.state.lastStatus = "Copied full chat transcript";
      this.host.onChange();
      return true;
    } catch {
      this.state.lastStatus = "Clipboard copy failed";
      this.host.onChange();
      return false;
    }
  }

  cancel(): void {
    this.abort?.abort();
    if (this.sessionId) disposeGenerationSession(this.sessionId);
    this.abort = null;
    this.state.running = false;
    const pending = [...this.state.messages].reverse().find((message) => message.role === "model" && message.pending);
    if (pending) {
      pending.pending = false;
      pending.error = pending.error ?? "Cancelled";
      if (!pending.text.trim()) pending.text = "⋯ cancelled";
    }
    this.state.lastStatus = "Generation cancelled";
    this.host.onChange();
  }

  async send(prompt: string): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed || this.state.running) return;

    const user: GenerateMessage = { id: nextId("user"), role: "user", text: trimmed };
    const model: GenerateMessage = {
      id: nextId("model"),
      role: "model",
      text: "",
      pending: true,
      phase: this.state.approach === "director" ? "director" : "implement",
      approach: this.state.approach,
      modelId: this.state.modelId,
    };
    this.state.messages.push(user, model);
    this.state.running = true;
    this.state.lastStatus = "Generating…";
    this.host.onChange();

    const myGeneration = ++this.generation;
    const sessionId = nextId("gen");
    this.sessionId = sessionId;
    const abort = new AbortController();
    this.abort = abort;

    let reference;
    try {
      reference = loadStudioReference();
    } catch (error) {
      model.pending = false;
      model.error = (error as Error).message;
      model.text = model.error;
      this.state.running = false;
      this.state.lastStatus = "Reference load failed";
      this.host.onChange();
      return;
    }

    const available = await studioOllamaAvailable(this.state.modelId);
    if (myGeneration !== this.generation) return;
    if (!available) {
      model.pending = false;
      model.error = `Ollama model ${this.state.modelId} is not reachable. Start Ollama locally, then retry.`;
      model.text = model.error;
      this.state.running = false;
      this.state.lastStatus = "Ollama unavailable";
      this.host.onChange();
      return;
    }

    const generator = new StudioOllamaGenerator({ modelId: this.state.modelId });
    let result: PipelineResult;
    try {
      result = await runGenerationPipeline({
        taskId: `studio-${model.id}`,
        prompt: trimmed,
        generator,
        approach: this.state.approach,
        system: reference.markdown,
        referenceFingerprint: reference.fingerprint,
        referencePath: reference.path,
        sessionId,
        signal: abort.signal,
        onProgress: (event) => {
          if (myGeneration !== this.generation || this.sessionId !== sessionId) return;
          model.phase = event.phase;
          model.text = event.text;
          this.state.lastStatus =
            event.phase === "director"
              ? "Director planning…"
              : event.attempt > 0
                ? `Implementing (repair ${event.attempt})…`
                : "Implementing MotionScript…";
          this.host.onChange();
        },
      });
    } catch (error) {
      if (myGeneration !== this.generation) return;
      model.pending = false;
      model.error = (error as Error).message;
      model.text = model.text || model.error;
      this.state.running = false;
      this.state.lastStatus = "Generation failed";
      this.host.onChange();
      return;
    }

    if (myGeneration !== this.generation) return;

    model.pending = false;
    model.metrics = result.metrics;
    model.directorRaw = result.directorRaw;
    model.source = result.source;
    if (result.metrics.cancelled) {
      model.error = "Cancelled";
      if (!model.text.trim()) model.text = "⋯ cancelled";
      this.state.lastStatus = "Cancelled";
    } else if (result.metrics.status === "pass" && result.source.trim()) {
      const preview = result.source.trim().split("\n").slice(0, 6).join("\n");
      model.text = preview + (result.source.includes("\n") ? "\n…" : "");
      const repairs = result.metrics.repairAttempts;
      const latency = Math.round(result.metrics.totalMs);
      this.state.lastStatus = `Pass · ${latency} ms · repairs ${repairs} · judge animation on canvas`;
      this.host.acceptProgram(labelForPrompt(trimmed), result.source);
    } else {
      model.error = result.metrics.notes.slice(-1)[0] ?? `status ${result.metrics.status}`;
      model.text = model.text.trim() || model.error;
      this.state.lastStatus = `Fail · repairs ${result.metrics.repairAttempts} · ${Math.round(result.metrics.totalMs)} ms`;
    }

    this.state.running = false;
    this.abort = null;
    this.host.onChange();
  }
}

function labelForPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length <= 48 ? compact : `${compact.slice(0, 45)}…`;
}

export function detailMessage(state: GenerateState): GenerateMessage | null {
  if (!state.detailId) return null;
  return state.messages.find((message) => message.id === state.detailId) ?? null;
}

export function detailExpanded(state: GenerateState): boolean {
  return Boolean(state.detailId) && state.detailShare >= DETAIL_SHARE_EXPAND;
}
