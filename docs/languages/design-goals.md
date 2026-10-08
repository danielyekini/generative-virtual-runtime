# MotionScript design goals

Status: living guidance. Revision 1.0, 2026-10-08. Agents may revise this document with evidence and rationale; use docs/authoring/documentation-policy.md.

## Purpose and scope

Enable models to produce impressive, correct animations efficiently, and provide a language that becomes more reusable as its program corpus grows. Streaming is a delivery concern, not the sole design objective. Fidelity imports produce faithful implementations and capability evidence; authoring improves expression and discovers reusable patterns.

Current authoring scope is basic and advanced animation, composition and refinement using released capabilities. Still-scene authoring, persistent conversational editing, context retrieval, event-driven applications, windows and OS capabilities are future directions. Do not require their implementation before animation refinement can proceed. Preserve architectural room for them without claiming they exist.

## Quality constraints

Preserve required visible content, appearance, timing, spatial relationships and deterministic seek behaviour. Correctness takes precedence over compression. Freeze each task's requirements and quality policy before trying candidates. No silent approximation, dropped paint, changed duration or renamed capability may count as optimisation.

## Optimisation objectives

| Objective | Evidence |
| --- | --- |
| Model generation efficiency | Token count using a recorded tokenizer, generation time and successful completion rate |
| Streaming usefulness | First meaningful visual time, valid executable prefixes and interruption recovery, where implemented |
| Concise expression | UTF-8 bytes and tokens, including required dependencies; distinguish source and expanded representation |
| Learnability | Success and repair rate on held-out tasks under pinned model/prompt/settings |
| Composition | Independent patterns combine without hidden state, ownership conflicts or repeated boilerplate |
| Editability | Local changes are understandable and have bounded effects |
| Temporal precision | Boundaries, midpoints, seeks and overlapping tracks have documented deterministic behaviour |
| Runtime cost | Compile time, frame time, memory, expanded nodes/tracks and resource loading |
| Portability | Core meaning does not depend on one importer or renderer |
| Diagnostic quality | Errors map to source constructs and permit targeted repair |

Do not collapse these into an unexamined weighted score. Compare qualified candidates on trade-offs and report regressions. Bytes are not model tokens; package calls are not free if package loading or expansion is expensive.

## Architecture boundaries

MotionScript expresses authored content and behaviour; Scene IR validates representation; runtime evaluates state over time; renderers draw evaluated state; importers translate source formats. Context/edit/host services may later surround this pipeline. Prefer an abstraction at the narrowest responsible layer. An importer inconvenience alone does not justify core syntax.

## Evidence maturity

Label statements hypothesis, observed, replicated or adopted. A result on one imported animation is observed, not a universal language principle. Promote guidance after diverse examples and held-out evaluation. Record limitations and counterexamples.

## Change log

- 1.0: Initial animation-focused goals, with future directions separated from present requirements.
