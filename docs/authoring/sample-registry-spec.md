# Sample registry and provenance specification

Status: living specification, revision 1.0, 2026-10-08. Installed registry location: evaluation/authoring/manifests/samples.json. Create an empty valid registry at installation; do not mark existing samples verified by inference.

## Record requirements

Each record has stable sampleId, familyId, origin (imported/native), task requirements, source format/path/hash if applicable, provenance and rights status, faithful implementation path/hash, baseline verification run, refined variants, required language/capability/package versions and independent quality/refinement/training statuses.

Each variant has variantId, parent ID/hash, program path/hash, transformation description, recipe/proposal IDs, implementation commit/snapshot, measurement run, quality evidence and limitations. Never overwrite the faithful baseline. A baseline without trustworthy evidence is exploratory, not verified.

Record development/held-out assignment at family level in versioned corpus manifests. Keep raw imports, faithful verified translations and refined outputs distinguishable. A later invalidation appends a correction/revocation record and updates current eligibility without rewriting the historical run.

## Example initial registry

```json
{
  "schemaRevision": "1.0",
  "samples": []
}
```

## Storage

Programs, small fixtures, manifests, immutable summaries and representative images can be committed. Keep bulk captures/model traces outside ordinary Git with durable references and hashes where needed; a local-only path is not durable evidence for another agent. Follow repository corpus/privacy policy. Do not include credentials in snapshots.

## Change log

- 1.0: Initial linked provenance and independent eligibility rules.

## Strict MotionScript program revision rules

Program revisions are distinct from MotionScript language releases, Scene IR releases and package versions. Use immutable monotonic integer revisions per sample lineage: r000001, r000002, and so on. Every changed program byte creates a new revision, including emitter regeneration, minification and repairs. Never overwrite a revision or reuse its number. IDs/numbers must be reserved through the registry; concurrent agents must reconcile allocation before recording a revision. Store parent revision/hash and transformation; branch from the actual parent rather than implying a linear improvement. Largest revision means newest recorded change, not best or verified.

Canonical repository storage:

- Source PAL bytes: fixtures/corpus/ under current corpus policy; additional accepted sources go into a registered corpus revision with SHA-256 and provenance. Do not replace original bytes.
- Faithful translations: samples/motionscript/<sample-id>/faithful/r000001/program.ms (and subsequent immutable revisions).
- Authoring variants: samples/motionscript/<sample-id>/authored/r000002/program.ms (use the same lineage revision counter).
- Every program directory: manifest.json, containing program hash, parent revision/hash, source PAL hash, generation/importer/emitter implementation pin, MotionScript release, Scene IR target release, required capabilities, package/dependency versions and verification links.
- Experimental programs: samples/motionscript/<sample-id>/experimental/<experiment-id>/; not canonical, production or training eligible. Record hashes in run evidence. Promotion writes a new immutable canonical revision.
- Registry: evaluation/authoring/manifests/samples.json; frozen corpus manifests under evaluation/authoring/manifests/corpora/<corpus-id>.json.

Canonical programs use `.ms`, matching `fixtures/motionscript/*.ms` and `fixtures/system/*.ms`. Historical and scratch fidelity generators use `.motion`; retain those originals without renaming or retroactive certification. Include resources and dependency hashes/resolution records needed to reproduce output. Do not label a translation faithful solely because the importer says exact. It may be stored as faithful-candidate with verification UNVERIFIED until source/direct/compiled evidence passes.

Maintain separate pointers latestRecordedRevision, latestVerifiedFaithfulRevision and preferredVerifiedAuthoredRevision. Pointer changes append rationale and verification run; do not delete old records. A regression revokes current eligibility without rewriting earlier evidence. Newer language releases do not retag old programs: migration/regeneration creates a new program revision declaring its actual target versions. Missing version or provenance metadata blocks canonical eligibility.

## Registry fields and evidence association

Each sample records `nextRevision` (next unreserved monotonic integer), `revisions` and the three nullable pointers `latestRecordedRevision`, `latestVerifiedFaithfulRevision`, `preferredVerifiedAuthoredRevision`. Null means no qualifying record; a pointer targets a revision in that sample's lineage, not a language release. Each revision records `revisionId`, `storageClass`, `programPath`, `programSha256`, `parentRevisionId`/`parentProgramSha256` (null only for a genuine root), `sourcePath`/`sourceSha256` (null for native tasks), `implementationPin`, full release/wire IDs, required capabilities, resource/dependency hashes and independent verification/eligibility states. `pointerHistory` and revocations append old/new pointer, rationale, run ID and evidence references.

Every evidence reference records run ID, immutable report/result path and hash, exact source/program hashes, parent revision/hash, implementation snapshot/commit, policy hash and observation coverage. Equality of hashes is necessary, not sufficient for quality. Scratch generated programs have no reserved canonical revision/parent: record null and UNVERIFIED, then create a real revision only through a provenance-backed run. Historical records lacking fields remain readable as NOT_RECORDED; never infer verification or retrofit old reports.

Installation rationale (revision 1.0): repository fixtures establish `.ms`; the pipeline establishes existing `.motion` evidence. Distinct pointers prevent a recent failed candidate replacing a verified/preferred implementation. No candidates are promoted during installation; see the [candidate inventory](../../samples/motionscript/candidate-inventory.json).
