from pathlib import Path
import json, shutil, datetime

run = Path('docs/evaluations') / Path('work/current-run').read_text()
loop = json.loads((run/'loop.json').read_text())
cause = next(x for x in loop['causes'] if x['id']=='visual.layerPaintOrder')
assert cause['attempts'] == 0 and cause['remainingAttempts'] == 3
cause.update({'phase':'A','attempts':1,'remainingAttempts':2,'status':'IMPLEMENTING',
 'hypothesis':'Separate composition paint/opacity/visibility containment from Lottie transform parenting with published transform.parent.',
 'ownerBoundary':'format-lottie normalise/placeLayers',
 'expectedResult':'Global reverse source layer order; unchanged source transforms; only composition containment opacity/visibility inherited.',
 'attemptStartedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'baselineEvidence':'evidence/baseline/render-results.json; evidence/paint-order-counterfactual/results.json'})
loop.update({'phase':'A','cycles':1,'nextCause':cause})
(run/'loop.json').write_text(json.dumps(loop,indent=2)+'\n')

p=Path('packages/format-lottie/src/normalise.ts');s=p.read_text()
s=s.replace('  lerpPathCommands,','  lerpPathCommands,\n  traversalOrder,',1)
s=s.replace('  layerIdByIndex: Map<string, string>;\n','').replace('    layerIdByIndex: new Map<string, string>(),\n','')
s=s.replace('  scopeKey: string;\n','').replace('    scopeKey: "root",\n','')
s=s.replace('  const savedScope = ctx.scopeKey;\n','').replace('  ctx.scopeKey = `asset:${asset.id}`;\n','').replace('  ctx.scopeKey = savedScope;\n','')
old='''  // Lottie paints by global layer list order (earlier = on top). Scene IR draws
  // by hierarchical zIndex, so a parent null listed below the sky would bury
  // its children. Lift each layer's zIndex to the max stack score among itself
  // and its descendants so parenting does not invert global paint order.
  placeLayers(lower, supportedLayers, maxOrder, null);'''
assert old in s
s=s.replace(old,'''  // Source layer parenting is a transform chain, not paint containment.
  placeLayers(lower, supportedLayers, maxOrder, null);
  // Emit declaration order in paint order too: isolated render scopes consume
  // their children in declaration order, while flat draw lists sort by zIndex.
  lower.nodes = traversalOrder(lower.nodes);''')
old='''  const layerZIndex = stackZIndexes(layers, maxOrder);
  for (const layer of orderParentsBeforeChildren(layers)) {
    const zIndex = layerZIndex.get(layer.index) ?? (maxOrder - layer.arrayOrder) * 10;
    const linked = layer.parentIndex !== undefined ? lower.layerIdByIndex.get(`${lower.scopeKey}:${layer.parentIndex}`) : undefined;
    const parentId = linked ?? hostParent;'''
assert old in s
s=s.replace(old,'''  // This map is local to the composition expansion, so reused precomp assets
  // cannot accidentally link to another instance's transform parents.
  const layerIdByIndex = new Map<number, string>();
  for (const layer of orderParentsBeforeChildren(layers)) {
    const zIndex = (maxOrder - layer.arrayOrder) * 10;
    const linked = layer.parentIndex !== undefined ? layerIdByIndex.get(layer.parentIndex) : undefined;
    const parentId = hostParent;''')
s=s.replace('    lower.layerIdByIndex.set(`${lower.scopeKey}:${layer.index}`, layerId.id);','    layerIdByIndex.set(layer.index, layerId.id);')
s=s.replace('      ...(lottieParent && parentId ? { transformParentId: parentId, inheritOpacity: false as const } : {}),','      ...(linked ? { transformParentId: linked } : {}),')
start=s.index('/**\n * Scene IR cannot interleave a child above an uncle.')
end=s.index('/** Stable topological order:',start)
s=s[:start]+s[end:];p.write_text(s)

p=Path('packages/format-lottie/src/lottie.test.ts');s=p.read_text()
s=s.replace('node.id === "layer_1.layer_2"','node.id === "layer_2"').replace('expect(child?.parentId).toBe("layer_1");','expect(child?.parentId).toBeNull();\n    expect(child?.transformParentId).toBe("layer_1");')
s=s.replace('node.id === "layer_10.layer_2"','node.id === "layer_2"').replace('expect(child?.parentId).toBe("layer_10");','expect(child?.parentId).toBeNull();\n    expect(child?.transformParentId).toBe("layer_10");').replace('const dot = "layer_10.layer_2.Dot"','const dot = "layer_2.Dot"')
p.write_text(s)

for name, source in [('parent_interleaved_layers','interleaved'),('parent_precomp_containment','precomp')]:
 shutil.copyfile(run/'evidence/parent-order-probe/baseline-v3'/f'{source}-source.json',Path('fixtures/import/lottie')/f'{name}.json')

p=Path('packages/format-lottie/package.json');d=json.loads(p.read_text());d['version']='0.1.5';p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('packages/format-lottie/src/model.ts');p.write_text(p.read_text().replace('LOTTIE_ADAPTER_VERSION = "0.1.4"','LOTTIE_ADAPTER_VERSION = "0.1.5"'))
p=Path('package-lock.json');d=json.loads(p.read_text());d['packages']['packages/format-lottie']['version']='0.1.5';p.write_text(json.dumps(d,indent=2)+'\n')
p=Path('packages/format-lottie/CHANGELOG.md');s=p.read_text();s=s.replace('# @gvr/format-lottie\n','# @gvr/format-lottie\n\n## 0.1.5\n\nKeep each layer in its composition paint list, with reverse source order independent of transform parenting. Use the published `transformParentId` field for parent-local motion; inherit opacity and visibility only from composition containment. Scope parent lookup to each expansion so reused precomp assets retain their own chains. Canonical declaration order also preserves paint order in isolated render scopes. MotionScript and Scene IR remain 0.5.0, wire 0.2; no new syntax, schema, sampling rule or published release changes. Whole-fixture visual certification remains a separate gate.\n',1);p.write_text(s)
print('Recorded attempt 1/3 and applied importer correction; conformance/registry follow before verification.')
