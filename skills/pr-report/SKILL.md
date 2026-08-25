---
name: pr-report
description: Report every open PR you own — verdict, blocker, and who holds the ball — then hand the ones needing work to babysit-pr. Use when the user asks how their PRs are doing, wants a PR sweep or standup, or asks what is blocked on them.
---

# PR Report

Rounds across every open PR: a shallow check on each, then escalate only the ones that need care. Depth is `babysit-pr`'s job — this skill never triages a failure, never fixes, never pushes.

```
/pr-report
```

## Scope

Open PRs authored by the user, across every repo. **Skip drafts. Skip anything with `updatedAt` older than 20 days.** Both are deliberate: a draft isn't asking for anything, and a 20-day-cold PR is a backlog item, not a live one.

Report the skip count in one line (`Skipped: 2 draft, 1 stale`) so the omission is never silent.

## Sweep

Gather every signal before classifying any PR.

```bash
gh search prs --author=@me --state=open --limit 100 \
  --json number,title,url,repository,isDraft,updatedAt
```

Then per surviving PR:

```bash
gh pr view <n> -R <owner>/<repo> --json \
  number,title,url,isDraft,mergeable,mergeStateStatus,reviewDecision,\
reviewRequests,latestReviews,statusCheckRollup,commits,updatedAt
```

Unresolved review threads are absent from `gh pr view` — they need GraphQL:

```bash
gh api graphql -F owner=<owner> -F repo=<repo> -F n=<number> -f query='
query($owner:String!,$repo:String!,$n:Int!){
  repository(owner:$owner,name:$repo){ pullRequest(number:$n){
    reviewThreads(last:50){ nodes{ isResolved isOutdated
      comments(last:1){ nodes{ author{login} createdAt body } } } } } } }'
```

Count a thread only when `isResolved` and `isOutdated` are both false. A thread older than the head commit is usually already addressed and merely left unresolved — compare against `commits` before calling it a blocker.

**Bots are not signal.** Treat `augmentcode`, `svc-auto-approve-bot`, and any `*[bot]` login as noise in comments, threads, and reviews. An unfamiliar login is a human.

## Classify

Each PR gets one **verdict** — its highest-priority blocker — and an **owner**, whoever holds the ball. First match wins:

| Condition | Verdict | Owner |
|---|---|---|
| `mergeStateStatus == DIRTY` | CONFLICT | you |
| any check `FAILURE`/`ERROR` | RED | you |
| unresolved thread, last comment by a human other than you *and newer than your latest commit* | COMMENTS | you |
| checks `PENDING`/`IN_PROGRESS` | IN-FLIGHT | CI |
| unresolved thread, last comment by you | AWAITING RESOLVE | reviewer |
| `reviewDecision != APPROVED` | AWAITING REVIEW | the pending code-owner teams |
| otherwise | READY | you, to merge |

Note secondary blockers too — a CONFLICT PR is usually also awaiting review, and the user needs both to plan.

**Pending code owners** are the `Team` entries in `reviewRequests`. GitHub drops a team's request the instant any member approves, so what remains *is* the outstanding list. Two traps:

- Empty pending teams does **not** mean approved — a PR nobody was ever asked to review has zero teams and `REVIEW_REQUIRED`. Always read `reviewDecision` alongside.
- A team appears because some changed file is owned by it. When the user asks *why* a team is on the hook, map it — from a checkout of that repo:
  `gh pr view <n> -R <owner>/<repo> --json files --jq '.files[].path' | xargs owner of`

## Report

Rank by how close to merged, then by whether the user is the blocker: READY, then owner-is-you (CONFLICT / RED / COMMENTS), then AWAITING REVIEW, then IN-FLIGHT last.

One table, one row per PR — number and link, title, verdict, and the blocker stated concretely enough to act on (`search-systems must approve — you touched their OWNERS.yaml`, not `awaiting review`). Below it, a short **Do this** list naming the two or three highest-value moves across the whole set.

Link failing Evergreen builds; never open them. Diagnosing a red task is `babysit-pr`'s work, and doing it here would duplicate that skill and blow up the sweep.

## Offer

Close by offering to babysit. Preselect the PRs whose owner is the user and whose verdict is CONFLICT, RED, or COMMENTS — those are what `babysit-pr` can actually move. Ask which to take with `AskUserQuestion`.

Under herdr (`HERDR_ENV=1`), split the tab and give each pick its own looping babysitter in its own worktree, visible on screen — see [herd.md](herd.md). Otherwise spawn subagents running `/babysit-pr <url>`, **one at a time**: `babysit-pr` rebases and pushes, so two passes sharing a working tree corrupt each other.

## Supervising

This skill is its own supervisor. A PR already being herded is reported by its **pane status**, not swept again for a babysit offer — never spawn a second babysitter for a PR that has one.

That makes the report idempotent and safe to put on a timer, which is where cadence belongs: `/loop 10m /pr-report`.
