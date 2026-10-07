import { CanvasRenderer } from "@gvr/canvas-renderer";
import type { ResolvedFrame } from "@gvr/schema";
import { clearCanvas } from "./describe";
import { formatClock } from "./timeline";

export type CanvasMode = "single" | "split" | "present";
export type DockTab = "source" | "report" | "scene" | "script" | "frames" | "session";
export type SourceMode = "editor" | "stream" | "note";

export interface FlowStep {
  label: string;
  hint: string;
  state: "idle" | "done" | "live" | "failed";
}

export interface TransportView {
  hidden: boolean;
  enabled: boolean;
  timeMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
  sync: boolean;
}

export interface TransportHandlers {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (timeMs: number) => void;
  onRate: (rate: number) => void;
  onStep: (kind: "frame" | "key", direction: -1 | 1) => void;
}

const noopTransport: TransportHandlers = {
  onPlay: () => undefined,
  onPause: () => undefined,
  onSeek: () => undefined,
  onRate: () => undefined,
  onStep: () => undefined,
};

const hiddenTransport: TransportView = {
  hidden: true,
  enabled: false,
  timeMs: 0,
  durationMs: 0,
  playing: false,
  rate: 1,
  sync: false,
};

const tabs: DockTab[] = ["source", "report", "scene", "script", "frames", "session"];

function must<T extends Element>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`studio markup missing #${id}`);
  return element;
}

function put(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

export class Shell {
  readonly controls = must<HTMLElement>("controls");
  readonly cancelButton = must<HTMLButtonElement>("cancel");
  readonly stage = must<HTMLElement>("stage");
  readonly singleBox = must<HTMLElement>("single");
  readonly splitBox = must<HTMLElement>("split");
  readonly presentBox = must<HTMLElement>("present");
  readonly paneA = must<HTMLElement>("pane-a");
  readonly paneB = must<HTMLElement>("pane-b");
  readonly prompt = must<HTMLElement>("prompt");
  readonly promptForm = must<HTMLFormElement>("prompt-form");
  readonly promptInput = must<HTMLInputElement>("prompt-text");
  readonly sourceTools = must<HTMLElement>("source-tools");
  readonly fileInput = must<HTMLInputElement>("file");
  readonly canvases = {
    single: must<HTMLCanvasElement>("view"),
    a: must<HTMLCanvasElement>("view-a"),
    b: must<HTMLCanvasElement>("view-b"),
    system: must<HTMLCanvasElement>("view-system"),
    generated: must<HTMLCanvasElement>("view-generated"),
  };
  readonly renderers = {
    single: new CanvasRenderer(this.canvases.single),
    a: new CanvasRenderer(this.canvases.a),
    b: new CanvasRenderer(this.canvases.b),
    system: new CanvasRenderer(this.canvases.system),
    generated: new CanvasRenderer(this.canvases.generated),
  };

  private readonly status = must<HTMLElement>("status");
  private readonly transport = must<HTMLElement>("transport");
  private readonly clockLabel = must<HTMLElement>("clock-label");
  private readonly slider = must<HTMLInputElement>("time");
  private readonly playButton = must<HTMLButtonElement>("play");
  private readonly pauseButton = must<HTMLButtonElement>("pause");
  private readonly speed = must<HTMLSelectElement>("speed");
  private readonly syncLabel = must<HTMLElement>("sync-label");
  private readonly frameBack = must<HTMLButtonElement>("frame-back");
  private readonly frameFwd = must<HTMLButtonElement>("frame-fwd");
  private readonly stepBack = must<HTMLButtonElement>("step-back");
  private readonly stepFwd = must<HTMLButtonElement>("step-fwd");
  private readonly dock = must<HTMLElement>("dock");
  private readonly dockBody = must<HTMLElement>("dock-body");
  private readonly sourceNote = must<HTMLElement>("source-note");
  private readonly sourceBox = must<HTMLTextAreaElement>("source");
  private readonly streamView = must<HTMLElement>("stream-view");
  private readonly fed = must<HTMLElement>("fed");
  private readonly rest = must<HTMLElement>("rest");
  private readonly streamDiagnostics = must<HTMLElement>("stream-diagnostics");
  private readonly reportNote = must<HTMLElement>("report-note");
  private readonly flow = must<HTMLElement>("flow");
  private readonly result = must<HTMLElement>("result");
  private readonly report = must<HTMLElement>("report");
  private readonly sceneNote = must<HTMLElement>("scene-note");
  private readonly scene = must<HTMLElement>("scene");
  private readonly scriptNote = must<HTMLElement>("script-note");
  private readonly script = must<HTMLElement>("script");
  private readonly framesNote = must<HTMLElement>("frames-note");
  private readonly frames = must<HTMLElement>("frames");
  private readonly sessionNote = must<HTMLElement>("session-note");
  private readonly session = must<HTMLElement>("session");
  private readonly paneATitle = must<HTMLElement>("pane-a-title");
  private readonly paneANote = must<HTMLElement>("pane-a-note");
  private readonly paneBTitle = must<HTMLElement>("pane-b-title");
  private readonly paneBNote = must<HTMLElement>("pane-b-note");
  private readonly emptyA = must<HTMLElement>("empty-a");
  private readonly emptyB = must<HTMLElement>("empty-b");
  private readonly popout = must<HTMLElement>("popout");
  private readonly popFed = must<HTMLElement>("pop-fed");
  private readonly popRest = must<HTMLElement>("pop-rest");
  private readonly popDiagnostics = must<HTMLElement>("pop-diagnostics");
  private readonly popMin = must<HTMLButtonElement>("pop-min");
  private readonly dockMin = must<HTMLButtonElement>("dock-min");
  private readonly dockExtract = must<HTMLButtonElement>("dock-extract");
  private readonly tabMore = must<HTMLButtonElement>("tab-more");
  private readonly tabMenu = must<HTMLElement>("tab-menu");
  private readonly dockResize = must<HTMLElement>("dock-resize");
  private readonly dockTabs = new Map<DockTab, HTMLButtonElement>();

  private mode: CanvasMode = "single";
  private tab: DockTab = "source";
  private open = true;
  private placement: "dock" | "float" = "dock";
  private dockedWidth = 400;
  private flowKey = "";
  private transportView = hiddenTransport;
  private transportHandlers = noopTransport;
  private sourceHandler: (() => void) | null = null;
  private fileHandler: ((file: File) => void) | null = null;
  private cancelHandler: (() => void) | null = null;
  scrubbing = false;

  constructor() {
    for (const tab of tabs) this.dockTabs.set(tab, must<HTMLButtonElement>(`tab-${tab}`));
    this.restoreDock();
    this.bindDock();
    this.wireTransport();
    this.bindPopout();
    this.sourceBox.addEventListener("input", () => this.sourceHandler?.());
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      this.fileInput.value = "";
      if (file) this.fileHandler?.(file);
    });
    this.cancelButton.addEventListener("click", () => this.cancelHandler?.());
    this.applyMode();
    this.applyDock();
    new ResizeObserver(() => this.layoutTabs()).observe(this.dock);
  }

  get playing(): boolean {
    return this.transportView.playing;
  }

  resetChrome(): void {
    this.controls.replaceChildren();
    this.sourceTools.replaceChildren();
    this.sourceHandler = null;
    this.fileHandler = null;
    this.cancelHandler = null;
    this.showCancel(false);
    this.transportHandlers = noopTransport;
    this.popout.hidden = true;
  }

  setStatus(text: string): void {
    put(this.status, text);
  }

  setMode(mode: CanvasMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyMode();
  }

  primaryCanvas(): HTMLCanvasElement {
    if (this.mode === "split") return this.canvases.a;
    if (this.mode === "present") return this.canvases.generated;
    return this.canvases.single;
  }

  setTransport(view: TransportView): void {
    this.transportView = view;
    this.transport.hidden = view.hidden;
    this.transport.classList.toggle("is-disabled", !view.enabled);
    const controls = [this.playButton, this.pauseButton, this.slider, this.speed, this.frameBack, this.frameFwd, this.stepBack, this.stepFwd];
    for (const control of controls) control.disabled = !view.enabled;
    this.playButton.setAttribute("aria-pressed", String(view.playing));
    this.pauseButton.setAttribute("aria-pressed", String(view.enabled && !view.playing));
    put(this.clockLabel, formatClock(view.timeMs));
    const duration = Math.max(0, view.durationMs);
    this.slider.max = String(duration || 1);
    if (!this.scrubbing) this.slider.value = String(Math.min(duration, Math.max(0, view.timeMs)));
    if (this.speed.value !== String(view.rate)) {
      const known = Array.from(this.speed.options).some((option) => option.value === String(view.rate));
      if (known) this.speed.value = String(view.rate);
    }
    this.syncLabel.hidden = !view.sync;
  }

  bindTransport(handlers: TransportHandlers): void {
    this.transportHandlers = handlers;
  }

  onTransportKey(event: KeyboardEvent): boolean {
    if (this.transportView.hidden || !this.transportView.enabled) return false;
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.key === " ") {
      event.preventDefault();
      if (this.transportView.playing) this.transportHandlers.onPause();
      else this.transportHandlers.onPlay();
      return true;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      this.transportHandlers.onStep("key", event.key === "ArrowLeft" ? -1 : 1);
      return true;
    }
    return false;
  }

  setSourceMode(mode: SourceMode): void {
    this.sourceBox.hidden = mode !== "editor";
    this.streamView.hidden = mode !== "stream";
  }

  setSourceNote(text: string): void {
    put(this.sourceNote, text);
  }

  setSourceValue(value: string): void {
    if (this.sourceBox.value !== value) this.sourceBox.value = value;
  }

  sourceValue(): string {
    return this.sourceBox.value;
  }

  setSourceEditable(editable: boolean): void {
    this.sourceBox.readOnly = !editable;
  }

  onSourceInput(handler: (() => void) | null): void {
    this.sourceHandler = handler;
  }

  onFile(handler: ((file: File) => void) | null): void {
    this.fileHandler = handler;
  }

  openFile(accept: string): void {
    this.fileInput.accept = accept;
    this.fileInput.click();
  }

  setStreamFeed(fed: string, rest: string, diagnostics: string): void {
    put(this.fed, fed);
    put(this.rest, rest);
    put(this.streamDiagnostics, diagnostics);
    put(this.popFed, fed);
    put(this.popRest, rest);
    put(this.popDiagnostics, diagnostics);
    this.streamDiagnostics.hidden = diagnostics.length === 0;
    this.popDiagnostics.hidden = diagnostics.length === 0;
  }

  setPopoutVisible(visible: boolean): void {
    this.popout.hidden = !visible;
  }

  popoutVisible(): boolean {
    return !this.popout.hidden;
  }

  setReport(note: string, summary: string, tone: string, body: string): void {
    put(this.reportNote, note);
    put(this.result, summary);
    if (this.result.className !== tone) this.result.className = tone;
    put(this.report, body);
    this.report.hidden = body.length === 0;
  }

  setFlow(steps: FlowStep[]): void {
    const key = steps.map((step) => `${step.label}:${step.hint}:${step.state}`).join("|");
    if (key === this.flowKey) return;
    this.flowKey = key;
    this.flow.replaceChildren(
      ...steps.map((step) => {
        const item = document.createElement("li");
        if (step.state === "done" || step.state === "live") item.classList.add("is-done");
        if (step.state === "live") item.classList.add("is-live");
        if (step.state === "failed") item.classList.add("is-failed");
        const mark = document.createElement("b");
        mark.textContent = step.state === "failed" ? "!" : step.state === "live" ? "●" : step.state === "done" ? "✓" : "·";
        const text = document.createElement("span");
        text.textContent = step.label;
        const hint = document.createElement("small");
        hint.textContent = step.hint;
        text.append(hint);
        item.append(mark, text);
        return item;
      }),
    );
  }

  setScene(note: string, body: string): void {
    put(this.sceneNote, note);
    put(this.scene, body);
    this.scene.hidden = body.length === 0;
  }

  setScript(note: string, body: string): void {
    put(this.scriptNote, note);
    put(this.script, body);
    this.script.hidden = body.length === 0;
  }

  setFrames(note: string, body: string): void {
    put(this.framesNote, note);
    put(this.frames, body);
    this.frames.hidden = body.length === 0;
  }

  setSession(note: string, body: string): void {
    put(this.sessionNote, note);
    put(this.session, body);
    this.session.hidden = body.length === 0;
  }

  setPanes(aTitle: string, aNote: string, bTitle: string, bNote: string): void {
    put(this.paneATitle, aTitle);
    put(this.paneANote, aNote);
    put(this.paneBTitle, bTitle);
    put(this.paneBNote, bNote);
  }

  setPaneEmpty(which: "a" | "b", message: string | null): void {
    const element = which === "a" ? this.emptyA : this.emptyB;
    element.hidden = !message;
    if (message) put(element, message);
  }

  showCancel(visible: boolean): void {
    this.cancelButton.hidden = !visible;
  }

  onCancel(handler: (() => void) | null): void {
    this.cancelHandler = handler;
  }

  paint(which: "single" | "a" | "b" | "system" | "generated", frame: ResolvedFrame | null, width: number, height: number, dpr: number): void {
    const renderer = this.renderers[which];
    const canvas = this.canvases[which];
    renderer.resize(Math.max(1, width), Math.max(1, height), dpr);
    if (frame) renderer.render(frame);
    else clearCanvas(canvas);
  }

  private applyMode(): void {
    this.singleBox.hidden = this.mode !== "single";
    this.splitBox.hidden = this.mode !== "split";
    this.presentBox.hidden = this.mode !== "present";
  }

  private wireTransport(): void {
    this.playButton.addEventListener("click", () => this.transportHandlers.onPlay());
    this.pauseButton.addEventListener("click", () => this.transportHandlers.onPause());
    this.slider.addEventListener("input", () => this.transportHandlers.onSeek(Number(this.slider.value)));
    this.slider.addEventListener("pointerdown", () => {
      this.scrubbing = true;
    });
    window.addEventListener("pointerup", () => {
      this.scrubbing = false;
    });
    this.speed.addEventListener("change", () => this.transportHandlers.onRate(Number(this.speed.value) || 1));
    this.frameBack.addEventListener("click", () => this.transportHandlers.onStep("frame", -1));
    this.frameFwd.addEventListener("click", () => this.transportHandlers.onStep("frame", 1));
    this.stepBack.addEventListener("click", () => this.transportHandlers.onStep("key", -1));
    this.stepFwd.addEventListener("click", () => this.transportHandlers.onStep("key", 1));
  }

  private selectTab(tab: DockTab): void {
    this.tab = tab;
    this.open = true;
    this.tabMenu.hidden = true;
    this.applyDock();
    this.storeDock();
  }

  private bindDock(): void {
    const bar = must<HTMLElement>("dock-bar");
    let drag: { x: number; y: number } | null = null;
    for (const [tab, button] of this.dockTabs) {
      button.addEventListener("click", () => this.selectTab(tab));
    }
    this.dockMin.addEventListener("click", () => {
      this.open = !this.open;
      this.applyDock();
      this.storeDock();
    });
    this.dockExtract.addEventListener("click", () => {
      this.placement = this.placement === "dock" ? "float" : "dock";
      this.open = true;
      this.tabMenu.hidden = true;
      if (this.placement === "float") {
        this.dock.style.left = "";
        this.dock.style.top = "";
        this.dock.style.right = "";
        this.dock.style.bottom = "";
        this.dock.style.width = "";
        this.dock.style.height = "";
      }
      this.applyDock();
      this.storeDock();
    });
    this.tabMore.addEventListener("click", (event) => {
      event.stopPropagation();
      this.tabMenu.hidden = !this.tabMenu.hidden;
    });
    document.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (target instanceof Node && (this.tabMenu.contains(target) || target === this.tabMore)) return;
      this.tabMenu.hidden = true;
    });
    this.dockResize.addEventListener("pointerdown", (event) => {
      if (this.placement !== "dock" || !this.open) return;
      event.preventDefault();
      const startX = event.clientX;
      const startW = this.dock.getBoundingClientRect().width;
      const move = (next: PointerEvent) => {
        this.dockedWidth = Math.min(window.innerWidth * 0.72, Math.max(280, startW + (startX - next.clientX)));
        this.dock.style.width = `${this.dockedWidth}px`;
        this.layoutTabs();
      };
      const up = () => {
        this.dockResize.removeEventListener("pointermove", move);
        this.dockResize.removeEventListener("pointerup", up);
        this.storeDock();
      };
      this.dockResize.addEventListener("pointermove", move);
      this.dockResize.addEventListener("pointerup", up);
    });
    bar.addEventListener("pointerdown", (event) => {
      if (this.placement !== "float") return;
      if (event.target instanceof HTMLButtonElement) return;
      const rect = this.dock.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      try {
        bar.setPointerCapture(event.pointerId);
      } catch {
        /* Some pointers cannot be captured. The bar still follows the pointer. */
      }
    });
    bar.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const x = Math.min(window.innerWidth - 80, Math.max(0, event.clientX - drag.x));
      const y = Math.min(window.innerHeight - 36, Math.max(0, event.clientY - drag.y));
      this.dock.style.left = `${x}px`;
      this.dock.style.top = `${y}px`;
      this.dock.style.right = "auto";
      this.dock.style.bottom = "auto";
    });
    bar.addEventListener("pointerup", () => {
      if (!drag) return;
      drag = null;
      this.storeDock();
    });
  }

  private bindPopout(): void {
    const bar = must<HTMLElement>("pop-bar");
    let drag: { x: number; y: number } | null = null;
    this.popMin.addEventListener("click", () => {
      const minimized = this.popout.classList.toggle("is-min");
      this.popMin.textContent = "−";
      this.popMin.setAttribute("aria-label", minimized ? "Restore" : "Minimise");
    });
    must<HTMLButtonElement>("pop-dock").addEventListener("click", () => {
      this.popout.hidden = true;
    });
    bar.addEventListener("pointerdown", (event) => {
      if (event.target instanceof HTMLButtonElement) return;
      const rect = this.popout.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const width = this.popout.offsetWidth;
      const x = Math.min(window.innerWidth - 80, Math.max(0, event.clientX - drag.x));
      const y = Math.min(window.innerHeight - 36, Math.max(0, event.clientY - drag.y));
      this.popout.style.left = `${x}px`;
      this.popout.style.top = `${y}px`;
      this.popout.style.right = "auto";
      this.popout.style.width = `${width}px`;
    });
    bar.addEventListener("pointerup", () => {
      drag = null;
    });
  }

  private applyDock(): void {
    this.dock.classList.toggle("is-min", !this.open);
    this.dock.classList.toggle("is-docked", this.placement === "dock");
    this.dock.classList.toggle("is-floating", this.placement === "float");
    this.dockMin.textContent = "−";
    this.dockMin.setAttribute("aria-label", this.open ? "Minimise" : "Restore");
    this.dockMin.setAttribute("aria-expanded", String(this.open));
    this.dockExtract.textContent = this.placement === "float" ? "↘" : "↗";
    this.dockExtract.setAttribute("aria-label", this.placement === "float" ? "Dock inspector" : "Extract inspector");
    if (this.placement === "dock") {
      this.dock.style.left = "";
      this.dock.style.top = "";
      this.dock.style.right = "";
      this.dock.style.bottom = "";
      this.dock.style.height = "";
      this.dock.style.width = this.open ? `${this.dockedWidth}px` : "";
    }
    for (const [tab, button] of this.dockTabs) {
      const selected = tab === this.tab;
      button.setAttribute("aria-selected", String(selected));
      must<HTMLElement>(`panel-${tab}`).hidden = !selected || !this.open;
    }
    this.layoutTabs();
  }

  private layoutTabs(): void {
    const strip = must<HTMLElement>("dock-tabs");
    const buttons = tabs.map((tab) => this.dockTabs.get(tab)).filter((button): button is HTMLButtonElement => Boolean(button));
    for (const button of buttons) button.hidden = false;
    this.tabMore.hidden = true;
    if (!this.open) {
      this.tabMenu.hidden = true;
      return;
    }
    const hidden: DockTab[] = [];
    const overflow = () => strip.scrollWidth > strip.clientWidth + 1;
    if (overflow()) {
      this.tabMore.hidden = false;
      for (let index = buttons.length - 1; index >= 0 && overflow(); index -= 1) {
        const tab = tabs[index];
        const button = buttons[index];
        if (!tab || !button || tab === this.tab) continue;
        button.hidden = true;
        hidden.unshift(tab);
      }
    }
    this.tabMore.hidden = hidden.length === 0;
    const menuOpen = !this.tabMenu.hidden;
    this.tabMenu.replaceChildren(
      ...hidden.map((tab) => {
        const item = document.createElement("button");
        item.type = "button";
        item.role = "menuitem";
        item.textContent = tab.slice(0, 1).toUpperCase() + tab.slice(1);
        item.addEventListener("click", () => this.selectTab(tab));
        return item;
      }),
    );
    this.tabMenu.hidden = !menuOpen || hidden.length === 0;
  }

  private restoreDock(): void {
    try {
      const open = localStorage.getItem("gvr.studio.panel");
      if (open === "closed") this.open = false;
      const placement = localStorage.getItem("gvr.studio.placement");
      if (placement === "float" || placement === "dock") this.placement = placement;
      const tab = localStorage.getItem("gvr.studio.tab");
      if (tab && tabs.includes(tab as DockTab)) this.tab = tab as DockTab;
      const width = Number(localStorage.getItem("gvr.studio.dockedWidth"));
      if (width >= 280) this.dockedWidth = width;
      if (this.placement === "float") {
        const left = Number(localStorage.getItem("gvr.studio.floatLeft"));
        const top = Number(localStorage.getItem("gvr.studio.floatTop"));
        const floatWidth = Number(localStorage.getItem("gvr.studio.floatWidth"));
        const floatHeight = Number(localStorage.getItem("gvr.studio.floatHeight"));
        if (Number.isFinite(left) && Number.isFinite(top) && localStorage.getItem("gvr.studio.floatLeft") !== null) {
          this.dock.style.left = `${left}px`;
          this.dock.style.top = `${top}px`;
          this.dock.style.right = "auto";
          this.dock.style.bottom = "auto";
        }
        if (floatWidth >= 280) this.dock.style.width = `${floatWidth}px`;
        if (floatHeight >= 240) this.dock.style.height = `${floatHeight}px`;
      }
    } catch {
      /* Storage can be blocked. The inspector still works for this visit. */
    }
  }

  private storeDock(): void {
    try {
      localStorage.setItem("gvr.studio.panel", this.open ? "open" : "closed");
      localStorage.setItem("gvr.studio.placement", this.placement);
      localStorage.setItem("gvr.studio.tab", this.tab);
      localStorage.setItem("gvr.studio.dockedWidth", String(Math.round(this.dockedWidth)));
      if (this.placement === "float" && this.open) {
        const rect = this.dock.getBoundingClientRect();
        localStorage.setItem("gvr.studio.floatLeft", String(Math.round(rect.left)));
        localStorage.setItem("gvr.studio.floatTop", String(Math.round(rect.top)));
        localStorage.setItem("gvr.studio.floatWidth", String(Math.round(rect.width)));
        localStorage.setItem("gvr.studio.floatHeight", String(Math.round(rect.height)));
      }
    } catch {
      /* Ignore quota and privacy errors. */
    }
  }
}

