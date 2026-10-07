import type { SegmentEasing, Vec2 } from "@gvr/schema";

export type LottieEasing = SegmentEasing | "bezier-approx";
import type { InventoryFinding } from "./inventory";

export const LOTTIE_ADAPTER_VERSION = "0.1.0";

export interface LottieDocument {
  frameRate: number;
  inFrame: number;
  outFrame: number;
  width: number;
  height: number;
  name?: string;
  layers: LottieLayer[];
  assets: LottieCompAsset[];
  images: LottieImageAsset[];
  /** Constructs recorded before lowering. Empty when the source has none of them. */
  findings: InventoryFinding[];
}

export interface LottieCompAsset {
  id: string;
  layers: LottieLayer[];
}

export interface LottieImageAsset {
  id: string;
  href: string;
  width: number;
  height: number;
}

export type LottieLayerKind = "shape" | "null" | "solid" | "precomp" | "text" | "image" | "unsupported";

export interface LottieLayer {
  index: number;
  arrayOrder: number;
  parentIndex?: number;
  name?: string;
  kind: LottieLayerKind;
  inFrame: number;
  outFrame: number;
  hidden: boolean;
  hasMask: boolean;
  hasSkew: boolean;
  hasAutoOrient: boolean;
  transform: LottieTransform;
  shapes: LottieShapeItem[];
  solidWidth?: number;
  solidHeight?: number;
  solidColor?: [number, number, number];
  refId?: string;
  startFrame?: number;
  trackMatte?: boolean;
  blend?: "multiply" | "screen" | "overlay";
  /**
   * Static Gaussian Blur radius in CSS blur() pixels after lottie-web's
   * blurriness * 0.3 mapping. Omitted when the effect stack is not that case.
   */
  blurRadius?: number;
  text?: { content: string; size: number; family: string; color: [number, number, number] };
  inventoryTarget: string;
  unsupportedReason?: string;
}

export interface LottieTransform {
  anchor: AnimatedVec2;
  position: AnimatedVec2;
  scale: AnimatedVec2;
  rotation: AnimatedScalar;
  opacity: AnimatedScalar;
}

export type AnimatedScalar =
  | { kind: "static"; value: number }
  | { kind: "animated"; keyframes: LottieScalarKeyframe[] };

export type AnimatedVec2 =
  | { kind: "static"; value: Vec2 }
  | { kind: "animated"; keyframes: LottieVec2Keyframe[] };

export interface LottieScalarKeyframe {
  frame: number;
  value: number;
  hold: boolean;
  easing: LottieEasing;
}

export interface LottieVec2Keyframe {
  frame: number;
  value: Vec2;
  hold: boolean;
  easing: LottieEasing;
  spatial?: { out: Vec2; in: Vec2 };
}

export type LottieShapeItem =
  | { kind: "group"; name?: string; items: LottieShapeItem[]; transform: LottieShapeTransform }
  | {
      kind: "path";
      name?: string;
      closed: boolean;
      commands: PathPoint[];
      fill?: SolidPaint;
      stroke?: StrokePaint;
      gradient?: GradientPaint;
      trim?: { start: number; end: number; offset: number };
    }
  | { kind: "ellipse"; name?: string; center: Vec2; size: Vec2; fill?: SolidPaint; stroke?: StrokePaint; gradient?: GradientPaint }
  | { kind: "rectangle"; name?: string; position: Vec2; size: Vec2; cornerRadius: number; fill?: SolidPaint; stroke?: StrokePaint; gradient?: GradientPaint }
  | { kind: "unsupported"; feature: string; message: string };

export interface LottieShapeTransform {
  anchor: Vec2;
  position: Vec2;
  scale: Vec2;
  rotation: number;
  opacity: number;
}

export interface GradientPaint {
  type: "linear" | "radial";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: [number, number, number] }[];
}

export interface SolidPaint {
  color: [number, number, number];
  opacity: number;
}

export interface StrokePaint {
  color: [number, number, number];
  opacity: number;
  width: number;
}

export interface PathPoint {
  vertex: Vec2;
  inTangent: Vec2;
  outTangent: Vec2;
}
