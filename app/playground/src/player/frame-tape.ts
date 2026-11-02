/**
 * Frame tape (P016, studio-ux.md "Frame tape" / "Frame-tape states").
 * A video-editor style filmstrip: one thumbnail tile per equal slice of scene
 * time. Tile states: no tile until its range is resolved (sealed by the
 * runtime, or the whole scene in Run mode); greyed once resolved but ahead of
 * the playhead; normal once played. Grey is a CSS layer over the strip, so the
 * playhead moves without repainting thumbnails. No orange on the tape.
 */
import { CanvasRenderer } from "@gvr/canvas-renderer";
import type { ResolvedFrame } from "@gvr/schema";

/** Per-draw sampling budget so thumbnails never starve playback. */
export const TAPE_BUDGET_MS = 4;
export const TAPE_MAX_TILES_PER_DRAW = 6;

export interface TapeTile { index: number; startMs: number; endMs: number; x: number; width: number }

/** Equal slices of [0, span] sized to roughly the scene aspect at track height. */
export function tapeLayout(spanMs: number, trackWidth: number, trackHeight: number, aspect: number): TapeTile[] {
  if (!(spanMs > 0) || trackWidth < 1 || trackHeight < 1) return [];
  const ideal = Math.min(160, Math.max(24, trackHeight * (Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9)));
  const count = Math.max(1, Math.min(200, Math.round(trackWidth / ideal)));
  return Array.from({ length: count }, (_, index) => {
    const x = Math.round((index * trackWidth) / count);
    return {
      index,
      startMs: (index * spanMs) / count,
      endMs: ((index + 1) * spanMs) / count,
      x,
      width: Math.round(((index + 1) * trackWidth) / count) - x,
    };
  });
}

/** A tile exists once its whole time range can be evaluated without waiting. */
export function tileResolved(tile: TapeTile, resolvedThroughMs: number): boolean {
  return tile.endMs <= resolvedThroughMs + 0.5;
}

export interface TapeInput {
  /** Changes whenever previously drawn tiles may be stale (new Run, new stream, resized, span changed). */
  key: string;
  spanMs: number;
  /** Scene time evaluable now: span in Run mode, sealed horizon in Stream mode. */
  resolvedThroughMs: number;
  aspect: number;
  dpr: number;
  evaluate: (timeMs: number) => ResolvedFrame | null;
}

export interface TapeStats { tiles: number; drawn: number; pending: number; lastDrawMs: number; totalMs: number; failed: number }

export class FrameTape {
  stats: TapeStats = { tiles: 0, drawn: 0, pending: 0, lastDrawMs: 0, totalMs: 0, failed: 0 };
  private key = "";
  private tiles: TapeTile[] = [];
  private drawn = new Set<number>();
  private readonly scratch = document.createElement("canvas");
  private readonly renderer = new CanvasRenderer(this.scratch);

  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.key = "";
    this.tiles = [];
    this.drawn.clear();
    this.stats = { tiles: 0, drawn: 0, pending: 0, lastDrawMs: 0, totalMs: 0, failed: 0 };
    this.canvas.getContext("2d")?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Draw newly resolved tiles within the budget. Returns true when more remain. */
  update(input: TapeInput): boolean {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const key = `${input.key}|${width}x${height}@${input.dpr}|${input.spanMs}`;
    if (key !== this.key) {
      this.clear();
      this.key = key;
      this.canvas.width = Math.max(1, Math.round(width * input.dpr));
      this.canvas.height = Math.max(1, Math.round(height * input.dpr));
      this.tiles = tapeLayout(input.spanMs, width, height, input.aspect);
      this.stats.tiles = this.tiles.length;
    }
    const context = this.canvas.getContext("2d");
    const ready = this.tiles.filter((tile) => !this.drawn.has(tile.index) && tileResolved(tile, input.resolvedThroughMs));
    if (!context || ready.length === 0) { this.stats.pending = 0; return false; }
    const started = performance.now();
    let count = 0;
    for (const tile of ready) {
      if (count >= TAPE_MAX_TILES_PER_DRAW || (count > 0 && performance.now() - started > TAPE_BUDGET_MS)) break;
      count++;
      this.drawn.add(tile.index);
      try {
        const frame = input.evaluate(tile.startMs);
        if (!frame) continue;
        const w = Math.max(1, tile.width - 1);
        this.renderer.resize(w, height, input.dpr);
        this.renderer.render(frame);
        context.drawImage(this.scratch, tile.x * input.dpr, 0, w * input.dpr, height * input.dpr);
      } catch {
        this.stats.failed++;
      }
    }
    const elapsed = performance.now() - started;
    this.stats.drawn = this.drawn.size;
    this.stats.pending = ready.length - count;
    this.stats.lastDrawMs = elapsed;
    this.stats.totalMs += elapsed;
    return this.stats.pending > 0;
  }
}
