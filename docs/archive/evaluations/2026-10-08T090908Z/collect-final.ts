import { existsSync,readFileSync,writeFileSync,statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { checkVisualFrame,checkVisualWindow } from '../evaluation/harness/visual-gate';
const require=createRequire(import.meta.url),{PNG}=require('../evaluation/node_modules/pngjs');
const evidence=resolve('evaluation/evidence'),run=resolve('docs/evaluations',readFileSync('work/run-id','utf8'));
const rules=JSON.parse(readFileSync('evaluation/gate-settings.json','utf8'));
const jobs=JSON.parse(readFileSync(resolve(evidence,'render-jobs.json'),'utf8')).jobs;
const controls=JSON.parse(readFileSync('work/route-preparation-and-repeat.json','utf8')).outcomes;
const start=statSync(resolve(evidence,'captures/LOT-07-imported/frame_00000-reference.png')).mtimeMs;
let raw:any;
if(existsSync(resolve(evidence,'render-results.json'))){const candidate=JSON.parse(readFileSync(resolve(evidence,'render-results.json'),'utf8'));if(candidate.fixtures.find((x:any)=>x.id==='LOT-02-imported')?.visualWindow?.expectedScheduled>0)raw=candidate;}
const fixtures=[];
for(const job of jobs){
 const completed=raw?.fixtures.find((x:any)=>x.id===job.id);
 if(completed){fixtures.push(completed);continue;}
 const directory=resolve(evidence,'captures',job.id),partialPath=resolve(directory,'partial-results.json');
 const partial=existsSync(partialPath)&&statSync(partialPath).mtimeMs>=start?JSON.parse(readFileSync(partialPath,'utf8')):{frames:[]};
 const frames=[];
 for(const sample of job.samples){
  const referencePath=resolve(directory,`${sample.id}-reference.png`),nativePath=resolve(directory,`${sample.id}-native.png`);
  const hasReference=existsSync(referencePath)&&statSync(referencePath).mtimeMs>=start-1;
  const hasNative=existsSync(nativePath)&&statSync(nativePath).mtimeMs>=start-1;
  if(!hasReference&&!hasNative)continue;
  const checkpoint=partial.frames.find((f:any)=>f.id===sample.id);
  const frame:any=checkpoint?{...checkpoint}:{...sample,timestampEvidence:'Pinned driver/job association; tail PNG exists but no per-frame seek checkpoint survived'};
  frame.reference=hasReference?{path:`captures/${job.id}/${sample.id}-reference.png`}:null;
  frame.native=hasNative?{path:`captures/${job.id}/${sample.id}-native.png`}:null;
  if(hasReference&&hasNative&&!frame.visualGate){frame.visualGate=checkVisualFrame(PNG.sync.read(readFileSync(referencePath)),PNG.sync.read(readFileSync(nativePath)),rules.visualCertification,rules.pixel.inspectionThreshold);}
  frames.push(frame);
 }
 const control=controls.find((x:any)=>x.id===job.id);
 const referenceVerified=Boolean(control?.referenceRepeatIdentical&&control?.identicalToPrimary&&control.prepared.notes.length===0&&control.logs.length===0);
 const materialReview=job.parentFixture==='LOT-00'?'PASS':job.parentFixture==='LOT-07'?'FAIL':'NOT_RUN';
 const scheduled=frames.filter(f=>f.scheduled&&f.visualGate).map(f=>f.visualGate),extra=frames.filter(f=>!f.scheduled&&f.visualGate).map(f=>f.visualGate);
 const window=checkVisualWindow({scheduled,extra,expectedScheduled:job.samples.filter((s:any)=>s.scheduled).length,expectedExtra:job.samples.filter((s:any)=>!s.scheduled).length,fullWindow:job.fullWindow===true,materialReview,referenceVerified},rules.visualCertification);
 fixtures.push({id:job.id,sceneKind:job.sceneKind,frames,visualWindow:window,prepared:control?.prepared??null,referenceStatus:referenceVerified?'PASS':job.sceneKind==='none'?'QUARANTINED':'FINAL_CONTROLS_NOT_RECORDED',referenceRepeatIdentical:control?.referenceRepeatIdentical??null,referenceControlEvidence:control?'route-preparation-and-repeat.json':null,actualReferenceFrames:frames.filter(f=>f.reference).length,actualNativeFrames:frames.filter(f=>f.native).length,expectedScheduled:job.samples.filter((s:any)=>s.scheduled).length,expectedExtra:job.samples.filter((s:any)=>!s.scheduled).length,source:'Partial checkpoints and current-invocation PNGs; incomplete comparisons never pass'});
}
writeFileSync(resolve(run,'final-route-results.json'),JSON.stringify({completedBrowserSchedule:Boolean(raw),finalCaptureStartMs:start,gateSettings:rules,fixtures},null,2)+'\n');
console.log(fixtures.map((f:any)=>({id:f.id,status:f.visualWindow.status,mean:f.visualWindow.meanFractionBeyond,captured:f.visualWindow.capturedScheduled,expected:f.visualWindow.expectedScheduled})));
