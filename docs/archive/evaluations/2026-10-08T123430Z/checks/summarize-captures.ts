import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {checkVisualFrame,checkVisualWindow} from '../evaluation/harness/visual-gate';
const require=createRequire(resolve('evaluation/package.json'));const {PNG}=require('pngjs');
const dir=process.argv[2]!;const settings=JSON.parse(readFileSync(process.argv[3] ?? 'docs/evaluations/2026-10-08T123430Z/gate-settings.json','utf8'));
const jobs=JSON.parse(readFileSync(`${dir}/render-jobs.json`,'utf8')).jobs;
const fixtures=[];
for(const job of jobs){
 const frames=[];let referenceCount=0,nativeCount=0;
 for(const sample of job.samples){const r=`${dir}/captures/${job.id}/${sample.id}-reference.png`,n=`${dir}/captures/${job.id}/${sample.id}-native.png`;
  if(existsSync(r))referenceCount++;if(existsSync(n))nativeCount++;
  if(!existsSync(r)||!existsSync(n))continue;
  const gate=checkVisualFrame(PNG.sync.read(readFileSync(r)),PNG.sync.read(readFileSync(n)),settings.visualCertification,settings.pixel.inspectionThreshold);
  frames.push({...sample,visualGate:gate});
 }
 const scheduled=frames.filter(f=>f.scheduled).map(f=>f.visualGate),extra=frames.filter(f=>!f.scheduled).map(f=>f.visualGate);
 const window=checkVisualWindow({scheduled,extra,expectedScheduled:job.samples.filter(s=>s.scheduled).length,expectedExtra:job.samples.filter(s=>!s.scheduled).length,fullWindow:job.fullWindow,materialReview:'NOT_RUN',referenceVerified:false},settings.visualCertification);
 fixtures.push({id:job.id,referenceCount,nativeCount,window,numericFailureCount:frames.filter(f=>!f.visualGate.passed).length,worst:frames.toSorted((a,b)=>(b.visualGate.fractionBeyond??0)-(a.visualGate.fractionBeyond??0)).slice(0,5),frames});
 console.log(job.id,referenceCount,nativeCount,window.meanFractionBeyond,fixtures.at(-1)!.numericFailureCount);
}
writeFileSync(`${dir}/capture-summary.json`,JSON.stringify({method:'Recompute from actual decoded PNGs. Missing captures omitted and counted explicitly; reference/material status must be supplied separately, never inferred.',fixtures},null,2));
