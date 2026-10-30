/** npm run benchmark -- --out work/benchmark [--samples 120 --warmup 30 --compile-samples 3 --cycles 10] */
import { createServer } from 'vite';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, platform, arch, cpus } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Cdp } from '../harness/cdp';
import { resolveChromeBinary, chromeVersion } from '../harness/chrome';
const args=process.argv.slice(2);
const arg=(name:string,fallback:string)=> {const index=args.indexOf(name);return index<0?fallback:args[index+1]!;};
const number=(name:string,fallback:number)=> {const n=Number(arg(name,String(fallback)));if(!Number.isInteger(n)||n<1||n>10000)throw new Error(`Invalid ${name}`);return n;};
const out=resolve(arg('--out','work/benchmark'));
mkdirSync(out,{recursive:true});
const repo=process.cwd();
const alias=Object.fromEntries(['schema','compiler','runtime','canvas-renderer','format-import-core','format-lottie','motionscript-emitter'].map(name=>[`@gvr/${name}`,resolve(repo,`packages/${name}/src/index.ts`)]));
const server=await createServer({configFile:false,root:resolve(repo,'evaluation/bench'),resolve:{alias},server:{host:'127.0.0.1',port:5201,strictPort:true,hmr:false}});
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
 const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5201/'});
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false},sessionId);
 async function evaluate(expression:string) {const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
 for(let i=0;i<100;i++){if(await evaluate('Boolean(window.benchmark)'))break;await new Promise(r=>setTimeout(r,100));}
 const options={samples:number('--samples',120),warmup:number('--warmup',30),compileSamples:number('--compile-samples',3),cycles:number('--cycles',10)};
 const overhead=await evaluate('window.benchmark.overhead()');
 writeFileSync(resolve(out,'overhead.json'),JSON.stringify(overhead,null,2));
 writeFileSync(resolve(out,'environment.json'),JSON.stringify({node:process.version,browser:chromeVersion(binary),platform:platform(),arch:arch(),cpu:cpus()[0]?.model,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:{width:1280,height:720,dpr:1}},null,2));
 if(args.includes('--scaling')) {
   const result=await evaluate('window.progressive.scale()');writeFileSync(resolve(out,'scaling.json'),JSON.stringify(result,null,2));
 } else if(args.includes('--progressive')) {
   const source=readFileSync('samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/program.ms','utf8');
   const baseline=readFileSync('fixtures/motionscript/stories/a-circle-in-motion.ms','utf8');
   const manifest=JSON.parse(readFileSync('samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/manifest.json','utf8'));
   function saveCaptures(result:any,prefix:string) {
    for(const capture of result.captures??[]){const filename=`${prefix}-${capture.name}.png`;writeFileSync(resolve(out,filename),Buffer.from(capture.png.split(',')[1],'base64'));capture.png=filename;}
   }
   const verification=await evaluate(`window.progressive.verify(${JSON.stringify(source)},${JSON.stringify(baseline)})`);
   saveCaptures(verification,'verification');
   writeFileSync(resolve(out,'verification.json'),JSON.stringify(verification,null,2));
   const runs=[];
   for(const rate of [4096,12288])for(const pattern of [[512],[17,2048,127,509]]) {
    console.log(`progressive ${rate} ${pattern}`);
    const options={bytesPerSecond:rate,pattern,mode:'normal',firstSealBytes:manifest.seals[0].sourceBytes};
    const result=await evaluate(`window.progressive.run(${JSON.stringify(source)},${JSON.stringify(options)})`);
    saveCaptures(result,`run-${runs.length}`);
    const screen=await cdp.send('Page.captureScreenshot',{format:'png'},sessionId);writeFileSync(resolve(out,`run-${runs.length}-page.png`),Buffer.from(screen.data,'base64'));runs.push(result);
    writeFileSync(resolve(out,'progressive.json'),JSON.stringify({verification:verification.ok,runs},null,2));
   }
   for(const mode of ['starvation','truncation','rejection','cancellation']) {
    console.log(`progressive ${mode}`);
    const options={bytesPerSecond:12288,pattern:[512],mode,firstSealBytes:manifest.seals[0].sourceBytes};
    const result=await evaluate(`window.progressive.run(${JSON.stringify(source)},${JSON.stringify(options)})`);
    saveCaptures(result,mode);
    const screen=await cdp.send('Page.captureScreenshot',{format:'png'},sessionId);writeFileSync(resolve(out,`${mode}-page.png`),Buffer.from(screen.data,'base64'));runs.push(result);
    writeFileSync(resolve(out,'progressive.json'),JSON.stringify({verification:verification.ok,runs},null,2));
   }
   process.exitCode=verification.ok && runs.filter(r=>r.options.mode==='normal').every(r=>r.completion?.ok && r.firstMotion?.sourceComplete===false)?0:1;
 } else if(args.includes('--correctness')) {
   const header='scene "regression" { version "0.2"; viewport (1280,720); background #101014; duration 1s; };';
   const scope='group front { zIndex 10; isolated true; rectangle red { size (100,100); position (200,200); fill #ff0000; }; }; rectangle back { zIndex -1; size (100,100); position (200,200); fill #0000ff; }; complete;';
   const trim='path ink { position (100,300); scale (30,1); stroke #ffffff width 8; move (0,0); line (10,0); move (20,0); line (30,0); }; operators ink { trim 0,1,0; }; complete;';
   const captures: {ok:boolean;name:string}[]=[];
   async function capture(name:string,source:string,times:number[],lottie=false) {
     const result=await evaluate(`window.correctness.${lottie?'captureLottie':'captureProgram'}(${JSON.stringify(source)},${JSON.stringify(times)})`);
     for(const frame of result.frames??[])for(const key of ['before','after','reference','direct','compiled']) {
       if(frame[key]){const filename=`${name}-${frame.time}-${key}.png`;writeFileSync(resolve(out,filename),Buffer.from(frame[key].split(',')[1],'base64'));frame[key]=filename;}
     }
     captures.push({name,sourceSha256:createHash('sha256').update(source).digest('hex'),...result});
     writeFileSync(resolve(out,'captures.json'),JSON.stringify(captures,null,2));
   }
   await capture('paint-order',header+scope,[0]);
   await capture('compound-trim',header+trim,[0]);
   for(const name of (args.includes('--lottie-only')?[]:arg('--stories','adding-two-vectors,from-pixels-to-prediction,square-wave-from-sine-waves,the-city-comes-around,a-crane-then-a-square').split(','))) {
     console.log(`capture ${name}`);
     await capture(name,readFileSync(`fixtures/motionscript/stories/${name}.ms`,'utf8'),[0,15000,29999]);
   }
   const fixture=readFileSync('fixtures/import/lottie/trim_reference.json','utf8');
   await capture('lottie-trim',fixture,[0,500,1000,1999],true);
   const offset=JSON.parse(fixture);offset.layers[0].shapes[0].it.find((x:{ty:string})=>x.ty==='tm').o={a:0,k:90};
   await capture('lottie-offset',JSON.stringify(offset),[0,500,1000,1999],true);
   console.log(resolve(out,'captures.json'));
   process.exitCode=captures.every(x=>x.ok)?0:1;
 } else {
 const names=arg('--stories','adding-two-vectors,from-pixels-to-prediction,square-wave-from-sine-waves').split(',');
 const results=[];
 for(const [index,name] of names.entries()) {
  const path=`fixtures/motionscript/stories/${name}.ms`;const source=readFileSync(path,'utf8');
  console.log(`benchmark ${name}`);
  const runs=[];
  // Alternate paired order to reduce systematic warmup bias.
  for(const enabled of index%2 ? [true,false] : [false,true]) {
   const result=await evaluate(`window.benchmark.run(${JSON.stringify(source)},${JSON.stringify({...options,enabled})})`);
   if(result.png){writeFileSync(resolve(out,`${name}-${enabled?'on':'off'}.png`),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;}
   runs.push({enabled,...result});
  }
  results.push({name,path,sha256:createHash('sha256').update(source).digest('hex'),bytes:Buffer.byteLength(source),runs});
  writeFileSync(resolve(out,'results.json'),JSON.stringify({status:'partial',results},null,2));
 }
 const environment={node:process.version,npm:execFileSync('npm',['--version'],{encoding:'utf8'}).trim(),browser:chromeVersion(binary),binary,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,userAgent:await evaluate('navigator.userAgent'),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}),viewport:{width:1280,height:720,dpr:1},options};
 writeFileSync(resolve(out,'results.json'),JSON.stringify({status:'complete',environment,results},null,2));
 if(results.some(story=>story.runs.some(run=>!run.ok || !run.streaming?.ok)))process.exitCode=1;
 console.log(resolve(out,'results.json'));
 }
} finally {socket?.close();chrome.kill();await server.close();await new Promise(r=>setTimeout(r,200));rmSync(profile,{recursive:true,force:true});}
