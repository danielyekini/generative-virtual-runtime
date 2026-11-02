# Generative audio via ElevenLabs (user steering)

Status: adopted user steering, 2 November 2026. Owner: Engine.
Work item: [E031 #119](https://github.com/danielyekini/generative-virtual-runtime/issues/119).
Product notify: [X #120](https://github.com/danielyekini/generative-virtual-runtime/issues/120).

## Requirement

The user commits GVR to **ElevenLabs** for AI-generated narration and sound
effects that play on scene time alongside visuals. This is an immediate engine
direction change and the project's **first meaningful paid external dependency**.
Long-term aspiration (not current work): replace the provider with an in-house
generator if the product succeeds. Authoring should feel generative and minimal,
in the spirit of:

```text
audio.narration("This is an example of what I sound like")
audio.effects("Train tracks")
audio.effects("Birds tweeting")
```

with optional duration and related parameters where justified.

## What already exists (unchanged)

E008 / E026 landed scene-time audio as MotionScript / Scene IR **0.11.0**
`audio.cues`: decoded resources (`href` + `durationMs`), narration/effects/music
cues, reconciling `AudioSession`, required-resource hold, ducking and offline
WAV export ([audible-media-clock.md](audible-media-clock.md)). That clock
contract remains authoritative. Generative audio must **resolve into** that
schedule (or a versioned extension of it), not replace scene time with a device
or provider clock.

## Investigation snapshot (steering-time, not final design)

Published ElevenLabs APIs relevant to GVR:

| Need | Endpoint / mode | Notes |
| --- | --- | --- |
| Narration | `POST /v1/text-to-speech/{voice_id}` | Returns audio bytes; models such as multilingual / flash |
| Timed speech | `.../stream/with-timestamps` | Base64 audio chunks + character start/end times |
| Low-latency / streamed text | WebSocket `.../stream-input` | Partial text; optional alignment |
| Sound effects | `POST /v1/sound-generation` | Text prompt → SFX; prefer `eleven_text_to_sound_v3`; optional `duration_seconds` (0.5–30), `loop`, `prompt_influence` |

Important correction to the casual “no audio files” intuition: ElevenLabs still
**emits audio buffers** (mp3/pcm/wav/…). GVR will generate, cache and schedule
those buffers as resources. MotionScript can hide `href`s behind prompts; the
runtime still needs readiness, duration, seek and export bytes.

E008 already flagged the hard problem: narration length is often unknown until
synthesis completes — add a **duration-revision** path; do not let audio move
scene time.

## Decision (steering)

1. **Adopt ElevenLabs** as the generative audio provider for narration and
   effects under user authority (paid-service exception to the charter's
   “no new paid services without authorisation” rule). Other paid backends
   remain unauthorised without a fresh request or bounded experiment.
2. **Commission E031** to investigate APIs end-to-end and choose the language,
   Scene IR, provider-adapter and host contracts. Syntax sketches above are
   intent, not grammar. Do not invent core syntax in prompts or Studio.
3. **Keep provider APIs out of Scene IR.** Programs declare portable generative
   intent (prompt, bus, timing, portable knobs). An adapter (Studio/host or a
   dedicated package) talks to ElevenLabs. That boundary is what later enables
   an in-house replacement.
4. **Preserve deterministic offline tests** with fixtures; live network calls
   are optional probes or explicitly gated Studio paths. Never commit API keys.
5. **Queue priority:** E031 is Ready **P0** for the next engine run. E030
   (`space.planarSeams`) stays Ready but after E031 unless E031 is Blocked.

## Design outcome (E031)

Ranked and decided in
[generative-audio-contract.md](generative-audio-contract.md): capability
`audio.generative` with provider-abstracted generative resources; cues remain
`audio.cues`; host `GenerativeAudioProvider` (ElevenLabs first); duration
revision on `AudioSession`. Host-only and pre-compile-only sugar were rejected
as the sole contract. Implementation: E032
[#124](https://github.com/danielyekini/generative-virtual-runtime/issues/124)
(runtime), E033
[#125](https://github.com/danielyekini/generative-virtual-runtime/issues/125)
(language), E034
[#126](https://github.com/danielyekini/generative-virtual-runtime/issues/126)
(ElevenLabs adapter).

## Out of scope for this steering record

Implementing language/registry claims; Product UX chrome; speech-to-text /
push-to-talk (P009); music generation unless required for the minimal slice;
building an in-house TTS/SFX stack.

## Supersedes / remains

Supersedes informal “audio = static files only” assumptions for M4 teaching
output. Does **not** supersede E008's scene-time master clock, E026's
`audio.cues` semantics, or Product's Studio queue. Updates charter strategic
boundaries only for this authorised provider.

## Revisit

Replace or dual-source the provider when an in-house generator meets quality,
latency and cost gates. Revisit if ElevenLabs terms, latency or missing duration
metadata make scene-sync infeasible — then E031 replans before any release claim.
