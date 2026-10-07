# Lottie fidelity loop

You are working in the generative-visual-runtime repository. Repeat the loop below until the declared Lottie profile passes, or until you must stop with a blocker or a design escalation. MotionScript remains the authoritative language. Lottie is an importer into Scene IR. A construct Lottie can express is added to Scene IR and MotionScript, then lowered. There is no V1 ceiling.

Read before the first edit, and again after any language change:

1. `AGENTS.md`
2. `packages/schema/capabilities/releases.json`
3. The current MotionScript and Scene IR version files named there
4. `docs/languages/compatibility-policy.md`
5. `packages/schema/capabilities/registry.json`
6. `docs/evaluations/README.md`

Do not edit `docs/evaluations/2026-10-07-baseline/` or any older run. Do not commit or push unless the operator asked. Do not widen numeric, color, or pixel tolerances to obtain a pass. Do not claim a fixture passed when production `importSource` rejected it.

Published version files are immutable. Record in-progress language work in `docs/languages/motionscript/versions/pending.md` and `docs/languages/scene-ir/versions/pending.md`. An importer-only correction does not bump MotionScript or Scene IR. A new node, paint, track, operator, or render scope does. Below 1.0, a minor bump is the breaking boundary. A 0.1 reader still rejects a newer wire version. A newer reader loads older scenes only through the documented migration. Older programs keep their old sampling rules.

Package `version` fields stay independent of language versions. Wire strings change only when a version file says so.

## Declared profile

The profile is every Lottie construct in the corpus that can be represented with nodes, paints, tracks, operators, timing scopes, and render scopes.

In scope, and not a design stop: path morph, mattes, masks, animated paint, gradient strokes, repeaters, merge paths, skew, auto-orient, text animators, images, precomps, trim, rounded rectangles, spatial curves, cubic and hold easing.

Out of scope until a person decides: loops and function declarations. Those change the execution model. Stop and write a design escalation. Do not invent a silent approximation of them.

## Budgets

- At most three implementation attempts for one root cause.
- At most eight implement cycles in one invocation.
- If two attempts in a row do not change the corpus counts or the visual diff for that cause, stop that cause.
- If the reference player fails to draw the source, stop that fixture and record the reference as unreliable.

When a budget is hit, write the continuation note described under Stop and end the invocation.

## Success

The profile passes only when all of these are true for every in-scope corpus fixture:

- Production import returns a scene. Status is `exact`. Counts of unsupported, dropped, and approximated are zero for in-scope semantics.
- Emit, then compile, then evaluate, matches the imported scene at time 0, at each key boundary, at each segment midpoint, and at the duration.
- Number error is at most `0.001`. Color error is at most `1/255`.
- Against lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, background `#101014`, the finite frame window agrees inside the documented pixel tolerance. “Every frame exact” means that checked fidelity, not identical pixels across rasterisers.
- `npm test` and `npm run typecheck` pass.
- No earlier exact fixture regresses.
- `packages/schema/src/registry.test.ts` passes.

LOT-03 stays quarantined while its source is over the production 512 KiB ceiling. A diagnostic parse above that ceiling is not a pass. Raising the ceiling is a recorded policy change in the registry and the compatibility policy, done in its own cycle, not a quiet edit during a feature cycle.

## Stage 1 — Baseline

1. Create `docs/evaluations/<run-id>/loop.json` for this invocation. `run-id` is the UTC timestamp `YYYY-MM-DDTHHMMSSZ`. Do not reuse an existing directory.
2. Pin the implementation:
   - `git rev-parse HEAD` and `git status --short`. If there is no commit, write that.
   - Current MotionScript and Scene IR versions and wire strings from `releases.json`.
   - Package versions of `@gvr/schema`, `@gvr/compiler`, `@gvr/runtime`, `@gvr/canvas-renderer`, `@gvr/motionscript-emitter`, `@gvr/format-lottie`, `@gvr/format-import-core`.
3. Pin the corpus. Sources are the files copied by `evaluation/harness/run-pipeline.ts`. For each fixture record id, path, byte length, and SHA-256. Do not edit the source bytes.
4. Pin the reference player: lottie-web 5.13.0, `goToAndStop(frame, true)`, DPR 1, Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Pin comparison tolerances: number `0.001`, color `1/255`, and the pixel tolerance already used by the harness. Copy those numbers into `loop.json`. Do not invent a looser number.
5. Run, from the repository root:

```bash
npx tsx evaluation/harness/run-pipeline.ts
```

Scratch output lands in `evaluation/evidence/`. That directory is not the historical record.

6. Write `docs/evaluations/<run-id>/manifest.json` with the pins above, the fixture hashes, and `"comparedWith": "2026-10-07-baseline"`.

## Stage 2 — Diagnose

1. Read `evaluation/evidence/results.json` and each fixture import report. Group diagnostics by root cause, not by fixture. A root cause is one missing representation: for example “animated path morph”, “track matte”, “gradient stroke”, “track start outside duration”.
2. Separate:
   - `unsupported` and `dropped` semantics
   - `approximate` semantics
   - validation failures that discard the scene (`IMPORT_INVALID_IR`, size ceiling, node or depth ceiling)
   - visual mismatches where the report is already `exact`
   - empty `tracks` and `steps`, which leave Play disabled even when a still draws
3. Rank causes by how many fixtures they block, then by whether they leave the scene unplayable or invalid.
4. Choose one cause. Write it into `loop.json` with `attempts: 0` and the fixture ids it affects.
5. If that cause is loops or function declarations, skip Implement and go to Stop with a design escalation.
6. If the reference frames for every affected fixture are empty because lottie-web threw, go to Stop for that cause with `reference: unreliable`.

## Stage 3 — Implement

One cause only. Increment `attempts` before editing.

1. Add the smallest Scene IR and MotionScript representation that makes the cause exact for its stated scope. Scope is the variation present in the affected fixtures, written in the registry. It is not a claim about every Lottie variation.
2. Implement it through schema, compiler, runtime, canvas renderer, and emitter, then lower it in `@gvr/format-lottie`.
3. In the same change:
   - Add or update the capability in `packages/schema/capabilities/registry.json` with id, introduction version, targets, restrictions, compiler/runtime/renderer support, Lottie and SVG mappings, and conformance test ids.
   - Mark Lottie `exact` only for the stated scope, and only with a test that fails if the behaviour regresses. Leave other variations `untested` or `unsupported` with their own scope.
   - If syntax or sampling changed, record the ids in both `pending.md` files. Do not edit `0.1.0.md` or `0.2.0.md`. Do not move `releases.json` current pointers unless you are publishing a release the operator asked for.
   - If the change is importer-only, leave the language versions untouched and still update the Lottie mapping and its test.
4. Add a conformance test named in the registry. Assert samples at boundaries and midpoints, not only that a diagnostic string disappeared.
5. Keep 0.1 scenes on the migration path. Do not change their samples.

Do not start a second cause in this attempt.

## Stage 4 — Verify

1. Run the new test, then:

```bash
npm test
npm run typecheck
```

2. Re-import each affected fixture through production `importSource` with the default limits. Record status, counts, whether a scene exists, track count, and round-trip sample errors.
3. Re-import one previously `exact` fixture that this change could touch. A new unsupported or a sample drift is a regression. Revert the attempt’s behaviour and count it as a failed attempt.
4. If tests fail or the cause’s counts did not improve, return to Implement if attempts are below three. If the measurement is unchanged from the previous attempt, stop the cause.
5. Corpus gate, from the repository root:

```bash
npx tsx evaluation/harness/run-pipeline.ts
```

Confirm the affected fixtures improved and no previously exact fixture moved to partial, failed, or a larger visual diff. Then run the browser capture when the machine has Chrome:

```bash
npx tsx evaluation/harness/drive-browser.ts
```

`drive-browser.ts` uses Vite on `127.0.0.1:5199` and Chrome remote debugging on port 9333. If Chrome or the reference player cannot start, record the visual stage as not run. Do not treat that as a pass.

## Stage 5 — Re-evaluate

1. Copy the scratch tree into the run directory:

   - `evaluation/evidence/` → `docs/evaluations/<run-id>/evidence/`
   - `evaluation/evidence/results.json` → `docs/evaluations/<run-id>/results.json`

2. Write `docs/evaluations/<run-id>/report.md`. Include the pins, the cause attempted, attempt count, before-and-after counts against `2026-10-07-baseline`, and the fixtures that are now exact. State that the report describes this revision only.
3. Add a row to `docs/evaluations/README.md` pointing at this run as the newest measurement. Do not rewrite older rows.
4. If the declared profile is not yet a pass, return to Diagnose and choose the next cause. Keep the same `loop.json`.

## Stage 6 — Stop

Write `docs/evaluations/<run-id>/stop.json` and a short section at the top of `report.md` with one of:

- `success` — every in-scope fixture meets the success list. Quote the counts and the sample times.
- `blocker` — three attempts produced no improvement, the reference player is unreliable, or a budget was spent. Include the cause, the attempts, the last counts, and the evidence paths.
- `design-escalation` — the next cause is loops or function declarations. Include the fixture ids and the language feature required. Do not implement it.

End the invocation after Stop. The next invocation starts at Baseline, compares with the newest run, and does not reopen a cause already marked blocker or design-escalation unless the operator names it.
