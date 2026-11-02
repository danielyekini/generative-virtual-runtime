# E001: atomic assembled-scene delta admission

Run `0294d5d3-abe5-4137-987e-2d132a2e03a2`, 2 November 2026. [Issue #20](https://github.com/danielyekini/generative-virtual-runtime/issues/20).
Measured implementation: `9a4b4773e106f8e5ba551f04c53afd7058411be9` (clean tree at verification); base `7fa2fa1a0ff4378cd93afa7957210f6ed6397b78`.
This evidence-only follow-up does not change implementation bytes.

## Result

The preserved [PR #11 reproduction](../../../evaluations/2026-10-30-capacity/known-transform-parent-replay.json)
previously stopped streaming at revision 2/4 with `INVALID_PARENT` for `Other.b`.
It now reaches 4/4 without rejection with immediate or deferred flushing, matching
offline IR and frame draw items. Production sampling/frame resolution is used;
no browser screenshot or whole-corpus visual certification is claimed.

Admission validates the detached assembled accepted/queued scene, then retains
one queued candidate until flush. Invalid additions preserve accepted scene
identity, frames, revision, seal/completion state and original diagnostic details;
diagnostics carry the initiating delta/span. Stale/overflow/cancellation bounds
remain. Incoming payloads are owned; old nested geometry is never rewritten.

Compiler header containers are snapshotted at emission so future operators,
resources and profiles cannot leak into earlier deltas. Root transform parents
receive full validation. Transform-parent emission preserves declaration order in
an existing atomic batch, whose contextual validation happens at the enclosing
boundary. Missing final dependencies still reject and roll back. See the
[decision](../../../decisions/engine/assembled-delta-validation.md).

## Verification

`npm run verify`: **exit 0** on the measured clean commit. 254 Vitest tests / 32
files; all ten configured TypeScript projects; Studio production build; 21 IR
manifest fixtures; 29 operations acceptance tests; generated capability index
freshness. Existing large-bundle warning remains informational. Historical full
Lottie certification and performance benchmarks were not rerun; the relevant
Lottie round-trip/dataset regressions are included in the full test suite.

Focused coverage adds accepted/queued cross-unit and candidate-local references,
root missing-parent/cycle rejection, duplicate IDs, cumulative writer/node limits,
malformed targets/payloads/headers, seal rollback, boundary steps/scoped writer
time, frozen bases, completion, caller mutation and disposal. Compiler tests cover
forward references inside a dependency-complete batch and unresolved-batch rollback.

## Tracking limitation and continuation

The claim is recorded on #20. GitHub denied the Project In progress mutation:
`Resource not accessible by integration (updateProjectV2ItemFieldValue)`.
Project transitions must be reconciled by an identity with Project write access;
no successful transition is claimed. Issue/PR handover owns final merge state.
No deployment or package publication. E002 remains the next direction; E003's
validation-fact cache is deliberately outside this fix.
