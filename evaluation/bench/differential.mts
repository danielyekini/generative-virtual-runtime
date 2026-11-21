/** Paired Node compiler comparison and old/new frame differential.
 * Baseline code is extracted read-only from Git, with its own schema resolution.
 * Run sequentially with other performance jobs stopped. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,symlinkSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {compileMotionScript} from '@gvr/compiler';
import {Telemetry} from '@gvr/schema';
import {sampleScene} from '../../packages/runtime/src/sample';
import {buildResolvedFrame} from '../../packages/runtime/src/frame';
const args=process.argv.slice(2);const arg=(key:string,fallback:string)=>args.includes(key)?args[args.indexOf(key)+1]!:fallback;
const baseline=arg('--baseline','775892b');
const samples=Number(arg('--samples','3'));if(!Number.isInteger(samples)||samples<1||samples>10)throw new Error('samples 1..10');
const out=resolve(arg('--out','work/capacity-differential'));mkdirSync(out,{recursive:true});
const tree=resolve(out,'baseline-source');mkdirSync(tree,{recursive:true});
const archive=execFileSync('git',['archive',baseline,'packages/compiler','packages/schema','packages/runtime/src/frame.ts'],{maxBuffer:32*1024*1024});
execFileSync('tar',['-xf','-','-C',tree],{input:archive});
const modules=resolve(tree,'node_modules/@gvr');mkdirSync(modules,{recursive:true});
if(!existsSync(resolve(modules,'schema')))symlinkSync(resolve(tree,'packages/schema'),resolve(modules,'schema'),'dir');
const before=await import(pathToFileURL(resolve(tree,'packages/compiler/src/compile.ts')).href);
const oldFrame=await import(pathToFileURL(resolve(tree,'packages/runtime/src/frame.ts')).href);
const rows=[];
const environment={node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,baseline:execFileSync('git',['rev-parse',baseline],{encoding:'utf8'}).trim(),implementation:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}),warmup:1,samples,instrumentation:'Telemetry enabled for compile samples; warmup disabled'};
for(const name of arg('--stories','adding-two-vectors,from-pixels-to-prediction,square-wave-from-sine-waves,a-crane-then-a-square,a-circle-in-motion').split(',')) {
 const source=readFileSync(`fixtures/motionscript/stories/${name}.ms`,'utf8');const runs=[];let oldScene,scene;
 for(const [mode,compile] of [['before',before.compileMotionScript],['after',compileMotionScript]] as const) {
  console.log(name,mode,'warmup');compile(source);
  for(let i=0;i<samples;i++){
   const telemetry=new Telemetry(4096),start=performance.now();const result=compile(source,telemetry);
   runs.push({mode,sample:i,wallMs:performance.now()-start,ok:result.ok,diagnostics:result.diagnostics,telemetry:telemetry.snapshot()});
   if(mode==='before')oldScene=result.scene;else scene=result.scene;
   console.log(name,mode,i,runs.at(-1)!.wallMs.toFixed(2));
  }
 }
 if(!scene || !oldScene)throw new Error('Missing scene');
 const compileExact=JSON.stringify(oldScene)===JSON.stringify(scene);
 const times=[0,1,500,1000,1999,2000,4999,5000,7500,10000,15000,20000,25000,scene.timeline.durationMs-1,scene.timeline.durationMs];
 const frames=times.map(t=>{const sampled=sampleScene(scene,t);return {t,exact:JSON.stringify(oldFrame.buildResolvedFrame(scene,sampled,t))===JSON.stringify(buildResolvedFrame(scene,sampled,t))};});
 rows.push({name,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),compileExact,frames,runs});
 writeFileSync(resolve(out,'results.json'),JSON.stringify({environment,rows},null,2));
}
if(rows.some(r=>!r.compileExact || r.frames.some(f=>!f.exact)||r.runs.some(s=>!s.ok)))process.exitCode=1;
