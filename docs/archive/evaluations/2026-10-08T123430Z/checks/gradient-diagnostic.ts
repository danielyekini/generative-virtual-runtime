import {Cdp} from '../evaluation/harness/cdp';
import {writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
const chrome=spawn('/usr/bin/chromium',['--headless=new','--disable-gpu','--remote-debugging-port=9334','--user-data-dir=/tmp/gvr-gradient-diagnostic','about:blank'],{stdio:'ignore'});
let ws:WebSocket|undefined;
try {
 let url='';for(let i=0;i<100;i++){try{url=(await(await fetch('http://127.0.0.1:9334/json/version')).json()).webSocketDebuggerUrl;break}catch{await new Promise(r=>setTimeout(r,250))}}
 ws=new WebSocket(url);await new Promise<void>(r=>ws!.addEventListener('open',()=>r()));const cdp=new Cdp(ws,60000);
 const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const ev=async(s:string)=>{const r=await cdp.send('Runtime.evaluate',{expression:s,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 for(let i=0;i<100;i++){if(await ev('Boolean(window.__ready)'))break;await new Promise(r=>setTimeout(r,250))}
 const install=`(()=>{const original=CanvasRenderingContext2D.prototype.createLinearGradient;window.records=[];window.mode='baseline';window.gradientIndex=0;CanvasRenderingContext2D.prototype.createLinearGradient=function(...args){const m=this.getTransform();const native=this.canvas.id==='native';let actual=m;if(native&&window.mode==='counterfactual'){const angles=[0,0,-25,25];const a=angles[window.gradientIndex++%4]*Math.PI/180;actual=new DOMMatrix([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),200,200]);this.setTransform(actual)}window.records.push({mode:window.mode,native,args,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],actual:[actual.a,actual.b,actual.c,actual.d,actual.e,actual.f]});const result=original.apply(this,args);if(actual!==m)this.setTransform(m);return result}})()`;
 await ev(install);const prepared=await ev(`window.prepare('LOT-07-imported')`);const samples=[];
 const dir='docs/evaluations/2026-10-08T123430Z/gradient-diagnostic';mkdirSync(dir,{recursive:true});
 for(const index of [0,1,2,5,15,30,75,149,0]){
  await ev(`window.seek('reference',${index})`);const reference=await ev('window.referencePNG()');
  for(const mode of ['baseline','counterfactual']){await ev(`window.mode='${mode}';window.gradientIndex=0;window.seek('native',${index})`);const native=await ev('window.nativePNG()');
   for(const [kind,url] of [['reference',reference],['native',native]])writeFileSync(`${dir}/${index}-${mode}-${kind}.png`,Buffer.from(url.split(',')[1],'base64'));
   samples.push({index,mode,reference:`${index}-${mode}-reference.png`,native:`${index}-${mode}-native.png`});
  }
 }
 writeFileSync(`${dir}/records.json`,JSON.stringify({prepared,samples,records:await ev('window.records'),method:'Diagnostic only: native gradient creation under fixed source layer matrices; original geometry/timing/paint stops unchanged; no implementation or fidelity claim'},null,2));
 console.log('diagnostic saved');await cdp.send('Target.closeTarget',{targetId:target.targetId});
}finally{ws?.close();chrome.kill()}
