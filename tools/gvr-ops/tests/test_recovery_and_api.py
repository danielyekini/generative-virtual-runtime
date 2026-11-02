import sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import github_api,configure_views
from gh_context import fetch_items,normalize,select
from ops_state import clock,format_record
class RecoveryAndApiTests(unittest.TestCase):
 def test_unexpected_origin_precedes_credential_lookup(self):
  with patch('github_api.subprocess.run') as credentials:
   for path in ('https://untrusted.example/graphql','//untrusted.example/graphql'):
    with self.assertRaises(ValueError):github_api.request(path)
   credentials.assert_not_called()
 def test_redirect_not_followed(self):self.assertIsNone(github_api.NoRedirect().redirect_request(None,None,302,'',{},'https://untrusted.example'))
 def test_pagination_origin(self):
  with patch('github_api.request',return_value=([],{'Link':'<https://untrusted.example/page2>; rel="next"'})) as request:
   with self.assertRaises(RuntimeError):github_api.pages('repos/owner/repo/issues')
   self.assertEqual(request.call_count,1)
 def test_real_membership_resolves_project_index_omission(self):
  c={'repository':'owner/repo','project':{'id':'right'},'issues':{'E002':{'number':21}}};page={'data':{'node':{'items':{'nodes':[],'pageInfo':{'hasNextPage':False}}}}};member={'id':'item','project':{'id':'right'},'content':{'number':21}};lookup={'data':{'repository':{'i21':{'projectItems':{'nodes':[member]}}}}}
  with patch('gh_context.gh',side_effect=[page,lookup]):self.assertEqual(fetch_items(c)[0]['id'],'item')
  member['project']['id']='wrong'
  with patch('gh_context.gh',side_effect=[page,lookup]):
   with self.assertRaises(RuntimeError):fetch_items(c)
 def test_clock_needs_no_project_membership(self):
  c={'project':{'id':'p'},'clocks':{'engine':{'issue_number':62}}};page={'data':{'node':{'items':{'nodes':[],'pageInfo':{'hasNextPage':False}}}}}
  with patch('gh_context.gh',return_value=page) as query:self.assertEqual(fetch_items(c),[]);self.assertEqual(query.call_count,1)
 def test_status_case(self):
  i={'content':{'number':20,'body':'','labels':{'nodes':[]}},'fieldValues':{'nodes':[{'name':'In Progress','field':{'name':'Status'}}]}}
  self.assertEqual(normalize(i)['fields']['Status'],'In progress')
 def test_archived_open_item_not_dispatched(self):
  i={'key':'E001','number':20,'state':'OPEN','isArchived':True,'labels':[],'fields':{'Status':'Ready','Workstream':'Engine','Kind':'Task'},'body':'<!-- gvr-dependencies:  -->'};self.assertIsNone(select([i],'engine'))
 def test_all_terminal_outcomes_count_once(self):
  records=[{'body':format_record({'type':'run','lane':'engine','run_id':str(i),'outcome':v})} for i,v in enumerate(['complete','partial','blocked','failed','partial'])];records.append(records[1]);s=clock(records,'engine');self.assertEqual(s['terminal_runs'],5);self.assertTrue(s['review_due'])
 def test_views_repeat_without_duplicates_or_destroying_custom_view(self):
  project={'id':'p','url':'https://github.com/users/owner/projects/3'};views=[{'id':'old','number':1,'name':'Personal','layout':'TABLE_LAYOUT','filter':''}];created=[]
  def query(text,variables):
   if 'user(login:' in text:return {'user':{'projectV2':project}}
   if text==configure_views.QUERY:return {'node':{'fields':{'nodes':[{'id':'title','name':'Title'}]},'views':{'nodes':list(views)}}}
   value=variables['input']
   if 'createProjectV2View' in text:
    row={'id':str(len(views)+1),'number':len(views)+1,'name':value['name'],'layout':value['layout'],'filter':''};views.append(row);created.append(row['id']);return {'createProjectV2View':{'projectV2View':row}}
   row=next(v for v in views if v['id']==value['viewId']);row.update({k:value[k] for k in ('name','layout','filter')});return {'updateProjectV2View':{'projectV2View':row}}
  c={'project':{'owner':'owner','number':3,'url':project['url']}}
  with patch('configure_views.graphql',side_effect=query):configure_views.configure(c,True);result=configure_views.configure(c,True)
  self.assertEqual(len(created),6);self.assertEqual(len(views),7);self.assertEqual(views[0]['name'],'Personal');self.assertTrue(result['views_verified'])
if __name__=='__main__':unittest.main()
