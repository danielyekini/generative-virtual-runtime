/** Full corpus gate over recaptures plus proven identical renderer inputs. */
import { readFileSync,writeFileSync,copyFileSync,readdirSync,mkdirSync } from 'node:fs';
import {resolve} from 'node:path';
import {checkVisualWindow} from '../evaluation/harness/visual-gate';
const run=resolve('docs/evaluations',readFileSync('work/current-run','utf8'));
const scratch=resolve('evaluation/evidence');
const baseline=JSON.parse(readFileSync(resolve(run,'evidence/baseline/render-results.json'),'utf8'));
const captured=JSON.parse(readFileSync(resolve(scratch,'render-results.json'),'utf8'));
const jobs=JSON.parse(readFileSync(resolve(run,'final-full-render-jobs.json'),'utf8')).jobs;
const ledger=JSON.parse(readFileSync(resolve(run,'capture-reuse-ledger.json'),'utf8')).jobs;
const settings=JSON.parse(readFileSync(resolve(run,'gate-settings.json'),'utf8'));
if(baseline.controls.userAgent!==captured.controls.userAgent)throw new Error('Browser changed; cannot combine captures');
if(!captured.controls.lottieControl.timeControlWorks)throw new Error('Current time control failed');
const fixtures=[];
for(const job of jobs){
 const reuse=ledger.find((l:any)=>l.job===job.id);
 const old=baseline.fixtures.find((r:any)=>r.id===job.id);
 const fresh=captured.fixtures.find((r:any)=>r.id===job.id);
 if(!reuse.reused){if(!fresh)throw new Error('Missing recapture '+job.id);fixtures.push(fresh);continue;}
 const folder=resolve(scratch,'captures',job.id);mkdirSync(folder,{recursive:true});
 for(const name of readdirSync(resolve(run,'evidence/baseline/captures',job.id))){
  if(name.endsWith('.png'))copyFileSync(resolve(run,'evidence/baseline/captures',job.id,name),resolve(folder,name));
 }
 const frames=[...old.frames.map((f:any)=>({...f,captureProvenance:{kind:'reused-exact-renderer-input',originalRunEvidence:'evidence/baseline/render-results.json',originalJob:job.id,ledger:'capture-reuse-ledger.json'}})),...(fresh?.frames??[])];
 const frameById=new Map(frames.map((f:any)=>[f.id,f]));
 const ordered=job.samples.map((s:any)=>frameById.get(s.id)??{id:s.id,scheduled:s.scheduled,sourceTimeMs:s.sourceTimeMs,lottieFrame:s.lottieFrame,status:'NOT_RUN'});
 const referenceVerified=old.referenceStatus==='PASS'&&old.referenceRepeatIdentical&&old.prepared.notes.length===0&&(!fresh||(fresh.referenceStatus==='PASS'&&fresh.referenceRepeatIdentical&&fresh.prepared.notes.length===0));
 const visualWindow=checkVisualWindow({scheduled:ordered.filter((f:any)=>f.scheduled&&f.visualGate).map((f:any)=>f.visualGate),extra:ordered.filter((f:any)=>!f.scheduled&&f.visualGate).map((f:any)=>f.visualGate),expectedScheduled:job.samples.filter((s:any)=>s.scheduled).length,expectedExtra:job.samples.filter((s:any)=>!s.scheduled).length,fullWindow:true,materialReview:'NOT_RUN',referenceVerified},settings.visualCertification);
 fixtures.push({...old,frames:ordered,visualWindow,referenceRepeatIdentical:old.referenceRepeatIdentical&&(!fresh||fresh.referenceRepeatIdentical),
  referenceStatus:referenceVerified?'PASS':old.referenceStatus,nativeStatus:fresh&&fresh.nativeStatus!=='PASS'?fresh.nativeStatus:old.nativeStatus,
  captureProvenance:{kind:'baseline-renderer-input-equality-plus-new-source-boundaries',originalRecord:'evidence/baseline/render-results.json',newRecord:'render-results-recaptured.json',ledger:'capture-reuse-ledger.json'},
  supplementalReferenceLogs:fresh?.logs??[],supplementalPrepared:fresh?.prepared??null});
}
writeFileSync(resolve(scratch,'render-results-recaptured.json'),JSON.stringify(captured,null,2)+'\n');
writeFileSync(resolve(scratch,'render-jobs-recaptured.json'),readFileSync(resolve(scratch,'render-jobs.json')));
writeFileSync(resolve(scratch,'render-jobs.json'),JSON.stringify({jobs},null,2)+'\n');
writeFileSync(resolve(scratch,'render-results.json'),JSON.stringify({...captured,fixtures,combinedGate:'Exact renderer-input capture reuse over complete original schedules, plus all new source-key extra captures. No changed fixture reuses native frames; full corpus re-gated with the frozen settings.'},null,2)+'\n');
console.log(fixtures.map((f:any)=>({id:f.id,frames:f.frames.length,numericPass:f.visualWindow.numericPass,status:f.visualWindow.status})));
