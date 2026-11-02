# Generative audio contract (E031)

Decision: 2 November 2026. [Issue #119](https://github.com/danielyekini/generative-virtual-runtime/issues/119).
Design only — no MotionScript / Scene IR version bump and no registry claim in
this change. Implementation children are named below. Steering requirement:
[generative-audio-elevenlabs.md](generative-audio-elevenlabs.md). Playback
foundation unchanged: [audible-media-clock.md](audible-media-clock.md) /
`audio.cues` (E008 / E026).

## Requirement

Programs must declare text prompts for narration and sound effects that resolve
into scene-time audio without hard-wiring ElevenLabs (or any vendor) into Scene
IR. Authors and generative directors need a minimal surface in the spirit of
`audio.narration("…")` / `audio.effects("…")`, with optional duration / voice /
loop knobs where the provider supports them. Scene time remains the master
clock; synthesis must never move it. Secrets stay in the host. Offline tests
stay deterministic via fixtures.

## Alternatives

1. **Host-only synthesis** (MotionScript stays on `href` resources; Studio or a
   director side-channel fills buffers before compile). Strongest existing-system
   option for a one-shot demo. Rejected as the engine contract: progressive
   streamed programs cannot declare prompts, model-authored MotionScript cannot
   carry generative intent, and every host re-solves cache identity and failure.
2. **Sugar that lowers only to ordinary `audio.cues` after a pre-compile host
   pass** (no generative fields in IR). Smallest language delta once bytes exist,
   but the IR never records the prompt — same progressive/authorship failure as
   (1), and duration revision has nothing portable to re-resolve. Rejected as the
   sole contract; ordinary `href` resources remain valid for static files.
3. **New capability `audio.generative` with provider-abstracted generative
   resources, cues unchanged, host provider adapter** (chosen). Scene IR carries
   portable generative intent (`modality`, `prompt`, optional voice / duration
   hint / loop / seed / style). Cues stay the E026 `AudioCueDefinition` shape and
   continue to schedule through `AudioSession`. A host `GenerativeAudioProvider`
   synthesises bytes; readiness and a **duration-revision** path close the
   unknown-length gap from E008. ElevenLabs is the first provider behind that
   interface, not a wire type.

## Contract (implementation-bound)

### Language / Scene IR (to be versioned by the language child)

- **Capability.** Programs that declare generative audio require
  `audio.generative` in `requires` / `requiredCapabilities`. Generative resources
  also imply the existing playback rules of `audio.cues` (both capabilities when
  generative resources or their cues are present). Static `href` audio alone
  continues to need only `audio.cues`.
- **Resource discriminant.** Extend the audio resource to a tagged source:
  - `source: { type: "href"; href: string }` — today’s decoded file resource;
    `durationMs` required and positive once ready.
  - `source: { type: "generative"; modality: "speech" | "effect"; prompt: string;
    voice?: string; durationHintMs?: number; loop?: boolean; seed?: number;
    style?: { stability?: number; similarity?: number; speed?: number } }` —
    portable generative intent. No vendor endpoint, model id, or API key fields
    on the wire.
- **Materialisation fields.** A generative resource may carry host-filled
  `href` (cache URI) and `durationMs` once synthesised. Until then `readiness` is
  `pending` (or `failed`). Validators accept generative resources without a final
  `durationMs` while pending; acceptance of required cues still waits on ready
  bytes (see readiness below).
- **Cues.** Unchanged: `{ id, resourceId, bus, startMs, offsetMs?, durationMs?,
  loops?, gain?, fadeInMs?, fadeOutMs?, required? }`. Speech generative resources
  default to bus `narration` (required); effect generative resources default to
  bus `effects` (optional). Explicit cue fields override defaults.
- **MotionScript sketch (not grammar until the language child lands):**

  ```text
  audio hello = speech "This is an example of what I sound like";
  cue n1 = cue narration hello at 0ms;

  audio tracks = effect "Train tracks" { duration 3s; loop; };
  cue e1 = cue effects tracks at 1200ms;
  ```

  Authoring sugar (same child):

  ```text
  audio.narration("This is an example of what I sound like");
  audio.effects("Birds tweeting", duration: 2s);
  ```

  Sugar emits an anonymous generative resource plus a cue at the stated (or
  current authored) start. Exact productions follow the grammar package; this
  sketch is the accepted intent.

### Runtime / `AudioSession`

- **Provider boundary.** Hosts supply a `GenerativeAudioProvider`:

  ```ts
  synthesize(request: {
    resourceId: string;
    modality: "speech" | "effect";
    prompt: string;
    voice?: string;
    durationHintMs?: number;
    loop?: boolean;
    seed?: number;
    style?: { stability?: number; similarity?: number; speed?: number };
  }): Promise<{
    bytes: Uint8Array;       // PCM or container the host decoder accepts
    durationMs: number;      // decoded length; authoritative after success
    mimeType?: string;
    alignment?: {            // optional; speech only
      characters: string[];
      startMs: number[];
      endMs: number[];
    };
    cacheKey: string;        // stable id for host cache / export provenance
  }>
  ```

  The engine never imports a vendor SDK. Packages or Studio modules implement
  the interface. A **fixture provider** maps known prompts to checked-in WAV
  bytes for CI and offline Studio paths.

- **Duration revision (E008 revisit, now required).** `AudioSession` gains
  `reviseResourceDuration(resourceId, durationMs)` (name may vary). Before
  synthesis completes, a generative resource may be defined with a provisional
  length from `durationHintMs` or an engine estimate (speech: heuristic from
  prompt length; effects: provider default band). When synthesis finishes:
  1. Host sets decoded bytes on its backend and reports `ready`.
  2. Session revises `durationMs` to the decoded length.
  3. Cue play-length that omitted an explicit `durationMs` follows the resource.
  4. Scene time, seal horizon and transport position do **not** jump.
  5. Mid-play voices: if the new end is before the current offset, stop that
     voice; if longer, continue. Ducking recomputes from the revised schedule.
  Invalid shrink that breaks an explicit cue `durationMs` / `offsetMs` window
  yields `AUDIO_INVALID_CUE` for that cue and fails required readiness.

- **Readiness / hold / failure.** Existing rules apply. Required pending
  generative audio inside the lookahead window holds the clock; required failed
  blocks acceptance / reports `failed`; optional unready cues skip with
  `AUDIO_OPTIONAL_SKIPPED`. Hosts feed states through `audioStates` /
  `resourcesReady` as today.

- **Streaming.** Generative resources are base definitions (admitted with the
  scene or early deltas). Cues may still stream via `ADD_AUDIO_CUES` at or after
  the seal. Synthesis may start as soon as the resource is known; late cues join
  mid-play once ready.

- **Cache identity.** `cacheKey = hash(modality, prompt, voice, durationHintMs,
  loop, seed, style, providerId, providerModelId)`. Hosts may reuse bytes across
  sessions. Cache lives outside Scene IR; IR may record a resolved `href` after
  materialisation for export packages.

- **Export / determinism.** `mixAudio` remains a pure function of the schedule and
  decoded bytes. Export of generative scenes is allowed only when every required
  generative resource is `ready`. Live provider calls are **not** bit-stable
  across runs (ElevenLabs `seed` is best-effort). Conformance and CI use the
  fixture provider. A recorded export pins the materialised bytes, not a live
  re-synthesis.

### ElevenLabs provider choices (v1)

| Need | Endpoint | Notes |
| --- | --- | --- |
| Narration (v1 default) | `POST /v1/text-to-speech/{voice_id}/with-timestamps` | Full audio + character alignment; decode → `durationMs`; alignment optional for future captions / lip-sync. |
| Effects (v1 default) | `POST /v1/sound-generation` | Body: `text`, optional `duration_seconds` from `durationHintMs`, optional `loop`, `prompt_influence`; **model** `eleven_text_to_sound_v3` (v2 deprecated). |
| Output format | Prefer `wav_24000` or `pcm_24000` | Simplifies Studio decode and fixture parity; hosts may negotiate other formats. |
| Auth | `xi-api-key` header from host secret store | Never in repo, MotionScript, Scene IR, or issue bodies. |
| Deferred | WebSocket `stream-input`; HTTP byte stream without timestamps | Revisit when directors stream partial narration tokens or need lower time-to-first-audio under a still-correct duration-revision path. |

Portable `voice` strings map through a host voice table (Studio setting →
ElevenLabs `voice_id`). Unknown voices fail synthesis with a clear diagnostic;
they must not silently substitute.

### Secrets, network and cost

- No API keys in the repository, programs, Scene IR or committed fixtures.
- CI and `npm test` never call the network for audio; fixture provider only.
- Studio / customer hosts own credential entry, spend limits and user-visible
  failure copy (Product: request [#120](https://github.com/danielyekini/generative-virtual-runtime/issues/120),
  P009). Engine documents the provider interface and failure codes only.
- Cancellation: host aborts in-flight `synthesize` on dispose / replace; session
  `stopAll` / `dispose` semantics unchanged.

## Critical pass

- *Streaming.* Generative resources admitted early; pending required cues hold;
  late cues join after ready; seal rules unchanged.
- *Unknown duration.* Provisional length + `reviseResourceDuration`; scene time
  never follows the provider clock.
- *Failure.* Required speech failure is visible; optional effects degrade with a
  diagnostic; invalid post-revision cue windows fail closed.
- *Compatibility.* Existing `audio.cues` `href` programs unaffected. No registry
  claim until the language child. Provider swap (in-house later) replaces the
  adapter only.
- *Cancellation / ownership.* Host owns network and cache; engine owns schedule
  purity and hold/failure. Dispose releases backend resources including
  generative buffers.
- *Cost / determinism.* Live calls gated to explicit host paths; tests stay on
  fixtures; export pins bytes.

## Child work

1. **E032** ([#124](https://github.com/danielyekini/generative-virtual-runtime/issues/124)) —
   Runtime duration revision + `GenerativeAudioProvider` interface + fixture
   provider + tests. No language / registry claim.
2. **E033** ([#125](https://github.com/danielyekini/generative-virtual-runtime/issues/125)) —
   Version `audio.generative` in MotionScript / Scene IR (grammar sugar,
   validator, capability, registry, conformance). Depends on E032.
3. **E034** ([#126](https://github.com/danielyekini/generative-virtual-runtime/issues/126)) —
   ElevenLabs adapter package implementing the provider interface (narration
   with-timestamps, SFX v3). Depends on E032; Studio credential UX remains
   Product (#120 / P009).

## Map onto `AudioSession` / `audio.cues`

| Layer | Change |
| --- | --- |
| `audio.cues` cues / buses / ducking / export | Unchanged semantics |
| Audio resources | Discriminated generative source; optional provisional duration |
| `AudioSession` | Duration revision; define generative pending resources |
| New capability `audio.generative` | Gates generative source + sugar |
| Host | Provider + cache + secrets; fixture in engine tests |

## Acceptance (this decision)

- [x] Written decision with surface sketch, provider boundary, readiness / hold /
  failure, cache / export rules and ElevenLabs v1 endpoints.
- [x] Explicit map onto `AudioSession` / `audio.cues`.
- [x] Implementation children filed (E032–E034).
- [x] Product notified with concrete host contract on [#120](https://github.com/danielyekini/generative-virtual-runtime/issues/120).
- [x] No registry / version claim in this change.

## Revisit

- Replace ElevenLabs when an in-house generator meets quality, latency and cost.
- Promote WebSocket / streaming TTS if progressive token narration needs
  time-to-first-audio without breaking duration revision.
- Add alignment-driven caption or lip-sync tracks only under a fresh issue.
- Music generation remains out of scope until explicitly commissioned.
