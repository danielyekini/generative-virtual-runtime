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

## Queue (3 November 2026, after studio UX intake)

Studio redesign slice is **delivered** (P001, P015, P014, P004, P002, P016,
P017, P018 Done). P006 / P007 / P008 harness work is Done; **P008’s “prefer
direct” product default is superseded** by the director-quality decision above.
**P010 #51 Done** (Interactive Library collection + demos, PR #146). **P019 #139
Done** (Studio Generate mode). **P020 #157 Done**. **P022 #165 Done** (Generate
UX polish); residual streaming/detail bugs → **P028**.

1. **P028 #182** — Generate streaming / detail UX bugs (click during stream, view
   selector stability, Director status truth, detail scroll, user-bubble
   opacity) — **Ready / next**.
2. **P025 #183** — Floating canvas playback controls + tape modes + speed — Ready.
3. **P027 #184** — Generate panel ⋯ menu, copy granularity, system-prompt edit,
   Library-load exits Generate, model-ready gate — Ready after P028 or
   parallel if capacity.
4. **P026 #185** — Corner dual-resize, larger settings icon, side-panel toggle,
   favicon — Ready (smaller chrome).
5. **P029 #186** — Transcripts collection + GVR transcript contract + playback —
   Candidate until contract sketch accepted in-ticket; then Ready.
6. **P031 #187** — Recategorise Test frames vs Stories (named probes) — Ready
   (small).
7. **P030 #188** — Project **Source** field / section for engine tickets + backfill
   Candidate; Engine process via inbox request.
8. **P023 #166** / **P024 #167** — remain Candidate (loading screens; model
   serving under disk pressure — disk full blocked a full worktree this intake).
9. **P009 #50** push-to-talk — Candidate until speech/media UX confirmed.
10. **P003 #44**, **P021 #158**, **P005** / P011–P013 later; corpus under #88.

## Next

1. Product run: claim **P028** Generate streaming bugs (blocks human Generate
   inspection).
2. Then **P025** floating player chrome (studio-ux already confirms behaviour).
3. User: continue Generate quality judgment with the pack; keep Director default
   until Direct is proven.
4. Confirm **P009** speech/media UX when ready → then Ready.
5. Engine orchestrator: triage Source-on-tickets request when filed.

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
Director streaming remains an experimental hypothesis. Preparation must not
displace Studio interaction/generation testing surfaces.
