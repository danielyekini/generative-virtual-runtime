# Product charter

Status: adopted user direction, 30 October 2026. Owner: user; workstream
orchestrators may refine delivery within this charter. Record material changes.

## Vision

Build Generative Virtual Runtime (GVR), a virtual runtime environment for live,
on-the-fly generated software with visual, audible and interactive capabilities.
Use speech-first, LLM-powered generation as the primary product interface. The model constructs
useful visual and audible output progressively while the user watches, and
eventually creates persistent, interactive miniature programs. MotionScript and
GVR are the underlying authoring/execution technology. Education is the primary
long-term product: a personalised teacher grounded in curricula and objectives,
using familiar language, visual explanations, practice and understanding checks.
General creative/technical outputs remain useful engine capability tests.

## Product surfaces

1. GVR engine: native MotionScript -> compiler -> Scene IR -> runtime -> renderer,
   with useful streaming, durable objects, interactions, sound and spatial capabilities.
2. Studio: agent toolbox and human testing workbench sharing execution services.
3. Demo/customer platform: prompting/speech, generation, visual/audio presentation,
   follow-up edits and teaching/application workflows. It is currently a later
   surface, not an already implemented capability.

## Principles

- Move rapidly through complete, testable capability/product slices.
- Treat rich native stories as expected workloads; expand practical capacity.
- Investigate deliberate constraints before changing them. Document purpose,
  scope, evidence/trade-offs and revisiting conditions; mark unknown history.
- Progressive usefulness, correctness, editability and runtime cost are separate measures.
- Preserve existing useful functions, but keep legacy format comparison unobtrusive.
- Agents choose bounded designs/experiments and meaningful verification gates.
- Reuse prior evidence; do not rerun old certification by default.
- Keep planning/admin concise, searchable and authoritative; do not duplicate active tickets in repo docs.

## Explicit strategic boundaries

Lottie/SVG compatibility is maintained legacy utility, not the mission or a
prerequisite for native expansion. No return to universal format parity without
an explicit strategic decision. Desktop packaging and a landing page are future
options, not grounds for an immediate engine rewrite. Do not force a model,
backend, 3D/physics library or UX tool without a bounded selection experiment.
Core syntax must not be invented by generation prompts or draft documents.

The user delegates roadmap/task/design choices, issue management and creation
and merging of passing PRs to agents. No mandatory independent review stage.
Repository protections and platform permission boundaries still apply. Deployment,
package publication, new paid services or fundamental changes to this vision
need separate authorisation; ordinary technical decisions do not.
