/** Threads into Motion. Generated source only; run with npx tsx this file.
 * GVR_PREVIEW_DIR optionally captures real CanvasRenderer PNGs in Chromium.
 * A graphic plate, not a cloth simulation: joined row paths preserve the
 * visible strand; explicit warp overpasses preserve alternating crossings.
 */
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { compileMotionScript } from '@gvr/compiler';
import { AnimationRuntime } from '@gvr/runtime';
import { DEFAULT_LIMITS, trimCommands, type PathCommand, validateSceneIR, transformPoint, type ResolvedDrawItem } from '@gvr/schema';
import { build } from 'esbuild';
import { resolveChromeBinary, chromeVersion } from '../../../evaluation/harness/chrome';

const started = performance.now();
const here = dirname(fileURLToPath(import.meta.url));
const coral = '#d76e60', indigo = '#363f68';
type Key = [number, number | string, string?];
type Pt = { x: number; y: number };
const n = (v: number) => String(Number(v.toFixed(2)));
const p = (v: Pt) => `(${n(v.x)}, ${n(v.y)})`;
const tracks: string[] = [], nodes: string[] = [], ops: string[] = [];
function track(target: string, keys: Key[]) {
  const k = keys.filter((v,i) => i === keys.length-1 || v[0] !== keys[i+1]![0]);
  if (k[0]![0] > 0) k.unshift([0, k[0]![1], 'hold']);
  if (k[k.length - 1]![0] < 30) k.push([30, k[k.length - 1]![1]]);
  if (k.some((v, i) => i > 0 && v[0] <= k[i - 1]![0])) throw Error(`Unordered ${target}`);
  tracks.push(`keyframes ${target} { start 0s; duration 30s;\n${k.map(([t,v,e],i) => `${Math.floor(t / 30 * 100 * 1e8) / 1e8}% ${typeof v === 'number' ? n(v) : v}${e && i < k.length-1 ? ` ease ${e}` : ''};`).join('\n')}\n};`);
}
function path(id: string, d: string, color: string, width: number, extra = '') {
  return `path ${id} { ${d} stroke ${color} width ${width} cap round join round; ${extra} };`;
}
function trim(id: string, keys: Key[]) { ops.push(`operators ${id} { trim 0, 0, 0; };`); track(`${id}.trim.end`, keys); }
function opacity(id: string, a: number, b: number) { track(`${id}.opacity`, [[0,0,'hold'],[a,1,'hold'],[b,0,'hold']]); }
const rowY = (r: number) => 530 - r * 16;
const warpX = (c: number) => 460 + c * 32;
const grow = (r: number): [number, number] => r === 0 ? [5,7] : r === 1 ? [8,10] : [11 + 5 * Math.pow((r-2)/22,0.68),11 + 5*Math.pow((r-1)/22,0.68)];
const release = (r: number): [number,number] => r === 23 ? [20,21] : [21 + 3 * Math.pow((22-r)/23,0.65),21+3*Math.pow((23-r)/23,0.65)];
// A shared sampled displacement bends both systems at the same world points.
function ripple(q: Pt, phase: number): Pt {
  const u = (q.x-460 + 530-q.y)/720;
  return {x:q.x + 3 * Math.sin(Math.PI*u)*phase, y:q.y - 13*Math.sin(Math.PI*u)*phase};
}
function row(r: number, phase = 0) {
  const y = rowY(r), rtl = r%2===0, a = rtl ? 830:450, b = rtl ? 450:830;
  const prev = r===0 ? {x:1080,y:530} : {x:a,y:y+16};
  const start = ripple(prev,phase), end = ripple({x:a,y},phase);
  const turn = r===0 ? `move ${p(start)}; line ${p(end)};` : `move ${p(start)}; cubic ${p(ripple({x:a+(rtl?12:-12),y:y+16},phase))} ${p(ripple({x:a+(rtl?12:-12),y},phase))} ${p(end)};`;
  return turn + Array.from({length:12},(_,i) => {
    const x = a+(b-a)*(i+1)/12; return `line ${p(ripple({x,y:y+Math.sin(i*2+r)*0.5},phase))};`;
  }).join(' ');
}
const threadKeys = (r:number):Key[] => {
  const [a,b]=grow(r),[c,d]=release(r);
  return r===0 ? [[0,0,'hold'],[4,0,'easeOut'],[5,250/630,'linear'],[7,1,'hold'],[c,1,'linear'],[d,0,'hold']] : [[0,0,'hold'],[a,0,'linear'],[b,1,'hold'],[c,1,'linear'],[d,0,'hold']];
};
for(let c=0;c<12;c++) {
  const x=warpX(c), id=`warp${c}`;
  const d=(phase:number)=>`move ${p(ripple({x,y:135},phase))}; `+Array.from({length:25},(_,i)=>`line ${p(ripple({x,y:135+i*16.7},phase))};`).join(' ');
  nodes.push(path(id,d(0),indigo,6,'zIndex 3;'));
  trim(id,[[0,0,'hold'],[0.1+c*.19,0,'easeOut'],[.8+c*.19,1,'hold'],[24,1,'easeIn'],[24.7,0,'hold']]);
  track(`${id}.position.x`,[[0,0,'hold'],[2.8+c*.02,0,'linear'],[3.1+c*.02,2.5,'linear'],[3.35+c*.02,-1.5,'easeOut'],[4,0,'hold']]);
  track(`${id}.commands`,[[0,`path { ${d(0)} }`,'hold'],[16,`path { ${d(0)} }`,'easeInOut'],[16.8,`path { ${d(1)} }`,'easeInOut'],[18,`path { ${d(0)} }`,'hold']]);
}
for(let r=0;r<24;r++) {
  // A dark offset underpaint and two fine highlights give fibre contact depth.
  for(const [suffix,color,width,z,dy] of [['Shade','#bcb0a3',11,4,2],['Body',coral,8,5,0],['Fibre','#edaa94',1,6,-1.5]] as const) {
    const id=`weft${r}${suffix}`;
    nodes.push(path(id,row(r),color,width,`zIndex ${z}; position (0, ${dy});`)); trim(id,threadKeys(r));
    track(`${id}.commands`,[[0,`path { ${row(r)} }`,'hold'],[16,`path { ${row(r)} }`,'easeInOut'],[16.8,`path { ${row(r,1)} }`,'easeInOut'],[18,`path { ${row(r)} }`,'hold']]);
  }
}
// Indigo overpasses alternate on each row. Full vertical warp underpaint remains.
for(let c=0;c<12;c++) {
  const x=warpX(c);
  const d=(phase:number)=>Array.from({length:24},(_,r)=>(r+c)%2===0 ? `move ${p(ripple({x,y:rowY(r)-5.5},phase))}; line ${p(ripple({x,y:rowY(r)+5.5},phase))};` : '').join(' ');
  nodes.push(path(`over${c}`,d(0),indigo,6,'zIndex 8;'));
  opacity(`over${c}`,4,24);
  track(`over${c}.commands`,[[0,`path { ${d(0)} }`,'hold'],[16,`path { ${d(0)} }`,'easeInOut'],[16.8,`path { ${d(1)} }`,'easeInOut'],[18,`path { ${d(0)} }`,'hold']]);
}
for(const [id,y,dir] of [['upperBar',122,-1],['lowerBar',548,1]] as const) {
  nodes.push(`group ${id} { zIndex 10; rectangle wood { position (425, ${y}); size (430, 14); cornerRadius 5; fill #a9825c; }; line grain { from (435, ${y+4}); to (845, ${y+4}); stroke #c9aa80 width 1.4; }; };`);
  track(`${id}.position.y`,[[0,0,'hold'],[24.4,0,'easeIn'],[25,dir*800,'hold']]);
}
const shuttleKeys: [number,Pt,string?][] = [[0,{x:1080,y:530},'hold'],[4,{x:1080,y:530},'easeOut'],[5,{x:830,y:530},'linear']];
for(let r=0;r<24;r++) { const [a,b]=grow(r); if(r>0) shuttleKeys.push([a,{x:r%2===0?830:450,y:rowY(r)},'linear']); shuttleKeys.push([b,{x:r%2===0?450:830,y:rowY(r)},r===0?'hold':'linear']); }
shuttleKeys.push([19,{x:830,y:rowY(23)},'easeIn'],[19.8,{x:1400,y:rowY(23)-30},'hold']);
nodes.push(`group shuttle { zIndex 20; path hull { move (-23, 0); quadratic (0, -17) (23, 0); quadratic (0, 17) (-23, 0); close; fill #9c704e; }; line slot { from (-11, 0); to (11, 0); stroke #f1c7a0 width 3; }; };`);
track('shuttle.opacity',[[0,0,'hold'],[4,0,'easeOut'],[4.15,1,'hold']]);
track('shuttle.position.x',shuttleKeys.map(([t,q,e])=>[t,q.x,e])); track('shuttle.position.y',shuttleKeys.map(([t,q,e])=>[t,q.y,e]));
nodes.push(`group comb { zIndex 25; rectangle spine { position (435, 550); size (410, 7); cornerRadius 2; fill #bb9368; }; ${Array.from({length:25},(_,i)=>`line tooth${i} { from (${442+i*16}, 550); to (${442+i*16}, 537); stroke #bb9368 width 2; };`).join(' ')} };`);
track('comb.position.y',[[0,35,'hold'],[10,35,'easeOut'],[10.6,0,'easeIn'],[11,35,'hold'],[15.8,35,'easeOut'],[16,0,'easeIn'],[16.5,100,'hold']]); opacity('comb',10,16.6);
// The freed strand is a single morphing centreline with a propagating-width
// filled outline. Its parameter direction runs from tail to leading tip.
function centre(u:number,t:number):Pt {
  const v=Math.max(0,Math.min(1,(t-25)/1.5));
  const s={x:390+500*u,y:410-160*u+45*Math.sin(2*Math.PI*u)};
  const wave={x:640+170*Math.sin(2*Math.PI*u-1.2),y:545-400*u};
  const phase=.05+.9*u;
  const loop={x:640+180*Math.cos(2*Math.PI*phase),y:350+140*Math.sin(4*Math.PI*phase)};
  const f=t<26.5?v:1, loopWeight=t<26.5?0:t<27.8?(t-26.5)/1.3:t<29?(29-t)/1.2:0;
  return {x:s.x*(1-f)+(wave.x*(1-loopWeight)+loop.x*loopWeight)*f,y:s.y*(1-f)+(wave.y*(1-loopWeight)+loop.y*loopWeight)*f+(t>=29?2*Math.sin(u*13+t*5):0)};
}
function ribbon(t:number,offset=0,outline=false):string {
  const side=(u:number,sign:number)=>{
    const q=centre(u,t), a=centre(Math.max(0,u-.001),t),b=centre(Math.min(1,u+.001),t),len=Math.hypot(b.x-a.x,b.y-a.y)||1;
    const front=Math.max(0,Math.min(1,((t-25)/1.5-(1-u)*.65)/.35));
    const w=outline?(3+front*13*(.75+.25*Math.cos(u*10+t)))*sign:offset;
    return {x:q.x-(b.y-a.y)/len*w,y:q.y+(b.x-a.x)/len*w};
  };
  const points=Array.from({length:49},(_,i)=>side(i/48,1));
  if(outline) points.push(...Array.from({length:49},(_,i)=>side(1-i/48,-1)));
  return points.map((q,i)=>`${i?'line':'move'} ${p(q)};`).join(' ')+(outline?' close;':'');
}
const ribbonTimes=[25,25.3,25.6,26,26.5,27,27.8,28.4,29,29.5,30];
nodes.push(`path ribbon { ${ribbon(25,0,true)} fill ${coral}; zIndex 31; opacity 0; };`);
track('ribbon.opacity',[[0,0,'hold'],[24.99,0,'linear'],[25,1,'hold']]);
track('ribbon.commands',ribbonTimes.map(t=>[t,`path { ${ribbon(t,0,true)} }`,'linear']));
for(let i=0;i<5;i++) {
  nodes.push(path(`ribbonFibre${i}`,ribbon(25,(i-2)*2.5),i%2?'#bf5b55':'#efaa96',.65,'zIndex 32; opacity 0;'));
  track(`ribbonFibre${i}.opacity`,[[0,0,'hold'],[25,1,'hold']]);
  track(`ribbonFibre${i}.commands`,ribbonTimes.map(t=>[t,`path { ${ribbon(t,(i-2)*2.5)} }`,'linear']));
}
// A darker middle pass is the graphic reverse face, not 3D lighting.
nodes.push(path('reverseFace',ribbon(25),'#a94d50',10,'zIndex 33; opacity 0;'));
ops.push('operators reverseFace { trim 0.4, 0.58, 0; };');
track('reverseFace.commands',ribbonTimes.map(t=>[t,`path { ${ribbon(t)} }`,'linear']));
track('reverseFace.opacity',[[0,0,'hold'],[26.5,0,'linear'],[27.2,.85,'hold'],[28.4,.85,'linear'],[29,0,'hold']]);
// An explicit near pass and its contact underpaint resolve the one crossing.
for(const [id,color,width,z] of [['crossShade','#9d5350',27,34],['crossNear',coral,22,35],['crossFibre','#efaa96',1,36]] as const){
  nodes.push(path(id,ribbon(25),color,width,`zIndex ${z}; opacity 0;`));
  ops.push(`operators ${id} { trim 0.70, 0.87, 0; };`);
  track(`${id}.commands`,ribbonTimes.map(t=>[t,`path { ${ribbon(t)} }`,'linear']));
  track(`${id}.opacity`,[[0,0,'hold'],[27,0,'linear'],[27.6,1,'hold'],[28,1,'linear'],[28.5,0,'hold']]);
}
// Loose end: keyed to the currently withdrawing row; no disconnected pool.
const looseKeys:Key[]=[];
function loose(t:number):string {
  let r=23, f=0;
  if(t>=20) {r=0; for(let j=23;j>=0;j--){const[a,b]=release(j); if(t<=b){r=j;f=Math.max(0,Math.min(1,(t-a)/(b-a)));break;}}}
  const commands:PathCommand[]=row(r).split(';').filter(v=>v.trim()).map(v=>{
    const nums=v.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    if(v.trim().startsWith('cubic'))return {cmd:'C',c1x:nums[0]!,c1y:nums[1]!,c2x:nums[2]!,c2y:nums[3]!,x:nums[4]!,y:nums[5]!};
    return {cmd:v.trim().startsWith('move')?'M':'L',x:nums[0]!,y:nums[1]!};
  });
  const kept=trimCommands(commands,0,1-f,0);
  const last=kept[kept.length-1]??commands[0]!;
  const q=t<20?{x:830,y:rowY(23)}:last.cmd==='Z'?{x:830,y:rowY(r)}:{x:last.x,y:last.y};
  const dest=centre(1,25),lift=Math.min(1,Math.max(0,t-19));
  const tip=t<20?{x:830+70*lift,y:rowY(23)-70*lift}:dest;
  const point=(u:number):Pt=>{const v=1-u;
    const a={x:v*v*v*q.x+3*v*v*u*(q.x+80)+3*v*u*u*960+u*u*u*tip.x,y:v*v*v*q.y+3*v*v*u*(q.y-70*lift)+3*v*u*u*150+u*u*u*tip.y};
    const f=Math.max(0,Math.min(1,t-24)),b=centre(u,25);
    return {x:a.x*(1-f)+b.x*f,y:a.y*(1-f)+b.y*f};
  };
  const derivative=(u:number)=>{const h=.0001,a=point(u-h),b=point(u+h);return {x:(b.x-a.x)/(2*h),y:(b.y-a.y)/(2*h)};};
  return `move ${p(point(0))}; `+Array.from({length:4},(_,i)=>{const a=point(i/4),b=point((i+1)/4),da=derivative(i/4),db=derivative((i+1)/4);return `cubic ${p({x:a.x+da.x/12,y:a.y+da.y/12})} ${p({x:b.x-db.x/12,y:b.y-db.y/12})} ${p(b)};`;}).join(' ');
}
const looseTimes=[19,19.5,20,...Array.from({length:24},(_,i)=>{const [a,b]=release(23-i);return [0,.25,.5,.75,.9,.94,.97,1].map(f=>a+(b-a)*f);}).flat(),24.5,25];
for(const t of [...new Set(looseTimes)].sort((a,b)=>a-b))looseKeys.push([t,`path { ${loose(t)} }`,'linear']);
nodes.push(path('looseEnd',loose(19),coral,7,'zIndex 22; opacity 0;'));
track('looseEnd.commands',looseKeys); opacity('looseEnd',19,25);
const captions=['Stretch the threads','Establish the weave','Grow the fabric','Feel the woven surface','Unweave the square','Become a dancing ribbon'];
const boundaries=[0,5,11,16,20,25,30];
nodes.push(`group headings { space screen; zIndex 100; text titleInk { position (640, 45); content "THREADS INTO MOTION"; fontFamily "serif"; fontSize 25; align center; baseline middle; fill #363f68; }; ${captions.map((s,i)=>`text cue${i} { position (640, 674); content "${s}"; fontFamily "serif"; fontSize 20; align center; fill #75675d; opacity 0; };`).join(' ')} };`);
for(let i=0;i<6;i++)track(`headings.cue${i}.opacity`, i===0?[[0,1,'hold'],[5,0,'hold']]:[[0,0,'hold'],[boundaries[i]!,1,'hold'],[boundaries[i+1]!,0,'hold']]);
track('camera(main).zoom',[[0,1.13,'easeInOut'],[4,1,'easeInOut'],[5,1.1,'hold'],[10,1.1,'easeInOut'],[13,1,'hold'],[16,1,'easeInOut'],[17,1.08,'easeInOut'],[19,1,'hold'],[25,1,'easeInOut'],[30,.94]]);
track('camera(main).rotation',[[0,'0deg','hold'],[5,'0deg','easeInOut'],[6,'-2deg','hold'],[10,'-2deg','easeInOut'],[11,'0deg','hold'],[16,'0deg','easeInOut'],[17,'2deg','easeInOut'],[19,'0deg','hold']]);
const source=`// Generated by build-threads-into-motion.ts. Sound cues remain in the brief; no audio contract.\nscene "threads-into-motion" { version "0.2"; viewport (1280, 720); background #f5efe3; duration 30s; requires "geometry.pathMorph"; requires "geometry.animatedTrim"; requires "geometry.trimPath"; requires "geometry.roundedRect"; requires "easing.hold"; requires "text.basic"; };\ncamera main { position (640, 350); zoom 1; };\n${nodes.join('\n')}\n${ops.join('\n')}\n${tracks.join('\n')}\ncomplete;\n`;
writeFileSync(resolve(here,'threads-into-motion.ms'),source);
const compileStart=performance.now(), result=compileMotionScript(source), compileMs=performance.now()-compileStart;
if(result.diagnostics.length || !result.ok || !result.scene) throw Error(JSON.stringify(result.diagnostics));
const validation=validateSceneIR(result.scene); if(!validation.ok)throw Error(JSON.stringify(validation.diagnostics));
const scene=result.scene, runtime=new AnimationRuntime(scene);
const cached=new Map<number, readonly ResolvedDrawItem[]>();
const frame=(t:number)=>{let v=cached.get(t);if(!v){v=runtime.evaluate(t*1000).drawItems;cached.set(t,v);}return v;};
function item(t:number,id:string):ResolvedDrawItem { const v=frame(t).find(v=>v.nodeId===id); if(!v)throw Error(`Missing ${id} at ${t}`);return v; }
function assert(ok:boolean,message:string){if(!ok)throw Error(message);}
function visible(t:number,id:string){const v=item(t,id);assert(v.opacity>.9,`${id} invisible at ${t}`);return v;}
function geometryPoints(v:ResolvedDrawItem):Pt[] {
  const g=v.geometry;
  if(g.kind==='path')return g.commands.flatMap(c=>c.cmd==='Z'?[]:[{x:c.x,y:c.y},...(c.cmd==='C'?[{x:c.c1x,y:c.c1y},{x:c.c2x,y:c.c2y}]:c.cmd==='Q'?[{x:c.cx,y:c.cy}]:[])]);
  if(g.kind==='line')return [g.from,g.to];
  if(g.kind==='rectangle')return [{x:0,y:0},g.size];
  return [{x:0,y:0}];
}
function bounds(t:number,id:string){const v=item(t,id),pad=(v.appearance.stroke?.width??0)/2;for(const q of geometryPoints(v)){const a=transformPoint(v.logicalMatrix,q.x,q.y);assert(a.x>=pad&&a.x<=1280-pad&&a.y>=70+pad&&a.y<=640-pad,`${id} outside story frame at ${t}: ${JSON.stringify(a)}`);}}
// Runtime geometry, not construction-model counts, verifies each beat.
assert(item(3.9,'shuttle.hull').opacity===0,'shuttle enters too early');
for(let c=0;c<12;c++){bounds(4,`warp${c}`);const g=item(4,`warp${c}`).geometry;assert(g.kind==='path'&&g.commands.length>20,'warp not stretched');}
assert(item(.1,'warp11').geometry.kind==='path' && geometryPoints(item(.1,'warp11')).length<=1,'stagger missing');
for(const [t,x,y] of [[5,830,530],[7,450,530],[10,830,514],[16,830,162]] as const){const v=visible(t,'shuttle.hull');const q=transformPoint(v.logicalMatrix,0,0); const expected=transformPoint(item(t,'weft0Body').logicalMatrix,x,y);assert(Math.hypot(q.x-expected.x,q.y-expected.y)<1,'shuttle not at row endpoint '+t);bounds(t,'shuttle.hull');}
for(let r=0;r<24;r++){bounds(16,`weft${r}Body`);assert(geometryPoints(item(16,`weft${r}Body`)).length>=13,`row ${r} incomplete`);assert(geometryPoints(item(24.01,`weft${r}Body`)).length<=1,`row ${r} did not unzip`);}
assert(JSON.stringify(item(16,'warp5').geometry)!==JSON.stringify(item(16.8,'warp5').geometry),'ripple absent');
assert(JSON.stringify(item(16,'weft12Body').geometry)!==JSON.stringify(item(16.8,'weft12Body').geometry),'weft ripple absent');
assert(transformPoint(item(19.8,'shuttle.hull').logicalMatrix,0,0).x>1280,'shuttle not detached');
for(const t of [19.5,20,21,22,23,24,24.9])bounds(t,'looseEnd');
assert(geometryPoints(item(20.5,'weft23Body')).length>1 && geometryPoints(item(21.01,'weft23Body')).length<=1,'slow first release absent');
assert(geometryPoints(item(22,'weft0Body')).length>1,'bottom row released early');
for(let c=0;c<12;c++)assert(geometryPoints(item(25,`warp${c}`)).length<=1,'warp not retracted');
for(const id of ['upperBar.wood','lowerBar.wood'])assert(Math.abs(transformPoint(item(25,id).logicalMatrix,0,0).y-360)>650,'bars remain');
for(const t of [25,25.6,26.5,27.8,29,30])bounds(t,'ribbon');
const ribbonSpan=(t:number)=>{const pts=geometryPoints(item(t,'ribbon'));return Math.hypot(pts[0]!.x-pts[97]!.x,pts[0]!.y-pts[97]!.y);};
assert(ribbonSpan(26.5)>ribbonSpan(25)+10,'ribbon does not widen');
for(let i=0;i<6;i++)visible((boundaries[i]!+boundaries[i+1]!)/2,`headings.cue${i}`);
// Sweep all main geometry at 10 Hz for framing and reliable arbitrary seeks.
for(let tick=0;tick<=300;tick++){const t=tick/10;for(const v of frame(t)){if(v.opacity<.01||v.nodeId.startsWith('headings')||/Bar|shuttle|comb|over/.test(v.nodeId))continue;if(geometryPoints(v).length>1)bounds(t,v.nodeId);}}
let maxJoinError=0;
for(let tick=200;tick<240;tick++){
  const t=tick/10,rows=Array.from({length:24},(_,r)=>item(t,`weft${r}Body`));
  const active=rows.filter(v=>geometryPoints(v).length>1).pop();
  if(!active)continue;
  const pts=geometryPoints(active),end=pts[pts.length-1]!,loose=item(t,'looseEnd'),start=geometryPoints(loose)[0]!;
  const a=transformPoint(active.logicalMatrix,end.x,end.y),b=transformPoint(loose.logicalMatrix,start.x,start.y);
  maxJoinError=Math.max(maxJoinError,Math.hypot(a.x-b.x,a.y-b.y));
}
assert(maxJoinError<3,`Loose-end connection error ${maxJoinError}`);
const crossingPts=geometryPoints(item(27.8,'ribbonFibre2'));
const cross=(a:Pt,b:Pt,c:Pt)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
let crossings=0;
for(let i=0;i<crossingPts.length-1;i++)for(let j=i+2;j<crossingPts.length-1;j++){
  const a=crossingPts[i]!,b=crossingPts[i+1]!,c=crossingPts[j]!,d=crossingPts[j+1]!;
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)crossings++;
}
assert(crossings===1,`Expected one ribbon crossing, got ${crossings}`);
visible(27.8,'crossNear');assert(frame(27.8).findIndex(v=>v.nodeId==='crossNear')>frame(27.8).findIndex(v=>v.nodeId==='ribbon'),'near pass behind ribbon');
console.log(JSON.stringify({maxJoinError,crossings}));
for(const t of [27.8,5,22,16.8,30,0,20.5]){
  const expected=frame(t),again=runtime.evaluate(t*1000).drawItems;
  assert(JSON.stringify(expected)===JSON.stringify(again),`Seek changed frame at ${t}`);
}
const metrics={maxJoinError,crossings,sourceBytes:Buffer.byteLength(source),maxSourceBytes:DEFAULT_LIMITS.maxSourceBytes,nodes:scene.nodes.length,maxNodes:DEFAULT_LIMITS.maxNodes,tracks:scene.timeline.tracks.length,maxTracks:DEFAULT_LIMITS.maxTracks,steps:scene.timeline.steps.length,maxSteps:DEFAULT_LIMITS.maxSteps,compileMs,builderMsBeforePreviews:performance.now()-started};
assert(metrics.sourceBytes<=metrics.maxSourceBytes,'Source budget');console.log(JSON.stringify(metrics,null,2));
const preview=process.env.GVR_PREVIEW_DIR;
if(preview){
  mkdirSync(preview,{recursive:true}); const out=resolve(preview);
  writeFileSync(resolve(out,'metrics.json'),JSON.stringify(metrics,null,2));
  writeFileSync(resolve(out,'scene.json'),JSON.stringify(scene));
  const entry=resolve(out,'render.ts');
  writeFileSync(entry,`import {CanvasRenderer} from ${JSON.stringify(resolve(here,'../../../packages/canvas-renderer/src/index.ts'))}; import {AnimationRuntime} from ${JSON.stringify(resolve(here,'../../../packages/runtime/src/index.ts'))}; import scene from './scene.json'; const canvas=document.querySelector('canvas')!;const renderer=new CanvasRenderer(canvas);renderer.resize(1280,720,1);const runtime=new AnimationRuntime(scene as any);(window as any).renderAt=(t:number)=>{renderer.render(runtime.evaluate(t*1000));};(window as any).renderAt(0);document.title='rendered';`);
  await build({entryPoints:[entry],bundle:true,format:'esm',outfile:resolve(out,'render.js')});
  writeFileSync(resolve(out,'index.html'),`<style>html,body{margin:0;width:1280px;height:720px;overflow:hidden}</style><canvas></canvas><script type="module" src="./render.js"></script>`);
  const {createServer}=await import('node:http');const server=createServer((req,res)=>{const name=new URL(req.url!,'http://localhost').pathname;try{const file=name==='/'?'index.html':name.slice(1);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(readFileSync(resolve(out,file)));}catch{res.statusCode=404;res.end();}});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const address=server.address() as {port:number}; const chrome=resolveChromeBinary();console.log(chromeVersion(chrome));
  const times=[0,1.5,3,4,5,6,7,7.5,8,9,10,10.6,11,12,13,14.5,16,16.8,18,19,19.5,20,20.5,21,22,23,24,24.5,25,25.6,26.5,27.8,28.4,29,30];
  // Drive one headless browser over CDP; avoid process-per-still startup.
  const {spawn}=await import('node:child_process');
  const profile=mkdtempSync(resolve(out,'capture-profile-'));
  const child=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${address.port}/`],{stdio:'ignore'});
  const delay=()=>new Promise(r=>setTimeout(r,100));
  let ws:WebSocket|undefined;
  try{
    let port='';for(let i=0;i<150;i++){try{port=readFileSync(resolve(profile,'DevToolsActivePort'),'utf8').split('\n')[0]!;break;}catch{await delay();}}
    if(!port)throw Error('Chromium CDP startup timeout');
    let pages:any[]=[];for(let i=0;i<150;i++){pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json() as any[];if(pages.some(q=>q.type==='page'))break;await delay();}
    ws=new WebSocket(pages.find(q=>q.type==='page').webSocketDebuggerUrl);
    await new Promise<void>((ok,fail)=>{ws!.onopen=()=>ok();ws!.onerror=()=>fail(Error('CDP websocket'));});
    let serial=0;const pending=new Map<number,{ok:(v:any)=>void;fail:(e:Error)=>void}>();
    ws.onmessage=event=>{const v=JSON.parse(String(event.data));if(v.id){const task=pending.get(v.id);pending.delete(v.id);v.error?task?.fail(Error(JSON.stringify(v.error))):task?.ok(v.result);}};
    const call=(method:string,params:object={})=>new Promise<any>((ok,fail)=>{const id=++serial;pending.set(id,{ok,fail});ws!.send(JSON.stringify({id,method,params}));});
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    let ready=false;for(let i=0;i<150;i++){const r=await call('Runtime.evaluate',{expression:'typeof window.renderAt === "function"',returnByValue:true});if(r.result.value){ready=true;break;}await delay();}
    if(!ready)throw Error('CanvasRenderer did not initialise');
    for(const t of times){const evaluated=await call('Runtime.evaluate',{expression:`window.renderAt(${t})`,returnByValue:true});if(evaluated.exceptionDetails)throw Error(JSON.stringify(evaluated.exceptionDetails));const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(out,`f${t.toFixed(2)}.png`),Buffer.from(shot.data,'base64'));}
  }finally{ws?.close();child.kill();server.close();}
  console.log(`CanvasRenderer stills: ${out}`);
}
console.log(`builder total ms ${n(performance.now()-started)}`);
