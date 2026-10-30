import { expect, it } from 'vitest';
import { trimCommands } from './trim';
const path = [{cmd:'M' as const,x:0,y:0},{cmd:'L' as const,x:10,y:0},{cmd:'M' as const,x:20,y:0},{cmd:'L' as const,x:30,y:0}];
it("preserves pen-up breaks and excludes jumps from trim length", () => {
 expect(trimCommands(path,0,1,0)).toEqual(path);
 expect(trimCommands(path,.25,.75,0)).toEqual([{cmd:'M',x:5,y:0},{cmd:'L',x:10,y:0},{cmd:'M',x:20,y:0},{cmd:'L',x:25,y:0}]);
});
it("handles boundaries, offsets and closed contours without connecting moves", () => {
 expect(trimCommands(path,0,.5,0)).toEqual(path.slice(0,2));
 expect(trimCommands(path,.5,1,0)).toEqual(path.slice(2));
 expect(trimCommands(path,.5,.5,0)).toEqual([]);
 expect(trimCommands(path,.75,.25,0)).toEqual([]);
 expect(trimCommands(path,0,.5,1.5)).toEqual(path.slice(2));
 expect(trimCommands(path,0,.5,-.5)).toEqual(path.slice(2));
 // Existing native rule: shifted start wraps, then end clips at one.
 expect(trimCommands(path,0,.5,.75)).toEqual([{cmd:'M',x:25,y:0},{cmd:'L',x:30,y:0}]);
 const closed=[...path.slice(0,2),{cmd:'Z' as const},...path.slice(2)];
 expect(trimCommands(closed,0,1,0)).toEqual(closed);
 expect(trimCommands(closed,0,2/3,0)).toEqual(closed.slice(0,3));
 expect(trimCommands(closed,0,.5,0)).toEqual([{cmd:'M',x:0,y:0},{cmd:'L',x:10,y:0},{cmd:'L',x:5,y:0}]);
 expect(trimCommands([{cmd:'M',x:0,y:0}],0,0,0)).toEqual([]);
});
