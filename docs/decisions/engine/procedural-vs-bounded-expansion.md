# Procedural language versus bounded expansion (E022)

Decision: 3 November 2026.
[Issue #41](https://github.com/danielyekini/generative-virtual-runtime/issues/41).
Decision record only. No MotionScript / Scene IR version bump. No registry
claim. A justified rejection is the accepted outcome.

## Requirement

M2 asks whether recurring motif/timing needs justify a compile-time procedural
surface — counted repeaters, parameterized definitions or modules — or whether
the shipped reuse path is enough: drawable bindings (E005/E023), cyclic timing
scopes and timed keys (E014/E043/E044), named behaviours, and existing
`composition.definitions` / `instances` records.

Acceptance requires an explicit call on **termination**, **streaming**,
**ownership**, **seek** and **cost**. Do not smuggle an expression language
from E020. Do not invent core syntax only to shorten a TypeScript builder.

## Current shipped path

| Facility | Role for expansion |
| --- | --- |
| `entities.drawableBindings` | One immutable geometry asset; many instance binds with exclusive per-instance channels and post-seal activation. |
| `timing.cyclicScopes` + `timing.timedKeys` | Periodic and named-time motion without unrolling `%` expressions or whole-scene key lists. |
| Named behaviours | Shared motion law attached per instance without copying track source. |
| `composition.definitions` / `instances` | Authoring records only. Instances are **not** a second draw path (registry: pixels come from scene nodes). |
| Host / generator loops | Finite N placement (ticks, teeth, windows) can emit N binds or nodes outside the language. |

`geometry.repeater` remains **unsupported** and listed only in pending notes. It
is not an execution queue item from this decision.

## Alternatives

1. **General procedural MotionScript** (loops, functions, timers, runtime
   modules). Strongest “make the film short” ask from Clockwork-style builders.
   **Rejected.** E014 already rejected general loops/functions: unbounded
   control flow cannot predict sealed-history effects; generators invent brittle
   micro-syntax; seek needs a VM. The authoring guide forbids inventing loop /
   function / package syntax in recipes. Nothing in the post-E014/E005 evidence
   needs control flow — it needs reuse and periodic time, which already shipped.

2. **Parameterized composition modules** (definitions with typed args that
   expand into draw lists). Clockwork’s “one gear, five instances with tooth
   count”. **Rejected for core language now.** Expanding a module into nodes
   after seal rewrites topology; parameters that change sealed prefixes break
   streaming honesty; ownership of expanded channels is ambiguous unless every
   expansion is a full entity graph (cost of expand-everything that E005
   rejected). Host builders and later packages (evolution-policy ladder) remain
   the place for domain templates until three independent corpus stories fail
   *after* using bindings and cycles.

3. **Compile-time counted repeater / placer sugar** (fixed N, expands to N
   binds or nodes before or at first seal). Terminates, seeks cleanly, and can
   lower onto `BIND_GEOMETRY`. **Not adopted in this decision.** Generators
   already loop; Through-the-blue recorded that eight unrolled copies do not
   justify a drawn-symbol semantic; promoting `geometry.repeater` from pending
   without a post-binding story failure would re-open expand-everything cost
   unless the sugar is strictly bind-backed — which is then optional sugar, not
   a missing semantic. Leave pending; do not commission an implementation issue
   from E022 alone.

4. **Bounded expansion as shipped** (chosen). Treat E005 bindings + E014
   cycles/beats + behaviours + non-drawing composition records as the M2
   expansion contract. Recurring motifs share geometry; recurring motion uses
   cyclic scopes and behaviours; counted placement stays a host/generator
   concern until revisit evidence lands.

## Dimensions (acceptance)

| Dimension | Finding under the chosen path |
| --- | --- |
| **Termination** | Bind/cycle graphs are finite and declared. No open-ended language loops. Host N is finite by construction. |
| **Streaming** | Bind activations respect seals; cycles do not invent topology; composition definitions stay frozen base records. No late module expansion. |
| **Ownership** | Exclusive `(entityId, channel)` on instances (E002/E005). Behaviours attach per instance. No multi-writer module slots. |
| **Seek** | Sampling is a pure function of sealed scene + time (cycles map time; binds resolve clones). No procedural program counter. |
| **Cost** | Shared geometry retains one asset payload (E005 budgets). Language-level N-expansion would reintroduce per-copy node cost unless it is only sugar over binds — which hosts can emit today. |

## Authoring assessment

1. **Simplicity.** Authors write `geometry` / `bind` / `timing … period` /
   behaviours. They do not learn a second module language. Counted ticks remain
   repetitive in raw `.ms`; that cost sits with the generator, not a new core
   construct.
2. **Generation.** Models already struggle with brittle micro-syntax; modules
   and repeater DSLs add another invention surface. Emitting N binds from a
   known N is boring and safe.
3. **Streaming.** Chosen path preserves progressive seals. Module expansion and
   open loops do not.
4. **Expressiveness.** High-level intent for reuse and periodicity is covered.
   Domain packs (gears, dials) belong on the package/API ladder once semantics
   are stable — not as undeclared core syntax.

## Critical pass

- E020 stopped on adaptive plots and explicitly left expression languages and
  compile-time repeaters to E022 — this record closes that deferral with
  **reject**, not a silent reopen.
- Do not reinterpret `composition.instances` as drawable; that would bypass the
  registry restriction and E023’s non-drawing contract.
- Do not treat unsupported Lottie repeater gaps as a native backlog (charter).
- A future counted-bind sugar must freeze expansion at first seal, lower only to
  existing bind/entity ops, and cite ≥3 independent post-binding story failures.

## Child work

None required. Rejection completes E022.

Optional later Candidate (orchestrator may file when evidence appears):
**compile-time counted bind sugar** — fixed N, seal-frozen, lowers to
`REGISTER_GEOMETRY` / `BIND_GEOMETRY` + per-instance transforms; Studio fixture;
no general module system.

## Revisit

- Three or more independent corpus stories, authored after bindings and cyclic
  scopes are in normal use, still fail primarily on counted placement verbosity
  (not on missing periodicity or shared geometry).
- Product adopts a verified package/module host facility and needs language
  hooks — then redesign under the evolution-policy ladder, not by promoting
  `geometry.repeater` from pending by default.
- Any proposal for writable shared geometry after seal still stops at E005’s
  revisit rule first.
