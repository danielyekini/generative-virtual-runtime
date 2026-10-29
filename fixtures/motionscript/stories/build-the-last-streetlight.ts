/** The Last Streetlight — deterministic noir story plate. Generated .ms only.
 * Run: npx tsx fixtures/motionscript/stories/build-the-last-streetlight.ts
 * GVR_PREVIEW_DIR enables production CanvasRenderer stills and a timed soundtrack.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type SceneIR } from "@gvr/schema";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary, chromeVersion } from "../../../evaluation/harness/chrome";
const START=performance.now(), HERE=dirname(fileURLToPath(import.meta.url)), ROOT=resolve(HERE,"../../..");
const ID="the-last-streetlight";
const TIMES=[0,1,2,4,5,5.5,5.8,6,7,8,8.5,8.65,9.5,10,10.7,11.8,12,12.7,13.5,14.8,15,16,17,17.5,17.65,18,18.15,18.5,19,20,21,23,24.5,24.75,25];
type Key=[number,number,string?];
const motion:string[]=[];
const f=(v:number)=>Number(v.toFixed(6));
function track(id:string,keys:Key[]) {
 const k=keys.map(x=>[...x] as Key); if(k[0]![0]>0)k.unshift([0,k[0]![1],"hold"]);if(k.at(-1)![0]<25)k.push([25,k.at(-1)![1]]);
 motion.push(`keyframes ${id} { start 0s; duration 25s;\n${k.map(([t,v,e])=>`  ${f(t*4)}% ${f(v)}${e?` ease ${e}`:""};`).join("\n")}\n};`);
}
function expr(id:string,e:string){motion.push(`animate ${id} { start 0s; duration 25s; expression "${e}"; };`);}
function visible(id:string,a:number,b=25){track(`${id}.opacity`,[[0,0,"hold"],[a,1,"hold"],...(b<25?[[b,0,"hold"] as Key]:[])]);}
function rect(id:string,x:number,y:number,w:number,h:number,c:string,extra=""){return `rectangle ${id} { position (${f(x)},${f(y)}); size (${f(w)},${f(h)}); fill ${c}; ${extra} };`;}
function line(id:string,x:number,y:number,xx:number,yy:number,c:string,w=2,extra=""){return `line ${id} { from (${f(x)},${f(y)}); to (${f(xx)},${f(yy)}); stroke ${c} width ${w}; ${extra} };`;}
function path(id:string,commands:string,c:string,extra=""){return `path ${id} { ${commands.replace(/cubic \(([^)]+)\)/g, (all, v:string)=>{const a=v.split(","); return a.length===6?`cubic (${a[0]},${a[1]}) (${a[2]},${a[3]}) (${a[4]},${a[5]})`:all;})} ${c==="none"?"":`fill ${c};`} ${extra} };`;}
function ellipse(id:string,x:number,y:number,w:number,h:number,c:string,extra=""){return `ellipse ${id} { position (${x},${y}); size (${w},${h}); ${c==="none"?"":`fill ${c};`} ${extra} };`;}
function group(id:string,body:string,extra=""){return `group ${id} { ${extra}\n${body}\n};`;}
function person(id:string,small=false):string {
 const c="#050609";
 const body=Array.from({length:5},(_,i)=>line(`drip${i}`,-28+i*14,-57,-30+i*14,-42,"#858c88",.7,"opacity 0.4;")).join("\n")+path("coat","move (-32,-205); line (22,-205); line (43,-65); line (13,-49); line (-9,-58); line (-45,-55); close;",c,"stroke #5d6060 width 1;")+
 path("lapel","move (-19,-204); line (-1,-176); line (10,-201); line (-1,-153); close;","#24272a")+
 group("head",ellipse("face",-1,-226,35,43,c)+path("nose","move (9,-237); line (25,-221); line (13,-218); close;",c)+
 path("crown","move (-25,-251); line (-20,-276); line (15,-279); line (26,-250); close;",c)+ellipse("brim",-1,-250,86,11,c)+
 line("hatband",-22,-254,22,-254,"#373a3c",4),"pivot (0,-213);")+
 path("legA","move (-28,-65); line (-4,-60); line (-8,-8); line (-30,-8); close;",c)+path("legB","move (2,-60); line (24,-64); line (33,-9); line (10,-9); close;",c)+
 group("shoeA",ellipse("sole",-21,-4,51,15,c)) + group("shoeB",ellipse("sole",26,-4,53,15,c))+
 group("arm",path("sleeve","move (15,-198); line (38,-190); line (48,-139); line (24,-132); close;",c)+ellipse("hand",34,-130,20,25,c),"position (0,0);")+
 (small?"":group("lighting",path("forearm","move (27,-160); line (49,-186); line (28,-213); line (14,-205); line (27,-184); line (10,-169); close;",c)+ellipse("shield",12,-211,26,18,c)+line("cigarette",13,-222,34,-222,"#b9b9ae",3)+ellipse("ember",35,-222,3,3,"#b9b9ae")+path("lowerface","move (-7,-226); line (10,-230); line (23,-218); line (8,-207); line (-3,-213); close;","#e8e5d4","opacity 0;")+ellipse("flame",26,-214,9,20,"#f3efdb")+ellipse("halo",26,-214,64,58,"#ede9d5","opacity 0.08;")));
 return group(id,body);
}
// Tall bespoke vector letters: one contour network per letter, no font dependency.
const GLYPHS:Record<string,number[][]>={
 T:[[0,0,40,0],[20,0,20,110]], H:[[0,0,0,110],[40,0,40,110],[0,55,40,55]], E:[[40,0,0,0,0,110,40,110],[0,54,31,54]],
 L:[[0,0,0,110,40,110]], A:[[0,110,17,0,23,0,40,110],[8,70,32,70]], S:[[40,0,0,0,0,52,40,58,40,110,0,110]],
 R:[[0,110,0,0,36,0,40,10,40,49,32,57,0,57],[20,57,40,110]], I:[[20,0,20,110],[5,0,35,0],[5,110,35,110]],
 G:[[40,6,32,0,8,0,0,10,0,100,8,110,40,110,40,60,23,60]]};
function glyph(ch:string){return GLYPHS[ch]!.map(points=>`move (${points[0]},${points[1]}); `+Array.from({length:points.length/2-1},(_,i)=>`line (${points[i*2+2]},${points[i*2+3]});`).join(" ")).join(" ");}
function program():string {
 const out:string[]=[];
 // City layers with windows and haze slats; architecture remains a coherent world through cuts.
 const quads=(x:number,y:number,w:number,h:number)=>`move (${x},${y}); line (${x+w},${y}); line (${x+w},${y+h}); line (${x},${y+h}); close; `;
 const masses=["",""],panes=["","",""],roofs:string[]=[];let coping="",aerials="";
 for(let i=0;i<13;i++){
  const x=-220+i*145,top=-390+(i*83%180),h=1050-top;
  masses[i%2]!+=quads(x,top,125,h)+quads(x+20,top-36,18,36);
  coping+=quads(x-5,top,135,9);aerials+=`move (${x+90},${top-65}); line (${x+90},${top}); `;
  for(let j=0;j<14;j++)panes[j%3]!+=quads(x+18+(j%3)*34,top+45+Math.floor(j/3)*100,12,35);
 }
 roofs.push(path("dark",masses[0]!,"#171b1f"),path("charcoal",masses[1]!,"#111519"),path("coping",coping,"#252a2d"),path("aerials",aerials,"none","stroke #31383a width 1;"));
 for(let j=0;j<3;j++)roofs.push(path(`windows${j}`,panes[j]!,"#b9bcb0",`opacity ${.12+j*.09};`));
 out.push(group("city",roofs.join("\n"),"zIndex 1;"));
 let train=rect("shell",0,0,420,43,"#030507")+rect("rail",-1800,45,3600,5,"#343b3d");
 for(let i=0;i<12;i++)train+=rect(`pane${i}`,8+i*34,9,20,17,"#aaa999","opacity 0.45;");
 out.push(group("train",train,"position (-600,100); zIndex 2;"));
 track("train.position.x",[[0,-650],[1.8,1500,"hold"]]);
 out.push(group("street",rect("road",-2200,720,5000,800,"#111519")+path("pavement","move (-2000,723); line (2000,723); line (2000,814); line (-2000,900); close;","#252a2d")+line("curb",-2000,900,2000,814,"#92958b",2)+line("gutter",-2000,923,2000,837,"#030507",24),"zIndex 3;"));
 out.push(group("alley",rect("mouth",790,370,195,370,"#020406")+path("litwall","move (790,370); line (812,393); line (812,730); line (790,740); close;","#4c5150")+path("band","move (822,670); line (970,670); line (1090,830); line (733,830); close;","#b6b8aa","opacity 0.12;")+rect("door",840,460,85,220,"#080b0d")+line("lintel",829,454,938,454,"#373d3e",3),"zIndex 4;"));
 out.push(group("lamp",path("beam","move (686,421); line (674,421); line (430,868); line (947,868); close;","#dddccb","opacity 0.09;")+line("post",680,415,680,810,"#020304",9)+path("crook","move (680,445); cubic (680,392,625,385,621,417);","none","stroke #090b0e width 8;")+ellipse("shade",621,419,72,18,"#030407")+ellipse("bulb",621,425,46,8,"#f1efdb"),"zIndex 5;"));
 const flicker:Key[]=[[0,1,"hold"],[17.5,.08,"hold"],[17.59,1,"hold"],[18,.02,"hold"],[18.14,1,"hold"]];track("lamp.opacity",flicker);
 out.push(group("pool",ellipse("puddle",642,860,280,42,"#05090c")+path("reflection","move (614,841); line (642,841); line (659,878); line (629,878); close;","#b8bdaf","opacity 0.65;")+line("stem",645,850,682,868,"#e4e4ce",3),"zIndex 6;"));
 track("pool.reflection.opacity",[[0,.65,"hold"],[5.5,.65],[5.65,.06],[7,.23,"hold"],[18,.23],[19,0]]);
 for(let i=0;i<5;i++){
 out.push(ellipse(`ring${i}`,639,859,35,7,"none",`stroke #c5c8b8 width 1; zIndex 7; opacity 0;`));
 track(`ring${i}.scale.x`,[[0,.2,"hold"],[5.5+i*.1,.2],[6.9+i*.1,6]]);track(`ring${i}.scale.y`,[[0,.2,"hold"],[5.5+i*.1,.2],[6.9+i*.1,4]]);
 track(`ring${i}.opacity`,[[0,0,"hold"],[5.5+i*.1,.7],[6.9+i*.1,0]]);
 }
 out.push(group("detective",person("body"),"position (622,856); zIndex 10; opacity 0;"));
 track("detective.opacity",[[0,0,"hold"],[5.15,1,"hold"],[18.4,1],[19,0]]);
 track("detective.body.shoeA.position.y",[[0,-75,"hold"],[5.15,-75,"easeIn"],[5.5,0,"hold"]]);
 track("detective.body.shoeB.position.x",[[0,150,"hold"],[5.5,150,"easeOut"],[5.95,0,"hold"]]);
 track("detective.body.lighting.position.y",[[0,45,"hold"],[7.9,45,"easeOut"],[8.4,0,"hold"]]);
 track("detective.body.lighting.opacity",[[0,0,"hold"],[7.9,0],[8.4,1,"hold"],[9.9,1],[10,0]]);
 track("detective.body.lighting.flame.opacity",[[0,0,"hold"],[8.5,1],[8.57,.3],[8.65,1],[9.2,.5],[9.9,0]]);
 track("detective.body.lighting.halo.opacity",[[0,0,"hold"],[8.5,.18],[8.65,.04],[9.2,.07],[9.9,0]]);
 track("detective.body.lighting.lowerface.opacity",[[0,0,"hold"],[8.5,.75],[8.75,0]]);
 track("detective.position.x",[[0,622,"hold"],[9.9,622],[10.4,427,"hold"],[15,427],[17,750]]);
 track("detective.body.head.rotation",[[0,0,"hold"],[10.4,0],[11.8,.2,"hold"]]);
 track("detective.body.scale.x",[[0,1,"hold"],[10,1],[11,1.35,"hold"],[15,1.35],[17,1]]);
 track("detective.body.scale.y",[[0,1,"hold"],[10,1],[11,1.35,"hold"],[15,1.35],[17,1]]);
 out.push(group("stranger",person("body",true)+rect("case",30,-135,49,35,"#010304","stroke #5a6060 width 1;")+line("handle",42,-143,62,-143,"#a3a99e",3),"position (790,731); scale (0.55,0.55); zIndex 8; opacity 0;"));
 visible("stranger",10,12);track("stranger.position.x",[[0,770,"hold"],[10,770],[12,977,"hold"]]);expr("stranger.body.position.y","2 * sin(local_t * 18)");
 out.push(group("headlights",path("sweep","move (-200,720); line (1200,500); line (1200,820); close;","#f0f1d9","opacity 0.16;"),"zIndex 11; opacity 0;"));
 track("headlights.position.x",[[0,-1200,"hold"],[11.8,-1200],[12.6,900]]);visible("headlights",11.8,13.5);
 out.push(group("car",path("shell","move (-430,0); line (-380,-100); line (-200,-160); line (190,-160); line (310,-83); line (600,-60); line (640,100); line (-430,100); close;","#030507","stroke #3b4346 width 3;")+path("glass","move (-174,-148); line (180,-148); line (279,-83); line (-243,-83); close;","#272e30")+line("chrome",-400,15,580,15,"#969c93",3)+ellipse("wheelA",-240,95,125,125,"#010203")+ellipse("wheelB",370,95,125,125,"#010203"),"position (-1500,730); zIndex 12; opacity 0;"));
 visible("car",12,13.5);track("car.position.x",[[0,-1500,"hold"],[12,-1500],[12.3,700],[13.1,900],[13.5,2200]]);
 out.push(group("clue",path("waterA","move (-150,3); cubic (-80,-12,-31,-13,-16,-20); cubic (8,-38,32,-20,53,-17); line (120,-28);","none","stroke #838e8b width 1;")+path("waterB","move (-140,18); cubic (-40,4,-30,35,40,15); line (140,3);","none","stroke #5b6565 width 1;")+rect("cover",-16,-12,35,23,"#8e3439","rotation -9deg; stroke #c66b68 width 0.7;")+line("crease",-13,4,18,-1,"#391c24",2)+line("mark",-7,-6,9,-8,"#d5b4a0",1),"position (830,861); zIndex 9; opacity 0;"));
 visible("clue",13.5);expr("clue.waterA.position.x","sin(local_t * 3)*4");expr("clue.waterB.position.x","sin(local_t * 2+1)*6");
 out.push(path("shadow","move (650,850); line (730,795); line (836,858); line (859,878); line (745,854); close;","#020405","zIndex 14; opacity 0;"));
 track("shadow.opacity",[[0,0,"hold"],[15,.1],[17,.78,"hold"],[18.3,.78],[19,0]]);track("shadow.position.x",[[0,-130,"hold"],[15,-130],[17,0,"hold"]]);
 out.push(group("reach",path("hand","move (-20,-100); line (8,-100); line (18,-35); line (8,-15); line (-7,-18); line (-15,-40); close;","#040608"),"position (830,800); zIndex 15; opacity 0;"));track("reach.opacity",[[0,0,"hold"],[17.15,0],[17.45,.8],[17.5,0]]);
 // Smoke crosses the lens as a translucent ribbon, not a cut to an unrelated shot.
 let smoke="";for(let i=0;i<7;i++){
 smoke+=path(`wisp${i}`,`move (${460+i*14},510); cubic (${420+i*18},460,${600+i*15},430,${540+i*8},370); cubic (${500+i*19},320,${650+i*12},290,${610+i*14},220);`,"none",`stroke #bfc6bf width ${2+i*2}; opacity ${.18-i*.018};`);
 }out.push(group("smoke",smoke,"space screen; zIndex 20; opacity 0;"));
 track("smoke.opacity",[[0,0,"hold"],[9.1,0],[9.8,.55],[10.15,.72],[10.8,0]]);track("smoke.position.x",[[0,0,"hold"],[9.1,0],[10.8,400]]);
 out.push(rect("outage",0,0,1280,720,"#000000","space screen; zIndex 24; opacity 0;"));
 track("outage.opacity",[[0,0,"hold"],[17.5,.88,"hold"],[17.59,0,"hold"],[18,.95,"hold"],[18.14,0,"hold"]]);
 out.push(group("title",rect("night",0,0,1280,720,"#030609","opacity 0;")+group("letters",""),"space screen; zIndex 25;"));
 track("title.night.opacity",[[0,0,"hold"],[18.4,0],[19.3,.98]]);
 const letters:string[]=[];let count=0;
 for(const [row,word] of ["THE LAST","STREETLIGHT"].entries()){
 const spacing=74,total=(word.length-1)*spacing+40,start=(1280-total)/2;
 for(let i=0;i<word.length;i++){
 const ch=word[i]!;if(ch===" ")continue;const id=`g${count}`,x=start+i*spacing,y=178+row*164,at=19+(x/1280)*1.5;
 letters.push(group(id,path("ink",glyph(ch),"none","stroke #e5e3d0 width 8 cap square join miter;")+line("stem",20,0,20,110,"#666e6a",7,"opacity 0;"),`position (${x},${y}); opacity 0;`));
 track(`title.letters.${id}.opacity`,[[0,0,"hold"],[18,.22,"hold"],[18.5,.22],[18.7,.35],[19,.55],[at,.55],[at+.25,1]]);
 track(`title.letters.${id}.position.x`,[[0,640+(i-4)*7,"hold"],[18.5,640+(i-4)*7],[19,x,"easeOut"],[21,x]]);
 track(`title.letters.${id}.position.y`,[[0,610,"hold"],[18.5,610],[19,y+20,"easeOut"],[21,y]]);
 track(`title.letters.${id}.scale.y`,[[0,2.8,"hold"],[18.5,2.8],[19,1.3],[21,1]]);
 track(`title.letters.${id}.ink.opacity`,[[0,0,"hold"],[18.5,0],[19,.25],[at,.25],[at+.25,1]]);
 track(`title.letters.${id}.stem.opacity`,[[0,0,"hold"],[18,.5,"hold"],[19,.5],[20,0]]);
 count++;
 }}
 out[out.length-1]=out.at(-1)!.replace("group letters { \n\n};",group("letters",letters.join("\n")));
 // Reflected letters: hand-authored broken rows, not an opaque mirrored title.
 let reflection="";
 for(let band=0;band<11;band++){
  let segments="";
  for(const [row,word] of ["THE LAST","STREETLIGHT"].entries())for(let i=0;i<word.length;i++){
   const ch=word[i]!;if(ch===" ")continue;
   const x=(1280-((word.length-1)*74+40))/2+i*74;
   for(const points of GLYPHS[ch]!)for(let j=0;j<points.length-2;j+=2){
    const ax=x+points[j]!,ay=646-(row*164+points[j+1]!)*.22,bx=x+points[j+2]!,by=646-(row*164+points[j+3]!)*.22;
    const lo=580+band*6,hi=lo+4;
    if(ay===by){if(ay>=lo&&ay<=hi)segments+=`move (${f(ax)},${f(ay)}); line (${f(bx)},${f(by)}); `;continue;}
    const a=Math.max(0,Math.min((lo-ay)/(by-ay),(hi-ay)/(by-ay))),b=Math.min(1,Math.max((lo-ay)/(by-ay),(hi-ay)/(by-ay)));
    if(a<b)segments+=`move (${f(ax+(bx-ax)*a)},${f(ay+(by-ay)*a)}); line (${f(ax+(bx-ax)*b)},${f(ay+(by-ay)*b)}); `;
   }
  }
  reflection+=path(`r${band}`,segments||"move (0,0);","none",`stroke #aebdaf width ${band%2?1.5:2.5}; opacity ${.25+(band%3)*.09};`);
  expr(`reflection.r${band}.position.x`,`sin(local_t * ${f(1+band*.13)} + ${band}) * ${3+band%4}`);
 }
 out.push(group("reflection",reflection,"space screen; zIndex 26; opacity 0;"));track("reflection.opacity",[[0,0,"hold"],[19,0],[21,1]]);
 out.push(group("revealbeam",path("ray","move (0,100); line (24,100); line (180,470); line (145,470); close;","#eef2dc","opacity 0.08;"),"space screen; zIndex 27; opacity 0;"));visible("revealbeam",19,21);track("revealbeam.position.x",[[0,-200,"hold"],[19,-200],[21,1400]]);
 out.push(group("solitary",person("body",true)+path("emptyalley","move (260,0); line (260,-290); line (420,-290); line (420,0);","none","stroke #394340 width 3;")+line("post",90,-340,90,0,"#91998e",3)+ellipse("light",90,-339,35,6,"#e4e6d0")+path("pool","move (90,-333); line (-120,4); line (240,4); close;","#c7cdbb","opacity 0.07;"),"space screen; position (640,637); scale (0.31,0.31); zIndex 28; opacity 0;"));track("solitary.opacity",[[0,0,"hold"],[22.85,0],[23,1]]);
 // Three moving depth layers. Long compound paths amortise nodes; tiles wrap only outside the viewport.
 for(let layer=0;layer<3;layer++)for(let tile=0;tile<3;tile++){
 let commands="";for(let i=0;i<150;i++){const x=(i*137+layer*41)%1700-180,y=(i*97)%900;commands+=`move (${x},${y}); line (${x-6-layer*4},${y+18+layer*11}); `;}
 const id=`rain${layer}t${tile}`;
 out.push(path(id,commands,"none",`space screen; zIndex ${layer===0?7:layer===1?23:30}; stroke #bac7c4 width ${.6+layer*.4}; opacity ${.13+layer*.05};`));
 const keys:Key[]=[],xs:Key[]=[];const period=1.9-layer*.4;
 for(let k=0;k<=Math.ceil(25/period)+1;k++){
 const t=k*period-tile*period/3;if(t<0)continue;if(t>25)break;
 if(t>0){keys.push([f(t-.001),900,"hold"]);xs.push([f(t-.001),-270,"hold"]);}
 keys.push([f(t),-900]);xs.push([f(t),270]);
 }
 // Stagger starting positions, then drop a tile through 1800px; repeating compound sheets overlap.
 const phase=tile/3;keys.unshift([0,-900+phase*1800]);xs.unshift([0,270-phase*540]);
 const dedup=(a:Key[])=>a.filter((v,i)=>i===0||v[0]>a[i-1]![0]);
 track(`${id}.position.y`,dedup(keys));track(`${id}.position.x`,dedup(xs));
 }
 let grain="";for(let i=0;i<650;i++){const x=(i*331)%1280,y=(i*191)%720;grain+=`move (${x},${y}); line (${x+1},${y}); `;}
 out.push(path("grain",grain,"none","space screen; zIndex 35; stroke #cad1c8 width 1; opacity 0.07;"));expr("grain.position.x","sin(local_t*41)*3");expr("grain.position.y","sin(local_t*57)*2");
 out.push(group("frame",rect("topbar",0,0,1280,55,"#000000")+rect("bottombar",0,665,1280,55,"#000000"),"space screen; zIndex 40;"));
 out.push(rect("fade",0,0,1280,720,"#000000","space screen; zIndex 50; opacity 0;"));track("fade.opacity",[[0,0,"hold"],[24.5,0],[25,1]]);
 // Continuous crane down, puddle settle, upward tilt, over-shoulder and clue push.
 track("camera(main).position.x",[[0,640,"hold"],[10,640],[11,720,"hold"],[15,720,"easeInOut"],[17,830,"hold"]]);
 track("camera(main).position.y",[[0,40],[4,810,"easeOut"],[5,850,"hold"],[6,850,"easeInOut"],[8,665,"hold"],[10,665],[11,650,"hold"],[15,650,"easeInOut"],[17,855,"hold"]]);
 track("camera(main).zoom",[[0,.9],[4,1.25],[5,2.25,"hold"],[6,2.25,"easeInOut"],[8,1.65,"hold"],[10,1.65],[11,1.1,"hold"],[15,1.1,"easeInOut"],[17,3.6,"hold"]]);
 track("title.letters.scale.x",[[0,1.04,"hold"],[19,1.04],[21,1]]);track("title.letters.position.x",[[0,-25.6,"hold"],[19,-25.6],[21,0]]);
 return `// THE LAST STREETLIGHT. Generated; edit the builder only.\n// Sound cues are in the generated 25s companion WAV; MotionScript playback is silent.\nscene "${ID}" { version "0.2"; viewport (1280,720); duration 25s; background #080c10; requires "easing.hold"; };\ncamera main { position (640,40); zoom 0.9; };\n${out.join("\n")}\n${motion.join("\n")}\ncomplete;\n`;
}
/** Use the production renderer, with browser fonts and real occlusion. No SVG proxy. */
async function previews(scene: SceneIR, output: string): Promise<void> {
  const { createServer }=await import("vite");
  const server=await createServer({root:ROOT,configFile:false,server:{host:"127.0.0.1",port:0},plugins:[{name:"story-preview",configureServer(s){s.middlewares.use((req,res,next)=>{
    if(req.url==="/story-scene") {res.setHeader("Content-Type","application/json");res.end(JSON.stringify(scene));return;}
    if(req.url==="/story-preview") {res.setHeader("Content-Type","text/html");res.end(`<canvas id="c"></canvas><script type="module">import {CanvasRenderer} from '/packages/canvas-renderer/src/index.ts'; import {AnimationRuntime} from '/packages/runtime/src/index.ts'; const s=await (await fetch('/story-scene')).json();const r=new AnimationRuntime(s),c=document.querySelector('canvas'),p=new CanvasRenderer(c);p.resize(1280,720,1);window.captureStory=(t)=>{p.render(r.evaluate(t*1000));return c.toDataURL('image/png')};</script>`);return;} next();
  });}}]});
  await server.listen();
  const address=server.httpServer!.address() as {port:number};
  mkdirSync(output,{recursive:true});
  const profile=resolve(ROOT,"work",`${ID}-chrome-${process.pid}`); mkdirSync(profile,{recursive:true});
  const chrome=resolveChromeBinary();
  console.log(chromeVersion(chrome));
  const child=spawn(chrome,["--headless=new","--no-sandbox","--disable-gpu","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  let socket: WebSocket|undefined;
  try {
    const url=await new Promise<string>((ok,fail)=>{let log="";const timer=setTimeout(()=>fail(Error("Chromium startup timeout")),15000);child.stderr!.on("data",b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);ok(m[1]!);}});child.on("error",fail);});
    socket=new WebSocket(url); await new Promise<void>((ok,fail)=>{socket!.onopen=()=>ok();socket!.onerror=()=>fail(Error("CDP connection"));});
    const cdp=new Cdp(socket);
    const {targetId}=await cdp.send("Target.createTarget",{url:`http://127.0.0.1:${address.port}/story-preview`});
    const {sessionId}=await cdp.send("Target.attachToTarget",{targetId,flatten:true});
    const evaluate=async (expression:string)=> {const r=await cdp.send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    for(let i=0;i<100;i++){if(await evaluate("typeof window.captureStory==='function'"))break;await new Promise(r=>setTimeout(r,100));}
    for(const t of TIMES) {const data=await evaluate(`window.captureStory(${t})`);writeFileSync(resolve(output,`f${t.toFixed(4)}.png`),Buffer.from(data.split(",")[1],"base64"));}
    if(process.env.GVR_VIDEO==="1") {
      const frames=resolve(ROOT,"work",`${ID}-video`);mkdirSync(frames,{recursive:true});
      for(let i=0;i<750;i++) {const data=await evaluate(`window.captureStory(${i===749?25:i/30})`);writeFileSync(resolve(frames,`f${String(i).padStart(4,"0")}.png`),Buffer.from(data.split(",")[1],"base64"));if(i%150===0)console.log(`Video frame ${i}/750`);}
      execFileSync("ffmpeg",["-y","-framerate","30","-i",resolve(frames,"f%04d.png"),"-i",resolve(output,"soundtrack.wav"),"-c:v","libx264","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-t","25","-movflags","+faststart",resolve(output,"the-last-streetlight.mp4")],{stdio:"ignore"});
    }
    console.log(`CanvasRenderer stills: ${output}`);
  } finally {socket?.close();child.kill();await server.close();}
}
/** Runtime evidence observes production draw items, including inherited opacity and camera mapping. */
function checks(scene:SceneIR) {
 const runtime=new AnimationRuntime(scene), cache=new Map<number,ReturnType<AnimationRuntime["evaluate"]>["drawItems"]>();
 const frame=(t:number)=>{if(!cache.has(t)){cache.set(t,runtime.evaluate(t*1000).drawItems);if(runtime.lastDiagnostics.length)throw Error(JSON.stringify(runtime.lastDiagnostics));}return cache.get(t)!;};
 const item=(t:number,id:string)=>{const d=frame(t).find(d=>d.nodeId===id);if(!d)throw Error(`Missing ${id} @ ${t}`);return d;};
 const assert=(v:boolean,m:string)=>{if(!v)throw Error(m);};
 const pos=(t:number,id:string,x=0,y=0)=>transformPoint(item(t,id).logicalMatrix,x,y);
 const on=(t:number,id:string,x=0,y=0,min=.01)=>{const d=item(t,id),p=pos(t,id,x,y);assert(d.opacity>=min&&p.x>=0&&p.x<=1280&&p.y>=55&&p.y<=665,`${id} off screen or hidden @ ${t}: ${JSON.stringify(p)} opacity ${d.opacity}`);};
 on(0,"city.windows1",702,-207);on(1,"train.shell",210,20);
 assert(pos(4,"pool.puddle").y<pos(0,"pool.puddle").y,"Crane fails to descend");on(5,"pool.puddle");
 on(5.5,"detective.body.shoeA.sole");on(6,"detective.body.shoeB.sole");on(5.8,"ring1");
 assert(item(5.8,"pool.reflection").opacity<.15,"Footstep must break reflection");
 on(8,"detective.body.head.brim");on(8.65,"detective.body.lighting.flame");on(8.5,"detective.body.lighting.lowerface",7,-220);
 assert(item(10,"detective.body.lighting.flame").opacity===0,"Flame must extinguish");on(10,"smoke.wisp2",550,370);
 assert(Math.abs(Math.atan2(item(11.8,"detective.body.head.brim").logicalMatrix[1]!,item(11.8,"detective.body.head.brim").logicalMatrix[0]!)-.2)<.001,"Head must turn independently toward alley");
 on(10.7,"stranger.case",20,15);on(11.8,"stranger.body.head.brim");
 assert(pos(11.8,"stranger.case").x>pos(10.7,"stranger.case").x,"Stranger must cross left to right");
 on(12.7,"car.shell");assert(frame(12.7).findIndex(d=>d.nodeId==="car.shell")>frame(12.7).findIndex(d=>d.nodeId==="alley.mouth"),"Car must cover alley");
 assert(item(13.5,"stranger.case").opacity===0&&item(13.5,"car.shell").opacity===0,"Car and stranger must clear");
 on(14.8,"clue.cover",17,11);on(17,"clue.cover",17,11);on(17,"shadow",830,860);
 assert(pos(17,"clue.cover").x>pos(17,"shadow",650,850).x,"Shadow must approach clue from left");
 for(const t of [17.5,18])assert(item(t,"lamp.bulb").opacity<.1,`Flicker absent ${t}`);
 assert(item(17.65,"lamp.bulb").opacity>.9&&item(18.15,"lamp.bulb").opacity>.9,"Light must recover twice");
 on(18.7,"title.letters.g8.stem",20,50);
 for(let i=0;i<18;i++){on(21,`title.letters.g${i}.ink`,20,55,.95);on(24.5,`title.letters.g${i}.ink`,20,55,.95);}
 on(21,"reflection.r8",640,630);on(23.2,"solitary.body.head.brim");on(24.5,"solitary.light");
 assert(item(22.8,"solitary.body.head.brim").opacity===0,"Final silhouette appears too early");
 assert(item(24.5,"fade").opacity===0&&Math.abs(item(24.75,"fade").opacity-.5)<.001&&item(25,"fade").opacity===1,"Final fade timing");
 for(const t of TIMES)for(let l=0;l<3;l++)assert(frame(t).filter(d=>d.nodeId.startsWith(`rain${l}`)).some(d=>d.opacity>.1),`Rain layer ${l} absent @ ${t}`);
 // Frame-by-frame title bounds, and deterministic reverse seeking across all cuts.
 for(let t=21;t<=24.5;t+=1/30)for(let i=0;i<18;i++){on(t,`title.letters.g${i}.ink`,0,0,.95);on(t,`title.letters.g${i}.ink`,40,110,.95);}
 for(const t of [25,8.5,0,17,12.7,23])assert(JSON.stringify(runtime.evaluate(t*1000).drawItems)===JSON.stringify(frame(t)),`Seek ${t}`);
 console.log(`Runtime checks passed: all five beats; 30fps title bounds; ${TIMES.length} still moments.`);
}
/** Offline procedural score: seeded rain, train, footsteps, match, tyres, buzz, bass, trumpet, piano and final drip.
 * No runtime randomness or external samples. PCM mono 22050Hz; soundtrack is a host-side workaround.
 */
function soundtrack(output:string) {
 const rate=22050,n=25*rate,data=new Float32Array(n);let seed=7109,low=0;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
 for(let i=0;i<n;i++){const t=i/rate,r=noise();low=low*.95+r*.05;const soften=t<17?1:t<19?.4:.7,fade=t<24.5?1:Math.max(0,(25-t)*2);data[i]=((r-low)*.045+low*.1)*soften*fade;data[i]!+=Math.sin(2*Math.PI*41.2*t)*.025*Math.min(1,t)*fade;}
 const add=(start:number,duration:number,fn:(t:number)=>number)=>{for(let j=0;j<duration*rate&&Math.round(start*rate)+j<n;j++)data[Math.round(start*rate)+j]!+=fn(j/rate);};
 add(.3,3.9,t=>(noise()*.08+Math.sin(t*76)*.04)*Math.sin(Math.PI*t/3.9)**2);
 for(const t of [5.5,5.96])add(t,.42,s=>(noise()*.21*Math.exp(-s*17)+Math.sin(s*350)*.1*Math.exp(-s*28)));
 add(6,.8,t=>noise()*.025*Math.exp(-t*4));add(8.5,.22,t=>noise()*.11*Math.exp(-t*18));
 for(const [start,hz,dur] of [[8.65,146.83,.65],[9.35,174.61,.5],[10,164.81,.85],[20.9,146.83,1.1],[22.1,110,1.7]] as const)add(start,dur,t=>{const env=Math.min(1,t*12)*Math.min(1,(dur-t)*6);return (Math.sin(2*Math.PI*hz*t)+.25*Math.sin(4*Math.PI*hz*t)+.12*Math.sin(6*Math.PI*hz*t))*.035*env;});
 for(const t of [10.55,11.25])add(t,.17,s=>noise()*.07*Math.exp(-s*30));
 add(11.8,2.7,t=>{const env=Math.sin(Math.PI*t/2.7)**2;return (noise()*.08+Math.sin(2*Math.PI*(65*t-5*t*t))*.045)*env;});
 add(17.2,1.4,t=>Math.sin(2*Math.PI*100*t)*.02);
 for(const t of [17.5,18])add(t,.035,s=>noise()*.2*Math.exp(-s*130));
 for(const hz of [55,110,130.81,164.81])add(21,3.7,t=>(Math.sin(2*Math.PI*hz*t)+.2*Math.sin(2*Math.PI*hz*2.002*t))*.035*Math.exp(-t*1.1)*Math.min(1,t*100));
 add(24.83,.16,t=>Math.sin(2*Math.PI*(1100*t-1500*t*t))*.15*Math.exp(-t*28));
 const wav=Buffer.alloc(44+n*2);wav.write('RIFF',0);wav.writeUInt32LE(36+n*2,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[i]!))*32767),44+i*2);
 writeFileSync(resolve(output,'soundtrack.wav'),wav);
}
async function main(){
 const source=program();writeFileSync(resolve(HERE,`${ID}.ms`),source);
 if(Buffer.byteLength(source)>DEFAULT_LIMITS.maxSourceBytes)throw Error('Source budget exceeded');
 const start=performance.now(),compiled=compileMotionScript(source),compileMs=performance.now()-start;
 if(!compiled.ok||!compiled.scene||compiled.diagnostics.length)throw Error(JSON.stringify(compiled.diagnostics.slice(0,12)));
 const validated=validateSceneIR(compiled.scene);if(!validated.ok)throw Error(JSON.stringify(validated.diagnostics));
 checks(compiled.scene);
 const runtime=new AnimationRuntime(compiled.scene);for(let i=0;i<20;i++)runtime.evaluate(i*1250);
 const evalStart=performance.now();for(let i=0;i<150;i++)runtime.evaluate(i*1000/6);const evaluationMsPerFrame=(performance.now()-evalStart)/150;
 const stats={sourceLines:source.split('\n').length-1,sourceBytes:Buffer.byteLength(source),nodes:compiled.scene.nodes.length,tracks:compiled.scene.timeline.tracks.length,steps:compiled.scene.timeline.steps.length,keyframeValues:compiled.scene.timeline.tracks.reduce((n,t)=>n+('keyframes' in t?(t.keyframes as unknown[]).length:0),0),compileMs,evaluationMsPerFrame,builderMsBeforePreviews:performance.now()-START,geometryItems:compiled.scene.nodes.reduce((n,node)=>n+(node.kind==="path"?node.commands.length:node.kind==="polygon"?node.points.length:0),0),builderLines:readFileSync(fileURLToPath(import.meta.url),"utf8").split("\n").length-1,builderBytes:readFileSync(fileURLToPath(import.meta.url)).length,limits:DEFAULT_LIMITS,times:TIMES};
 console.log(JSON.stringify(stats,null,2));
 if(process.env.GVR_PREVIEW_DIR){const output=resolve(process.env.GVR_PREVIEW_DIR);mkdirSync(output,{recursive:true});soundtrack(output);await previews(compiled.scene,output);writeFileSync(resolve(output,'measurements.json'),JSON.stringify({...stats,builderMsIncludingPreviews:performance.now()-START},null,2)+'\n');}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
