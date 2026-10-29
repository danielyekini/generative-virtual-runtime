/** From Blueprint to Home. Generate, compile, validate and check resolved draw items.
 * npx tsx fixtures/motionscript/stories/build-from-blueprint-to-home.ts
 * Optional real CanvasRenderer PNGs: GVR_PREVIEW_DIR=work/home-preview ...
 * Projection is baked into matching-topology paths; no 3D runtime is claimed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { compileMotionScript } from '@gvr/compiler';
import { AnimationRuntime } from '@gvr/runtime';
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem } from '@gvr/schema';

const started = performance.now();
const here = dirname(fileURLToPath(import.meta.url));
const INK = '#454741', BLUE = '#729db7', PAPER = '#faf7ef';
type P = [number, number, number];
type Shape = { id: string; points: (t: number) => P[]; fill?: string; ink?: string; width?: number; closed?: boolean; show?: number; hide?: number; trace?: number; layer?: number; ghost?: boolean };
const shapes: Shape[] = [];
const tracks: string[] = [];
const nodes: string[] = [];
const times = [0,2,3.5,5,6,7,8,9,10,11,12,12.75,13.5,14.25,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
const n = (x: number) => String(Math.round(x * 100) / 100);
const ramp = (t: number, a: number, b: number) => { const u = Math.max(0, Math.min(1, (t-a)/(b-a))); return u*u*(3-2*u); };
// x right, y front, z up. The entrance is always at positive y.
function project([x,y,z]: P, t: number): [number, number] {
  const tilt = ramp(t,5,10), orbit = ramp(t,15,17), closer = ramp(t,24,28);
  const angle = (.24 * tilt - .12 * orbit);
  const sx = Math.cos(angle)*x-Math.sin(angle)*y;
  const sy = Math.sin(angle)*x+Math.cos(angle)*y;
  const zoom = 1 - .08*ramp(t,19,21) + .12*closer;
  return [640+sx*zoom*.8, 440+(sy*(1-.40*tilt+.35*closer)-z*(.91-.61*closer)*tilt)*zoom*.8];
}
function path(points: [number,number][], closed = false): string {
  return points.map((p,i)=>`${i?'line':'move'} (${n(p[0]!)}, ${n(p[1]!)});`).join(' ') + (closed?' close;':'');
}
function keys(target: string, rows: [number,string, string?][]): string {
  return `keyframes ${target} { start 0s; duration 30s;\n${rows.map(([t,v,e])=>` ${Number((t/30*100).toFixed(7))}% ${v}${e?` ease ${e}`:''};`).join('\n')}\n};`;
}
function scalar(target: string, rows: [number,number,string?][]) {
  const r = [...rows];
  if (r[0]![0]>0) r.unshift([0,r[0]![1],'hold']);
  if (r.at(-1)![0]<30) r.push([30,r.at(-1)![1]]);
  tracks.push(keys(target,r.map(([t,v,e])=>[t,n(v),e])));
}
function add(s: Shape) { shapes.push(s); }
const fixed = (p: P[]) => (_t: number) => p;
function floorRect(id: string,x: number,y: number,w: number,h: number,fill?: string,show=0,layer=2) {
  add({id, points:fixed([[x,y,1],[x+w,y,1],[x+w,y+h,1],[x,y+h,1]]),closed:true,fill,show,layer});
}
function line(id: string,p: P[],show=0,ink=BLUE,hide?: number,trace?: number,layer=3) {add({id,points:fixed(p),show,ink,hide,trace,layer});}
// Faint grid, remaining anchored to the same floor coordinate system.
for(let i=-320;i<=320;i+=40) {
  line(`gridX${i+320}`,[[i,-240,0],[i,240,0]],0,'#e5e5dc',15);
}
for(let i=-240;i<=240;i+=40) line(`gridY${i+240}`,[[-320,i,0],[320,i,0]],0,'#e5e5dc',15);
const footprint: P[] = [[-260,190,0],[-260,-190,0],[260,-190,0],[260,190,0],[48,190,0],[48,152,0],[-48,152,0],[-48,190,0],[-260,190,0]];
add({id:'blueFootprint', points:fixed(footprint),ink:BLUE,trace:2,layer:5});
// Foundation has shallow thickness, never changes the plan dimensions.
add({id:'slabEdge',points:t=>[[-260,-190,-12*ramp(t,5,6)],[260,-190,-12*ramp(t,5,6)],[260,190,-12*ramp(t,5,6)],[-260,190,-12*ramp(t,5,6)]],closed:true,fill:'#deded3',show:5,layer:0});
add({id:'slabTop',points:fixed(footprint.slice(0,-1)),closed:true,fill:'#f0eee4',show:5,layer:1});
// Plan walls are split around real openings. Full-height strips, lintels and sills
// grow around the openings, rather than painting a window on an opaque wall.
type Wall = {id:string; a:[number,number]; b:[number,number]; front?:boolean; side?:boolean; inside?:boolean};
const walls: Wall[] = [
 {id:'rearWest',a:[-260,-190],b:[-155,-190]}, {id:'rearMid',a:[-65,-190],b:[90,-190]}, {id:'rearEast',a:[180,-190],b:[260,-190]},
 {id:'westRear',a:[-260,-190],b:[-260,-110]}, {id:'westMid',a:[-260,-30],b:[-260,65]}, {id:'westFront',a:[-260,145],b:[-260,190]},
 {id:'eastRear',a:[260,-190],b:[260,-115],side:true}, {id:'eastMid',a:[260,-35],b:[260,60],side:true}, {id:'eastFront',a:[260,140],b:[260,190],side:true},
 {id:'frontWestA',a:[-260,190],b:[-190,190],front:true}, {id:'frontWestB',a:[-100,190],b:[-48,190],front:true},
 {id:'recessWest',a:[-48,190],b:[-48,152],front:true}, {id:'recessEast',a:[48,152],b:[48,190],front:true},
 {id:'frontEastA',a:[48,190],b:[100,190],front:true}, {id:'frontEastB',a:[190,190],b:[260,190],front:true},
 {id:'crossWest',a:[-260,0],b:[-80,0],inside:true},{id:'crossEast',a:[80,0],b:[260,0],inside:true},
 {id:'spineRear',a:[0,-190],b:[0,-55],inside:true}, {id:'spineMid',a:[0,-12],b:[0,45],inside:true},{id:'spineFront',a:[0,90],b:[0,152],inside:true},
];
function wallHeight(w: Wall,t: number) {return 100*ramp(t,w.inside?8:6,w.inside?10:8)*(1-.78*ramp(t,w.front?22:23,w.front?23:24)*(w.front||w.side?1:0));}
function panel(w: Wall,lo=0,hi=100,suffix='') {
  add({id:w.id+suffix,points:t=>{ const h=wallHeight(w,t); return [[...w.a,lo/100*h],[...w.b,lo/100*h],[...w.b,hi/100*h],[...w.a,hi/100*h]] as P[];}, closed:true,fill:w.inside?'#eeeae0':'#f7f3e8',show:w.inside?8:6,layer:w.inside?8:w.front?20:w.side?19:6});
}
for(const w of walls) {
  if(w.inside) line(`plan${w.id}`,[[...w.a,0],[...w.b,0]],w.inside?2:0,BLUE,undefined,w.inside?1.5:2,4);
  panel(w);
}
const windows: Wall[] = [
 {id:'winRearWest',a:[-155,-190],b:[-65,-190]}, {id:'winRearEast',a:[90,-190],b:[180,-190]},
 {id:'winWestRear',a:[-260,-110],b:[-260,-30]}, {id:'winWestFront',a:[-260,65],b:[-260,145]},
 {id:'winEastRear',a:[260,-115],b:[260,-35],side:true}, {id:'winEastFront',a:[260,60],b:[260,140],side:true},
 {id:'winFrontWest',a:[-190,190],b:[-100,190],front:true},{id:'winFrontEast',a:[100,190],b:[190,190],front:true}
];
for(const [i,w] of windows.entries()) {
  panel(w,0,28,'Sill'); panel(w,80,100,'Lintel');
  line(`symbol${i}`,[[...w.a,0],[...w.b,0]],3.5,INK,5,.6,5);
  add({id:w.id,closed:true,fill:PAPER,ink:BLUE,show:10+i*.12,layer:w.front?21:w.side?20:7,
    points:t=>{const h=wallHeight(w,t), shift=30*(1-ramp(t,10+i*.12,11.2+i*.1)); const a:[number,number]=[w.a[0]+(w.a[0]===w.b[0]?Math.sign(w.a[0])*shift:0),w.a[1]+(w.a[1]===w.b[1]?Math.sign(w.a[1])*shift:0)];const b:[number,number]=[a[0]+w.b[0]-w.a[0],a[1]+w.b[1]-w.a[1]];return [[...a,h*.28],[...b,h*.28],[...b,h*.8],[...a,h*.8]] as P[];}});
  const frameShape=shapes.at(-1)!;
  add({...frameShape,id:`${w.id}Glass`,fill:'#dbeaf0',show:15,layer:(frameShape.layer??7)+1});
}
const entrance: Wall={id:'entranceLintel',a:[-48,152],b:[48,152],front:true};
panel(entrance,82,100);
add({id:'entranceDoor',show:10,closed:true,fill:'#d8d1be',layer:22,points:t=>{const angle=(1-ramp(t,10,12))*Math.PI/2;const end:[number,number]=[-48+96*Math.cos(angle),152+96*Math.sin(angle)];return [[-48,152,0],[...end,0],[...end,82],[-48,152,82]];}});
scalar('entranceDoor.opacity',[[0,0,'hold'],[10,0],[10.2,1,'hold'],[21.9,1],[22,0,'hold']]);
// Door-swing arcs, drawn as short matching-topology polylines.
for(const [i,[x,y]] of ([[-80,0],[0,-55],[0,45],[-48,152]] as const).entries()) {
  const p:P[]=Array.from({length:13},(_,k)=>[x+42*Math.cos(k/12*Math.PI/2),y+42*Math.sin(k/12*Math.PI/2),1]);
  line(`doorArc${i}`,p,3.5,BLUE,5,.7);
}
line('dimWidth',[[-280,225,0],[280,225,0]],3.5,BLUE,6,.7);
line('dimDepth',[[-295,-210,0],[-295,210,0]],3.5,BLUE,6,.7);
for(const [i,p] of ([[-260,225],[260,225],[-295,-190],[-295,190]] as const).entries()) line(`dimTick${i}`,[[p[0]!-5,p[1]!-5,0],[p[0]!+5,p[1]!+5,0]],3.5,BLUE,6,.5);
// Opaque roof, all vertices receive the same translation during removal.
function roofPoint(p:P,t:number):P {return [p[0]!-300*ramp(t,21,22),p[1]!-30*ramp(t,21,22),p[2]!+145*ramp(t,19,21)];}
function roof(id:string,p:P[],show:number,fill?:string) {
 add({id,points:t=>p.map(v=>roofPoint([v[0],v[1],v[2]+50*(1-ramp(t,show,show+.6))],t)),show,fill,closed:!!fill,layer:30,ghost:true});
}
for(const [i,y] of [-160,-60,60,160].entries()) roof(`truss${i}`,[[-280,y,100],[0,y,180],[280,y,100],[-280,y,100]],12+i*.2);
roof('roofWest',[[-280,-210,100],[0,-210,180],[0,210,180],[-280,210,100]],13.5,'#e0ded4');
roof('roofEast',[[0,-210,180],[280,-210,100],[280,210,100],[0,210,180]],13.7,'#eeebe0');
roof('ridge',[[0,-210,180],[0,210,180]],14.3);
roof('chimney',[[100,-110,150],[130,-110,150],[130,-110,210],[100,-110,210]],14.4,'#d7cbbd');
// Blue segmented separation guides replace a dash capability.
for(let i=0;i<12;i++) for(const [j,y] of [-190,190].entries()) line(`guide${j}n${i}`,[[-260+i*44,y,105],[-240+i*44,y,105]],18,BLUE,24,undefined,29);
for(let i=0;i<5;i++) line(`liftGuide${i}`,[[i*120-240,190,110],[i*120-240,190,225]],19,BLUE,22,undefined,28);
floorRect('entryPath',-38,193,76,58,'#e7e3d8',15,0);
for(let i=0;i<7;i++) line(`hatch${i}`,[[310+i*9,170,0],[325+i*9,150,0]],15,'#cccfc2',undefined,undefined,0);
// Pastel rooms and furniture keep a generous clear central cross corridor.
const rooms = [
 {id:'living',label:'LIVING',x:-252,y:8,w:195,h:172,t:24,color:'#eee0d8',lx:-160,ly:155},
 {id:'kitchen',label:'KITCHEN',x:-252,y:-182,w:195,h:174,t:25,color:'#e3e9da',lx:-157,ly:-45},
 {id:'bedroom',label:'BEDROOM',x:57,y:-182,w:195,h:174,t:26,color:'#e7e0ed',lx:162,ly:-45},
 {id:'bathroom',label:'BATHROOM',x:57,y:8,w:195,h:172,t:27,color:'#dce9e9',lx:164,ly:155},
];
for(const r of rooms) floorRect(`${r.id}Tint`,r.x,r.y,r.w,r.h,r.color,r.t,2);
function furniture(id:string,x:number,y:number,w:number,h:number,t:number,fill='#f9f6ed') {
 const p:P[]=[[x,y,3],[x+w,y,3],[x+w,y+h,3],[x,y+h,3]];
 add({id,points:fixed(p),closed:true,show:t,trace:.6,layer:10});
 add({id:`${id}Fill`,points:fixed(p),closed:true,fill,show:t+.6,layer:9,ink:fill});
}
furniture('rug',-235,28,155,108,24,'#e4cec0');
furniture('sofa',-237,35,40,93,24.05,'#d5bbad');
furniture('coffeeTable',-167,60,58,38,24.1);
line('sofaCushions',[[-237,66,4],[-197,66,4],[-197,97,4],[-237,97,4]],24.35,INK,undefined,.3,11);
furniture('counterRun',-245,-177,170,33,25,'#d2dbc8');
furniture('counterReturn',-245,-140,35,92,25.05,'#d2dbc8');
furniture('sink',-183,-170,45,22,25.1,'#dfedf1');
furniture('cooker',-121,-171,35,23,25.15);
for(let i=0;i<4;i++) floorRect(`burner${i}`,-116+(i%2)*15,-167+Math.floor(i/2)*10,7,6,INK,25.6,11);
furniture('bed',95,-166,90,111,26,'#d9cbe4');
furniture('pillow',106,-158,67,24,26.15);
furniture('wardrobe',211,-173,30,102,26.1,'#c9bfce');
furniture('bath',177,22,65,85,27,'#d0e2e4');
furniture('basin',72,25,36,30,27.1,'#eaf1ef');
furniture('toilet',82,86,31,41,27.15,'#eaf1ef');

function emitShape(s:Shape) {
 // Keep the ghost roof in its established frame while pushing into rooms.
 const cmd=(t:number)=>path(s.points(t).map(p=>project(p,s.ghost?Math.min(t,22):t)),s.closed);
 nodes.push(`path ${s.id} { ${cmd(0)} ${s.fill?`fill ${s.fill};`:''} stroke ${s.ink??INK} width ${s.width??1.35} join round; zIndex ${s.id.startsWith('blue')||s.id.startsWith('plan')?25:s.layer??3}; };`);
 // Remove identical interior keys; retain both ends of each changing interval.
 const values=times.map(t=>cmd(t));
 const kept=times.filter((_,i)=>i===0||i===times.length-1||values[i]!==values[i-1]||values[i]!==values[i+1]);
 tracks.push(keys(`${s.id}.commands`,kept.map(t=>[t,`path { ${cmd(t)} }`])));
 if(s.id!=='entranceDoor') {
 const show=s.show??0, hide=s.hide;
 const opacity:[number,number,string?][]=[[0,show===0?1:0,'hold']];
 if(show>0) opacity.push([show,0],[show+.15,1,'hold']);
 if(hide) opacity.push([hide-.2,1],[hide,0,'hold']);
 if(s.ghost) opacity.push([21,1],[22,.12,'hold']);
 if(s.id.startsWith('blue')||s.id.startsWith('plan')) opacity.push([5,1],[6,.25,'hold'],[28,.25],[28.3,1],[29,.28,'hold']);
 scalar(`${s.id}.opacity`,opacity);
 }
 if(s.trace) {
 nodes.push(`operators ${s.id} { trim 0, 0, 0; };`);
 scalar(`${s.id}.trim.end`,[[0,0,s.show?'hold':'linear'],[s.show??0,0],[Math.min(30,(s.show??0)+s.trace),1,'hold']].filter((r,i,a)=>i===0||r[0]!==a[i-1]![0]) as [number,number,string?][]);
 }
}
shapes.forEach(emitShape);
for(const r of rooms) {
 const id=`label${r.id}`;
 const p=project([r.lx,r.ly,2],0);
 nodes.push(`text ${id} { position (${n(p[0]!)}, ${n(p[1]!)}); content "${r.label}"; fontFamily "sans"; fontSize 13; align center; baseline middle; fill ${INK}; zIndex 7; };`);
 for(const [axis,j] of [['x',0],['y',1]] as const) scalar(`${id}.position.${axis}`,times.map(t=>[t,project([r.lx,r.ly,2],t)[j]]));
 scalar(`${id}.scale.y`,[[0,1,'hold'],[5,1],[10,.65,'hold'],[24,.65],[28,.8,'hold']]);
 scalar(`${id}.opacity`,[[0,0,'hold'],[3.5,0],[4.8,1,'hold'],[5,1,'hold'],[19,1],[19.2,0,'hold'],[r.t+.75,0],[r.t+1,1,'hold']]);
}
nodes.push(`text titleCard { position (40,35); content "FROM BLUEPRINT TO HOME"; fontFamily "sans"; fontSize 18; fill ${INK}; };
text subTitle { position (40,60); content "01 / PLAN     02 / STRUCTURE     03 / HOME"; fontFamily "sans"; fontSize 11; fill ${BLUE}; };
text endCaption { position (640,680); content "One footprint. Four rooms. A place to call home."; fontFamily "sans"; fontSize 18; align center; fill ${INK}; };`);
const source=`// From Blueprint to Home. Generated; edit the builder. Sound is not supported.\nscene "from-blueprint-to-home" { version "0.2"; viewport (1280,720); background ${PAPER}; duration 30s; requires "geometry.pathMorph"; requires "geometry.trimPath"; requires "geometry.animatedTrim"; requires "easing.hold"; requires "text.basic"; };\ncamera main { position (640,360); zoom 1; rotation 0deg; };\n${nodes.join('\n')}\n${tracks.join('\n')}\ncomplete;\n`;
writeFileSync(resolve(here,'from-blueprint-to-home.ms'),source);
const compileStart=performance.now();
const compiled=compileMotionScript(source);
const compileMs=performance.now()-compileStart;
if(compiled.diagnostics.length || !compiled.ok || !compiled.scene) throw new Error(JSON.stringify(compiled.diagnostics));
const scene=compiled.scene;
const validation=validateSceneIR(scene);
if(!validation.ok) throw new Error(JSON.stringify(validation.diagnostics));
const runtime=new AnimationRuntime(scene);
const frame=(t:number)=>runtime.evaluate(t*1000).drawItems;
function item(t:number,id:string) { const found=frame(t).find(i=>i.nodeId===id); if(!found) throw new Error(`Missing ${id} at ${t}`); return found; }
function assert(v:boolean,message:string) {if(!v) throw new Error(message);}
function vertices(i:ResolvedDrawItem) {
 if(i.geometry.kind!=='path') throw new Error(`Expected path ${i.nodeId}`);
 return i.geometry.commands.flatMap(c=>'x' in c?[transformPoint(i.logicalMatrix,c.x,c.y)]:[]);
}
function visible(t:number,id:string) {assert(item(t,id).opacity>.08,`${id} invisible at ${t}`);}
function hidden(t:number,id:string) {assert(item(t,id).opacity<.01,`${id} early/lingering at ${t}`);}
function same(a:number,b:number,e=.8) {return Math.abs(a-b)<e;}
// Check output geometry, not the builder's geometric model.
visible(2,'blueFootprint'); visible(3.5,'plancrossWest'); visible(4.9,'doorArc0'); visible(4.9,'labelkitchen');
assert(vertices(item(2,'blueFootprint')).some(p=>same(p.x,432)&&same(p.y,592)),'Blueprint footprint lost front-left anchor');
hidden(5,'rearWest'); visible(6,'slabTop');
for(const t of [8,10]) visible(t,'rearWest');
assert(vertices(item(10,'rearWest'))[0]!.y-vertices(item(10,'rearWest'))[3]!.y>70,'Rear wall failed to rise');
for(const id of ['crossWest','crossEast','spineRear']) {
 const base=vertices(item(10,id)), plan=vertices(item(10,`plan${id}`));
 assert(Math.hypot(base[0]!.x-plan[0]!.x,base[0]!.y-plan[0]!.y)<.1,`${id} drifted off blueprint`);
}
hidden(14.9,'winFrontEastGlass'); visible(15.5,'winFrontEastGlass');
for(const id of ['winRearWest','winFrontWest','winEastRear']) {
 const sill=vertices(item(10,`${id}Sill`)),lintel=vertices(item(10,`${id}Lintel`));
 assert(sill[3]!.y-lintel[0]!.y>35,`${id} opening filled during wall growth`);
}
const westGap=vertices(item(10,'crossWest'))[1]!,eastGap=vertices(item(10,'crossEast'))[0]!;
assert(Math.hypot(westGap.x-eastGap.x,westGap.y-eastGap.y)>120,'Central circulation gap closed');
hidden(9.9,'winRearWest'); visible(12,'winFrontEast'); visible(12,'entranceDoor');
assert(same(vertices(item(12,'entranceDoor'))[0]!.y,vertices(item(12,'entranceDoor'))[1]!.y-96*Math.sin(.24)*.6*.8,2),'Door failed to close into recess');
visible(13.5,'truss0'); visible(15,'roofEast'); visible(15,'chimney');
visible(17,'entryPath'); hidden(17,'guide0n0'); visible(18.5,'guide0n0');
const r19=vertices(item(19,'roofWest')),r21=vertices(item(21,'roofWest'));
for(let k=1;k<r19.length;k++) assert(same((r19[k]!.x-r19[0]!.x)*.92,r21[k]!.x-r21[0]!.x)&&same((r19[k]!.y-r19[0]!.y)*.92,r21[k]!.y-r21[0]!.y),'Roof lift distorted assembly');
for(const t of [19.25,19.5,19.75,20,20.25,20.5,20.75,21.5]) {
 const roof=vertices(item(t,'roofWest'));
 const a={x:roof[1]!.x-roof[0]!.x,y:roof[1]!.y-roof[0]!.y};
 const b={x:r19[1]!.x-r19[0]!.x,y:r19[1]!.y-r19[0]!.y};
 assert(Math.abs(a.x*b.y-a.y*b.x)<5,'Roof changed orientation');
}
assert(r21[0]!.y<r19[0]!.y-70,'Roof did not lift');
assert(vertices(item(22,'roofWest'))[0]!.x<r21[0]!.x-210,'Roof did not shift upper-left');
assert(item(22,'roofWest').opacity<.15,'Roof did not become faint');
for(const id of ['frontWestA','eastRear']) {
 const p=vertices(item(24,id));assert(Math.hypot(p[0]!.x-p[3]!.x,p[0]!.y-p[3]!.y)<24,`${id} not at sill height`);
}
assert(vertices(item(24,'rearWest'))[0]!.y-vertices(item(24,'rearWest'))[3]!.y>65,'Rear wall lowered');
const roomItems=[['rug','sofa','coffeeTable'],['counterRun','sink','cooker'],['bed','wardrobe','pillow'],['bath','basin','toilet']];
for(const [index,r] of rooms.entries()) {
 hidden(r.t-.1,roomItems[index]![0]!);
 const boundary=vertices(item(r.t+1,`${r.id}Tint`));
 // Convex projected room containment: all furniture vertices on same side of each edge.
 for(const id of roomItems[index]!) {
  visible(r.t+1,id); visible(r.t+1,`${id}Fill`);
  for(const p of vertices(item(r.t+1,id))) {
   const cross=boundary.map((a,k)=>{const b=boundary[(k+1)%boundary.length]!;return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);});
   assert(cross.every(v=>v>=-5)||cross.every(v=>v<=5),`${id} crosses ${r.id} floor at ${r.t+1}`);
  }
 }
 visible(r.t+1,`label${r.id}`);
}
assert(item(28.3,'blueFootprint').opacity>.95&&item(29.5,'blueFootprint').opacity<.3,'Blueprint highlight timing wrong');
// Interval sweep and every required boundary: all visible path vertices above captions.
const captureTimes=[0,1,2,2.75,3.5,4.9,5,6,7,8,9,10,11,12,12.75,13.5,14.25,15,16,17,18,19,20,21,21.5,22,23,24,24.6,25,25.6,26,26.6,27,27.6,28,28.3,29,30];
for(let t=0;t<=30;t+=.25) for(const i of frame(t)) {
 if(i.opacity<.04||i.geometry.kind!=='path')continue;
 for(const p of vertices(i)) assert(p.x>=12&&p.x<=1268&&p.y>=80&&p.y<650,`${i.nodeId} outside drawing area at ${t}: ${JSON.stringify(p)}`);
}
const stats={sourceBytes:Buffer.byteLength(source),maxSourceBytes:DEFAULT_LIMITS.maxSourceBytes,nodes:scene.nodes.length,maxNodes:DEFAULT_LIMITS.maxNodes,tracks:scene.timeline.tracks.length,maxTracks:DEFAULT_LIMITS.maxTracks,steps:scene.timeline.steps.length,maxSteps:DEFAULT_LIMITS.maxSteps,compileMs,builderMs:performance.now()-started,captureTimes};
assert(stats.sourceBytes<=stats.maxSourceBytes,'Source budget exceeded');
console.log(JSON.stringify(stats,null,2));
// Preview is deliberately opt-in. A small Vite page renders production CanvasRenderer
// in headless Chromium. The driver is kept alongside this builder for reproducibility.
if(process.env.GVR_PREVIEW_DIR) {
 const dir=resolve(process.env.GVR_PREVIEW_DIR);mkdirSync(dir,{recursive:true});
 writeFileSync(resolve(dir,'scene.json'),JSON.stringify(scene));
 writeFileSync(resolve(dir,'measurements.json'),JSON.stringify(stats,null,2));
 const { renderHomePreviews }=await import('./preview-from-blueprint-to-home');
 await renderHomePreviews(scene,captureTimes,dir);
 writeFileSync(resolve(dir,'measurements.json'),JSON.stringify({...stats,totalWithPreviewsMs:performance.now()-started},null,2));
}
