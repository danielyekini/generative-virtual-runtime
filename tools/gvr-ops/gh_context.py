#!/usr/bin/env python3
"""Read-only Projects v2 context/route helper. Requires installer-resolved config.
No task claims, project writes, token handling or secret output. Agent handles mutations.
"""
import argparse,json,re,subprocess,os
from datetime import datetime,timezone
from pathlib import Path
from ops_state import clock

QUERY='''query($id:ID!,$after:String){node(id:$id){... on ProjectV2{items(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{id fieldValues(first:100){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{name}}} ... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2Field{name}}} ... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2Field{name}}}}} content{... on Issue{number title body url state stateReason labels(first:100){nodes{name}}}}}}}}}'''
def gh(args,payload=None):
 r=subprocess.run(['gh',*args],input=json.dumps(payload) if payload is not None else None,text=True,capture_output=True)
 if r.returncode:raise RuntimeError('GitHub command failed; verify project/issue access. Details: '+r.stderr[:400])
 v=json.loads(r.stdout)
 if isinstance(v,dict) and v.get('errors'):raise RuntimeError('GraphQL returned errors: '+str(v['errors'])[:400])
 return v
def resolve_repository(config):
 if not config.get('repository_id'):return config['repository']
 repository=gh(['api',f"repositories/{config['repository_id']}"])
 if str(repository.get('id'))!=str(config['repository_id']):raise RuntimeError('Repository identity mismatch')
 return repository['full_name']
def fetch_items(config):
 cursor=None;items=[]
 while True:
  v=gh(['api','graphql','--input','-'],{'query':QUERY,'variables':{'id':config['project']['id'],'after':cursor}})
  n=v['data']['node']
  if not n:raise RuntimeError('Project is not accessible')
  page=n['items'];items.extend(page['nodes'])
  if not page['pageInfo']['hasNextPage']:return items
  cursor=page['pageInfo']['endCursor']
def normalize(item):
 c=item.get('content') or {}
 if not c.get('number'):return None
 fields={v['field']['name']:v.get('name',v.get('number',v.get('text'))) for v in item.get('fieldValues',{}).get('nodes',[]) if v.get('field')}
 key=re.search(r'<!-- gvr-key: ([A-Z0-9]+) -->',c.get('body',''))
 return {**c,'key':key[1] if key else None,'fields':fields,'labels':[l['name'] for l in c.get('labels',{}).get('nodes',[])]}
def select(items,lane):
 keys=[i['key'] for i in items if i and i.get('key')]
 if len(keys)!=len(set(keys)):raise ValueError('Duplicate stable issue keys; reconcile through owning orchestrator.')
 bykey={i['key']:i for i in items if i and i['key']};eligible=[]
 for i in items:
  if not i:continue
  f=i['fields'];labels=i['labels']
  if 'audience:orchestrator' in labels or 'ops:clock' in labels:continue
  if f.get('Workstream','').lower()!=lane or f.get('Status')!='Ready' or i['state']!='OPEN':continue
  if f.get('Kind') in ('Milestone','Epic','Request','Review'):continue
  d=re.search(r'<!-- gvr-dependencies: ([^>]*) -->',i.get('body',''))
  if not d:continue # Unknown dependency readiness must not be guessed.
  deps=[s.strip() for s in d[1].split(',') if s.strip()]
  if any(not bykey.get(k) or bykey[k]['state']!='CLOSED' or bykey[k].get('stateReason')!='COMPLETED' for k in deps):continue
  eligible.append(i)
 eligible.sort(key=lambda i:(i['fields'].get('Priority','P3'),i['fields'].get('Queue order',999999),i['number']))
 return eligible[0] if eligible else None
def comments(config,number):
 pages=gh(['api','--paginate','--slurp',f"repos/{config['repository']}/issues/{number}/comments?per_page=100"])
 return [x for p in pages for x in p]
def request_flags(requests,lane,now=None):
 now=now or datetime.now(timezone.utc);own=[];need=[]
 for r in requests:
  labels=[x['name'] if isinstance(x,dict) else x for x in r.get('labels',[])]
  if 'audience:orchestrator' not in labels or 'request-to:'+lane not in labels:continue
  if r.get('state','open').lower()!='open':continue
  own.append(r);m=re.search(r'<!-- gvr-request -->\s*```json\s*(.*?)\s*```',r.get('body',''),re.S)
  meta=json.loads(m[1]) if m else {}
  due=False
  if meta.get('next_check_at'):
   due=datetime.fromisoformat(meta['next_check_at'].replace('Z','+00:00'))<=now
  if 'triage:pending' in labels or 'priority:p0' in labels or meta.get('blocks_active') or due:need.append(r)
 return own,need
def unacknowledged(requests,receipt,lane,session_id):
 if not receipt or receipt.get('lane')!=lane or not session_id or receipt.get('session_id')!=session_id:return requests
 covered=receipt.get('requests',{})
 return [r for r in requests if str(r['number']) not in covered or not r.get('updated_at') or covered[str(r['number'])]!=r['updated_at']]
def claims_and_handover(records,now=None,agent_id=None):
 now=now or datetime.now(timezone.utc);claim=None;handover=None
 for r in records:
  body=r.get('body','');m=re.search(r'<!-- gvr-claim -->\s*```json\s*(.*?)\s*```',body,re.S)
  if m:claim=json.loads(m[1])
  if '<!-- gvr-handover -->' in body:handover={'url':r.get('html_url'),'body':body[:12000]}
 recoverable=False
 if claim:
  expiry=claim.get('expires_at');expired=bool(expiry and datetime.fromisoformat(expiry.replace('Z','+00:00'))<=now)
  recoverable=claim.get('status')=='interrupted' or expired or bool(agent_id and claim.get('agent_id')==agent_id)
 return {'claim':claim,'recoverable':recoverable,'latest_handover':handover}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--config',default='docs/operations/config.json');ap.add_argument('--lane',choices=['engine','product'],required=True);ap.add_argument('--mode',choices=['route','context','inbox','intake-receipt'],default='route');ap.add_argument('--persona');ap.add_argument('--agent-id',default=os.getenv('GVR_AGENT_ID'));ap.add_argument('--session-id',default=os.getenv('GVR_RUN_ID'));ap.add_argument('--receipt');a=ap.parse_args()
 c=json.loads(Path(a.config).read_text())
 if not c.get('installed') or not c['project'].get('id'):raise SystemExit('Installation incomplete: verify live Project and routing config.')
 c['repository']=resolve_repository(c)
 items=[normalize(i) for i in fetch_items(c)]
 pages=gh(['api','--paginate','--slurp',f"repos/{c['repository']}/issues?state=open&labels=kind%3Arequest&per_page=100"])
 all_mail,mail=request_flags([x for p in pages for x in p if 'pull_request' not in x],a.lane)
 if a.mode=='intake-receipt':
  if a.persona!=a.lane+'-orchestrator' or not a.session_id or not a.receipt:raise SystemExit('Require owning orchestrator, generated session ID and transient receipt path.')
  if any('triage:pending' in [x['name'] if isinstance(x,dict) else x for x in r.get('labels',[])] for r in mail):raise SystemExit('Disposition pending requests before acknowledging intake.')
  # Called only after actual orchestrator disposition/reassessment; this is not
  # a substitute for it. Updated requests invalidate the clearance immediately.
  value={'lane':a.lane,'session_id':a.session_id,'requests':{str(r['number']):r.get('updated_at') for r in mail}}
  p=Path(a.receipt);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value));print(json.dumps({'intake_receipt_written':True}));return
 receipt=json.loads(Path(a.receipt).read_text()) if a.receipt and Path(a.receipt).is_file() else None
 mail=unacknowledged(mail,receipt,a.lane,a.session_id)
 number=c['clocks'][a.lane]['issue_number']
 state=clock(comments(c,number),a.lane,c['clocks'][a.lane]['review_every'])
 if a.mode=='inbox':
  if a.persona!=a.lane+'-orchestrator':raise SystemExit('Use owning orchestrator persona for inbox mode. This is routing, not security isolation.')
  print(json.dumps({'clock':state,'requests':all_mail},indent=2));return
 if a.mode=='route':print(json.dumps({'lane':a.lane,'intake_required':bool(mail),'review_due':state['review_due'],'unreviewed_count':state['unreviewed_count']},indent=2));return
 if mail or state['review_due']:raise SystemExit('Route to owning orchestrator intake/review first; raw requests are excluded from worker context.')
 recovery=[]
 for i in items:
  if i and i['state']=='OPEN' and i['fields'].get('Status')=='In progress' and i['fields'].get('Workstream','').lower()==a.lane and 'audience:orchestrator' not in i['labels']:
   detail=claims_and_handover(comments(c,i['number']),agent_id=a.agent_id)
   if detail['recoverable'] or not detail['claim']:recovery.append({'issue':i,**detail})
 selected=None if recovery else select(items,a.lane)
 detail=claims_and_handover(comments(c,selected['number']),agent_id=a.agent_id) if selected else None
 print(json.dumps({'lane':a.lane,'recoverable_candidates':recovery,'reconcile_recovery_before_new_claim':bool(recovery),'selected_issue':selected,'selected_issue_context':detail,'dependency_and_claim_readback_required':True,'context_paths':[c['paths']['charter'],c['paths'][a.lane+'_direction']]},indent=2))
if __name__=='__main__':main()
