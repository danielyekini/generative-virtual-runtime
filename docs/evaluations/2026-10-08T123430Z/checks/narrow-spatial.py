from pathlib import Path
import json
p=Path('packages/format-lottie/src/normalise.ts');s=p.read_text();s=s.replace('  const span = hi - lo;\n  const samples:', '''  const spatial = keyframes.some(key => key.spatial !== undefined);
  if (spatial) notes.push({ feature: "spatial-window-clipping", level: "approximated", target,
    message: "Composition-window clipping retains legacy spatial geometry; an exact spatial subcurve is not lowered." });
  const span = hi - lo;
  const samples:''');s=s.replace('sampleTrackValue(startMs, durationMs, keyframes, lo)','sampleTrackValue(startMs, durationMs, keyframes, lo, !spatial)').replace('sampleTrackValue(startMs, durationMs, keyframes, hi)','sampleTrackValue(startMs, durationMs, keyframes, hi, !spatial)');s=s.replace('  const startEasing = clippedEasing(', '  const startEasing = spatial ? easingCrossing(startMs, durationMs, keyframes, lo) : clippedEasing(');s=s.replace('easing: clippedEasing(startMs, durationMs, keyframes, time,','easing: spatial ? key.easing : clippedEasing(startMs, durationMs, keyframes, time,');s=s.replace('  timeMs: number,\n): number | Vec2','  timeMs: number,\n  preserveEasing = true,\n): number | Vec2');s=s.replace('  const local = applySegmentEasing(from.easing, span === 0 ? 0 : (progress - from.offset) / span);','  const progressInSegment = span === 0 ? 0 : (progress - from.offset) / span;\n  const local = preserveEasing ? applySegmentEasing(from.easing, progressInSegment) : progressInSegment;');idx=s.index('function nextKeyTime(');s=s[:idx]+'''function easingCrossing(startMs: number, durationMs: number, keys: Keyframe[], timeMs: number): SegmentEasing | undefined {
  const progress = (timeMs - startMs) / durationMs;
  return keys.find((key, i) => keys[i + 1] && progress >= key.offset - 1e-12 && progress < keys[i + 1]!.offset - 1e-12)?.easing;
}

'''+s[idx:];p.write_text(s)
p=Path('packages/format-lottie/src/lottie.test.ts');s=p.read_text();idx=s.index('  it("places solid layers over composition bounds not centred at origin"');s=s[:idx]+'''  it("reports clipped spatial geometry as approximate", () => {
    const raw = JSON.parse(readFileSync(join(fixtureDir, "track_outside_duration.json"), "utf8"));
    const keys = raw.layers[0].ks.p.k;
    keys[0].to = [20, 80, 0];
    keys[0].ti = [-20, -40, 0];
    const result = importSource(lottieAdapter, JSON.stringify(raw));
    expect(result.ok).toBe(true);
    expect(result.fidelity.overall).toBe("degraded");
    expect(result.diagnostics.some(item => item.feature === "spatial-window-clipping" && item.fidelity === "approximated")).toBe(true);
    expect(validateSceneIR(result.scene).ok).toBe(true);
    expect(verifyRoundTrip(result.scene!).ok).toBe(true);
  });

'''+s[idx:];p.write_text(s)
p=Path('packages/schema/capabilities/registry.json');s=p.read_text();old='Spatial tangents on position tracks keep optional Z; runtime samples arc length in XYZ when Z is present.';new='Unclipped spatial tangents on position tracks keep optional Z; runtime samples arc length in XYZ when Z is present. Composition-window clipping retains legacy spatial geometry and is explicitly approximate until exact spatial subcurves are lowered.';s=s.replace(json.dumps(old),json.dumps(new));a=s.index('"id": "geometry.spatialCurve"');b=s.index('\n    },',a);part=s[a:b].replace('"status": "exact"','"status": "approximate"').replace('"packages/runtime/src/runtime.test.ts#samples spatial position keys by arc length"\n          ]','"packages/runtime/src/runtime.test.ts#samples spatial position keys by arc length",\n            "packages/format-lottie/src/lottie.test.ts#reports clipped spatial geometry as approximate"\n          ]');s=s[:a]+part+s[b:];p.write_text(s)
p=Path('packages/format-lottie/CHANGELOG.md');s=p.read_text().replace('Degenerate equal-easing-endpoint intervals remain explicitly approximate.','Degenerate equal-easing-endpoint intervals remain explicitly approximate. Clipped spatial paths retain their existing geometry and now report an approximation until exact spatial subcurves are implemented.');p.write_text(s)
