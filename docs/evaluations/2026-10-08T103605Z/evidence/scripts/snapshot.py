import pathlib,subprocess,json,hashlib,tarfile,sys
root=pathlib.Path('.');run=(root/'work/current-run.txt').read_text();d=root/'docs/evaluations'/run/'source-snapshot';(d/'tree').mkdir(exist_ok=True)
label=sys.argv[1] if len(sys.argv)>1 else 'final'
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
files=[]
for name in paths:
 if not name or name.startswith(('work/','docs/evaluations/'+run+'/','evaluation/evidence/','node_modules/')) or '/source-snapshot/tree/' in name or '/source-snapshot/files/' in name:continue
 if pathlib.Path(name).name.startswith('.env'):continue
 p=root/name
 if p.is_file():files.append({'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
with tarfile.open(d/'tree'/f'{label}-source.tar.gz','w:gz') as tar:
 for f in files:tar.add(root/f['path'],arcname=f['path'],recursive=False)
(d/f'{label}-files.json').write_text(json.dumps(files,indent=2)+'\n')
(d/f'{label}-git-status.txt').write_text(subprocess.check_output(['git','status','--porcelain'],text=True))
(d/'working-tree.patch').write_bytes(subprocess.check_output(['git','diff','HEAD','--binary']))
(d/f'{label}-archive.json').write_text(json.dumps({'path':f'tree/{label}-source.tar.gz','sha256':hashlib.sha256((d/'tree'/f'{label}-source.tar.gz').read_bytes()).hexdigest(),'files':len(files),'exclusions':['credentials','disposable dependencies/build/caches','work scratch','evaluation/evidence scratch','current run to avoid recursion','recursive bulk source archives'],'trackedDeleted':[n for n in subprocess.check_output(['git','ls-files','--deleted'],text=True).splitlines()]},indent=2)+'\n')
print('snapshot',label,len(files))
