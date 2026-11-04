Implement the supplied director script as the best complete native MotionScript program the current system can produce, then write an evidence-based retrospective proposing improvements.

Deliver exactly one artefact: <id>.zip containing:
- director-script.json — the supplied director JSON, preserved verbatim;
- <id>.ms — the complete native MotionScript program;
- proposals.md — the implementation retrospective, verification results and improvement proposals.

For a prose director script, preserve it verbatim as director-script.md instead. Derive a kebab-case id from the subject unless one is supplied.

This is an independent authoring experiment, not an official repository story or delivery task. Do not create issues, branches, commits, pull requests, story records, registry entries or playground presets. Do not push or publish anything. Do not save the retrospective into the repository. Use scratch space for implementation and verification; include only the three requested files in the ZIP.

## Read and establish current support

Read AGENTS.md and the relevant current MotionScript documentation, released language/schema versions, capability registry and native-story-cycle guidance to understand syntax, semantics and available tools.

For this task, repository guidance informs technical correctness; do not invoke repository personas or execute their issue-management, Git, publication or official story-registration workflows.

Use the current released language and existing compiler, validator, runtime and renderer. Do not change system code, limits, capabilities, contracts or release files to make the program work.

## Interpret the director script

The script may use experimental GVR director contract 0.4. Treat it as semantic authoring intent, not MotionScript syntax or proof that host integration exists.

Implement the complete intended experience:
- Respect experience.form, operation and presentation.
- Preserve exact visible copy, important constraints, subject identity, composition, continuity and material assumptions.
- For surfaces, deliver the usable persistent result and its behaviour, separately from introductory motion. Do not turn a usable page or interface into a film depicting it.
- For explanations, preserve the explanatory progression and useful final result.
- For animations, preserve choreography, pacing, framing and the requested finish, hold or loop.
- Implement sequence triggers, completion behaviour, interruption and reduced-motion paths where specified. Do not assume every sequence begins at program start.
- Beat and progression-boundary times are relative to sequence start; cue and pose times are relative to beat start. Preserve directed simultaneity.
- Do not impose a default duration, fabricate sequences for immediate presentation or force responsive surfaces into a fixed viewport.
- Semantic targets are descriptions to resolve, not runtime IDs.
- For updates, use supplied or available base program/context, preserve unaffected content and user choices, and apply assumptions incrementally. Do not invent an unseen base or silently turn an update into a replacement.
- For conversation/none/immediate, no program mutation is intended. Explain the input mismatch and request an authoring script rather than fabricating a visual task.

Ask only when an essential missing input or material ambiguity prevents faithful implementation. Make reasonable creative decisions for unspecified details and record material assumptions. Do not ask the user to supply implementation geometry or runtime IDs when you can resolve it from available context.

## Author native MotionScript

Write the .ms source directly.

Do not generate MotionScript with TypeScript, JavaScript, templates, transpilers or another host-language builder. Do not hide missing language abstractions behind host-generated nodes, tracks, expressions or keyframes. Use existing native constructs and measured, explicit native workarounds.

Temporary host-language tools may compile, validate, inspect, render, measure and package the directly authored source. They must not generate the program or supply story behaviour that is missing from it.

Aim for a detailed, faithful and polished result. Cover every requirement and beat. When something is awkward, pursue the best existing native implementation: explicit declarations, duplicated tracks, sampled values or carefully designed approximations where necessary. Measure the cost and record it.

Do not silently omit requirements, reduce ambition merely for convenience or stop at the first limit. Rework the native representation within existing limits. If something remains impossible under the current system, implement the closest faithful representation, identify precisely what is missing and avoid claiming equivalence or completion for that requirement.

A sidecar player, external script or modified host must not be used to claim that the standalone .ms program supports a behaviour it cannot express.

## Verify the actual result

1. Compile with compileMotionScript and validate with validateSceneIR. Resolve all errors and review every remaining diagnostic.
2. Evaluate through AnimationRuntime. Check actual evaluated draw items and relevant runtime state, rather than an independent authoring model.
3. Render through the real CanvasRenderer in headless Chromium. Inspect stills at every beat boundary and key moment, including transitions, contacts, overlaps, captions and final states. Review motion intervals or playback where stills cannot establish correctness. Fix visible defects before writing the retrospective.
4. Exercise applicable triggers, interactions, completion, interruption, reduced-motion behaviour, persistent states and seeking or loop boundaries. Verify responsive layouts at representative sizes when relevant.
5. Confirm the extracted .ms file loads and renders through the existing supported preview/playground path without a committed preset or repository modification.
6. Run checks proportionate to this standalone source artefact. Full repository typecheck and test suites are not required unless a specific concern warrants them. Report any failed check, distinguishing source defects from environment or inherited failures when evidence permits.

Use temporary captures and test harnesses for verification, but do not add them to the ZIP. Record the precise times, frames, viewports and behaviour paths inspected in proposals.md. Be explicit about anything unverified. Never claim to have viewed renders or run checks you did not perform.

## Measure the baseline

Record:
- language/schema releases, capability pins and repository commit;
- program lines, bytes and SHA-256;
- nodes, tracks, steps and keyframe values, where applicable;
- compile time and evaluation time per frame, with method, sample count and environment;
- actual authored effort or elapsed implementation time only if tracked;
- relevant limits, measured usage and any workarounds needed to stay within them.

Separate compile, evaluation and rendering measurements. Label estimates, hypotheses and unavailable measurements. Do not infer performance or feature support from successful compilation alone.

## Write proposals.md

Begin with:
“Unevaluated implementation retrospective. These observations and proposals do not establish adopted capabilities or released support.”

Include:

1. Result and fidelity
   - What matches the director’s intent.
   - Requirement/beat coverage with inspected times, frames or interaction states.
   - Approximations, their visible consequences and why they were needed.
   - Anything wrong, unsupported or unverified.
   - Material design assumptions.
   - Baseline measurements, provenance and verification commands/results.

2. Hardest and most error-prone aspects, ranked
   For each, give concrete evidence, cost or risk, root cause and workaround. Distinguish language limitations, compiler/runtime defects, tooling or host gaps, and your own implementation choices. Do not label an inconvenient implementation choice as a language limitation without evidence.

3. Improvements
   Cover both:
   - Easier implementation: changes that would remove duplication, hand calculation, awkward native source, diagnostic problems or verification work.
   - More expressive results: capabilities that would let native MotionScript represent the director’s intent more directly, faithfully or impressively.

   For each improvement, explain what it would remove from this program and what it would enable. Identify existing released support, pending work or recurring evidence from other proposals where checked. Distinguish MotionScript changes from engine, host and tooling changes. Loops, functions and other new execution models require a design decision, not a routine syntax addition.

4. Priority
   What to fix first, what to test as a bounded experiment and what to defer.

Keep claims within the evidence. Label untested alternatives as hypotheses.

## Package and deliver

Create the ZIP with exactly the three requested files at its root. Verify that it opens, the preserved director script matches the supplied input, and the included .ms source matches the program actually tested and hashed.

Return only a download link to the ZIP. If required input prevents meaningful implementation or packaging, explain the blocker instead of claiming a successful deliverable.

## Supplied director script

[PASTE DIRECTOR SCRIPT HERE]

## Optional supporting context

[BASE .ms PROGRAM AND RELEVANT CONVERSATION FOR UPDATES;
SUPPLIED ASSETS; REQUESTED ID; OTHER ESSENTIAL CONSTRAINTS]
