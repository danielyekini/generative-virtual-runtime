# Engine run 8312D8DC-7EC6-441D-8BB4-FD73ECBA9F32: E033 audio.generative (MotionScript / Scene IR 0.14.0)

- **Issue:** [#125](https://github.com/danielyekini/generative-virtual-runtime/issues/125) (E033)
- **Language:** MotionScript / Scene IR **0.14.0**, capability `audio.generative`, wire `"0.2"`
- **Packages:** `@gvr/schema` 0.1.12, `@gvr/compiler` 0.1.11, `@gvr/runtime` 0.1.16, `@gvr/motionscript-emitter` 0.1.4
- **Surface:** generative `source` on audio resources; `audio <id> = speech|effect "…"`; sugar `audio.narration` / `audio.effects`; cues unchanged; fixture-provider materialisation from compiled IR
- **Gate:** `npm run verify` passed (441 tests, typecheck, Studio build, ops acceptance, reference freshness)

Next: E034 ElevenLabs adapter (#126); E030 seam language after generative-audio P0.
