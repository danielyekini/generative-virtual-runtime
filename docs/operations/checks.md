# Full submission gate

Run `npm ci` on a fresh checkout, then `npm run verify` before opening a run PR.
Repeat verify after any final code or newer-main integration. GitHub Actions runs
that same command for pushes and pull requests; actual branch protection remains
unchanged. Self-merge is conditional on acceptance and remote checks/permissions.

| Command in verify | Coverage |
| --- | --- |
| `npm test` | All Vitest tests in packages and evaluation/harness, per vitest.config.ts |
| `npm run typecheck` | All nine engine packages and evaluation/bench TypeScript projects |
| `npm run build --workspace @gvr/playground` | Entire Studio production build; existing code has no separate UI tsc project |
| `npm run validate-ir -- --manifest fixtures/ir/manifest.json` | Valid/invalid schema fixture expectations |
| `python3 -m unittest discover -s tools/gvr-ops/tests -v` | Independent clocks, intake, resume, queue/dependency and lifecycle acceptance |
| `python3 tools/gvr-ops/current_capabilities.py --check` | Capability index matches actual release/registry inputs |

No repository lint or additional package test/build scripts exist at installation.
`evaluation/package.json` has an unconfigured npm-init test placeholder, not a
hidden test suite; its real harness tests run through root Vitest. Benchmarks,
Chrome captures, historic corpus campaigns and model experiments are conditional
on affected claims and are not silently claimed by this gate. Check the inventory
again when scripts/workspaces change. Never use old passing logs for changed code.

A failed inherited check must be repaired without weakening/omitting it. External
credentials/resources produce an explicit Blocked handover, not a passing result.
See [installation receipt](installation-receipt.md) for measured runs and limitations.
