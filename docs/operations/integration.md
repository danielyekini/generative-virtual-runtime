# Integration, verification and evidence

Self-created, self-merged PRs are authorised once the owner's acceptance checks
pass. No independent review requirement is imposed by this operating structure.
Honour GitHub protections and actual permissions; do not disable checks, force
merge or invent approvals. Attach issues and clear validation evidence. Rebase/
merge latest main safely, retain newer stories and resolve conflicts in own scope.
When concurrent work changes dependencies, rerun affected integration checks.

Reuse existing run results when source identity, environment and relevant
dependency assumptions hold. New code still needs appropriate current tests.
Do not regenerate evidence merely because a new session started; regenerate
affected evidence for failed/incomplete runs or an invalidated claim. A passing
old test log is not proof that changed code passes. Don't enlarge tolerances or
drop visual requirements to pass. Full Lottie certification is conditional on
making an affected source-fidelity claim, not a tax on all native work.

Keep code, small reports, reproducible commands and source identities in Git.
Use configured CI artifacts/releases/evidence storage for heavy screenshots,
movies/profiles; retain hashes and durable links. Keep original historical
evidence/program revisions in place unless a separately verified migration
preserves identity and links. No enormous snapshots/log copies by habit.

New compact evidence: docs/runs/<lane>/<run-id>/summary.md plus only essential
small machine-readable results. The GitHub issue owns the latest handover and
current execution state. Run summaries are immutable records, not active queues.
Legacy evidence folders remain authoritative for their own measured revisions.

If a milestone requires human judgment, provide a working build/demo, steps and
expected behaviour. Merge preparatory work when appropriate, but leave the
milestone/status honest until that gate passes. No deployment or package
publication is authorised by routine PR merge permission.

## Mandatory submission gate

Follow git.md: full repository tests, typechecks and required builds must pass
before submitting the run PR; fix inherited failures. Rerun the full gate after
final code/integration changes. No compulsory independent review. Verify merge
into main and delete only your own merged remote/local feature branches safely.
