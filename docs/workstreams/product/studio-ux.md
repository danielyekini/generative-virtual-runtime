# Studio UX specification

Status: user-confirmed, 2 November 2026. Owner: Product orchestrator. This is
the authority for Studio workflows; implementation items cite the sections they
deliver. Change it only after the user confirms (see "Open questions").

Studio's motto is **reduce friction between functionality and testing**. It is
not a video editor. Every capability that reaches the engine should be exposed
as a small, testable element here, so the later customer surface can be built
from proven pieces. Agents should reason about the full set of human workflows
before building and take the conventions from developer workbenches (VS Code,
browser devtools), not from media editors.

## Rule for agents

If the experience for a workflow is not defined here, **stop and ask the user**.
Offer concrete options with a recommendation, ASCII/HTML mockups, or a prompt for
a UI generator (template below). Do not ship guessed UI; it gets thrown away.
Ordinary visual polish inside a defined layout stays with the implementing agent.

## User pain points (source of this spec)

1. Cannot execute a program and watch it fullscreen to judge canvas appearance.
2. Many test programs are scattered across grouped dropdowns; finding them is
   tedious and titles are hard to remember.
3. The three-column workbench mixes program selection, stream settings, editor
   and compile details; the editor sits with compile details instead of with
   program choice; testing a program doesn't switch to a viewing-focused layout.
4. Streaming is a checkbox unrelated to playback, can stream a different script
   than the one loaded, its "fed" counter has no clear unit, and the undockable
   stream source pane usually shows nothing.
5. Side-by-side paste-and-run (including Lottie/SVG through the working
   importers) is still used and must stay wired in.
6. Performance monitoring needs a home, as in other workbenches.

Rejected attempt: PR #65 added a library rail and an active-program bar to the
old three-column layout. It did not address 2 to 4 and was paused unmerged
(see [decision](../../decisions/product/2026-11-02-studio-ux-redesign.md)).

## Pages

Two pages with their own routes. Navigation preserves the loaded program and
any unsaved edits.

### Player (landing page)

- With nothing loaded, the landing page is an empty player with a prominent
  **Open Library** action (plus recent programs if any). Nothing auto-loads.
- Layout follows VS Code. A **header bar** (like VS Code's title and run bar)
  holds the program name, **Open Library**, the run actions and run options.
  The canvas fills the main area, with an optional **Source** side panel on the
  right (closed by default). Under the canvas sit the transport and the **tape**.
  Below that is a collapsible, tabbed **bottom panel**: Diagnostics, Stream,
  Scene, Performance (later), Compare/Report.

```
┌────────────────────────────────────────┐
│ ▤ Library │ program-name │ ▶ Run  ≋ Stream ▾ │ ⚙ │  header
├──────────────────────────────┬─────────┤
│                              │ Source  │
│           CANVAS             │ (opt.)  │
├──────────────────────────────┴─────────┤
│ ❚❚ 0:03.2 ▏[▣▣▣▣▣▣▒▒▒▒░░░░]  frame tape │
├────────────────────────────────────────┤
│ [Diagnostics][Stream][Scene][Perf]  ▾  │
└────────────────────────────────────────┘
```

- **Header run actions** (user direction, 2 November 2026): **Run** executes the
  loaded program in instant mode. **Stream** runs it in stream mode, and
  switching to stream adds the stream controls (rate preset, Advanced, pause and
  step) to the header and the stream monitoring tools (Stream tab, frame-tape
  states) to the layout. Leaving stream mode removes them again.
- **Opening a program** from the Library loads it into the player and waits for
  Run or Stream. Autoplay on open is a header run option (off by default).
- There is exactly one loaded program. Stream, Scene and Diagnostics always
  refer to it; there is no second source selector anywhere.
- **Fullscreen** presents the canvas only, using contain-fit on the logical
  viewport (no stretching, no change to authored coordinates). Esc or a visible
  exit control leaves it. Transport may appear on hover.
- **Source panel**: quick edit and re-Run of the loaded program. Compile errors
  list line, column, code, message and recovery; selecting one jumps to the
  span. Source is never replaced on failure.
- **Split mode** (paste-and-run side by side): a toggle opens a wide editor
  beside the canvas with a format selector (MotionScript, Lottie, SVG, fixture
  importers). Paste, then Run plays the result. A native round-trip comparison
  can be shown as an optional second canvas. Import fidelity reports go in the
  bottom panel. This replaces the old Import rail section; no automatic
  round-trip work happens outside this mode.

### Library

- A separate page with a grid of program cards. Each card has a **thumbnail**,
  title, collection, tags and favourite toggle. Hovering a card previews the
  program inside it.
- Thumbnails and previews are a **Studio feature, not a MotionScript feature**.
  There is no author-declared poster in the language. Studio code picks the
  frame statically (for example a fixed fraction of the duration, or a per-entry
  value in Studio's own catalogue).
- Organisation: **collections** (Stories, Test frames, Runtime scenes, My
  programs, Imports) plus editable **tags**. **Search** covers title, caption
  and tags. **Sort** by name, recently opened, recently added/modified and
  duration. **Favourites** and a **Recent** strip.
- **New / Paste / Upload** use a full editor on the Library page. The result
  goes into My programs and opens in the player.
- Editing is available in both places: the Library editor for creating and
  authoring, and the player's Source panel for quick test edits.

## Streaming (player Stream mode)

- Streaming is a **run mode** of the loaded program, chosen on Run. It is not
  a checkbox in a side bar.
- **Arrival simulation**: named rate presets in tokens/sec (for example slow,
  LLM-like, fast, instant), a pause and step-chunk control, and an **Advanced**
  section for chunking (characters, lines, tokens, random), jitter and stalls.
  This reuses PR #11's Worker/arrival evidence and is never presented as real
  LLM speed.
- **Stream source view** (bottom-panel Stream tab, which may be popped out):
  - only arrived text is shown;
  - **grey**: arrived, but its unit is not yet complete or accepted;
  - **orange**: unit accepted and queued, but the playhead has not reached it;
  - **white**: resolved by playback;
  - **red**: rejected unit, with a diagnostic marker; it stays visible.
  - Every state also has a non-colour cue (gutter icon or label). The states map
    to real engine events from X001/E018, not to invented per-line frames.
- **Frame tape** (user direction, 2 November 2026): a video-editor style track of
  frame thumbnails instead of a plain line, with a vertical playhead line at the
  current time. In stream mode, frames are added to the tape as they are
  resolved and stay **greyed out until played**, then show normally once the
  playhead has passed them. This shows at a glance whether resolved content
  stays ahead of playback, along with waiting and stall gaps. In instant mode the
  whole tape is available at once. The tape is a track system: further tracks
  (sound, narration, events) are added as those capabilities land. Counters
  always state their unit (characters, units, ms).

## Later sections (to be specified with the user before building)

Performance inspector placement and metrics (P003), agent-facing commands
(P005), legacy format selection details (P004), speech/media surfaces.

## Open questions

- Hover preview style is not yet confirmed. Default proposal: scrub through the
  program by mouse position in the card (cheap) rather than autoplay. Ask before
  building the Library page.
- Exact preset rates and the Advanced control set are to be proposed with
  mockups in P002.
- Frame-tape state mapping: the user asked for the same grey/orange/white system
  as the source view, and for frames that are "resolved but greyed until
  played". Proposed: no tile (sealed range not yet resolved), grey (resolved,
  ahead of the playhead), normal (played), red gap (stall or rejected range).
  Confirm whether orange should mean "sealed and queued but not yet rendered"
  before building P016.

## UI generator prompt template

> Design a dark, developer-workbench style web UI (VS Code-like density) for
> "GVR Studio", a tool for testing generated animation programs. Screen:
> <Player | Library>. Required regions and behaviour: <paste the relevant
> section of this spec>. Show default, loading/streaming, error and empty
> states. Use non-colour cues alongside colour. Output: annotated wireframes
> plus one high-fidelity mock per state.
