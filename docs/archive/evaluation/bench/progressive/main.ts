import {Telemetry, validateSceneIR, type SceneIR, type NodeDefinition, type TrackDefinition, type ResolvedFrame} from '@gvr/schema';
import {compileMotionScript, createIncrementalProgram} from '@gvr/compiler';
import {AnimationRuntime, StreamingRuntime} from '@gvr/runtime';
import {CanvasRenderer} from '@gvr/canvas-renderer';

const canvas=document.querySelector('canvas')!;
let cancelActive: (()=>void)|undefined;
export const cancelProgressive=()=>cancelActive?.();
const status=document.createElement('div');
status.style.cssText='position:fixed;left:8px;top:8px;background:#111;color:white;padding:8px;font:16px monospace';
document.body.append(status);
const time=()=>performance.timeOrigin+performance.now();
const setStatus=(s:string)=>{status.textContent=s;};
function distance(a:unknown,b:unknown):number {
 if(typeof a==='number' && typeof b==='number') return Math.abs(a-b);
 if(a===b)return 0;
 if(a && b && typeof a==='object' && typeof b==='object') {
  const aa=a as Record<string,unknown>,bb=b as Record<string,unknown>;
  if(Object.keys(aa).join()!==Object.keys(bb).join())return Infinity;
  return Math.max(0,...Object.keys(aa).map(k=>distance(aa[k],bb[k])));
 }
 return Infinity;
}
function pixels(renderer:CanvasRenderer,frame:ResolvedFrame) {
 renderer.render(frame);
 return canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data.slice();
}
export const progressive={
 async scale() {
  const base=compileMotionScript('scene "scale" {version "0.2"; viewport (1280,720); background #ffffff; duration 30s;}; circle dot {radius 2; fill #111111;}; complete;').scene!;
  const rows=[];
  const renderer=new CanvasRenderer(canvas);renderer.resize(1280,720,1);
  const cases=[...[250,500,1000,2000,4000].map(count=>({axis:'nodes',count})),...[250,500,1000,2000].map(count=>({axis:'tracks',count})),...[100,1000,5000,10000].map(count=>({axis:'morphCommands',count}))];
  for(const spec of cases) {
   const scene:SceneIR=structuredClone(base);
   if(spec.axis!=='morphCommands') {
    const count=spec.axis==='nodes'?spec.count:500;
    scene.nodes=Array.from({length:count},(_,i)=>({...scene.nodes[0]!,id:`n${i}`,name:`n${i}`,transform:{...scene.nodes[0]!.transform,position:{x:10+(i%100)*12,y:20+Math.floor(i/100)*12}}}));
    if(spec.axis==='tracks')scene.timeline.tracks=Array.from({length:spec.count},(_,i)=>({id:`t${i}`,kind:'keyframe',target:{kind:'node',nodeId:`n${i%500}`,channel:['transform.position.x','transform.position.y','transform.rotation','opacity'][Math.floor(i/500)]!},valueType:Math.floor(i/500)===2?'angle':'number',startMs:0,durationMs:30000,fill:{before:'none',after:'forwards'},keyframes:[{offset:0,value:0},{offset:1,value:1}]} as TrackDefinition));
   } else {
    const commands=Array.from({length:spec.count},(_,i)=>i===0?{cmd:'M' as const,x:0,y:0}:{cmd:'L' as const,x:i%1280,y:300+Math.sin(i/10)*100});
    scene.requiredCapabilities=['geometry.pathMorph'];
    const node=scene.nodes[0]!;if(node.kind!=='circle')throw new Error('circle');const {radius,...nodeBase}=node;
    scene.nodes=[{...nodeBase,kind:'path',commands,fillRule:'nonzero',stroke:{color:{type:'solid',r:0,g:0,b:0,a:1},width:1,cap:'butt',join:'miter',miterLimit:4}} as NodeDefinition];
    scene.timeline.tracks=[{id:'morph',kind:'keyframe',target:{kind:'node',nodeId:'dot',channel:'commands'},valueType:'path',startMs:0,durationMs:30000,fill:{before:'none',after:'forwards'},keyframes:[{offset:0,value:commands},{offset:1,value:commands.map(c=>({...c,y:c.y+20}))}]}];
   }
   const admission=validateSceneIR(scene),extended=validateSceneIR(scene,{maxNodes:4000,maxTracks:2000});
   if(!extended.ok)throw new Error(JSON.stringify(extended.diagnostics));
   const runtime=new AnimationRuntime(scene),metrics=new Telemetry(128);
   for(let i=0;i<20;i++){const frame=runtime.evaluate(i*100);renderer.render(frame);}
   for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);const frame=metrics.measure('evaluate_ms',()=>runtime.evaluate(i*30000/60));metrics.measure('renderer_ms',()=>renderer.render(frame));}
   rows.push({...spec,defaultAdmission:admission.ok,admissionDiagnostics:admission.ok?[]:admission.diagnostics,extendedAdmission:extended.ok,extendedDiagnostics:[],metrics:metrics.snapshot()});
  }
  renderer.dispose();return {warmup:20,samples:60,rows};
 },
 verify(source:string,baseline:string) {
  const compiled=compileMotionScript(source), original=compileMotionScript(baseline);
  if(!compiled.scene || !compiled.ok || !original.scene || !original.ok)throw new Error(JSON.stringify([compiled.diagnostics,original.diagnostics]));
  const inc=createIncrementalProgram(); const live=new StreamingRuntime();
  for(let i=0;i<source.length;i+=127){inc.push(source.slice(i,i+127));for(const d of inc.drainDeltas())live.enqueue(d);live.flushCommands();}
  const result=inc.finish();for(const d of inc.drainDeltas())live.enqueue(d);live.flushCommands();
  const renderer=new CanvasRenderer(canvas); renderer.resize(1280,720,1);
  const offline=new AnimationRuntime(compiled.scene),reference=new AnimationRuntime(original.scene);
  const boundaries=new Set([0,1,100,500,1000,1999.999,2000,2000.001,4999.999,5000,5000.001,7500,10000,12500,15000,17500,20000,22500,25000,27500,29999,30000]);
  for(const track of original.scene.timeline.tracks)if(track.kind==='keyframe')for(const key of track.keyframes) {
   const t=track.startMs+key.offset*track.durationMs;boundaries.add(t);if(t>0)boundaries.add(t-.001);if(t<30000)boundaries.add(t+.001);
  }
  // Numeric coverage includes each source key and adjacent sub-millisecond samples.
  const states=[...boundaries].sort((a,b)=>a-b).map(t=>{
   const a=offline.evaluate(t),b=reference.evaluate(t),c=live.evaluate(t);
   return {t,baselineMaxAbsoluteError:distance(a.drawItems,b.drawItems),incrementalExact:JSON.stringify(a)===JSON.stringify({...c,revision:a.revision})};
  });
  const renderTimes=[0,500,1500,2000,3500,5000,7500,10000,12500,15000,17500,20000,22500,25000,27500,29999];
  const renders=renderTimes.map(t=>{
   const a=pixels(renderer,offline.evaluate(t)),b=pixels(renderer,reference.evaluate(t)),c=pixels(renderer,live.evaluate(t));
   let baselineChanged=0,incrementalChanged=0,maxChannelError=0;
   for(let i=0;i<a.length;i++){if(a[i]!==b[i])baselineChanged++;if(a[i]!==c[i])incrementalChanged++;maxChannelError=Math.max(maxChannelError,Math.abs(a[i]!-b[i]!));}
   return {t,baselineChangedChannels:baselineChanged,incrementalChangedChannels:incrementalChanged,maxChannelError};
  });
  const captures=renderTimes.filter(t=>[500,7500,15000,22500,29999].includes(t)).map(t=>{renderer.render(offline.evaluate(t));return {name:`circle-${t}`,png:canvas.toDataURL()};});
  renderer.dispose();inc.dispose();live.dispose();
  return {ok:result.ok && states.every(s=>s.incrementalExact && s.baselineMaxAbsoluteError<1e-8) && renders.every(r=>r.incrementalChangedChannels===0 && r.baselineChangedChannels===0),states,renders,captures};
 },
 async run(source:string,options:{bytesPerSecond:number;pattern:number[];mode:'normal'|'starvation'|'truncation'|'rejection'|'cancellation';firstSealBytes:number}) {
  const compileTelemetry=new Telemetry(1024),runtimeTelemetry=new Telemetry(1024);
  const program=createIncrementalProgram(compileTelemetry),runtime=new StreamingRuntime(runtimeTelemetry);
  const renderer=new CanvasRenderer(canvas);renderer.resize(1280,720,1);
  const began=time();let bytes=0,generatedBytes=0,arrivalDone=false,arrivalEnd=0,compileMs=0,presentationMs=0;
  let playback=0,last=began,started=false,ended=false,stallStart:number|undefined;
  let firstVisual:unknown,firstMotion:unknown,firstSeal:unknown,completion:unknown;
  const seals:{wallMs:number;bytes:number;horizonMs:number;playbackMs:number;bufferedMs:number}[]=[];
  const stalls:{startMs:number;durationMs:number}[]=[];const captures:{name:string;png:string}[]=[];
  const events:{wallMs:number;state:string;playbackMs:number}[]=[];
  let producerHigh=0,producerBytesHigh=0;
  let lastHorizon=0,queueHigh=0,queueBytesHigh=0,queueBytes=0;const queue:{text:string;bytes:number;sent:number;generatedBytes:number;end?:boolean}[]=[];
  const lag=new Telemetry(1024);let lastSent=0;
  const workerSource=`onmessage=e=>{
    const {source,rate,pattern,pauseAt,pauseMs,checkpoint}=e.data;
    const data=new TextEncoder().encode(source),decoder=new TextDecoder();
    let offset=0,index=0,pause=0,queuedBytes=0,queueHigh=0,queueBytesHigh=0;
    const pending=new Map();const start=performance.timeOrigin+performance.now();
    onmessage=e=>{const bytes=pending.get(e.data.ack);if(bytes!==undefined){queuedBytes-=bytes;pending.delete(e.data.ack);}};
    function send(){
      if(offset>=data.length){postMessage({end:true,sent:performance.timeOrigin+performance.now(),generatedBytes:offset,queueHigh,queueBytesHigh});return;}
      const size=pattern[index++%pattern.length];
      const end=Math.min(data.length,offset+size,offset<checkpoint?checkpoint:Infinity);
      if(offset<pauseAt && end>=pauseAt)pause=pauseMs;
      const due=start+end/rate*1000+pause;
      setTimeout(()=>{
        if(pending.size>=256 || queuedBytes+end-offset>65536){postMessage({overflow:true,sent:performance.timeOrigin+performance.now(),generatedBytes:offset,queueHigh,queueBytesHigh});return;}
        pending.set(end,end-offset);queuedBytes+=end-offset;
        queueHigh=Math.max(queueHigh,pending.size);queueBytesHigh=Math.max(queueBytesHigh,queuedBytes);
        postMessage({text:decoder.decode(data.subarray(offset,end),{stream:end<data.length}),bytes:end-offset,sent:performance.timeOrigin+performance.now(),generatedBytes:end,queueHigh,queueBytesHigh});
        offset=end;send();
      },Math.max(0,due-(performance.timeOrigin+performance.now())));
    }send();
  };`;
  const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));const worker=new Worker(url);URL.revokeObjectURL(url);
  cancelActive=()=>{record('CANCELLED: generation and playback stopped');finish();};
  const input=options.mode==='truncation'?new TextDecoder().decode(new TextEncoder().encode(source).subarray(0,options.firstSealBytes+40)):source;
  const record=(state:string)=>{setStatus(`${state} | ${(playback/1000).toFixed(2)}s | ${bytes}/${new TextEncoder().encode(source).byteLength} bytes`);events.push({wallMs:time()-began,state,playbackMs:playback});};
  const flush=()=>{for(const d of program.drainDeltas())runtime.enqueue(d);runtime.flushCommands();};
  const finish=()=>{if(ended)return;ended=true;worker.terminate();if(stallStart!==undefined)stalls.push({startMs:stallStart-began,durationMs:time()-stallStart});};
  worker.onmessage=e=>{
   if(ended)return;
   const msg=e.data;generatedBytes=msg.generatedBytes;lastSent=msg.sent;
   producerHigh=Math.max(producerHigh,msg.queueHigh??0);producerBytesHigh=Math.max(producerBytesHigh,msg.queueBytesHigh??0);
   if(msg.overflow){record('BACKPRESSURE: producer queue exceeded finite bound');finish();return;}
   lag.observe('arrival.delivery_lag_ms',time()-msg.sent);
   if(msg.end){arrivalDone=true;arrivalEnd=time()-began;const start=performance.now();const result=program.finish();compileMs+=performance.now()-start;flush();completion={wallMs:time()-began,ok:result.ok,completed:result.completed,diagnostics:result.diagnostics};
    if(options.mode==='truncation')record('TRUNCATED: holding sealed prefix');return;}
   queue.push(msg);queueBytes+=msg.bytes;queueHigh=Math.max(queueHigh,queue.length);queueBytesHigh=Math.max(queueBytesHigh,queueBytes);
   if(queue.length>256 || queueBytes>65536){record('BACKPRESSURE: arrival queue full');finish();return;}
   // Process independently of RAF. Worker timestamps retain scheduled production
   // even when synchronous compilation/presentation delays the main thread.
   while(queue.length){const next=queue.shift()!;queueBytes-=next.bytes;bytes+=next.bytes;const start=performance.now();program.push(next.text);flush();compileMs+=performance.now()-start;worker.postMessage({ack:next.generatedBytes});
    if(program.sealedThroughMs>lastHorizon){lastHorizon=program.sealedThroughMs;const seal={wallMs:time()-began,bytes,horizonMs:lastHorizon,playbackMs:playback,bufferedMs:lastHorizon-playback};seals.push(seal);firstSeal??=seal;record('BUFFERED');
     if(options.mode==='rejection' && seals.length===1){const rejectedAt=performance.now();program.push('circle rejected { radius 5; fill #ff0000; };');flush();compileMs+=performance.now()-rejectedAt;record('REJECTED: base definitions frozen; prefix retained');captures.push({name:'rejection',png:canvas.toDataURL()});}
    }
   }
  };
  record('WAITING FOR EXECUTABLE PREFIX');
  worker.postMessage({source:input,rate:options.bytesPerSecond,pattern:options.pattern,checkpoint:options.firstSealBytes,pauseAt:options.mode==='starvation'?options.firstSealBytes+512:Infinity,pauseMs:options.mode==='starvation'?4500:0});
  await new Promise<void>(resolve=>{
   const tick=()=>{
    if(ended){resolve();return;}
    const now=time(),dt=now-last;last=now;
    if(runtime.scene && runtime.sealedThroughMs>0){
     if(!started){started=true;last=now;record('PLAYING');}
     const wanted=playback+dt;
     playback=Math.min(wanted,runtime.sealedThroughMs);
     if(wanted>runtime.sealedThroughMs && !runtime.authoringComplete){if(stallStart===undefined){stallStart=now;record('STARVED: holding sealed frontier');captures.push({name:'starved',png:canvas.toDataURL()});}}
     else if(stallStart!==undefined){stalls.push({startMs:stallStart-began,durationMs:now-stallStart});stallStart=undefined;record('PLAYING');}
     const start=performance.now();renderer.render(runtime.evaluate(playback));presentationMs+=performance.now()-start;
     const relevant={wallMs:now-began,bytes,generatedBytes,sceneTimeMs:playback,sourceComplete:arrivalDone};
     if(!firstVisual){firstVisual=relevant;captures.push({name:'first-visual',png:canvas.toDataURL()});}
     // At >=100ms the ring morph/falling drop is visibly displaced from t=0.
     if(playback>=100 && !firstMotion){firstMotion=relevant;captures.push({name:'first-motion',png:canvas.toDataURL()});}
     if(options.mode==='cancellation' && playback>=600){record('CANCELLED: generation and playback stopped');captures.push({name:'cancelled',png:canvas.toDataURL()});finish();}
     if(arrivalDone && (runtime.authoringComplete && playback>=30000 || options.mode==='truncation' && playback>=runtime.sealedThroughMs && now-began>arrivalEnd+1000)){record(options.mode==='truncation'?'TRUNCATED: sealed prefix retained':'COMPLETE');finish();}
    }
    if(now-began>70000){record('DEADLINE');finish();}
    requestAnimationFrame(tick);
   };requestAnimationFrame(tick);
  });
  const diagnostics=[...program.diagnostics,...runtime.rejectedDiagnostics];
  const result={options,firstVisual,firstMotion,firstSeal,seals,stalls,stallTotalMs:stalls.reduce((n,s)=>n+s.durationMs,0),arrival:{configuredBytesPerSecond:options.bytesPerSecond,observedBytesPerSecond:bytes/(arrivalEnd||time()-began)*1000,generatedBytes,receivedBytes:bytes,wallMs:arrivalEnd||null,lastWorkerSendMs:lastSent-began,independentOfRAF:true,deliveryLag:lag.snapshot()},completion,totalWallMs:time()-began,playbackMs:playback,compileMs,presentationMs,queue:{producerHighWater:producerHigh,producerBytesHighWater:producerBytesHigh,mainHighWater:queueHigh,mainBytesHighWater:queueBytesHigh,boundFragments:256,boundBytes:65536},diagnostics,compileTelemetry:compileTelemetry.snapshot(),runtimeTelemetry:runtimeTelemetry.snapshot(),events,captures};
  finish();cancelActive=undefined;program.dispose();runtime.dispose();renderer.dispose();
  return {...result,disposed:{compilerSceneAbsent:!program.scene,runtimeSceneAbsent:!runtime.scene}};
 }
};
Object.assign(window,{progressive});
