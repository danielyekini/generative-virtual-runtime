# Computed curves and adaptive native geometry (E020)

Decision: 3 November 2026.
[Issue #39](https://github.com/danielyekini/generative-virtual-runtime/issues/39).
Experiment + host helpers. **Stop** — no MotionScript / Scene IR bump, no
registry claim, no language parametric plot.

## Requirement

Native authors and generators still bake curved guides as dense polylines or
same-topology morph keys. E020 asked whether a bounded host parametric plot
(adaptive chord-error sampling) beats uniform samples and morph-compatible
polylines on visual error, contact, source size and evaluation cost — including
a held-out curve and a straight cone control that must not grow a new primitive.

Authoring gates (3 November 2026): prefer high-level intent; keep generation and
streaming honest; do not invent an expression language here (that question is
E022).

## Alternatives

1. **Status quo — uniform parameter samples / baked morph keys** (strongest
   current-system option). Authors call `fn` on equal `t` steps and emit `M`/`L`
   (or morph between two fixed-topology polylines). Works today, morph-safe when
   counts match, no language change.
2. **Midpoint chord-error adaptive plot** (measured). Recursively subdivide
   when `fn((ta+tb)/2)` is farther from the chord midpoint than a tolerance.
   Host-only; emits ordinary path commands.
3. **Language-level parametric / plot primitive.** Rejected in this run: needs a
   successful held-out comparison first, and must not smuggle E022's procedural
   language question into a curve sampler.
4. **Cone / ellipse as a new Scene IR kind.** Rejected: the straight cone control
   must stay polyline/`Z`; adaptive must not invent a primitive for linear folds.

## Measurement (pinned by tests)

Harness: `packages/schema/src/parametric-plot.ts` and
`packages/schema/src/parametric-plot.test.ts`.

| Case | Result |
| --- | --- |
| Straight edge | Adaptive keeps two points; chord error ~0. No new command kinds. |
| Dyadic cone | ≤5 polyline points; still `M`/`L`/`Z` only. |
| Design cubic Bezier | Adaptive **beats** equal-vertex uniform on max chord error. |
| Held-out log spiral | Adaptive **loses** equal-vertex uniform on max chord error. |
| Held-out eval cost | Matching the adaptive error with uniform needs **fewer** `fn` calls than adaptive's midpoints + endpoints. |
| Contact | Path-metrics tip at progress 1 matches `fn(1)`. |
| Morph | Same parameter grid on two keys still `lerpPathCommands`. |

Stop rule from the issue: if the plot does not beat the uniform/morph baseline
on the held-out curve, stop. The spiral fails both equal-vertex error and
equal-error evaluation cost. Adopt nothing into the language.

## Chosen outcome

**Stop.** Keep the host helpers (`plotUniform`, `plotAdaptive`,
`maxChordErrorToCurve`) as schema utilities for hosts and future experiments.
Do **not** version a MotionScript / Scene IR plot capability. Do **not** add a
cone/ellipse IR kind for this reason. Generators that need a curve should keep
emitting ordinary paths (uniform samples are the safer default for smooth
spirals; adaptive remains available when a host measures a win).

Same-topology `geometry.pathMorph` remains the animation contract; adaptive
does not replace it. Width profiles and standalone `transform.autoOrient` stay
out of scope (E015 pending notes).

## Authoring assessment

1. **Simplicity.** A host `plotAdaptive(fn, { tolerance })` is easier than hand
   tables when it wins — but it does not win generally, so teaching it as the
   default would mislead.
2. **Generation.** Models already emit paths; a plot AST would need an
   expression form (E022) or a closed set of named curves. Neither is justified
   by this evidence.
3. **Streaming.** Host plots are offline to path commands; sealed tracks are
   unchanged. No streaming issue in the stop.
4. **Expressiveness.** Calculator work can stay in the host helper when a story
   proves a win; do not push a weak adaptive default into the language.

## Critical pass

- Held-out failure is the binding stop — do not promote on design-curve wins
  alone.
- Non-dyadic folds densify under binary subdivision; that is a known limitation
  of this sampler, not a reason to add cone IR.
- Expression languages and compile-time repeaters were deferred to E022; E022
  rejected them ([procedural-vs-bounded-expansion.md](procedural-vs-bounded-expansion.md)).

## Child work

None from this experiment. Revisit only with a different sampler (for example
dense sample + RDP, or arc-length error) and a fresh held-out that beats uniform
on error **and** cost, or with a Product story that cannot tolerate uniform
bakes.

## Revisit

- If a story needs scrolling or computed guides where uniform bakes dominate
  source size, remeasure with that workload.
- If E022 adopts compile-time helpers, a plot may return as a host macro, still
  without Scene IR curve kinds unless held-out evidence changes.
