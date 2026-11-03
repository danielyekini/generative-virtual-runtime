# P024: Keep the 14B pin; unload and a held-out lighter tag are the experiments

Status/date/owner/work item: Product investigation, 3 November 2026,
[P024 #167](https://github.com/danielyekini/generative-virtual-runtime/issues/167).
Does not supersede the [P007 pin](2026-11-02-p007-provider-pin.md).

## Requirement and scope

Studio Generate and the native-generation harness pin local Ollama
`qwen2.5-coder:14b`. The host has been hitting a full disk during agent
worktrees and verification. This item documents how that model is loaded and
served, compares the bounded options named on the issue, and names follow-up
experiments. It does not change the product default, pull another model, or
start the daemon.

## Current load and serve path

1. Studio pins `STUDIO_GENERATE_MODEL` (`qwen2.5-coder:14b`) in
   `app/playground/src/player/generate-reference.ts`.
2. `StudioOllamaGenerator` (`app/playground/src/player/studio-ollama.ts`)
   POSTs streaming `/api/chat` to the same-origin base `/ollama`. The JSON
   body sets `model`, `stream`, `messages`, and `options.temperature`. It
   does not set `keep_alive`.
3. Vite dev and preview proxy `/ollama` to `http://127.0.0.1:11434`
   (`app/playground/vite.config.ts`) so the browser avoids CORS. The proxy
   does not cache weights.
4. The CLI adapter (`tools/native-generation/ollama-adapter.ts`) calls the
   same `/api/chat` shape on `OLLAMA_HOST` (default `http://127.0.0.1:11434`)
   with `GVR_LLM_MODEL` or `PINNED_OLLAMA_MODEL`. It also omits `keep_alive`.
5. Availability is `GET /api/tags` with a 2 second timeout. That lists
   installed tags. It does not load weights.
6. Weights live in the user Ollama store (`~/.ollama/models`), outside the
   git worktree. Worktrees do not copy them.

Omitting `keep_alive` leaves the daemon default. Ollama's chat API uses that
field for how long the model stays loaded after the request, and documents
5 minutes as the default and `0` as unload when the request ends. This run
did not read the default back from a live daemon: `ollama` 0.40.14 warned it
could not connect, and `ollama ps` was empty.

## Evidence (this host, 3 November 2026)

Measured on the machine running the product session. Free space moved during
the session, so both readings are recorded.

| Observation | Result |
| --- | --- |
| RAM | `hw.memsize` 25769803776 (24 GiB) |
| Swap while Ollama was stopped | 18432 MB total, 17151.25 MB used |
| Data volume, first reading | 460 GiB, 414 GiB used, 3.9 GiB available, 100% |
| Data volume, just before this worktree | 22 GiB available, 96% |
| Data volume, after this worktree checkout | 19 GiB available |
| Installed tags | only `qwen2.5-coder:14b` (`9ec8897f747e`), Ollama size 9.0 GB |
| `~/.ollama` | 8.4 GiB (`du -sh`), one weight blob of 8988110784 bytes |
| Ollama config blob | GGUF, family `qwen2`, type `14.8B`, file type `Q4_K_M` |
| GGUF metadata | `Qwen2.5 Coder 14B Instruct`, context 32768, 48 blocks, embedding 5120, `general.file_type` 15 (Q4_K_M) |
| Primary checkout | `docs` 2.6 GiB, `.git` 961 MiB, `node_modules` 85 MiB |
| Other worktrees present | three engine trees, about 2.7–2.8 GiB each; weights not inside them |

The 14B pin is already the common Q4_K_M quant, not a full-precision or Q8
copy. The on-disk cost is one shared blob. The repeated cost of another
worktree is the checkout, especially `docs/evaluations`, plus install and
build scratch on the same volume. Swap was already ~17 GiB with the daemon
stopped, so loading this model (weights plus KV cache) on a 24 GiB machine
competes with an already swapping host. That is the hardware coupling. It is
not per-worktree model duplication.

This run did not call `/api/chat` and did not pull a second tag. Starting a
9 GB resident set, or downloading another multi-gigabyte tag, was outside the
investigation and unsafe while free space and swap were this tight.

## Alternatives

Strongest current-system option: keep the pin and the single `~/.ollama`
store; ask the existing chat request to unload when the turn ends.

| Option | Disk | RAM | Quality | Verdict |
| --- | --- | --- | --- | --- |
| Keep 14B Q4_K_M, shared `~/.ollama` | One 8.4 GiB blob, already shared across worktrees | Resident only while the daemon holds it | Current pin | Keep. No new cache work |
| `keep_alive: 0` after each turn | Blob unchanged | Drops the resident set when the request ends; next turn pays a cold load | Same weights | Experiment [P032 #234](https://github.com/danielyekini/generative-virtual-runtime/issues/234) |
| Lighter official tag, override only | Second blob until deleted; pull only with a clear free-space margin | Smaller resident set | Unknown until a human judges the P020 pack | Experiment [P033 #235](https://github.com/danielyekini/generative-virtual-runtime/issues/235). Do not change the default here |
| Further quant of the same 14B | Another download; current file is already Q4_K_M | Modest | Same class of risk as a lighter tag | Not a separate experiment |
| Docker-isolated model server | Extra image and volume on the same disk | Similar resident set | Same weights | Rejected on this host |
| Different runtime (MLX, direct llama.cpp) | Second copy or a replacement of a working GGUF host | Unmeasured | Unmeasured | Rejected until unload and the lighter tag have a result |
| Remote Ollama host | Moves the blob off this machine | Moves the resident set off this machine | Same if the tag matches | CLI already honours `OLLAMA_HOST`. Studio's proxy is loopback. Defer until another machine exists |

## Decision

Leave `STUDIO_GENERATE_MODEL` and `PINNED_OLLAMA_MODEL` on
`qwen2.5-coder:14b`. Do not pull, retag, or switch the default without a
later decision that includes human animation-quality judgment.

Ship two follow-ups, neither of which is Ready ahead of P021:

1. **P032** — send `keep_alive: 0` from Studio and the CLI adapter. Acceptance
   is a still-successful stream, cancellation unchanged, model id unchanged,
   and a live `ollama ps` empty after the turn when the daemon can be started
   safely. Record RSS before, during, and after. The on-disk blob must stay
   one copy.
2. **P033** — one smaller official tag, starting with `qwen2.5-coder:7b`,
   held out against the P020 pack. Stop before `ollama pull` unless free
   space exceeds that tag's size plus several GiB. One tag per run. Human
   animation quality decides; pass rate and latency do not. Delete the extra
   tag if the volume is tight.

Finding, not part of those experiments:
[P034 #236](https://github.com/danielyekini/generative-virtual-runtime/issues/236)
records that evaluation checkouts, not model copies, are the per-worktree
disk multiplier. Do not delete another agent's worktree from that idea.

## Failure, streaming, compatibility, cancellation, ownership

- A `keep_alive` value must not apply until the HTTP request finishes. P032
  fails closed if chat starts erroring or the stream no longer completes.
- Streaming stays Ollama NDJSON `/api/chat`. No MotionScript or Scene IR
  change, so no language version bump.
- Cancellation already aborts `fetch`. P032 must still unload after an abort,
  and must not race a follow-up turn into a forced reload mid-token.
- Product owns the Studio client and the generation adapter. No engine host
  contract moves. A remote Studio proxy, if a second machine appears, is a
  later product host setting, not an engine request.
- Resource split: the 8.4 GiB blob is a decoded-weight store outside the
  repo; worktree disk is checkout bytes; RAM/swap is the resident model plus
  everything else already on the machine. Unload addresses only the resident
  set.

## Acceptance and revisit

This investigation is accepted when the path, the measurements above, and the
two experiments are recorded and the pin is unchanged. Live load numbers are
intentionally absent.

Revisit when P032 shows the daemon still holding memory after `keep_alive: 0`,
when P033's human judgment passes or fails, or when a second machine exists
for a remote host. Revisit P034 only as an ops decision about checkout bytes.
