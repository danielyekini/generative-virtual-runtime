/** The Marble Machine — generated story plate. Run with npx tsx.
 * GVR_PREVIEW_DIR enables real CanvasRenderer PNG capture in headless Chromium.
 * All motions are authored, seekable choreography; no physical simulation.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem } from "@gvr/schema";

const start = performance.now();
const here = dirname(fileURLToPath(import.meta.url));
const BG = "#fff5df", WOOD = "#ae7246", TEAL = "#37b8b3", YELLOW = "#f5c648", CORAL = "#ee7769", VIOLET = "#8862be";
type Key = [number, number | [number, number] | string, string?];
const fmt = (v: Key[1]) => Array.isArray(v) ? `(${v.map(n).join(", ")})` : typeof v === "number" ? n(v) : v;
function n(v: number): string { return String(Number(v.toFixed(6))); }
function track(id: string, input: Key[]): string {
  const keys = [...input];
  if (keys[0]![0] > 0) keys.unshift([0, keys[0]![1], "hold"]);
  if (keys.at(-1)![0] < 35) keys.push([35, keys.at(-1)![1]]);
  return `keyframes ${id} { start 0s; duration 35s; ${keys.map(([t,v,e]) => `${n(t/35*100)}% ${fmt(v)}${e ? ` ease ${e}` : ""};`).join(" ")} };`;
}
const circle = (id: string,x: number,y: number,r: number,fill: string,extra="") => `circle ${id} { position (${n(x)}, ${n(y)}); radius ${r}; fill ${fill}; ${extra} };`;
const rect = (id: string,x: number,y: number,w: number,h: number,fill: string,extra="") => `rectangle ${id} { position (${n(x)}, ${n(y)}); size (${w}, ${h}); cornerRadius 5; fill ${fill}; ${extra} };`;
const line = (id: string,x: number,y: number,xx: number,yy: number,color: string,width=4) => `line ${id} { from (${n(x)}, ${n(y)}); to (${n(xx)}, ${n(yy)}); stroke ${color} width ${width} cap round; };`;
const label = (id: string,x: number,y: number,words: string,size=16) => `text ${id} { position (${x}, ${y}); content "${words}"; fontFamily "sans"; fontSize ${size}; fontWeight 600; align center; baseline middle; fill #654c3d; };`;
const pivot = (id: string,x: number,y: number) => circle(id,x,y,8,WOOD,"stroke #fff5df width 3;");
const polar = (cx: number,cy: number,r: number,a: number): [number,number] => [cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];
const cupPoint = (a: number): [number,number] => {
  const rad=a*Math.PI/180; return [420-110*Math.cos(rad)+18*Math.sin(rad),210-110*Math.sin(rad)-18*Math.cos(rad)];
};
const CUP = cupPoint(0);
// Independent, explicit checkpoints below test evaluated output, not these keys.
const travel: Key[] = [[0,[100,80],"hold"],[2,[100,80],"easeIn"],[5,CUP,"linear"]];
for(let i=1;i<=20;i++) travel.push([5+i*.1,cupPoint(-12*i/20),"linear"]);
travel.push([7.5,cupPoint(-12),"linear"]);
for(let i=1;i<=5;i++) travel.push([7.5+i*.1,cupPoint(-12+24*i/5),"linear"]);
travel[travel.length-1]![2]="easeIn";
travel.push([9.3,[548,220],"linear"],[10,[560,292],"linear"],[10.5,[581,292],"linear"],[11,[606,334],"easeOut"],[12,[630,388],"hold"],[17.5,[630,388],"easeIn"],[18,[706,408],"linear"]);
// Curved chute centreline: cubic samples shared with the drawn rail, offset by 18.
function cubic(a: [number,number],b: [number,number],c: [number,number],d: [number,number],u: number): [number,number] {
  return [0,1].map(k => (1-u)**3*a[k]!+3*(1-u)**2*u*b[k]!+3*(1-u)*u*u*c[k]!+u**3*d[k]!) as [number,number];
}
for(let i=1;i<=24;i++) travel.push([18+i/12,cubic([706,408],[780,440],[840,500],polar(1000,600,70,225),i/24),"linear"]);
for(let i=1;i<=120;i++) travel.push([20+i/40,polar(1000,600,70,225-135*i/120),"linear"]);
travel.push([24,polar(1200,730,70,315),"linear"]);
for(let i=1;i<=80;i++) travel.push([24+i/40,polar(1200,730,70,315+135*i/80),"linear"]);
travel.push([27,[1200,820],"linear"]);
const curveA: [number,number][] = [[1200,820],[1390,825],[1280,855],[1400,862]];
const curveB: [number,number][] = [[1400,862],[1570,865],[1540,890],[1510,900]];
for(let i=1;i<=24;i++) travel.push([27+i/12,cubic(...(i<=12 ? curveA : curveB) as [[number,number],[number,number],[number,number],[number,number]],(i<=12?i:i-12)/12),"linear"]);
for(let i=1;i<=48;i++) {
 const u=i/48, a=360*(2*u-u*u), r=60*(1-u);
 travel.push([29+3*u,[1450+r*Math.cos(a*Math.PI/180),900+0.42*r*Math.sin(a*Math.PI/180)],"linear"]);
}
const CAMERA: [number,number,number,number,string?][] = [
 [0,800,500,.62,"hold"],[1.5,800,500,.62,"easeInOut"],[2,200,100,1.4,"easeInOut"],[3,260,150,1.6,"hold"],
 [5,360,235,1.55,"easeInOut"],[8,440,270,1.5,"easeInOut"],[10,690,350,1.4,"linear"],
 [15,790,365,1.4,"easeInOut"],[16,790,395,1.25,"hold"],[18,790,395,1.25,"easeInOut"],
 [20,1090,660,1.35,"hold"],[26,1090,660,1.35,"easeInOut"],[28,1390,860,1.6,"hold"],
 [31,1390,860,1.6,"easeInOut"],[33,800,500,.62,"hold"],[35,800,500,.62]
];
const cues: [number,number,string][] = [
 [0,5,"01  RELEASE & ROLL   /   peg click · rising rolling rattle"],
 [5,10,"02  TIP THE LEVER   /   hinge creak · rod click · bumper knock"],
 [10,16,"03  DOMINO CHAIN   /   marble knock · eight wooden clacks · lever tap"],
 [16,20,"04  OPEN THE GATE   /   cord twang · gate slide · rolling crescendo"],
 [20,26,"05  TURN THE WHEELS   /   cup impacts · axle rattles · ticking"],
 [26,31,"06  RACE TO THE FINISH   /   chatter becomes a circular rumble"],
 [31,35,"07  COMPLETE   /   bowl click · bell · fading axle ticks"]
];
function wheel(id: string,x: number,y: number,angle: number): string {
 return `group ${id} { position (${x}, ${y}); rotation ${angle}deg;
 ${circle("rim",0,0,70,"#c6a9e5","stroke #8862be width 9;")}
 ${[0,90,180,270].map((a,i)=>{const [xx,yy]=polar(0,0,70,a);return `${line(`spoke${i}`,0,0,xx,yy,VIOLET,10)} group cup${i} { position (${n(xx)}, ${n(yy)}); rotation ${a-90}deg; path lip { move (-19, -8); quadratic (-19, 17) (0, 17); quadratic (19, 17) (19, -8); stroke ${WOOD} width 5 cap round; }; };`;}).join("\n")}
 ${circle("disc",0,0,25,"#57398b")}
 ${[0,90,180,270].map((a,i)=>{const [xx,yy]=polar(0,0,22,a);return line(`stripe${i}`,0,0,xx,yy,"#fff5df",5);}).join("\n")}
 }; ${pivot(`${id}Axle`,x,y)}`;
}
function program(): string {
 const motion: string[] = [];
 motion.push(track("peg.position.y",[[1.5,70,"linear"],[2,42,"hold"]]));
 motion.push(track("seesaw.rotation",[[5,"0deg","linear"],[7,"-12deg","hold"],[7.5,"-12deg","linear"],[8,"12deg","hold"]]));
 const rodKeys: Key[]=[[5,[520,210],"linear"]];
 for(let i=1;i<=20;i++) {const a=-12*i/20*Math.PI/180;rodKeys.push([5+i*.1,[420+100*Math.cos(a),210+100*Math.sin(a)],"linear"]);}
 rodKeys.push([7.5,rodKeys.at(-1)![1],"linear"]);
 for(let i=1;i<=5;i++) {const a=(-12+24*i/5)*Math.PI/180;rodKeys.push([7.5+i*.1,[420+100*Math.cos(a),210+100*Math.sin(a)],"linear"]);}
 motion.push(track("rod.position",rodKeys));
 motion.push(track("stopper.position.x",[[7,0,"linear"],[7.5,-40,"hold"]]));
 for(let i=0;i<8;i++) {
  const t=10.5+i*(4.5/7);
  motion.push(track(`domino${i}.rotation`,[[t,"0deg","easeIn"],[t+.55,"78deg","hold"]]));
 }
 motion.push(track("trigger.rotation",[[15,"10deg","easeInOut"],[16,"-14deg","hold"]]));
 motion.push(track("gate.position.y",[[16,380,"easeInOut"],[17.5,335,"hold"]]));
 motion.push(track("cordEnd.scale.y",[[16,1,"easeInOut"],[17.5,0.4375,"hold"]]));
 motion.push(track("cordLead.scale.y",[[16,1,"easeInOut"],[17.5,1.422222,"hold"]]));
 motion.push(track("wheelOne.cup0.rotation",[[22.7,"-90deg","linear"],[23,"-155deg","hold"]]));
 motion.push(track("wheelTwo.cup0.rotation",[[26,"-90deg","linear"],[27,"-155deg","hold"]]));
 motion.push(track("wheelOne.rotation",[[20,"225deg","linear"],[23,"90deg","hold"],[31,"90deg","easeOut"],[32,"74deg","hold"]]));
 motion.push(track("wheelTwo.rotation",[[24,"315deg","linear"],[26,"450deg","hold"],[31,"450deg","easeOut"],[32,"468deg","hold"]]));
 motion.push(track("marble.position",travel));
 let spin=0;
 const spins: Key[] = travel.map(([t,p],i) => {
  if(i) { const prev=travel[i-1]![1] as [number,number]; const pt=p as [number,number]; if(!(t>20&&t<=23)&&!(t>24&&t<=26)) spin+=Math.hypot(pt[0]-prev[0],pt[1]-prev[1])/12*180/Math.PI; }
  return [t,`${n(spin)}deg`,"linear"];
 });
 motion.push(track("marble.turn.rotation",spins));
 motion.push("step finishFlag.visible { at 32s; value true; };");
 motion.push(track("finishFlag.position.y",[[32,955,"easeOut"],[32.5,850,"hold"]]));
 motion.push(track("button.position.y",[[31.8,906,"linear"],[32,911,"hold"]]));
 for(const [i,[a,b]] of cues.entries()) motion.push(`step captions.cue${i}.visible { at ${a}s; value true; };${b<35?`step captions.cue${i}.visible { at ${b}s; value false; };`:""}`);
 motion.push(track("camera(main).position",CAMERA.map(([t,x,y,,e])=>[t,[x,y],e])));
 motion.push(track("camera(main).zoom",CAMERA.map(([t,,,z,e])=>[t,z,e])));
 return `// THE MARBLE MACHINE — 35 seconds. Authored mechanics; sound cues are captions.
scene "the-marble-machine" { version "0.2"; viewport (1280, 720); background ${BG}; duration 35s;
 requires "easing.hold"; requires "geometry.roundedRect"; requires "text.basic"; requires "paint.radialGradient"; };
camera main { position (800, 500); zoom 0.62; };
// Cream wooden backboard and restrained construction lines.
${rect("backboard",50,40,1510,940,"#f7e8ca","stroke #e0c79d width 4;")}
${[130,440,750,1060,1470].map((x,i)=>line(`grain${i}`,x,60,x+25,960,"#efddba",2)).join("\n")}
${line("startingRamp",80,92,CUP[0],CUP[1]+18,TEAL,12)}
${rect("peg",110,70,10,36,WOOD)}
group seesaw { position (420, 210); rotation 0deg;
 ${rect("beam",-130,-5,260,10,YELLOW)}
 path cup { move (-131, -30); quadratic (-136, 0) (-110, 0); line (-89, 0); stroke ${YELLOW} width 6 cap round; };
};
polygon fulcrum { points ((403, 238), (437, 238), (420, 210)); fill ${WOOD}; };
${pivot("seesawPin",420,210)}
${rect("bumper",300,235,30,13,WOOD)}
group rod { position (520, 210); ${line("shaft",0,0,0,60,WOOD,6)} ${pivot("hinge",0,0)} };
group stopper { ${rect("block",306,220,20,13,"#dfaa77")} ${line("link",320,230,520,290,WOOD,3)} };
${line("exitRamp",547,239,580,310,TEAL,12)}
${line("approach",570,310,596,310,TEAL,12)}
${line("dominoBridge",638,318,1000,318,WOOD,12)}
${Array.from({length:8},(_,i)=>`group domino${i} { position (${600+i*48}, 310); ${rect("tile",-7,-60,14,60,CORAL,"stroke #cc584d width 2;")} ${circle("pip",0,-41,2,"#fff5df")} ${circle("pipTwo",0,-20,2,"#fff5df")} };`).join("\n")}
group trigger { position (990, 310); rotation 10deg; ${rect("beam",-45,-5,90,10,YELLOW)} };
${pivot("triggerPin",990,310)}
// Clear-sided holding pocket; open at top and at its right-hand outlet.
${rect("pocketGlass",594,352,94,63,"#c7edf040","stroke #76b7be width 2;")}
${line("pocketFloor",594,398,706,426,TEAL,9)}
${line("pocketWall",594,353,594,398,"#76b7be",4)}
path cord { move (1034, 363); line (674, 300); stroke #745b48 width 2; };
${pivot("guideOne",1034,363)} ${pivot("guideTwo",674,300)}
group cordLead { position (1034, 363); ${line("lead",0,0,0,-45,"#745b48",2)} };
group cordEnd { position (674, 300); ${line("tail",0,0,0,80,"#745b48",2)} };
${rect("gate",670,380,10,35,"#d94b46","zIndex 4;")}
${line("gateGuide",686,330,686,422,WOOD,3)}
path descent { move (706, 426); cubic (780, 458) (840, 518) (${n(polar(1000,600,70,225)[0])}, ${n(polar(1000,600,70,225)[1]+18)}); stroke ${TEAL} width 12 cap round; };
${wheel("wheelOne",1000,600,225)}
${line("wheelTransfer",1000,688,1249.497475,698.502525,TEAL,12)}
${wheel("wheelTwo",1200,730,315)}
${line("releaseTrack",1200,818,1200,838,TEAL,12)}
path finalRamp { move (1200, 838); cubic (1390, 843) (1280, 873) (1400, 880); cubic (1570, 883) (1540, 908) (1510, 918); stroke ${TEAL} width 12 cap round; };
ellipse bowl { position (1450, 900); size (166, 78); fill #f5c648; stroke #c89b30 width 5; };
ellipse bowlInner { position (1450, 900); size (138, 56); fill #e9b636; stroke #fff1a2 width 3; };
${circle("recess",1450,910,16,"#b98727")}
${rect("button",1442,906,16,8,"#d2972e")}
group finishFlag { visible false; position (0, 955); ${line("pole",1480,0,1480,65,WOOD,4)}
 ${Array.from({length:12},(_,i)=>rect(`check${i}`,1482+i%4*9,Math.floor(i/4)*9,9,9,(i%4+Math.floor(i/4))%2?"#fff5df":"#574942")).join("\n")}
};
group marble { position (100, 80); zIndex 8;
 group turn { ${circle("ball",0,0,12,"radial (-4, -5) 18 0 #9ae1ff 0.38 #258bd0 1 #114e92")}
 path band { move (-10, -5); quadratic (0, 2) (10, -5); stroke #fff9ef width 3 cap round; };
 };
 ${circle("glint",-4,-5,2.5,"#ffffff")}
};
group heading { space screen; zIndex 20; ${label("title",640,32,"THE MARBLE MACHINE",22)} ${label("subtitle",640,58,"ONE MARBLE  /  A WOODEN CHAIN REACTION",11)} };
group captions { space screen; zIndex 20; ${rect("plate",95,662,1090,42,"#fffaf0")}
 ${cues.map(([, ,words],i)=>label(`cue${i}`,640,683,words,15).replace("{ position", "{ visible false; position")).join("\n")}
};
${motion.join("\n")}
complete;
`;
}
function item(items: readonly ResolvedDrawItem[],id: string) {
 const found=items.find(i=>i.nodeId===id); if(!found) throw Error(`Missing draw item ${id}`); return found;
}
async function main() {
 const source=program(); writeFileSync(resolve(here,"the-marble-machine.ms"),source);
 const compileStart=performance.now(); const compiled=compileMotionScript(source); const compileMs=performance.now()-compileStart;
 if(compiled.diagnostics.length || !compiled.ok || !compiled.scene) throw Error(JSON.stringify(compiled.diagnostics));
 const scene=compiled.scene; const checked=validateSceneIR(scene); if(!checked.ok) throw Error(JSON.stringify(checked.diagnostics));
 const runtime=new AnimationRuntime(scene); const problems: string[]=[];
 const expect=(ok: boolean,msg: string)=>{if(!ok) problems.push(msg);};
 const cache=new Map<number, readonly ResolvedDrawItem[]>();
 const at=(t: number)=>{if(!cache.has(t)) cache.set(t,runtime.evaluate(t*1000).drawItems);return cache.get(t)!;};
 const position=(t: number,id: string,x=0,y=0)=>transformPoint(item(at(t),id).logicalMatrix,x,y);
 const worldPosition=(t: number,id: string)=>{const p=position(t,id),m=item(at(t),"backboard").logicalMatrix;return {x:(p.x-m[6])/m[0]+50,y:(p.y-m[7])/m[4]+40};};
 const angle=(t: number,id: string)=>{const m=item(at(t),id).logicalMatrix;return Math.atan2(m[1],m[0])*180/Math.PI;};
 const visible=(t: number,id: string)=>item(at(t),id).opacity>.99;
 const inside=(t: number,id: string,x=0,y=0,pad=18)=>{const p=position(t,id,x,y); expect(visible(t,id)&&p.x>=pad&&p.x<=1280-pad&&p.y>=80&&p.y<=650,`${t}s ${id} outside action area (${p.x},${p.y})`);};
 // Explicit world checkpoints converted with the runtime's own evaluated camera matrix.
 const marbleNear=(t: number,x: number,y: number,tolerance=0.1)=>{
  const draw=item(at(t),"marble.turn.ball");
  // Backboard is static world geometry: its matrix gives the current camera basis.
  const world=item(at(t),"backboard").logicalMatrix;
  const p=transformPoint(world,x-50,y-40),actual=transformPoint(draw.logicalMatrix,0,0);
  expect(Math.hypot(p.x-actual.x,p.y-actual.y)<tolerance,`${t}s marble misses (${x}, ${y})`);
 };
 marbleNear(0,100,80); marbleNear(10.5,581,292); marbleNear(12,630,388); marbleNear(17.5,630,388); marbleNear(18,706,408); marbleNear(23,1000,670); marbleNear(26,1200,800); marbleNear(27,1200,820); marbleNear(29,1510,900); marbleNear(32,1450,900); marbleNear(35,1450,900);
 for(let t=0;t<=35;t+=.05) { inside(t,"marble.turn.ball",-12,-12);inside(t,"marble.turn.ball",12,12); }
 for(const t of [0,5,10,16,20,26,31,35]) inside(t,"marble.turn.band");
 for(let t=5;t<=8;t+=.1) {
  const cup=position(t,"seesaw.beam",20,-13),ball=position(t,"marble.turn.ball");
  expect(Math.hypot(cup.x-ball.x,cup.y-ball.y)<.12,`${t}s marble leaves seesaw cup`);
  const rod=position(t,"rod.hinge"),end=position(t,"seesaw.beam",230,5);
  expect(Math.hypot(rod.x-end.x,rod.y-end.y)<.12,`${t}s rod leaves seesaw hinge`);
 }
 expect(angle(4,"marble.turn.band")!==angle(2,"marble.turn.band"),"marble stripe fails to roll");
 for(const t of [5,6,7,8]) { inside(t,"seesaw.beam",0,0); inside(t,"seesawPin"); }
 expect(Math.abs(angle(7,"seesaw.beam")+12)<.01,"seesaw does not lower its left end");
 expect(worldPosition(2,"peg").y<worldPosition(1.5,"peg").y,"peg fails to retract");
 expect(worldPosition(7.5,"stopper.block").x<worldPosition(7,"stopper.block").x,"stop fails to withdraw");
 for(let i=0;i<8;i++) {const t=10.5+i*4.5/7;expect(Math.abs(angle(t,`domino${i}.tile`))<.01,`domino ${i} falls early`);expect(Math.abs(angle(t+.55,`domino${i}.tile`)-78)<.01,`domino ${i} misses final angle`);inside(t+.3,`domino${i}.tile`,0,-30);}
 for(let t=12;t<=17.5;t+=.5) marbleNear(t,630,388);
 for(const id of ["pocketFloor","guideOne","guideTwo","triggerPin","gate"]) inside(17,id, id==="pocketFloor"?640:0,id==="pocketFloor"?409:0);
 expect(position(17.5,"gate").y<position(16,"gate").y-45,"gate fails to lift");
 // A radius witness on the cup must coincide with the evaluated marble centre.
 for(const [a,b,id] of [[20,23,"wheelOne"],[24,26,"wheelTwo"]] as const) for(let t=a;t<=b;t+=.125) {
  const cup=position(t,`${id}.cup0.lip`),ball=position(t,"marble.turn.ball");
  expect(Math.hypot(cup.x-ball.x,cup.y-ball.y)<.04,`${t}s marble loses ${id} cup`);
  inside(t,`${id}Axle`);
 }
 expect(!at(31.99).some(i=>i.nodeId==="finishFlag.check0"&&i.opacity>0),"flag rises early");
 expect(Math.abs(worldPosition(32.5,"finishFlag.check0").y-850)<.01,"flag does not reach its raised position");
 expect(visible(32.5,"finishFlag.check0"),"finish flag absent");
 for(const t of [33,35]) {
  for(const id of ["seesawPin","gate","wheelOneAxle","wheelTwoAxle","finishFlag.check0"]) inside(t,id);
  for(let i=0;i<8;i++) expect(Math.abs(angle(t,`domino${i}.tile`)-78)<.01,`final domino ${i} reset`);
  expect(Math.abs(angle(t,"seesaw.beam")-12)<.01,"final seesaw reset");
  expect(Math.abs(worldPosition(t,"gate").y-335)<.01,"final gate reset");
 }
 if(problems.length) throw Error(problems.join("\n"));
 const metrics={sourceBytes:Buffer.byteLength(source),maxSourceBytes:DEFAULT_LIMITS.maxSourceBytes,nodes:scene.nodes.length,maxNodes:DEFAULT_LIMITS.maxNodes,tracks:scene.timeline.tracks.length,maxTracks:DEFAULT_LIMITS.maxTracks,steps:scene.timeline.steps.length,maxSteps:DEFAULT_LIMITS.maxSteps,compileMs,builderMs:performance.now()-start};
 expect(metrics.sourceBytes<=metrics.maxSourceBytes,"source over budget");if(problems.length) throw Error(problems.join("\n"));
 console.log(JSON.stringify(metrics,null,2));
 const dir=process.env.GVR_PREVIEW_DIR;
 if(dir) {mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,"scene.json"),JSON.stringify(scene));writeFileSync(resolve(dir,"metrics.json"),JSON.stringify(metrics,null,2));
  const { capture }=await import("./the-marble-machine-preview"); await capture(scene,resolve(dir));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
