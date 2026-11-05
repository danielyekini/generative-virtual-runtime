import { spawn } from 'node:child_process';
import { mkdtempSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Cdp } from '../evaluation/harness/cdp';
const chrome=spawn('/usr/bin/chromium',['--headless=new','--disable-gpu','--remote-debugging-port=9334',`--user-data-dir=${mkdtempSync(resolve(tmpdir(),'gvr-gradient-'))}`,'--no-first-run','about:blank'],{stdio:'ignore',detached:true});
let socket:WebSocket|undefined;
try {
 let endpoint='';for(let i=0;i<40;i++){try{endpoint=(await(await fetch('http://127.0.0.1:9334/json/version')).json()).webSocketDebuggerUrl;break;}catch{}await new Promise(r=>setTimeout(r,250));}
 socket=new WebSocket(endpoint);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r());socket!.addEventListener('error',j);});const cdp=new Cdp(socket);
 const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const evaluate=async(expression:string)=>{const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 for(let i=0;i<40;i++){if(await evaluate('Boolean(window.__ready)'))break;await new Promise(r=>setTimeout(r,250));}
 await evaluate(`window.gradientRecords=[];window.diagSeek='prepare';const originalGradient=CanvasRenderingContext2D.prototype.createLinearGradient;CanvasRenderingContext2D.prototype.createLinearGradient=function(...args){const m=this.getTransform();window.gradientRecords.push({seek:window.diagSeek,canvas:this.canvas.id||'reference',args,matrix:[m.a,m.b,m.c,m.d,m.e,m.f]});return originalGradient.apply(this,args)};`);
 const prepared=await evaluate('window.prepare("LOT-07-imported")');
 const snapshots=[];
 for(const index of [0,75,149,0]){await evaluate(`window.diagSeek=${JSON.stringify(index)}`);const reference=await evaluate(`window.seek("reference",${index})`);const native=await evaluate(`window.seek("native",${index})`);snapshots.push({index,reference,native});}
 const records=await evaluate('window.gradientRecords');writeFileSync('work/gradient-coordinate-diagnostic.json',JSON.stringify({browser:'/usr/bin/chromium 151.0.7922.173',source:'LOT-07 unchanged',native:'baseline scene',method:'Instrument createLinearGradient before prepare; record real context matrices and endpoint arguments at matched seeks; separate target',prepared,snapshots,records},null,2));console.log(`${records.length} gradient creation records`);
} finally {socket?.close();try{process.kill(-chrome.pid!,'SIGTERM');}catch{}}
