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
  /**
   * Dash lengths in local geometry units, each finite and > 0
   * (`paint.strokeDash`, Scene IR 0.21.0). Omitted strokes stay solid.
   */
  dash?: readonly number[];
  /**
   * Dash phase in the same units as `dash`. Positive phase advances into the
   * pattern (Canvas `lineDashOffset`). Requires `dash`. Omitted means 0.
   */
  phase?: number;
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
  /**
   * Clip this group's render scope to another node's resolved outline
   * (`compositing.mask`, Scene IR 0.16.0). geometryId names a rectangle,
   * circle, ellipse, polygon or path in the same scene.
   */
  clip?: { geometryId: string };
  /**
   * Keep this group's painted pixels only where another node's painted alpha
   * is (`compositing.matte`, Scene IR 0.19.0). nodeId is outside this group.
   */
  matte?: { nodeId: string };
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

/**
 * Numeric format binding for `text.dynamicContent` (Scene IR 0.18.0).
 * Display content is `resolveNumericContent(value, format)` at sample time.
 */
export interface TextNumericFormat {
  fractionDigits?: number;
  minIntegerDigits?: number;
  sign?: "auto" | "always" | "never";
  group?: string;
  decimal?: string;
  prefix?: string;
  suffix?: string;
}

export interface TextNumericContent {
  /** Base number; overridden by an active `text.number` track while it runs. */
  value: number;
  format?: TextNumericFormat;
}

export interface TextNode extends NodeBase {
  kind: "text";
  /** Single line. The transform position is the anchor described by align and baseline. */
  content: string;
  font: FontStyle;
  align: TextAlign;
  baseline: TextBaseline;
  fill: Paint;
  stroke?: Stroke;
  /**
   * Requires text.dynamicContent (Scene IR 0.18.0). When set, sampled content is
   * derived from the number (and optional format); the authored `content` string
   * is the pre-sample fallback only.
   */
  numeric?: TextNumericContent;
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
  /**
   * Requires timing.cyclicScopes (Scene IR 0.23.0). Finite and > 0. Local time
   * wraps into [0, periodMs). Without `repeat` the cycle is unbounded and the
   * offset is a phase; with `repeat` N the scope is entered at affine time 0,
   * wraps N times and is then pinned at periodMs.
   */
  periodMs?: number;
  /** Requires periodMs. Integer in 1..10 000. */
  repeat?: number;
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

/** Portable generative modality (Scene IR 0.14.0 audio.generative). */
export type AudioGenerativeModality = "speech" | "effect";

/** Optional portable style knobs for generative audio (provider-mapped). */
export interface AudioGenerativeStyle {
  stability?: number;
  similarity?: number;
  speed?: number;
}

/** Static decoded-file source (audio.cues href form). */
export interface AudioHrefSource {
  type: "href";
  href: string;
}

/**
 * Provider-abstracted generative intent (audio.generative). No vendor endpoint,
 * model id, or API key on the wire.
 */
export interface AudioGenerativeSource {
  type: "generative";
  modality: AudioGenerativeModality;
  prompt: string;
  voice?: string;
  durationHintMs?: number;
  loop?: boolean;
  seed?: number;
  style?: AudioGenerativeStyle;
}

export type AudioResourceSource = AudioHrefSource | AudioGenerativeSource;

/**
 * Audio resource (Scene IR 0.11.0 audio.cues; generative source in 0.14.0).
 * Href resources require non-empty `href` and positive `durationMs`. Generative
 * resources carry `source.type === "generative"`; `durationMs` may be
 * provisional or omitted while pending; host may fill `href` after synthesis.
 */
export interface AudioResourceDefinition {
  id: string;
  kind: "audio";
  href?: string;
  durationMs?: number;
  readiness?: "ready" | "pending" | "failed";
  source?: AudioResourceSource;
}

export type ResourceDefinition = FontResource | ImageResource | AudioResourceDefinition;

export type AudioBusName = "narration" | "effects" | "music";

/**
 * Audio cue on root scene time (Scene IR 0.11.0 audio.cues). Semantics follow
 * docs/decisions/engine/audible-media-clock.md: span = play length x loops,
 * linear fades, narration required by default.
 */
export interface AudioCueDefinition {
  id: string;
  resourceId: string;
  bus: AudioBusName;
  startMs: number;
  offsetMs?: number;
  durationMs?: number;
  loops?: number;
  gain?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  required?: boolean;
}

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
  | "commands"
  | "trim.start"
  | "trim.end"
  | "trim.offset"
  | "path.progress"
  | "content"
  | "text.number"
  | "fill.r"
  | "fill.g"
  | "fill.b"
  | "fill.a"
  | "stroke.r"
  | "stroke.g"
  | "stroke.b"
  | "stroke.a"
  | "stroke.width"
  | "stroke.phase";

export type CameraAnimChannel =
  | "position"
  | "position.x"
  | "position.y"
  | "zoom"
  | "rotation";

export type PropertyTarget =
  | { kind: "node"; nodeId: string; channel: NodeAnimChannel }
  | { kind: "camera"; cameraId: string; channel: CameraAnimChannel };

export type PropertyType = "number" | "vec2" | "angle" | "boolean" | "path" | "string";

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
  /**
   * Spatial out/in tangents for a vec2 segment. Offsets are relative to the key's value.
   * Optional `z` participates in arc-length only (After Effects / lottie-web); it is not drawn.
   */
  spatial?: { out: SpatialTangent; in: SpatialTangent };
}

/** XY offset from the key value; optional Z for 3D arc-length sampling. */
export interface SpatialTangent {
  x: number;
  y: number;
  z?: number;
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

/**
 * Discrete change. Holds until the next step on the same channel.
 * `visible` (boolean) is available from 0.1; `content` (string) requires
 * text.dynamicContent (Scene IR 0.18.0). Continuous string interpolation is not offered.
 */
export interface StepDefinition {
  id: string;
  target: { kind: "node"; nodeId: string; channel: "visible" | "content" };
  /**
   * Inclusive scene time, or scope-local time when timingScopeId is set.
   * A step at H is excluded from the sealed left-limit state.
   */
  timeMs: number;
  value: boolean | string;
  /**
   * Requires timing.cyclicScopes (Scene IR 0.23.0). The scope chain must
   * contain a period; the step repeats every cycle and the previous cycle's
   * final step carries over until a cycle's first step.
   */
  timingScopeId?: string;
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
  /** Requires input.bindings (Scene IR 0.10.0). */
  interactions?: InteractionTarget[];
  /** Requires audio.cues (Scene IR 0.11.0). Streamed with ADD_AUDIO_CUES. */
  audioCues?: AudioCueDefinition[];
  /** Requires space.planar25d (Scene IR 0.12.0). Projected at frame resolution. */
  spatialLayers?: SpatialLayerDefinition[];
  /** Requires physics.planar2d (Scene IR 0.13.0). One planar physics world per scene. */
  physics?: PhysicsWorldDefinition;
  /** Requires geometry.pathProgress (Scene IR 0.17.0). Base definitions, frozen after the first seal. */
  pathAttachments?: PathAttachment[];
}

/**
 * Planar 2D physics world (physics.planar2d). Aligns with @gvr/runtime PhysicsSession.
 * Dynamic mode uses rigid bodies/joints; authored mode uses position-based constraints.
 * Physics exclusively owns transform.position.x/y and transform.rotation for each body entity.
 */
export type PhysicsBodyKind = "static" | "kinematic" | "dynamic";
export type PhysicsWorldMode = "dynamic" | "authored";

export type PhysicsColliderDefinition =
  | { kind: "circle"; radius: number }
  | { kind: "aabb"; halfWidth: number; halfHeight: number };

export interface PhysicsBodyDefinition {
  id: string;
  /** Entity that receives channel writes; defaults to id. */
  entityId?: string;
  kind: PhysicsBodyKind;
  x: number;
  y: number;
  /** Radians. */
  angle: number;
  vx?: number;
  vy?: number;
  omega?: number;
  mass?: number;
  restitution?: number;
  friction?: number;
  collider: PhysicsColliderDefinition;
  /** Optional E010 planar surface attachment (presentation only). */
  surfaceId?: string;
}

export interface PhysicsJointDefinition {
  id: string;
  bodyA: string;
  bodyB: string;
  restLength: number;
  anchorA?: Vec2;
  anchorB?: Vec2;
  compliance?: number;
}

/** Authored (non-dynamic) distance constraint between entity/point ids. */
export interface PhysicsConstraintDefinition {
  id: string;
  a: string;
  b: string;
  restLength: number;
  stiffness?: number;
}

export interface PhysicsWorldDefinition {
  id: string;
  mode: PhysicsWorldMode;
  gravity?: Vec2;
  fixedDtMs?: number;
  seed?: number;
  maxBodies?: number;
  maxJoints?: number;
  maxContactsPerStep?: number;
  maxSolverIterations?: number;
  maxStepsPerAdvance?: number;
  bodies: PhysicsBodyDefinition[];
  joints?: PhysicsJointDefinition[];
  constraints?: PhysicsConstraintDefinition[];
}

/** Planar 2.5D layer (space.planar25d). Aligns with @gvr/runtime SpatialLayer. */
export interface SpatialVec3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialHingeDefinition {
  from: Vec2;
  to: Vec2;
  /** Radians. */
  angle: number;
}

export interface SpatialTransformDefinition {
  position?: SpatialVec3;
  pivot?: SpatialVec3;
  rotation?: SpatialVec3;
  scale?: SpatialVec3;
  hinge?: SpatialHingeDefinition;
}

export interface SpatialSurfaceDefinition {
  nodeId: string;
  parent?: string;
  transform?: SpatialTransformDefinition;
  /** Reverse-face solid fill; omitted keeps the front appearance. */
  backFill?: SolidColor;
  backface?: "visible" | "hidden";
}

export interface SpatialCameraDefinition {
  projection: "perspective" | "orthographic";
  position?: SpatialVec3;
  yaw?: number;
  pitch?: number;
  roll?: number;
  focalLength?: number;
  zoom?: number;
  near?: number;
}

/** Declared seam: two surfaces of one layer that must share an outline edge. */
export interface SpatialSeamEdgeDefinition {
  a: string;
  b: string;
}

/** Seam/split compositing for one layer (space.planarSeams, Scene IR 0.15.0). */
export interface SpatialSeamsDefinition {
  /** Split true intersections into ordered fragments. Default true. */
  split?: boolean;
  /** View-space shared-edge tolerance in logical units, > 0. Default 0.001. */
  edgeEpsilon?: number;
  /** Extra draw items splitting may add per frame, integer 0..1024. Default 64. */
  maxFragments?: number;
  edges?: SpatialSeamEdgeDefinition[];
}

export interface SpatialLayerDefinition {
  id: string;
  camera: SpatialCameraDefinition;
  surfaces: SpatialSurfaceDefinition[];
  /** Requires space.planarSeams (Scene IR 0.15.0). */
  seams?: SpatialSeamsDefinition;
}

/** Channels an interaction binding may write (Scene IR 0.10.0 input.bindings). */
export type InteractionChannel =
  | "transform.position.x"
  | "transform.position.y"
  | "transform.rotation"
  | "transform.scale.x"
  | "transform.scale.y"
  | "opacity";

export type InteractionTrigger = "click" | "activate" | "drag" | "wheel" | "key";

/** Bounded state actions. No arbitrary code, loops or timers. */
export type InteractionAction =
  | { kind: "set"; channel: InteractionChannel; value: number }
  | { kind: "toggle"; channel: InteractionChannel; values: [number, number] }
  | { kind: "step"; channel: InteractionChannel; delta: number; min: number; max: number }
  /** Position delta in the node's parent space, clamped to [min, max]. */
  | { kind: "dragTranslate"; min: Vec2; max: Vec2 };

export interface InteractionBinding {
  on: InteractionTrigger;
  /** Required for `key`; a KeyboardEvent.key value. */
  key?: string;
  /** Node whose channel is written; defaults to the interaction target. */
  nodeId?: string;
  action: InteractionAction;
}

/** Interaction target (input.bindings). Declared channels are exclusively input-owned. */
export interface InteractionTarget {
  nodeId: string;
  pointer?: "auto" | "none";
  focusable?: boolean;
  tabIndex?: number;
  bindings?: InteractionBinding[];
}

/**
 * Path attachment (geometry.pathProgress, Scene IR 0.17.0). Places `nodeId` at
 * `progress` along the resolved (morphed, then trimmed) outline of path node
 * `pathId`. The attachment exclusively owns the node's transform.position.x/y,
 * and transform.rotation when `orient` is true or `rollRadius` is set. Rolling
 * (distance / radius) is never implied by `orient`. `path.progress` tracks on
 * the attached node override `progress` per sample. When the scene also
 * requires geometry.pathSpace (0.22.0), sampling maps that point through the
 * path node's transform into the traveller's parent space. Without that
 * capability the point stays in path command space.
 */
export interface PathAttachment {
  nodeId: string;
  pathId: string;
  /** Base progress in [0, 1]. */
  progress: number;
  /** Rotation follows the path tangent. */
  orient?: boolean;
  /** Radius > 0. Adds rolling = distance / radius to rotation. */
  rollRadius?: number;
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
  interactions?: InteractionTarget[];
  /** Requires space.planar25d (Scene IR 0.12.0). */
  spatialLayers?: SpatialLayerDefinition[];
  /** Requires physics.planar2d (Scene IR 0.13.0). Base definition, frozen after the first seal. */
  physics?: PhysicsWorldDefinition;
  /** Requires geometry.pathProgress (Scene IR 0.17.0). Base definitions, frozen after the first seal. */
  pathAttachments?: PathAttachment[];
}

/** Stable semantic entity identity for durable revisions (entities.durableRevisions). */
export type EntityId = string;
export type ChannelId = string;
export type BehaviourId = string;
export type WriterClass = "generative" | "behaviour" | "input" | "physics";

export interface EntityRecord {
  id: EntityId;
  kind: "drawable" | "group";
  parentId: EntityId | null;
  /** False means removed for presentation at/after its removal activation. */
  present: boolean;
  label?: string;
}

export interface OwnershipGrant {
  entityId: EntityId;
  channel: ChannelId;
  owner: BehaviourId | "generative";
  writerClass: WriterClass;
  fromMs: number;
  /** Exclusive until this instant; omit for open-ended. */
  untilMs?: number;
}

export interface BehaviourRecord {
  id: BehaviourId;
  entityId: EntityId;
  channel: ChannelId;
  activationMs: number;
  active: boolean;
}

/** Stable id for an immutable shared geometry asset (entities.drawableBindings). */
export type GeometryId = string;

/**
 * Immutable shared drawable asset. Geometry ids must stay disjoint from entity
 * ids so bind edges remain acyclic (entity → geometry leaf).
 */
export interface GeometryAsset {
  id: GeometryId;
  space: "world" | "local";
  node: NodeDefinition;
}

/**
 * Topology / ownership / behaviour / drawable-binding mutation. Activation times
 * must not rewrite the sealed presentation prefix (see entities.durableRevisions
 * and entities.drawableBindings).
 */
export type EntityPatchOp =
  | { op: "UPSERT_ENTITY"; entity: EntityRecord; activationMs: number; node?: NodeDefinition }
  | { op: "REMOVE_ENTITY"; entityId: EntityId; activationMs: number }
  | { op: "REPARENT"; entityId: EntityId; parentId: EntityId | null; activationMs: number }
  | { op: "GRANT_OWNERSHIP"; grant: OwnershipGrant }
  | { op: "REVOKE_OWNERSHIP"; entityId: EntityId; channel: ChannelId; atMs: number }
  | { op: "ACTIVATE_BEHAVIOUR"; behaviour: BehaviourRecord }
  | { op: "CANCEL_BEHAVIOUR"; behaviourId: BehaviourId }
  /** Requires entities.drawableBindings (and durable revisions on APPLY_ENTITY_PATCH). */
  | { op: "REGISTER_GEOMETRY"; geometry: GeometryAsset; activationMs: number }
  /** Requires entities.drawableBindings (and durable revisions on APPLY_ENTITY_PATCH). */
  | { op: "BIND_GEOMETRY"; entityId: EntityId; geometryId: GeometryId; activationMs: number };

export interface EntityPatch {
  expectedRevision: number;
  nextRevision: number;
  operations: EntityPatchOp[];
}

export type RuntimeOperation =
  | { op: "CREATE_SCENE"; scene: SceneHeader }
  | { op: "ADD_NODES"; nodes: NodeDefinition[] }
  | { op: "ADD_TRACKS"; tracks: TrackDefinition[] }
  | { op: "ADD_STEPS"; steps: StepDefinition[] }
  /** Requires audio.cues (Scene IR 0.11.0). Cues may start at or after the seal frontier. */
  | { op: "ADD_AUDIO_CUES"; cues: AudioCueDefinition[] }
  | { op: "SEAL_TIMELINE"; horizonMs: number }
  | { op: "COMPLETE_PROGRAM" }
  /** Requires entities.durableRevisions. May activate after the first seal. */
  | { op: "APPLY_ENTITY_PATCH"; patch: EntityPatch };

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
      /** Viewport-space clip outline for this scope (`compositing.mask`). */
      clip?: { geometry: ResolvedGeometry; logicalMatrix: Mat3 };
      /**
       * Painted coverage sampled as this scope's alpha matte
       * (`compositing.matte`). Drawn into an offscreen buffer, not the parent.
       */
      matte?: RenderTreeNode;
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
  /**
   * Set when the scene requires `text.layoutMetrics` (Scene IR 0.20.0).
   * Hit-testing and spatial text outlines then use builtin advances.
   * Omitted frames keep the legacy 0.6em estimate.
   */
  textLayoutMetrics?: boolean;
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
