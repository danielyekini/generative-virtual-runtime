import {Cdp} from '../evaluation/harness/cdp';
import {writeFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
const chrome=spawn('/usr/bin/chromium',['--headless=new','--disable-gpu','--remote-debugging-port=9334','--user-data-dir=/tmp/gvr-gradient-diagnostic','about:blank'],{stdio:'ignore'});
let ws:WebSocket|undefined;
try {
 let url='';for(let i=0;i<100;i++){try{url=(await(await fetch('http://127.0.0.1:9334/json/version')).json()).webSocketDebuggerUrl;break}catch{await new Promise(r=>setTimeout(r,250))}}
 ws=new WebSocket(url);await new Promise<void>(r=>ws!.addEventListener('open',()=>r()));const cdp=new Cdp(ws,60000);
 const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const ev=async(s:string)=>{const r=await cdp.send('Runtime.evaluate',{expression:s,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 for(let i=0;i<100;i++){if(await ev('Boolean(window.__ready)'))break;await new Promise(r=>setTimeout(r,250))}
 const patch=`(()=>{const original=window.fetch;window.isolate=1;window.fetch=async(...args)=>{const result=await original(...args);const url=String(args[0]);if(!url.includes('LOT-07')||(!url.includes('/sources/')&&!url.includes('scene.json')))return result;const data=await result.json();if(data.layers)data.layers=data.layers.filter(l=>l.ind===window.isolate);if(data.nodes){const prefix='layer_'+window.isolate;data.nodes=data.nodes.filter(n=>n.id===prefix||n.id.startsWith(prefix+'.'));const ids=new Set(data.nodes.map(n=>n.id));data.timeline.tracks=data.timeline.tracks.filter(t=>t.target.kind!=='node'||ids.has(t.target.nodeId));data.timeline.steps=data.timeline.steps.filter(t=>t.target.kind!=='node'||ids.has(t.target.nodeId));if(data.geometryOperators)data.geometryOperators=data.geometryOperators.filter(t=>ids.has(t.nodeId))}return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})}})()`;
 await ev(patch);const samples=[];const dir='docs/evaluations/2026-10-08T123430Z/layer-diagnostic';mkdirSync(dir,{recursive:true});
 for(const layer of [1,2,3,4,5,6]){await ev(`window.isolate=${layer}`);const prepared=await ev(`window.prepare('LOT-07-imported')`);for(const index of [0,2,15,75]){
 await ev(`window.seek('reference',${index})`);const reference=await ev('window.referencePNG()');await ev(`window.seek('native',${index})`);const native=await ev('window.nativePNG()');
 for(const [kind,url] of [['reference',reference],['native',native]])writeFileSync(`${dir}/${layer}-${index}-${kind}.png`,Buffer.from(url.split(',')[1],'base64'));
 samples.push({layer,index,prepared,reference:`${layer}-${index}-reference.png`,native:`${layer}-${index}-native.png`});}}
 writeFileSync(`${dir}/records.json`,JSON.stringify({samples,method:'Diagnostic minimal reproductions: one original layer, same source data and corresponding native nodes; original fixture bytes untouched'},null,2));console.log('layer diagnostic saved');await cdp.send('Target.closeTarget',{targetId:target.targetId});
}finally{ws?.close();chrome.kill()}
