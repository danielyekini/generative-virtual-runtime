# @gvr/motionscript-emitter

## 0.1.8

Emit `attach … along …` declarations from Scene IR `pathAttachments`
(`geometry.pathProgress`, MotionScript / Scene IR 0.17.0) so path attachments
round-trip with their `path.progress` tracks.

## 0.1.6

Emit `interact` declarations from Scene IR `interactions` so Scene IR → MotionScript
round-trips preserve `input.bindings` (focusable, tabIndex, pointer, and every
binding/action). No language change.

## 0.1.1

Preserve exact temporal doubles when writing scene duration, track start/duration,
scope offsets, instance boundaries and step times. Independent relative rounding
could push valid tracks past the scene boundary and cause atomic compiler rejection.
Whole integer seconds retain their canonical `s` spelling. Fractional times use
the shortest round-tripping decimal in milliseconds. MotionScript/Scene IR
remain 0.5.0 with their existing wire families and reader semantics.
