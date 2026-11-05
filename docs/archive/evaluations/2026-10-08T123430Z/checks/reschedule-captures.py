from pathlib import Path
from PIL import Image
import json,subprocess,os,signal,shutil,datetime,hashlib
r=Path('docs/evaluations/2026-10-08T123430Z');e=Path('evaluation/evidence')
for line in subprocess.check_output(['ps','-eo','pid,args'],text=True).splitlines()[1:]:
 f=line.strip().split(None,1)
 if len(f)!=2:continue
 pid,args=int(f[0]),f[1]
 if args.startswith('/opt/codex/runtimes/') and 'drive-browser.ts' in args and '--import' in args:os.kill(pid,signal.SIGTERM)
 if args.startswith('/usr/lib/chromium/chromium ') and '--remote-debugging-port=9333 ' in args:
  try:os.killpg(pid,signal.SIGTERM)
  except ProcessLookupError:pass
(r/'capture-segment-2a').mkdir(exist_ok=True);shutil.copytree(e/'captures',r/'capture-segment-2a/captures');shutil.copy2('work/attempt2-browser.log',r/'capture-segment-2a/browser.log')
original=json.loads((e/'render-jobs.json').read_text());(r/'full-render-jobs.json').write_text(json.dumps(original,indent=2)+'\n')
updated=[];plan=[]
for job in original['jobs']:
 complete=[]
 for s in job['samples']:
  paths=[e/'captures'/job['id']/(s['id']+'-'+k+'.png') for k in ['reference','native']] if job['sceneKind']!='none' else [e/'captures'/job['id']/(s['id']+'-reference.png')]
  try:
   for p in paths:
    with Image.open(p) as im:im.verify()
   complete.append(s['id'])
  except (FileNotFoundError,OSError):pass
 if len(complete)==len(job['samples']):plan.append({'id':job['id'],'completedSamples':len(complete),'remainingSamples':0,'reason':'complete original window retained; no scope exclusion'});continue
 remaining=[s for s in job['samples'] if s['id'] not in complete]
 if complete:
  overlap=next(s for s in reversed(job['samples']) if s['id'] in complete);remaining=[overlap,*remaining]
  plan.append({'id':job['id'],'completedSamples':len(complete),'remainingSamples':len(remaining)-1,'repeatSample':overlap['id']})
 else:plan.append({'id':job['id'],'completedSamples':0,'remainingSamples':len(remaining)})
 updated.append({**job,'samples':remaining,'fullWindow':job['fullWindow'] if not complete else False,'coverageReason':'Resume unchanged implementation with original timestamps; combined gate uses immutable full-render-jobs.json. Partial segments cannot certify alone.'})
priority=['LOT-01','LOT-06','LOT-00','LOT-02','LOT-03','LOT-04','LOT-05']
updated.sort(key=lambda j:priority.index(j['parentFixture']))
(e/'render-jobs.json').write_text(json.dumps({'jobs':updated},indent=2)+'\n');(r/'capture-resumption.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'authoritativeSchedule':'full-render-jobs.json','sourceImplementationUnchanged':True,'plan':plan,'priority':priority,'noFixtureExcluded':'Complete route windows already captured are retained; every original expected sample remains in combined coverage. Duplicate boundary samples must match decoded pixels.','stage':'capture-segment-2a/'},indent=2)+'\n')
print([(j['id'],len(j['samples'])) for j in updated])
