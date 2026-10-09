"""Independent source-time schedule; neither shifts captures nor modifies corpus."""
from pathlib import Path
import json

run = Path('docs/evaluations') / Path('work/current-run').read_text()
out = []
for p in sorted(Path('fixtures/corpus/lottie').glob('*.json')):
    source = json.loads(p.read_text())
    assets = {a['id']: a for a in source.get('assets', []) if 'id' in a}
    times = set()
    def properties(value, offset, stretch):
        if isinstance(value, dict):
            keys = value.get('k')
            if isinstance(keys, list) and keys and all(isinstance(k, dict) and isinstance(k.get('t'), (float, int)) for k in keys):
                local = [k['t'] for k in keys]
                for t in local + [(a+b)/2 for a,b in zip(local, local[1:])]:
                    times.add(offset + stretch*t)
            for child in value.values():
                properties(child, offset, stretch)
        elif isinstance(value, list):
            for child in value:
                properties(child, offset, stretch)
    def layers(entries, offset=0, stretch=1, ancestors=()):
        for layer in entries:
            properties({k: v for k,v in layer.items() if k != 'layers'}, offset, stretch)
            for t in [layer.get('ip'), layer.get('op')]:
                if isinstance(t, (float, int)): times.add(offset + stretch*t)
            ref = layer.get('refId')
            if layer.get('ty') == 0 and ref in assets and ref not in ancestors:
                layers(assets[ref].get('layers', []), offset + stretch*layer.get('st', 0), stretch*layer.get('sr', 1), ancestors+(ref,))
    layers(source['layers'])
    # Integer frames are already captured by --full; retain fractional original
    # property boundaries/midpoints, including precomp start/stretch mappings.
    times = sorted(t for t in times if source['ip'] <= t < source['op'] and abs(t-round(t)) > 1e-8)
    out.append({'fixture': p.stem, 'sourcePath': str(p), 'sourceFrames': times,
                'samples': [{'id': f'source_boundary_{i:05}', 'label': f'original source key boundary/midpoint {t}',
                             'lottieFrame': t, 'sourceTimeMs': (t-source['ip'])*1000/source['fr'], 'scheduled': False} for i,t in enumerate(times)]})
record = {'scope': 'Original source property key boundaries, segment midpoints and layer visibility boundaries, mapped through precomp st/sr; full integer schedule unchanged',
          'implementationChange': False, 'fixtures': out}
(run/'source-boundary-schedule.json').write_text(json.dumps(record, indent=2)+'\n')
print([(x['fixture'], len(x['samples'])) for x in out])
