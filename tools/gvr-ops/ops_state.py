#!/usr/bin/env python3
"""Pure clock calculation from append-only GitHub issue comment records."""
import argparse,json,re

TERMINAL={'complete','partial','blocked','failed'}
def record(body):
 m=re.search(r'<!-- gvr-ops-record -->\s*```json\s*(.*?)\s*```',body,re.S)
 return json.loads(m[1]) if m else None
def clock(comments,lane,review_every=5):
 if lane not in ('engine','product'):raise ValueError('Unknown lane')
 events={};reviewed=set()
 for c in comments:
  r=record(c.get('body',''))
  if not r or r.get('lane')!=lane:continue
  if r.get('type')=='run':
   if r.get('outcome') not in TERMINAL:raise ValueError('Invalid terminal outcome')
   run=r.get('run_id')
   if not run:raise ValueError('Missing run_id')
   if run in events and events[run]!=r:raise ValueError('Conflicting duplicate run_id')
   events[run]=r
  elif r.get('type')=='review':reviewed.update(r.get('reviewed_run_ids',[]))
 pending=[r for k,r in events.items() if k not in reviewed]
 return {'lane':lane,'terminal_runs':len(events),'unreviewed_run_ids':[r['run_id'] for r in pending],'unreviewed_count':len(pending),'review_every':review_every,'review_due':len(pending)>=review_every}
def format_record(value):return '<!-- gvr-ops-record -->\n```json\n'+json.dumps(value,sort_keys=True)+'\n```'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--lane',choices=['engine','product'],required=True);ap.add_argument('--review-every',type=int,default=5);a=ap.parse_args()
 import sys
 print(json.dumps(clock(json.load(sys.stdin),a.lane,a.review_every),indent=2))
if __name__=='__main__':main()
