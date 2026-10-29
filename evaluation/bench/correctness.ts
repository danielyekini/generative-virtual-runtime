import { compileMotionScript } from '@gvr/compiler';
import { sampleScene, buildResolvedFrame, AnimationRuntime } from '@gvr/runtime';
import { CanvasRenderer } from '@gvr/canvas-renderer';
import { buildResolvedFrame as beforeFrame } from './before/frame';
import { importSource } from '@gvr/format-import-core';
import { lottieAdapter } from '@gvr/format-lottie';
import { emitMotionScript } from '@gvr/motionscript-emitter';
import lottie from 'lottie-web';
import { Telemetry } from '@gvr/schema';
import { checkVisualFrame } from '../harness/visual-gate';
import gates from '../gate-settings.json';
import type { ResolvedFrame } from '@gvr/schema';

function draw(frame:ResolvedFrame) {
 const canvas=document.createElement('canvas');const renderer=new CanvasRenderer(canvas);
 renderer.resize(1280,720,1);renderer.render(frame);renderer.dispose();
 return canvas;
}
function compare(a:HTMLCanvasElement,b:HTMLCanvasElement) {
 const x=a.getContext('2d')!.getImageData(0,0,a.width,a.height).data;
 const y=b.getContext('2d')!.getImageData(0,0,b.width,b.height).data;
 let changed=0,hot=0;
 for(let i=0;i<x.length;i+=4){const d=Math.hypot(x[i]!-y[i]!,x[i+1]!-y[i+1]!,x[i+2]!-y[i+2]!);if(d>0||x[i+3]!==y[i+3])changed++;if(d>24)hot++;}
 return {changedPixels:changed,hotPixels:hot,totalPixels:a.width*a.height,fractionBeyond:hot/(a.width*a.height)};
}
export function captureProgram(source:string,times:number[]) {
 const telemetry=new Telemetry(32);
 const result=compileMotionScript(source,telemetry);if(!result.ok||!result.scene)return {ok:false,diagnostics:result.diagnostics};
 const scene=result.scene;
 return {ok:true,compile:telemetry.snapshot(),counts:{nodes:scene.nodes.length,tracks:scene.timeline.tracks.length,steps:scene.timeline.steps.length},frames:times.map(time=>{
  const sampled=sampleScene(scene,time);
  const before=draw(beforeFrame(scene,sampled,time));const after=draw(buildResolvedFrame(scene,sampled,time));
  return {time,...compare(before,after),before:before.toDataURL(),after:after.toDataURL()};
 })};
}
export async function captureLottie(source:string,times:number[]) {
 const imported=importSource(lottieAdapter,source,{sourceName:'trim-reference.json'});
 if(!imported.scene)throw new Error(JSON.stringify(imported.diagnostics));
 const emitted=emitMotionScript(imported.scene);
 const compiled=compileMotionScript(emitted);
 if(!compiled.scene||!compiled.ok)throw new Error(JSON.stringify(compiled.diagnostics));
 const host=document.createElement('div');host.style.cssText='width:1280px;height:720px';document.body.append(host);
 const animation=lottie.loadAnimation({container:host,renderer:'canvas',autoplay:false,loop:false,animationData:JSON.parse(source),rendererSettings:{clearCanvas:true,preserveAspectRatio:'xMidYMid meet',dpr:1}});
 await new Promise<void>((resolve,reject)=>{animation.addEventListener('DOMLoaded',()=>resolve());animation.addEventListener('data_failed',()=>reject(new Error('reference failed')));setTimeout(()=>reject(new Error('reference load timeout')),10000);});
 animation.setSubframe(true);
 const frames=[];
 const references:HTMLCanvasElement[]=[];
 for(const time of times){
  animation.goToAndStop(time*animation.frameRate/1000,true);
  const reference=document.createElement('canvas');reference.width=1280;reference.height=720;
  const ctx=reference.getContext('2d')!;ctx.fillStyle='#000000';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#101014';ctx.fillRect(280,0,720,720);ctx.drawImage(host.querySelector('canvas')!,0,0,1280,720);
  const direct=draw(new AnimationRuntime(imported.scene).evaluate(time));
  const roundtrip=draw(new AnimationRuntime(compiled.scene).evaluate(time));
  references.push(reference);
  const raster=(canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height,data:canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data});
  frames.push({time,referenceVsDirectGate:checkVisualFrame(raster(reference),raster(direct),gates.visualCertification,gates.pixel.inspectionThreshold),referenceVsCompiledGate:checkVisualFrame(raster(reference),raster(roundtrip),gates.visualCertification,gates.pixel.inspectionThreshold),referenceVsDirect:compare(reference,direct),directVsCompiled:compare(direct,roundtrip),reference:reference.toDataURL(),direct:direct.toDataURL(),compiled:roundtrip.toDataURL()});
 }
 animation.goToAndStop(times[0]! * animation.frameRate / 1000,true);
 const repeat=document.createElement('canvas');repeat.width=1280;repeat.height=720;
 const context=repeat.getContext('2d')!;context.fillStyle='#000000';context.fillRect(0,0,1280,720);context.fillStyle='#101014';context.fillRect(280,0,720,720);context.drawImage(host.querySelector('canvas')!,0,0,1280,720);
 const controls={sameTimeRepeat:compare(references[0]!,repeat),motion:compare(references[0]!,references[references.length-1]!),subframe:true,player:'lottie-web 5.13.0 canvas',coverage:'sampled; no full-window certification'};
 animation.destroy();host.remove();
 return {ok:true,diagnostics:imported.diagnostics,controls,frames};
}
Object.assign(window,{correctness:{captureProgram,captureLottie}});
