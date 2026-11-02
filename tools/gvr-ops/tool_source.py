"""Fresh read-only observations from connected GitHub tools and the Project UI.

Snapshots live only under ignored work/ops. They are transport inputs, never a
queue or an authentication substitute; agents acquire them again at checkpoints.
"""
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

MAX_AGE_SECONDS = 600


def build(config, rows, issues, comments, requests, observed_at):
    """Join actual exported Project rows with full issue API readbacks."""
    by_number = {int(i.get('number', i.get('issue_number'))): i for i in issues}
    items = []
    seen = set()
    for row in rows:
        url = row['URL']
        prefix = 'https://github.com/' + config['repository'] + '/issues/'
        if not url.startswith(prefix) or not url[len(prefix):].isdigit():
            raise ValueError('Unexpected Project issue URL: ' + url)
        number = int(url[len(prefix):])
        if number in seen:
            raise ValueError('Duplicate Project membership: ' + str(number))
        seen.add(number)
        issue = by_number.get(number)
        if not issue:
            raise ValueError('Full live issue API readback required: ' + str(number))
        if issue.get('url', issue.get('html_url')) != url:
            raise ValueError('Issue identity mismatch')
        fields = {name: row[name] for name in ('Status', 'Workstream', 'Kind', 'Priority', 'Queue order') if row.get(name) != '' and row.get(name) is not None}
        if fields.get('Status', '').casefold() == 'in progress':
            fields['Status'] = 'In progress'
        if 'Queue order' in fields:
            fields['Queue order'] = float(fields['Queue order'])
        key = re.search(r'<!-- gvr-key: ([A-Z0-9]+) -->', issue.get('body') or '')
        items.append({**issue, 'number': number, 'url': url,
                      'state': issue['state'].upper(),
                      'stateReason': (issue.get('state_reason') or '').upper(),
                      'labels': [v['name'] if isinstance(v, dict) else v for v in issue.get('labels') or []],
                      'fields': fields, 'key': key[1] if key else None,
                      'isArchived': False})
    snapshot = {'schema_version': 1, 'observed_at': observed_at,
                'repository': config['repository'], 'repository_id': config['repository_id'],
                'project_url': config['project']['url'],
                'source': 'Live GitHub issue/comment API and signed-in Project export/issue sidebar',
                'items': items, 'requests': [{**r, 'number': int(r.get('number', r.get('issue_number')))} for r in requests],
                'comments': {str(k): [{**v, 'html_url': v.get('html_url', v.get('url'))} for v in values] for k, values in comments.items()}}
    return snapshot


def load(path, config, now=None):
    value = json.loads(Path(path).read_text())
    now = now or datetime.now(timezone.utc)
    observed = datetime.fromisoformat(value['observed_at'].replace('Z', '+00:00'))
    if observed.tzinfo is None:
        raise ValueError('Tool observations require a UTC offset.')
    age = (now - observed).total_seconds()
    if age < 0 or age > MAX_AGE_SECONDS:
        raise ValueError('Tool observations expired; query GitHub and export the Project again.')
    if value.get('schema_version') != 1 or any(value.get(k) != config.get(k) for k in ('repository', 'repository_id')) or value.get('project_url') != config['project']['url']:
        raise ValueError('Tool observation authority mismatch')
    items = value['items']
    numbers = [i['number'] for i in items]
    if len(numbers) != len(set(numbers)):
        raise ValueError('Duplicate Project issue observations')
    actual = {i.get('key'): i for i in items if i.get('key')}
    if len(actual) != sum(bool(i.get('key')) for i in items):
        raise ValueError('Duplicate stable issue keys')
    for key, expected in config['issues'].items():
        item = actual.get(key)
        if not item or item['number'] != expected['number']:
            raise ValueError('Missing or conflicting live membership: ' + key)
        if any(item['fields'].get(f) is None for f in ('Status', 'Workstream', 'Kind', 'Priority', 'Queue order')):
            raise ValueError('Incomplete live routing fields: ' + key)
    for lane in config['clocks'].values():
        if str(lane['issue_number']) not in value['comments']:
            raise ValueError('Live clock readback missing')
    if not isinstance(value.get('requests'), list):
        raise ValueError('Repo-wide request readback required')
    for request in value['requests']:
        if not request.get('updated_at') or not request.get('state') or request.get('labels') is None:
            raise ValueError('Full request API readback required')
    return value


def comments(value, number):
    if str(number) not in value['comments']:
        raise ValueError('Read latest live claim/handover comments for #' + str(number))
    return value['comments'][str(number)]


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--config', default='docs/operations/config.json')
    p.add_argument('--board', required=True)
    p.add_argument('--readbacks', required=True)
    p.add_argument('--extra-memberships')
    p.add_argument('--output', required=True)
    a = p.parse_args()
    config = json.loads(Path(a.config).read_text())
    rows = list(csv.DictReader(Path(a.board).read_text().splitlines(), delimiter='\t'))
    if a.extra_memberships:
        rows += json.loads(Path(a.extra_memberships).read_text())
    readbacks = json.loads(Path(a.readbacks).read_text())
    value = build(config, rows, readbacks['issues'], readbacks['comments'], readbacks['requests'], readbacks['observed_at'])
    output = Path(a.output)
    if output.resolve().parent != (Path('work/ops').resolve()):
        raise ValueError('Transient tool observations must stay directly under ignored work/ops.')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(value, indent=2) + '\n')
    load(output, config)
    print(json.dumps({'fresh_memberships': len(value['items']), 'path': str(output)}))
