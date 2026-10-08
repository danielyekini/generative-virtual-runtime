/** Run pipeline first; this prepares both native routes without changing fixture bytes. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidence = resolve(import.meta.dirname, "../evidence");
const full = process.argv.includes("--full");
const fullExact = process.argv.includes("--full-exact");
const fixtureFilter = process.argv.find(value => value.startsWith("--fixture="))?.split("=")[1];
const sourceJobs = JSON.parse(readFileSync(resolve(evidence,"render-jobs.json"),"utf8")).jobs;
const results = JSON.parse(readFileSync(resolve(evidence,"results.json"),"utf8")).fixtures;
writeFileSync(resolve(evidence,"render-jobs-default.json"),JSON.stringify({jobs:sourceJobs},null,2));
const jobs = [];
const priority = ["LOT-07","LOT-00","LOT-06","LOT-01","LOT-02","LOT-03","LOT-04","LOT-05"];
for (const job of sourceJobs.filter((job: any) => job.format === "lottie" && (!fixtureFilter || job.id === fixtureFilter)).sort((a: any,b: any) => priority.indexOf(a.id)-priority.indexOf(b.id))) {
  const result = results.find((value: any) => value.id === job.id);
  const source = JSON.parse(readFileSync(resolve(evidence,`sources/${job.id}.json`),"utf8"));
  let samples = job.samples.map((sample: any) => ({...sample,scheduled:false}));
  const captureFull = full || (fullExact && result.production.ok && result.production.fidelity === "exact");
  if (captureFull) {
    const frameCount = Math.ceil(source.op-source.ip);
    const scheduled = Array.from({length:frameCount},(_,i) => ({id:`frame_${String(i).padStart(5,"0")}`,label:`source frame ${source.ip+i}`,sourceTimeMs:i*1000/source.fr,lottieFrame:source.ip+i,scheduled:true}));
    const extras = [source.ip+0.5,source.op-0.5].filter(frame => frame>=source.ip && frame<source.op)
      .map((frame,i) => ({id:`subframe_${i}`,label:`boundary subframe ${frame}`,sourceTimeMs:(frame-source.ip)*1000/source.fr,lottieFrame:frame,scheduled:false}));
    samples = [...scheduled,...samples.filter((sample: any) => !scheduled.some(s => Math.abs(s.lottieFrame-sample.lottieFrame)<1e-8)),...extras];
  }
  // A rejected source gets reference evidence only; diagnostic geometry is never a production route.
  if (!result.production.ok) {
    jobs.push({...job,id:`${job.id}-reference`,parentFixture:job.id,sceneUrl:null,sceneKind:"none",samples,fullWindow:captureFull,coverageReason:"Production rejected; no visual certification"});
    continue;
  }
  for (const route of ["imported","compiled"]) {
    const filename=`fixtures/${job.id}/${route}-scene.json`;
    if (route === "compiled" && !result.compile?.ok) continue;
    if (!existsSync(resolve(evidence,filename))) continue;
    jobs.push({...job,id:`${job.id}-${route}`,parentFixture:job.id,sceneUrl:`/${filename}`,sceneKind:route,samples,fullWindow:captureFull,
      coverageReason:captureFull ? "Affected/previously exact fixture full-window verification" : "Known partial conversion; sampled diagnostic only; full-window gate NOT_RUN"});
  }
}
writeFileSync(resolve(evidence,"render-jobs.json"),JSON.stringify({jobs},null,2)+"\n");
console.log(`Prepared ${jobs.length} Lottie route jobs; ${full ? "full-window" : fullExact ? "full-window exact imports; others explicit sampled diagnostics" : "sampled"}; SVG excluded.`);
