/** npm run benchmark -- --out work/benchmark [--samples 120 --warmup 30 --compile-samples 3 --cycles 10] */
import { createServer } from 'vite';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, platform, arch, cpus } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Cdp } from '../../../../evaluation/harness/cdp';
import { resolveChromeBinary, chromeVersion } from '../../../../evaluation/harness/chrome';
const args=process.argv.slice(2);
const arg=(name:string,fallback:string)=> {const index=args.indexOf(name);return index<0?fallback:args[index+1]!;};
const number=(name:string,fallback:number)=> {const n=Number(arg(name,String(fallback)));if(!Number.isInteger(n)||n<1||n>10000)throw new Error(`Invalid ${name}`);return n;};
const out=resolve(arg('--out','work/benchmark'));
mkdirSync(out,{recursive:true});
const repo=process.cwd();
const alias=Object.fromEntries(['schema','compiler','runtime','canvas-renderer','format-import-core','format-lottie','motionscript-emitter'].map(name=>[`@gvr/${name}`,resolve(repo,`packages/${name}/src/index.ts`)]));
const server=await createServer({configFile:false,root:resolve(repo,'work'),resolve:{alias},server:{host:'127.0.0.1',port:5201,strictPort:true,hmr:false}});
const profile=mkdtempSync(resolve(tmpdir(),'gvr-benchmark-'));
const binary=resolveChromeBinary();
const chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-precise-memory-info','--remote-debugging-port=9341',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let socket: WebSocket | undefined;
try {
 await server.listen();
 let socketUrl='';
 for(let i=0;i<100;i++) {try {const r=await fetch('http://127.0.0.1:9341/json/version');socketUrl=(await r.json()).webSocketDebuggerUrl;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!socketUrl)throw new Error('Chrome did not start');
 socket=new WebSocket(socketUrl);await new Promise<void>((yes,no)=>{socket!.addEventListener('open',()=>yes());socket!.addEventListener('error',()=>no(new Error('CDP connection failed')));});
 const cdp=new Cdp(socket,180000);
 const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5201/progressive-demo.html'});
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false},sessionId);
 async function evaluate(expression:string) {const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 for(let i=0;i<100;i++){if(await evaluate('Boolean(document.querySelector("#start")?.onclick)'))break;await new Promise(r=>setTimeout(r,100));}
 const result=await evaluate(`(async()=>{document.querySelector('#rate').value='12288';document.querySelector('#start').click();await new Promise(r=>setTimeout(r,2400));document.querySelector('#cancel').click();await new Promise(r=>setTimeout(r,150));const text=document.querySelector('#result').textContent;if(!text)return {buttonEnabled:!document.querySelector('#start').disabled,status:document.body.innerText,handler:!!document.querySelector('#start').onclick};const data=JSON.parse(text);return {buttonEnabled:!document.querySelector('#start').disabled,firstMotion:data.firstMotion,disposed:data.disposed,events:data.events};})()`);
 writeFileSync(resolve(out,'demo-smoke.json'),JSON.stringify(result,null,2));
 const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);writeFileSync(resolve(out,'demo-smoke.png'),Buffer.from(shot.data,'base64'));
 if(!result.buttonEnabled || !result.firstMotion || !result.disposed.compilerSceneAbsent || !result.disposed.runtimeSceneAbsent)process.exitCode=1;
} finally {socket?.close();chrome.kill();await server.close();await new Promise(r=>setTimeout(r,200));rmSync(profile,{recursive:true,force:true});}
