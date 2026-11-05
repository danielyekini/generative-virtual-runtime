import pathlib,json,hashlib,datetime,subprocess
r=pathlib.Path('docs/evaluations/2026-10-08T123430Z');e=pathlib.Path('evaluation/evidence');h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();entries=[]
for i in range(8):
 id=f'LOT-{i:02}';source=pathlib.Path('fixtures/corpus/lottie')/(id+'.json');dir=e/'fixtures'/id
 sourceJson=json.loads(source.read_text());entry={'sampleId':id,'source':{'path':str(source),'sha256':h(source),'bytes':source.stat().st_size},'observationWindow':{'startFrame':sourceJson['ip'],'endFrameExclusive':sourceJson['op'],'frameRate':sourceJson['fr'],'scheduledFrames':__import__('math').ceil(sourceJson['op']-sourceJson['ip'])},'languageReleases':{'motionscript':'0.5.0','sceneIr':'0.5.0'},'wireFamily':'0.2','scratchLineage':{'revisionId':None,'parentRevisionId':None,'parentHash':None,'registration':'unregistered generated evidence; no canonical promotion in this run'},'policySha256':h(pathlib.Path('evaluation/gate-settings.json')),'routes':{}}
 for name in ['generated.motion','imported-scene.json','compiled-scene.json']:
  p=dir/name
  if p.exists():entry['routes'][name]={'path':f'final-evidence/fixtures/{id}/{name}','sha256':h(p),'bytes':p.stat().st_size,'requiredCapabilities':json.loads(p.read_text()).get('requiredCapabilities',[]) if name.endswith('json') else json.loads((dir/'imported-scene.json').read_text()).get('requiredCapabilities',[])}
 if id=='LOT-03':entry['quarantine']='production 512 KiB source ceiling; diagnostic parse does not certify import'
 entries.append(entry)
(r/'source-program-ledger.json').write_text(json.dumps(entries,indent=2)+'\n')
files=[]
for base in ['packages','app','evaluation/harness']:
 for p in pathlib.Path(base).rglob('*'):
  if p.is_file() and 'node_modules' not in p.parts and 'dist' not in p.parts:files.append(p)
files.extend(pathlib.Path(n) for n in ['package.json','package-lock.json','tsconfig.json','vitest.config.ts','evaluation/package.json','evaluation/package-lock.json','evaluation/gate-settings.json'] if pathlib.Path(n).exists())
(r/'tested-execution-files.json').write_text(json.dumps([{'path':str(p),'sha256':h(p),'bytes':p.stat().st_size} for p in sorted(set(files))],indent=2)+'\n')
manifest=json.loads((r/'manifest.json').read_text());manifest['finalImplementation']={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'uncommitted':True,'sourceSnapshot':'source-snapshot/final-source.tar.gz','filesManifest':'source-snapshot/final-files.json','executionFiles':'tested-execution-files.json','packageVersions':{json.loads(p.read_text())['name']:json.loads(p.read_text())['version'] for p in pathlib.Path('packages').glob('*/package.json')}};manifest['wallTimeStart']='2026-10-08T12:34:30Z';manifest['deadline']='2026-10-08T13:34:30Z';manifest['captureStopReserve']='Stop captures by 13:29:30Z to finalise evidence inside budget';manifest['finalRegistrySha256']=h(pathlib.Path('packages/schema/capabilities/registry.json'));manifest['sourceProgramLedger']='source-program-ledger.json';manifest['preparationRegeneration']='regenerated-scene-equivalence.json';manifest['references']={'browser':'Chromium 151.0.7922.173','binary':'/usr/bin/chromium','player':'lottie-web 5.13.0 canvas','dpr':1,'subframes':True,'background':'#101014','timeControl':'goToAndStop(frame,true)','readiness':'DOMLoaded and fixture-specific logs/notes; repeat evidence recorded separately'};(r/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
