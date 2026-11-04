# Session protocol

## Stage boundaries

Director = user-facing meaning and presentation. Inputs are its pinned skill and user/director conversation history. It never fetches runtime state. Implementer = reconciliation, native source and evidence. Coordinator = context routing, storage, checks, review and packaging. Do not give the director this protocol as part of its system prompt.

An external implementation agent may run the whole workflow with isolated role calls, or coordinate specialist agents when available. Independence claims require actual isolation. A single shared-context agent is a useful simulation but cannot establish absence of context leakage.

## Files

session.json: packaging manifest using templates/session.json.
system-prompts/: frozen exact prompt files; store both files even if a built-in skill is used.
turns/001/user.txt, director-script.json, program.ms, proposals.md, implementation.zip, verification.json, review.md.
conversation-only turns omit program/proposals/implementation.zip, retaining director and review.
Failed attempts go under turns/001/attempts/; status records must identify the accepted attempt.
context/001/: implementation input manifest, base-source hash, runtime-state capture if available, asset references. Do not store secrets or full environment dumps.
review/final-review.md: intent findings and cross-turn analysis, including untested claims.

## Provenance

Record prompt hashes, repository commit, language releases, actual model identifiers if exposed, and per-stage wall times when measured. Use null only in the session manifest for unavailable measurements; do not invent transcript metrics. Hash exact source bytes and inspected captures. Distinguish compiler pass, rendered evidence, interaction evidence, intent quality and delivery success.

The latest verified base is a coordinator pointer. Do not resolve an update using merely the latest generated file if its validation failed. Retain unchanged programs for conversational turns without duplicating them into transcript assistant turns.

## Validation and failure

Use the pinned director skill for exact conditional validation; the packaging helper checks only basic director routing and transcript structure. It is not a full director-schema validator. Run the repository parseGvrTranscript against the packaged transcript using repository tooling before claiming import compatibility. Check that Studio can load applicable programs when available. Playback cues require a preceding user turn and nonempty assistant motionScript.

Unsupported gestures, responsive layout, sound or spatial transitions must be visible in implementation evidence. Do not add production capability-gap fields to director output. Reconciliation may request a user-facing semantic clarification through the coordinator; it must not demand runtime IDs from the user. Record this as a simulation event, not a certified existing host API.

## Close

Set closed=true, record closedAt, complete final review, then run:
python tools/package_session.py /absolute/session/folder /absolute/destination/conversation.zip

The helper rejects unclosed sessions, missing visual-turn artifacts and inconsistent successful turn pairings. It preserves exact director text in transcript fields and records file hashes. It does not compile or render MotionScript. Review README warnings before using a partially verified archive for evaluation.

## Optional human rendering feedback

When a user supplies rendering/interaction feedback, preserve it with scene/source and turn references using ../gvr-director-research/HUMAN-ASSESSMENT-PROTOCOL.md. Record unknown playback/device details as unknown. Human assessment is the primary perceived-quality signal; keep compiler and functional evidence separate. Do not turn assessment text into a requested design mutation unless the user asks for a revision. Keep active prompt snapshots frozen; propose new variants in the final review.
