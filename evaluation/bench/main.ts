import './correctness';
import { Telemetry, FrameTelemetry } from '@gvr/schema';
import { compileMotionScript, createIncrementalProgram } from '@gvr/compiler';
import { AnimationRuntime, StreamingRuntime } from '@gvr/runtime';
import { CanvasRenderer } from '@gvr/canvas-renderer';

const canvas = document.querySelector('canvas')!;
const heap = () => {
  const memory = (performance as Performance & {memory?: {usedJSHeapSize:number; totalJSHeapSize:number; jsHeapSizeLimit:number}}).memory;
  return memory ? {status:'measured', ...{usedJSHeapSize:memory.usedJSHeapSize,totalJSHeapSize:memory.totalJSHeapSize,jsHeapSizeLimit:memory.jsHeapSizeLimit}} : {status:'unsupported'};
};
const raf = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
const api = {
  overhead() {
    const result=new Telemetry(16);
    let sink=0;
    for(let batch=0;batch<7;batch++) {
      for(const enabled of batch%2 ? [true,false] : [false,true]) {
        const telemetry=enabled?new Telemetry(256):undefined;
        const start=performance.now();
        for(let i=0;i<100000;i++) {if(telemetry) telemetry.measure('empty_ms',()=>{sink++;});else sink++;}
        result.observe(enabled?'enabled_batch_ms':'disabled_batch_ms',performance.now()-start);
      }
    }
    return {iterationsPerBatch:100000,batches:7,sink,metrics:result.snapshot()};
  },
  async run(source: string, options: {warmup:number; samples:number; compileSamples:number; cycles:number; enabled:boolean}) {
    const telemetry = options.enabled ? new Telemetry(256) : undefined;
    const compileWall = new Telemetry(256);
    let compiled = compileMotionScript(source); // unmeasured compiler warmup
    if (!compiled.ok || !compiled.scene) return {ok:false,diagnostics:compiled.diagnostics,heap:heap()};
    for(let i=0;i<options.compileSamples;i++) compiled = compileWall.measure('compile.wall_ms', () => compileMotionScript(source, telemetry));
    const scene = compiled.scene!;
    const frameMetrics = options.enabled ? new Telemetry(256) : undefined;
    const runtime = new AnimationRuntime(scene, frameMetrics);
    const renderer = new CanvasRenderer(canvas, frameMetrics);
    renderer.resize(1280,720,1);
    const baselineHeap = heap();
    for(let i=0;i<options.warmup;i++) { await raf(); renderer.render(runtime.evaluate(i * 1000 / 60)); }
    frameMetrics?.reset();
    const frame = frameMetrics ? new FrameTelemetry(frameMetrics) : undefined;
    const wall = new Telemetry(256);
    let previous: number | undefined;
    for(let i=0;i<options.samples;i++) {
      const timestamp = await raf();
      if(previous !== undefined) wall.observe('frame.interval_ms', timestamp-previous);
      previous=timestamp;
      const work = () => renderer.render(runtime.evaluate((i / Math.max(1, options.samples-1)) * scene.timeline.durationMs));
      wall.measure('frame.wall_ms', () => frame ? frame.frame(timestamp,work) : work());
    }
    // Full source replay through the actual compiler/runtime queues. Chunking
    // is simulated and deliberately has no model/network throughput claim.
    const streamingTelemetry = options.enabled ? new Telemetry(256) : undefined;
    const streamingCompiler=createIncrementalProgram(streamingTelemetry);
    const streamingRuntime=new StreamingRuntime(streamingTelemetry);
    const streamStart=performance.now();
    for(let offset=0;offset<source.length;offset+=4096) {
      streamingCompiler.push(source.slice(offset,offset+4096));
      for(const delta of streamingCompiler.drainDeltas()) streamingRuntime.enqueue(delta);
      streamingRuntime.flushCommands();
    }
    const streamed=streamingCompiler.finish();
    for(const delta of streamingCompiler.drainDeltas()) streamingRuntime.enqueue(delta);
    streamingRuntime.flushCommands();
    const replayMatches = streamingRuntime.scene !== undefined && [0,scene.timeline.durationMs/2,scene.timeline.durationMs].every(time => JSON.stringify(streamingRuntime.evaluate(time).drawItems) === JSON.stringify(new AnimationRuntime(scene).evaluate(time).drawItems));
    const runtimeDiagnostics=[...streamingRuntime.rejectedDiagnostics];
    const streaming={ok:streamed.ok && runtimeDiagnostics.length===0 && replayMatches,replayMatches,runtimeDiagnostics,diagnostics:streamed.diagnostics,durationMs:performance.now()-streamStart,revision:streamingRuntime.revision,telemetry:streamingTelemetry?.snapshot()??{status:'disabled'},feeding:'simulated 4096 UTF16-code-unit chunks; synchronous drain after each push'};
    streamingCompiler.dispose();streamingRuntime.dispose();
    const png = canvas.toDataURL();
    renderer.dispose();
    const lifecycle = [];
    const lifecycleMetrics = options.enabled ? new Telemetry(256) : undefined;
    // Simulated source feeding, never model/network throughput. Explicitly cancel
    // the compiler after a prefix; evaluate a full accepted load separately.
    for(let cycle=0;cycle<options.cycles;cycle++) {
      const compiler=createIncrementalProgram(lifecycleMetrics);
      compiler.push(source.slice(0,Math.min(source.length,8192)));
      const streaming = new StreamingRuntime(lifecycleMetrics);
      for(const delta of compiler.drainDeltas()) streaming.enqueue(delta);
      streaming.flushCommands();
      if(streaming.scene) streaming.evaluate(0);
      compiler.dispose(); streaming.dispose();
      const replay=new CanvasRenderer(canvas,lifecycleMetrics);
      replay.resize(1280,720,1);
      const reloaded=new AnimationRuntime(scene,lifecycleMetrics);
      for(let i=0;i<5;i++) replay.render(reloaded.evaluate(i*1000/60));
      replay.dispose();
      await raf();
      lifecycle.push({cycle, heap:heap()});
    }
    return {ok:true, counts:{nodes:scene.nodes.length,tracks:scene.timeline.tracks.length,steps:scene.timeline.steps.length},
      viewport:{width:1280,height:720,dpr:1}, options, compile:compileWall.snapshot(), frames:wall.snapshot(), telemetry:telemetry?.snapshot() ?? {status:'disabled'},
      frameTelemetry:frameMetrics?.snapshot()??{status:'disabled'}, lifecycleTelemetry:lifecycleMetrics?.snapshot()??{status:'disabled'}, streaming, memory:{before:baselineHeap,after:heap(),lifecycle,canvasBackingBytes:{status:'estimated',bytes:1280*720*4},gpu:{status:'unsupported'},weakPathCacheRetainedEntries:{status:'not-measured'},offscreenSurfaces:{status:'unsupported',reason:'CanvasRenderer draws scopes synchronously into the target context; no offscreen allocator exists'}},
      transport:{status:'unsupported',reason:'No model/network transport in this benchmark'},png};
  },
  capture(source:string,time=0) {
    const result=compileMotionScript(source);
    if(!result.ok || !result.scene) throw new Error(JSON.stringify(result.diagnostics));
    const renderer=new CanvasRenderer(canvas);renderer.resize(1280,720,1);
    renderer.render(new AnimationRuntime(result.scene).evaluate(time));
    const data=canvas.toDataURL();renderer.dispose();return data;
  }
};
Object.assign(window,{benchmark:api});
