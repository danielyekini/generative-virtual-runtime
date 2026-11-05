"""Freeze scratch evidence and a deletion-aware, reproducible execution snapshot."""
from pathlib import Path
import sys, json, hashlib, shutil, subprocess, tarfile, datetime

root = Path.cwd()
run = root / 'docs/evaluations' / (root / 'work/current-run').read_text()
stage = sys.argv[1]
target = run / 'evidence' / stage
if target.exists():
    raise SystemExit(f'Refusing to overwrite evidence: {target}')
shutil.copytree(root / 'evaluation/evidence', target)
logs = target / 'execution-logs'
logs.mkdir()
for p in (root / 'work').glob(stage + '-*.log'):
    shutil.copy2(p, logs / p.name)
snapshot = run / 'source-snapshot' / 'tree'
snapshot.mkdir(parents=True, exist_ok=True)
files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
new = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z']).decode().split('\0')
# Historical records are already preserved in the clean HEAD archive. Run outputs
# are immutable evidence, not execution inputs, and must not recursively archive themselves.
def source_path(p):
    parts = p.split('/')
    scratch_source = p.startswith('work/') and (p.endswith(('.ts', '.py', '.txt')) or p == 'work/current-run')
    return bool(p) and (not p.startswith('work/') or scratch_source) and not (p.startswith('docs/evaluations/') and len(parts) > 2 and parts[2].startswith('20'))

paths = sorted(set(p for p in files + new if source_path(p)))
manifest = []
archive = snapshot / (stage + '-source.tar.gz')
with tarfile.open(archive, 'w:gz') as tar:
    for name in paths:
        p = root / name
        if p.is_file():
            tar.add(p, arcname=name, recursive=False)
            manifest.append({'path': name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
        elif not p.exists():
            manifest.append({'path': name, 'deleted': True})
patch = subprocess.check_output(['git', 'diff', '--binary', 'HEAD', '--', '.', ':!docs/evaluations/20*', ':!work'])
(snapshot / (stage + '-working-tree.patch')).write_bytes(patch)
record = {'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'archive': str(archive.relative_to(root)), 'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
          'scope': 'All tracked and untracked source/config/lockfile/contract inputs outside dated historical evaluation directories and disposable work outputs; work source helpers and run selector are included. HEAD archive supplies historical bytes. Includes evaluation authority/policy and all application/harness inputs.',
          'files': manifest}
(run / 'source-snapshot' / (stage + '-files.json')).write_text(json.dumps(record, indent=2) + '\n')
evidence = [{'path': str(p.relative_to(run)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted(target.rglob('*')) if p.is_file()]
(run / (stage + '-evidence-files.json')).write_text(json.dumps(evidence, indent=2) + '\n')
print(f'Frozen {stage}: {len(evidence)} evidence files; {len(manifest)} source entries')
