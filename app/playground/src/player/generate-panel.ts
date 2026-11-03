/**
 * Generate side-panel chrome (P019 / P022 / studio-ux Generate mode).
 */
import type { GenerationApproach } from "../../../../tools/native-generation/types";
import {
  DETAIL_SHARE_DEFAULT,
  detailBodyText,
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
  if (document.activeElement !== ui.approach) ui.approach.value = state.approach;
  if (
    document.activeElement !== ui.model &&
    [...ui.model.options].some((option) => option.value === state.modelId)
  ) {
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

  // Keep bubble nodes across tokens. Replacing them drops clicks that start
  // on one frame and finish on the next.
  syncTranscript(ui.transcript, state.messages, state.detailId);

  const detail = detailMessage(state);
  const open = Boolean(detail) && state.detailShare > 0;
  const expanded = detailExpanded(state);
  ui.detail.hidden = !open;
  ui.detailResize.hidden = !open;
  ui.transcript.classList.toggle("is-collapsed", expanded);
  ui.detail.classList.toggle("is-expanded", expanded);
  if (open && detail) {
    // 0% basis lets the expanded pane fill the middle and shrink, so the body
    // scrolls instead of growing past the panel.
    ui.detail.style.flex = expanded ? "1 1 0%" : `0 1 ${Math.round(state.detailShare * 100)}%`;
    syncDetailView(ui.detailView, state.detailView);
    put(ui.detailTitle, "Generation detail");
    writeStream(
      ui.detailBody,
      detailBodyText(detail, state.detailView),
      `${detail.id}:${state.detailView}`,
    );
  } else {
    ui.detail.style.flex = "";
  }
}

/** Leave an open native menu alone. Rewriting options while it is open closes or traps it. */
function syncDetailView(select: HTMLSelectElement, view: "output" | "director"): void {
  if (document.activeElement === select) return;
  if (select.value !== view) select.value = view;
  for (const option of select.options) {
    if (option.disabled) option.disabled = false;
    if (option.hidden) option.hidden = false;
    const label = option.value === "director" ? "Director" : "Output";
    if (option.textContent !== label) option.textContent = label;
  }
}

function writeStream(element: HTMLElement, value: string, streamKey: string): void {
  const switched = element.dataset.stream !== streamKey;
  if (switched || element.clientHeight === 0) element.dataset.follow = "1";
  else {
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    element.dataset.follow = distance < 32 ? "1" : "0";
  }
  element.dataset.stream = streamKey;
  const kept = element.scrollTop;
  put(element, value);
  // Replacing text resets scroll. Follow the live end unless the reader moved up.
  element.scrollTop = element.dataset.follow === "1" ? element.scrollHeight : kept;
}

function syncTranscript(transcript: HTMLElement, messages: GenerateMessage[], detailId: string | null): void {
  if (transcript.clientHeight === 0) transcript.dataset.follow = "1";
  else {
    const distance = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight;
    transcript.dataset.follow = distance < 48 ? "1" : "0";
  }
  const kept = transcript.scrollTop;
  const rows = new Map<string, HTMLElement>();
  for (const node of transcript.querySelectorAll(".generate-row")) {
    if (node instanceof HTMLElement && node.dataset.id) rows.set(node.dataset.id, node);
  }
  const keep = new Set<string>();
  let cursor: ChildNode | null = transcript.firstChild;
  for (const message of messages) {
    keep.add(message.id);
    let row = rows.get(message.id);
    if (!row) row = createRow(message);
    paintBubble(row, message, detailId);
    if (row !== cursor) transcript.insertBefore(row, cursor);
    cursor = row.nextSibling;
  }
  for (const [id, row] of rows) {
    if (!keep.has(id)) row.remove();
  }
  transcript.scrollTop = transcript.dataset.follow === "1" ? transcript.scrollHeight : kept;
}

function createRow(message: GenerateMessage): HTMLElement {
  const row = document.createElement("div");
  row.className = `generate-row is-${message.role}`;
  row.dataset.id = message.id;
  if (message.role === "model") {
    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "generate-bubble is-model";
    row.append(bubble);
  } else {
    const bubble = document.createElement("div");
    bubble.className = "generate-bubble is-user";
    row.append(bubble);
  }
  return row;
}

function paintBubble(row: HTMLElement, message: GenerateMessage, detailId: string | null): void {
  const bubble = row.querySelector(".generate-bubble");
  if (!(bubble instanceof HTMLElement)) return;
  bubble.classList.toggle("is-selected", message.id === detailId);
  bubble.classList.toggle("is-pending", Boolean(message.pending));
  bubble.classList.toggle("is-error", Boolean(message.error) && !message.pending);
  const preview =
    message.pending && !message.text.trim() ? "⋯" : truncate(message.text || message.error || "", 220);
  put(bubble, preview);
  if (message.role === "model") {
    bubble.title = message.pending ? "Open live generation detail" : "Open generation detail";
  }

  const meta = row.querySelector(".generate-meta");
  if (message.metrics && !message.pending) {
    const node = meta instanceof HTMLElement ? meta : document.createElement("span");
    if (!(meta instanceof HTMLElement)) {
      node.className = "generate-meta";
      row.append(node);
    }
    put(
      node,
      `${message.metrics.status} · ${Math.round(message.metrics.totalMs)} ms · repairs ${message.metrics.repairAttempts}`,
    );
  } else if (meta) {
    meta.remove();
  }
}
