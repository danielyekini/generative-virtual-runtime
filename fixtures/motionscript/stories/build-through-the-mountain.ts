/** Through the Mountain — generated story plate.
 * npx tsx fixtures/motionscript/stories/build-through-the-mountain.ts
 * GVR_PREVIEW_DIR opts into real CanvasRenderer PNG captures in Chromium.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem, type SceneIR } from "@gvr/schema";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary, chromeVersion } from "../../../evaluation/harness/chrome";

const START = performance.now();
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const ID = "through-the-mountain";
const TIMES = [0, 1, 3, 4, 5, 8, 10, 11, 11.5, 12.5625, 13, 13.9625, 14.675, 15.3875, 15.5, 15.999, 16, 18, 19.5, 20.999, 21, 22, 23, 24, 25, 26, 27.5, 29, 30];
type Key = [number, number, string?];
const motion: string[] = [];
const f = (v: number) => Number(v.toFixed(6));
function track(id: string, keys: Key[]): void {
  const k = [...keys];
  if (k[0]![0] !== 0) k.unshift([0, k[0]![1], "hold"]);
  if (k.at(-1)![0] !== 30) k.push([30, k.at(-1)![1]]);
  motion.push(`keyframes ${id} { start 0s; duration 30s; ${k.map(([t,v,e]) => `${f(t / 30 * 100)}% ${f(v)}${e ? ` ease ${e}` : ""};`).join(" ")} };`);
}
function show(id: string, a: number, b = 30): void {
  if (a > 0) motion.push(`step ${id}.visible { at ${a}s; value true; };`);
  if (b < 30) motion.push(`step ${id}.visible { at ${b}s; value false; };`);
}
function rect(id: string,x: number,y: number,w: number,h: number,c: string,extra=""): string {
  return `rectangle ${id} { position (${x},${y}); size (${w},${h}); fill ${c}; ${extra} };`;
}
function line(id: string,x: number,y: number,xx: number,yy: number,c: string,w=2): string {
  return `line ${id} { from (${x},${y}); to (${xx},${yy}); stroke ${c} width ${w} cap round; };`;
}
function circle(id: string,x: number,y: number,r: number,c: string,extra=""): string {
  return `circle ${id} { position (${x},${y}); radius ${r}; fill ${c}; ${extra} };`;
}
function path(id: string,commands: string,c: string,extra=""): string {
  return `path ${id} { ${commands} fill ${c}; ${extra} };`;
}
const cameraOffset = (t: number): number => t<=4 ? 0 : t<5 ? 80*(t-4)**2 : t<=11 ? 80+160*(t-5) : t<11.5 ? 1040+160*(t-11)-160*(t-11)**2 : 1080;
const samples = (fn: (t:number)=>number,a=0,b=30,dt=.25): Key[] => {
  const k: Key[]=[]; for(let t=a;t<=b+.00001;t+=dt) k.push([f(t), fn(t)]); return k;
};
function train(id: string, interior=false): string {
  const cars: string[] = [];
  for(let i=0;i<4;i++) {
    const x = i===0 ? -110 : -110-i*114;
    const w = i===0 ? 110 : 100;
    const part = `${id}.v${i}`;
    let body = rect("shell",x,-69,w,48,i===0?"#b73530":"#eadbb4") + rect("skirt",x,-28,w,10,i===0?"#7e2629":"#a68769") + rect("roof",x-3,-76,w+6,9,"#34474c");
    if(i===0) body += rect("boiler",-64,-57,64,32,"#c33d32")+rect("chimney",-28,-94,14,24,"#34474c")+rect("cabglass",-99,-64,24,23,"#f5c87c")+line("cowcatch",-5,-18,9,-9,"#34474c",5)+circle("lamp",-1,-49,5,"#ffe5a0");
    else for(let j=0;j<4;j++) {
      const wx=x+9+j*22;
      body += rect(`pane${j}`,wx,-62,16,24,interior?"#f7bf61":"#eed298");
      if(interior) body += circle(`head${j}`,wx+8,-54,3,"#674f43")+rect(`person${j}`,wx+4,-50,8,10,"#674f43");
      else body += rect(`shine${j}`,wx+2,-60,3,19,"#fff4d0","opacity 0.55;");
    }
    // Colour overlays, rather than unsupported animated solid fill.
    body += rect("shade",x,-69,w,48,"#182f3e","opacity 0;");
    track(`${part}.shade.opacity`,[[0,0,"hold"],[12.5625+i*.7125,0],[13.25+i*.7125,.4,"hold"],[19,.4],[21,.15,"hold"],[21.1+i*.7125,.15],[21.8+i*.7125,0]]);
    if(i===0) {body += rect("nosewash",-35,-57,35,32,"#b8dce8","opacity 0;");track(`${part}.nosewash.opacity`,[[0,0,"hold"],[18.8,0],[19.6,.35,"hold"],[21,.35],[21.7,0]]);}
    body += rect("coolwash",x,-69,w,48,"#93c5df","opacity 0;");
    if(interior) track(`${part}.coolwash.opacity`,[[0,.08,"hold"],[12.5625+i*.7125,.08],[13.25+i*.7125,0,"hold"],[19.6+i*.15,0],[21,.28,"hold"],[21.1+i*.7125,.28],[21.8+i*.7125,.14]]);
    else if(id==="snow.train") track(`${part}.coolwash.opacity`,[[0,0,"hold"],[21+i*.7125,0],[21.7+i*.7125,.17]]);
    else track(`${part}.coolwash.opacity`,[[0,.12,"hold"],[12.5625+i*.7125,.12],[13.25+i*.7125,0]]);
    for(let j=0;j<2;j++) {
      const wx=x+20+j*(w-40);
      body += `group wh${j} { position (${wx},-12); ${circle("rim",0,0,12,"#263b42")} ${circle("hub",0,0,8,"#9b9b83")} ${line("spoke",-7,0,7,0,"#33454a",2)} ${line("spokeB",0,-7,0,7,"#33454a",2)} };`;
      // 160 px/s and wheel radius 12: angular speed 13 1/3 rad/s, clockwise.
      track(`${part}.wh${j}.rotation`,[[0,0],[30,400]]);
    }
    if(i>0) body += line("coupler",x+100,-23,x+114,-23,"#34474c",3);
    cars.push(`group v${i} { ${body} };`);
  }
  const puffs = Array.from({length:5},(_,i)=> {
    const pid=`${id}.puff${i}`;
    // A deterministic cyclic plume; generated keys keep seeks independent of history.
    const ks: Key[]=[], ys: Key[]=[], al: Key[]=[];
    for(let t=0;t<=30;t+=.1) {
      const age=((t+i*.22)%1.1)/1.1;
      ks.push([f(t),-20-age*145]); ys.push([f(t),-101-age*65]); al.push([f(t),(t>=16&&t<21?0:Math.sin(age*Math.PI)*.6)]);
    }
    track(`${pid}.position.x`,ks); track(`${pid}.position.y`,ys); track(`${pid}.opacity`,al);
    return `ellipse puff${i} { position (-20,-101); size (${26+i*5},${16+i*3}); fill ${id==="snow.train"?"#ffffff":"#ffffff"}; opacity 0.4; };`;
  }).join("\n");
  return `group train { zIndex 10; position (690,510); ${cars.join("\n")} ${puffs} };`;
}
function terrain(id: string,snow: boolean): string {
  const out: string[]=[];
  out.push(rect("sky",-1800,-500,5000,1300,snow?"#c9e3ed":"#e9dbb1"));
  const layer=(name:string,rate:number,body:string)=> {
    if(!snow) track(`${id}.${name}.position.x`,samples(t=>-cameraOffset(Math.min(t,16))*rate));
    else track(`${id}.${name}.position.x`,[[0,0,"hold"],[21,0],[25,0],[26,-80*rate],[30,-720*rate]]);
    out.push(`group ${name} { ${body} };`);
  };
  layer("cloudbank",.06,Array.from({length:5},(_,i)=>`ellipse cloud${i} { position (${i*480-200},${140+i%2*60}); size (180,26); fill ${snow?"#edf4f0":"#f5ecd1"}; opacity 0.7; };`).join("\n"));
  layer("distant",.12,Array.from({length:7},(_,i)=>path(`peak${i}`,`move (${i*420-500},410); line (${i*420-230},${snow?130+(i%3)*35:280+(i%3)*30}); line (${i*420+100},410); close;`,snow?["#9bbacb","#84a9bf","#a9c8d5"][i%3]!:"#afb18a")).join("\n"));
  layer("fields",.42,rect("base",-1400,390,4800,700,snow?"#f2f5e9":"#abb06a")+Array.from({length:12},(_,i)=>path(`patch${i}`,`move (${i*270-600},420); line (${i*270-380},405); line (${i*270-300},510); line (${i*270-650},510); close;`,snow?["#e1ebea","#f9f8eb"][i%2]!:["#c4bb76","#8f9f62","#d0ab66"][i%3]!)).join("\n"));
  const trees = Array.from({length:11},(_,i)=> {
    const x=i*240-400,y=465+(i%3)*7;
    return snow ? `group pine${i} { ${line("trunk",x,y-100,x,y,"#647f88",7)} ${path("boughs",`move (${x},${y-140}); line (${x-46},${y-28}); line (${x+46},${y-28}); close;`,"#5c8587")} ${path("snowcap",`move (${x},${y-140}); line (${x-30},${y-70}); line (${x-4},${y-77}); line (${x+29},${y-70}); close;`,"#fafbed")} };` : `group tree${i} { ${line("trunk",x,y-70,x,y,"#777453",6)} ${circle("crown",x,y-85,38,"#7d9159")} ${circle("sunny",x-14,y-95,24,"#96a366")} };`;
  }).join("\n");
  layer("groves",.7,trees);
  layer("texture",.43,path("hatching",Array.from({length:70},(_,i)=>`move (${i*44-700},${440+i%4*14}); line (${i*44-683},${438+i%4*14});`).join(" "),"#00000000",`stroke ${snow?"#c5d7d7":"#9d9e5e"} width 1; opacity 0.5;`));
  if(snow) layer("branches",1.9,path("twigs",Array.from({length:7},(_,i)=>`move (${i*330-700},620); line (${i*330-620},564); move (${i*330-657},590); line (${i*330-660},564); move (${i*330-640},578); line (${i*330-612},580);`).join(" "),"#00000000","stroke #658b96 width 5 cap round;"));
  layer("nearby",1.7,Array.from({length:24},(_,i)=> {
    const x=i*160-900;
    return line(`post${i}`,x,531,x,575,snow?"#76959c":"#8e7750",5)+line(`grass${i}`,x+50,590,x+65,553,snow?"#aec4c6":"#75814d",3);
  }).join("\n")+line("fence",-1400,548,3400,548,snow?"#a5bbbc":"#9b8658",3));
  return out.join("\n");
}
function rails(): string {
  return rect("ballast",-1700,509,5000,20,"#7d8580")+path("ties",Array.from({length:35},(_,i)=>`move (${i*100-1700},514); line (${i*100-1670},529);`).join(" "),"#00000000","stroke #596969 width 4;")+line("rail",-1700,510,3300,510,"#364e58",4)+line("railB",-1700,524,3300,524,"#c1c7b6",2);
}
function entrance(): string {
  return `group portal { position (1980,510); zIndex 20;
  ${path("massif","move (-180,0); line (-100,-220); line (170,-430); line (370,-300); line (660,0); close;","#8a8e79")}
  ${path("facet","move (170,-430); line (150,-190); line (380,0); line (660,0); line (370,-300); close;","#77847a")}
  ${path("opening","move (-3,15); line (-3,-86); cubic (-3,-156) (125,-156) (125,-86); line (125,15); close;","#23343b")}
  };`;
}
function program(): string {
  motion.length=0;
  const country=terrain("country",false);
  const sharedTrain=train("train",true);
  track("train.position.x",[...samples(t=>-30+160*t-cameraOffset(t),0,15.75),[15.999,1449.84,"hold"],[16,690,"hold"],[20.999,690,"hold"],...samples(t=>230+160*(t-21)-(t<=25?0:t<26?80*(t-25)**2:80+160*(t-26)),21,30)]);

  track("country.portal.position.x",samples(t=>1980-cameraOffset(t),0,16));
  track("countryCover.position.x",samples(t=>1980-cameraOffset(t),0,16));
  track("country.farm.position.x",samples(t=>720-cameraOffset(t)*.7,0,16));
  show("country",0,16); show("countryCover",0,16);
  const birds=Array.from({length:5},(_,i)=>{
    const id=`country.flock.b${i}`;
    track(`${id}.position.x`,[[0,450+i*20,"hold"],[6,450+i*20],[8,220+i*28],[10,-100+i*20]]);
    track(`${id}.position.y`,[[0,430,"hold"],[6,430],[7,320-i*8],[9,240-i*10]]);
    return path(`b${i}`,"move (-8,0); quadratic (-4,-8) (0,0); quadratic (4,-8) (8,0);","#596b67");
  }).join("\n");
  track("country.flock.opacity",[[0,0,"hold"],[6,0],[6.4,1,"hold"],[9.5,1],[10,0]]);
  
  show("inside",16,21);
  track("inside.exitlight.position.x",[[0,1280,"hold"],[18,1280],[21,940]]);
  track("inside.exitlight.scale.x",[[0,.15,"hold"],[18,.15],[21,1]]);
  const ribs=Array.from({length:9},(_,i)=>{
    track(`inside.ribs.rib${i}.position.x`,[[0,i*240,"hold"],[16,i*240],[21,i*240-800]]);
    return path(`rib${i}`,"move (0,520); line (0,230); cubic (0,80) (130,80) (130,230); line (130,520);","#00000000","stroke #566467 width 12;");
  }).join("\n");
  const snowTerrain=terrain("snow",true);
  show("snow",21); show("snowCover",21); show("snowfall",21);
  const snowCam=(t:number)=>t<=25?0:t<26?80*(t-25)**2:80+160*(t-26);
  
  track("snow.portal.position.x",samples(t=>250-snowCam(t),21,30));
  track("snowCover.position.x",samples(t=>250-snowCam(t),21,30));
  track("camera(main).zoom",[[0,1,"hold"],[26,1,"easeInOut"],[29,.82,"hold"],[30,.82]]);
  const flakes=Array.from({length:22},(_,i)=> {
    track(`snowfall.flake${i}.position.x`,[[0,i*67-100,"hold"],[21,i*67-100],[30,i*67-220]]);
    track(`snowfall.flake${i}.position.y`,[[0,(i*83)%420-50,"hold"],[21,(i*83)%420-50],[30,(i*83)%420+110]]);
    return circle(`flake${i}`,0,0,1.5+i%2,"#ffffff","opacity 0.8;");
  }).join("\n");
  const captions=["Across the countryside","Travel through the layers","Enter the mountain","Inside the mountain","Emerge into snow","Into the winter landscape"];
  const boundaries=[0,5,11,16,21,26,30];
  const captionNodes=captions.map((s,i)=>{show(`captions.c${i}`,boundaries[i]!,boundaries[i+1]!);return `text c${i} { position (640,678); content "${s}"; fontFamily "sans"; fontSize 19; align center; baseline middle; fill #f5efdb; visible ${i===0}; };`;}).join("\n");
  return `// THROUGH THE MOUNTAIN. 160 world px/s; wheel radius 12; three carriages at pitch 114.
// Silent story plate. Whistles/clatter/wind are brief cues, not supported audio.
scene "${ID}" { version "0.2"; viewport (1280,720); background #c9e3ed; duration 30s; requires "easing.hold"; requires "text.basic"; };
camera main { position (640,360); zoom 1; };
group country {
${country}
${rails()}
group farm { position (720,420); ${rect("walls",-45,-57,90,57,"#eee0be")} ${path("gable","move (-55,-57); line (0,-95); line (55,-57); close;","#9f6352")} ${rect("doorway",-8,-29,18,29,"#7e7b5b")} ${rect("windowA",-32,-40,15,15,"#99ada0")} };
group flock { opacity 0; ${birds} };
${entrance()}

// Opaque foreground terrain covers the train from the portal lip onward.
};
group countryCover { position (1980,510); zIndex 30;
${path("lip","move (0,20); line (0,-83); cubic (0,-143) (126,-143) (126,-83); line (126,20); line (660,20); line (660,0); line (370,-300); line (170,-430); line (-100,-220); line (-18,-83); line (-18,20); close;","#858b7a")}
${path("tunnelDarkness","move (0,20); line (0,-83); cubic (0,-143) (126,-143) (126,-83); line (126,20); close;","#23343b")}
${line("archEdge",-18,-83,-18,19,"#b6b199",9)}
${path("archCurve","move (-18,-83); cubic (-18,-165) (135,-165) (135,-83);","#00000000","stroke #b6b199 width 12;")}
${Array.from({length:6},(_,i)=>line(`stone${i}`,-22,-72+i*15,-5,-72+i*15,"#777e70",2)).join("\n")}
};
group inside { visible false;
${rect("darkness",-1000,-500,4000,1600,"#26353c")}
${rect("wallshade",-1000,300,4000,300,"#34444a")}
group exitlight { position (1280,510); scale (0.15,1); ${path("glow","move (0,0); line (0,-220); cubic (0,-340) (350,-340) (350,-220); line (350,0); close;","#badce8")} };
group ribs { ${ribs} };
${rails()}

};
group snow { visible false;
${snowTerrain}
${rails()}
group portal { position (250,510); ${path("mountain","move (-1600,0); line (-1300,-340); line (-700,-440); line (0,-230); line (80,0); close;","#8eafbe")} ${path("hole","move (-120,10); line (-120,-85); cubic (-120,-157) (0,-157) (0,-85); line (0,10); close;","#253a47")} };

};
group snowCover { visible false; position (250,510); zIndex 30;
${path("masonry","move (-1600,20); line (-1600,-600); line (-35,-270); line (0,-160); line (0,20); close;","#aac2ca")}
${path("ledge","move (-1600,-600); line (-35,-270); line (0,-160); line (-28,-169); line (-56,-246); line (-1600,-558); close;","#f4f7ed")}
${path("darkExit","move (-130,20); line (-130,-84); cubic (-130,-165) (0,-165) (0,-84); line (0,20); close;","#253a47")}
${line("archEdge",0,-84,0,18,"#e4e8db",13)}
${path("archTop","move (-130,-84); cubic (-130,-165) (0,-165) (0,-84);","#00000000","stroke #e4e8db width 13;")}
};
group snowfall { visible false; zIndex 40; ${flakes} };
${sharedTrain}
group captions { space screen; zIndex 100;
${rect("band",0,650,1280,70,"#233c46")}
${captionNodes}
text titleLabel { position (28,706); content "THROUGH THE MOUNTAIN / 30 seconds"; fontFamily "sans"; fontSize 10; fill #9fbac0; };
};
${motion.join("\n")}
complete;
`;
}

function checks(scene: SceneIR): void {
  const runtime=new AnimationRuntime(scene);
  const cache=new Map<number,readonly ResolvedDrawItem[]>();
  const frame=(t:number)=>{const key=Math.round(t*1e6);let v=cache.get(key);if(!v){v=runtime.evaluate(key/1000).drawItems;cache.set(key,v);}return v;};
  const canonical=(id:string)=>id.replace(/^(country|inside|snow)\.train/,"train").replace("country.cover", "countryCover").replace("snow.cover", "snowCover");
  const item=(t:number,id:string)=>{const v=frame(t).find(d=>d.nodeId===canonical(id)); if(!v) throw Error(`Missing ${id} at ${t}s`); return v;};
  const pos=(t:number,id:string,x=0,y=0)=>transformPoint(item(t,id).logicalMatrix,x,y);
  const assert=(v:boolean,s:string)=>{if(!v)throw Error(s);};
  const near=(a:number,b:number)=>Math.abs(a-b)<.08;
  const on=(t:number,id:string,x=0,y=0)=>{const p=pos(t,id,x,y);assert(p.x>=0&&p.x<=1280&&p.y>=0&&p.y<650,`${id} off screen/under caption at ${t}: ${JSON.stringify(p)}`);assert(item(t,id).opacity>.05,`${id} transparent at ${t}`);};
  // Assert actual evaluated corners, order, pitch and scale over all three shots.
  for(const [shot,a,b] of [["country",3.1,12],["inside",16,20.99],["snow",25,30]] as const) {
    for(let t=a;t<=b;t+=.1) {
      const nose=pos(t,`${shot}.train.v0.shell`);
      for(let i=0;i<4;i++) {
        const id=`${shot}.train.v${i}.shell`,g=item(t,id).geometry;
        assert(g.kind==="rectangle","Train shell geometry changed");
        const scale=Math.hypot(item(t,id).logicalMatrix[0]!,item(t,id).logicalMatrix[1]!);
        assert(near(nose.x-pos(t,id).x,i*114*scale),`Carriage spacing ${t} / ${i}`);
        on(t,id); on(t,id,i===0?110:100,48);
      }
    }
  }
  assert(pos(0,"country.train.v0.shell",110).x<0,"Train must enter from left");
  for(const t of [5,8,11]) assert(near(pos(t,"country.train.v0.shell",110).x,690),`Tracking at ${t}`);
  for(const t of [12,13,14,15.5]) assert(near(pos(t,"country.cover.archEdge").x,900),`Portal stationary ${t}`);
  // Compare drawn shell corners to drawn foreground edge; draw order plus the foreground opening provides coverage (also inspect PNGs).
  for(let i=0;i<4;i++) {
    const time=12.5625+(i===0?110:i*114+110)/160;
    const t=Math.min(time+.02,15.99),id=`country.train.v${i}.shell`;
    assert(pos(t,id).x>pos(t,"country.cover.archEdge").x,`Car ${i} not behind portal at ${t}`);
    assert(frame(t).findIndex(d=>d.nodeId==="countryCover.lip")>frame(t).findIndex(d=>d.nodeId===canonical(id)),"Masonry must paint over train");
  }
  assert(pos(15.5,"country.train.v3.shell").x>900,"Tail has not cleared at 15.5");
  for(const [t,id] of [[3,"country.farm.walls"],[8,"country.flock.b2"],[11,"country.portal.opening"],[18,"inside.train.v2.person1"],[20.9,"inside.exitlight.glow"],[25,"snow.train.v3.pane0"],[30,"snow.train.v0.lamp"]] as const) on(t,id);
  assert(pos(20.9,"inside.exitlight.glow").x<pos(18,"inside.exitlight.glow").x,"Exit must widen toward nose");
  assert(item(20.9,"inside.train.v0.nosewash").opacity>.2,"Cool light missing");
  assert(pos(25,"snow.train.v3.shell").x>pos(25,"snow.cover.archEdge").x,"Tail must clear snow portal by 25");
  assert(near(Math.hypot(item(30,"snow.train.v0.shell").logicalMatrix[0]!,item(30,"snow.train.v0.shell").logicalMatrix[1]!),.82),"Final widening");
  for(const t of TIMES) {
    const items=frame(t);
    const shot=t<16?"country":t<21?"inside":"snow";
    assert(items.some(d=>d.nodeId==="train.v0.shell"),`Wrong shot ${t}`);
    assert(items.filter(d=>/^captions.c\d$/.test(d.nodeId)&&d.opacity>.9).length===1,`Caption overlap at ${t}`);
  }
  // World speed measured on evaluated shell relative to the evaluated portal.
  for(const [shot,t] of [["country",1],["country",6],["country",12],["snow",22],["snow",26]] as const) {
    const relative=(s:number)=>pos(s,`${shot}.train.v0.shell`).x-pos(s,`${shot}.cover.archEdge`).x;
    const scale=Math.hypot(item(t,`${shot}.train.v0.shell`).logicalMatrix[0]!,item(t,`${shot}.train.v0.shell`).logicalMatrix[1]!);
    if(t<26)assert(Math.abs((relative(t+.1)-relative(t))/.1/scale-160)<.1,`Speed ${shot} ${t}`);
  }
  for(const [node,rate] of [["nearby.post10",1.7],["fields.base",.42],["distant.peak3",.12]] as const) {
    const delta=pos(7,`country.${node}`).x-pos(6,`country.${node}`).x;
    assert(Math.abs(delta+160*rate)<.01,`Parallax rate ${node}`);
  }
  assert(pos(11,"country.farm.walls",90).x<100,"Farm must recede to the left edge");
  assert(pos(8,"country.portal.opening").x>1280&&pos(11,"country.portal.opening").x<1280,"Mountain must enter during 8–11");
  assert(pos(8,"country.flock.b2").y<pos(6,"country.flock.b2").y,"Flock must rise");
  assert(near(pos(18,"inside.ribs.rib4").x-pos(17,"inside.ribs.rib4").x,-160),"Interior ribs must slide left");
  assert(pos(23,"snowfall.flake6").x<pos(22,"snowfall.flake6").x&&pos(23,"snowfall.flake6").y>pos(22,"snowfall.flake6").y,"Snow must drift diagonally down");
  assert(pos(30,"snow.distant.peak3").x<pos(29,"snow.distant.peak3").x,"Travel must continue in final hold");
  assert(near(pos(29,"train.v0.shell").y,pos(30,"train.v0.shell").y),"Final zoom must hold");
  const wheel = item(6,"train.v0.wh0.spoke").logicalMatrix;
  const wheelNext = item(6.1,"train.v0.wh0.spoke").logicalMatrix;
  const cross = wheel[0]! * wheelNext[1]! - wheel[1]! * wheelNext[0]!;
  assert(Math.abs(cross-Math.sin(160/12*.1))<.001,"Wheel angle must match clockwise rolling");
  for(const t of [30,18,3,22,13,0]) assert(JSON.stringify(runtime.evaluate(t*1000).drawItems)===JSON.stringify(frame(t)),`Seek changed frame ${t}`);
  console.log(`Runtime beat checks passed; ${TIMES.length} preview moments; 0.1s train framing sweeps.`);
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
    console.log(`CanvasRenderer stills: ${output}`);
  } finally {socket?.close();child.kill();await server.close();}
}
async function main(): Promise<void> {
  const source=program();
  writeFileSync(resolve(HERE,`${ID}.ms`),source);
  const bytes=Buffer.byteLength(source);
  if(bytes>DEFAULT_LIMITS.maxSourceBytes)throw Error(`Source budget ${bytes}`);
  const start=performance.now(),compiled=compileMotionScript(source),compileMs=performance.now()-start;
  if(compiled.diagnostics.length||!compiled.ok||!compiled.scene)throw Error(JSON.stringify(compiled.diagnostics.slice(0,8)));
  const validated=validateSceneIR(compiled.scene);
  if(!validated.ok)throw Error(JSON.stringify(validated.diagnostics));
  checks(compiled.scene);
  const stats={sourceBytes:bytes,maxSourceBytes:DEFAULT_LIMITS.maxSourceBytes,nodes:compiled.scene.nodes.length,maxNodes:DEFAULT_LIMITS.maxNodes,tracks:compiled.scene.timeline.tracks.length,maxTracks:DEFAULT_LIMITS.maxTracks,steps:compiled.scene.timeline.steps.length,maxSteps:DEFAULT_LIMITS.maxSteps,compileMs:f(compileMs),builderMsBeforePreviews:f(performance.now()-START)};
  console.log(JSON.stringify(stats,null,2));
  if(process.env.GVR_PREVIEW_DIR) {await previews(compiled.scene,resolve(process.env.GVR_PREVIEW_DIR));writeFileSync(resolve(process.env.GVR_PREVIEW_DIR,"measurements.json"),JSON.stringify({...stats,builderMsIncludingPreviews:f(performance.now()-START),times:TIMES},null,2)+"\n");}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
