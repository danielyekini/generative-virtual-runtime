import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {Cdp} from '../evaluation/harness/cdp';
import {createRequire} from 'node:module';
import {checkVisualFrame} from '../evaluation/harness/visual-gate';
const require=createRequire(import.meta.url), {PNG}=require('../evaluation/node_modules/pngjs');
const run=readFileSync('work/current-run.txt','utf8'), dir=`docs/evaluations/${run}/evidence/diagnostic-endpoints`;
mkdirSync(dir,{recursive:true});
const info=await (await fetch('http://127.0.0.1:9334/json/version')).json();
const socket=new WebSocket(info.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r));
const cdp=new Cdp(socket);const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const attach=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});const sid=attach.sessionId;
await cdp.send('Runtime.enable',{},sid);
async function ev(expression:string){const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sid);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
for(let i=0;i<30&&!await ev('Boolean(window.__ready)');i++)await new Promise(r=>setTimeout(r,200));
const settings=JSON.parse(readFileSync('evaluation/gate-settings.json','utf8'));
await ev(`(()=>{const proto=CanvasRenderingContext2D.prototype;const original=proto.createLinearGradient;window.records=[];window.mode='baseline';proto.createLinearGradient=function(...args){const m=this.getTransform();const native=this.canvas.id==='native';window.records.push({native,mode:window.mode,args,matrix:[m.a,m.b,m.c,m.d,m.e,m.f]});if(native&&window.mode==='offset'){this.setTransform(m.a,m.b,m.c,m.d,200,200);}if(native&&window.mode==='layer'){const angle=Math.atan2(m.b,m.a);const base=angle>0.1?25*Math.PI/180:angle<-.1?-25*Math.PI/180:0;this.setTransform(Math.cos(base),Math.sin(base),-Math.sin(base),Math.cos(base),200,200);}if(native&&window.mode==='fixed'){this.setTransform(1,0,0,1,200,200);}if(native&&window.mode==='endpoints'){const inv=m.inverse();const out=[];for(let i=0;i<4;i+=2){const pt=inv.transformPoint(new DOMPoint(args[i]+200,args[i+1]+200));out.push(pt.x,pt.y);}args=out;}const g=original.apply(this,args);if(native&&window.mode==='rounded'){const add=g.addColorStop.bind(g);g.addColorStop=(offset,color)=>add(Math.round(offset*100)/100,color);} this.setTransform(m);return g;};})()`);
const results=[];
for(const mode of ['baseline','endpoints','rounded']){
 await ev(`window.mode=${JSON.stringify(mode)}`);const prepared=await ev('window.prepare("LOT-07-imported")');
 for(const index of [0,2,10,30,75,149]){
  await ev(`window.seek('reference',${index})`);const ref=await ev('window.referencePNG()');
  await ev(`window.seek('native',${index})`);const native=await ev('window.nativePNG()');
  const decode=(url:string)=>PNG.sync.read(Buffer.from(url.split(',')[1],'base64'));
  const r=decode(ref),n=decode(native);const gate=checkVisualFrame(r,n,settings.visualCertification,24);
  writeFileSync(`${dir}/${mode}-${index}-reference.png`,PNG.sync.write(r));writeFileSync(`${dir}/${mode}-${index}-native.png`,PNG.sync.write(n));
  results.push({mode,index,prepared,gate});
 }
}
writeFileSync(`${dir}/results.json`,JSON.stringify({results,records:await ev('window.records')},null,2));
console.log(results.map(r=>({mode:r.mode,index:r.index,fraction:r.gate.fractionBeyond,pass:r.gate.pass})));socket.close();
