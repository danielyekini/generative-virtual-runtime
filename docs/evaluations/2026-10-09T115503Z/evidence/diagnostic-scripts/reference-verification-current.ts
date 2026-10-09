import {spawn} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {createRequire} from 'node:module';
import {Cdp} from '../evaluation/harness/cdp';import {checkVisualFrame} from '../evaluation/harness/visual-gate';
const require=createRequire(import.meta.url),{PNG}=require('../evaluation/node_modules/pngjs');
const run=readFileSync('work/current-run','utf8');const dir=resolve('docs/evaluations',run,'evidence/reference-verification-current');mkdirSync(dir,{recursive:true});
const chrome=spawn('/usr/bin/chromium',['--headless=new','--disable-gpu','--force-device-scale-factor=1','--remote-debugging-port=9444','--user-data-dir='+mkdtempSync(join(tmpdir(),'gvr-trim-')),'--no-first-run','about:blank'],{stdio:['ignore','ignore','pipe']});let log='';chrome.stderr.on('data',x=>log+=x.toString());let socket:WebSocket|undefined;
try {
 let ws='';for(let i=0;i<100;i++){try{ws=(await(await fetch('http://127.0.0.1:9444/json/version')).json()).webSocketDebuggerUrl;if(ws)break;}catch{}await delay(100);}
 socket=new WebSocket(ws);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r());socket!.addEventListener('error',()=>j(new Error('socket')))});const cdp=new Cdp(socket);
 const {targetId}=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async(code:string)=>{const r=await cdp.send('Runtime.evaluate',{expression:code,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 for(let i=0;i<100;i++){if(await evaluate('Boolean(window.__ready)'))break;await delay(100);}
 const jobs=JSON.parse(readFileSync('evaluation/evidence/render-jobs.json','utf8')).jobs;const output:any[]=[];
 const control=await evaluate('window.runLottieControl()');const start=PNG.sync.read(Buffer.from(control.start.split(',')[1],'base64')),mid=PNG.sync.read(Buffer.from(control.mid.split(',')[1],'base64'));const motionControlWorks=!start.data.equals(mid.data);writeFileSync(join(dir,'control-start.png'),Buffer.from(control.start.split(',')[1],'base64'));writeFileSync(join(dir,'control-mid.png'),Buffer.from(control.mid.split(',')[1],'base64'));
 for(const fixture of ['LOT-01','LOT-07']) {
  const job=jobs.find((j:any)=>j.id===fixture+'-imported');const prepared=await evaluate(`window.prepare(${JSON.stringify(job.id)})`);const frames:any[]=[];let first:Buffer|undefined;
  for(let index=0;index<job.samples.length;index++) {
   const sample=job.samples[index];const seek=await evaluate(`window.seek('reference',${index})`);const data=await evaluate('window.referencePNG()');const png=Buffer.from(data.split(',')[1],'base64');const actual=PNG.sync.read(png);if(index===0)first=actual.data;
   const retained=PNG.sync.read(readFileSync(`evaluation/evidence/captures/${job.id}/${sample.id}-reference.png`));const same=actual.width===retained.width&&actual.height===retained.height&&actual.data.equals(retained.data);if(!same)writeFileSync(join(dir,`${fixture}-${sample.id}-mismatch.png`),png);frames.push({id:sample.id,timeMs:sample.sourceTimeMs,seek,sameAsPrimarySourceCapture:same});
  }
  await evaluate(`window.seek('reference',0)`);const data=await evaluate('window.referencePNG()');const repeated=Buffer.from(data.split(',')[1],'base64');writeFileSync(join(dir,fixture+'-repeated-first.png'),repeated);const repeatIdentical=PNG.sync.read(repeated).data.equals(first!);const logs=await evaluate('window.logs()');output.push({fixture,prepared,motionControlWorks,repeatIdentical,frames,logs,status:prepared.notes.length===0&&motionControlWorks&&repeatIdentical&&frames.every(f=>f.sameAsPrimarySourceCapture&&f.seek.ok)&&logs.length===0?'PASS':'BLOCKED'});console.log(fixture,output.at(-1).status,'frames',frames.length);
 }
 writeFileSync(join(dir,'results.json'),JSON.stringify({profile:'Same pinned Chromium151/lottie-web5.13.0 canvas, DPR1, matched timestamps/subframe, opaque #101014. Every source frame independently recaptured and decoded pixels checked against the retained primary capture. First frame repeated after the complete window.',output},null,2));

} finally {writeFileSync(join(dir,'chrome-log.txt'),log);socket?.close();chrome.kill('SIGTERM');}
