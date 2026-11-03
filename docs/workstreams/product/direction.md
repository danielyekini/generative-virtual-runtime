# Product direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every engine run or engine inbox.

## Standing product rules (user steering, 3 November 2026)

1. **Customer perspective.** Product builds for a customer. Use the available
   user for human judgment on animation quality and Studio workflows. Do not
   declare human-facing winners from pass-rate/latency alone.
2. **Testing surface before moving on.** Major functionality (interactions,
   model/native generation, audiovisual host paths, and similar milestone
   capabilities) must have a Studio testing surface/workflow and be exerciseable
   by humans before the lane advances to dependent work. **Generalise to every
   future major capability** — not a one-off for generation or audio. Charter and
   [studio-ux standing rule](studio-ux.md) restate this for all lanes.
3. **Engine-assisting requests first.** Every product run checks open
   `request-to:product` items that unblock or assist Engine (for example
   verification surfaces). Address or advance those before new product-only
   queue work when they are actionable.
4. **Animation quality gate for generation.** Intent distillation remains
   central (director path until Direct is *proven* equivalent for those roles);
   story-complexity programs are the quality baseline — see
   [director quality decision](../../decisions/product/2026-11-03-director-quality-gate.md).
   Secondary metrics: failures, latency, streaming tape downtime. Director is
   not an automatic permanent preference over a proven Direct path.
5. **Isolated git worktrees.** Every mutating product run uses its own worktree
   / issue branch before edits — never a shared checkout with another agent
   ([decision](../../decisions/2026-11-03-isolated-worktrees.md),
   [git.md](../../operations/git.md)). After the PR merges, **same-session
   cleanup** of that remote/local branch **and** the worktree is mandatory —
   undeleted trees fill the disk and block later runs.

**Orchestrator may revise any of the above** (and related operating principles)
when evidence warrants — including designing a user-focused test instead of
keeping a harmful gate. Record supersession. Vision / paid-service / platform
boundaries unchanged ([authority](../../operations/authority.md),
[orchestrator](../../operations/orchestrator.md)).

## Studio UX authority (user steering, 2–3 November 2026)

[studio-ux.md](studio-ux.md) is the user-confirmed Studio specification:
a **full redesign** with separate Library and Player pages, not features added
to the old three-column workbench. If a workflow's experience is undefined
there, stop and ask the user with options, mockups or a UI-generator prompt
instead of building a guess. Preserve working compile, playback, streaming and
import/compare functions while moving them into the new layout.

P004's confirmed Split flow reuses existing supported importers. It does not
commission Lottie/SVG coverage expansion or a fidelity campaign. Old language
drafts cannot add that scope; a fresh explicit user request is required.

**3 November 2026 player/Generate/transcript steering** is recorded in
[decision](../../decisions/product/2026-11-03-studio-player-generate-transcripts.md)
and folded into studio-ux (floating playback, Generate ⋯ tooling, transcripts,
Stories vs Test frames).

## Queue (3 November 2026, after chrome-slice review)

Studio redesign + Generate chrome slice is **delivered** (P001, P015, P014,
P004, P002, P016–P018, P006–P008, P010, P019, P022, P025–P028, P031 Done).
**P008’s “prefer direct” product default is superseded** by the director-quality
decision above. [#88](https://github.com/danielyekini/generative-virtual-runtime/issues/88)
corpus-prep request is **closed** (lists reconciled; director ownership via
P008). **P020 #157** shipped pack scaffolding (fixtures + Generate chips) but
is **Human verification — not Done**: closing it assumed the generation quality
gate passed; no human judgment has been recorded
([user steering 3 November 2026](https://github.com/danielyekini/generative-virtual-runtime/issues/157)).
Prospective corpus generation stays deferred until that gate and Studio
interaction/transcript surfaces catch up.

1. **P020 #157** — Story-complexity Generate quality judgment — **Human
   verification** (exercise pack; record animation-quality pass/fail on the
   issue before Done). Blocks declaring Director/Direct winners.
2. **P029 #186** — Transcripts Library collection + GVR transcript contract +
   playback highlighting — **Ready / next worker claim** (contract sketch on
   the issue).
3. **P023 #166** — Generate waiting-state MotionScript loading-screen presets —
   Ready.
4. **P021 #158** — Generation reserved-word node ids (harness/reference
   hardening) — Ready.
5. **P024 #167** — Studio/Ollama model-serving optimisation experiment (disk /
   hardware pressure) — Ready (bounded options + recommendation; no default
   change without evidence).
6. **P030 #188** — Project **Source** field for engine tickets — Candidate until
   Project write/`PROJECT_TOKEN` can create the field (or user adds it); Engine
   fills Source after.
7. **P009 #50** push-to-talk / generative-audio host — Candidate until
   speech/media UX confirmed in studio-ux.
8. **P003 #44**, **P005**, P011–P013 later.

## Next

1. **User / Human verification:** run the P020 pack in Studio Generate
   (Director), judge canvas animation quality, post pass/fail on #157. Keep
   Director default until Direct is proven.
2. Product run: claim **P029** Transcripts (does not replace the P020 gate).
3. Then **P023** loading screens or **P021** reserved-id hardening.
4. Confirm **P009** speech/media UX when ready → then Ready.
5. Unblock **P030** when a token with `project` scope (or the board-sync secret)
   can add the Source field.

Do not invent Studio chrome beyond studio-ux. Keep Studio delivery ahead of
prospective corpus generation, but do not skip interaction/generation Studio
exercise.

## Generative audio provider (intake cleared, 2–3 November 2026)

Engine owns generative-audio design/implementation ([E031 #119](https://github.com/danielyekini/generative-virtual-runtime/issues/119)
and children E032–E034 — Done on main). **E035 Done:** package is
`@gvr/audio-provider`. Product accepted [#120](https://github.com/danielyekini/generative-virtual-runtime/issues/120)
and [#144](https://github.com/danielyekini/generative-virtual-runtime/issues/144):
P009 carries the host/provider contract dependency and must import the neutral
package. Existing `href` audio + E026 Web Audio remain the fallback until P009
ships. P019 does not require live generative audio. **User steering 3 November
2026:** keep vendor brand out of Studio/generation-facing vocabulary where a
neutral “audio provider” / “generative audio” label suffices; credential
settings may name the funded backend
([decision](../../decisions/engine/2026-11-03-authoring-and-provider-abstraction.md)).

## Corpus inputs (prospective direction, 2–3 November 2026)

Product owns realistic single-turn prompts and multi-turn conversations with
production expectations, derived from the [established functionality index](functionality.md)
and [future functionality list](future-functionality.md). Maintain both as capabilities
evolve. Follow the [native story cycle](../../workflows/native-story-cycle.md).
Director scripts distill intent; Engine implements native MotionScript.
Quality expectations track story-complexity programs, not runtime-scene smoke.
Director streaming remains an experimental hypothesis.

**Prep status (review 3 November 2026):** request [#88](https://github.com/danielyekini/generative-virtual-runtime/issues/88)
accepted and closed — functionality lists reconciled; director handoff recorded
via P008; judgment-pack **scaffolding** lives under
`fixtures/generation/quality-judgment/` for
[P020 #157](https://github.com/danielyekini/generative-virtual-runtime/issues/157)
(**Human verification**, not Done — user steering). Actual corpus generation
remains prospective and must not displace the P020 human gate, Studio
Transcripts (P029), loading screens (P023), or speech UX confirmation for P009.
