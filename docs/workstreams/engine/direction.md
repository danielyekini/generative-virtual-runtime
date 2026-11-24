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
`projectSpatialFrame`, [Bounded spatial graphics: planar 2.5D layers (E010)](https://app.notion.com/p/4220c600341a81a79008d920d669d8c0)),
E028 versioned `space.planar25d` (Scene IR / MotionScript 0.12.0),
E011 physics integration decision/prototype (planar fixed-step 2D session,
[2D and scoped 3D physics integration (E011)](https://app.notion.com/p/4220c600341a81c3b8cfc7fdb4a92eae)),
E029 versioned `physics.planar2d` (Scene IR / MotionScript 0.13.0),
E016 seam depth/paint-order decision/prototype
([Dynamic depth/paint order and seam-free surfaces (E016)](https://app.notion.com/p/4220c600341a81d5903bcbea796263e8)),
E030 versioned `space.planarSeams` (Scene IR / MotionScript 0.15.0: exact
plane-line intersection splitting and declared seam checks in `projectSpatialFrame`),
and E003 immutable path/keyframe validation-fact reuse are merged
([Assembled delta admission (E001)](https://app.notion.com/p/4220c600341a81619f68c7454f32b489),
[Host streaming/execution observation contract (E018)](https://app.notion.com/p/4220c600341a8133baf7eff1ca01f158),
[Persistent entities, revisions and independent behaviours (E002)](https://app.notion.com/p/4220c600341a810cbaaacd5e3752fc80),
[Drawable reuse, channel bindings and behaviour ownership (E005)](https://app.notion.com/p/4220c600341a811097d6ef7e42bf772a),
[Streaming authorship rules and declarative entity statements (E006)](https://app.notion.com/p/4220c600341a81cb9f27cd2a051890ea),
[Animated solid paint and stroke channels (E009)](https://app.notion.com/p/4220c600341a812b9e79f3712a21f214),
[Immutable path/keyframe validation-fact reuse (E003)](https://app.notion.com/p/4220c600341a81cd97f0cffd20932dc5),
[Native input, hit-testing, focus and bounded state actions (E007)](https://app.notion.com/p/4220c600341a812c9db6c2128f37a0a3),
[Audible media clock, narration and effect resources (E008)](https://app.notion.com/p/4220c600341a81ff81aae352c6385b30),
[2D and scoped 3D physics integration (E011)](https://app.notion.com/p/4220c600341a81c3b8cfc7fdb4a92eae),
[Dynamic depth/paint order and seam-free surfaces (E016)](https://app.notion.com/p/4220c600341a81d5903bcbea796263e8),
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
([generative-audio-contract.md](https://app.notion.com/p/4220c600341a817bad08eccb200d3ade);
steering [generative-audio-elevenlabs.md](https://app.notion.com/p/4220c600341a81ab8f92e4bfd95b0209)).
E033 versions the language surface (MotionScript / Scene IR 0.14.0). E032–E035
implementation is Done. Public package id is `@gvr/audio-provider` (ElevenLabs
remains the default backend); brand stays out of MotionScript and
generation-model vocabulary
([authoring/provider steering](https://app.notion.com/p/4220c600341a81cc94afce04ba6d19f8)).
Studio credentials remain Product (#120 / P009).

## Isolated git worktrees (user steering, 3 November 2026)

Every mutating engine run uses its **own git worktree** bound to the issue
branch before any edits. Do not share a working tree with a concurrent product
or ops agent. Authority: [git.md](../../operations/git.md),
[decision](https://app.notion.com/p/4220c600341a8154a2fbfb510c301c9b).

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
   ([decision](https://app.notion.com/p/4220c600341a817190b3ff256cb5f18a)). Cyclic timing
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
   ([decision](https://app.notion.com/p/4220c600341a8190a71bcd795503f82b)). It covers host
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
   samples ([decision](https://app.notion.com/p/4220c600341a81c99b47ca693b6e0fcd)):
   design Bezier improves, held-out spiral fails error and eval-cost gates →
   **stop** (host `plotUniform` / `plotAdaptive` only; no language bump).
6. E021 ([#40](https://github.com/danielyekini/generative-virtual-runtime/issues/40))
   pinned static `effects.shadow` renderer/runtime conformance and confirmed
   `effects.blur` ([decision](https://app.notion.com/p/4220c600341a81ac9b52f1f06e1e88a1)). No
   version bump; MotionScript shadow sugar, animated blur and reflections stay
   deferred.
7. E022 ([#41](https://github.com/danielyekini/generative-virtual-runtime/issues/41))
   rejected a procedural/module language and declined to commission compile-time
   repeaters ([decision](https://app.notion.com/p/4220c600341a8185b875fe64b6abb474)).
   Drawable bindings, cyclic scopes and behaviours are the M2 expansion path;
   `geometry.repeater` stays pending/unsupported. No version bump.
8. Replenish after E022 (run `00790532-1a03-42a1-9059-3e48527f1b6a`): Ready was
   empty. Promoted E048 ([#208](https://github.com/danielyekini/generative-virtual-runtime/issues/208))
   on the diagnostic-truth trigger. Filed E049 ([#218](https://github.com/danielyekini/generative-virtual-runtime/issues/218))
   Ready — width-profile decide-or-stop. E046 / E042 stay Candidate.
9. E048 ([#208](https://github.com/danielyekini/generative-virtual-runtime/issues/208))
   **rejected** applying instance timing; the field is an inert no-op on non-drawing
   composition records ([decision](https://app.notion.com/p/4220c600341a817aa683d046ae72f836)).
   Child E050 shipped MotionScript 0.26.0 / Scene IR 0.25.0 forbid + migrate strip.
   Next Ready: E049.
10. Engine review (3 November 2026, late evening, session
    `552e4bd0-5e51-4cc3-ab9e-ce4a218586f3`) inspected runs `a130fd66` (E047+E045),
    `6df61122` (E020 stop), `e4e4b92a` (E021), `00790532` (E022) and `d5a6c548`
    (E048). All five complete. **Continue.** That session also shipped E050
    (MotionScript 0.26.0 / Scene IR 0.25.0 forbid instance timing) and E049
    **stop** on variable stroke width profiles
    ([decision](https://app.notion.com/p/4220c600341a81e79b3acadfceb8efba)).
    Outcome-mined Candidates: E051
    ([#224](https://github.com/danielyekini/generative-virtual-runtime/issues/224))
    MotionScript shadow sugar; E052
    ([#225](https://github.com/danielyekini/generative-virtual-runtime/issues/225))
    duplicate parse-time diagnostics; E053
    ([#226](https://github.com/danielyekini/generative-virtual-runtime/issues/226))
    animated blur (story-gated). After E049, Ready replenishes with E052.
    E046 / E042 / E051 / E053 / joint [#209](https://github.com/danielyekini/generative-virtual-runtime/issues/209)
    stay Candidate. No process change.
11. E052 ([#225](https://github.com/danielyekini/generative-virtual-runtime/issues/225))
    emits each parse-time node-property note once (whole file and streamed
    slice, including a nested note beside its parent). No language bump.
    The note remains on the AST node and the parser list; compile keeps one
    object and still rejects the unit. Ready is empty after E052.
    E046 / E042 / E051 / E053 / joint #209 stay Candidate.
12. E055 ([#239](https://github.com/danielyekini/generative-virtual-runtime/issues/239))
    **stop** on multi-line text wrapping
    ([decision](https://app.notion.com/p/4220c600341a81a2a2c8e08238c6ceaa)). `text.basic`
    stays one line. No language bump. The stacked story lines need per-line timing
    and style. Builtin advances differ from drawn `sans-serif` glyphs by −13 % to
    +24 %. Revisit with an explicit line list once same-style paragraphs or a
    bundled font appear. E054 (#238) remains Ready.
13. E054 ([#238](https://github.com/danielyekini/generative-virtual-runtime/issues/238))
    **stop** on standalone `transform.autoOrient`
    ([decision](https://app.notion.com/p/4220c600341a8132a5c3c8dd515ea111)). There is no
    language bump, and the item is removed from the pending lists. Only 2 of 263
    keyed 2-D story movers face their velocity, and one of those is
    generator-sampled. Routes use `attach … { orient true; }`. City faces travel
    with `scale.x` flips. Ready is empty after E054. E046 / E042 / E051 / E053 /
    joint #209 stay Candidate.

GitHub issues and Project own scheduling.
Broader audio, interaction, paint/text/path/camera, spatial and physics work is
tracked in GitHub. Capacity improvements remain ongoing, evidence-driven work.

## Continual story improvement (prospective direction, 2 November 2026)

Alongside milestone delivery, Engine permanently improves capabilities, performance
and native authoring through the [native story cycle](https://app.notion.com/p/41f0c600341a8167bea8f6d81a144341):
Generate Stories → Expand System → Reimplement Stories → Select next corpus.
Current expansion work continues. Future corpus implementations use native
MotionScript directly; improvements include affected-story reimplementation and
versioned library updates. Orchestrators choose bounded work, reimplementation
timing and increasingly ambitious returning stories. Include persistent/multi-turn
scenes as well as timed films. Product supplies prompts and expected responses;
agree director generation ownership before the next corpus.
