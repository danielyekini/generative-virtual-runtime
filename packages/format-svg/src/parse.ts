import type { ImportContext, ImportDiagnostic, ParseResult } from "@gvr/format-import-core";
import type { SvgDocument, SvgNode, ViewBox } from "./model";
import { parseXml, type XmlNode } from "./xml";

const VISUAL = new Set(["g", "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text"]);
const DROPPED = new Set(["title", "desc", "metadata", "defs"]);

export function parseSvgDocument(source: string, _context: ImportContext): ParseResult<SvgDocument> {
  if (/<script\b|<\/script>|<foreignObject\b|\son[a-zA-Z]+\s*=|javascript\s*:/i.test(source)) {
    return { ok: false, diagnostics: [fatal("script", "Scripts, event handlers, and foreignObject are not imported.")] };
  }
  const xml = parseXml(source);
  if (!xml.ok) return { ok: false, diagnostics: [fatal("xml", xml.message)] };
  if (xml.root.name !== "svg") {
    return { ok: false, diagnostics: [fatal("svg", "The root element must be svg.")] };
  }
  const rejected = activeContent(xml.root);
  if (rejected) return { ok: false, diagnostics: [fatal(rejected.feature, rejected.message)] };

  const viewBox = readViewBox(xml.root.attrs.viewBox);
  const width = length(xml.root.attrs.width) ?? viewBox?.width;
  const height = length(xml.root.attrs.height) ?? viewBox?.height;
  if (width === undefined || height === undefined || !(width > 0) || !(height > 0)) {
    return { ok: false, diagnostics: [fatal("viewport", "SVG width and height must be positive px lengths, or a viewBox must supply them.")] };
  }
  const preserve = readPreserve(xml.root.attrs.preserveAspectRatio);
  return {
    ok: true,
    value: {
      width,
      height,
      viewBox,
      preserve: preserve.mode,
      meetAlignDiffers: preserve.meetAlignDiffers,
      children: xml.root.children.filter((child) => child.name !== "style").map(toNode),
      stylesheets: xml.root.children.filter((child) => child.name === "style").map((child) => child.text),
      rejected: undefined,
    },
  };
}

function toNode(node: XmlNode): SvgNode {
  const kind = VISUAL.has(node.name) ? (node.name as SvgNode["kind"]) : "g";
  return {
    kind: VISUAL.has(node.name) ? kind : "g",
    id: node.attrs.id,
    attrs: { ...node.attrs, "data-tag": node.name },
    text: node.text,
    children: node.children.map(toNode),
  };
}

export function isDroppedTag(tag: string | undefined): boolean {
  return tag !== undefined && DROPPED.has(tag);
}

export function isVisualTag(tag: string | undefined): boolean {
  return tag !== undefined && VISUAL.has(tag);
}

function activeContent(node: XmlNode): { feature: string; message: string } | undefined {
  if (node.name === "script" || node.name === "foreignObject") {
    return { feature: node.name, message: `<${node.name}> is not imported.` };
  }
  for (const [key, value] of Object.entries(node.attrs)) {
    if (/^on/i.test(key)) return { feature: "event", message: `Event attribute ${key} is not imported.` };
    if (/javascript\s*:/i.test(value)) return { feature: "script", message: "javascript: URLs are not imported." };
  }
  for (const child of node.children) {
    const found = activeContent(child);
    if (found) return found;
  }
  return undefined;
}

function readViewBox(value: string | undefined): ViewBox | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined;
  const [minX, minY, width, height] = parts as [number, number, number, number];
  if (!(width > 0) || !(height > 0)) return undefined;
  return { minX, minY, width, height };
}

function readPreserve(value: string | undefined): { mode: "meet" | "none" | "slice"; meetAlignDiffers: boolean } {
  const text = (value ?? "xMidYMid meet").trim();
  if (/\bslice\b/.test(text)) return { mode: "slice", meetAlignDiffers: false };
  if (/\bnone\b/.test(text)) return { mode: "none", meetAlignDiffers: false };
  const align = text.split(/\s+/)[0] ?? "xMidYMid";
  return { mode: "meet", meetAlignDiffers: align !== "xMidYMid" };
}

/** Numeric or px lengths. Percent and physical units are unsupported. */
export function length(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^([-+]?(?:\d*\.\d+|\d+))(px)?$/.exec(value.trim());
  if (!match) return undefined;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : undefined;
}

function fatal(feature: string, message: string): ImportDiagnostic {
  return { code: "IMPORT_UNSUPPORTED", severity: "fatal", fidelity: "unsupported", feature, message };
}
