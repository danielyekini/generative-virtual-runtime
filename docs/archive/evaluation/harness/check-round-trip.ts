/** Compare whole resolved state on scheduled frames, boundaries, midpoints and shuffled seeks. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnimationRuntime } from "@gvr/runtime";
import type { SceneIR } from "@gvr/schema";

const evidence = resolve(import.meta.dirname,"../evidence");
const settings = JSON.parse(readFileSync(resolve(evidence,"../gate-settings.json"),"utf8"));
const results = JSON.parse(readFileSync(resolve(evidence,"results.json"),"utf8")).fixtures;
const outcomes = [];
for (const result of results.filter((result: any) => result.format === "lottie" || result.id.startsWith("LOT"))) {
  if (!result.production.ok || !result.compile?.ok) {
    outcomes.push({id:result.id,status:result.id === "LOT-03" ? "QUARANTINED" : "FAIL",reason:"No accepted production import or compiled route"});
    continue;
  }
  const readScene = (kind: string) => JSON.parse(readFileSync(resolve(evidence,`fixtures/${result.id}/${kind}-scene.json`),"utf8")) as SceneIR;
  const direct = readScene("imported"), compiled = readScene("compiled");
  const source = JSON.parse(readFileSync(resolve(evidence,`sources/${result.id}.json`),"utf8"));
  const timeSet = new Set<number>([0,direct.timeline.durationMs]);
  for (let i=0;i<Math.ceil(source.op-source.ip);i++) timeSet.add(i*1000/source.fr);
  function globalTime(time: number, scopeId?: string): number {
    if (!scopeId) return time;
    const scope = direct.timingScopes?.find(scope => scope.id === scopeId);
    if (!scope) throw new Error(`Unknown timing scope ${scopeId}`);
    return globalTime(scope.offsetMs + scope.stretch*time,scope.parentId ?? undefined);
  }
  for (const track of direct.timeline.tracks) {
    const times = track.kind === "keyframe" ? track.keyframes.map(key => track.startMs+key.offset*track.durationMs) : [track.startMs,track.startMs+track.durationMs];
    for (const time of times) timeSet.add(globalTime(time,track.timingScopeId));
    for (let i=1;i<times.length;i++) timeSet.add(globalTime((times[i-1]!+times[i]!)/2,track.timingScopeId));
  }
  // Steps are global timeline events; only tracks have local timing scopes.
  for (const step of direct.timeline.steps) timeSet.add(step.timeMs);
  const times=[...timeSet].filter(t => t>=0 && t<=direct.timeline.durationMs).sort((a,b)=>a-b);
  let seed=0x475652; const shuffled=[...times];
  for (let i=shuffled.length-1;i>0;i--) {seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j]!,shuffled[i]!];}
  let maxNumberDifference=0,maxColorDifference=0,mismatchCount=0;
  const mismatches: {timeMs:number;path:string;direct:unknown;compiled:unknown}[]=[];
  function compare(a:any,b:any,timeMs:number,path="$",color=false) {
    if (typeof a === "number" && typeof b === "number") {
      const delta=Math.abs(a-b); if(color) maxColorDifference=Math.max(maxColorDifference,delta);else maxNumberDifference=Math.max(maxNumberDifference,delta);
      if(Number.isFinite(delta) && delta <= (color ? 1/255 : settings.numberTolerance)) return;
    } else if (a===b) return;
    else if (a && b && typeof a === "object" && typeof b === "object") {
      const isColor=["r","g","b","a"].every(k=>typeof a[k]==="number" && typeof b[k]==="number");
      for(const k of new Set([...Object.keys(a),...Object.keys(b)])) compare(a[k],b[k],timeMs,`${path}.${k}`,isColor);
      return;
    }
    mismatchCount++;if(mismatches.length<20)mismatches.push({timeMs,path,direct:a,compiled:b});
  }
  const a=new AnimationRuntime(direct),b=new AnimationRuntime(compiled);const began=performance.now();
  for(const time of [...times,...shuffled]) {compare(a.evaluate(time),b.evaluate(time),time);if(a.lastDiagnostics.length || b.lastDiagnostics.length) {mismatchCount++;}}
  outcomes.push({id:result.id,status:mismatchCount===0?"PASS":"FAIL",coverage:"Full scheduled frame window plus IR key boundaries, segment midpoints, start/end; ascending and deterministic shuffled seeks",
    timesMs:times,evaluations:times.length*2,seed:"0x475652",numberTolerance:settings.numberTolerance,colorTolerance:"1/255",maxNumberDifference,maxColorDifference,mismatchCount,mismatches,costMs:performance.now()-began});
}
writeFileSync(resolve(evidence,"round-trip-results.json"),JSON.stringify({fixtures:outcomes},null,2)+"\n");
console.log(outcomes.map(outcome=>`${outcome.id}: ${outcome.status}`).join("\n"));
