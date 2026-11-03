import {
  containFit,
  localMatrix,
  logicalMatrix,
  multiplyMat3,
  type InteractionTarget,
  type Mat3,
  type NodeDefinition,
  type SceneIR,
  type Viewport,
  type PathCommand,
  type RenderTreeNode,
  type ResolvedDrawItem,
  type ResolvedFrame,
  type ResolvedGeometry,
  type Vec2,
} from "@gvr/schema";
import { buildResolvedFrame } from "./frame";
import { sampleScene, type SampledScene } from "./sample";
import { projectSpatialFrame, surfaceDragDelta } from "./spatial";
import { layersFromScene } from "./spatial-scene";

/**
 * E007 native input prototype. See docs/decisions/engine/native-input.md.
 *
 * Hit space: authored logical viewport coordinates (the space draw-item
 * `logicalMatrix` maps into). Hosts convert CSS/device pixels by undoing their
 * letterbox before calling in. Hit regions are painted geometry (fill interior
 * when filled, stroke band when stroked), never bounding boxes, and the topmost
 * painted item occludes everything beneath it.
 *
 * No MotionScript / Scene IR syntax is claimed here; language wiring is a
 * separate versioned implementation item.
 */

// ---------------------------------------------------------------------------
// Hit testing

export interface TextMetrics {
  width: number;
  ascent: number;
  descent: number;
}

export interface HitTestOptions {
  /** Extra stroke/line tolerance in logical viewport units (default 0). */
  strokeSlop?: number;
  /** Items at or below this resolved opacity are not hittable (default 0). */
  minOpacity?: number;
  /** Host text measurement. Without it a conservative em-box estimate is used. */
  measureText?: (content: string, font: { family: string; size: number; weight: number; style: string }) => TextMetrics;
  /** Node ids that paint but never take or block pointer input. */
  passThrough?: ReadonlySet<string>;
}

export interface HitResult {
  nodeId: string;
  /** Paint index in frame.drawItems (higher is on top). */
  paintIndex: number;
  /** Point in the item's local geometry space. */
  local: Vec2;
  part: "fill" | "stroke";
}

/** All painted items under the point, topmost first. */
export function hitTestAll(frame: ResolvedFrame, point: Vec2, options: HitTestOptions = {}): HitResult[] {
  if (frame.renderTree && treeHasClip(frame.renderTree)) {
    const out: HitResult[] = [];
    collectHits(frame, frame.renderTree, point, options, out);
    return out;
  }
  const out: HitResult[] = [];
  for (let index = frame.drawItems.length - 1; index >= 0; index -= 1) {
    const item = frame.drawItems[index]!;
    if (options.passThrough?.has(item.nodeId)) continue;
    const hit = hitItem(item, point, options);
    if (hit) out.push({ nodeId: item.nodeId, paintIndex: index, local: hit.local, part: hit.part });
  }
  return out;
}

/** Topmost painted item under the point, or undefined. */
export function hitTest(frame: ResolvedFrame, point: Vec2, options: HitTestOptions = {}): HitResult | undefined {
  if (frame.renderTree && treeHasClip(frame.renderTree)) {
    return hitTestTree(frame, frame.renderTree, point, options);
  }
  for (let index = frame.drawItems.length - 1; index >= 0; index -= 1) {
    const item = frame.drawItems[index]!;
    if (options.passThrough?.has(item.nodeId)) continue;
    const hit = hitItem(item, point, options);
    if (hit) return { nodeId: item.nodeId, paintIndex: index, local: hit.local, part: hit.part };
  }
  return undefined;
}

function treeHasClip(node: RenderTreeNode): boolean {
  if (node.kind === "leaf") return false;
  if (node.clip || node.matte) return true;
  return node.children.some((child) => treeHasClip(child));
}

function pointInClip(clip: { geometry: ResolvedGeometry; logicalMatrix: Mat3 }, point: Vec2): boolean {
  const inverse = invert(clip.logicalMatrix);
  if (!inverse) return false;
  const local = apply(inverse, point);
  return containsGeometry(clip.geometry, local, {});
}

function hitTestTree(
  frame: ResolvedFrame,
  node: RenderTreeNode,
  point: Vec2,
  options: HitTestOptions,
): HitResult | undefined {
  if (node.kind === "leaf") {
    if (options.passThrough?.has(node.item.nodeId)) return undefined;
    const hit = hitItem(node.item, point, options);
    if (!hit) return undefined;
    const paintIndex = frame.drawItems.indexOf(node.item);
    return { nodeId: node.item.nodeId, paintIndex: paintIndex < 0 ? 0 : paintIndex, local: hit.local, part: hit.part };
  }
  if (node.clip && !pointInClip(node.clip, point)) return undefined;
  if (node.matte && !paintsAt(node.matte, point)) return undefined;
  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    const hit = hitTestTree(frame, node.children[index]!, point, options);
    if (hit) return hit;
  }
  return undefined;
}

function collectHits(
  frame: ResolvedFrame,
  node: RenderTreeNode,
  point: Vec2,
  options: HitTestOptions,
  out: HitResult[],
): void {
  if (node.kind === "leaf") {
    if (options.passThrough?.has(node.item.nodeId)) return;
    const hit = hitItem(node.item, point, options);
    if (!hit) return;
    const paintIndex = frame.drawItems.indexOf(node.item);
    out.push({ nodeId: node.item.nodeId, paintIndex: paintIndex < 0 ? 0 : paintIndex, local: hit.local, part: hit.part });
    return;
  }
  if (node.clip && !pointInClip(node.clip, point)) return;
  if (node.matte && !paintsAt(node.matte, point)) return;
  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    collectHits(frame, node.children[index]!, point, options, out);
  }
}

/** Painted-geometry coverage of a matte source. Partial alpha still counts as a hit. */
function paintsAt(node: RenderTreeNode, point: Vec2): boolean {
  if (node.kind === "leaf") return hitItem(node.item, point, {}) !== undefined;
  if (node.clip && !pointInClip(node.clip, point)) return false;
  if (node.matte && !paintsAt(node.matte, point)) return false;
  return node.children.some((child) => paintsAt(child, point));
}

function invert(m: Mat3): Mat3 | undefined {
  const [a, b, , c, d, , e, f] = m;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return undefined;
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  return [ia, ib, 0, ic, id, 0, -(ia * e + ic * f), -(ib * e + id * f), 1];
}

function apply(m: Mat3, p: Vec2): Vec2 {
  return { x: m[0] * p.x + m[3] * p.y + m[6], y: m[1] * p.x + m[4] * p.y + m[7] };
}

function hitItem(
  item: ResolvedDrawItem,
  point: Vec2,
  options: HitTestOptions,
): { local: Vec2; part: "fill" | "stroke" } | undefined {
  if (!(item.opacity > (options.minOpacity ?? 0))) return undefined;
  const inverse = invert(item.logicalMatrix);
  if (!inverse) return undefined;
  const local = apply(inverse, point);
  // Viewport slop in local units, using the geometric mean scale of the item.
  const scale = Math.sqrt(Math.abs(item.logicalMatrix[0] * item.logicalMatrix[4] - item.logicalMatrix[1] * item.logicalMatrix[3]));
  const slop = (options.strokeSlop ?? 0) / (scale || 1);
  const { geometry, appearance } = item;
  const fillable = appearance.fill !== undefined || geometry.kind === "image" || geometry.kind === "text";
  if (fillable && containsFill(item, local, options)) return { local, part: "fill" };
  const stroke = appearance.stroke;
  if (stroke || geometry.kind === "line") {
    const half = (stroke?.width ?? 0) / 2 + slop;
    if (half > 0 && strokeDistance(item, local) <= half) return { local, part: "stroke" };
  }
  return undefined;
}

function containsFill(item: ResolvedDrawItem, p: Vec2, options: HitTestOptions): boolean {
  return containsGeometry(item.geometry, p, options);
}

function containsGeometry(g: ResolvedGeometry, p: Vec2, options: HitTestOptions): boolean {
  switch (g.kind) {
    case "rectangle":
      return insideRoundRect(p, g.size.x, g.size.y, g.cornerRadius ?? 0);
    case "image":
      return p.x >= 0 && p.y >= 0 && p.x <= g.size.x && p.y <= g.size.y;
    case "circle":
      return p.x * p.x + p.y * p.y <= g.radius * g.radius;
    case "ellipse": {
      const rx = g.size.x / 2;
      const ry = g.size.y / 2;
      if (!(rx > 0 && ry > 0)) return false;
      return (p.x * p.x) / (rx * rx) + (p.y * p.y) / (ry * ry) <= 1;
    }
    case "line":
      return false;
    case "polygon":
      return winding([g.points], p, "nonzero");
    case "path":
      return winding(flattenPath(g.commands).filter((ring) => ring.length > 2), p, g.fillRule);
    case "text": {
      const metrics = options.measureText?.(g.content, g.font) ?? {
        // Conservative em-box estimate when the host does not measure text.
        width: g.font.size * 0.6 * [...g.content].length,
        ascent: g.font.size * 0.8,
        descent: g.font.size * 0.2,
      };
      const left = g.align === "left" ? 0 : g.align === "center" ? -metrics.width / 2 : -metrics.width;
      const height = metrics.ascent + metrics.descent;
      const top =
        g.baseline === "alphabetic"
          ? -metrics.ascent
          : g.baseline === "top"
            ? 0
            : g.baseline === "bottom"
              ? -height
              : -height / 2;
      return p.x >= left && p.x <= left + metrics.width && p.y >= top && p.y <= top + height;
    }
  }
}

function insideRoundRect(p: Vec2, w: number, h: number, radius: number): boolean {
  if (!(p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h)) return false;
  const r = Math.min(Math.max(radius, 0), w / 2, h / 2);
  if (r <= 0) return true;
  const cx = p.x < r ? r : p.x > w - r ? w - r : p.x;
  const cy = p.y < r ? r : p.y > h - r ? h - r : p.y;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Curves are flattened at a fixed 16 segments; hit precision is bounded, not exact. */
function flattenPath(commands: readonly PathCommand[]): Vec2[][] {
  const rings: Vec2[][] = [];
  let ring: Vec2[] = [];
  let cursor: Vec2 = { x: 0, y: 0 };
  let start: Vec2 = cursor;
  const steps = 16;
  for (const command of commands) {
    switch (command.cmd) {
      case "M":
        if (ring.length) rings.push(ring);
        cursor = { x: command.x, y: command.y };
        start = cursor;
        ring = [cursor];
        break;
      case "L":
        cursor = { x: command.x, y: command.y };
        ring.push(cursor);
        break;
      case "Q": {
        const p0 = cursor;
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          const u = 1 - t;
          ring.push({
            x: u * u * p0.x + 2 * u * t * command.cx + t * t * command.x,
            y: u * u * p0.y + 2 * u * t * command.cy + t * t * command.y,
          });
        }
        cursor = { x: command.x, y: command.y };
        break;
      }
      case "C": {
        const p0 = cursor;
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          const u = 1 - t;
          ring.push({
            x: u * u * u * p0.x + 3 * u * u * t * command.c1x + 3 * u * t * t * command.c2x + t * t * t * command.x,
            y: u * u * u * p0.y + 3 * u * u * t * command.c1y + 3 * u * t * t * command.c2y + t * t * t * command.y,
          });
        }
        cursor = { x: command.x, y: command.y };
        break;
      }
      case "Z":
        if (ring.length) {
          ring.push(start);
          rings.push(ring);
        }
        ring = [start];
        cursor = start;
        break;
    }
  }
  if (ring.length > 1) rings.push(ring);
  return rings;
}

/** Fill containment: open subpaths fill as implicitly closed, like canvas. */
function winding(rings: readonly Vec2[][], p: Vec2, rule: "nonzero" | "evenodd"): boolean {
  let wind = 0;
  let crossings = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      if (a.y <= p.y) {
        if (b.y > p.y && cross(a, b, p) > 0) {
          wind += 1;
          crossings += 1;
        }
      } else if (b.y <= p.y && cross(a, b, p) < 0) {
        wind -= 1;
        crossings += 1;
      }
    }
  }
  return rule === "evenodd" ? crossings % 2 === 1 : wind !== 0;
}

function cross(a: Vec2, b: Vec2, p: Vec2): number {
  return (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
}

function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function polylineDistance(p: Vec2, points: readonly Vec2[], closed: boolean): number {
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i += 1) best = Math.min(best, segmentDistance(p, points[i]!, points[i + 1]!));
  if (closed && points.length > 2) best = Math.min(best, segmentDistance(p, points[points.length - 1]!, points[0]!));
  return best;
}

/** Distance to the stroked centreline. Caps/joins are approximated by round geometry. */
function strokeDistance(item: ResolvedDrawItem, p: Vec2): number {
  const g = item.geometry;
  switch (g.kind) {
    case "rectangle":
    case "image": {
      const { x: w, y: h } = g.size;
      return polylineDistance(p, [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], true);
    }
    case "circle":
      return Math.abs(Math.hypot(p.x, p.y) - g.radius);
    case "ellipse": {
      const ring: Vec2[] = [];
      for (let i = 0; i < 64; i += 1) {
        const a = (i / 64) * Math.PI * 2;
        ring.push({ x: (Math.cos(a) * g.size.x) / 2, y: (Math.sin(a) * g.size.y) / 2 });
      }
      return polylineDistance(p, ring, true);
    }
    case "line":
      return segmentDistance(p, g.from, g.to);
    case "polygon":
      return polylineDistance(p, g.points, true);
    case "path":
      return Math.min(Infinity, ...flattenPath(g.commands).map((ring) => polylineDistance(p, ring, false)));
    case "text":
      return Infinity;
  }
}

// ---------------------------------------------------------------------------
// Input session: targets, actions, routing, replay

/** Channels input may write in this prototype (sampled transform/opacity). */
export type InputChannel =
  | "transform.position.x"
  | "transform.position.y"
  | "transform.rotation"
  | "transform.scale.x"
  | "transform.scale.y"
  | "opacity";

export const INPUT_CHANNELS: readonly InputChannel[] = [
  "transform.position.x",
  "transform.position.y",
  "transform.rotation",
  "transform.scale.x",
  "transform.scale.y",
  "opacity",
];

export type InputTrigger = "click" | "activate" | "drag" | "wheel" | "key";

/** Bounded state actions. No arbitrary code, loops or cross-entity scripts. */
export type InputAction =
  | { kind: "set"; channel: InputChannel; value: number }
  | { kind: "toggle"; channel: InputChannel; values: readonly [number, number] }
  | { kind: "step"; channel: InputChannel; delta: number; min: number; max: number }
  | {
      kind: "dragTranslate";
      /** Bounds in the target's parent space. */
      min: Vec2;
      max: Vec2;
    };

export interface InputBinding {
  on: InputTrigger;
  /** For `key`: KeyboardEvent.key value. */
  key?: string;
  /** Entity whose channel is written; defaults to the target. */
  entityId?: string;
  action: InputAction;
}

export interface InputTarget {
  entityId: string;
  /** "none" paints without taking or blocking pointer input. */
  pointer?: "auto" | "none";
  focusable?: boolean;
  /** Focus order; lower first, ties by registration order. Default 0. */
  tabIndex?: number;
  bindings?: readonly InputBinding[];
}

export type InputEvent =
  | { type: "pointerdown"; sceneTimeMs: number; pointerId: number; x: number; y: number; button?: number }
  | { type: "pointermove"; sceneTimeMs: number; pointerId: number; x: number; y: number }
  | { type: "pointerup"; sceneTimeMs: number; pointerId: number; x: number; y: number; button?: number }
  | { type: "pointercancel"; sceneTimeMs: number; pointerId: number }
  | { type: "wheel"; sceneTimeMs: number; x: number; y: number; deltaY: number; ctrlKey?: boolean }
  | { type: "keydown"; sceneTimeMs: number; key: string; shiftKey?: boolean }
  | { type: "focus"; sceneTimeMs: number; entityId: string | null };

export type InputSignal =
  | { type: "enter" | "leave"; entityId: string; reason?: "removed" | "moved" }
  | { type: "focus" | "blur"; entityId: string; reason?: "removed" | "pointer" | "keyboard" | "host" }
  | { type: "down" | "up" | "click" | "activate"; entityId: string; pointerId?: number }
  | { type: "dragstart" | "drag" | "dragend"; entityId: string; delta: Vec2 }
  | { type: "capturelost"; entityId: string; reason: "removed" | "cancel" }
  | { type: "wheel" | "zoom"; entityId: string; amount: number }
  | { type: "key"; entityId: string; key: string }
  | { type: "write"; entityId: string; channel: InputChannel; value: number }
  | { type: "rejected"; entityId: string; channel: InputChannel; code: "INPUT_NOT_OWNER" };

export interface InputStep {
  seq: number;
  event: InputEvent;
  signals: InputSignal[];
}

/** Returns true when an input writer owns (entity, channel) at sceneTimeMs. */
export type InputOwnership = (entityId: string, channel: InputChannel, sceneTimeMs: number) => boolean;

/** Ownership adapter over EntityRevisionStore-style compact context. */
export function ownershipFromGrants(
  grantsFor: (entityId: string) => readonly { channel: string; writerClass: string; fromMs: number; untilMs?: number }[],
): InputOwnership {
  return (entityId, channel, t) =>
    grantsFor(entityId).some(
      (grant) =>
        grant.writerClass === "input" &&
        grant.channel === channel &&
        grant.fromMs <= t &&
        (grant.untilMs === undefined || t < grant.untilMs),
    );
}

export interface InputSessionOptions {
  targets: readonly InputTarget[];
  ownership: InputOwnership;
  /** Initial input-owned channel values (key `${entityId}:${channel}`). */
  initial?: Readonly<Record<string, number>>;
  /** Logical units a captured pointer moves before a click becomes a drag. Default 4. */
  dragThreshold?: number;
  /** Bound on retained replay log entries (default 4096); older entries drop first. */
  maxLog?: number;
  hit?: Omit<HitTestOptions, "passThrough">;
  /**
   * Parent-space → logical viewport matrix for an entity at a scene time.
   * When supplied, dragTranslate converts viewport deltas into parent space;
   * otherwise deltas apply directly (identity parent).
   */
  dragSpace?: (entityId: string, sceneTimeMs: number) => Mat3 | undefined;
  /**
   * Pointer-aware plane drag for projected spatial surfaces (space.planar25d).
   * When it returns a delta, dragTranslate uses it instead of the affine
   * dragSpace Jacobian (which is wrong under perspective). Arguments are the
   * previous and current logical pointer positions.
   */
  dragPlaneDelta?: (entityId: string, from: Vec2, to: Vec2, sceneTimeMs: number) => Vec2 | undefined;
  /**
   * Tab/Shift+Tab wrap around the focus order (default true). Embedded hosts
   * pass false so focus leaves the scene at either end instead of trapping it.
   */
  wrapFocus?: boolean;
}

interface Capture {
  pointerId: number;
  entityId: string;
  origin: Vec2;
  last: Vec2;
  dragging: boolean;
}

const WHEEL_ZOOM_RATE = 0.002;

/**
 * Deterministic input router. `process(event, frame)` takes the frame resolved
 * at `event.sceneTimeMs`; output depends only on the event sequence, frames and
 * options, so replaying a log over equal frames reproduces signals and state.
 */
export class InputSession {
  private readonly targets = new Map<string, InputTarget>();
  private readonly order: string[] = [];
  private readonly passThrough = new Set<string>();
  private values = new Map<string, number>();
  private hovered: string | undefined;
  private focused: string | undefined;
  private capture: Capture | undefined;
  private seq = 0;
  private readonly log: InputStep[] = [];
  private disposed = false;

  constructor(private readonly options: InputSessionOptions) {
    for (const target of options.targets) {
      if (this.targets.has(target.entityId)) throw new Error(`Duplicate input target ${target.entityId}.`);
      this.targets.set(target.entityId, target);
      this.order.push(target.entityId);
      if (target.pointer === "none") this.passThrough.add(target.entityId);
    }
    for (const [key, value] of Object.entries(options.initial ?? {})) this.values.set(key, value);
  }

  get hoveredEntity(): string | undefined {
    return this.hovered;
  }

  get focusedEntity(): string | undefined {
    return this.focused;
  }

  get capturedEntity(): string | undefined {
    return this.capture?.entityId;
  }

  /** Immutable copy of input-owned channel values. */
  state(): Record<string, number> {
    return Object.fromEntries([...this.values.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }

  /** Retained replay log (bounded). */
  history(): readonly InputStep[] {
    return this.log.map((step) => ({ ...step, signals: [...step.signals] }));
  }

  dispose(): void {
    this.disposed = true;
    this.capture = undefined;
    this.hovered = undefined;
    this.focused = undefined;
  }

  process(event: InputEvent, frame: ResolvedFrame): InputSignal[] {
    if (this.disposed) throw new Error("InputSession is disposed.");
    if (frame.sceneTimeMs !== event.sceneTimeMs) {
      throw new Error(`Frame at ${frame.sceneTimeMs}ms does not match event at ${event.sceneTimeMs}ms.`);
    }
    const signals: InputSignal[] = [];
    this.reconcileLifetime(frame, signals);
    switch (event.type) {
      case "pointermove":
        this.pointerMove(event, frame, signals);
        break;
      case "pointerdown":
        this.pointerDown(event, frame, signals);
        break;
      case "pointerup":
        this.pointerUp(event, frame, signals);
        break;
      case "pointercancel":
        if (this.capture && this.capture.pointerId === event.pointerId) {
          signals.push({ type: "capturelost", entityId: this.capture.entityId, reason: "cancel" });
          this.capture = undefined;
        }
        break;
      case "wheel":
        this.wheel(event, frame, signals);
        break;
      case "keydown":
        this.keyDown(event, frame, signals);
        break;
      case "focus":
        this.setFocus(event.entityId ?? undefined, "host", frame, signals);
        break;
    }
    this.seq += 1;
    this.log.push({ seq: this.seq, event: { ...event }, signals });
    const max = this.options.maxLog ?? 4096;
    if (this.log.length > max) this.log.splice(0, this.log.length - max);
    return [...signals];
  }

  /** Apply input-owned channel values over a sampled scene (copying touched nodes). */
  applyTo(sampled: SampledScene, sceneTimeMs: number): SampledScene {
    if (this.values.size === 0) return sampled;
    const nodes = sampled.nodes.map((node) => {
      let copy: NodeDefinition | undefined;
      for (const channel of INPUT_CHANNELS) {
        const value = this.values.get(`${node.id}:${channel}`);
        if (value === undefined || !this.options.ownership(node.id, channel, sceneTimeMs)) continue;
        copy ??= { ...node, transform: { ...node.transform, position: { ...node.transform.position }, scale: { ...node.transform.scale } } } as NodeDefinition;
        writeChannel(copy, channel, value);
      }
      return copy ?? node;
    });
    return { ...sampled, nodes };
  }

  // -- routing ------------------------------------------------------------

  /** Nearest registered pointer target for a hit node (structural id ancestry). */
  private targetFor(nodeId: string | undefined): string | undefined {
    if (nodeId === undefined) return undefined;
    let id: string = nodeId;
    for (;;) {
      const target = this.targets.get(id);
      if (target && target.pointer !== "none") return id;
      const cut = id.lastIndexOf(".");
      if (cut < 0) return undefined;
      id = id.slice(0, cut);
    }
  }

  private pick(frame: ResolvedFrame, point: Vec2): string | undefined {
    const hit = hitTest(frame, point, { ...this.options.hit, passThrough: this.passThrough });
    return this.targetFor(hit?.nodeId);
  }

  private reconcileLifetime(frame: ResolvedFrame, signals: InputSignal[]): void {
    const live = (id: string) =>
      frame.drawItems.some((item) => item.nodeId === id || item.nodeId.startsWith(`${id}.`));
    if (this.capture && !live(this.capture.entityId)) {
      signals.push({ type: "capturelost", entityId: this.capture.entityId, reason: "removed" });
      this.capture = undefined;
    }
    if (this.hovered && !live(this.hovered)) {
      signals.push({ type: "leave", entityId: this.hovered, reason: "removed" });
      this.hovered = undefined;
    }
    if (this.focused && !live(this.focused)) {
      signals.push({ type: "blur", entityId: this.focused, reason: "removed" });
      this.focused = undefined;
    }
  }

  private updateHover(next: string | undefined, signals: InputSignal[]): void {
    if (next === this.hovered) return;
    if (this.hovered) signals.push({ type: "leave", entityId: this.hovered, reason: "moved" });
    this.hovered = next;
    if (next) signals.push({ type: "enter", entityId: next });
  }

  private pointerMove(
    event: Extract<InputEvent, { type: "pointermove" }>,
    frame: ResolvedFrame,
    signals: InputSignal[],
  ): void {
    const point = { x: event.x, y: event.y };
    const capture = this.capture;
    // While captured, hover stays pinned to the capture target; it is recomputed on release.
    if (!capture || capture.pointerId !== event.pointerId) {
      if (!capture) this.updateHover(this.pick(frame, point), signals);
      return;
    }
    const from = { ...capture.last };
    const delta = { x: point.x - from.x, y: point.y - from.y };
    if (!capture.dragging) {
      const moved = Math.hypot(point.x - capture.origin.x, point.y - capture.origin.y);
      if (moved < (this.options.dragThreshold ?? 4)) return;
      capture.dragging = true;
      const origin = { ...capture.origin };
      const total = { x: point.x - origin.x, y: point.y - origin.y };
      signals.push({ type: "dragstart", entityId: capture.entityId, delta: { x: 0, y: 0 } });
      capture.last = point;
      signals.push({ type: "drag", entityId: capture.entityId, delta: total });
      this.runBindings(capture.entityId, "drag", { delta: total, from: origin, to: point }, event.sceneTimeMs, signals);
      return;
    }
    capture.last = point;
    signals.push({ type: "drag", entityId: capture.entityId, delta });
    this.runBindings(capture.entityId, "drag", { delta, from, to: point }, event.sceneTimeMs, signals);
  }

  private pointerDown(
    event: Extract<InputEvent, { type: "pointerdown" }>,
    frame: ResolvedFrame,
    signals: InputSignal[],
  ): void {
    if (this.capture) return; // single active pointer capture in this prototype
    const point = { x: event.x, y: event.y };
    const target = this.pick(frame, point);
    this.updateHover(target, signals);
    if (!target) {
      this.setFocus(undefined, "pointer", frame, signals);
      return;
    }
    // Pressing a non-focusable target clears focus, like pressing empty space.
    this.setFocus(this.targets.get(target)?.focusable ? target : undefined, "pointer", frame, signals);
    signals.push({ type: "down", entityId: target, pointerId: event.pointerId });
    this.capture = { pointerId: event.pointerId, entityId: target, origin: point, last: point, dragging: false };
  }

  private pointerUp(
    event: Extract<InputEvent, { type: "pointerup" }>,
    frame: ResolvedFrame,
    signals: InputSignal[],
  ): void {
    const capture = this.capture;
    if (!capture || capture.pointerId !== event.pointerId) return;
    this.capture = undefined;
    const point = { x: event.x, y: event.y };
    signals.push({ type: "up", entityId: capture.entityId, pointerId: event.pointerId });
    if (capture.dragging) {
      signals.push({
        type: "dragend",
        entityId: capture.entityId,
        delta: { x: point.x - capture.origin.x, y: point.y - capture.origin.y },
      });
    } else if (this.pick(frame, point) === capture.entityId) {
      signals.push({ type: "click", entityId: capture.entityId, pointerId: event.pointerId });
      this.runBindings(capture.entityId, "click", {}, event.sceneTimeMs, signals);
    }
    this.updateHover(this.pick(frame, point), signals);
  }

  private wheel(event: Extract<InputEvent, { type: "wheel" }>, frame: ResolvedFrame, signals: InputSignal[]): void {
    const target = this.pick(frame, { x: event.x, y: event.y });
    if (!target) return;
    if (event.ctrlKey) {
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_RATE);
      signals.push({ type: "zoom", entityId: target, amount: factor });
    } else {
      signals.push({ type: "wheel", entityId: target, amount: event.deltaY });
    }
    // Wheel bindings step by sign: one notch per event regardless of device delta.
    this.runBindings(target, "wheel", { sign: Math.sign(-event.deltaY) }, event.sceneTimeMs, signals);
  }

  private keyDown(event: Extract<InputEvent, { type: "keydown" }>, frame: ResolvedFrame, signals: InputSignal[]): void {
    if (event.key === "Tab") {
      const order = this.focusOrder(frame);
      if (order.length === 0) return;
      const index = this.focused ? order.indexOf(this.focused) : -1;
      const step = event.shiftKey ? -1 : 1;
      if (this.options.wrapFocus === false && index >= 0 && (index + step < 0 || index + step >= order.length)) {
        this.setFocus(undefined, "keyboard", frame, signals);
        return;
      }
      const next =
        index < 0
          ? order[event.shiftKey ? order.length - 1 : 0]
          : order[(index + (event.shiftKey ? order.length - 1 : 1)) % order.length];
      this.setFocus(next, "keyboard", frame, signals);
      return;
    }
    const focused = this.focused;
    if (!focused) return;
    if (event.key === "Enter" || event.key === " ") {
      signals.push({ type: "activate", entityId: focused });
      // Keyboard activation runs the same bindings as a pointer click.
      this.runBindings(focused, "activate", {}, event.sceneTimeMs, signals);
      this.runBindings(focused, "click", {}, event.sceneTimeMs, signals);
      return;
    }
    signals.push({ type: "key", entityId: focused, key: event.key });
    this.runBindings(focused, "key", { key: event.key }, event.sceneTimeMs, signals);
  }

  private focusOrder(frame: ResolvedFrame): string[] {
    const live = (id: string) =>
      frame.drawItems.some((item) => item.nodeId === id || item.nodeId.startsWith(`${id}.`));
    return this.order
      .map((id, index) => ({ id, index, target: this.targets.get(id)! }))
      .filter(({ id, target }) => target.focusable && live(id))
      .sort((a, b) => (a.target.tabIndex ?? 0) - (b.target.tabIndex ?? 0) || a.index - b.index)
      .map(({ id }) => id);
  }

  private setFocus(
    next: string | undefined,
    reason: "pointer" | "keyboard" | "host",
    frame: ResolvedFrame,
    signals: InputSignal[],
  ): void {
    if (next !== undefined && !this.focusOrder(frame).includes(next)) return;
    if (next === this.focused) return;
    if (this.focused) signals.push({ type: "blur", entityId: this.focused, reason });
    this.focused = next;
    if (next) signals.push({ type: "focus", entityId: next, reason });
  }

  private runBindings(
    targetId: string,
    trigger: InputTrigger,
    detail: { delta?: Vec2; from?: Vec2; to?: Vec2; sign?: number; key?: string },
    sceneTimeMs: number,
    signals: InputSignal[],
  ): void {
    const target = this.targets.get(targetId);
    for (const binding of target?.bindings ?? []) {
      if (binding.on !== trigger) continue;
      if (trigger === "key" && binding.key !== detail.key) continue;
      const entityId = binding.entityId ?? targetId;
      const action = binding.action;
      switch (action.kind) {
        case "set":
          this.write(entityId, action.channel, action.value, sceneTimeMs, signals);
          break;
        case "toggle": {
          const current = this.values.get(`${entityId}:${action.channel}`);
          const next = current === action.values[0] ? action.values[1] : action.values[0];
          this.write(entityId, action.channel, next, sceneTimeMs, signals);
          break;
        }
        case "step": {
          const current = this.values.get(`${entityId}:${action.channel}`) ?? action.min;
          const amount = trigger === "wheel" ? action.delta * (detail.sign ?? 0) : action.delta;
          this.write(entityId, action.channel, clamp(current + amount, action.min, action.max), sceneTimeMs, signals);
          break;
        }
        case "dragTranslate": {
          if (!detail.delta) break;
          const x = this.values.get(`${entityId}:transform.position.x`);
          const y = this.values.get(`${entityId}:transform.position.y`);
          if (x === undefined || y === undefined) break;
          // All-or-nothing: both axes must be input-owned before either moves.
          const t = sceneTimeMs;
          if (!this.owns(entityId, "transform.position.x", t, signals) || !this.owns(entityId, "transform.position.y", t, signals)) break;
          const delta = this.translateDelta(entityId, detail, t);
          if (!delta) break;
          this.write(entityId, "transform.position.x", clamp(x + delta.x, action.min.x, action.max.x), t, signals);
          this.write(entityId, "transform.position.y", clamp(y + delta.y, action.min.y, action.max.y), t, signals);
          break;
        }
      }
    }
  }

  /** Prefer exact ray–plane deltas when a spatial hook is provided; else affine parent space. */
  private translateDelta(
    entityId: string,
    detail: { delta?: Vec2; from?: Vec2; to?: Vec2 },
    sceneTimeMs: number,
  ): Vec2 | undefined {
    if (detail.from && detail.to && this.options.dragPlaneDelta) {
      const plane = this.options.dragPlaneDelta(entityId, detail.from, detail.to, sceneTimeMs);
      if (plane) return plane;
    }
    return this.parentDelta(entityId, detail.delta!, sceneTimeMs);
  }

  /** Viewport delta → parent-space delta via the inverse linear part of the parent matrix. */
  private parentDelta(entityId: string, delta: Vec2, sceneTimeMs: number): Vec2 | undefined {
    const space = this.options.dragSpace?.(entityId, sceneTimeMs);
    if (!space) return delta;
    const inverse = invert(space);
    if (!inverse) return undefined;
    return { x: inverse[0] * delta.x + inverse[3] * delta.y, y: inverse[1] * delta.x + inverse[4] * delta.y };
  }

  private owns(entityId: string, channel: InputChannel, sceneTimeMs: number, signals: InputSignal[]): boolean {
    if (this.options.ownership(entityId, channel, sceneTimeMs)) return true;
    signals.push({ type: "rejected", entityId, channel, code: "INPUT_NOT_OWNER" });
    return false;
  }

  private write(entityId: string, channel: InputChannel, value: number, sceneTimeMs: number, signals: InputSignal[]): void {
    if (!Number.isFinite(value)) return;
    if (!this.owns(entityId, channel, sceneTimeMs, signals)) return;
    const key = `${entityId}:${channel}`;
    if (this.values.get(key) === value) return;
    // Replace the container; earlier state() snapshots stay unchanged.
    const next = new Map(this.values);
    next.set(key, value);
    this.values = next;
    signals.push({ type: "write", entityId, channel, value });
  }
}

/** Replay a recorded event sequence on a fresh session; frames come from `frameAt`. */
export function replayInput(
  options: InputSessionOptions,
  events: readonly InputEvent[],
  frameAt: (sceneTimeMs: number, session: InputSession) => ResolvedFrame,
): { session: InputSession; steps: InputSignal[][] } {
  const session = new InputSession(options);
  const steps = events.map((event) => session.process(event, frameAt(event.sceneTimeMs, session)));
  return { session, steps };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function writeChannel(node: NodeDefinition, channel: InputChannel, value: number): void {
  switch (channel) {
    case "transform.position.x":
      node.transform.position.x = value;
      break;
    case "transform.position.y":
      node.transform.position.y = value;
      break;
    case "transform.rotation":
      node.transform.rotation = value;
      break;
    case "transform.scale.x":
      node.transform.scale.x = value;
      break;
    case "transform.scale.y":
      node.transform.scale.y = value;
      break;
    case "opacity":
      node.opacity = value;
      break;
  }
}

// ---------------------------------------------------------------------------
// Scene-declared interactions (Scene IR 0.10.0 input.bindings)

/** CSS pixel → logical viewport point under the renderer's contain fit. */
export function logicalPointFromCss(
  viewport: Pick<Viewport, "width" | "height">,
  cssWidth: number,
  cssHeight: number,
  x: number,
  y: number,
): Vec2 {
  const fit = containFit(viewport, cssWidth, cssHeight);
  return { x: (x - fit.offsetX) / fit.scale, y: (y - fit.offsetY) / fit.scale };
}

/** Input-owned (node, channel) pairs declared by a scene's interactions. */
export function declaredInputChannels(interactions: readonly InteractionTarget[] | undefined): Set<string> {
  const owned = new Set<string>();
  for (const target of interactions ?? []) {
    for (const binding of target.bindings ?? []) {
      const nodeId = binding.nodeId ?? target.nodeId;
      const channels: InputChannel[] =
        binding.action.kind === "dragTranslate" ? ["transform.position.x", "transform.position.y"] : [binding.action.channel];
      for (const channel of channels) owned.add(`${nodeId}:${channel}`);
    }
  }
  return owned;
}

function baseValue(node: NodeDefinition, channel: InputChannel): number {
  switch (channel) {
    case "transform.position.x":
      return node.transform.position.x;
    case "transform.position.y":
      return node.transform.position.y;
    case "transform.rotation":
      return node.transform.rotation;
    case "transform.scale.x":
      return node.transform.scale.x;
    case "transform.scale.y":
      return node.transform.scale.y;
    case "opacity":
      return node.opacity;
  }
}

/**
 * Build an InputSession from a validated scene's `interactions`. Declared
 * channels are input-owned for the whole scene (the validator rejects tracks
 * that write them); initial values are the authored node bases.
 */
export function createSceneInputSession(
  scene: SceneIR,
  options: Pick<InputSessionOptions, "dragThreshold" | "maxLog" | "hit" | "wrapFocus"> = {},
): InputSession {
  const interactions = scene.interactions ?? [];
  const owned = declaredInputChannels(interactions);
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  const initial: Record<string, number> = {};
  for (const key of owned) {
    const cut = key.lastIndexOf(":");
    const node = byId.get(key.slice(0, cut));
    if (node) initial[key] = baseValue(node, key.slice(cut + 1) as InputChannel);
  }
  const session: InputSession = new InputSession({
    ...options,
    initial,
    ownership: (entityId, channel) => owned.has(`${entityId}:${channel}`),
    targets: interactions.map((target) => ({
      entityId: target.nodeId,
      ...(target.pointer ? { pointer: target.pointer } : {}),
      ...(target.focusable !== undefined ? { focusable: target.focusable } : {}),
      ...(target.tabIndex !== undefined ? { tabIndex: target.tabIndex } : {}),
      bindings: (target.bindings ?? []).map((binding) => ({
        on: binding.on,
        ...(binding.key !== undefined ? { key: binding.key } : {}),
        ...(binding.nodeId !== undefined ? { entityId: binding.nodeId } : {}),
        action: binding.action,
      })),
    })),
    dragSpace: (entityId, sceneTimeMs) => {
      const sampled = session.applyTo(sampleScene(scene, sceneTimeMs), sceneTimeMs);
      const node = sampled.nodes.find((entry) => entry.id === entityId);
      if (!node) return undefined;
      const world = logicalMatrix(sampled.nodes, scene.viewport, sampled.camera, entityId);
      const local = invert(localMatrix(node.transform));
      if (!local) return undefined;
      // logical = parent × local, so parent = logical × local⁻¹.
      return multiplyMat3(world, local);
    },
    ...(scene.spatialLayers?.length
      ? {
          dragPlaneDelta: (entityId: string, from: Vec2, to: Vec2, sceneTimeMs: number) => {
            const layers = layersFromScene(scene);
            if (!layers.some((layer) => layer.surfaces.some((surface) => surface.nodeId === entityId))) {
              return undefined;
            }
            const sampled = session.applyTo(sampleScene(scene, sceneTimeMs), sceneTimeMs);
            // Project the unprojected layout frame so unprojection matches authored surfaces.
            const layout = buildResolvedFrame(scene, sampled, sceneTimeMs);
            return surfaceDragDelta(projectSpatialFrame(layout, layers), entityId, from, to);
          },
        }
      : {}),
  });
  return session;
}
