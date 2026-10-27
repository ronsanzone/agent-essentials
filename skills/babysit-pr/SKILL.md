---
name: babysit-pr
description: Babysit a PR to green — one full pass of sweep, triage, fix, push, report. Use when the user wants a PR watched, babysat, or pulled over the finish line; pastes a PR URL (GitHub or Graphite) with failing checks, Evergreen failures, merge conflicts, or new comments and says triage/fix/debug; or asks to monitor a PR until green.
---

# Babysit PR

One pass of the babysit loop: sweep every signal on a PR, triage before fixing, fix in priority order, push, log, report. Draft and non-draft PRs are handled identically. A run is a single pass — cadence comes from `/loop` re-invoking it, not from polling inside the skill.

```
/babysit-pr [pr-url | pr-number] [check | drive | threads-only]
```

Modes: `drive` (default) fixes what the pass can fix; `check` is one status sweep and a report, no fixes, the right mode for "check on X", "is it green", and docs-only PRs; `threads-only` answers review comments and touches nothing else. Name the mode in the report's first line.

- Accepts GitHub URLs and Graphite URLs (`app.graphite.com/github/pr/<owner>/<repo>/<number>/...` → owner/repo + number).
- No argument: resolve the PR from the current branch (`gh pr list --head "$(git branch --show-current)"`). If that finds nothing, ask for the URL.

## Hard rules

- **Never mark ready-for-review, never merge, never close the PR.** Finish line = report GREEN and stop.
- **Never post comment replies or resolve review threads.** Draft replies in the report; the user posts them.
- **Diagnose before fixing.** No fix lands without a triage entry first: what failed, root cause, evidence.
- **Record every significant decision** — conflict resolutions, judgment calls in fixes, anything a reviewer would want flagged — in the state file's Decisions section and in the report.
- **A push retriggers Evergreen/CI.** Batch all of a pass's fixes into one push; never separately kick a run right after pushing.
- **Work the merge frontier.** In a stack, the lowest unmerged PR is the only one that matters until it merges. Read upstack threads and batch their fixes into the frontier's push wave; never push upstack while the frontier is red, since the restack retriggers their checks anyway.
- **One babysitter per stack.** Before the first action, check the sibling state files (`~/.cache/babysit/<owner>-<repo>-*.md`). A pass logged there within the last hour means another agent owns it: stop and report instead of starting a second loop.
- **Do not submit an Evergreen patch unless the PR is stacked (GitHub cannot build stacked mms PRs) or the user asked for one.** GitHub runs the checks on a normal PR; monitor those. A targeted early-signal patch for one failing task is the only other exception.
- **Resolve remotes, never assume `origin`.** Base = the remote whose URL matches `github.com[:/]10gen/` (`origin` in `~/mms`, `upstream` in mongohouse and mms-automation, where `origin` is the fork). Push to the remote the PR head lives on (`gh pr view --json headRepositoryOwner`). Same snippet as submit-pr's "Remote" section.
- **Do not rewrite a normal PR branch just to update it from its base.** Merge the base branch and push normally. Force push only when a workflow has already rewritten history (typically a Graphite restack), and always use `--force-with-lease`.

## State file

`~/.cache/babysit/<owner>-<repo>-<pr-number>.md` — the running log across passes and sessions.

- **First action of every pass: read it.** If missing, create it with the sections: `## PR` (facts), `## Status history`, `## Decisions`, `## Actions`, `## Open items`.
- **Last action of every pass: append** this pass's timestamped entry to each relevant section.
- Never re-triage a failure the log records as fixed unless it reappears in a run newer than the fix.

## The pass

1. **Read the state file.**
2. **Sweep** — gather every signal before acting on any:
   - PR facts: `gh pr view <n> -R <owner>/<repo> --json state,isDraft,mergeable,mergeStateStatus,reviewDecision,headRefName,title,url`
   - Checks: `gh pr checks <n> -R <owner>/<repo>`
   - Evergreen and merge queue: `ci-triage report <pr-url> -C <checkout>` (see [evergreen.md](evergreen.md)). It reads the failing tests' actual logs, not the task-level auto-triage, which misses assertion errors.
   - Comments: issue comments and review threads newer than the last pass in the state file; separate human reviewers from bots.
3. **Triage** — write findings to the state file before fixing anything.
4. **Fix in priority order**, loading a playbook only when its branch fires:
   1. Merge conflicts or branch behind master → [conflicts.md](conflicts.md)
   2. Failing checks / Evergreen tasks → [evergreen.md](evergreen.md)
   3. New comments → [comments.md](comments.md)
5. **Push** once if fixes were made; verify the checks restarted.
6. **Log** — append the pass to the state file.
7. **Report.**

Pass completion criterion: every signal source — mergeability, GitHub checks, Evergreen, comments — appears in the report as green, fixed, in-flight, or blocked-with-owner. None left unexamined.

## Report

Mode and verdict first, then what changed this pass, decisions made, and open items.

- **GREEN** — checks pass, no conflicts, no unaddressed comments. Say so plainly; if running under `/loop`, note the loop can stop.
- **IN-FLIGHT** — fixes pushed or CI still running; nothing needs the user. If not already under `/loop`, suggest `/loop 20m /babysit-pr <url>`.
- **BLOCKED** — needs the user: drafted replies to post, a conflict resolution needing a call, a failing test with an ambiguous fix. List exactly what and why.

Every GREEN / fixed / in-flight claim carries an `Evidence:` line with what was observed: `gh pr checks <n>` output, the Spruce patch URL with task states, the pushed hash from `git log origin/<branch> -1`, the comment URL. A signal you did not observe this pass is BLOCKED or "unverified" — never GREEN.
