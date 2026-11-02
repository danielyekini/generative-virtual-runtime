# Engine direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every old run or product inbox.
Resolve live work-item URLs and own clock from config.json / GitHub.

## Starting point

E001 assembled-delta admission, E018 host streaming observation, E002
persistent-entity decision/prototype, E004 durable revision ops (Scene IR /
MotionScript 0.6.0 `entities.durableRevisions`), E005 drawable-reuse
decision/prototype, E023 versioned `entities.drawableBindings` (Scene IR /
MotionScript 0.7.0), E006 streaming authorship/stream linter, E009 animated
solid paint channels (Scene IR / MotionScript 0.8.0 `paint.animatedSolid`),
E024 declarative entity statements (MotionScript / Scene IR 0.9.0),
E007 native input decision/prototype (painted-geometry hit-testing,
`InputSession` routing, bounded `input`-owned actions, replay), E025
`input.bindings` (`interact` declarations, MotionScript / Scene IR 0.10.0,
Studio player wiring), E008 audible media clock decision/prototype
(scene-time master, pure audio schedule, reconciling `AudioSession`,
required-resource hold, deterministic `mixAudio` export), E026 `audio.cues`
(`audio` / `cue` declarations, MotionScript / Scene IR 0.11.0, `ADD_AUDIO_CUES`,
Studio Web Audio backend and bridge WAV export),
E010 bounded spatial graphics decision/prototype (planar 2.5D layers,
`projectSpatialFrame`, `docs/decisions/engine/spatial-graphics.md`),
E028 versioned `space.planar25d` (Scene IR / MotionScript 0.12.0),
E011 physics integration decision/prototype (planar fixed-step 2D session,
`docs/decisions/engine/physics-integration.md`),
E029 versioned `physics.planar2d` (Scene IR / MotionScript 0.13.0),
E016 seam depth/paint-order decision/prototype
(`docs/decisions/engine/seam-depth-order.md`),
E030 versioned `space.planarSeams` (Scene IR / MotionScript 0.15.0: exact
plane-line intersection splitting and declared seam checks in `projectSpatialFrame`),
and E003 immutable path/keyframe validation-fact reuse are merged
(`docs/decisions/engine/assembled-delta-validation.md`,
`docs/decisions/engine/streaming-observation-contract.md`,
`docs/decisions/engine/persistent-entities.md`,
`docs/decisions/engine/drawable-reuse-bindings.md`,
`docs/decisions/engine/streaming-authorship-and-declarative-entities.md`,
`docs/decisions/engine/animated-paint-channels.md`,
`docs/decisions/engine/immutable-validation-facts.md`,
`docs/decisions/engine/native-input.md`,
`docs/decisions/engine/audible-media-clock.md`,
`docs/decisions/engine/physics-integration.md`,
`docs/decisions/engine/seam-depth-order.md`,
`observeStreamingExecution` / `EntityRevisionStore` / `APPLY_ENTITY_PATCH` /
`REGISTER_GEOMETRY` / `BIND_GEOMETRY` / `projectScene` projection /
`PhysicsSession` / `createScenePhysicsSession` / `resolveSeams` in
`@gvr/runtime`, `emitEntityPatchDelta` in `@gvr/compiler`).
Capacity-transactions evidence and PR #11 remain valid starting points; do not
repeat their proofs without an affected failure. Product may adapt P002/P005 to
the published observation snapshot; engine does not own Studio inspector UI.

## Generative audio (user steering + E031 design, 2 November 2026)

Adopt **ElevenLabs** for generative narration and sound effects timed with
visuals — first meaningful paid external dependency. Scene-time `audio.cues`
(E008/E026) stays the playback foundation. E031 chose capability
`audio.generative`: portable generative resources, unchanged cues, host
`GenerativeAudioProvider`, duration revision, fixture tests, ElevenLabs
with-timestamps TTS + SFX v3 behind the adapter
([generative-audio-contract.md](../../decisions/engine/generative-audio-contract.md);
steering [generative-audio-elevenlabs.md](../../decisions/engine/generative-audio-elevenlabs.md)).
E033 versions the language surface (MotionScript / Scene IR 0.14.0).

## Next work

Engine review (2 November 2026, runs E029, E031, E032, E033/E034, E030): continue.

1. E012 ([#31](https://github.com/danielyekini/generative-virtual-runtime/issues/31)):
   clip-first scoped compositing (clips, then justified mattes). Native; design
   pass before syntax; a language claim takes the next minor (≥ 0.16.0). Ready.
2. E017 ([#36](https://github.com/danielyekini/generative-virtual-runtime/issues/36)):
   verify and fix native diagnostic and latent-correctness leads against 0.15.0. Ready.
3. E027 ([#105](https://github.com/danielyekini/generative-virtual-runtime/issues/105)):
   emitter drops `interact` declarations (no language change). Ready.
4. Replenish further from M2/M4/M5 Candidates as these complete. Audible human
   judgement of E026/E033 output and visible media controls sit with P009.

E032–E034 generative audio slice is Done (runtime provider, language 0.14.0,
ElevenLabs adapter). Studio credentials remain Product (#120 / P009).

No Lottie-wide certification gate; legacy regressions checked when relevant.
Pending language candidates are not a
queue; old Lottie gaps do not add adapter lowering or source-fidelity acceptance.
Proactive legacy-format work requires a fresh explicit user request.
Broader audio, interaction, paint/text/path/camera, spatial and physics work is
tracked in GitHub. Capacity improvements remain ongoing, evidence-driven work.

## Continual story improvement (prospective direction, 2 November 2026)

Alongside milestone delivery, Engine permanently improves capabilities, performance
and native authoring through the [native story cycle](../../workflows/native-story-cycle.md):
Generate Stories → Expand System → Reimplement Stories → Select next corpus.
Current expansion work continues. Future corpus implementations use native
MotionScript directly; improvements include affected-story reimplementation and
versioned library updates. Orchestrators choose bounded work, reimplementation
timing and increasingly ambitious returning stories. Include persistent/multi-turn
scenes as well as timed films. Product supplies prompts and expected responses;
agree director generation ownership before the next corpus.
