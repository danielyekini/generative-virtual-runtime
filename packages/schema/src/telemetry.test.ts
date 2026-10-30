import { expect, it } from 'vitest';
import { Telemetry, FrameTelemetry } from './telemetry';
it("bounds observation retention and keeps lifetime totals", () => {
 const metrics=new Telemetry(3);
 for(let i=0;i<100;i++){metrics.observe('work_ms',i);metrics.event('rejected',{i});metrics.gauge('queue',i%5);}
 const result=metrics.snapshot();
 expect(result.distributions.work_ms).toEqual({count:100,retained:3,mean:49.5,max:99,p50:98,p95:99,p99:99});
 expect(result.events).toHaveLength(3);
 expect(result.gauges.queue).toEqual({value:4,highWater:4});
});
it("records intervals separately from application work even when work throws", () => {
 let time=0;const metrics=new Telemetry(8,()=>time);
 const frames=new FrameTelemetry(metrics);
 frames.frame(0,()=>{time+=2;});
 expect(()=>frames.frame(60,()=>{time+=3;throw new Error('test');})).toThrow('test');
 expect(metrics.snapshot().distributions['frame.application_ms']?.mean).toBe(2.5);
 expect(metrics.snapshot().distributions['frame.interval_ms']?.mean).toBe(60);
 expect(metrics.snapshot().counters['frame.long_intervals']).toBe(1);
});
it("retains the first failure across cascades and explicitly resets an observation window", () => {
 const metrics=new Telemetry(2);metrics.event('delta_rejected',{unitId:1});
 for(let i=0;i<10;i++)metrics.event('delta_stale',{unitId:i+2});
 expect(metrics.snapshot().firstFailure).toEqual({kind:'delta_rejected',detail:{unitId:1}});
 metrics.reset();expect(metrics.snapshot().firstFailure).toBeUndefined();expect(metrics.snapshot().events).toEqual([]);
});
