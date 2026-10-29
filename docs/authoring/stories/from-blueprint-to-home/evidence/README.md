# Verification — 2026-10-29

Base: `7f1e95b276d3ac9d459d45297d95dfae588a77fa`. Node v24.19.0. Production CanvasRenderer in Chromium 151.0.7922.173 (Debian 13), logical viewport 1280 × 720, DPR 1. Browser details and capture times: [renderer.json](renderer.json). One measured builder run, without warm-up or statistical latency claims: [measurements.json](measurements.json). `builderMs` includes generation, compilation, validation and draw-item assertions; `totalWithPreviewsMs` also includes browser setup and PNG capture, excluding the CLI/tsx startup overhead.

Regenerate from the repository root:

```sh
GVR_PREVIEW_DIR=work/home-preview npx tsx fixtures/motionscript/stories/build-from-blueprint-to-home.ts
```

No preview files are written without that environment variable. Browser setup uses the existing evaluation Chromium resolver and CDP client. It renders the compiled Scene IR, not an SVG representation. The builder performs a 0.25-second visible-path framing sweep, wall/blueprint base alignment, window-opening and central-circulation gap checks, roof rigidity and timing checks, room-containment checks and final blueprint-opacity checks. Successful compile and IR validation have no diagnostics. These assertions and visual inspection are local story checks, not a source-fidelity certification or a full-frame video gate.

All 39 final PNGs were inspected in [contact-1.png](contact-1.png), [contact-2.png](contact-2.png), [contact-3.png](contact-3.png) and [contact-4.png](contact-4.png). Times, in seconds: 0, 1, 2, 2.75, 3.5, 4.9, 5, 6, 7, 8, 9, 10, 11, 12, 12.75, 13.5, 14.25, 15, 16, 17, 18, 19, 20, 21, 21.5, 22, 23, 24, 24.6, 25, 25.6, 26, 26.6, 27, 27.6, 28, 28.3, 29 and 30. The 12s, 28.3s and 30s frames were also inspected at full size. The 12s full-size inspection preceded the final higher-tilt/label placement refinement; the final 12s frame was subsequently reviewed in the regenerated contact sheet. The final 30s frame was inspected full size after that refinement. No continuous-motion perceptual review was performed.

## Required repository checks

| Command | Story working tree | Clean base worktree |
| --- | --- | --- |
| `npm run typecheck` | FAIL: 12 errors in existing Clockwork, Counter, Crane and Moon builders; zero errors in new files | FAIL: the same 12 errors; output byte-identical |
| `npx vitest run` | FAIL: 201 pass, 1 fail, 25 files pass, 1 file fails | FAIL: 201 pass, 1 fail, same failing test |
| Story builder | PASS, including resource limits and runtime assertions | Not applicable: new story |
| `git diff --check` | PASS | Not applicable |

Typecheck evidence: [working tree](typecheck.txt), [base](base-typecheck.txt). Test evidence: [working tree](vitest.txt), [base](base-vitest.txt). The failing test is `packages/schema/src/validate.test.ts`, “accepts the valid IR and rejects every required fault”: `fixtures/ir/invalid/duration-limit.json` no longer produces the expected fault. The base comparison used a detached worktree at the exact base commit, sharing installed dependencies, and removed it afterward. Unrelated baseline failures were left unchanged.
