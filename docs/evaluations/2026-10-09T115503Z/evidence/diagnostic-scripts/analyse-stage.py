from pathlib import Path
import json, sys, hashlib

run = Path('docs/evaluations') / Path('work/current-run').read_text()
stage = sys.argv[1]
base = run/'evidence'/stage
data = json.loads((base/'render-results.json').read_text())
pipeline = json.loads((base/'results.json').read_text())['fixtures']
round_trip = {x['id']: x for x in json.loads((base/'round-trip-results.json').read_text())['fixtures']}
jobs = {x['id']:x for x in json.loads((base/'render-jobs.json').read_text())['jobs']}
out = []
for fixture in pipeline:
    if not fixture['id'].startswith('LOT'): continue
    routes = []
    for record in data['fixtures']:
        if not record['id'].startswith(fixture['id']+'-'):continue
        frames = record['frames']; gates=[x['visualGate'] for x in frames if 'visualGate' in x]
        job = jobs[record['id']]
        routes.append({'route':record['sceneKind'],'job':record['id'],'referenceStatus':record['referenceStatus'],
                       'nativeStatus':record['nativeStatus'],'referenceRepeatIdentical':record.get('referenceRepeatIdentical'),
                       'prepared':record.get('prepared'),'logs':record.get('logs'),
                       'capturedScheduledNative':sum(bool(x.get('native')) and bool(x.get('scheduled')) for x in frames),
                       'capturedScheduledReference':sum(bool(x.get('reference')) and bool(x.get('scheduled')) for x in frames),
                       'expectedScheduled':sum(bool(x.get('scheduled')) for x in job['samples']),
                       'capturedExtraNative':sum(bool(x.get('native')) and not x.get('scheduled') for x in frames),
                       'expectedExtra':sum(not x.get('scheduled') for x in job['samples']),
                       'worstHotFraction':max((g['fractionBeyond'] for g in gates if g.get('fractionBeyond') is not None),default=None),
                       'worstLocalFraction':max((g['maxLocalFractionBeyond'] for g in gates if g.get('maxLocalFractionBeyond') is not None),default=None),
                       'failedComparisons':sum(not g['passed'] for g in gates),
                       'visualWindow':record['visualWindow']})
    identities = []
    for name in ['generated.motion','imported-scene.json','compiled-scene.json']:
        path=base/'fixtures'/fixture['id']/name
        if path.exists():identities.append({'path':str(path.relative_to(run)),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'revision':None,'parent':None})
    source=base/'sources'/(fixture['id']+'.json')
    if source.exists():identities.append({'path':str(source.relative_to(run)),'bytes':source.stat().st_size,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    out.append({'fixture':fixture['id'],'productionAccepted':fixture['production']['ok'],
                'conversionStatus':fixture['production']['fidelity'],'lossCounts':fixture['production']['counts'],
                'roundTrip':round_trip.get(fixture['id']),'routes':routes,'identities':identities})
(run/(stage+'-outcomes.json')).write_text(json.dumps({'stage':stage,'controls':data['controls'],'fixtures':out},indent=2)+'\n')
for f in out:
    print(f['fixture'],f['conversionStatus'],f['roundTrip']['status'],
          [(r['route'],r['capturedScheduledNative'],r['expectedScheduled'],r['worstHotFraction'],r['worstLocalFraction'],r['failedComparisons']) for r in f['routes']])

# Earlier material review is transferable only through exactly associated bytes,
# with this run's independently verified reference controls and fixed environment.
old=json.loads(Path('docs/evaluations/2026-10-08T140610Z/evidence/material-review/prior-reviewed-frame-associations.json').read_text())
associations=[]
for group in old:
    rows=[]
    for row in group['records']:
        path=base/Path(row['path']).relative_to('evaluation/evidence')
        actual=hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
        rows.append({'path':str(path.relative_to(run)),'sha256':actual,'priorPath':row['priorPath'],'priorSha256':row['sha256'],'matchesPriorReviewedBytes':actual==row['sha256']})
    associations.append({'fixture':group['fixture'],'kind':group['kind'],'expected':len(rows),'matches':sum(x['matchesPriorReviewedBytes'] for x in rows),'records':rows})
(run/(stage+'-prior-reviewed-associations.json')).write_text(json.dumps({'reviewAuthority':'docs/evaluations/2026-10-08T140610Z/report.md; immutable frame associations under its evidence/material-review/',
 'limitations':'Applies only to matched image bytes and originally reviewed samples; added source-boundary samples require new review.', 'associations':associations},indent=2)+'\n')
