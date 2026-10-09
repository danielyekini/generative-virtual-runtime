/** Preserve actual progress if the hard budget precludes driver completion. */
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {checkVisualFrame,checkVisualWindow} from '../evaluation/harness/visual-gate';
import {classifyCapture} from '../evaluation/harness/render-status';
const {PNG}=createRequire(import.meta.url)('../evaluation/node_modules/pngjs');
const run=resolve('docs/evaluations',readFileSync('work/current-run','utf8'));
const scratch=resolve('evaluation/evidence');
const jobs=JSON.parse(readFileSync(resolve(scratch,'render-jobs.json'),'utf8')).jobs;
const settings=JSON.parse(readFileSync(resolve(run,'gate-settings.json'),'utf8'));
const log=readFileSync('work/final-browser.log','utf8');
const controlLine=log.split('\n').find(s=>s.startsWith('controls '));
if(!controlLine)throw new Error('No recorded actual reference controls');
const controls=JSON.parse(controlLine.slice('controls '.length));
const referenceProofPath=resolve(run,'evidence/reference-verification-current/results.json');
const referenceProof=existsSync(referenceProofPath)?JSON.parse(readFileSync(referenceProofPath,'utf8')).output:[];
const records=[];
const captureStartedAfter=statSync(resolve(run,'final-full-render-jobs.json')).mtimeMs;
const current=(p:string)=>existsSync(p)&&statSync(p).mtimeMs>=captureStartedAfter;
for(const job of jobs){
 const folder=resolve(scratch,'captures',job.id);
 const progress=current(resolve(folder,'partial-results.json'))?JSON.parse(readFileSync(resolve(folder,'partial-results.json'),'utf8')).frames:[];
 const persisted=new Map(progress.map((f:any)=>[f.id,f]));
 const frames=[];
 for(const sample of job.samples){
  const original=persisted.get(sample.id) as any;
  const frame:any=original?{...original}:{...sample,seekMetadata:'NOT_RECORDED; PNG association uses the exact deterministic driver job/index schedule, not wall-clock inference'};
  const ref=resolve(folder,sample.id+'-reference.png'),native=resolve(folder,sample.id+'-native.png');
  if(current(ref)){const p=PNG.sync.read(readFileSync(ref));frame.reference={width:p.width,height:p.height,path:`captures/${job.id}/${sample.id}-reference.png`};}
  if(current(native)){const p=PNG.sync.read(readFileSync(native));frame.native={width:p.width,height:p.height,path:`captures/${job.id}/${sample.id}-native.png`,sceneKind:job.sceneKind};}
  if(frame.reference&&frame.native&&!frame.visualGate){frame.visualGate=checkVisualFrame(PNG.sync.read(readFileSync(ref)),PNG.sync.read(readFileSync(native)),settings.visualCertification,settings.pixel.inspectionThreshold);}
  if(!frame.reference&&!frame.native)frame.status='NOT_RUN';
  frames.push(frame);
 }
 const logsPath=resolve(folder,'browser-log.txt');
 const logs=current(logsPath)?readFileSync(logsPath,'utf8').split('\n').filter(Boolean):['Preparation/post-window logs NOT_RECORDED because capture was interrupted'];
 const classified=classifyCapture({sceneKind:job.sceneKind,logs,referenceFrames:frames.filter((f:any)=>f.reference).length,nativeFrames:frames.filter((f:any)=>f.native).length,nativePrepared:frames.some((f:any)=>f.native)});
 const fixture=job.parentFixture;
 const proof=referenceProof.find((r:any)=>r.fixture===fixture);
 const referenceVerified=proof?.status==='PASS'&&logs.length===0&&frames.filter((f:any)=>f.reference).length===job.samples.length;
 const visualWindow=checkVisualWindow({scheduled:frames.filter((f:any)=>f.scheduled&&f.visualGate).map((f:any)=>f.visualGate),extra:frames.filter((f:any)=>!f.scheduled&&f.visualGate).map((f:any)=>f.visualGate),expectedScheduled:job.samples.filter((s:any)=>s.scheduled).length,expectedExtra:job.samples.filter((s:any)=>!s.scheduled).length,fullWindow:job.fullWindow===true,materialReview:'NOT_RUN',referenceVerified},settings.visualCertification);
 records.push({id:job.id,sceneKind:job.sceneKind,...classified,prepared:{ok:frames.some((f:any)=>f.native),notes:referenceVerified?[]:['Original driver preparation metadata NOT_RECORDED; do not infer readiness or certify from captures'],reference:'canvas',native:frames.some((f:any)=>f.native)},logs,frames,referenceRepeatIdentical:proof?.repeatIdentical??false,visualWindow,interrupted:true,referenceEvidence:proof?'evidence/reference-verification-current/results.json':null});
}
writeFileSync(resolve(scratch,'render-results.json'),JSON.stringify({controls,gateSettings:settings,fixtures:records,driverCompleted:false,reason:'Hard-budget capture stop; raw PNGs, actual periodic seek metadata and logs retained. Missing captures are NOT_RUN. Independent reference proof is applied only where explicitly recorded.'},null,2)+'\n');
console.log(records.map((r:any)=>({id:r.id,native:r.frames.filter((f:any)=>f.native).length,expected:r.frames.length,status:r.visualWindow.status})));
