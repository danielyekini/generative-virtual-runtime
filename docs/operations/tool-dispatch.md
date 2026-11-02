# Dispatch with connected GitHub tools

Use this path when the runtime has GitHub issue/comment tools and an authorised
signed-in Project browser, but cannot use the GitHub CLI. The CLI path remains
available. Both paths use the same route, intake receipt, selection and recovery
logic in `gh_context.py`. Never export browser credentials or call hidden browser
APIs. This is logical context separation, not a security boundary.

## Acquire current observations

Generate a session UUID as usual. Read the configured repository and Project;
verify the repository's stable numeric ID through its GitHub tool. In the Project
temporarily clear the filter and turn off Show hierarchy, scroll through the
whole table, then Export view data. These are unsaved inspection changes: restore
the saved filter and hierarchy afterwards. Do not overwrite a user's saved view.

Acquisition belongs to the router utility: assemble API payloads in code-mode
orchestration and write them directly to transient files without printing raw
mail into worker context. Surface only route/context output. Only the owning
orchestrator reads request bodies through inbox mode.

Read exported issues through the issue API tools, including full state,
state reason, body, labels and update time. Prefer the connected GitHub reader's
approved REST issue collection: `/repos/<repository>/issues?state=all&per_page=100&page=1`.
Increment page until a response has fewer than 100 entries, exclude pull requests,
and derive open `kind:request` issues from the complete result. Re-read after writes.
The connected recent-issues API is an alternative when the collection reader is
unavailable. It
transparently paginates; increase its result limit until the response contains
fewer issues than that limit, then filter the complete result to this repository.
Use it for **repository-wide** open `kind:request` discovery, including requests
absent from the Project. GitHub search can lag new/updated requests; search alone
and snippets with null metadata are insufficient. If the feed cannot be exhausted,
use an authorised paginated REST reader or stop with an explicit intake blocker.
Read comments from both clock issues and from every
own-lane In progress issue and any issue selected for the next claim. Read the
selected comments again if new selection requires them.

An exported table can omit an existing membership because of Project indexing.
Resolve every configured missing issue through its live issue sidebar: confirm
the exact configured Project and expand all five routing fields. Add a row with
the same export headers and actual observed values. If membership or a field
cannot be verified, stop and reconcile it; never derive values from seeds or
labels. Preserve unrelated Project members and their fields.

Keep observations only in ignored `work/ops`. Create a readback JSON object:

```json
{
  "observed_at": "<UTC timestamp of the earliest observation in this batch>",
  "issues": ["<full issue API objects, including unrelated exported members>"],
  "requests": ["<full objects from the exhaustive open-request discovery>"],
  "comments": {"57": [], "58": [], "20": ["<actual comment objects>"]}
}
```

The array strings above describe required objects, not literal data. GitHub's
`issue_number`/`number`, issue `html_url`, and comment `url`/`html_url` spellings are supported. An
explicit empty comments array means the API returned no comments; a missing key
means unread, and blocks context. Extra membership rows use `URL`, `Status`,
`Workstream`, `Kind`, `Priority` and `Queue order` as export headers.

```sh
python3 tools/gvr-ops/tool_source.py --board work/ops/project.tsv \
  --readbacks work/ops/readbacks.json --extra-memberships work/ops/missing.json \
  --output work/ops/live.json
python3 tools/gvr-ops/gh_context.py --lane engine --mode route \
  --tool-snapshot work/ops/live.json --session-id <generated-uuid> \
  --receipt work/ops/<generated-uuid>-intake.json
```

Omit `--extra-memberships` when no memberships are omitted. Use `product` for
that lane. Pass the same `--tool-snapshot`, session UUID and receipt to context,
inbox and intake-receipt modes. Only the owning orchestrator may read inbox or
acknowledge intake, after actual disposition/reassessment.

Observations expire after ten minutes; future timestamps, conflicting authority,
duplicate keys, missing configured memberships/fields/clocks and incomplete
requests fail closed. Reacquire at checkpoints and before claims or writes;
never retimestamp old data. Recheck the live claim and dependencies through the
tools immediately before mutation. The snapshot is a transport batch, never a
persistent queue, handover or proof of a successful write. Read every write back
through the authorised GitHub tool or a refreshed Project UI.

Keep raw mail inside the owning orchestrator pass. Normal worker output includes
only route flags, selected own-lane work, relevant handover and context paths.
The normal claim/concurrency, independent clock and full Git/test rules apply.
