import type { PathCommand } from "@gvr/schema";

export interface ParsedPath {
  commands: PathCommand[];
  /** True when an elliptical arc was lowered to cubics. */
  approximated: boolean;
}

const TOKEN = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/gi;

/** Absolute M/L/H/V/C/S/Q/T/Z, plus A/a lowered to cubics. */
export function parseSvgPath(d: string): ParsedPath | undefined {
  const tokens = d.match(TOKEN);
  if (!tokens || tokens.length === 0) return undefined;
  const commands: PathCommand[] = [];
  let index = 0;
  let command = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCx = 0;
  let lastCy = 0;
  let approximated = false;
  const read = (): number | undefined => {
    const token = tokens[index];
    if (token === undefined || /[a-zA-Z]/.test(token)) return undefined;
    index += 1;
    return Number(token);
  };
  while (index < tokens.length) {
    const token = tokens[index]!;
    if (/[a-zA-Z]/.test(token)) {
      command = token;
      index += 1;
    } else if (!command) return undefined;
    const relative = command === command.toLowerCase();
    const op = command.toUpperCase();
    if (op === "Z") {
      commands.push({ cmd: "Z" });
      cx = sx;
      cy = sy;
      continue;
    }
    if (op === "M" || op === "L" || op === "H" || op === "V" || op === "T") {
      const point = linePoint(op, relative, cx, cy, read);
      if (!point) return undefined;
      if (op === "M") {
        commands.push({ cmd: "M", x: point.x, y: point.y });
        sx = point.x;
        sy = point.y;
        command = relative ? "l" : "L";
      } else if (op === "T") {
        const reflected = reflect(cx, cy, lastCx, lastCy);
        commands.push({ cmd: "Q", cx: reflected.x, cy: reflected.y, x: point.x, y: point.y });
        lastCx = reflected.x;
        lastCy = reflected.y;
      } else {
        commands.push({ cmd: "L", x: point.x, y: point.y });
      }
      cx = point.x;
      cy = point.y;
      if (op !== "T") {
        lastCx = cx;
        lastCy = cy;
      }
      continue;
    }
    if (op === "C" || op === "S" || op === "Q") {
      const curve = curvePoint(op, relative, cx, cy, lastCx, lastCy, read);
      if (!curve) return undefined;
      commands.push(curve.command);
      cx = curve.x;
      cy = curve.y;
      lastCx = curve.controlX;
      lastCy = curve.controlY;
      continue;
    }
    if (op === "A") {
      const arc = arcPoint(relative, cx, cy, read);
      if (!arc) return undefined;
      commands.push(...arc);
      approximated = true;
      const end = arc[arc.length - 1];
      if (end && "x" in end) {
        cx = end.x;
        cy = end.y;
      }
      lastCx = cx;
      lastCy = cy;
      continue;
    }
    return undefined;
  }
  if (commands[0]?.cmd !== "M") return undefined;
  return { commands, approximated };
}

function linePoint(
  op: string,
  relative: boolean,
  cx: number,
  cy: number,
  read: () => number | undefined,
): { x: number; y: number } | undefined {
  if (op === "H") {
    const x = read();
    if (x === undefined) return undefined;
    return { x: relative ? cx + x : x, y: cy };
  }
  if (op === "V") {
    const y = read();
    if (y === undefined) return undefined;
    return { x: cx, y: relative ? cy + y : y };
  }
  const x = read();
  const y = read();
  if (x === undefined || y === undefined) return undefined;
  return { x: relative ? cx + x : x, y: relative ? cy + y : y };
}

function curvePoint(
  op: string,
  relative: boolean,
  cx: number,
  cy: number,
  lastCx: number,
  lastCy: number,
  read: () => number | undefined,
): { command: PathCommand; x: number; y: number; controlX: number; controlY: number } | undefined {
  const abs = (x: number, y: number) => ({ x: relative ? cx + x : x, y: relative ? cy + y : y });
  if (op === "Q") {
    const c = readPair(read);
    const p = readPair(read);
    if (!c || !p) return undefined;
    const control = abs(c.x, c.y);
    const point = abs(p.x, p.y);
    return { command: { cmd: "Q", cx: control.x, cy: control.y, x: point.x, y: point.y }, x: point.x, y: point.y, controlX: control.x, controlY: control.y };
  }
  if (op === "S") {
    const reflected = reflect(cx, cy, lastCx, lastCy);
    const c = readPair(read);
    const p = readPair(read);
    if (!c || !p) return undefined;
    const control = abs(c.x, c.y);
    const point = abs(p.x, p.y);
    return {
      command: { cmd: "C", c1x: reflected.x, c1y: reflected.y, c2x: control.x, c2y: control.y, x: point.x, y: point.y },
      x: point.x,
      y: point.y,
      controlX: control.x,
      controlY: control.y,
    };
  }
  const c1 = readPair(read);
  const c2 = readPair(read);
  const p = readPair(read);
  if (!c1 || !c2 || !p) return undefined;
  const a = abs(c1.x, c1.y);
  const b = abs(c2.x, c2.y);
  const point = abs(p.x, p.y);
  return {
    command: { cmd: "C", c1x: a.x, c1y: a.y, c2x: b.x, c2y: b.y, x: point.x, y: point.y },
    x: point.x,
    y: point.y,
    controlX: b.x,
    controlY: b.y,
  };
}

function arcPoint(relative: boolean, cx: number, cy: number, read: () => number | undefined): PathCommand[] | undefined {
  const rx = read();
  const ry = read();
  const angle = read();
  const large = read();
  const sweep = read();
  const x = read();
  const y = read();
  if ([rx, ry, angle, large, sweep, x, y].some((value) => value === undefined)) return undefined;
  const endX = relative ? cx + x! : x!;
  const endY = relative ? cy + y! : y!;
  return arcToCubics(cx, cy, Math.abs(rx!), Math.abs(ry!), angle!, large! !== 0, sweep! !== 0, endX, endY);
}

function readPair(read: () => number | undefined): { x: number; y: number } | undefined {
  const x = read();
  const y = read();
  if (x === undefined || y === undefined) return undefined;
  return { x, y };
}

function reflect(cx: number, cy: number, lastX: number, lastY: number): { x: number; y: number } {
  return { x: 2 * cx - lastX, y: 2 * cy - lastY };
}

/** Endpoint-parameter arc to one cubic per quarter-turn or less. */
function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  phiDeg: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): PathCommand[] {
  if (rx === 0 || ry === 0) return [{ cmd: "L", x: x2, y: y2 }];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  let rx2 = rx * rx;
  let ry2 = ry * ry;
  const lambda = (x1p * x1p) / rx2 + (y1p * y1p) / ry2;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
    rx2 = rx * rx;
    ry2 = ry * ry;
  }
  const sign = large === sweep ? -1 : 1;
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p);
  const den = rx2 * y1p * y1p + ry2 * x1p * x1p;
  const coef = den === 0 ? 0 : sign * Math.sqrt(num / den);
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  const centerX = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const centerY = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  const curves: PathCommand[] = [];
  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  for (let step = 0; step < segments; step += 1) {
    const start = theta1 + (delta * step) / segments;
    const span = delta / segments;
    curves.push(cubicSpan(centerX, centerY, rx, ry, phi, start, span));
  }
  return curves;
}

function cubicSpan(cx: number, cy: number, rx: number, ry: number, phi: number, theta: number, delta: number): PathCommand {
  const alpha = (4 / 3) * Math.tan(delta / 4);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const map = (angle: number, radiusScaleX: number, radiusScaleY: number) => {
    const x = rx * Math.cos(angle) * radiusScaleX;
    const y = ry * Math.sin(angle) * radiusScaleY;
    return { x: cx + cos * x - sin * y, y: cy + sin * x + cos * y };
  };
  const p1 = map(theta, 1, 1);
  const p2 = map(theta + delta, 1, 1);
  const c1 = {
    x: p1.x + alpha * (-rx * Math.cos(phi) * Math.sin(theta) - ry * Math.sin(phi) * Math.cos(theta)),
    y: p1.y + alpha * (-rx * Math.sin(phi) * Math.sin(theta) + ry * Math.cos(phi) * Math.cos(theta)),
  };
  const c2 = {
    x: p2.x - alpha * (-rx * Math.cos(phi) * Math.sin(theta + delta) - ry * Math.sin(phi) * Math.cos(theta + delta)),
    y: p2.y - alpha * (-rx * Math.sin(phi) * Math.sin(theta + delta) + ry * Math.cos(phi) * Math.cos(theta + delta)),
  };
  return { cmd: "C", c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x: p2.x, y: p2.y };
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  let angle = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
  if (ux * vy - uy * vx < 0) angle = -angle;
  return angle;
}
