import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Cdp} from '../../../../../evaluation/harness/cdp';
import {resolveChromeBinary} from '../../../../../evaluation/harness/chrome';
const root=process.cwd(),out=resolve(root,'work/worlds-preview');
const server=await createServer({root:resolve(root,'app/playground'),configFile:false,server:{host:'127.0.0.1',port:0,fs:{allow:[root]}},plugins:[{name:'worlds-player',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/worlds-player'){res.setHeader('Content-Type','text/html');res.end(readFileSync(resolve(out,'player.html')));return;}next();});}}]});await server.listen();
const port=(server.httpServer!.address() as {port:number}).port;
const child=spawn(resolveChromeBinary(),['--headless=new','--no-sandbox','--disable-gpu','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${root}/work/worlds-smoke-chrome`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let socket:WebSocket|undefined;
try{
 const url=await new Promise<string>((ok,fail)=>{let log='';child.stderr!.on('data',b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)ok(m[1]!);});child.on('error',fail);});
 socket=new WebSocket(url);await new Promise<void>(ok=>socket!.onopen=()=>ok());const cdp=new Cdp(socket,60000);
 const {targetId}=await cdp.send('Target.createTarget',{url:`http://127.0.0.1:${port}/`});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
 const ev=async(expression:string)=>{const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 for(let i=0;i<200;i++){if(await ev('!!window.__gvr?.seek'))break;await new Promise(r=>setTimeout(r,100));}
 await ev(`(()=>{const s=document.querySelector('#test-scripts');s.value='preset:one-ball-four-worlds';s.dispatchEvent(new Event('change'));})()`);
 const compiled=await ev(`({ok:window.__gvr.compileOk,scene:window.__gvr.sceneId,diagnostics:window.__gvr.sourceDiagnostics,roundtrip:window.__gvr.scriptCompiles})`);
 if(!compiled.ok||compiled.scene!=='one-ball-four-worlds'||compiled.diagnostics.length||!compiled.roundtrip)throw Error(JSON.stringify(compiled));
 await ev('window.__gvr.seek(24500)');
 const before=await ev('window.__gvr.probe()');await ev("document.querySelector('#play').click()");await new Promise(r=>setTimeout(r,700));const after=await ev('window.__gvr.probe()');await ev("document.querySelector('#pause').click()");
 if(!after.playing||after.timeMs<=before.timeMs||after.degraded)throw Error(JSON.stringify(after));
 const screen=await cdp.send('Page.captureScreenshot',{format:'png'},sessionId);writeFileSync(resolve(out,'playground.png'),Buffer.from(screen.data,'base64'));
 // Open the offline companion using the same Chromium and exercise audio synthesis + seek.
 const navigation=await cdp.send('Page.navigate',{url:`http://127.0.0.1:${port}/worlds-player`},sessionId);console.log('companion navigation',JSON.stringify(navigation));
 for(let i=0;i<100;i++){if(await ev("!!document.querySelector('button')&&document.querySelector('canvas').width===1280"))break;await new Promise(r=>setTimeout(r,100));}
 console.log(await ev("({url:location.href,body:document.body?.innerText.slice(0,300)})"));
 await ev("document.querySelector('button').click()");await new Promise(r=>setTimeout(r,500));
 const companion=await ev("({time:document.querySelector('input').value,label:document.querySelector('output').textContent,button:document.querySelector('button').textContent})");
 if(+companion.time<=0||companion.button!=='Pause')throw Error(JSON.stringify(companion));
 await ev("document.querySelector('button').click();const slider=document.querySelector('input');slider.value='28';slider.dispatchEvent(new Event('input'));");
 const seek=await ev("document.querySelector('output').textContent");if(!seek.startsWith('28.00'))throw Error(seek);
 const audio=await ev("(()=>{const c=new AudioContext(),b=window.worldsSoundtrack(c),d=b.getChannelData(0);const moments=[1,3.05,6.5,9,12.05,14,15.53,17.28,19.5,21,22.6,24,26.2,28.1,29];return {duration:b.duration,rate:b.sampleRate,rms:moments.map(t=>{let q=0;for(let i=t*b.sampleRate|0;i<(t+.05)*b.sampleRate;i++)q+=d[i]*d[i];return {t,rms:Math.sqrt(q/(.05*b.sampleRate))};})};})()");
 if(audio.duration!==30||audio.rms.some((x:any)=>x.rms<.0001))throw Error(JSON.stringify(audio));
 writeFileSync(resolve(out,'browser-smoke.json'),JSON.stringify({compiled,playback:{before,after},companion,seek,audio},null,2)+'\n');console.log(JSON.stringify({compiled,companion,audio}));
}finally{socket?.close();child.kill();await server.close();}
