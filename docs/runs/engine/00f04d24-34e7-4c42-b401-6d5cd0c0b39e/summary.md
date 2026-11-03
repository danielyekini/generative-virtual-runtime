# Engine run 00f04d24-34e7-4c42-b401-6d5cd0c0b39e

Date: 3 November 2026. Lane: engine. Base: `deff11e`.
Worktree: `gvr-e014`, branch `claude/sharp-hopper-818846`.

## Routing

- **Intake.** One untriaged engine request, [#154](https://github.com/danielyekini/generative-virtual-runtime/issues/154) (isolated worktrees). Accepted with no worker task, because the engine direction already carries the rule. Closed as completed.
- **Review clock.** Only one run since the last review (E039), so no review was due.
- **Replenish.** No engine item was Ready. I promoted E014 [#33](https://github.com/danielyekini/generative-virtual-runtime/issues/33) (M2 decision, dependency E002 done) and claimed it.
- **Tooling limits.** `gh_context.py` could not run. The proxy refuses numeric repository paths and GraphQL, and the Projects v2 REST API is not repository-scoped. I read routing from issue labels, issue bodies and the clock issue through the connected GitHub tools. I did not write Project fields; the intended status is in the issue bodies.

## E014 outcome

Decision: [time-composition.md](../../../decisions/engine/time-composition.md).

- **Cyclic timing scopes.** `period` declares an unbounded loop, and its offset acts as a phase. `period` plus `repeat N` declares a finite repetition, which is not entered before its first cycle and is pinned at the end afterwards. A channel written inside a cycle is owned exclusively by that cycle. Every writer for a cycle must arrive before the cycle's first seal.
- **Timed keys and named beats** replace percentage arithmetic. They are MotionScript-only lowerings to the existing offsets.
- **Gap/hold rule.** The existing rule is now pinned by a conformance test: at a shared boundary the later track owns the instant; in a gap only `fill forwards` holds, otherwise the authored base applies; there is no backwards fill.
- **Rotation** stays unwrapped degrees. Shortest-arc interpolation is rejected; velocity-facing is deferred.
- **Prototype.** `packages/schema/src/cyclic-timing.ts` and its tests. Nothing is on the wire and there is no registry claim.
- **Production-sampler evidence** (`packages/runtime/src/cyclic-timing.test.ts`):
  - City's 442-character `t % 30` van expression matches nine timed keys under a 30s cycle. The worst difference is 0.0510 units, which equals the story's own four-digit coefficient rounding.
  - Circle's seam-crossing fall is one easeIn segment. 0s and 30s sample identically, and velocity is continuous to within 1%.
- **Children:**
  - E043 [#196](https://github.com/danielyekini/generative-virtual-runtime/issues/196): `timing.cyclicScopes`, a MotionScript + Scene IR bump.
  - E044 [#197](https://github.com/danielyekini/generative-virtual-runtime/issues/197): `timing.timedKeys` and beats, MotionScript only.

## Verification

The full `npm run verify` result is recorded in the PR and the issue handover.

## Findings

- **Ops helper incompatible with cloud sessions.** `tools/gvr-ops/gh_context.py` cannot run in Claude Code cloud sessions: numeric-ID repository paths and GraphQL are refused. `docs/operations/config.json` also names the renamed repository `generative-virtual-runtime`, while this session is scoped to `generative-visual-runtime`. Routing therefore fell back to the connected issue tools.
