import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { describe, expect, it } from "vitest";
import {
  deviceFitMatrix,
  multiplyMat3,
  transformPoint,
  type Mat3,
  type ResolvedFrame,
} from "@gvr/schema";
import { traceGeometry } from "./draw";
import { CanvasRenderer } from "./renderer";
import {
  CAMERA_SAMPLE,
  HIERARCHY,
  VIEWPORT,
  buildFrames,
  cameraMarkerMatrix,
  hierarchyMatrix,
} from "../../../fixtures/frame-cases";

class RecordingContext {
  calls: { name: string; args: unknown[]; alpha: number; fillStyle: string }[] = [];
  fillStyle = "";
  strokeStyle = "";
  globalAlpha = 1;
  private _composite = "source-over";
  get globalCompositeOperation(): string {
    return this._composite;
  }
  set globalCompositeOperation(value: string) {
    this._composite = value;
    this.note("composite", [value]);
  }
  font = "";
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";
  lineWidth = 1;
  lineCap: CanvasLineCap = "butt";
  lineJoin: CanvasLineJoin = "miter";
  miterLimit = 10;
  lineDash: number[] = [];
  lineDashOffset = 0;
  private _filter = "none";
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  shadowBlur = 0;
  shadowColor = "transparent";

  get filter(): string {
    return this._filter;
  }
  set filter(value: string) {
    this._filter = value;
    this.note("filter", [value]);
  }

  setTransform(...args: number[]): void {
    this.note("setTransform", args);
  }
  transform(): void {
    this.note("transform", []);
  }
  scale(): void {
    this.note("scale", []);
  }
  rotate(): void {
    this.note("rotate", []);
  }
  translate(): void {
    this.note("translate", []);
  }
  fillRect(...args: number[]): void {
    this.note("fillRect", args);
  }
  clearRect(...args: number[]): void {
    this.note("clearRect", args);
  }
  drawImage(...args: unknown[]): void {
    this.note("drawImage", args);
  }
  save(): void {
    this.note("save", []);
  }
  restore(): void {
    this.note("restore", []);
  }
  beginPath(): void {
    this.note("beginPath", []);
  }
  rect(...args: number[]): void {
    this.note("rect", args);
  }
  clip(): void {
    this.note("clip", []);
  }
  fill(...args: unknown[]): void {
    this.note("fill", args);
  }
  stroke(): void {
    this.note("stroke", []);
  }
  fillText(...args: unknown[]): void {
    this.note("fillText", args);
  }
  strokeText(): void {
    this.note("strokeText", []);
  }
  setLineDash(segments: number[] = []): void {
    this.lineDash = segments.slice();
  }
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  closePath(): void {}
  arc(): void {}
  ellipse(): void {}

  private note(name: string, args: unknown[]): void {
    this.calls.push({ name, args, alpha: this.globalAlpha, fillStyle: this.fillStyle });
  }
}

function mount(): { canvas: HTMLCanvasElement; ctx: RecordingContext } {
  const ctx = new RecordingContext();
  const canvas = {
    width: 0,
    height: 0,
    style: {} as CSSStyleDeclaration,
    getContext: () => ctx,
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, ctx };
}

function canvasArgs(matrix: Mat3): number[] {
  return [matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]];
}

function render(frame: ResolvedFrame, cssWidth: number, cssHeight: number, dpr: number) {
  const mounted = mount();
  const renderer = new CanvasRenderer(mounted.canvas);
  renderer.resize(cssWidth, cssHeight, dpr);
  renderer.render(frame);
  return { ...mounted, renderer };
}

describe("geometry tracing", () => {
  it("starts rectangles at the local top-left and centres ellipses", () => {
    const ops: string[] = [];
    const sink = {
      rect: (x: number, y: number, w: number, h: number) => ops.push(`rect ${x} ${y} ${w} ${h}`),
      arc: (x: number, y: number, r: number) => ops.push(`arc ${x} ${y} ${r}`),
      ellipse: (x: number, y: number, rx: number, ry: number) => ops.push(`ellipse ${x} ${y} ${rx} ${ry}`),
      moveTo: () => ops.push("move"),
      lineTo: () => ops.push("line"),
      quadraticCurveTo: () => ops.push("quad"),
      bezierCurveTo: () => ops.push("cubic"),
      closePath: () => ops.push("close"),
    };
    traceGeometry({ kind: "rectangle", size: { x: 200, y: 80 } }, sink);
    traceGeometry({ kind: "circle", radius: 40 }, sink);
    traceGeometry({ kind: "ellipse", size: { x: 180, y: 100 } }, sink);
    traceGeometry(
      {
        kind: "path",
        fillRule: "evenodd",
        commands: [
          { cmd: "M", x: 0, y: 0 },
          { cmd: "L", x: 10, y: 0 },
          { cmd: "Q", cx: 1, cy: 2, x: 3, y: 4 },
          { cmd: "C", c1x: 1, c1y: 1, c2x: 2, c2y: 2, x: 3, y: 3 },
          { cmd: "Z" },
        ],
      },
      sink,
    );
    expect(ops).toEqual([
      "rect 0 0 200 80",
      "arc 0 0 40",
      "ellipse 0 0 90 50",
      "move",
      "line",
      "quad",
      "cubic",
      "close",
    ]);
  });
});

describe("CanvasRenderer", () => {
  it("sizes the backing store from CSS pixels and the device pixel ratio", () => {
    const { canvas, renderer } = render(buildFrames()["primitive-gallery"]!, 960, 540, 2);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(canvas.style.width).toBe("960px");
    expect(canvas.style.height).toBe("540px");
    renderer.dispose();
    renderer.resize(100, 100, 2);
    expect(canvas.width).toBe(1920);
  });

  it("letterboxes the logical viewport and clears the bars", () => {
    const { ctx } = render(buildFrames().opacity!, 800, 800, 2);
    const rects = ctx.calls.filter((call) => call.name === "fillRect");
    expect(rects[0]).toMatchObject({ fillStyle: "#000000", args: [0, 0, 1600, 1600] });
    expect(rects[1]?.args[0]).toBeCloseTo(0, 6);
    expect(rects[1]?.args[1]).toBeCloseTo(350, 6);
    expect(rects[1]?.args[2]).toBeCloseTo(1600, 6);
    expect(rects[1]?.args[3]).toBeCloseTo(900, 6);
  });

  it("sets each item matrix absolutely from the resolved logical matrix", () => {
    const frame = buildFrames()["hierarchy-transform"]!;
    const { ctx } = render(frame, 1280, 720, 1);
    const transforms = ctx.calls.filter((call) => call.name === "setTransform").slice(1);
    const neighbor = frame.drawItems.find((entry) => entry.nodeId === "neighbor");
    const pivoted = frame.drawItems.find((entry) => entry.nodeId === "pivoted");
    expect(transforms[1]?.args).toEqual(canvasArgs(hierarchyMatrix()));
    expect(transforms[0]?.args).toEqual(canvasArgs(neighbor?.logicalMatrix ?? [1, 0, 0, 0, 1, 0, 0, 0, 1]));
    expect(ctx.calls.some((call) => ["transform", "scale", "rotate", "translate"].includes(call.name))).toBe(false);
    expect(pivoted?.logicalMatrix).toEqual([...hierarchyMatrix()]);
    expect(HIERARCHY.position.x + HIERARCHY.pivot.x).toBe(640);
  });

  it("paints in array order and uses each item's own opacity", () => {
    const { ctx } = render(buildFrames()["z-order"]!, 1280, 720, 1);
    const painted = ctx.calls.filter((call) => call.name === "fill").map((call) => call.alpha);
    expect(painted).toEqual([1, 1, 1]);
    const opacity = render(buildFrames().opacity!, 1280, 720, 1);
    const alphas = opacity.ctx.calls.filter((call) => call.name === "fill").map((call) => call.alpha);
    expect(alphas.slice(0, 3)).toEqual([1, 0.5, 0.25]);
  });

  it("places the specification camera sample at the resolved logical point", () => {
    const frame = buildFrames()["camera-mapping"]!;
    const { ctx } = render(frame, 800, 800, 2);
    const marker = ctx.calls.filter((call) => call.name === "setTransform")[1];
    expect(marker?.args[4]).toBeCloseTo(1300, 6);
    expect(marker?.args[5]).toBeCloseTo(800, 6);
    const device = deviceFitMatrix(VIEWPORT, 800, 800, 2);
    const point = transformPoint(multiplyMat3(device, cameraMarkerMatrix()), 0, 0);
    expect(point).toEqual({ x: marker?.args[4], y: marker?.args[5] });
    expect(transformPoint(cameraMarkerMatrix(), 0, 0)).toEqual(CAMERA_SAMPLE.logical);
  });

  it("draws text from its anchor with the requested alignment", () => {
    const { ctx } = render(buildFrames().text!, 1280, 720, 1);
    const labels = ctx.calls.filter((call) => call.name === "fillText");
    expect(labels.map((call) => call.args[0])).toEqual(["Left", "Middle", "Right"]);
    expect(labels.every((call) => call.args[1] === 0 && call.args[2] === 0)).toBe(true);
  });

  it("stops drawing after dispose", () => {
    const mounted = mount();
    const renderer = new CanvasRenderer(mounted.canvas);
    renderer.resize(100, 100, 1);
    renderer.dispose();
    renderer.render(buildFrames().opacity!);
    expect(mounted.ctx.calls).toEqual([]);
  });

  it("applies blur filter on an isolated render scope", () => {
    const base = buildFrames().opacity!;
    const leaf = base.drawItems[0];
    expect(leaf).toBeDefined();
    const frame: ResolvedFrame = {
      ...base,
      renderTree: {
        kind: "scope",
        id: "root",
        isolated: false,
        opacity: 1,
        children: [
          {
            kind: "scope",
            id: "blurred",
            isolated: true,
            opacity: 1,
            effect: { type: "blur", radius: 6 },
            children: [{ kind: "leaf", item: leaf! }],
          },
        ],
      },
    };
    const { ctx } = render(frame, 1280, 720, 1);
    expect(ctx.calls.some((call) => call.name === "filter" && call.args[0] === "blur(6px)")).toBe(true);
  });

  it("applies shadow effect on an isolated render scope", () => {
    const base = buildFrames().opacity!;
    const leaf = base.drawItems[0];
    expect(leaf).toBeDefined();
    const frame: ResolvedFrame = {
      ...base,
      renderTree: {
        kind: "scope",
        id: "root",
        isolated: false,
        opacity: 1,
        children: [
          {
            kind: "scope",
            id: "shadowed",
            isolated: true,
            opacity: 1,
            effect: { type: "shadow", dx: 4, dy: 6, blur: 8, color: "rgba(0,0,0,0.4)" },
            children: [{ kind: "leaf", item: leaf! }],
          },
        ],
      },
    };
    const { ctx } = render(frame, 1280, 720, 1);
    expect(ctx.shadowOffsetX).toBe(4);
    expect(ctx.shadowOffsetY).toBe(6);
    expect(ctx.shadowBlur).toBe(8);
    expect(ctx.shadowColor).toBe("rgba(0,0,0,0.4)");
  });
});

// The recorder observes actual CanvasRenderer calls on both routing branches.

describe("group clip scopes through CanvasRenderer", () => {
  it("applies clip on compositing scopes", () => {
    const source = `scene "clip" { version "0.2"; viewport (200, 200); background #000000; duration 1s; requires "compositing.mask"; requires "compositing.isolatedOpacity"; };
      group Card { clip Hole;
        rectangle Panel { size (100, 100); fill #ff0000; };
      };
      circle Hole { position (50, 50); radius 30; visible false; fill #000000; };
      complete;`;
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(compiled.scene!).evaluate(0);
    const { ctx } = render(frame, 200, 200, 1);
    expect(ctx.calls.some((call) => call.name === "clip")).toBe(true);
  });
});

describe("group matte scopes through CanvasRenderer", () => {
  it("composites a matte with destination-in and withholds without a buffer", () => {
    const source = `scene "matte" { version "0.2"; viewport (200, 100); background #000000; duration 1s; requires "compositing.matte"; requires "compositing.isolatedOpacity"; };
      group Card { matte Hole;
        rectangle Panel { size (200, 100); fill #ff0000; };
      };
      group Hole { visible false;
        circle A { position (40, 50); radius 30; fill #ffffff; };
      };
      complete;`;
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(compiled.scene!).evaluate(0);

    const withheld = render(frame, 200, 100, 1);
    expect(withheld.ctx.calls.some((call) => call.name === "fill")).toBe(false);
    expect(withheld.ctx.calls.some((call) => call.name === "drawImage")).toBe(false);

    const layers: RecordingContext[] = [];
    const root = new RecordingContext();
    const ownerDocument = {
      createElement(): HTMLCanvasElement {
        const ctx = new RecordingContext();
        layers.push(ctx);
        const canvas = {
          width: 0,
          height: 0,
          style: {},
          ownerDocument: undefined as { createElement(): HTMLCanvasElement } | undefined,
          getContext: () => ctx,
        };
        canvas.ownerDocument = ownerDocument;
        return canvas as unknown as HTMLCanvasElement;
      },
    };
    const canvas = {
      width: 0,
      height: 0,
      style: {} as CSSStyleDeclaration,
      ownerDocument,
      getContext: () => root,
    };
    const renderer = new CanvasRenderer(canvas as unknown as HTMLCanvasElement);
    renderer.resize(200, 100, 1);
    renderer.render(frame);
    expect(root.calls.some((call) => call.name === "drawImage")).toBe(true);
    expect(layers.some((ctx) => ctx.calls.some((call) => call.name === "composite" && call.args[0] === "destination-in"))).toBe(true);
    expect(layers.some((ctx) => ctx.calls.some((call) => call.name === "fill"))).toBe(true);
  });
});

describe("hierarchical paint ordering through CanvasRenderer", () => {
  it("preserves hierarchical sibling order through CanvasRenderer", () => {
    for (const scope of ["", "isolated true;"]) {
      const source = `scene "order" { version "0.2"; viewport (100, 100); background #000000; duration 1s; requires "compositing.isolatedOpacity"; };
        group front { zIndex 10; ${scope}
          rectangle red { size (20,20); fill #ff0000; zIndex 2; };
          group inner { zIndex 1; ${scope}
            rectangle blue { size (20,20); fill #0000ff; zIndex 3; };
            rectangle green { size (20,20); fill #00ff00; zIndex 0; };
            rectangle tie { size (20,20); fill #ffff00; zIndex 0; };
          };
        };
        rectangle back { size (20,20); fill #ffffff; zIndex -1; };
        complete;`;
      const compiled = compileMotionScript(source);
      expect(compiled.diagnostics).toEqual([]);
      const frame = new AnimationRuntime(compiled.scene!).evaluate(0);
      expect(frame.drawItems.map(item => item.nodeId)).toEqual(["back", "front.inner.green", "front.inner.tie", "front.inner.blue", "front.red"]);
      const {ctx} = render(frame, 100, 100, 1);
      expect(ctx.calls.filter(call => call.name === "fill").map(call => call.fillStyle)).toEqual([
        "rgba(255, 255, 255, 1)", "rgba(0, 255, 0, 1)", "rgba(255, 255, 0, 1)", "rgba(0, 0, 255, 1)", "rgba(255, 0, 0, 1)"
      ]);
    }
  });
});

describe("paint.strokeDash", () => {
  it("sets the canvas dash and phase for a dashed stroke", () => {
    const dashed = compileMotionScript(`scene "marks" {
      version "0.2"; viewport (640, 360); background #0b1220; duration 2s;
    };
    line Wire {
      from (80, 180);
      to (560, 180);
      stroke #f8fafc width 6 dash (18, 10) phase 0;
    };
    keyframes Wire.stroke.phase { start 0ms; duration 2s; 0% 0; 100% 28; };
    complete;`);
    expect(dashed.diagnostics).toEqual([]);
    const frame = new AnimationRuntime(dashed.scene!).evaluate(1000);
    const { ctx } = render(frame, 640, 360, 1);
    expect(ctx.lineDash).toEqual([18, 10]);
    expect(ctx.lineDashOffset).toBeCloseTo(14);

    const solid = compileMotionScript(`scene "marks" {
      version "0.2"; viewport (640, 360); background #0b1220; duration 1s;
    };
    line Wire { from (0, 0); to (40, 0); stroke #ffffff width 2; };
    complete;`);
    const solidFrame = new AnimationRuntime(solid.scene!).evaluate(0);
    const solidCtx = render(solidFrame, 640, 360, 1).ctx;
    expect(solidCtx.lineDash).toEqual([]);
    expect(solidCtx.lineDashOffset).toBe(0);
  });
});
