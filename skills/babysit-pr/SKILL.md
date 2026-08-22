---
name: babysit-pr
description: Babysit a PR to green — one full pass of sweep, triage, fix, push, report. Use when the user wants a PR watched, babysat, or pulled over the finish line; pastes a PR URL (GitHub or Graphite) with failing checks, Evergreen failures, merge conflicts, or new comments and says triage/fix/debug; or asks to monitor a PR until green.
---

# Babysit PR

One pass of the babysit loop: sweep every signal on a PR, triage before fixing, fix in priority order, push, log, report. Draft and non-draft PRs are handled identically. A run is a single pass — cadence comes from `/loop` re-invoking it, not from polling inside the skill.

```
/babysit-pr [pr-url | pr-number]
```

- Accepts GitHub URLs and Graphite URLs (`app.graphite.com/github/pr/<owner>/<repo>/<number>/...` → owner/repo + number).
- No argument: resolve the PR from the current branch (`gh pr list --head "$(git branch --show-current)"`). If that finds nothing, ask for the URL.

## Hard rules

- **Never mark ready-for-review, never merge, never close the PR.** Finish line = report GREEN and stop.
- **Never post comment replies or resolve review threads.** Draft replies in the report; the user posts them.
- **Diagnose before fixing.** No fix lands without a triage entry first: what failed, root cause, evidence.
- **Record every significant decision** — conflict resolutions, judgment calls in fixes, anything a reviewer would want flagged — in the state file's Decisions section and in the report.
- **A push retriggers Evergreen/CI.** Batch all of a pass's fixes into one push; never separately kick a run right after pushing.
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
   - Evergreen: for check names/URLs pointing at Evergreen/Spruce, follow the 3-step tool chain in [evergreen.md](evergreen.md): (1) get failed tasks, (2) get test results summary with `urlRaw` per test, (3) fetch each failing test's actual log. Do not stop at the task-level auto-triage — it misses assertion errors.
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

Verdict first, then what changed this pass, decisions made, and open items.

- **GREEN** — checks pass, no conflicts, no unaddressed comments. Say so plainly; if running under `/loop`, note the loop can stop.
- **IN-FLIGHT** — fixes pushed or CI still running; nothing needs the user. If not already under `/loop`, suggest `/loop 20m /babysit-pr <url>`.
- **BLOCKED** — needs the user: drafted replies to post, a conflict resolution needing a call, a failing test with an ambiguous fix. List exactly what and why.
