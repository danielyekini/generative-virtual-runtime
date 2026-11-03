# P019 Studio Generate mode — run 45C6253C-7608-4D4C-A735-99DB499B060E

- **Issue:** [P019 #139](https://github.com/danielyekini/generative-virtual-runtime/issues/139)
- **Branch / worktree:** `product/139-studio-generate-mode` at `generative-visual-runtime-p019`
- **Outcome:** Studio Generate mode per confirmed studio-ux (header Generate; full-height side panel transcript + composer; Approach/model in-field; Director default; bubble detail + director view; bottom dock truncated to canvas column).
- **Harness reuse:** `tools/native-generation` pipeline (+ progress callbacks); browser Ollama via Vite `/ollama` proxy; P006 authoring reference bundled at build time; model pin `qwen2.5-coder:14b`.
- **Gates:** `npm run verify` pass; `npm run smoke:studio` 115/115 (Generate placement/layout/defaults covered). Live Ollama quality is for human judgment, not this gate.
- **Out of scope:** push-to-talk (P009); live ElevenLabs.
