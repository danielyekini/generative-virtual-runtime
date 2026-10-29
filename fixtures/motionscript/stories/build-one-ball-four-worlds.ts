/** One Ball, Four Worlds. Generated geometry; never hand-edit the .ms.
 * Run with GVR_PREVIEW_DIR to capture real CanvasRenderer PNGs in Chromium.
 * All samples and cues use seconds; MotionScript percentage keys are emitted here.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
const ID = "one-ball-four-worlds";
const TIMES = [0,1,2.5,3,3.12,4,5,6,6.5,7,7.5,8,9,10,11,12,13,13.5,14,14.5,15,15.5,15.65,16,16.5,16.7,17.25,17.45,18,18.2,18.5,19,20,20.5,21,21.5,22,22.5,23,24,24.5,25,26,27,28,28.5,29,29.983333,30];
type Pt = {x:number;y:number};
type Key = [number,number,string?];
const motion:string[]=[];
const f=(v:number)=>Number(v.toFixed(5));
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const u=clamp(v);return u*u*(3-2*u);};
// Position never resets at a style boundary. Smooth speed changes inside valleys.
function bx(t:number):number {
  const pulse=(a:number,b:number,k:number)=>t<=a?0:t>=b?k:k*smooth((t-a)/(b-a));
  return 300+640*t+pulse(8,10,110)-pulse(10,12,110)+pulse(23,24.5,100)-pulse(24.5,26,100);
}
function timeAt(x:number):number {let a=-2,b=34;for(let i=0;i<40;i++){const m=(a+b)/2;if(bx(m)<x)a=m;else b=m;}return (a+b)/2;}
const groundKeys:Pt[]=[[0,350],[3,500],[8,500],[10,560],[12,435],[15.5,490],[16.5,490],[16.501,504],[17.25,504],[17.251,518],[18,518],[18.001,532],[18.5,532],[20,420],[22.5,475],[23,490],[24.5,590],[26,430],[28,505],[34,505]].map(([x,y])=>({x:x!,y:y!}));
function gy(t:number):number {
  for(let i=1;i<groundKeys.length;i++){const a=groundKeys[i-1]!,b=groundKeys[i]!;if(t<=b.x){const u=clamp((t-a.x)/(b.x-a.x));return a.y+(b.y-a.y)*smooth(u);}}
  return 505;
}
// Hermite airborne paths preserve authored launch and landing heights.
function flight(t:number,a:number,b:number,ya:number,yb:number,height:number):number {
  const u=clamp((t-a)/(b-a));return ya+(yb-ya)*u-4*height*u*(1-u);
}
function by(t:number):number {
  for(const [a,b,h] of [[3,5,70],[5,8,96],[12,15.5,180],[20,22.5,160],[26,28,120]])
    if(t>=a!&&t<=b!)return flight(t,a!,b!,gy(a!)-26,gy(b!)-26,h!);
  for(const a of [16.5,17.25,18])if(t>=a&&t<=a+.38)return flight(t,a,a+.38,gy(a)-26,gy(a+.38)-26,22);
  return gy(t)-26;
}
function squash(t:number):number {let v=0;for(const a of [3,8,15.5,22.5,28]){const d=t-a,u=a===15.5?(d<=.15?d/.3:.5+(d-.15)/1.7):d/.45;if(u>=0&&u<=1)v=Math.max(v,Math.sin(u*Math.PI)*.24);}return v;}
const renderedY=(t:number)=>by(t)+26*squash(t);
function cx(t:number):number {
  if(t<1.1){const a=clamp(t/1.1);return 640+(bx(1.1)-640)*(3*a*a-2*a*a*a)+704*(a*a*a-a*a);}
  if(t<27.5)return bx(t);
  if(t<28.5){const d=t-27.5;return bx(27.5)+640*(d-d*d/2);}
  return bx(27.5)+320;
}
function cy(t:number):number {return 360+35*smooth((t-22)/4);}
function zoom(t:number):number {return 1-.54*smooth((t-27)/1.5);}
function samples(fn:(t:number)=>number,dt=.1):Key[]{const out:Key[]=[];for(let i=0;i<=Math.round(30/dt);i++)out.push([f(i*dt),f(fn(i*dt))]);return out;}
function track(id:string,keys:Key[]):void {
  keys=[...new Map(keys.map(k=>[k[0],k])).values()].sort((a,b)=>a[0]-b[0]);
  if(keys[0]![0]!==0)keys.unshift([0,keys[0]![1],"hold"]);
  if(keys.at(-1)![0]!==30)keys.push([30,keys.at(-1)![1]]);
  keys[keys.length-1]=[keys.at(-1)![0],keys.at(-1)![1]];
  motion.push(`keyframes ${id} { start 0s; duration 30s; ${keys.map(([t,v,e])=>`${f(t/30*100)}% ${f(v)}${e?` ease ${e}`:""};`).join(" ")} };`);
}
function range(id:string,a:number,b:number):void {track(`${id}.opacity`,[[0,a===0?1:0,"hold"],...(a>0?[[a,1,"hold"] as Key]:[]),...(b<30?[[b,0,"hold"] as Key]:[])]);}
// Ramer–Douglas–Peucker removes subpixel redundant samples, retaining every corner.
function simplify(p:Pt[],epsilon=.35):Pt[]{
  if(p.length<3)return p;
  const a=p[0]!,b=p.at(-1)!,dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  let max=0,index=0;
  for(let i=1;i<p.length-1;i++){const q=p[i]!,u=den?clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/den):0,d=Math.hypot(q.x-a.x-u*dx,q.y-a.y-u*dy);if(d>max){max=d;index=i;}}
  if(max<=epsilon)return [a,b];
  return [...simplify(p.slice(0,index+1),epsilon).slice(0,-1),...simplify(p.slice(index),epsilon)];
}
function path(id:string,points:Pt[],paint:string,extra="",close=false):string {
  if(points.length>50)points=simplify(points);
  return `path ${id} { ${points.map((p,i)=>`${i?"line":"move"} (${f(p.x)},${f(p.y)});`).join(" ")} ${close?"close;":""} ${paint} ${extra} };`;
}
function rect(id:string,x:number,y:number,w:number,h:number,c:string,extra=""):string{return `rectangle ${id} { position (${f(x)},${f(y)}); size (${f(w)},${f(h)}); fill ${c}; ${extra} };`;}
function circle(id:string,x:number,y:number,r:number,c:string,extra=""):string{return `circle ${id} { position (${f(x)},${f(y)}); radius ${r}; fill ${c}; ${extra} };`;}
function polyClip(p:Pt[],a:number,b:number):Pt[]{
  for(const [edge,sign] of [[a,1],[b,-1]]){const q:Pt[]=[];for(let i=0;i<p.length;i++){const u=p[i]!,v=p[(i+1)%p.length]!;const ui=(u.x-edge!)*sign!>=0,vi=(v.x-edge!)*sign!>=0;if(ui)q.push(u);if(ui!==vi){const k=(edge!-u.x)/(v.x-u.x);q.push({x:edge!,y:u.y+(v.y-u.y)*k});}}p=q;}return p;
}
const SEAMS=[bx(7),bx(14),bx(21)];
const BOUNDS=[-800,...SEAMS,bx(34)];
const styles=["pencil","paper","pixel","neon"];
const bg=["#f7f3e9","#f2d8aa","#a8d8d6","#08091d"];
const hillColors=[["#d9d7cd","#c6c8bf"],["#d59d4d","#438f8b"],["#779b82","#3a7f79"],["#20163c","#102e43"]];
function clipPath(id:string,p:Pt[],a:number,b:number,paint:string,extra=""):string{const q=polyClip(p,a,b);return q.length>2?path(id,q,paint,extra,true):"";}
// Fixed world seams act as clipping planes: generated polygons never cross them.
function landscape(s:number):string {
  const a=BOUNDS[s]!,b=BOUNDS[s+1]!,parts:string[]=[];
  parts.push(rect("sky",a,-600,b-a,1800,bg[s]!));
  for(let layer=0;layer<2;layer++){
    const top:Pt[]=[];const step=s===2?24:40;
    for(let x=a;x<=b+step;x+=step){const xx=Math.min(x,b),y=320+layer*65+Math.sin(xx/570+layer*2)*70+Math.cos(xx/2100)*35;top.push({x:xx,y:s===2?Math.round(y/16)*16:y});if(s===2)top.push({x:Math.min(xx+step,b),y:Math.round(y/16)*16});}
    const shape=[...top,{x:b,y:850},{x:a,y:850}];
    if(s===1)parts.push(path(`paperShadow${layer}`,top.map(p=>({x:p.x,y:p.y+7})),"stroke #374f42 width 10;","opacity 0.15;"));
    parts.push(path(`hill${layer}`,shape,`fill ${hillColors[s]![layer]};`,"",true));
    if(s===0){const h:string[]=[];for(let i=0;i<38;i++){const x=a+(b-a)*i/38,y=330+layer*65+Math.sin(x/570+layer*2)*70+Math.cos(x/2100)*35;h.push(`move (${f(x)},${f(y+18)}); line (${f(x+70)},${f(y+75)}); move (${f(x+42)},${f(y+78)}); line (${f(x+95)},${f(y+20)});`);}parts.push(`path hatch${layer} { ${h.join(" ")} stroke #94968e width 1; opacity 0.48; };`);}
    if(s===3)parts.push(path(`ridge${layer}`,top,`stroke ${layer?"#7040ae":"#473060"} width 2;`));
  }
  // Decorative geometry with identical paint shares compound paths.
  const pixels=(p:Pt[]):Pt[]=>p.flatMap((a,i)=>{const b=p[(i+1)%p.length]!,n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8)),q:Pt[]=[];for(let j=0;j<n;j++){const x=Math.round((a.x+(b.x-a.x)*j/n)/8)*8,y=Math.round((a.y+(b.y-a.y)*j/n)/8)*8;q.push({x,y});const xx=Math.round((a.x+(b.x-a.x)*(j+1)/n)/8)*8;q.push({x:xx,y});}return q;});
  const compound=(id:string,shapes:Pt[][],paint:string,extra="")=>{if(s===2)shapes=shapes.map(p=>simplify(pixels(p),.01));return `path ${id} { ${shapes.map(p=>p.map((q,i)=>`${i?"line":"move"} (${f(q.x)},${f(q.y)});`).join(" ")+" close;").join(" ")} ${paint} ${extra} };`;};
  const faces:Pt[][]=[],folds:Pt[][]=[],clouds:Pt[][]=[],trunks:Pt[][]=[],crowns:Pt[][]=[],towers:Pt[][]=[];
  for(let i=0;i<7;i++){
    const x=a+240+i*(b-a-480)/7,w=250,y=150+(i%3)*35;
    faces.push([{x:x-w,y:350},{x,y},{x:x+w,y:350}]);
    folds.push([{x,y},{x:x+35,y:350},{x:x+w,y:350}]);
    const xx=a+180+i*(b-a-360)/7,yy=95+(i%3)*27;
    clouds.push([{x:xx-68,y:yy+30},{x:xx-68,y:yy+12},{x:xx-40,y:yy+12},{x:xx-28,y:yy-6},{x:xx+4,y:yy-6},{x:xx+20,y:yy+10},{x:xx+60,y:yy+10},{x:xx+76,y:yy+30}]);
  }
  parts.push(`group mountainDrift { ${compound("faces",faces,`fill ${["#ece9df","#cbb990","#91b1a0","#14152d"][s]}; stroke ${s===0?"#95998d":s===3?"#6d3aa8":"#b3a17e"} width 2;`)} ${compound("folds",folds,`fill ${["#deded4","#b29f7c","#749d94","#1c1739"][s]};`)} };`);
  track(`${styles[s]}.mountainDrift.position.x`,[[0,0,"hold"],[Math.max(0,[0,6,13,20][s]!),0],[Math.min(30,[8,15,22,30][s]!),300,"hold"]]);
  parts.push(compound("clouds",clouds,s===0?"stroke #a9aaa0 width 1.5;":`fill ${["#ffffff","#fff1d0","#d9eee1","#11162d"][s]};`));
  if(s===0){const c:string[]=[];for(let i=0;i<7;i++){const x=a+180+i*(b-a-360)/7,y=95+(i%3)*27;c.push(`move (${f(x-68)},${y+30}); cubic (${f(x-88)},${y+4}) (${f(x-52)},${y-5}) (${f(x-34)},${y+4}); cubic (${f(x-25)},${y-32}) (${f(x+20)},${y-28}) (${f(x+28)},${y+4}); cubic (${f(x+65)},${y-10}) (${f(x+94)},${y+14}) (${f(x+76)},${y+30}); line (${f(x-68)},${y+30});`);}const n=parts.findIndex(v=>v.startsWith("path clouds "));parts[n]=`path clouds { ${c.join(" ")} stroke #a9aaa0 width 1.5; };`;}
  for(let i=0;i<10;i++){
    const x=a+110+i*(b-a-220)/10,y=410;
    if(s===2){trunks.push([{x,y:y-90},{x:x+16,y:y-90},{x:x+16,y:y+15},{x,y:y+15}]);crowns.push([{x:x-40,y:y-90},{x:x-40,y:y-130},{x:x-16,y:y-130},{x:x-16,y:y-162},{x:x+38,y:y-162},{x:x+38,y:y-130},{x:x+58,y:y-130},{x:x+58,y:y-90}]);}
    if(s===3){const h=65+(i%4)*36;towers.push([{x,y:420},{x,y:420-h},{x:x+48,y:420-h},{x:x+48,y:420}]);}
  }
  if(s===2)parts.push(compound("trunks",trunks,"fill #395e58;"),compound("crowns",crowns,"fill #477f68;"));
  if(s===3){parts.push(compound("skyline",towers,"stroke #793ec2 width 2;"));track("neon.skyline.position.x",[[0,0,"hold"],[22,0],[30,1800]]);}
  if(s===2){parts.push(compound("traces",[...faces,...crowns],"stroke #ad8bff width 1.5;","opacity 0;"));track("pixel.traces.opacity",[[0,0,"hold"],[19,0],[20,.6,"hold"]]);}
  // A single analytic ground sampled at both sides of every seam.
  const top:Pt[]=[];for(let x=a;x<b;x+=s===2?24:28){const y=gy(timeAt(x));top.push({x,y});if(s===2)top.push({x:Math.min(x+24,b),y});}top.push({x:b,y:gy(timeAt(b))});
  parts.push(path("earth",[...top,{x:b,y:1100},{x:a,y:1100}],`fill ${["#ede9dd","#bd823f","#336568","#0a1329"][s]};`,"",true));
  if(s===3){for(const [k,w,o] of [[0,24,.06],[1,13,.12],[2,6,.4],[3,2.5,1]])parts.push(path(`track${k}`,top,`stroke #32e7ed width ${w} cap round join round;`,`opacity ${o};`));}
  else parts.push(path("edge",top,`stroke ${["#62675f","#81552f","#d7d9a3"][s]} width ${s===0?2:5} join round;`));
  if(s===0){parts.push(path("echo",top.map(p=>({x:p.x,y:p.y+4+Math.sin(p.x*.03)*2})),"stroke #85877d width 1;","opacity 0.45;"));}
  // Texture is batched in compound paths rather than one node per mark.
  const texture:Pt[][]=[];
  for(let i=0;i<400;i++){const x=a+((i*137.17)%(b-a)),y=25+((i*83.91)%650);texture.push([{x,y},{x:x+2+(i%4),y:y+.7}]);}
  parts.push(`path grain { ${texture.map(p=>`move (${f(p[0]!.x)},${f(p[0]!.y)}); line (${f(p[1]!.x)},${f(p[1]!.y)});`).join(" ")} stroke ${s===0?"#929382":s===1?"#fff1c7":s===2?"#bcdfca":"#363057"} width ${s===2?2:1}; opacity ${s===2?.16:.22}; };`);
  if(s===1){for(let k=0;k<2;k++){const leaves:Pt[][]=[];for(let i=k;i<17;i+=2){const x=a+100+i*(b-a-200)/17,y=610+(i%3)*20;leaves.push([{x:x-45,y:y+45},{x:x-50,y:y-5},{x,y:y-50},{x:x+32,y:y-12},{x:x+10,y:y+30}]);}parts.push(compound(`leaves${k}`,leaves,`fill ${k?"#265e58":"#a96832"}; stroke #f0c177 width 1;`));}}
  if(s===2){for(let k=0;k<2;k++){const tiles:Pt[][]=[];for(let i=0;i<80;i++){if(Number(i%3===0)!==k)continue;const x=a+48+i*(b-a-96)/80,y=gy(timeAt(x))+18;tiles.push([{x,y},{x:x+16,y},{x:x+16,y:y+8},{x,y:y+8}]);}parts.push(compound(`tiles${k}`,tiles,`fill ${k?"#6e9c85":"#427a76"};`));}}
  if(s===3){const grid:string[]=[];for(let i=0;i<14;i++)grid.push(`move (${a},${530+i*i*3}); line (${b},${530+i*i*3});`);for(let x=a;x<b;x+=130)grid.push(`move (${f(x)},520); line (${f(x-250)},1000);`);parts.push(`path gridLines { ${grid.join(" ")} stroke #24264b width 1; };`);}
  if(s===3)track("neon.gridLines.position.x",[[0,0,"hold"],[22,0],[30,2400]]);
  const enter=[0,6,13,20][s]!,exit=[8,15,22,30][s]!;
  if(enter)motion.push(`step ${styles[s]}.visible { at ${enter}s; value true; };`);
  if(exit<30)motion.push(`step ${styles[s]}.visible { at ${exit}s; value false; };`);
  return `group ${styles[s]} { visible ${enter===0}; zIndex ${s}; ${parts.join("\n")} };`;
}
function ball():string {
  const parts:string[]=[];
  parts.push(circle("aura",0,0,43,"radial (0,0) 43 0 #ff294bff 0.5 #ff294b55 1 #ff294b00","opacity 0;"));
  parts.push(circle("rim",2,3,27,"#7c2227","opacity 0;"));
  parts.push(circle("orb",0,0,26,"#ef293b"));
  const contour:Pt[]=[];const cell=5.2;
  // Stepped silhouette is a single polygon; no cracks between pixel cells.
  const rows=[3,4,5,5,5,5,4,3];
  for(let i=0;i<rows.length;i++){const x=rows[i]!*cell;const y=(i-4)*6.5;contour.push({x:-x,y},{x:-x,y:y+6.5});}
  for(let i=rows.length-1;i>=0;i--){const x=rows[i]!*cell,y=(i-4)*6.5;contour.push({x,y:y+6.5},{x,y});}
  parts.push(path("sprite",contour,"fill #f52f43;","opacity 0;",true));
  parts.push(circle("inner",-3,-4,21,"radial (-7,-8) 30 0 #ff7d83 0.5 #ff4050 1 #d92340","opacity 0;"));
  const marks:string[]=[];for(let i=0;i<28;i++){const x=-16+(i*7%32),y=-17+(i*11%34);if(x*x+y*y<440)marks.push(`move (${x},${y}); line (${x+3},${y+1});`);}
  parts.push(`path fiber { ${marks.join(" ")} stroke #8e1726 width 0.7; opacity 0.4; };`);
  parts.push(`ellipse shine { position (-9,-11); size (10,7); fill #fff2d0; };`);
  parts.push(rect("pixelShine",-13,-15,10,5,"#ffeccc","opacity 0;"));
  parts.push(rect("pixelShineB",-13,-10,5,5,"#ffeccc","opacity 0;"));
  track("ball.fiber.rotation",samples(t=>bx(t)/26,.1));
  track("ball.position.x",samples(bx,.1));track("ball.position.y",samples(renderedY,.1));
  track("ball.scale.x",samples(t=>1+squash(t),.1));track("ball.scale.y",samples(t=>1-squash(t),.1));
  track("ball.aura.opacity",[[0,0,"hold"],[20.7,0],[21.3,.13,"hold"]]);
  track("ball.rim.opacity",[[0,0,"hold"],[6.8,0],[7.2,.8,"hold"],[13.8,.8],[14,0,"hold"],[21,0],[21.2,.3]]);
  track("ball.orb.opacity",[[0,1,"hold"],[13.9,1],[14.1,0,"hold"],[20.9,0],[21.1,1]]);
  track("ball.sprite.opacity",[[0,0,"hold"],[13.9,0],[14.1,1,"hold"],[20.9,1],[21.1,0]]);
  track("ball.fiber.opacity",[[0,.4,"hold"],[6.8,.4],[7.2,.23,"hold"],[13.9,.23],[14.1,0]]);
  track("ball.inner.opacity",[[0,0,"hold"],[20.9,0],[21.1,.8]]);
  track("ball.shine.opacity",[[0,1,"hold"],[13.9,1],[14.1,0,"hold"],[20.9,0],[21.1,1]]);
  for(const id of ["pixelShine","pixelShineB"])track(`ball.${id}.opacity`,[[0,0,"hold"],[13.9,0],[14.1,1,"hold"],[20.9,1],[21.1,0]]);
  return `group ball { zIndex 20; position (${bx(0)},${by(0)}); ${parts.join("\n")} };`;
}
function program():string {
  motion.length=0;
  const worlds=styles.map((_,i)=>landscape(i)).join("\n");
  const subject=ball();
  track("camera(main).position.x",samples(cx,.1));track("camera(main).position.y",samples(cy));track("camera(main).zoom",samples(zoom));
  const extras:string[]=[];
  // Ground-contact shadow remains attached to the analytic ground, not the flight.
  extras.push(`ellipse shadow { size (58,10); fill #1d2735; opacity 0.2; zIndex 10; };`);
  track("shadow.position.x",samples(bx,.1));track("shadow.position.y",samples(t=>gy(t)+4,.1));
  track("shadow.scale.x",samples(t=>1-clamp((gy(t)-26-by(t))/220)*.6));
  track("shadow.opacity",samples(t=>.26-clamp((gy(t)-26-by(t))/220)*.18));
  for(let i=0;i<7;i++){
    extras.push(circle(`trail${i}`,0,0,24-i*2,"#ff294b",`zIndex 15; opacity 0;`));
    track(`trail${i}.position.x`,samples(t=>bx(Math.max(0,t-.018*(i+1))),.1));
    track(`trail${i}.position.y`,samples(t=>renderedY(Math.max(0,t-.018*(i+1))),.1));
    track(`trail${i}.opacity`,[[0,0,"hold"],[20.8,0],[21.4,.11-i*.012,"hold"],[27,.11-i*.012],[30,0]]);
  }
  // A curled sheet at seam one, with a narrow light face and graphite underside.
  const seam=SEAMS[0]!;
  extras.push(path("curl",[{x:seam-12,y:75},{x:seam+22,y:100},{x:seam+38,y:320},{x:seam+8,y:gy(7)},{x:seam-15,y:gy(7)-5},{x:seam+11,y:320}],"fill #fff7df; stroke #b8aa8b width 2;","zIndex 9;",true));
  // Square perforations and a travelling grid announce the next medium.
  const px=SEAMS[1]!;
  let holes="";for(let i=0;i<21;i++)holes+=rect(`hole${i}`,px-55,95+i*24,7,7,"#6a826f");
  extras.push(`group perforations { zIndex 9; ${holes} };`);
  const grid:string[]=[];for(let i=0;i<25;i++)grid.push(`move (${px-70+i*14},35); line (${px-70+i*14},660);`);for(let y=35;y<=660;y+=14)grid.push(`move (${px-70},${y}); line (${px+266},${y});`);
  extras.push(`path resolvingGrid { ${grid.join(" ")} stroke #557e79 width 1; opacity 0.24; zIndex 9; };`);
  const nx=SEAMS[2]!;
  extras.push(path("neonBoundary",[{x:nx,y:40},{x:nx,y:690}],"stroke #b75aff width 3;","opacity 0.5; zIndex 9;"));
  // Local red illumination follows the ball along the track, separating in air.
  extras.push(`ellipse trackLight { size (100,12); fill #ff314c; zIndex 12; opacity 0; };`);
  track("trackLight.position.x",samples(bx,.1));track("trackLight.position.y",samples(gy,.1));
  track("trackLight.opacity",samples(t=>t<21?0:.22*(1-clamp((gy(t)-26-by(t))/90))));
  // Pencil stroke draws in front of the ball; trim endpoint follows its progress.
  const ramp:Pt[]=[];for(let t=0;t<=3.001;t+=.075)ramp.push({x:bx(t),y:gy(t)});
  extras.push(path("drawing",ramp,"stroke #484e47 width 2.5;","zIndex 8;"));
  motion.push("operators drawing { trim 0, 0, 0; };", "operators pencil.edge { trim 0, 0, 0; };", "operators pencil.echo { trim 0, 0, 0; };");
  for(const id of ["pencil.edge","pencil.echo"])track(`${id}.trim.end`,[[0,.23],[3,1,"hold"]]);
  track("drawing.trim.end",[[0,.15],[2.5,1,"hold"]]);
  // Sketch dust, landing rings, and takeoff flicks have independent event envelopes.
  for(const [i,a] of [3,8,12,15.5,20,22.5,26,28].entries()){
    extras.push(`ellipse impact${i} { position (${f(bx(a))},${f(gy(a))}); size (75,14); stroke ${a<13?"#c39b64":a<20?"#e6d9a1":"#8dfcff"} width 2; opacity 0; zIndex 11; };`);
    track(`impact${i}.opacity`,[[0,0,"hold"],[a,0],[a+.045,.65],[a+.35,0,"hold"]]);
    track(`impact${i}.scale.x`,[[0,.4,"hold"],[a,.4],[a+.35,1.4,"hold"]]);
  }
  // Restrained editorial labels stay outside the action; medium names change at seams.
  const titles:string[]=[];
  for(let s=0;s<4;s++){
    titles.push(`text medium${s} { position (38,58); content "${["01 / GRAPHITE","02 / CUT PAPER","03 / PIXEL PLAYGROUND","04 / NEON WAVE"][s]}"; fontSize 14; fontWeight 600; fill ${s===3?"#a7c5da":"#52665f"}; opacity ${s===0?1:0}; };`);
    range(`hud.medium${s}`,[0,7,14,21][s]!,[7,14,21,30][s]!);
  }
  return `// One Ball, Four Worlds — 30 seconds, 60 fps reference frame numbers.
// Sound is provided by the generated optional player.html; MotionScript has no audio channel.
scene "${ID}" { version "0.2"; viewport (1280,720); background #08091d; duration 30s; requires "easing.hold"; requires "geometry.trimPath"; requires "geometry.animatedTrim"; requires "text.basic"; };
camera main { position (640,360); zoom 1; rotation 0deg; };
${worlds}
${extras.join("\n")}
${subject}
group hud { space screen; zIndex 50;
text title { position (38,32); content "ONE BALL, FOUR WORLDS"; fontSize 12; fontWeight 700; fill #83928b; };
${titles.join("\n")}
};
${motion.join("\n")}
complete;
`;
}

// Companion host supplies audio without changing MotionScript or playground semantics.
// Every sound is synthesised locally; no recordings, resource fetches, or external dependencies.
const SOUND_JS=String.raw`
function soundtrack(ctx){
  const rate=22050,buffer=ctx.createBuffer(1,rate*30,rate),data=buffer.getChannelData(0);
  let seed=9273;
  function noise(a,b,level,grain=1){let held=0;for(let i=Math.floor(a*rate);i<Math.min(data.length,b*rate);i++){if(i%grain===0){seed=(Math.imul(seed,1664525)+1013904223)|0;held=(seed>>>0)/2147483648-1;}const u=(i/rate-a)/(b-a);data[i]+=held*level*Math.min(1,u*25,(1-u)*15);}}
  function tone(a,len,f0,f1,level,square=false){let phase=0;for(let i=0;i<len*rate&&Math.floor(a*rate)+i<data.length;i++){const u=i/(len*rate),hz=f0+(f1-f0)*u;phase+=2*Math.PI*hz/rate;const wave=square?(Math.sin(phase)>0?1:-1):Math.sin(phase);data[Math.floor(a*rate)+i]+=wave*level*Math.sin(Math.PI*u)*Math.exp(-u*2);}}
  // Pencil scratching, rolling rasp, muted bounce.
  noise(0,3,.025,3);for(let t=.1;t<2.8;t+=.25)noise(t,t+.12,.045,2);tone(3,.15,105,55,.15);
  // Peel and rustle; dry friction and takeoff flick.
  noise(6,8,.045,9);tone(6.1,.8,180,60,.035);noise(8,12,.019,6);noise(12,12.14,.1,2);
  // Rustle becomes electronic arpeggio.
  noise(13,14.6,.035,5);[330,440,554,660,880].forEach((hz,i)=>tone(13.6+i*.22,.2,hz,hz,.05,true));
  [15.5,16.5,17.25,18].forEach(t=>tone(t,.09,440,220,.07,true));tone(18.8,1.2,220,880,.05,true);
  // Chiptune blend and continuous neon hum.
  tone(20,.55,660,330,.04,true);tone(20.4,.6,440,220,.035,true);tone(20,10,55,55,.035);
  tone(22.5,.75,880,880,.14);tone(22.5,.9,1320,1320,.04);tone(23,3,110,660,.06);noise(26,26.4,.04,4);
  tone(28,.65,1047,1047,.1);tone(28,2,262,262,.035);tone(28,2,392,392,.025);
  for(let i=0;i<data.length;i++)data[i]=Math.tanh(data[i]);return buffer;
}`;
async function companion(scene:SceneIR,output:string):Promise<void>{
  const {build}=await import("esbuild");
  const result=await build({stdin:{resolveDir:ROOT,contents:`import {CanvasRenderer} from '@gvr/canvas-renderer'; import {AnimationRuntime} from '@gvr/runtime';
const scene=${JSON.stringify(scene)};
${SOUND_JS}
const canvas=document.querySelector('canvas'),renderer=new CanvasRenderer(canvas),runtime=new AnimationRuntime(scene);
renderer.resize(1280,720,1);
window.worldsSoundtrack=soundtrack;
const ctx=new AudioContext(),audio=soundtrack(ctx),slider=document.querySelector('input'),button=document.querySelector('button'),label=document.querySelector('output');
let source=null,playing=false,offset=0,started=0;
function draw(t){renderer.render(runtime.evaluate(t*1000));slider.value=t;label.textContent=t.toFixed(2)+' / 30s';}
function stop(){if(source){source.stop();source=null;}if(playing)offset=Math.min(30,offset+ctx.currentTime-started);playing=false;button.textContent='Play with sound';}
function play(){if(offset>=30)offset=0;ctx.resume();source=ctx.createBufferSource();source.buffer=audio;source.connect(ctx.destination);source.start(0,offset);started=ctx.currentTime;playing=true;button.textContent='Pause';}
button.onclick=()=>playing?stop():play();slider.oninput=()=>{stop();offset=+slider.value;draw(offset);};
function frame(){if(playing){const t=Math.min(30,offset+ctx.currentTime-started);draw(t);if(t===30)stop();}requestAnimationFrame(frame);}draw(0);frame();
`},bundle:true,write:false,format:"iife",platform:"browser",minify:true});
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>One Ball, Four Worlds</title><style>body{margin:0;background:#08091d;color:#d3e2e5;font:16px system-ui}main{max-width:1280px;margin:3vh auto}canvas{width:100%;height:auto;display:block}nav{display:flex;align-items:center;gap:20px;padding:20px}input{flex:1}button{background:#233546;border:1px solid #6a8993;color:inherit;padding:10px 20px;border-radius:6px}p{padding:0 20px;color:#8ca5ad;font-size:13px}</style><main><canvas></canvas><nav><button>Play with sound</button><input aria-label="Time" type="range" min="0" max="30" value="0" step="0.01"><output></output></nav><p>One Ball, Four Worlds · 30 seconds · Real CanvasRenderer + AnimationRuntime · Locally synthesised soundtrack. The MotionScript playground itself is silent.</p></main><script>${result.outputFiles[0]!.text.replaceAll("</script>","<\\/script>")}</script></html>`;
  writeFileSync(resolve(output,"player.html"),html);
}

async function previews(scene: SceneIR, output: string): Promise<void> {
  mkdirSync(output,{recursive:true});
  await companion(scene,output);
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

function checks(scene:SceneIR):void {
  const runtime=new AnimationRuntime(scene);
  const at=(t:number)=>runtime.evaluate(t*1000).drawItems;
  const find=(items:readonly ResolvedDrawItem[],id:string)=>{const v=items.find(i=>i.nodeId===id);if(!v)throw Error(`Missing rendered ${id}`);return v;};
  const point=(items:readonly ResolvedDrawItem[],id:string,x=0,y=0)=>transformPoint(find(items,id).logicalMatrix,x,y);
  const expect=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
  const near=(a:number,b:number,e=1)=>Math.abs(a-b)<=e;
  // Independently specified visible centre heights at the director's named contacts.
  for(const [t,y] of [[0,324],[3,474],[8,474],[10,534],[12,409],[15.5,464],[20,394],[22.5,449],[24.5,564],[26,404],[28,479]]){
    const items=at(t!),round=find(items,'ball.orb'),sprite=find(items,'ball.sprite');
    const selected=round.opacity>.5?round:sprite;
    expect(selected.opacity>.9,`Ball invisible at ${t}`);
    // World point reconstructed from the evaluated camera mapping, not the authored trajectory.
    const earth=items.find(i=>i.nodeId.endsWith('.earth'))!;const origin=transformPoint(earth.logicalMatrix,0,0),scale=round.logicalMatrix[0]!;
    const centre=point(items,selected.nodeId);
    expect(near((centre.y-origin.y)/scale,y!,2),`Wrong height ${t}: ${centre.y}`);
  }
  for(const [t,medium] of [[3,"pencil"],[8,"paper"],[10,"paper"],[12,"paper"],[15.5,"pixel"],[16,"pixel"],[18.5,"pixel"],[19,"pixel"],[20,"pixel"],[22.5,"neon"],[24.5,"neon"],[26,"neon"],[28,"neon"]] as const){
    const items=at(t),c=point(items,"ball.orb"),earth=find(items,`${medium}.earth`),mark=find(items,t>=14&&t<21?"ball.sprite":"ball.orb");
    expect(earth.geometry.kind==='path',`Missing contact geometry ${t}`);
    if(earth.geometry.kind!=='path')continue;
    const points=earth.geometry.commands.filter(q=>q.cmd==='M'||q.cmd==='L').map(q=>transformPoint(earth.logicalMatrix,q.x,q.y));
    let floor:number|undefined;
    for(let j=1;j<points.length-2;j++){const a=points[j-1]!,b=points[j]!;if(a.x<=c.x&&b.x>=c.x&&b.x>a.x){floor=a.y+(b.y-a.y)*(c.x-a.x)/(b.x-a.x);break;}}
    expect(floor!==undefined&&Math.abs(c.y+26*Math.abs(mark.logicalMatrix[4]!)-floor)<5,`Ball misses drawn surface at ${t}: ${floor}`);
  }
  const moments:[number,string][]=[[0,'pencil'],[6,'pencil'],[8,'paper'],[10,'paper'],[12,'paper'],[13,'paper'],[15,'pixel'],[15.5,'pixel'],[16.7,'pixel'],[17.45,'pixel'],[18.2,'pixel'],[20,'pixel'],[22,'neon'],[22.5,'neon'],[24.5,'neon'],[26,'neon'],[28,'neon'],[30,'neon']];
  for(const [t,medium] of moments){
    const items=at(t),item=find(items,t>=14&&t<=21?'ball.sprite':'ball.orb');
    const c=point(items,item.nodeId),r=26*Math.abs(item.logicalMatrix[0]!);
    expect(item.opacity>.9&&c.x-r>=0&&c.x+r<=1280&&c.y-r>70&&c.y+r<720,`Ball outside viewport at ${t}: ${JSON.stringify(c)}`);
    expect(find(items,`${medium}.earth`).opacity>.99,`Missing ${medium} ground at ${t}`);
    const shine=find(items,t>=14&&t<=21?'ball.pixelShine':'ball.shine');
    const h=point(items,shine.nodeId);expect(shine.opacity>.9&&h.x<c.x&&h.y<c.y,`Lost upper-left identity at ${t}`);
  }
  // Seam crosses right edge → centre → left edge without changing camera scale.
  for(const [t,id] of [[7,'curl'],[14,'resolvingGrid'],[21,'neonBoundary']] as const){
    const items=at(t),c=point(items,'ball.orb');expect(near(c.x,640,.2),`Tracking drifts at ${t}`);
    const seam=find(items,id);expect(seam.opacity>.1,`Boundary missing ${t}`);
    const x=id==='curl'?seam.geometry.kind==='path'?seam.geometry.commands[0]!.cmd==='M'?seam.geometry.commands[0]!.x+12:0:0:id==='resolvingGrid'?SEAMS[1]!:SEAMS[2]!;
    expect(near(transformPoint(seam.logicalMatrix,x,0).x,640,1),`Seam not at centre ${t}`);
    const earlier=point(at(t-1),'ball.orb'),later=point(at(t+1),'ball.orb');
    expect(near(earlier.x,later.x,1),`Framing changed through seam ${t}`);
  }
  // Dense sweep checks actual rendered centres, sizes, smooth screen motion and fixed highlight.
  let previous:Pt|undefined;
  for(let i=0;i<=1800;i++){
    const t=i/60,items=at(t),round=find(items,'ball.orb'),pixel=find(items,'ball.sprite');
    expect(Math.max(round.opacity,pixel.opacity)>=.49,`Contour gap f${i}`);
    const c=point(items,'ball.orb');
    expect(c.x>25&&c.x<1255&&c.y>80&&c.y<680,`Framing f${i}`);
    if(previous)expect(Math.hypot(c.x-previous.x,c.y-previous.y)<18,`Position discontinuity f${i}`);
    previous=c;
  }
  for(const [t,apex] of [[4,3],[6.5,5],[14,12],[21,20],[27,26]])expect(point(at(t!),'ball.orb').y<point(at(apex!),'ball.orb').y-30,`Arc absent ${t}`);
  for(const t of [16.66,17.41,18.16]){
    const items=at(t),c=point(items,'ball.sprite');
    const g=find(items,'pixel.earth');
    expect(g.geometry.kind==='path'&&c.y<520,`Step hop missing ${t}`);
  }
  const squashed=find(at(15.65),'ball.sprite');expect(Math.abs(squashed.logicalMatrix[0]!)>Math.abs(squashed.logicalMatrix[4]!)*1.3,'Landing squash absent');
  expect(find(at(21.5),'trail0').opacity>.05,'Neon trail absent');
  expect(find(at(29.98),'trail0').opacity<.002,'Trail fails to fade');
  expect(point(at(30),'ball.orb').x>point(at(29.9),'ball.orb').x+20,'Final forward travel stops');
  const cam=find(at(28.5),'neon.earth').logicalMatrix,camEnd=find(at(30),'neon.earth').logicalMatrix;
  expect(JSON.stringify(cam)===JSON.stringify(camEnd),'Camera does not settle by 28.5');
  console.log(`PASS: ${moments.length} beat checks; 1801 drawn-frame continuity/framing checks; seam, contact, highlight, squash and final-motion checks.`);
}

async function main():Promise<void>{
  const source=program();writeFileSync(resolve(HERE,`${ID}.ms`),source);
  const start=performance.now(),compiled=compileMotionScript(source),compileMs=performance.now()-start;
  if(compiled.diagnostics.length||!compiled.ok||!compiled.scene)throw Error(JSON.stringify(compiled.diagnostics.slice(0,12)));
  const valid=validateSceneIR(compiled.scene);if(!valid.ok)throw Error(JSON.stringify(valid.diagnostics));
  console.log(`Compiled in ${f(compileMs)}ms`);
  checks(compiled.scene);
  const runtime=new AnimationRuntime(compiled.scene);
  for(let i=0;i<120;i++)runtime.evaluate(i*250);
  const timings:number[]=[];for(let j=0;j<5;j++){const a=performance.now();for(let i=0;i<600;i++)runtime.evaluate(i*50);timings.push((performance.now()-a)/600);}
  const scene=compiled.scene;
  const geometryItems=scene.nodes.reduce((n,node)=>{return n+(node.kind==='path'?node.commands.length:node.kind==='polygon'?node.points.length:0);},0);
  const stats={programLines:source.split('\n').length-1,sourceBytes:Buffer.byteLength(source),builderLines:readFileSync(fileURLToPath(import.meta.url),'utf8').split('\n').length-1,builderBytes:readFileSync(fileURLToPath(import.meta.url)).length,nodes:scene.nodes.length,tracks:scene.timeline.tracks.length,steps:scene.timeline.steps.length,keyframeValues:scene.timeline.tracks.reduce((n,t)=>n+('keyframes' in t?t.keyframes.length:0),0),geometryItems,compileMs:f(compileMs),evaluationMsPerFrame:timings.map(f),builderMsBeforePreviews:f(performance.now()-START),limits:DEFAULT_LIMITS,times:TIMES};
  if(stats.sourceBytes>DEFAULT_LIMITS.maxSourceBytes)throw Error('Source exceeds default budget');
  console.log(JSON.stringify(stats,null,2));
  if(process.env.GVR_PREVIEW_DIR){const out=resolve(process.env.GVR_PREVIEW_DIR);await previews(scene,out);writeFileSync(resolve(out,'measurements.json'),JSON.stringify({...stats,builderMsIncludingPreviews:f(performance.now()-START)},null,2)+'\n');}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
