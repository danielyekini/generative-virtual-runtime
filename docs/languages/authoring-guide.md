# Idiomatic MotionScript authoring guide

Status: living guide, revision 1.1, 2026-10-30. This initial guide contains evaluation techniques, not certified syntax examples. The installed examples below refer to existing compiling repository fixtures and conformance cases; they are not refinement or visual certifications.

## How to use this guide

Read the released language contract first. A recipe describes how supported features compose; it never grants support absent from the registry. Mark draft/proposed abstractions separately. Do not invent loop, function, package, instance or variable syntax to make an example concise.

## Initial techniques to investigate

- Use existing hierarchy to express shared transforms rather than independently repeating equivalent motion. Verify anchor, opacity and compositing effects.
- Remove demonstrably redundant declarations or keyframes only after checking interpolation, holds, boundaries and seek behaviour. Matching endpoints does not prove equivalent motion.
- Keep paint order and coordinate spaces explicit. Do not combine objects if group compositing changes their appearance.
- Distinguish exporter repetition from useful semantic structure. Repeated geometry may need multiple paint passes; deduplicating it must preserve all paints.
- Choose clear stable naming and local structure for edits; source minification alone is not idiomatic authoring.
- Compare source simplicity against expanded scene size. A short form that multiplies work may be a poor runtime choice.

## Required recipe format

Each recipe records id, status, applicable released capabilities, problem, original/refined files, exact compiling syntax, verified behaviour, measured gains, runtime costs, counterexamples, corpus coverage and evidence links. Status: hypothesis, observed, replicated or adopted. Include an example where the technique should not be used.

## Procedural and semantic reference

Maintain a verified table for supported construction order, declaration/reference resolution, bindings and scope, temporal scopes, property ownership, transform hierarchy and resource resolution. For unsupported procedural features explicitly write not implemented; describe future proposals in their own documents. Every table entry links to contract/conformance evidence.

## Change log

- 1.1: Add measured current-contract progressive authoring recipe and evidence.
- 1.0: Initial guide structure. No unverified language constructs asserted.

## Current construction and compiling examples

| Current contract | Example and evidence | Limit of the claim |
| --- | --- | --- |
| Scene header, constants, primitives and nested groups | [Normative grammar](../../packages/schema/src/grammar.ts); [nested.ms](../../fixtures/motionscript/nested.ms); [compiler tests](../../packages/compiler/src/compiler.test.ts), case “lowers a header, a constant, every primitive, and a nested group” | Compiling syntax, not a verified authoring optimisation |
| Hierarchy, keyframes and expression motion | [bunny.ms](../../fixtures/motionscript/bunny.ms); compiler tests “compiles the design example to a valid scene” and “keeps the hierarchy, the hop, and the sealed zoom” | Preserve pivots, compositing and sampled time behaviour during any rewrite |
| Compositions, instances and timing scopes in wire 0.2 | Compiler tests “compiles compositions, instances, scopes, and cubic easing”; grammar and [compiler resolution](../../packages/compiler/src/compile.ts) | Some references are deferred; do not assume arbitrary procedural execution or unrestricted scope |
| Streaming construction/seals and interrupted input | [incremental compiler tests](../../packages/compiler/src/incremental.test.ts); [runtime streaming tests](../../packages/runtime/src/streaming.test.ts) | Existing incremental execution does not establish first-meaningful-visual or generation efficiency measurements |

General loop/function declarations and a general authoring package/module facility are not implemented by this grammar. Package/API/host ideas in the evolution policy are proposals until a released contract and tests establish support. Resource resolution and ownership details must be verified per recipe against current contracts/tests rather than generalised from these examples.

Installation evidence/rationale (revision 1.0): grammar, compiler resolution and named conformance tests distinguish current construction from proposed abstractions. Repository tests pass; no recipe adoption, measured refinement gains or new syntax is claimed.

## Observed progressive recipe (2026-10-30)

With the current frozen-base contract, predeclare dependency-complete objects/operators, send initial channel writers, then seal the first useful interval. Send later time-local tracks/steps before advancing each subsequent seal. A segment crossing a seal must already be present. Never move a writer or visibility step into sealed history. Split tracks at existing key boundaries to preserve easing; arbitrary cuts inside a cubic/eased segment require a separate exact subdivision derivation.

The [experimental Circle source](../../samples/motionscript/a-circle-in-motion/experimental/progressive-capacity/program.ms), [reproducible rewrite](../../evaluation/bench/progressive/generate.mts) and [decision/evidence](../design/capacity-transactions.md) demonstrate this recipe locally. All original objects, morphs, captions and camera choreography remain. Local writers increase source size; predeclaring a much larger persistent world can still block useful startup. This is one measured native story, not general authoring/model-generation certification. Existing animation, interaction, audio and persistent-editing boundaries remain unchanged.
