import {describe,it,expect} from 'vitest';
import {parseMotionScript} from './parse';
import {openSession,pushUnit,finishSession,drainDeltas} from './compile';
const header='scene "transactions" {version "0.2"; viewport (1280,720); background #ffffff; duration 2s;};';
const units=(s:string)=>parseMotionScript(header+s+'complete;').units;
const session=()=>openSession(parseMotionScript(header+'complete;').header!);
describe('append-only scene transactions',()=>{
 it("rejects a visibility step before a seal while retaining boundary steps",()=>{
  const s=session();for(const u of units('circle kept {radius 4;}; seal 1s; step kept.visible {at 500ms; value false;}; step kept.visible {at 1s; value false;};'))pushUnit(s,u);
  expect(s.scene.timeline.steps).toHaveLength(1);expect(s.scene.timeline.steps[0]!.timeMs).toBe(1000);
  expect(s.sealedThroughMs).toBe(1000);expect(s.diagnostics[0]).toMatchObject({code:'INVALID_TIMING'});expect(s.diagnostics[0]!.sourceSpan).toBeDefined();
 });
 it('rolls back nested batch definitions, capabilities, counters, constants and seals',()=>{
  const s=session();pushUnit(s,units('circle kept {radius 4; fill #000000;};')[0]!);drainDeltas(s);
  const before=structuredClone(s.scene);const revision=s.revision;
  const items=units('const VALUE = 2; text added {content "x"; fontSize 20; fill #000000;}; animate kept.opacity {from 1; to 0; duration 1s;}; step kept.visible {at 1s; value false;}; seal 1s; circle late {radius 2;};');
  pushUnit(s,{kind:'batch',items,span:items[0]!.span,errors:[]});
  expect(s.scene).toEqual(before);expect(s.constants.size).toBe(0);expect(s.frozen).toBe(false);
  expect([s.trackCount,s.stepCount,s.fontCount,s.sealedThroughMs,s.revision]).toEqual([0,0,0,0,revision]);
  expect(drainDeltas(s)).toEqual([]);
  pushUnit(s,units('circle afterwards {radius 3;};')[0]!);
  expect(s.scene.nodes.map(n=>n.id)).toEqual(['kept','afterwards']);
 });
 it('keeps prior nested geometry unchanged after invalid additions and writers',()=>{
  const s=session();pushUnit(s,units('path ink {move (0,0); line (10,10); stroke #000000 width 2;};')[0]!);
  const node=s.scene.nodes[0]!;if(node.kind!=='path')throw new Error('path');
  Object.freeze(node.commands);Object.freeze(node.transform);Object.freeze(node);
  const before=structuredClone(s.scene);
  for(const u of units('path ink {move (5,5); line (20,20);}; animate ink.opacity {from 1; to 2; duration 1s;};'))pushUnit(s,u);
  expect(s.scene).toEqual(before);expect(s.scene.nodes[0]).toBe(node);
  expect(s.diagnostics.length).toBeGreaterThan(0);
  const result=finishSession(s,true);expect(result.ok).toBe(false);
 });
});
