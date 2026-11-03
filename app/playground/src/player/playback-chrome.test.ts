import { describe, expect, it } from "vitest";
import { playbackHotspotContains, showFrameTape } from "./playback-chrome";

const hotspot = { left: 20, top: 400, right: 600, bottom: 470 };

describe("floating playback chrome (P025)", () => {
  it("reveals anywhere on a non-interactive canvas", () => {
    expect(playbackHotspotContains(false, { x: 10, y: 10 }, hotspot)).toBe(true);
  });

  it("reveals an interactive scene only near the control cluster", () => {
    expect(playbackHotspotContains(true, { x: 300, y: 200 }, hotspot)).toBe(false);
    expect(playbackHotspotContains(true, { x: 40, y: 390 }, hotspot)).toBe(true);
  });

  it("uses a white line for Run and frames for Stream, Generate, override, and scrub", () => {
    expect(showFrameTape({ stream: false, generate: false, override: null, scrubbing: false })).toBe(false);
    expect(showFrameTape({ stream: true, generate: false, override: null, scrubbing: false })).toBe(true);
    expect(showFrameTape({ stream: false, generate: true, override: null, scrubbing: false })).toBe(true);
    expect(showFrameTape({ stream: true, generate: false, override: false, scrubbing: false })).toBe(false);
    expect(showFrameTape({ stream: false, generate: false, override: true, scrubbing: false })).toBe(true);
    expect(showFrameTape({ stream: false, generate: false, override: false, scrubbing: true })).toBe(true);
  });
});
