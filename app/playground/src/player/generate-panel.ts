/**
 * Generate side-panel chrome (P019 / studio-ux Generate mode).
 */
import type { GenerationApproach } from "../../../../tools/native-generation/types";
import {
  detailMessage,
  type GenerateController,
  type GenerateMessage,
  type GenerateState,
} from "./generate-session";
import { loadQualityJudgmentPack } from "./generate-quality-pack";
import { STUDIO_GENERATE_MODEL } from "./generate-reference";

function put(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

function truncate(text: string, max = 280): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export type GeneratePanelElements = {
  root: HTMLElement;
  transcript: HTMLElement;
  pack: HTMLElement;
  composer: HTMLTextAreaElement;
  approach: HTMLSelectElement;
  model: HTMLSelectElement;
  send: HTMLButtonElement;
  metrics: HTMLElement;
  detail: HTMLElement;
  detailTitle: HTMLElement;
  detailBody: HTMLElement;
  detailDirector: HTMLButtonElement;
  detailOutput: HTMLButtonElement;
  detailClose: HTMLButtonElement;
};

export function bindGeneratePanel(root: HTMLElement): GeneratePanelElements {
  return {
    root,
    transcript: must(root, "generate-transcript"),
    pack: must(root, "generate-quality-pack"),
    composer: must(root, "generate-prompt") as HTMLTextAreaElement,
    approach: must(root, "generate-approach") as HTMLSelectElement,
    model: must(root, "generate-model") as HTMLSelectElement,
    send: must(root, "generate-send") as HTMLButtonElement,
    metrics: must(root, "generate-metrics"),
    detail: must(root, "generate-detail"),
    detailTitle: must(root, "generate-detail-title"),
    detailBody: must(root, "generate-detail-body"),
    detailDirector: must(root, "generate-detail-director") as HTMLButtonElement,
    detailOutput: must(root, "generate-detail-output") as HTMLButtonElement,
    detailClose: must(root, "generate-detail-close") as HTMLButtonElement,
  };
}

function must(root: HTMLElement, id: string): HTMLElement {
  const element = root.querySelector(`#${id}`);
  if (!(element instanceof HTMLElement)) throw new Error(`generate markup missing #${id}`);
  return element;
}

export function wireGeneratePanel(ui: GeneratePanelElements, controller: GenerateController): void {
  ui.approach.value = controller.state.approach;
  ui.model.value = controller.state.modelId === STUDIO_GENERATE_MODEL ? STUDIO_GENERATE_MODEL : "custom";
  if (ui.model.value === "custom") {
    // Keep pinned option; custom typed models stay as pinned id field via select change below.
    ui.model.value = STUDIO_GENERATE_MODEL;
  }

  mountQualityPack(ui);

  ui.approach.addEventListener("change", () => {
    controller.setApproach(ui.approach.value as GenerationApproach);
  });
  ui.model.addEventListener("change", () => {
    controller.setModelId(ui.model.value);
  });
  ui.send.addEventListener("click", () => void submit());
  ui.composer.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  });
  ui.detailClose.addEventListener("click", () => controller.closeDetail());
  ui.detailOutput.addEventListener("click", () => controller.setDetailView("output"));
  ui.detailDirector.addEventListener("click", () => controller.setDetailView("director"));

  async function submit(): Promise<void> {
    if (controller.state.running) {
      controller.cancel();
      return;
    }
    const prompt = ui.composer.value;
    ui.composer.value = "";
    await controller.send(prompt);
  }
}

function mountQualityPack(ui: GeneratePanelElements): void {
  const pack = loadQualityJudgmentPack();
  ui.pack.replaceChildren();
  for (const task of pack.tasks) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "generate-pack-chip";
    chip.dataset.taskId = task.id;
    chip.title = `${task.baseline} — fills the composer; send when ready`;
    put(chip, task.title);
    chip.addEventListener("click", () => {
      ui.composer.value = task.prompt;
      ui.composer.focus();
      for (const other of ui.pack.querySelectorAll(".generate-pack-chip")) {
        other.classList.toggle("is-selected", other === chip);
      }
    });
    ui.pack.append(chip);
  }
}

export function renderGeneratePanel(ui: GeneratePanelElements, state: GenerateState): void {
  ui.approach.value = state.approach;
  if ([...ui.model.options].some((option) => option.value === state.modelId)) {
    ui.model.value = state.modelId;
  }
  ui.approach.disabled = state.running;
  ui.model.disabled = state.running;
  ui.composer.disabled = state.running;
  for (const chip of ui.pack.querySelectorAll("button")) {
    (chip as HTMLButtonElement).disabled = state.running;
  }
  put(ui.send, state.running ? "■" : "↑");
  ui.send.title = state.running ? "Cancel generation" : "Send prompt";
  ui.send.setAttribute("aria-label", state.running ? "Cancel generation" : "Send prompt");
  put(ui.metrics, state.lastStatus);

  const key = state.messages.map((message) => `${message.id}:${message.text.length}:${message.pending ? 1 : 0}:${message.error ?? ""}`).join("|");
  if (ui.transcript.dataset.key !== key) {
    ui.transcript.dataset.key = key;
    ui.transcript.replaceChildren(...state.messages.map((message) => bubble(message, state.detailId)));
    ui.transcript.scrollTop = ui.transcript.scrollHeight;
  }

  const detail = detailMessage(state);
  ui.detail.hidden = !detail;
  if (detail) {
    const hasDirector = Boolean(detail.directorRaw && detail.approach === "director");
    ui.detailDirector.hidden = !hasDirector;
    ui.detailDirector.disabled = !hasDirector;
    ui.detailDirector.setAttribute("aria-pressed", String(state.detailView === "director"));
    ui.detailOutput.setAttribute("aria-pressed", String(state.detailView === "output"));
    put(ui.detailTitle, state.detailView === "director" ? "Director response" : "Generation output");
    const body =
      state.detailView === "director"
        ? detail.directorRaw ?? "(no director response)"
        : detail.source?.trim() || detail.text || detail.error || "";
    put(ui.detailBody, body);
  }
}

function bubble(message: GenerateMessage, detailId: string | null): HTMLElement {
  const row = document.createElement("div");
  row.className = `generate-row is-${message.role}`;
  row.dataset.id = message.id;

  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.className = `generate-bubble is-${message.role}`;
  if (message.id === detailId) bubble.classList.add("is-selected");
  bubble.disabled = message.role !== "model" || Boolean(message.pending);
  if (message.role === "model") {
    bubble.title = "Open generation detail";
  }

  if (message.pending && !message.text.trim()) {
    put(bubble, "⋯");
    bubble.classList.add("is-pending");
  } else if (message.pending) {
    put(bubble, truncate(message.text, 220));
    bubble.classList.add("is-pending");
  } else {
    put(bubble, truncate(message.text || message.error || "", 220));
  }
  if (message.error && !message.pending) bubble.classList.add("is-error");

  if (message.metrics && !message.pending) {
    const meta = document.createElement("span");
    meta.className = "generate-meta";
    put(
      meta,
      `${message.metrics.status} · ${Math.round(message.metrics.totalMs)} ms · repairs ${message.metrics.repairAttempts}`,
    );
    row.append(bubble, meta);
  } else {
    row.append(bubble);
  }
  return row;
}
