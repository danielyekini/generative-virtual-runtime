import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {checkVisualFrame,checkVisualWindow} from '../evaluation/harness/visual-gate';
const require=createRequire(import.meta.url);const {PNG}=require('../evaluation/node_modules/pngjs');
const run='docs/evaluations/'+readFileSync('work/current-run','utf8');const evidence=run+'/evidence/baseline/capture';
const settings=JSON.parse(readFileSync(run+'/gate-settings.json','utf8'));const jobs=JSON.parse(readFileSync(evidence+'/render-jobs.json','utf8')).jobs;
const outcomes=[];
for(const job of jobs){
 const frames=[];
 for(const sample of job.samples){const base=evidence+'/captures/'+job.id+'/'+sample.id; if(!existsSync(base+'-reference.png')||!existsSync(base+'-native.png'))continue;
 const reference=PNG.sync.read(readFileSync(base+'-reference.png')),native=PNG.sync.read(readFileSync(base+'-native.png'));
 const gate=checkVisualFrame(reference,native,settings.visualCertification,settings.pixel.inspectionThreshold);
 frames.push({id:sample.id,timeMs:sample.sourceTimeMs,scheduled:sample.scheduled,gate});}
 const window=checkVisualWindow({scheduled:frames.filter(f=>f.scheduled).map(f=>f.gate),extra:frames.filter(f=>!f.scheduled).map(f=>f.gate),expectedScheduled:job.samples.filter((s:any)=>s.scheduled).length,expectedExtra:job.samples.filter((s:any)=>!s.scheduled).length,fullWindow:job.fullWindow===true,materialReview:'NOT_RUN',referenceVerified:false},settings.visualCertification);
 outcomes.push({id:job.id,sceneKind:job.sceneKind,window,frames,worstFraction:frames.length?Math.max(...frames.map(f=>f.gate.fractionBeyond??0)):null,worstLocal:frames.length?Math.max(...frames.map(f=>f.gate.maxLocalFractionBeyond??0)):null,referenceStatus:'UNVERIFIED_INTERRUPTED_BASELINE; completed-reference controls retained in browser logs, not independently promoted'});
}
writeFileSync(run+'/evidence/baseline/recomputed-gates.json',JSON.stringify({method:'Recomputed numeric gates from retained raw PNGs; interrupted browser run has no complete driver result',outcomes},null,2));console.log(outcomes.map(o=>({id:o.id,n:o.frames.length,mean:o.window.meanFractionBeyond,worst:o.worstFraction,numericPass:o.window.numericPass})));
