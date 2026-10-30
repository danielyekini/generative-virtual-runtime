import {describe,it,expect} from 'vitest';
import {compileMotionScript} from '@gvr/compiler';
import {logicalMatrix,drawableOrder,type SceneIR} from '@gvr/schema';
import {sampleScene} from './sample';
import {buildResolvedFrame} from './frame';
import {StreamingRuntime} from './streaming';
const source=`scene "graph" {version "0.2"; viewport (1280,720); background #ffffff; duration 2s;};
group Overlay {space screen; opacity 0.6; position (20,30); group ScopeA {isolated true; opacity 0.4; circle a {radius 5; opacity 0.5;};};};
group WorldLayer {position (40,50); opacity 0.7; circle b {radius 3; transformParent Overlay.ScopeA; inheritOpacity false;};};
animate Overlay.position.x {from 20; to 100; duration 2s;};
step Overlay.visible {at 1s; value false;}; complete;`;
describe('sample-local graph resolution',()=>{
 it('matches reference graph transforms across independent parent chains and shuffled seeks',()=>{
  const result=compileMotionScript(source);expect(result.ok).toBe(true);const scene=result.scene!;
  for(const t of [1500,0,999,2000,500,1000,0]){
   const sampled=sampleScene(scene,t),frame=buildResolvedFrame(scene,sampled,t);
   for(const item of frame.drawItems)expect(item.logicalMatrix).toEqual(logicalMatrix(sampled.nodes,scene.viewport,sampled.camera,item.nodeId));
   expect(frame.drawItems.map(n=>n.nodeId)).toEqual(drawableOrder(sampled.nodes).filter(n=>t<1000 || n.id==='WorldLayer.b').map(n=>n.id));
   if(t<1000)expect(frame.drawItems.find(n=>n.nodeId==='Overlay.ScopeA.a')?.opacity).toBe(0.5*0.6);
   expect(frame.drawItems.find(n=>n.nodeId==='WorldLayer.b')?.opacity).toBe(1);
  }
 });
 it('resolves appended nodes on the same scene object and drops ownership on disposal',()=>{
  const result=compileMotionScript(source.replace('transformParent Overlay.ScopeA;', ''));const runtime=new StreamingRuntime();
  for(const delta of result.deltas){runtime.enqueue(delta);runtime.flushCommands();if(runtime.scene)runtime.evaluate(0);}
  expect(runtime.evaluate(0).drawItems.map(n=>n.nodeId)).toEqual(['Overlay.ScopeA.a','WorldLayer.b']);
  // No object-keyed cache can hide an append or a later sampled revision.
  const scene=runtime.scene as SceneIR;scene.nodes.push({...scene.nodes.find(n=>n.id==='WorldLayer.b')!,id:'extra',parentId:null});
  expect(runtime.evaluate(0).drawItems.some(n=>n.nodeId==='extra')).toBe(true);
  runtime.dispose();expect(runtime.scene).toBeUndefined();expect(()=>runtime.evaluate(0)).toThrow();
 });
});
