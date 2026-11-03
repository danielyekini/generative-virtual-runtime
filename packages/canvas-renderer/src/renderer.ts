import {
  type Telemetry,
  deviceFitMatrix,
  multiplyMat3,
  transformPoint,
  type Mat3,
  type Paint,
  type RenderTreeNode,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
} from "@gvr/schema";
import { cssColor, cssFont, traceGeometry, type PathSink } from "./draw";

const LETTERBOX = "#000000";

/**
 * Draws a resolved frame. The logical matrix on each item already includes
 * hierarchy and camera. This class multiplies only by the contain fit and the
 * device-pixel scale, then sets that matrix absolutely.
 */
export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private cssWidth = 0;
  private cssHeight = 0;
  private devicePixelRatio = 1;
  private disposed = false;
  private paths = new WeakMap<object, Path2D>();
  private readonly images = new Map<string, HTMLImageElement>();
  private scopeAlpha = 1;

  constructor(canvas: HTMLCanvasElement, private readonly telemetry?: Telemetry) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    if (this.disposed) return;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.devicePixelRatio = devicePixelRatio;
    const backingWidth = Math.max(1, Math.round(cssWidth * devicePixelRatio));
    const backingHeight = Math.max(1, Math.round(cssHeight * devicePixelRatio));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
  }

  render(frame: ResolvedFrame): void {
    if (this.telemetry) this.telemetry.measure('frame.renderer_call_ms', () => this.renderInner(frame));
    else this.renderInner(frame);
  }
  private renderInner(frame: ResolvedFrame): void {
    const ctx = this.ctx;
    if (this.disposed || !ctx || this.cssWidth <= 0 || this.cssHeight <= 0) return;

    const device = deviceFitMatrix(frame.viewport, this.cssWidth, this.cssHeight, this.devicePixelRatio);
    const origin = transformPoint(device, 0, 0);
    const far = transformPoint(device, frame.viewport.width, frame.viewport.height);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.shadowColor = "transparent";
    ctx.fillStyle = LETTERBOX;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = cssColor(frame.background);
    ctx.fillRect(origin.x, origin.y, far.x - origin.x, far.y - origin.y);

    ctx.save();
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, far.x - origin.x, far.y - origin.y);
    ctx.clip();

    this.scopeAlpha = 1;
    if (frame.renderTree && treeUsesScopes(frame.renderTree)) this.drawTree(ctx, device, frame.renderTree);
    else {
      for (const item of frame.drawItems) this.drawItem(ctx, device, item);
    }
    ctx.restore();
  }

  dispose(): void {
    this.disposed = true;
    this.ctx = null;
    this.images.clear();
    this.paths = new WeakMap<object, Path2D>();
    this.telemetry?.gauge("renderer.image_cache_entries", 0);
  }

  private drawItem(ctx: CanvasRenderingContext2D, device: Mat3, item: ResolvedDrawItem): void {
    ctx.save();
    const matrix = multiplyMat3(device, item.logicalMatrix);
    ctx.setTransform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
    ctx.globalAlpha = item.opacity * this.scopeAlpha;
    const dash = item.appearance.stroke?.dash;
    if (dash && dash.length > 0) {
      ctx.setLineDash(dash.slice());
      ctx.lineDashOffset = item.appearance.stroke?.phase ?? 0;
    } else {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    if (item.geometry.kind === "text") this.drawText(ctx, item);
    else if (item.geometry.kind === "image") this.drawImage(ctx, item);
    else this.drawShape(ctx, item);
    ctx.restore();
  }

  private drawShape(ctx: CanvasRenderingContext2D, item: ResolvedDrawItem): void {
    const path = this.compiledPath(item.geometry);
    const rule = item.geometry.kind === "path" ? item.geometry.fillRule : "nonzero";
    const fill = item.appearance.fill;
    const stroke = item.appearance.stroke;
    if (fill && item.geometry.kind !== "line") {
      ctx.fillStyle = this.paintStyle(ctx, fill);
      if (path) ctx.fill(path, rule);
      else {
        ctx.beginPath();
        traceGeometry(item.geometry, ctx);
        ctx.fill(rule);
      }
    }
    if (stroke) {
      ctx.strokeStyle = this.paintStyle(ctx, stroke.color);
      ctx.lineWidth = stroke.width;
      ctx.lineCap = stroke.cap;
      ctx.lineJoin = stroke.join;
      ctx.miterLimit = stroke.miterLimit;
      if (path) ctx.stroke(path);
      else {
        if (!fill || item.geometry.kind === "line") {
          ctx.beginPath();
          traceGeometry(item.geometry, ctx);
        }
        ctx.stroke();
      }
    }
  }

  private drawText(ctx: CanvasRenderingContext2D, item: ResolvedDrawItem): void {
    if (item.geometry.kind !== "text") return;
    const { content, font, align, baseline } = item.geometry;
    ctx.font = cssFont(font);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (item.appearance.fill) {
      ctx.fillStyle = this.paintStyle(ctx, item.appearance.fill);
      ctx.fillText(content, 0, 0);
    }
    if (item.appearance.stroke) {
      const stroke = item.appearance.stroke;
      ctx.strokeStyle = this.paintStyle(ctx, stroke.color);
      ctx.lineWidth = stroke.width;
      ctx.lineCap = stroke.cap;
      ctx.lineJoin = stroke.join;
      ctx.miterLimit = stroke.miterLimit;
      ctx.strokeText(content, 0, 0);
    }
  }

  private paintStyle(ctx: CanvasRenderingContext2D, paint: Paint): string | CanvasGradient {
    if (paint.type === "solid") return cssColor(paint);
    const fallback = paint.stops[0]?.color;
    const solid = fallback ? cssColor(fallback) : cssColor({ type: "solid", r: 0, g: 0, b: 0, a: 1 });
    if (paint.type === "linear" && typeof ctx.createLinearGradient === "function") {
      const gradient = ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2);
      for (const stop of paint.stops) gradient.addColorStop(Math.min(1, Math.max(0, stop.offset)), cssColor(stop.color));
      return gradient;
    }
    if (paint.type === "radial" && typeof ctx.createRadialGradient === "function") {
      const gradient = ctx.createRadialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r);
      for (const stop of paint.stops) gradient.addColorStop(Math.min(1, Math.max(0, stop.offset)), cssColor(stop.color));
      return gradient;
    }
    return solid;
  }

  private drawImage(ctx: CanvasRenderingContext2D, item: ResolvedDrawItem): void {
    if (item.geometry.kind !== "image" || typeof ctx.drawImage !== "function") return;
    const image = this.imageFor(item.geometry.href);
    if (!image || image.naturalWidth <= 0) return;
    ctx.drawImage(image, 0, 0, item.geometry.size.x, item.geometry.size.y);
  }

  private imageFor(href: string): HTMLImageElement | undefined {
    if (!href || typeof Image === "undefined") return undefined;
    const cached = this.images.get(href);
    if (cached) return cached;
    const image = new Image();
    image.src = href;
    this.images.set(href, image);
    this.telemetry?.gauge("renderer.image_cache_entries", this.images.size);
    return image;
  }

  private drawTree(ctx: CanvasRenderingContext2D, device: Mat3, node: RenderTreeNode): void {
    if (node.kind === "leaf") {
      this.drawItem(ctx, device, node.item);
      return;
    }
    if (node.matte) {
      this.drawMatted(ctx, device, node, node.matte);
      return;
    }
    this.drawScope(ctx, device, node);
  }

  private drawScope(ctx: CanvasRenderingContext2D, device: Mat3, node: Extract<RenderTreeNode, { kind: "scope" }>): void {
    ctx.save();
    if (node.blend && !node.matte) ctx.globalCompositeOperation = node.blend;
    if (node.effect?.type === "blur") ctx.filter = `blur(${node.effect.radius}px)`;
    if (node.effect?.type === "shadow") {
      ctx.shadowOffsetX = node.effect.dx;
      ctx.shadowOffsetY = node.effect.dy;
      ctx.shadowBlur = node.effect.blur;
      ctx.shadowColor = node.effect.color;
    }
    if (node.clip) this.applyClip(ctx, device, node.clip);
    const previous = this.scopeAlpha;
    if (node.isolated && node.id !== "root") this.scopeAlpha *= node.opacity;
    for (const child of node.children) this.drawTree(ctx, device, child);
    this.scopeAlpha = previous;
    ctx.restore();
  }

  /**
   * Paint the scope into a buffer, keep pixels only where the matte source's
   * alpha is, then blit. A missing buffer withholds the scope so it is not
   * drawn unmasked. Fresh buffers keep nested mattes from clobbering each other.
   */
  private drawMatted(
    ctx: CanvasRenderingContext2D,
    device: Mat3,
    node: Extract<RenderTreeNode, { kind: "scope" }>,
    coverage: RenderTreeNode,
  ): void {
    const content = this.createLayer();
    const matte = this.createLayer();
    if (!content || !matte) return;
    this.drawScope(content.ctx, device, node);
    const saved = this.scopeAlpha;
    this.scopeAlpha = 1;
    this.drawTree(matte.ctx, device, coverage);
    this.scopeAlpha = saved;
    content.ctx.save();
    content.ctx.setTransform(1, 0, 0, 1, 0, 0);
    content.ctx.globalAlpha = 1;
    content.ctx.globalCompositeOperation = "destination-in";
    content.ctx.filter = "none";
    content.ctx.shadowColor = "transparent";
    content.ctx.drawImage(matte.canvas, 0, 0);
    content.ctx.restore();
    ctx.save();
    if (node.blend) ctx.globalCompositeOperation = node.blend;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(content.canvas, 0, 0);
    ctx.restore();
  }

  private createLayer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const created = this.canvas.ownerDocument?.createElement?.("canvas");
    if (!created || width <= 0 || height <= 0) return undefined;
    const canvas = created as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    const layer = canvas.getContext("2d");
    if (!layer) return undefined;
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalAlpha = 1;
    layer.globalCompositeOperation = "source-over";
    layer.clearRect(0, 0, width, height);
    return { canvas, ctx: layer };
  }

  private applyClip(
    ctx: CanvasRenderingContext2D,
    device: Mat3,
    clip: { geometry: ResolvedGeometry; logicalMatrix: Mat3 },
  ): void {
    const matrix = multiplyMat3(device, clip.logicalMatrix);
    ctx.setTransform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
    const rule = clip.geometry.kind === "path" ? clip.geometry.fillRule : "nonzero";
    const path = this.compiledPath(clip.geometry);
    if (path) ctx.clip(path, rule);
    else {
      ctx.beginPath();
      traceGeometry(clip.geometry, ctx);
      ctx.clip(rule);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private compiledPath(geometry: ResolvedGeometry): Path2D | undefined {
    if (geometry.kind === "text" || typeof Path2D === "undefined") return undefined;
    const cached = this.paths.get(geometry);
    if (cached) return cached;
    const path = new Path2D();
    traceGeometry(geometry, path as unknown as PathSink);
    this.paths.set(geometry, path);
    return path;
  }
}

function treeUsesScopes(node: RenderTreeNode): boolean {
  if (node.kind === "leaf") return false;
  if (node.id !== "root" || node.isolated || node.blend || node.effect || node.clip || node.matte) return true;
  return node.children.some((child) => treeUsesScopes(child));
}
