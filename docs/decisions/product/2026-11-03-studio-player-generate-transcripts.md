# Studio player chrome, Generate tooling, transcripts and library taxonomy

Status: adopted user steering, 3 November 2026. Owner: Product orchestrator.

## Decision

Accept the user’s Studio UI and product-direction updates as current
specification. Record them in [studio-ux.md](../../workstreams/product/studio-ux.md)
and queue worker-visible Product tickets. Do not invent unspecified chrome.

## What changed

1. **Floating canvas playback** — YouTube-style overlay; auto-hide after 5s
   stationary; interactive hotspot when programs have interactions; canvas
   click / Space play-pause; white-line vs full frame tape defaults by mode;
   playback speed in Settings; same behaviour in fullscreen.
2. **Studio chrome** — corner drag resizes dock + side panel together; larger
   footer settings icon; header icon is side-panel open/close (not Source-only).
3. **Generate tooling** — ⋯ menu with copy granularity and editable system
   prompts; Library load exits Generate to Source; model selector/Send gated on
   model readiness.
4. **Generate UX bugs** — treat streaming click/rerender, detail scroll,
   unmuted user bubbles, and Director/Output status truth as required behaviour
   (follow-up after P022).
5. **Transcripts** — new Library collection + GVR transcript contract + Generate
   mode playback with turn highlighting.
6. **Library taxonomy** — Stories vs Test frames definitions; move named
   capability probes into Test frames.
7. **Engine Source** — engine tickets should name the stories that prompted the
   work; backfill is a separate Candidate. Route process adoption to Engine via
   inbox request.
8. **Worktree cleanup** — post-merge `git worktree remove` is mandatory in the
   same session (disk exhaustion from undeleted trees). See
   [isolated-worktrees amendment](../2026-11-03-isolated-worktrees.md) and
   [git.md](../../operations/git.md).

## Supersedes

- Player layout with a permanent transport/tape strip under the canvas
  (transport is now a floating overlay).
- Header “Source” framing of the side-panel toggle.
- Treating capability-probe samples (Clip mask, Spatial *, etc.) as Stories.
- P022 Done scope for Generate detail streaming — residual defects remain open
  as a follow-up bug ticket.

## Unchanged

Charter vision, Lottie/SVG non-mission boundary, Director quality gate, Studio
testing-surface rule, isolated worktrees, and Engine ownership of MotionScript /
Scene IR semantics.
