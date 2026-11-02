# Model-facing MotionScript authoring reference

P006 generates a compact, versioned snapshot for model generation from released
authorities only. See [model-facing reference contract](../../contracts/model-facing-reference.md).

| Path | Role |
| --- | --- |
| `current.json` | Mutable pointer to the active snapshot + authority fingerprint |
| `snapshots/<releaseId>-<fingerprint8>.md` | Immutable Markdown snapshot |
| `snapshots/<releaseId>-<fingerprint8>.json` | Immutable metadata sibling |

Commands (repo root):

```sh
npm run reference:generate   # write new snapshot + update current.json
npm run reference:check      # refuse stale/tampered pointer or drifting fixtures
```

Do not edit snapshot Markdown by hand. When authorities change, regenerate.
Preserve prior snapshot files; only `current.json` moves forward.
