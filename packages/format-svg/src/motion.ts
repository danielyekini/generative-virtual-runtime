import type { KeyframeTrack, SegmentEasing } from "@gvr/schema";
import type { SvgDocument, SvgNode } from "./model";

interface MotionTarget {
  notes: { feature: string; level: string; message: string; target?: string }[];
  tracks: KeyframeTrack[];
  capabilities: string[];
  svgIds: Map<string, string>;
}

/** Time-based SMIL and embedded CSS opacity/transform. Event and script animation stay rejected upstream. */
export function applySvgMotion(document: SvgDocument, lower: MotionTarget): void {
  walk(document.children, lower);
  for (const sheet of document.stylesheets) applyStylesheet(sheet, lower);
}

function walk(nodes: readonly SvgNode[], lower: MotionTarget, parentId?: string): void {
  for (const node of nodes) {
    const tag = node.attrs["data-tag"] ?? node.kind;
    if ((tag === "animate" || tag === "animateTransform") && parentId) {
      const host = lower.svgIds.get(parentId);
      if (host) addSmil(node, host, lower);
    }
    walk(node.children, lower, node.id ?? parentId);
  }
}

function addSmil(node: SvgNode, host: string, lower: MotionTarget): void {
  const begin = timeMs(node.attrs.begin, 0);
  const dur = timeMs(node.attrs.dur, 0);
  if (!(dur > 0)) return;
  if (node.attrs.repeatCount === "indefinite") {
    lower.notes.push({
      feature: "smil",
      level: "approximated",
      message: "Indefinite repeat is previewed for one cycle.",
      target: host,
    });
  }
  const tag = node.attrs["data-tag"];
  if (tag === "animate" && node.attrs.attributeName === "opacity") {
    pushNumber(lower, host, "opacity", begin, dur, numberAttr(node.attrs.from, 0), numberAttr(node.attrs.to, 1), "svg.smilTimeBased");
    return;
  }
  if (tag === "animateTransform") {
    const type = node.attrs.type;
    const from = numberAttr(node.attrs.from, 0);
    const to = numberAttr(node.attrs.to, 0);
    if (type === "rotate") pushNumber(lower, host, "transform.rotation", begin, dur, (from * Math.PI) / 180, (to * Math.PI) / 180, "svg.smilTimeBased");
    else if (type === "translate") {
      pushNumber(lower, host, "transform.position.x", begin, dur, from, to, "svg.smilTimeBased");
    }
  }
}

function applyStylesheet(sheet: string, lower: MotionTarget): void {
  const frames = new Map<string, { from: number; to: number }>();
  const blocks = sheet.matchAll(
    /@keyframes\s+([A-Za-z_][\w-]*)\s*\{[\s\S]*?(?:from|0%)\s*\{\s*opacity\s*:\s*([0-9.]+)[\s\S]*?(?:to|100%)\s*\{\s*opacity\s*:\s*([0-9.]+)/g,
  );
  for (const block of blocks) {
    const name = block[1];
    const from = block[2] ? Number(block[2]) : undefined;
    const to = block[3] ? Number(block[3]) : undefined;
    if (name && from !== undefined && to !== undefined && Number.isFinite(from) && Number.isFinite(to)) {
      frames.set(name, { from, to });
    }
  }
  const rules = sheet.matchAll(/#([A-Za-z_][\w-]*)\s*\{[^}]*animation\s*:\s*([A-Za-z_][\w-]*)\s+([0-9.]+)(ms|s)/g);
  for (const rule of rules) {
    const id = rule[1];
    const name = rule[2];
    const amount = Number(rule[3]);
    const unit = rule[4];
    const motion = name ? frames.get(name) : undefined;
    const nodeId = id ? lower.svgIds.get(id) : undefined;
    if (!motion || !nodeId || !(amount > 0)) continue;
    const duration = unit === "s" ? amount * 1000 : amount;
    pushNumber(lower, nodeId, "opacity", 0, duration, motion.from, motion.to, "svg.cssKeyframes");
    lower.notes.push({ feature: "stylesheet", level: "exact", message: `CSS animation ${name} drives ${nodeId}.`, target: nodeId });
  }
}

function pushNumber(
  lower: MotionTarget,
  nodeId: string,
  channel: "opacity" | "transform.rotation" | "transform.position.x",
  startMs: number,
  durationMs: number,
  from: number,
  to: number,
  capability: string,
): void {
  lower.tracks.push({
    id: `svg${lower.tracks.length + 1}`,
    kind: "keyframe",
    target: { kind: "node", nodeId, channel },
    valueType: channel === "transform.rotation" ? "angle" : "number",
    startMs,
    durationMs,
    fill: { before: "none", after: "forwards" },
    keyframes: [
      { offset: 0, value: from, easing: "linear" as SegmentEasing },
      { offset: 1, value: to },
    ],
  });
  lower.capabilities.push(capability);
  lower.notes.push({
    feature: capability === "svg.cssKeyframes" ? "css-animation" : "smil",
    level: "exact",
    message: `Time-based ${channel} on ${nodeId}.`,
    target: nodeId,
  });
}

function timeMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^([0-9.]+)(ms|s)?$/.exec(value.trim());
  if (!match?.[1]) return fallback;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return fallback;
  return match[2] === "ms" ? amount : amount * 1000;
}

function numberAttr(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
