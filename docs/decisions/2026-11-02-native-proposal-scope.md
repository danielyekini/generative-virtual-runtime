# Native proposal scope; legacy draft obligations retired

Status: adopted user steering, 2 November 2026. Joint Engine/Product direction;
implementation: [OPS005 #82](https://github.com/danielyekini/generative-virtual-runtime/issues/82).

## Requirement and existing authority

The user says Lottie work is no longer relevant to current direction and asks
how to prevent old proposals from driving it. The charter, authority map and
compatibility policy already subordinate legacy fidelity work to current scope.
However, both editable pending files still said to land every listed construct
and bundled a Lottie-derived fill proposal with adapter lowering and external
source/direct/compiled evidence. Those instructions could be mistaken for work.

## Decision

Replace the imperative candidate-list wording and retire the Lottie-specific
obligations from both active drafts. Native animated paint remains a candidate
owned by [E009 #28](https://github.com/danielyekini/generative-virtual-runtime/issues/28),
with scope selected through its live issue, native conformance and normal release
gates. This does not choose syntax, enable a capability or authorise a release.

Do not infer proactive adapter expansion, conversion or fidelity campaigns from
unsupported registry rows, old proposals or historical failures. A fresh explicit
user request is required. Existing supported utilities/tests remain, as does the
separately confirmed [P004 #45](https://github.com/danielyekini/generative-virtual-runtime/issues/45)
Split-mode UX using existing importers; it grants no new adapter coverage.

## Alternatives and preservation

- Deleting whole pending files would lose unrelated native candidates and an
  unresolved spatial-representation audit. Keep those files and their other content.
- Moving a copy into a "restricted" folder would add another proposal copy and
  no actual access boundary. Use authority/context rules rather than a false ACL.
- Keep active drafts native-scoped and use Git history for provenance. This
  removes live instructions without erasing the original rationale or results.

Original duplicated wording is preserved at the pre-change main revision:
[MotionScript](https://github.com/danielyekini/generative-virtual-runtime/blob/f8bc631b22ce6cc180b0071af695ffe772a90219/docs/languages/motionscript/versions/pending.md#animated-solid-fill-colour-proposal-not-implemented-or-released)
and [Scene IR](https://github.com/danielyekini/generative-virtual-runtime/blob/f8bc631b22ce6cc180b0071af695ffe772a90219/docs/languages/scene-ir/versions/pending.md#animated-solid-fill-colour-proposal-not-implemented-or-released).
Historical evaluations, source/program bytes, published releases, registry support
claims and the spatial audit are unchanged. No language/package bump is warranted.

## Verification and revisit

Check that both pending files defer to live native scope and no longer mandate
adapter lowering or external-format fidelity evidence. Verify relative links and
preservation of unrelated sections/releases, then run the full repository gate.
Notify both orchestrators through their inbox requests and clarify E009 scope;
administration advances neither implementation clock. Revisit legacy expansion
only after a fresh explicit user request and a bounded, separately scoped issue.
