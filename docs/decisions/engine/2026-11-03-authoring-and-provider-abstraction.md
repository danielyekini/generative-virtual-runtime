# Authoring friendliness and provider-brand abstraction

Decision: 3 November 2026. User steering (direction-change). Owner: Engine;
Product notified for host/Studio naming. Does not bump MotionScript / Scene IR.

## Requirement (user)

1. **Vendor brand out of public package / generation-facing surfaces.** The
   shipped adapter package is currently `@gvr/audio-elevenlabs`. While GVR is
   still testing and may change audio providers, public package names (and
   anything the integrated MotionScript generation model sees) should stay
   **provider-abstracted**. ElevenLabs remains the authorised first backend
   ([generative-audio-elevenlabs.md](generative-audio-elevenlabs.md)); that
   detail must not hard-wire into author-facing or model-facing vocabulary.
2. **MotionScript optimised for implementable authoring.** Language changes must
   weigh implementation simplicity and low error rate alongside expressiveness
   and streaming compatibility. A useful test: could a human realistically build
   the program with syntax and functional knowledge alone — without a calculator
   for paths, timings, or layout arithmetic that the runtime/compiler should
   handle? Prefer high-level logical authoring; push mental computation under
   the hood. The user is **not** claiming to be the final authority on animation-
   language optimisation; agents must still assess each decision against
   generation smoothness, expressiveness, minimal authoring errors, and seamless
   streaming.

## What this supersedes / preserves

- **Supersedes:** treating `@gvr/audio-elevenlabs` as the long-term public
  package id; exposing vendor brand as the primary host import for ordinary
  Studio/generation paths.
- **Preserves:** ElevenLabs as the authorised generative-audio backend; Scene IR
  portable generative fields (no vendor endpoints on the wire); fixture provider
  for CI; Product ownership of credentials (P009 / #120); published language
  versions and historical evaluation evidence.

## Decisions

1. Rename (or wrap) the public npm package to a **vendor-neutral** id (proposed
   `@gvr/audio-provider`). ElevenLabs-specific REST mapping may remain an
   internal module or factory option. **Done:** E035 (#143) shipped
   `@gvr/audio-provider` with `createGenerativeAudioProvider`.
2. When proposing or reviewing MotionScript / Scene IR changes, record how the
   choice reduces author/model error and mental arithmetic, and how it remains
   streaming-safe — not only how it maps a graphics concept.
3. Generation-facing docs and Studio copy describe **generative audio / the
   audio provider**, not a mandatory ElevenLabs brand, except in host
   credential/settings contexts where the user must know which account to fund.

## Related standing product rule

Major capabilities need a Studio testing surface before the lane moves on
(Product direction / [studio-ux.md](../../workstreams/product/studio-ux.md)
standing rule, 3 November 2026). Generative audio host wiring remains that
surface (P009).

## Amendment: orchestrator may revise these criteria (same day)

User steering (later 3 November 2026): orchestrator workflows have authority to
modify **any** of these processes or principles when fit — e.g. if over-
abstraction is suspected to reduce program variability, change the criterion or
design a user-focused test for review. Record supersession; keep vision / paid-
service / immutable-version boundaries. See
[authority.md](../../operations/authority.md) and
[orchestrator.md](../../operations/orchestrator.md).

## Acceptance

- [x] Written decision from user steering.
- [ ] Public package rename/wrap landed (engine task).
- [x] Engine + Product direction updated; Product inbox notified.
- [x] Charter principles note language friendliness and vendor-neutral hosts.
- [x] Orchestrator revision authority over processes/principles made explicit.
