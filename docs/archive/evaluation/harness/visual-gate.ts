export interface Raster {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface VisualRules {
  aggregate: { maxFrameFractionBeyond: number; maxWindowMeanFractionBeyond: number };
  localRegions: {
    tileSizePx: number; gridOffsetsPx: number[]; maxForegroundFractionBeyond: number;
    minForegroundDenominatorPx: number; foregroundThreshold: number; backgroundRgb: number[];
  };
  alpha: { requiredByte: number };
}

export interface FrameGate {
  comparable: boolean;
  passed: boolean;
  fractionBeyond: number | null;
  maxLocalFractionBeyond: number | null;
  alphaFailures: number;
  failedRegions: { x: number; y: number; hot: number; foreground: number; fraction: number }[];
}

/** Numeric gate only: never substitutes for reference validation or material review. */
export function checkVisualFrame(reference: Raster, native: Raster, rules: VisualRules, threshold: number): FrameGate {
  const count = reference.width * reference.height;
  if (count <= 0 || reference.width !== native.width || reference.height !== native.height ||
      reference.data.length !== count * 4 || native.data.length !== count * 4) {
    return { comparable: false, passed: false, fractionBeyond: null, maxLocalFractionBeyond: null, alphaFailures: 0, failedRegions: [] };
  }
  const local = rules.localRegions;
  const grids = local.gridOffsetsPx.map(offset => ({ offset, tiles: new Map<string, { x: number; y: number; hot: number; foreground: number }>() }));
  let hotCount = 0, alphaFailures = 0;
  const distance2 = (data: ArrayLike<number>, i: number, rgb: number[]) =>
    (data[i]! - rgb[0]!) ** 2 + (data[i+1]! - rgb[1]!) ** 2 + (data[i+2]! - rgb[2]!) ** 2;
  for (let y = 0; y < reference.height; y++) {
    for (let x = 0; x < reference.width; x++) {
      const i = (y * reference.width + x) * 4;
      const hot = (reference.data[i]! - native.data[i]!) ** 2 +
        (reference.data[i+1]! - native.data[i+1]!) ** 2 +
        (reference.data[i+2]! - native.data[i+2]!) ** 2 > threshold ** 2;
      const foreground = distance2(reference.data, i, local.backgroundRgb) > local.foregroundThreshold ** 2 ||
        distance2(native.data, i, local.backgroundRgb) > local.foregroundThreshold ** 2;
      if (hot) hotCount++;
      if (reference.data[i+3] !== rules.alpha.requiredByte || native.data[i+3] !== rules.alpha.requiredByte) alphaFailures++;
      if (!hot && !foreground) continue;
      for (const grid of grids) {
        const tx = Math.floor((x-grid.offset)/local.tileSizePx), ty = Math.floor((y-grid.offset)/local.tileSizePx);
        const key = `${tx},${ty}`;
        let tile = grid.tiles.get(key);
        if (!tile) { tile = { x: tx*local.tileSizePx+grid.offset, y: ty*local.tileSizePx+grid.offset, hot: 0, foreground: 0 }; grid.tiles.set(key, tile); }
        if (hot) tile.hot++;
        if (foreground) tile.foreground++;
      }
    }
  }
  const tiles = grids.flatMap(grid => [...grid.tiles.values()].map(tile => ({ ...tile, fraction: tile.hot/Math.max(local.minForegroundDenominatorPx, tile.foreground) })));
  const failedRegions = tiles.filter(tile => tile.fraction > local.maxForegroundFractionBeyond);
  const fractionBeyond = hotCount/count;
  return { comparable: true, passed: fractionBeyond <= rules.aggregate.maxFrameFractionBeyond && failedRegions.length === 0 && alphaFailures === 0,
    fractionBeyond, maxLocalFractionBeyond: Math.max(0, ...tiles.map(tile => tile.fraction)), alphaFailures, failedRegions };
}

export function checkVisualWindow(input: {
  scheduled: FrameGate[]; extra: FrameGate[]; expectedScheduled: number; expectedExtra: number;
  fullWindow: boolean; materialReview: "PASS" | "FAIL" | "NOT_RUN"; referenceVerified: boolean;
}, rules: VisualRules) {
  const all = [...input.scheduled, ...input.extra];
  const complete = input.fullWindow && input.expectedScheduled > 0 && input.scheduled.length === input.expectedScheduled &&
    input.extra.length === input.expectedExtra && all.every(frame => frame.comparable);
  const mean = input.scheduled.length && input.scheduled.every(frame => frame.fractionBeyond !== null)
    ? input.scheduled.reduce((sum, frame) => sum + frame.fractionBeyond!, 0)/input.scheduled.length : null;
  const numericPass = complete && all.every(frame => frame.passed) && mean !== null && mean <= rules.aggregate.maxWindowMeanFractionBeyond;
  const status = !input.referenceVerified ? "BLOCKED" :
    all.some(frame => !frame.passed) || input.materialReview === "FAIL" || (complete && mean !== null && mean > rules.aggregate.maxWindowMeanFractionBeyond) ? "FAIL" :
    !complete ? "NOT_RUN" : input.materialReview !== "PASS" ? "VISUAL_UNVERIFIED" : "PASS";
  return { status, numericPass, complete, meanFractionBeyond: mean, capturedScheduled: input.scheduled.length, expectedScheduled: input.expectedScheduled,
    capturedExtra: input.extra.length, expectedExtra: input.expectedExtra, materialReview: input.materialReview };
}
