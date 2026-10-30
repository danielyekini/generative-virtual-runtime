#!/usr/bin/env python3
"""Finish the one-time Project setup from verified live issues, never from seeds.

Requires authenticated gh (repo + project). No credentials are accepted or printed.
Run from repo root; --apply performs idempotent writes and readback. Installation
remains incomplete until separate live acceptance and PR integration are recorded.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'docs/operations/config.json'
SELECTS = {
    'Status': ['Candidate', 'Ready', 'In progress', 'Blocked', 'Human verification', 'Done', 'Deferred'],
    'Workstream': ['Engine', 'Product', 'Joint'],
    'Kind': ['Milestone', 'Epic', 'Task', 'Bug', 'Experiment', 'Decision', 'Idea', 'Request', 'Review'],
    'Priority': ['P0', 'P1', 'P2', 'P3'],
}


def gh(*args, payload=None):
    result = subprocess.run(['gh', *map(str, args)], input=json.dumps(payload) if payload is not None else None,
                            capture_output=True, text=True, cwd=ROOT)
    if result.returncode:
        raise RuntimeError('GitHub setup command failed: ' + result.stderr[:600])
    value = json.loads(result.stdout) if result.stdout.strip() else None
    if isinstance(value, dict) and value.get('errors'):
        raise RuntimeError('GraphQL setup rejected: ' + str(value['errors'])[:600])
    return value


def graphql(query, variables):
    return gh('api', 'graphql', '--input', '-', payload={'query': query, 'variables': variables})['data']


def read_issues(repo):
    pages = gh('api', '--paginate', '--slurp', f'repos/{repo}/issues?state=all&per_page=100')
    rows = [i for page in pages for i in page if 'pull_request' not in i]
    keys = {}
    for row in rows:
        match = re.search(r'<!-- gvr-key: ([A-Z0-9]+) -->', row.get('body') or '')
        if match:
            if match[1] in keys:
                raise ValueError('Duplicate stable issue key: ' + match[1])
            keys[match[1]] = row
    return keys


def desired(issue):
    labels = [label['name'] for label in issue.get('labels', [])]
    def label(prefix, default):
        return next((v.split(':', 1)[1] for v in labels if v.startswith(prefix + ':')), default)
    if issue['state'] == 'closed':
        status = 'Done' if issue.get('state_reason') == 'completed' else 'Deferred'
    elif 'gvr-key: OPS001 ' in issue.get('body', ''):
        status = 'In progress'
    else:
        status = 'Ready' if 'state:ready' in labels else 'Candidate'
    # Read dependencies from the actual issue, not task lists/native parent links.
    dependency = re.search(r'<!-- gvr-dependencies: ([^>]*) -->', issue.get('body') or '')
    return {'Status': status, 'Workstream': label('lane', 'joint').title(),
            'Kind': label('kind', 'task').title(), 'Priority': label('priority', 'p2').upper(),
            'Queue order': issue['number'],
            'dependencies': [s.strip() for s in dependency[1].split(',') if s.strip()] if dependency else None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text())
    repo = config['repository']; owner = config['project']['owner']
    issues = read_issues(repo)
    for key, mapping in config['issues'].items():
        if key not in issues or issues[key]['number'] != mapping['number']:
            raise ValueError('Issue identity readback mismatch: ' + key)
    projects = gh('project', 'list', '--owner', owner, '--limit', 1000, '--format', 'json')['projects']
    matches = [project for project in projects if project['title'] == 'GVR Delivery']
    if len(matches) > 1:
        raise ValueError('Multiple GVR Delivery projects; reconcile without creating another.')
    if not args.apply:
        print(json.dumps({'mode': 'plan', 'existing_project': matches, 'issue_count': len(issues),
                          'fields': SELECTS, 'network_mutations': False}, indent=2))
        return
    project = matches[0] if matches else gh('project', 'create', '--owner', owner, '--title', 'GVR Delivery', '--format', 'json')
    number = project['number']; project_id = project['id']
    gh('project', 'link', number, '--owner', owner, '--repo', repo)
    def fields():
        return {field['name']: field for field in gh('project', 'field-list', number, '--owner', owner,
                                                    '--limit', 100, '--format', 'json')['fields']}
    current = fields()
    from gh_context import fetch_items
    existing_items = fetch_items({**config, 'project': {**config['project'], 'id': project_id}})
    for name, options in SELECTS.items():
        if name not in current:
            gh('project', 'field-create', number, '--owner', owner, '--name', name, '--data-type', 'SINGLE_SELECT',
               '--single-select-options', ','.join(options), '--format', 'json')
        elif not set(options).issubset({option['name'] for option in current[name].get('options', [])}):
            if existing_items:
                raise RuntimeError('Reused populated Project needs explicit field-option reconciliation for ' + name +
                                   '; preserve existing item values before changing options.')
            # Preserve extra options on a reused board; never delete other work/statuses.
            names = list(dict.fromkeys([option['name'] for option in current[name].get('options', [])] + options))
            graphql('mutation($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{id name options{id name}}}}}',
                    {'input': {'fieldId': current[name]['id'], 'singleSelectOptions': [
                        {'name': option, 'color': 'GRAY', 'description': ''} for option in names]}})
    if 'Queue order' not in current:
        gh('project', 'field-create', number, '--owner', owner, '--name', 'Queue order', '--data-type', 'NUMBER', '--format', 'json')
    current = fields()
    field_map = {name: {'id': current[name]['id'], 'options': {v['name']: v['id'] for v in current[name].get('options', [])}}
                 for name in [*SELECTS, 'Queue order']}
    # Milestones are issues; native hierarchy is additional, explicit task links already exist.
    subissues_verified = True
    for key, issue in issues.items():
        parent = re.search(r'^Goal/parent: ([A-Z][A-Z0-9]*)$', issue.get('body') or '', re.M)
        if parent and parent[1] in issues:
            parent_issue = issues[parent[1]]
            try:
                children = gh('api', '--paginate', '--slurp', f'repos/{repo}/issues/{parent_issue["number"]}/sub_issues?per_page=100')
                if not any(child['id'] == issue['id'] for page in children for child in page):
                    gh('api', '--method', 'POST', f'repos/{repo}/issues/{parent_issue["number"]}/sub_issues', '--input', '-',
                       payload={'issue_id': issue['id']})
                check = gh('api', '--paginate', '--slurp', f'repos/{repo}/issues/{parent_issue["number"]}/sub_issues?per_page=100')
                if not any(child['id'] == issue['id'] for page in check for child in page):
                    raise RuntimeError('Native hierarchy write did not read back')
            except RuntimeError as error:
                subissues_verified = False
                print(json.dumps({'native_subissue_fallback': key, 'reason': str(error)}))
        values = desired(issue)
        deps = values.pop('dependencies')
        if values['Status'] == 'Ready' and (deps is None or any(
                dependency not in issues or issues[dependency]['state'] != 'closed' or
                issues[dependency].get('state_reason') != 'completed' for dependency in deps)):
            values['Status'] = 'Blocked'
        # item-add is idempotent for an existing issue; preserves other project members.
        item = gh('project', 'item-add', number, '--owner', owner, '--url', issue['html_url'], '--format', 'json')
        # Existing membership is authoritative on repeat setup: only initialise empty fields.
        # First installation has no verified field config yet; readback below becomes the receipt.
        from gh_context import fetch_items, normalize
        snapshot_config = {**config, 'project': {**config['project'], 'id': project_id}}
        existing = next((normalize(v) for v in fetch_items(snapshot_config) if (v.get('content') or {}).get('number') == issue['number']), None)
        for name, value in values.items():
            if existing and existing['fields'].get(name) is not None:
                continue
            field = field_map[name]
            common = ['project', 'item-edit', '--id', item['id'], '--project-id', project_id, '--field-id', field['id']]
            gh(*common, *(['--number', value] if name == 'Queue order' else ['--single-select-option-id', field['options'][value]]))
    from gh_context import fetch_items, normalize
    config['project'].update({'number': number, 'id': project_id, 'url': project['url'], 'field_map': field_map})
    observed = [normalize(item) for item in fetch_items(config)]
    by_number = {item['number']: item for item in observed if item}
    for issue in issues.values():
        if issue['number'] not in by_number:
            raise ValueError('Missing remote project item: ' + str(issue['number']))
        actual = by_number[issue['number']]['fields']
        if any(name not in actual for name in SELECTS):
            raise ValueError('Remote fields missing: ' + str(issue['number']))
    # Verify the repository link as an independent read, not a successful command assumption.
    link = graphql('query($id:ID!){node(id:$id){... on ProjectV2{repositories(first:100){nodes{nameWithOwner}} views(first:100){nodes{id name}}}}}', {'id': project_id})['node']
    if repo not in {v['nameWithOwner'] for v in link['repositories']['nodes']}:
        raise ValueError('Project repository link did not read back')
    config['project']['observed_views'] = link['views']['nodes']
    config['features'].update({'projects_read': True, 'projects_write': True, 'native_subissues': subissues_verified})
    config['setup_blockers'] = ['Run live persona routing/acceptance, verify views, then mark installed and integrate passing PR.']
    CONFIG.write_text(json.dumps(config, indent=2) + '\n')
    print(json.dumps({'project_url': project['url'], 'verified_items': len(by_number), 'installed': False}, indent=2))


if __name__ == '__main__':
    main()
