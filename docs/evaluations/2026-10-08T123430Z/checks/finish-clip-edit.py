import json
from pathlib import Path
p=Path('packages/format-lottie/src/normalise.ts');s=p.read_text().replace('clampTrackToScene(start, duration, keyframes, ctx.sceneDurationMs)','clampTrackToScene(start, duration, keyframes, ctx.sceneDurationMs, ctx.notes, nodeId)');s=s.replace('  sceneDurationMs: number,\n): { startMs:', '  sceneDurationMs: number,\n  notes: FidelityItem[],\n  target: string,\n): { startMs:');s=s.replace('Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, lo)))','Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, lo)), notes, target)').replace('Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, time)))','Math.min(hi, nextKeyTime(startMs, durationMs, keyframes, time)), notes, target)');s=s.replace('loMs: number, hiMs: number): SegmentEasing','loMs: number, hiMs: number, notes: FidelityItem[], target: string): SegmentEasing');s=s.replace('if (Math.abs(dy) < 1e-12) return easing; // Degenerate/oscillating intervals are outside this verified slice.','''if (Math.abs(dy) < 1e-12) {
    notes.push({ feature: "clipped-cubic", level: "approximated", target,
      message: "A clipped cubic interval with equal easing endpoint values cannot retain its interior excursion in one segment." });
    return easing;
  }''');p.write_text(s)
p=Path('packages/schema/capabilities/registry.json');x=json.loads(p.read_text());test='packages/format-lottie/src/lottie.test.ts#preserves cubic scalar and morph curves when both composition boundaries clip keys'
for cap in x['capabilities']:
 if cap['id'] in ['easing.cubicBezier','geometry.pathMorph']:
  cap['adapters']['lottie']['conformanceTests'].append(test)
  cap['adapters']['lottie']['scope']+=' Composition-window clipping samples original cubic values and renormalises retained Bezier subsegments; verified for nondegenerate scalar and matching-topology morph intervals. Degenerate equal-easing-endpoint intervals carry an approximation diagnostic.'
 if cap['id']=='paint.gradientStroke':
  cap['adapters']['lottie']['scope']=cap['adapters']['lottie']['scope'].replace('Wave instrumentation confirms a transformed-group gradient coordinate-space mismatch; exact source/reference fidelity for that variation is not claimed.','The historical Wave gradient creation-matrix attribution was not reproduced by controlled pixel comparisons in 2026-10-08T123430Z; full source/reference fidelity remains subject to the visual gate.')
# Preserve the registry's existing compact style outside the modified rows.
s=p.read_text()
for cap in x['capabilities']:
 if cap['id'] in ['easing.cubicBezier','geometry.pathMorph','paint.gradientStroke']:
  original=next(c for c in json.loads(s)['capabilities'] if c['id']==cap['id'])
  s=s.replace(json.dumps(original['adapters']['lottie']['scope']),json.dumps(cap['adapters']['lottie']['scope']))
  if cap['id'] in ['easing.cubicBezier','geometry.pathMorph']:
   last=original['adapters']['lottie']['conformanceTests'][-1];s=s.replace(json.dumps(last)+'\n',json.dumps(last)+',\n            '+json.dumps(test)+'\n')
p.write_text(s)
p=Path('packages/format-lottie/package.json');x=json.loads(p.read_text());x['version']='0.1.3';p.write_text(json.dumps(x,indent=2)+'\n')
p=Path('packages/format-lottie/src/model.ts');p.write_text(p.read_text().replace('LOTTIE_ADAPTER_VERSION = "0.1.2"','LOTTIE_ADAPTER_VERSION = "0.1.3"'))
p=Path('package-lock.json');s=p.read_text();x=json.loads(s);x['packages']['packages/format-lottie']['version']='0.1.3';p.write_text(json.dumps(x,indent=2)+'\n')
p=Path('packages/format-lottie/CHANGELOG.md');s=p.read_text().replace('# @gvr/format-lottie\n','# @gvr/format-lottie\n\n## 0.1.3\n\nPreserve source cubic values and renormalised Bezier subsegments when scalar or matching-topology morph tracks cross composition boundaries. This fixes the early Wave shape residual caused by linear boundary sampling and unsplit easing. Degenerate equal-easing-endpoint intervals remain explicitly approximate. No MotionScript, Scene IR, wire or sampling-contract change. Controlled gradient experiments in evaluation 2026-10-08T123430Z did not corroborate the earlier creation-coordinate attribution.\n',1);p.write_text(s)
