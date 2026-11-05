import json,math,pathlib
p=pathlib.Path('docs/evaluations/2026-10-08T123430Z/source-state-diagnostic-retry');x=json.loads((p/'records.json').read_text());out=[]
def transform(coords,m):
 if len(m)==9:m=[m[0],m[1],m[3],m[4],m[6],m[7]]
 return [z for i in range(0,len(coords),2) for z in (m[0]*coords[i]+m[2]*coords[i+1]+m[4],m[1]*coords[i]+m[3]*coords[i+1]+m[5])]
for s in x['samples']:
 row={'layer':s['layer'],'sourceFrame':s['index'],'routes':{}}
 for route,states in s['states'].items():
  if not states or not s['reference']:row['routes'][route]={'status':'NOT_RUN'};continue
  ref=s['reference'][0]; native=states[0];deltas=[]
  for a,b in zip(ref['commands'],native['geometry']['commands']):
   if b['cmd']=='M':coords=[b['x'],b['y']]
   elif b['cmd']=='C':coords=[b['c1x'],b['c1y'],b['c2x'],b['c2y'],b['x'],b['y']]
   else:continue
   av=transform(a['args'],ref['matrix']);bv=transform(coords,native['logicalMatrix']);deltas.extend(abs(u-v) for u,v in zip(av,bv))
  row['routes'][route]={'maxCoordinateDelta':max(deltas),'coordinateCount':len(deltas),'status':'PASS' if max(deltas)<=.001 else 'FAIL'}
 out.append(row)
(p/'measurements.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
