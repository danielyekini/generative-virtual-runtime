import {compileMotionScript} from '@gvr/compiler';
import {StreamingRuntime} from '@gvr/runtime';
const source='scene "external-parent" {version "0.2"; viewport (1280,720); background #ffffff; duration 1s;}; group Parent {circle a {radius 5;};}; group Other {circle b {radius 3; transformParent Parent;};}; complete;';
const result=compileMotionScript(source),runtime=new StreamingRuntime();
for(const delta of result.deltas){runtime.enqueue(delta);runtime.flushCommands();}
if(!result.ok || runtime.rejectedDiagnostics.length===0)throw new Error('Reproduction did not trigger');
console.log(JSON.stringify({source,compilerOk:result.ok,rejected:runtime.rejectedDiagnostics},null,2));runtime.dispose();
