# Human rendering assessment — blueprint experiments

Assessor: user. Recorded: 4 November 2026. Source: user feedback in this conversation. This is a faithful structured transcription, with wording normalized; not a new agent rendering review or architectural certification. No invented scores, frame times, screenshots or device details. Exact evaluated artifact hashes should be confirmed against the user's downloaded copies; existing archive manifests identify packaged versions.

## house-concept-blueprint

Positive: introduction animation is cool; the base drawing and slow wall-protrusion reveal work well.

Failure: dimensional perspective appears nearly vertical, like a multi-storey apartment building; the plan seems tipped onto its side. Intended reading: a flat structural blueprint on a ground plane, with the building's walls emerging upward from the same floor plan. “From Blueprint to Home” is the preferred visual reference.

Intent interpretation: users will ask “make it 3D” or “make the walls come up”, not specify 2.5D projection. The system must infer a coherent spatial representation. Do not treat a spatial-looking image as sufficient if scale, elevation or projection makes the house unreadable.

## three-bedroom-concept

Positive: great floor plan, furniture, windows and length/dimension detailing. Header/subheader are acceptable. Assessment is exclusively visual; assessor is not claiming architectural expertise.

Failure: much of the remaining written text is unnecessary and clutters the scene. Preserve useful dimensions and response content; prefer spoken explanation to redundant on-stage prose. Labels remain appropriate when needed for explanation or identification. The preference is minimal clutter, not a universal ban on text.

## raised-walls-cutaway

Positive: captured intent and visual direction are closer. Introduction is present; structure can be dragged; controls are minimal and peripheral. Includes zoom, reset, wall hiding and blueprint/dimensional view switching. “From Blueprint to Home” remains preferred for background, blueprint and building colours.

Failure: rendered quality is very poor—floating shapes do not read as a coherent building; structure and controls are difficult to interpret. Drag moves shapes vertically in space rather than rotating the building. The user values this experiment's direction despite rejecting its visual execution. Intent capture and execution quality must be assessed independently.

## Cross-program feedback

Black bars appear at both sides. GVR is fullscreen audiovisualisation software: the entire available presentation stage must have an intentional background at all times. Blank themed space is welcome; unintended black bars are not. Do not enlarge, distort or clutter the central artefact merely to occupy pixels. Background filling must avoid an error-prone generative interpolation pipeline that changes programs. Research appropriate host/renderer responsibility before choosing an implementation.

Prefer audio-first explanations when appropriate, with selective meaningful labels, dimensions, notation and accessible alternatives. The user states GVR supports audible narration; this record does not independently verify current sound integration or synchronization.

## Proposed reusable preference

A minimalist focus-stage preset: one complex artefact in the centre; generous themed negative space; minimal peripheral controls; little on-screen prose. Background may be matte eggshell like “From Blueprint to Home”, or neutral with subtle light/shadow depth like “A Crane, Then a Square”. Preserve material/style coherence rather than prescribing one fixed palette.

Applicable examples: structural concepts, origami instruction, focused visual demonstrations, and a conversational AI-head/dot-sphere visualization. An audio-reactive pulse must follow real speech timing if claimed; a decorative loop is not verified audio reactivity.

Counterexample: a requested website prototype should look and behave like the intended website, not be forced into a single-object stage. The preset is inferred where suitable and overridden by explicit user requirements.

Human rendered-quality assessments are to be the principal signal for tuning perceived rendering and interaction quality. Compilation and automated checks remain necessary but cannot certify human satisfaction.
