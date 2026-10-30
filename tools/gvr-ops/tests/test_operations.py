import unittest,json,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from ops_state import clock,format_record
from gh_context import select,request_flags,claims_and_handover,unacknowledged

class OperationsTests(unittest.TestCase):
 def event(self,lane,n):return {'body':format_record({'type':'run','lane':lane,'run_id':str(n),'outcome':'complete'})}
 def test_independent_clocks_and_dedup(self):
  records=[self.event('engine',i) for i in range(5)]+[self.event('product',0)];records.append(records[0])
  self.assertTrue(clock(records,'engine')['review_due']);self.assertEqual(clock(records,'engine')['terminal_runs'],5)
  self.assertFalse(clock(records,'product')['review_due']);self.assertEqual(clock(records,'product')['unreviewed_count'],1)
 def test_review_cannot_erase_concurrent_new_outcome(self):
  records=[self.event('engine',i) for i in range(6)]
  records.append({'body':format_record({'type':'review','lane':'engine','reviewed_run_ids':[str(i) for i in range(5)]})})
  self.assertEqual(clock(records,'engine')['unreviewed_run_ids'],['5'])
 def test_conflicting_duplicate_run_rejected(self):
  a=self.event('engine',1);b={'body':format_record({'type':'run','lane':'engine','run_id':'1','outcome':'failed'})}
  with self.assertRaises(ValueError):clock([a,b],'engine')
 def test_worker_selection_excludes_mail_and_blocks_dependencies(self):
  def item(k,n,status='Ready',lane='Engine',kind='Task',labels=None,body='',state='OPEN',reason=None):
   return {'key':k,'number':n,'state':state,'stateReason':reason,'labels':labels or [],'body':body or '<!-- gvr-dependencies:  -->','fields':{'Status':status,'Workstream':lane,'Kind':kind,'Priority':'P1'}}
  mail=item('X001',1,kind='Request',labels=['audience:orchestrator']);blocked=item('E002',2,body='<!-- gvr-dependencies: E001 -->');ready=item('E001',3)
  self.assertEqual(select([mail,blocked,ready],'engine')['key'],'E001')
  done=item('E001',3,status='Done',state='CLOSED',reason='COMPLETED');self.assertEqual(select([mail,blocked,done],'engine')['key'],'E002')
  done['stateReason']='NOT_PLANNED';self.assertIsNone(select([mail,blocked,done],'engine'))
 def test_request_outside_board_and_accepted_blocker(self):
  r={'state':'open','labels':[{'name':'audience:orchestrator'},{'name':'request-to:engine'},{'name':'triage:pending'}],'body':''}
  self.assertEqual(len(request_flags([r],'engine')[1]),1);self.assertEqual(len(request_flags([r],'product')[1]),0)
  r['labels'][-1]={'name':'triage:accepted'};r['body']='<!-- gvr-request -->\n```json\n{"blocks_active":true}\n```'
  self.assertEqual(len(request_flags([r],'engine')[1]),1)
 def test_interrupted_claim_and_comment_handover(self):
  records=[{'body':'<!-- gvr-claim -->\n```json\n{"run_id":"r1","status":"interrupted","branch":"engine/1-delta"}\n```'},{'html_url':'https://example.invalid/comment','body':'<!-- gvr-handover -->\nPartial implementation; resume branch.'}]
  c=claims_and_handover(records);self.assertTrue(c['recoverable']);self.assertIn('resume branch',c['latest_handover']['body'])
 def test_intake_clearance_does_not_block_accepted_work_forever(self):
  req={'number':1,'updated_at':'2026-10-30T12:00:00Z'};receipt={'lane':'engine','session_id':'s1','requests':{'1':req['updated_at']}}
  self.assertEqual(unacknowledged([req],receipt,'engine','s1'),[])
  self.assertEqual(unacknowledged([req],receipt,'engine','s2'),[req])
  changed={**req,'updated_at':'2026-10-30T12:01:00Z'};self.assertEqual(unacknowledged([changed],receipt,'engine','s1'),[changed])

if __name__=='__main__':unittest.main()
