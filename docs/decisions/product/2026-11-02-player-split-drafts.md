# Player Split drafts and opt-in comparison

Confirmed by the user in the P004 run on 2 November 2026. Execution: #45.

Expand the existing Source editor into Split, keeping the Player run/transport,
installed examples and existing format adapters. Each format retains a separate
session draft. Explicit Library/preset/file loads replace that format's draft;
closing Split and navigating to Library preserve edits. This is not saved-library
storage. Open/preset actions wait for Run even with autoplay enabled.

The alternatives were one shared buffer (old importer behaviour, less state but
accidental format changes reinterpret the same text) and separate per-format
buffers (slightly more state, preserves unrelated edits). The user selected
separate drafts. A second independent import workspace was rejected because it
would duplicate the loaded source and execution path.

Compare is off by default. Requesting it emits/recompiles the successful Scene IR
and creates a second runtime at the same playhead, rendered beside the first
within one viewing area and one transport. Turning it off or closing Split
removes the comparison runtime/result. This inspects a MotionScript round-trip;
it is not an external-format visual fidelity certification. Ordinary native Run
has no emitter call or second runtime. Failed Run keeps source and prior scene,
with diagnostics and a visible notice rather than silently showing old success.

Critical pass: delayed file reads are invalidated by source edits, format/program
changes, closing Split and Library navigation. Read errors preserve drafts.
Emission/compilation failures stay in the comparison report and do not replace
the original scene. Fullscreen remains canvas-only. No new language/importer
support or engine event interpretation is introduced. Streaming stays on the
existing legacy route until P002; the legacy page cannot yet be removed.

Acceptance: all four formats run, separate drafts survive switches/close/navigation,
files/presets wait for Run, retained failures are labelled, comparison matches a
sampled native animation and renders at matching canvas sizes, and no ordinary
Run invokes emission. Unit and real-browser checks cover these boundaries, with
full repository verification before publication. Revisit session-only retention
if persistent Split drafts become an explicit product requirement.
