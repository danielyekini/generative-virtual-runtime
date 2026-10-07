import type { ResolvedGeometry, SolidColor } from "@gvr/schema";

export interface PathSink {
  rect(x: number, y: number, width: number, height: number): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
  ): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
}

/** Local geometry, before the item matrix. Rectangle origin is the top-left. Ellipse and circle centres are the origin. */
export function traceGeometry(geometry: ResolvedGeometry, sink: PathSink): void {
  switch (geometry.kind) {
    case "rectangle":
      if (geometry.cornerRadius && geometry.cornerRadius > 0) {
        traceRoundRect(sink, geometry.size.x, geometry.size.y, geometry.cornerRadius);
        return;
      }
      sink.rect(0, 0, geometry.size.x, geometry.size.y);
      return;
    case "circle":
      sink.arc(0, 0, geometry.radius, 0, Math.PI * 2);
      return;
    case "ellipse":
      sink.ellipse(0, 0, geometry.size.x / 2, geometry.size.y / 2, 0, 0, Math.PI * 2);
      return;
    case "line":
      sink.moveTo(geometry.from.x, geometry.from.y);
      sink.lineTo(geometry.to.x, geometry.to.y);
      return;
    case "polygon": {
      const first = geometry.points[0];
      if (!first) return;
      sink.moveTo(first.x, first.y);
      for (const point of geometry.points.slice(1)) sink.lineTo(point.x, point.y);
      sink.closePath();
      return;
    }
    case "path":
      for (const command of geometry.commands) {
        switch (command.cmd) {
          case "M":
            sink.moveTo(command.x, command.y);
            break;
          case "L":
            sink.lineTo(command.x, command.y);
            break;
          case "Q":
            sink.quadraticCurveTo(command.cx, command.cy, command.x, command.y);
            break;
          case "C":
            sink.bezierCurveTo(command.c1x, command.c1y, command.c2x, command.c2y, command.x, command.y);
            break;
          case "Z":
            sink.closePath();
            break;
        }
      }
      return;
    case "text":
    case "image":
      return;
  }
}

function traceRoundRect(sink: PathSink, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  sink.moveTo(r, 0);
  sink.lineTo(width - r, 0);
  sink.arc(width - r, r, r, -Math.PI / 2, 0);
  sink.lineTo(width, height - r);
  sink.arc(width - r, height - r, r, 0, Math.PI / 2);
  sink.lineTo(r, height);
  sink.arc(r, height - r, r, Math.PI / 2, Math.PI);
  sink.lineTo(0, r);
  sink.arc(r, r, r, Math.PI, Math.PI * 1.5);
  sink.closePath();
}

export function cssColor(color: SolidColor): string {
  const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${color.a})`;
}

export function cssFont(font: { style: string; weight: number; size: number; family: string }): string {
  const family = font.family === "sans" ? "sans-serif" : font.family;
  return `${font.style} ${font.weight} ${font.size}px ${family}`;
}
