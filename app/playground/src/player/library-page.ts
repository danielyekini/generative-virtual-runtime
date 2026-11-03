import { CanvasRenderer } from "@gvr/canvas-renderer";
import { AnimationRuntime } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";
import { decodeMine, encodeMine, filterLibrary, mineEntry, programNameFromFile, STORAGE_KEY, type ProgramEntry, type ProgramFormat } from "../library";
import { FORMAT_LABELS, formatForFile } from "./programs";
import { runProgram } from "./run";
import { decodeRecent, read, RECENT_KEY } from "./settings";
import { decodeMeta, META_KEY, parseTags, type LibraryMeta } from "./library-state";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
const COLLECTIONS = ["Stories", "Test frames", "Runtime scenes", "Interactive", "My programs", "Imports"];
// Studio poster policy: 35% of duration. This is deliberately outside MotionScript.
const POSTER = 0.35;

export class LibraryPage {
  private meta: LibraryMeta = decodeMeta(read(META_KEY));
  private collection = "all";
  private favourites = false;
  private editorFormat: ProgramFormat = "motionscript";
  private observer: IntersectionObserver;
  private scenes = new Map<string, SceneIR | null>();
  private durations = new Map<string, number>();
  private queue: (() => void)[] = [];
  private scheduled = false;
  private sorting = false;

  constructor(private catalogue: ProgramEntry[], private actions: { open(entry: ProgramEntry): void; back(): void }) {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        this.observer.unobserve(entry.target);
        const card = entry.target as HTMLElement;
        const program = this.catalogue.find((p) => p.key === card.dataset.key);
        if (program) this.enqueue(() => { if (card.isConnected && !$("library").hidden) this.preview(card, program); });
      }
    }, { root: $("library"), rootMargin: "180px" });
    $("library-player").onclick = () => this.actions.back();
    $("library-search").oninput = () => this.render();
    $("library-sort").onchange = () => { void this.sortChanged(); };
    $("library-favourites").onclick = () => {
      this.favourites = !this.favourites;
      $("library-favourites").setAttribute("aria-pressed", String(this.favourites));
      this.render();
    };
    $("library-new").onclick = () => this.editor("", "Untitled program", "motionscript");
    $("library-paste").onclick = () => {
      this.editor("", "Untitled program", "motionscript");
      $<HTMLTextAreaElement>("library-source").placeholder = "Paste your MotionScript here, then save and open in Player.";
    };
    $("library-cancel").onclick = () => { $("library-editor").hidden = true; };
    $("library-upload").onclick = () => $<HTMLInputElement>("library-file").click();
    $<HTMLInputElement>("library-file").onchange = () => {
      const input = $<HTMLInputElement>("library-file");
      const file = input.files?.[0]; input.value = "";
      if (!file) return;
      void file.text().then((source) => this.editor(source, programNameFromFile(file.name), formatForFile(file.name, source)))
        .catch(() => this.error("Could not read that file. Your editor text is unchanged."));
    };
    $("library-save").onclick = () => this.save();
  }

  show(): void {
    this.render();
    $("library-title").focus({ preventScroll: true });
  }

  private error(message: string): void {
    $("library-error").textContent = message;
    $("library-error").hidden = !message;
  }

  private persist(key: string, value: string): boolean {
    try { localStorage.setItem(key, value); return true; }
    catch {
      this.error(key === STORAGE_KEY
        ? "Browser storage is unavailable or full. Your program was not saved. Your source is still in the editor; copy it before leaving."
        : "Browser storage is unavailable or full. Library organisation changes were not saved; browsing and Run still work.");
      return false;
    }
  }

  private updateMeta(key: string, patch: Partial<LibraryMeta[string]>): boolean {
    const next = { ...this.meta, [key]: { ...this.meta[key], ...patch } };
    if (!this.persist(META_KEY, JSON.stringify(next))) return false;
    this.meta = next;
    return true;
  }

  private editor(source: string, title: string, format: ProgramFormat): void {
    // Existing authoring text survives page navigation. Never overwrite a nonempty draft silently.
    const box = $<HTMLTextAreaElement>("library-source");
    if (box.value && box.value !== source) {
      $("library-editor").hidden = false;
      this.error("An authoring draft is already open. Save it or clear its text before starting another program.");
      box.focus();
      return;
    }
    this.error("");
    this.editorFormat = format;
    $<HTMLInputElement>("library-name").value = title;
    box.value = source;
    $("library-format").textContent = FORMAT_LABELS[format];
    $("library-editor").hidden = false;
    box.focus();
  }

  private save(): void {
    this.error("");
    const source = $<HTMLTextAreaElement>("library-source").value;
    const title = $<HTMLInputElement>("library-name").value.trim() || "Untitled program";
    const entry = mineEntry(`mine:${crypto.randomUUID()}`, title, source);
    entry.format = this.editorFormat;
    // Merge fresh storage so another tab's saved programs aren't overwritten.
    const mine = decodeMine(read(STORAGE_KEY));
    if (!this.persist(STORAGE_KEY, encodeMine([...mine, entry]))) return;
    this.catalogue.splice(0, this.catalogue.length, ...this.catalogue.filter((p) => p.origin !== "mine"), ...mine, entry);
    this.updateMeta(entry.key, { modifiedAt: Date.now() });
    $("library-editor").hidden = true;
    $<HTMLTextAreaElement>("library-source").value = "";
    this.open(entry);
  }

  private open(entry: ProgramEntry): void {
    this.updateMeta(entry.key, { openedAt: Date.now() });
    this.actions.open(entry);
  }

  private enqueue(task: () => void): void {
    this.queue.push(task);
    if (this.scheduled) return;
    this.scheduled = true;
    const next = () => {
      const task = this.queue.shift();
      task?.();
      if (this.queue.length) requestAnimationFrame(next);
      else this.scheduled = false;
    };
    requestAnimationFrame(next);
  }

  private scene(entry: ProgramEntry): SceneIR | null {
    if (this.scenes.has(entry.key)) {
      const scene = this.scenes.get(entry.key)!;
      this.scenes.delete(entry.key); this.scenes.set(entry.key, scene);
      return scene;
    }
    let scene: SceneIR | null = null;
    try { scene = runProgram(entry.source, entry.format, entry.label).scene ?? null; }
    catch { /* A bad entry must not prevent the rest of the catalogue loading. */ }
    this.scenes.set(entry.key, scene);
    this.durations.set(entry.key, scene?.timeline.durationMs ?? Infinity);
    if (this.scenes.size > 12) this.scenes.delete(this.scenes.keys().next().value!);
    return scene;
  }

  private async sortChanged(): Promise<void> {
    if ($<HTMLSelectElement>("library-sort").value !== "duration") { this.render(); return; }
    if (this.sorting) return;
    this.sorting = true;
    $("library-count").textContent = "Reading program durations…";
    for (const entry of this.catalogue) {
      if (!this.durations.has(entry.key)) {
        await new Promise<void>((done) => this.enqueue(() => { this.scene(entry); done(); }));
      }
    }
    this.sorting = false;
    this.render();
  }

  private render(): void {
    this.observer.disconnect();
    const entries = this.catalogue.map((p) => ({ ...p, tags: this.meta[p.key]?.tags ?? [] }));
    const matches = filterLibrary(entries, { text: $<HTMLInputElement>("library-search").value, collection: this.collection })
      .filter((p) => !this.favourites || this.meta[p.key]?.favourite);
    const sort = $<HTMLSelectElement>("library-sort").value;
    const recent = decodeRecent(read(RECENT_KEY));
    matches.sort((a, b) => {
      const am = this.meta[a.key], bm = this.meta[b.key];
      const recentScore = (key: string) => recent.includes(key) ? recent.length - recent.indexOf(key) : 0;
      const order = sort === "recent" ? recentScore(b.key) - recentScore(a.key) || (bm?.openedAt ?? 0) - (am?.openedAt ?? 0)
        : sort === "modified" ? (bm?.modifiedAt ?? 0) - (am?.modifiedAt ?? 0)
        : sort === "duration" ? (this.durations.get(a.key) ?? Infinity) - (this.durations.get(b.key) ?? Infinity) : 0;
      return order || a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
    });
    $("library-count").textContent = `${matches.length} of ${entries.length} programs`;
    $("library-empty").hidden = matches.length !== 0;
    $("library-collections").replaceChildren(...["all", ...COLLECTIONS].map((collection) => {
      const count = collection === "all" ? entries.length : entries.filter((p) => p.collection === collection).length;
      const button = el("button", `${collection === "all" ? "All" : collection} ${count}`);
      button.className = "chip"; button.setAttribute("aria-pressed", String(this.collection === collection));
      button.onclick = () => { this.collection = collection; this.render(); };
      return button;
    }));
    $("library-grid").replaceChildren(...matches.map((entry) => this.card(entry)));
    const recentEntries = recent.map((key) => this.catalogue.find((p) => p.key === key)).filter((p): p is ProgramEntry => !!p);
    $("library-recent").hidden = recentEntries.length === 0;
    $("library-recent-list").replaceChildren(...recentEntries.map((entry) => {
      const button = el("button", entry.label); button.onclick = () => this.open(entry); return button;
    }));
  }

  private card(entry: ProgramEntry): HTMLElement {
    const card = el("article"); card.className = "program-card"; card.dataset.key = entry.key; card.role = "listitem";
    const preview = el("button"); preview.className = "program-preview"; preview.setAttribute("aria-label", `Open ${entry.label}`);
    const canvas = el("canvas"); canvas.width = 480; canvas.height = 270; canvas.setAttribute("aria-hidden", "true");
    const status = el("span", "Loading thumbnail…"); status.className = "preview-status";
    preview.append(canvas, status); preview.onclick = () => this.open(entry);
    const body = el("div"); body.className = "program-card-body";
    const heading = el("div"); heading.className = "library-toolbar";
    const title = el("h3", entry.label);
    const star = el("button", this.meta[entry.key]?.favourite ? "★" : "☆"); star.className = "favourite";
    star.setAttribute("aria-label", `Favourite ${entry.label}`); star.setAttribute("aria-pressed", String(!!this.meta[entry.key]?.favourite));
    star.onclick = () => { if (this.updateMeta(entry.key, { favourite: !this.meta[entry.key]?.favourite })) this.render(); };
    heading.append(title, star);
    const collection = el("p", `${entry.collection} · ${FORMAT_LABELS[entry.format]}`); collection.className = "meta";
    const caption = el("p", entry.caption); caption.className = "card-caption";
    const tags = el("input"); tags.value = (entry.tags ?? []).join(", "); tags.placeholder = "Add tags, comma separated";
    tags.setAttribute("aria-label", `Tags for ${entry.label}`);
    tags.onchange = () => {
      // Keep the card mounted: blur fires before a click on its Open button.
      // Replacing it here would swallow that click (and keyboard focus).
      if (this.updateMeta(entry.key, { tags: parseTags(tags.value), modifiedAt: Date.now() })) tags.value = parseTags(tags.value).join(", ");
    };
    const foot = el("div"); foot.className = "library-toolbar";
    const knownDuration = this.durations.get(entry.key);
    const duration = el("span", knownDuration === undefined ? "—" : !Number.isFinite(knownDuration) ? "No playable scene" : knownDuration === 0 ? "Static" : `${(knownDuration / 1000).toFixed(2)} s`); duration.className = "meta program-duration";
    const open = el("button", "Open →"); open.onclick = () => this.open(entry);
    foot.append(duration, open); body.append(heading, collection, caption, tags, foot); card.append(preview, body);
    this.observer.observe(card);
    return card;
  }

  private preview(card: HTMLElement, entry: ProgramEntry): void {
    const canvas = card.querySelector("canvas")!;
    const button = card.querySelector<HTMLButtonElement>(".program-preview")!;
    const status = card.querySelector<HTMLElement>(".preview-status")!;
    const duration = card.querySelector<HTMLElement>(".program-duration")!;
    const scene = this.scene(entry);
    if (!scene) { status.textContent = "Preview unavailable · Open for diagnostics"; duration.textContent = "No playable scene"; return; }
    const total = scene.timeline.durationMs;
    duration.textContent = total > 0 ? `${(total / 1000).toFixed(2)} s` : "Static";
    // Cache only a bitmap per card; runtime/scene objects are looked up when the pointer moves.
    const paint = (fraction: number) => {
      try {
        const current = this.scene(entry);
        if (!current) return;
        const renderer = new CanvasRenderer(canvas);
        renderer.resize(480, 270, 1);
        // Renderer writes fixed CSS dimensions; fit the bitmap to the responsive card.
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        renderer.render(new AnimationRuntime(current).evaluate(total * fraction));
        canvas.dataset.time = String(total * fraction);
        status.textContent = fraction === POSTER ? "Scrub preview ↔" : `${(total * fraction / 1000).toFixed(2)} s / ${(total / 1000).toFixed(2)} s`;
      } catch { status.textContent = "Preview unavailable · Open for diagnostics"; }
    };
    paint(POSTER);
    button.onpointermove = (event) => {
      const box = button.getBoundingClientRect();
      paint(Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width))));
    };
    button.onpointerleave = () => paint(POSTER);
  }
}
