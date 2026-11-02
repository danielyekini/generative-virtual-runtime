import copy
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/gvr-ops'))
from tool_source import build, load


class ToolSourceTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.now(timezone.utc)
        self.config = {'installed': True, 'repository': 'owner/repo', 'repository_id': 1,
                       'project': {'url': 'https://github.com/users/owner/projects/3', 'id': 'p'},
                       'issues': {'E001': {'number': 20}, 'P001': {'number': 42}},
                       'clocks': {'engine': {'issue_number': 57, 'review_every': 5}, 'product': {'issue_number': 58, 'review_every': 5}},
                       'paths': {'charter': 'charter', 'engine_direction': 'engine', 'product_direction': 'product'}}
        self.issues = [{'issue_number': n, 'url': f'https://github.com/owner/repo/issues/{n}',
                        'body': f'<!-- gvr-key: {key} -->\n<!-- gvr-dependencies:  -->',
                        'title': key, 'state': 'open', 'state_reason': None,
                        'labels': [{'name': 'audience:worker'}]}
                       for key, n in [('E001', 20), ('P001', 42)]]
        self.rows = [{'URL': i['url'], 'Status': 'Ready', 'Workstream': lane,
                      'Kind': 'Task', 'Priority': 'P1', 'Queue order': str(i['issue_number'])}
                     for i, lane in zip(self.issues, ['Engine', 'Product'])]
        self.comments = {57: [], 58: [], 20: [{'body': '<!-- gvr-handover --> actual pointer', 'url': 'https://github.com/owner/repo/issues/20#issuecomment-1'}], 42: []}
        self.value = build(self.config, self.rows, self.issues, self.comments, [], self.now.isoformat())

    def read(self, value):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'snapshot.json'
            p.write_text(json.dumps(value))
            return load(p, self.config, self.now)

    def test_stale_future_and_wrong_authority_fail_closed(self):
        for delta in (-601, 1):
            value = copy.deepcopy(self.value)
            value['observed_at'] = (self.now + timedelta(seconds=delta)).isoformat()
            with self.assertRaises(ValueError):
                self.read(value)
        value = copy.deepcopy(self.value)
        value['project_url'] += '0'
        with self.assertRaises(ValueError):
            self.read(value)

    def test_incomplete_membership_or_clock_and_duplicates_fail_closed(self):
        for change in ('member', 'clock', 'duplicate', 'identity'):
            value = copy.deepcopy(self.value)
            if change == 'member': value['items'].pop()
            if change == 'clock': value['comments'].pop('57')
            if change == 'duplicate': value['items'].append(value['items'][0])
            if change == 'identity': value['items'][0]['number'] = 21
            with self.assertRaises(ValueError):
                self.read(value)

    def test_join_requires_live_issue_identity_and_keeps_handover_url(self):
        self.assertEqual(self.read(self.value)['comments']['20'][0]['html_url'], self.comments[20][0]['url'])
        with self.assertRaises(ValueError):
            build(self.config, self.rows, self.issues[1:], self.comments, [], self.now.isoformat())

    def test_full_cli_dispatch_and_session_intake_use_same_rules_without_credentials(self):
        request = {'number': 99, 'state': 'open', 'labels': ['audience:orchestrator', 'request-to:engine', 'priority:p0'],
                   'body': '<!-- gvr-request -->\n```json\n{"blocks_active":true}\n```\nRAW_ORCHESTRATOR_MAIL', 'updated_at': '2026-11-02T00:00:00Z'}
        self.value['requests'] = [request]
        with tempfile.TemporaryDirectory() as d:
            config, snapshot, receipt = [Path(d) / v for v in ('config.json', 'snapshot.json', 'receipt.json')]
            config.write_text(json.dumps(self.config)); snapshot.write_text(json.dumps(self.value))
            base = [sys.executable, str(ROOT / 'tools/gvr-ops/gh_context.py'), '--config', str(config), '--tool-snapshot', str(snapshot), '--receipt', str(receipt), '--session-id', 'session-one']
            def run(*args):
                return subprocess.run(base + list(args), capture_output=True, text=True)
            route = run('--lane', 'engine', '--mode', 'route')
            self.assertTrue(json.loads(route.stdout)['intake_required'])
            self.assertNotIn('RAW_ORCHESTRATOR_MAIL', route.stdout)
            self.assertNotEqual(run('--lane', 'engine', '--mode', 'context').returncode, 0)
            self.assertEqual(run('--lane', 'engine', '--mode', 'intake-receipt', '--persona', 'engine-orchestrator').returncode, 0)
            context = run('--lane', 'engine', '--mode', 'context')
            self.assertEqual(context.returncode, 0, context.stderr)
            self.assertEqual(json.loads(context.stdout)['selected_issue']['key'], 'E001')
            self.assertNotIn('RAW_ORCHESTRATOR_MAIL', context.stdout)
            self.assertTrue(json.loads(context.stdout)['selected_issue_context']['latest_handover']['url'])
            request['updated_at'] = '2026-11-02T00:00:01Z'; snapshot.write_text(json.dumps(self.value))
            self.assertTrue(json.loads(run('--lane', 'engine', '--mode', 'route').stdout)['intake_required'])
            context = run('--lane', 'product', '--mode', 'context')
            self.assertEqual(json.loads(context.stdout)['selected_issue']['key'], 'P001')
            self.assertNotIn('RAW_ORCHESTRATOR_MAIL', context.stdout)


if __name__ == '__main__':
    unittest.main()
