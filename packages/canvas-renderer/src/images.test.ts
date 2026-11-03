import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import type { ResourceDefinition, Telemetry } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { ImageResourceCache, type ImageLoader, type LoadedImage } from "./images";
import { CanvasRenderer } from "./renderer";

interface Pending {
  href: string;
  resolve: (image: LoadedImage) => void;
  reject: (reason: string) => void;
  cancelled: boolean;
}

function controlledLoader() {
  const loads: Pending[] = [];
  const loader: ImageLoader = (href, resolve, reject) => {
    const entry: Pending = { href, resolve, reject, cancelled: false };
    loads.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };
  return { loader, loads };
}

function bitmap(width: number, height: number, closed: string[], name: string): LoadedImage {
  return { width, height, source: { name } as unknown as CanvasImageSource, close: () => closed.push(name) };
}

const resources = (hrefs: string[]): ResourceDefinition[] => hrefs.map((href, index) => ({ id: `image${index + 1}`, kind: "image", href }));

class SamplingContext {
  imageSmoothingEnabled = true;
  draws: { args: unknown[]; smoothing: boolean }[] = [];
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  filter = "none";
  shadowColor = "transparent";
  fillStyle = "";
  setTransform(): void {}
  fillRect(): void {}
  save(): void {}
  restore(): void {}
  beginPath(): void {}
  rect(): void {}
  clip(): void {}
  setLineDash(): void {}
  drawImage(...args: unknown[]): void {
    this.draws.push({ args, smoothing: this.imageSmoothingEnabled });
  }
}

function mount() {
  const ctx = new SamplingContext();
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

const source = `scene "sprites" {version "0.2"; viewport (320,180); background #ffffff; duration 1s;};
image Hero { href "hero.png"; size (32, 32); position (40, 40); };
complete;`;

describe("ImageResourceCache (E019)", () => {
  it("reports pending, ready and failed states by resource id", () => {
    const { loader, loads } = controlledLoader();
    const cache = new ImageResourceCache({ loader });
    const declared = resources(["a.png", "b.png"]);
    cache.prepare(declared);
    expect(cache.statesFor(declared)).toEqual({ image1: "pending", image2: "pending" });
    expect(cache.get("a.png")).toBeUndefined();
    loads[0]!.resolve(bitmap(4, 2, [], "a"));
    loads[1]!.reject("404");
    expect(cache.statesFor(declared)).toEqual({ image1: "ready", image2: "failed" });
    expect(cache.get("a.png")?.width).toBe(4);
    expect(cache.get("b.png")).toBeUndefined();
    expect(cache.reasonOf("b.png")).toBe("404");
  });

  it("treats a zero-pixel decode as failed", () => {
    const { loader, loads } = controlledLoader();
    const closed: string[] = [];
    const cache = new ImageResourceCache({ loader });
    cache.acquire("empty.png");
    loads[0]!.resolve(bitmap(0, 0, closed, "empty"));
    expect(cache.stateOf("empty.png")).toBe("failed");
    expect(closed).toEqual(["empty"]);
  });

  it("evicts entries a replacement scene no longer declares and releases decoded memory", () => {
    const { loader, loads } = controlledLoader();
    const closed: string[] = [];
    const gauges: Record<string, number> = {};
    const telemetry = { gauge: (name: string, value: number) => (gauges[name] = value) } as unknown as Telemetry;
    const cache = new ImageResourceCache({ loader, telemetry });
    cache.prepare(resources(["a.png", "b.png", "c.png"]));
    loads[0]!.resolve(bitmap(10, 10, closed, "a"));
    loads[1]!.resolve(bitmap(20, 5, closed, "b"));
    expect(cache.decodedBytes).toBe(10 * 10 * 4 + 20 * 5 * 4);
    expect(gauges["renderer.image_decoded_bytes"]).toBe(800);

    cache.prepare(resources(["b.png", "d.png"]));
    expect(closed).toEqual(["a"]);
    expect(loads[2]!.cancelled).toBe(true);
    expect(cache.size).toBe(2);
    expect(cache.decodedBytes).toBe(400);
    expect(gauges["renderer.image_cache_entries"]).toBe(2);
    // A load that settles after eviction is discarded and closed.
    loads[2]!.resolve(bitmap(1, 1, closed, "c-late"));
    expect(cache.stateOf("c.png")).toBeUndefined();
    expect(closed).toEqual(["a", "c-late"]);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(closed).toEqual(["a", "c-late", "b"]);
    expect(gauges["renderer.image_decoded_bytes"]).toBe(0);
  });

  it("does not restart a load for an href already in flight or settled", () => {
    const { loader, loads } = controlledLoader();
    const cache = new ImageResourceCache({ loader });
    cache.prepare(resources(["a.png"]));
    cache.prepare(resources(["a.png"]));
    cache.acquire("a.png");
    expect(loads).toHaveLength(1);
  });

  it("notifies listeners when a load settles", () => {
    const { loader, loads } = controlledLoader();
    const cache = new ImageResourceCache({ loader });
    let changes = 0;
    const off = cache.onChange(() => (changes += 1));
    cache.acquire("a.png");
    loads[0]!.resolve(bitmap(1, 1, [], "a"));
    off();
    cache.acquire("b.png");
    loads[1]!.reject("x");
    expect(changes).toBe(1);
  });

  it("fails without a loader instead of waiting forever", () => {
    const cache = new ImageResourceCache({ loader: undefined });
    // Node has no Image constructor, so the default loader is absent.
    expect(cache.acquire("a.png")).toBe("failed");
  });
});

describe("CanvasRenderer images (E019)", () => {
  const scene = () => {
    const result = compileMotionScript(source);
    expect(result.diagnostics).toEqual([]);
    return result.scene!;
  };

  it("draws a loaded image at its declared size and nothing while pending", () => {
    const { loader, loads } = controlledLoader();
    const { canvas, ctx } = mount();
    const renderer = new CanvasRenderer(canvas, undefined, { imageLoader: loader });
    renderer.resize(320, 180, 1);
    const compiled = scene();
    renderer.images.prepare(compiled.resources);
    const frame = new AnimationRuntime(compiled).evaluate(0);
    renderer.render(frame);
    expect(ctx.draws).toEqual([]);
    loads[0]!.resolve(bitmap(8, 8, [], "hero"));
    renderer.render(frame);
    expect(ctx.draws).toHaveLength(1);
    expect(ctx.draws[0]!.args).toEqual([{ name: "hero" }, 0, 0, 32, 32]);
    expect(ctx.draws[0]!.smoothing).toBe(true);
  });

  it("disables smoothing for the pixelated sampling recipe", () => {
    const { loader, loads } = controlledLoader();
    const { canvas, ctx } = mount();
    const renderer = new CanvasRenderer(canvas, undefined, { imageLoader: loader, imageSampling: "pixelated" });
    renderer.resize(320, 180, 2);
    const frame = new AnimationRuntime(scene()).evaluate(0);
    renderer.render(frame); // lazily starts the load
    loads[0]!.resolve(bitmap(8, 8, [], "hero"));
    renderer.render(frame);
    expect(ctx.draws.map((draw) => draw.smoothing)).toEqual([false]);
    renderer.setImageSampling("smooth");
    renderer.render(frame);
    expect(ctx.draws.map((draw) => draw.smoothing)).toEqual([false, true]);
  });

  it("releases an owned cache on dispose but leaves a shared cache alone", () => {
    const { loader, loads } = controlledLoader();
    const closed: string[] = [];
    const shared = new ImageResourceCache({ loader });
    shared.acquire("hero.png");
    loads[0]!.resolve(bitmap(8, 8, closed, "hero"));
    const one = new CanvasRenderer(mount().canvas, undefined, { images: shared });
    one.dispose();
    expect(shared.size).toBe(1);
    const owned = new CanvasRenderer(mount().canvas, undefined, { imageLoader: loader });
    owned.images.acquire("hero.png");
    loads[1]!.resolve(bitmap(8, 8, closed, "owned"));
    owned.dispose();
    expect(owned.images.size).toBe(0);
    expect(closed).toEqual(["owned"]);
  });
});
