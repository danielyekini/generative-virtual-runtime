# Studio product brief

Purpose: reduce friction between implemented capability and reliable testing for
agents and humans. Studio is a workbench, not yet the customer education product.
Agent tools and human UI share loaders, compiler/run adapters, telemetry and
evidence formats. Product agents own navigation/interaction design and testing.

## Workflows to design end to end

- Find programs by name/tags/capabilities/status; open existing native samples.
- Upload supported sources or paste/type native source; preserve unsaved edits.
- Execute the selected source and view playback/fullscreen without inspector clutter.
- Return to authoring/library without ambiguous source selection.
- Choose normal/progressive execution as run modes for that same source.
- Inspect source arrival and semantic acceptance/rejection, timeline seal coverage,
  playhead, waiting/recovery, buffer headroom and relevant performance.
- Compare supported formats/round-trip only when explicitly requested. Keep it
  a discoverable secondary utility, with subtle file-language selection, like
  choosing an editor language mode. Imports may detect other supported formats.
- Exercise live runtime generation later through the same loading/execution path.
- Capture/replay test evidence through an agent API/CLI without navigating UI.

Do not use rendered, parsed, compiled, accepted and sealed interchangeably.
Source declarations may affect many times or persist throughout a scene; a line
cannot generally turn white simply because a corresponding 'frame' played.
Expose units/operations with traceable source spans and explain counters/units.
Do not imply 'loaded frames' if only future timeline coverage is validated.

Provide usable layout at different viewports, keyboard access and non-colour-only
state indications. Keep generated customer experiences free of incidental engine
debugging details; Studio can expose them deliberately. Product owners select
verification gates using real workflows and available tools, and request human
evaluation with concrete scenarios. Further observations become GitHub issues.
