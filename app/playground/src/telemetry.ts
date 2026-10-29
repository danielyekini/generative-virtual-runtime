import { Telemetry, FrameTelemetry } from '@gvr/schema';
/** Page-lifetime, bounded diagnostics. Enable with ?telemetry=1 before the hash. */
export const telemetry = new URLSearchParams(location.search).get('telemetry') === '1' ? new Telemetry(256) : undefined;
export const frameTelemetry = telemetry ? new FrameTelemetry(telemetry) : undefined;
if (telemetry) Object.assign(window, {__gvrTelemetry: () => telemetry.snapshot()});
