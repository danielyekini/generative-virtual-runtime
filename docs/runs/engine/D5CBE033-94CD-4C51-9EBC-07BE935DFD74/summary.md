# Engine run D5CBE033-94CD-4C51-9EBC-07BE935DFD74

- **Outcome:** complete
- **Issues:** E037 (#169)
- **Worktree:** `/Users/daniel.yekini/Projects/gvr-wt-e037-path-progress` (`engine/169-e037-path-progress`)
- **Scope:** Version `geometry.pathProgress` as MotionScript / Scene IR 0.17.0 (wire `"0.2"`)
- **Syntax:** `attach <node> along <path> { progress; orient?; rollRadius? }` + `path.progress` channel
- **Reuse:** `@gvr/schema` path metrics; `@gvr/runtime` `attachAlongPath` (morph → trim → sample)
- **Ownership:** exclusive position; rotation only when orient and/or rollRadius (orient ≠ rolling)
- **Studio:** `fixtures/motionscript/path-progress.ms` playground entry
- **Not in scope:** `paint.strokeDash` (E038), `transform.autoOrient` alone, Lottie/SVG import
- **Verify:** `npm run verify` exit 0 (full tests, typechecks, Studio build, ops acceptance, reference freshness)
