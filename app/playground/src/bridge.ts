import type { ResolvedFrame } from "@gvr/schema";

export interface GvrProbe {
  sceneId: string;
  timeMs: number;
  playing: boolean;
  rate: number;
  degraded: boolean;
  diagnostics: string[];
  origins: Record<string, { x: number; y: number }>;
  compileOk?: boolean;
  sourceDiagnostics?: string[];
  nodeCount?: number;
  state?: string;
  sealedThroughMs?: number;
  revision?: number;
  parsedUnits?: number;
  phase?: string;
}

export interface GvrCompare {
  index: number;
  id: string;
  file: string;
  overall: string;
  durationMs: number;
  timeMs: number;
  hasImported: boolean;
  hasRoundTrip: boolean;
  report: string;
  seek: (sceneTimeMs: number) => void;
  next: () => void;
  prev: () => void;
  openText: (name: string, source: string) => void;
}

export interface GvrBridge {
  activity: string;
  canvas: HTMLCanvasElement;
  logicalToDevice?: (x: number, y: number) => { x: number; y: number };
  frame?: ResolvedFrame;
  seek?: (sceneTimeMs: number) => void;
  probe?: () => GvrProbe;
  compileOk?: boolean;
  sourceDiagnostics?: string[];
  report?: string;
  overall?: string;
  sceneId?: string;
  attemptedFixtureId?: string;
  displayedSceneId?: string;
  editor?: string;
  script?: string;
  scriptCompiles?: boolean;
  dirty?: boolean;
  formatId?: string;
  detail?: string;
  view?: string;
  compare?: GvrCompare;
  phase?: string;
  generationId?: string | null;
  systemSceneId?: string | null;
  generatedSceneId?: string | null;
  systemTimeMs?: number;
  generatedTimeMs?: number;
  systemOpacity?: number;
  generatedOpacity?: number;
  status?: string;
  seen?: string[];
}

export function button(label: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.setAttribute("aria-pressed", String(pressed));
  element.addEventListener("click", onClick);
  return element;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target instanceof HTMLButtonElement) return true;
  if (target instanceof HTMLInputElement) return target.type !== "range";
  return target.isContentEditable;
}
