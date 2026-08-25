# Evergreen (CI history)

## What this source contains

Task and test run history across mainline and patches, version rollups, and Build Failure Groups. Best at why a test was skipped, retried, made more lenient, or quarantined, and at dating a behaviour change by when a task started failing or passing on mainline.

## How to search it

Executor paths: `mongodb_devprod_mcp.org.localmongodbdevprodmcp.evg_get_task_history` (one task across recent mainline versions), `evg_get_version` (a version's rollup by ID), `evg_list_project_versions` (browse mainline), `evg_get_test_results_summary` and `evg_debug_task` (one task's failures), `bb_search_bfgs` (Build Failure Groups). `evg_get_inferred_project_ids` when the project identifier is unknown. Describe before calling.

1. **Anchor to a task.** From the test file or suite in the code anchor, identify the Evergreen task and build variant that runs it (the project's `.evergreen.yml` or equivalent names them).
2. **History around the ship date.** `evg_get_task_history` for that task; look for the red streak before the change and green after, or the reverse.
3. **The failing runs.** For the red versions, `evg_get_test_results_summary` for the failing tests and their messages; `evg_debug_task` when the task-level summary is not enough.
4. **Failure groups.** `bb_search_bfgs` for the test name; the BFG ticket records the triage and usually the decision (skip, retry, fix).

Fetch each task once; return the run table (version, date, status) trimmed to the window and the failure messages that match the anchored code.

## What good evidence looks like here

- A task history that flips state at the PR's mainline version.
- A BFG whose triage note explains the retry, skip, or tolerance the code adds.
- A failing test message that names the condition the change guards.

## Common pitfalls

- Patch runs and mainline runs differ; cite mainline for "what was happening in the codebase".
- Task names get renamed and variants get added. Confirm the task existed in the window.
- A flaky history is evidence of flake, not of the root cause. Say which.

## What to return

Project, task, build variant, the version and date where status changed, the failure messages quoted verbatim, and BFG keys with summaries.
