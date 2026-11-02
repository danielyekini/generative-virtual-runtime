# Engine run 2eaa2dda: E026 audio.cues (MotionScript / Scene IR 0.11.0) + Studio Web Audio

Run `2eaa2dda-29ca-44c8-8d26-a90b7c081259`, 2 November 2026. [Issue #103](https://github.com/danielyekini/generative-virtual-runtime/issues/103).
Measured implementation: `4524fa9` (clean tree at verification); base `8cc8611449fe56b94e9aff599260f31cc872b252`.
Preceded by an engine orchestrator review (clock #57) of runs 16f6f1fe, c2662228, 5844c068, 99a8c7a8, a1e45c78: continue; E010 #29 promoted Ready.

## Result

- **Language.** `audio <id> "<href>" <length>;` and `cue <id> <bus> <resource> at <t> [{ offset; duration; loops; gain; fadeIn; fadeOut; required; }];`
  (only `audio` / `cue` newly reserved). Scene IR: `kind: "audio"` resources with decoded `durationMs`, scene `audioCues`, delta op
  `ADD_AUDIO_CUES` (may follow the first seal for cues at/after it; earlier starts rejected by compiler and runtime). Validator rejects audio
  without `audio.cues`, unknown resources/buses, offsets/durations outside the resource, loops/gain/fade/start out of range, duplicates,
  >4096 cues. Version files 0.11.0, registry row `audio.cues`, releases pointer, compatibility note, emitter round-trip.
- **Runtime.** `createSceneAudioSession`, `syncSceneAudioCues`, `sceneAudioSchedule`, `sceneAudioReadiness`, `AudioSession.hasCue`.
  Host readiness is authoritative (scene `ready` never starts undecoded audio). `assessReadiness` takes `audioStates` and blocks on
  pending/failed required audio in the startup window; `acceptScene` blocks pending/failed audio resources only when a required cue uses them.
- **Studio.** `WebAudioBackend` (fetch/decode with readiness reporting, start at offset with gain/rate, measured position for drift while
  the context runs, release, decoded sources for export). Player syncs once per frame with `wallDeltaMs`; seek/step set `seeked`;
  pause/end/library silence; required audio within 250 ms holds a playing clock (status shows "holding for audio" + reason) and resumes
  at the same scene time. `window.__gvr.exportAudio()` returns a deterministic `mixAudio` + `encodeWav` WAV; probe exposes voices, hold,
  diagnostics and a bounded backend log. Scene tab lists cues. Sample "Audio lesson" (Runtime scenes) with deterministic synthetic WAVs
  from `fixtures/audio/generate-samples.ts`. No new visible media control: speech/media surfaces are user-specified UX (studio-ux.md, P009).

## Verification

- `npm run verify`: **exit 0** on the measured commit: 353 Vitest tests / 50 files (5 in `packages/compiler/src/audio.test.ts`,
  5 in `packages/runtime/src/audio-scene.test.ts`), all typechecks, Studio build, IR manifest, 33 ops tests, capability index fresh.
- Built Studio, headless Chromium (`audio-check.cjs`, `vite preview` of the build, `--autoplay-policy=no-user-gesture-required`): **PASS 12 checks** —
  3 resources decoded; context running; narration + music start (music ducked 0.6→0.21 under narration); clicks start on cue (ducked 0.35);
  music loop iterations as separate voices; pause leaves 0 voices; seek to 1500 ms then play re-enters narration at offset 1317 ms
  (scheduled 1300 ms, within one frame); export 4 s stereo 44.1 kHz WAV (176400 frames, narration RMS 0.127, click RMS 0.317),
  identical FNV-1a `6f1c3476` on repeat; 404 narration holds playback at 16.6 ms with "required audio Narration failed to load; playback blocked".
- Audible quality (timbre, perceived sync on real devices/latency) is not judged headlessly: Human verification belongs with P009 (#50).

## Not done / follow-ups

Speech synthesis/recognition and visible media controls (P009); spatial audio, ducking ramps, per-cue rate, timing-scope-relative cues,
audio triggered from `interact` bindings (future candidates). Emitter still drops `interactions` (pre-existing; filed as a Candidate).
