/** Real-renderer evidence capture. Called only when GVR_PREVIEW_DIR is set. */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { Cdp } from "../../../evaluation/harness/cdp";
import { resolveChromeBinary, chromeVersion } from "../../../evaluation/harness/chrome";
import type { SceneIR } from "@gvr/schema";
export const STILL_TIMES = [0,1.5,2,3.5,5,6,7,7.5,8,9,10,10.5,11,12,13.5,15,16,17,17.5,18,19,20,21.5,23,24,25,26,27,28,29,30,31,32,32.5,33,35];
export async function capture(scene: SceneIR,dir: string): Promise<void> {
 const bundled=await build({stdin:{contents:`import { CanvasRenderer } from '@gvr/canvas-renderer'; import { AnimationRuntime } from '@gvr/runtime'; const canvas=document.querySelector('canvas'); const renderer=new CanvasRenderer(canvas); renderer.resize(1280,720,1); window.draw=(scene,t)=>{renderer.render(new AnimationRuntime(scene).evaluate(t*1000));return canvas.toDataURL('image/png');};`,resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser"});
 writeFileSync(resolve(dir,"preview.html"),`<!doctype html><meta charset="utf-8"><canvas></canvas><script>${bundled.outputFiles[0]!.text}</script>`);
 const binary=resolveChromeBinary();const profile=mkdtempSync(resolve(dir,"chromium-profile-"));
 const child=spawn(binary,["--headless=new","--no-sandbox","--disable-gpu","--remote-debugging-port=9337",`--user-data-dir=${profile}`,"about:blank"],{stdio:"ignore"});
 let socket: WebSocket|undefined;
 try {
  let endpoint: string|undefined;
  for(let i=0;i<100;i++) {try {const r=await fetch('http://127.0.0.1:9337/json/version');endpoint=(await r.json() as {webSocketDebuggerUrl:string}).webSocketDebuggerUrl;break;} catch {await new Promise(r=>setTimeout(r,100));}}
  if(!endpoint) throw Error("Chromium did not start");
  socket=new WebSocket(endpoint);await new Promise<void>((r,j)=>{socket!.addEventListener("open",()=>r());socket!.addEventListener("error",j);});
  const cdp=new Cdp(socket);const target=await cdp.send("Target.createTarget",{url:"about:blank"});const {sessionId}=await cdp.send("Target.attachToTarget",{targetId:target.targetId,flatten:true});
  socket.addEventListener("message",event=>{const msg=JSON.parse(String(event.data));if(msg.method==="Runtime.exceptionThrown") console.error(JSON.stringify(msg.params));}); await cdp.send("Runtime.enable",{},sessionId);
  const loaded=await cdp.send("Runtime.evaluate",{expression:"document.body.innerHTML='<canvas></canvas>';"+bundled.outputFiles[0]!.text,returnByValue:true},sessionId);
  if(loaded.exceptionDetails) throw Error(JSON.stringify(loaded.exceptionDetails));
  for(const t of STILL_TIMES) {const r=await cdp.send("Runtime.evaluate",{expression:`window.draw(${JSON.stringify(scene)},${t})`,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));writeFileSync(resolve(dir,`f${t.toFixed(2)}.png`),Buffer.from(r.result.value.split(",")[1],"base64"));}
  writeFileSync(resolve(dir,"capture.json"),JSON.stringify({browser:chromeVersion(binary),renderer:"CanvasRenderer",times:STILL_TIMES},null,2));
  console.log(`CanvasRenderer: ${STILL_TIMES.length} PNG stills in ${dir}`);
 } finally {socket?.close();child.kill();await new Promise(r=>setTimeout(r,200));rmSync(profile,{recursive:true,force:true});}
}
