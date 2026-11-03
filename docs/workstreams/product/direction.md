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
   [git.md](../../operations/git.md)).

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

## Queue (3 November 2026, after product review)

Studio redesign slice is **delivered** (P001, P015, P014, P004, P002, P016,
P017, P018 Done). P006 / P007 / P008 harness work is Done; **P008’s “prefer
direct” product default is superseded** by the director-quality decision above.
**P010 #51 Done** (Interactive Library collection + demos, PR #146). **P019 #139
Done** (Studio Generate mode: header control, full-height transcript/composer,
Director default, Ollama `qwen2.5-coder:14b`). Paused prototype history: PR #65
commit 2d08de0.

1. **P022 #165** — Generate UX polish from human quality pass (composer, detail
   streaming/resize, copy chat, AI icon) — in flight / next Done.
2. **P020 #157 Done** — story-complexity Generate quality judgment pack
   (chips + checklist; human judgment still outstanding).
3. **Customer animation-quality judgment** on Generate (Director vs Direct) —
   do not close approach preference without that
   ([director quality decision](../../decisions/product/2026-11-03-director-quality-gate.md)).
4. **P023 #166 Candidate** — waiting-state MotionScript loading-screen presets.
5. **P024 #167 Candidate** — investigate Ollama/model serving optimisation under
   disk/hardware pressure.
6. **P009 #50** push-to-talk / narration / SFX — Candidate until speech/media UX
   is confirmed in studio-ux; imports `@gvr/audio-provider` (E035 Done; #144
   accepted).
7. **P003 #44** Performance tab — Candidate until UX confirmation.
8. **P021 #158 Candidate** — reserved-word node-id generation hardening.
9. **P005 #46** / P011–P013 later; corpus prep under #88.

## Next

1. Land **P022** Generate UX polish from the quality-pass findings.
2. User: continue Generate quality judgment with the pack; keep Director default
   until Direct is proven.
3. Confirm **P009** speech/media UX (A mic-in-composer / B Speech mode / C
   settings-only) → then Ready.
4. Schedule **P023** loading screens and **P024** model-serving investigation.

Do not invent Studio chrome. Keep Studio delivery ahead of prospective corpus
generation, but do not skip interaction/generation Studio exercise.

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
Director streaming remains an experimental hypothesis. Preparation must not
displace Studio interaction/generation testing surfaces.
