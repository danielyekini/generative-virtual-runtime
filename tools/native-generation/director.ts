import { stripModelFences } from "./text.js";

/** Bounded director-script shape for P008. Not MotionScript. */
export type DirectorScript = {
  intent: string;
  canvas: { width: number; height: number; durationMs: number };
  requires: string[];
  beats: Array<{ atMs: number; action: string; notes: string }>;
  constraints: string[];
};

export const DIRECTOR_SYSTEM = [
  "You are a MotionScript director planner for GVR.",
  "Given a user animation request, output ONLY one JSON object (no markdown fences) with keys:",
  '  intent (string), canvas {width,height,durationMs}, requires (string[]),',
  '  beats (array of {atMs, action, notes}), constraints (string[]).',
  "Beats must cover declaration, animation, seal timing and complete.",
  "Do not write MotionScript. Do not invent unsupported capabilities.",
  "Keep requires to released capability ids when known (e.g. geometry.trimPath).",
  "Node id hints in notes must avoid reserved words: path, line, circle, text, stroke, fill, animate, seal.",
].join("\n");

export function directorToImplementPrompt(userPrompt: string, director: DirectorScript): string {
  return [
    "Implement this director script as a complete MotionScript 0.2 program.",
    "Output ONLY raw MotionScript ending with complete; — no markdown fences or commentary.",
    "Rules: never name nodes with reserved words (path, line, circle, text, stroke, fill, animate, seal).",
    "path syntax: path rail { move (x,y); line (x,y); stroke #rrggbb width 4; };",
    "trim: operators rail { trim 0, 0, 0; }; then animate rail.trim.end { from 0; to 1; duration 1500ms; };",
    "circle: circle badge { radius 32; fill #ffffff; position (x,y); };",
    "",
    "Original user request:",
    userPrompt,
    "",
    "Director script JSON:",
    JSON.stringify(director, null, 2),
  ].join("\n");
}

export function parseDirectorScript(raw: string): { ok: true; script: DirectorScript } | { ok: false; error: string } {
  const cleaned = stripModelFences(raw).trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { ok: false, error: "no JSON object in director output" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    return { ok: false, error: `director JSON parse failed: ${(error as Error).message}` };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "director root must be object" };
  const obj = parsed as Record<string, unknown>;
  const canvas = obj.canvas as Record<string, unknown> | undefined;
  if (typeof obj.intent !== "string" || !obj.intent.trim()) return { ok: false, error: "intent required" };
  if (!canvas || typeof canvas.width !== "number" || typeof canvas.height !== "number" || typeof canvas.durationMs !== "number") {
    return { ok: false, error: "canvas.width/height/durationMs required" };
  }
  if (!Array.isArray(obj.beats) || obj.beats.length === 0) return { ok: false, error: "beats required" };
  const requires = Array.isArray(obj.requires) ? obj.requires.filter((item): item is string => typeof item === "string") : [];
  const constraints = Array.isArray(obj.constraints)
    ? obj.constraints.filter((item): item is string => typeof item === "string")
    : [];
  const beats: DirectorScript["beats"] = [];
  for (const beat of obj.beats) {
    if (!beat || typeof beat !== "object") return { ok: false, error: "invalid beat" };
    const row = beat as Record<string, unknown>;
    if (typeof row.atMs !== "number" || typeof row.action !== "string" || typeof row.notes !== "string") {
      return { ok: false, error: "beat needs atMs, action, notes" };
    }
    beats.push({ atMs: row.atMs, action: row.action, notes: row.notes });
  }
  return {
    ok: true,
    script: {
      intent: obj.intent.trim(),
      canvas: {
        width: canvas.width,
        height: canvas.height,
        durationMs: canvas.durationMs,
      },
      requires,
      beats,
      constraints,
    },
  };
}
