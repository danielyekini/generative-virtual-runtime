# Audible media clock, narration and effect resources (E008)

Decision: 2 November 2026. [Issue #27](https://github.com/danielyekini/generative-virtual-runtime/issues/27).
Decision + narrow runtime demonstrator. No MotionScript / Scene IR version bump
and no registry claim: `@gvr/runtime` `AudioSession` / `voicesAt` / `mixAudio`
are a host-level prototype (`packages/runtime/src/audio.ts`, tests in
`audio.test.ts`). Language wiring and the Studio Web Audio backend are the
follow-up implementation item named below.

## Requirement

M4 teaching output speaks and makes sound: narration explains while visuals
build, effects punctuate actions and learner interactions, a music bed may sit
under both. This needs actual playback, not cue metadata: resources that load
or fail, a clock relationship between audio and frames, correct behaviour under
pause, seek, reverse, loop, waiting for streamed content, cancellation and
disposal, and a deterministic export path. Product P009 ([#50](https://github.com/danielyekini/generative-virtual-runtime/issues/50))
integrates push-to-talk and host playback on top of this contract.

## Alternatives

1. **Audio-master clock** (common in video players: frames follow the audio
   device position). Gives tight lip-sync but makes frame selection depend on a
   device, which breaks deterministic `evaluate(t)`, headless tests, replay,
   streaming waits (the device cannot "wait for content") and silent scenes.
   Rejected as the contract.
2. **Host-owned cue metadata** (scene emits "play X at t"; hosts improvise).
   Cheap, but every host re-solves seek, loop, ducking and failure, and export
   cannot match live playback. Rejected.
3. **Scene-time master + pure audio schedule + reconciling session**
   (chosen). Scene time from `PlaybackClock` stays authoritative. Which voice is
   audible at t, its resource offset and its gain are a pure function of the
   schedule and t (`voicesAt`). `AudioSession.sync` diffs that desired set
   against running backend voices and issues start/stop/gain/rate commands,
   re-seeking any voice whose expected or measured position drifts beyond
   tolerance. Export mixes the same function sample by sample.
4. **Sample-accurate engine mixer feeding the device** (engine renders PCM in
   real time). Deterministic, but requires an audio worklet / native thread
   per host, decoded-buffer ownership and latency management in the engine.
   Kept as a possible backend behind the same command interface.

## Contract (implementation-bound)

- **Master clock.** Frames depend only on scene time. Audio follows scene time;
  the engine never reads device time to choose a frame. Sync error is bounded by
  `toleranceMs` (default 40 ms): beyond it a running voice is stopped and
  restarted at the scheduled offset (`resync` for scene-time discontinuities,
  `drift` when the backend's measured `position` disagrees).
- **Resources.** Declared with a decoded `durationMs` and a readiness state
  `pending | ready | failed` reported by the host loader. Unready resources are
  never started.
- **Cues.** `{ id, resourceId, bus, startMs, offsetMs?, durationMs?, loops?,
  gain?, fadeInMs?, fadeOutMs?, required? }`. Buses: `narration`, `effects`,
  `music`. Span = play length × loops; each loop iteration is a separate voice
  key (`cue#i`), so loop wraps are clean stop/start pairs. Linear fades at cue
  start/end. Invalid, duplicate, unknown-resource or over-limit cues are rejected
  individually with `AUDIO_*` diagnostics; the cue count is bounded (`maxCues`,
  default 4096).
- **Required vs optional.** Narration is required by default; effects and music
  are optional by default (`required` overrides). A required resource that is
  pending inside the lookahead window holds a playing clock (`holdClock` pauses
  it and resumes it at the same scene time once ready; a user pause is never
  undone). A required resource that failed is reported as `failed` readiness:
  the host shows a fallback (caption/transcript) or stops; it is never silently
  skipped. Optional unready cues are skipped with `AUDIO_OPTIONAL_SKIPPED`.
  Hosts feed startup readiness into `PresentationController` via `resourcesReady`.
- **Mix.** Gain = cue gain × bus gain × fade × duck. While any narration cue is
  audible, effects and music are multiplied by `duckGain` (default 0.35). Ducking
  is a step, not a ramp, in this prototype.
- **Transport.** Audible only in `playing` state with a rate in
  `[minRate, maxRate]` (default 0.5–2; pitch follows rate unless the host
  preserves pitch). `paused`, `stopped`, `waiting_for_content`, `complete`,
  reverse (rate ≤ 0) and out-of-range rates are silent (`AUDIO_RATE_SILENT`
  reported once per rate). Resuming restarts voices at the scheduled offset
  (`resume`). Discontinuities: backward scene motion, host `seeked: true`, or —
  when the host passes `wallDeltaMs` — scene progress that differs from
  wall time × rate (forward seek, scene loop wrap).
- **Streaming.** Cues are appended with sealed units (`addCues`); a cue whose
  start lies before the current time joins mid-play at the correct offset on the
  next sync.
- **Interaction sounds.** `trigger(cue, atMs)` adds a one-shot at the event's
  scene time. It joins the schedule (so seek/export reproduce it) and is logged
  in `triggerLog` for replay alongside the E007 input log.
- **Cancel / dispose.** `stopAll()` silences every voice (interruption, cancel)
  and keeps the session. `dispose()` stops voices, releases every resource
  through the backend and makes later use throw.
- **Export.** `mixAudio(schedule, decodedSources, { startMs, endMs, sampleRate,
  channels })` renders the schedule offline with linear resampling and the same
  gain/offset/ducking functions as live playback; `encodeWav` writes 16-bit PCM.
  Output is a pure function of the schedule (including triggers) and the bytes.

## Critical pass

- *Streaming.* Waiting for content is silent and resumes at the scheduled offset;
  late cues join correctly. Audio never forces the presentation clock past the
  sealed horizon.
- *Determinism.* Live commands depend only on sync inputs and backend-reported
  positions; the schedule, readiness and export are pure. Tests check live voice
  gains/offsets against export samples at the same times.
- *Failure.* Pending/failed required narration blocks visibly; failed optional
  effects degrade silently but report a diagnostic. Unknown resources and invalid
  cues fail per cue.
- *Compatibility.* No wire, language or registry change. Scenes without audio
  are unaffected.
- *Covered by tests.* Loop offsets, fades, ducking, required hold and resume,
  user pause not undone, failed required/optional, pause/seek/resume/loop/end
  command streams, forward/backward seek detection, rate changes, reverse and
  out-of-range silence, measured drift, streaming wait and late cues, triggered
  one-shots, validation and cue limit, cancel/dispose/release, export equality
  and WAV header.
- *Not covered.* Real device latency and Web Audio scheduling (host backend,
  follow-up), speech synthesis/recognition (P009), spatial/positional audio,
  ducking ramps, sample-accurate engine mixing, and per-cue rate.

## Child work

- **E026** ([#103](https://github.com/danielyekini/generative-virtual-runtime/issues/103)): version audio resources and cues in
  MotionScript / Scene IR (resource kind `audio`, cue declarations, capability
  token, registry rows, conformance tests), expose a Web Audio `AudioBackend`
  for Studio's player, and verify narration + effects with Product P009.

## Implementation (E026)

Landed as MotionScript / Scene IR **0.11.0** `audio.cues`: `audio` resources
(href + decoded `durationMs`), `cue` declarations lowered to scene `audioCues`
and streamed with `ADD_AUDIO_CUES` (allowed after the first seal for cues at or
after it). `createSceneAudioSession` / `syncSceneAudioCues` / `sceneAudioSchedule`
lower scenes into this contract; `assessReadiness` (`audioStates`) and
`acceptScene` block only on required audio. The Studio player drives a Web Audio
backend (`app/playground/src/player/web-audio.ts`) from its clock with
`wallDeltaMs`, holds for required audio within 250 ms, and exposes WAV export on
the agent bridge (`exportAudio`). Visible media controls remain a Product/UX
decision (P009, studio-ux.md).

## Revisit

If stories need sub-frame lip-sync tighter than the tolerance, evaluate the
engine-mixer backend (alternative 4) behind the same commands. If narration
length is unknown until synthesis completes, add a duration-revision path to
the schedule rather than letting audio move scene time. If spatial audio lands
(E010), positional gain joins the pure gain function.

**Generative synthesis (user steering, 2 November 2026):** ElevenLabs is the
adopted provider for prompt-driven narration and effects
([generative-audio-elevenlabs.md](generative-audio-elevenlabs.md)). Design and
language wiring live in [E031 #119](https://github.com/danielyekini/generative-virtual-runtime/issues/119);
this clock decision is not superseded.
