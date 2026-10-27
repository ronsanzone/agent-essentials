# Playbook: get a PR to green

For the verdicts `CONFLICT`, `THREADS` and `CI_RED`, or `/ship green <pr>`. One pass covers several steps: sweep every signal, triage before fixing, fix in work order, push once, then log. Cadence comes from `/loop`, not from polling inside a pass.

Mode, named in the report's first line:
- **drive** (default): fix what can be fixed.
- **check:** status only, no changes. Use it for "is it green" and for docs-only PRs.
- **threads-only:** handle review comments only.

1. **State.** Read `~/.cache/ship/<owner>-<repo>-<n>.md`, or create it (SKILL.md). Stop if another session wrote an entry in the last hour.
2. **Sweep before acting.** Gather every signal first:
   - `shipctl next <pr> -C <checkout>` for the verdict, its flags, unresolved threads and a stacked base.
   - `shipctl report <pr> -C <checkout>` when `CI_RED` is flagged. It covers the PR's Evergreen run, every merge-queue attempt, the assertion lines, mainline history, staleness and the repro command. Merge-queue failures show up only here, not in `gh pr checks`.
   - Comments newer than the last pass: `gh pr view <n> -R <repo> --comments` and `gh api repos/<repo>/pulls/<n>/comments`. Separate humans from bots.
3. **Triage before any fix.** Write one entry per failure and per comment to the state file: what failed, the cause, and the evidence. Classify each CI failure:
   - **Caused by this diff.** Fix it.
   - **Staleness.** `report` says the test or method is "not on this branch", or `changed on master since the merge base`. Merge the base (step 4).
   - **Flake or infra.** Mainline is also failing, or the error is environmental (e.g. a download 5xx). Allow one fresh run, never a second: an identical second failure is real, so read the logs. A failure in code this diff never touched is staleness, not flake.
4. **Conflicts or a stale base.** If the PR is stacked, use [stack.md](stack.md). Otherwise:
   - `git fetch "$UP" && git merge "$UP/<default>"` (never rebase a pushed branch).
   - Resolve hunk by hunk. Record every non-mechanical choice in Decisions: the file, what each side wanted, what you picked and why.
   - If a resolution needs a product call, stop that file and mark it BLOCKED with the question.
5. **CI fixes.** Fix locally and prove the fix with the repro command `report` printed, red then green.
   - Int tests (`*IntTests`) need a local MongoDB (mms-dev-loop skill). Run one int-test target at a time.
   - If BUILD files changed, also run `bazel build --config=javac <targets>`.
   - For an early signal on a slow task, see [patch.md](patch.md).
6. **Review comments.** Triage each one:
   - **Bots** (Augment, lint, coverage): verify the claim. Fix it with a red-first proof, or dismiss it with a concrete disproof recorded in the state file.
   - **Human, valid:** fix it and draft a reply naming the change.
   - **Human, question:** draft the answer from the code.
   - **Human, disagree:** draft the reasoning.
   - Never post replies or resolve threads; the drafts go in the report.
7. **One push.** Batch every fix into one push to the PR's head remote. The push reruns CI, so never kick a separate run.
8. **Augment review.** After a push, or when Augment has not reviewed the current head:
   - Read `gh api repos/<repo>/pulls/<n>/reviews --paginate` and `gh api repos/<repo>/issues/<n>/comments --paginate`.
   - Post `gh pr comment <n> --body "augment review"` only if the last `augmentcode[bot]` review is for an older commit and no trigger comment is newer than that review.
   - Skip this when Augment already reviewed this head, or a trigger is still unanswered. Fire and forget.
9. **Verify and log.**
   - Run `shipctl next <pr>` again.
   - Append this pass to the state file: status, decisions, actions, open items.
   - Report the outcome: `GREEN`/`READY`, `IN-FLIGHT` (pushed, or CI running), or `BLOCKED` (needs the user: drafted replies, a conflict call, an ambiguous fix).
   - Every mergeability, CI, Evergreen and comments signal appears as green, fixed, in-flight or blocked-with-owner, with `Evidence:`.
