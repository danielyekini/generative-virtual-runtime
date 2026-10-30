/** Reproducible, story-specific rewrite. Split only at existing key boundaries;
 * retain the original segment ease, geometry, initial writers and final fills. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {parseMotionScript, compileMotionScript} from '@gvr/compiler';
const path='fixtures/motionscript/stories/a-circle-in-motion.ms';
const source=readFileSync(path,'utf8');
const ast=parseMotionScript(source);
const horizons=[2000,5000,10000,15000,20000,25000,30000];
const groups=horizons.map(()=>[] as {start:number;order:number;text:string}[]);
const base:string[]=[];
let order=0;
for(const [unitIndex,unit] of ast.units.entries()) {
 const raw=source.slice(unit.span.start.offset,ast.units[unitIndex+1]?.span.start.offset ?? source.lastIndexOf("complete;"));
 if(unit.kind==='keyframes') {
  if(unit.startMs!==0 || unit.durationMs!==30000 || unit.timingScopeId || unit.fill==='none') throw new Error('Unsupported track');
  const lines=[...raw.matchAll(/^\s*([\d.]+)% (.+);$/gm)];
  if(lines.length!==unit.frames.length) throw new Error(`Cannot preserve ${unit.target}`);
  let first=0;
  while(first<lines.length-1) {
   const start=unit.frames[first]!.offset*30000;
   const bucket=horizons.findIndex(h=>start<h-1e-7);
   if(bucket<0) throw new Error('No bucket');
   let end=first+1;
   while(end<lines.length-1 && unit.frames[end]!.offset*30000<horizons[bucket]!-1e-7)end++;
   const finish=unit.frames[end]!.offset*30000;
   const frames=lines.slice(first,end+1).map((line,i)=> {
    const offset=(unit.frames[first+i]!.offset*30000-start)/(finish-start)*100;
    const value=i===end-first?line[2]!.replace(/ ease (?:cubic\([^)]*\)|\w+)$/,''):line[2]!;
    return `  ${i===0?0:i===end-first?100:offset}% ${value};`;
   });
   groups[bucket]!.push({start,order:order++,text:`keyframes ${unit.target} {\n  start ${start}ms;\n  duration ${finish-start}ms;\n${frames.join('\n')}\n};`});
   first=end;
  }
 } else if(unit.kind==='step') {
  const bucket=horizons.findIndex(h=>unit.timeMs<h);
  groups[bucket]!.push({start:unit.timeMs,order:order++,text:raw});
 } else if(['node','camera','operators','const'].includes(unit.kind)) base.push(raw);
 else throw new Error(`Unexpected ${unit.kind}`);
}
let program=source.slice(ast.header!.span.start.offset,ast.units[0]!.span.start.offset)+'\n'+base.join('\n')+'\n';
const seals=[];
for(const [i,horizon] of horizons.entries()) {
 program+=groups[i]!.sort((a,b)=>a.start-b.start||a.order-b.order).map(u=>u.text).join('\n')+`\nseal ${horizon}ms;\n`;
 seals.push({horizonMs:horizon,sourceBytes:Buffer.byteLength(program)});
}
program+='complete;\n';
const compiled=compileMotionScript(program);
if(!compiled.ok)throw new Error(JSON.stringify(compiled.diagnostics));
const out='samples/motionscript/a-circle-in-motion/experimental/progressive-capacity';
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/program.ms`,program);
writeFileSync(`${out}/manifest.json`,JSON.stringify({status:'experimental',baseline:path,baselineSha256:createHash('sha256').update(source).digest('hex'),programSha256:createHash('sha256').update(program).digest('hex'),bytes:Buffer.byteLength(program),baseBytes:Buffer.byteLength(source.slice(ast.header!.span.start.offset,ast.units[0]!.span.start.offset)+'\n'+base.join('\n')+'\n'),nodes:compiled.scene!.nodes.length,tracks:compiled.scene!.timeline.tracks.length,seals,recipe:'evaluation/bench/progressive/generate.mts',languageRelease:'0.5.0',wireVersion:'0.2'},null,2));
console.log(out,Buffer.byteLength(program),seals);
