# @gvr/audio-elevenlabs

ElevenLabs adapter implementing `@gvr/runtime`'s `GenerativeAudioProvider`
(E034). Read `docs/decisions/engine/generative-audio-contract.md` before
changing endpoints or portable fields.

- Never commit API keys. Hosts inject secrets (Studio / env).
- CI tests mock HTTP; `npm test` must not call the network.
- Optional local probe: set `GVR_ELEVENLABS_API_KEY` (and optionally
  `GVR_ELEVENLABS_VOICE_ID`) outside the test suite.
- No language / registry claims live here; those are E033.
