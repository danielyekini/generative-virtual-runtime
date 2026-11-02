/** Player preferences and recent programs. Storage can be blocked; every read falls back. */
export interface PlayerSettings {
  /** Run as soon as a program is opened. Off by default (studio-ux.md). */
  autoplay: boolean;
  sourceOpen: boolean;
  sourceWidth: number;
  panelOpen: boolean;
  panelTab: PanelTab;
  panelHeight: number;
  canvasSize: string;
  dpr: "device" | "1" | "2";
}

export type PanelTab = "diagnostics" | "scene" | "report";
export const PANEL_TABS: readonly PanelTab[] = ["diagnostics", "scene", "report"];

export const DEFAULT_SETTINGS: PlayerSettings = {
  autoplay: false,
  sourceOpen: false,
  sourceWidth: 420,
  panelOpen: true,
  panelTab: "diagnostics",
  panelHeight: 220,
  canvasSize: "window",
  dpr: "device",
};

export const SETTINGS_KEY = "gvr.player.settings.v1";
export const RECENT_KEY = "gvr.player.recent.v1";
export const RECENT_LIMIT = 6;

export function decodeSettings(raw: string | null | undefined): PlayerSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof PlayerSettings, unknown>>;
    if (typeof data.autoplay === "boolean") out.autoplay = data.autoplay;
    if (typeof data.sourceOpen === "boolean") out.sourceOpen = data.sourceOpen;
    if (typeof data.panelOpen === "boolean") out.panelOpen = data.panelOpen;
    if (typeof data.sourceWidth === "number" && data.sourceWidth >= 240 && data.sourceWidth <= 2000) out.sourceWidth = data.sourceWidth;
    if (typeof data.panelHeight === "number" && data.panelHeight >= 96 && data.panelHeight <= 2000) out.panelHeight = data.panelHeight;
    if (typeof data.panelTab === "string" && (PANEL_TABS as readonly string[]).includes(data.panelTab)) out.panelTab = data.panelTab as PanelTab;
    if (typeof data.canvasSize === "string") out.canvasSize = data.canvasSize;
    if (data.dpr === "device" || data.dpr === "1" || data.dpr === "2") out.dpr = data.dpr;
  } catch {
    /* Corrupt storage: use defaults. */
  }
  return out;
}

/** Most recent first, unique, bounded. */
export function pushRecent(recent: readonly string[], key: string, limit = RECENT_LIMIT): string[] {
  return [key, ...recent.filter((item) => item !== key)].slice(0, limit);
}

export function decodeRecent(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter((item): item is string => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Quota or privacy mode: keep working for this visit. */
  }
}
