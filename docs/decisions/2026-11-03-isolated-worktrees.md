# Isolated git worktrees for concurrent agents

Status: adopted user steering, 3 November 2026. Applies to Engine, Product and
ops runs that edit the repository.

## Decision

Every agent run that mutates the repo must work in its **own git worktree** (or
an equivalent dedicated checkout) bound to its issue branch. Sharing one working
tree across concurrent agents is forbidden: branch switches and mixed unstaged
edits overwrite in-flight work.

## Context

During P019, a second agent changed the primary checkout underneath an active
product run. Recovering the Generate-mode WIP required extracting paths into
`generative-visual-runtime-p019`. User instruction: future agents must use
isolated worktrees; record that in git instructions via direction-change.

## Consequences

- [git.md](../operations/git.md), [run.md](../operations/run.md) and root
  [AGENTS.md](../../AGENTS.md) require worktree isolation before edits.
- Claim comments still name the branch; the worktree path may be noted in the
  handover when useful.
- After merge, delete only that agent's own merged remote/local branch and its
  worktree when clean — never another agent's tree.
- Vision, language contracts and lane roadmaps are unchanged.

## Amendment — mandatory cleanup (user steering, 3 November 2026)

Undeleted worktrees after merge repeatedly exhausted host disk (~multi‑GB each
via evaluation assets / installs). **Post-merge worktree removal is mandatory
in the same session** and is part of Done. Concrete steps live in
[git.md § Merge and cleanup](../operations/git.md). Skills and AGENTS.md restate
the duty so workers cannot treat branch deletion alone as sufficient.
