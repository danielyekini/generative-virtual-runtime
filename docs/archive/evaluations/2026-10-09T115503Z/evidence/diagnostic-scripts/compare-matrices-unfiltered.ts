import {readFileSync,writeFileSync} from 'node:fs';
import {AnimationRuntime} from '@gvr/runtime';
import {multiplyMat3} from '@gvr/schema';
const run='docs/evaluations/'+readFileSync('work/current-run','utf8');const samples=JSON.parse(readFileSync(run+'/evidence/source-state/source-state.json','utf8'));
const scene=JSON.parse(readFileSync('evaluation/evidence/fixtures/LOT-01/imported-scene.json','utf8'));const runtime=new AnimationRuntime(scene);
const mat=(x:number[])=>[x[0],x[1],0,x[4],x[5],0,x[12],x[13],1] as any;
const outcomes:any[]=[];let maxDelta=0,compared=0;
for(const sample of samples){const frame=runtime.evaluate(sample.frame*1000/30);const host=sample.state.find((s:any)=>s.loc==='root'&&s.ind===1);for(const state of sample.state){if(!state.mat||state.loc!=='root.1'||state.inRange===false||state.compositionVisible===false)continue;const native=frame.drawItems.find((i:any)=>i.nodeId.match(new RegExp('layer_'+state.ind+'\\.[^.]+\\.[^.]+$')));if(!native)continue;const source=multiplyMat3(mat(host.mat),mat(state.mat));const delta=Math.max(...source.map((x:number,i:number)=>Math.abs(x-native.logicalMatrix[i])));maxDelta=Math.max(maxDelta,delta);compared++;if(delta>.001)outcomes.push({frame:sample.frame,ind:state.ind,nodeId:native.nodeId,delta,source,native:native.logicalMatrix});}}
writeFileSync(run+'/evidence/source-state/matrix-comparison.json',JSON.stringify({compared,maxDelta,outcomes,method:'Source finalTransform matrices including source parenting, composed with precomp host, versus native logical draw matrix. Shape groups in LOT01 are identity.'},null,2));console.log({compared,maxDelta,mismatches:outcomes.length});console.log(outcomes.sort((a,b)=>b.delta-a.delta).slice(0,8));
