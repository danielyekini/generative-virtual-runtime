# P006 native MotionScript authoring reference

Status/date/owner/work item: adopted, 2 November 2026, Product, [P006 #47](https://github.com/danielyekini/generative-virtual-runtime/issues/47).

## Decision

Ship a generated, versioned model-facing reference under
`docs/reference/motionscript-authoring/`, produced by `tools/native-reference`
from the E006 [model-facing reference contract](../../contracts/model-facing-reference.md).
Immutable snapshots carry authority SHA-256 hashes and a UTF-16÷4 token estimate
(explicitly not provider tokenization). `current.json` is the only mutable
pointer; `npm run reference:check` (part of `npm run verify`) refuses stale or
tampered authorities.

## Alternatives considered

1. Hand-maintained Markdown reference — rejected; drifts from grammar/registry.
2. Dump full EBNF + every decision doc into the prompt — rejected; token waste
   and roadmap leakage.
3. Generated compact snapshot from released authorities only (chosen).

## Consequences

Regenerate after Motionscript/Scene IR, registry, grammar, stream linter or
streaming fixture changes. Do not hand-edit snapshot files. Unsupported and
untested registry rows stay listed as unavailable / not generation-ready.
