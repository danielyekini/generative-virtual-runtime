import {readFileSync,writeFileSync} from 'node:fs';
import {readVec2Property} from '../packages/format-lottie/src/property';
import {sampleScene} from '../packages/runtime/src/sample';
import {applySegmentEasing,spatialCubicPoint, type SceneIR} from '@gvr/schema';
const src=JSON.parse(readFileSync('fixtures/corpus/lottie/LOT-01.json','utf8'));
const scene=JSON.parse(readFileSync('evaluation/evidence/fixtures/LOT-01/imported-scene.json','utf8')) as SceneIR;
const outcomes:any[]=[];
const poses=new Map<number,Map<string,any>>();for(let frame=0;frame<src.op;frame+=.5)poses.set(frame,new Map(sampleScene(scene,frame*1000/src.fr).nodes.map(n=>[n.id,n.transform.position])));
for(const layer of src.assets[0].layers){
 const prop=readVec2Property(layer.ks.p,{x:0,y:0}); if(prop.kind!=='animated'||!prop.keyframes.some(k=>k.spatial))continue;
 const node=scene.nodes.find(n=>n.kind==='group' && n.id.endsWith(`.layer_${layer.ind}`));if(!node)continue;
 const a=layer.ks.a.k;let max=0,worst:any;
 for(let frame=0;frame<src.op;frame+=.5){
  const ks=prop.keyframes;const i=ks.findIndex((k,j)=>j<ks.length-1&&frame>=k.frame&&frame<ks[j+1]!.frame);if(i<0)continue;
  const k=ks[i]!,next=ks[i+1]!,u=applySegmentEasing(k.hold?{type:'hold'}:k.easing==='bezier-approx'?'linear':k.easing,(frame-k.frame)/(next.frame-k.frame));
  const v=k.spatial?spatialCubicPoint(u,k.value,{x:k.value.x+k.spatial.out.x,y:k.value.y+k.spatial.out.y},{x:next.value.x+k.spatial.in.x,y:next.value.y+k.spatial.in.y},next.value,150,{c1z:k.spatial.out.z,c2z:k.spatial.in.z}):{x:k.value.x+(next.value.x-k.value.x)*u,y:k.value.y+(next.value.y-k.value.y)*u};
  const actual=poses.get(frame)!.get(node.id);
  const delta=Math.hypot(actual.x-(v.x-a[0]),actual.y-(v.y-a[1]));if(delta>max){max=delta;worst={frame,actual,expected:{x:v.x-a[0],y:v.y-a[1]}};}
 }
 if(prop.keyframes[0]!.frame<0||prop.keyframes.at(-1)!.frame>src.op)outcomes.push({id:node.id,max,worst,keys:prop.keyframes.map(k=>k.frame),clipped:prop.keyframes[0]!.frame<0||prop.keyframes.at(-1)!.frame>src.op});
}
writeFileSync('work/spatial-after.json',JSON.stringify({fixture:'LOT-01',method:'Original uncut property sampling against imported node pose; not independent reference evidence',outcomes},null,2));
console.log(outcomes.map(x=>({id:x.id,max:x.max,clipped:x.clipped})))
