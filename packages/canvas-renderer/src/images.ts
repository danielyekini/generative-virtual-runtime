import type { ResourceDefinition, Telemetry } from "@gvr/schema";

/** Host loader state for one visual resource (mirrors audio resource states). */
export type ImageLoadState = "pending" | "ready" | "failed";

/** The minimal decoded-image surface the renderer needs. */
export interface LoadedImage {
  readonly width: number;
  readonly height: number;
  /** Anything `CanvasRenderingContext2D.drawImage` accepts. */
  readonly source: CanvasImageSource;
  /** Release decoded memory (for example `ImageBitmap.close`). Optional. */
  close?(): void;
}

/**
 * Starts loading `href`. Call exactly one of `resolve` / `reject`. The returned
 * function, if any, cancels a still-pending load when the entry is evicted.
 */
export type ImageLoader = (href: string, resolve: (image: LoadedImage) => void, reject: (reason: string) => void) => (() => void) | void;

interface Entry {
  state: ImageLoadState;
  image?: LoadedImage;
  reason?: string;
  cancel?: () => void;
}

export interface ImageCacheOptions {
  loader?: ImageLoader;
  telemetry?: Telemetry;
}

/**
 * Owns decoded images for one renderer (E019 resource lifecycle prototype).
 *
 * - `prepare(resources)` starts loads for the scene's image resources and
 *   evicts every entry the new scene no longer declares. That keeps the cache
 *   bounded across scene replacement.
 * - `statesFor(resources)` reports readiness by resource id, so hosts can feed
 *   `GeneratedOffer.imageStates` / `sceneImageReadiness`.
 * - `get(href)` returns a decoded image only when ready. Pending or failed
 *   entries draw nothing.
 * - `decodedBytes` estimates decoded RGBA memory as width × height × 4.
 */
export class ImageResourceCache {
  private readonly entries = new Map<string, Entry>();
  private readonly loader: ImageLoader | undefined;
  private readonly telemetry: Telemetry | undefined;
  private readonly listeners = new Set<() => void>();

  constructor(options: ImageCacheOptions = {}) {
    this.loader = options.loader ?? defaultLoader();
    this.telemetry = options.telemetry;
  }

  /** Starts loading every declared image href and evicts undeclared entries. */
  prepare(resources: readonly ResourceDefinition[]): void {
    const wanted = new Set<string>();
    for (const resource of resources) {
      if (resource.kind === "image" && resource.href) wanted.add(resource.href);
    }
    for (const href of [...this.entries.keys()]) {
      if (!wanted.has(href)) this.evict(href);
    }
    for (const href of wanted) this.acquire(href);
    this.report();
  }

  /** Returns the state, starting a load on first use. */
  acquire(href: string): ImageLoadState {
    const existing = this.entries.get(href);
    if (existing) return existing.state;
    const entry: Entry = { state: "pending" };
    this.entries.set(href, entry);
    if (!this.loader) {
      entry.state = "failed";
      entry.reason = "No image loader is available in this host.";
      this.report();
      return entry.state;
    }
    let settled = false;
    const cancel = this.loader(
      href,
      (image) => {
        if (settled) return;
        settled = true;
        if (this.entries.get(href) !== entry) {
          image.close?.();
          return;
        }
        entry.cancel = undefined;
        if (!(image.width > 0 && image.height > 0)) {
          entry.state = "failed";
          entry.reason = "The decoded image has no pixels.";
          image.close?.();
        } else {
          entry.state = "ready";
          entry.image = image;
        }
        this.report();
        this.notify();
      },
      (reason) => {
        if (settled) return;
        settled = true;
        if (this.entries.get(href) !== entry) return;
        entry.cancel = undefined;
        entry.state = "failed";
        entry.reason = reason;
        this.report();
        this.notify();
      },
    );
    if (!settled && typeof cancel === "function") entry.cancel = cancel;
    return entry.state;
  }

  /** A decoded image, only when ready. Never starts a load. */
  get(href: string): LoadedImage | undefined {
    const entry = this.entries.get(href);
    return entry?.state === "ready" ? entry.image : undefined;
  }

  stateOf(href: string): ImageLoadState | undefined {
    return this.entries.get(href)?.state;
  }

  reasonOf(href: string): string | undefined {
    return this.entries.get(href)?.reason;
  }

  /** Readiness keyed by resource id for every declared image resource. */
  statesFor(resources: readonly ResourceDefinition[]): Record<string, ImageLoadState> {
    const states: Record<string, ImageLoadState> = {};
    for (const resource of resources) {
      if (resource.kind !== "image") continue;
      states[resource.id] = this.entries.get(resource.href)?.state ?? "pending";
    }
    return states;
  }

  /** Called whenever an entry settles, so a paused host can redraw. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get size(): number {
    return this.entries.size;
  }

  get decodedBytes(): number {
    let bytes = 0;
    for (const entry of this.entries.values()) {
      if (entry.image) bytes += entry.image.width * entry.image.height * 4;
    }
    return bytes;
  }

  /** Releases every entry. The cache remains usable. */
  clear(): void {
    for (const href of [...this.entries.keys()]) this.evict(href);
    this.report();
  }

  private evict(href: string): void {
    const entry = this.entries.get(href);
    if (!entry) return;
    this.entries.delete(href);
    entry.cancel?.();
    entry.image?.close?.();
  }

  private report(): void {
    this.telemetry?.gauge("renderer.image_cache_entries", this.entries.size);
    this.telemetry?.gauge("renderer.image_decoded_bytes", this.decodedBytes);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Browser loader: `HTMLImageElement` + `decode()`; undefined outside the DOM. */
function defaultLoader(): ImageLoader | undefined {
  if (typeof Image === "undefined") return undefined;
  return (href, resolve, reject) => {
    const element = new Image();
    let live = true;
    element.decoding = "async";
    element.onload = () => {
      if (!live) return;
      const ready = () => {
        if (live) resolve({ width: element.naturalWidth, height: element.naturalHeight, source: element, close: () => element.removeAttribute("src") });
      };
      if (typeof element.decode === "function") element.decode().then(ready, ready);
      else ready();
    };
    element.onerror = () => {
      if (live) reject(`Image ${href} failed to load.`);
    };
    element.src = href;
    return () => {
      live = false;
      element.onload = null;
      element.onerror = null;
      element.removeAttribute("src");
    };
  };
}
