import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileMotionScript,createIncrementalProgram} from '@gvr/compiler';
import {StreamingRuntime} from '@gvr/runtime';
const {sampleScene}=await import(pathToFileURL(resolve('packages/runtime/src/sample.ts')).href);
const {buildResolvedFrame}=await import(pathToFileURL(resolve('packages/runtime/src/frame.ts')).href);
const variant='samples/motionscript/a-circle-in-motion/experimental/progressive-capacity';
const source=readFileSync(`${variant}/program.ms`),manifest=JSON.parse(readFileSync(`${variant}/manifest.json`,'utf8'));
const baseline=compileMotionScript(readFileSync(manifest.baseline,'utf8')).scene!;
const rows=[];let decoder=new TextDecoder();
function distance(a:any,b:any):number {if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b);if(a===b)return 0;if(a&&b&&typeof a==='object'&&typeof b==='object'&&Object.keys(a).join()===Object.keys(b).join())return Math.max(0,...Object.keys(a).map(k=>distance(a[k],b[k])));return Infinity;}
for(const pattern of [[1],[127],[17,2048,127,509]]){
 const program=createIncrementalProgram(),runtime=new StreamingRuntime();let offset=0,index=0,prior=0;
 for(const seal of manifest.seals) {
  while(offset<seal.sourceBytes){const end=Math.min(seal.sourceBytes,offset+pattern[index++%pattern.length]!); // Decode across byte fragments without losing UTF-8 characters.
   // A streaming decoder belongs to this generation, initialized below.
   const text=decoder.decode(source.subarray(offset,end),{stream:true});program.push(text);offset=end;
   for(const d of program.drainDeltas())runtime.enqueue(d);runtime.flushCommands();
  }
  const times=[prior,prior+.001,(prior+seal.horizonMs)/2,seal.horizonMs-.001,seal.horizonMs];
  for(const t of times){const live=runtime.evaluate(t);const expected=buildResolvedFrame(baseline,sampleScene(baseline,t,t===seal.horizonMs?{excludeStartsAtMs:t}:undefined),t);rows.push({pattern,sealedBytes:offset,horizonMs:seal.horizonMs,t,authoringComplete:runtime.authoringComplete,maxAbsoluteError:distance(live.drawItems,expected.drawItems),diagnostics:[...program.diagnostics,...runtime.rejectedDiagnostics]});}
  prior=seal.horizonMs;
 }
 program.dispose();runtime.dispose();decoder=new TextDecoder();
}
writeFileSync(process.argv[2]??'work/prefix-check.json',JSON.stringify({ok:rows.every(r=>r.maxAbsoluteError<1e-8&&r.diagnostics.length===0&&!r.authoringComplete),rows},null,2));
if(rows.some(r=>r.maxAbsoluteError>=1e-8||r.diagnostics.length>0||r.authoringComplete))process.exitCode=1;
