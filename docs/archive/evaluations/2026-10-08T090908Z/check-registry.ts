import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { compileMotionScript } from '@gvr/compiler';
import { importSource } from '@gvr/format-import-core';
import { lottieAdapter } from '@gvr/format-lottie';
import { emitMotionScript } from '@gvr/motionscript-emitter';
import { verifyRoundTrip } from '@gvr/round-trip';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const registry=JSON.parse(readFileSync('evaluation/authoring/manifests/samples.json','utf8'));
const checks=[];
for(const sample of registry.samples){
 assert(sample.nextRevision>Math.max(...sample.revisions.map((r:any)=>Number(r.revisionId.slice(1)))));
 for(const pointer of ['latestRecordedRevision','latestVerifiedFaithfulRevision','preferredVerifiedAuthoredRevision'])assert(sample[pointer]===null||sample.revisions.some((r:any)=>r.revisionId===sample[pointer]));
 for(const revision of sample.revisions){
  assert.equal(sha(revision.programPath),revision.programSha256);assert.equal(sha(revision.sourcePath),revision.sourceSha256);assert.equal(sha(revision.manifestPath),revision.manifestSha256);
  assert.match(revision.programPath,new RegExp(`/faithful/${revision.revisionId}/program\\.ms$`));
  assert.equal(sha(revision.implementationPin.sourceSnapshot.path),revision.implementationPin.sourceSnapshot.sha256);
  for(const evidence of revision.evidence){assert.equal(sha(evidence.path),evidence.sha256);assert.equal(evidence.sourceSha256,revision.sourceSha256);assert.equal(evidence.programSha256,revision.programSha256);assert.equal(evidence.parentRevisionId,revision.parentRevisionId);assert.equal(evidence.parentProgramSha256,revision.parentProgramSha256);}
  const source=readFileSync(revision.sourcePath,'utf8'),program=readFileSync(revision.programPath,'utf8');
  const imported=importSource(lottieAdapter,source);assert(imported.ok);assert.equal(emitMotionScript(imported.scene!),program);
  const compiled=compileMotionScript(program);assert(compiled.ok);const roundtrip=verifyRoundTrip(imported.scene!);assert(roundtrip.ok);
  const qualification=JSON.parse(readFileSync(revision.evidence.find((e:any)=>e.kind==='qualification').path,'utf8'));assert.equal(qualification.qualityStatus,'PASS');assert.equal(qualification.materialReview.status,'PASS');assert(qualification.routes.every((r:any)=>r.numericPass&&r.capturedScheduled===r.expectedScheduled&&r.capturedExtra===r.expectedExtra&&r.visualStatus==='PASS'));
  checks.push({sampleId:sample.sampleId,revisionId:revision.revisionId,programSha256:revision.programSha256,status:'PASS',canonicalEligibility:revision.canonicalEligibility,productionEligibility:revision.productionEligibility});
 }
}
writeFileSync('work/registry-integrity-results.json',JSON.stringify({checks},null,2)+'\n');console.log(checks);
