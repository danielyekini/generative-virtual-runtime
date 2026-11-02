# Product direction

Read charter, this direction, selected live issue/latest relevant handover and
applicable technical contracts. Do not read every engine run or engine inbox.

## Studio UX authority (user steering, 2 November 2026)

[studio-ux.md](studio-ux.md) is the user-confirmed Studio specification:
a **full redesign** with separate Library and Player pages, not features added
to the old three-column workbench. If a workflow's experience is undefined
there, stop and ask the user with options, mockups or a UI-generator prompt
instead of building a guess. Preserve working compile, playback, streaming and
import/compare functions while moving them into the new layout.

P004's confirmed Split flow reuses existing supported importers. It does not
commission Lottie/SVG coverage expansion or a fidelity campaign. Old language
drafts cannot add that scope; a fresh explicit user request is required.

## Queue (2 November 2026, post-review)

Studio redesign slice is **delivered** (P001, P015, P014, P004, P002, P016,
P017, P018 Done). Paused prototype history: PR #65 commit 2d08de0 (reuse
helpers only).

1. **P006 #47** native MotionScript authoring reference — **Ready** (resume;
   E006 Done; prior environment Blocker cleared; rebuild from current main).
2. **P007 #48** real-model native generation experiment — after P006.
3. **P008 #49** director-script / next-corpus prep (#88 accepted) — after P007;
   record director-script ownership with Engine before the next corpus.
4. **P003 #44** Performance tab — Candidate until user UX confirmation
   (studio-ux.md open section).
5. **P005 #46** agent toolbox / shared host API — Candidate until agent-facing
   command UX is confirmed in studio-ux.md (API can share Player execution
   paths once specified).
6. **P009 #50** push-to-talk / narration / SFX host — Candidate; depends on
   P007, E008, **E031** (accepted #120). Promote after E031 Done on main.
7. P010–P013 remain later Candidate work (interaction, demo, desktop/landing,
   teaching).

## Next

**Ordinary dispatch:** claim P006 and ship the versioned native reference
(released-authority allow-list, immutable release+fingerprint snapshot,
freshness guard, fixture/lint verification, honest token-size estimate). Do not
wait on P003/P005 UX to unblock that path.

**User decisions still required before implementation:** Performance inspector
metrics/layout (P003) and agent-facing command surfaces (P005). Ask with
options/mockups/UI-generator prompt; do not guess Studio chrome.

**After P006:** P007 model experiment, then P008 director/corpus prep. Keep
Studio delivery ahead of prospective corpus generation.

## Generative audio provider (intake cleared, 2 November 2026)

Engine owns ElevenLabs design/implementation ([E031 #119](https://github.com/danielyekini/generative-virtual-runtime/issues/119)
and children E032–E034). Product accepted [#120](https://github.com/danielyekini/generative-virtual-runtime/issues/120):
P009 carries the E031 host/provider contract dependency (credentials, synthesis
readiness into `AudioSession`, required-narration vs optional-effects failure UX,
offline fixtures). Do not invent MotionScript generative-audio syntax in Studio.
Existing `href` audio + E026 Web Audio remain the fallback until E031 lands.

## Corpus inputs (prospective direction, 2 November 2026)

Product owns realistic single-turn prompts and multi-turn conversations with
production expectations, derived from the [established functionality index](functionality.md)
and [future functionality list](future-functionality.md). Maintain both as capabilities
evolve. Follow the [native story cycle](../../workflows/native-story-cycle.md);
coordinate director-script ownership/generation procedure with Engine through P008
before the next corpus. Include persistent canvas edits, continuing loops, extended
explanations and architectural micro-prompts. Director streaming is an experiment
hypothesis. This adds future iteration preparation without displacing current Studio work.
