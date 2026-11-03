# Next-corpus preparation stub (P008 / #88)

Bounded input manifest sketch — not a live corpus and not commissioned generation.

## Pins

- MotionScript / Scene IR: current entries in `packages/schema/capabilities/releases.json`
- Authoring reference: `docs/reference/motionscript-authoring/current.json`
- Generation model (if used): Ollama `qwen2.5-coder:14b` (direct approach default)
- Functionality sources: `docs/workstreams/product/functionality.md`,
  `docs/workstreams/product/future-functionality.md`

## Ownership

- **Product:** prompts/threads, expected production response and canvas state per
  turn, director-script intent validation, unsupported expectations called out.
- **Engine:** native MotionScript for accepted scripts; friction/reimplementation
  evidence; capability work from grouped pain points.

## Coverage to include when a corpus is authorised

1. Single-turn realistic prompts (established capabilities only).
2. Multi-turn persistent canvas edits (add/change/remove while preserving unrelated state).
3. Continuing independent loops.
4. Extended explanations with follow-ups.
5. Architectural micro-prompts.
6. Explicit unsupported expectations (future-functionality rows) marked as such.

## Verification criteria (per prompt/thread)

- Expected response text and canvas state after each turn.
- Compile/runtime offlineOk (and progressiveOk when seals are required).
- Renderer spot-check for visible semantics where claimed.
- No silent promotion of experimental programs to preferred library pointers.

## Stop

Do not start corpus generation from this stub alone. Requires an explicit Ready
corpus task after Studio priorities allow.
