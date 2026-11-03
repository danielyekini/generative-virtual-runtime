# Composition-instance timingScopeId (E048)

Decision: 3 November 2026.
[Issue #208](https://github.com/danielyekini/generative-virtual-runtime/issues/208).
Decision record. No MotionScript / Scene IR version bump in this change.
Language removal of the inert field is named child work below.

## Requirement

Composition instances already carry a required `timingScopeId`. The validator
checks that the scope exists. The runtime never samples it. Instance timing is
therefore a writeable no-op, which breaks diagnostic truth: authors and
generators can believe a reused composition is retimed or cycled per instance
when nothing moves.

Choose **apply** (wire affine/cyclic instance timing into sampling with
streaming, ownership and seek rules) or **reject** the field with an honest
diagnostic. Do not leave the silent no-op.

## Current facts

| Layer | Behaviour today |
| --- | --- |
| Scene IR `CompositionInstance.timingScopeId` | Required string; must name a known scope. |
| MotionScript `instance … { timing <scope>; }` | Required at compile; lowered onto the IR field. |
| Runtime / `projectScene` | Does not read `scene.instances` for draw or track sampling. |
| Registry `composition.definitions` | Instances are records; pixels come from scene nodes, not a second draw. |

E005/E023 drawable bindings are the reuse path that *does* sample. E022 rejected
procedural modules that would expand definitions into draw lists.

## Alternatives

1. **Apply instance timing** — map scene time through the instance scope when
   evaluating the referenced composition’s tracks/nodes. **Rejected.** Instances
   are not a draw path. Applying time without expansion invents a second
   execution model (composition playback) that E022 just declined. Ownership of
   channels inside a non-drawn definition is undefined. Streaming would need
   seal rules for a ghost graph. Cost and seek semantics belong to a full
   module/instance redesign, not a silent field fix.

2. **Keep accepting; document as ignored.** **Rejected.** Fails the diagnostic-
   truth trigger that promoted this issue. Generators keep emitting dead
   `timing` lines.

3. **Reject the field** (chosen). Forbid `timing` / `timingScopeId` on
   composition instances. Sampling stays unchanged (the field never affected
   frames). Existing IR that sets the field migrates by **stripping** it —
   behaviour-preserving because it was inert. New programs that write the
   property get a clear compile/validate diagnostic.

## Chosen scope

- **Now:** record reject; keep current wire behaviour until the child ships so
  published validators are not silently tightened mid-release.
- **Child implementation:** MotionScript + Scene IR minor bump (wire stays
  `0.2`): drop required instance timing; reject the property if present;
  migrate strips it; emitter and compiler tests updated. No new capability
  token — this removes a lie, it does not add a feature.

## Authoring assessment

1. **Simplicity.** Authors stop inventing a timing line that never did work.
2. **Generation.** Models lose a brittle required property on a non-drawing
   record.
3. **Streaming.** Unchanged: instances remain frozen base records without a
   timed expansion path.
4. **Expressiveness.** Per-instance retiming of shared motifs stays with
   drawable bindings + cyclic scopes on real entities (E005/E014), not with
   composition instance records.

## Critical pass

- Do not reinterpret `composition.instances` as drawable to “make timing work”.
- Do not treat Lottie precomp timing as a native backlog (charter).
- Historical evaluation JSON under `docs/evaluations/` stays immutable; only
  live packages, fixtures and the versioned migrate path change in the child.

## Child work

- **E050** ([#221](https://github.com/danielyekini/generative-virtual-runtime/issues/221)):
  version the reject — MotionScript / Scene IR minor bump, validator + compiler
  diagnostics, migrate strip, emitter/tests, registry note on
  `composition.definitions` restrictions. Studio only if a fixture already shows
  instance `timing`.

## Revisit

- If Product later adopts true composition playback (drawn instances with
  local time), stop and redesign under a new decision — do not revive this
  inert field as a half-measure.
- If a story needs per-instance phase on a *bound* drawable, use cyclic scopes
  and behaviours on the instance entity id, not composition records.
