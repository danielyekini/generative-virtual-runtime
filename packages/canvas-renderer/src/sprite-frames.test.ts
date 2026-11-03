/** E045: per-node image sampling and atlas sprite frames in the production renderer. */
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { describe, expect, it } from "vitest";
import type { ImageLoader, LoadedImage } from "./images";
import { CanvasRenderer } from "./renderer";

class Context {
  imageSmoothingEnabled = true;
  draws: { args: unknown[]; smoothing: boolean }[] = [];
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  filter = "none";
  shadowColor = "transparent";
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  save() {}
  restore() {}
  setTransform() {}
  transform() {}
  fillRect() {}
  clearRect() {}
  beginPath() {}
  rect() {}
  clip() {}
  setLineDash() {}
  drawImage(...args: unknown[]) {
    this.draws.push({ args, smoothing: this.imageSmoothingEnabled });
  }
}

function setup(source: string) {
  const ctx = new Context();
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx } as unknown as HTMLCanvasElement;
  const loads: ((image: LoadedImage) => void)[] = [];
  const loader: ImageLoader = (_href, resolve) => {
    loads.push(resolve);
    return () => {};
  };
  const renderer = new CanvasRenderer(canvas, undefined, { imageLoader: loader });
  renderer.resize(320, 180, 1);
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  renderer.images.prepare(result.scene!.resources);
  for (const resolve of loads) resolve({ width: 32, height: 16, source: { name: "atlas" } as unknown as CanvasImageSource, close: () => {} });
  return { ctx, renderer, runtime: new AnimationRuntime(result.scene!) };
}

const header = `scene "sprites" {version "0.2"; viewport (320,180); background #ffffff; duration 1s;};`;

describe("resources.imageSampling / resources.spriteFrames renderer (E045)", () => {
  it("draws the row-major atlas cell for the sampled frame", () => {
    const { ctx, renderer, runtime } = setup(`${header}
image Walker { href "atlas.png"; size (64, 64); frames (4, 2); frame 5; position (10, 10); };
complete;`);
    renderer.render(runtime.evaluate(0));
    // 32 x 16 atlas, 4 x 2 grid: cells are 8 x 8; frame 5 is column 1, row 1.
    expect(ctx.draws[0]!.args).toEqual([{ name: "atlas" }, 8, 8, 8, 8, 0, 0, 64, 64]);
  });

  it("steps an animated frame and lets node sampling override the renderer default", () => {
    const { ctx, renderer, runtime } = setup(`${header}
image Walker { href "atlas.png"; size (64, 64); sampling pixelated; frames (4, 2); position (10, 10); };
animate Walker.frame { from 0; to 8; duration 800ms; };
complete;`);
    for (const t of [0, 150, 450, 1000]) renderer.render(runtime.evaluate(t));
    expect(ctx.draws.map((draw) => [draw.args[1], draw.args[2]])).toEqual([[0, 0], [8, 0], [0, 8], [24, 8]]);
    expect(ctx.draws.every((draw) => draw.smoothing === false)).toBe(true);
  });

  it("keeps a plain image a whole-image draw at the renderer default", () => {
    const { ctx, renderer, runtime } = setup(`${header}
image Hero { href "atlas.png"; size (32, 16); position (10, 10); };
complete;`);
    renderer.render(runtime.evaluate(0));
    expect(ctx.draws[0]!.args).toEqual([{ name: "atlas" }, 0, 0, 32, 16]);
    expect(ctx.draws[0]!.smoothing).toBe(true);
  });
});
