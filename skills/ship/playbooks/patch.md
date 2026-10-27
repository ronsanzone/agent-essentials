# Playbook: manual Evergreen patch

Patch only in three cases: a stacked mms PR (GitHub can't build it), an early signal on one slow failing task after a fix you already verified locally, or an explicit request from the user. A push already reruns the PR's CI.

1. **Preflight** in the checkout you will submit from:
   - Run `git status --short` and `git ls-files --others --exclude-standard`.
   - `--uncommitted` sends tracked changes only. A renamed file shows up as deleted plus `??`, and Evergreen gets only the deletion.
   - Track exactly the files that belong to the patch, and tell the user the index changed.
   - dsi or perf projects submit from `~/code/mongo`, not the dsi repo.
2. **Submit** with `shipctl patch <task-url-from-report> [--uncommitted] [-C <checkout>]`. Use `--dry-run` first if unsure. It handles the generated-task rules:
   - **`INT_JAVA_<X>`:** it schedules `GENERATE_INT_TESTS_BAZEL_COMBINED` with `--param int_use_rbe=false --param task_def_names=<x>`. The generator runs in about 3 minutes, then only that task is generated.
   - **`UNIT_JAVA_<X>`:** it refuses, because the unit generator can't be narrowed. Rerun those locally instead. `--whole-variant` overrides the refusal for a deliberate full unit run.
   - **Plain project tasks** (e.g. `COMPILE_BAZEL` on `code_health`) are scheduled directly.
   - Never hand-build `evergreen patch -t INT_JAVA_…`: it schedules nothing ("cannot finalize patch with no tasks").
   - For a whole variant or a hand-picked set: `evergreen patch -p mms -d "<KEY>: <what>" -y --finalize -v <variant> -t <task>`. Always pass `--finalize`, because an unfinalized patch never runs.
3. **Confirm.** `shipctl patch` reads the patch back and fails unless it is activated with the planned task. If the generator fails within minutes, the payload probably differs from your tree: check preflight before retrying.
4. **Wait** with `shipctl wait <patch-id>` (background), then `shipctl report <patch-id>` if it fails. Retry a suspected flake once before calling it real.
5. **Hand off.** Put the Spruce URL in the PR's Testing section or the state file, so the next pass doesn't re-verify. The report says pass or fail with `Evidence:` (Spruce URL plus task states), and what the patch covered.
