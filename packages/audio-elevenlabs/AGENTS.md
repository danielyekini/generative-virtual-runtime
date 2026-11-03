# @gvr/audio-elevenlabs (rename pending)

ElevenLabs **backend** implementing `@gvr/runtime`'s `GenerativeAudioProvider`
(E034). Read `docs/decisions/engine/generative-audio-contract.md` before
changing endpoints or portable fields.

**Steering (3 November 2026):** the public package id must become
**vendor-neutral** (proposed `@gvr/audio-provider`). Do not treat this folder
name as the long-term import for Studio or generation models — see
`docs/decisions/engine/2026-11-03-authoring-and-provider-abstraction.md` and
engine issue E035.

- Never commit API keys. Hosts inject secrets (Studio / env).
- CI tests mock HTTP; `npm test` must not call the network.
- Optional local probe: set `GVR_ELEVENLABS_API_KEY` (and optionally
  `GVR_ELEVENLABS_VOICE_ID`) outside the test suite.
- No language / registry claims live here; those are E033.
