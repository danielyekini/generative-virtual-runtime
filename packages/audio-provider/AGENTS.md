# @gvr/audio-provider

Vendor-neutral host package for generative audio (`GenerativeAudioProvider` from
`@gvr/runtime`). Read [Generative audio contract (E031)](https://app.notion.com/p/4220c600341a817bad08eccb200d3ade) and
[Authoring friendliness and provider-brand abstraction](https://app.notion.com/p/4220c600341a81cc94afce04ba6d19f8) before
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
