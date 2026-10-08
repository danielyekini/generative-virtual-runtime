import {clipSpatialKeyframes} from './spatial-keys';
import {applySegmentEasing,spatialCubicPoint, type Keyframe} from '@gvr/schema';
const keys:Keyframe[]=[{offset:0,value:{x:0,y:0},easing:{type:'cubic',x1:.167,y1:0,x2:.833,y2:1},spatial:{out:{x:100,y:200,z:40},in:{x:-100,y:-50,z:100}}},{offset:1,value:{x:500,y:300}}];
const clipped=clipSpatialKeyframes(-200,1600,keys,1000)!;let max=0;
for(let t=0;t<=1000;t+=.5){const u=t/1000;const i=u>=1?clipped.keyframes.length-2:clipped.keyframes.findIndex((k,j)=>j<clipped.keyframes.length-1&&u<clipped.keyframes[j+1]!.offset);const a=clipped.keyframes[i]!,b=clipped.keyframes[i+1]!,v=applySegmentEasing(a.easing,(u-a.offset)/(b.offset-a.offset));const p=a.value as any,q=b.value as any;const expected=spatialCubicPoint(applySegmentEasing(keys[0]!.easing,(t+200)/1600),{x:0,y:0},{x:100,y:200},{x:400,y:250},{x:500,y:300},150,{c1z:40,c2z:100});max=Math.max(max,Math.hypot(p.x+(q.x-p.x)*v-expected.x,p.y+(q.y-p.y)*v-expected.y));}
console.log({max,keys:clipped.keyframes.length});
