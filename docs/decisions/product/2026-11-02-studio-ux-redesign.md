# Studio UX redesign replaces the incremental P001 approach

Status: accepted user direction, 2 November 2026. Work items:
[P001](https://github.com/danielyekini/generative-visual-runtime/issues/42),
[P002](https://github.com/danielyekini/generative-visual-runtime/issues/43).
Spec: [studio-ux.md](../../workstreams/product/studio-ux.md).

The first P001 run (`ec918d3f-9ed8-42a8-9214-557097eccaa4`) compared an
in-place library rail with a separate library screen and chose the in-place
rail. PR #65 implemented it. It passed CI and a 19-check smoke test, but the
user rejected it because it kept the old three-column layout. The user's
intent had not been carried through installation: P001 is a **full Studio UX
redesign** tailored to the user, not features added to the existing interface.

Decided with the user:
- separate Library and Player pages;
- the landing page is an empty player;
- opening a program loads it and waits for Run (autoplay is a setting);
- player layout is a VS Code-style bottom panel;
- editing is available in both the Library and the player;
- split paste-and-run mode lives in the player;
- stream line states are grey, orange, white and red;
- arrival uses rate presets plus advanced controls;
- thumbnails are chosen statically in Studio code, not by MotionScript;
- the Library has collections, tags, sort, favourites and recents.

Process change: if a workflow's UX is undefined, agents ask the user (options,
mockups or a UI-generator prompt) instead of implementing a guess.

Prototype preserved on PR #65 history (commit 2d08de0). Code that could be
reused, with no acceptance claimed: pure library filter/storage helpers, located
diagnostics with jump-to-span, and the headless CDP smoke harness. Revisit this
decision only on user steering.
