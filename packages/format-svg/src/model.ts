export const SVG_ADAPTER_VERSION = "0.1.0";

/** Static scenes have no tracks. This duration lets the existing runtime seek them. */
export const SVG_STATIC_DURATION_MS = 1000;

export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SvgDocument {
  width: number;
  height: number;
  viewBox?: ViewBox;
  preserve: "meet" | "none" | "slice";
  /** True when meet alignment is not the centered default. */
  meetAlignDiffers: boolean;
  children: SvgNode[];
  stylesheets: string[];
  /** Active content. The importer produces no scene when this is set. */
  rejected?: { feature: string; message: string };
}

export interface SvgNode {
  kind: "g" | "rect" | "circle" | "ellipse" | "line" | "polyline" | "polygon" | "path" | "text";
  id?: string;
  attrs: Record<string, string>;
  text: string;
  children: SvgNode[];
}
