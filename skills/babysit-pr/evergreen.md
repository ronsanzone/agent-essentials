# Playbook: failing checks / Evergreen tasks

## Split the failures by system

From `gh pr checks`, separate:

- **GitHub-native checks** (Actions, code_health, lint): logs via `gh run view <run-id> --log-failed`.
- **Evergreen checks** (target URLs at evergreen/spruce.corp.mongodb.com): debug via the executor MCP using the workflow below.

## Fetching Evergreen failure details

Load the `executor-usage` skill, then work inside `execute` snippets. Tool paths move between Executor connections; **discover them with `tools.search` each session and `tools.describe.tool` before calling — the live catalog wins over anything written here.** The chain has three levels; do not stop early.

1. **Failed tasks for the patch/version.** Version id = the path segment after `/version/` in the Evergreen check URL. Search `evergreen patch failed jobs`; the result lists `failed_tasks[]` with `task_id`, `task_name`, `build_variant`, `failure_details`, `test_info.failed_test_count`.
2. **Per-test results for each failed task.** Search `evergreen test results summary`. `failure_details` and auto-triage summaries usually describe the artifact-collection cascade ("no XML files matched"), not the assertion; the per-test summary carries a `logs.urlRaw` per failing test.
3. **The actual test log** from that `urlRaw` (search `evergreen test results detailed`; `tail_limit: 0` for the full log). Assertion errors, stack traces, `ComparisonFailure` live here. This is the only reliable root cause.

Fallbacks when a task has no test results (compile failure, infra kill): raw task logs (`evergreen raw task logs`, `tail_lines`) and the structured log summary (`evergreen task log summary`). Task history (`evergreen task history`) is how you tell flake from regression.

### Common pitfalls

- **Auto-triage lies by omission.** `get_task_log_detailed` and `get_patch_failed_jobs_evergreen` route through auto-triage which often reports only the post-task artifact failure ("no XML files matched"), not the upstream test assertion. Always go to step 2+3 for tasks with `has_test_results: true`.
- **"Infra failure" is not a diagnosis.** If a task produced test results (`test_info.failed_test_count > 0`), there are real test failures to fetch — the absence of XML artifacts does not mean the tests didn't run.
- **Unwrap MCP results.** All executor MCP results are wrapped in `{content: [{type: "text", text: "..."}], structuredContent: {...}}`. Prefer `structuredContent`; parse the text block if absent.

## Triage each failure before touching code

Classify every failing task/check as one of:

1. **Caused by this diff** — root-cause from the logs, fix locally. Prefer running the failing test locally for signal before pushing: Evergreen queues are long, local is faster.
2. **Staleness** — failure is against code this branch doesn't have; switch to [conflicts.md](conflicts.md).
3. **Flaky / infra** — task history (`evg_get_task_history` via executor) shows the same task failing intermittently on mainline, or the error is environmental. One fresh run, never a second: an identical second failure was never flake, so reclassify and read the logs. A failure in code this diff never touched is staleness (class 2), not flake; confirm with `git merge-base --is-ancestor origin/master HEAD` (false means the branch is behind) before spending the retry.

Write the classification and evidence into the state file's triage entry before any fix.

## Fix → push → verify signal

Batch all fixes into one push; the push retriggers the PR's Evergreen run.

**Early signal:** when one Evergreen task failed and the full run is slow, submit a targeted patch running just that task alongside the push — fast confirmation of the fix without waiting for the whole waterfall.

## Manual patch cases

If an `evergreen-patch` skill is available, load it for submission mechanics and verification; the caveats below are the summary.

- **Stacked PRs in mms don't build correctly in Evergreen** — submit a manual patch for the stacked branch instead of trusting the PR's run.
- **dsi/perf projects:** the evergreen CLI patch must be submitted from `~/code/mongo`.
- If a manual patch verifies the fix, paste its link into the PR (description or state file's Open items) so the user can reference it.
