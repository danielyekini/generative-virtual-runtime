import {readFileSync,writeFileSync} from 'node:fs';
import {AnimationRuntime} from '@gvr/runtime';
import {applySegmentEasing, lerpPathCommands} from '@gvr/schema';
const source=JSON.parse(readFileSync('fixtures/corpus/lottie/LOT-07.json','utf8'));
const scene=JSON.parse(readFileSync('evaluation/evidence/fixtures/LOT-07/imported-scene.json','utf8'));
const runtime=new AnimationRuntime(scene);const results=[];
function commands(p:any){const out:any[]=[{cmd:'M',x:p.v[0][0],y:p.v[0][1]}];for(let i=1;i<=p.v.length;i++){let j=i%p.v.length,k=i-1;out.push({cmd:'C',c1x:p.v[k][0]+p.o[k][0],c1y:p.v[k][1]+p.o[k][1],c2x:p.v[j][0]+p.i[j][0],c2y:p.v[j][1]+p.i[j][1],x:p.v[j][0],y:p.v[j][1]});}out.push({cmd:'Z'});return out;}
for(const l of source.layers.slice(0,5))for(const g of l.shapes){const sh=g.it?.find((s:any)=>s.ty==='sh');if(!sh)continue;const track=scene.timeline.tracks.find((t:any)=>t.valueType==='path'&&t.target.nodeId.startsWith(`layer_${l.ind}.${g.nm.replaceAll(/[^a-zA-Z0-9_]/g,'_')}.`));if(!track){console.log('missing',g.nm);continue;}
 for(const frame of [0,2,10,30,75,149]){const keys=sh.ks.k;let i=0;while(i<keys.length-2&&keys[i+1].t<=frame)i++;const a=keys[i],b=keys[i+1],u=(frame-a.t)/(b.t-a.t),ease=applySegmentEasing({type:'cubic',x1:a.o.x,y1:a.o.y,x2:a.i.x,y2:a.i.y},u),expected=lerpPathCommands(commands(a.s[0]),commands(b.s[0]),ease)!;
 const item=runtime.evaluate(frame*1000/source.fr).drawItems.find((d:any)=>d.nodeId===track.target.nodeId)!;const actual=(item.geometry as any).commands;let max=0;for(let j=0;j<actual.length;j++)for(const k of Object.keys(actual[j]))if(k!=='cmd')max=Math.max(max,Math.abs(actual[j][k]-expected[j][k]));results.push({layer:l.nm,node:track.target.nodeId,frame,maxCoordinateDifference:max,expectedFirst:expected[0],actualFirst:actual[0]});
 }
}
const run=readFileSync('work/current-run.txt','utf8');writeFileSync(`docs/evaluations/${run}/morph-after-clip.json`,JSON.stringify(results,null,2));console.log(results.map(r=>({layer:r.layer,frame:r.frame,max:r.maxCoordinateDifference})));
