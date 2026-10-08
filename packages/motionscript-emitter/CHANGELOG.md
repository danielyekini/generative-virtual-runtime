# @gvr/motionscript-emitter

## 0.1.1

Preserve exact temporal doubles when writing scene duration, track start/duration,
scope offsets, instance boundaries and step times. Independent relative rounding
could push valid tracks past the scene boundary and cause atomic compiler rejection.
Whole integer seconds retain their canonical `s` spelling. Fractional times use
the shortest round-tripping decimal in milliseconds. MotionScript/Scene IR
remain 0.5.0 with their existing wire families and reader semantics.
