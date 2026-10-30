import json
import re
import sys
import unittest
import io
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/gvr-ops'))
from gh_context import fetch_items, normalize, select, claims_and_handover, resolve_repository
from complete_setup import desired
import complete_setup


class InstallationAcceptance(unittest.TestCase):
    def test_repository_lookup_survives_remote_name_changes_by_stable_id(self):
        with patch('gh_context.gh', return_value={'id': 7, 'full_name': 'owner/current-name'}):
            self.assertEqual(resolve_repository({'repository_id': 7, 'repository': 'owner/intended-name'}), 'owner/current-name')
        with patch('gh_context.gh', return_value={'id': 8, 'full_name': 'owner/other'}):
            with self.assertRaises(RuntimeError):
                resolve_repository({'repository_id': 7})

    def test_setup_plan_honors_explicit_project_and_never_creates_parallel_board(self):
        config = {'repository_id': 7, 'repository': 'owner/intended-name',
                  'project': {'number': 3, 'owner': 'owner', 'url': 'https://github.com/users/owner/projects/3'},
                  'issues': {'E001': {'number': 20}}}
        issue = {'number': 20, 'body': '<!-- gvr-key: E001 -->'}
        def api(*args, **kwargs):
            if args[:2] == ('api', 'repositories/7'):
                return {'id': 7, 'full_name': 'owner/current-name'}
            if args[:3] == ('api', '--paginate', '--slurp'):
                return [[issue]]
            if args[:3] == ('project', 'view', 3):
                return {'number': 3, 'id': 'actual-project', 'url': config['project']['url'], 'title': 'Existing project'}
            raise AssertionError('Unexpected mutation or board selection: ' + str(args))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'config.json'
            path.write_text(json.dumps(config))
            output = io.StringIO()
            with patch.object(complete_setup, 'CONFIG', path), patch.object(complete_setup, 'gh', side_effect=api), \
                 patch.object(sys, 'argv', ['complete_setup.py']), redirect_stdout(output):
                complete_setup.main()
            value = json.loads(output.getvalue())
            self.assertFalse(value['network_mutations'])
            self.assertEqual(value['existing_project']['number'], 3)

    def test_paginated_project_response_keeps_actual_fields_and_issue_identity(self):
        item = {'id': 'item', 'content': {'number': 20, 'title': 'Atomic deltas',
                'body': '<!-- gvr-key: E001 -->\n<!-- gvr-dependencies:  -->', 'state': 'OPEN',
                'labels': {'nodes': [{'name': 'audience:worker'}]}},
                'fieldValues': {'nodes': [{'name': name, 'field': {'name': field}}
                    for field, name in [('Status', 'Ready'), ('Workstream', 'Engine'), ('Kind', 'Bug')]]}}
        def api(args, payload):
            after = payload['variables']['after']
            return {'data': {'node': {'items': {'nodes': [item] if after else [],
                    'pageInfo': {'hasNextPage': not bool(after), 'endCursor': 'page2'}}}}}
        with patch('gh_context.gh', side_effect=api) as call:
            rows = fetch_items({'project': {'id': 'actual-configured-project'}})
        self.assertEqual(call.call_count, 2)
        selected = select([normalize(i) for i in rows], 'engine')
        self.assertEqual(selected['number'], 20)
        self.assertEqual(selected['key'], 'E001')

    def test_missing_or_unfinished_dependency_cannot_dispatch(self):
        item = {'key': 'E002', 'number': 21, 'state': 'OPEN', 'labels': [],
                'fields': {'Status': 'Ready', 'Workstream': 'Engine', 'Kind': 'Task'},
                'body': '<!-- gvr-dependencies: E001 -->'}
        self.assertIsNone(select([item], 'engine'))
        item['body'] = 'Legacy unmarked dependencies are unknown'
        self.assertIsNone(select([item], 'engine'))

    def test_conflicting_keys_fail_closed(self):
        with self.assertRaises(ValueError):
            select([{'key': 'E001'}, {'key': 'E001'}], 'engine')

    def test_later_handover_and_active_claim_prevent_unowned_recovery(self):
        records = [{'body': '<!-- gvr-handover --> old'},
                   {'body': '<!-- gvr-claim -->\n```json\n{"agent_id":"other","status":"active","expires_at":"2999-01-01T00:00:00Z"}\n```'},
                   {'body': '<!-- gvr-handover --> latest', 'html_url': 'latest-pointer'}]
        value = claims_and_handover(records, agent_id='this-session')
        self.assertFalse(value['recoverable'])
        self.assertEqual(value['latest_handover']['url'], 'latest-pointer')

    def test_pr_lifecycle_distinguishes_completed_and_rejected(self):
        issue = {'number': 20, 'body': '<!-- gvr-dependencies:  -->', 'labels': [],
                 'state': 'closed', 'state_reason': 'completed'}
        self.assertEqual(desired(issue)['Status'], 'Done')
        issue['state_reason'] = 'not_planned'
        self.assertEqual(desired(issue)['Status'], 'Deferred')

    def test_five_canonical_personas_and_navigation(self):
        paths = list((ROOT / '.agents/skills').glob('gvr-*/SKILL.md'))
        self.assertEqual(len(paths), 5)
        for path in paths:
            text = path.read_text()
            self.assertRegex(text, r'^---\nname: ' + re.escape(path.parent.name) + r'\n')
            self.assertIn('docs/operations/config.json', text)
            self.assertIn('docs/operations/git.md', text)

    def test_real_config_has_unique_issue_and_independent_clock_identities(self):
        config = json.loads((ROOT / 'docs/operations/config.json').read_text())
        numbers = [v['number'] for v in config['issues'].values()]
        self.assertEqual(len(numbers), len(set(numbers)))
        self.assertNotEqual(config['clocks']['engine']['issue_number'], config['clocks']['product']['issue_number'])
        for key in ['E001', 'P001', 'OPS001']:
            self.assertTrue(config['issues'][key]['url'].endswith('/' + str(config['issues'][key]['number'])))
        if not config['installed']:
            self.assertTrue(config.get('setup_blockers'))


if __name__ == '__main__':
    unittest.main()
