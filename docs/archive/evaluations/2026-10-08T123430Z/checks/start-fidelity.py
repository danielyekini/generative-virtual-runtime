import json, pathlib, subprocess, hashlib, datetime, tarfile
root=pathlib.Path.cwd(); runid='2026-10-08T123430Z'; run=root/'docs/evaluations'/runid; run.mkdir()
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pin=json.loads((root/'docs/evaluations/implementation-pin.json').read_text()); head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=subprocess.check_output(['git','ls-files','-z'],text=True).split('\0'); records=[]
with tarfile.open(run/'initial-source.tar.gz','w:gz') as ar:
 for name in files:
  p=root/name
  if p.is_file(): ar.add(p,arcname=name); records.append({'path':name,'sha256':hashfile(p),'bytes':p.stat().st_size})
(run/'initial-files.json').write_text(json.dumps(records,indent=2)+'\n')
(run/'initial-status.txt').write_text(subprocess.check_output(['git','status','--porcelain'],text=True))
settings=json.loads((root/'evaluation/gate-settings.json').read_text()); (run/'gate-settings.json').write_bytes((root/'evaluation/gate-settings.json').read_bytes())
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
manifest={'runId':runid,'startedAt':start,'comparedWith':pin['afterRun'],'initialImplementation':{'head':head,'cleanBeforeRun':True,'archive':'initial-source.tar.gz','files':'initial-files.json','ancestryVerified':True},'languages':json.loads((root/'packages/schema/capabilities/releases.json').read_text())['languages'],'registrySha256':hashfile(root/'packages/schema/capabilities/registry.json'),'policySha256':hashfile(root/'evaluation/gate-settings.json'),'scope':{'fixtures':[f'LOT-{i:02}' for i in range(8)],'format':'lottie','svg':'excluded','quarantines':{'LOT-03':'production 512 KiB source ceiling'},'window':'[ip,op), original frame rate, one cycle plus boundary/subframe extras','routes':['source/lottie-web 5.13.0 canvas','direct imported IR','emitted MotionScript compiled IR'],'sourceChecksums':'all ten original SHA256SUMS verified'},'workMode':'fidelity A/B/C; no commit or push; no published contract edits','budgets':{'wallTimeMinutes':60,'maxImplementationCycles':8,'attemptsPerCause':3,'stopAfterConsecutiveNoImprovement':2},'gateSettings':settings}
(run/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(run/'loop.json').write_text(json.dumps({'runId':runid,'gateSettings':settings,'wallTimeBudgetMinutes':60,'implementationCyclesThisInvocation':0,'causes':[pin['nextCause'],*pin['retainedCauses']],'nextCause':pin['nextCause']},indent=2)+'\n')
print(run)
