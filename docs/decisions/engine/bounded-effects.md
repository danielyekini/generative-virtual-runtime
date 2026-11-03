# Bounded effects, reflections and materials (E021)

Decision: 3 November 2026.
[Issue #40](https://github.com/danielyekini/generative-virtual-runtime/issues/40).
Experiment + conformance pin. No MotionScript / Scene IR version bump.
No physically-based renderer.

## Requirement

M5 asks for bounded visual effects with clear surfaces — not an open materials
stack. E012 already shipped clip/matte isolation. E021 investigates live blur
and shadow claims, then scopes animated blur, richer gradients, reflections or
distortion only where a concrete story needs them.

## Current conformance

| Capability | Finding |
| --- | --- |
| `effects.blur` (0.2.0) | **Supported.** Static CSS `blur(radius)` on an isolated scope. MotionScript `blur <n>`. Lottie static Gaussian Blur (ty 29) exact for the documented scope. Animated blur is **not** a track channel. |
| `effects.shadow` (0.2.0) | Scene IR and canvas `shadow*` path already existed but registry said untested. **Pinned:** runtime projects `compositing.effect` shadows; renderer sets offset/blur/color. MotionScript has **no** shadow property — compiler stays `unsupported`. No Lottie/SVG import. |

## Alternatives

1. **Status quo — leave shadow untested; chase reflections.** Rejected: the
   audit already asked to conformance-test shadow before inventing more syntax.
2. **Physically-based materials / lighting.** Rejected for this milestone: cost,
   streaming ownership and Studio verification far exceed M5's bounded-effect
   gate.
3. **Animated blur + ellipse gradients + reflections in one release.** Rejected:
   mixes paint, filter and lighting; no story evidence yet for reflections.
4. **Pin static shadow renderer; defer the rest** (chosen). Completes the
   published `effects.shadow` renderer claim with a conformance test. Keep
   MotionScript shadow authoring, animated blur and reflections as follow-ups.

## Chosen scope

- **Adopted now:** registry + test for static isolated-scope shadows
  (`dx` / `dy` / `blur` / `color`). Hosts may author the IR effect directly.
- **Deferred — MotionScript shadow property:** small compiler follow-up when a
  Studio fixture needs authoring sugar; still no version bump (0.2.0 already
  names the capability).
- **Deferred — animated blur radius:** needs a track channel and exclusive
  ownership rules; promote only with a story that cannot key discrete blurs.
- **Deferred — reflections / distortion / emission / PBR:** Candidate until a
  teaching or spatial story proves a bounded fake (for example a mirrored group
  with a matte) is insufficient.
- **Ellipse gradients:** already partly covered by existing gradient paints;
  no new effect row from this experiment.

## Authoring assessment

1. **Simplicity.** Static `blur` is one number. Shadow as IR fields is fine for
   hosts; authors will want sugar later, not a materials graph.
2. **Generation.** Models can emit `blur` today. Teaching them IR-only shadow is
   brittle — prefer a later `shadow` property over free-form filter strings.
3. **Streaming.** Effects stay on isolated scopes; sealed generative tracks are
   untouched. Animated blur would need ownership like paint channels.
4. **Expressiveness.** Canvas filter/shadow covers the cheap teaching cases;
   push calculator-level lighting into deferred work.

## Critical pass

- Shadow without MotionScript is an honest `compiler: unsupported`, not a silent
  authoring claim.
- Do not treat Lottie drop-shadow gaps as a native backlog (charter).
- Reflections that need offscreen mirrors interact with matte/clip cost — design
  separately.

## Child work

- **MotionScript `shadow` sugar** (Task, when Studio needs it): compile into the
  existing IR effect; add `effects.shadow` capability require; Studio fixture.
- **Animated blur** (Candidate): only with story evidence.
- **Bounded reflection fake** (Candidate): mirrored group / matte recipe first.

## Revisit

- If Product asks for soft UI elevation in Studio chrome, ship MS shadow sugar
  before inventing new effect kinds.
- If a spatial story needs contact shadows under 2.5D layers, remeasure whether
  static shadow scopes suffice or a dedicated planar contact helper is warranted.
