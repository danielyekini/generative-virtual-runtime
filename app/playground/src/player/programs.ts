/**
 * Installed catalogue shared by the Library page and Player routing.
 */
import {
  fixtureExamples,
  frameScripts,
  lottieExamples,
  motionExamples,
  sceneScripts,
  svgExamples,
  type SourceExample,
} from "../examples";
import type { ProgramEntry, ProgramFormat } from "../library";

/** Short behaviour samples among the MotionScript examples (not stories). */
const SAMPLE_IDS = new Set(["bunny", "ball", "caption", "nested", "diagram", "camera"]);

const IMPORT_LABELS: Record<Exclude<ProgramFormat, "motionscript">, string> = {
  fixture: "Fixture",
  lottie: "Lottie",
  svg: "SVG",
};

export const COLLECTIONS = ["Stories", "Runtime scenes", "Test frames", "Imports"] as const;

function imports(format: Exclude<ProgramFormat, "motionscript">, items: readonly SourceExample[]): ProgramEntry[] {
  return items.map((item) => ({
    key: `import:${format}:${item.id}`,
    label: `${IMPORT_LABELS[format]}: ${item.label}`,
    caption: item.file,
    collection: "Imports",
    origin: "installed",
    format,
    source: item.source,
  }));
}

export function installedPrograms(): ProgramEntry[] {
  return [
    ...motionExamples.filter((item) => !SAMPLE_IDS.has(item.id)).map((item): ProgramEntry => ({
      key: `story:${item.id}`, label: item.label, caption: item.caption, collection: "Stories", origin: "installed", format: "motionscript", source: item.source,
    })),
    ...motionExamples.filter((item) => SAMPLE_IDS.has(item.id)).map((item): ProgramEntry => ({
      key: `sample:${item.id}`, label: item.label, caption: item.caption, collection: "Runtime scenes", origin: "installed", format: "motionscript", source: item.source,
    })),
    ...sceneScripts.map((item): ProgramEntry => ({
      key: `scene:${item.id}`, label: item.label, caption: item.caption, collection: "Runtime scenes", origin: "installed", format: "motionscript", source: item.source,
    })),
    ...frameScripts.map((item): ProgramEntry => ({
      key: `frame:${item.id}`, label: item.label, caption: item.caption, collection: "Test frames", origin: "installed", format: "motionscript", source: item.source,
    })),
    ...imports("fixture", fixtureExamples),
    ...imports("lottie", lottieExamples),
    ...imports("svg", svgExamples),
  ];
}

/** Pick a format for an opened file from its name, falling back to MotionScript. */
export function formatForFile(name: string, text: string): ProgramFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith(".svg")) return "svg";
  if (lower.endsWith(".json")) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      if (data && typeof data === "object" && "layers" in data && "fr" in data) return "lottie";
      return "fixture";
    } catch {
      return "lottie";
    }
  }
  return "motionscript";
}

export const FORMAT_LABELS: Record<ProgramFormat, string> = {
  motionscript: "MotionScript",
  fixture: "Fixture import",
  lottie: "Lottie import",
  svg: "SVG import",
};
