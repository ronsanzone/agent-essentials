# Playbook: failing checks / Evergreen tasks

## Split the failures by system

From `gh pr checks`, separate:

- **GitHub-native checks** (Actions, code_health, lint): logs via `gh run view <run-id> --log-failed`.
- **Evergreen checks** (target URLs at evergreen/spruce.corp.mongodb.com): debug via the executor MCP using the workflow below.

## Fetching Evergreen failure details

Load the `executor-usage` skill first, then follow this exact tool chain inside `execute` snippets. Each step builds on the previous — do not skip steps or guess tool paths.

### Step 1: Get failed tasks for the patch

Extract the version/patch ID from the Evergreen check URL (the path segment after `/version/`). Then:

```
tools["evergreen.user.default.get_patch_failed_jobs_evergreen"]({
  patch_id: "<version_id>"
})
```

Returns `failed_tasks[]` with `task_id`, `task_name`, `build_variant`, `failure_details`, and `test_info` (including `failed_test_count`).

### Step 2: Get individual test results

**Do not stop at step 1.** The `failure_details` and auto-triage summaries often only describe artifact-collection cascades ("no XML files matched"), not the actual test assertion failures. Always proceed to test results.

```
tools["mongodb_devprod_mcp.org.localmongodbdevprodmcp.evg_get_test_results_summary"]({
  task_id: "<task_id>"
})
```

Returns each failing test's name, status, duration, and — critically — a `logs.urlRaw` field for each test. This is where the actual assertion errors live.

### Step 3: Get the actual test failure log

For each failing test, fetch its log using the `urlRaw` from step 2:

```
tools["mongodb_devprod_mcp.org.localmongodbdevprodmcp.evg_get_test_results_detailed"]({
  test_log_url: "<urlRaw value from step 2>",
  tail_limit: 0   // 0 = full log; omit for last 500 lines
})
```

This returns the actual test output including assertion errors, stack traces, and `ComparisonFailure` messages. **This is the only reliable way to get root cause for test failures.**

### Supplementary tools (use when test results are absent)

If a task has no test results (e.g., compile failure, infra kill), fall back to raw task logs:

```
// Full raw task log
tools["mongodb_devprod_mcp.org.localmongodbdevprodmcp.evg_get_raw_task_logs"]({
  task_id: "<task_id>",
  tail_lines: 200  // optional, omit for full log
})

// Structured log entries with severity levels
tools["mongodb_devprod_mcp.org.localmongodbdevprodmcp.evg_get_task_log_summary"]({
  task_id: "<task_id>"
})
```

### Common pitfalls

- **Auto-triage lies by omission.** `get_task_log_detailed` and `get_patch_failed_jobs_evergreen` route through auto-triage which often reports only the post-task artifact failure ("no XML files matched"), not the upstream test assertion. Always go to step 2+3 for tasks with `has_test_results: true`.
- **"Infra failure" is not a diagnosis.** If a task produced test results (`test_info.failed_test_count > 0`), there are real test failures to fetch — the absence of XML artifacts does not mean the tests didn't run.
- **Unwrap MCP results.** All executor MCP results are wrapped in `{content: [{type: "text", text: "..."}], structuredContent: {...}}`. Prefer `structuredContent`; parse the text block if absent.

## Triage each failure before touching code

Classify every failing task/check as one of:

1. **Caused by this diff** — root-cause from the logs, fix locally. Prefer running the failing test locally for signal before pushing: Evergreen queues are long, local is faster.
2. **Staleness** — failure is against code this branch doesn't have; switch to [conflicts.md](conflicts.md).
3. **Flaky / infra** — history shows intermittent failure or the error is environmental. Retry the task first. If it fails again, treat it as real.

Write the classification and evidence into the state file's triage entry before any fix.

## Fix → push → verify signal

Batch all fixes into one push; the push retriggers the PR's Evergreen run.

**Early signal:** when one Evergreen task failed and the full run is slow, submit a targeted patch running just that task alongside the push — fast confirmation of the fix without waiting for the whole waterfall.

## Manual patch cases

If an `evergreen-patch` skill is available, load it for submission mechanics and verification; the caveats below are the summary.

- **Stacked PRs in mms don't build correctly in Evergreen** — submit a manual patch for the stacked branch instead of trusting the PR's run.
- **dsi/perf projects:** the evergreen CLI patch must be submitted from `~/code/mongo`.
- If a manual patch verifies the fix, paste its link into the PR (description or state file's Open items) so the user can reference it.
