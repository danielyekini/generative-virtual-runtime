import {readFileSync,writeFileSync} from 'node:fs';
import {AnimationRuntime} from '@gvr/runtime';
const run='docs/evaluations/'+readFileSync('work/current-run','utf8');
const probe=JSON.parse(readFileSync(run+'/evidence/shape-state/shape-state.json','utf8'));
const scene=JSON.parse(readFileSync('evaluation/evidence/fixtures/LOT-01/imported-scene.json','utf8'));
const runtime=new AnimationRuntime(scene);const out=[];
const pt=(p:any)=>({x:p[0],y:p[1]});
const commands=(p:any)=>{const n=p._length,cs:any[]=[{cmd:'move',...pt(p.v[0])}];for(let j=1;j<n;j++)cs.push({cmd:'cubic',x1:p.o[j-1][0],y1:p.o[j-1][1],x2:p.i[j][0],y2:p.i[j][1],...pt(p.v[j])});if(p.c){cs.push({cmd:'cubic',x1:p.o[n-1][0],y1:p.o[n-1][1],x2:p.i[0][0],y2:p.i[0][1],...pt(p.v[0])},{cmd:'close'});}return cs;};
for(const sample of probe){const frame=runtime.evaluate(sample.frame*1000/30);for(const layer of sample.state){if(layer.loc!=='root.1')continue;const shapes:any[]=[];function walk(items:any[]){for(const i of items??[]){if(i.sh)shapes.push(i.sh);walk(i.it);}}walk(layer.items);if(shapes.length!==1)continue;const items=frame.drawItems.filter(i=>i.nodeId.match(new RegExp('layer_'+layer.ind+'\\.[^.]+\\.[^.]+$')));for(const item of items){const shape=shapes[0];out.push({frame:sample.frame,ind:layer.ind,nodeId:item.nodeId,source:commands(shape.paths?.[0]??shape.v),native:item.geometry,sourceBase:commands(shape.v),matrix:item.logicalMatrix,paint:item.appearance});}}}
writeFileSync(run+'/evidence/shape-state/paired-geometry.json',JSON.stringify(out,null,2));console.log(out.length,'shape pairs');
