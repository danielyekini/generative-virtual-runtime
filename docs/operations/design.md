# Decisions, constraints and bounded experiments

Ordinary implementation choices stay with the implementing agent. Use a decision
record for public semantics, execution model, ownership/revisions, architecture,
cross-lane APIs, consequential UX/navigation, resource policies or external costs.

Before commitment: state requirement and scope; compare at least two plausible
approaches including the strongest existing-language/current-system option;
record evidence/trade-offs; conduct one bounded critical pass against failure
cases, streaming, compatibility, cancellation and future ownership. This can be
a separate reasoning pass by the owner; use a specialist when it adds value,
not a compulsory new reviewer/session. Conclude with chosen scope, acceptance,
alternatives rejected and revisit trigger. A design work item can finish with a
decision/prototype; it must name the resulting implementation item(s).

Investigate existing decisions before replacing them. Record historical numeric
rationale as unknown if evidence is absent. Distinguish total-scene admission,
per-unit buffering, per-frame scheduling, queue backpressure and decoded-resource
limits. Capacity expansion is a goal; neither preserving nor raising every cap
is a default strategy. Benchmark representative rich workloads and scale beyond
them while preserving cancellation and actionable failure.

Research tickets state: question, goal link, budget (normally one run), evidence,
success/failure decision, stop rule and held-out check where appropriate. Two
consecutive non-improving attempts force a new approach, narrow scope or stop.
No unlimited literature or fidelity loop. Cosmetic renaming does not reset attempts.

Put decisions under docs/decisions/<lane>/ with a short index. Keep useful
existing docs/design records and link them; no forced move. Accepted decisions
link to their work item/PR, requirement and code. Supersede with rationale; don't
erase the old record. New language semantics follow version/registry/conformance
rules, but previous general workflows requiring repeated planner/reviewer loops
are replaced by this bounded decision procedure for new work.

Tools: agents may request a UX generator, model endpoint or other missing tool
with the concrete task, intended use, alternatives and why existing tools don't
suffice. Continue independent work. Don't assume a paid service or credentials;
request the smallest actual prerequisite, not broad technical prompting from user.
