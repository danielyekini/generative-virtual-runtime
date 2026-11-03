/**
 * Studio Generate session (P019 / P022): transcript turns + P007/P008 pipeline.
 */
import {
  disposeGenerationSession,
  runGenerationPipeline,
  type PipelineResult,
} from "../../../../tools/native-generation/pipeline";
import { DIRECTOR_SYSTEM } from "../../../../tools/native-generation/director";
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
  /** MotionScript stream. Empty while the director phase is still running. */
  source?: string;
  /** Director script captured during the director phase; kept after output starts. */
  directorRaw?: string | null;
  error?: string;
  /** Implement-phase output per attempt: index 0 is the first try, later ones are repairs. */
  attempts?: string[];
  /** Pipeline log for this turn (phase changes, metrics, notes). */
  log?: string[];
  /** System prompts this turn was generated with. */
  systems?: SystemPrompts;
};

export type SystemPromptKind = "director" | "motionscript";
export type SystemPrompts = Record<SystemPromptKind, string>;

/** Parts a tester can include in the Copy payload (studio-ux Generate ⋯ menu). */
export type CopyPart = "prompts" | "motionscript" | "director" | "system" | "retries" | "logs";
export const COPY_PARTS: ReadonlyArray<{ id: CopyPart; label: string }> = [
  { id: "prompts", label: "Human prompts" },
  { id: "motionscript", label: "MotionScript programs" },
  { id: "director", label: "Director responses" },
  { id: "system", label: "System prompts" },
  { id: "retries", label: "Retry / repair attempts" },
  { id: "logs", label: "Generation logs" },
];
export const COPY_DEFAULT: ReadonlyArray<CopyPart> = ["prompts", "motionscript"];

/** Whether the selected model can accept prompts. Send stays inactive until "ready". */
export type ModelReadiness = "checking" | "ready" | "unavailable";

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
  modelReadiness: ModelReadiness;
  /** Parts included by ⋯ → Copy. */
  copyParts: CopyPart[];
  /** Session-local system prompt edits; null keeps the bundled default. */
  systemOverrides: Record<SystemPromptKind, string | null>;
  /** System prompt open in the editor, or null when the editor is closed. */
  promptsEditor: SystemPromptKind | null;
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
    modelReadiness: "checking",
    copyParts: [...COPY_DEFAULT],
    systemOverrides: { director: null, motionscript: null },
    promptsEditor: null,
  };
}

export type GenerateHost = {
  onChange: () => void;
  /** Model availability probe; defaults to the Studio Ollama tags check. */
  modelAvailable?: (modelId: string) => Promise<boolean>;
  /** Load a generated MotionScript into the Player and run it. */
  acceptProgram: (label: string, source: string) => void;
};

export class GenerateController {
  readonly state: GenerateState;
  private readonly host: GenerateHost;
  private abort: AbortController | null = null;
  private sessionId: string | null = null;
  private generation = 0;
  private readinessCheck = 0;

  constructor(host: GenerateHost, state = createGenerateState()) {
    this.host = host;
    this.state = state;
  }

  setApproach(approach: GenerationApproach): void {
    this.state.approach = approach;
    this.host.onChange();
  }

  setModelId(modelId: string): void {
    const next = modelId.trim() || STUDIO_GENERATE_MODEL;
    const changed = next !== this.state.modelId;
    this.state.modelId = next;
    this.host.onChange();
    if (changed) void this.checkModel();
  }

  /** Probe the selected model. Send and the model selector stay inactive until it answers ready. */
  async checkModel(): Promise<ModelReadiness> {
    const token = ++this.readinessCheck;
    const modelId = this.state.modelId;
    if (this.state.modelReadiness !== "ready") {
      this.state.modelReadiness = "checking";
      this.host.onChange();
    }
    const probe = this.host.modelAvailable ?? ((id: string) => studioOllamaAvailable(id));
    let ok = false;
    try {
      ok = await probe(modelId);
    } catch {
      ok = false;
    }
    if (token !== this.readinessCheck || modelId !== this.state.modelId) return this.state.modelReadiness;
    const next: ModelReadiness = ok ? "ready" : "unavailable";
    if (next !== this.state.modelReadiness) {
      this.state.modelReadiness = next;
      if (!this.state.running) {
        this.state.lastStatus = ok
          ? `Model ${modelId} ready`
          : `Model ${modelId} not ready — start Ollama and pull it; Send unlocks when it answers`;
      }
      this.host.onChange();
    }
    return next;
  }

  canSend(): boolean {
    return !this.state.running && this.state.modelReadiness === "ready";
  }

  defaultSystemPrompt(kind: SystemPromptKind): string {
    if (kind === "director") return DIRECTOR_SYSTEM;
    try {
      return loadStudioReference().markdown;
    } catch {
      return "";
    }
  }

  systemPrompt(kind: SystemPromptKind): string {
    return this.state.systemOverrides[kind] ?? this.defaultSystemPrompt(kind);
  }

  systemPromptEdited(kind: SystemPromptKind): boolean {
    return this.state.systemOverrides[kind] !== null;
  }

  /** Session-local edit. Text equal to the default clears the override. */
  setSystemPrompt(kind: SystemPromptKind, text: string): void {
    this.state.systemOverrides[kind] = text === this.defaultSystemPrompt(kind) ? null : text;
    this.host.onChange();
  }

  openSystemPrompts(kind: SystemPromptKind = this.state.approach === "director" ? "director" : "motionscript"): void {
    this.state.promptsEditor = kind;
    this.host.onChange();
  }

  closeSystemPrompts(): void {
    this.state.promptsEditor = null;
    this.host.onChange();
  }

  resetSystemPrompt(kind: SystemPromptKind): void {
    this.state.systemOverrides[kind] = null;
    this.host.onChange();
  }

  setCopyPart(part: CopyPart, included: boolean): void {
    const parts = new Set(this.state.copyParts);
    if (included) parts.add(part);
    else parts.delete(part);
    this.state.copyParts = COPY_PARTS.map((entry) => entry.id).filter((id) => parts.has(id));
    this.host.onChange();
  }

  openDetail(id: string): void {
    const switching = this.state.detailId !== id;
    this.state.detailId = id;
    if (switching) this.state.detailView = "output";
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

  /** Default copy payload: human prompts + MotionScript programs. */
  formatTranscript(): string {
    return formatGenerateCopy(this.state.messages, COPY_DEFAULT);
  }

  formatCopy(parts: ReadonlyArray<CopyPart> = this.state.copyParts): string {
    return formatGenerateCopy(this.state.messages, parts);
  }

  async copyTranscript(): Promise<boolean> {
    return this.copySelection(COPY_DEFAULT);
  }

  async copySelection(parts: ReadonlyArray<CopyPart> = this.state.copyParts): Promise<boolean> {
    const text = this.formatCopy(parts);
    if (!parts.length || !text.trim()) {
      this.state.lastStatus = parts.length ? "Nothing to copy yet" : "Choose at least one part to copy";
      this.host.onChange();
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      const labels = COPY_PARTS.filter((entry) => parts.includes(entry.id)).map((entry) => entry.label);
      this.state.lastStatus = `Copied: ${labels.join(", ")}`;
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
    if (!trimmed || this.state.running || this.state.modelReadiness !== "ready") return;
    const systems: SystemPrompts = {
      director: this.systemPrompt("director"),
      motionscript: this.systemPrompt("motionscript"),
    };

    const user: GenerateMessage = { id: nextId("user"), role: "user", text: trimmed };
    const model: GenerateMessage = {
      id: nextId("model"),
      role: "model",
      text: "",
      pending: true,
      phase: this.state.approach === "director" ? "director" : "implement",
      approach: this.state.approach,
      modelId: this.state.modelId,
      systems,
      log: [],
    };
    const started = performance.now();
    const log = (line: string): void => {
      model.log?.push(`[${Math.round(performance.now() - started)} ms] ${line}`);
    };
    log(
      `start · approach ${this.state.approach} · model ${this.state.modelId}` +
        (this.systemPromptEdited("director") ? " · director system edited" : "") +
        (this.systemPromptEdited("motionscript") ? " · MotionScript system edited" : ""),
    );
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
      log(`reference load failed: ${model.error}`);
      this.state.running = false;
      this.state.lastStatus = "Reference load failed";
      this.host.onChange();
      return;
    }

    const probe = this.host.modelAvailable ?? ((id: string) => studioOllamaAvailable(id));
    const available = await probe(this.state.modelId).catch(() => false);
    if (myGeneration !== this.generation) return;
    if (!available) {
      model.pending = false;
      model.error = `Ollama model ${this.state.modelId} is not reachable. Start Ollama locally, then retry.`;
      model.text = model.error;
      log("model unavailable at send");
      this.state.running = false;
      this.state.modelReadiness = "unavailable";
      this.state.lastStatus = "Ollama unavailable";
      this.host.onChange();
      return;
    }

    let progressKey = "";
    const generator = new StudioOllamaGenerator({ modelId: this.state.modelId });
    let result: PipelineResult;
    try {
      result = await runGenerationPipeline({
        taskId: `studio-${model.id}`,
        prompt: trimmed,
        generator,
        approach: this.state.approach,
        system: this.state.systemOverrides.motionscript ?? reference.markdown,
        directorSystem: systems.director,
        referenceFingerprint: reference.fingerprint,
        referencePath: reference.path,
        sessionId,
        signal: abort.signal,
        onProgress: (event) => {
          if (myGeneration !== this.generation || this.sessionId !== sessionId) return;
          const key = `${event.phase}:${event.attempt}`;
          if (key !== progressKey) {
            progressKey = key;
            log(event.phase === "director" ? "director planning" : event.attempt > 0 ? `repair attempt ${event.attempt}` : "implementing MotionScript");
          }
          noteGenerationProgress(model, event);
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
      log(`failed: ${model.error}`);
      this.state.running = false;
      this.state.lastStatus = "Generation failed";
      this.host.onChange();
      return;
    }

    if (myGeneration !== this.generation) return;

    model.pending = false;
    model.metrics = result.metrics;
    log(metricsLine(result.metrics));
    for (const note of result.metrics.notes) log(`note: ${note}`);
    if (result.directorRaw != null) model.directorRaw = result.directorRaw;
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

function metricsLine(metrics: GenerationMetrics): string {
  const ms = (value: number | null): string => (value === null ? "–" : `${Math.round(value)} ms`);
  return [
    `done · ${metrics.status}`,
    `total ${ms(metrics.totalMs)}`,
    `ttfb ${ms(metrics.ttfbMs)}`,
    `director ${ms(metrics.directorMs)}`,
    `implement ${ms(metrics.implementMs)}`,
    `repairs ${metrics.repairAttempts}`,
    `compile errors ${metrics.compileErrorCount}`,
    `runtime rejects ${metrics.runtimeRejectCount}`,
    `source ${metrics.sourceChars} chars`,
  ].join(" · ");
}

/** Build the ⋯ → Copy payload from the selected parts, in transcript order. */
export function formatGenerateCopy(messages: GenerateMessage[], parts: ReadonlyArray<CopyPart>): string {
  const want = new Set(parts);
  const blocks: string[] = [];
  let lastSystems = "";
  for (const message of messages) {
    if (message.role === "user") {
      if (want.has("prompts")) blocks.push(`## User\n${message.text.trim()}`);
      continue;
    }
    const sections: string[] = [];
    if (want.has("system") && message.systems) {
      const key = `${message.systems.director}\u0000${message.systems.motionscript}`;
      if (key !== lastSystems) {
        lastSystems = key;
        const director =
          message.approach === "director" ? `### Director system prompt\n${message.systems.director.trim()}\n\n` : "";
        sections.push(`${director}### MotionScript system prompt\n${message.systems.motionscript.trim()}`);
      }
    }
    if (want.has("director") && message.approach === "director") {
      sections.push(`### Director response\n${message.directorRaw?.trim() || "(no director response)"}`);
    }
    if (want.has("motionscript")) {
      const body = message.source?.trim() || message.text.trim() || message.error || "";
      sections.push(want.size === 2 && want.has("prompts") ? body : `### MotionScript\n${body}`);
    }
    if (want.has("retries")) {
      const attempts = message.attempts ?? [];
      if (attempts.length > 1) {
        sections.push(
          attempts
            .map((text, index) => `### Attempt ${index + 1} (${index === 0 ? "initial" : `repair ${index}`})\n${text.trim()}`)
            .join("\n\n"),
        );
      } else {
        sections.push(`### Retries\n(no repair attempts)`);
      }
    }
    if (want.has("logs")) {
      const lines = message.log?.length ? message.log : message.metrics ? [metricsLine(message.metrics)] : [];
      sections.push(`### Log\n${lines.join("\n") || "(no log)"}`);
    }
    if (sections.length) blocks.push(`## Model\n${sections.join("\n\n")}`);
  }
  return blocks.join("\n\n");
}

/** Keep the director script when the pipeline moves on to MotionScript. */
export function noteGenerationProgress(
  message: GenerateMessage,
  event: { phase: "director" | "implement"; text: string; attempt?: number },
): void {
  message.phase = event.phase;
  if (event.phase === "director") {
    message.directorRaw = event.text;
    message.text = event.text;
    return;
  }
  message.text = event.text;
  message.source = event.text;
  const attempt = event.attempt ?? 0;
  message.attempts ??= [];
  message.attempts[attempt] = event.text;
}

/** Detail body for the selected view only — never the other phase's live stream. */
export function detailBodyText(message: GenerateMessage, view: "output" | "director"): string {
  if (view === "director") {
    if (message.approach !== "director") return "(direct approach — no director script)";
    const raw = message.directorRaw?.trim();
    if (raw) return raw;
    if (message.pending && message.phase === "director") return "Director planning…";
    return "(no director response)";
  }
  const output = message.source?.trim() ?? "";
  if (output) return output;
  if (message.pending && message.phase === "implement") return "Implementing MotionScript…";
  if (message.pending && message.phase === "director") return "Output has not started.";
  return message.text.trim() || message.error || "";
}

export function detailMessage(state: GenerateState): GenerateMessage | null {
  if (!state.detailId) return null;
  return state.messages.find((message) => message.id === state.detailId) ?? null;
}

export function detailExpanded(state: GenerateState): boolean {
  return Boolean(state.detailId) && state.detailShare >= DETAIL_SHARE_EXPAND;
}
