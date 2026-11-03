import type {
  AudioCueDefinition,
  AudioGenerativeModality,
  AudioGenerativeStyle,
  Diagnostic,
  InteractionBinding,
  Paint,
  PathCommand,
  PhysicsWorldDefinition,
  SolidColor,
  SourceSpan,
  SpatialLayerDefinition,
  Stroke,
} from "@gvr/schema";

export interface Vec {
  x: number;
  y: number;
  /** Optional Z on spatial tangents only (arc-length). */
  z?: number;
}

export type AnimLiteral =
  | { kind: "number"; value: number }
  | { kind: "vec2"; value: Vec }
  | { kind: "path"; value: PathCommand[] };

export type EaseAst =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | { type: "cubic"; x1: number; y1: number; x2: number; y2: number }
  | { type: "hold" };

export type Prop =
  | { name: "position" | "pivot" | "scale"; vec: Vec }
  | { name: "rotation"; value: number }
  | { name: "opacity" | "radius" | "fontSize" | "fontWeight" | "zIndex"; value: number }
  | { name: "visible"; value: boolean }
  | { name: "space"; value: "world" | "screen" }
  | { name: "size"; vec: Vec }
  | { name: "from" | "to"; vec: Vec }
  | { name: "fill"; color: Paint }
  | { name: "stroke"; stroke: Stroke }
  | { name: "cornerRadius" | "blur"; value: number }
  | { name: "inheritOpacity" | "isolated"; value: boolean }
  | { name: "transformParent" | "href" | "clip" | "matte"; text: string }
  | { name: "blend"; value: "source-over" | "multiply" | "screen" | "overlay" }
  | { name: "content" | "fontFamily" | "group" | "decimal" | "prefix" | "suffix"; text: string }
  | { name: "fontStyle"; value: "normal" | "italic" }
  | { name: "align"; value: "left" | "center" | "right" }
  | { name: "baseline"; value: "alphabetic" | "middle" | "top" | "bottom" }
  | { name: "fillRule"; value: "nonzero" | "evenodd" }
  | { name: "number" | "fractionDigits" | "minIntegerDigits"; value: number }
  | { name: "sign"; value: "auto" | "always" | "never" };

export interface NodeAst {
  kind: "node";
  shape: "group" | "rectangle" | "circle" | "ellipse" | "line" | "polygon" | "path" | "image" | "text";
  name: string;
  props: Prop[];
  children: NodeAst[];
  commands: PathCommand[];
  points: Vec[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface ConstAst {
  kind: "const";
  name: string;
  value: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface CameraAst {
  kind: "camera";
  name: string;
  position?: Vec;
  zoom?: number;
  rotation?: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

/**
 * A time position that names a beat (MotionScript 0.23 timing.timedKeys).
 * The unit's numeric field holds the signed offset from the beat until the
 * compiler binds it at push time (beats are compile-time constants and must
 * be declared before the unit).
 */
export interface BeatRef {
  field: "startMs" | "timeMs" | "offsetMs" | "cue.startMs";
  beat: string;
}

/** `beat <name> at <time | beat ± time>;` (MotionScript 0.23). */
export interface BeatAst {
  kind: "beat";
  name: string;
  /** Absolute time, or the offset from `after`. */
  atMs: number;
  after?: string;
  span: SourceSpan;
  errors: Diagnostic[];
}

/** A keyframe written at a time instead of a percentage (MotionScript 0.23). */
export interface TimedFrameAst {
  atMs: number;
  beat?: string;
  value: AnimLiteral;
  ease?: EaseAst;
  spatial?: { out: Vec; in: Vec };
}

export interface AnimateAst {
  kind: "animate";
  target: string;
  from?: AnimLiteral;
  to?: AnimLiteral;
  expression?: string;
  startMs?: number;
  durationMs?: number;
  ease?: EaseAst;
  fill?: "none" | "forwards";
  timingScopeId?: string;
  order?: number;
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface KeyframeAst {
  kind: "keyframes";
  target: string;
  startMs?: number;
  durationMs?: number;
  ease?: EaseAst;
  fill?: "none" | "forwards";
  timingScopeId?: string;
  order?: number;
  frames: { offset: number; value: AnimLiteral; ease?: EaseAst; spatial?: { out: Vec; in: Vec } }[];
  /** Timed keys; lowered to `startMs` / `durationMs` / `frames` when beats are bound. */
  timedFrames?: TimedFrameAst[];
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface TimingAst {
  kind: "timing";
  name: string;
  parent?: string;
  offsetMs?: number;
  stretch?: number;
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface CompositionAst {
  kind: "composition";
  name: string;
  nodes: NodeAst[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface InstanceAst {
  kind: "instance";
  name: string;
  definition: string;
  startMs?: number;
  endMs?: number;
  timing?: string;
  parent?: string;
  transformParent?: string;
  position?: Vec;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface OperatorsAst {
  kind: "operators";
  nodeId: string;
  operators: ({ op: "trim"; start: number; end: number; offset: number } | { op: "round"; radius: number })[];
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Interaction target (MotionScript 0.10 / input.bindings). */
export interface InteractAst {
  kind: "interact";
  nodeId: string;
  pointer?: "auto" | "none";
  focusable?: boolean;
  tabIndex?: number;
  bindings: InteractionBinding[];
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Path attachment (MotionScript 0.17 / geometry.pathProgress). */
export interface AttachAst {
  kind: "attach";
  nodeId: string;
  pathId: string;
  /** Required; absent only on a rejected unit. */
  progress?: number;
  orient?: boolean;
  rollRadius?: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Portable generative fields shared by explicit and sugar audio decls. */
export interface AudioGenerativeFields {
  modality: AudioGenerativeModality;
  prompt: string;
  voice?: string;
  durationHintMs?: number;
  loop?: boolean;
  seed?: number;
  style?: AudioGenerativeStyle;
}

/** Audio resource declaration (MotionScript 0.11 href / 0.14 generative). */
export interface AudioDeclAst {
  kind: "audio";
  id: string;
  /** Href form (audio.cues). */
  href?: string;
  durationMs?: number;
  /** Generative form (audio.generative). */
  generative?: AudioGenerativeFields;
  span: SourceSpan;
  errors: Diagnostic[];
}

/**
 * Authoring sugar `audio.narration(...)` / `audio.effects(...)` (0.14).
 * Lowers to an anonymous generative resource plus a cue.
 */
export interface AudioSugarAst {
  kind: "audioSugar";
  bus: "narration" | "effects";
  generative: AudioGenerativeFields;
  startMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Audio cue declaration on root scene time (MotionScript 0.11 / audio.cues). */
export interface CueDeclAst {
  kind: "cue";
  cue: AudioCueDefinition;
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Planar 2.5D layer declaration (MotionScript 0.12 / space.planar25d). */
export interface SpatialLayerAst {
  kind: "spatialLayer";
  layer: SpatialLayerDefinition;
  /** True once a `camera { … }` block parsed with a projection. */
  hasCamera: boolean;
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Planar 2D physics world (MotionScript 0.13 / physics.planar2d). */
export interface PhysicsAst {
  kind: "physics";
  world: PhysicsWorldDefinition;
  /** True once `mode dynamic|authored` parsed. */
  hasMode: boolean;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface StepAst {
  kind: "step";
  target: string;
  timeMs: number;
  value: boolean | string;
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface BatchAst {
  kind: "batch";
  items: UnitAst[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface SealAst {
  kind: "seal";
  timeMs: number;
  beatRefs?: BeatRef[];
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Declarative durable entity upsert (MotionScript 0.9 / entities.durableRevisions). */
export interface EntityDeclAst {
  kind: "entity";
  name: string;
  entityKind: "drawable" | "group";
  parentId: string | null;
  label?: string;
  activationMs: number;
  node?: NodeAst;
  span: SourceSpan;
  errors: Diagnostic[];
}

/** Shared immutable geometry asset (entities.drawableBindings). */
export interface GeometryDeclAst {
  kind: "geometry";
  name: string;
  space: "world" | "local";
  node?: NodeAst;
  activationMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface BindDeclAst {
  kind: "bind";
  entityId: string;
  geometryId: string;
  activationMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface RemoveEntityAst {
  kind: "removeEntity";
  entityId: string;
  activationMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface ReparentDeclAst {
  kind: "reparent";
  entityId: string;
  parentId: string | null;
  activationMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface BehaviourDeclAst {
  kind: "behaviour";
  id: string;
  entityId: string;
  channel: string;
  activationMs: number;
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface CancelBehaviourAst {
  kind: "cancelBehaviour";
  behaviourId: string;
  span: SourceSpan;
  errors: Diagnostic[];
}

export type UnitAst =
  | ConstAst
  | BeatAst
  | CameraAst
  | NodeAst
  | AnimateAst
  | KeyframeAst
  | StepAst
  | BatchAst
  | SealAst
  | TimingAst
  | CompositionAst
  | InstanceAst
  | OperatorsAst
  | InteractAst
  | AttachAst
  | AudioDeclAst
  | AudioSugarAst
  | CueDeclAst
  | SpatialLayerAst
  | PhysicsAst
  | EntityDeclAst
  | GeometryDeclAst
  | BindDeclAst
  | RemoveEntityAst
  | ReparentDeclAst
  | BehaviourDeclAst
  | CancelBehaviourAst;

export interface HeaderAst {
  sceneId?: string;
  version?: string;
  viewport?: { width: number; height: number };
  background?: SolidColor;
  durationMs?: number;
  requires: string[];
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface ProgramAst {
  header?: HeaderAst;
  units: UnitAst[];
  completed: boolean;
  diagnostics: Diagnostic[];
}
