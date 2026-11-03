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

/** Player page state for automation and smoke tests (P001). */
export interface PlayerProbe {
  programKey: string | null;
  programName: string | null;
  format: string | null;
  runState: "not-run" | "ok" | "recovered" | "failed";
  sceneId: string;
  timeMs: number;
  durationMs: number;
  playing: boolean;
  dirty: boolean;
  fullscreen: boolean;
  sourceOpen: boolean;
  /** P019 Generate mode: side panel shows transcript + composer. */
  generateMode?: boolean;
  generateRunning?: boolean;
  generateMessages?: number;
  split: boolean;
  comparison: boolean;
  comparisonSceneId: string;
  panelOpen: boolean;
  panelTab: string;
  diagnostics: string[];
  canvas: { cssWidth: number; cssHeight: number; backingWidth: number; backingHeight: number };
  /** Frame tape sampling (P016): tile count, tiles drawn, pending and measured cost in ms. */
  tape?: { tiles: number; drawn: number; pending: number; lastDrawMs: number; totalMs: number; failed: number };
  /** Present when the scene declares audio.cues (E026). */
  audio?: {
    voices: string[];
    holding: boolean;
    note: string;
    context: "running" | "suspended";
    diagnostics: string[];
    /** Bounded Web Audio backend command log. */
    log: string[];
  };
}

export interface GvrBridge {
  stream?: import("@gvr/runtime").StreamingExecutionObservation & { receivedCharacters: number; totalCharacters: number; arrivalPaused: boolean; arrivalDone: boolean; waitingMs: number; resolvedThroughMs: number };
  runStream?: () => void;
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
  player?: PlayerProbe;
  run?: () => void;
  open?: (key: string) => boolean;
  /** Offline WAV export of the declared audio schedule (mixAudio + encodeWav). */
  exportAudio?: () => { wav: Uint8Array; sampleRate: number; channels: number; durationMs: number } | null;
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
