from pathlib import Path
from PIL import Image
import numpy as np
import json,math,sys
r=Path('docs/evaluations/2026-10-08T123430Z');settings=json.loads((r/'gate-settings.json').read_text());rules=settings['visualCertification'];bg=np.array(rules['localRegions']['backgroundRgb'],dtype=np.int32);threshold=settings['pixel']['inspectionThreshold'];size=rules['localRegions']['tileSizePx']
def frame_gate(reference,native):
 a=np.asarray(Image.open(reference).convert('RGBA')).astype(np.int32);b=np.asarray(Image.open(native).convert('RGBA')).astype(np.int32)
 if a.shape!=b.shape:return {'comparable':False,'passed':False,'fractionBeyond':None,'maxLocalFractionBeyond':None,'alphaFailures':0,'failedRegions':[]}
 height,width=a.shape[:2];d=a[:,:,:3]-b[:,:,:3];hot=(d*d).sum(axis=2)>threshold**2
 fa=a[:,:,:3]-bg;fb=b[:,:,:3]-bg;fg=((fa*fa).sum(axis=2)>rules['localRegions']['foregroundThreshold']**2)|((fb*fb).sum(axis=2)>rules['localRegions']['foregroundThreshold']**2)
 alpha=int(((a[:,:,3]!=255)|(b[:,:,3]!=255)).sum());failed=[];localmax=0
 for offset in rules['localRegions']['gridOffsetsPx']:
  for ty in range(math.floor(-offset/size),math.floor((height-1-offset)/size)+1):
   y=ty*size+offset;y0=max(0,y);y1=min(height,y+size)
   for tx in range(math.floor(-offset/size),math.floor((width-1-offset)/size)+1):
    x=tx*size+offset;x0=max(0,x);x1=min(width,x+size);hh=int(hot[y0:y1,x0:x1].sum());ff=int(fg[y0:y1,x0:x1].sum());fraction=hh/max(rules['localRegions']['minForegroundDenominatorPx'],ff);localmax=max(localmax,fraction)
    if fraction>rules['localRegions']['maxForegroundFractionBeyond']:failed.append({'x':x,'y':y,'hot':hh,'foreground':ff,'fraction':fraction})
 fraction=float(hot.sum())/(width*height)
 return {'comparable':True,'passed':fraction<=rules['aggregate']['maxFrameFractionBeyond'] and not failed and alpha==0,'fractionBeyond':fraction,'maxLocalFractionBeyond':localmax,'alphaFailures':alpha,'failedRegions':failed}
if sys.argv[1]=='validate':
 original=json.loads((r/'baseline-live/capture-summary.json').read_text());checked=0
 for fixture in original['fixtures']:
  if not fixture['id'].startswith('LOT-07'):continue
  for frame in fixture['frames']:
   path=r/'baseline-live/captures'/fixture['id'];gate=frame_gate(path/(frame['id']+'-reference.png'),path/(frame['id']+'-native.png'))
   expected=frame['visualGate'].copy();gate['failedRegions']=sorted(gate['failedRegions'],key=lambda x:(x['x'],x['y']));expected['failedRegions']=sorted(expected['failedRegions'],key=lambda x:(x['x'],x['y']));
   if gate!=expected:raise RuntimeError((fixture['id'],frame['id'],gate,expected))
   checked+=1
 (r/'vectorized-gate-validation.json').write_text(json.dumps({'policyHash':__import__('hashlib').sha256((r/'gate-settings.json').read_bytes()).hexdigest(),'oracle':'Unmodified evaluation/harness/visual-gate.ts; baseline-live/capture-summary.json','decodedFrameComparisons':checked,'allNumericFieldsIdentical':True,'failedRegionMembershipIdentical':True,'ordering':'Region arrays normalized by x/y solely for equivalence comparison; no acceptance values altered','purpose':'Fast independent post-capture coverage recomputation; no production harness or threshold changed'},indent=2)+'\n');print('Exact policy equivalence on',checked,'actual baseline comparisons');sys.exit()
e=Path(sys.argv[1]);schedule=json.loads((r/'full-render-jobs.json').read_text());out=[]
for job in schedule['jobs']:
 frames=[];referenceCount=0;nativeCount=0;errors=[]
 for sample in job['samples']:
  a=e/'captures'/job['id']/(sample['id']+'-reference.png');b=e/'captures'/job['id']/(sample['id']+'-native.png')
  if a.exists():referenceCount+=1
  if b.exists():nativeCount+=1
  if not a.exists() or not b.exists():continue
  try:gate=frame_gate(a,b)
  except Exception as ex:errors.append({'id':sample['id'],'error':str(ex)});continue
  frames.append({**sample,'visualGate':gate})
 scheduled=[f for f in frames if f['scheduled']];extra=[f for f in frames if not f['scheduled']];expectedScheduled=sum(s['scheduled'] for s in job['samples']);expectedExtra=len(job['samples'])-expectedScheduled;complete=len(scheduled)==expectedScheduled and len(extra)==expectedExtra and expectedScheduled>0
 mean=sum(f['visualGate']['fractionBeyond'] for f in scheduled)/len(scheduled) if scheduled else None
 item={'id':job['id'],'referenceCount':referenceCount,'nativeCount':nativeCount,'capturedScheduled':len(scheduled),'expectedScheduled':expectedScheduled,'capturedExtra':len(extra),'expectedExtra':expectedExtra,'complete':complete,'meanFractionBeyondCaptured':mean,'fullWindowMeanFractionBeyond':mean if complete else None,'numericFailureCount':sum(not f['visualGate']['passed'] for f in frames),'numericPass':complete and not errors and all(f['visualGate']['passed'] for f in frames) and mean<=rules['aggregate']['maxWindowMeanFractionBeyond'],'materialReview':'NOT_RUN','referenceStatus':'NOT_RUN','worst':sorted(frames,key=lambda f:f['visualGate']['fractionBeyond'],reverse=True)[:5],'frames':frames,'errors':errors}
 out.append(item);print(item['id'],item['capturedScheduled'],item['expectedScheduled'],item['fullWindowMeanFractionBeyond'],item['numericFailureCount'],flush=True)
(e/'numeric-coverage.json').write_text(json.dumps({'authority':'full-render-jobs.json; frozen settings; vectorized-gate-validation.json','fixtures':out},indent=2)+'\n')
