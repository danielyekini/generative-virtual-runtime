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
- **Studio testing surfaces:** major functionality (interactions, model/native
  generation, audiovisual host paths, and similar) must be human-exerciseable in
  Studio before the owning lane advances dependent work
  ([studio-ux standing rule](../workstreams/product/studio-ux.md)).
- **MotionScript authoring friendliness (user steering, 3 November 2026):**
  optimise language changes for implementation simplicity and low error rate
  while preserving generation creativity/variability and streaming compatibility.
  Prefer high-level logical authoring; if a human would need a calculator for
  paths, timings or layout that the system can derive, the surface is too low-
  level. Assess each language decision against generation smoothness,
  expressiveness, authoring errors and seamless streaming — without treating any
  single person as the final optimisation authority
  ([decision](../decisions/engine/2026-11-03-authoring-and-provider-abstraction.md)).
- **Vendor-neutral hosts:** authorised external backends (e.g. ElevenLabs audio)
  stay behind provider-abstracted packages and host settings. Public package
  names and MotionScript/generation-facing vocabulary must not hard-wire a
  replaceable vendor brand.

## Explicit strategic boundaries

Lottie/SVG compatibility is maintained legacy utility, not the mission or a
prerequisite for native expansion. No return to universal format parity without
an explicit user request. Current direction commissions no proactive Lottie or
other-format adapter expansion, source-conversion campaign or fidelity backlog.
Historical proposals, unsupported registry rows and old evaluation failures do
not create work. Preserve existing supported utilities and relevant regression
tests; the confirmed Studio Split-mode flow may reuse existing importers without
expanding their coverage. Native capabilities have native requirements and gates.
Desktop packaging and a landing page are future
options, not grounds for an immediate engine rewrite. Do not force a model,
backend, 3D/physics library or UX tool without a bounded selection experiment.
Core syntax must not be invented by generation prompts or draft documents.

**Authorised exception (user steering, 2 November 2026):** ElevenLabs is the
adopted generative audio provider for timed narration and sound effects — GVR's
first meaningful paid external dependency. Engine designs a provider-abstracted
integration ([E031](https://github.com/danielyekini/generative-virtual-runtime/issues/119);
[steering decision](../decisions/engine/generative-audio-elevenlabs.md)). Do not
treat this as a licence to add other paid services or hard-wire vendor APIs into
MotionScript / Scene IR. Public package/import names stay vendor-neutral
([3 November authoring/provider steering](../decisions/engine/2026-11-03-authoring-and-provider-abstraction.md)).
Eventual in-house audio generation remains a distant aspiration, not current work.

The user delegates roadmap/task/design choices, issue management and creation
and merging of passing PRs to agents. No mandatory independent review stage.
Repository protections and platform permission boundaries still apply. Deployment,
package publication, new paid services or fundamental changes to this vision
need separate authorisation (ElevenLabs audio generation is already authorised
above); ordinary technical decisions do not.
