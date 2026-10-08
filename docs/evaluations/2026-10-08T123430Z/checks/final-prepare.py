import pathlib,json,hashlib,subprocess
r=pathlib.Path('docs/evaluations/2026-10-08T123430Z');e=pathlib.Path('evaluation/evidence')
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files={str(p.relative_to(e)):h(p) for p in (e/'fixtures').rglob('*') if p.is_file() and (p.name.endswith('scene.json') or p.suffix=='.motion')}
subprocess.run(['npx','tsx','evaluation/harness/run-pipeline.ts'],check=True)
changes=[name for name,digest in files.items() if h(e/name)!=digest]
(r/'regenerated-scene-equivalence.json').write_text(json.dumps({'reason':'Importer package release metadata updated after the prior pipeline process loaded; regeneration must preserve exact scene/program bytes before associating semantic results with final source snapshot.','changedSceneOrProgramPaths':changes,'sha256':files},indent=2)+'\n')
if changes:raise RuntimeError('Scene bytes changed; rerun semantic comparison')
subprocess.run(['npx','tsx','evaluation/harness/prepare-fidelity.ts','--full'],check=True)
