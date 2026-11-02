# Established functionality and authoring reference

This folder is an entry index, not a second grammar or capability registry.

- Native syntax/IR: release pointers -> published contracts + grammar/schema.
- Support: packages/schema/capabilities/registry.json, scoped tests and evidence.
- Constraints/implementation choices: docs/design/capacity-transactions.md and
  docs/decisions index. Don't assume stale summary numbers are authoritative.
- Performance: latest measured report/handover, not a universal throughput promise.
- Agent operations: docs/operations. Product intention: docs/project.

Installation generates a compact current-capabilities.md with version/status and
direct authority links from current sources. It must not rewrite historical
claims or label planned work supported. Reuse existing reference docs where valid.

The generation-facing native MotionScript reference is a separate versioned
artifact built by P006/E006 from released grammar, capabilities and validated
examples. Include syntax, construction/streaming rules, idioms and repair advice;
exclude roadmap/backlogs and historical design debates. Record source versions/
hashes, required profile, prompt/token budget and generation tests. Block stale
generation references when their authorities change until refreshed/verified.
Never fill an unimplemented feature into the model's reference for convenience.
