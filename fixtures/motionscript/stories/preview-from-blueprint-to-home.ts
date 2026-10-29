/** Opt-in real Chromium/CanvasRenderer captures for the home story builder. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import type { SceneIR } from '@gvr/schema';
import { Cdp } from '../../../evaluation/harness/cdp';
import { chromeVersion, resolveChromeBinary } from '../../../evaluation/harness/chrome';

export async function renderHomePreviews(scene: SceneIR, times: number[], dir: string) {
  const root=process.cwd(), entry=resolve(root,'work/home-canvas');
  mkdirSync(entry,{recursive:true});
  writeFileSync(resolve(entry,'index.html'),`<html><body style="margin:0"><canvas id="plate"></canvas><script type="module" src="/work/home-canvas/main.ts"></script></body></html>`);
  writeFileSync(resolve(entry,'main.ts'),`import {CanvasRenderer} from '@gvr/canvas-renderer'; import {AnimationRuntime} from '@gvr/runtime'; const runtime=new AnimationRuntime(${JSON.stringify(scene)}); const canvas=document.querySelector('canvas');const renderer=new CanvasRenderer(canvas);renderer.resize(1280,720,1); window.capture=(t)=>{renderer.render(runtime.evaluate(t*1000));return canvas.toDataURL('image/png');}; window.ready=true;`);
  const server=await createServer({configFile:false,root,server:{host:'127.0.0.1',port:5197,strictPort:true}});
  await server.listen();
  const binary=resolveChromeBinary();
  const chrome=spawn(binary,['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=9237',`--user-data-dir=${resolve(entry,'chrome-profile')}`,'about:blank'],{stdio:'ignore'});
  let socket: WebSocket|undefined;
  try {
    let tabs:any[]=[];
    for(let k=0;k<100;k++) {
      try {tabs=await (await fetch('http://127.0.0.1:9237/json')).json() as any[];if(tabs.length)break;}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    if(!tabs.length)throw new Error('Chromium did not start');
    socket=new WebSocket(tabs[0].webSocketDebuggerUrl);
    await new Promise<void>((ok,no)=>{socket!.addEventListener('open',()=>ok(),{once:true});socket!.addEventListener('error',()=>no(new Error('CDP connection failed')),{once:true});});
    const cdp=new Cdp(socket);
    await cdp.send('Page.navigate',{url:'http://127.0.0.1:5197/work/home-canvas/'});
    let ready=false;
    for(let k=0;k<200;k++) {
      const result=await cdp.send('Runtime.evaluate',{expression:'window.ready===true',returnByValue:true});
      if(result.result.value){ready=true;break;}
      await new Promise(r=>setTimeout(r,100));
    }
    if(!ready)throw new Error('Canvas page did not become ready');
    for(const t of times) {
      const result=await cdp.send('Runtime.evaluate',{expression:`window.capture(${t})`,returnByValue:true});
      if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
      writeFileSync(resolve(dir,`f${t.toFixed(2)}.png`),Buffer.from(result.result.value.split(',')[1],'base64'));
    }
    writeFileSync(resolve(dir,'renderer.json'),JSON.stringify({browser:chromeVersion(binary),renderer:'CanvasRenderer',dpr:1,viewport:[1280,720],times},null,2));
    console.log(`CanvasRenderer: ${times.length} Chromium stills in ${dir}`);
  } finally {socket?.close();chrome.kill();await server.close();}
}
