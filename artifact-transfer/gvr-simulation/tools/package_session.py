#!/usr/bin/env python3
"""Package a closed simulation. Structural checks only; no rendering claims."""
import argparse, datetime, hashlib, json, pathlib, re, zipfile

def package(folder, output):
 root=pathlib.Path(folder).resolve();out=pathlib.Path(output).resolve()
 if out.is_relative_to(root): raise ValueError('Destination must be outside the session directory')
 def read(name):
  p=(root/name).resolve()
  if not p.is_relative_to(root) or not p.is_file():raise ValueError(f'Unsafe or missing file: {name}')
  return p.read_bytes()
 s=json.loads(read('session.json'))
 if not s.get('closed') or not s.get('closedAt'):raise ValueError('Close the conversation first')
 def timestamp(v):datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
 timestamp(s['createdAt']);timestamp(s['closedAt'])
 if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{0,120}',s['id']):raise ValueError('Invalid transcript id')
 if not isinstance(s['title'],str) or not 0<len(s['title'].strip())<=200:raise ValueError('Invalid title')
 for key in ('director','implementer'):read(s['promptFiles'][key])
 read('review/final-review.md')
 turns=[]
 for i,t in enumerate(s['turns'],1):
  user=read(t['user']).decode('utf-8');raw=read(t['director']).decode('utf-8');d=json.loads(raw)
  e=d['experience'];op=e['operation']
  if d.get('directorVersion')!='0.4' or not isinstance(d.get('response'),str) or not d['response'].strip():raise ValueError('Invalid director response')
  if op not in ('none','create','update'):raise ValueError('Invalid operation')
  if 'stateRequest' in d:raise ValueError('Forbidden stateRequest')
  if op=='none' and (e!={'form':'conversation','operation':'none','presentation':'immediate'} or any(k in d for k in ('result','changes','preserve','assumptions','sequences','constraints'))):raise ValueError('Invalid conversation-only turn')
  if op=='create' and (not d.get('result',{}).get('description') or 'changes' in d):raise ValueError('Invalid create turn')
  if op=='update' and (not d.get('changes') or 'result' in d):raise ValueError('Invalid update turn')
  if (e['presentation']=='immediate')==bool(d.get('sequences')):raise ValueError('Presentation/sequence mismatch')
  read(t['review'])
  a={'id':f'a{i}','role':'assistant','text':d['response'],'directorScript':raw}
  if op!='none':
   a['motionScript']=read(t['program']).decode('utf-8');read(t['proposals']);v=json.loads(read(t['verification']))
   if t.get('status')=='verified' and not all(v.get(k) is True for k in ('compilePassed','schemaPassed')):raise ValueError('Verified turn lacks compiler/schema evidence')
   if not a['motionScript'].strip():raise ValueError('Empty program')
  elif t.get('program'):raise ValueError('Conversation-only turn must not mutate program')
  turns.extend([{'id':f'u{i}','role':'user','text':user},a])
 if not turns or len(turns)>400:raise ValueError('Transcript needs 1–200 exchanges')
 transcript={'gvrTranscript':'0.1','id':s['id'],'title':s['title'].strip(),'createdAt':s['createdAt'],'approach':'director','model':s.get('model') or 'unknown','turns':turns}
 files={}
 for p in sorted(root.rglob('*')):
  if p.is_symlink():raise ValueError('Symlinks are not packaged')
  if p.is_file():files[p.relative_to(root).as_posix()]=p.read_bytes()
 files['transcript.json']=(json.dumps(transcript,ensure_ascii=False,indent=2)+'\n').encode()
 files['package-manifest.json']=(json.dumps({'sha256':{n:hashlib.sha256(b).hexdigest() for n,b in files.items()},'validation':'Structural packaging checks only; repository transcript parsing, compilation, rendering and interaction evidence must be recorded separately.'},indent=2)+'\n').encode()
 out.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for n,b in files.items():z.writestr(n,b)
 with zipfile.ZipFile(out) as z:
  if z.testzip():raise ValueError('ZIP integrity failure')
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('session');p.add_argument('destination');a=p.parse_args();print(package(a.session,a.destination))
