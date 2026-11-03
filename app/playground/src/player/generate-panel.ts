/**
 * Generate side-panel chrome (P019 / P022 / studio-ux Generate mode).
 */
import type { GenerationApproach } from "../../../../tools/native-generation/types";
import {
  DETAIL_SHARE_DEFAULT,
  detailExpanded,
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
  middle: HTMLElement;
  transcript: HTMLElement;
  pack: HTMLElement;
  composer: HTMLTextAreaElement;
  approach: HTMLSelectElement;
  model: HTMLSelectElement;
  send: HTMLButtonElement;
  metrics: HTMLElement;
  copyTranscript: HTMLButtonElement;
  detail: HTMLElement;
  detailResize: HTMLElement;
  detailTitle: HTMLElement;
  detailView: HTMLSelectElement;
  detailBody: HTMLElement;
  detailClose: HTMLButtonElement;
};

export function bindGeneratePanel(root: HTMLElement): GeneratePanelElements {
  return {
    root,
    middle: must(root, "generate-middle"),
    transcript: must(root, "generate-transcript"),
    pack: must(root, "generate-quality-pack"),
    composer: must(root, "generate-prompt") as HTMLTextAreaElement,
    approach: must(root, "generate-approach") as HTMLSelectElement,
    model: must(root, "generate-model") as HTMLSelectElement,
    send: must(root, "generate-send") as HTMLButtonElement,
    metrics: must(root, "generate-metrics"),
    copyTranscript: must(root, "generate-copy-transcript") as HTMLButtonElement,
    detail: must(root, "generate-detail"),
    detailResize: must(root, "generate-detail-resize"),
    detailTitle: must(root, "generate-detail-title"),
    detailView: must(root, "generate-detail-view") as HTMLSelectElement,
    detailBody: must(root, "generate-detail-body"),
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
    ui.model.value = STUDIO_GENERATE_MODEL;
  }

  mountQualityPack(ui);
  wireDetailResize(ui, controller);

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
  ui.copyTranscript.addEventListener("click", () => void controller.copyTranscript());
  ui.detailClose.addEventListener("click", () => {
    if (detailExpanded(controller.state)) controller.returnToTranscript();
    else controller.closeDetail();
  });
  ui.detailView.addEventListener("change", () => {
    controller.setDetailView(ui.detailView.value === "director" ? "director" : "output");
  });

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

function wireDetailResize(ui: GeneratePanelElements, controller: GenerateController): void {
  let dragging = false;
  const onMove = (event: PointerEvent): void => {
    if (!dragging) return;
    const bounds = ui.middle.getBoundingClientRect();
    if (bounds.height <= 0) return;
    const fromBottom = (bounds.bottom - event.clientY) / bounds.height;
    controller.setDetailShare(fromBottom);
  };
  const onUp = (): void => {
    if (!dragging) return;
    dragging = false;
    ui.detailResize.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  ui.detailResize.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    ui.detailResize.classList.add("is-dragging");
    if (!controller.state.detailId) {
      const latest = [...controller.state.messages].reverse().find((message) => message.role === "model");
      if (latest) controller.openDetail(latest.id);
      else controller.setDetailShare(DETAIL_SHARE_DEFAULT);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
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

  const key = state.messages
    .map((message) => `${message.id}:${message.text.length}:${message.pending ? 1 : 0}:${message.error ?? ""}`)
    .join("|");
  if (ui.transcript.dataset.key !== key) {
    ui.transcript.dataset.key = key;
    ui.transcript.replaceChildren(...state.messages.map((message) => bubble(message, state.detailId)));
    ui.transcript.scrollTop = ui.transcript.scrollHeight;
  } else {
    for (const row of ui.transcript.querySelectorAll(".generate-row")) {
      if (!(row instanceof HTMLElement)) continue;
      const bubbleEl = row.querySelector(".generate-bubble");
      if (!(bubbleEl instanceof HTMLElement)) continue;
      bubbleEl.classList.toggle("is-selected", row.dataset.id === state.detailId);
    }
  }

  const detail = detailMessage(state);
  const open = Boolean(detail) && state.detailShare > 0;
  const expanded = detailExpanded(state);
  ui.detail.hidden = !open;
  ui.detailResize.hidden = !open;
  ui.transcript.classList.toggle("is-collapsed", expanded);
  ui.detail.classList.toggle("is-expanded", expanded);
  if (open) {
    ui.detail.style.flexBasis = expanded ? "auto" : `${Math.round(state.detailShare * 100)}%`;
    ui.detail.style.flexGrow = expanded ? "1" : "0";
    ui.detail.style.flexShrink = "0";
    const hasDirector = detail!.approach === "director";
    const directorReady = Boolean(detail!.directorRaw);
    ui.detailView.value = state.detailView === "director" && hasDirector ? "director" : "output";
    const directorOption = ui.detailView.querySelector('option[value="director"]');
    if (directorOption instanceof HTMLOptionElement) {
      directorOption.disabled = !hasDirector;
      directorOption.hidden = !hasDirector;
      directorOption.textContent = directorReady ? "Director" : "Director (pending)";
    }
    put(ui.detailTitle, "Generation detail");
    const body =
      state.detailView === "director"
        ? detail!.directorRaw?.trim() ||
          (detail!.pending && detail!.phase === "director"
            ? detail!.text || "Director planning…"
            : detail!.pending
              ? "(director response pending)"
              : "(no director response)")
        : detail!.source?.trim() || detail!.text || detail!.error || "";
    put(ui.detailBody, body);
    ui.detailBody.scrollTop = ui.detailBody.scrollHeight;
  } else {
    ui.detail.style.flexBasis = "";
    ui.detail.style.flexGrow = "";
    ui.detail.style.flexShrink = "";
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
  bubble.disabled = message.role !== "model";
  if (message.role === "model") {
    bubble.title = message.pending ? "Open live generation detail" : "Open generation detail";
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
