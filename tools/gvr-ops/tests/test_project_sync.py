import sys,unittest
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from project_sync import desired_fields,plan,load_config

NOW=datetime(2026,11,2,12,0,tzinfo=timezone.utc)
def issue(**kw):
 base={'number':1,'id':'I','state':'OPEN','stateReason':None,'body':'','labels':['lane:product','kind:task','priority:p1'],'comments':[],'item':'item','current':{}}
 base.update(kw);return base
def claim(status,expires):return '<!-- gvr-claim -->\n```json\n{"run_id":"r","status":"%s","expires_at":"%s"}\n```'%(status,expires)

class ProjectSyncTests(unittest.TestCase):
 def test_label_fields(self):
  self.assertEqual(desired_fields(issue(),NOW),{'Workstream':'Product','Kind':'Task','Priority':'P1'})
 def test_status_precedence(self):
  self.assertEqual(desired_fields(issue(state='CLOSED',stateReason='COMPLETED',body='Board status: **Ready.**'),NOW)['Status'],'Done')
  self.assertEqual(desired_fields(issue(state='CLOSED',stateReason='NOT_PLANNED'),NOW)['Status'],'Deferred')
  active=issue(body='Board status: **Ready.**',comments=[claim('active','2026-11-02T13:00:00Z')])
  self.assertEqual(desired_fields(active,NOW)['Status'],'In progress')
  expired=issue(body='Board status: **Ready.**',comments=[claim('active','2026-11-02T11:00:00Z')])
  self.assertEqual(desired_fields(expired,NOW)['Status'],'Ready')
  released=issue(labels=['lane:product','state:ready'],comments=[claim('active','2026-11-02T13:00:00Z'),claim('released','2026-11-02T13:00:00Z')])
  self.assertEqual(desired_fields(released,NOW)['Status'],'Ready')
 def test_board_marker_variants(self):
  self.assertEqual(desired_fields(issue(body='Board status: Candidate until P001 is done.'),NOW)['Status'],'Candidate')
  self.assertEqual(desired_fields(issue(body='Board status: **Blocked, waiting on the user.**'),NOW)['Status'],'Blocked')
  self.assertEqual(desired_fields(issue(body='Board status: human verification'),NOW)['Status'],'Human verification')
  self.assertNotIn('Status',desired_fields(issue(body='no marker'),NOW))
 def test_plan_only_changes_and_scope(self):
  fm=load_config()['project']['field_map']
  same=issue(current={'Workstream':'Product','Kind':'Task','Priority':'P1'})
  self.assertEqual(plan([same],fm,NOW),[])
  moved=issue(current={'Workstream':'Product','Kind':'Task','Priority':'P2'})
  self.assertEqual([(f,o) for _,f,o in plan([moved],fm,NOW)],[('Priority','P1')])
  missing=issue(item=None,labels=['lane:joint'])
  self.assertEqual([(f,o) for _,f,o in plan([missing],fm,NOW)],[('Workstream','Joint')])
  self.assertEqual(plan([issue(labels=[])],fm,NOW),[])
  self.assertEqual(plan([issue(labels=['lane:product','kind:unknownkind'],current={'Workstream':'Product'})],fm,NOW),[])
