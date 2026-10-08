import json
from pathlib import Path
x=json.loads(Path('fixtures/import/lottie/animated_path_morph.json').read_text());x['nm']='clipped_cubic_morph';x['ip']=10;x['op']=50
keys=x['layers'][0]['shapes'][0]['it'][0]['ks']['k']
for k in keys[:-1]:k.update(i={'x':0.667,'y':1},o={'x':0.333,'y':0})
x['layers'][0]['ks']['p']={'a':1,'k':[{'t':t,'s':[v,100],**({'i':{'x':0.667,'y':1},'o':{'x':0.333,'y':0}} if t<60 else {})} for t,v in [(0,0),(30,100),(60,0)]]}
Path('fixtures/import/lottie/clipped_cubic_morph.json').write_text(json.dumps(x,indent=2)+'\n')
p=Path('packages/format-lottie/src/lottie.test.ts');s=p.read_text().replace('import { transformPoint, validateSceneIR }','import { applySegmentEasing, transformPoint, validateSceneIR }');marker='  it("places solid layers over composition bounds not centred at origin", () => {'
test='''  it("preserves cubic scalar and morph curves when both composition boundaries clip keys", () => {
    const result = load("clipped_cubic_morph");
    expect(result.fidelity.overall).toBe("exact");
    expect(validateSceneIR(result.scene).ok).toBe(true);
    const emitted = compileMotionScript(emitMotionScript(result.scene!));
    expect(emitted.ok).toBe(true);
    const direct = new AnimationRuntime(result.scene!);
    const compiled = new AnimationRuntime(emitted.scene!);
    const curve = { type: "cubic" as const, x1: 0.333, y1: 0, x2: 0.667, y2: 1 };
    // Independent source-time oracle: do not compare two identically clipped routes alone.
    for (const frame of [10, 11, 20, 29.5, 30, 40, 49.5, 50, 20, 10]) {
      const u = applySegmentEasing(curve, (frame < 30 ? frame : frame - 30) / 30);
      const expectedPosition = frame < 30 ? 100 * u : 100 * (1 - u);
      const expectedMorphX = frame < 30 ? -20 - 20 * u : -40 + 20 * u;
      const timeMs = (frame - 10) * 1000 / 30;
      for (const runtime of [direct, compiled]) {
        const draw = runtime.evaluate(timeMs).drawItems[0]!;
        expect(draw.logicalMatrix[6], `position at source frame ${frame}`).toBeCloseTo(expectedPosition, 3);
        expect(draw.geometry.kind).toBe("path");
        if (draw.geometry.kind === "path") {
          const first = draw.geometry.commands[0]!;
          expect(first.cmd).toBe("M");
          if (first.cmd === "M") expect(first.x, `morph at source frame ${frame}`).toBeCloseTo(expectedMorphX, 3);
        }
      }
    }
  });

''';s=s.replace(marker,test+marker);p.write_text(s)
