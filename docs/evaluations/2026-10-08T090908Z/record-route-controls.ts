import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { PNG }=require('../evaluation/node_modules/pngjs');
import { Cdp } from '../evaluation/harness/cdp';
const jobs=JSON.parse(readFileSync('evaluation/evidence/render-jobs.json','utf8')).jobs;
const endpoint=(await(await fetch('http://127.0.0.1:9333/json/version')).json()).webSocketDebuggerUrl;
const socket=new WebSocket(endpoint);await new Promise<void>((r,j)=>{socket.addEventListener('open',()=>r());socket.addEventListener('error',j);});const cdp=new Cdp(socket);const outcomes=[];const target=await cdp.send('Target.createTarget',{url:'http://127.0.0.1:5199/'});const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
const evaluate=async(expression:string)=>{const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
try{
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:2400,height:1600,deviceScaleFactor:1,mobile:false},sessionId);
 for(let i=0;i<40;i++){if(await evaluate('Boolean(window.__ready)'))break;await new Promise(r=>setTimeout(r,250));}
 for(const job of jobs.filter((j:any)=>['LOT-00','LOT-07','LOT-01','LOT-06'].includes(j.parentFixture))){
  const prepared=await evaluate(`window.prepare(${JSON.stringify(job.id)})`);
  const sequence=[0,job.samples.length-1,Math.floor(job.samples.length/2),0],seeks=[];let first='';let last='';
  for(const index of sequence){seeks.push(await evaluate(`window.seek('reference',${index})`));const png=await evaluate('window.referencePNG()');if(!first)first=png;last=png;}
  const firstBytes=Buffer.from(first.split(',')[1],'base64');const primaryPath=`evaluation/evidence/captures/${job.id}/${job.samples[0].id}-reference.png`;const decoded=PNG.sync.read(firstBytes),primary=PNG.sync.read(readFileSync(primaryPath));const identicalToPrimary=decoded.width===primary.width&&decoded.height===primary.height&&decoded.data.equals(primary.data);
  const logs=await evaluate('window.logs()');const result={id:job.id,prepared,sequence,matchedSamples:sequence.map(i=>job.samples[i]),seeks,referenceRepeatIdentical:first===last,firstReferenceSha256:createHash('sha256').update(firstBytes).digest('hex'),firstReferencePixelSha256:createHash('sha256').update(decoded.data).digest('hex'),comparison:'Exact decoded RGBA pixels; browser and pngjs use different PNG encodings',matchedPrimaryCapture:primaryPath,identicalToPrimary,logs,method:'Separate CDP target in the same pinned browser; prepare production route, boundary/midpoint/shuffled seeks, repeat first frame, exact identity with primary full-window first capture',browser:'Chromium 151.0.7922.173',lottieWeb:'5.13.0',dpr:1};
  outcomes.push(result);writeFileSync('work/route-preparation-and-repeat.json',JSON.stringify({outcomes},null,2)+'\n');console.log(job.id,result.referenceRepeatIdentical,identicalToPrimary,prepared.notes);
 }
}finally{await cdp.send('Target.closeTarget',{targetId:target.targetId});socket.close();}
