"""Idempotent, explicit Project view setup; output verified IDs, never queue state."""
import argparse,json
from pathlib import Path
from github_api import graphql
from complete_setup import CONFIG
VIEWS=[('Delivery','TABLE_LAYOUT','label:"audience:worker" -label:"kind:review"'),('Engine','BOARD_LAYOUT','label:"lane:engine" label:"audience:worker" -label:"kind:review"'),('Product','BOARD_LAYOUT','label:"lane:product" label:"audience:worker" -label:"kind:review"'),('Milestones','TABLE_LAYOUT','label:"kind:milestone"'),('Requests','TABLE_LAYOUT','label:"kind:request" label:"audience:orchestrator"'),('Human verification','TABLE_LAYOUT','status:"Human verification"')]
QUERY='''query($id:ID!){node(id:$id){... on ProjectV2{views(first:100){nodes{id name number layout filter}} fields(first:100){nodes{... on ProjectV2Field{id name} ... on ProjectV2SingleSelectField{id name} ... on ProjectV2IterationField{id name}}}}}}'''
def configure(config,apply=False):
 p=config['project'];project=graphql('query($owner:String!,$number:Int!){user(login:$owner){projectV2(number:$number){id number title url}}}',{'owner':p['owner'],'number':p['number']})['user']['projectV2']
 if not project or project['url'].rstrip('/')!=p['url'].rstrip('/'):raise ValueError('Project identity mismatch.')
 pid=project['id'];data=graphql(QUERY,{'id':pid})['node'];fields={f['name']:f['id'] for f in data['fields']['nodes']};visible=[fields[n] for n in ('Title','Status','Workstream','Kind','Priority','Milestone','Parent issue','Sub-issues progress','Queue order') if n in fields];byname={v['name']:v for v in data['views']['nodes']};placeholders=[byname[n] for n in ('View 1','View 2','View 3') if n in byname]
 if not apply:return {'network_mutations':False,'existing_views':data['views']['nodes'],'planned_views':VIEWS}
 for name,layout,filter_text in VIEWS:
  view=byname.get(name) or (placeholders.pop(0) if placeholders else None)
  if not view:view=graphql('mutation($input:CreateProjectV2ViewInput!){createProjectV2View(input:$input){projectV2View{id name number}}}',{'input':{'projectId':pid,'name':name,'layout':layout,'configuration':{'visibleFieldIds':visible}}})['createProjectV2View']['projectV2View']
  graphql('mutation($input:UpdateProjectV2ViewInput!){updateProjectV2View(input:$input){projectV2View{id name number layout filter}}}',{'input':{'viewId':view['id'],'name':name,'layout':layout,'filter':filter_text,'configuration':{'visibleFieldIds':visible}}})
 observed=graphql(QUERY,{'id':pid})['node']['views']['nodes'];verified={}
 for name,layout,filter_text in VIEWS:
  matches=[v for v in observed if v['name']==name]
  if len(matches)!=1 or matches[0]['layout']!=layout or matches[0]['filter']!=filter_text:raise ValueError('View readback mismatch: '+name)
  verified[name]=matches[0]
 return {'project_id':pid,'project_url':project['url'],'views_verified':True,'views':verified}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');a=p.parse_args();print(json.dumps(configure(json.loads(Path(CONFIG).read_text()),a.apply),indent=2))
