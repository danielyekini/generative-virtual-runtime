import type { PathCommand } from "./types";
import { lerp } from "./math";
import { pathsShareTopology } from "./spatial";

/** Command sequence used to decide whether two paths share morph topology. */
export function pathTopologyKey(commands: readonly PathCommand[]): string {
  return commands.map((command) => command.cmd).join("");
}

/** Component-wise lerp of matching-topology paths. Z stays Z. */
export function lerpPathCommands(
  from: readonly PathCommand[],
  to: readonly PathCommand[],
  t: number,
): PathCommand[] | undefined {
  if (!pathsShareTopology(from, to)) return undefined;
  return from.map((command, index) => {
    const other = to[index]!;
    if (command.cmd === "Z") return { cmd: "Z" };
    if (command.cmd === "M" && other.cmd === "M") {
      return { cmd: "M", x: lerp(command.x, other.x, t), y: lerp(command.y, other.y, t) };
    }
    if (command.cmd === "L" && other.cmd === "L") {
      return { cmd: "L", x: lerp(command.x, other.x, t), y: lerp(command.y, other.y, t) };
    }
    if (command.cmd === "Q" && other.cmd === "Q") {
      return {
        cmd: "Q",
        cx: lerp(command.cx, other.cx, t),
        cy: lerp(command.cy, other.cy, t),
        x: lerp(command.x, other.x, t),
        y: lerp(command.y, other.y, t),
      };
    }
    if (command.cmd === "C" && other.cmd === "C") {
      return {
        cmd: "C",
        c1x: lerp(command.c1x, other.c1x, t),
        c1y: lerp(command.c1y, other.c1y, t),
        c2x: lerp(command.c2x, other.c2x, t),
        c2y: lerp(command.c2y, other.c2y, t),
        x: lerp(command.x, other.x, t),
        y: lerp(command.y, other.y, t),
      };
    }
    return { ...command };
  });
}

export function isPathCommandArray(value: unknown): value is PathCommand[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isRecord(entry) && typeof entry.cmd === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
