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

## Queue (2 November 2026, P005 not a P007 gate)

Studio redesign slice is **delivered** (P001, P015, P014, P004, P002, P016,
P017, P018 Done). P006 native authoring reference is **Done** (PR #130).
Paused prototype history: PR #65 commit 2d08de0 (reuse helpers only).

User steering (same day): agents already exercise Studio/engine tools in runs;
[P005](https://github.com/danielyekini/generative-virtual-runtime/issues/46) is
optional contract consolidation, **not** a prerequisite for generation
experiments. Decision:
[2026-11-02-p005-not-gate-for-p007.md](../../decisions/product/2026-11-02-p005-not-gate-for-p007.md).

1. **P007 #48** real-model native generation experiment — **Ready** (depends on
   P006 only).
2. **P008 #49** director-script / next-corpus prep (#88 accepted) — after P007.
3. **P003 #44** Performance tab — Candidate until user UX confirmation.
4. **P005 #46** agent toolbox / shared host API — low-priority Candidate;
   optional later consolidation; does not block P007/M3 generation.
5. **P009 #50** push-to-talk / narration / SFX host — Candidate; depends on
   P007, E008, **E031** (accepted #120). Promote after E031 Done on main.
6. P010–P013 remain later Candidate work.

## Next

**Ordinary dispatch:** claim P007. Use the P006 reference and existing
compile/runtime/Studio paths; pin local Ollama **`qwen2.5-coder:14b`**
([provider decision](../../decisions/product/2026-11-02-p007-provider-pin.md));
measure held-out validity, repairs, first useful motion and latency; support
cancel/stale handling. Do not invent a new agent toolbox as part of P007.
Fixture provider is CI-only and is not a model-speed claim.

**Still UX-gated (not blocking P007):** P003 Performance inspector. Ask before
building. P005 needs no UX work unless later promoted with a concrete gap.

Keep Studio delivery ahead of prospective corpus generation (P008).

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
