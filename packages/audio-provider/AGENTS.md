# @gvr/audio-provider

Vendor-neutral host package for generative audio (`GenerativeAudioProvider` from
`@gvr/runtime`). Read `docs/decisions/engine/generative-audio-contract.md` and
`docs/decisions/engine/2026-11-03-authoring-and-provider-abstraction.md` before
changing backends or portable fields.

- **Public entry:** `createGenerativeAudioProvider` (default backend ElevenLabs).
- **Backend option:** `createElevenLabsGenerativeAudioProvider` keeps the
  authorised ElevenLabs REST mapping available without making the package id a
  vendor brand.
- Never commit API keys. Hosts inject secrets (Studio / env).
- CI tests mock HTTP; `npm test` must not call the network.
- Optional local probe: set `GVR_ELEVENLABS_API_KEY` (and optionally
  `GVR_ELEVENLABS_VOICE_ID`) outside the test suite.
- No language / registry claims live here.
