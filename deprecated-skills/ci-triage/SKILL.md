---
name: ci-triage
description: Triage failing CI for a PR or Evergreen run with one command, `ci-triage report <target>`. Covers GitHub checks, the PR's Evergreen run and every merge-queue attempt, plus failing-test assertions, mainline flake history, branch staleness and the local bazel repro command. `ci-triage wait` blocks until CI finishes. `ci-triage patch <task>` cuts a correctly scoped early-signal patch, including for generated INT_JAVA_* tasks. Use when a PR's checks, an Evergreen task/patch/version, or a GitHub merge-queue run is failing ("why is CI red", "triage this failure", a Spruce link, "tests failing on the merge queue"), and before fixing anything in the babysit-pr Evergreen playbook.
---

# CI triage

Run this first, before any Evergreen CLI, Executor/MCP call or log grepping:

```bash
ci-triage report <target> [-C <checkout>]
```

`<target>` is any of: a GitHub PR URL, `owner/repo#N`, a bare PR number (repo from the checkout's 10gen remote), or an Evergreen/Spruce version, patch or task URL or id. `-C` defaults to the current directory. It should be the PR's checkout, because the local facts come from it.

Expect 15–60 s. It prints one brief:

- **GitHub checks**: counts, plus each failing GitHub-native check with its `gh run view <id> --log-failed` command.
- **PR Evergreen run** and **merge queue**: every merge-queue attempt for this PR (`gh pr checks` does not show them) and its removal reasons. The latest failed attempt is triaged in full.
- **Per failed task**: the mainline failure rate over recent runs (flake vs regression), and the Spruce link.
- **Tasks with test results**: the assertion lines and first `com.xgen` stack frame per failing test (max 3).
- **Tasks without test results**: the compiler and error lines from the task log.
- **Local facts**:
  - Commits behind the base branch, and whether merging the base is clean.
  - Whether the failing test method exists on this branch, or was added upstream (and by which commit).
  - Upstream commits that touched the test file.
  - The `bazel test //dir:Class --test_filter=method` repro command.
  - A `--config=javac` reminder when BUILD files changed.

Exit 0 nothing failing, 1 failures, 2 usage/auth error.

```bash
ci-triage wait <target> [--interval 60] [--timeout 10800]
```

`wait` blocks until the PR's checks and any running merge-queue attempt finish, printing one line per change. Exit 0 green, 1 failed, 3 timeout. Use it instead of `sleep` loops. Run it in the background when the harness supports that.

```bash
ci-triage patch <task Spruce URL | task id | NAME --variant V> [-C <checkout>] [--uncommitted] [--dry-run]
```

`patch` submits a finalized early-signal Evergreen patch for one failing task, from the checkout's HEAD. Pass the task link that `report` printed. Never hand-build `evergreen patch` for generated tasks.

- **Generated tasks.** Generated tasks are not in the project YAML, so `-t INT_JAVA_X` schedules nothing ("cannot finalize patch with no tasks"). `patch` reads the task's generator and schedules that instead.
- **`INT_JAVA_<X>`.** It schedules `GENERATE_INT_TESTS_BAZEL_COMBINED` with `--param int_use_rbe=false --param task_def_names=<x>`. The key `<x>` comes from `server/src/test/test_tasks.yml`. The generator runs in about 3 minutes, then only `INT_JAVA_<X>` is generated.
- **`UNIT_JAVA_<X>`.** `patch` refuses these: the unit generator cannot be narrowed, so a patch reruns every unit test. Use the local repro instead. `--whole-variant` overrides the refusal.
- **Plain project tasks** (e.g. `COMPILE_BAZEL`) are scheduled directly.
- **`--uncommitted`** adds tracked changes, and the command refuses if untracked files exist (Evergreen silently drops them). Without it, `patch` warns that uncommitted changes are left out.
- **Confirmation.** It reads the patch back to confirm it is activated with the planned task, then prints the Spruce URL and `ci-triage wait <id>`.
- **When to use it:** only for early signal on a fix you already verified locally, or for stacked PRs (see babysit-pr). A push already reruns the PR's CI.

## Reading the brief

- **Test or method "not on this branch"** → staleness, not your diff. Merge the base branch, then run the printed repro.
- **Mainline also failing** (`mainline: 3/10`) → likely flake or a mainline break. Check before changing code.
- **"N aborted after the failure"** → the merge queue cancels the rest of the run once one task fails. These are not failures.
- **The repro command is the check before pushing.** Run it, red then green. Int tests (`*IntTests`) need a local MongoDB (mms-dev-loop skill), and only one int-test target can run at a time.
- If the excerpt is not enough, open the Spruce link or the raw log it prints. Only then reach for the Evergreen MCP (`evg_get_test_results_detailed`, `evg_get_raw_task_logs`).

## Setup

`~/bin/ci-triage` → `skills/ci-triage/scripts/ci-triage` in agent-essentials. Needs `gh` (logged in), `git`, and `evergreen` on PATH, logged in once so that `evergreen client get-oauth-token` prints a token. It uses `https://evergreen.corp.mongodb.com` (static API keys get 401). Tests: `python3 -m unittest discover -s skills/ci-triage/tests`.
