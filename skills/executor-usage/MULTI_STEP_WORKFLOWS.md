# Multi-step Executor workflows

Load this file only when one user request needs dependent reads, parallel reads, pagination, or a cross-system join inside `execute`.

## Decision gate

Use one composed `execute` snippet when all of these hold:

- The workflow is read-only, or the user has already approved every exact write.
- One domain aggregate tool does not already answer the request.
- The script can set a clear call and result bound.
- No user choice is needed between steps.

Return evidence and stop when a result changes the plan, needs user judgment, or would lead to a write.

## Plan before calling

1. Search for the goal, not each guessed endpoint. Look for words such as `summary`, `debug`, `batch`, `status`, or `details` that signal an aggregate tool.
2. Describe every selected tool and inspect its input and output shapes.
3. State the dependency graph in code: sequential calls for dependencies; `Promise.all` for independent reads.
4. Set bounds before execution:
   - At most 5 fan-out calls by default.
   - At most 20 items on the first list page by default.
   - Fetch one page unless the request requires an exhaustive scan.
   - Fetch summaries or log tails before full logs or files.
5. Return a compact synthesis plus IDs or URLs needed for the next step. Do not return large raw intermediate payloads unless the user asked for them.

A caller-specific playbook may set stricter or more exhaustive rules. Follow it instead of these defaults.

## Result and error handling

Executor tools usually return `{ ok: true, data, http? }` or `{ ok: false, error }`. MCP-backed `data` may then contain `structuredContent` or text content blocks.

Use the `unwrap` helper from `SKILL.md` (envelope → `structuredContent` → JSON text).

For fan-out, preserve partial success. Do not throw away four useful results because the fifth failed.

```ts
const settled = await Promise.all(
  selected.map(async item => {
    const result = await tools[detailPath]({ id: item.id });
    return result.ok
      ? { id: item.id, ok: true, data: unwrap(result) }
      : { id: item.id, ok: false, error: result.error };
  })
);
```

Use sequential calls when a later input comes from an earlier result. Use `Promise.all` only when calls are independent and inside the bound.

## Use case: Evergreen patch triage

### Goal

Turn one patch ID into a bounded first-pass diagnosis without sending every task payload through the model.

### Shape

1. Search for a patch-level failure tool.
2. Search for a one-task aggregate such as a debug or triage tool. Prefer it over chaining task status, tests, annotations, and logs yourself.
3. Get the failed task list once.
4. Group obvious duplicates by task name, build variant, or failure detail when the result allows it.
5. Select at most five useful failures, favoring one representative per group.
6. Debug those tasks in parallel.
7. Return the total failure count, inspected tasks, likely groups, evidence, and links or IDs for deeper work.
8. Fetch full test or task logs in a later call only for failures whose summaries do not establish root cause.

For babysitting a PR, follow that skill's Evergreen playbook when it requires full test-log evidence. Its completion rule is stricter than this first-pass pattern.

## Use case: bulk item lookup

Examples: inspect several Jira issues, PR checks, service records, or deployment states.

1. Use one list/search call to get candidates.
2. Filter and rank candidates inside the snippet.
3. Fetch details for at most five candidates in parallel.
4. Return a row per item with its ID, state, key evidence, and lookup error if any.

If the user asked for every item, page with an explicit total page or item cap. Report truncation rather than implying the scan was exhaustive.

## Use case: paginated search and reduction

Examples: find recent failures, scan documentation hits, or summarize activity over a date range.

1. Fetch the first page and inspect `hasMore`, `nextOffset`, HTTP link headers, or the integration's cursor field.
2. Stop after the first page when it answers the question.
3. Continue only when the request requires more coverage, with an explicit page or item cap.
4. Reduce each page into the needed fields before retaining it.
5. Return coverage: pages read, items examined, matching items, and whether more results remain.

## Use case: cross-system research

Examples: combine a Jira ticket, Evergreen state, internal docs, and a service catalog record.

1. Fetch independent roots in parallel when their schemas are known.
2. Derive follow-up IDs or search terms from those roots.
3. Run only the follow-ups needed to resolve conflicts or fill missing facts.
4. Return facts grouped by source and call out disagreement. Do not merge conflicting values into one unsupported claim.

Cross-system writes remain separate. For example, research a Jira issue and Evergreen patch in one snippet, then ask before posting a Jira comment.

## Use case: read, decide, then write

Do not hide the decision and mutation in a bulk script.

1. Use a read-only snippet to collect the current state and proposed changes.
2. Return the exact write targets and payloads.
3. Get user approval when policy or task rules require it.
4. Execute the approved writes separately so approval, failures, and retries stay visible.

A write may stay in one snippet only when the user already approved each exact target and payload, and batching does not weaken per-tool approval.
