/**
 * Portable scene IR. No Canvas objects, DOM nodes, functions, or host handles.
 * Distances are logical viewport units. Time is milliseconds. Angles are radians.
 */

import type { SourceSpan } from "./diagnostics";

export const IR_VERSION = "0.1" as const;
export const IR_VERSION_02 = "0.2" as const;
export type IrVersion = typeof IR_VERSION | typeof IR_VERSION_02;
export const DSL_VERSION = "0.1" as const;
export const DSL_VERSION_02 = "0.2" as const;

export interface Vec2 {
  x: number;
  y: number;
}

/** Column-major 3×3 matrix. Column vectors: p' = M p. See math.ts. */
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

/**
 * Straight alpha, each channel in [0, 1].
 * `type` is always "solid" in V1 so a later gradient cannot be mistaken for this record.
 */
export interface SolidColor {
  type: "solid";
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorStop {
  offset: number;
  color: SolidColor;
}

export interface LinearGradientPaint {
  type: "linear";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: ColorStop[];
}

export interface RadialGradientPaint {
  type: "radial";
  cx: number;
  cy: number;
  r: number;
  stops: ColorStop[];
}

export type Paint = SolidColor | LinearGradientPaint | RadialGradientPaint;

export interface Viewport {
  width: number;
  height: number;
  /** V1 has one fit policy: uniform scale, letterbox the remainder. */
  fit: "contain";
}

export interface Stroke {
  color: Paint;
  /** Local geometry units, centered on the boundary. Must be > 0. */
  width: number;
  cap: "butt" | "round" | "square";
  join: "miter" | "round" | "bevel";
  /** Used when join is "miter". Must be >= 1. */
  miterLimit: number;
}

export interface FontStyle {
  /** Must match a font resource `family`. */
  family: string;
  /** Em-square height in local units. Must be > 0. */
  size: number;
  /** CSS-style weight in 1..1000. */
  weight: number;
  style: "normal" | "italic";
}

export type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface CubicEasing {
  type: "cubic";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type SegmentEasing = EasingName | CubicEasing | { type: "hold" };

export interface Transform {
  /** Parent-space translation of the local origin, applied last. */
  position: Vec2;
  /**
   * Point in local geometry that rotation and scale leave fixed
   * before `position` is applied. Not a normalized 0..1 anchor.
   */
  pivot: Vec2;
  /** Radians. Positive is clockwise on the y-down plane. */
  rotation: number;
  /** Local scale. Negative components mirror. Zero is allowed. */
  scale: Vec2;
}

export type PathCommand =
  | { cmd: "M"; x: number; y: number }
  | { cmd: "L"; x: number; y: number }
  | { cmd: "Q"; cx: number; cy: number; x: number; y: number }
  | { cmd: "C"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }
  | { cmd: "Z" };

interface NodeBase {
  /**
   * Canonical id. A root id equals `name`.
   * A child id is `parentId + "." + name`. Segments contain no dots.
   */
  id: string;
  /** Local name. Identifier, no dots. */
  name: string;
  parentId: string | null;
  /**
   * Required on roots, forbidden on every other node.
   * Space is inherited from the root. V1 does not convert space mid-tree.
   */
  space?: "world" | "screen";
  /**
   * Sibling sort key only. Lower draws first (under).
   * Ties break by ascending index in `SceneIR.nodes`.
   */
  zIndex: number;
  transform: Transform;
  /** Multiplied with ancestors into each drawable. Not isolated group opacity. */
  opacity: number;
  /** False hides this node and its entire subtree. */
  visible: boolean;
  /**
   * Transform chain when it differs from containment.
   * Omitted means the transform parent is `parentId`.
   */
  transformParentId?: string | null;
  /**
   * When false, this node's opacity does not include its containment ancestors.
   * Omitted means ancestors multiply, which is the 0.1 rule.
   */
  inheritOpacity?: boolean;
}

export interface GroupCompositing {
  isolated: boolean;
  blend?: "source-over" | "multiply" | "screen" | "overlay";
  effect?:
    | { type: "blur"; radius: number }
    | { type: "shadow"; dx: number; dy: number; blur: number; color: string };
}

export interface GroupNode extends NodeBase {
  kind: "group";
  compositing?: GroupCompositing;
}

export interface RectangleNode extends NodeBase {
  kind: "rectangle";
  /**
   * Full width (`x`) and height (`y`), both > 0.
   * Local (0, 0) is the top-left corner: minimum x and minimum y.
   */
  size: Vec2;
  /** Clamped corner radius. Omitted or 0 is a sharp rectangle. */
  cornerRadius?: number;
  fill?: Paint;
  stroke?: Stroke;
}

export interface CircleNode extends NodeBase {
  kind: "circle";
  /** Center is the local origin. Radius > 0. */
  radius: number;
  fill?: Paint;
  stroke?: Stroke;
}

export interface EllipseNode extends NodeBase {
  kind: "ellipse";
  /**
   * Full width and full height, both > 0.
   * The ellipse is centered on the local origin, so it extends
   * size/2 to either side of that origin. It does not start at (0, 0).
   */
  size: Vec2;
  fill?: Paint;
  stroke?: Stroke;
}

export interface LineNode extends NodeBase {
  kind: "line";
  /** Endpoints in local coordinates. */
  from: Vec2;
  to: Vec2;
  stroke: Stroke;
}

export interface PolygonNode extends NodeBase {
  kind: "polygon";
  /**
   * Local vertices. At least 3.
   * The polygon is closed: the edge from the last point back to the first
   * is part of both fill and stroke. Fill rule is nonzero.
   */
  points: Vec2[];
  fill?: Paint;
  stroke?: Stroke;
}

export interface PathNode extends NodeBase {
  kind: "path";
  /** Absolute local commands. The first command must be move. */
  commands: PathCommand[];
  fillRule: "nonzero" | "evenodd";
  fill?: Paint;
  stroke?: Stroke;
}

export interface ImageNode extends NodeBase {
  kind: "image";
  resourceId: string;
  size: Vec2;
}

export type TextAlign = "left" | "center" | "right";
export type TextBaseline = "alphabetic" | "middle" | "top" | "bottom";

export interface TextNode extends NodeBase {
  kind: "text";
  /** Single line. The transform position is the anchor described by align and baseline. */
  content: string;
  font: FontStyle;
  align: TextAlign;
  baseline: TextBaseline;
  fill: Paint;
  stroke?: Stroke;
}

export type NodeDefinition =
  | GroupNode
  | RectangleNode
  | CircleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | PathNode
  | ImageNode
  | TextNode;

export type NodeKind = NodeDefinition["kind"];

export interface Camera2DDefinition {
  /** V1 requires this id to be "main". */
  id: string;
  /** World-space point that maps to the logical viewport centre. */
  position: Vec2;
  /** Strictly positive magnification. This is not an inverse world scale. */
  zoom: number;
  /** Radians. Positive camera rotation uses R(−θ) in the view matrix. */
  rotation: number;
}

export interface FontResource {
  id: string;
  kind: "font";
  family: string;
  source: "builtin";
  readiness?: "ready" | "pending" | "failed";
}

export interface ImageResource {
  id: string;
  kind: "image";
  href: string;
  readiness?: "ready" | "pending" | "failed";
}

export interface TimingScope {
  id: string;
  parentId: string | null;
  offsetMs: number;
  stretch: number;
}

export interface CompositionDefinition {
  id: string;
  nodes: NodeDefinition[];
}

export interface CompositionInstance {
  id: string;
  definitionId: string;
  parentId: string | null;
  transformParentId: string | null;
  transform: Transform;
  opacity: number;
  visible: boolean;
  activation: { startMs: number; endMs: number };
  timingScopeId: string;
}

export type GeometryOperator =
  | { op: "trim"; start: number; end: number; offset: number }
  | { op: "round"; radius: number };

export interface GeometryOperatorList {
  nodeId: string;
  operators: GeometryOperator[];
}

export type ResourceDefinition = FontResource | ImageResource;

export type Expr =
  | { type: "number"; value: number }
  | { type: "ref"; name: "PI" | "t" | "local_t" | "progress" }
  | { type: "unary"; op: "+" | "-"; argument: Expr }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "%"; left: Expr; right: Expr }
  | {
      type: "call";
      callee: "sin" | "cos" | "abs" | "min" | "max" | "sqrt" | "pow" | "clamp" | "lerp";
      args: Expr[];
    };

export type NodeAnimChannel =
  | "transform.position"
  | "transform.position.x"
  | "transform.position.y"
  | "transform.rotation"
  | "transform.scale"
  | "transform.scale.x"
  | "transform.scale.y"
  | "transform.pivot"
  | "transform.pivot.x"
  | "transform.pivot.y"
  | "opacity"
  | "visible"
  | "commands";

export type CameraAnimChannel =
  | "position"
  | "position.x"
  | "position.y"
  | "zoom"
  | "rotation";

export type PropertyTarget =
  | { kind: "node"; nodeId: string; channel: NodeAnimChannel }
  | { kind: "camera"; cameraId: string; channel: CameraAnimChannel };

export type PropertyType = "number" | "vec2" | "angle" | "boolean" | "path";

/**
 * Before the track starts, the sampled value is the authored base.
 * After it ends, `forwards` holds the terminal sample and `none` returns to the base.
 * V1 does not offer a backwards fill.
 */
export interface TrackFill {
  before: "none";
  after: "none" | "forwards";
}

export interface Keyframe {
  /** Normalized time in [0, 1], unique and strictly increasing. 0 and 1 are required. */
  offset: number;
  /** number / vec2 / angle samples, or a PathCommand[] when valueType is path. */
  value: number | Vec2 | PathCommand[];
  /**
   * Easing of the segment that begins at this keyframe.
   * Omitted means linear. Forbidden on the last keyframe.
   */
  easing?: SegmentEasing;
  /** Spatial out/in tangents for a vec2 segment. Offsets are relative to the key's value. */
  spatial?: { out: Vec2; in: Vec2 };
}

export interface TrackComposition {
  order: number;
  mode: "replace";
}

export interface KeyframeTrack {
  id: string;
  kind: "keyframe";
  target: PropertyTarget;
  valueType: "number" | "vec2" | "angle" | "path";
  startMs: number;
  /** Must be > 0. Zero-duration changes are steps, not tracks. */
  durationMs: number;
  fill: TrackFill;
  keyframes: Keyframe[];
  composition?: TrackComposition;
  timingScopeId?: string;
}

export interface ExpressionTrack {
  id: string;
  kind: "expression";
  target: PropertyTarget;
  /** Expressions produce one number. Angle channels store that number as radians. */
  valueType: "number" | "angle";
  startMs: number;
  durationMs: number;
  fill: TrackFill;
  /** Authoring text after constant substitution. Must parse to `ast`. */
  source: string;
  ast: Expr;
  timingScopeId?: string;
}

export type TrackDefinition = KeyframeTrack | ExpressionTrack;

/** Discrete change. V1 steps write `visible` only. The value holds until the next step. */
export interface StepDefinition {
  id: string;
  target: { kind: "node"; nodeId: string; channel: "visible" };
  /** Inclusive scene time. A step at H is excluded from the sealed left-limit state. */
  timeMs: number;
  value: boolean;
}

export interface SceneIR {
  irVersion: IrVersion;
  sceneId: string;
  viewport: Viewport;
  background: SolidColor;
  resources: ResourceDefinition[];
  nodes: NodeDefinition[];
  /** Exactly one camera in V1. */
  cameras: Camera2DDefinition[];
  initialCameraId: string;
  timeline: {
    durationMs: number;
    tracks: TrackDefinition[];
    steps: StepDefinition[];
  };
  /** Present on 0.2. A 0.1 document must omit these fields. */
  compositions?: CompositionDefinition[];
  instances?: CompositionInstance[];
  timingScopes?: TimingScope[];
  requiredCapabilities?: string[];
  geometryOperators?: GeometryOperatorList[];
}

export interface SceneHeader {
  irVersion: IrVersion;
  sceneId: string;
  viewport: Viewport;
  background: SolidColor;
  resources: ResourceDefinition[];
  cameras: Camera2DDefinition[];
  initialCameraId: string;
  durationMs: number;
  compositions?: CompositionDefinition[];
  instances?: CompositionInstance[];
  timingScopes?: TimingScope[];
  requiredCapabilities?: string[];
  geometryOperators?: GeometryOperatorList[];
}

export type RuntimeOperation =
  | { op: "CREATE_SCENE"; scene: SceneHeader }
  | { op: "ADD_NODES"; nodes: NodeDefinition[] }
  | { op: "ADD_TRACKS"; tracks: TrackDefinition[] }
  | { op: "ADD_STEPS"; steps: StepDefinition[] }
  | { op: "SEAL_TIMELINE"; horizonMs: number }
  | { op: "COMPLETE_PROGRAM" };

export interface SceneIRDelta {
  generationId: string;
  unitId: number;
  expectedRevision: number;
  nextRevision: number;
  operations: RuntimeOperation[];
  sourceSpan: SourceSpan;
}

export type ResolvedGeometry =
  | { kind: "rectangle"; size: Vec2; cornerRadius?: number }
  | { kind: "image"; resourceId: string; href: string; size: Vec2 }
  | { kind: "circle"; radius: number }
  | { kind: "ellipse"; size: Vec2 }
  | { kind: "line"; from: Vec2; to: Vec2 }
  | { kind: "polygon"; points: Vec2[] }
  | { kind: "path"; commands: PathCommand[]; fillRule: "nonzero" | "evenodd" }
  | {
      kind: "text";
      content: string;
      font: FontStyle;
      align: TextAlign;
      baseline: TextBaseline;
    };

export interface ResolvedAppearance {
  fill?: Paint;
  stroke?: Stroke;
}

export interface ResolvedDrawItem {
  nodeId: string;
  geometry: ResolvedGeometry;
  appearance: ResolvedAppearance;
  /**
   * Maps local geometry into the authored logical viewport.
   * World nodes already include the camera. Screen nodes do not.
   * Hierarchy has already been flattened. The renderer must not walk parents.
   */
  logicalMatrix: Mat3;
  /** Product of this node's opacity and its ancestors' opacities. */
  opacity: number;
}

export type RenderTreeNode =
  | {
      kind: "scope";
      id: string;
      isolated: boolean;
      opacity: number;
      blend?: "source-over" | "multiply" | "screen" | "overlay";
      effect?: GroupCompositing["effect"];
      children: RenderTreeNode[];
    }
  | { kind: "leaf"; item: ResolvedDrawItem };

export interface ResolvedFrame {
  sceneTimeMs: number;
  revision: number;
  /**
   * Carried on the frame so a renderer can letterbox without holding a SceneIR.
   * The design's draw-item matrix is already in this viewport's coordinate system.
   */
  viewport: Viewport;
  background: SolidColor;
  drawItems: ResolvedDrawItem[];
  /**
   * Prototype tree for 0.2. The root scope is not isolated.
   * Rasterisation still uses drawItems, so a missing tree does not change pixels.
   */
  renderTree?: RenderTreeNode;
}

export interface AnimationRuntime {
  enqueue(delta: SceneIRDelta): void;
  flushCommands(): ApplyResult[];
  evaluate(sceneTimeMs: number): ResolvedFrame;
}

export interface ApplyResult {
  revision: number;
  unitId: number;
  ok: boolean;
}
