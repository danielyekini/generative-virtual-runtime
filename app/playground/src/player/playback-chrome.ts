/** Floating playback chrome (P025). Idle time before the overlay hides. */
export const PLAYBACK_IDLE_MS = 5000;

/** Interactive scenes reveal only inside a pad around the control cluster. */
export function playbackHotspotContains(
  interactive: boolean,
  point: { x: number; y: number },
  hotspot: { left: number; top: number; right: number; bottom: number },
  pad = 28,
): boolean {
  if (!interactive) return true;
  return (
    point.x >= hotspot.left - pad &&
    point.x <= hotspot.right + pad &&
    point.y >= hotspot.top - pad &&
    point.y <= hotspot.bottom + pad
  );
}

/**
 * Full frame tiles when the user opted in, when Stream/Generate is the mode
 * default, or while the pointer is scrubbing a white-line tape.
 */
export function showFrameTape(options: {
  stream: boolean;
  generate: boolean;
  override: boolean | null;
  scrubbing: boolean;
}): boolean {
  if (options.scrubbing) return true;
  if (options.override !== null) return options.override;
  return options.stream || options.generate;
}
