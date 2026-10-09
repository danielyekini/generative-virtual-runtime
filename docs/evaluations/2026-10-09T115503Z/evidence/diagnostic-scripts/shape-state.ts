import {spawn} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {createRequire} from 'node:module';
import {Cdp} from '../evaluation/harness/cdp';import {checkVisualFrame} from '../evaluation/harness/visual-gate';
const require=createRequire(import.meta.url),{PNG}=require('../evaluation/node_modules/pngjs');
const run=readFileSync('work/current-run','utf8');const dir=resolve('docs/evaluations',run,'evidence/shape-state');mkdirSync(dir,{recursive:true});
const chrome=spawn('/usr/bin/chromium',['--headless=new','--disable-gpu','--force-device-scale-factor=1','--remote-debugging-port=9444','--user-data-dir='+mkdtempSync(join(tmpdir(),'gvr-trim-')),'--no-first-run','about:blank'],{stdio:['ignore','ignore','pipe']});let log='';chrome.stderr.on('data',x=>log+=x.toString());let socket:WebSocket|undefined;
try {
 let ws='';for(let i=0;i<100;i++){try{ws=(await(await fetch('http://127.0.0.1:9444/json/version')).json()).webSocketDebuggerUrl;if(ws)break;}catch{}await delay(100);}
 socket=new WebSocket(ws);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r());socket!.addEventListener('error',()=>j(new Error('socket')))});const cdp=new Cdp(socket);
 const {targetId}=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async(code:string)=>{const r=await cdp.send('Runtime.evaluate',{expression:code,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 for(let i=0;i<100;i++){if(await evaluate('Boolean(window.__ready)'))break;await delay(100);}
 await evaluate(`window.prepare('LOT-01-imported')`);
 const output:any[]=[];const jobs=JSON.parse(readFileSync('evaluation/evidence/render-jobs.json','utf8')).jobs;const job=jobs.find((j:any)=>j.id==='LOT-01-imported');
 const libraryUrl=await evaluate(`(async()=>{const text=await(await fetch('/main.ts')).text();return text.match(/from ["']([^"']*lottie[^"']*)["']/)?.[1];})()`);
 console.log('library',libraryUrl);
 for(const frame of [0,3,15,26,30,60,120]) {
  const id='frame_'+String(frame).padStart(5,'0');const index=job.samples.findIndex((s:any)=>s.id===id);await evaluate(`window.seek('reference',${index})`);
  const state=await evaluate(`(async()=>{const m=await import(${JSON.stringify(libraryUrl)});const lib=m.default??m;const player=lib.getRegisteredAnimations()[0];const result=[];function item(x){if(!x)return null;return {keys:Object.keys(x),ty:x.ty,sh:x.sh?{keys:Object.keys(x.sh),v:x.sh.v,paths:x.sh.paths?.shapes?.slice(0,x.sh.paths._length)}:null,tr:x.transform?{keys:Object.keys(x.transform),v:x.transform.v?.props}:null,it:x.it?.map(item),s:x.s?{keys:Object.keys(x.s),v:x.s.v}:null,e:x.e?{v:x.e.v}:null,o:x.o?{v:x.o.v}:null,w:x.w?{v:x.w.v}:null};}function visit(elements,loc){for(const el of elements??[]){if(!el)continue;result.push({ind:el.data?.ind,loc,name:el.data?.nm,items:el.itemsData?.map(item),shapes:el.shapes?.map(item)});visit(el.elements,loc+'.'+el.data?.ind);}}visit(player.renderer.elements,'root');return result;})()`);
  output.push({frame,state});
 }
 writeFileSync(join(dir,'shape-state.json'),JSON.stringify(output,null,2));console.log(output.map(x=>({frame:x.frame,n:x.state.length,sample:x.state[2]})));

} finally {writeFileSync(join(dir,'chrome-log.txt'),log);socket?.close();chrome.kill('SIGTERM');}
