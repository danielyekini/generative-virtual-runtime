import type { Diagnostic, Paint, PathCommand, SolidColor, SourceSpan, Stroke } from "@gvr/schema";

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
  | { name: "transformParent" | "href"; text: string }
  | { name: "blend"; value: "source-over" | "multiply" | "screen" | "overlay" }
  | { name: "content" | "fontFamily"; text: string }
  | { name: "fontStyle"; value: "normal" | "italic" }
  | { name: "align"; value: "left" | "center" | "right" }
  | { name: "baseline"; value: "alphabetic" | "middle" | "top" | "bottom" }
  | { name: "fillRule"; value: "nonzero" | "evenodd" };

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
  span: SourceSpan;
  errors: Diagnostic[];
}

export interface TimingAst {
  kind: "timing";
  name: string;
  parent?: string;
  offsetMs?: number;
  stretch?: number;
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

export interface StepAst {
  kind: "step";
  target: string;
  timeMs: number;
  value: boolean;
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
  span: SourceSpan;
  errors: Diagnostic[];
}

export type UnitAst =
  | ConstAst
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
  | OperatorsAst;

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
