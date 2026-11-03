# P024 Ollama serving investigation

Run: `b0b5e1be-fe53-4fd2-baab-e515167ed1fd`. Issue: [#167](https://github.com/danielyekini/generative-virtual-runtime/issues/167).

The pinned Studio and harness model stays `qwen2.5-coder:14b`. On this host it
is one shared GGUF Q4_K_M blob (Ollama reports 9.0 GB; `~/.ollama` is 8.4G)
outside every git worktree. Studio and the CLI adapter reach local Ollama
`/api/chat` and do not set `keep_alive`. The daemon was not running; swap was
already about 17 GiB of 18 GiB on a 24 GiB machine, and free disk moved between
3.9 GiB and 22 GiB during the session. This run did not load the model or pull
another tag.

Decision: [2026-11-03-ollama-serving](../../../decisions/product/2026-11-03-ollama-serving.md).
Follow-ups, all Candidate: [#234](https://github.com/danielyekini/generative-virtual-runtime/issues/234)
unload after Generate, [#235](https://github.com/danielyekini/generative-virtual-runtime/issues/235)
held-out lighter tag with the default unchanged,
[#236](https://github.com/danielyekini/generative-virtual-runtime/issues/236)
evaluation checkout bytes.

Verification (exit 0), after fast-forward onto `1fb49fa`: `npm ci` then
`npm run verify` — 106 Vitest files / 683 tests, typechecks, Studio build, IR
manifest, 33 operations tests, capability reference `ms-0.26.0_sir-0.25.0`.
No language or runtime change.
