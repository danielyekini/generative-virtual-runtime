/** Reuse only byte-equivalent renderer inputs, with unchanged execution code. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { AnimationRuntime } from '@gvr/runtime';
const run = resolve('docs/evaluations', readFileSync('work/current-run', 'utf8'));
const baseline = resolve(run, 'evidence/baseline');
const jobs = JSON.parse(readFileSync('evaluation/evidence/render-jobs.json','utf8')).jobs;
const oldJobs = JSON.parse(readFileSync(resolve(baseline,'render-jobs.json'),'utf8')).jobs;
const boundaries = JSON.parse(readFileSync(resolve(run,'source-boundary-schedule.json'),'utf8')).fixtures;
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const sourceManifest = JSON.parse(readFileSync(resolve(run,'source-snapshot/baseline-files.json'),'utf8')).files;
const executionFiles = sourceManifest.filter((f: any) => f.path.startsWith('packages/runtime/src/') || f.path.startsWith('packages/canvas-renderer/src/') || f.path.startsWith('packages/schema/src/') || f.path.startsWith('evaluation/harness/') || ['package-lock.json','evaluation/package-lock.json'].includes(f.path));
// The workspace package version record may change; compare resolved execution
// dependencies separately. No runtime/renderer/harness/source schema file may change.
const changedExecution = executionFiles.filter((f: any) => f.path !== 'package-lock.json' && sha(readFileSync(f.path)) !== f.sha256);
if (changedExecution.length) throw new Error('Cannot reuse captures: execution files changed: '+changedExecution.map((f:any)=>f.path).join(', '));
const oldLock=JSON.parse(execFileSync('git',['show','HEAD:package-lock.json'],{encoding:'utf8'}));
const finalLock=JSON.parse(readFileSync('package-lock.json','utf8'));
delete oldLock.packages['packages/format-lottie'].version;
delete finalLock.packages['packages/format-lottie'].version;
if(JSON.stringify(oldLock)!==JSON.stringify(finalLock))throw new Error('Resolved dependencies changed beyond importer workspace version');
const ledger: any[] = [], captureJobs: any[] = [];
for (const job of jobs) {
  const fixture = job.parentFixture;
  const extras = boundaries.find((x:any)=>x.fixture===fixture)?.samples ?? [];
  const additions = fixture==='LOT-03' ? [] : extras.filter((s:any)=>!job.samples.some((p:any)=>Math.abs(p.lottieFrame-s.lottieFrame)<1e-8));
  const finalJob = {...job,samples:[...job.samples,...additions]};
  let reused=false;const frames: any[]=[];
  if (['LOT-00','LOT-05','LOT-07'].includes(fixture)) {
    const kind=job.sceneKind;
    const aScene=JSON.parse(readFileSync(resolve(baseline,`fixtures/${fixture}/${kind}-scene.json`),'utf8'));
    const bScene=JSON.parse(readFileSync(`evaluation/evidence/fixtures/${fixture}/${kind}-scene.json`,'utf8'));
    const a=new AnimationRuntime(aScene),b=new AnimationRuntime(bScene);
    const original=oldJobs.find((x:any)=>x.id===job.id);
    for (const sample of original.samples) {
      // nodeId is provenance only for flat leaves; CanvasRenderer does not read
      // it. Keep all scope IDs, including the renderer's special root ID.
      const input=(runtime:AnimationRuntime)=>JSON.stringify(runtime.evaluate(sample.sourceTimeMs),(key,value)=>key==='nodeId'?undefined:value);
      const oldInput=input(a),newInput=input(b);
      frames.push({id:sample.id,timeMs:sample.sourceTimeMs,oldInputSha256:sha(oldInput),finalInputSha256:sha(newInput),identical:oldInput===newInput});
    }
    reused=frames.every(f=>f.identical);
  } else if (fixture==='LOT-03') {
    // No native route exists. The original source and pinned reference player
    // are unchanged; preserve the quarantined source-only capture association.
    reused=true;
  }
  ledger.push({job:job.id,fixture,reused,reason:fixture==='LOT-03'?'Unchanged quarantined source-only evidence; no native verification':'Exact renderer-input hashes at every original scheduled/extra timestamp; node provenance IDs excluded, all scope IDs retained',
    oldScene:job.sceneKind==='none'?null:sha(readFileSync(resolve(baseline,`fixtures/${fixture}/${job.sceneKind}-scene.json`))),
    finalScene:job.sceneKind==='none'?null:sha(readFileSync(`evaluation/evidence/fixtures/${fixture}/${job.sceneKind}-scene.json`)),frames,
    reusedEvidence:reused?'evidence/baseline/captures/'+job.id:null,newSamples:additions.length});
  if (reused) { if(additions.length)captureJobs.push({...finalJob,samples:additions,fullWindow:false}); }
  else captureJobs.push(finalJob);
  Object.assign(job,finalJob);
}
writeFileSync(resolve(run,'final-full-render-jobs.json'),JSON.stringify({jobs},null,2)+'\n');
writeFileSync(resolve(run,'capture-reuse-ledger.json'),JSON.stringify({executionFiles,changedExecution,lockfileComparison:'Exact parsed equality after excluding only packages/format-lottie workspace release version; evaluation lockfile exact hash equality',assumptions:'Same Chromium151/lottie-web5.13.0, DPR1, settings, source bytes and resolved dependencies; no source/reference/runtime/renderer changes. Capture references and controls retain immutable baseline identities. No partial reuse for any changed fixture.',jobs:ledger},null,2)+'\n');
writeFileSync('evaluation/evidence/render-jobs.json',JSON.stringify({jobs:captureJobs},null,2)+'\n');
console.log(ledger.map(x=>({job:x.job,reused:x.reused,newSamples:x.newSamples,checkedInputs:x.frames.length})));
