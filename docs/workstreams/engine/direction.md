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

## Generative audio (user steering + E031 design, 2–3 November 2026)

Adopt **ElevenLabs** as the first authorised generative-audio **backend** for
narration and sound effects timed with visuals — first meaningful paid external
dependency. Scene-time `audio.cues` (E008/E026) stays the playback foundation.
E031 chose capability `audio.generative`: portable generative resources,
unchanged cues, host `GenerativeAudioProvider`, duration revision, fixture
tests, ElevenLabs with-timestamps TTS + SFX v3 behind the adapter
([generative-audio-contract.md](../../decisions/engine/generative-audio-contract.md);
steering [generative-audio-elevenlabs.md](../../decisions/engine/generative-audio-elevenlabs.md)).
E033 versions the language surface (MotionScript / Scene IR 0.14.0). E032–E035
implementation is Done. Public package id is `@gvr/audio-provider` (ElevenLabs
remains the default backend); brand stays out of MotionScript and
generation-model vocabulary
([authoring/provider steering](../../decisions/engine/2026-11-03-authoring-and-provider-abstraction.md)).
Studio credentials remain Product (#120 / P009).

## Isolated git worktrees (user steering, 3 November 2026)

Every mutating engine run uses its **own git worktree** bound to the issue
branch before any edits. Do not share a working tree with a concurrent product
or ops agent. Authority: [git.md](../../operations/git.md),
[decision](../../decisions/2026-11-03-isolated-worktrees.md).

## Language change gate (user steering, 3 November 2026)

For every MotionScript / Scene IR proposal, assess (and briefly record in the
design or version note):

1. **Authoring simplicity / low error rate** — can a human build it with syntax
   and functional knowledge alone, without calculator-level path/timing/layout
   arithmetic the system should derive?
2. **Generation friendliness** — creativity and variability without brittle
   micro-syntax the model must invent.
3. **Streaming compatibility** — progressive authorship, seals, and late deltas
   remain honest.
4. **Expressiveness vs under-the-hood computation** — prefer high-level logical
   intent; push mental computation into compiler/runtime.

No single person is the optimisation authority; agents still choose bounded
designs with evidence. Core syntax is never invented only in generation prompts.
**The engine orchestrator may revise or suspend any of these gates** (or design
a user-focused test) when evidence suggests they harm variability, streaming, or
delivery — record the change; do not treat them as frozen
([orchestrator process authority](../../operations/orchestrator.md)).

## Generation / corpus ambition bar (Product #140, 3 November 2026)

Story-complexity native programs (City, Blueprint/Home, Crane, Pixels,
Copperleaf, Last Streetlight, Small Ideas, …) are the implementability and
friction bar for engine corpus work — not Ball/Bunny/Diagram smoke. Director
distillation remains Product’s quality gate (P019). No forced immediate
reimplementation from this acknowledgement alone.

## Next work

Engine review (3 November 2026, later the same day) inspected runs
`cf452237` (E013), `3E1BDFB0` (E040, 0.18.0 `text.dynamicContent`),
`0c5c5285` (E036, 0.19.0 `compositing.matte`), `7464705c` (E041, 0.20.0
`text.layoutMetrics`) and `7d32a0ce` (E038, 0.21.0 `paint.strokeDash`).
Those five are Done. E039 then landed `geometry.pathSpace` (0.22.0). Width profiles
and standalone `transform.autoOrient` stay pending. Naming source stories on
new engine tickets waits on Product P030 (#188). Holder:
[E042](https://github.com/danielyekini/generative-virtual-runtime/issues/191)
([#189](https://github.com/danielyekini/generative-virtual-runtime/issues/189)).

1. E014 ([#33](https://github.com/danielyekini/generative-virtual-runtime/issues/33))
   decided local/named time and cycles
   ([decision](../../decisions/engine/time-composition.md)). Cyclic timing
   scopes separate an unbounded loop with a phase from a finite `repeat`.
   Timed keys and named beats replace percentage arithmetic. The gap/hold
   rule is now pinned, rotation stays unwrapped degrees, cyclic chains own
   their channels exclusively, and every writer for a cycle arrives before
   its first seal. Next Ready work:
   E043 ([#196](https://github.com/danielyekini/generative-virtual-runtime/issues/196),
   `timing.cyclicScopes`) and E044
   ([#197](https://github.com/danielyekini/generative-virtual-runtime/issues/197),
   `timing.timedKeys` + beats). They are independent, so either can go first.
   E044 landed `timing.timedKeys` as MotionScript 0.23.0 (MotionScript only;
   Scene IR stays 0.22.0). E043 landed `timing.cyclicScopes` as MotionScript
   0.24.0 / Scene IR 0.23.0 (`period` / `repeat`, scoped steps, exclusive
   cyclic ownership, cycle seal rule; Studio test frame "Cyclic scopes").
   Both E014 children are Done.
2. E039 ([#173](https://github.com/danielyekini/generative-virtual-runtime/issues/173))
   landed MotionScript / Scene IR 0.22.0 `geometry.pathSpace`: `attach` follows
   the path node's transform. Scenes that require only `geometry.pathProgress`
   stay path-local. Replenish further from M2/M4/M5 Candidates. Audible human
   judgement of E026/E033 output and visible media controls sit with P009.
   `text.animators` stays pending (not the E013 content/format slice).
3. E019 ([#38](https://github.com/danielyekini/generative-virtual-runtime/issues/38))
   decided the image resource lifecycle
   ([decision](../../decisions/engine/resource-lifecycle.md)). It covers host
   loader states, a required-image startup hold, a scene-scoped renderer cache
   with eviction and a decoded-bytes gauge, and a `pixelated` sampling recipe.
   `resources.image` (0.2.0) is now supported for that scope. Next: E045
   ([#204](https://github.com/danielyekini/generative-virtual-runtime/issues/204))
   versions per-node sampling and atlas sprite frames, with the Studio
   readiness surface. Image pattern paint waits on evidence as Candidate E046
   ([#205](https://github.com/danielyekini/generative-virtual-runtime/issues/205)).

4. Engine review (3 November 2026, evening) inspected runs `F61104F0` (E039),
   `00f04d24` (E014), `5dc11099` (E044), `b2ff7b2a` (E043) and `8812fbed`
   (E019). All five are Done. Ready order: E047
   ([#207](https://github.com/danielyekini/generative-virtual-runtime/issues/207)),
   a stream-linter diagnostic-truth bug in which every `INVALID_TIMING` was labelled
   `SEALED_HISTORY_WRITE`; then E045 (#204). Both landed the same evening: E047
   (PR #210), and E045 as MotionScript 0.25.0 / Scene IR 0.24.0
   `resources.imageSampling` + `resources.spriteFrames`, with Studio image
   readiness and a "Sprite frames" test frame. Image pattern paint stays
   Candidate E046. New Candidates: E048
   ([#208](https://github.com/danielyekini/generative-virtual-runtime/issues/208)),
   because composition-instance `timingScopeId` is inert; and joint ops
   [#209](https://github.com/danielyekini/generative-virtual-runtime/issues/209),
   because routing and branch cleanup fail in cloud sessions.

5. Replenish (3 November 2026, evening, session
   `6df61122-7db7-4332-be0d-286a31fb2864`): promoted executable M2/M5 Candidates
   whose dependencies are completed — E020 (#39), E021 (#40), E022 (#41) — to
   Ready. E020 measured midpoint chord-error adaptive plots against uniform
   samples ([decision](../../decisions/engine/computed-curves-adaptive-geometry.md)):
   design Bezier improves, held-out spiral fails error and eval-cost gates →
   **stop** (host `plotUniform` / `plotAdaptive` only; no language bump).
6. E021 ([#40](https://github.com/danielyekini/generative-virtual-runtime/issues/40))
   pinned static `effects.shadow` renderer/runtime conformance and confirmed
   `effects.blur` ([decision](../../decisions/engine/bounded-effects.md)). No
   version bump; MotionScript shadow sugar, animated blur and reflections stay
   deferred.
7. E022 ([#41](https://github.com/danielyekini/generative-virtual-runtime/issues/41))
   rejected a procedural/module language and declined to commission compile-time
   repeaters ([decision](../../decisions/engine/procedural-vs-bounded-expansion.md)).
   Drawable bindings, cyclic scopes and behaviours are the M2 expansion path;
   `geometry.repeater` stays pending/unsupported. No version bump.
8. Replenish after E022 (run `00790532-1a03-42a1-9059-3e48527f1b6a`): Ready was
   empty. Promoted E048 ([#208](https://github.com/danielyekini/generative-virtual-runtime/issues/208))
   on the diagnostic-truth trigger. Filed E049 ([#218](https://github.com/danielyekini/generative-virtual-runtime/issues/218))
   Ready — width-profile decide-or-stop. E046 / E042 stay Candidate.
9. E048 ([#208](https://github.com/danielyekini/generative-virtual-runtime/issues/208))
   **rejected** applying instance timing; the field is an inert no-op on non-drawing
   composition records ([decision](../../decisions/engine/composition-instance-timing.md)).
   Child E050 versions the forbid/migrate-strip. Ready order: E050, then E049.

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
