import { expect, it } from 'vitest';
import { DEFAULT_LIMITS, Telemetry } from '@gvr/schema';
import { compileMotionScript } from './compile';
import { createIncrementalProgram } from './incremental';
const source='scene "measure" { version "0.1"; viewport (100,100); background #000000; duration 1s; }; circle mark { radius 10; fill #ff0000; }; complete;';
it("preserves accepted scenes and diagnostics with compile observation enabled", () => {
 const telemetry=new Telemetry();
 expect(compileMotionScript(source,telemetry)).toEqual(compileMotionScript(source));
 const rejected=source.replace('radius 10','radius -1');
 expect(compileMotionScript(rejected,telemetry)).toEqual(compileMotionScript(rejected));
 expect(telemetry.snapshot().counters['compile.rejected_units']).toBeGreaterThan(0);
 expect(telemetry.snapshot().distributions['compile.snapshot_ms']?.count).toBeGreaterThan(0);
});
it("bounds source acceptance, counts split UTF8 correctly and releases cancelled state", () => {
 const telemetry=new Telemetry(); const stream=createIncrementalProgram(telemetry);
 const unicode=source.replace('measure','😀');
 for(const char of unicode.split(''))stream.push(char);
 expect(stream.finish().ok).toBe(true);
 expect(telemetry.snapshot().counters['compile.source_bytes']).toBe(new TextEncoder().encode(unicode).byteLength);
 stream.dispose();expect(stream.scene).toBeUndefined();
 const large=' '.repeat(DEFAULT_LIMITS.maxSourceBytes+1);
 expect(compileMotionScript(large).diagnostics[0]?.code).toBe('RESOURCE_LIMIT');
 const oversized=createIncrementalProgram();oversized.push(large);
 expect(oversized.finish().diagnostics.some(d=>d.code==='RESOURCE_LIMIT')).toBe(true);
});
it("rejects a large invalid single fragment without an argument-stack overflow", () => {
 const stream=createIncrementalProgram();
 expect(()=>stream.push(';'.repeat(150000))).not.toThrow();
 expect(stream.finish().ok).toBe(false);
 stream.dispose();
});
