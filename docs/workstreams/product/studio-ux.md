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

- With nothing loaded, the landing page is an empty player. The header's
  **Library** button is always present; the empty canvas repeats it as a
  prominent prompt (plus recent programs if any). Nothing auto-loads.
- Layout follows VS Code. A **header bar** (like VS Code's title and run bar)
  holds the program name, **Open Library**, the run actions and run options.
  The canvas fills the main area, with an optional **Source** side panel on the
  right (closed by default). Under the canvas sit the transport and the **tape**.
  Below that is a collapsible, tabbed **bottom panel**: Diagnostics, Stream,
  Scene, Performance (later), Compare/Report.

```
┌────────────────────────────────────────────────────────────┐
│ program-name     ▶ Run   ≋ Stream ▾   ✎ Generate      Library │
│                  └──── centered run controls ────┘             │
├──────────────────────────────────────┬─────────────────────┤
│                                      │ Source / Generate   │
│                CANVAS                │ (full height when   │
│                                      │  open — see dock)   │
├──────────────────────────────────────┤                     │
│ ❚❚ ‹ › 0:03.2 Speed            ⛶   │                     │
│ TIME [▣▣▣▣▒▒░░░░] tape             │                     │
├──────────────────────────────────────┤                     │
│ [Diagnostics][Stream][Scene]…     ▾  │                     │
│ (bottom dock under canvas only)      │                     │
├──────────────────────────────────────┴─────────────────────┤
│ status …                                                ⚙  │
└────────────────────────────────────────────────────────────┘
```

- **Header run actions** (user direction, 2 November 2026; Generate + centering,
  3 November 2026): **Run**, **Stream**, and **Generate** are **centered as a
  group** in the header. **Generate** sits gapped to the right of Run/Stream
  (same control family, visually separated). **Run** executes the loaded program
  in instant mode. **Stream** runs it in stream mode and adds the stream
  monitoring tools (Stream tab, frame-tape states) to the layout; leaving stream
  mode removes them again. **Generate** is a distinct playback/authoring mode
  (see Generate section) — not a bottom-panel tab.
- **Stream dropdown** (user steering, 2 November 2026, P018): Stream is a split
  button. Its ▾ dropdown holds every stream control: the rate preset (settable
  before streaming), Pause/Resume arrival and Step chunk (shown only while
  streaming), and the Advanced arrival fields. Nothing stream-specific sits
  inline in the header.
- **Library button** (user steering, P018): a blue (accent) text-only "Library"
  button at the right of the header, immediately left of the Source panel
  toggle.
- **Opening a program** from the Library loads it into the player and waits for
  Run or Stream. Autoplay on open is a header run option (off by default).
- There is exactly one loaded program. Stream, Scene and Diagnostics always
  refer to it; there is no second source selector anywhere.
- **Chrome placement** (user steering, 2 November 2026, P017): the Fullscreen
  control is an icon-only button at the far right of the transport row above the
  tape. **Settings** (⚙: Split, Autoplay, canvas size, DPR, additional tools) is
  at the far right of the blue status bar and opens upward. Neither is in the
  header. When a program is loaded but not run, the canvas shows its Studio
  thumbnail (the Library poster policy, 35% of duration) under the Run prompt;
  nothing plays until Run.
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

#### Split details (confirmed 2 November 2026, P004)

The Split toggle lives in the Settings menu (user steering, 2 November 2026; Settings moved to the status bar by P017).
The header Source control is a borderless right-panel outline icon, with an
accessible name and tooltip. Split expands the existing Source editor beside the canvas, with
explicit MotionScript/Lottie/SVG/Fixture format selection, a format-filtered
Presets selector and Open file. Files and presets load into the selected draft
and wait for Run. Format selection does not convert source. Each format retains
its own draft for the current visit; closing Split and visiting Library preserve
edits. Explicitly loading another program, preset or file replaces that format's
draft. Drafts are not a persistent save feature.

The comparison checkbox defaults off. Only requesting comparison emits and
recompiles MotionScript and opens a second canvas at the same playhead. Report /
Compare describes this Scene IR round-trip scope; it does not certify an external
source renderer. Failed Run retains source and the previous successful scene,
with a visible failure notice and diagnostics. Ordinary Run does no comparison.

### Library

- A separate page with a grid of program cards. Each card has a **thumbnail**,
  title, collection, tags and favourite toggle. Hovering a card previews the
  program inside it by **scrubbing**: the pointer's horizontal position in the
  card maps to program time, and leaving restores the thumbnail (user decision
  P015, 2 November 2026). It was chosen because it draws one frame per pointer
  move, with no per-card animation loop or timers. A short loop around the
  thumbnail frame is an acceptable alternative the user also approved, if
  scrubbing proves worse in practice.
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
  - The tab and pop-out stay pinned to the newest arrived text (user steering,
    P017). Scrolling up pauses following and re-rendering of the source view; a
    **Jump to latest** control returns to the bottom and resumes. The pop-out
    shows the same icons, colours and legend as the tab.
  - Stream controls live in the Stream button's dropdown (P018, resolved by the
    user).
- **Frame tape** (user direction, 2 November 2026): a video-editor style track of
  frame thumbnails instead of a plain line, with a vertical playhead line at the
  current time. In stream mode, frames are added to the tape as they are
  resolved and stay **greyed out until played**, then show normally once the
  playhead has passed them. This shows at a glance whether resolved content
  stays ahead of playback, along with waiting and stall gaps. In instant mode the
  whole tape is available at once. The tape is a track system: further tracks
  (sound, narration, events) are added as those capabilities land. Counters
  always state their unit (characters, units, ms).

## Standing rule: testing surfaces (user steering, 3 November 2026)

Major Studio/engine capabilities must ship with a **human-testable workflow**
in Studio before Product moves on (interactions, native model generation,
audiovisual host paths, provider-backed generative audio, and later milestones).
**Apply this to every future major capability**, not only the current queue.
Library collections/tags must make those programs discoverable (for example an
**Interactive** collection). Agents stop and ask when the surface is undefined;
they do not skip the surface. Also in the [charter](../../project/charter.md)
and [product direction](direction.md). The **product orchestrator** may revise
this rule (or substitute a user-focused test) if it becomes harmful; record the
change ([orchestrator process authority](../../operations/orchestrator.md)).

## Library: Interactive collection (delivered P010, 3 November 2026)

**Interactive** library collection (filter chip alongside Stories /
Runtime scenes / …) lists installed programs that declare `interact` /
`input.bindings`. Humans open them from the Library, run them in the Player,
and exercise pointer/keyboard focus without hunting. Early runtime scenes
(Ball, Bunny, Diagram, Caption, …) stay under Runtime scenes — they are not
the interaction or generation quality baseline.

## Generate mode (user-confirmed, 3 November 2026)

**Generate** is treated almost as a **separate playback mode** (alongside Run and
Stream), not as a Diagnostics-style bottom tab. Purpose: exercise pinned native
generation (Ollama `qwen2.5-coder:14b`) with typed prompts **before** push-to-talk.
Human judges **animation quality** on the canvas. Approach offers **Director** and
**Direct**; Studio defaults to Director until Direct is customer-proven equivalent
for the director’s intended roles ([decision](../../decisions/product/2026-11-03-director-quality-gate.md)).

### Header

- **Generate** control in the header, **gapped to the right** of the Run / Stream
  group; the Run / Stream / Generate cluster is **centered** in the header.
- Entering Generate opens the side panel in Generate chrome (below). Leaving
  Generate restores Source (or closed) as before.

### Side panel (Generate chrome)

In Generate mode the side panel is for **generation**, not script testing:

- **Middle (primary):** scrolling **transcript**.
  - **User** messages: right-aligned, blue.
  - **Model** messages: left-aligned, neutral colour.
  - While a model reply is in flight: show a **truncated preview** of arriving
    text and/or a **⋯** pending state in the bubble.
  - **Click** a model bubble to open a **stream-like detail view** of that
    generation’s output (reuse Stream source-view conventions where they fit).
  - In that detail view, offer a control to **view the director response** for
    the same prompt (when approach was Director; hidden or disabled for Direct).
- **Bottom of side panel:** compact **prompt composer** (chat-input pattern —
  rounded field with placeholder and an in-field toolbar; visual reference:
  [generate-prompt-composer-reference.png](assets/generate-prompt-composer-reference.png)).
  - Inside the composer toolbar: **Approach** (Director | Direct) and **model**
    settings as dropdowns/chips (same role as a model selector in the reference).
  - Send / cancel in the composer (send while idle; cancel while running).
  - Mic may appear later (P009); typed prompts are enough for P019.
- Secondary metrics (repairs, latency, tape wait) may appear as quiet status
  under the composer or on the bubble — never as the acceptance gate.

```
│ CANVAS (+ transport/tape/dock under canvas) │  GENERATE PANEL (full height)   │
│                                             │  ┌─ transcript ───────────────┐ │
│                                             │  │ [model …]                  │ │
│                                             │  │          [user · blue]     │ │
│                                             │  │ [model truncated / ⋯]      │ │
│                                             │  └────────────────────────────┘ │
│                                             │  ┌─ prompt composer ──────────┐ │
│                                             │  │ Ask for follow-up…         │ │
│                                             │  │ +  Approach ▾  model ▾   ⬆ │ │
│                                             │  └────────────────────────────┘ │
```

### Side panel vs bottom dock placement (confirmed, 3 November 2026)

Today the bottom log dock spans the **full window width**, which shortens the
side panel vertically and stacks it above the dock. **Desired:** when the side
panel is open (especially Generate), it may use **full vertical height** beside
the canvas column; the **bottom dock is truncated** to the canvas column width
(it no longer cuts under the side panel). Provide **user controls** to adjust
side-panel and bottom-dock placement/size (resize and/or layout preference)
without inventing a second workbench. Status bar may remain full width.

## Later sections (to be specified with the user before building)

Performance inspector placement and metrics (P003), agent-facing commands
(P005), speech/media / push-to-talk surfaces (after Generate testing exists).

## Open questions

- P002 controls were approved in [issue #43](https://github.com/danielyekini/generative-virtual-runtime/issues/43#issuecomment-6584899369). Rates: Slow 20, Medium 60 (default), Fast 200 estimated tokens/sec and Instant. One estimated token is four UTF-16 code units; these are simulated arrival rates, not provider measurements.
- Advanced controls: characters / lines / estimated tokens / random-character chunks; chunk size or random min/max; timing jitter percent; stall frequency in chunks and duration in ms; repeatable seed. Default: four estimated tokens per chunk, no jitter/stalls, seed 1. Controls apply on the next Stream run. Arrival pause/step are separate from playback pause/seek.
- P002 renders declaration-span source states. Units awaiting their next accepted seal are queued; after application, a unit resolves when evaluation reaches that seal's horizon. Multiple states may share a source line. This is a host presentation mapping over E018, not a line-to-frame relationship. The frame filmstrip remains P016.

## Frame-tape states (decided 2 November 2026)

Built in P016 (frame tiles are equal slices of scene time; a tile's thumbnail is
its start frame; "resolved" = the tile's whole range is at or before the sealed
horizon, or the whole scene in Run mode; sampling is bounded per drawn frame and
reported on the agent bridge as `player.tape`). The red gap marks playback
waiting at the resolved frontier; rejected units have no scene-time range, so
they stay marked in the source view rather than on the tape.

Build: **no tile** while the range is not resolved; **grey** tile once resolved
but ahead of the playhead; **normal** tile once played; a **red gap** for a stall
or rejected range. **No orange** on the frame tape.

Stored alternative (the user may want to see it later; keep it easy to enable,
for example behind a Studio setting or constant, but off by default): an
**orange** tile state meaning "sealed and queued but not yet rendered/resolved",
placed between "no tile" and grey. It would mirror the source view's orange
(accepted and queued) for frames.

## UI generator prompt template

> Design a dark, developer-workbench style web UI (VS Code-like density) for
> "GVR Studio", a tool for testing generated animation programs. Screen:
> <Player | Library>. Required regions and behaviour: <paste the relevant
> section of this spec>. Show default, loading/streaming, error and empty
> states. Use non-colour cues alongside colour. Output: annotated wireframes
> plus one high-fidelity mock per state.
